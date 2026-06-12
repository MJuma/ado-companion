import { describe, expect, it } from 'vitest';

import {
    attachmentFileName,
    extensionForImage,
    insertText,
    isImageFile,
    pickImageFiles,
} from './editor';

describe('insertText', () => {
    it('inserts at a collapsed caret', () => {
        const result = insertText('hello world', 5, 5, ' there');
        expect(result.value).toBe('hello there world');
        expect(result.cursor).toBe(11);
    });

    it('replaces a selection', () => {
        const result = insertText('hello world', 6, 11, 'there');
        expect(result.value).toBe('hello there');
        expect(result.cursor).toBe(11);
    });

    it('appends when the caret is at the end', () => {
        const result = insertText('abc', 3, 3, '!');
        expect(result.value).toBe('abc!');
        expect(result.cursor).toBe(4);
    });

    it('clamps out-of-range or reversed selections', () => {
        const result = insertText('abc', -5, 99, 'X');
        expect(result.value).toBe('X');
        expect(result.cursor).toBe(1);
    });
});

describe('extensionForImage', () => {
    it('maps known MIME types', () => {
        expect(extensionForImage('image/png')).toBe('png');
        expect(extensionForImage('image/jpeg')).toBe('jpg');
        expect(extensionForImage('IMAGE/GIF')).toBe('gif');
        expect(extensionForImage('image/svg+xml')).toBe('svg');
    });

    it('defaults unknown types to png', () => {
        expect(extensionForImage('image/heic')).toBe('png');
    });
});

describe('isImageFile / pickImageFiles', () => {
    it('detects image MIME types', () => {
        expect(isImageFile({ type: 'image/png' })).toBe(true);
        expect(isImageFile({ type: 'text/plain' })).toBe(false);
    });

    it('filters a mixed file list to images only', () => {
        const files = [
            { type: 'image/png', name: 'a' },
            { type: 'text/plain', name: 'b' },
            { type: 'image/jpeg', name: 'c' },
        ];
        expect(pickImageFiles(files).map((file) => file.name)).toEqual(['a', 'c']);
    });
});

describe('attachmentFileName', () => {
    it('builds a zero-padded, millisecond-unique name with the right extension', () => {
        const now = new Date(2026, 0, 7, 9, 4, 5, 30);
        expect(attachmentFileName('image/png', now)).toBe('image-20260107-090405-030.png');
    });

    it('derives the extension from the MIME type', () => {
        const now = new Date(2026, 10, 20, 23, 59, 59, 999);
        expect(attachmentFileName('image/jpeg', now)).toBe('image-20261120-235959-999.jpg');
    });
});
