import DOMPurify from 'dompurify';
import { browser } from 'wxt/browser';

// highlight.js (~160 KB) is vendored as a web-accessible bundle and lazy-loaded
// the first time the Review view shows a code block, keeping the content script
// small (it loads on every ADO page).

interface Hljs {
    highlight(code: string, options: { language: string; ignoreIllegals?: boolean }): { value: string };
    getLanguage(name: string): unknown;
}

let hljsPromise: Promise<Hljs> | null = null;

function loadHljs(): Promise<Hljs> {
    if (!hljsPromise) {
        const runtime = browser.runtime as unknown as { getURL(path: string): string };
        const url = runtime.getURL('/vendor/highlight.mjs');
        hljsPromise = import(/* @vite-ignore */ url).then(
            (module: { default?: Hljs }) => module.default ?? (module as Hljs),
        );
    }
    return hljsPromise;
}

function languageOf(code: HTMLElement): string | null {
    for (const name of Array.from(code.classList)) {
        if (name.startsWith('language-')) {
            return name.slice('language-'.length);
        }
    }
    return null;
}

/**
 * Syntax-highlight rendered code blocks (skipping mermaid blocks). Idempotent;
 * unknown languages are left as plain code. Resolves to true if anything was
 * highlighted. highlight.js output is sanitized before insertion.
 */
export async function highlightCodeBlocks(root: HTMLElement): Promise<boolean> {
    const blocks = Array.from(
        root.querySelectorAll<HTMLElement>('pre > code[class*="language-"]'),
    ).filter(
        (code) =>
            !code.classList.contains('language-mermaid') && code.dataset['acrHl'] !== 'done',
    );
    if (blocks.length === 0) {
        return false;
    }

    const hljs = await loadHljs();
    let highlighted = false;
    for (const code of blocks) {
        code.dataset['acrHl'] = 'done';
        const language = languageOf(code);
        if (!language || !hljs.getLanguage(language)) {
            continue;
        }
        try {
            const result = hljs.highlight(code.textContent ?? '', {
                language,
                ignoreIllegals: true,
            });
            code.innerHTML = DOMPurify.sanitize(result.value);
            code.classList.add('hljs');
            highlighted = true;
        } catch {
            // Leave the block as plain text on any highlighter error.
        }
    }
    return highlighted;
}
