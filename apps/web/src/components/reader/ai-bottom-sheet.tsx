"use client";

import { X } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import AIChatPanel from "@/components/reader/ai-chat-panel";
import type { AIAction, Highlight } from "@/types/reader";

interface AIBottomSheetProps {
	bookId: string;
	highlight: Highlight;
	action: AIAction;
	chatMode?: boolean;
	onClose: () => void;
	onResponseReceived: (highlightId: string, response: string) => void;
	onHighlightCreated: (highlight: Highlight) => void;
}

export default function AIBottomSheet({
	bookId,
	highlight,
	action,
	chatMode,
	onClose,
	onResponseReceived,
	onHighlightCreated,
}: AIBottomSheetProps) {
	const [heightVh, setHeightVh] = useState(55);
	const startY = useRef(0);
	const startH = useRef(0);

	const onHandleTouchStart = useCallback(
		(e: React.TouchEvent) => {
			startY.current = e.touches[0].clientY;
			startH.current = heightVh;
		},
		[heightVh],
	);

	const onHandleTouchMove = useCallback((e: React.TouchEvent) => {
		const deltaY = startY.current - e.touches[0].clientY; // up = positive
		const newH = startH.current + (deltaY / window.innerHeight) * 100;
		setHeightVh(Math.max(25, Math.min(92, newH)));
	}, []);

	const onHandleTouchEnd = useCallback(
		(e: React.TouchEvent) => {
			const deltaY = startY.current - e.changedTouches[0].clientY;
			// If dragged down more than 80px → close
			if (deltaY < -80) onClose();
		},
		[onClose],
	);

	return (
		<>
			{/* Backdrop */}
			{/* biome-ignore lint/a11y/noStaticElementInteractions: modal backdrop */}
			{/* biome-ignore lint/a11y/useKeyWithClickEvents: dismissed via button */}
			<div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />

			{/* Sheet */}
			<div
				className="fixed right-0 bottom-0 left-0 z-50 flex flex-col rounded-t-xl bg-card shadow-xl"
				style={{ height: `${heightVh}vh` }}
				data-ai-panel="true"
			>
				{/* Drag handle */}
				<div
					className="flex cursor-ns-resize touch-none justify-center py-2"
					onTouchStart={onHandleTouchStart}
					onTouchMove={onHandleTouchMove}
					onTouchEnd={onHandleTouchEnd}
				>
					<div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
				</div>

				{/* Header */}
				<div className="flex items-center justify-between px-4 pb-2">
					<h3 className="font-semibold text-sm">AI Assistant</h3>
					<button
						type="button"
						onClick={onClose}
						className="rounded-md p-1 hover:bg-accent"
					>
						<X className="h-4 w-4" />
					</button>
				</div>
				<div className="min-h-0 flex-1 overflow-hidden">
					<AIChatPanel
						bookId={bookId}
						highlight={highlight}
						action={action}
						chatMode={chatMode}
						onResponseReceived={onResponseReceived}
						onHighlightCreated={onHighlightCreated}
					/>
				</div>
			</div>
		</>
	);
}
