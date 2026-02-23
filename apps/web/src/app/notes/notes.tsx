"use client";

import { useQuery } from "@tanstack/react-query";
import { BookOpen, StickyNote } from "lucide-react";
import Link from "next/link";

import EmptyState from "@/components/empty-state";
import Loader from "@/components/loader";
import MarkdownContent from "@/components/markdown-content";
import { Badge } from "@/components/ui/badge";
import { AI_ACTION_LABELS, getHighlightAccent } from "@/types/reader";
import { trpc } from "@/utils/trpc";

// Sub-components

function AILabel({ action }: { action: string | null | undefined }) {
	const label = action
		? (AI_ACTION_LABELS[action as keyof typeof AI_ACTION_LABELS] ?? action)
		: "AI";
	return (
		<Badge variant="secondary" className="mb-2 text-xs">
			{label}
		</Badge>
	);
}

type HighlightItem = {
	id: string;
	text: string;
	color?: string | null;
	note?: string | null;
	aiAction?: string | null;
	aiResponse?: string | null;
};

function HighlightCard({ highlight: h }: { highlight: HighlightItem }) {
	const colorClass = getHighlightAccent(h.color);
	return (
		<div className={`rounded-lg border-l-4 px-4 py-3 ${colorClass}`}>
			{/* Quoted text */}
			<p className="mb-2 font-medium text-sm italic">&ldquo;{h.text}&rdquo;</p>

			{/* Manual note only */}
			{h.note && !h.aiResponse && (
				<p className="text-muted-foreground text-sm">{h.note}</p>
			)}

			{/* AI response saved as note */}
			{h.note && h.aiResponse && (
				<div className="mt-2">
					<AILabel action={h.aiAction} />
					<MarkdownContent>{h.note}</MarkdownContent>
				</div>
			)}

			{/* AI response only (not saved as note) */}
			{h.aiResponse && !h.note && (
				<div className="mt-2">
					<AILabel action={h.aiAction} />
					<MarkdownContent>{h.aiResponse}</MarkdownContent>
				</div>
			)}
		</div>
	);
}

// Main component

export default function Notes() {
	const { data: highlights = [], isLoading } = useQuery(
		trpc.highlight.listAll.queryOptions(),
	);

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
		Record<
			string,
			{ book: (typeof highlights)[0]["book"]; items: typeof highlights }
		>
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
			<h1 className="mb-6 font-bold text-2xl">My Notes</h1>

			<div className="space-y-10">
				{Object.values(byBook).map(({ book, items }) => (
					<section key={book.id}>
						<Link
							href={`/reader/${book.id}` as any}
							className="mb-3 flex items-center gap-2 font-semibold text-lg hover:underline"
						>
							<BookOpen className="h-5 w-5" />
							{book.title}
						</Link>

						<div className="space-y-3">
							{items.map((h) => (
								<HighlightCard key={h.id} highlight={h} />
							))}
						</div>
					</section>
				))}
			</div>
		</div>
	);
}
