// Spec 0087 R11: parça (yedek parça tanımı) dışa ve içe aktarmasının saf çekirdeği. Bugüne kadar SettingsExport ve
// SettingsImport'un içindeydi; maliyet sütunu eklenirken test edilebilsin diye buraya aynen taşındı (çıktı birebir aynı,
// `tests/fixtures/0087-aktarma-once.json`). İçe aktarma başlığı OKUMAZ, hücreleri konuma göre eşler: yeni sütun yalnız
// SONA eklenir, yoksa eski şablonla alınmış dosyalar sessizce kayar.
import { trLower } from "./utils";
import { parcaMaliyetDogrula } from "./urunAgaci";

export const PARCA_AKTARMA_BASLIKLARI = ["Yedek Parça Adı (TR)", "Adı (EN)", "Kod", "Tip", "Tanım (TR)", "Tanım (EN)", "Fiyat (TL)", "Fiyat (USD)", "Fiyat (EUR)",
  // Spec 0087 R11: onuncu ve SON sütun (konuma göre eşleme; araya eklenseydi eski dosyalar kayardı).
  "Maliyet (TL, KDV hariç)"];
export const PARCA_SABLON_ORNEGI = ["Örnek Parça", "Example Part", "PRC-001", "Standart", "Parça açıklaması", "Part description", "250", "", "", "120,50"];

export const MALIYET_BELIRSIZ_DESEN = /^\s*-?\d+\.\d{3,}\s*$/;
export const MALIYET_BELIRSIZ_HATASI = "Maliyet belirsiz (nokta binlik mi ondalık mı anlaşılmıyor; ör. 1234,56 yazın), alınmadı.";

export const parcaDisaAktarmaSatiri = (p) => [p.ad, p.adEN ?? "", p.kod ?? "", p.tip ?? "Standart", p.tanim ?? "", p.tanimEN ?? "", p.fiyatTRY ?? "", p.fiyatUSD ?? "", p.fiyatEUR ?? "", p.maliyet ?? ""];

// Satırlar (ilk satır başlık) → kayıt dizisi. `idBaslangic` yeni parçaların kimlik tabanıdır (ekranda Date.now()).
export const parcaSatirlariniCoz = (rows, parts = [], idBaslangic = Date.now()) => {
  const dataRows = rows.slice(1);
  const newParts = []; const errors = [];
  let yeniler = 0, guncellenenler = 0;
  let idc = idBaslangic;
  const byAd = new Map();
  (parts || []).forEach(p => { if (p.ad && !p.deletedAt) byAd.set(trLower(p.ad), p); });
  dataRows.forEach((r, idx) => {
    const cell = (i) => (r[i] == null ? "" : String(r[i]).trim());
    const ad = cell(0);
    if (!ad) { errors.push(`Satır ${idx + 2}: Parça adı boş, atlandı.`); return; }
    const mevcut = byAd.get(trLower(ad));
    const id = mevcut ? mevcut.id : (++idc);
    // Spec 0087 R11, R14 (AC-30): maliyet onuncu sütundan, parça formuyla aynı doğrulamadan. Boş hücre (ya da sütunu olmayan
    // eski şablon) alanı hiç yazmaz: mevcut kaydın maliyeti uygulamada korunur, yeni parçaya boş alan doğmaz (C4/3).
    // Geçersiz maliyet satırı atlatmaz, yalnız maliyet alınmaz.
    const hamMaliyet = typeof r[9] === "number" ? r[9] : cell(9);
    // Triyaj (bulgu 2): tutarCoz noktayı ancak 1–2 haneli ondalıksa ondalık sayar, yoksa binlik diye siler ("48.5333" →
    // 485.333). İngilizce bölge ayarlı CSV'de bu sessiz büyüme olurdu; kural gider tarafıyla ortak olduğu için tutarCoz'a
    // dokunulmaz, tek noktalı ve noktadan sonra 3+ haneli (virgülsüz) METİN burada belirsiz sayılır ve alınmaz.
    const belirsiz = typeof hamMaliyet === "string" && MALIYET_BELIRSIZ_DESEN.test(hamMaliyet);
    const m = belirsiz ? { bos: false, deger: null, hata: MALIYET_BELIRSIZ_HATASI } : parcaMaliyetDogrula(hamMaliyet);
    if (m.hata) errors.push(`Satır ${idx + 2}: ${m.hata}${belirsiz ? "" : " Maliyet alınmadı."}`);
    if (mevcut) guncellenenler++; else yeniler++;
    newParts.push({
      id, ad,
      adEN: cell(1) || (mevcut?.adEN ?? ""),
      kod: cell(2) || (mevcut?.kod ?? ""),
      tip: cell(3) || (mevcut?.tip ?? "Standart"),
      tanim: cell(4) || (mevcut?.tanim ?? ""),
      tanimEN: cell(5) || (mevcut?.tanimEN ?? ""),
      fiyatTRY: cell(6) || (mevcut?.fiyatTRY ?? ""),
      fiyatUSD: cell(7) || (mevcut?.fiyatUSD ?? ""),
      fiyatEUR: cell(8) || (mevcut?.fiyatEUR ?? ""),
      ...(m.bos || m.hata ? {} : { maliyet: m.deger }),
      _mevcut: !!mevcut,
    });
  });
  return { parts: newParts, errors, yeniler, guncellenenler };
};

// İçe aktarmanın uygulama kolu: var olan kayıt korunur (`{ ...x, ...guncel }`: models, resim, deletedAt düşmez).
export const parcaIceAktarmaUygula = (p, impParts) => {
  const guncelMap = new Map();
  impParts.forEach(x => { const { _mevcut, ...clean } = x; guncelMap.set(x.id, clean); });
  const updated = p.map(x => guncelMap.has(x.id) ? { ...x, ...guncelMap.get(x.id) } : x);
  const existingIds = new Set(p.map(x => x.id));
  const yeniler = impParts.filter(x => !existingIds.has(x.id)).map(x => { const { _mevcut, ...clean } = x; return clean; });
  return [...yeniler, ...updated];
};
