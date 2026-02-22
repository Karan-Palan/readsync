import prisma from "@readsync/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { protectedProcedure, router } from "../index";

export const highlightRouter = router({
	create: protectedProcedure
		.input(
			z.object({
				bookId: z.string(),
				text: z.string(),
				color: z.string().default("yellow"),
				startCfi: z.string().optional(),
				endCfi: z.string().optional(),
				pageNumber: z.number().int().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			return prisma.highlight.create({
				data: {
					userId: ctx.session.user.id,
					bookId: input.bookId,
					text: input.text,
					color: input.color,
					startCfi: input.startCfi,
					endCfi: input.endCfi,
					pageNumber: input.pageNumber,
				},
			});
		}),

	update: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				color: z.string().optional(),
				note: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const highlight = await prisma.highlight.findUnique({ where: { id: input.id } });
			if (!highlight || highlight.userId !== ctx.session.user.id) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Highlight not found" });
			}
			return prisma.highlight.update({
				where: { id: input.id },
				data: {
					...(input.color !== undefined && { color: input.color }),
					...(input.note !== undefined && { note: input.note }),
				},
			});
		}),

	list: protectedProcedure.input(z.object({ bookId: z.string() })).query(async ({ ctx, input }) => {
		const book = await prisma.book.findUnique({ where: { id: input.bookId } });
		if (!book || book.userId !== ctx.session.user.id) {
			throw new TRPCError({ code: "NOT_FOUND", message: "Book not found" });
		}
		return prisma.highlight.findMany({
			where: { bookId: input.bookId, userId: ctx.session.user.id },
			orderBy: { createdAt: "desc" },
		});
	}),

	/** All highlights for the current user across all books */
	listAll: protectedProcedure.query(async ({ ctx }) => {
		return prisma.highlight.findMany({
			where: { userId: ctx.session.user.id },
			orderBy: { createdAt: "desc" },
			include: { book: { select: { id: true, title: true, fileType: true } } },
		});
	}),

	delete: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const highlight = await prisma.highlight.findUnique({ where: { id: input.id } });
			if (!highlight || highlight.userId !== ctx.session.user.id) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Highlight not found" });
			}
			await prisma.highlight.delete({ where: { id: input.id } });
			return { success: true };
		}),
});
