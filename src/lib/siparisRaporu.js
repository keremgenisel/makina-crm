// Spec 0134 R20, R20/2; spec 0140 E-R1–E-R8/2; spec 0142: sipariş listesinin yazdırma kurucusu. Kendi modülündedir (printTemplates.js'e
// yazılmaz) ve sunum dilini 0059'un raporSunumu.js'inden alır. Saf: React almaz, saat okumaz (tarih parametre). Hücreler burada
// kaçışlanır (raporSunumu kaçışlamaz, AC-50). Yalnız Türkçe (E-R6).
// Spec 0142: belge tedarikçiye verilen kesim listesidir. Motorun `tedarikciBolumleri.belge` alanından kurulur (B-R1/2: malzemeden
// kesilen parça malzemesinin tedarikçisinin bölümünde). Tedarikçi başına tek tablo `Parça · Ölçü · Sipariş adedi` (B-R1, A-R3/2);
// malzemeden kesilen parçanın altında malzeme satırı (B-R3), hazır parçada boş ölçü (B-R4); bölümün sonunda "Alınacak malzeme
// toplamı" kendi tablosu (B-R7/2). Stok, ihtiyaç ve para yok (A-R1–A-R6/2). Tek belge, başlık bandı bir kez, ilk bölüm hariç her
// bölümün üstünde sayfa sonu (0140 E-R8/2). MODELLER tablosu bilinçli olarak kalır (B-R8).
// Spec 0144: parçanın altındaki malzeme satırı motorun hazır payını (kesit + miktar) yazar (A-R1/2: eşleştirme ve aritmetik motorda,
// burada yok, C1); `fiyatli` seçeneği (varsayılan fiyatsız, B-R2/2; adı `paraGoster` değil, Karar 35) birim fiyat ve tutar
// sütunlarını, bölüm toplamını ve başlıktaki "Fiyatlı nüsha" ibaresini ekler. Para metinleri motorun ve malzeme.js'in yardımcılarından (C5).
import { belgeAcilis, bolum, detayTablo, not, gun, sayi } from "./raporSunumu";
import {
  kgMetni, kesitMetni, boyCinsindenMi, OLCU_BASLIGI, OLCU_GIRILMEMIS, KESIT_KAPALI_UYARISI, PAY_FARK_NOTU, KESIT_KAPALI_IBARESI,
  TEDARIKCISIZ_IBARESI, TOPLAM_KAPSAM_CUMLESI, BOLUM_TOPLAMI, FIYATLI_NUSHA, tutarsizMetni, payMiktarMetni, pbTutarMetni, pbToplamMetni,
  tlMetni, adetFiyatMetni,
} from "./siparisIhtiyaci";
import { kiloFiyatMetni } from "./malzeme";

export { PAY_FARK_NOTU, FIYATLI_NUSHA };

const esc = (v) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const n = (x) => (x == null ? "—" : sayi(x));
const kucuk = (t) => `<div style="font-size:9.5px;color:#64748b;">${t}</div>`;

export const SIPARIS_RAPOR_BASLIGI = "Sipariş Listesi";
export const TOPLAM_BASLIGI = "Alınacak malzeme toplamı";
export const MALZEME_ETIKETI = "malzeme";
// Spec 0142 B-R1, B-R7/2, B-R5/2 (AC-7, AC-45, AC-48): belgenin sütunları TEK yerde; ölçü başlığı pencereyle aynı sabit.
export const BELGE_SUTUNLARI = Object.freeze({
  parca: ["Parça", OLCU_BASLIGI, "Sipariş adedi"],
  toplam: ["Malzeme", "Kesit", "Alınacak"],
  fiyat: ["Birim fiyat", "Tutar"], // spec 0144 B-R3: yalnız fiyatlı nüshada iki tablonun sonuna
});
// Spec 0144 AC-43: iki hâl tek yerden.
export const belgeSutunlari = ({ fiyatli = false } = {}) => ({
  parca: fiyatli ? [...BELGE_SUTUNLARI.parca, ...BELGE_SUTUNLARI.fiyat] : BELGE_SUTUNLARI.parca,
  toplam: fiyatli ? [...BELGE_SUTUNLARI.toplam, ...BELGE_SUTUNLARI.fiyat] : BELGE_SUTUNLARI.toplam,
});
const HIZA = ["left", "left", "right", "right", "right"];
export const ELLE_ISARETI = " (elle)";
export const ELLE_NOTU = "\"(elle)\" işaretli satırın adedi ya da kilosu öneriden değiştirildi.";

// Basılacak bölümler (B-R1/3, B-R1/4, AC-38, AC-56): motor süzgeçten geçirmiş satırları verir; silinmiş ya da bulunamayan
// tedarikçinin bölümü basılmaz (0140 AC-76). Parça ya da toplam satırı olan bölüm basılır.
export const basilacakBolumler = (sonuc) => (sonuc?.tedarikciBolumleri?.belge || []).filter(b => !b.silinmis && (b.satirlar.length || b.toplam.length));

// Belgenin basılabilirliği ve nedeni (0140 AC-40, AC-49): hatalı satır varsa ya da basılacak satır yoksa basılamaz.
export const belgeDurumu = (sonuc, { hata = "Geçersiz değerli satır var.", bos = "Basılacak satır yok." } = {}) => {
  if (!sonuc?.tedarikciBolumleri) return { etkin: false, neden: bos };
  // Triyaj (0140 bulgu 3): yalnız görünen satırların hatası kilitler.
  if (sonuc.hataliSayi > 0 || (sonuc.tedarikciBolumleri.duzen.gorunenHata ?? sonuc.tedarikciBolumleri.duzen.hata) > 0) return { etkin: false, neden: hata };
  if (!basilacakBolumler(sonuc).length) return { etkin: false, neden: bos };
  // Triyaj (bulgu 2): basılacak bir bölüme düşen hatalı adetli parça da kilitler (pencerenin görünen bölümleri belgeninkiyle aynı değil).
  if (basilacakBolumler(sonuc).some(b => b.hataSayisi > 0)) return { etkin: false, neden: hata };
  return { etkin: true, neden: null };
};

// B-R4/2, B-R5/2 (AC-41, AC-43): ölçüler alt alta (`<br>`), aralarında noktalama yok; ölçüsü eksik kalem hücreye bir şey yazmaz,
// ibaresi parçanın adının altına düşer.
const olcuHucresi = (olculer) => olculer.filter(o => !o.eksik).map(o => esc(o.metin)).join("<br>");
// Spec 0144 B-R8: tutarı yazılamayan hücre rakam yerine nedenini yazar.
const tutarHucresi = (k, pb, neden) => (k != null ? esc(pbTutarMetni(k, pb)) : neden ? kucuk(esc(neden)) : "");
const parcaFiyatHucreleri = (x) => (x.malzemeKalemli
  // B-R5, B-R5/4–B-R5/6: birim fiyat boş, tutar malzeme satırlarının para birimi başına toplamı ya da neden.
  ? ["", `${x.parcaTutarlari?.length ? esc(pbToplamMetni(x.parcaTutarlari)) : ""}${x.tutarNeden ? kucuk(esc(x.tutarNeden)) : ""}`]
  // B-R6, B-R6/2: hazır parça maliyetle, ₺/adet.
  : [esc(adetFiyatMetni(x.birimK)), tutarHucresi(x.tutarK, "TRY", x.tutarNeden)]);
// A-R1/3, A-R1/4, A-R8/2, A-R9/2, A-R10/2: kesit Ölçü'de, miktar Sipariş adedi'nde, ön ek `malzeme · `; boş hücre boş dize (tire değil).
const malzemeSatiri = (e, fiyatli) => {
  const ibare = e.kapali ? KESIT_KAPALI_IBARESI : e.tedarikcisiz && !e.payYok ? TEDARIKCISIZ_IBARESI : null;
  const bas = `${kucuk(`${MALZEME_ETIKETI} · ${esc(e.malzemeAd)}`)}${ibare ? kucuk(esc(ibare)) : ""}`;
  if (e.payYok) return [bas, "", "", ...(fiyatli ? ["", ""] : [])];
  const satir = [bas, esc(e.kesitMetni || ""), `${esc(payMiktarMetni(e, fiyatli))}${e.elle ? ELLE_ISARETI : ""}`];
  if (!fiyatli) return satir;
  if (e.kapali) return [...satir, "", ""]; // A-R9/3
  return [...satir, esc(kiloFiyatMetni(e.fiyat, e.paraBirimi)), tutarHucresi(e.tutarK, e.paraBirimi, e.tutarNeden)];
};
const parcaTablo = (satirlar, fiyatli) => {
  const rows = [];
  for (const x of satirlar) {
    const eksik = x.olculer.some(o => o.eksik);
    const satir = [`${esc(x.ad)}${x.duzenlendi ? ELLE_ISARETI : ""}${eksik ? kucuk(esc(OLCU_GIRILMEMIS)) : ""}`, olcuHucresi(x.olculer), n(x.siparis)];
    rows.push(fiyatli ? [...satir, ...parcaFiyatHucreleri(x)] : satir);
    // A-R7, A-R1/5: malzeme satırı yalnız malzemeden kesilen parçada, kalem sırasıyla; hazır parçada yok.
    for (const e of x.malzemeSatirlari || []) rows.push(malzemeSatiri(e, fiyatli));
  }
  return detayTablo("Parçalar", belgeSutunlari({ fiyatli }).parca, rows, HIZA);
};
// Spec 0143 C-R2 (AC-24, AC-61): işaretli satır boy, işaretsiz (ve çubuğu kısa işaretli) satır kilogram.
// Spec 0144 B-R4/4 (Karar 39): fiyatlı nüshada boy satırı kilogramı da yazar.
const alinacak = (k, fiyatli) => `${boyCinsindenMi(k) || k.siparisKg == null ? `${n(k.boyAdedi)} boy${fiyatli && k.siparisKg != null ? ` · ${esc(kgMetni(k.siparisKg))}` : ""}` : esc(kgMetni(k.siparisKg))}${k.elle ? ELLE_ISARETI : ""}`;
const toplamTablo = (kesitler, fiyatli) => detayTablo(TOPLAM_BASLIGI, belgeSutunlari({ fiyatli }).toplam,
  kesitler.map(k => {
    const satir = [esc(k.malzemeAd), esc(k.kesitMetni || kesitMetni(k.bicim, k.kesit)), alinacak(k, fiyatli)];
    return fiyatli ? [...satir, esc(kiloFiyatMetni(k.fiyat, k.paraBirimi)), tutarHucresi(k.tutarK, k.paraBirimi, k.tutarNeden)] : satir;
  }), HIZA);
// B-R7, B-R7/2, B-R7/3, B-R8: bölümün tek toplam satırı, kapsam cümlesi ve tutarsız sayacı.
const bolumToplami = (b) => `<div data-bolum-toplami style="font-size:11px;margin-top:8px;"><b>${BOLUM_TOPLAMI}:</b> ${esc(pbToplamMetni(b.toplamlar))}${
  b.dovizVar && b.toplamTLK != null ? ` · kayıtlı kurla ${esc(tlMetni(b.toplamTLK))}` : ""}${b.tutarsizSayi ? ` · ${esc(tutarsizMetni(b.tutarsizSayi))}` : ""}</div>${not(esc(TOPLAM_KAPSAM_CUMLESI))}`;

export const siparisRaporuHtml = (sonuc, { bugun, factory = null, partiAd = null, fiyatli = false } = {}) => {
  const girdi = partiAd ? `Üretim partisi: ${esc(partiAd)}` : "Elle girilen model satırları";
  const modeller = detayTablo("Model satırları", ["Model", "Makina adedi"], sonuc.satirlar.filter(s => !s.hata).map(s => [esc(s.model), n(s.adet)]), ["left", "right"]);
  const bolumler = basilacakBolumler(sonuc).map((b, i) => `<div class="siparis-bolum"${i > 0 ? " style=\"page-break-before:always;break-before:page;\"" : ""}>
  ${bolum(`${esc(b.ad)} · ${girdi}`, "", [b.satirlar.length ? parcaTablo(b.satirlar, fiyatli) : "", b.toplam.length ? toplamTablo(b.toplam, fiyatli) : "",
    b.payFarkVar ? not(esc(PAY_FARK_NOTU)) : "", fiyatli ? bolumToplami(b) : "",
    b.kapaliKesitVar ? not(esc(KESIT_KAPALI_UYARISI)) : "",
    [...b.satirlar.filter(x => x.duzenlendi), ...b.toplam.filter(k => k.elle)].length ? not(esc(ELLE_NOTU)) : ""].join(""))}
</div>`).join("");
  return `${belgeAcilis({ title: SIPARIS_RAPOR_BASLIGI, baslik: SIPARIS_RAPOR_BASLIGI.toLocaleUpperCase("tr-TR"), ust: fiyatli ? `${girdi} · ${FIYATLI_NUSHA}` : girdi, donem: gun(bugun), factory })}
  ${bolum("MODELLER", "", modeller)}
  ${bolumler}
</body></html>`;
};
