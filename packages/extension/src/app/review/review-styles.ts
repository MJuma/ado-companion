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
    padding: 0 32px 64px;
}
.ado-companion-review.acr-resizing { user-select: none; cursor: col-resize; }
.ado-companion-review.acr-resizing .acr-rail__slot { transition: none; }
.ado-companion-review__status { color: var(--text-secondary-color, #6b6b6b); padding: 32px; font-size: 14px; }
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

/* Two-pane layout: rendered doc + comment rail (toolbar lives in the rail) */
.acr-layout { display: flex; align-items: flex-start; gap: 0; min-height: 100%; }
.acr-doc { flex: 1 1 auto; min-width: 0; padding-top: 16px; padding-right: 6px; }
.acr-divider {
    flex: 0 0 11px;
    align-self: stretch;
    position: relative;
    cursor: col-resize;
    touch-action: none;
}
.acr-divider::after {
    content: "";
    position: absolute;
    top: 0;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 1px;
    background: rgba(var(--palette-neutral-20, 224, 224, 224), .8);
}
.acr-divider:hover::after, .acr-resizing .acr-divider::after {
    width: 2px;
    background: var(--communication-foreground, #0067b8);
}
.acr-rail {
    align-self: stretch;
    position: relative;
    padding-left: 16px;
}
.acr-rail__status { color: var(--text-secondary-color, #6b6b6b); font-size: 13px; padding: 8px 0; }
.acr-rail__slot { position: absolute; left: 16px; right: 0; transition: top .12s ease; }

/* Anchored blocks in the rendered doc */
.acr-anchored { box-shadow: -6px 0 0 rgba(var(--palette-neutral-30, 200, 200, 200), .7); }
.acr-anchored:hover { box-shadow: -6px 0 0 var(--communication-foreground, #0067b8); }
.acr-anchored--active {
    box-shadow: -6px 0 0 var(--communication-foreground, #0067b8);
    background: rgba(var(--palette-neutral-8, 0, 0, 0), .35);
    border-radius: 2px;
}
/* Highlighted text span the comment was made on (in addition to the border). */
mark.acr-hl {
    background-color: rgba(255, 196, 0, .28);
    color: inherit;
    border-radius: 2px;
}
.acr-anchored:hover mark.acr-hl { background-color: rgba(255, 196, 0, .45); }
mark.acr-hl--active { background-color: rgba(255, 196, 0, .6); }

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
.acr-card__status { display: inline-block; font-size: 11px; font-weight: 600; color: var(--text-secondary-color, #6b6b6b); }
.acr-comment { margin-top: 10px; }
.acr-comment:first-of-type { margin-top: 0; }
.acr-comment__head { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
.acr-comment__avatar { width: 20px; height: 20px; border-radius: 50%; flex: 0 0 auto; }
.acr-comment__author { font-weight: 600; }
.acr-comment__time { font-size: 11px; color: var(--text-secondary-color, #6b6b6b); }
.acr-comment__tools { margin-left: auto; display: inline-flex; gap: 1px; opacity: 0; transition: opacity .1s ease; }
.acr-card:hover .acr-comment__tools, .acr-comment__tools:focus-within { opacity: 1; }
.acr-iconbtn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    padding: 0;
    border: none;
    border-radius: 3px;
    background: transparent;
    color: var(--text-secondary-color, #6b6b6b);
    cursor: pointer;
}
.acr-iconbtn:hover { background: rgba(var(--palette-neutral-8, 0, 0, 0), .3); color: var(--text-primary-color, #242424); }
.acr-iconbtn--danger:hover { color: var(--status-error-text, #c4314b); }
.acr-comment__body { font-size: 13px; overflow-wrap: anywhere; }
.acr-comment__body > :first-child { margin-top: 0; }
.acr-comment__body > :last-child { margin-bottom: 0; }
/* Keep wide content (tables, code, images) inside the comment card. */
.acr-comment__body table, .acr-composer__preview table { display: block; max-width: 100%; overflow-x: auto; }
.acr-comment__body pre, .acr-composer__preview pre { max-width: 100%; }
.acr-composer__preview { overflow-wrap: anywhere; }

/* Document text is selectable (no click-to-comment affordance). */
.acr-doc { cursor: auto; }

/* Composer + controls */
.acr-card__footer { display: flex; align-items: center; gap: 6px; margin-top: 10px; padding-top: 8px; border-top: 1px solid rgba(var(--palette-neutral-20, 224, 224, 224), .5); }
.acr-card__reply { margin-top: 10px; }
.acr-new { background: rgba(var(--palette-neutral-8, 0, 0, 0), .25); border-color: var(--communication-foreground, #0067b8); cursor: default; }

.acr-composer { position: relative; display: flex; flex-direction: column; gap: 6px; margin-top: 6px; }
.acr-composer__input {
    width: 100%;
    min-height: 64px;
    resize: vertical;
    font-family: inherit;
    font-size: 13px;
    line-height: 1.5;
    color: var(--text-primary-color, #242424);
    background: var(--background-color, #ffffff);
    border: 1px solid rgba(var(--palette-neutral-30, 200, 200, 200), 1);
    border-radius: 4px;
    padding: 8px;
}
.acr-composer__input:focus { outline: none; border-color: var(--communication-foreground, #0067b8); }
.acr-composer__actions { display: flex; align-items: center; gap: 8px; }
.acr-composer__spacer { flex: 1 1 auto; }
.acr-composer__hint { font-size: 12px; color: var(--text-secondary-color, #6b6b6b); }
.acr-composer__error { font-size: 12px; color: var(--status-error-text, #c4314b); }
.acr-composer__preview-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; color: var(--text-secondary-color, #6b6b6b); margin-top: 4px; }
.acr-composer__preview {
    font-size: 13px;
    border: 1px solid rgba(var(--palette-neutral-20, 224, 224, 224), .6);
    border-radius: 4px;
    padding: 8px 10px;
    background: rgba(var(--palette-neutral-4, 250, 250, 250), .4);
    max-height: 240px;
    overflow: auto;
}
.acr-composer__preview > :first-child { margin-top: 0; }
.acr-composer__preview > :last-child { margin-bottom: 0; }

.acr-btn {
    font-family: inherit;
    font-size: 12px;
    padding: 4px 10px;
    border-radius: 3px;
    border: 1px solid transparent;
    background: transparent;
    color: var(--communication-foreground, #0067b8);
    cursor: pointer;
}
.acr-btn:hover:not(:disabled) { background: rgba(var(--palette-neutral-8, 0, 0, 0), .25); }
.acr-btn:disabled { opacity: .5; cursor: default; }
.acr-btn--primary {
    background: var(--communication-background, #0067b8);
    border-color: var(--communication-background, #0067b8);
    color: #ffffff;
}
.acr-btn--primary:hover:not(:disabled) { background: var(--communication-foreground, #005a9e); }

.acr-select {
    font-family: inherit;
    font-size: 12px;
    padding: 4px 6px;
    border-radius: 3px;
    border: 1px solid transparent;
    background: transparent;
    color: var(--text-primary-color, #242424);
    cursor: pointer;
}
.acr-select:hover { border-color: rgba(var(--palette-neutral-30, 200, 200, 200), 1); background: rgba(var(--palette-neutral-8, 0, 0, 0), .2); }

.acr-comment__actions { display: flex; align-items: center; gap: 10px; margin-top: 4px; }
.acr-comment__confirm { font-size: 12px; color: var(--text-secondary-color, #6b6b6b); }
.acr-comment__edit { margin-top: 4px; }
.acr-linkbtn {
    background: none;
    border: none;
    padding: 0;
    font: inherit;
    font-size: 12px;
    color: var(--communication-foreground, #0067b8);
    cursor: pointer;
}
.acr-linkbtn:hover:not(:disabled) { text-decoration: underline; }
.acr-linkbtn:disabled { opacity: .5; cursor: default; }
.acr-linkbtn--danger { color: var(--status-error-text, #c4314b); }

.acr-mentions {
    list-style: none;
    margin: 0;
    padding: 4px;
    max-height: 220px;
    overflow: auto;
    border: 1px solid rgba(var(--palette-neutral-30, 200, 200, 200), 1);
    border-radius: 4px;
    background: var(--callout-background-color, var(--background-color, #ffffff));
    box-shadow: 0 4px 12px rgba(0, 0, 0, .18);
}
.acr-mentions__item { display: flex; flex-direction: row; align-items: center; gap: 8px; padding: 5px 8px; border-radius: 4px; cursor: pointer; }
.acr-mentions__item--active, .acr-mentions__item:hover { background: rgba(var(--palette-neutral-8, 0, 0, 0), .4); }
.acr-mentions__avatar { width: 24px; height: 24px; border-radius: 50%; flex: 0 0 auto; object-fit: cover; }
.acr-mentions__avatar--blank { background: rgba(var(--palette-neutral-20, 224, 224, 224), .8); }
.acr-mentions__text { display: flex; flex-direction: column; min-width: 0; }
.acr-mentions__name { font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.acr-mentions__mail { font-size: 11px; color: var(--text-secondary-color, #6b6b6b); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* Floating "add a comment" button shown on text selection */
.acr-sel-btn {
    position: fixed;
    z-index: 10;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    padding: 0;
    border-radius: 4px;
    border: 1px solid rgba(var(--palette-neutral-30, 200, 200, 200), 1);
    background: var(--callout-background-color, var(--background-color, #ffffff));
    color: var(--communication-foreground, #0067b8);
    cursor: pointer;
    box-shadow: 0 1px 5px rgba(0, 0, 0, .22);
}
.acr-sel-btn:hover { border-color: var(--communication-foreground, #0067b8); color: var(--communication-foreground, #0067b8); box-shadow: 0 2px 10px rgba(0, 0, 0, .3); }

/* Floating composer popover anchored near the selection */
.acr-popover {
    position: fixed;
    z-index: 10;
    width: 360px;
    max-width: calc(100vw - 24px);
    padding: 10px 12px;
    border-radius: 6px;
    border: 1px solid rgba(var(--palette-neutral-30, 200, 200, 200), 1);
    background: var(--callout-background-color, var(--background-color, #ffffff));
    box-shadow: 0 6px 20px rgba(0, 0, 0, .28);
}
.acr-popover__title { font-size: 12px; font-weight: 600; color: var(--text-secondary-color, #6b6b6b); margin-bottom: 4px; }

/* Toolbar (count + filters) — localized to the comment pane */
.acr-toolbar {
    position: sticky;
    top: 0;
    z-index: 5;
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    gap: 6px;
    padding: 8px 0;
    margin-bottom: 8px;
    background: var(--background-color, #ffffff);
    border-bottom: 1px solid rgba(var(--palette-neutral-20, 224, 224, 224), .5);
}
.acr-toolbar__count {
    flex: 0 1 auto;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 12px;
    color: var(--text-secondary-color, #6b6b6b);
}
.acr-toolbar__spacer { flex: 1 1 auto; min-width: 4px; }
.acr-filter {
    flex: 0 1 auto;
    min-width: 4.5em;
    font: inherit;
    font-size: 12px;
    padding: 3px 6px;
    border-radius: 3px;
    border: 1px solid rgba(var(--palette-neutral-30, 200, 200, 200), 1);
    background: var(--background-color, #ffffff);
    color: var(--text-primary-color, #242424);
    cursor: pointer;
}
.acr-filter:hover { border-color: var(--communication-foreground, #0067b8); }
.acr-filter:focus { outline: none; border-color: var(--communication-foreground, #0067b8); }
.acr-nav { display: inline-flex; flex: 0 0 auto; gap: 1px; }
.acr-nav .acr-iconbtn { width: 22px; height: 22px; }
.acr-iconbtn:disabled { opacity: .4; cursor: default; background: transparent; }

/* Collapse toggle */
.acr-card__bar { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
.acr-collapse {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    padding: 0;
    border: none;
    border-radius: 3px;
    background: transparent;
    color: var(--text-secondary-color, #6b6b6b);
    cursor: pointer;
}
.acr-collapse:hover { background: rgba(var(--palette-neutral-8, 0, 0, 0), .3); }
.acr-collapse--closed { transform: rotate(-90deg); }
.acr-card__summary { font-size: 12px; color: var(--text-secondary-color, #6b6b6b); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.acr-card--collapsed { padding-bottom: 8px; }

/* Reactions (likes) */
.acr-comment__reactions { margin-top: 6px; }
.acr-like {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font: inherit;
    font-size: 12px;
    padding: 2px 8px;
    border: 1px solid rgba(var(--palette-neutral-30, 200, 200, 200), 1);
    border-radius: 12px;
    background: transparent;
    color: var(--text-secondary-color, #6b6b6b);
    cursor: pointer;
}
.acr-like:hover:not(:disabled) { background: rgba(var(--palette-neutral-8, 0, 0, 0), .2); }
.acr-like--on { color: var(--communication-foreground, #0067b8); border-color: var(--communication-foreground, #0067b8); }
.acr-like__count { font-weight: 600; }
.acr-comment__error { margin-top: 6px; font-size: 12px; color: var(--status-error-text, #c4314b); }
`;
