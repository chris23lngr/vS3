/**
 * Extracts the file name from an object key (last path segment).
 */
export function extractFileName(key: string): string {
	const segments = key.split("/");
	const lastSegment = segments[segments.length - 1];
	return lastSegment ?? key;
}

/**
 * Fetches the file via the presigned URL, creates a Blob + object URL,
 * and triggers a browser download using an anchor element.
 */
export async function triggerBrowserDownload(
	presignedUrl: string,
	fileName: string,
	downloadHeaders?: Record<string, string>,
): Promise<void> {
	const response = await fetch(presignedUrl, {
		headers: downloadHeaders,
	});

	const blob = await response.blob();
	const objectUrl = URL.createObjectURL(blob);

	const anchor = document.createElement("a");
	anchor.href = objectUrl;
	anchor.download = fileName;
	anchor.style.display = "none";
	document.body.appendChild(anchor);
	anchor.click();
	document.body.removeChild(anchor);
	URL.revokeObjectURL(objectUrl);
}

/**
 * Opens the presigned URL in a new browser tab.
 */
export function openInBrowserTab(presignedUrl: string): void {
	window.open(presignedUrl, "_blank", "noopener,noreferrer");
}
