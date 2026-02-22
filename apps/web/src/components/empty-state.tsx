import type { LucideIcon } from "lucide-react";
import Link from "next/link";

interface EmptyStateProps {
	icon: LucideIcon;
	message: string;
	actionHref?: string;
	actionLabel?: string;
}

/**
 * Centered empty state with an icon, message, and optional CTA link.
 */
export default function EmptyState({
	icon: Icon,
	message,
	actionHref = "/library",
	actionLabel = "Go to Library",
}: EmptyStateProps) {
	return (
		<div className="flex h-full flex-col items-center justify-center gap-3 text-center">
			<Icon className="text-muted-foreground h-12 w-12" />
			<p className="text-muted-foreground text-sm">{message}</p>
			<Link
				href={actionHref as any}
				className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm"
			>
				{actionLabel}
			</Link>
		</div>
	);
}
