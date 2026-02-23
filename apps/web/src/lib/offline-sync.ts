/**
 * Offline sync manager — reconciles IndexedDB pending records with the server.
 * Runs on reconnect and on provider mount when online.
 */

import type { TRPCClient } from "@trpc/client";
import type { AppRouter } from "@readsync/api/routers/index";
import {
	deleteHighlightFromDB,
	getHighlightsBySyncStatus,
	getPendingProgress,
	putHighlight,
	putProgress,
} from "./offline-db";

let syncLock = false;

//  Highlights

async function syncHighlights(trpcClient: TRPCClient<AppRouter>, _userId: string) {
	// Sync pending creates
	const pendingCreate = await getHighlightsBySyncStatus("pending_create");
	for (const h of pendingCreate) {
		try {
			const result = await trpcClient.highlight.create.mutate({
				bookId: h.bookId,
				text: h.text,
				color: h.color,
				pageNumber: h.pageNumber ?? undefined,
				startCfi: h.startCfi ?? undefined,
			});
			// Replace tempId record with real server record
			await deleteHighlightFromDB(h.id);
			await putHighlight({
				...h,
				id: result.id,
				syncStatus: "synced",
				tempId: null,
			});
		} catch {
			// Leave as pending for next sync attempt
		}
	}

	// Sync pending deletes
	const pendingDelete = await getHighlightsBySyncStatus("pending_delete");
	for (const h of pendingDelete) {
		try {
			// Only call delete on real server IDs (not temp IDs)
			if (!h.tempId) {
				await trpcClient.highlight.delete.mutate({ id: h.id });
			}
			await deleteHighlightFromDB(h.id);
		} catch {
			// Leave as pending
		}
	}
}

//  Progress 

async function syncProgress(trpcClient: TRPCClient<AppRouter>, _userId: string) {
	const pending = await getPendingProgress();
	for (const p of pending) {
		try {
			const fraction =
				p.position && typeof p.position === "object" && "fraction" in p.position
					? ((p.position as { fraction: number }).fraction ?? 0)
					: 0;
			await trpcClient.book.saveProgress.mutate({
				bookId: p.bookId,
				position: p.position,
				fraction,
			});
			await putProgress({ ...p, synced: true });
		} catch {
			// Leave as pending
		}
	}
}

//  Public API 

export async function syncAll(trpcClient: TRPCClient<AppRouter>, userId: string): Promise<void> {
	if (syncLock) return;
	if (typeof navigator !== "undefined" && !navigator.onLine) return;

	syncLock = true;
	try {
		await Promise.all([syncHighlights(trpcClient, userId), syncProgress(trpcClient, userId)]);
	} finally {
		syncLock = false;
	}
}
