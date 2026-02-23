"use client";

import { useMutation } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
			className="group bg-card hover:bg-accent relative w-full cursor-pointer overflow-hidden rounded-lg border transition-colors"
			onClick={() => router.push(`/reader/${book.id}` as any)}
		>
			<div className="bg-muted flex aspect-3/4 items-center justify-center">
				{book.coverUrl ? (
					<img src={book.coverUrl} alt={book.title} className="h-full w-full object-cover" />
				) : (
					<span className="text-muted-foreground text-3xl font-bold">{initials}</span>
				)}
			</div>
			<div className="flex items-center justify-between p-2">
				<p className="truncate text-sm font-medium">{book.title}</p>
				<Badge variant="secondary" className="shrink-0 text-xs uppercase">
					{book.fileType}
				</Badge>
			</div>

			<div className="absolute top-2 right-2 hidden group-hover:block">
				<Button
					variant="destructive"
					size="icon"
					className="h-7 w-7"
					onClick={(e) => {
						e.stopPropagation();
						deleteMutation.mutate({ id: book.id });
					}}
				>
					<Trash2 className="h-4 w-4" />
				</Button>
			</div>
		</button>
	);
}
