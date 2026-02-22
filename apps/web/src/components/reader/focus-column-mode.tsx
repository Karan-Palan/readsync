"use client";

import { useState } from "react";

import NormalMode from "./normal-mode";

interface FocusColumnModeProps {
	book: {
		id: string;
		fileUrl: string;
		fileType: string;
		totalPages: number | null;
	};
	position: unknown;
	onPositionChange: (position: unknown) => void;
	onTextExtracted: (text: string) => void;
}

export default function FocusColumnMode({
	book,
	position,
	onPositionChange,
	onTextExtracted,
}: FocusColumnModeProps) {
	const [stripWidth, setStripWidth] = useState(500);

	return (
		<div className="relative h-full">
			{/* Dim overlays — left and right of the focus strip */}
			<div
				className="pointer-events-none fixed inset-0 z-10"
				style={{
					background: `linear-gradient(to right, 
            rgba(0,0,0,0.6) 0%, 
            rgba(0,0,0,0.6) calc(50% - ${stripWidth / 2}px), 
            transparent calc(50% - ${stripWidth / 2}px), 
            transparent calc(50% + ${stripWidth / 2}px), 
            rgba(0,0,0,0.6) calc(50% + ${stripWidth / 2}px), 
            rgba(0,0,0,0.6) 100%)`,
				}}
			/>

			{/* Width slider */}
			<div className="fixed top-14 right-4 z-20 rounded-md border bg-card p-2 shadow-lg">
				<label className="flex items-center gap-2 text-muted-foreground text-xs">
					Width
					<input
						type="range"
						min={300}
						max={800}
						value={stripWidth}
						onChange={(e) => setStripWidth(Number(e.target.value))}
						className="w-20"
					/>
					<span>{stripWidth}px</span>
				</label>
			</div>

			<NormalMode
				book={book}
				position={position}
				onPositionChange={onPositionChange}
				onTextExtracted={onTextExtracted}
			/>
		</div>
	);
}
