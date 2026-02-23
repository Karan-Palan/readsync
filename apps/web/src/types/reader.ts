//  Shared Reader Types
// Single source of truth for types used across reader components.

/** AI actions available on highlights and quick queries */
export type AIAction = "EXPLAIN" | "SUMMARIZE" | "EXTRACT" | "DISCUSS";

/** Full highlight shape — all fields present after a DB round-trip */
export interface Highlight {
	id: string;
	text: string;
	color?: string | null;
	note?: string | null;
	startCfi?: string | null;
	endCfi?: string | null;
	pageNumber?: number | null;
	aiAction?: string | null;
	aiResponse?: string | null;
}

/** Minimal highlight for EPUB rendering — only fields needed for annotations */
export interface EPUBHighlight {
	id: string;
	text: string;
	color?: string | null;
	startCfi?: string | null;
	endCfi?: string | null;
}

/** Chapter shape shared across reader components */
export interface Chapter {
	id: string;
	name: string;
	startPage: number;
	endPage: number;
	order: number;
}

//  Highlight Colors

export interface HighlightColorDef {
	id: string;
	/** Tailwind background class for UI pickers */
	bg: string;
	/** Tailwind class for borders & accents (notes page, cards) */
	accent: string;
	/** Human-readable label */
	label: string;
	/** RGBA value for SVG / Canvas rendering (EPUB overlayer) */
	rgba: string;
}

export const HIGHLIGHT_COLORS: HighlightColorDef[] = [
	{
		id: "yellow",
		bg: "bg-yellow-300",
		accent: "border-yellow-400 bg-yellow-300/20",
		label: "Yellow",
		rgba: "rgba(255,255,0,0.35)",
	},
	{
		id: "green",
		bg: "bg-green-300",
		accent: "border-green-400 bg-green-300/20",
		label: "Green",
		rgba: "rgba(0,255,0,0.35)",
	},
	{
		id: "blue",
		bg: "bg-blue-300",
		accent: "border-blue-400 bg-blue-300/20",
		label: "Blue",
		rgba: "rgba(0,180,255,0.35)",
	},
	{
		id: "pink",
		bg: "bg-pink-300",
		accent: "border-pink-400 bg-pink-300/20",
		label: "Pink",
		rgba: "rgba(255,105,180,0.35)",
	},
];

/** Look up a color by id → RGBA. Falls back to yellow. */
export function getHighlightRgba(colorId?: string | null): string {
	return HIGHLIGHT_COLORS.find((c) => c.id === colorId)?.rgba ?? HIGHLIGHT_COLORS[0].rgba;
}

/** Look up a color by id → accent classes. Falls back to yellow. */
export function getHighlightAccent(colorId?: string | null): string {
	return HIGHLIGHT_COLORS.find((c) => c.id === colorId)?.accent ?? HIGHLIGHT_COLORS[0].accent;
}

//  AI Action Labels

export const AI_ACTION_LABELS: Record<AIAction, string> = {
	EXPLAIN: "Explanation",
	SUMMARIZE: "Summary",
	EXTRACT: "Key Insights",
	DISCUSS: "Discussion",
};

//  Data attribute for AI panel click-through guard 
export const AI_PANEL_ATTR = "data-ai-panel" as const;
