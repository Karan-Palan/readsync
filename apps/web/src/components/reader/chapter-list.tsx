"use client";

import { BookOpen, Plus, X } from "lucide-react";
import { useState } from "react";

import ChapterForm from "./chapter-form";

interface Chapter {
	id: string;
	name: string;
	startPage: number;
	endPage: number;
	order: number;
}

interface ChapterListProps {
	bookId: string;
	chapters: Chapter[];
	onJump: (startPage: number) => void;
	onChapterCreated: (chapter: Chapter) => void;
	onClose: () => void;
	initialStartPage?: number;
	initialEndPage?: number;
	autoOpenForm?: boolean;
}

export default function ChapterList({
	bookId,
	chapters,
	onJump,
	onChapterCreated,
	onClose,
	initialStartPage,
	initialEndPage,
	autoOpenForm = false,
}: ChapterListProps) {
	const [isFormOpen, setIsFormOpen] = useState(autoOpenForm);

	return (
		<>
			{/* Desktop: Left sidebar */}
			<div className="bg-card absolute top-0 left-0 z-30 hidden h-full w-72 flex-col border-r shadow-lg md:flex">
				<div className="flex items-center justify-between border-b px-4 py-3">
					<h3 className="text-sm font-semibold">Chapters</h3>
					<div className="flex items-center gap-1">
						<button
							type="button"
							onClick={() => setIsFormOpen(true)}
							className="hover:bg-accent rounded-md p-1"
							title="Add chapter"
						>
							<Plus className="h-4 w-4" />
						</button>
						<button type="button" onClick={onClose} className="hover:bg-accent rounded-md p-1">
							<X className="h-4 w-4" />
						</button>
					</div>
				</div>
				<div className="flex-1 overflow-y-auto">
					{chapters.length === 0 ? (
						<p className="text-muted-foreground px-4 py-8 text-center text-sm">No chapters yet</p>
					) : (
						<ul className="divide-y">
							{chapters.map((chapter) => (
								<li key={chapter.id}>
									<button
										type="button"
										onClick={() => onJump(chapter.startPage)}
										className="hover:bg-accent flex w-full items-center gap-2 px-4 py-3 text-left"
									>
										<BookOpen className="text-muted-foreground h-4 w-4 shrink-0" />
										<div className="min-w-0 flex-1">
											<p className="truncate text-sm font-medium">{chapter.name}</p>
											<p className="text-muted-foreground text-xs">
												Pages {chapter.startPage}–{chapter.endPage}
											</p>
										</div>
									</button>
								</li>
							))}
						</ul>
					)}
				</div>
			</div>

			{/* Mobile: Bottom sheet */}
			<div className="fixed inset-0 z-30 md:hidden">
				{/* biome-ignore lint/a11y/noStaticElementInteractions: modal backdrop interaction pattern */}
				{/* biome-ignore lint/a11y/useKeyWithClickEvents: modal backdrop dismissed via button or Escape */}
				<div className="absolute inset-0 bg-black/40" onClick={onClose} />
				<div className="bg-card absolute right-0 bottom-0 left-0 flex max-h-[60vh] flex-col rounded-t-xl">
					<div className="flex justify-center py-2">
						<div className="bg-muted-foreground/30 h-1 w-8 rounded-full" />
					</div>
					<div className="flex items-center justify-between px-4 pb-2">
						<h3 className="text-sm font-semibold">Chapters</h3>
						<div className="flex items-center gap-1">
							<button
								type="button"
								onClick={() => setIsFormOpen(true)}
								className="hover:bg-accent rounded-md p-1"
							>
								<Plus className="h-4 w-4" />
							</button>
							<button type="button" onClick={onClose} className="hover:bg-accent rounded-md p-1">
								<X className="h-4 w-4" />
							</button>
						</div>
					</div>
					<div className="flex-1 overflow-y-auto">
						{chapters.length === 0 ? (
							<p className="text-muted-foreground px-4 py-8 text-center text-sm">No chapters yet</p>
						) : (
							<ul className="divide-y">
								{chapters.map((chapter) => (
									<li key={chapter.id}>
										<button
											type="button"
											onClick={() => onJump(chapter.startPage)}
											className="hover:bg-accent flex w-full items-center gap-2 px-4 py-3 text-left"
										>
											<BookOpen className="text-muted-foreground h-4 w-4 shrink-0" />
											<div className="min-w-0 flex-1">
												<p className="truncate text-sm font-medium">{chapter.name}</p>
												<p className="text-muted-foreground text-xs">
													Pages {chapter.startPage}–{chapter.endPage}
												</p>
											</div>
										</button>
									</li>
								))}
							</ul>
						)}
					</div>
				</div>
			</div>

			{/* Chapter form modal */}
			{isFormOpen && (
				<ChapterForm
					bookId={bookId}
					nextOrder={chapters.length + 1}
					initialStartPage={initialStartPage}
					initialEndPage={initialEndPage}
					onCreated={(chapter) => {
						onChapterCreated(chapter);
						setIsFormOpen(false);
					}}
					onClose={() => setIsFormOpen(false)}
				/>
			)}
		</>
	);
}
