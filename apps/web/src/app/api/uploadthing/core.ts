import { auth } from "@readsync/auth";
import prisma from "@readsync/db";
import { headers } from "next/headers";
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";

const f = createUploadthing();

export const ourFileRouter = {
	bookUploader: f({
		pdf: { maxFileSize: "64MB", maxFileCount: 1 },
		"application/epub+zip": { maxFileSize: "64MB", maxFileCount: 1 },
	})
		.middleware(async () => {
			const session = await auth.api.getSession({
				headers: await headers(),
			});

			if (!session?.user) {
				throw new UploadThingError("Unauthorized");
			}

			return { userId: session.user.id };
		})
		.onUploadComplete(async ({ metadata, file }) => {
			const fileType = file.name.toLowerCase().endsWith(".epub") ? "EPUB" : "PDF";

			const title = file.name.replace(/\.(pdf|epub)$/i, "").trim();

			await prisma.book.create({
				data: {
					userId: metadata.userId,
					title,
					fileName: file.name,
					fileUrl: file.ufsUrl,
					fileType,
				},
			});

			return { uploadedBy: metadata.userId };
		}),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
