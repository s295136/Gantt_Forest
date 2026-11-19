export function formatDateISO(date) {
    if (!(date instanceof Date) || isNaN(date)) date = new Date();
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

export function parseDate(dateStr) {
    if (!dateStr) return new Date();
    const str = String(dateStr).replace(/\//g, '-').trim();
    const parts = str.split('-');
    if (parts.length === 3) {
        const y = parseInt(parts[0]);
        const m = parseInt(parts[1]) - 1;
        const d = parseInt(parts[2]);
        const parsed = new Date(y, m, d);
        if (!isNaN(parsed.getTime())) return parsed;
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? new Date() : d;
}

export function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + parseInt(days));
    return result;
}

export function diffDays(d1, d2) {
    return Math.round((d1.getTime() - d2.getTime()) / (1000 * 3600 * 24));
}
