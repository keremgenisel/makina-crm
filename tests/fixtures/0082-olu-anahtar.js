// Spec 0082 C1/2 (plan P2): makina maliyeti motorunun standart dalıyla düşen ölü anahtarları. Önce/sonra karşılaştırmaları
// (0082 AC-8, 0076 AC-36) iki tarafa aynı ayıklamayı uygular.
// C1/2, plan P2: standart dalıyla düşen ölü anahtarlar. Ada göre, özyinelemeli; ayıklanan her değer beklenen biçimde olmalı.
export const OLU_ANAHTARLAR = ["kaynak", "ortakStandart", "standartEksik", "standartFark"];
export const OLU_BICIM = {
  kaynak: (v) => v === "gercek" || v === "standart",
  ortakStandart: (v) => Number.isInteger(v),
  // Ay kaydında gerçekleşen kipte de dolu olabiliyordu (sürümü olmayan standart grupların adları, ör. ["Su"]); özette [].
  standartEksik: (v) => Array.isArray(v) && v.every(x => typeof x === "string" || (x && typeof x.ay === "string")),
  standartFark: (v) => v === null,
};
export const ayikla = (x, ayiklananlar = []) => {
  if (Array.isArray(x)) return x.map(e => ayikla(e, ayiklananlar));
  if (x && typeof x === "object") {
    const r = {};
    for (const [k, v] of Object.entries(x)) {
      if (OLU_ANAHTARLAR.includes(k)) { ayiklananlar.push([k, v]); continue; }
      r[k] = ayikla(v, ayiklananlar);
    }
    return r;
  }
  return x;
};

