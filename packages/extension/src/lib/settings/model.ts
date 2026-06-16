// Settings model for ADO Companion. Each user-facing feature has its own
// enable toggle (under a master switch), plus per-feature configuration.

/** Stable id for a toggleable content feature. */
export type FeatureId = 'review' | 'timeline' | 'pipelines';

export interface FeatureMeta {
    id: FeatureId;
    label: string;
    description: string;
}

/** Display metadata for the per-feature toggles (drives the options UI). */
export const FEATURES: readonly FeatureMeta[] = [
    {
        id: 'review',
        label: 'PR Markdown Review',
        description:
            'Adds a "Review" view to pull request Markdown files — rendered doc with a comment rail synced to native ADO threads.',
    },
    {
        id: 'timeline',
        label: 'PR Activity Filter',
        description:
            'Adds filter tabs (Actions / Commits / Comments / System Messages) to the pull request Overview activity feed.',
    },
    {
        id: 'pipelines',
        label: 'PR Pipelines Tab',
        description:
            'Adds a "Pipelines" tab beside Overview showing build stage and job status, and hides any PR tabs you list below.',
    },
];

export interface CompanionSettings {
    /** Master on/off switch for every ADO Companion enhancement. */
    enabled: boolean;
    /**
     * Optional host/org allowlist. Empty (the default) means every matched
     * Azure DevOps host is allowed; otherwise the URL's `host` + path must
     * contain one of these entries (e.g. `dev.azure.com`, an org name, or
     * `myorg.visualstudio.com`).
     */
    allowlist: string[];
    /** Per-feature enable toggles. */
    features: Record<FeatureId, boolean>;
    /**
     * Pull request tab labels to hide from the tab strip (case-insensitive,
     * exact match on the visible label). Applied by the Pipelines feature, so it
     * requires `features.pipelines`. "Overview" is never hidden.
     */
    hiddenPrTabs: string[];
}

export const DEFAULT_SETTINGS: CompanionSettings = {
    enabled: true,
    allowlist: [],
    features: { review: true, timeline: true, pipelines: true },
    hiddenPrTabs: [],
};

/**
 * Whether a given feature should run: the master switch must be on and the
 * feature's own toggle must be on. (The storage migration ensures every known
 * feature key is present, defaulting to on.)
 */
export function featureEnabled(settings: CompanionSettings, id: FeatureId): boolean {
    return settings.enabled && settings.features[id];
}

/** Settings shape stored before per-feature toggles existed (storage version 1). */
export interface LegacySettings {
    enabled?: boolean;
    allowlist?: string[];
}

/**
 * Upgrade v1 settings (`{ enabled, allowlist }`) to the current shape: enable
 * every feature (preserving prior behavior where everything ran) and start with
 * no hidden tabs, keeping the user's existing master switch + allowlist.
 */
export function migrateToV2(old: LegacySettings | null): CompanionSettings {
    return {
        enabled: old?.enabled ?? DEFAULT_SETTINGS.enabled,
        allowlist: old?.allowlist ?? [],
        features: { ...DEFAULT_SETTINGS.features },
        hiddenPrTabs: [],
    };
}
