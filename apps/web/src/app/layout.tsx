import type { Metadata, Viewport } from "next";

import "../index.css";
import { SerwistProvider } from "./serwist";
import Providers from "@/components/providers";

export const metadata: Metadata = {
	title: "ReadSync",
	description: "AI-powered reading companion",
	applicationName: "ReadSync",
	appleWebApp: {
		capable: true,
		statusBarStyle: "black-translucent",
		title: "ReadSync",
	},
	formatDetection: { telephone: false },
	manifest: "/manifest.json",
};

export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
	viewportFit: "cover",
	themeColor: "#1a1a18",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<link rel="apple-touch-icon" href="/plain-logo.png" />
				<link rel="preconnect" href="https://fonts.googleapis.com" />
				<link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
				<link
					href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=IBM+Plex+Mono:wght@400;500&family=Literata:ital,opsz,wght@0,7..72,200..900;1,7..72,200..900&display=swap"
					rel="stylesheet"
				/>
			</head>
			<body className="min-h-svh antialiased">
				<SerwistProvider swUrl="/serwist/sw.js">
					<Providers>{children}</Providers>
				</SerwistProvider>
			</body>
		</html>
	);
}
