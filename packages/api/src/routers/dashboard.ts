import prisma from "@readsync/db";
import { z } from "zod";

import { protectedProcedure, router } from "../index";

export const dashboardRouter = router({
	// Overview stats: total books, books finished, highlights, AI usage breakdown, streak, etc.
	stats: protectedProcedure.query(async ({ ctx }) => {
		const userId = ctx.session.user.id;
		const now = new Date();
		const currentYear = now.getFullYear();

		// Book counts
		const totalBooks = await prisma.book.count({ where: { userId } });

		// A book is "finished" when highestPosition fraction >= 0.90
		const allProgress = await prisma.readingProgress.findMany({
			where: { userId },
			select: { bookId: true, highestPosition: true, updatedAt: true },
		});
		const finishedBooks = allProgress.filter((p) => {
			const fraction = (p.highestPosition as any)?.fraction;
			return typeof fraction === "number" && fraction >= 0.90;
		});
		const booksFinished = finishedBooks.length;

		// Books finished this year
		const booksFinishedThisYear = finishedBooks.filter(
			(p) => p.updatedAt.getFullYear() === currentYear,
		).length;

		// Currently reading (has progress but not finished)
		const currentlyReading = allProgress.filter((p) => {
			const fraction = (p.highestPosition as any)?.fraction;
			return typeof fraction === "number" && fraction < 0.95 && fraction > 0;
		}).length;

		// Highlights count
		const totalHighlights = await prisma.highlight.count({ where: { userId } });

		// AI feature usage breakdown
		const aiUsage = await prisma.highlight.groupBy({
			by: ["aiAction"],
			where: { userId, aiAction: { not: null } },
			_count: true,
		});
		const aiFeatureUsage: Record<string, number> = {};
		for (const row of aiUsage) {
			if (row.aiAction) {
				aiFeatureUsage[row.aiAction] = row._count;
			}
		}

		// Total AI calls this month (from user model)
		const user = await prisma.user.findUniqueOrThrow({
			where: { id: userId },
			select: { aiCallsThisMonth: true, createdAt: true },
		});

		// Book summaries generated
		const summariesGenerated = await prisma.bookSummary.count({ where: { userId } });

		// Reading streak (consecutive days with reading progress updates)
		const progressDates = await prisma.readingProgress.findMany({
			where: { userId },
			select: { updatedAt: true },
			orderBy: { updatedAt: "desc" },
		});

		const streak = calculateStreak(progressDates.map((p) => p.updatedAt));

		// Projected books per year
		const accountCreated = user.createdAt;
		const daysSinceSignup = Math.max(
			1,
			Math.floor((now.getTime() - accountCreated.getTime()) / (1000 * 60 * 60 * 24)),
		);
		const booksPerDay = booksFinished / daysSinceSignup;
		const projectedBooksPerYear = Math.round(booksPerDay * 365);

		// Reading goal
		const readingGoal = await prisma.readingGoal.findUnique({
			where: { userId_year: { userId, year: currentYear } },
		});

		return {
			totalBooks,
			booksFinished,
			booksFinishedThisYear,
			currentlyReading,
			totalHighlights,
			aiFeatureUsage,
			aiCallsThisMonth: user.aiCallsThisMonth,
			summariesGenerated,
			streak,
			projectedBooksPerYear,
			readingGoal: readingGoal
				? { targetBooks: readingGoal.targetBooks, year: readingGoal.year }
				: null,
			currentYear,
		};
	}),

	// Set or update the yearly reading goal
	setGoal: protectedProcedure
		.input(
			z.object({
				targetBooks: z.number().int().min(1).max(365),
				year: z.number().int().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;
			const year = input.year ?? new Date().getFullYear();

			return prisma.readingGoal.upsert({
				where: { userId_year: { userId, year } },
				update: { targetBooks: input.targetBooks },
				create: { userId, year, targetBooks: input.targetBooks },
			});
		}),
});

// Calculate the current reading streak in consecutive days.
function calculateStreak(dates: Date[]): number {
	if (dates.length === 0) return 0;

	// Deduplicate to unique days (in local timezone)
	const uniqueDays = new Set<string>();
	for (const d of dates) {
		uniqueDays.add(d.toISOString().slice(0, 10));
	}

	const sorted = Array.from(uniqueDays).sort().reverse(); // newest first
	const today = new Date().toISOString().slice(0, 10);
	const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

	// Streak must include today or yesterday
	if (sorted[0] !== today && sorted[0] !== yesterday) return 0;

	let streak = 1;
	for (let i = 1; i < sorted.length; i++) {
		const prev = new Date(sorted[i - 1]!);
		const curr = new Date(sorted[i]!);
		const diffDays = Math.round((prev.getTime() - curr.getTime()) / 86400000);
		if (diffDays === 1) {
			streak++;
		} else {
			break;
		}
	}

	return streak;
}
