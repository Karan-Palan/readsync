"use client";

import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, Sparkles } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import AIBottomSheet from "@/components/reader/ai-bottom-sheet";
import AIDrawer from "@/components/reader/ai-drawer";
import ChapterList from "@/components/reader/chapter-list";
import ChunkedSpeedMode from "@/components/reader/chunked-speed-mode";
import HighlightLayer from "@/components/reader/highlight-layer";
import ReadingModeSelector, { type ReadingMode } from "@/components/reader/reading-mode-selector";
import RSVPMode from "@/components/reader/rsvp-mode";
import TextSelectionMenu from "@/components/reader/text-selection-menu";
import { trpc } from "@/utils/trpc";

// Dynamic import — PDF.js uses DOMMatrix at module level (browser-only)
const NormalMode = dynamic(() => import("@/components/reader/normal-mode"), {
	ssr: false,
	loading: () => <ReaderLoading />,
});

function ReaderLoading() {
	return (
		<div className="flex h-full items-center justify-center">
			<div className="border-primary h-10 w-10 animate-spin rounded-full border-4 border-t-transparent" />
		</div>
	);
}

interface Highlight {
	id: string;
	text: string;
	startCfi?: string | null;
	endCfi?: string | null;
	pageNumber?: number | null;
	aiAction?: string | null;
	aiResponse?: string | null;
}

interface Chapter {
	id: string;
	name: string;
	startPage: number;
	endPage: number;
	order: number;
}

interface ReaderProps {
	book: {
		id: string;
		title: string;
		fileName: string;
		fileUrl: string;
		fileType: string;
		coverUrl?: string | null;
		totalPages: number | null;
	};
	initialProgress: unknown;
	initialHighlights: Highlight[];
	initialChapters: Chapter[];
}

export default function Reader({
	book,
	initialProgress,
	initialHighlights,
	initialChapters,
}: ReaderProps) {
	const router = useRouter();
	const [currentMode, setCurrentMode] = useState<ReadingMode>("normal");
	const [currentPosition, setCurrentPosition] = useState<unknown>(initialProgress);
	const [highlights, setHighlights] = useState<Highlight[]>(initialHighlights);
	const [chapters, setChapters] = useState<Chapter[]>(initialChapters);
	const [activeHighlight, setActiveHighlight] = useState<Highlight | null>(null);
	const [isAIOpen, setIsAIOpen] = useState(false);
	const [aiAction, setAiAction] = useState<"EXPLAIN" | "SUMMARIZE" | "EXTRACT" | null>(null);
	const [bookText, setBookText] = useState<string>("");
	// Fraction 0-1 tracked from EPUB/PDF reader for RSVP/Chunked start position
	const [readingFraction, setReadingFraction] = useState(0);
	const [isChapterListOpen, setIsChapterListOpen] = useState(false);
	const [chapterFormDefaults, setChapterFormDefaults] = useState<{
		startPage: number;
		endPage: number;
	} | null>(null);
	// Focus mode: strip width as % of viewport (30–95) — defaults to 60%
	const [focusWidthPct, setFocusWidthPct] = useState(60);
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const saveProgressMutation = useMutation(trpc.book.saveProgress.mutationOptions());
	const updateCoverMutation = useMutation(trpc.book.updateCover.mutationOptions());

	const handleCoverExtracted = useCallback(
		(coverDataUrl: string) => {
			if (!book.coverUrl) {
				updateCoverMutation.mutate({ bookId: book.id, coverUrl: coverDataUrl });
			}
		},
		[book.id, book.coverUrl, updateCoverMutation],
	);

	const onPositionChange = useCallback(
		(position: unknown) => {
			setCurrentPosition(position);
			if (position && typeof position === "object" && "fraction" in position) {
				setReadingFraction((position as { fraction: number }).fraction ?? 0);
			}
			if (debounceRef.current) clearTimeout(debounceRef.current);
			debounceRef.current = setTimeout(() => {
				saveProgressMutation.mutate({ bookId: book.id, position });
			}, 1000);
		},
		[book.id, saveProgressMutation],
	);

	useEffect(() => {
		return () => {
			if (debounceRef.current) clearTimeout(debounceRef.current);
		};
	}, []);

	const handleHighlightCreated = useCallback((highlight: Highlight) => {
		setHighlights((prev) => [highlight, ...prev]);
	}, []);

	const handleAIAction = useCallback(
		(highlight: Highlight, action: "EXPLAIN" | "SUMMARIZE" | "EXTRACT") => {
			setActiveHighlight(highlight);
			setAiAction(action);
			setIsAIOpen(true);
		},
		[],
	);

	const handleCloseAI = useCallback(() => {
		setIsAIOpen(false);
		setActiveHighlight(null);
		setAiAction(null);
	}, []);

	const handleChapterJump = useCallback(
		(startPage: number) => {
			onPositionChange({ page: startPage });
			setIsChapterListOpen(false);
		},
		[onPositionChange],
	);

	const handleChapterCreated = useCallback((chapter: Chapter) => {
		setChapters((prev) => [...prev, chapter].sort((a, b) => a.order - b.order));
	}, []);

	const handleHighlightClick = useCallback((h: Highlight) => {
		setActiveHighlight(h);
		if (h.aiResponse && h.aiAction) {
			setAiAction(h.aiAction as "EXPLAIN" | "SUMMARIZE" | "EXTRACT");
		} else {
			setAiAction("EXPLAIN");
		}
		setIsAIOpen(true);
	}, []);

	const handleChapterCreate = useCallback((startPage: number, endPage: number) => {
		setChapterFormDefaults({ startPage, endPage });
		setIsChapterListOpen(true);
	}, []);

	// AI shortcut: summarize selected text or current section excerpt
	const handleQuickAI = useCallback(() => {
		const selected = window.getSelection()?.toString().trim() ?? "";
		const text = selected.length > 10 ? selected : bookText.slice(0, 2000);
		if (!text) return;
		const pseudo: Highlight = { id: "__quick__", text };
		setActiveHighlight(pseudo);
		setAiAction("SUMMARIZE");
		setIsAIOpen(true);
	}, [bookText]);

	// Focus overlay gradient — keeps the center strip bright, dims edges
	const focusMaskStyle =
		currentMode === "focus"
			? {
					background: `linear-gradient(to right,
						rgba(0,0,0,0.7) 0%,
						rgba(0,0,0,0.7) calc(50% - ${focusWidthPct / 2}%),
						transparent calc(50% - ${focusWidthPct / 2}%),
						transparent calc(50% + ${focusWidthPct / 2}%),
						rgba(0,0,0,0.7) calc(50% + ${focusWidthPct / 2}%),
						rgba(0,0,0,0.7) 100%)`,
				}
			: undefined;

	const showReader = currentMode === "normal" || currentMode === "focus";
	const showTextSelection = showReader;

	return (
		// h-dvh: true viewport height that accounts for mobile browser chrome
		<div className="bg-background relative flex h-dvh flex-col overflow-hidden">
			{/* Top bar */}
			<header className="flex shrink-0 items-center justify-between border-b px-3 py-2 sm:px-4">
				<button
					type="button"
					onClick={() => router.push("/library" as any)}
					className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm"
				>
					<ArrowLeft className="h-4 w-4" />
					<span className="hidden sm:inline">Back</span>
				</button>

				<h2 className="max-w-[45%] truncate text-sm font-medium sm:max-w-[55%]">{book.title}</h2>

				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={handleQuickAI}
						className="bg-primary/10 text-primary hover:bg-primary/20 flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors"
						title="AI: summarise selection or section"
					>
						<Sparkles className="h-3.5 w-3.5" />
						<span className="hidden sm:inline">AI</span>
					</button>
					<button
						type="button"
						onClick={() => setIsChapterListOpen(!isChapterListOpen)}
						className="text-muted-foreground hover:text-foreground text-sm"
					>
						<span className="hidden sm:inline">Chapters</span>
						<span className="text-xs sm:hidden">Ch.</span>
					</button>
				</div>
			</header>

			{/* Reading area */}
			<div className="relative min-h-0 flex-1">
				{/*
				 * NormalMode is ALWAYS mounted here — never unmounted when switching
				 * modes. This keeps the EPUB renderer (foliate-view) alive so it never
				 * has to reload the book. RSVP / Chunked render as full-screen overlays
				 * on top; Focus mode adds only a visual gradient.
				 */}
				<div className="absolute inset-0">
					<NormalMode
						book={book}
						position={currentPosition}
						onPositionChange={onPositionChange}
						onTextExtracted={setBookText}
						onCoverExtracted={handleCoverExtracted}
					>
						<HighlightLayer
							highlights={highlights}
							fileType={book.fileType}
							onHighlightClick={handleHighlightClick}
						/>
					</NormalMode>
				</div>

				{/* Focus mode: gradient mask + width slider */}
				{currentMode === "focus" && (
					<>
						{/* Dim overlay (pointer-events-none so reader stays interactive) */}
						<div
							className="pointer-events-none absolute inset-0 z-10 transition-all"
							style={focusMaskStyle}
						/>

						{/* Width control — positioned top-right, above overlay */}
						<div className="bg-card/90 absolute top-2 right-3 z-20 flex items-center gap-2 rounded-lg border px-3 py-1.5 shadow-md backdrop-blur">
							<span className="text-muted-foreground text-xs">Width</span>
							<input
								type="range"
								min={25}
								max={95}
								step={5}
								value={focusWidthPct}
								onChange={(e) => setFocusWidthPct(Number(e.target.value))}
								className="w-20 sm:w-28"
							/>
							<span className="text-muted-foreground w-7 text-right font-mono text-xs">
								{focusWidthPct}%
							</span>
						</div>
					</>
				)}

				{/*  RSVP: full-screen overlay so NormalMode stays mounted below  */}
				{currentMode === "rsvp" && (
					<div className="bg-background absolute inset-0 z-30">
						<RSVPMode
							text={bookText}
							startFraction={readingFraction}
							onExit={() => setCurrentMode("normal")}
						/>
					</div>
				)}

				{/*  Chunked: same pattern as RSVP  */}
				{currentMode === "chunked" && (
					<div className="bg-background absolute inset-0 z-30">
						<ChunkedSpeedMode
							text={bookText}
							startFraction={readingFraction}
							onExit={() => setCurrentMode("normal")}
						/>
					</div>
				)}

				{/*  Text selection popup (PDF + EPUB via foliate-selection events)  */}
				{showTextSelection && (
					<TextSelectionMenu
						bookId={book.id}
						fileType={book.fileType}
						onHighlightCreated={handleHighlightCreated}
						onAIAction={handleAIAction}
						onChapterCreate={handleChapterCreate}
					/>
				)}

				{/*  Chapter list sidebar / bottom-sheet  */}
				{isChapterListOpen && (
					<ChapterList
						bookId={book.id}
						chapters={chapters}
						onJump={handleChapterJump}
						onChapterCreated={handleChapterCreated}
						onClose={() => {
							setIsChapterListOpen(false);
							setChapterFormDefaults(null);
						}}
						initialStartPage={chapterFormDefaults?.startPage}
						initialEndPage={chapterFormDefaults?.endPage}
						autoOpenForm={chapterFormDefaults != null}
					/>
				)}

				{/*  AI panel: drawer on desktop, bottom-sheet on mobile  */}
				{isAIOpen && activeHighlight && aiAction && (
					<>
						<div className="hidden md:block">
							<AIDrawer
								highlight={activeHighlight}
								action={aiAction}
								onClose={handleCloseAI}
								onResponseReceived={(id, response) => {
									setHighlights((prev) =>
										prev.map((h) => (h.id === id ? { ...h, aiAction, aiResponse: response } : h)),
									);
								}}
							/>
						</div>
						<div className="md:hidden">
							<AIBottomSheet
								highlight={activeHighlight}
								action={aiAction}
								onClose={handleCloseAI}
								onResponseReceived={(id, response) => {
									setHighlights((prev) =>
										prev.map((h) => (h.id === id ? { ...h, aiAction, aiResponse: response } : h)),
									);
								}}
							/>
						</div>
					</>
				)}
			</div>

			{/*  Mode selector bar  */}
			<ReadingModeSelector currentMode={currentMode} onModeChange={setCurrentMode} />
		</div>
	);
}
