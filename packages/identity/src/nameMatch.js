export function normalizeName(name) {
    return name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s]/g, "")
        .trim();
}
export function trigramSimilarity(a, b) {
    const triA = trigrams(normalizeName(a));
    const triB = trigrams(normalizeName(b));
    if (triA.size === 0 && triB.size === 0)
        return 1;
    if (triA.size === 0 || triB.size === 0)
        return 0;
    let intersection = 0;
    for (const t of triA) {
        if (triB.has(t))
            intersection++;
    }
    return (2 * intersection) / (triA.size + triB.size);
}
function trigrams(s) {
    const padded = ` ${s} `;
    const result = new Set();
    for (let i = 0; i < padded.length - 2; i++) {
        result.add(padded.slice(i, i + 3));
    }
    return result;
}
//# sourceMappingURL=nameMatch.js.map