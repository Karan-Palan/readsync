"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useEffect, useState } from "react";

import { PWAInstallContext } from "@/contexts/pwa-install-context";
import { usePWAInstall } from "@/hooks/use-pwa-install";
import { syncAll } from "@/lib/offline-sync";
import { trpcClient, queryClient } from "@/utils/trpc";
import { authClient } from "@/lib/auth-client";

import { PWAInstallBanner } from "./pwa-install-banner";
import { SyncIndicator } from "./sync-indicator";
import { ThemeProvider } from "./theme-provider";
import { Toaster } from "./ui/sonner";

function InnerProviders({ children }: { children: React.ReactNode }) {
	const { canInstall, promptInstall, isIOSInstallable } = usePWAInstall();
	const [isSyncing, setIsSyncing] = useState(false);
	const { data: session } = authClient.useSession();

	useEffect(() => {
		if (!session?.user?.id) return;
		const userId = session.user.id;

		async function runSync() {
			if (!navigator.onLine) return;
			setIsSyncing(true);
			try {
				await syncAll(trpcClient, userId);
			} finally {
				setIsSyncing(false);
			}
		}

		runSync();

		const handleOnline = () => runSync();
		window.addEventListener("online", handleOnline);
		return () => window.removeEventListener("online", handleOnline);
	}, [session?.user?.id]);

	return (
		<PWAInstallContext.Provider value={{ canInstall, promptInstall, isIOSInstallable }}>
			{children}
			<SyncIndicator isSyncing={isSyncing} />
			<PWAInstallBanner />
		</PWAInstallContext.Provider>
	);
}

export default function Providers({ children }: { children: React.ReactNode }) {
	return (
		<ThemeProvider attribute="class" defaultTheme="dark" disableTransitionOnChange>
			<QueryClientProvider client={queryClient}>
				<InnerProviders>{children}</InnerProviders>
				<ReactQueryDevtools />
			</QueryClientProvider>
			<Toaster richColors />
		</ThemeProvider>
	);
}
