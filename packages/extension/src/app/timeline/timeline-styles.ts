// Styles for the timeline filter tabs' Shadow DOM island. Colors use ADO's own
// theme CSS custom properties (which inherit through the shadow boundary) so the
// tabs match ADO's light/dark theme; the literal values are fallbacks only.
export const timelineStyles = `
* { box-sizing: border-box; }
.act-tabs {
    display: flex;
    align-items: center;
    gap: 2px;
    font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
}
.act-tab {
    appearance: none;
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    color: var(--text-secondary-color, #6b6b6b);
    font-size: 13px;
    font-weight: 600;
    padding: 6px 10px 7px;
    margin: 0;
    cursor: pointer;
    white-space: nowrap;
    line-height: 1.3;
    border-radius: 2px 2px 0 0;
}
.act-tab:hover {
    color: var(--text-primary-color, #242424);
    background: rgba(var(--palette-neutral-8, 0, 0, 0), .5);
}
.act-tab:focus-visible {
    outline: 1px solid var(--communication-foreground, #0078d4);
    outline-offset: -2px;
}
.act-tab--active {
    color: var(--communication-foreground, #0078d4);
    border-bottom-color: var(--communication-foreground, #0078d4);
}
.act-tab__count {
    margin-left: 5px;
    font-weight: 400;
    opacity: .65;
}
`;
