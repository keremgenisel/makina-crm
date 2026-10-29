// Spec 0115: tamire gelen kalıbın atölye iş listesi. Dedektör, servisin kalıp listesinin okuma ve yazma yolu, üretim formundaki
// tamir satırlarının haritası, bekleyen tamirler, rozet özeti ve metin sabitleri tek saf modülde (R3/2, C3). React almaz,
// saat okumaz, veri yazmaz; kimlikleri çağıran verir (R7/3, Karar 52).
import { kalipAdDeseni } from "../../electron/kalipTamiriGocuSaf.mjs";
import { fmtKalipCapi, fmtTR } from "./utils";

// R6/2, C14: ad deseninin tek tanımı electron/ altındadır (db.cjs src/'yi okuyamaz, Karar 59); buradan yeniden dışa verilir.
export { kalipAdDeseni };

// ── Metinler (R39, Karar 56) ────────────────────────────────────────────────────────────────────────────────────────────
export const TAMIR_ROZETI = "KALIP ATÖLYEDE";
export const tamirRozetMetni = ({ bitmemis, toplam }) => `${TAMIR_ROZETI} ${bitmemis}/${toplam}`;
export const KALIP_KUTU_ETIKETI = "Kalıp atölyeye girecek";
export const KALIP_KUTU_IPUCU = "Makinanın kalıp mili, kalıp rulmanı ya da kalıp yatağı gibi parçalarını değiştirmek bu kutuyu işaretlemeyi gerektirmez; kutu kalıbın kendisinin atölyeye girdiğini söyler.";
export const KALIP_ISI_ONERISI = "Bu serviste kalıp işi kalemi var; kalıp atölyeye girecekse kutuyu işaretleyin.";
export const TAMIR_BOS_HATASI = "Atölyeye girecek en az bir kalıp seçin.";
export const TAMIR_AD_HATASI = "Kalıp adını girin.";
export const TAMIR_BILDIRIMI = (n) => `Bu servisin ${n} kalıbı atölyede henüz bitmedi.`;
export const TAMIR_ONAY_BASLIGI = "Kalıplar atölyede";
export const tamirOnayMetni = (firma, n, formaGirmemis = 0) =>
  `${firma || "Bu"} servisinin ${n} kalıbı henüz bitmedi.${formaGirmemis > 0 ? ` ${formaGirmemis} kalıp henüz hiçbir üretim formunda değil; işaretleme yalnız formdaki satırlara yapılır.` : ""}`;
export const TAMIR_ONAY_DUGMESI = "Kalıpları da bitti işaretle";
export const TAMIR_ONAY_KAPAT = "Kapat";
export const TAMIR_KILITLI = (kim) => `Üretim formu şu an ${kim} tarafından düzenleniyor; kalıplar işaretlenmedi.`;
export const TAMIR_ISARETLENDI = (n) => `${n} kalıp satırı bitti işaretlendi.`;
export const bekleyenTamirDugmesi = (n) => `Bekleyen Tamirleri Getir (${n})`;
export const TAMIR_YOK = "Bekleyen tamir yok.";
export const TAMIR_EKLENDI = (n) => `${n} tamir eklendi.`;
export const KALIP_ISI_BAYRAGI = "Kalıp işi";
export const KALIP_ISI_BAYRAK_IPUCU = "kalıp tamiri ya da revizyonudur; servis formunda bu tipteki kalem eklenince kalıp atölyesi önerisi çıkar.";
export const PARCA_TIP_IPUCU = "Bu parçanın adında kalıp geçiyor. Kalıp işi işaretli bir tip seçerseniz servis formunda kalıp önerisi çalışır.";
// Spec 0117 R24, R24/2: Makina Geçmişi satırının liste başlığı (çıktı ayrı yoldan, çeviri anahtarından okur; C10).
export const SERVIS_KALIPLARI_ETIKETI = "Servis gören kalıplar";
export const TUR_ADLARI = { uretim: "Üretim", tamir: "Tamir" };
export const turAdi = (r) => TUR_ADLARI[r?.tur === "tamir" ? "tamir" : "uretim"];
// Triyaj: Manuel Satır Ekle'de başka bir canlı üretim formunda satırı olan kalıp seçilemez (R40'ın "ikinci forma çekilemez"
// kuralı manuel pencereye de uygulanır; yoksa kayıt damgayı yeni forma yazar, eski formun satırı damgasız kalırdı).
export const BASKA_FORMDA_IBARESI = "Başka bir üretim formunda";
export const KAYNAK_YOK = "Servis kaydı bulunamadı";
export const KAYIT_BOLUMU = { onDoldur: "Servisin kalıp işi kalemleri", kayitli: "Firmanın kayıtlı kalıpları", elle: "Elle giriş", sevk: "Kalıbın dönüşü" };

// ── Dedektör (R1–R3/2, Karar 33) ────────────────────────────────────────────────────────────────────────────────────────
// Parçanın tipi adıyla eşlenir; boş tip "Standart" sayılır; çöpteki ya da listede olmayan tip kalıp işi değildir.
export const parcaKalipIsiMi = (part, partTypeDefs) => {
  if (!part || !Array.isArray(partTypeDefs)) return false;
  const ad = part.tip || "Standart";
  const tip = partTypeDefs.find(t => t && !t.deletedAt && t.ad === ad);
  return !!tip?.kalipIsi;
};
// Servisin değişen parçalarından kalıp işi tipli kalemler (öneri ve ön doldurma; R11, R13). Ad bütün taşınır.
export const kalipIsiKalemleri = (degisenParcalar, parts, partTypeDefs) => {
  if (!Array.isArray(partTypeDefs)) return [];
  return (Array.isArray(degisenParcalar) ? degisenParcalar : []).filter(k => {
    const p = (parts || []).find(x => String(x.id) === String(k.partId));
    return parcaKalipIsiMi(p, partTypeDefs);
  }).map(k => {
    const p = (parts || []).find(x => String(x.id) === String(k.partId));
    return { ad: (p?.ad || k.ad || "").trim(), olcu: "" };
  });
};

// ── Servis kaydı (R7/2, R8/2, R9) ──────────────────────────────────────────────────────────────────────────────────────
export const tamirListesi = (servis) => (Array.isArray(servis?.atolyeKaliplari) ? servis.atolyeKaliplari : []);
export const kalipAtolyedeMi = (servis) => tamirListesi(servis).length > 0;
// Formun kutusu: geçici alan varsa o, yoksa kayıttaki listenin doluluğu (açılışta forma alan yazılmaz, C11).
export const kutuAcikMi = (form) => (typeof form?._kalipAtolye === "boolean" ? form._kalipAtolye : kalipAtolyedeMi(form));
export const girisAnahtari = (g, i) => String(g?.id ?? g?._anahtar ?? `i${i}`);

// Doğrulama (R14, R14/2, Karar 52). Kutu kapalıyken her şey geçer.
export const tamirDogrula = (form) => {
  const satirHatalari = {};
  if (!kutuAcikMi(form)) return { hata: null, satirHatalari, gecerli: true };
  const liste = tamirListesi(form);
  if (liste.length === 0) return { hata: TAMIR_BOS_HATASI, satirHatalari, gecerli: false };
  liste.forEach((g, i) => { if (!String(g?.ad ?? "").trim()) satirHatalari[girisAnahtari(g, i)] = TAMIR_AD_HATASI; });
  const gecerli = Object.keys(satirHatalari).length === 0;
  return { hata: gecerli ? null : TAMIR_AD_HATASI, satirHatalari, gecerli };
};
// Kurucunun liste adımı: kutu kapalıysa boş; açıksa girişler kırpılır, kimliği olan korunur, olmayana yeniId() verilir (R7/3).
export const tamirListesiKur = (form, yeniId) => {
  if (!kutuAcikMi(form)) return [];
  return tamirListesi(form).map(g => ({ id: g.id ?? yeniId(), ad: String(g.ad ?? "").trim(), olcu: String(g.olcu ?? "").trim() }));
};
// Tek yazıcı (C3): alanı ve geçici form alanlarını siler, liste doluysa yazar (kapalı değer gövdeye girmez, R9, C11).
// Spec 0117 R29: üçüncü adım sevk değerleridir (`tamirSevkKur`'un dönüşü). Beş sevk anahtarı her çağrıda silinir (form kaydı
// yayarak taşır, R9) ve yalnız liste doluyken geri yazılır.
export const tamirYaz = (kayit, liste, sevk = {}) => {
  const { atolyeKaliplari: _a, _kalipAtolye: _k, _tamirHatalari: _h, ...geri } = kayit || {};
  const kalan = { ...geri };
  for (const a of SEVK_ALANLARI) delete kalan[a];
  return Array.isArray(liste) && liste.length > 0 ? { ...kalan, atolyeKaliplari: liste.map(g => ({ id: g.id, ad: g.ad, olcu: g.olcu })), ...sevk } : kalan;
};

// ── Kalıbın dönüşü (spec 0117 R1–R9, R26, R27, Karar 39–41) ──────────────────────────────────────────────────────────────
// Ad tuzağı (C1): onarım yerinin "Fabrika Teslim" değeri makinanın nerede onarıldığını söyler; bu beş alan kalıp öneki taşır.
export const SEVK_FABRIKA = "kalipFabrikaTeslim";
export const SEVK_METIN_ALANLARI = ["kalipKargoFirma", "kalipKargoTakipNo", "kalipKargoTarih", "kalipKargoSorumlusu"];
export const SEVK_ALANLARI = [SEVK_FABRIKA, ...SEVK_METIN_ALANLARI];
// Formun teslim şekli (boş = Kargo, R3).
export const sevkFabrikaTeslimMi = (kayit) => kayit?.[SEVK_FABRIKA] === true;
// Kayda yazılacak sevk değerleri: kutu kapalıysa hiçbiri; metinler kırpılır, boş kalan yazılmaz; teslim şekli yalnız `true`
// ise yazılır; Fabrika Teslim'de kargo firması ve takip numarası düşer. Doğrulama yok (R7/2).
export const tamirSevkKur = (form) => {
  if (!kutuAcikMi(form)) return {};
  const fabrika = sevkFabrikaTeslimMi(form);
  const sevk = fabrika ? { [SEVK_FABRIKA]: true } : {};
  for (const a of SEVK_METIN_ALANLARI) {
    if (fabrika && (a === "kalipKargoFirma" || a === "kalipKargoTakipNo")) continue;
    const v = String(form?.[a] ?? "").trim();
    if (v) sevk[a] = v;
  }
  return sevk;
};
// Etiketin tarihi (R18, R18/2, Karar 39): kargo tarihi takvimde geçerli YYYY-AA-GG ise o, değilse servis tarihi. Seçim ham
// değerde yapılır, biçimleme çağıranda; bu bir okuma kuralıdır, kayıt doğrulanmaz (R7/2).
const gecerliGun = (v) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v ?? ""));
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
};
export const sevkTarihi = (servis) => (gecerliGun(servis?.kalipKargoTarih) ? servis.kalipKargoTarih : servis?.date);
export const sevkTeslimSekli = (servis) => (sevkFabrikaTeslimMi(servis) ? "Fabrika Teslim" : "Kargo");

// ── Üretim formu (R17/2, R20/2) ────────────────────────────────────────────────────────────────────────────────────────
export const TAMIR_KAYNAK_TIPI = "servis_tamir";
export const tamirAnahtari = (servisId, kalipId) => `${TAMIR_KAYNAK_TIPI}:${servisId}:${kalipId}`;
export const tamirSatiriMi = (r) => r?.kaynakTip === TAMIR_KAYNAK_TIPI;
const satirTamirAnahtari = (r) => (tamirSatiriMi(r) && r.kaynakId != null && r.kaynakKalipId != null ? tamirAnahtari(r.kaynakId, r.kaynakKalipId) : null);
// Canlı formlardaki tamir satırları: anahtar → [{ formId, satir }] (bir giriş bozuk veride iki formda olabilir).
export const tamirSatirHaritasi = (uretimFormlari) => {
  const harita = new Map();
  for (const f of Array.isArray(uretimFormlari) ? uretimFormlari : []) {
    if (!f || f.deletedAt || f.id == null) continue;
    for (const r of Array.isArray(f.satirlar) ? f.satirlar : []) {
      const a = satirTamirAnahtari(r);
      if (!a) continue;
      if (!harita.has(a)) harita.set(a, []);
      harita.get(a).push({ formId: f.id, satir: r });
    }
  }
  return harita;
};
// R25/2, Karar 37: biten = canlı bir formda tamamlandı satırı olan giriş; satırı olmayan giriş bitmemiştir.
export const tamirOzeti = (servis, harita) => {
  const liste = tamirListesi(servis);
  let biten = 0, formaGirmemis = 0;
  for (const g of liste) {
    const satirlar = harita?.get(tamirAnahtari(servis.id, g.id)) || [];
    if (satirlar.length === 0) formaGirmemis++;
    else if (satirlar.some(x => x.satir.tamamlandi)) biten++;
  }
  return { toplam: liste.length, biten, bitmemis: liste.length - biten, formaGirmemis };
};
// R18: işaretli ama hiçbir canlı formda satırı olmayan girişler; tarih süzgeci yok. Çöpteki servis okunmaz.
export const bekleyenTamirler = (services, harita) => {
  const sonuc = [];
  for (const s of Array.isArray(services) ? services : []) {
    if (!s || s.deletedAt) continue;
    for (const g of tamirListesi(s)) if (!(harita?.get(tamirAnahtari(s.id, g.id)) || []).length) sonuc.push({ servis: s, giris: g });
  }
  return sonuc;
};
// Tamir satırı (R17/2, R19, Karar 48). bos = emptyRow() (kimlik çağırandan). kalipIdx null kalır (C2).
export const tamirSatiriKur = (bos, servis, giris, musteri, kalipDefs = []) => {
  const def = (kalipDefs || []).find(d => d.ad === giris.ad);
  return {
    ...bos, tur: "tamir",
    kalipDefId: def?.id ?? null, kalipKodu: def?.kod || "", kalipAdi: giris.ad || "", kalipResim: def?.resim || "",
    musteriId: musteri?.id ?? null, musteriAdi: musteri?.name || "", sehir: musteri?.city || "", makinaKodu: musteri?.model || "",
    makinaKalipCapi: fmtKalipCapi(musteri?.kalipCapi) || "", kalipOlcusu: giris.olcu || "",
    kaynakTip: TAMIR_KAYNAK_TIPI, kaynakId: servis.id, kaynakKalipId: giris.id, kalipIdx: null, servisTarihi: servis.date || "",
  };
};
// Satırın kaynak metni (R19, R24, Karar 48): servis canlı okunur; bulunamazsa ibare.
// R15/2: giriş servisin listesinden çıkarıldıysa satır da kaynağını kaybeder (servis canlı olsa bile).
export const tamirKaynagi = (r, services) => {
  if (!tamirSatiriMi(r)) return null;
  const s = (services || []).find(x => !x.deletedAt && String(x.id) === String(r.kaynakId));
  return s && tamirListesi(s).some(g => String(g.id) === String(r.kaynakKalipId)) ? s : null;
};
export const tamirKaynakMetni = (r, services) => {
  const s = tamirKaynagi(r, services);
  return s ? `Servis · ${s.type || "—"} · ${fmtTR(s.date) || "—"}` : KAYNAK_YOK;
};
// R27, Karar 53: düğmenin dokunacağı formlar ve yazımı. Yalnız servisin güncel girişlerinin var olan satırları.
export const tamirFormIdleri = (servis, harita) => {
  const ids = new Set();
  for (const g of tamirListesi(servis)) for (const x of harita?.get(tamirAnahtari(servis.id, g.id)) || []) if (!x.satir.tamamlandi) ids.add(x.formId);
  return [...ids];
};
export const tamirlariTamamla = (uretimFormlari, servis) => {
  const anahtarlar = new Set(tamirListesi(servis).map(g => tamirAnahtari(servis.id, g.id)));
  return (uretimFormlari || []).map(f => {
    if (!f || f.deletedAt || !(f.satirlar || []).some(r => anahtarlar.has(satirTamirAnahtari(r)) && !r.tamamlandi)) return f;
    return { ...f, satirlar: f.satirlar.map(r => (anahtarlar.has(satirTamirAnahtari(r)) ? { ...r, tamamlandi: true } : r)) };
  });
};

// ── Kayıtlı kalıp eşlemesi (Karar 50, 51) ─────────────────────────────────────────────────────────────────────────────
const ayniKalip = (a, b) => String(a?.ad ?? "").trim() === String(b?.ad ?? "").trim() && String(a?.olcu ?? "").trim() === String(b?.olcu ?? "").trim();
export const kayitliSeciliMi = (liste, kalip) => (liste || []).some(g => ayniKalip(g, kalip));
export const kayitliDegistir = (liste, kalip, anahtar) => {
  const l = liste || [];
  const i = l.findIndex(g => ayniKalip(g, kalip));
  if (i >= 0) return l.filter((_, j) => j !== i);
  return [...l, { _anahtar: anahtar, ad: kalip.ad || "", olcu: kalip.olcu || "" }];
};

// ── Kargo Etiketi (R37/2) ─────────────────────────────────────────────────────────────────────────────────────────────
export const tamirEtiketIcerigi = (servis) => tamirListesi(servis).map(g => ({ ad: `${g.ad || "(kalıp)"}${g.olcu ? " · Ölçü: " + g.olcu : ""}`, miktar: 1 }));
