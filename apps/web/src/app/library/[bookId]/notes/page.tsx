import { auth } from "@readsync/auth";
import prisma from "@readsync/db";
import { ArrowLeft } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import MarkdownContent from "@/components/markdown-content";

const COLOR_BORDER: Record<string, string> = {
	yellow: "border-yellow-400 bg-yellow-50 dark:bg-yellow-950/20",
	green: "border-green-400 bg-green-50 dark:bg-green-950/20",
	blue: "border-blue-400 bg-blue-50 dark:bg-blue-950/20",
	pink: "border-pink-400 bg-pink-50 dark:bg-pink-950/20",
};

const ACTION_LABEL: Record<string, string> = {
	EXPLAIN: "Explanation",
	SUMMARIZE: "Summary",
	EXTRACT: "Key Insights",
	DISCUSS: "Discussion",
};

export default async function NotesPage({ params }: { params: Promise<{ bookId: string }> }) {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session?.user) redirect("/login");

	const { bookId } = await params;

	const book = await prisma.book.findUnique({
		where: { id: bookId },
		include: {
			highlights: {
				where: { userId: session.user.id },
				orderBy: { createdAt: "asc" },
			},
		},
	});

	if (!book || book.userId !== session.user.id) notFound();

	if (!book.highlights.length) {
		return (
			<div className="flex h-full flex-col items-center justify-center gap-4 px-4 text-center">
				<p className="text-muted-foreground">No highlights or notes yet for this book.</p>
				<Link
					href={`/reader/${bookId}` as any}
					className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm"
				>
					Open reader
				</Link>
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-2xl px-4 py-6">
			{/* Back */}
			<Link
				href={`/library` as any}
				className="text-muted-foreground hover:text-foreground mb-6 inline-flex items-center gap-1 text-sm"
			>
				<ArrowLeft className="h-4 w-4" />
				Library
			</Link>

			<h1 className="mb-1 text-2xl font-bold">{book.title}</h1>
			<p className="text-muted-foreground mb-6 text-sm">
				{book.highlights.length} highlight{book.highlights.length !== 1 ? "s" : ""}
			</p>

			<div className="space-y-4">
				{book.highlights.map((h) => {
					const colorClass = COLOR_BORDER[h.color] ?? COLOR_BORDER.yellow;
					return (
						<div key={h.id} className={`rounded-lg border-l-4 px-4 py-3 ${colorClass}`}>
							<p className="mb-2 text-sm font-medium italic">&ldquo;{h.text}&rdquo;</p>

							{h.note && !h.aiResponse && <p className="text-muted-foreground text-sm">{h.note}</p>}

							{h.aiResponse && (
								<div className="mt-2">
									<p className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
										{h.aiAction ? (ACTION_LABEL[h.aiAction] ?? h.aiAction) : "AI"}
									</p>
									<MarkdownContent>{h.note ?? h.aiResponse}</MarkdownContent>
								</div>
							)}

							<p className="text-muted-foreground mt-2 text-xs">
								{new Date(h.createdAt).toLocaleDateString()}
							</p>
						</div>
					);
				})}
			</div>
		</div>
	);
}
