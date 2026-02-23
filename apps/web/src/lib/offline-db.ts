// IndexedDB layer for offline reading support.

const DB_NAME = "readsync-offline";
const DB_VERSION = 1;

export type SyncStatus = "synced" | "pending_create" | "pending_delete";

export interface OfflineBook {
	id: string;
	userId: string;
	title: string;
	fileUrl: string;
	fileType: string;
	coverUrl?: string | null;
	totalPages?: number | null;
	cachedAt: number;
}

export interface OfflineHighlight {
	id: string;
	bookId: string;
	userId: string;
	text: string;
	color: string;
	startCfi?: string | null;
	endCfi?: string | null;
	pageNumber?: number | null;
	aiAction?: string | null;
	aiResponse?: string | null;
	note?: string | null;
	createdAt: number;
	syncStatus: SyncStatus;
	tempId?: string | null;
}

export interface OfflineProgress {
	userId: string;
	bookId: string;
	position: unknown;
	highestPosition: unknown;
	updatedAt: number;
	synced: boolean;
}

function openDB(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const req = indexedDB.open(DB_NAME, DB_VERSION);

		req.onupgradeneeded = (e) => {
			const db = (e.target as IDBOpenDBRequest).result;

			if (!db.objectStoreNames.contains("books")) {
				db.createObjectStore("books", { keyPath: "id" });
			}

			if (!db.objectStoreNames.contains("highlights")) {
				const hs = db.createObjectStore("highlights", { keyPath: "id" });
				hs.createIndex("bookId", "bookId", { unique: false });
				hs.createIndex("syncStatus", "syncStatus", { unique: false });
			}

			if (!db.objectStoreNames.contains("reading_progress")) {
				db.createObjectStore("reading_progress", {
					keyPath: ["userId", "bookId"],
				});
			}
		};

		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
}

function tx<T>(
	db: IDBDatabase,
	stores: string | string[],
	mode: IDBTransactionMode,
	fn: (t: IDBTransaction) => IDBRequest<T>,
): Promise<T> {
	return new Promise((resolve, reject) => {
		const t = db.transaction(stores, mode);
		const req = fn(t);
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
}

//  Books

export async function getBook(id: string): Promise<OfflineBook | undefined> {
	const db = await openDB();
	return tx<OfflineBook | undefined>(db, "books", "readonly", (t) =>
		t.objectStore("books").get(id),
	);
}

export async function putBook(book: OfflineBook): Promise<void> {
	const db = await openDB();
	await tx<IDBValidKey>(db, "books", "readwrite", (t) => t.objectStore("books").put(book));
}

//  Highlights 

export async function getHighlights(bookId: string): Promise<OfflineHighlight[]> {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const t = db.transaction("highlights", "readonly");
		const index = t.objectStore("highlights").index("bookId");
		const req = index.getAll(bookId);
		req.onsuccess = () =>
			resolve((req.result as OfflineHighlight[]).filter((h) => h.syncStatus !== "pending_delete"));
		req.onerror = () => reject(req.error);
	});
}

export async function getHighlightsBySyncStatus(status: SyncStatus): Promise<OfflineHighlight[]> {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const t = db.transaction("highlights", "readonly");
		const index = t.objectStore("highlights").index("syncStatus");
		const req = index.getAll(status);
		req.onsuccess = () => resolve(req.result as OfflineHighlight[]);
		req.onerror = () => reject(req.error);
	});
}

export async function putHighlight(highlight: OfflineHighlight): Promise<void> {
	const db = await openDB();
	await tx<IDBValidKey>(db, "highlights", "readwrite", (t) =>
		t.objectStore("highlights").put(highlight),
	);
}

export async function deleteHighlightFromDB(id: string): Promise<void> {
	const db = await openDB();
	await tx<undefined>(db, "highlights", "readwrite", (t) => t.objectStore("highlights").delete(id));
}

//  Progress

export async function getProgress(
	userId: string,
	bookId: string,
): Promise<OfflineProgress | undefined> {
	const db = await openDB();
	return tx<OfflineProgress | undefined>(db, "reading_progress", "readonly", (t) =>
		t.objectStore("reading_progress").get([userId, bookId]),
	);
}

export async function putProgress(progress: OfflineProgress): Promise<void> {
	const db = await openDB();
	await tx<IDBValidKey>(db, "reading_progress", "readwrite", (t) =>
		t.objectStore("reading_progress").put(progress),
	);
}

export async function getPendingProgress(): Promise<OfflineProgress[]> {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const t = db.transaction("reading_progress", "readonly");
		const req = t.objectStore("reading_progress").getAll();
		req.onsuccess = () => resolve((req.result as OfflineProgress[]).filter((p) => !p.synced));
		req.onerror = () => reject(req.error);
	});
}

//  Cleanup 

export async function clearOfflineDataForUser(userId: string): Promise<void> {
	const db = await openDB();

	// Clear highlights for user
	await new Promise<void>((resolve, reject) => {
		const t = db.transaction("highlights", "readwrite");
		const store = t.objectStore("highlights");
		const req = store.getAll();
		req.onsuccess = () => {
			const highlights = req.result as OfflineHighlight[];
			for (const h of highlights) {
				if (h.userId === userId) {
					store.delete(h.id);
				}
			}
			t.oncomplete = () => resolve();
			t.onerror = () => reject(t.error);
		};
		req.onerror = () => reject(req.error);
	});

	// Clear progress for user
	await new Promise<void>((resolve, reject) => {
		const t = db.transaction("reading_progress", "readwrite");
		const store = t.objectStore("reading_progress");
		const req = store.getAll();
		req.onsuccess = () => {
			const records = req.result as OfflineProgress[];
			for (const r of records) {
				if (r.userId === userId) {
					store.delete([r.userId, r.bookId]);
				}
			}
			t.oncomplete = () => resolve();
			t.onerror = () => reject(t.error);
		};
		req.onerror = () => reject(req.error);
	});
}
