"use client";

import { Download, X } from "lucide-react";
import { useState } from "react";
import { usePWAInstallContext } from "@/contexts/pwa-install-context";

const DISMISSED_KEY = "pwa-install-dismissed";

export function PWAInstallBanner() {
	const { canInstall, promptInstall } = usePWAInstallContext();
	const [dismissed, setDismissed] = useState(() => {
		if (typeof window === "undefined") return false;
		return window.localStorage.getItem(DISMISSED_KEY) === "true";
	});

	if (!canInstall || dismissed) return null;

	const handleDismiss = () => {
		window.localStorage.setItem(DISMISSED_KEY, "true");
		setDismissed(true);
	};

	return (
		<div className="bg-card/95 fixed right-0 bottom-0 left-0 z-50 flex items-center justify-between gap-3 border-t px-4 py-3 text-sm backdrop-blur-sm sm:right-4 sm:bottom-4 sm:left-auto sm:max-w-sm sm:rounded-xl sm:border">
			<div className="flex items-center gap-2">
				<Download className="text-primary h-4 w-4 shrink-0" />
				<span className="text-muted-foreground">Install ReadSync for offline reading</span>
			</div>
			<div className="flex shrink-0 items-center gap-2">
				<button
					type="button"
					onClick={promptInstall}
					className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
				>
					Install
				</button>
				<button
					type="button"
					onClick={handleDismiss}
					className="text-muted-foreground hover:bg-accent rounded-md p-1"
					aria-label="Dismiss"
				>
					<X className="h-4 w-4" />
				</button>
			</div>
		</div>
	);
}
