"use client";

import { BookOpen, Columns2, Eye, Zap } from "lucide-react";

export type ReadingMode = "normal" | "focus" | "rsvp" | "chunked";

interface ReadingModeSelectorProps {
	currentMode: ReadingMode;
	onModeChange: (mode: ReadingMode) => void;
}

const modes: { mode: ReadingMode; icon: typeof BookOpen; label: string }[] = [
	{ mode: "normal", icon: BookOpen, label: "Normal" },
	{ mode: "focus", icon: Columns2, label: "Focus" },
	{ mode: "rsvp", icon: Eye, label: "RSVP" },
	{ mode: "chunked", icon: Zap, label: "Chunked" },
];

export default function ReadingModeSelector({
	currentMode,
	onModeChange,
}: ReadingModeSelectorProps) {
	return (
		<div className="bg-card/95 relative z-40 flex shrink-0 items-center justify-center border-t px-4 py-2 backdrop-blur">
			<div className="bg-card flex items-center gap-1 rounded-full border p-1 shadow">
				{modes.map(({ mode, icon: Icon, label }) => (
					<button
						key={mode}
						type="button"
						onClick={() => onModeChange(mode)}
						className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
							currentMode === mode
								? "bg-primary text-primary-foreground"
								: "text-muted-foreground hover:text-foreground"
						}`}
					>
						<Icon className="h-3.5 w-3.5" />
						<span className="hidden sm:inline">{label}</span>
					</button>
				))}
			</div>
		</div>
	);
}
