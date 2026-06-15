/** True if an `rgb()/rgba()` color string is "dark" (relative luminance < 0.5). */
export function isDarkColor(color: string): boolean {
    const match = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(color);
    if (!match) {
        return false;
    }
    const r = Number(match[1]) / 255;
    const g = Number(match[2]) / 255;
    const b = Number(match[3]) / 255;
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return luminance < 0.5;
}
