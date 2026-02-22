import { openai } from "@ai-sdk/openai";
import prisma from "@readsync/db";
import { TRPCError } from "@trpc/server";
import { generateText } from "ai";
import { z } from "zod";

import { protectedProcedure, router } from "../index";

const ACTION_PROMPTS = {
	EXPLAIN:
		"You are a helpful reading assistant. Explain the following passage clearly and concisely, making it easy for the reader to understand the key concepts, context, and meaning.",
	SUMMARIZE:
		"You are a helpful reading assistant. Summarize the following passage in a few clear, concise sentences that capture the main ideas.",
	EXTRACT:
		"You are a helpful reading assistant. Extract the key insights, facts, and takeaways from the following passage. Present them as a concise bullet-point list.",
} as const;

const AI_MONTHLY_CAP = 100;

export const aiRouter = router({
	query: protectedProcedure
		.input(
			z.object({
				highlightId: z.string(),
				action: z.enum(["EXPLAIN", "SUMMARIZE", "EXTRACT"]),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// monthly AI usage cap
			const user = await prisma.user.findUniqueOrThrow({
				where: { id: ctx.session.user.id },
				select: { aiCallsThisMonth: true, aiUsageResetAt: true },
			});

			const now = new Date();
			let calls = user.aiCallsThisMonth;

			// Reset counter if we've crossed into a new month
			if (now > user.aiUsageResetAt) {
				const nextReset = new Date(now.getFullYear(), now.getMonth() + 1, 1);
				await prisma.user.update({
					where: { id: ctx.session.user.id },
					data: { aiCallsThisMonth: 0, aiUsageResetAt: nextReset },
				});
				calls = 0;
			}

			if (calls >= AI_MONTHLY_CAP) {
				throw new TRPCError({
					code: "TOO_MANY_REQUESTS",
					message: `You have reached the monthly limit of ${AI_MONTHLY_CAP} AI requests. Your usage resets on the 1st of next month.`,
				});
			}

			const highlight = await prisma.highlight.findUnique({
				where: { id: input.highlightId },
			});

			if (!highlight || highlight.userId !== ctx.session.user.id) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Highlight not found",
				});
			}

			const systemPrompt = ACTION_PROMPTS[input.action];

			const { text } = await generateText({
				model: openai("gpt-4o-mini"),
				system: systemPrompt,
				prompt: highlight.text,
			});

			await prisma.highlight.update({
				where: { id: input.highlightId },
				data: {
					aiAction: input.action,
					aiResponse: text,
				},
			});

			// Increment usage counter
			// TODO: provide option to add user their own api key
			await prisma.user.update({
				where: { id: ctx.session.user.id },
				data: { aiCallsThisMonth: { increment: 1 } },
			});

			return { response: text };
		}),

	/**
	 * Quick AI query works on arbitrary text, no saved highlight required.
	 * Used by the WebView reader's top-bar AI button.
	 */
	quickQuery: protectedProcedure
		.input(
			z.object({
				text: z.string().min(10).max(4000),
				action: z.enum(["EXPLAIN", "SUMMARIZE", "EXTRACT"]),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// --- Same monthly cap logic ---
			const user = await prisma.user.findUniqueOrThrow({
				where: { id: ctx.session.user.id },
				select: { aiCallsThisMonth: true, aiUsageResetAt: true },
			});

			const now = new Date();
			let calls = user.aiCallsThisMonth;

			if (now > user.aiUsageResetAt) {
				const nextReset = new Date(now.getFullYear(), now.getMonth() + 1, 1);
				await prisma.user.update({
					where: { id: ctx.session.user.id },
					data: { aiCallsThisMonth: 0, aiUsageResetAt: nextReset },
				});
				calls = 0;
			}

			if (calls >= AI_MONTHLY_CAP) {
				throw new TRPCError({
					code: "TOO_MANY_REQUESTS",
					message: `You have reached the monthly limit of ${AI_MONTHLY_CAP} AI requests. Your usage resets on the 1st of next month.`,
				});
			}

			const systemPrompt = ACTION_PROMPTS[input.action];

			const { text } = await generateText({
				model: openai("gpt-4o-mini"),
				system: systemPrompt,
				prompt: input.text,
			});

			await prisma.user.update({
				where: { id: ctx.session.user.id },
				data: { aiCallsThisMonth: { increment: 1 } },
			});

			return { response: text };
		}),
});
