"use client";

import { Loader2 } from "lucide-react";

interface SyncIndicatorProps {
	isSyncing: boolean;
}

export function SyncIndicator({ isSyncing }: SyncIndicatorProps) {
	if (!isSyncing) return null;

	return (
		<div className="bg-card text-muted-foreground fixed right-6 bottom-6 z-50 flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs shadow-lg">
			<Loader2 className="h-3.5 w-3.5 animate-spin" />
			<span>Syncing…</span>
		</div>
	);
}
