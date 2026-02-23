"use client";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { cn } from "@/lib/utils";
import { OfflineIndicator } from "./offline-indicator";
import { ModeToggle } from "./mode-toggle";
import { Separator } from "./ui/separator";
import UserMenu from "./user-menu";

const NAV_LINKS = [
	{ to: "/library", label: "Library" },
	{ to: "/notes", label: "Notes" },
	{ to: "/summaries", label: "Summaries" },
	{ to: "/dashboard", label: "Dashboard" },
] as const;

export default function Header() {
	const pathname = usePathname();
	const [mobileOpen, setMobileOpen] = useState(false);

	return (
		<header>
			<div className="flex items-center justify-between px-4 py-2">
				{/* Desktop nav */}
				<nav className="hidden items-center gap-1 md:flex">
					{NAV_LINKS.map(({ to, label }) => (
						<Link
							key={to}
							href={to as any}
							className={cn(
								"rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
								pathname.startsWith(to)
									? "bg-accent text-accent-foreground"
									: "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
							)}
						>
							{label}
						</Link>
					))}
				</nav>

				{/* Mobile hamburger */}
				<button
					type="button"
					className="text-muted-foreground hover:bg-accent rounded-md p-1.5 md:hidden"
					onClick={() => setMobileOpen((v) => !v)}
					aria-label="Toggle menu"
				>
					{mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
				</button>

				<div className="flex items-center gap-2">
					<OfflineIndicator />
					<ModeToggle />
					<UserMenu />
				</div>
			</div>

			{/* Mobile dropdown nav */}
			{mobileOpen && (
				<nav className="flex flex-col border-t px-4 py-2 md:hidden">
					{NAV_LINKS.map(({ to, label }) => (
						<Link
							key={to}
							href={to as any}
							onClick={() => setMobileOpen(false)}
							className={cn(
								"rounded-md px-3 py-2 text-sm font-medium transition-colors",
								pathname.startsWith(to)
									? "bg-accent text-accent-foreground"
									: "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
							)}
						>
							{label}
						</Link>
					))}
				</nav>
			)}

			<Separator />
		</header>
	);
}
