import type { JSX } from 'solid-js';

interface IconProps {
    size?: number;
}

function svg(path: string, size: number): JSX.Element {
    return (
        <svg viewBox="0 0 16 16" width={size} height={size} aria-hidden="true">
            <path fill="currentColor" d={path} />
        </svg>
    );
}

const COMMENT =
    'M8 2C4.13 2 1 4.46 1 7.5c0 1.64.92 3.11 2.36 4.1-.1.86-.43 1.66-.95 2.32-.14.18 0 .43.22.4 1.3-.13 2.49-.6 3.49-1.32.6.13 1.24.2 1.88.2C11.87 13 15 10.54 15 7.5S11.87 2 8 2z';
const PENCIL =
    'M11.7 2a1 1 0 0 1 .7.3l1.3 1.3a1 1 0 0 1 0 1.4l-7.7 7.7-3.2.8a.5.5 0 0 1-.6-.6l.8-3.2 7.7-7.7a1 1 0 0 1 .7-.3zm0 1.4L4.6 10.5l-.5 1.9 1.9-.5L13.1 4.8 11.7 3.4z';
const TRASH =
    'M6.5 2h3a1 1 0 0 1 1 1v.5H13a.5.5 0 0 1 0 1h-.6l-.5 8.1a1.5 1.5 0 0 1-1.5 1.4H5.6a1.5 1.5 0 0 1-1.5-1.4L3.6 4.5H3a.5.5 0 0 1 0-1h2.5V3a1 1 0 0 1 1-1zm0 1.5h3V3h-3v.5zM5.1 4.5l.5 8a.5.5 0 0 0 .5.5h4.8a.5.5 0 0 0 .5-.5l.5-8H5.1z';
const LINK =
    'M6.4 9.6a.75.75 0 0 0 1.06 0l3-3a.75.75 0 0 0-1.06-1.06l-3 3a.75.75 0 0 0 0 1.06zM5 11a1.5 1.5 0 0 1-2.12-2.12l1.6-1.6a.75.75 0 0 0-1.06-1.06l-1.6 1.6a3 3 0 0 0 4.24 4.24l1.6-1.6a.75.75 0 1 0-1.06-1.06L5 11zm6-6a1.5 1.5 0 0 1 2.12 2.12l-1.6 1.6a.75.75 0 1 0 1.06 1.06l1.6-1.6a3 3 0 0 0-4.24-4.24l-1.6 1.6A.75.75 0 0 0 9.4 5.6L11 4z';
const LIKE =
    'M6.3 14H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h2.3v7zm1.2-7.6 2-3.6a.8.8 0 0 1 1.5.4V6h2.4a1.2 1.2 0 0 1 1.18 1.42l-.86 4.6A1.5 1.5 0 0 1 12.24 13.2H7.5V6.4z';
const CHEVRON = 'M4 6h8l-4 5z';
const CHEVRON_DOWN =
    'M3.2 5.7a1 1 0 0 1 1.4 0L8 9.1l3.4-3.4a1 1 0 1 1 1.4 1.4l-4.1 4.1a1 1 0 0 1-1.4 0L3.2 7.1a1 1 0 0 1 0-1.4z';
const CHEVRON_UP =
    'M3.2 10.3a1 1 0 0 0 1.4 0L8 6.9l3.4 3.4a1 1 0 0 0 1.4-1.4L8.7 4.8a1 1 0 0 0-1.4 0L3.2 8.9a1 1 0 0 0 0 1.4z';

export function CommentIcon(props: IconProps): JSX.Element {
    return svg(COMMENT, props.size ?? 16);
}

export function EditIcon(props: IconProps): JSX.Element {
    return svg(PENCIL, props.size ?? 16);
}

export function DeleteIcon(props: IconProps): JSX.Element {
    return svg(TRASH, props.size ?? 16);
}

export function LinkIcon(props: IconProps): JSX.Element {
    return svg(LINK, props.size ?? 16);
}

export function LikeIcon(props: IconProps): JSX.Element {
    return svg(LIKE, props.size ?? 16);
}

export function ChevronIcon(props: IconProps): JSX.Element {
    return svg(CHEVRON, props.size ?? 16);
}

export function ChevronUpIcon(props: IconProps): JSX.Element {
    return svg(CHEVRON_UP, props.size ?? 16);
}

export function ChevronDownIcon(props: IconProps): JSX.Element {
    return svg(CHEVRON_DOWN, props.size ?? 16);
}
