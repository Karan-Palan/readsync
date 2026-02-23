"use client";

import { useQuery } from "@tanstack/react-query";
import { BookOpen } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import EmptyState from "@/components/empty-state";
import Loader from "@/components/loader";
import MarkdownContent from "@/components/markdown-content";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { trpc } from "@/utils/trpc";

// Sub-components

type SummaryItem = {
	id: string;
	content: string;
	updatedAt: string;
	book: { id: string; title: string; coverUrl: string | null };
};

function BookCover({ coverUrl, title }: { coverUrl: string | null; title: string }) {
	if (coverUrl) {
		return (
			<Image src={coverUrl} alt={title} width={40} height={56} className="rounded object-cover" />
		);
	}
	return (
		<div className="bg-muted flex h-14 w-10 items-center justify-center rounded">
			<BookOpen className="text-muted-foreground h-5 w-5" />
		</div>
	);
}

function SummaryCard({ summary }: { summary: SummaryItem }) {
	const updatedDate = new Date(summary.updatedAt).toLocaleDateString(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
	});

	return (
		<Card>
			<CardHeader className="pb-3">
				<div className="flex items-center gap-3">
					<BookCover coverUrl={summary.book.coverUrl} title={summary.book.title} />
					<div className="min-w-0 flex-1">
						<Link
							href={`/reader/${summary.book.id}` as any}
							className="text-base font-semibold hover:underline"
						>
							{summary.book.title}
						</Link>
						<div className="mt-1">
							<Badge variant="outline" className="text-xs">
								Updated {updatedDate}
							</Badge>
						</div>
					</div>
				</div>
			</CardHeader>
			<CardContent>
				<MarkdownContent>{summary.content}</MarkdownContent>
			</CardContent>
		</Card>
	);
}

// Main component

export default function Summaries() {
	const { data: summaries = [], isLoading } = useQuery(trpc.book.listSummaries.queryOptions());

	if (isLoading) {
		return <Loader size="h-8 w-8" />;
	}
	if (!summaries.length) {
		return (
			<EmptyState
				icon={BookOpen}
				message='No summaries yet. Open a book and press the "Summary" button to generate one.'
			/>
		);
	}

	return (
		<div className="overflow-y-auto px-4 py-6 sm:px-8">
			<h1 className="mb-6 text-2xl font-bold">Book Summaries</h1>
			<div className="space-y-8">
				{(summaries as SummaryItem[]).map((summary) => (
					<SummaryCard key={summary.id} summary={summary} />
				))}
			</div>
		</div>
	);
}
