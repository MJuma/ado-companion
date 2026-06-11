import { adoPostBinary } from './http';
import type { Attachment } from './pr-types';

/**
 * Upload a file (e.g. a pasted screenshot) to the pull request's attachments.
 * The returned attachment `url` is referenced in comment markdown.
 */
export async function uploadAttachment(
    prBaseUrl: string,
    fileName: string,
    data: BodyInit,
): Promise<Attachment> {
    const url = `${prBaseUrl}/attachments/${encodeURIComponent(fileName)}?api-version=7.1`;
    return adoPostBinary<Attachment>(url, data);
}

/** Build the markdown image reference for an uploaded attachment. */
export function attachmentMarkdown(fileName: string, attachment: Attachment): string {
    return `![${fileName}](${attachment.url})`;
}
