// Main entry point for foliate-js
// Core classes
export { View, ResponseError, NotFoundError, UnsupportedTypeError, makeBook } from './view.js'
export { EPUB } from './epub.js'
export { MOBI, isMOBI } from './mobi.js'
export { makePDF, initializePDF, pdfjsLib } from './pdf.js'
export { makeFB2 } from './fb2.js'
export { makeComicBook } from './comic-book.js'

// UI Components
export { Paginator } from './paginator.js'
export { FixedLayout } from './fixed-layout.js'
export { Overlayer } from './overlayer.js'
export { FootnoteHandler } from './footnotes.js'
export { TTS } from './tts.js'

// Progress and Navigation
export { TOCProgress, SectionProgress } from './progress.js'

// Search functionality
export { search, searchMatcher } from './search.js'

// Text processing
export { textWalker } from './text-walker.js'

// Dictionary support
export { DictdDict, StarDict } from './dict.js'

// EPUB CFI utilities
export * as CFI from './epubcfi.js'

// OPDS support
export * as OPDS from './opds.js'

// URI Template utilities
export * as URITemplate from './uri-template.js'

// UI utilities
export { createMenu } from './ui/menu.js'
export { createTOCView } from './ui/tree.js' 