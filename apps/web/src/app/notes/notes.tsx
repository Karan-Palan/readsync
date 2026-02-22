"use client";

import { useQuery } from "@tanstack/react-query";
import { BookOpen, StickyNote } from "lucide-react";
import Link from "next/link";

import EmptyState from "@/components/empty-state";
import Loader from "@/components/loader";
import MarkdownContent from "@/components/markdown-content";
import { AI_ACTION_LABELS, getHighlightAccent } from "@/types/reader";
import { trpc } from "@/utils/trpc";

export default function Notes() {
	const { data: highlights = [], isLoading } = useQuery(trpc.highlight.listAll.queryOptions());

	if (isLoading) {
		return <Loader size="h-8 w-8" />;
	}
	if (!highlights.length) {
		return (
			<EmptyState
				icon={StickyNote}
				message="No highlights yet. Start reading and highlight text to see notes here."
			/>
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
								const colorClass = getHighlightAccent(h.color);
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
													{h.aiAction ? (AI_ACTION_LABELS[h.aiAction as keyof typeof AI_ACTION_LABELS] ?? h.aiAction) : "AI Note"}
												</p>
												<MarkdownContent>{h.note}</MarkdownContent>
											</div>
										)}

										{/* AI response (not saved) */}
										{h.aiResponse && !h.note && (
											<div className="mt-2">
												<p className="text-muted-foreground mb-1 text-xs font-medium uppercase tracking-wide">
													{h.aiAction ? (AI_ACTION_LABELS[h.aiAction as keyof typeof AI_ACTION_LABELS] ?? h.aiAction) : "AI"}
												</p>
												<MarkdownContent>{h.aiResponse}</MarkdownContent>
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
