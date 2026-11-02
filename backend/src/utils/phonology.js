// Criterio escrito y versionado para contar fenómenos fonológicos (se reporta tal cual en el artículo).
// Una entrada puede tener varios fenómenos. Se mide sobre la grafía normalizada, no sobre la pronunciación.
//   glotalizada: ch', p', t', k' o q'
//   aspirada:    chh, ph, th, kh o qh
//   uvular:      cualquier q (simple, glotalizada o aspirada)
const RULES = {
  glotalizada: /(ch|p|t|k|q)'/,
  aspirada: /(chh|ph|th|kh|qh)/,
  uvular: /q/,
};

export const PHENOMENA = Object.keys(RULES);

// Misma normalización que tools/tts/generate_audio.py (casos compartidos en tools/tts/audio_key_vectors.json)
export const audioKey = (text) =>
  String(text ?? '')
    .normalize('NFC')
    .toLowerCase()
    .replace(/[’‘´`ʼ]/g, "'")
    .replace(/\(.*?\)/g, ' ')
    .replace(/[.,;:!?¡¿"“”«»]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const phenomenaOf = (text) => {
  const key = audioKey(text);
  return PHENOMENA.filter((name) => RULES[name].test(key));
};

// Alfa de Krippendorff para datos ordinales. unidades = [{ evaluador: puntaje }, ...]
// Devuelve null si no hay al menos dos valores distintos o ninguna unidad con dos juicios.
export const krippendorffAlpha = (units, metric = 'ordinal') => {
  const coincidence = new Map();
  const add = (c, k, w) => {
    const id = `${c}|${k}`;
    coincidence.set(id, (coincidence.get(id) ?? 0) + w);
  };
  for (const unit of units) {
    const values = Object.values(unit).filter((v) => v !== null && v !== undefined);
    if (values.length < 2) continue;
    values.forEach((c, i) => values.forEach((k, j) => i !== j && add(c, k, 1 / (values.length - 1))));
  }

  const totals = new Map();
  for (const [id, w] of coincidence) {
    const c = Number(id.split('|')[0]);
    totals.set(c, (totals.get(c) ?? 0) + w);
  }
  const levels = [...totals.keys()].sort((a, b) => a - b);
  const n = [...totals.values()].reduce((a, b) => a + b, 0);
  if (n === 0 || levels.length < 2) return null;

  const distance = (c, k) => {
    if (metric === 'interval') return (c - k) ** 2;
    const [lo, hi] = c < k ? [c, k] : [k, c];
    const between = levels.filter((v) => v >= lo && v <= hi).reduce((sum, v) => sum + totals.get(v), 0);
    return (between - (totals.get(lo) + totals.get(hi)) / 2) ** 2;
  };

  let observed = 0;
  let expected = 0;
  for (const c of levels) {
    for (const k of levels) {
      if (c >= k) continue;
      observed += (coincidence.get(`${c}|${k}`) ?? 0) * distance(c, k);
      expected += totals.get(c) * totals.get(k) * distance(c, k);
    }
  }
  return 1 - (n - 1) * (observed / expected);
};
