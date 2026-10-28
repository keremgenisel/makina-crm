// Spec 0115: kalıp revize parçalarının bir kerelik tip göçünün saf çekirdeği (Karar 49, 59).
// db.cjs paketlenmiş uygulamada src/'yi okuyamadığı için (build.files yalnız dist/** ve electron/**) bu modül electron/
// altındadır; db.cjs require(esm) ile, renderer (src/lib/kalipTamiri.js) doğrudan içe aktarır (kasaGocuSaf.mjs emsali).
// Parça adı deseni YALNIZ burada yazılır (C14): iki çağıranı göç ve parça kartının ipucusudur (R6/2). Ekran, motor ve
// doğrulama ad metnine bakmaz (C8).

const trKucuk = (s) => String(s ?? "").toLocaleLowerCase("tr");

// "KALIP" ve "REVİZE" birlikte geçen, kalıp mili / kalıp rulmanı / kalıp yatağı olmayan ad (R4, R4/3). Katlama Türkçe
// küçültmeyle; ASCII "i" ile yazılmış "kalip" de kabul edilir.
export function kalipAdDeseni(ad) {
  const a = trKucuk(ad);
  if (!/kal[ıi]p/.test(a) || !/rev[iı]ze/.test(a)) return false;
  return !/kal[ıi]p\s*(mil|rulman|yata[ğg])/.test(a);
}

export const GOC_TIP_ADI = "Kalıp Revize";
// src/lib/constants.js PART_TYPE_PALETTE_KEYS'in kopyası; eşitlik tests/kalip-tamiri-0115.test.js ile sabittir.
export const PALET_ANAHTARLARI = ["blu", "grn", "amb", "pur", "teal", "red"];

// Göç planı (R4/2, R4/3, Karar 49). partTypeDefs meta satırının ayrıştırılmış hâli (satır yoksa null), parts canlı ve
// çöpteki parça satırları ({id, ad, tip, deletedAt}). Dönüş:
//   { yaz: false }                      satır yok ya da liste boş: hiçbir şey yazılmaz, bayrak da yazılmaz.
//   { yaz: true, tipler: null, parcalar: [] }  aynı adda tip zaten var: yalnız bayrak yazılır.
//   { yaz: true, tipler: [...eski, yeni], parcalar: [id...] }
export function kalipTamiriGocPlani(partTypeDefs, parts, { simdi = Date.now(), paletAnahtarlari = PALET_ANAHTARLARI } = {}) {
  if (!Array.isArray(partTypeDefs) || partTypeDefs.length === 0) return { yaz: false };
  if (partTypeDefs.some(t => trKucuk(t?.ad) === trKucuk(GOC_TIP_ADI))) return { yaz: true, tipler: null, parcalar: [] };
  const kullanici = partTypeDefs.filter(t => !t?.sistem).length;
  const yeni = {
    id: `tip_${simdi}`, ad: GOC_TIP_ADI, renk: paletAnahtarlari[kullanici % paletAnahtarlari.length],
    makinaSecici: false, stokDus: false, raporGoster: false, kalipIsi: true, sistem: false,
  };
  const parcalar = (parts || [])
    .filter(p => !p.deletedAt && (!p.tip || p.tip === "Standart") && kalipAdDeseni(p.ad))
    .map(p => p.id);
  return { yaz: true, tipler: [...partTypeDefs, yeni], parcalar };
}
