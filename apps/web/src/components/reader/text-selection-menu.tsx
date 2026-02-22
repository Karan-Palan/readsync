"use client";

import { useMutation } from "@tanstack/react-query";
import {
	BookMarked,
	Lightbulb,
	List,
	MessageSquare,
	Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { trpc } from "@/utils/trpc";

interface Highlight {
	id: string;
	text: string;
	startCfi?: string | null;
	endCfi?: string | null;
	pageNumber?: number | null;
	aiAction?: string | null;
	aiResponse?: string | null;
}

interface TextSelectionMenuProps {
	bookId: string;
	fileType: string;
	onHighlightCreated: (highlight: Highlight) => void;
	onAIAction: (
		highlight: Highlight,
		action: "EXPLAIN" | "SUMMARIZE" | "EXTRACT",
	) => void;
	onChapterCreate: (startPage: number, endPage: number) => void;
}

interface MenuPosition {
	x: number;
	y: number;
}

// Custom event payload from paginator.js (foliate-js iframe selection bubble)
interface FoliateSelectionDetail {
	text: string;
	x: number;
	y: number;
}

export default function TextSelectionMenu({
	bookId,
	fileType,
	onHighlightCreated,
	onAIAction,
	onChapterCreate,
}: TextSelectionMenuProps) {
	const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
	const [selectedText, setSelectedText] = useState("");
	const menuRef = useRef<HTMLDivElement>(null);
	// Track which source the selection came from so we know how to clear it
	const selectionSource = useRef<"document" | "foliate" | null>(null);

	const createHighlightMutation = useMutation(
		trpc.highlight.create.mutationOptions(),
	);

	// PDF / standard DOM selection (react-pdf text layer lives in the document)
	const handleDocSelectionChange = useCallback(() => {
		const selection = window.getSelection();
		if (!selection || selection.isCollapsed || !selection.toString().trim()) {
			// Delay hiding so button clicks still fire before menu disappears
			setTimeout(() => {
				// Only hide if it wasn't replaced by a foliate selection
				if (selectionSource.current !== "foliate") {
					const sel = window.getSelection();
					if (!sel || sel.isCollapsed) {
						setMenuPosition(null);
						setSelectedText("");
						selectionSource.current = null;
					}
				}
			}, 200);
			return;
		}

		const text = selection.toString().trim();
		if (text.length < 2) return;

		const range = selection.getRangeAt(0);
		const rect = range.getBoundingClientRect();
		selectionSource.current = "document";
		setSelectedText(text);
		setMenuPosition({
			x: rect.left + rect.width / 2,
			y: rect.top - 10,
		});
	}, []);

	useEffect(() => {
		document.addEventListener("selectionchange", handleDocSelectionChange);
		return () => {
			document.removeEventListener("selectionchange", handleDocSelectionChange);
		};
	}, [handleDocSelectionChange]);

	// ── EPUB / foliate-view selection (bubbled from inside the iframe via paginator.js) ──
	useEffect(() => {
		const handleFoliateSelection = (e: Event) => {
			const detail = (e as CustomEvent<FoliateSelectionDetail | null>).detail;
			if (detail && detail.text.length >= 2) {
				selectionSource.current = "foliate";
				setSelectedText(detail.text);
				// Clamp to ensure the menu doesn't go off-screen at the top
				setMenuPosition({
					x: detail.x,
					y: Math.max(60, detail.y),
				});
			} else {
				// Delay so button clicks inside the menu still fire before we hide
				setTimeout(() => {
					if (selectionSource.current === "foliate") {
						setMenuPosition(null);
						setSelectedText("");
						selectionSource.current = null;
					}
				}, 200);
			}
		};

		window.addEventListener("foliate-selection", handleFoliateSelection);
		return () => {
			window.removeEventListener("foliate-selection", handleFoliateSelection);
		};
	}, []);

	const createAndPerformAction = useCallback(
		async (action?: "EXPLAIN" | "SUMMARIZE" | "EXTRACT") => {
			if (!selectedText) return;

			const result = await createHighlightMutation.mutateAsync({
				bookId,
				text: selectedText,
				pageNumber: undefined,
			});

			const highlight: Highlight = {
				id: result.id,
				text: result.text,
				startCfi: result.startCfi,
				endCfi: result.endCfi,
				pageNumber: result.pageNumber,
				aiAction: null,
				aiResponse: null,
			};

			onHighlightCreated(highlight);

			if (action) {
				onAIAction(highlight, action);
			}

			// Cleanup
			setMenuPosition(null);
			setSelectedText("");
			selectionSource.current = null;
			window.getSelection()?.removeAllRanges();
		},
		[
			bookId,
			selectedText,
			createHighlightMutation,
			onHighlightCreated,
			onAIAction,
		],
	);

	if (!menuPosition) return null;

	return (
		<div
			ref={menuRef}
			className="fixed z-50 flex items-center gap-0.5 rounded-lg border bg-card p-1 shadow-xl"
			style={{
				left: menuPosition.x,
				top: menuPosition.y,
				transform: "translate(-50%, -100%)",
			}}
		>
			<button
				type="button"
				onMouseDown={(e) => e.preventDefault()} // prevent clearing selection on click
				onClick={() => createAndPerformAction()}
				className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs hover:bg-accent"
				title="Highlight"
			>
				<BookMarked className="h-3.5 w-3.5" />
				<span className="hidden sm:inline">Highlight</span>
			</button>
			<button
				type="button"
				onMouseDown={(e) => e.preventDefault()}
				onClick={() => createAndPerformAction("EXPLAIN")}
				className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs hover:bg-accent"
				title="Explain"
			>
				<Lightbulb className="h-3.5 w-3.5" />
				<span className="hidden sm:inline">Explain</span>
			</button>
			<button
				type="button"
				onMouseDown={(e) => e.preventDefault()}
				onClick={() => createAndPerformAction("SUMMARIZE")}
				className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs hover:bg-accent"
				title="Summarize"
			>
				<MessageSquare className="h-3.5 w-3.5" />
				<span className="hidden sm:inline">Summarize</span>
			</button>
			<button
				type="button"
				onMouseDown={(e) => e.preventDefault()}
				onClick={() => createAndPerformAction("EXTRACT")}
				className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs hover:bg-accent"
				title="Extract insights"
			>
				<Sparkles className="h-3.5 w-3.5" />
				<span className="hidden sm:inline">Extract</span>
			</button>
			<button
				type="button"
				onMouseDown={(e) => e.preventDefault()}
				onClick={() => {
					let page = 1;
					if (fileType === "PDF") {
						const selection = window.getSelection();
						if (selection?.rangeCount) {
							const anchor =
								selection.getRangeAt(0).startContainer.parentElement;
							const pageEl = anchor?.closest(".react-pdf__Page");
							const pageNum = pageEl?.getAttribute("data-page-number");
							if (pageNum) page = Number.parseInt(pageNum, 10);
						}
					}
					onChapterCreate(page, page);
					setMenuPosition(null);
					selectionSource.current = null;
				}}
				className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs hover:bg-accent"
				title="Create chapter"
			>
				<List className="h-3.5 w-3.5" />
				<span className="hidden sm:inline">Chapter</span>
			</button>
		</div>
	);
}
