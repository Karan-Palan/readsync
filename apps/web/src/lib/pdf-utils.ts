/**
 * Extract the current PDF page number from the DOM selection.
 * Works by walking up from the selection anchor to find the
 * closest `.react-pdf__Page` element with a `data-page-number` attribute.
 */
export function getPdfPageNumber(): number | undefined {
	const selection = window.getSelection();
	if (!selection?.rangeCount) return undefined;

	const anchor = selection.getRangeAt(0).startContainer.parentElement;
	const pageEl = anchor?.closest(".react-pdf__Page");
	const num = pageEl?.getAttribute("data-page-number");
	return num ? Number.parseInt(num, 10) : undefined;
}
