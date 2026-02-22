"use client";

import { useEffect, useRef } from "react";

interface Highlight {
	id: string;
	text: string;
	startCfi?: string | null;
	endCfi?: string | null;
	pageNumber?: number | null;
	aiAction?: string | null;
	aiResponse?: string | null;
}

interface HighlightLayerProps {
	highlights: Highlight[];
	fileType: string;
	onHighlightClick: (highlight: Highlight) => void;
}

/**
 * Manages highlight rendering and click interaction.
 *
 * PDF: Injects CSS for <mark> elements in the react-pdf text layer and listens
 *      for clicks via event delegation.
 *
 * EPUB: Highlights are managed via epubjs rendition.annotations — this component
 *       only handles the click delegation and styling for PDF.
 */
export default function HighlightLayer({
	highlights,
	fileType,
	onHighlightClick,
}: HighlightLayerProps) {
	const handlerRef = useRef(onHighlightClick);
	handlerRef.current = onHighlightClick;

	// PDF: delegated click listener on text layer marks
	useEffect(() => {
		if (fileType !== "PDF" || highlights.length === 0) return;

		const handleClick = (e: MouseEvent) => {
			const target = e.target as HTMLElement;
			if (
				!target.matches(
					".react-pdf__Page__textContent mark, .react-pdf__Page__textContent .highlight",
				)
			)
				return;

			const clickedText = target.textContent?.trim() ?? "";
			if (!clickedText) return;

			// Match against stored highlights by partial text overlap
			const matched = highlights.find(
				(h) =>
					clickedText.includes(h.text.slice(0, 40)) ||
					h.text.includes(clickedText),
			);
			if (matched) {
				handlerRef.current(matched);
			}
		};

		document.addEventListener("click", handleClick);
		return () => document.removeEventListener("click", handleClick);
	}, [fileType, highlights]);

	if (highlights.length === 0) return null;

	// For PDF: inject styling for highlight marks in the text layer
	if (fileType === "PDF") {
		return (
			<div className="pointer-events-none absolute inset-0">
				<style>{`
					.react-pdf__Page__textContent mark,
					.react-pdf__Page__textContent .highlight {
						background-color: rgba(250, 204, 21, 0.3);
						cursor: pointer;
						pointer-events: auto;
						border-radius: 2px;
					}
					.react-pdf__Page__textContent mark:hover,
					.react-pdf__Page__textContent .highlight:hover {
						background-color: rgba(250, 204, 21, 0.5);
					}
				`}</style>
			</div>
		);
	}

	// EPUB: epubjs handles highlights via rendition.annotations
	// We just provide a click target layer — actual annotations are
	// added in the epub-reader component if needed
	return null;
}
