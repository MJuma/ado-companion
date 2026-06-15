// Text-range highlighting inside a rendered markdown block: locate a quoted
// substring (or an explicit offset range) and wrap it in <mark> elements,
// tolerant of inline elements (bold/links) by wrapping per text node.

export interface HighlightAnchor {
    /** The quoted text to highlight within the block. */
    quote: string;
    /** A character-offset hint (within the block text) to disambiguate repeats. */
    offset: number;
}

/** Character offset of a DOM boundary point within `root`'s text. */
export function textOffsetWithin(root: Node, container: Node, containerOffset: number): number {
    const doc = root.ownerDocument ?? (root as Document);
    const range = doc.createRange();
    range.selectNodeContents(root);
    try {
        range.setEnd(container, containerOffset);
    } catch {
        return 0;
    }
    return range.toString().length;
}

/** Index of `quote` in `text` closest to `hint`, or -1 if absent. */
export function findQuoteOffset(text: string, quote: string, hint = 0): number {
    const needle = quote.trim();
    if (needle.length === 0) {
        return -1;
    }
    let idx = text.indexOf(needle);
    if (idx === -1) {
        return -1;
    }
    let best = idx;
    while (idx !== -1) {
        if (Math.abs(idx - hint) < Math.abs(best - hint)) {
            best = idx;
        }
        idx = text.indexOf(needle, idx + 1);
    }
    return best;
}

/**
 * Wrap the `[start, end)` character range of `root`'s text in fresh elements
 * from `makeMark`, splitting across text nodes (and inline elements) as needed.
 * Returns the created mark elements.
 */
export function wrapTextRange(
    root: Element,
    start: number,
    end: number,
    makeMark: () => HTMLElement,
): HTMLElement[] {
    if (end <= start) {
        return [];
    }
    const doc = root.ownerDocument;
    if (!doc) {
        return [];
    }
    const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        textNodes.push(node as Text);
    }

    const marks: HTMLElement[] = [];
    let pos = 0;
    for (const textNode of textNodes) {
        const nodeStart = pos;
        const nodeEnd = pos + textNode.data.length;
        pos = nodeEnd;
        if (nodeEnd <= start || nodeStart >= end) {
            continue;
        }
        const from = Math.max(start, nodeStart) - nodeStart;
        const to = Math.min(end, nodeEnd) - nodeStart;
        const tail = from > 0 ? textNode.splitText(from) : textNode;
        if (to - from < tail.data.length) {
            tail.splitText(to - from);
        }
        const parent = tail.parentNode;
        if (!parent) {
            continue;
        }
        const mark = makeMark();
        parent.insertBefore(mark, tail);
        mark.appendChild(tail);
        marks.push(mark);
    }
    return marks;
}

/** Unwrap (remove) all highlight marks with `className`, restoring text nodes. */
export function unwrapHighlights(root: Element, className: string): void {
    for (const mark of Array.from(root.querySelectorAll(`.${className}`))) {
        const parent = mark.parentNode;
        if (!parent) {
            continue;
        }
        while (mark.firstChild) {
            parent.insertBefore(mark.firstChild, mark);
        }
        parent.removeChild(mark);
    }
    root.normalize();
}

/** Parse our stored highlight property value (JSON `{ q, o }`). */
export function parseHighlightProp(value: unknown): HighlightAnchor | null {
    if (typeof value !== 'string') {
        return null;
    }
    try {
        const parsed: unknown = JSON.parse(value);
        if (
            typeof parsed === 'object' &&
            parsed !== null &&
            typeof (parsed as { q?: unknown }).q === 'string'
        ) {
            const record = parsed as { q: string; o?: unknown };
            return {
                quote: record.q,
                offset: typeof record.o === 'number' ? record.o : 0,
            };
        }
    } catch {
        return null;
    }
    return null;
}

/** Serialize a highlight anchor for storage in an ADO thread property. */
export function serializeHighlightProp(quote: string, offset: number): string {
    return JSON.stringify({ q: quote, o: offset });
}

/**
 * Forward-map a selected phrase to its precise source character range
 * `{ startOffset, endOffset }` (1-based, ADO column convention) within a single
 * source line, by locating the rendered quote text. `hint` (the selection's
 * offset in the rendered block) disambiguates repeated phrases. Returns null
 * when the quote can't be located verbatim — e.g. it crosses inline markdown
 * syntax — so callers fall back to a line-level anchor instead of mis-highlighting.
 */
export function phraseSourceRange(
    sourceLine: string | undefined,
    quote: string | undefined,
    hint = 0,
): { startOffset: number; endOffset: number } | null {
    if (sourceLine === undefined || quote === undefined) {
        return null;
    }
    const needle = quote.trim();
    if (needle.length === 0) {
        return null;
    }
    const idx = findQuoteOffset(sourceLine, needle, hint);
    if (idx < 0) {
        return null;
    }
    return { startOffset: idx + 1, endOffset: idx + needle.length + 1 };
}

/**
 * Best-effort quote for a single-line native comment range, read straight from
 * the raw source line. Returns null for empty/whole-line/multi-line ranges
 * (those would not map cleanly onto the rendered text).
 */
export function rawLineQuote(
    rawLines: string[],
    startLine: number,
    startOffset: number,
    endLine: number,
    endOffset: number,
): HighlightAnchor | null {
    if (startLine !== endLine || endOffset <= startOffset) {
        return null;
    }
    const line = rawLines[startLine - 1];
    if (line === undefined) {
        return null;
    }
    const quote = line.slice(startOffset - 1, endOffset - 1).trim();
    if (quote.length === 0 || quote.length >= line.trim().length) {
        return null;
    }
    return { quote, offset: Math.max(0, startOffset - 1) };
}
