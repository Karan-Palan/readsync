"use client";

import { X } from "lucide-react";
import { useCallback, useRef, useState } from "react";

import AIChatPanel from "@/components/reader/ai-chat-panel";

interface Highlight {
	id: string;
	text: string;
	color?: string | null;
	note?: string | null;
	aiAction?: string | null;
	aiResponse?: string | null;
}

interface AIDrawerProps {
	bookId: string;
	highlight: Highlight;
	action: "EXPLAIN" | "SUMMARIZE" | "EXTRACT" | "DISCUSS";
	chatMode?: boolean;
	onClose: () => void;
	onResponseReceived: (highlightId: string, response: string) => void;
	onHighlightCreated: (highlight: Highlight) => void;
}

const MIN_WIDTH = 280;

export default function AIDrawer({
	bookId,
	highlight,
	action,
	chatMode,
	onClose,
	onResponseReceived,
	onHighlightCreated,
}: AIDrawerProps) {
	const [width, setWidth] = useState(360);
	const dragging = useRef(false);
	const startX = useRef(0);
	const startWidth = useRef(0);

	const onResizePointerDown = useCallback(
		(e: React.PointerEvent<HTMLDivElement>) => {
			e.preventDefault();
			dragging.current = true;
			startX.current = e.clientX;
			startWidth.current = width;

			const onMove = (ev: PointerEvent) => {
				if (!dragging.current) return;
				const delta = startX.current - ev.clientX; // moving left expands
				const maxW = Math.round(window.innerWidth * 0.85);
				setWidth(Math.max(MIN_WIDTH, Math.min(maxW, startWidth.current + delta)));
			};
			const onUp = () => {
				dragging.current = false;
				window.removeEventListener("pointermove", onMove);
				window.removeEventListener("pointerup", onUp);
			};
			window.addEventListener("pointermove", onMove);
			window.addEventListener("pointerup", onUp);
		},
		[width],
	);

	return (
		<div
			className="bg-card fixed top-0 right-0 z-50 flex h-full flex-col border-l shadow-xl"
			style={{ width, maxWidth: "85vw" }}
			data-ai-panel="true"
		>
			{/* Drag-resize handle — the left edge */}
			<div
				className="absolute left-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-primary/30 active:bg-primary/50 transition-colors"
				onPointerDown={onResizePointerDown}
				title="Drag to resize"
			/>

			<div className="flex items-center justify-between border-b px-4 py-3">
				<h3 className="text-sm font-semibold">AI Assistant</h3>
				<button type="button" onClick={onClose} className="hover:bg-accent rounded-md p-1">
					<X className="h-4 w-4" />
				</button>
			</div>
			<AIChatPanel
				bookId={bookId}
				highlight={highlight}
				action={action}
				chatMode={chatMode}
				onResponseReceived={onResponseReceived}
				onHighlightCreated={onHighlightCreated}
			/>
		</div>
	);
}

