"use client";

import {
	ChevronLeft,
	ChevronRight,
	List,
	Search,
	Settings,
	X,
} from "lucide-react";
import {
	type ReactNode,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";

type TocItem = { label: string; href: string; subitems?: TocItem[] };

// Shape of the foliate-view custom element after a book is opened
type FoliateView = HTMLElement & {
	open: (src: string | File | Blob | object) => Promise<void>;
	prev: () => void;
	next: () => void;
	goTo: (dest: string | number | object) => void;
	book?: {
		toc?: TocItem[];
		sections?: Array<{
			linear?: string;
			createDocument?: () => Promise<Document | null>;
		}>;
		metadata?: {
			title?: string;
			cover?: string | null;
		};
	};
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
	onPositionChange: (position: unknown) => void;
	onTextExtracted: (text: string) => void;
	onCoverExtracted?: (coverDataUrl: string) => void;
	children?: ReactNode;
}

export default function EPUBReader({
	book,
	position,
	onPositionChange,
	onTextExtracted,
	onCoverExtracted,
	children,
}: EPUBReaderProps) {
	const viewerRef = useRef<HTMLDivElement>(null);
	const folViewRef = useRef<FoliateView | null>(null);

	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [toc, setToc] = useState<TocItem[]>([]);
	const [showToc, setShowToc] = useState(false);
	const [showSearch, setShowSearch] = useState(false);
	const [showSettings, setShowSettings] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [fontSize, setFontSize] = useState(100);
	const [progress, setProgress] = useState(0);

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
				view.style.cssText = "display:block;width:100%;height:100%;";
				viewerRef.current.appendChild(view);
				folViewRef.current = view;

				// Track reading progress
				view.addEventListener("relocate", (e: Event) => {
					if (!mounted) return;
					const detail = (e as CustomEvent).detail ?? {};
					const fraction =
						typeof detail.fraction === "number" ? detail.fraction : 0;
					setProgress(Math.round(fraction * 100));
					onPositionChange({
						fraction,
						index: detail.index,
						cfi: detail.cfi ?? null,
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
				} else if (
					typeof savedPos?.fraction === "number" &&
					savedPos.fraction > 0
				) {
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
					if (
						e.key === "ArrowRight" ||
						e.key === "ArrowDown" ||
						e.key === " "
					) {
						view.next();
					} else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
						view.prev();
					}
				};
				document.addEventListener("keydown", handleKey);

				return () => {
					document.removeEventListener("keydown", handleKey);
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

	// Apply font size via CSS custom property on the foliate-view element
	useEffect(() => {
		const v = folViewRef.current;
		if (!v) return;
		try {
			// Foliate supports style injection via its renderer
			v.style.setProperty("--user-font-size", `${fontSize}%`);
		} catch {}
	}, [fontSize]);

	const goToTocItem = useCallback((href: string) => {
		try {
			folViewRef.current?.goTo(href);
		} catch {}
		setShowToc(false);
	}, []);

	return (
		<div className="relative flex h-full w-full flex-col overflow-hidden">
			{/* Toolbar */}
			<div className="flex shrink-0 items-center justify-between border-b bg-card/90 px-3 py-1.5 backdrop-blur">
				<div className="flex items-center gap-0.5">
					{toc.length > 0 && (
						<button
							type="button"
							title="Table of Contents"
							onClick={() => {
								setShowToc((v) => !v);
								setShowSearch(false);
							}}
							className={`rounded p-1.5 hover:bg-accent ${showToc ? "bg-accent" : ""}`}
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
						className={`rounded p-1.5 hover:bg-accent ${showSearch ? "bg-accent" : ""}`}
					>
						<Search className="h-4 w-4" />
					</button>
				</div>

				<span className="font-medium text-muted-foreground text-xs tabular-nums">
					{progress}%
				</span>

				<div className="flex items-center gap-0.5">
					<button
						type="button"
						title="Previous page"
						onClick={() => folViewRef.current?.prev()}
						className="rounded p-1.5 hover:bg-accent"
					>
						<ChevronLeft className="h-4 w-4" />
					</button>
					<button
						type="button"
						title="Next page"
						onClick={() => folViewRef.current?.next()}
						className="rounded p-1.5 hover:bg-accent"
					>
						<ChevronRight className="h-4 w-4" />
					</button>
					<button
						type="button"
						title="Settings"
						onClick={() => setShowSettings(!showSettings)}
						className={`rounded p-1.5 hover:bg-accent ${showSettings ? "bg-accent" : ""}`}
					>
						<Settings className="h-4 w-4" />
					</button>
				</div>
			</div>

			{/* Settings panel */}
			{showSettings && (
				<div className="shrink-0 border-b bg-card px-4 py-2">
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
					<div className="flex w-64 shrink-0 flex-col overflow-hidden border-r bg-card">
						<div className="flex items-center justify-between border-b px-3 py-2">
							<span className="font-medium text-sm">Contents</span>
							<button type="button" onClick={() => setShowToc(false)}>
								<X className="h-4 w-4 text-muted-foreground" />
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
					<EpubSearch
						view={folViewRef.current}
						onClose={() => setShowSearch(false)}
					/>
				)}
			</div>

			{/* Loading overlay */}
			{isLoading && (
				<div className="absolute inset-0 z-30 flex items-center justify-center bg-background/80 backdrop-blur-sm">
					<div className="flex flex-col items-center gap-3">
						<div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
						<p className="text-muted-foreground text-sm">Loading book…</p>
					</div>
				</div>
			)}

			{/* Error overlay */}
			{error && !isLoading && (
				<div className="absolute inset-0 z-30 flex items-center justify-center bg-background/80">
					<div className="max-w-md rounded-lg border border-destructive bg-destructive/10 p-6 text-center">
						<p className="font-semibold text-destructive">
							Failed to load book
						</p>
						<p className="mt-2 text-muted-foreground text-sm">{error}</p>
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
						className="w-full py-1.5 text-left text-sm hover:bg-accent"
						style={{
							paddingLeft: `${12 + depth * 14}px`,
							paddingRight: "12px",
						}}
					>
						{item.label}
					</button>
					{item.subitems?.length ? (
						<TocList
							items={item.subitems}
							onNavigate={onNavigate}
							depth={depth + 1}
						/>
					) : null}
				</li>
			))}
		</ul>
	);
}

function EpubSearch({
	view,
	onClose,
}: {
	view: FoliateView | null;
	onClose: () => void;
}) {
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<{ excerpt: string; href: string }[]>(
		[],
	);
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
		<div className="flex w-72 shrink-0 flex-col overflow-hidden border-l bg-card">
			<div className="flex items-center gap-2 border-b px-3 py-2">
				<Search className="h-4 w-4 shrink-0 text-muted-foreground" />
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
						<X className="h-4 w-4 text-muted-foreground" />
					</button>
				)}
				<button type="button" onClick={onClose}>
					<X className="h-4 w-4 text-muted-foreground" />
				</button>
			</div>
			<div className="px-3 py-2">
				<button
					type="button"
					onClick={handleSearch}
					disabled={isBusy || !query.trim()}
					className="w-full rounded bg-primary py-1.5 text-primary-foreground text-xs hover:bg-primary/90 disabled:opacity-50"
				>
					{isBusy ? "Searching…" : "Search"}
				</button>
			</div>
			<div className="flex-1 overflow-y-auto">
				{results.length === 0 && !isBusy && query && (
					<p className="px-3 py-4 text-center text-muted-foreground text-xs">
						No results found
					</p>
				)}
				{results.map((r, i) => (
					<button
						// biome-ignore lint/suspicious/noArrayIndexKey: search results have no stable key
						key={i}
						type="button"
						className="w-full border-b px-3 py-2 text-left text-xs hover:bg-accent"
					>
						{r.excerpt}
					</button>
				))}
			</div>
		</div>
	);
}
