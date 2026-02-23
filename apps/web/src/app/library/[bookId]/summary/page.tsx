import { auth } from "@readsync/auth";
import prisma from "@readsync/db";
import { ArrowLeft } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import MarkdownContent from "@/components/markdown-content";

export default async function SummaryPage({
	params,
}: {
	params: Promise<{ bookId: string }>;
}) {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session?.user) redirect("/login");

	const { bookId } = await params;

	const book = await prisma.book.findUnique({
		where: { id: bookId },
		include: { summary: true },
	});

	if (!book || book.userId !== session.user.id) notFound();
	if (!book.summary) {
		return (
			<div className="flex h-full flex-col items-center justify-center gap-4 px-4 text-center">
				<p className="text-muted-foreground">No summary yet for this book.</p>
				<p className="text-muted-foreground text-sm">
					Open the book in the reader and tap the <strong>Summary</strong>{" "}
					button in the top bar to generate one.
				</p>
				<Link
					href={`/reader/${bookId}` as any}
					className="rounded-md bg-primary px-4 py-2 text-primary-foreground text-sm"
				>
					Open reader
				</Link>
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-2xl px-4 py-6">
			{/* Back link */}
			<Link
				href={"/library" as any}
				className="mb-6 inline-flex items-center gap-1 text-muted-foreground text-sm hover:text-foreground"
			>
				<ArrowLeft className="h-4 w-4" />
				Library
			</Link>

			<h1 className="mb-1 font-bold text-2xl">{book.title}</h1>
			<p className="mb-6 text-muted-foreground text-sm">AI Summary</p>

			<MarkdownContent className="prose prose-neutral dark:prose-invert max-w-none">
				{book.summary.content}
			</MarkdownContent>

			<p className="mt-8 text-muted-foreground text-xs">
				Last updated {new Date(book.summary.updatedAt).toLocaleDateString()}
			</p>
		</div>
	);
}
