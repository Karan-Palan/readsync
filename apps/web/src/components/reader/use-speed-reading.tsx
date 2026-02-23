"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export interface UseSpeedReadingOptions {
	text: string;
	startFraction?: number;
	/** Number of words to advance per tick — 1 for RSVP, chunkSize for chunked */
	step?: number;
	onExit: () => void;
	onFractionChange?: (fraction: number) => void;
}

export function useSpeedReading({
	text,
	startFraction = 0,
	step = 1,
	onExit,
	onFractionChange,
}: UseSpeedReadingOptions) {
	const words = useMemo(
		() => text.split(/\s+/).filter((w) => w.length > 0),
		[text],
	);

	const [currentIndex, setCurrentIndex] = useState(() =>
		Math.floor(
			startFraction * text.split(/\s+/).filter((w) => w.length > 0).length,
		),
	);
	const [wpm, setWpm] = useState(300);
	const [isPlaying, setIsPlaying] = useState(false);
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	// Report fraction changes back to parent so progress is synced
	useEffect(() => {
		if (words.length > 0 && onFractionChange) {
			onFractionChange(currentIndex / words.length);
		}
	}, [currentIndex, words.length, onFractionChange]);

	// Playback loop
	useEffect(() => {
		if (isPlaying) {
			const ms = (60000 / wpm) * step;
			intervalRef.current = setInterval(() => {
				setCurrentIndex((prev) => {
					if (prev + step >= words.length) {
						setIsPlaying(false);
						return prev;
					}
					return prev + step;
				});
			}, ms);
		}

		return () => {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
			}
		};
	}, [isPlaying, wpm, step, words.length]);

	// Swipe-down-to-exit gesture
	const touchStartY = useRef<number>(0);
	const handleTouchStart = useCallback((e: React.TouchEvent) => {
		touchStartY.current = e.touches[0].clientY;
	}, []);
	const handleTouchMove = useCallback(
		(e: React.TouchEvent) => {
			const deltaY = e.touches[0].clientY - touchStartY.current;
			if (deltaY > 100) onExit();
		},
		[onExit],
	);

	const progress = words.length > 0 ? (currentIndex / words.length) * 100 : 0;

	return {
		words,
		currentIndex,
		setCurrentIndex,
		wpm,
		setWpm,
		isPlaying,
		setIsPlaying,
		progress,
		handleTouchStart,
		handleTouchMove,
	};
}

// Shared Shell

interface SpeedReadingShellProps {
	onExit: () => void;
	handleTouchStart: (e: React.TouchEvent) => void;
	handleTouchMove: (e: React.TouchEvent) => void;
	display: React.ReactNode;
	progress: number;
	isPlaying: boolean;
	setIsPlaying: (v: boolean) => void;
	wpm: number;
	setWpm: (v: number) => void;
	extraControls?: React.ReactNode;
	empty?: boolean;
}

export function SpeedReadingShell({
	onExit,
	handleTouchStart,
	handleTouchMove,
	display,
	progress,
	isPlaying,
	setIsPlaying,
	wpm,
	setWpm,
	extraControls,
	empty,
}: SpeedReadingShellProps) {
	if (empty) {
		return (
			<div className="flex h-full items-center justify-center">
				<p className="text-muted-foreground">
					No text extracted yet. Read in normal mode first to extract text.
				</p>
			</div>
		);
	}

	return (
		<div
			className="fixed inset-0 z-30 flex flex-col items-center justify-center bg-background"
			onTouchStart={handleTouchStart}
			onTouchMove={handleTouchMove}
		>
			{/* Close button */}
			<button
				type="button"
				onClick={onExit}
				className="absolute top-4 right-4 rounded-md px-3 py-1 text-muted-foreground text-sm hover:text-foreground"
			>
				✕ Exit
			</button>

			{/* Word/chunk display */}
			<div className="flex items-center justify-center px-4">{display}</div>

			{/* Controls */}
			<div className="absolute bottom-20 flex flex-col items-center gap-4">
				{/* Progress bar */}
				<div className="h-1 w-64 rounded-full bg-muted">
					<div
						className="h-full rounded-full bg-primary transition-all"
						style={{ width: `${progress}%` }}
					/>
				</div>

				<div className="flex items-center gap-4">
					<button
						type="button"
						onClick={() => setIsPlaying(!isPlaying)}
						className="rounded-md bg-primary px-6 py-2 font-medium text-primary-foreground text-sm"
					>
						{isPlaying ? "Pause" : "Play"}
					</button>
				</div>

				<div className="flex items-center gap-3">
					<div className="flex items-center gap-2">
						<span className="text-muted-foreground text-xs">WPM</span>
						<input
							type="range"
							min={100}
							max={1000}
							step={25}
							value={wpm}
							onChange={(e) => setWpm(Number(e.target.value))}
							className="w-32"
						/>
						<span className="w-10 text-right font-medium text-xs">{wpm}</span>
					</div>
					{extraControls}
				</div>
			</div>
		</div>
	);
}
