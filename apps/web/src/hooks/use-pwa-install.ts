"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const DISMISSED_KEY = "pwa-install-dismissed";

interface BeforeInstallPromptEvent extends Event {
	prompt: () => Promise<void>;
	userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function usePWAInstall(): {
	canInstall: boolean;
	promptInstall: () => void;
} {
	const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);
	const [canInstall, setCanInstall] = useState(false);

	useEffect(() => {
		const dismissed =
			typeof window !== "undefined" && window.localStorage.getItem(DISMISSED_KEY) === "true";

		if (dismissed) return;

		const handler = (e: Event) => {
			e.preventDefault();
			deferredPrompt.current = e as BeforeInstallPromptEvent;
			setCanInstall(true);
		};

		window.addEventListener("beforeinstallprompt", handler);
		return () => window.removeEventListener("beforeinstallprompt", handler);
	}, []);

	const promptInstall = useCallback(async () => {
		if (!deferredPrompt.current) return;
		await deferredPrompt.current.prompt();
		const { outcome } = await deferredPrompt.current.userChoice;
		if (outcome === "accepted" || outcome === "dismissed") {
			deferredPrompt.current = null;
			setCanInstall(false);
			if (outcome === "dismissed") {
				window.localStorage.setItem(DISMISSED_KEY, "true");
			}
		}
	}, []);

	return { canInstall, promptInstall };
}
