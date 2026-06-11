import DOMPurify from 'dompurify';
import MarkdownIt from 'markdown-it';

// Attributes that map a rendered block back to its 1-based source-markdown
// lines, so the review UI can anchor comments to the right place.
export const SOURCE_LINE_ATTR = 'data-source-line';
export const SOURCE_END_LINE_ATTR = 'data-source-end-line';

let renderer: MarkdownIt | null = null;

function addLineNumbers(md: MarkdownIt): void {
    const renderToken = md.renderer.renderToken.bind(md.renderer);
    md.renderer.renderToken = (tokens, idx, options) => {
        const token = tokens[idx];
        if (token.nesting !== -1 && token.map) {
            token.attrSet(SOURCE_LINE_ATTR, String(token.map[0] + 1));
            token.attrSet(SOURCE_END_LINE_ATTR, String(token.map[1]));
        }
        return renderToken(tokens, idx, options);
    };

    // fence/code_block have dedicated render rules that bypass renderToken, so
    // inject the attributes into their opening tag directly.
    for (const name of ['fence', 'code_block'] as const) {
        const original = md.renderer.rules[name];
        md.renderer.rules[name] = (tokens, idx, options, env, self) => {
            const token = tokens[idx];
            const html = original
                ? original(tokens, idx, options, env, self)
                : self.renderToken(tokens, idx, options);
            if (!token.map) {
                return html;
            }
            const attrs = `${SOURCE_LINE_ATTR}="${token.map[0] + 1}" ${SOURCE_END_LINE_ATTR}="${token.map[1]}"`;
            return html.replace(/^<(pre|code)\b/, `<$1 ${attrs}`);
        };
    }
}

function getRenderer(): MarkdownIt {
    if (!renderer) {
        renderer = new MarkdownIt({ html: true, linkify: true });
        addLineNumbers(renderer);
    }
    return renderer;
}

/**
 * Render markdown to sanitized HTML annotated with `data-source-line` /
 * `data-source-end-line` attributes. The source markdown is untrusted PR
 * content, so the output is run through DOMPurify.
 */
export function renderMarkdown(markdown: string): string {
    const html = getRenderer().render(markdown);
    return DOMPurify.sanitize(html);
}
