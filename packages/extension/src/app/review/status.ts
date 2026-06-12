// Shared status labels + options for thread status controls and filters.

import { ThreadStatus } from '../../lib/ado/pr-types';

export const STATUS_LABELS: Record<string, string> = {
    active: 'Active',
    fixed: 'Resolved',
    wontFix: "Won't fix",
    closed: 'Closed',
    byDesign: 'By design',
    pending: 'Pending',
    unknown: '',
};

/** Statuses a reviewer can set a thread to (excludes transient Pending/Unknown). */
export const STATUS_OPTIONS: { value: ThreadStatus; label: string }[] = [
    { value: ThreadStatus.Active, label: 'Active' },
    { value: ThreadStatus.Fixed, label: 'Resolved' },
    { value: ThreadStatus.WontFix, label: "Won't fix" },
    { value: ThreadStatus.Closed, label: 'Closed' },
    { value: ThreadStatus.ByDesign, label: 'By design' },
];
