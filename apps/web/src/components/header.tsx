"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
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

	return (
		<header>
			<div className="flex items-center justify-between px-4 py-2">
				<nav className="flex gap-1">
					{NAV_LINKS.map(({ to, label }) => (
						<Link
							key={to}
							href={to as any}
							className={cn(
								"rounded-md px-3 py-1.5 font-medium text-sm transition-colors",
								pathname.startsWith(to)
									? "bg-accent text-accent-foreground"
									: "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
							)}
						>
							{label}
						</Link>
					))}
				</nav>
				<div className="flex items-center gap-2">
					<ModeToggle />
					<UserMenu />
				</div>
			</div>
			<Separator />
		</header>
	);
}
