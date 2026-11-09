// Spec 0134 R20, R20/2; spec 0140 E-R1–E-R8/2: sipariş listesinin yazdırma kurucusu. Kendi modülündedir (printTemplates.js'e
// yazılmaz) ve sunum dilini 0059'un raporSunumu.js'inden alır. Saf: React almaz, saat okumaz (tarih parametre). Hücreler burada
// kaçışlanır (raporSunumu kaçışlamaz, AC-50). Yalnız Türkçe (E-R6).
// Spec 0140: belge TEDARİKÇİ BÖLÜMLERİNDEN kurulur (motorun opt-in çıktısı `tedarikciBolumleri`). Tek belge, başlık bandı bir kez,
// ilk bölüm hariç her tedarikçi bölümünün üstünde sayfa sonu (E-R8/2). PARÇA İHTİYACI tablosu ve "tedarikçisi belirtilmemiş"
// bölümü belgeye girmez (C-R10, C-R7/2). Kapatılan, sıfır adetli ve hatalı satır basılmaz (D-R1, D-R2). Para sütunları yalnız
// `paraGoster` ile (E-R4, C5).
import { belgeAcilis, bolum, detayTablo, not, gun, sayi } from "./raporSunumu";
import { kgMetni, kesitMetni } from "./siparisIhtiyaci";

const esc = (v) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const ikiHane = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const tl = (k) => (k == null ? "—" : `${ikiHane.format(k / 100)} TL`);
const SIMGE = { TRY: "TL", USD: "$", EUR: "€" };
const tutarPb = (k, pb) => (k == null ? "—" : `${ikiHane.format(k / 100)} ${SIMGE[pb] || esc(pb)}`);
const birimPb = (x, pb) => (x == null ? "—" : `${ikiHane.format(x)} ${SIMGE[pb] || esc(pb)}`);
const n = (x) => (x == null ? "—" : sayi(x));

export const SIPARIS_RAPOR_BASLIGI = "Sipariş Listesi";
// E-R3/2 (AC-44, AC-45, AC-90): belgenin sütunları TEK yerde. Para sütunları yalnız gider yetkisiyle.
export const BELGE_SUTUNLARI = Object.freeze({
  hazir: ["Parça", "İhtiyaç", "Stok", "Sipariş adedi"], hazirPara: ["Birim maliyet", "Tutar"],
  malzeme: ["Malzeme", "Kesit", "Sipariş kg / Boy"], malzemePara: ["Birim fiyat", "Tutar"],
});
export const ELLE_ISARETI = " (elle)";
export const ELLE_NOTU = "\"(elle)\" işaretli satırın adedi ya da kilosu öneriden değiştirildi.";

// Basılacak satırlar (E-R1, E-R7, AC-30, AC-31, AC-49, AC-76): silinmiş ya da bulunamayan tedarikçinin bölümü basılmaz.
export const basilacakBolumler = (sonuc) => (sonuc?.tedarikciBolumleri?.bolumler || []).filter(b => !b.silinmis).map(b => ({
  bolum: b,
  hazir: b.hazirParcalar.filter(x => !x.kapali && !x.hata && x.siparis > 0),
  malzeme: b.malzemeler.filter(x => !x.kapali && !x.hata && (x.siparisKg > 0 || x.boyAdedi > 0)),
})).filter(x => x.hazir.length || x.malzeme.length);

// Belgenin basılabilirliği ve nedeni (AC-40, AC-49): hatalı satır varsa ya da basılacak satır yoksa basılamaz.
export const belgeDurumu = (sonuc, { hata = "Geçersiz değerli satır var.", bos = "Basılacak satır yok." } = {}) => {
  if (!sonuc?.tedarikciBolumleri) return { etkin: false, neden: bos };
  // Triyaj (bulgu 3): yalnız görünen satırların hatası kilitler (seçim dışındaki tedarikçinin hatası kullanıcıya görünmez).
  if (sonuc.hataliSayi > 0 || (sonuc.tedarikciBolumleri.duzen.gorunenHata ?? sonuc.tedarikciBolumleri.duzen.hata) > 0) return { etkin: false, neden: hata };
  if (!basilacakBolumler(sonuc).length) return { etkin: false, neden: bos };
  return { etkin: true, neden: null };
};

const hazirTablo = (satirlar, para) => detayTablo("Hazır parçalar", [...BELGE_SUTUNLARI.hazir, ...(para ? BELGE_SUTUNLARI.hazirPara : [])],
  satirlar.map(x => [`${esc(x.ad)}${x.duzenlendi ? ELLE_ISARETI : ""}`, n(x.ihtiyac), n(x.stok), n(x.siparis),
    ...(para ? [x.birimK == null ? "—" : tl(x.birimK), x.tutarK == null ? esc(x.tutarNeden || "—") : tl(x.tutarK)] : [])]),
  ["left", "right", "right", "right", ...(para ? ["right", "right"] : [])]);
const malzemeTablo = (satirlar, para) => detayTablo("Malzemeler", [...BELGE_SUTUNLARI.malzeme, ...(para ? BELGE_SUTUNLARI.malzemePara : [])],
  satirlar.map(k => [esc(k.malzemeAd), esc(k.kesitMetni || kesitMetni(k.bicim, k.kesit)),
    `${k.yontem === "boy" || k.siparisKg == null ? `${n(k.boyAdedi)} boy` : esc(kgMetni(k.siparisKg))}${k.elle ? ELLE_ISARETI : ""}`,
    ...(para ? [birimPb(k.fiyat, k.paraBirimi), tutarPb(k.tutarK, k.paraBirimi)] : [])]),
  ["left", "left", "right", ...(para ? ["right", "right"] : [])]);

export const siparisRaporuHtml = (sonuc, { bugun, factory = null, partiAd = null, paraGoster = false } = {}) => {
  const girdi = partiAd ? `Üretim partisi: ${esc(partiAd)}` : "Elle girilen model satırları";
  const modeller = detayTablo("Model satırları", ["Model", "Makina adedi"], sonuc.satirlar.filter(s => !s.hata).map(s => [esc(s.model), n(s.adet)]), ["left", "right"]);
  const bolumler = basilacakBolumler(sonuc).map(({ bolum: b, hazir, malzeme }, i) => `<div class="siparis-bolum"${i > 0 ? " style=\"page-break-before:always;break-before:page;\"" : ""}>
  ${bolum(`${esc(b.ad)} · ${girdi}`, paraGoster ? tl(b.tutarTLK) : "", [hazir.length ? hazirTablo(hazir, paraGoster) : "", malzeme.length ? malzemeTablo(malzeme, paraGoster) : "",
    [...hazir, ...malzeme].some(x => x.duzenlendi || x.elle) ? not(esc(ELLE_NOTU)) : "", paraGoster ? not("Tutarlar KDV hariçtir; döviz fiyatlı malzemede TL karşılığı malzeme kartındaki kurla hesaplanır.") : ""].join(""))}
</div>`).join("");
  return `${belgeAcilis({ title: SIPARIS_RAPOR_BASLIGI, baslik: SIPARIS_RAPOR_BASLIGI.toLocaleUpperCase("tr-TR"), ust: girdi, donem: gun(bugun), factory })}
  ${bolum("MODELLER", "", modeller)}
  ${bolumler}
</body></html>`;
};
