// Turns OCR lines from a photo of a type plate / label into likely serial
// numbers, best first. Labels like "S/N:", "Serial No." are stripped; a
// candidate needs at least one digit and 4+ characters.
const LABEL_RE = /^(s\s*\/\s*n|sn|ser(ial)?\.?\s*(no|nr|number|num)?\.?|seriennummer|serien-?nr\.?|no\.?|nr\.?)\s*[:#.\-]?\s*/i;

const clean = (s) => s.replace(/[|“”"'`´]/g, '').trim();

export const serialCandidates = (lines) => {
  const seen = new Set();
  const scored = [];
  const add = (value, bonus) => {
    const v = clean(value).replace(/\s+/g, ' ');
    if (v.length < 4 || v.length > 40 || !/\d/.test(v) || seen.has(v.toUpperCase())) return;
    seen.add(v.toUpperCase());
    // Prefer compact alphanumeric tokens that mix letters and digits.
    let score = bonus;
    if (!/\s/.test(v)) score += 3;
    if (/[A-Z]/i.test(v) && /\d/.test(v)) score += 2;
    if (/^[A-Z0-9\-/.]+$/i.test(v)) score += 2;
    if (v.length >= 6 && v.length <= 20) score += 1;
    // Electrical ratings / weights on the same plate are not serials.
    if (/^[\d.,/~\-]+\s*(v|vac|hz|w|va|a|ma|kg|g|mm|cm)~?$/i.test(v)) score -= 6;
    scored.push({ value: v, score });
  };

  for (const raw of lines || []) {
    for (const line of String(raw).split(/\n/)) {
      const text = clean(line);
      if (!text) continue;
      const hasLabel = LABEL_RE.test(text) && /s\s*\/?\s*n|ser/i.test(text);
      const stripped = text.replace(LABEL_RE, '');
      add(stripped, hasLabel ? 10 : 0);
      for (const token of stripped.split(/[\s,;]+/)) add(token, hasLabel ? 8 : 0);
    }
  }
  return scored.sort((a, b) => b.score - a.score).map((c) => c.value);
};
