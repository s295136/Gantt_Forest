export function parseRawProgress(val) {
    if (val === null || val === undefined || val === '') return 0;
    let num = parseFloat(val);
    if (isNaN(num)) return 0;
    if (num <= 1 && num > 0) {
        num = num * 100;
    }
    return Math.min(100, Math.max(0, Math.round(num)));
}
