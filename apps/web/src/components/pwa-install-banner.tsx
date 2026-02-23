"use client";

import { Download, Share2, X } from "lucide-react";
import { useState } from "react";
import { DISMISSED_KEY } from "@/hooks/use-pwa-install";
import { usePWAInstallContext } from "@/contexts/pwa-install-context";

export function PWAInstallBanner() {
	const { canInstall, promptInstall, isIOSInstallable } = usePWAInstallContext();
	const [dismissed, setDismissed] = useState(() => {
		if (typeof window === "undefined") return false;
		return window.localStorage.getItem(DISMISSED_KEY) === "true";
	});

	if (dismissed) return null;

	const handleDismiss = () => {
		window.localStorage.setItem(DISMISSED_KEY, "true");
		setDismissed(true);
	};

	if (isIOSInstallable) {
		return (
			<div className="bg-card/95 fixed right-0 bottom-0 left-0 z-50 border-t px-4 py-3 text-sm backdrop-blur-sm sm:right-4 sm:bottom-4 sm:left-auto sm:max-w-sm sm:rounded-xl sm:border">
				<div className="flex items-start justify-between gap-3">
					<div className="space-y-1">
						<div className="flex items-center gap-2">
							<Download className="text-primary h-4 w-4 shrink-0" />
							<span className="font-medium">Install ReadSync for offline reading</span>
						</div>
						<p className="text-muted-foreground flex items-center gap-1 pl-6 text-xs">
							Tap{" "}
							<Share2 className="inline h-3.5 w-3.5 shrink-0" aria-label="Share" />{" "}
							then <strong>Add to Home Screen</strong>
						</p>
					</div>
					<button
						type="button"
						onClick={handleDismiss}
						className="text-muted-foreground hover:bg-accent shrink-0 rounded-md p-1"
						aria-label="Dismiss"
					>
						<X className="h-4 w-4" />
					</button>
				</div>
			</div>
		);
	}

	if (!canInstall) return null;

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
