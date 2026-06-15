import DOMPurify from 'dompurify';
import { browser } from 'wxt/browser';

// Mermaid is heavy (~3 MB), so it is bundled separately into a web-accessible
// asset (see scripts/bundle-mermaid.mjs) and lazy-loaded the first time a
// document actually contains a diagram — keeping the content script small.

interface MermaidApi {
    initialize(config: Record<string, unknown>): void;
    render(id: string, code: string): Promise<{ svg: string }>;
}

let mermaidPromise: Promise<MermaidApi> | null = null;
let counter = 0;

function loadMermaid(): Promise<MermaidApi> {
    if (!mermaidPromise) {
        // WXT's getURL augmentation doesn't always merge into the runtime type;
        // the method exists at runtime. The asset is a web_accessible_resource.
        const runtime = browser.runtime as unknown as { getURL(path: string): string };
        const url = runtime.getURL('/vendor/mermaid.mjs');
        mermaidPromise = import(/* @vite-ignore */ url).then(
            (module: { default?: MermaidApi }) => module.default ?? (module as MermaidApi),
        );
    }
    return mermaidPromise;
}

function copySourceLines(from: HTMLElement, to: HTMLElement): void {
    for (const attr of ['data-source-line', 'data-source-end-line']) {
        const value = from.getAttribute(attr);
        if (value !== null) {
            to.setAttribute(attr, value);
        }
    }
}

/**
 * Replace each ```mermaid fenced block in `root` with a rendered (and sanitized)
 * SVG diagram, themed light/dark. Idempotent — already-rendered blocks are
 * skipped. Resolves to true if anything was rendered (so the caller can re-anchor).
 */
export async function renderMermaidBlocks(root: HTMLElement, dark: boolean): Promise<boolean> {
    const pending = Array.from(
        root.querySelectorAll<HTMLElement>('pre > code.language-mermaid'),
    )
        .map((code) => code.closest('pre'))
        .filter(
            (pre): pre is HTMLPreElement =>
                pre instanceof HTMLElement && pre.dataset['acrMermaid'] !== 'done',
        );
    if (pending.length === 0) {
        return false;
    }

    const mermaid = await loadMermaid();
    mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        theme: dark ? 'dark' : 'default',
        fontFamily: 'inherit',
        // Use SVG <text> labels, not <foreignObject> HTML — the latter is stripped
        // by the SVG-only DOMPurify pass, which would drop all diagram text.
        htmlLabels: false,
        flowchart: { htmlLabels: false, useMaxWidth: true },
        gantt: { useMaxWidth: true },
    });

    let rendered = false;
    for (const pre of pending) {
        pre.dataset['acrMermaid'] = 'done';
        const source = pre.textContent ?? '';
        const container = document.createElement('div');
        container.className = 'acr-mermaid';
        copySourceLines(pre, container);
        counter += 1;
        const id = `acr-mermaid-${counter}`;
        try {
            const { svg } = await mermaid.render(id, source);
            container.innerHTML = DOMPurify.sanitize(svg, {
                USE_PROFILES: { svg: true, svgFilters: true },
            });
        } catch {
            container.classList.add('acr-mermaid--error');
            const note = document.createElement('div');
            note.className = 'acr-mermaid__error';
            note.textContent = 'Could not render this Mermaid diagram.';
            const fallback = document.createElement('pre');
            fallback.textContent = source;
            container.append(note, fallback);
        } finally {
            // mermaid can leave a temporary measurement node behind on error.
            document.getElementById(id)?.remove();
            document.getElementById(`d${id}`)?.remove();
        }
        pre.replaceWith(container);
        rendered = true;
    }
    return rendered;
}
