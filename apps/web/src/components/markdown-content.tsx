"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownContentProps {
	children: string;
	className?: string;
}

/**
 * Renders Markdown content with GFM support and prose styling.
 */
export default function MarkdownContent({
	children,
	className,
}: MarkdownContentProps) {
	return (
		<div className={className ?? "prose prose-sm dark:prose-invert max-w-none"}>
			<ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
		</div>
	);
}
