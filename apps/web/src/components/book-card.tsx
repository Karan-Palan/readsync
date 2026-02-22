"use client";

import { useMutation } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { trpc } from "@/utils/trpc";

interface BookCardProps {
	book: {
		id: string;
		title: string;
		fileName: string;
		fileType: string;
		coverUrl: string | null;
		readingProgress: { position: unknown }[];
	};
	onDeleted: () => void;
}

export default function BookCard({ book, onDeleted }: BookCardProps) {
	const router = useRouter();

	const deleteMutation = useMutation(
		trpc.book.delete.mutationOptions({
			onSuccess: () => {
				onDeleted();
			},
		}),
	);

	const initials = book.title
		.split(" ")
		.slice(0, 2)
		.map((w) => w[0]?.toUpperCase() ?? "")
		.join("");

	return (
		<button
			type="button"
			className="group relative w-full cursor-pointer overflow-hidden rounded-lg border bg-card transition-colors hover:bg-accent"
			onClick={() => router.push(`/reader/${book.id}` as any)}
		>
			<div className="flex aspect-3/4 items-center justify-center bg-muted">
				{book.coverUrl ? (
					<img
						src={book.coverUrl}
						alt={book.title}
						className="h-full w-full object-cover"
					/>
				) : (
					<span className="font-bold text-3xl text-muted-foreground">
						{initials}
					</span>
				)}
			</div>
			<div className="p-2">
				<p className="truncate font-medium text-sm">{book.title}</p>
				<p className="text-muted-foreground text-xs uppercase">
					{book.fileType}
				</p>
			</div>

			<button
				type="button"
				className="absolute top-2 right-2 hidden rounded-md bg-destructive p-1.5 text-destructive-foreground opacity-0 transition-opacity group-hover:block group-hover:opacity-100"
				onClick={(e) => {
					e.stopPropagation();
					deleteMutation.mutate({ id: book.id });
				}}
			>
				<Trash2 className="h-4 w-4" />
			</button>
		</button>
	);
}
