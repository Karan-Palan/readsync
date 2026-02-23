"use client";

import { X } from "lucide-react";
import { useCallback, useRef, useState } from "react";

import AIChatPanel from "@/components/reader/ai-chat-panel";
import type { AIAction, Highlight } from "@/types/reader";

interface AIDrawerProps {
	bookId: string;
	highlight: Highlight;
	action: AIAction;
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
	const handleRef = useRef<HTMLDivElement>(null);

	const onResizePointerDown = useCallback(
		(e: React.PointerEvent<HTMLDivElement>) => {
			e.preventDefault();
			e.stopPropagation();
			dragging.current = true;
			startX.current = e.clientX;
			startWidth.current = width;

			// Capture pointer to the handle so events fire even when cursor leaves
			(e.target as HTMLElement).setPointerCapture(e.pointerId);
		},
		[width],
	);

	const onResizePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
		if (!dragging.current) return;
		const delta = startX.current - e.clientX; // moving left expands
		const maxW = Math.round(window.innerWidth * 0.85);
		setWidth(Math.max(MIN_WIDTH, Math.min(maxW, startWidth.current + delta)));
	}, []);

	const onResizePointerUp = useCallback(() => {
		dragging.current = false;
	}, []);

	return (
		<div
			className="bg-card fixed top-0 right-0 z-50 flex h-full flex-col border-l shadow-xl"
			style={{ width, maxWidth: "85vw" }}
			data-ai-panel="true"
		>
			{/* Drag-resize handle — left edge, wide enough to grab easily */}
			<div
				ref={handleRef}
				className="hover:bg-primary/20 active:bg-primary/40 absolute top-0 left-0 z-10 h-full w-3 cursor-col-resize touch-none transition-colors select-none"
				onPointerDown={onResizePointerDown}
				onPointerMove={onResizePointerMove}
				onPointerUp={onResizePointerUp}
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
