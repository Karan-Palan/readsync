"use client";

import { useQuery } from "@tanstack/react-query";
import { BookOpen } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { trpc } from "@/utils/trpc";

export default function Summaries() {
	const { data: summaries = [], isLoading } = useQuery(trpc.book.listSummaries.queryOptions());

	if (isLoading) {
		return (
			<div className="flex h-full items-center justify-center">
				<div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
			</div>
		);
	}
	if (!summaries.length) {
		return (
			<div className="flex h-full flex-col items-center justify-center gap-3 text-center">
				<BookOpen className="text-muted-foreground h-12 w-12" />
				<p className="text-muted-foreground text-sm">
					No summaries yet. Open a book and press the &ldquo;Summary&rdquo; button to generate one.
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
						<div className="prose prose-sm dark:prose-invert max-w-none">
							<ReactMarkdown remarkPlugins={[remarkGfm]}>{summary.content}</ReactMarkdown>
						</div>
					</article>
				))}
			</div>
		</div>
	);
}
