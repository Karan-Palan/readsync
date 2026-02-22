"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface RSVPModeProps {
	text: string;
	startFraction?: number;
	onExit: () => void;
}

export default function RSVPMode({ text, startFraction = 0, onExit }: RSVPModeProps) {
	const words = useMemo(() => text.split(/\s+/).filter((w) => w.length > 0), [text]);

	const [currentIndex, setCurrentIndex] = useState(() =>
		Math.floor(startFraction * text.split(/\s+/).filter((w) => w.length > 0).length),
	);
	const [wpm, setWpm] = useState(300);
	const [isPlaying, setIsPlaying] = useState(false);
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	const currentWord = words[currentIndex] ?? "";

	// ORP (Optimal Recognition Point) at ~30% of word length
	const orpIndex = Math.floor(currentWord.length * 0.3);

	useEffect(() => {
		if (isPlaying) {
			const ms = 60000 / wpm;
			intervalRef.current = setInterval(() => {
				setCurrentIndex((prev) => {
					if (prev >= words.length - 1) {
						setIsPlaying(false);
						return prev;
					}
					return prev + 1;
				});
			}, ms);
		}

		return () => {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
			}
		};
	}, [isPlaying, wpm, words.length]);

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
			className="bg-background fixed inset-0 z-30 flex flex-col items-center justify-center"
			onTouchStart={(e) => {
				handleTouchStart.current = e.touches[0].clientY;
			}}
			onTouchMove={handleTouchMove}
		>
			{/* Close button */}
			<button
				type="button"
				onClick={onExit}
				className="text-muted-foreground hover:text-foreground absolute top-4 right-4 rounded-md px-3 py-1 text-sm"
			>
				✕ Exit
			</button>

			{/* Word display */}
			<div className="flex items-center justify-center px-4">
				<span className="font-(family-name:--font-literata) text-4xl tracking-wide md:text-6xl">
					{currentWord.split("").map((char, i) => (
						<span
							key={`${currentIndex}-${i}`}
							className={i === orpIndex ? "font-bold text-amber-400" : ""}
						>
							{char}
						</span>
					))}
				</span>
			</div>

			{/* Controls */}
			<div className="absolute bottom-20 flex flex-col items-center gap-4">
				{/* Progress bar */}
				<div className="bg-muted h-1 w-64 rounded-full">
					<div
						className="bg-primary h-full rounded-full transition-all"
						style={{ width: `${progress}%` }}
					/>
				</div>

				<div className="flex items-center gap-4">
					<button
						type="button"
						onClick={() => setIsPlaying(!isPlaying)}
						className="bg-primary text-primary-foreground rounded-md px-6 py-2 text-sm font-medium"
					>
						{isPlaying ? "Pause" : "Play"}
					</button>
				</div>

				<div className="flex items-center gap-2">
					<span className="text-muted-foreground text-xs">WPM</span>
					<input
						type="range"
						min={100}
						max={1000}
						step={25}
						value={wpm}
						onChange={(e) => setWpm(Number(e.target.value))}
						className="w-40"
					/>
					<span className="w-10 text-right text-xs font-medium">{wpm}</span>
				</div>
			</div>
		</div>
	);
}
