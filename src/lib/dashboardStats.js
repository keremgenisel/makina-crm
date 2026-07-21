// Anasayfa "Son Satışlar" — makina satışları (installDate'li müşteriler) + Extra Kalıp satışları
// (partSales.tur === "Kalıp") tek listede, tarihe göre (yeni → eski) sıralı, ilk `limit` kayıt.
// NOT: Yedek parça satışları (tur !== "Kalıp") BİLİNÇLİ olarak dışarıda — bayi satışı + tur
// tutarsızlığı ayrı bir planda ele alınacak (bkz. plan: anasayfa-son-satislar.md).

export function sonSatislar(customers = [], partSales = [], limit = 10) {
  const custAd = new Map((customers || []).map((c) => [c.id, c.name]));
  const rows = [];

  // Makina satışları: satış tarihi = installDate.
  for (const c of customers || []) {
    if (!c.installDate || c.deletedAt) continue;
    rows.push({
      tip: "makina", key: `m${c.id}`, custId: c.id,
      ad: c.name || "—",
      detay: (c.model || "—") + (c.serialNo ? ` · ${c.serialNo}` : ""),
      tarih: c.installDate,
      konum: (c.country || "") + (c.city ? ` / ${c.city}` : ""),
    });
  }

  // Extra Kalıp satışları (yalnız tur === "Kalıp"; yedek parça hariç).
  for (const p of partSales || []) {
    if (p.deletedAt || p.tur !== "Kalıp") continue;
    rows.push({
      tip: "kalip", key: `k${p.id}`, custId: p.customerId ?? null,
      ad: custAd.get(p.customerId) || "—",
      detay: (p.ad || "—") + (p.olcu ? ` (${p.olcu})` : ""),
      tarih: p.tarih,
      tutar: p.ucret, currency: p.currency || "TRY",
      konum: "",
    });
  }

  return rows
    .filter((r) => r.tarih)
    .sort((a, b) => String(b.tarih || "").localeCompare(String(a.tarih || "")))
    .slice(0, limit);
}
