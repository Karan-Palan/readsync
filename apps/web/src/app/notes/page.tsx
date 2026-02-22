import { auth } from "@readsync/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import Notes from "./notes";

export default async function NotesPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user) {
		redirect("/login");
	}

	return <Notes />;
}
