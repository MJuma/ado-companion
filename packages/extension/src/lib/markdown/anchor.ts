// Pure anchoring: map a thread's source line to the rendered block that should
// carry it (exact data-source-line match, else the closest preceding block).

export interface ThreadLine {
    id: number;
    line: number | null;
}

export interface AnchoredThread {
    id: number;
    anchorLine: number | null;
}

/**
 * Resolve the block start line that anchors `line`: exact match if present,
 * otherwise the closest preceding block, otherwise the first block (when the
 * line precedes all blocks). Returns null only when there are no blocks.
 * `blockLines` need not be sorted.
 */
export function resolveAnchorLine(line: number, blockLines: readonly number[]): number | null {
    let exact: number | null = null;
    let preceding: number | null = null;
    let first: number | null = null;

    for (const blockLine of blockLines) {
        if (first === null || blockLine < first) {
            first = blockLine;
        }
        if (blockLine === line) {
            exact = blockLine;
        } else if (blockLine < line && (preceding === null || blockLine > preceding)) {
            preceding = blockLine;
        }
    }

    if (exact !== null) {
        return exact;
    }
    if (preceding !== null) {
        return preceding;
    }
    return first;
}

export function anchorThreads(
    threads: readonly ThreadLine[],
    blockLines: readonly number[],
): AnchoredThread[] {
    return threads.map((thread) => ({
        id: thread.id,
        anchorLine: thread.line === null ? null : resolveAnchorLine(thread.line, blockLines),
    }));
}
