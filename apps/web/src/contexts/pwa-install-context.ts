"use client";

import { createContext, useContext } from "react";

interface PWAInstallContextValue {
	canInstall: boolean;
	promptInstall: () => void;
}

export const PWAInstallContext = createContext<PWAInstallContextValue>({
	canInstall: false,
	promptInstall: () => {},
});

export function usePWAInstallContext(): PWAInstallContextValue {
	return useContext(PWAInstallContext);
}
