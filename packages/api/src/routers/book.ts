import prisma from "@readsync/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { protectedProcedure, router } from "../index";

export const bookRouter = router({
	list: protectedProcedure.query(async ({ ctx }) => {
		return prisma.book.findMany({
			where: { userId: ctx.session.user.id },
			orderBy: { updatedAt: "desc" },
			include: { readingProgress: true },
		});
	}),

	get: protectedProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ ctx, input }) => {
			const book = await prisma.book.findUnique({
				where: { id: input.id },
				include: { readingProgress: true, highlights: true, chapters: true },
			});

			if (!book || book.userId !== ctx.session.user.id) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Book not found" });
			}

			return book;
		}),

	delete: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const book = await prisma.book.findUnique({
				where: { id: input.id },
			});

			if (!book || book.userId !== ctx.session.user.id) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Book not found" });
			}

			await prisma.book.delete({ where: { id: input.id } });
			return { success: true };
		}),

	saveProgress: protectedProcedure
		.input(
			z.object({
				bookId: z.string(),
				position: z.any(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			return prisma.readingProgress.upsert({
				where: {
					userId_bookId: {
						userId: ctx.session.user.id,
						bookId: input.bookId,
					},
				},
				update: { position: input.position },
				create: {
					userId: ctx.session.user.id,
					bookId: input.bookId,
					position: input.position,
				},
			});
		}),

	getProgress: protectedProcedure
		.input(z.object({ bookId: z.string() }))
		.query(async ({ ctx, input }) => {
			return prisma.readingProgress.findUnique({
				where: {
					userId_bookId: {
						userId: ctx.session.user.id,
						bookId: input.bookId,
					},
				},
			});
		}),

	updateCover: protectedProcedure
		.input(
			z.object({
				bookId: z.string(),
				coverUrl: z.string().max(200_000), // allow data URLs up to ~200KB
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const book = await prisma.book.findUnique({
				where: { id: input.bookId },
			});
			if (!book || book.userId !== ctx.session.user.id) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Book not found" });
			}
			await prisma.book.update({
				where: { id: input.bookId },
				data: { coverUrl: input.coverUrl },
			});
			return { success: true };
		}),
});
