// Styles for the Review island's Shadow DOM. Colors use ADO's own theme CSS
// custom properties (which inherit through the shadow boundary), so the island
// matches ADO's light/dark theme; the literal values are fallbacks only.
export const reviewStyles = `
* { box-sizing: border-box; }
.ado-companion-review {
    font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
    color: var(--text-primary-color, #242424);
    background: var(--background-color, #ffffff);
    line-height: 1.6;
    height: 100%;
    overflow: auto;
    padding: 16px 32px 64px;
}
.ado-companion-review__status { color: var(--text-secondary-color, #6b6b6b); padding: 32px; font-size: 14px; }
.markdown-content { max-width: 980px; }
.markdown-content > :first-child { margin-top: 0; }
.markdown-content h1, .markdown-content h2 { border-bottom: 1px solid rgba(var(--palette-neutral-20, 224, 224, 224), .5); padding-bottom: .3em; }
.markdown-content h1 { font-size: 1.8em; }
.markdown-content h2 { font-size: 1.45em; }
.markdown-content h3 { font-size: 1.2em; }
.markdown-content code {
    background: rgba(var(--palette-neutral-8, 0, 0, 0), .5);
    padding: .15em .35em;
    border-radius: 4px;
    font-family: "Cascadia Code", Consolas, monospace;
    font-size: .9em;
}
.markdown-content pre { background: rgba(var(--palette-neutral-8, 0, 0, 0), .4); padding: 12px 14px; border-radius: 6px; overflow: auto; }
.markdown-content pre code { background: none; padding: 0; }
.markdown-content table { border-collapse: collapse; margin: 12px 0; }
.markdown-content th, .markdown-content td { border: 1px solid rgba(var(--palette-neutral-20, 212, 212, 212), 1); padding: 6px 12px; }
.markdown-content th { background: rgba(var(--palette-neutral-4, 245, 245, 245), 1); }
.markdown-content blockquote { border-left: 3px solid rgba(var(--palette-neutral-30, 200, 200, 200), 1); margin: 12px 0; padding: 0 12px; color: var(--text-secondary-color, #555); }
.markdown-content img { max-width: 100%; }
.markdown-content a { color: var(--communication-foreground, #0067b8); text-decoration: none; }
.markdown-content a:hover { text-decoration: underline; }
`;
