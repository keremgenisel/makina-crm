// Spec 0134 R20, R20/2, AC-50, AC-101: sipariş listesinin yazdırma kurucusu. Kendi modülündedir (printTemplates.js'e yazılmaz;
// gider gizlilik taraması o dosyada "makinaMaliyet" adlı tanımı reddeder) ve sunum dilini 0059'un raporSunumu.js'inden alır.
// Saf: React almaz, saat okumaz (tarih parametre). Hücreler burada kaçışlanır (raporSunumu kaçışlamaz). Yalnız Türkçe (X5).
import { belgeAcilis, bolum, detayTablo, not, gun, sayi } from "./raporSunumu";
import { kgMetni, kesitMetni, NEDEN_BOY_YONTEMI } from "./siparisIhtiyaci";

const esc = (v) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const ikiHane = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const tl = (k) => (k == null ? "—" : `${ikiHane.format(k / 100)} TL`);
const SIMGE = { TRY: "TL", USD: "$", EUR: "€" };
const tutarPb = (k, pb) => (k == null ? "—" : `${ikiHane.format(k / 100)} ${SIMGE[pb] || esc(pb)}`);
const n = (x) => (x == null ? "—" : sayi(x));

export const SIPARIS_RAPOR_BASLIGI = "Sipariş İhtiyacı";
export const siparisRaporuHtml = (sonuc, { bugun, factory = null, partiAd = null } = {}) => {
  const ust = partiAd ? `Üretim partisi: ${esc(partiAd)}` : "Elle girilen model satırları";
  const modeller = detayTablo("Model satırları", ["Model", "Makina adedi"], sonuc.satirlar.filter(s => !s.hata).map(s => [esc(s.model), n(s.adet)]), ["left", "right"]);
  const parcalar = detayTablo("Parça ihtiyacı", ["Parça", "İhtiyaç", "Emniyet payı", "Stok", "Sipariş"],
    sonuc.parcalar.map(p => [`${esc(p.ad)}${p.silinmis ? " (silinmiş parça)" : ""}${p.set ? " · set" : ""}${p.patlatildi ? " · patlatıldı" : ""}`,
      // Triyaj (bulgu 6): pay ekranla aynı Türkçe biçimde.
      n(p.ihtiyac), p.pay == null ? "" : `%${p.pay.toLocaleString("tr-TR")}`, n(p.stok), n(p.siparis)]), ["left", "right", "right", "right", "right"]);
  const tedarikci = sonuc.tedarikciGruplari.map(t => bolum(esc(t.ad), tl(t.tutarTLK), t.malzemeler.map(m => detayTablo(esc(m.ad),
    ["Kesit", "Net kg", "Sipariş kg", "Boy", "Tutar", "TL"],
    m.kesitler.map(k => [esc(k.kesitMetni || kesitMetni(k.bicim, k.kesit)), k.netKg == null ? esc(NEDEN_BOY_YONTEMI) : esc(kgMetni(k.netKg)),
      k.siparisKg == null ? "—" : esc(kgMetni(k.siparisKg)), k.boyAdedi == null ? "—" : `${n(k.boyAdedi)} boy`, tutarPb(k.tutarK, k.paraBirimi), tl(k.tutarTLK)]),
    ["left", "right", "right", "right", "right", "right"])).join(""))).join("");
  return `${belgeAcilis({ title: SIPARIS_RAPOR_BASLIGI, baslik: SIPARIS_RAPOR_BASLIGI.toLocaleUpperCase("tr-TR"), ust, donem: gun(bugun), factory })}
  ${bolum("MODELLER", "", modeller)}
  ${bolum("PARÇA İHTİYACI", "", parcalar || not("Parça ihtiyacı yok."))}
  ${tedarikci || bolum("MALZEME İHTİYACI", "", not("Malzeme satırı olan parça yok."))}
  ${bolum("TOPLAM", tl(sonuc.toplamTLK), not("Tutarlar KDV hariçtir; döviz fiyatlı malzemede TL karşılığı malzeme kartındaki kurla hesaplanır."))}
</body></html>`;
};
