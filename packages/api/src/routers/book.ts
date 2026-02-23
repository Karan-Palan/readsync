import prisma from "@readsync/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { protectedProcedure, router } from "../index";

export const bookRouter = router({
	list: protectedProcedure.query(async ({ ctx }) => {
		return prisma.book.findMany({
			where: { userId: ctx.session.user.id },
			orderBy: { updatedAt: "desc" },
			include: {
				readingProgress: true,
				summary: { select: { id: true } },
				_count: { select: { highlights: true } },
			},
		});
	}),

	get: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
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
				fraction: z.number().min(0).max(1).optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const existing = await prisma.readingProgress.findUnique({
				where: {
					userId_bookId: { userId: ctx.session.user.id, bookId: input.bookId },
				},
			});

			const currentFraction = input.fraction ?? 0;
			const highestFraction = (existing?.highestPosition as any)?.fraction ?? 0;
			// Advance highestPosition only when reader moves forward
			const newHighestPosition =
				currentFraction > highestFraction
					? input.position
					: (existing?.highestPosition ?? input.position);

			return prisma.readingProgress.upsert({
				where: {
					userId_bookId: { userId: ctx.session.user.id, bookId: input.bookId },
				},
				update: {
					position: input.position,
					highestPosition: newHighestPosition,
				},
				create: {
					userId: ctx.session.user.id,
					bookId: input.bookId,
					position: input.position,
					highestPosition: input.position,
				},
			});
		}),

	logSession: protectedProcedure
		.input(
			z.object({
				bookId: z.string(),
				minutesRead: z.number().int().min(0),
				pagesRead: z.number().int().min(0),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;
			// Truncate to start of today in UTC
			const today = new Date();
			today.setUTCHours(0, 0, 0, 0);
			return prisma.readingSession.upsert({
				where: { userId_bookId_date: { userId, bookId: input.bookId, date: today } },
				update: {
					minutesRead: { increment: input.minutesRead },
					pagesRead: { increment: input.pagesRead },
				},
				create: {
					userId,
					bookId: input.bookId,
					date: today,
					minutesRead: input.minutesRead,
					pagesRead: input.pagesRead,
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

	getSummary: protectedProcedure
		.input(z.object({ bookId: z.string() }))
		.query(async ({ ctx, input }) => {
			return prisma.bookSummary.findUnique({
				where: { bookId: input.bookId },
			});
		}),

	saveSummary: protectedProcedure
		.input(z.object({ bookId: z.string(), content: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const book = await prisma.book.findUnique({
				where: { id: input.bookId },
			});
			if (!book || book.userId !== ctx.session.user.id) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Book not found" });
			}
			return prisma.bookSummary.upsert({
				where: { bookId: input.bookId },
				update: { content: input.content },
				create: {
					userId: ctx.session.user.id,
					bookId: input.bookId,
					content: input.content,
				},
			});
		}),

	listSummaries: protectedProcedure.query(async ({ ctx }) => {
		return prisma.bookSummary.findMany({
			where: { userId: ctx.session.user.id },
			orderBy: { updatedAt: "desc" },
			include: {
				book: {
					select: { id: true, title: true, coverUrl: true, fileType: true },
				},
			},
		});
	}),
});
