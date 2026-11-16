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
// Takım Yöneticisi isteği (2026-11-15, 0142 B-R3/B-R7/2 ve 0144 A ters çevrildi): müşteri istemedi, belgede parçanın altındaki malzeme
// satırı ve "Alınacak malzeme toplamı" tablosu yok (fiyatlı ve fiyatsız). Fiyatlı nüshanın bölüm toplamı yine alınacak malzemenin
// (yuvarlanmış, asgari, elle) tutarı + hazır parçalardır; kapsam cümlesi parça tutarlarının toplamının ondan küçük kalabileceğini söyler.
// Motorun alanları (`malzemeSatirlari`, `toplam`, `payFarkKg`) yerinde: parça tutarı ve bölüm toplamı onlardan okunur.
// Spec 0147: bölümün içinde parçalar hammaddeye göre gruplanır (motorun `gruplar` alanı; gruplama, sıralama ve satırın bölünmesi
// motorda, C1); grup başına bir tablo, başlığı yalnız grubun adı (R1, R2). Sayfa sonu yalnız bölümler arasında (R6), notlar grupların
// altında bir kez (R9). Ölçü metni birimini motordan taşır (R7, C4).
import { belgeAcilis, bolum, detayTablo, not, gun, sayi } from "./raporSunumu";
import {
  OLCU_BASLIGI, OLCU_GIRILMEMIS, KESIT_KAPALI_UYARISI, PAY_FARK_NOTU, TOPLAM_KAPSAM_CUMLESI, BOLUM_TOPLAMI, FIYATLI_NUSHA, tutarsizMetni,
  pbTutarMetni, pbToplamMetni, tlMetni, boySiparisMetni, parcaAdetMetni, SIPARIS_FARK_BASLIGI,
} from "./siparisIhtiyaci";

// PAY_FARK_NOTU 2026-11-15'ten beri basılmıyor; kıyas (0144-ayikla) ve "basılmaz" testleri buradan okur, bilerek dışa veriliyor.
export { PAY_FARK_NOTU, FIYATLI_NUSHA };

const esc = (v) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const n = (x) => (x == null ? "—" : sayi(x));
const kucuk = (t) => `<div style="font-size:9.5px;color:#64748b;">${t}</div>`;

export const SIPARIS_RAPOR_BASLIGI = "Sipariş Listesi";
// TOPLAM_BASLIGI, MALZEME_ETIKETI ve BELGE_SUTUNLARI.toplam 2026-11-15'ten beri basılmıyor (toplam tablosu ve malzeme satırı kalktı); eski
// altını okuyan kıyas ve "basılmaz" testleri için bilerek duruyor.
export const TOPLAM_BASLIGI = "Alınacak malzeme toplamı";
export const MALZEME_ETIKETI = "malzeme";
// Spec 0142 B-R1, B-R7/2, B-R5/2 (AC-7, AC-45, AC-48): belgenin sütunları TEK yerde; ölçü başlığı pencereyle aynı sabit.
export const BELGE_SUTUNLARI = Object.freeze({
  parca: ["Parça", OLCU_BASLIGI, "Sipariş adedi"],
  toplam: ["Malzeme", "Kesit", "Alınacak"],
  fiyat: ["Tutar"], // spec 0144 B-R3: yalnız fiyatlı nüshada; 2026-11-15 isteğiyle "Birim fiyat" sütunu kalktı
});
// Spec 0144 AC-43: iki hâl tek yerden.
export const belgeSutunlari = ({ fiyatli = false } = {}) => ({
  parca: fiyatli ? [...BELGE_SUTUNLARI.parca, ...BELGE_SUTUNLARI.fiyat] : BELGE_SUTUNLARI.parca,
  toplam: fiyatli ? [...BELGE_SUTUNLARI.toplam, ...BELGE_SUTUNLARI.fiyat] : BELGE_SUTUNLARI.toplam,
});
const HIZA = ["left", "left", "right", "right"];
export const ELLE_ISARETI = " (elle)";
export const ELLE_NOTU = "\"(elle)\" işaretli satırın adedi ya da kilosu öneriden değiştirildi.";

// Basılacak bölümler (B-R1/3, B-R1/4, AC-38, AC-56): motor süzgeçten geçirmiş satırları verir; silinmiş ya da bulunamayan
// tedarikçinin bölümü basılmaz (0140 AC-76). Parça ya da toplam satırı olan bölüm basılır.
// 2026-11-15: toplam tablosu basılmadığı için yalnız parça satırı olan bölüm basılır.
export const basilacakBolumler = (sonuc) => (sonuc?.tedarikciBolumleri?.belge || []).filter(b => !b.silinmis && b.satirlar.length);

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
// 2026-11-15 isteğiyle yalnız tutar hücresi: malzemeli parçada malzeme paylarının para birimi başına toplamı (ya da neden), hazır parçada
// maliyet × adet (TL); birim fiyat basılmaz.
const parcaFiyatHucreleri = (x) => (x.malzemeKalemli
  ? [`${x.parcaTutarlari?.length ? esc(pbToplamMetni(x.parcaTutarlari)) : ""}${x.tutarNeden ? kucuk(esc(x.tutarNeden)) : ""}`]
  : [tutarHucresi(x.tutarK, "TRY", x.tutarNeden)]);
// 2026-11-15 isteği: boydan sipariş edilen parçada hücre kesit başına "n boy (… mm)" yazar, altında parça adedi (iki nüshada da).
const siparisHucresi = (x) => (x.boySiparisleri?.length
  ? `${x.boySiparisleri.map(b => `${esc(boySiparisMetni(b))}${b.elle ? ELLE_ISARETI : ""}`).join("<br>")}${kucuk(esc(parcaAdetMetni(x.siparis)))}`
  : x.boyKalemiVar ? esc(parcaAdetMetni(x.siparis)) : n(x.siparis)); // triyaj (qa2 bulgu 3): boy yazılamayan boydan parçada birimli
const parcaTablo = (baslik, satirlar, fiyatli) => {
  const rows = [];
  for (const x of satirlar) {
    const eksik = x.olculer.some(o => o.eksik);
    const satir = [`${esc(x.ad)}${x.duzenlendi ? ELLE_ISARETI : ""}${eksik ? kucuk(esc(OLCU_GIRILMEMIS)) : ""}`, olcuHucresi(x.olculer), siparisHucresi(x)];
    rows.push(fiyatli ? [...satir, ...parcaFiyatHucreleri(x)] : satir); // 2026-11-15: altında malzeme satırı yok
  }
  return detayTablo(esc(baslik), belgeSutunlari({ fiyatli }).parca, rows, HIZA);
};
// Spec 0147: grup tabloları alt alta durduğu için sütunlar bütün gruplarda aynı genişlikte (otomatik genişlik her tabloda başka
// hizalanıyordu). Yalnız tedarikçi bölümlerinin tabloları; MODELLER ve ortak sunum modülü etkilenmez.
export const GRUP_TABLO_STILI = (fiyatli) => `.siparis-bolum table{table-layout:fixed;}${(fiyatli ? [26, 28, 22, 24] : [34, 38, 28])
  .map((w, i) => `.siparis-bolum th:nth-child(${i + 1}){width:${w}%;}`).join("")}`;
// Spec 0147 R1, R3: grup başına tablo (boş grup motorda yoktur).
const grupTablolari = (b, fiyatli) => (b.gruplar || []).map(g => parcaTablo(g.baslik, g.satirlar, fiyatli)).join("");
// 2026-11-15 kararı: parça satırlarından okunamayan sipariş miktarı (yuvarlama, asgari, elle) bölümün sonunda kesit başına satır.
const siparisFarkNotu = (b) => (b.siparisFarklari?.length
  ? `<div data-siparis-farki style="font-size:10.5px;margin-top:8px;"><b>${esc(SIPARIS_FARK_BASLIGI)}</b>${b.siparisFarklari.map(f => `<div>${esc(f.metin)}</div>`).join("")}</div>` : "");
// B-R7, B-R7/2, B-R7/3, B-R8: bölümün tek toplam satırı, kapsam cümlesi ve tutarsız sayacı.
const bolumToplami = (b) => `<div data-bolum-toplami style="font-size:11px;margin-top:8px;"><b>${BOLUM_TOPLAMI}:</b> ${esc(pbToplamMetni(b.toplamlar))}${
  b.dovizVar && b.toplamTLK != null ? ` · kayıtlı kurla ${esc(tlMetni(b.toplamTLK))}` : ""}${b.tutarsizSayi ? ` · ${esc(tutarsizMetni(b.tutarsizSayi))}` : ""}</div>${not(esc(TOPLAM_KAPSAM_CUMLESI))}`;

export const siparisRaporuHtml = (sonuc, { bugun, factory = null, partiAd = null, fiyatli = false } = {}) => {
  const girdi = partiAd ? `Üretim partisi: ${esc(partiAd)}` : "Elle girilen model satırları";
  const modeller = detayTablo("Model satırları", ["Model", "Makina adedi"], sonuc.satirlar.filter(s => !s.hata).map(s => [esc(s.model), n(s.adet)]), ["left", "right"]);
  const bolumler = basilacakBolumler(sonuc).map((b, i) => `<div class="siparis-bolum"${i > 0 ? " style=\"page-break-before:always;break-before:page;\"" : ""}>
  ${bolum(`${esc(b.ad)} · ${girdi}`, "", [grupTablolari(b, fiyatli), siparisFarkNotu(b), fiyatli ? bolumToplami(b) : "",
    b.kapaliKesitVar ? not(esc(KESIT_KAPALI_UYARISI)) : "",
    // Triyaj (qa2 bulgu 2): hücreye basılan elle boy adedi de notu doğurur.
    // Triyaj (qa2): fark notundaki elle kesit değeri de notu doğurur.
    b.satirlar.some(x => x.duzenlendi || x.boySiparisleri?.some(y => y.elle)) || b.siparisFarklari?.some(f => f.elle) ? not(esc(ELLE_NOTU)) : ""].join(""))}
</div>`).join("");
  return `${belgeAcilis({ title: SIPARIS_RAPOR_BASLIGI, baslik: SIPARIS_RAPOR_BASLIGI.toLocaleUpperCase("tr-TR"), ust: fiyatli ? `${girdi} · ${FIYATLI_NUSHA}` : girdi, donem: gun(bugun), factory, ekStil: GRUP_TABLO_STILI(fiyatli) })}
  ${bolum("MODELLER", "", modeller)}
  ${bolumler}
</body></html>`;
};
