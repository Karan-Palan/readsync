import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download } from "lucide-react";

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import { clearOfflineDataForUser } from "@/lib/offline-db";
import { usePWAInstallContext } from "@/contexts/pwa-install-context";

import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";

export default function UserMenu() {
	const router = useRouter();
	const { data: session, isPending } = authClient.useSession();
	const { canInstall, promptInstall } = usePWAInstallContext();

	if (isPending) {
		return <Skeleton className="h-9 w-24" />;
	}

	if (!session) {
		return (
			<Link href="/login">
				<Button variant="outline">Sign In</Button>
			</Link>
		);
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger render={<Button variant="outline" />}>
				{session.user.name}
			</DropdownMenuTrigger>
			<DropdownMenuContent className="bg-card">
				<DropdownMenuGroup>
					<DropdownMenuLabel>My Account</DropdownMenuLabel>
					<DropdownMenuSeparator />
					<DropdownMenuItem>{session.user.email}</DropdownMenuItem>
					{canInstall && (
						<DropdownMenuItem onClick={promptInstall}>
							<Download className="mr-2 h-4 w-4" />
							Install App
						</DropdownMenuItem>
					)}
					<DropdownMenuItem
						variant="destructive"
						onClick={() => {
							const userId = session.user.id;
							authClient.signOut({
								fetchOptions: {
									onSuccess: () => {
										clearOfflineDataForUser(userId).catch(() => {});
										router.push("/");
									},
								},
							});
						}}
					>
						Sign Out
					</DropdownMenuItem>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
