"use client";

import { createContext, useContext } from "react";

interface PWAInstallContextValue {
	canInstall: boolean;
	promptInstall: () => void;
	isIOSInstallable: boolean;
}

export const PWAInstallContext = createContext<PWAInstallContextValue>({
	canInstall: false,
	promptInstall: () => {},
	isIOSInstallable: false,
});

export function usePWAInstallContext(): PWAInstallContextValue {
	return useContext(PWAInstallContext);
}
