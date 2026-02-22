"use client";

import { useQuery } from "@tanstack/react-query";
import { BookOpen, StickyNote } from "lucide-react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { trpc } from "@/utils/trpc";

const COLOR_CLASSES: Record<string, string> = {
	yellow: "border-yellow-400 bg-yellow-50 dark:bg-yellow-950/20",
	green: "border-green-400 bg-green-50 dark:bg-green-950/20",
	blue: "border-blue-400 bg-blue-50 dark:bg-blue-950/20",
	pink: "border-pink-400 bg-pink-50 dark:bg-pink-950/20",
};

const ACTION_LABEL: Record<string, string> = {
	EXPLAIN: "Explanation",
	SUMMARIZE: "Summary",
	EXTRACT: "Key Insights",
	DISCUSS: "Discussion",
};

export default function Notes() {
	const { data: highlights = [], isLoading } = useQuery(trpc.highlight.listAll.queryOptions());

	if (isLoading) {
		return (
			<div className="flex h-full items-center justify-center">
				<div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
			</div>
		);
	}
	if (!highlights.length) {
		return (
			<div className="flex h-full flex-col items-center justify-center gap-3 text-center">
				<StickyNote className="text-muted-foreground h-12 w-12" />
				<p className="text-muted-foreground text-sm">
					No highlights yet. Start reading and highlight text to see notes here.
				</p>
				<Link
					href="/library"
					className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm"
				>
					Go to Library
				</Link>
			</div>
		);
	}

	// Group highlights by book
	const byBook = highlights.reduce<
		Record<string, { book: (typeof highlights)[0]["book"]; items: typeof highlights }>
	>((acc, h) => {
		const bookId = h.book.id;
		if (!acc[bookId]) {
			acc[bookId] = { book: h.book, items: [] };
		}
		acc[bookId].items.push(h);
		return acc;
	}, {});

	return (
		<div className="overflow-y-auto px-4 py-6 sm:px-8">
			<h1 className="mb-6 text-2xl font-bold">My Notes</h1>

			<div className="space-y-10">
				{Object.values(byBook).map(({ book, items }) => (
					<section key={book.id}>
						<Link
							href={`/reader/${book.id}` as any}
							className="mb-3 flex items-center gap-2 text-lg font-semibold hover:underline"
						>
							<BookOpen className="h-5 w-5" />
							{book.title}
						</Link>

						<div className="space-y-3">
							{items.map((h) => {
								const colorClass =
									COLOR_CLASSES[h.color ?? "yellow"] ?? COLOR_CLASSES.yellow;
								return (
									<div
										key={h.id}
										className={`rounded-lg border-l-4 px-4 py-3 ${colorClass}`}
									>
										{/* Highlighted text */}
										<p className="mb-2 text-sm font-medium italic">&ldquo;{h.text}&rdquo;</p>

										{/* User note (manual) */}
										{h.note && !h.aiResponse && (
											<p className="text-muted-foreground text-sm">{h.note}</p>
										)}

										{/* AI response saved as note */}
										{h.note && h.aiResponse && (
											<div className="mt-2">
												<p className="text-muted-foreground mb-1 text-xs font-medium uppercase tracking-wide">
													{h.aiAction ? (ACTION_LABEL[h.aiAction] ?? h.aiAction) : "AI Note"}
												</p>
											<div className="prose prose-sm dark:prose-invert max-w-none">
												<ReactMarkdown remarkPlugins={[remarkGfm]}>{h.note}</ReactMarkdown>
											</div>
											</div>
										)}

										{/* AI response (not saved) */}
										{h.aiResponse && !h.note && (
											<div className="mt-2">
												<p className="text-muted-foreground mb-1 text-xs font-medium uppercase tracking-wide">
													{h.aiAction ? (ACTION_LABEL[h.aiAction] ?? h.aiAction) : "AI"}
												</p>
											<div className="prose prose-sm dark:prose-invert max-w-none">
												<ReactMarkdown remarkPlugins={[remarkGfm]}>{h.aiResponse}</ReactMarkdown>
											</div>
											</div>
										)}
									</div>
								);
							})}
						</div>
					</section>
				))}
			</div>
		</div>
	);
}
