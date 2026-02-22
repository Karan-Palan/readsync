import type { Metadata } from "next";

import "../index.css";
import Providers from "@/components/providers";

export const metadata: Metadata = {
	title: "readsync",
	description: "readsync",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<link rel="preconnect" href="https://fonts.googleapis.com" />
				<link
					rel="preconnect"
					href="https://fonts.gstatic.com"
					crossOrigin="anonymous"
				/>
				<link
					href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=IBM+Plex+Mono:wght@400;500&family=Literata:ital,opsz,wght@0,7..72,200..900;1,7..72,200..900&display=swap"
					rel="stylesheet"
				/>
			</head>
			<body className="antialiased">
				<Providers>{children}</Providers>
			</body>
		</html>
	);
}
