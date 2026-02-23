"use client";

import type React from "react";
import type { ReactNode } from "react";

import type { EPUBHighlight } from "@/types/reader";

import EPUBReader from "./epub-reader";
import PDFReader from "./pdf-reader";

interface NormalModeProps {
	book: {
		id: string;
		fileUrl: string;
		fileType: string;
		coverUrl?: string | null;
		totalPages: number | null;
	};
	position: unknown;
	highlights?: EPUBHighlight[];
	onPositionChange: (position: unknown) => void;
	onTextExtracted: (text: string) => void;
	onCoverExtracted?: (coverDataUrl: string) => void;
	onHighlightClick?: (highlight: EPUBHighlight) => void;
	navigateRef?: React.MutableRefObject<((pos: unknown) => void) | null>;
	children?: ReactNode;
}

/**
 * Dispatches to the correct reader engine based on file type.
 * PDF → react-pdf (PDF.js)
 * EPUB → foliate-js
 */
export default function NormalMode({
	book,
	position,
	highlights,
	onPositionChange,
	onTextExtracted,
	onCoverExtracted,
	onHighlightClick,
	navigateRef,
	children,
}: NormalModeProps) {
	if (book.fileType === "PDF") {
		return (
			<PDFReader
				book={book}
				position={position}
				onPositionChange={onPositionChange}
				onTextExtracted={onTextExtracted}
			>
				{children}
			</PDFReader>
		);
	}

	if (book.fileType === "EPUB") {
		return (
			<EPUBReader
				book={book}
				position={position}
				highlights={highlights}
				onPositionChange={onPositionChange}
				onTextExtracted={onTextExtracted}
				onCoverExtracted={onCoverExtracted}
				onHighlightClick={onHighlightClick}
				navigateRef={navigateRef}
			>
				{children}
			</EPUBReader>
		);
	}

	// Unsupported format fallback
	return (
		<div className="flex h-full items-center justify-center">
			<p className="text-muted-foreground">
				Unsupported file format: {book.fileType}
			</p>
		</div>
	);
}
