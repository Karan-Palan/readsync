"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface ChunkedSpeedModeProps {
	text: string;
	startFraction?: number;
	onExit: () => void;
}

export default function ChunkedSpeedMode({
	text,
	startFraction = 0,
	onExit,
}: ChunkedSpeedModeProps) {
	const words = useMemo(
		() => text.split(/\s+/).filter((w) => w.length > 0),
		[text],
	);

	const [chunkSize, setChunkSize] = useState(3);
	const [currentIndex, setCurrentIndex] = useState(() =>
		Math.floor(
			startFraction * text.split(/\s+/).filter((w) => w.length > 0).length,
		),
	);
	const [wpm, setWpm] = useState(300);
	const [isPlaying, setIsPlaying] = useState(false);
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	const currentChunk = words
		.slice(currentIndex, currentIndex + chunkSize)
		.join(" ");

	useEffect(() => {
		if (isPlaying) {
			// Effective WPM accounts for chunk size
			const ms = (60000 / wpm) * chunkSize;
			intervalRef.current = setInterval(() => {
				setCurrentIndex((prev) => {
					if (prev + chunkSize >= words.length) {
						setIsPlaying(false);
						return prev;
					}
					return prev + chunkSize;
				});
			}, ms);
		}

		return () => {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
			}
		};
	}, [isPlaying, wpm, chunkSize, words.length]);

	const handleTouchStart = useRef<number>(0);
	const handleTouchMove = useCallback(
		(e: React.TouchEvent) => {
			const deltaY = e.touches[0].clientY - handleTouchStart.current;
			if (deltaY > 100) {
				onExit();
			}
		},
		[onExit],
	);

	const progress = words.length > 0 ? (currentIndex / words.length) * 100 : 0;

	if (words.length === 0) {
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
			onTouchStart={(e) => {
				handleTouchStart.current = e.touches[0].clientY;
			}}
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

			{/* Chunk display */}
			<div className="flex items-center justify-center px-4">
				<span className="font-(family-name:--font-literata) text-center text-3xl tracking-wide md:text-5xl">
					{currentChunk}
				</span>
			</div>

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

					<div className="flex items-center gap-2">
						<span className="text-muted-foreground text-xs">Words</span>
						<input
							type="range"
							min={2}
							max={5}
							value={chunkSize}
							onChange={(e) => setChunkSize(Number(e.target.value))}
							className="w-16"
						/>
						<span className="w-4 font-medium text-xs">{chunkSize}</span>
					</div>
				</div>
			</div>
		</div>
	);
}
