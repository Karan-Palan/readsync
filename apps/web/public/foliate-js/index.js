// Main entry point for foliate-js
// Core classes

export { makeComicBook } from "./comic-book.js";
// Dictionary support
export { DictdDict, StarDict } from "./dict.js";
export { EPUB } from "./epub.js";
// EPUB CFI utilities
export * as CFI from "./epubcfi.js";
export { makeFB2 } from "./fb2.js";
export { FixedLayout } from "./fixed-layout.js";
export { FootnoteHandler } from "./footnotes.js";
export { isMOBI, MOBI } from "./mobi.js";
// OPDS support
export * as OPDS from "./opds.js";
export { Overlayer } from "./overlayer.js";
// UI Components
export { Paginator } from "./paginator.js";
export { initializePDF, makePDF, pdfjsLib } from "./pdf.js";
// Progress and Navigation
export { SectionProgress, TOCProgress } from "./progress.js";
// Search functionality
export { search, searchMatcher } from "./search.js";
// Text processing
export { textWalker } from "./text-walker.js";
export { TTS } from "./tts.js";
// UI utilities
export { createMenu } from "./ui/menu.js";
export { createTOCView } from "./ui/tree.js";
// URI Template utilities
export * as URITemplate from "./uri-template.js";
export {
	makeBook,
	NotFoundError,
	ResponseError,
	UnsupportedTypeError,
	View,
} from "./view.js";
