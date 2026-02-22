"use client";

import { useMutation } from "@tanstack/react-query";
import { Copy, RefreshCw, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { trpc } from "@/utils/trpc";

interface Highlight {
	id: string;
	text: string;
	aiAction?: string | null;
	aiResponse?: string | null;
}

interface AIDrawerProps {
	highlight: Highlight;
	action: "EXPLAIN" | "SUMMARIZE" | "EXTRACT";
	onClose: () => void;
	onResponseReceived: (highlightId: string, response: string) => void;
}

export default function AIDrawer({
	highlight,
	action,
	onClose,
	onResponseReceived,
}: AIDrawerProps) {
	const [response, setResponse] = useState(highlight.aiResponse ?? "");

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

	const actionLabel = {
		EXPLAIN: "Explanation",
		SUMMARIZE: "Summary",
		EXTRACT: "Key Insights",
	}[action];

	return (
		<div className="bg-card fixed top-0 right-0 z-50 flex h-full w-80 flex-col border-l shadow-xl transition-transform duration-200">
			{/* Header */}
			<div className="flex items-center justify-between border-b px-4 py-3">
				<h3 className="text-sm font-semibold">{actionLabel}</h3>
				<button type="button" onClick={onClose} className="hover:bg-accent rounded-md p-1">
					<X className="h-4 w-4" />
				</button>
			</div>

			{/* Highlight preview */}
			<div className="border-b px-4 py-3">
				<p className="text-muted-foreground line-clamp-3 text-xs italic">
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
				{response && (
					<div className="prose prose-sm dark:prose-invert max-w-none">
						<p className="text-sm whitespace-pre-wrap">{response}</p>
					</div>
				)}
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
	);
}
