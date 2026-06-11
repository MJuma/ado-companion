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

/* Two-pane layout: rendered doc + comment rail */
.acr-layout { display: flex; align-items: flex-start; gap: 24px; min-height: 100%; }
.acr-doc { flex: 1 1 auto; min-width: 0; }
.acr-rail {
    flex: 0 0 320px;
    align-self: stretch;
    border-left: 1px solid rgba(var(--palette-neutral-20, 224, 224, 224), .5);
    padding-left: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
}
.acr-rail__status { color: var(--text-secondary-color, #6b6b6b); font-size: 13px; padding: 8px 0; }

/* Anchored blocks in the rendered doc */
.acr-anchored { cursor: pointer; box-shadow: -6px 0 0 rgba(var(--palette-neutral-30, 200, 200, 200), .7); }
.acr-anchored:hover { box-shadow: -6px 0 0 var(--communication-foreground, #0067b8); }
.acr-anchored--active {
    box-shadow: -6px 0 0 var(--communication-foreground, #0067b8);
    background: rgba(var(--palette-neutral-8, 0, 0, 0), .35);
    border-radius: 2px;
}

/* Comment cards */
.acr-card {
    border: 1px solid rgba(var(--palette-neutral-20, 224, 224, 224), .6);
    border-radius: 6px;
    padding: 10px 12px;
    font-size: 13px;
    cursor: pointer;
    background: rgba(var(--palette-neutral-4, 250, 250, 250), .5);
}
.acr-card--active { border-color: var(--communication-foreground, #0067b8); }
.acr-card--resolved { opacity: .6; }
.acr-card__status { display: inline-block; font-size: 11px; font-weight: 600; color: var(--text-secondary-color, #6b6b6b); margin-bottom: 6px; }
.acr-comment { margin-top: 10px; }
.acr-comment:first-of-type { margin-top: 0; }
.acr-comment__head { display: flex; align-items: center; gap: 6px; margin-bottom: 2px; }
.acr-comment__avatar { width: 20px; height: 20px; border-radius: 50%; flex: 0 0 auto; }
.acr-comment__author { font-weight: 600; }
.acr-comment__body { font-size: 13px; }
.acr-comment__body > :first-child { margin-top: 0; }
.acr-comment__body > :last-child { margin-bottom: 0; }
`;
