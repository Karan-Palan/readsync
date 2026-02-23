import prisma from "@readsync/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { protectedProcedure, router } from "../index";

export const chapterRouter = router({
	create: protectedProcedure
		.input(
			z.object({
				bookId: z.string(),
				name: z.string(),
				startPage: z.number().int(),
				endPage: z.number().int(),
				order: z.number().int(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			return prisma.chapter.create({
				data: {
					userId: ctx.session.user.id,
					bookId: input.bookId,
					name: input.name,
					startPage: input.startPage,
					endPage: input.endPage,
					order: input.order,
				},
			});
		}),

	list: protectedProcedure
		.input(z.object({ bookId: z.string() }))
		.query(async ({ ctx, input }) => {
			const book = await prisma.book.findUnique({
				where: { id: input.bookId },
			});

			if (!book || book.userId !== ctx.session.user.id) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Book not found" });
			}

			return prisma.chapter.findMany({
				where: { bookId: input.bookId, userId: ctx.session.user.id },
				orderBy: { order: "asc" },
			});
		}),

	update: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				name: z.string().optional(),
				startPage: z.number().int().optional(),
				endPage: z.number().int().optional(),
				order: z.number().int().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const chapter = await prisma.chapter.findUnique({
				where: { id: input.id },
			});

			if (!chapter || chapter.userId !== ctx.session.user.id) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Chapter not found",
				});
			}

			return prisma.chapter.update({
				where: { id: input.id },
				data: {
					name: input.name,
					startPage: input.startPage,
					endPage: input.endPage,
					order: input.order,
				},
			});
		}),

	delete: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const chapter = await prisma.chapter.findUnique({
				where: { id: input.id },
			});

			if (!chapter || chapter.userId !== ctx.session.user.id) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Chapter not found",
				});
			}

			await prisma.chapter.delete({ where: { id: input.id } });
			return { success: true };
		}),
});
