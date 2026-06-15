/**
 * Azure DevOps renders Mermaid from BOTH a fenced ```mermaid block AND a
 * `:::mermaid` … `:::` directive block. markdown-it only understands the fence,
 * so rewrite the directive form into a fence. The rewrite is line-for-line (the
 * marker lines are swapped in place) so `data-source-line` anchoring stays exact.
 */
export function normalizeMermaidContainers(markdown: string): string {
    const lines = markdown.split('\n');
    let open = false;
    for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i] ?? '';
        if (!open && /^\s*:::\s*mermaid\s*$/i.test(line)) {
            lines[i] = line.replace(/:::\s*mermaid\s*$/i, '```mermaid');
            open = true;
        } else if (open && /^\s*:::\s*$/.test(line)) {
            lines[i] = line.replace(/:::\s*$/, '```');
            open = false;
        }
    }
    return lines.join('\n');
}
