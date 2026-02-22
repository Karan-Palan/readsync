"use client";

import { useMutation } from "@tanstack/react-query";
import { Lightbulb, List, MessageSquare, MessageSquarePlus, Save, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { trpc } from "@/utils/trpc";

interface Highlight {
	id: string;
	text: string;
	color: string;
	startCfi?: string | null;
	endCfi?: string | null;
	pageNumber?: number | null;
	aiAction?: string | null;
	aiResponse?: string | null;
	note?: string | null;
}

interface TextSelectionMenuProps {
	bookId: string;
	fileType: string;
	onHighlightCreated: (highlight: Highlight) => void;
	onAIAction: (highlight: Highlight, action: "EXPLAIN" | "SUMMARIZE" | "EXTRACT" | "DISCUSS") => void;
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
}

const HIGHLIGHT_COLORS = [
	{ id: "yellow", bg: "bg-yellow-300", label: "Yellow" },
	{ id: "green", bg: "bg-green-300", label: "Green" },
	{ id: "blue", bg: "bg-blue-300", label: "Blue" },
	{ id: "pink", bg: "bg-pink-300", label: "Pink" },
] as const;

export default function TextSelectionMenu({
	bookId,
	fileType,
	onHighlightCreated,
	onAIAction,
	onChapterCreate,
}: TextSelectionMenuProps) {
	const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
	const [selectedText, setSelectedText] = useState("");
	const [showNoteInput, setShowNoteInput] = useState(false);
	const [noteText, setNoteText] = useState("");
	const [pendingHighlight, setPendingHighlight] = useState<Highlight | null>(null);
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
				setShowNoteInput(false);
				setNoteText("");
				setPendingHighlight(null);
				setMenuPosition({ x: detail.x, y: Math.max(60, detail.y) });
			} else {
				setTimeout(() => {
					if (selectionSource.current === "foliate") {
						setMenuPosition(null);
						setSelectedText("");
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
		async (color: string, action?: "EXPLAIN" | "SUMMARIZE" | "EXTRACT" | "DISCUSS") => {
			if (!selectedText) return;

			let pageNumber: number | undefined;
			if (fileType === "PDF") {
				const selection = window.getSelection();
				if (selection?.rangeCount) {
					const anchor = selection.getRangeAt(0).startContainer.parentElement;
					const pageEl = anchor?.closest(".react-pdf__Page");
					const num = pageEl?.getAttribute("data-page-number");
					if (num) pageNumber = Number.parseInt(num, 10);
				}
			}

			const result = await createHighlightMutation.mutateAsync({
				bookId,
				text: selectedText,
				color,
				pageNumber,
			});

			const highlight: Highlight = {
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

			onHighlightCreated(highlight);

			if (action) {
				onAIAction(highlight, action);
			}

			// Hide menu but keep reference for note
			setMenuPosition(null);
			setSelectedText("");
			selectionSource.current = null;
			window.getSelection()?.removeAllRanges();

			return highlight;
		},
		[bookId, selectedText, fileType, createHighlightMutation, onHighlightCreated, onAIAction],
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

		let pageNumber: number | undefined;
		if (fileType === "PDF") {
			const selection = window.getSelection();
			if (selection?.rangeCount) {
				const anchor = selection.getRangeAt(0).startContainer.parentElement;
				const pageEl = anchor?.closest(".react-pdf__Page");
				const num = pageEl?.getAttribute("data-page-number");
				if (num) pageNumber = Number.parseInt(num, 10);
			}
		}

		const result = await createHighlightMutation.mutateAsync({
			bookId,
			text: selectedText,
			color: "yellow",
			pageNumber,
		});

		if (noteText.trim()) {
			await updateHighlightMutation.mutateAsync({ id: result.id, note: noteText.trim() });
		}

		const highlight: Highlight = {
			id: result.id,
			text: result.text,
			color: result.color,
			startCfi: result.startCfi,
			endCfi: result.endCfi,
			pageNumber: result.pageNumber,
			aiAction: null,
			aiResponse: null,
			note: noteText.trim() || null,
		};

		onHighlightCreated(highlight);
		setMenuPosition(null);
		setSelectedText("");
		setShowNoteInput(false);
		setNoteText("");
		selectionSource.current = null;
		window.getSelection()?.removeAllRanges();
	}, [
		bookId,
		selectedText,
		noteText,
		fileType,
		createHighlightMutation,
		updateHighlightMutation,
		onHighlightCreated,
	]);

	const handleChapterCreate = useCallback(() => {
		let page = 1;
		if (fileType === "PDF") {
			const selection = window.getSelection();
			if (selection?.rangeCount) {
				const anchor = selection.getRangeAt(0).startContainer.parentElement;
				const pageEl = anchor?.closest(".react-pdf__Page");
				const num = pageEl?.getAttribute("data-page-number");
				if (num) page = Number.parseInt(num, 10);
			}
		}
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
				top: `clamp(56px, ${menuPosition.y}px, calc(100vh - 60px))`,
				transform: "translate(-50%, -100%)",
				minWidth: showNoteInput ? "280px" : undefined,
			}}
			onMouseDown={(e) => e.preventDefault()}
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
							className={`${c.bg} h-6 w-6 flex-shrink-0 rounded-full border-2 border-transparent transition-transform hover:scale-110 hover:border-border`}
							title={`Highlight ${c.label}`}
						/>
					))}

					<div className="mx-1 h-5 w-px bg-border" />

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
						<X className="h-3 w-3 text-muted-foreground" />
					</button>
				</div>
			) : (
				/* Note input */
				<div className="flex flex-col gap-2 p-3" onMouseDown={(e) => e.stopPropagation()}>
					<div className="flex items-center justify-between">
						<span className="text-xs font-medium">Add a note</span>
						<button type="button" onClick={dismiss} className="hover:bg-accent rounded p-0.5">
							<X className="h-3.5 w-3.5 text-muted-foreground" />
						</button>
					</div>
					<p className="line-clamp-2 rounded bg-muted/50 px-2 py-1 text-xs italic text-muted-foreground">
						&ldquo;{selectedText}&rdquo;
					</p>
					<textarea
						className="min-h-[80px] w-full resize-none rounded-md border bg-background p-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
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
							className="flex flex-1 items-center justify-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground disabled:opacity-50"
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

