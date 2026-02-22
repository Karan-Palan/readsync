"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import {
	type ReactNode,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFReaderProps {
	book: {
		id: string;
		fileUrl: string;
		fileType: string;
		totalPages: number | null;
	};
	position: unknown;
	onPositionChange: (position: unknown) => void;
	onTextExtracted: (text: string) => void;
	children?: ReactNode;
}

export default function PDFReader({
	book,
	position,
	onPositionChange,
	onTextExtracted,
	children,
}: PDFReaderProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [numPages, setNumPages] = useState<number>(0);
	const [currentPage, setCurrentPage] = useState<number>(
		(position as any)?.page ?? 1,
	);
	const [fontSize, setFontSize] = useState(16);
	const [showSettings, setShowSettings] = useState(false);
	const [pageWidth, setPageWidth] = useState(680);

	// Calculate responsive width
	useEffect(() => {
		const updateWidth = () => {
			if (containerRef.current) {
				const w = Math.min(680, containerRef.current.clientWidth - 32);
				setPageWidth(w);
			}
		};
		updateWidth();
		window.addEventListener("resize", updateWidth);
		return () => window.removeEventListener("resize", updateWidth);
	}, []);

	// Track visible page on scroll
	const handleScroll = useCallback(() => {
		if (!containerRef.current || numPages === 0) return;
		const { scrollTop, scrollHeight } = containerRef.current;
		const pageHeight = scrollHeight / numPages;
		const visiblePage = Math.floor(scrollTop / pageHeight) + 1;
		if (
			visiblePage !== currentPage &&
			visiblePage >= 1 &&
			visiblePage <= numPages
		) {
			setCurrentPage(visiblePage);
			onPositionChange({ page: visiblePage });
		}
	}, [currentPage, numPages, onPositionChange]);

	useEffect(() => {
		const el = containerRef.current;
		if (!el) return;
		el.addEventListener("scroll", handleScroll, { passive: true });
		return () => el.removeEventListener("scroll", handleScroll);
	}, [handleScroll]);

	const goToPage = useCallback(
		(page: number) => {
			if (!containerRef.current || numPages === 0) return;
			const clamped = Math.max(1, Math.min(page, numPages));
			const pageHeight = containerRef.current.scrollHeight / numPages;
			containerRef.current.scrollTo({
				top: (clamped - 1) * pageHeight,
				behavior: "smooth",
			});
			setCurrentPage(clamped);
			onPositionChange({ page: clamped });
		},
		[numPages, onPositionChange],
	);

	return (
		<div ref={containerRef} className="relative h-full overflow-y-auto">
			<div className="mx-auto max-w-180 py-4">
				{/* Settings toggle */}
				<div className="sticky top-0 z-10 flex justify-end gap-2 pb-2">
					<button
						type="button"
						onClick={() => setShowSettings(!showSettings)}
						className="rounded-md border bg-card px-3 py-1 text-muted-foreground text-xs hover:bg-accent"
					>
						Aa
					</button>
				</div>

				{showSettings && (
					<div className="mb-4 rounded-md border bg-card p-3 shadow-lg">
						<label className="flex items-center gap-2 text-xs">
							Font size
							<input
								type="range"
								min={12}
								max={28}
								value={fontSize}
								onChange={(e) => setFontSize(Number(e.target.value))}
								className="w-24"
							/>
							<span>{fontSize}px</span>
						</label>
					</div>
				)}

				<Document
					file={book.fileUrl}
					onLoadSuccess={async (pdf) => {
						setNumPages(pdf.numPages);
						// Extract all text for speed-reading modes
						const pages: string[] = [];
						for (let i = 1; i <= pdf.numPages; i++) {
							const page = await pdf.getPage(i);
							const content = await page.getTextContent();
							pages.push(content.items.map((item: any) => item.str).join(" "));
						}
						onTextExtracted(pages.join("\n\n"));
					}}
					loading={
						<div className="flex items-center justify-center py-20">
							<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
						</div>
					}
				>
					{Array.from({ length: numPages }, (_, i) => (
						<Page
							key={`page_${i + 1}`}
							pageNumber={i + 1}
							width={pageWidth}
							className="mb-4 shadow-md"
							renderTextLayer={true}
							renderAnnotationLayer={true}
						/>
					))}
				</Document>

				{/* Children slot for HighlightLayer, TextSelectionMenu, etc. */}
				{children}
			</div>

			{/* Page indicator & nav */}
			{numPages > 0 && (
				<div className="fixed bottom-20 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full bg-card/80 px-3 py-1 shadow backdrop-blur">
					<button
						type="button"
						onClick={() => goToPage(currentPage - 1)}
						disabled={currentPage <= 1}
						className="rounded p-0.5 hover:bg-accent disabled:opacity-30"
					>
						<ChevronLeft className="h-4 w-4" />
					</button>
					<span className="text-muted-foreground text-xs tabular-nums">
						{currentPage} / {numPages}
					</span>
					<button
						type="button"
						onClick={() => goToPage(currentPage + 1)}
						disabled={currentPage >= numPages}
						className="rounded p-0.5 hover:bg-accent disabled:opacity-30"
					>
						<ChevronRight className="h-4 w-4" />
					</button>
				</div>
			)}
		</div>
	);
}
