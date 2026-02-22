import { auth } from "@readsync/auth";
import prisma from "@readsync/db";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import Reader from "./reader";

export default async function ReaderPage({ params }: { params: Promise<{ bookId: string }> }) {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user) {
		redirect("/login");
	}

	const { bookId } = await params;

	const book = await prisma.book.findUnique({
		where: { id: bookId },
		include: {
			readingProgress: {
				where: { userId: session.user.id },
			},
			highlights: {
				where: { userId: session.user.id },
			},
			chapters: {
				where: { userId: session.user.id },
				orderBy: { order: "asc" },
			},
		},
	});

	if (!book || book.userId !== session.user.id) {
		notFound();
	}

	const progress = book.readingProgress[0] ?? null;

	return (
		<Reader
			book={{
				id: book.id,
				title: book.title,
				fileName: book.fileName,
				fileUrl: book.fileUrl,
				fileType: book.fileType,
				coverUrl: book.coverUrl,
				totalPages: book.totalPages,
			}}
			initialProgress={progress?.position ?? null}
			initialHighestPosition={progress?.highestPosition ?? null}
			initialHighlights={book.highlights}
			initialChapters={book.chapters}
		/>
	);
}
