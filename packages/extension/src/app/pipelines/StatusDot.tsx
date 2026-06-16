import { Dynamic } from 'solid-js/web';

import type { PipelineStatus } from '../../lib/pipelines/timeline';

const GLYPH: Record<PipelineStatus, string> = {
    succeeded: '✓',
    failed: '✕',
    warning: '!',
    skipped: '–',
    canceled: '–',
    running: '',
    pending: '',
};

const LABEL: Record<PipelineStatus, string> = {
    succeeded: 'Succeeded',
    failed: 'Failed',
    warning: 'Succeeded with issues',
    skipped: 'Skipped',
    canceled: 'Canceled',
    running: 'Running',
    pending: 'Not started',
};

interface StatusDotProps {
    status: PipelineStatus;
    /** Optional name (a job/stage) for the tooltip + accessible label. */
    label?: string;
    /** When set, the dot is a link (deep link into the pipeline results page). */
    href?: string;
}

/** A colored status circle for a stage or job (mirrors ADO's pipeline glyphs). */
export function StatusDot(props: StatusDotProps) {
    const tooltip = (): string =>
        props.label ? `${props.label} — ${LABEL[props.status]}` : LABEL[props.status];

    return (
        <Dynamic
            component={props.href ? 'a' : 'span'}
            class={`pl-dot pl-dot--${props.status}`}
            href={props.href}
            target={props.href ? '_blank' : undefined}
            rel={props.href ? 'noreferrer' : undefined}
            title={tooltip()}
            aria-label={tooltip()}
            role={props.href ? undefined : 'img'}
        >
            <span class="pl-dot__glyph" aria-hidden="true">
                {GLYPH[props.status]}
            </span>
        </Dynamic>
    );
}
