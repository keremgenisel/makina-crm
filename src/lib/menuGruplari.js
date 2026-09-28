// Spec 0043: kenar çubuğunda menü grupları. Grup yalnız çizim katmanıdır: sekme kimlikleri, adları ve yetkiler
// değişmez (C1, C2); görünürlük zaten süzülmüş `visibleTabs` üzerinden türetilir.
// Kural (R11, docs/tasarim-sozlugu.md): menüde grup, aynı soruyu cevaplayan en az üç ekran biriktiğinde açılır.
export const MENU_GRUPLARI = [
  { id: "mali", label: "Mali İşler", icon: "mali", cocuklar: ["finance", "gider", "kasa"] },
];

export const MALI_ISLER_ANAHTARI = "maliIslerAcik"; // R4: makineye özel görünüm tercihi (localStorage)

// Menü satırları: { tur: "sekme", sekme } | { tur: "grup", grup, cocuklar: [sekme] }.
// R7: süzülmüş listede gruptan tek ekran kalırsa grup çizilmez, ekran düz satır olur; hiç kalmazsa grup yoktur.
// R8: dar kipte grup çizilmez. Grup, ilk çocuğunun menüdeki yerinde durur; çocuklar grup tanımındaki sırayla gelir.
export const menuSatirlari = (sekmeler = [], gruplar = MENU_GRUPLARI, { dar = false } = {}) => {
  const grupOf = new Map();
  if (!dar) {
    for (const g of gruplar) {
      const cocuklar = g.cocuklar.map(id => sekmeler.find(t => t.id === id)).filter(Boolean);
      if (cocuklar.length >= 2) for (const c of cocuklar) grupOf.set(c.id, { grup: g, cocuklar });
    }
  }
  const satirlar = [];
  const cizilen = new Set();
  for (const t of sekmeler) {
    const b = grupOf.get(t.id);
    if (!b) { satirlar.push({ tur: "sekme", sekme: t }); continue; }
    if (cizilen.has(b.grup.id)) continue;
    cizilen.add(b.grup.id);
    satirlar.push({ tur: "grup", grup: b.grup, cocuklar: b.cocuklar });
  }
  return satirlar;
};

// Açık ekran bu grubun içinde mi (R3, R6).
export const grupIcindeMi = (grup, tab) => grup.cocuklar.includes(tab);
