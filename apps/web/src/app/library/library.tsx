"use client";

import { useQuery } from "@tanstack/react-query";
import { BookText, StickyNote } from "lucide-react";
import { useRouter } from "next/navigation";

import BookCard from "@/components/book-card";
import { trpc } from "@/utils/trpc";
import { UploadButton } from "@/utils/uploadthing";

export default function Library() {
	const booksQuery = useQuery(trpc.book.list.queryOptions());
	const router = useRouter();

	type BookItem = {
		id: string;
		title: string;
		fileName: string;
		fileType: string;
		coverUrl: string | null;
		readingProgress: { position: unknown }[];
		summary?: { id: string } | null;
		_count: { highlights: number };
	};
	// biome-ignore lint/suspicious/noExplicitAny: tRPC inferred type is excessively deep (TS2589)
	const books = (booksQuery.data ?? []) as BookItem[];
	const booksWithSummary = books.filter((b) => b.summary);
	const booksWithNotes = books.filter((b) => b._count.highlights > 0);

	return (
		<div className="container mx-auto max-w-6xl px-4 py-6">
			<div className="mb-6 flex items-center justify-between">
				<h1 className="text-2xl font-bold">Library</h1>
				<UploadButton
					endpoint="bookUploader"
					onClientUploadComplete={() => {
						booksQuery.refetch();
					}}
					onUploadError={(error: Error) => {
						console.error("Upload error:", error.message);
					}}
					appearance={{
						button:
							"bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md text-sm font-medium",
						allowedContent: "text-muted-foreground text-xs",
					}}
				/>
			</div>

			{booksQuery.isLoading && (
				<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
					{Array.from({ length: 8 }).map((_, i) => (
						<div key={`skeleton-${i}`} className="bg-muted aspect-3/4 animate-pulse rounded-lg" />
					))}
				</div>
			)}

			{books.length === 0 && !booksQuery.isLoading && (
				<div className="flex flex-col items-center justify-center py-20 text-center">
					<p className="text-muted-foreground text-lg">Your library is empty</p>
					<p className="text-muted-foreground text-sm">Upload a PDF or EPUB to get started</p>
				</div>
			)}

			{/* Real books */}
			{books.length > 0 && (
				<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
					{books.map((book) => (
						<BookCard key={book.id} book={book} onDeleted={() => booksQuery.refetch()} />
					))}
				</div>
			)}

			{/* Summaries section */}
			{booksWithSummary.length > 0 && (
				<div className="mt-10">
					<h2 className="text-muted-foreground mb-4 text-sm font-semibold uppercase tracking-wide">
						Summaries
					</h2>
					<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
						{booksWithSummary.map((book) => (
							<button
								key={`summary-${book.id}`}
								type="button"
								className="bg-card hover:bg-accent group relative w-full cursor-pointer overflow-hidden rounded-lg border transition-colors"
								onClick={() => router.push(`/library/${book.id}/summary` as any)}
							>
								<div className="bg-primary/10 text-primary flex aspect-3/4 items-center justify-center">
									<BookText className="h-12 w-12 opacity-70" />
								</div>
								<div className="p-2">
									<p className="truncate text-sm font-medium">{book.title}</p>
									<p className="text-muted-foreground text-xs">Summary</p>
								</div>
							</button>
						))}
					</div>
				</div>
			)}

			{/* Notes section */}
			{booksWithNotes.length > 0 && (
				<div className="mt-10">
					<h2 className="text-muted-foreground mb-4 text-sm font-semibold uppercase tracking-wide">
						Notes &amp; Highlights
					</h2>
					<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
						{booksWithNotes.map((book) => (
							<button
								key={`notes-${book.id}`}
								type="button"
								className="bg-card hover:bg-accent group relative w-full cursor-pointer overflow-hidden rounded-lg border transition-colors"
								onClick={() => router.push(`/library/${book.id}/notes` as any)}
							>
								<div className="bg-yellow-50 text-yellow-600 dark:bg-yellow-950/20 flex aspect-3/4 items-center justify-center">
									<StickyNote className="h-12 w-12 opacity-70" />
								</div>
								<div className="p-2">
									<p className="truncate text-sm font-medium">{book.title}</p>
									<p className="text-muted-foreground text-xs">
										{book._count.highlights} highlight{book._count.highlights !== 1 ? "s" : ""}
									</p>
								</div>
							</button>
						))}
					</div>
				</div>
			)}
		</div>
	);
}

