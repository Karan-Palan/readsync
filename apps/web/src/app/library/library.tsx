"use client";

import { useQuery } from "@tanstack/react-query";

import BookCard from "@/components/book-card";
import { trpc } from "@/utils/trpc";
import { UploadButton } from "@/utils/uploadthing";

export default function Library() {
	const booksQuery = useQuery(trpc.book.list.queryOptions());

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

			{booksQuery.data && booksQuery.data.length === 0 && (
				<div className="flex flex-col items-center justify-center py-20 text-center">
					<p className="text-muted-foreground text-lg">Your library is empty</p>
					<p className="text-muted-foreground text-sm">Upload a PDF or EPUB to get started</p>
				</div>
			)}

			{booksQuery.data && booksQuery.data.length > 0 && (
				<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
					{booksQuery.data.map((book) => (
						<BookCard key={book.id} book={book} onDeleted={() => booksQuery.refetch()} />
					))}
				</div>
			)}
		</div>
	);
}
