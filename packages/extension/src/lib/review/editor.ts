// Pure helpers for the comment composer: cursor-aware text insertion and
// turning pasted/dropped clipboard files into uploadable image attachments.
// DOM event handling stays in the Solid glue; everything here is testable.

export interface TextInsertResult {
    value: string;
    cursor: number;
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

/**
 * Replace the `[selectionStart, selectionEnd)` range of `value` with `insert`,
 * returning the new value and the caret position just after the inserted text.
 */
export function insertText(
    value: string,
    selectionStart: number,
    selectionEnd: number,
    insert: string,
): TextInsertResult {
    const start = clamp(selectionStart, 0, value.length);
    const end = clamp(Math.max(selectionEnd, start), start, value.length);
    const next = value.slice(0, start) + insert + value.slice(end);
    return { value: next, cursor: start + insert.length };
}

const IMAGE_EXTENSIONS: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/bmp': 'bmp',
    'image/svg+xml': 'svg',
};

/** Map an image MIME type to a file extension (defaults to `png`). */
export function extensionForImage(mimeType: string): string {
    return IMAGE_EXTENSIONS[mimeType.toLowerCase()] ?? 'png';
}

interface FileLike {
    type: string;
}

/** True for files whose MIME type is an image. */
export function isImageFile(file: FileLike): boolean {
    return file.type.toLowerCase().startsWith('image/');
}

/** Keep only the image files from a clipboard/drag file list. */
export function pickImageFiles<T extends FileLike>(files: readonly T[]): T[] {
    return files.filter((file) => isImageFile(file));
}

function pad(value: number, length: number): string {
    return String(value).padStart(length, '0');
}

/**
 * A stable, PR-unique file name for a pasted image, derived from the timestamp
 * (down to the millisecond) and its MIME type. ADO keys attachments by name, so
 * uniqueness avoids collisions across multiple pastes.
 */
export function attachmentFileName(mimeType: string, now: Date): string {
    const date = `${now.getFullYear()}${pad(now.getMonth() + 1, 2)}${pad(now.getDate(), 2)}`;
    const time = `${pad(now.getHours(), 2)}${pad(now.getMinutes(), 2)}${pad(now.getSeconds(), 2)}`;
    const millis = pad(now.getMilliseconds(), 3);
    return `image-${date}-${time}-${millis}.${extensionForImage(mimeType)}`;
}
