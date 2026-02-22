"use client";

import { SpeedReadingShell, useSpeedReading } from "@/components/reader/use-speed-reading";

interface RSVPModeProps {
	text: string;
	startFraction?: number;
	onExit: () => void;
	onFractionChange?: (fraction: number) => void;
}

export default function RSVPMode({
	text,
	startFraction = 0,
	onExit,
	onFractionChange,
}: RSVPModeProps) {
	const {
		words,
		currentIndex,
		wpm,
		setWpm,
		isPlaying,
		setIsPlaying,
		progress,
		handleTouchStart,
		handleTouchMove,
	} = useSpeedReading({ text, startFraction, step: 1, onExit, onFractionChange });

	const currentWord = words[currentIndex] ?? "";
	const orpIndex = Math.floor(currentWord.length * 0.3);

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
			}
		/>
	);
}
