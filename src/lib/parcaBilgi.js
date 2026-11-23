// Spec 0158 A: parçanın üç bilgi alanı (ölçü, hammadde, cins). Yalnız bilgidir: maliyete, fiyata, sipariş adedine, stoğa ve hiçbir
// hesaba girmez (R3). Yaprak modül: hiçbir şey içe almaz. Ad tuzağı (C3/2, C4): `hammadde` tedarikçinin boolean bayrağıdır,
// `hammaddeler` eski maliyet kırılımıdır, `tip` parça tipi tanımlarına bağlıdır; bu alanlar onlardan ayrıdır.
export const PARCA_BILGI_ALANLARI = Object.freeze([
  Object.freeze({ alan: "olcu", etiket: "Ölçü", arama: "ölçü", ornek: "Örn: M8 × 40" }),
  Object.freeze({ alan: "hammaddeAdi", etiket: "Hammadde", arama: "hammadde", ornek: "Örn: Paslanmaz A2" }),
  Object.freeze({ alan: "cins", etiket: "Cins", arama: "cins", ornek: "Örn: DIN 933 cıvata" }),
]);
const AL = PARCA_BILGI_ALANLARI;
// C11/2: değer kırpılır, uzunluk sınırı yok.
export const bilgiDegeri = (v) => (v == null ? "" : String(v).trim());
// R2, R2/2 (AC-2, AC-70): tek yazıcı. Üç alan her çağrıda silinir, kırpılır ve yalnız doluyken yazılır.
export const parcaBilgiYaz = (kayit) => {
  const g = { ...kayit };
  for (const { alan } of AL) { const t = bilgiDegeri(g[alan]); delete g[alan]; if (t) g[alan] = t; }
  return g;
};
// R5/2: dolu alanlar ölçü, hammadde, cins sırasıyla (etiketsiz).
export const parcaBilgiDegerleri = (p) => AL.map(a => bilgiDegeri(p?.[a.alan])).filter(Boolean);
// R37, R37/2 (AC-49, AC-50, AC-69): Excel içe aktarması. Dolu hücre üzerine yazar, boş hücre kayıtlı değere düşer; ikisi de boşsa
// anahtar hiç yazılmaz. Dönüş yalnız dolu alanları taşır (uygulama kolu `{ ...x, ...guncel }` olduğu için yokluk korur).
export const parcaBilgiHucreleri = (hucreler, mevcut) => {
  const g = {};
  AL.forEach(({ alan }, i) => { const t = bilgiDegeri(hucreler[i]) || bilgiDegeri(mevcut?.[alan]); if (t) g[alan] = t; });
  return g;
};
