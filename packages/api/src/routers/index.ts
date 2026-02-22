import { protectedProcedure, publicProcedure, router } from "../index";
import { aiRouter } from "./ai";
import { bookRouter } from "./book";
import { chapterRouter } from "./chapter";
import { highlightRouter } from "./highlight";

export const appRouter = router({
	healthCheck: publicProcedure.query(() => {
		return "OK";
	}),
	privateData: protectedProcedure.query(({ ctx }) => {
		return {
			message: "This is private",
			user: ctx.session.user,
		};
	}),
	book: bookRouter,
	highlight: highlightRouter,
	chapter: chapterRouter,
	ai: aiRouter,
});
export type AppRouter = typeof appRouter;
