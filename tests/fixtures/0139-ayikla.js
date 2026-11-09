// Spec 0139 kıyas ayıklaması (iki taraf da): A-R12/2 sipariş ihtiyacının boy adedi fire uyarısının METNİNİ değiştirir (kilogram
// fireyi de anar), kıyas uyarının VARLIĞINI karşılaştırır; `ekFireKg` bu spec'in eklediği yeni alandır (tablosuz veride 0).
export const ayikla0139 = (x) => (Array.isArray(x) ? x.map(ayikla0139) : x && typeof x === "object"
  ? Object.fromEntries(Object.entries(x).filter(([k]) => k !== "ekFireKg").map(([k, v]) => [k, k === "fireUyarisi" ? (v ? true : null) : ayikla0139(v)]))
  : x);
