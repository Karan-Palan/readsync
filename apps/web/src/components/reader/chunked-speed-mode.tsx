"use client";

import { useState } from "react";
import { SpeedReadingShell, useSpeedReading } from "@/components/reader/use-speed-reading";

interface ChunkedSpeedModeProps {
	text: string;
	startFraction?: number;
	onExit: () => void;
	onFractionChange?: (fraction: number) => void;
}

export default function ChunkedSpeedMode({
	text,
	startFraction = 0,
	onExit,
	onFractionChange,
}: ChunkedSpeedModeProps) {
	const [chunkSize, setChunkSize] = useState(3);

	const { words, currentIndex, wpm, setWpm, isPlaying, setIsPlaying, progress, handleTouchStart, handleTouchMove } =
		useSpeedReading({ text, startFraction, step: chunkSize, onExit, onFractionChange });

	return (
		<SpeedReadingShell
			onExit={onExit}
			handleTouchStart={handleTouchStart}
			handleTouchMove={handleTouchMove}
			progress={progress}
			isPlaying={isPlaying}
			setIsPlaying={setIsPlaying}
			wpm={wpm}
			setWpm={setWpm}
			empty={words.length === 0}
			display={
				<span className="text-center font-(family-name:--font-literata) text-3xl tracking-wide md:text-5xl">
					{words.slice(currentIndex, currentIndex + chunkSize).join(" ")}
				</span>
			}
			extraControls={
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
					<span className="w-4 text-xs font-medium">{chunkSize}</span>
				</div>
			}
		/>
	);
}
