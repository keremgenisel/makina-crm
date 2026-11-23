// Spec 0158 triyaj (bulgu 1): belgede ölçü başına alt satıra bölünmüş parça (öteki hücreler rowspan) testlerde tek mantıksal satıra
// birleştirilir; bölünen hücreler (Ölçü, Sipariş adedi) `<br>` ile birleşir. Tablo gövdesini (`<tr>`'ler) alır, hücre dizileri döndürür.
export const birlesikSatirlar = (t) => {
  const ham = [...t.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map(m => [...m[1].matchAll(/<td([^>]*)>([\s\S]*?)<\/td>/g)]
    .map(c => ({ rs: +(c[1].match(/rowspan="(\d+)"/)?.[1] || 1), h: c[2] }))).filter(r => r.length);
  const out = [];
  for (let i = 0; i < ham.length; i++) {
    const r = ham[i]; const k = Math.max(...r.map(c => c.rs));
    const bolunen = r.map((c, j) => (c.rs === 1 ? j : -1)).filter(j => j >= 0);
    const hucreler = r.map(c => c.h);
    for (let d = 1; d < k; d++) ham[i + d].forEach((c, j) => { hucreler[bolunen[j]] += `<br>${c.h}`; });
    out.push(hucreler); i += k - 1;
  }
  return out;
};
