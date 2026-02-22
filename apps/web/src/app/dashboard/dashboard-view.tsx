"use client";
//TODO componentize
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
	BookOpen,
	BookCheck,
	Bookmark,
	Brain,
	Flame,
	TrendingUp,
	Target,
	Sparkles,
	MessageSquare,
	FileText,
	Search,
	BookOpenCheck,
} from "lucide-react";
import { useState } from "react";

import Loader from "@/components/loader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/utils/trpc";

const AI_ACTION_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
	EXPLAIN: { label: "Explain", icon: <Search className="h-4 w-4" /> },
	SUMMARIZE: { label: "Summarize", icon: <FileText className="h-4 w-4" /> },
	EXTRACT: { label: "Extract", icon: <Sparkles className="h-4 w-4" /> },
	DISCUSS: { label: "Discuss", icon: <MessageSquare className="h-4 w-4" /> },
};

export default function DashboardView({ userName }: { userName: string }) {
	const queryClient = useQueryClient();
	const { data, isLoading } = useQuery(trpc.dashboard.stats.queryOptions());
	const [goalInput, setGoalInput] = useState("");
	const [isEditingGoal, setIsEditingGoal] = useState(false);

	const setGoalMutation = useMutation(
		trpc.dashboard.setGoal.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: trpc.dashboard.stats.queryOptions().queryKey });
				setIsEditingGoal(false);
				setGoalInput("");
			},
		}),
	);

	if (isLoading || !data) {
		return <Loader size="h-8 w-8" label="Loading dashboard..." />;
	}

	const goalTarget = data.readingGoal?.targetBooks ?? 0;
	const goalProgress = goalTarget > 0 ? Math.min(100, (data.booksFinishedThisYear / goalTarget) * 100) : 0;

	return (
		<div className="mx-auto w-full max-w-6xl space-y-6 p-4 md:p-6">
			{/* Header */}
			<div>
				<h1 className="text-xl font-semibold">Dashboard</h1>
				<p className="text-muted-foreground text-sm">
					Welcome back, {userName}. Here&apos;s your reading overview.
				</p>
			</div>

			{/* Top Stats Grid */}
			<div className="grid grid-cols-2 gap-3 md:grid-cols-4">
				<StatCard
					icon={<BookOpen className="h-4 w-4" />}
					label="Total Books"
					value={data.totalBooks}
				/>
				<StatCard
					icon={<BookCheck className="h-4 w-4" />}
					label="Finished"
					value={data.booksFinished}
				/>
				<StatCard
					icon={<BookOpenCheck className="h-4 w-4" />}
					label="Reading Now"
					value={data.currentlyReading}
				/>
				<StatCard
					icon={<Bookmark className="h-4 w-4" />}
					label="Highlights"
					value={data.totalHighlights}
				/>
			</div>

			{/* Streak + Projected */}
			<div className="grid grid-cols-1 gap-3 md:grid-cols-3">
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Flame className="h-4 w-4 text-orange-500" />
							Reading Streak
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-3xl font-bold tabular-nums">{data.streak}</p>
						<p className="text-muted-foreground text-xs">
							consecutive day{data.streak !== 1 ? "s" : ""}
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<TrendingUp className="h-4 w-4 text-green-500" />
							Projected Pace
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-3xl font-bold tabular-nums">{data.projectedBooksPerYear}</p>
						<p className="text-muted-foreground text-xs">books / year at current speed</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Brain className="h-4 w-4 text-violet-500" />
							AI This Month
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-3xl font-bold tabular-nums">{data.aiCallsThisMonth}</p>
						<p className="text-muted-foreground text-xs">
							AI requests · {data.summariesGenerated} summaries generated
						</p>
					</CardContent>
				</Card>
			</div>

			{/* Reading Goal */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle className="flex items-center gap-2">
								<Target className="h-4 w-4" />
								{data.currentYear} Reading Goal
							</CardTitle>
							<CardDescription>
								{data.readingGoal
									? `${data.booksFinishedThisYear} of ${goalTarget} books`
									: "Set a yearly target to track your progress"}
							</CardDescription>
						</div>
						{!isEditingGoal && (
							<Button
								variant="outline"
								size="sm"
								onClick={() => {
									setGoalInput(goalTarget > 0 ? String(goalTarget) : "");
									setIsEditingGoal(true);
								}}
							>
								{data.readingGoal ? "Edit Goal" : "Set Goal"}
							</Button>
						)}
					</div>
				</CardHeader>
				<CardContent className="space-y-3">
					{isEditingGoal ? (
						<div className="flex items-center gap-2">
							<Input
								type="number"
								min={1}
								max={365}
								placeholder="e.g. 24"
								value={goalInput}
								onChange={(e) => setGoalInput(e.target.value)}
								className="w-24"
							/>
							<span className="text-muted-foreground text-xs">books this year</span>
							<Button
								size="sm"
								disabled={!goalInput || setGoalMutation.isPending}
								onClick={() =>
									setGoalMutation.mutate({ targetBooks: Number.parseInt(goalInput, 10) })
								}
							>
								Save
							</Button>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setIsEditingGoal(false)}
							>
								Cancel
							</Button>
						</div>
					) : data.readingGoal ? (
						<div className="space-y-2">
							<div className="bg-muted h-3 w-full overflow-hidden rounded-full">
								<div
									className="bg-primary h-full rounded-full transition-all duration-500"
									style={{ width: `${goalProgress}%` }}
								/>
							</div>
							<div className="flex justify-between text-xs">
								<span className="text-muted-foreground">
									{data.booksFinishedThisYear} finished
								</span>
								<span className="text-muted-foreground font-medium">
									{goalTarget - data.booksFinishedThisYear > 0
										? `${goalTarget - data.booksFinishedThisYear} to go`
										: "Goal reached! 🎉"}
								</span>
							</div>
							{data.projectedBooksPerYear > 0 && (
								<p className="text-muted-foreground text-xs">
									At your current pace you&apos;ll hit{" "}
									<span className="text-foreground font-medium">
										{data.projectedBooksPerYear}
									</span>{" "}
									books this year
									{data.projectedBooksPerYear >= goalTarget
										? " — you're on track!"
										: " — keep going!"}
								</p>
							)}
						</div>
					) : null}
				</CardContent>
			</Card>

			{/* AI Feature Usage */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Sparkles className="h-4 w-4" />
						AI Feature Usage
					</CardTitle>
					<CardDescription>
						How many times you&apos;ve used each AI action on highlights
					</CardDescription>
				</CardHeader>
				<CardContent>
					{Object.keys(data.aiFeatureUsage).length === 0 ? (
						<p className="text-muted-foreground text-sm">
							No AI features used yet — highlight some text and try Explain, Summarize,
							Extract, or Discuss!
						</p>
					) : (
						<div className="grid grid-cols-2 gap-3 md:grid-cols-4">
							{Object.entries(AI_ACTION_LABELS).map(([action, { label, icon }]) => {
								const count =
									data.aiFeatureUsage[action as keyof typeof data.aiFeatureUsage] ?? 0;
								return (
									<div
										key={action}
										className="bg-muted/50 flex items-center gap-3 rounded-md p-3"
									>
										<div className="bg-background flex h-8 w-8 items-center justify-center rounded-md">
											{icon}
										</div>
										<div>
											<p className="text-lg font-semibold tabular-nums">{count}</p>
											<p className="text-muted-foreground text-xs">{label}</p>
										</div>
									</div>
								);
							})}
						</div>
					)}
				</CardContent>
			</Card>

			{/* Reading Speed Benefit */}
			{data.booksFinished > 0 && (
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<TrendingUp className="h-4 w-4 text-blue-500" />
							How ReadSync Helps You
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
							<div className="space-y-1">
								<p className="text-2xl font-bold tabular-nums">{data.totalHighlights}</p>
								<p className="text-muted-foreground text-xs">
									passages highlighted for easier recall
								</p>
							</div>
							<div className="space-y-1">
								<p className="text-2xl font-bold tabular-nums">
									{Object.values(data.aiFeatureUsage).reduce((a, b) => a + b, 0)}
								</p>
								<p className="text-muted-foreground text-xs">
									AI explanations to speed up comprehension
								</p>
							</div>
							<div className="space-y-1">
								<p className="text-2xl font-bold tabular-nums">
									{data.summariesGenerated}
								</p>
								<p className="text-muted-foreground text-xs">
									book summaries generated for quick review
								</p>
							</div>
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}

function StatCard({
	icon,
	label,
	value,
}: { icon: React.ReactNode; label: string; value: number }) {
	return (
		<Card>
			<CardContent className="flex items-center gap-3 pt-4">
				<div className="bg-muted flex h-9 w-9 items-center justify-center rounded-md">
					{icon}
				</div>
				<div>
					<p className="text-2xl font-bold tabular-nums">{value}</p>
					<p className="text-muted-foreground text-xs">{label}</p>
				</div>
			</CardContent>
		</Card>
	);
}
