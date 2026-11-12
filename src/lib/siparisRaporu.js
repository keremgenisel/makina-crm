// Spec 0134 R20, R20/2; spec 0140 E-R1–E-R8/2; spec 0142: sipariş listesinin yazdırma kurucusu. Kendi modülündedir (printTemplates.js'e
// yazılmaz) ve sunum dilini 0059'un raporSunumu.js'inden alır. Saf: React almaz, saat okumaz (tarih parametre). Hücreler burada
// kaçışlanır (raporSunumu kaçışlamaz, AC-50). Yalnız Türkçe (E-R6).
// Spec 0142: belge tedarikçiye verilen kesim listesidir. Motorun `tedarikciBolumleri.belge` alanından kurulur (B-R1/2: malzemeden
// kesilen parça malzemesinin tedarikçisinin bölümünde). Tedarikçi başına tek tablo `Parça · Ölçü · Sipariş adedi` (B-R1, A-R3/2);
// malzemeden kesilen parçanın altında malzeme satırı (B-R3), hazır parçada boş ölçü (B-R4); bölümün sonunda "Alınacak malzeme
// toplamı" kendi tablosu (B-R7/2). Stok, ihtiyaç ve para yok (A-R1–A-R6/2). Tek belge, başlık bandı bir kez, ilk bölüm hariç her
// bölümün üstünde sayfa sonu (0140 E-R8/2). MODELLER tablosu bilinçli olarak kalır (B-R8).
import { belgeAcilis, bolum, detayTablo, not, gun, sayi } from "./raporSunumu";
import { kgMetni, kesitMetni, boyCinsindenMi, OLCU_BASLIGI, OLCU_GIRILMEMIS, KESIT_KAPALI_UYARISI } from "./siparisIhtiyaci";

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
});
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
const parcaTablo = (satirlar) => {
  const rows = [];
  for (const x of satirlar) {
    const eksik = x.olculer.some(o => o.eksik);
    rows.push([`${esc(x.ad)}${x.duzenlendi ? ELLE_ISARETI : ""}${eksik ? kucuk(esc(OLCU_GIRILMEMIS)) : ""}`, olcuHucresi(x.olculer), n(x.siparis)]);
    // B-R3, B-R4 (AC-8, AC-10): malzeme satırı yalnız malzemeden kesilen parçada, ölçü ve adet yazmaz.
    for (const m of x.malzemeAdlari || []) if (m) rows.push([kucuk(`${MALZEME_ETIKETI} · ${esc(m)}`), "", ""]);
  }
  return detayTablo("Parçalar", BELGE_SUTUNLARI.parca, rows, ["left", "left", "right"]);
};
// Spec 0143 C-R2 (AC-24, AC-61): işaretli satır boy, işaretsiz (ve çubuğu kısa işaretli) satır kilogram.
const alinacak = (k) => `${boyCinsindenMi(k) || k.siparisKg == null ? `${n(k.boyAdedi)} boy` : esc(kgMetni(k.siparisKg))}${k.elle ? ELLE_ISARETI : ""}`;
const toplamTablo = (kesitler) => detayTablo(TOPLAM_BASLIGI, BELGE_SUTUNLARI.toplam,
  kesitler.map(k => [esc(k.malzemeAd), esc(k.kesitMetni || kesitMetni(k.bicim, k.kesit)), alinacak(k)]), ["left", "left", "right"]);

export const siparisRaporuHtml = (sonuc, { bugun, factory = null, partiAd = null } = {}) => {
  const girdi = partiAd ? `Üretim partisi: ${esc(partiAd)}` : "Elle girilen model satırları";
  const modeller = detayTablo("Model satırları", ["Model", "Makina adedi"], sonuc.satirlar.filter(s => !s.hata).map(s => [esc(s.model), n(s.adet)]), ["left", "right"]);
  const bolumler = basilacakBolumler(sonuc).map((b, i) => `<div class="siparis-bolum"${i > 0 ? " style=\"page-break-before:always;break-before:page;\"" : ""}>
  ${bolum(`${esc(b.ad)} · ${girdi}`, "", [b.satirlar.length ? parcaTablo(b.satirlar) : "", b.toplam.length ? toplamTablo(b.toplam) : "",
    b.kapaliKesitVar ? not(esc(KESIT_KAPALI_UYARISI)) : "",
    [...b.satirlar.filter(x => x.duzenlendi), ...b.toplam.filter(k => k.elle)].length ? not(esc(ELLE_NOTU)) : ""].join(""))}
</div>`).join("");
  return `${belgeAcilis({ title: SIPARIS_RAPOR_BASLIGI, baslik: SIPARIS_RAPOR_BASLIGI.toLocaleUpperCase("tr-TR"), ust: girdi, donem: gun(bugun), factory })}
  ${bolum("MODELLER", "", modeller)}
  ${bolumler}
</body></html>`;
};
