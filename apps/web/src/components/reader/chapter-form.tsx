"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import { trpc } from "@/utils/trpc";

interface Chapter {
	id: string;
	name: string;
	startPage: number;
	endPage: number;
	order: number;
}

interface ChapterFormProps {
	bookId: string;
	nextOrder: number;
	initialStartPage?: number;
	initialEndPage?: number;
	onCreated: (chapter: Chapter) => void;
	onClose: () => void;
}

export default function ChapterForm({
	bookId,
	nextOrder,
	initialStartPage,
	initialEndPage,
	onCreated,
	onClose,
}: ChapterFormProps) {
	const [name, setName] = useState("");
	const [startPage, setStartPage] = useState(initialStartPage ?? 1);
	const [endPage, setEndPage] = useState(initialEndPage ?? 1);

	const createMutation = useMutation(
		trpc.chapter.create.mutationOptions({
			onSuccess: (data) => {
				onCreated({
					id: data.id,
					name: data.name,
					startPage: data.startPage,
					endPage: data.endPage,
					order: data.order,
				});
			},
		}),
	);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!name.trim()) return;

		createMutation.mutate({
			bookId,
			name: name.trim(),
			startPage,
			endPage,
			order: nextOrder,
		});
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center">
			{/* biome-ignore lint/a11y/noStaticElementInteractions: modal backdrop interaction pattern */}
			{/* biome-ignore lint/a11y/useKeyWithClickEvents: modal backdrop, dismissed via Escape or button */}
			<div className="absolute inset-0 bg-black/50" onClick={onClose} />
			<div className="bg-card relative z-10 w-full max-w-sm rounded-lg border p-6 shadow-xl">
				<h3 className="mb-4 text-sm font-semibold">New Chapter</h3>
				<form onSubmit={handleSubmit} className="flex flex-col gap-3">
					<div>
						<label htmlFor="chapter-name" className="text-muted-foreground mb-1 block text-xs">
							Chapter Name
						</label>
						<input
							id="chapter-name"
							type="text"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="e.g. Introduction"
							className="bg-background focus:ring-ring w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
						/>
					</div>
					<div className="grid grid-cols-2 gap-3">
						<div>
							<label
								htmlFor="chapter-start-page"
								className="text-muted-foreground mb-1 block text-xs"
							>
								Start Page
							</label>
							<input
								id="chapter-start-page"
								type="number"
								min={1}
								value={startPage}
								onChange={(e) => setStartPage(Number(e.target.value))}
								className="bg-background focus:ring-ring w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
							/>
						</div>
						<div>
							<label
								htmlFor="chapter-end-page"
								className="text-muted-foreground mb-1 block text-xs"
							>
								End Page
							</label>
							<input
								id="chapter-end-page"
								type="number"
								min={1}
								value={endPage}
								onChange={(e) => setEndPage(Number(e.target.value))}
								className="bg-background focus:ring-ring w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
							/>
						</div>
					</div>
					<div className="mt-2 flex justify-end gap-2">
						<button
							type="button"
							onClick={onClose}
							className="text-muted-foreground hover:bg-accent rounded-md px-4 py-2 text-sm"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={!name.trim() || createMutation.isPending}
							className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
						>
							{createMutation.isPending ? "Creating..." : "Create"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
