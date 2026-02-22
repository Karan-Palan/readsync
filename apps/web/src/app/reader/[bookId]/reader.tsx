"use client";

import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, BookOpen, Moon, Sparkles, Sun } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
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
	color?: string | null;
	note?: string | null;
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
	initialHighestPosition: unknown;
	initialHighlights: Highlight[];
	initialChapters: Chapter[];
}

export default function Reader({
	book,
	initialProgress,
	initialHighestPosition,
	initialHighlights,
	initialChapters,
}: ReaderProps) {
	const router = useRouter();
	const { theme, setTheme } = useTheme();
	const [currentMode, setCurrentMode] = useState<ReadingMode>("normal");
	const [currentPosition, setCurrentPosition] = useState<unknown>(initialProgress);
	const [highlights, setHighlights] = useState<Highlight[]>(initialHighlights);
	const [chapters, setChapters] = useState<Chapter[]>(initialChapters);
	const [activeHighlight, setActiveHighlight] = useState<Highlight | null>(null);
	const [isAIOpen, setIsAIOpen] = useState(false);
	const [aiAction, setAiAction] = useState<"EXPLAIN" | "SUMMARIZE" | "EXTRACT" | "DISCUSS" | null>(null);
	const [isChatMode, setIsChatMode] = useState(false);
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
	// Resume dialog: shown once on mount if saved position is significantly behind highest
	const [showResumeDialog, setShowResumeDialog] = useState(() => {
		const currentFraction = (initialProgress as any)?.fraction ?? 0;
		const highestFraction = (initialHighestPosition as any)?.fraction ?? 0;
		return !!(initialHighestPosition && highestFraction > currentFraction + 0.02);
	});
	const [highestPosition] = useState<unknown>(initialHighestPosition);
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	/** Populated by EPUBReader once the view is ready — allows programmatic navigation */
	const navigateRef = useRef<((pos: unknown) => void) | null>(null);

	const saveProgressMutation = useMutation(trpc.book.saveProgress.mutationOptions());
	const updateCoverMutation = useMutation(trpc.book.updateCover.mutationOptions());
	const summarizeBookMutation = useMutation(trpc.ai.summarizeBook.mutationOptions());
	const saveSummaryMutation = useMutation(trpc.book.saveSummary.mutationOptions());

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
			const fraction =
				position && typeof position === "object" && "fraction" in position
					? ((position as { fraction: number }).fraction ?? 0)
					: 0;
			if (fraction) setReadingFraction(fraction);

			if (debounceRef.current) clearTimeout(debounceRef.current);
			debounceRef.current = setTimeout(() => {
				saveProgressMutation.mutate({ bookId: book.id, position, fraction });
			}, 1500);
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
		(highlight: Highlight, action: "EXPLAIN" | "SUMMARIZE" | "EXTRACT" | "DISCUSS") => {
			setActiveHighlight(highlight);
			setAiAction(action);
			setIsChatMode(false);
			setIsAIOpen(true);
		},
		[],
	);

	const handleCloseAI = useCallback(() => {
		setIsAIOpen(false);
		setActiveHighlight(null);
		setAiAction(null);
		setIsChatMode(false);
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
		setIsChatMode(false);
		if (h.aiResponse && h.aiAction) {
			setAiAction(h.aiAction as "EXPLAIN" | "SUMMARIZE" | "EXTRACT" | "DISCUSS");
		} else {
			setAiAction("EXPLAIN");
		}
		setIsAIOpen(true);
	}, []);

	const handleChapterCreate = useCallback((startPage: number, endPage: number) => {
		setChapterFormDefaults({ startPage, endPage });
		setIsChapterListOpen(true);
	}, []);

	// AI shortcut: open a free-chat AI panel (no auto-run, user types first)
	const handleQuickAI = useCallback(() => {
		const pseudo: Highlight = { id: "__chat__", text: "" };
		setActiveHighlight(pseudo);
		setAiAction("DISCUSS");
		setIsChatMode(true);
		setIsAIOpen(true);
	}, []);

	const handleSummarizeBook = useCallback(() => {
		if (!bookText) return;
		summarizeBookMutation.mutate(
			{
				bookId: book.id,
				bookTitle: book.title,
				text: bookText.slice(0, 8000),
			},
			{
				onSuccess: (data) => {
					const pseudo: Highlight = { id: "__summary__", text: bookText.slice(0, 500), aiResponse: data.response, aiAction: "SUMMARIZE" };
					setActiveHighlight(pseudo);
					setAiAction("SUMMARIZE");
					setIsAIOpen(true);
				},
			},
		);
	}, [book.id, book.title, bookText, summarizeBookMutation]);

	// When exiting RSVP/Chunked, navigate the EPUB/PDF reader to match the fraction reached
	const handleAltModeExit = useCallback(
		(mode: "rsvp" | "chunked") => {
			if (readingFraction > 0 && navigateRef.current) {
				navigateRef.current({ fraction: readingFraction });
			}
			setCurrentMode("normal");
		},
		[readingFraction],
	);

	const handleAltModeFraction = useCallback(
		(fraction: number) => {
			setReadingFraction(fraction);
			// Also save progress to server
			if (debounceRef.current) clearTimeout(debounceRef.current);
			debounceRef.current = setTimeout(() => {
				saveProgressMutation.mutate({ bookId: book.id, position: { fraction }, fraction });
			}, 2000);
		},
		[book.id, saveProgressMutation],
	);

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
			{/* Resume dialog */}
			{showResumeDialog && highestPosition != null && (
				<div className="fixed inset-0 z-100 flex items-center justify-center bg-black/50">
					<div className="bg-card w-full max-w-sm rounded-xl border p-6 shadow-2xl mx-4">
						<h3 className="mb-2 font-semibold">Resume Reading?</h3>
						<p className="text-muted-foreground mb-4 text-sm">
							You previously reached{" "}
							<strong>{Math.round(((highestPosition as any)?.fraction ?? 0) * 100)}%</strong>
							. Jump back there?
						</p>
						<div className="flex gap-2">
							<button
								type="button"
								onClick={() => {
									// Actually navigate in the reader
									navigateRef.current?.(highestPosition);
									setCurrentPosition(highestPosition);
									setShowResumeDialog(false);
								}}
								className="bg-primary text-primary-foreground flex-1 rounded-md px-4 py-2 text-sm"
							>
								Jump to furthest ({Math.round(((highestPosition as any)?.fraction ?? 0) * 100)}%)
							</button>
							<button
								type="button"
								onClick={() => setShowResumeDialog(false)}
								className="hover:bg-accent flex-1 rounded-md border px-4 py-2 text-sm"
							>
								Stay here ({Math.round(((initialProgress as any)?.fraction ?? 0) * 100)}%)
							</button>
						</div>
					</div>
				</div>
			)}
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
						onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
						className="text-muted-foreground hover:text-foreground rounded-md p-1 transition-colors"
						title="Toggle theme"
					>
						{theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
					</button>
					<button
						type="button"
						onClick={handleSummarizeBook}
						disabled={summarizeBookMutation.isPending || !bookText}
						className="bg-primary/10 text-primary hover:bg-primary/20 flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors disabled:opacity-50"
						title="Generate a full book summary"
					>
						<BookOpen className="h-3.5 w-3.5" />
						<span className="hidden sm:inline">Summary</span>
					</button>
					<button
						type="button"
						onClick={handleQuickAI}
						className="bg-primary/10 text-primary hover:bg-primary/20 flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors"
						title="AI: explain or discuss selection"
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
						highlights={highlights}
						onPositionChange={onPositionChange}
						onTextExtracted={setBookText}
						onCoverExtracted={handleCoverExtracted}
						onHighlightClick={handleHighlightClick}
						navigateRef={navigateRef}
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
							onExit={() => handleAltModeExit("rsvp")}
							onFractionChange={handleAltModeFraction}
						/>
					</div>
				)}

				{/*  Chunked: same pattern as RSVP  */}
				{currentMode === "chunked" && (
					<div className="bg-background absolute inset-0 z-30">
						<ChunkedSpeedMode
							text={bookText}
							startFraction={readingFraction}
							onExit={() => handleAltModeExit("chunked")}
							onFractionChange={handleAltModeFraction}
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
								bookId={book.id}
								highlight={activeHighlight}
								action={aiAction}
								chatMode={isChatMode}
								onClose={handleCloseAI}
								onHighlightCreated={handleHighlightCreated}
								onResponseReceived={(id, response) => {
									setHighlights((prev) =>
										prev.map((h) => (h.id === id ? { ...h, aiAction, aiResponse: response } : h)),
									);
								}}
							/>
						</div>
						<div className="md:hidden">
							<AIBottomSheet
								bookId={book.id}
								highlight={activeHighlight}
								action={aiAction}
								chatMode={isChatMode}
								onClose={handleCloseAI}
								onHighlightCreated={handleHighlightCreated}
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
