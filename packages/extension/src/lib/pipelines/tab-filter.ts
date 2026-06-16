// Pure matching logic for the "hide PR tabs" setting. The enhancer reads the
// visible tab labels from the DOM and the user's hide-list from settings; this
// module decides which to hide so the rule is unit-testable.

const NEVER_HIDDEN = new Set(['overview']);

/**
 * Whether a pull request tab labelled `label` should be hidden given the user's
 * `hidden` list. Matching is case-insensitive and trimmed on both sides;
 * "Overview" (and blank labels) are never hidden.
 */
export function shouldHideTab(label: string, hidden: readonly string[]): boolean {
    const target = label.trim().toLowerCase();
    if (target.length === 0 || NEVER_HIDDEN.has(target)) {
        return false;
    }
    return hidden.some((entry) => entry.trim().toLowerCase() === target);
}
