"use client";

import { useQuery } from "@tanstack/react-query";
import { BookText, Library as LibraryIcon, StickyNote } from "lucide-react";
import { useRouter } from "next/navigation";

import BookCard from "@/components/book-card";
import EmptyState from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/utils/trpc";
import { UploadButton } from "@/utils/uploadthing";

// Constants

const BOOK_GRID = "grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5";
const SKELETON_COUNT = 10;

// Types

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

// Sub-components

function SectionHeading({ label }: { label: string }) {
	return (
		<h2 className="text-muted-foreground mb-4 text-sm font-semibold tracking-wide uppercase">
			{label}
		</h2>
	);
}

interface BookLinkCardProps {
	bookId: string;
	title: string;
	href: string;
	accent: string;
	icon: React.ReactNode;
	subLabel: string;
}

function BookLinkCard({ bookId, title, href, accent, icon, subLabel }: BookLinkCardProps) {
	const router = useRouter();
	return (
		<button
			key={bookId}
			type="button"
			className="group bg-card hover:bg-accent relative w-full cursor-pointer overflow-hidden rounded-lg border transition-colors"
			onClick={() => router.push(href as any)}
		>
			<div className={`flex aspect-3/4 items-center justify-center ${accent}`}>{icon}</div>
			<div className="p-2">
				<p className="truncate text-sm font-medium">{title}</p>
				<p className="text-muted-foreground text-xs">{subLabel}</p>
			</div>
		</button>
	);
}

function LibrarySkeleton() {
	return (
		<div className={BOOK_GRID}>
			{Array.from({ length: SKELETON_COUNT }).map((_, i) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: static skeleton list
				<Skeleton key={i} className="aspect-3/4 w-full rounded-lg" />
			))}
		</div>
	);
}

// Main component

export default function Library() {
	const booksQuery = useQuery(trpc.book.list.queryOptions());

	const books = (booksQuery.data ?? []) as BookItem[];
	const booksWithSummary = books.filter((b) => b.summary);
	const booksWithNotes = books.filter((b) => b._count.highlights > 0);

	return (
		<div className="container mx-auto max-w-6xl px-4 py-6">
			{/* Header */}
			<div className="mb-6 flex items-center justify-between">
				<h1 className="text-2xl font-bold">Library</h1>
				<UploadButton
					endpoint="bookUploader"
					onClientUploadComplete={() => {
						void booksQuery.refetch();
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

			{/* Loading */}
			{booksQuery.isLoading && <LibrarySkeleton />}

			{/* Empty */}
			{!booksQuery.isLoading && books.length === 0 && (
				<EmptyState
					icon={LibraryIcon}
					message="Your library is empty. Upload a PDF or EPUB to get started."
					actionHref="/library"
					actionLabel="Upload a book"
				/>
			)}

			{/* All books */}
			{books.length > 0 && (
				<div className={BOOK_GRID}>
					{books.map((book) => (
						<BookCard key={book.id} book={book} onDeleted={() => booksQuery.refetch()} />
					))}
				</div>
			)}

			{/* Summaries section */}
			{booksWithSummary.length > 0 && (
				<div className="mt-10">
					<SectionHeading label="Summaries" />
					<div className={BOOK_GRID}>
						{booksWithSummary.map((book) => (
							<BookLinkCard
								key={`summary-${book.id}`}
								bookId={book.id}
								title={book.title}
								href={`/library/${book.id}/summary`}
								accent="bg-primary/10 text-primary"
								icon={<BookText className="h-12 w-12 opacity-70" />}
								subLabel="Summary"
							/>
						))}
					</div>
				</div>
			)}

			{/* Notes section */}
			{booksWithNotes.length > 0 && (
				<div className="mt-10">
					<SectionHeading label="Notes & Highlights" />
					<div className={BOOK_GRID}>
						{booksWithNotes.map((book) => (
							<BookLinkCard
								key={`notes-${book.id}`}
								bookId={book.id}
								title={book.title}
								href={`/library/${book.id}/notes`}
								accent="bg-yellow-50 text-yellow-600 dark:bg-yellow-950/20"
								icon={<StickyNote className="h-12 w-12 opacity-70" />}
								subLabel={`${book._count.highlights} highlight${book._count.highlights !== 1 ? "s" : ""}`}
							/>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
