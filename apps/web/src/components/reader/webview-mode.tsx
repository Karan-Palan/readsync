"use client";

import { useMutation } from "@tanstack/react-query";
import { BookOpen, Copy, Lightbulb, MessageSquare, RotateCcw, Sparkles, X } from "lucide-react";
import { type ReactNode, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { trpc } from "@/utils/trpc";

interface WebViewModeProps {
	book: {
		id: string;
		title: string;
		fileType: string;
		fileUrl: string;
	};
	bookText: string;
	children?: ReactNode;
}

type AiAction = "EXPLAIN" | "SUMMARIZE" | "EXTRACT";

/**
 * Turn raw PDF-extracted text into readable paragraphs.
 * Handles common PDF artifacts: lack of double-newlines, mid-sentence wrapping, etc.
 */
function formatToParagraphs(raw: string): string[] {
	return raw
		.replace(/\f/g, "\n\n") // page breaks → paragraph breaks
		.replace(/([.!?])\s+([A-Z])/g, "$1\n\n$2") // inject breaks at sentence boundaries
		.split(/\n{2,}/)
		.map((p) => p.replace(/\n/g, " ").replace(/\s+/g, " ").trim())
		.filter((p) => p.length > 40);
}

export default function WebViewMode({ book, bookText, children }: WebViewModeProps) {
	const articleRef = useRef<HTMLElement>(null);
	const [aiPanel, setAiPanel] = useState<{
		action: AiAction;
		text: string;
	} | null>(null);
	const [aiResponse, setAiResponse] = useState("");

	const paragraphs = useMemo(() => formatToParagraphs(bookText), [bookText]);

	const quickAiMutation = useMutation(
		trpc.ai.quickQuery.mutationOptions({
			onSuccess: (data) => setAiResponse(data.response),
		}),
	);

	/** Returns selected text if present, otherwise the first ~2000 chars of the book. */
	const getContextText = () => {
		const sel = window.getSelection()?.toString().trim() ?? "";
		return sel.length > 10 ? sel : bookText.slice(0, 2000);
	};

	const handleAiAction = (action: AiAction) => {
		const text = getContextText();
		setAiResponse("");
		setAiPanel({ action, text });
		quickAiMutation.mutate({ text, action });
	};

	const handleRetry = () => {
		if (!aiPanel) return;
		setAiResponse("");
		quickAiMutation.mutate({ text: aiPanel.text, action: aiPanel.action });
	};

	// Empty state
	if (!bookText) {
		return (
			<div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-4">
				<BookOpen className="h-12 w-12 opacity-30" />
				<div className="text-center">
					<p className="text-sm font-medium">Book content not yet loaded</p>
					<p className="mt-1 max-w-xs text-xs opacity-70">
						Switch to <span className="font-semibold">Normal</span> mode briefly so the text can be
						extracted, then come back here.
					</p>
				</div>
			</div>
		);
	}

	// Main view
	return (
		<div className="relative flex h-full flex-col">
			{/* AI action toolbar*/}
			<div className="bg-muted/30 flex shrink-0 flex-wrap items-center gap-2 border-b px-4 py-2">
				<Sparkles className="text-primary h-3.5 w-3.5 shrink-0" />
				<span className="text-muted-foreground mr-1 text-xs font-medium">AI</span>

				<button
					type="button"
					onClick={() => handleAiAction("EXPLAIN")}
					className="bg-background hover:bg-accent flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs transition-colors"
				>
					<Lightbulb className="h-3 w-3" />
					Explain
				</button>

				<button
					type="button"
					onClick={() => handleAiAction("SUMMARIZE")}
					className="bg-background hover:bg-accent flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs transition-colors"
				>
					<MessageSquare className="h-3 w-3" />
					Summarize
				</button>

				<button
					type="button"
					onClick={() => handleAiAction("EXTRACT")}
					className="bg-background hover:bg-accent flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs transition-colors"
				>
					<Sparkles className="h-3 w-3" />
					Key Insights
				</button>

				<span className="text-muted-foreground/50 ml-auto hidden text-[10px] sm:block">
					Select text for targeted AI, or click to use current content
				</span>
			</div>

			{/*Content + optional AI panel*/}
			<div className="flex min-h-0 flex-1 overflow-hidden">
				{/* Article */}
				<div className="flex-1 overflow-y-auto">
					<article
						ref={articleRef}
						className="selection:text-foreground mx-auto max-w-2xl px-6 py-10 selection:bg-yellow-200/70 dark:selection:bg-yellow-700/40"
					>
						<h1 className="mb-4 font-serif text-3xl leading-tight font-bold">{book.title}</h1>
						<hr className="border-border mb-8" />

						{paragraphs.map((para, i) => (
							<p
								// biome-ignore lint/suspicious/noArrayIndexKey: static list
								key={i}
								className="text-foreground/90 mb-5 font-serif text-[1.05rem] leading-[1.85]"
							>
								{para}
							</p>
						))}
					</article>
				</div>

				{/* AI response panel */}
				{aiPanel && (
					<div className="bg-card flex w-80 shrink-0 flex-col border-l shadow-xl">
						{/* Header */}
						<div className="flex items-center justify-between border-b px-4 py-3">
							<div className="flex items-center gap-2">
								<Sparkles className="text-primary h-4 w-4" />
								<h3 className="text-sm font-semibold">
									{aiPanel.action === "EXPLAIN" && "Explanation"}
									{aiPanel.action === "SUMMARIZE" && "Summary"}
									{aiPanel.action === "EXTRACT" && "Key Insights"}
								</h3>
							</div>
							<button
								type="button"
								onClick={() => setAiPanel(null)}
								className="hover:bg-accent rounded-md p-1"
							>
								<X className="h-4 w-4" />
							</button>
						</div>

						{/* Source preview */}
						<div className="border-b px-4 py-2">
							<p className="text-muted-foreground line-clamp-2 text-xs italic">
								&ldquo;{aiPanel.text.slice(0, 120)}&hellip;&rdquo;
							</p>
						</div>

						{/* Response body */}
						<div className="flex-1 overflow-y-auto px-4 py-3">
							{quickAiMutation.isPending && (
								<div className="text-muted-foreground flex items-center gap-2 text-sm">
									<div className="border-primary h-4 w-4 animate-spin rounded-full border-2 border-t-transparent" />
									Thinking…
								</div>
							)}
							{quickAiMutation.isError && (
								<p className="text-destructive text-sm">{quickAiMutation.error.message}</p>
							)}
							{aiResponse && (
								<p className="text-sm leading-relaxed whitespace-pre-wrap">{aiResponse}</p>
							)}
						</div>

						{/* Footer actions */}
						<div className="flex items-center gap-3 border-t px-4 py-2">
							<button
								type="button"
								onClick={() => {
									navigator.clipboard.writeText(aiResponse);
									toast.success("Copied to clipboard");
								}}
								disabled={!aiResponse}
								className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs disabled:opacity-40"
							>
								<Copy className="h-3.5 w-3.5" />
								Copy
							</button>
							<button
								type="button"
								onClick={handleRetry}
								disabled={quickAiMutation.isPending}
								className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs disabled:opacity-40"
							>
								<RotateCcw className="h-3.5 w-3.5" />
								Retry
							</button>
						</div>
					</div>
				)}
			</div>

			{/* Pass-through slot for TextSelectionMenu, HighlightLayer, etc. */}
			{children}
		</div>
	);
}
