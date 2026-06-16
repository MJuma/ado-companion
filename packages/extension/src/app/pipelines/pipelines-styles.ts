// Styles for the Pipelines tab's Shadow DOM island. Text/surfaces use ADO's own
// theme CSS custom properties (which inherit through the shadow boundary) for
// automatic light/dark theming; status colors are semantic (fixed) so red/green/
// blue read consistently in both themes. Literal values are fallbacks.
export const pipelinesStyles = `
* { box-sizing: border-box; }
.pl {
    font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
    color: var(--text-primary-color, #242424);
    padding: 16px 24px 32px;
    display: flex;
    flex-direction: column;
    gap: 20px;
}
.pl__msg {
    color: var(--text-secondary-color, #6b6b6b);
    font-size: 13px;
    margin: 4px 0;
}
.pl__msg--error { color: var(--status-error-text, #cd4a45); }

.pl__toolbar {
    display: flex;
    align-items: center;
    gap: 12px;
}
.pl__refresh {
    appearance: none;
    border: 1px solid rgba(var(--palette-neutral-30, 150, 150, 150), .7);
    background: rgba(var(--palette-neutral-4, 0, 0, 0), .4);
    color: var(--text-primary-color, #242424);
    font: inherit;
    font-size: 12px;
    padding: 4px 12px;
    border-radius: 4px;
    cursor: pointer;
}
.pl__refresh:hover:not(:disabled) { background: rgba(var(--palette-neutral-8, 0, 0, 0), .6); }
.pl__refresh:disabled { opacity: .6; cursor: default; }
.pl__updated { font-size: 12px; color: var(--text-secondary-color, #6b6b6b); }

.pl__build {
    border: 1px solid rgba(var(--palette-neutral-20, 200, 200, 200), .6);
    border-radius: 4px;
    background: rgba(var(--palette-neutral-2, 0, 0, 0), .35);
}
.pl__build-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 14px;
    border-bottom: 1px solid rgba(var(--palette-neutral-20, 200, 200, 200), .5);
}
.pl__build-title { font-size: 13px; font-weight: 600; margin: 0; }
.pl__build-link {
    font-size: 12px;
    color: var(--communication-foreground, #0078d4);
    text-decoration: none;
    white-space: nowrap;
}
.pl__build-link:hover { text-decoration: underline; }

.pl__stage {
    padding: 12px 14px;
    border-bottom: 1px solid rgba(var(--palette-neutral-16, 220, 220, 220), .4);
}
.pl__stage:last-child { border-bottom: none; }
.pl__stage-head {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
}
.pl__stage-name { font-size: 13px; font-weight: 600; }
.pl__stage-count {
    font-size: 11px;
    color: var(--text-secondary-color, #6b6b6b);
    background: rgba(var(--palette-neutral-8, 0, 0, 0), .55);
    border-radius: 9px;
    padding: 1px 7px;
}
.pl__jobs {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding-left: 26px;
}

.pl-dot {
    flex: 0 0 auto;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 700;
    line-height: 1;
    color: #fff;
    text-decoration: none;
}
a.pl-dot { cursor: pointer; }
a.pl-dot:hover { box-shadow: 0 0 0 2px var(--communication-foreground, #0078d4); }
a.pl-dot:focus-visible {
    outline: 2px solid var(--communication-foreground, #0078d4);
    outline-offset: 1px;
}
.pl-dot__glyph { transform: translateY(-0.5px); }
.pl-dot--succeeded { background: #2da44e; }
.pl-dot--failed { background: #d1453b; }
.pl-dot--warning { background: #bf8700; }
.pl-dot--skipped { background: #6e7781; }
.pl-dot--canceled { background: #57606a; }
.pl-dot--pending {
    background: transparent;
    border: 2px solid rgba(var(--palette-neutral-30, 150, 150, 150), .8);
}
.pl-dot--running {
    background: #0969da;
    position: relative;
}
.pl-dot--running::after {
    content: "";
    position: absolute;
    inset: -3px;
    border-radius: 50%;
    border: 2px solid transparent;
    border-top-color: #0969da;
    animation: pl-spin 0.9s linear infinite;
}
@keyframes pl-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) {
    .pl-dot--running::after { animation: none; }
}
`;
