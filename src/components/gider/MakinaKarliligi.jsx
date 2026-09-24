import { useMemo, useState } from "react";
import { fmtTR, fmtCur } from "../../lib/utils";
import { karlilikOzeti, makinaKarlilik, marjBicim, carpanBicim } from "../../lib/makinaMaliyeti";
import { Modal } from "../ui";
import { tl2 } from "./GiderAlanlari";
import { StatKart, Rozet } from "./DonemRaporu";
import { MakinaMaliyetDetay, MaliyetNotlari } from "./MakinaMaliyetDetay";
import { FiyatOnerisi } from "./FiyatOnerisi";

// Giderler › Makina Kârlılığı (spec 0002 R7, R26). Salt görünüm: rakamlar karlilikOzeti'nden gelir; ağır
// hesap (hesaplaMakinaMaliyetleri) App'te bir kez yapılıp buraya iner (C9).
const kart = { background: "var(--surface, #ffffff)", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 12, padding: 18 };
const baslik = (t, alt) => (<div style={{ marginBottom: 10 }}><div style={{ fontSize: 15, fontWeight: 700 }}>{t}</div>{alt && <div style={{ fontSize: 12, color: "var(--n500, #64748b)", marginTop: 2 }}>{alt}</div>}</div>);
const ozetSatir = (etiket, deger, alt, testId) => (
  <div data-testid={testId} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "8px 0", borderTop: "1px solid var(--n150, #f1f5f9)", fontSize: 13 }}>
    <span>{etiket}{alt && <span style={{ display: "block", fontSize: 11.5, color: "var(--n500, #64748b)" }}>{alt}</span>}</span>
    <b style={{ whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{deger}</b>
  </div>
);
const th = { padding: "8px 6px", fontSize: 11.5, fontWeight: 700, color: "var(--n600, #475569)", textAlign: "right", whiteSpace: "nowrap" };
const td = { padding: "8px 6px", fontSize: 13, textAlign: "right", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" };

export const MakinaKarliligi = ({ sonuc, baslangic, bitis, rates = null, bugun, modeller = [] }) => {
  const oz = useMemo(() => karlilikOzeti(sonuc, { baslangic, bitis, rates }), [sonuc, baslangic, bitis, rates]);
  const [detayAnahtar, setDetayAnahtar] = useState(null);
  const standart = oz.kaynak === "standart";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }} data-testid="makina-karliligi">
      {oz.bos ? (
        <div style={{ ...kart, textAlign: "center", padding: "28px 18px" }} data-testid="karlilik-bos">
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Bu dönemde satılmış makina yok</div>
          <div style={{ fontSize: 13, color: "var(--n500, #64748b)" }}>Dönem, makinanın satış (kurulum) tarihine göre seçilir. Fiyat önerisi aşağıda yine kullanılabilir.</div>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <StatKart etiket="Satış bedeli (TL)" deger={tl2(oz.toplam.satisBedeli)} alt={`${oz.satirlar.length} makina`} renk="#1d4ed8" />
            <StatKart etiket="Toplam maliyet" deger={tl2(oz.toplam.toplamMaliyet)} alt="Üretim maliyeti + komisyon" renk="#c2410c" />
            <StatKart etiket={oz.toplam.kar < 0 ? "Dönem zararı" : "Dönem kârı"} deger={tl2(Math.abs(oz.toplam.kar))} alt={`Marj ${marjBicim(oz.toplam.marj)} · Çarpan ${carpanBicim(oz.toplam.carpan)}`} renk={oz.toplam.kar < 0 ? "#b91c1c" : "#16a34a"} />
          </div>
          <div style={kart}>
            {baslik("Satılan makinalar", "Satır tıklanınca maliyetin nasıl oluştuğu açılır. Marj = kâr / satış bedeli.")}
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }} data-testid="karlilik-tablosu">
                <thead><tr style={{ background: "var(--n100, #f8fafc)" }}>
                  <th style={{ ...th, textAlign: "left" }}>Makina</th><th style={th}>Satış</th><th style={th}>Satış bedeli</th><th style={th}>Toplam maliyet</th><th style={th}>Kâr</th><th style={th}>Marj</th><th style={th}>Çarpan</th>
                </tr></thead>
                <tbody>
                  {oz.satirlar.map(d => (
                    <tr key={d.anahtar} onClick={() => setDetayAnahtar(d.anahtar)} style={{ cursor: "pointer", borderTop: "1px solid var(--n150, #f1f5f9)" }}>
                      <td style={{ ...td, textAlign: "left", whiteSpace: "normal" }}>
                        <b>{d.makina.ad || "—"}</b>
                        <div style={{ fontSize: 11.5, color: "var(--n500, #64748b)" }}>{[d.makina.model, d.makina.seri && `Seri ${d.makina.seri}`].filter(Boolean).join(" · ")}</div>
                        {d.kurDurum === "yaklasik" && <Rozet renk="turuncu">Yaklaşık</Rozet>}
                      </td>
                      <td style={td}>{fmtTR(d.satisTarihi)}</td>
                      <td style={td}>{tl2(d.satisBedeli)}{d.para !== "TRY" && <div style={{ fontSize: 11, color: "var(--n500, #64748b)" }}>{fmtCur(d.bedelOrijinal, d.para)}</div>}</td>
                      <td style={td}>{tl2(d.toplamMaliyet)}</td>
                      <td style={{ ...td, fontWeight: 700, color: d.zarar ? "var(--red700, #b91c1c)" : "var(--grn700, #15803d)" }}>{d.zarar ? `Zarar ${tl2(Math.abs(d.kar))}` : tl2(d.kar)}</td>
                      <td style={td}>{marjBicim(d.marj)}</td>
                      <td style={td}>{carpanBicim(d.carpan)}</td>
                    </tr>
                  ))}
                  <tr style={{ borderTop: "2px solid var(--n300, #cbd5e1)", fontWeight: 800 }} data-testid="karlilik-toplam">
                    <td style={{ ...td, textAlign: "left" }}>Dönem toplamı</td><td style={td} />
                    <td style={td}>{tl2(oz.toplam.satisBedeli)}</td><td style={td}>{tl2(oz.toplam.toplamMaliyet)}</td>
                    <td style={td}>{oz.toplam.kar < 0 ? `Zarar ${tl2(Math.abs(oz.toplam.kar))}` : tl2(oz.toplam.kar)}</td>
                    <td style={td}>{marjBicim(oz.toplam.marj)}</td><td style={td}>{carpanBicim(oz.toplam.carpan)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <div style={kart}>
        {baslik("Dönem özeti satırları")}
        {ozetSatir(`Stoktaki makinaların taşıdığı maliyet (${fmtTR(oz.stokta.tarih)} itibarıyla)`, tl2(oz.stokta.maliyet), `${oz.stokta.adet} makina üretilmiş ama bu tarihte henüz satılmamış. Bilgi amaçlıdır, stok değerlemesi değildir.`, "ozet-stokta")}
        {ozetSatir("Satış bedeli girilmemiş makinalar", `${oz.bedelsiz.adet} makina · ${tl2(oz.bedelsiz.maliyet)}`, "Kâr ve marj toplamlarına girmez.", "ozet-bedelsiz")}
        {oz.kursuz.adet > 0 && ozetSatir("TL karşılığı hesaplanamayan satışlar", `${oz.kursuz.adet} makina`, "Kur kayıtlı değil ve güncel kur alınamadı; toplamlara girmez.", "ozet-kursuz")}
        {oz.veriYok.adet > 0 && ozetSatir("Gider verisi girilmemiş (yürürlük öncesi üretim)", `${oz.veriYok.adet} makina`, "Maliyet ve kâr gösterilmez.", "ozet-veriyok")}
        {oz.bilinmiyor.adet > 0 && ozetSatir("Üretim tarihi bilinmeyen", `${oz.bilinmiyor.adet} makina`, "Makina düzenleme formundan üretim tarihi girilebilir.", "ozet-bilinmiyor")}
        {ozetSatir("Dağıtılmamış ortak gider", oz.dagitilmamis ? tl2(oz.dagitilmamis.tutar) : "Hesaplanamadı",
          oz.dagitilmamis ? "Hiç makina üretilmeyen ayların ortak gideri; sonraki aylara devredilmez." : "Bu satır ay bazlıdır. Seçili aralık bir ayı ortadan kesiyor; tam ayları kapsayan bir aralık seçin.", "ozet-dagitilmamis")}
        {standart && ozetSatir("Gerçekleşen ortak gider − standart toplam", oz.standartFark ? tl2(oz.standartFark.fark) : "Hesaplanamadı",
          oz.standartFark ? `Gerçekleşen ${tl2(oz.standartFark.gercek)}, standart ${tl2(oz.standartFark.standart)}.` : "Bu satır ay bazlıdır. Seçili aralık bir ayı ortadan kesiyor; tam ayları kapsayan bir aralık seçin.", "ozet-standart-fark")}
        {standart && oz.standartEksik.length > 0 && (
          <div data-testid="ozet-standart-eksik" style={{ fontSize: 12.5, color: "var(--n600, #475569)", padding: "8px 0", borderTop: "1px solid var(--n150, #f1f5f9)" }}>
            Sürümü olmayan standart kalemler sıfır sayıldı: {oz.standartEksik.map(x => `${x.ay}: ${x.adlar.join(", ")}`).join(" · ")}
          </div>
        )}
        {oz.modeller.length > 0 && (
          <div data-testid="ozet-modeller" style={{ marginTop: 6 }}>
            {oz.modeller.map(m => <div key={m.model}>{ozetSatir(`${m.model}: henüz makinalara yüklenmemiş malzeme gideri`, tl2(m.yuklenmemis),
              m.payAlamamis > 0 ? `Malzeme payı alamamış makina sayısı: ${m.payAlamamis}` : null, `model-${m.model}`)}</div>)}
          </div>
        )}
        <MaliyetNotlari kaynak={oz.kaynak} yaklasik={oz.yaklasikVar} />
      </div>

      <FiyatOnerisi sonuc={sonuc} bugun={bugun} modeller={modeller} />

      {detayAnahtar && (
        <Modal title="Makina maliyet detayı" onClose={() => setDetayAnahtar(null)}>
          <MakinaMaliyetDetay detay={makinaKarlilik(sonuc, detayAnahtar, rates)} />
        </Modal>
      )}
    </div>
  );
};
