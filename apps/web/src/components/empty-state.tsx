import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
		<div className="flex h-full flex-col items-center justify-center gap-4 text-center">
			<Icon className="text-muted-foreground h-12 w-12" />
			<p className="text-muted-foreground text-sm">{message}</p>
			<Link href={actionHref as any} className={cn(buttonVariants({ variant: "default" }))}>
				{actionLabel}
			</Link>
		</div>
	);
}
