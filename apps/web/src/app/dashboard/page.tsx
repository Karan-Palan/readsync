import { auth } from "@readsync/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import DashboardView from "./dashboard-view";

export default async function DashboardPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user) {
		redirect("/login");
	}

	return <DashboardView userName={session.user.name} />;
}
