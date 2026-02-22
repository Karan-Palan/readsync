import { createOpenAI } from "@ai-sdk/openai";
import prisma from "@readsync/db";
import { TRPCError } from "@trpc/server";
import { generateText } from "ai";
import { z } from "zod";

import { protectedProcedure, router } from "../index";

// Groq via OpenAI-compatible endpoint
const groq = createOpenAI({
	baseURL: "https://api.groq.com/openai/v1",
	apiKey: process.env.GROQ_API_KEY,
});

const SUMMARY_MODEL = groq("openai/gpt-oss-120b");     // heavy model for book summaries
const GENERAL_MODEL = groq("openai/gpt-oss-20b");       // lighter model for everything else

const ACTION_PROMPTS = {
	EXPLAIN:
		"You are a helpful reading assistant. Explain the following passage clearly and concisely, making it easy for the reader to understand the key concepts, context, and meaning.",
	SUMMARIZE:
		"You are a helpful reading assistant. Summarize the following passage in a few clear, concise sentences that capture the main ideas.",
	EXTRACT:
		"You are a helpful reading assistant. Extract the key insights, facts, and takeaways from the following passage. Present them as a concise bullet-point list.",
	DISCUSS:
		"You are a thoughtful reading discussion partner. The reader wants to explore this idea deeper. Provide context, different perspectives, philosophical implications, and thought-provoking questions to expand on this passage.",
} as const;

const AI_MONTHLY_CAP = Number.POSITIVE_INFINITY; // disabled – no limit

export const aiRouter = router({
	query: protectedProcedure
		.input(
			z.object({
				highlightId: z.string(),
				action: z.enum(["EXPLAIN", "SUMMARIZE", "EXTRACT", "DISCUSS"]),
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
				model: GENERAL_MODEL,
				system: systemPrompt,
				prompt: highlight.text,
				temperature: 1,
				topP: 1,
				maxOutputTokens: 4096,
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
					action: z.enum(["EXPLAIN", "SUMMARIZE", "EXTRACT", "DISCUSS"]),
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
				model: GENERAL_MODEL,
				system: systemPrompt,
				prompt: input.text,
				temperature: 1,
				topP: 1,
				maxOutputTokens: 4096,
			});

			await prisma.user.update({
				where: { id: ctx.session.user.id },
				data: { aiCallsThisMonth: { increment: 1 } },
			});

			return { response: text };
		}),

	/** Generate an AI summary of the full book (based on extracted text excerpt). */
	summarizeBook: protectedProcedure
		.input(
			z.object({
				bookId: z.string(),
				bookTitle: z.string(),
				text: z.string().min(10).max(8000),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Monthly cap check
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
					message: `Monthly AI limit of ${AI_MONTHLY_CAP} reached. Resets 1st of next month.`,
				});
			}

			const { text } = await generateText({
				model: SUMMARY_MODEL,
				system:
					"You are a literary assistant. Write a comprehensive, well-structured book summary including: the main thesis/purpose, key topics covered, major arguments or ideas, and why this book is valuable. Format your response in Markdown with clear headings.",
				prompt: `Book title: "${input.bookTitle}"\n\nContent excerpt:\n${input.text}`,
				temperature: 1,
				topP: 1,
				maxOutputTokens: 8192,
			});

			// Save summary to DB
			await prisma.bookSummary.upsert({
				where: { bookId: input.bookId },
				update: { content: text },
				create: { userId: ctx.session.user.id, bookId: input.bookId, content: text },
			});

			await prisma.user.update({
				where: { id: ctx.session.user.id },
				data: { aiCallsThisMonth: { increment: 1 } },
			});

			return { response: text };
		}),
});
