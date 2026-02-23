"use client";

import { useMutation } from "@tanstack/react-query";
import { Lightbulb, List, MessageSquare, MessageSquarePlus, Save, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { getPdfPageNumber } from "@/lib/pdf-utils";
import { putHighlight } from "@/lib/offline-db";
import { type AIAction, HIGHLIGHT_COLORS, type Highlight } from "@/types/reader";
import { trpc } from "@/utils/trpc";

interface TextSelectionMenuProps {
	bookId: string;
	userId: string;
	fileType: string;
	isOnline: boolean;
	onHighlightCreated: (highlight: Highlight) => void;
	onAIAction: (highlight: Highlight, action: AIAction) => void;
	onChapterCreate: (startPage: number, endPage: number) => void;
}

interface MenuPosition {
	x: number;
	y: number;
}

interface FoliateSelectionDetail {
	text: string;
	x: number;
	y: number;
	cfi?: string;
}

export default function TextSelectionMenu({
	bookId,
	userId,
	fileType,
	isOnline,
	onHighlightCreated,
	onAIAction,
	onChapterCreate,
}: TextSelectionMenuProps) {
	const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
	const [selectedText, setSelectedText] = useState("");
	const [showNoteInput, setShowNoteInput] = useState(false);
	const [noteText, setNoteText] = useState("");
	const [pendingHighlight, setPendingHighlight] = useState<Highlight | null>(null);
	const [selectedCfi, setSelectedCfi] = useState<string | undefined>(undefined);
	const menuRef = useRef<HTMLDivElement>(null);
	const selectionSource = useRef<"document" | "foliate" | null>(null);

	const createHighlightMutation = useMutation(trpc.highlight.create.mutationOptions());
	const updateHighlightMutation = useMutation(trpc.highlight.update.mutationOptions());

	const handleDocSelectionChange = useCallback(() => {
		const selection = window.getSelection();
		if (!selection || selection.isCollapsed || !selection.toString().trim()) {
			setTimeout(() => {
				if (selectionSource.current !== "foliate") {
					const sel = window.getSelection();
					if (!sel || sel.isCollapsed) {
						setMenuPosition(null);
						setSelectedText("");
						setShowNoteInput(false);
						setNoteText("");
						setPendingHighlight(null);
						selectionSource.current = null;
					}
				}
			}, 200);
			return;
		}

		const text = selection.toString().trim();
		if (text.length < 2) return;

		const range = selection.getRangeAt(0);
		const node =
			range.commonAncestorContainer.nodeType === 1
				? (range.commonAncestorContainer as Element)
				: range.commonAncestorContainer.parentElement;

		if (!node) return;

		if (node.closest("[data-ai-panel='true']")) {
			setMenuPosition(null);
			setSelectedText("");
			return;
		}

		if (fileType === "PDF" && !node.closest(".react-pdf__Page__textContent")) {
			return;
		}

		const rect = range.getBoundingClientRect();
		selectionSource.current = "document";
		setSelectedText(text);
		setShowNoteInput(false);
		setNoteText("");
		setPendingHighlight(null);
		setMenuPosition({
			x: rect.left + rect.width / 2,
			y: rect.top - 10,
		});
	}, [fileType]);

	useEffect(() => {
		document.addEventListener("selectionchange", handleDocSelectionChange);
		return () => document.removeEventListener("selectionchange", handleDocSelectionChange);
	}, [handleDocSelectionChange]);

	useEffect(() => {
		const handleFoliateSelection = (e: Event) => {
			const detail = (e as CustomEvent<FoliateSelectionDetail | null>).detail;
			if (detail && detail.text.length >= 2) {
				selectionSource.current = "foliate";
				setSelectedText(detail.text);
				setSelectedCfi(detail.cfi);
				setShowNoteInput(false);
				setNoteText("");
				setPendingHighlight(null);
				// detail.y is now the BOTTOM of the selection + 8 px
				setMenuPosition({ x: detail.x, y: detail.y });
			} else {
				setTimeout(() => {
					if (selectionSource.current === "foliate") {
						setMenuPosition(null);
						setSelectedText("");
						setSelectedCfi(undefined);
						setShowNoteInput(false);
						setNoteText("");
						setPendingHighlight(null);
						selectionSource.current = null;
					}
				}, 200);
			}
		};
		window.addEventListener("foliate-selection", handleFoliateSelection);
		return () => window.removeEventListener("foliate-selection", handleFoliateSelection);
	}, []);

	const createHighlight = useCallback(
		async (color: string, action?: AIAction) => {
			if (!selectedText) return;

			const pageNumber = fileType === "PDF" ? getPdfPageNumber() : undefined;

			let highlight: Highlight;

			if (!isOnline) {
				// Offline: create local highlight with temp ID
				const tempId = crypto.randomUUID();
				highlight = {
					id: tempId,
					text: selectedText,
					color,
					startCfi: selectedCfi ?? null,
					endCfi: null,
					pageNumber: pageNumber ?? null,
					aiAction: null,
					aiResponse: null,
					note: null,
				};

				await putHighlight({
					id: tempId,
					bookId,
					userId,
					text: selectedText,
					color,
					startCfi: selectedCfi ?? null,
					endCfi: null,
					pageNumber: pageNumber ?? null,
					aiAction: null,
					aiResponse: null,
					note: null,
					createdAt: Date.now(),
					syncStatus: "pending_create",
					tempId,
				}).catch(() => {});
			} else {
				const result = await createHighlightMutation.mutateAsync({
					bookId,
					text: selectedText,
					color,
					pageNumber,
					startCfi: selectedCfi,
				});

				highlight = {
					id: result.id,
					text: result.text,
					color: result.color,
					startCfi: result.startCfi,
					endCfi: result.endCfi,
					pageNumber: result.pageNumber,
					aiAction: null,
					aiResponse: null,
					note: null,
				};

				// Persist to IDB as synced
				await putHighlight({
					id: result.id,
					bookId,
					userId,
					text: result.text,
					color: result.color,
					startCfi: result.startCfi ?? null,
					endCfi: result.endCfi ?? null,
					pageNumber: result.pageNumber ?? null,
					aiAction: null,
					aiResponse: null,
					note: null,
					createdAt: Date.now(),
					syncStatus: "synced",
					tempId: null,
				}).catch(() => {});
			}

			onHighlightCreated(highlight);

			if (action && isOnline) {
				onAIAction(highlight, action);
			}

			// Hide menu but keep reference for note
			setMenuPosition(null);
			setSelectedText("");
			setSelectedCfi(undefined);
			selectionSource.current = null;
			window.getSelection()?.removeAllRanges();

			return highlight;
		},
		[
			bookId,
			userId,
			selectedText,
			selectedCfi,
			fileType,
			isOnline,
			createHighlightMutation,
			onHighlightCreated,
			onAIAction,
		],
	);

	const handleHighlightColor = useCallback(
		(color: string) => {
			createHighlight(color);
		},
		[createHighlight],
	);

	const handleNoteOpen = useCallback(async () => {
		// First create the highlight with default color, then add note
		setShowNoteInput(true);
	}, []);

	const handleNoteSave = useCallback(async () => {
		if (!selectedText) return;

		const pageNumber = fileType === "PDF" ? getPdfPageNumber() : undefined;
		const trimmedNote = noteText.trim() || null;

		let highlight: Highlight;

		if (!isOnline) {
			const tempId = crypto.randomUUID();
			highlight = {
				id: tempId,
				text: selectedText,
				color: "yellow",
				startCfi: selectedCfi ?? null,
				endCfi: null,
				pageNumber: pageNumber ?? null,
				aiAction: null,
				aiResponse: null,
				note: trimmedNote,
			};
			await putHighlight({
				id: tempId,
				bookId,
				userId,
				text: selectedText,
				color: "yellow",
				startCfi: selectedCfi ?? null,
				endCfi: null,
				pageNumber: pageNumber ?? null,
				aiAction: null,
				aiResponse: null,
				note: trimmedNote,
				createdAt: Date.now(),
				syncStatus: "pending_create",
				tempId,
			}).catch(() => {});
		} else {
			const result = await createHighlightMutation.mutateAsync({
				bookId,
				text: selectedText,
				color: "yellow",
				pageNumber,
				startCfi: selectedCfi,
			});

			if (noteText.trim()) {
				await updateHighlightMutation.mutateAsync({
					id: result.id,
					note: noteText.trim(),
				});
			}

			highlight = {
				id: result.id,
				text: result.text,
				color: result.color,
				startCfi: result.startCfi,
				endCfi: result.endCfi,
				pageNumber: result.pageNumber,
				aiAction: null,
				aiResponse: null,
				note: trimmedNote,
			};

			await putHighlight({
				id: result.id,
				bookId,
				userId,
				text: result.text,
				color: result.color,
				startCfi: result.startCfi ?? null,
				endCfi: result.endCfi ?? null,
				pageNumber: result.pageNumber ?? null,
				aiAction: null,
				aiResponse: null,
				note: trimmedNote,
				createdAt: Date.now(),
				syncStatus: "synced",
				tempId: null,
			}).catch(() => {});
		}

		onHighlightCreated(highlight);
		setMenuPosition(null);
		setSelectedText("");
		setSelectedCfi(undefined);
		setShowNoteInput(false);
		setNoteText("");
		selectionSource.current = null;
		window.getSelection()?.removeAllRanges();
	}, [
		bookId,
		userId,
		selectedText,
		selectedCfi,
		noteText,
		fileType,
		isOnline,
		createHighlightMutation,
		updateHighlightMutation,
		onHighlightCreated,
	]);

	const handleChapterCreate = useCallback(() => {
		const page = (fileType === "PDF" ? getPdfPageNumber() : undefined) ?? 1;
		onChapterCreate(page, page);
		setMenuPosition(null);
		selectionSource.current = null;
	}, [fileType, onChapterCreate]);

	const dismiss = useCallback(() => {
		setMenuPosition(null);
		setSelectedText("");
		setShowNoteInput(false);
		setNoteText("");
		setPendingHighlight(null);
		selectionSource.current = null;
		window.getSelection()?.removeAllRanges();
	}, []);

	if (!menuPosition && !showNoteInput) return null;
	if (!menuPosition) return null;

	return (
		<div
			ref={menuRef}
			className="bg-card fixed z-50 flex flex-col rounded-xl border shadow-2xl"
			style={{
				left: `clamp(100px, ${menuPosition.x}px, calc(100vw - 100px))`,
				// Menu is anchored BELOW the selection; clamp so it never goes off-screen
				top: `clamp(60px, ${menuPosition.y}px, calc(100vh - 120px))`,
				transform: "translate(-50%, 0)",
				minWidth: showNoteInput ? "280px" : undefined,
			}}
			onMouseDown={(e) => e.preventDefault()}
			onTouchStart={(e) => e.preventDefault()}
		>
			{!showNoteInput ? (
				/* Main action bar */
				<div className="flex items-center gap-0.5 p-1">
					{/* Color swatches */}
					{HIGHLIGHT_COLORS.map((c) => (
						<button
							key={c.id}
							type="button"
							onClick={() => handleHighlightColor(c.id)}
							className={`${c.bg} hover:border-border h-6 w-6 flex-shrink-0 rounded-full border-2 border-transparent transition-transform hover:scale-110`}
							title={`Highlight ${c.label}`}
						/>
					))}

					<div className="bg-border mx-1 h-5 w-px" />

					{/* Note */}
					<button
						type="button"
						onClick={handleNoteOpen}
						className="hover:bg-accent flex items-center gap-1 rounded-md px-2 py-1.5 text-xs"
						title="Add note"
					>
						<Save className="h-3.5 w-3.5" />
						<span className="hidden sm:inline">Note</span>
					</button>

					{/* AI actions */}
					{isOnline && (
						<>
							<button
								type="button"
								onClick={() => createHighlight("yellow", "SUMMARIZE")}
								className="hover:bg-accent flex items-center gap-1 rounded-md px-2 py-1.5 text-xs"
								title="Summarize"
							>
								<MessageSquare className="h-3.5 w-3.5" />
								<span className="hidden sm:inline">Summary</span>
							</button>
							<button
								type="button"
								onClick={() => createHighlight("yellow", "EXTRACT")}
								className="hover:bg-accent flex items-center gap-1 rounded-md px-2 py-1.5 text-xs"
								title="Extract insights"
							>
								<Sparkles className="h-3.5 w-3.5" />
								<span className="hidden sm:inline">Extract</span>
							</button>
							<button
								type="button"
								onClick={() => createHighlight("yellow", "DISCUSS")}
								className="hover:bg-accent flex items-center gap-1 rounded-md px-2 py-1.5 text-xs"
								title="Discuss this idea"
							>
								<Lightbulb className="h-3.5 w-3.5" />
								<span className="hidden sm:inline">Discuss</span>
							</button>
						</>
					)}
					<button
						type="button"
						onClick={handleChapterCreate}
						className="hover:bg-accent flex items-center gap-1 rounded-md px-2 py-1.5 text-xs"
						title="Create chapter"
					>
						<List className="h-3.5 w-3.5" />
					</button>

					{/* Dismiss */}
					<button
						type="button"
						onClick={dismiss}
						className="hover:bg-accent ml-0.5 rounded-md p-1"
						title="Dismiss"
					>
						<X className="text-muted-foreground h-3 w-3" />
					</button>
				</div>
			) : (
				/* Note input */
				<div className="flex flex-col gap-2 p-3" onMouseDown={(e) => e.stopPropagation()}>
					<div className="flex items-center justify-between">
						<span className="text-xs font-medium">Add a note</span>
						<button type="button" onClick={dismiss} className="hover:bg-accent rounded p-0.5">
							<X className="text-muted-foreground h-3.5 w-3.5" />
						</button>
					</div>
					<p className="bg-muted/50 text-muted-foreground line-clamp-2 rounded px-2 py-1 text-xs italic">
						&ldquo;{selectedText}&rdquo;
					</p>
					<textarea
						className="bg-background focus:ring-ring min-h-[80px] w-full resize-none rounded-md border p-2 text-xs focus:ring-2 focus:outline-none"
						placeholder="Your note…"
						value={noteText}
						onChange={(e) => setNoteText(e.target.value)}
						// biome-ignore lint/a11y/noAutofocus: intentional focus for note input
						autoFocus
					/>
					<div className="flex gap-2">
						<button
							type="button"
							onClick={handleNoteSave}
							disabled={createHighlightMutation.isPending}
							className="bg-primary text-primary-foreground flex flex-1 items-center justify-center gap-1 rounded-md px-3 py-1.5 text-xs disabled:opacity-50"
						>
							<MessageSquarePlus className="h-3.5 w-3.5" />
							Save
						</button>
						<button
							type="button"
							onClick={() => setShowNoteInput(false)}
							className="hover:bg-accent rounded-md px-3 py-1.5 text-xs"
						>
							Back
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
