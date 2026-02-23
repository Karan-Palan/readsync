"use client";

import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/use-online-status";

export function OfflineIndicator() {
	const { isOnline } = useOnlineStatus();

	if (isOnline) return null;

	return (
		<div className="border-destructive/30 bg-destructive/10 text-destructive flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium">
			<WifiOff className="h-3 w-3" />
			<span>Offline</span>
		</div>
	);
}
