// Matching scanned / typed codes (barcodes, order numbers, serials) against
// records. Case, spaces and separators are ignored: "FP-BLK 001" = "fpblk001".
export const cleanCode = (v) =>
  String(v ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s\-_./:#]/g, '');

// Scanned / typed text vs. serial numbers. Ignores case and separators, and
// also hits when the scan carries extra text around the serial ("S/N: 123",
// barcode prefix / check digit) or is only part of it.
export const serialMatches = (code, ...serials) => {
  const c = cleanCode(code);
  if (!c) return false;
  return serials.flat().some((s) => {
    const v = cleanCode(s);
    if (!v) return false;
    if (v === c || v.includes(c)) return true;
    return v.length >= 4 && c.includes(v);
  });
};

// Serials of a repair ticket (device_serials from the API, or parsed from the
// "Brand Model (SN)" summary of older backends).
export const repairSerials = (r) =>
  r.device_serials
    ? String(r.device_serials).split(', ')
    : [...String(r.device_summary || '').matchAll(/\(([^)]*)\)/g)].map((m) => m[1]);

export const codeMatches = (code, ...fields) => {
  const c = cleanCode(code);
  return !!c && fields.some((f) => cleanCode(f) === c);
};

// Part whose order number (SKU) or article id is the scanned code. Falls back
// to a single part whose code is contained in the scanned one (barcodes often
// carry a prefix / check digit around the supplier's number).
export const findPartByCode = (parts, code) => {
  const list = parts || [];
  const exact = list.find((p) => codeMatches(code, p.sku, p.article_id));
  if (exact) return exact;
  const c = cleanCode(code);
  if (c.length < 4) return null;
  const partial = list.filter((p) =>
    [p.sku, p.article_id].some((f) => {
      const v = cleanCode(f);
      return v.length >= 4 && c.includes(v);
    }),
  );
  return partial.length === 1 ? partial[0] : null;
};
