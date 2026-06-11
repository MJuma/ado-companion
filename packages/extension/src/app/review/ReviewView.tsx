import { createResource, Show } from 'solid-js';

import { getFileContent } from '../../lib/ado/items';
import type { PrContext } from '../../lib/ado/pr';
import { renderMarkdown } from '../../lib/markdown/render';

interface ReviewViewProps {
    context: PrContext;
}

/**
 * The Review document: fetches the PR file at its source commit and renders it
 * (read-only) with source-line anchoring. The comment rail is added in Phase 4.
 */
export function ReviewView(props: ReviewViewProps) {
    const [doc] = createResource(
        () => props.context,
        async (context): Promise<string | null> => {
            const markdown = await getFileContent(context);
            return markdown === null ? null : renderMarkdown(markdown);
        },
    );

    return (
        <div class="ado-companion-review">
            <Show when={doc.loading}>
                <div class="ado-companion-review__status">Loading…</div>
            </Show>
            <Show when={doc.error}>
                <div class="ado-companion-review__status">Failed to load file content.</div>
            </Show>
            <Show when={!doc.loading && !doc.error}>
                <Show
                    when={doc()}
                    fallback={<div class="ado-companion-review__status">No content.</div>}
                >
                    {(html) => (
                        <div class="ado-companion-review__doc markdown-content" innerHTML={html()} />
                    )}
                </Show>
            </Show>
        </div>
    );
}
