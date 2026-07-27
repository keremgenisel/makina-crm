// Anasayfa "Son Satışlar" — makina satışları (installDate'li müşteriler) + Extra Kalıp satışları
// (partSales.tur === "Kalıp") + yedek parça (kargo) satışları tek listede, tarihe göre (yeni → eski)
// sıralı, ilk `limit` kayıt. Yedek parça alıcısı bayi VEYA müşteri olabilir.

export function sonSatislar(customers = [], partSales = [], yedekParcaSatislar = [], dealers = [], parts = [], limit = 10) {
  const custAd = new Map((customers || []).map((c) => [c.id, c.name]));
  const dealerAd = new Map((dealers || []).map((d) => [d.id, d.name]));
  const partAd = new Map((parts || []).map((p) => [String(p.id), p.ad]));
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

  // Yedek parça (kargo) satışları — alıcı bayi VEYA müşteri.
  for (const s of yedekParcaSatislar || []) {
    if (s.deletedAt) continue;
    const musteri = s.aliciTipi === "musteri";
    rows.push({
      tip: "yedek", key: `y${s.id}`, custId: musteri ? (s.musteriId ?? null) : null,
      ad: (musteri ? custAd.get(Number(s.musteriId)) : dealerAd.get(Number(s.dealerId))) || "—",
      detay: (partAd.get(String(s.partId)) || "Yedek parça") + ` · ${s.miktar || 0} adet`,
      tarih: s.tarih,
      tutar: (parseInt(s.miktar) || 0) * (Number(s.birimFiyat) || 0), currency: s.currency || "TRY",
      konum: "",
    });
  }

  return rows
    .filter((r) => r.tarih)
    .sort((a, b) => String(b.tarih || "").localeCompare(String(a.tarih || "")))
    .slice(0, limit);
}
