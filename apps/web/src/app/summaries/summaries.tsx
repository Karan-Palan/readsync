"use client";

import { useQuery } from "@tanstack/react-query";
import { BookOpen } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import EmptyState from "@/components/empty-state";
import Loader from "@/components/loader";
import MarkdownContent from "@/components/markdown-content";
import { trpc } from "@/utils/trpc";

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
				{summaries.map((summary) => (
					<article key={summary.id} className="rounded-xl border p-5 shadow-sm">
						{/* Book header */}
						<div className="mb-4 flex items-center gap-3">
							{summary.book.coverUrl ? (
								<Image
									src={summary.book.coverUrl}
									alt={summary.book.title}
									width={40}
									height={56}
									className="rounded object-cover"
								/>
							) : (
								<div className="bg-muted flex h-14 w-10 items-center justify-center rounded">
									<BookOpen className="text-muted-foreground h-5 w-5" />
								</div>
							)}
							<div className="min-w-0 flex-1">
								<Link
									href={`/reader/${summary.book.id}` as any}
									className="text-base font-semibold hover:underline"
								>
									{summary.book.title}
								</Link>
								<p className="text-muted-foreground text-xs">
									Last updated:{" "}
									{new Date(summary.updatedAt).toLocaleDateString(undefined, {
										year: "numeric",
										month: "short",
										day: "numeric",
									})}
								</p>
							</div>
						</div>

						{/* Summary content */}
						<MarkdownContent>{summary.content}</MarkdownContent>
					</article>
				))}
			</div>
		</div>
	);
}
