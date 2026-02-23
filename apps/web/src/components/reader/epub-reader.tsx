"use client";

import { ChevronLeft, ChevronRight, List, Search, Settings, X } from "lucide-react";
import { useTheme } from "next-themes";
import React, { type ReactNode, useCallback, useEffect, useRef, useState } from "react";

import { type EPUBHighlight, getHighlightRgba } from "@/types/reader";

type TocItem = { label: string; href: string; subitems?: TocItem[] };

// Shape of the foliate-view custom element after a book is opened
type FoliateView = HTMLElement & {
	open: (src: string | File | Blob | object) => Promise<void>;
	prev: () => void;
	next: () => void;
	goTo: (dest: string | number | object) => void;
	getCFI: (index: number, range?: Range) => string;
	addAnnotation: (annotation: { value: string }, remove?: boolean) => Promise<unknown>;
	deleteAnnotation: (annotation: { value: string }) => Promise<void>;
	renderer?: {
		setStyles?: (css: string) => void;
		getContents?: () => {
			index: number;
			overlayer?: unknown;
			doc?: Document;
		}[];
	};
	book?: {
		toc?: TocItem[];
		sections?: Array<{
			linear?: string;
			cfi?: string;
			createDocument?: () => Promise<Document | null>;
		}>;
		metadata?: {
			title?: string;
			cover?: string | null;
		};
	};
	lastLocation?: { cfi?: string };
};

interface EPUBReaderProps {
	book: {
		id: string;
		fileUrl: string;
		fileType: string;
		totalPages: number | null;
		coverUrl?: string | null;
	};
	position: unknown;
	highlights?: EPUBHighlight[];
	onPositionChange: (position: unknown) => void;
	onTextExtracted: (text: string) => void;
	onCoverExtracted?: (coverDataUrl: string) => void;
	onHighlightClick?: (highlight: EPUBHighlight) => void;
	/** Populated with a navigate function once the view is ready */
	navigateRef?: React.MutableRefObject<((pos: unknown) => void) | null>;
	children?: ReactNode;
}

export default function EPUBReader({
	book,
	position,
	highlights = [],
	// eslint-disable-next-line @typescript-eslint/no-unused-vars — destructure below
	onPositionChange,
	onTextExtracted,
	onCoverExtracted,
	onHighlightClick,
	navigateRef,
	children,
}: EPUBReaderProps) {
	const { resolvedTheme } = useTheme();
	const themeRef = useRef(resolvedTheme);
	useEffect(() => {
		themeRef.current = resolvedTheme;
	}, [resolvedTheme]);

	const viewerRef = useRef<HTMLDivElement>(null);
	const folViewRef = useRef<FoliateView | null>(null);

	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [toc, setToc] = useState<TocItem[]>([]);
	const [showToc, setShowToc] = useState(false);
	const [showSearch, setShowSearch] = useState(false);
	const [showSettings, setShowSettings] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	// Persist font size per book in localStorage
	const [fontSize, setFontSize] = useState<number>(() => {
		try {
			const stored = localStorage.getItem(`fontSize-${book.id}`);
			return stored ? Math.max(60, Math.min(200, Number(stored))) : 100;
		} catch {
			return 100;
		}
	});
	const fontSizeRef = useRef(fontSize);
	const [progress, setProgress] = useState(0);
	const highlightColorMap = useRef<Map<string, string>>(new Map());
	const [viewReady, setViewReady] = useState(false);

	useEffect(() => {
		if (typeof window === "undefined" || !viewerRef.current) return;

		let mounted = true;

		async function init() {
			try {
				setIsLoading(true);
				setError(null);

				// Load foliate-js view.js from public/ as a native ES module.
				// This registers the 'foliate-view' custom element as a side effect.
				if (!customElements.get("foliate-view")) {
					await new Promise<void>((resolve, reject) => {
						const s = document.createElement("script");
						s.type = "module";
						s.src = "/foliate-js/view.js";
						s.onload = () => resolve();
						s.onerror = () => reject(new Error("Failed to load foliate-js"));
						document.head.appendChild(s);
					});
					await customElements.whenDefined("foliate-view");
				}

				if (!mounted || !viewerRef.current) return;

				// Create the foliate-view web component and mount it
				const view = document.createElement("foliate-view") as FoliateView;
				// touch-action:manipulation prevents double-tap zoom but crucially
				// does NOT block the browser from delivering touch events to iframe
				// content for text selection. Using 'none' was preventing all mobile
				// touch highlighting because browsers suppress selection when any
				// ancestor has touch-action:none.
				view.style.cssText = "display:block;width:100%;height:100%;touch-action:manipulation;";
				viewerRef.current.appendChild(view);
				folViewRef.current = view;

				// On all touch devices: disable foliate's swipe-based page turner so
				// that finger/Apple Pencil drags can be used for text selection.
				// Page turns are handled instead by Kindle-style edge taps (leftmost
				// or rightmost 15 % of the container) and the header arrow buttons.
				const isTouchDevice = navigator.maxTouchPoints > 0;

				let touchStartX = 0;
				let touchStartY = 0;

				const handleTouchStart = (e: TouchEvent) => {
					const t = e.touches[0];
					if (t) {
						touchStartX = t.clientX;
						touchStartY = t.clientY;
					}
				};

				const handleTouchMove = (e: TouchEvent) => {
					const t = e.touches[0];
					if (!t) return;
					const deltaX = t.clientX - touchStartX;
					const deltaY = t.clientY - touchStartY;
					// Prevent foliate's horizontal swipe paginator from firing.
					// stopPropagation (in capture phase) prevents foliate-view from
					// seeing this event entirely; preventDefault stops browser scroll.
					if (Math.abs(deltaX) > Math.abs(deltaY)) {
						e.preventDefault();
						e.stopPropagation();
					}
				};

				// 15 % edge zones trigger prev / next — same feel as Kindle.
				// Only fires when movement is small enough to be a tap, not a drag.
				const EDGE_ZONE = 0.15;
				const TAP_THRESHOLD_PX = 20;

				const handleTouchEnd = (e: TouchEvent) => {
					const t = e.changedTouches[0];
					if (!t) return;
					const dx = Math.abs(t.clientX - touchStartX);
					const dy = Math.abs(t.clientY - touchStartY);
					if (dx > TAP_THRESHOLD_PX || dy > TAP_THRESHOLD_PX) return;
					const containerW = viewerRef.current?.clientWidth ?? window.innerWidth;
					const relX = touchStartX / containerW;
					if (relX < EDGE_ZONE) {
						view.prev();
					} else if (relX > 1 - EDGE_ZONE) {
						view.next();
					}
				};

				if (isTouchDevice && viewerRef.current) {
					// Use capture phase so our handlers fire before foliate's own
					// touch listeners on the child foliate-view element.
					viewerRef.current.addEventListener("touchstart", handleTouchStart, { passive: true, capture: true });
					viewerRef.current.addEventListener("touchmove", handleTouchMove, { passive: false, capture: true });
					viewerRef.current.addEventListener("touchend", handleTouchEnd, { passive: true, capture: true });
				}
				let lastCfi: string | null = null;
				view.addEventListener("relocate", (e: Event) => {
					if (!mounted) return;
					const detail = (e as CustomEvent).detail ?? {};
					const fraction = typeof detail.fraction === "number" ? detail.fraction : 0;
					const cfi: string | null = detail.cfi ?? null;
					// Skip if the position hasn't actually changed
					if (cfi !== null && cfi === lastCfi) return;
					lastCfi = cfi;
					setProgress(Math.round(fraction * 100));
					onPositionChange({
						fraction,
						index: detail.index,
						cfi,
					});
				});

				// Listen for each section load: apply font size and wire up text-selection
				view.addEventListener("load", (e: Event) => {
					if (!mounted) return;
					const { doc } = (e as CustomEvent).detail ?? {};
					if (!doc) return;

					// Re-apply font size CSS to the newly loaded doc
					try {
						const r = (view as any).renderer;
						if (r?.setStyles) {
							r.setStyles(`html { font-size: ${fontSizeRef.current}% !important; }`);
						}
					} catch {}

					// Inject CSS to allow text selection + dark mode into EPUB content.
					// touch-action: auto + -webkit-touch-callout: default = native
					// selection handles on mobile/iPad Pencil.
					// When the app is in dark mode, we use color-scheme:dark so the
					// browser UA stylesheet switches to dark (white → canvas, etc.)
					// and force a neutral dark background/light text on html/body.
					try {
						const isDark = themeRef.current === "dark";
						const selStyle = doc.createElement("style");
						selStyle.id = "__readsync_theme__";
						selStyle.textContent = [
							"* { -webkit-user-select: text !important; user-select: text !important; touch-action: auto !important; }",
							"body { -webkit-touch-callout: default !important; }",
							"::selection { background: rgba(168,85,247,0.35); color: inherit; }",
							"::-moz-selection { background: rgba(168,85,247,0.35); color: inherit; }",
							isDark
								? ":root { color-scheme: dark; } html, body { background: #1a1a18 !important; color: #e8e6e0 !important; }"
								: "",
						].join("\n");
						(doc.head ?? doc.documentElement).appendChild(selStyle);
					} catch {}

					// Wire up text-selection so the selection menu works inside the EPUB iframe
					const getIframeOffset = () => {
						// frameElement gives exact iframe position (works because sandbox has allow-same-origin)
						const frameEl = doc.defaultView?.frameElement as HTMLIFrameElement | null;
						if (frameEl) return frameEl.getBoundingClientRect();
						// fallback: use the foliate-view element bounds
						return folViewRef.current?.getBoundingClientRect() ?? { left: 0, top: 0 };
					};

					doc.addEventListener("mouseup", () => {
						if (!mounted) return;
						dispatchSelectionEvent();
					});

					// iOS/Android: fire after touchend with enough delay for the
					// browser to finalise the selection handles.
					doc.addEventListener("touchend", () => {
						if (!mounted) return;
						setTimeout(() => {
							if (mounted) dispatchSelectionEvent();
						}, 200);
					});

					// pointerup covers Apple Pencil (pen), touch fallback, and
					// any device that doesn't fire touchend (e.g. some Android WebViews).
					// Skip mouse — mouseup already handled above.
					doc.addEventListener("pointerup", (ev: Event) => {
						if (!mounted) return;
						const pe = ev as PointerEvent;
						if (pe.pointerType !== "mouse") {
							setTimeout(() => {
								if (mounted) dispatchSelectionEvent();
							}, 200);
						}
					});

					// When a non-trivial text selection forms inside the EPUB iframe:
					// 1. Cancel any in-progress foliate swipe/navigation gesture so
					//    the page doesn't jump (critical for iPad Pencil + mobile).
					// 2. On mobile, selectionchange is often the ONLY reliable way
					//    to know selection has completed — dispatch immediately.
					let selectionDebounceTimer: ReturnType<typeof setTimeout> | null = null;
					doc.addEventListener("selectionchange", () => {
						if (!mounted) return;
						const sel = doc.defaultView?.getSelection();
						if (sel && !sel.isCollapsed && sel.toString().trim().length > 1) {
							// Cancel foliate's paginator gesture
							try {
								folViewRef.current?.dispatchEvent(
									new PointerEvent("pointercancel", { bubbles: true }),
								);
							} catch {}
							// Debounced dispatch so we wait for selection to finalise
							if (selectionDebounceTimer) clearTimeout(selectionDebounceTimer);
							selectionDebounceTimer = setTimeout(() => {
								if (mounted) dispatchSelectionEvent();
							}, 120);
						}
					});

					function dispatchSelectionEvent() {
						const sel = doc.defaultView?.getSelection();
						if (!sel || sel.isCollapsed) return;
						const text = sel.toString().trim();
						if (text.length < 2) return;
						const range = sel.getRangeAt(0);
						const rects = range.getClientRects();
						if (!rects.length) return;
						// Use the FIRST rect so the menu appears above the TOP of the selection
						const topRect = rects[0];
						const offset = getIframeOffset();

						// Get the CFI for this selection so highlights can be anchored
						let cfi: string | undefined;
						try {
							const contents = (view as any).renderer?.getContents?.() ?? [];
							const match = contents.find((c: any) => c.doc === doc);
							if (match && typeof match.index === "number") {
								cfi = (view as any).getCFI(match.index, range);
							}
						} catch {}

						window.dispatchEvent(
							new CustomEvent("foliate-selection", {
								detail: {
									text,
									cfi,
									x: offset.left + topRect.left + topRect.width / 2,
									// subtract 8px so the menu bottom lands just above the selection
									y: offset.top + topRect.top - 8,
								},
							}),
						);
					}

					doc.addEventListener("selectionchange", () => {
						if (!mounted) return;
						const sel = doc.defaultView?.getSelection();
						if (!sel || sel.isCollapsed || !sel.toString().trim()) {
							setTimeout(() => {
								if (!mounted) return;
								const sel2 = doc.defaultView?.getSelection();
								if (!sel2 || sel2.isCollapsed) {
									window.dispatchEvent(new CustomEvent("foliate-selection", { detail: null }));
								}
							}, 150);
						}
					});
				});

				// Open the book URL foliate-js uses zip.js with HTTP range requests
				// so it only downloads the parts of the EPUB it needs
				await view.open(book.fileUrl);

				if (!mounted) return;
				setIsLoading(false);

				// Populate TOC
				if (view.book?.toc) {
					setToc(view.book.toc);
				}

				// Listen for draw-annotation to render highlights with correct colors
				view.addEventListener("draw-annotation", (e: Event) => {
					const { draw, annotation } = (e as CustomEvent).detail ?? {};
					if (!draw || !annotation) return;
					const color = highlightColorMap.current.get(annotation.value) ?? "yellow";
					const fill = getHighlightRgba(color);
					// Overlayer.highlight is a static method on the Overlayer class
					draw((rects: DOMRectList) => {
						const ns = "http://www.w3.org/2000/svg";
						const g = document.createElementNS(ns, "g");
						g.style.opacity = "0.35";
						for (const { left, top, width, height } of rects) {
							const rect = document.createElementNS(ns, "rect");
							rect.setAttribute("x", String(left));
							rect.setAttribute("y", String(top));
							rect.setAttribute("width", String(width));
							rect.setAttribute("height", String(height));
							rect.setAttribute("fill", fill);
							g.append(rect);
						}
						g.style.cursor = "pointer";
						g.style.pointerEvents = "auto";
						g.addEventListener("click", () => {
							// Find the highlight by CFI
							const cfi = annotation.value;
							window.dispatchEvent(new CustomEvent("foliate-highlight-click", { detail: { cfi } }));
						});
						return g;
					});
				});

				setViewReady(true);

				// Expose programmatic navigation to the parent
				if (navigateRef) {
					navigateRef.current = (pos: unknown) => {
						const p = pos as any;
						if (!p) return;
						if (p.cfi) {
							try {
								view.goTo(p.cfi);
							} catch {}
						} else if (typeof p.index === "number") {
							try {
								view.goTo({ index: p.index });
							} catch {}
						} else if (typeof p.fraction === "number") {
							const sections = view.book?.sections ?? [];
							const idx = Math.max(
								0,
								Math.min(sections.length - 1, Math.floor(p.fraction * sections.length)),
							);
							try {
								view.goTo({ index: idx });
							} catch {}
						}
					};
				}

				// Extract cover if not already saved (fires async, non-blocking)
				if (!book.coverUrl && onCoverExtracted) {
					extractCover(view)
						.then((dataUrl) => {
							if (mounted && dataUrl) onCoverExtracted(dataUrl);
						})
						.catch(() => {});
				}

				// Restore saved position
				const savedPos = position as any;
				if (savedPos?.cfi) {
					try {
						view.goTo(savedPos.cfi);
					} catch {
						// ignore invalid CFI
					}
				} else if (typeof savedPos?.index === "number") {
					try {
						view.goTo({ index: savedPos.index });
					} catch {}
				} else if (typeof savedPos?.fraction === "number" && savedPos.fraction > 0) {
					try {
						// Approximate: jump to the section that covers this fraction
						const sections = view.book?.sections ?? [];
						const targetIndex = Math.floor(savedPos.fraction * sections.length);
						view.goTo({ index: targetIndex });
					} catch {}
				}

				// Extract text from all linear sections for RSVP / Chunked modes
				extractText(view, mounted, onTextExtracted);

				// Keyboard navigation
				const handleKey = (e: KeyboardEvent) => {
					const tag = (e.target as HTMLElement)?.tagName;
					if (tag === "INPUT" || tag === "TEXTAREA") return;
					if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " ") {
						view.next();
					} else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
						view.prev();
					}
				};
				document.addEventListener("keydown", handleKey);

				return () => {
					document.removeEventListener("keydown", handleKey);
					if (isTouchDevice && viewerRef.current) {
						viewerRef.current.removeEventListener("touchstart", handleTouchStart, { capture: true });
						viewerRef.current.removeEventListener("touchmove", handleTouchMove, { capture: true });
						viewerRef.current.removeEventListener("touchend", handleTouchEnd, { capture: true });
					}
				};
			} catch (err) {
				console.error("EPUB load error:", err);
				if (mounted) {
					setError(err instanceof Error ? err.message : String(err));
					setIsLoading(false);
				}
			}
		}

		let cleanup: (() => void) | undefined;
		init().then((fn) => {
			cleanup = fn;
		});

		return () => {
			mounted = false;
			cleanup?.();
			if (navigateRef) navigateRef.current = null;
			const cur = viewerRef.current;
			const v = folViewRef.current;
			if (v && cur?.contains(v)) {
				try {
					cur.removeChild(v);
				} catch {}
			}
			folViewRef.current = null;
		};
	}, [book.fileUrl]); // eslint-disable-line react-hooks/exhaustive-deps

	// Keep fontSizeRef in sync, apply to renderer, and persist whenever it changes
	useEffect(() => {
		fontSizeRef.current = fontSize;
		try {
			localStorage.setItem(`fontSize-${book.id}`, String(fontSize));
		} catch {}
		const v = folViewRef.current;
		if (!v) return;
		try {
			const r = (v as any).renderer;
			if (r?.setStyles) {
				r.setStyles(`html { font-size: ${fontSize}% !important; }`);
			}
		} catch {}
	}, [fontSize, book.id]);

	// When the user toggles dark/light mode, update the already-loaded EPUB iframes
	useEffect(() => {
		const isDark = resolvedTheme === "dark";
		const contents = folViewRef.current?.renderer?.getContents?.() ?? [];
		for (const { doc } of contents) {
			if (!doc) continue;
			try {
				// Remove old injected theme style and replace it
				doc.getElementById("__readsync_theme__")?.remove();
				const s = doc.createElement("style");
				s.id = "__readsync_theme__";
				s.textContent = [
					"* { -webkit-user-select: text !important; user-select: text !important; touch-action: auto !important; }",
					"body { -webkit-touch-callout: default !important; }",
					"::selection { background: rgba(168,85,247,0.35); color: inherit; }",
					"::-moz-selection { background: rgba(168,85,247,0.35); color: inherit; }",
					isDark
						? ":root { color-scheme: dark; } html, body { background: #1a1a18 !important; color: #e8e6e0 !important; }"
						: "",
				].join("\n");
				(doc.head ?? doc.documentElement).appendChild(s);
			} catch {}
		}
	}, [resolvedTheme]);

	// Sync annotations whenever highlights change (or view becomes ready)
	useEffect(() => {
		const view = folViewRef.current;
		if (!view || !viewReady) return;

		// Update color map and add/remove annotations as needed
		const newCfis = new Set<string>();
		for (const h of highlights) {
			if (!h.startCfi) continue;
			newCfis.add(h.startCfi);
			highlightColorMap.current.set(h.startCfi, h.color ?? "yellow");
		}

		// Remove annotations no longer in highlights
		for (const cfi of highlightColorMap.current.keys()) {
			if (!newCfis.has(cfi)) {
				try {
					view.deleteAnnotation({ value: cfi });
				} catch {}
				highlightColorMap.current.delete(cfi);
			}
		}

		// Add new annotations
		for (const h of highlights) {
			if (!h.startCfi) continue;
			try {
				view.addAnnotation({ value: h.startCfi });
			} catch {}
		}
	}, [highlights, viewReady]);

	// Listen for highlight clicks dispatched from the SVG overlay
	useEffect(() => {
		const handler = (e: Event) => {
			const cfi = (e as CustomEvent).detail?.cfi;
			if (!cfi || !onHighlightClick) return;
			const match = highlights.find((h) => h.startCfi === cfi);
			if (match) onHighlightClick(match);
		};
		window.addEventListener("foliate-highlight-click", handler);
		return () => window.removeEventListener("foliate-highlight-click", handler);
	}, [highlights, onHighlightClick]);

	const goToTocItem = useCallback((href: string) => {
		try {
			folViewRef.current?.goTo(href);
		} catch {}
		setShowToc(false);
	}, []);

	return (
		<div className="relative flex h-full w-full flex-col overflow-hidden">
			{/* Toolbar */}
			<div className="bg-card/90 flex shrink-0 items-center justify-between border-b px-3 py-1.5 backdrop-blur">
				<div className="flex items-center gap-0.5">
					{toc.length > 0 && (
						<button
							type="button"
							title="Table of Contents"
							onClick={() => {
								setShowToc((v) => !v);
								setShowSearch(false);
							}}
							className={`hover:bg-accent rounded p-1.5 ${showToc ? "bg-accent" : ""}`}
						>
							<List className="h-4 w-4" />
						</button>
					)}
					<button
						type="button"
						title="Search"
						onClick={() => {
							setShowSearch((v) => !v);
							setShowToc(false);
						}}
						className={`hover:bg-accent rounded p-1.5 ${showSearch ? "bg-accent" : ""}`}
					>
						<Search className="h-4 w-4" />
					</button>
				</div>

				<span className="text-muted-foreground text-xs font-medium tabular-nums">{progress}%</span>

				<div className="flex items-center gap-0.5">
					<button
						type="button"
						title="Previous page"
						onClick={() => folViewRef.current?.prev()}
						className="hover:bg-accent rounded p-1.5"
					>
						<ChevronLeft className="h-4 w-4" />
					</button>
					<button
						type="button"
						title="Next page"
						onClick={() => folViewRef.current?.next()}
						className="hover:bg-accent rounded p-1.5"
					>
						<ChevronRight className="h-4 w-4" />
					</button>
					<button
						type="button"
						title="Settings"
						onClick={() => setShowSettings(!showSettings)}
						className={`hover:bg-accent rounded p-1.5 ${showSettings ? "bg-accent" : ""}`}
					>
						<Settings className="h-4 w-4" />
					</button>
				</div>
			</div>

			{/* Settings panel */}
			{showSettings && (
				<div className="bg-card shrink-0 border-b px-4 py-2">
					<label className="flex items-center gap-2 text-sm">
						<span className="text-muted-foreground text-xs">Font size</span>
						<input
							type="range"
							min={60}
							max={200}
							value={fontSize}
							onChange={(e) => setFontSize(Number(e.target.value))}
							className="w-28"
						/>
						<span className="w-10 text-xs">{fontSize}%</span>
					</label>
				</div>
			)}

			{/* Main content area */}
			<div className="relative flex min-h-0 flex-1 overflow-hidden">
				{/* TOC sidebar */}
				{showToc && toc.length > 0 && (
					<div className="bg-card flex w-64 shrink-0 flex-col overflow-hidden border-r">
						<div className="flex items-center justify-between border-b px-3 py-2">
							<span className="text-sm font-medium">Contents</span>
							<button type="button" onClick={() => setShowToc(false)}>
								<X className="text-muted-foreground h-4 w-4" />
							</button>
						</div>
						<div className="flex-1 overflow-y-auto">
							<TocList items={toc} onNavigate={goToTocItem} depth={0} />
						</div>
					</div>
				)}

				{/* Foliate-view will be injected into this div */}
				<div
					ref={viewerRef}
					className="relative min-h-0 flex-1"
					style={{ height: "100%", overflow: "hidden" }}
				/>

				{/* Search panel */}
				{showSearch && (
					<EpubSearch view={folViewRef.current} onClose={() => setShowSearch(false)} />
				)}
			</div>

			{/* Loading overlay */}
			{isLoading && (
				<div className="bg-background/80 absolute inset-0 z-30 flex items-center justify-center backdrop-blur-sm">
					<div className="flex flex-col items-center gap-3">
						<div className="border-primary h-10 w-10 animate-spin rounded-full border-4 border-t-transparent" />
						<p className="text-muted-foreground text-sm">Loading book…</p>
					</div>
				</div>
			)}

			{/* Error overlay */}
			{error && !isLoading && (
				<div className="bg-background/80 absolute inset-0 z-30 flex items-center justify-center">
					<div className="border-destructive bg-destructive/10 max-w-md rounded-lg border p-6 text-center">
						<p className="text-destructive font-semibold">Failed to load book</p>
						<p className="text-muted-foreground mt-2 text-sm">{error}</p>
					</div>
				</div>
			)}

			{children}
		</div>
	);
}

// helpers TODO: componentize
async function extractText(
	view: FoliateView,
	mounted: boolean,
	onTextExtracted: (text: string) => void,
) {
	try {
		const sections = view.book?.sections ?? [];
		const texts: string[] = [];
		for (const section of sections) {
			if (section.linear === "no") continue;
			try {
				const doc = await section.createDocument?.();
				if (doc) {
					const txt = doc.documentElement?.textContent?.trim() ?? "";
					if (txt) texts.push(txt);
				}
			} catch {
				// skip unreadable sections
			}
		}
		if (mounted && texts.length > 0) {
			onTextExtracted(texts.join("\n\n"));
		}
	} catch (e) {
		console.warn("Text extraction failed:", e);
	}
}

/** Extracts the cover image from the open EPUB book and returns a small data URL. */
async function extractCover(view: FoliateView): Promise<string | null> {
	try {
		const blob = await (view.book as any)?.getCover?.();
		if (!blob) return null;

		const src = URL.createObjectURL(blob);
		return await new Promise<string>((resolve, reject) => {
			const img = new Image();
			img.onload = () => {
				try {
					// Resize to thumbnail (max 200×300)
					const maxW = 200;
					const maxH = 300;
					const scale = Math.min(maxW / img.width, maxH / img.height, 1);
					const w = Math.round(img.width * scale);
					const h = Math.round(img.height * scale);
					const canvas = document.createElement("canvas");
					canvas.width = w;
					canvas.height = h;
					const ctx = canvas.getContext("2d")!;
					ctx.drawImage(img, 0, 0, w, h);
					URL.revokeObjectURL(src);
					resolve(canvas.toDataURL("image/jpeg", 0.7));
				} catch (e) {
					URL.revokeObjectURL(src);
					reject(e);
				}
			};
			img.onerror = () => {
				URL.revokeObjectURL(src);
				reject(new Error("img load fail"));
			};
			img.src = src;
		});
	} catch {
		return null;
	}
}

function TocList({
	items,
	onNavigate,
	depth,
}: {
	items: TocItem[];
	onNavigate: (href: string) => void;
	depth: number;
}) {
	return (
		<ul>
			{items.map((item, i) => (
				<li key={`${item.href}-${i}`}>
					<button
						type="button"
						onClick={() => onNavigate(item.href)}
						className="hover:bg-accent w-full py-1.5 text-left text-sm"
						style={{
							paddingLeft: `${12 + depth * 14}px`,
							paddingRight: "12px",
						}}
					>
						{item.label}
					</button>
					{item.subitems?.length ? (
						<TocList items={item.subitems} onNavigate={onNavigate} depth={depth + 1} />
					) : null}
				</li>
			))}
		</ul>
	);
}

function EpubSearch({ view, onClose }: { view: FoliateView | null; onClose: () => void }) {
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<{ excerpt: string; href: string }[]>([]);
	const [isBusy, setIsBusy] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		inputRef.current?.focus();
	}, []);

	const handleSearch = useCallback(async () => {
		if (!view || !query.trim()) return;
		setIsBusy(true);
		setResults([]);

		try {
			const found: { excerpt: string; href: string }[] = [];
			const sections = (view.book?.sections ?? []) as Array<{
				linear?: string;
				createDocument?: () => Promise<Document | null>;
			}>;

			for (const section of sections) {
				if (section.linear === "no" || !section.createDocument) continue;
				const doc = await section.createDocument();
				if (!doc) continue;
				const text = doc.documentElement?.textContent ?? "";
				const lc = text.toLowerCase();
				const lq = query.toLowerCase();
				let idx = lc.indexOf(lq);
				while (idx !== -1 && found.length < 50) {
					const start = Math.max(0, idx - 40);
					const end = Math.min(text.length, idx + lq.length + 40);
					found.push({
						excerpt: `…${text.slice(start, end)}…`,
						href: "", // foliate sections don't easily give us hrefs here
					});
					idx = lc.indexOf(lq, idx + 1);
				}
			}
			setResults(found);
		} catch (e) {
			console.warn("Search failed:", e);
		} finally {
			setIsBusy(false);
		}
	}, [view, query]);

	return (
		<div className="bg-card flex w-72 shrink-0 flex-col overflow-hidden border-l">
			<div className="flex items-center gap-2 border-b px-3 py-2">
				<Search className="text-muted-foreground h-4 w-4 shrink-0" />
				<input
					ref={inputRef}
					type="text"
					placeholder="Search…"
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					onKeyDown={(e) => e.key === "Enter" && handleSearch()}
					className="min-w-0 flex-1 bg-transparent text-sm outline-none"
				/>
				{query && (
					<button
						type="button"
						onClick={() => {
							setQuery("");
							setResults([]);
						}}
					>
						<X className="text-muted-foreground h-4 w-4" />
					</button>
				)}
				<button type="button" onClick={onClose}>
					<X className="text-muted-foreground h-4 w-4" />
				</button>
			</div>
			<div className="px-3 py-2">
				<button
					type="button"
					onClick={handleSearch}
					disabled={isBusy || !query.trim()}
					className="bg-primary text-primary-foreground hover:bg-primary/90 w-full rounded py-1.5 text-xs disabled:opacity-50"
				>
					{isBusy ? "Searching…" : "Search"}
				</button>
			</div>
			<div className="flex-1 overflow-y-auto">
				{results.length === 0 && !isBusy && query && (
					<p className="text-muted-foreground px-3 py-4 text-center text-xs">No results found</p>
				)}
				{results.map((r, i) => (
					<button
						// biome-ignore lint/suspicious/noArrayIndexKey: search results have no stable key
						key={i}
						type="button"
						className="hover:bg-accent w-full border-b px-3 py-2 text-left text-xs"
					>
						{r.excerpt}
					</button>
				))}
			</div>
		</div>
	);
}
