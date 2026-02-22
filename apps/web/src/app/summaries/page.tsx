import { auth } from "@readsync/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import Summaries from "./summaries";

export default async function SummariesPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user) {
		redirect("/login");
	}

	return <Summaries />;
}
