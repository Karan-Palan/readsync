import prisma from "@readsync/db";
import { TRPCError } from "@trpc/server";

const AI_MONTHLY_CAP = Number.POSITIVE_INFINITY; // disabled – no limit

/**
 * Checks whether the user has exceeded the monthly AI usage cap.
 * Resets the counter if a new month has started.
 * Throws TOO_MANY_REQUESTS if the cap is exceeded.
 *
 * Call this BEFORE making an AI request.
 */
export async function enforceAiUsageCap(userId: string): Promise<void> {
	const user = await prisma.user.findUniqueOrThrow({
		where: { id: userId },
		select: { aiCallsThisMonth: true, aiUsageResetAt: true },
	});

	const now = new Date();
	let calls = user.aiCallsThisMonth;

	// Reset counter if we've crossed into a new month
	if (now > user.aiUsageResetAt) {
		const nextReset = new Date(now.getFullYear(), now.getMonth() + 1, 1);
		await prisma.user.update({
			where: { id: userId },
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
}

/**
 * Increments the AI usage counter for the user.
 * Call this AFTER a successful AI request.
 */
export async function incrementAiUsage(userId: string): Promise<void> {
	await prisma.user.update({
		where: { id: userId },
		data: { aiCallsThisMonth: { increment: 1 } },
	});
}
