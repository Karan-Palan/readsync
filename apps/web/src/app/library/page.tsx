import { auth } from "@readsync/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import Library from "./library";

export default async function LibraryPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user) {
		redirect("/login");
	}

	return <Library />;
}
