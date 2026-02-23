"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const DISMISSED_KEY = "pwa-install-dismissed";

interface BeforeInstallPromptEvent extends Event {
	prompt: () => Promise<void>;
	userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function detectIOSInstallable(): boolean {
	if (typeof window === "undefined") return false;
	if (window.localStorage.getItem(DISMISSED_KEY) === "true") return false;
	if ((window.navigator as unknown as { standalone?: boolean }).standalone === true) return false;

	const ua = navigator.userAgent;
	const isIOS =
		/iPad|iPhone|iPod/.test(ua) ||
		(navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
	if (!isIOS) return false;

	// Must be Safari — not Chrome/Firefox/Opera on iOS
	const isSafari =
		/Safari/.test(ua) && !/CriOS|FxiOS|OPiOS/.test(ua);
	return isSafari;
}

export function usePWAInstall(): {
	canInstall: boolean;
	promptInstall: () => void;
	isIOSInstallable: boolean;
} {
	const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);
	const [canInstall, setCanInstall] = useState(false);
	const [isIOSInstallable, setIsIOSInstallable] = useState(false);

	useEffect(() => {
		setIsIOSInstallable(detectIOSInstallable());
	}, []);

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

	return { canInstall, promptInstall, isIOSInstallable };
}
