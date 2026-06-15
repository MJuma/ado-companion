import { describe, expect, it } from 'vitest';

import { normalizeMermaidContainers } from './directives';

describe('normalizeMermaidContainers', () => {
    it('rewrites a :::mermaid directive into a fenced block, line-for-line', () => {
        const input = ['# Title', '', ':::mermaid', 'gantt', '  title X', ':::', 'after'].join('\n');
        const out = normalizeMermaidContainers(input).split('\n');
        expect(out).toEqual(['# Title', '', '```mermaid', 'gantt', '  title X', '```', 'after']);
        // line count preserved
        expect(out).toHaveLength(7);
    });

    it('leaves fenced ```mermaid blocks untouched', () => {
        const input = ['```mermaid', 'graph LR', '```'].join('\n');
        expect(normalizeMermaidContainers(input)).toBe(input);
    });

    it('does not touch other ::: directives', () => {
        const input = [':::note', 'hello', ':::'].join('\n');
        expect(normalizeMermaidContainers(input)).toBe(input);
    });

    it('handles multiple directive blocks', () => {
        const input = [':::mermaid', 'gantt', ':::', 'x', ':::mermaid', 'graph TD', ':::'].join('\n');
        const out = normalizeMermaidContainers(input);
        expect(out).toBe(
            ['```mermaid', 'gantt', '```', 'x', '```mermaid', 'graph TD', '```'].join('\n'),
        );
    });

    it('only closes the directive that was opened (ignores stray :::)', () => {
        const input = ['text :::', ':::mermaid', 'graph LR', ':::'].join('\n');
        expect(normalizeMermaidContainers(input)).toBe(
            ['text :::', '```mermaid', 'graph LR', '```'].join('\n'),
        );
    });
});
