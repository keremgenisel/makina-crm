import { fmtTR, fmtCur } from "../../lib/utils";
import { ayOf } from "../../lib/gider";
import {
  URETIM_KAYNAK, ORTAK_KAYNAK_ETIKET, MALZEME_HARIC_NOTU, BUGUNKU_VERI_NOTU, marjBicim, carpanBicim,
} from "../../lib/makinaMaliyeti";
import { tl2 } from "./GiderAlanlari";
import { Rozet } from "./DonemRaporu";

// Tek makinanın maliyet ve kâr kırılımı (spec 0002 R6, AC-8). Giderler › Makina Kârlılığı satır detayı ve
// müşteri detayındaki "Maliyet ve Kâr" kutusu AYNI bileşeni kullanır. Rakamlar makinaKarlilik'ten gelir.
const ayAdi = (ay) => { if (!ay) return ""; const [y, m] = ay.split("-").map(Number); return new Date(y, m - 1, 1).toLocaleDateString("tr-TR", { month: "long", year: "numeric" }); };

export const MaliyetNotlari = ({ kaynak, yaklasik = false }) => (
  <div data-testid="maliyet-notlari" style={{ fontSize: 11.5, color: "var(--n500, #64748b)", lineHeight: 1.55, marginTop: 8 }}>
    <div><b>{MALZEME_HARIC_NOTU}</b> Gider olarak girilen malzeme alımları dahildir.</div>
    <div>Ortak gider kaynağı: <b>{ORTAK_KAYNAK_ETIKET[kaynak] || ORTAK_KAYNAK_ETIKET.gercek}</b>.</div>
    {yaklasik && <div>Kuru kayıtlı olmayan satışlar güncel kurla <b>yaklaşık</b> hesaplandı.</div>}
    <div>{BUGUNKU_VERI_NOTU}</div>
  </div>
);

const Satir = ({ etiket, deger, alt, kalin, isaret = "", renk }) => (
  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "6px 0", borderTop: "1px solid var(--n150, #f1f5f9)", fontSize: 13 }}>
    <span style={{ color: "var(--n600, #475569)" }}>{etiket}{alt && <span style={{ display: "block", fontSize: 11.5, color: "var(--n500, #64748b)" }}>{alt}</span>}</span>
    <span style={{ fontWeight: kalin ? 800 : 600, fontVariantNumeric: "tabular-nums", color: renk || "var(--n900, #0f172a)", whiteSpace: "nowrap" }}>{isaret}{deger}</span>
  </div>
);

export const MakinaMaliyetDetay = ({ detay }) => {
  if (!detay) return null;
  const d = detay;
  const uretimRozeti = d.uretimKaynak === URETIM_KAYNAK.TAHMIN ? <Rozet renk="turuncu">Üretim tarihi tahmini</Rozet>
    : d.uretimKaynak === URETIM_KAYNAK.DOGRUDAN ? <Rozet renk="mavi">Stoğa girmeden satıldı: üretim tarihi = satış tarihi</Rozet>
      : null;
  const ust = (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", fontSize: 12.5, color: "var(--n600, #475569)", marginBottom: 8 }}>
      <span>Üretim tarihi: <b>{d.uretimTarihi ? fmtTR(d.uretimTarihi) : "bilinmiyor"}</b></span>
      {uretimRozeti}
      {d.satildi && d.satisTarihi && <span>· Satış: <b>{fmtTR(d.satisTarihi)}</b></span>}
    </div>
  );
  if (d.bilinmiyor) return <div data-testid="maliyet-detay">{ust}<div style={{ fontSize: 13 }}>Üretim tarihi bulunamadığı için maliyet hesaplanamıyor. Makina düzenleme formundan üretim tarihini girin.</div><MaliyetNotlari kaynak={d.kaynak} /></div>;
  if (d.veriYok) return (
    <div data-testid="maliyet-detay">{ust}
      <div style={{ fontSize: 13, background: "var(--n100, #f8fafc)", border: "1px dashed var(--n300, #cbd5e1)", borderRadius: 8, padding: "10px 12px" }}>
        <b>Gider verisi girilmemiş.</b> Makina gider takibinin yürürlük ayından önce üretildi ({ayAdi(ayOf(d.uretimTarihi))}); maliyet ve kâr gösterilmez.
      </div>
    </div>
  );
  const kur = d.satildi && d.para !== "TRY";
  return (
    <div data-testid="maliyet-detay">
      {ust}
      <Satir etiket="Doğrudan giderler" alt={d.dogrudanKalemler.length ? d.dogrudanKalemler.map(k => `${fmtTR(k.tarih)} ${k.aciklama || "gider"}`).join(", ") : "Bu makinaya atanmış gider yok"} deger={tl2(d.dogrudan)} />
      <Satir etiket="Malzeme payları (model havuzları)" alt={d.malzemePayiAlamadi ? "Bu makina malzeme payı alamadı: modelin havuz adedi yetmedi." : d.malzemePaylari.length ? `${d.malzemePaylari.length} havuzdan` : "Modeline atanmış malzeme yok"} deger={tl2(d.malzeme)} />
      <Satir etiket="Ortak gider payı" alt={`${ayAdi(ayOf(d.uretimTarihi))} üretim ayının payı`} deger={tl2(d.ortakPay)} />
      <Satir etiket="Üretim maliyeti" deger={tl2(d.uretimMaliyeti)} kalin />
      {d.satildi && <>
        <Satir etiket="Komisyon" alt={kur && d.komisyonOrijinal ? fmtCur(d.komisyonOrijinal, d.para) : null} deger={d.komisyon != null ? tl2(d.komisyon) : "—"} isaret="+ " />
        <Satir etiket="Toplam maliyet" deger={d.toplamMaliyet != null ? tl2(d.toplamMaliyet) : "—"} kalin />
        <Satir etiket="Satış bedeli" alt={kur ? `${fmtCur(d.bedelOrijinal, d.para)}${d.kur ? ` · 1 ${d.para} = ${d.kur.toLocaleString("tr-TR", { maximumFractionDigits: 4 })} TL` : ""}` : null}
          deger={d.bedelYok ? "Girilmemiş" : d.satisBedeli != null ? tl2(d.satisBedeli) : "—"} />
        {d.bedelYok && <div style={{ fontSize: 12.5, color: "var(--n600, #475569)", padding: "6px 0" }}>Satış bedeli girilmemiş: kâr hesaplanmaz, maliyet zarar gibi gösterilmez.</div>}
        {!d.bedelYok && d.kurDurum === "yok" && <div style={{ fontSize: 12.5, color: "var(--orTx, #c2410c)", padding: "6px 0" }}>Kur kayıtlı değil ve güncel kur alınamadı: TL karşılığı hesaplanamadı.</div>}
        {d.kar != null && <>
          <Satir etiket={d.zarar ? "Zarar" : "Kâr"} deger={tl2(Math.abs(d.kar))} kalin renk={d.zarar ? "var(--red700, #b91c1c)" : "var(--grn700, #15803d)"} isaret={d.zarar ? "− " : ""} />
          <Satir etiket="Kâr marjı (kâr / satış bedeli)" deger={marjBicim(d.marj)} />
          <Satir etiket="Çarpan (satış bedeli / toplam maliyet)" deger={d.carpan != null ? `${carpanBicim(d.carpan)} kat` : "—"} />
        </>}
        {d.kurDurum === "yaklasik" && <div style={{ marginTop: 6 }}><Rozet renk="turuncu" title="Satış kuru kayıtlı değil; güncel kurla hesaplandı">Yaklaşık (güncel kur)</Rozet></div>}
      </>}
      {!d.satildi && <div style={{ fontSize: 12.5, color: "var(--n600, #475569)", padding: "6px 0" }}>Makina stokta: maliyeti satışa kadar stokta bekler.</div>}
      <MaliyetNotlari kaynak={d.kaynak} />
    </div>
  );
};
