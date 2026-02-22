"use client";

import { useMutation } from "@tanstack/react-query";
import { Copy, RefreshCw, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

import { trpc } from "@/utils/trpc";

interface Highlight {
	id: string;
	text: string;
	aiAction?: string | null;
	aiResponse?: string | null;
}

interface AIBottomSheetProps {
	highlight: Highlight;
	action: "EXPLAIN" | "SUMMARIZE" | "EXTRACT";
	onClose: () => void;
	onResponseReceived: (highlightId: string, response: string) => void;
}

export default function AIBottomSheet({
	highlight,
	action,
	onClose,
	onResponseReceived,
}: AIBottomSheetProps) {
	const [response, setResponse] = useState(highlight.aiResponse ?? "");
	const touchStartY = useRef<number>(0);
	const sheetRef = useRef<HTMLDivElement>(null);

	const aiMutation = useMutation(
		trpc.ai.query.mutationOptions({
			onSuccess: (data) => {
				setResponse(data.response);
				onResponseReceived(highlight.id, data.response);
			},
		}),
	);

	// Auto-trigger if no existing response
	if (!response && !aiMutation.isPending && !aiMutation.isError) {
		aiMutation.mutate({ highlightId: highlight.id, action });
	}

	const handleTouchStart = useCallback((e: React.TouchEvent) => {
		touchStartY.current = e.touches[0].clientY;
	}, []);

	const handleTouchMove = useCallback(
		(e: React.TouchEvent) => {
			const deltaY = e.touches[0].clientY - touchStartY.current;
			if (deltaY > 80) {
				onClose();
			}
		},
		[onClose],
	);

	const actionLabel = {
		EXPLAIN: "Explanation",
		SUMMARIZE: "Summary",
		EXTRACT: "Key Insights",
	}[action];

	return (
		<>
			{/* Backdrop */}
			{/* biome-ignore lint/a11y/noStaticElementInteractions: modal backdrop interaction pattern */}
			{/* biome-ignore lint/a11y/useKeyWithClickEvents: modal backdrop, dismissed via Escape or button */}
			<div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />

			{/* Sheet */}
			<div
				ref={sheetRef}
				className="bg-card fixed right-0 bottom-0 left-0 z-50 flex max-h-[70vh] flex-col rounded-t-xl shadow-xl transition-transform duration-200"
				onTouchStart={handleTouchStart}
				onTouchMove={handleTouchMove}
			>
				{/* Drag handle */}
				<div className="flex justify-center py-2">
					<div className="bg-muted-foreground/30 h-1 w-8 rounded-full" />
				</div>

				{/* Header */}
				<div className="flex items-center justify-between px-4 pb-2">
					<h3 className="text-sm font-semibold">{actionLabel}</h3>
					<button type="button" onClick={onClose} className="hover:bg-accent rounded-md p-1">
						<X className="h-4 w-4" />
					</button>
				</div>

				{/* Highlight preview */}
				<div className="border-y px-4 py-2">
					<p className="text-muted-foreground line-clamp-2 text-xs italic">
						&ldquo;{highlight.text}&rdquo;
					</p>
				</div>

				{/* Response */}
				<div className="flex-1 overflow-y-auto px-4 py-3">
					{aiMutation.isPending && (
						<div className="text-muted-foreground flex items-center gap-2 text-sm">
							<div className="border-primary h-4 w-4 animate-spin rounded-full border-2 border-t-transparent" />
							Thinking...
						</div>
					)}
					{aiMutation.isError && (
						<p className="text-destructive text-sm">{aiMutation.error.message}</p>
					)}
					{response && <p className="text-sm whitespace-pre-wrap">{response}</p>}
				</div>

				{/* Actions */}
				<div className="flex items-center gap-2 border-t px-4 py-3">
					<button
						type="button"
						onClick={() => {
							navigator.clipboard.writeText(response);
							toast.success("Copied to clipboard");
						}}
						disabled={!response}
						className="hover:bg-accent flex items-center gap-1 rounded-md px-3 py-1.5 text-xs disabled:opacity-50"
					>
						<Copy className="h-3.5 w-3.5" />
						Copy
					</button>
					<button
						type="button"
						onClick={() => {
							setResponse("");
							aiMutation.mutate({ highlightId: highlight.id, action });
						}}
						disabled={aiMutation.isPending}
						className="hover:bg-accent flex items-center gap-1 rounded-md px-3 py-1.5 text-xs disabled:opacity-50"
					>
						<RefreshCw className="h-3.5 w-3.5" />
						Regenerate
					</button>
				</div>
			</div>
		</>
	);
}
