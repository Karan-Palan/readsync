"use client";

import { useMutation } from "@tanstack/react-query";
import { BookMarked, GripVertical, MessageSquarePlus, Send } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";

import { trpc } from "@/utils/trpc";

interface Highlight {
	id: string;
	text: string;
	color?: string | null;
	note?: string | null;
	startCfi?: string | null;
	endCfi?: string | null;
	pageNumber?: number | null;
	aiAction?: string | null;
	aiResponse?: string | null;
}

interface AIChatPanelProps {
	bookId: string;
	highlight: Highlight;
	action: "EXPLAIN" | "SUMMARIZE" | "EXTRACT" | "DISCUSS";
	/** When true: open as blank chat, no auto-run, user types first */
	chatMode?: boolean;
	onResponseReceived: (highlightId: string, response: string) => void;
	onHighlightCreated: (highlight: Highlight) => void;
}

interface ChatMessage {
	id: string;
	role: "user" | "assistant";
	content: string;
}

function splitSections(content: string): string[] {
	return content
		.split(/\n{2,}/)
		.map((x) => x.trim())
		.filter(Boolean);
}

function insertAtLine(base: string, insert: string, line: number): string {
	const lines = base.length ? base.split("\n") : [];
	const safeLine = Math.max(1, Math.min(line, lines.length + 1));
	const idx = safeLine - 1;
	const before = lines.slice(0, idx);
	const after = lines.slice(idx);
	return [...before, insert, ...after].join("\n").trim();
}

export default function AIChatPanel({
	bookId,
	highlight,
	action,
	chatMode = false,
	onResponseReceived,
	onHighlightCreated,
}: AIChatPanelProps) {
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [question, setQuestion] = useState("");
	const [sections, setSections] = useState<string[]>([]);
	const [dragIndex, setDragIndex] = useState<number | null>(null);
	const [selectionText, setSelectionText] = useState("");
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [modalContent, setModalContent] = useState("");
	const [insertLine, setInsertLine] = useState(1);
	const [targetMode, setTargetMode] = useState<"new" | "append">("new");
	const [initialized, setInitialized] = useState(false);
	const responseAreaRef = useRef<HTMLDivElement>(null);

	const aiQueryMutation = useMutation(trpc.ai.query.mutationOptions());
	const quickQueryMutation = useMutation(trpc.ai.quickQuery.mutationOptions());
	const createHighlightMutation = useMutation(trpc.highlight.create.mutationOptions());
	const updateHighlightMutation = useMutation(trpc.highlight.update.mutationOptions());

	const isPseudo = highlight.id.startsWith("__");
	const isBusy = aiQueryMutation.isPending || quickQueryMutation.isPending;

	const latestAssistant = useMemo(() => {
		for (let i = messages.length - 1; i >= 0; i -= 1) {
			if (messages[i].role === "assistant") return messages[i];
		}
		return null;
	}, [messages]);

	const orderedAssistantContent = useMemo(() => {
		if (!latestAssistant) return "";
		if (!sections.length) return latestAssistant.content;
		return sections.join("\n\n");
	}, [latestAssistant, sections]);

	useEffect(() => {
		if (!latestAssistant) {
			setSections([]);
			return;
		}
		setSections(splitSections(latestAssistant.content));
	}, [latestAssistant?.id]);

	useEffect(() => {
		if (initialized) return;
		// Free-chat mode: don't auto-run anything, wait for user input
		if (chatMode) {
			setInitialized(true);
			return;
		}
		if (highlight.aiResponse) {
			setMessages([
				{
					id: `assistant-${Date.now()}`,
					role: "assistant",
					content: highlight.aiResponse,
				},
			]);
			setInitialized(true);
			return;
		}

		const run = async () => {
			try {
				if (isPseudo) {
					const result = await quickQueryMutation.mutateAsync({ text: highlight.text, action });
					setMessages([
						{ id: `assistant-${Date.now()}`, role: "assistant", content: result.response },
					]);
				} else {
					const result = await aiQueryMutation.mutateAsync({ highlightId: highlight.id, action });
					onResponseReceived(highlight.id, result.response);
					setMessages([
						{ id: `assistant-${Date.now()}`, role: "assistant", content: result.response },
					]);
				}
			} catch (error) {
				const message = error instanceof Error ? error.message : "AI request failed";
				toast.error(message);
			} finally {
				setInitialized(true);
			}
		};

		run();
	}, [
		initialized,
		chatMode,
		highlight.aiResponse,
		isPseudo,
		quickQueryMutation,
		highlight.text,
		action,
		aiQueryMutation,
		highlight.id,
		onResponseReceived,
	]);

	const askFollowUp = async () => {
		const text = question.trim();
		if (!text) return;
		const userMessage: ChatMessage = { id: `user-${Date.now()}`, role: "user", content: text };
		setMessages((prev) => [...prev, userMessage]);
		setQuestion("");

		// Build prompt: in chat mode just send the question (+ conversation history);
		// otherwise prepend the highlighted passage for context.
		const parts: string[] = [];
		if (!chatMode && highlight.text) parts.push(`Passage:\n${highlight.text}`);
		if (orderedAssistantContent) parts.push(`Previous context:\n${orderedAssistantContent}`);
		parts.push(`User:\n${text}`);
		const prompt = parts.join("\n\n");

		try {
			const result = await quickQueryMutation.mutateAsync({ text: prompt.slice(0, 3900), action: "DISCUSS" });
			setMessages((prev) => [
				...prev,
				{ id: `assistant-${Date.now()}`, role: "assistant", content: result.response },
			]);
		} catch (error) {
			const message = error instanceof Error ? error.message : "Failed to send message";
			toast.error(message);
		}
	};

	const openAddModal = (content: string) => {
		const source = latestAssistant?.content ?? "";
		const lineCount = source ? source.split("\n").length : 1;
		setModalContent(content);
		setInsertLine(lineCount + 1);
		setTargetMode(isPseudo ? "new" : "append");
		setIsModalOpen(true);
	};

	const handleSaveToHighlights = async () => {
		if (!modalContent.trim()) return;
		const source = latestAssistant?.content ?? "";
		const composed = insertAtLine(source, modalContent.trim(), insertLine);

		try {
			if (targetMode === "append" && !isPseudo) {
				const base = highlight.note ?? highlight.aiResponse ?? "";
				const updated = insertAtLine(base, modalContent.trim(), insertLine);
				await updateHighlightMutation.mutateAsync({ id: highlight.id, note: updated });
				toast.success("Added to current highlight note");
			} else {
				const created = await createHighlightMutation.mutateAsync({
					bookId,
					text: modalContent.trim().slice(0, 400),
					color: "yellow",
				});
				const note = composed || modalContent.trim();
				await updateHighlightMutation.mutateAsync({ id: created.id, note });
				onHighlightCreated({
					id: created.id,
					text: created.text,
					color: created.color,
					startCfi: created.startCfi,
					endCfi: created.endCfi,
					pageNumber: created.pageNumber,
					note,
					aiAction: null,
					aiResponse: null,
				});
				toast.success("Added as new highlight");
			}
			setIsModalOpen(false);
			setSelectionText("");
		} catch (error) {
			const message = error instanceof Error ? error.message : "Failed to add highlight";
			toast.error(message);
		}
	};

	const handleSelectionCapture = () => {
		const sel = window.getSelection();
		if (!sel || sel.isCollapsed || !sel.toString().trim()) {
			setSelectionText("");
			return;
		}
		if (!responseAreaRef.current) return;
		const range = sel.getRangeAt(0);
		const node = range.commonAncestorContainer.nodeType === 1
			? (range.commonAncestorContainer as Element)
			: range.commonAncestorContainer.parentElement;
		if (!node || !responseAreaRef.current.contains(node)) {
			setSelectionText("");
			return;
		}
		setSelectionText(sel.toString().trim());
	};

	return (
		<div className="flex h-full flex-col" data-ai-panel="true">
			{!chatMode && highlight.text && (
				<div className="border-b px-4 py-3">
					<p className="text-muted-foreground line-clamp-3 text-xs italic">&ldquo;{highlight.text}&rdquo;</p>
				</div>
			)}

			<div className="flex-1 overflow-y-auto px-4 py-3" ref={responseAreaRef} onMouseUp={handleSelectionCapture}>
				<div className="space-y-3">
					{messages.map((msg) => (
						<div
							key={msg.id}
							className={msg.role === "user" ? "ml-6 rounded-xl border px-3 py-2 text-sm" : "mr-6 rounded-xl border bg-muted/20 px-3 py-2"}
						>
							{msg.role === "assistant" ? (
								<div className="prose prose-sm dark:prose-invert max-w-none text-sm">
									<ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
								</div>
							) : (
								<p className="text-sm">{msg.content}</p>
							)}
							{msg.role === "assistant" && (
								<div className="mt-2 flex justify-end">
									<button
										type="button"
										onClick={() => openAddModal(msg.content)}
										className="hover:bg-accent inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs"
									>
										<BookMarked className="h-3.5 w-3.5" />
										Add to highlights
									</button>
								</div>
							)}
						</div>
					))}

					{isBusy && (
						<div className="text-muted-foreground flex items-center gap-2 text-sm">
							<div className="border-primary h-4 w-4 animate-spin rounded-full border-2 border-t-transparent" />
							Thinking...
						</div>
					)}
				</div>

				{selectionText && (
					<div className="mt-3 flex justify-end">
						<button
							type="button"
							onClick={() => openAddModal(selectionText)}
							className="bg-primary/10 text-primary hover:bg-primary/20 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs"
						>
							<MessageSquarePlus className="h-3.5 w-3.5" />
							Add selected to highlights
						</button>
					</div>
				)}

				{latestAssistant && sections.length > 0 && (
					<div className="mt-4 border-t pt-3">
						<p className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">
							Draggable Summary Sections
						</p>
						<div className="space-y-2">
							{sections.map((section, index) => (
								<div
									key={`${section.slice(0, 40)}-${index}`}
									draggable
									onDragStart={() => setDragIndex(index)}
									onDragOver={(e) => e.preventDefault()}
									onDrop={() => {
										if (dragIndex == null || dragIndex === index) return;
										setSections((prev) => {
											const next = [...prev];
											const [moved] = next.splice(dragIndex, 1);
											next.splice(index, 0, moved);
											return next;
										});
										setDragIndex(null);
									}}
									className="bg-muted/30 flex items-start gap-2 rounded-md border p-2"
								>
									<GripVertical className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
									<p className="line-clamp-3 text-xs leading-relaxed">{section}</p>
									<button
										type="button"
										onClick={() => openAddModal(section)}
										className="hover:bg-accent ml-auto rounded px-2 py-1 text-[11px]"
									>
										Add
									</button>
								</div>
							))}
						</div>
					</div>
				)}
			</div>

			<div className="border-t px-4 py-3">
				<div className="flex items-end gap-2">
					<textarea
						value={question}
						onChange={(e) => setQuestion(e.target.value)}
						placeholder={chatMode ? "Ask the AI anything…" : "Ask a follow-up about this passage…"}
						onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); askFollowUp(); } }}
						rows={2}
						className="bg-background min-h-10 flex-1 resize-none rounded-md border px-3 py-2 text-sm"
					/>
					<button
						type="button"
						onClick={askFollowUp}
						disabled={isBusy || !question.trim()}
						className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-9 items-center gap-1 rounded-md px-3 text-xs disabled:opacity-50"
					>
						<Send className="h-3.5 w-3.5" />
						Send
					</button>
				</div>
			</div>

			{isModalOpen && (
				<div className="fixed inset-0 z-110 flex items-center justify-center bg-black/50 px-4">
					<div className="bg-card w-full max-w-lg rounded-lg border p-4 shadow-xl">
						<h4 className="mb-2 text-sm font-semibold">Add to highlights</h4>
						<p className="text-muted-foreground mb-3 text-xs">
							Choose where this text should be inserted before saving.
						</p>

						<textarea
							value={modalContent}
							onChange={(e) => setModalContent(e.target.value)}
							rows={6}
							className="bg-background mb-3 w-full rounded-md border px-3 py-2 text-sm"
						/>

						<div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
							<label className="text-xs">
								<span className="text-muted-foreground mb-1 block">Insert at line</span>
								<input
									type="number"
									min={1}
									value={insertLine}
									onChange={(e) => setInsertLine(Number(e.target.value) || 1)}
									className="bg-background w-full rounded-md border px-2 py-1.5"
								/>
							</label>
							{!isPseudo && (
								<label className="text-xs">
									<span className="text-muted-foreground mb-1 block">Save target</span>
									<select
										value={targetMode}
										onChange={(e) => setTargetMode(e.target.value as "new" | "append")}
										className="bg-background w-full rounded-md border px-2 py-1.5"
									>
										<option value="new">Create new highlight</option>
										<option value="append">Append to current highlight note</option>
									</select>
								</label>
							)}
						</div>

						<div className="flex justify-end gap-2">
							<button
								type="button"
								onClick={() => setIsModalOpen(false)}
								className="hover:bg-accent rounded-md border px-3 py-1.5 text-xs"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={handleSaveToHighlights}
								disabled={createHighlightMutation.isPending || updateHighlightMutation.isPending}
								className="bg-primary text-primary-foreground rounded-md px-3 py-1.5 text-xs disabled:opacity-50"
							>
								Save
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
