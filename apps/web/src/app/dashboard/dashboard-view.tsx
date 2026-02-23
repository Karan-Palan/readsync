"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	BookCheck,
	Bookmark,
	BookOpen,
	BookOpenCheck,
	Brain,
	Clock,
	FileText,
	Flame,
	MessageSquare,
	Search,
	Sparkles,
	Target,
	TrendingUp,
} from "lucide-react";
import { useState } from "react";

import Loader from "@/components/loader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/utils/trpc";

// Constants

const AI_ACTION_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
	EXPLAIN: { label: "Explain", icon: <Search className="h-4 w-4" /> },
	SUMMARIZE: { label: "Summarize", icon: <FileText className="h-4 w-4" /> },
	EXTRACT: { label: "Extract", icon: <Sparkles className="h-4 w-4" /> },
	DISCUSS: { label: "Discuss", icon: <MessageSquare className="h-4 w-4" /> },
};

// Sub-components

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
	return (
		<Card>
			<CardContent className="flex items-center gap-3 pt-4">
				<div className="bg-muted flex h-9 w-9 items-center justify-center rounded-md">{icon}</div>
				<div>
					<p className="text-2xl font-bold tabular-nums">{value}</p>
					<p className="text-muted-foreground text-xs">{label}</p>
				</div>
			</CardContent>
		</Card>
	);
}

function MetricCard({
	icon,
	title,
	value,
	description,
}: {
	icon: React.ReactNode;
	title: string;
	value: number | string;
	description: string;
}) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					{icon}
					{title}
				</CardTitle>
			</CardHeader>
			<CardContent>
				<p className="text-3xl font-bold tabular-nums">{value}</p>
				<p className="text-muted-foreground text-xs">{description}</p>
			</CardContent>
		</Card>
	);
}

interface ReadingGoalCardProps {
	currentYear: number;
	readingGoal: { targetBooks: number } | null | undefined;
	booksFinishedThisYear: number;
	projectedBooksPerYear: number;
}

function ReadingGoalCard({
	currentYear,
	readingGoal,
	booksFinishedThisYear,
	projectedBooksPerYear,
}: ReadingGoalCardProps) {
	const queryClient = useQueryClient();
	const [goalInput, setGoalInput] = useState("");
	const [isEditingGoal, setIsEditingGoal] = useState(false);

	const goalTarget = readingGoal?.targetBooks ?? 0;
	const goalProgress =
		goalTarget > 0 ? Math.min(100, (booksFinishedThisYear / goalTarget) * 100) : 0;

	const setGoalMutation = useMutation(
		trpc.dashboard.setGoal.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: trpc.dashboard.stats.queryOptions().queryKey,
				});
				setIsEditingGoal(false);
				setGoalInput("");
			},
		}),
	);

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<CardTitle className="flex items-center gap-2">
							<Target className="h-4 w-4" />
							{currentYear} Reading Goal
						</CardTitle>
						<CardDescription>
							{readingGoal
								? `${booksFinishedThisYear} of ${goalTarget} books`
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
							{readingGoal ? "Edit Goal" : "Set Goal"}
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
								setGoalMutation.mutate({
									targetBooks: Number.parseInt(goalInput, 10),
								})
							}
						>
							Save
						</Button>
						<Button variant="ghost" size="sm" onClick={() => setIsEditingGoal(false)}>
							Cancel
						</Button>
					</div>
				) : readingGoal ? (
					<div className="space-y-2">
						<Progress value={goalProgress} className="h-3" />
						<div className="flex justify-between text-xs">
							<span className="text-muted-foreground">{booksFinishedThisYear} finished</span>
							<span className="text-muted-foreground font-medium">
								{goalTarget - booksFinishedThisYear > 0
									? `${goalTarget - booksFinishedThisYear} to go`
									: "Goal reached! 🎉"}
							</span>
						</div>
						{projectedBooksPerYear > 0 && (
							<p className="text-muted-foreground text-xs">
								At your current pace you&apos;ll hit{" "}
								<span className="text-foreground font-medium">{projectedBooksPerYear}</span> books
								this year
								{projectedBooksPerYear >= goalTarget ? " — you're on track!" : " — keep going!"}
							</p>
						)}
					</div>
				) : null}
			</CardContent>
		</Card>
	);
}

function AIFeatureUsageCard({ aiFeatureUsage }: { aiFeatureUsage: Record<string, number> }) {
	return (
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
				{Object.keys(aiFeatureUsage).length === 0 ? (
					<p className="text-muted-foreground text-sm">
						No AI features used yet — highlight some text and try Explain, Summarize, Extract, or
						Discuss!
					</p>
				) : (
					<div className="grid grid-cols-2 gap-3 md:grid-cols-4">
						{Object.entries(AI_ACTION_LABELS).map(([action, { label, icon }]) => {
							const count = aiFeatureUsage[action] ?? 0;
							return (
								<div key={action} className="bg-muted/50 flex items-center gap-3 rounded-md p-3">
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
	);
}

function ReadingBenefitsCard({
	totalHighlights,
	totalAiCalls,
	summariesGenerated,
}: {
	totalHighlights: number;
	totalAiCalls: number;
	summariesGenerated: number;
}) {
	const benefits = [
		{ value: totalHighlights, label: "passages highlighted for easier recall" },
		{ value: totalAiCalls, label: "AI explanations to speed up comprehension" },
		{
			value: summariesGenerated,
			label: "book summaries generated for quick review",
		},
	];

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<TrendingUp className="h-4 w-4 text-blue-500" />
					How ReadSync Helps You
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
					{benefits.map(({ value, label }) => (
						<div key={label} className="space-y-1">
							<p className="text-2xl font-bold tabular-nums">{value}</p>
							<p className="text-muted-foreground text-xs">{label}</p>
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	);
}

// Main component

type ActivityPeriod = "today" | "week" | "month";

function ReadingActivityCard({
	activity,
}: {
	activity: {
		today: { minutesRead: number; pagesRead: number };
		thisWeek: { minutesRead: number; pagesRead: number };
		thisMonth: { minutesRead: number; pagesRead: number };
	};
}) {
	const [period, setPeriod] = useState<ActivityPeriod>("today");
	const periodData =
		period === "today" ? activity.today : period === "week" ? activity.thisWeek : activity.thisMonth;
	const labels: Record<ActivityPeriod, string> = { today: "Today", week: "This Week", month: "This Month" };

	return (
		<Card>
			<CardHeader>
				<div className="flex flex-wrap items-center justify-between gap-2">
					<CardTitle className="flex items-center gap-2">
						<Clock className="h-4 w-4 text-blue-500" />
						Reading Activity
					</CardTitle>
					<div className="flex gap-1">
						{(["today", "week", "month"] as ActivityPeriod[]).map((p) => (
							<Button
								key={p}
								size="sm"
								variant={period === p ? "default" : "ghost"}
								onClick={() => setPeriod(p)}
							>
								{labels[p]}
							</Button>
						))}
					</div>
				</div>
				<CardDescription>Time spent reading and pages covered</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="grid grid-cols-2 gap-4">
					<div className="bg-muted/50 flex flex-col gap-1 rounded-lg p-4">
						<Clock className="mb-1 h-5 w-5 text-blue-500" />
						<p className="text-3xl font-bold tabular-nums">{periodData.minutesRead}</p>
						<p className="text-muted-foreground text-xs">minutes read</p>
					</div>
					<div className="bg-muted/50 flex flex-col gap-1 rounded-lg p-4">
						<BookOpen className="mb-1 h-5 w-5 text-violet-500" />
						<p className="text-3xl font-bold tabular-nums">{periodData.pagesRead}</p>
						<p className="text-muted-foreground text-xs">pages read</p>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

export default function DashboardView({ userName }: { userName: string }) {
	const { data, isLoading } = useQuery(trpc.dashboard.stats.queryOptions());
	const { data: activityData } = useQuery(trpc.dashboard.activityStats.queryOptions());

	if (isLoading || !data) {
		return <Loader size="h-8 w-8" label="Loading dashboard..." />;
	}

	const totalAiCalls = Object.values(data.aiFeatureUsage).reduce((a, b) => a + b, 0);

	return (
		<div className="mx-auto w-full max-w-6xl space-y-6 p-4 md:p-6">
			{/* Header */}
			<div>
				<h1 className="text-xl font-semibold">Dashboard</h1>
				<p className="text-muted-foreground text-sm">
					Welcome back, {userName}. Here&apos;s your reading overview.
				</p>
			</div>

			{/* Top Stats */}
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

			{/* Streak + Projected + AI */}
			<div className="grid grid-cols-1 gap-3 md:grid-cols-3">
				<MetricCard
					icon={<Flame className="h-4 w-4 text-orange-500" />}
					title="Reading Streak"
					value={data.streak}
					description={`consecutive day${data.streak !== 1 ? "s" : ""}`}
				/>
				<MetricCard
					icon={<TrendingUp className="h-4 w-4 text-green-500" />}
					title="Projected Pace"
					value={data.projectedBooksPerYear}
					description="books / year at current speed"
				/>
				<MetricCard
					icon={<Brain className="h-4 w-4 text-violet-500" />}
					title="AI This Month"
					value={data.aiCallsThisMonth}
					description={`AI requests · ${data.summariesGenerated} summaries generated`}
				/>
			</div>

			{/* Reading Goal */}
			<ReadingGoalCard
				currentYear={data.currentYear}
				readingGoal={data.readingGoal}
				booksFinishedThisYear={data.booksFinishedThisYear}
				projectedBooksPerYear={data.projectedBooksPerYear}
			/>

			{/* Reading Activity (time + pages) */}
			{activityData && (
				<ReadingActivityCard
					activity={{
						today: activityData.today,
						thisWeek: activityData.thisWeek,
						thisMonth: activityData.thisMonth,
					}}
				/>
			)}

			{/* AI Feature Usage */}
			<AIFeatureUsageCard aiFeatureUsage={data.aiFeatureUsage} />

			{/* Reading Benefits */}
			{data.booksFinished > 0 && (
				<ReadingBenefitsCard
					totalHighlights={data.totalHighlights}
					totalAiCalls={totalAiCalls}
					summariesGenerated={data.summariesGenerated}
				/>
			)}
		</div>
	);
}
