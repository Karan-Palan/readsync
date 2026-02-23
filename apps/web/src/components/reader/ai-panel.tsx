"use client";

import { WifiOff, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import AIChatPanel from "@/components/reader/ai-chat-panel";
import type { AIAction, Highlight } from "@/types/reader";

interface AIPanelProps {
	bookId: string;
	highlight: Highlight;
	action: AIAction;
	chatMode?: boolean;
	isOnline?: boolean;
	onClose: () => void;
	onResponseReceived: (highlightId: string, response: string) => void;
	onHighlightCreated: (highlight: Highlight) => void;
}

const MIN_WIDTH = 280;

/**
 * Responsive AI panel: side drawer on desktop (md+), bottom sheet on mobile.
 */
export default function AIPanel({
	bookId,
	highlight,
	action,
	chatMode,
	isOnline = true,
	onClose,
	onResponseReceived,
	onHighlightCreated,
}: AIPanelProps) {
	return (
		<>
			{/* Desktop: side drawer */}
			<div className="hidden md:block">
				<DrawerVariant
					bookId={bookId}
					highlight={highlight}
					action={action}
					chatMode={chatMode}
					isOnline={isOnline}
					onClose={onClose}
					onResponseReceived={onResponseReceived}
					onHighlightCreated={onHighlightCreated}
				/>
			</div>

			{/* Mobile: bottom sheet */}
			<div className="md:hidden">
				<BottomSheetVariant
					bookId={bookId}
					highlight={highlight}
					action={action}
					chatMode={chatMode}
					isOnline={isOnline}
					onClose={onClose}
					onResponseReceived={onResponseReceived}
					onHighlightCreated={onHighlightCreated}
				/>
			</div>
		</>
	);
}

// Offline placeholder

function OfflinePlaceholder() {
	return (
		<div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
			<WifiOff className="text-muted-foreground h-8 w-8" />
			<p className="text-muted-foreground text-sm">AI requires internet connection.</p>
		</div>
	);
}

// Desktop drawer

function DrawerVariant({
	bookId,
	highlight,
	action,
	chatMode,
	isOnline,
	onClose,
	onResponseReceived,
	onHighlightCreated,
}: AIPanelProps) {
	const [width, setWidth] = useState(360);
	const dragging = useRef(false);
	const startX = useRef(0);
	const startWidth = useRef(0);

	const onResizePointerDown = useCallback(
		(e: React.PointerEvent<HTMLDivElement>) => {
			e.preventDefault();
			e.stopPropagation();
			dragging.current = true;
			startX.current = e.clientX;
			startWidth.current = width;
			(e.target as HTMLElement).setPointerCapture(e.pointerId);
		},
		[width],
	);

	const onResizePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
		if (!dragging.current) return;
		const delta = startX.current - e.clientX;
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
			<div
				className="hover:bg-primary/20 active:bg-primary/40 absolute top-0 left-0 z-10 h-full w-3 cursor-col-resize touch-none transition-colors select-none"
				onPointerDown={onResizePointerDown}
				onPointerMove={onResizePointerMove}
				onPointerUp={onResizePointerUp}
				title="Drag to resize"
			/>

			<PanelHeader onClose={onClose} />
			<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
				{isOnline ? (
					<AIChatPanel
						bookId={bookId}
						highlight={highlight}
						action={action}
						chatMode={chatMode}
						onResponseReceived={onResponseReceived}
						onHighlightCreated={onHighlightCreated}
					/>
				) : (
					<OfflinePlaceholder />
				)}
			</div>
		</div>
	);
}

// Mobile bottom sheet

function BottomSheetVariant({
	bookId,
	highlight,
	action,
	chatMode,
	isOnline,
	onClose,
	onResponseReceived,
	onHighlightCreated,
}: AIPanelProps) {
	const [heightVh, setHeightVh] = useState(65);
	const startY = useRef(0);
	const startH = useRef(0);
	// Track virtual keyboard height so the panel shifts up above the keyboard on
	// iOS/Android — fixed-position elements don't reposition automatically.
	const [keyboardOffset, setKeyboardOffset] = useState(0);
	useEffect(() => {
		const vp = window.visualViewport;
		if (!vp) return;
		const handle = () => {
			const offset = Math.max(0, Math.round(window.innerHeight - vp.height - (vp.offsetTop ?? 0)));
			setKeyboardOffset(offset);
		};
		vp.addEventListener("resize", handle);
		vp.addEventListener("scroll", handle);
		return () => {
			vp.removeEventListener("resize", handle);
			vp.removeEventListener("scroll", handle);
		};
	}, []);

	const onHandleTouchStart = useCallback(
		(e: React.TouchEvent) => {
			startY.current = e.touches[0].clientY;
			startH.current = heightVh;
		},
		[heightVh],
	);

	const onHandleTouchMove = useCallback((e: React.TouchEvent) => {
		const deltaY = startY.current - e.touches[0].clientY;
		const newH = startH.current + (deltaY / window.innerHeight) * 100;
		setHeightVh(Math.max(25, Math.min(92, newH)));
	}, []);

	const onHandleTouchEnd = useCallback(
		(e: React.TouchEvent) => {
			const deltaY = startY.current - e.changedTouches[0].clientY;
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

			<div
				className="bg-card fixed right-0 left-0 z-50 flex flex-col rounded-t-xl shadow-xl"
				style={{
					bottom: `${keyboardOffset}px`,
					height: `${heightVh}dvh`,
					maxHeight: `calc(100dvh - ${keyboardOffset}px)`,
				}}
				data-ai-panel="true"
			>
				<div
					className="flex cursor-ns-resize touch-none justify-center py-2"
					onTouchStart={onHandleTouchStart}
					onTouchMove={onHandleTouchMove}
					onTouchEnd={onHandleTouchEnd}
				>
					<div className="bg-muted-foreground/30 h-1 w-10 rounded-full" />
				</div>

				<PanelHeader onClose={onClose} />
				<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
					{isOnline ? (
						<AIChatPanel
							bookId={bookId}
							highlight={highlight}
							action={action}
							chatMode={chatMode}
							onResponseReceived={onResponseReceived}
							onHighlightCreated={onHighlightCreated}
						/>
					) : (
						<OfflinePlaceholder />
					)}
				</div>
			</div>
		</>
	);
}

// Shared header

function PanelHeader({ onClose }: { onClose: () => void }) {
	return (
		<div className="flex items-center justify-between border-b px-4 py-3">
			<h3 className="text-sm font-semibold">AI Assistant</h3>
			<button
				type="button"
				onClick={onClose}
				className="hover:bg-accent active:bg-accent/70 rounded-md p-1.5 transition-colors"
				aria-label="Close AI panel"
			>
				<X className="h-4 w-4" />
			</button>
		</div>
	);
}
