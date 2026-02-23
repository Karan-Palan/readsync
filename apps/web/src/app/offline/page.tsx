"use client";

import Link from "next/link";
import { WifiOff } from "lucide-react";

export default function OfflinePage() {
	return (
		<div className="flex min-h-svh flex-col items-center justify-center gap-6 px-4 text-center">
			<WifiOff className="text-muted-foreground h-16 w-16" />
			<div className="space-y-2">
				<h1 className="text-2xl font-semibold">You&apos;re offline</h1>
				<p className="text-muted-foreground max-w-sm">
					No internet connection. Books you&apos;ve opened before are still available in your
					library.
				</p>
			</div>
			<Link
				href="/library"
				className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-6 py-2 text-sm font-medium transition-colors"
			>
				Go to Library
			</Link>
		</div>
	);
}
