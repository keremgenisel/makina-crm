import { useState, useMemo } from "react";
import { fmtTR, fmtCur, parseMoney, parcaAdi, withDeleted, aramaNormalize } from "../../lib/utils";
import { sahipsizKayitlar } from "../../lib/sahipsiz";
import { yedekParcaGeriAl } from "../../lib/yedekParcaStok";
import { servisParcaGeriAl } from "../../lib/servisStok";
import { logAction } from "../../lib/audit";
import { Icon, Btn, ConfirmDialog, Modal } from "../ui";
import { Section } from "./Section";

// Ayarlar > Veri Yönetimi > Sahipsiz Kayıtlar — müşterisi artık hiçbir kayıtla (çöptekiler dahil)
// eşleşmeyen servis / Extra Kalıp / yedek parça (alıcı=müşteri) / ödeme kayıtlarını listeler.
// Her satır ya doğru müşteriye BAĞLANIR (customerId/musteriId + tahsis düzeltilir) ya da SİLİNİR
// (çöpe; stok hareketleri geri alınır). Bu kayıtlar Finans ve aylık rapora zaten girmez
// (lib/sahipsiz.js); araç, "—" olarak görünen mirası temizlemek için.
const TUR_ETIKET = { servis: "Servis", kalip: "Extra Kalıp", yedekParca: "Yedek Parça Satışı", odeme: "Ödeme/Kapora" };
const TUR_AUDIT = { servis: "servis", kalip: "kalip_satisi", yedekParca: "yedek_parca_satis", odeme: "odeme" };

export const SettingsSahipsiz = ({
  rawCustomers = [], rawServices = [], rawPartSales = [], rawYedekParcaSatislar = [], rawPayments = [], rawParts = [],
  setServices = null, setPartSales = null, setYedekParcaSatislar = null, setPayments = null,
  setPartStock = null, setPartStockLog = null,
  serverPermissions = null, showToast = () => {},
}) => {
  const [bagla, setBagla] = useState(null);   // { tur, kayit } — müşteri seçme modalı
  const [ara, setAra] = useState("");
  const [sil, setSil] = useState(null);       // { tur, kayit } — silme onayı

  const liste = useMemo(() => sahipsizKayitlar({
    customers: rawCustomers, services: rawServices, partSales: rawPartSales, yedekParcaSatislar: rawYedekParcaSatislar, payments: rawPayments,
  }), [rawCustomers, rawServices, rawPartSales, rawYedekParcaSatislar, rawPayments]);

  const canliMusteriler = useMemo(() => rawCustomers.filter(c => !c.deletedAt), [rawCustomers]);
  const adaylar = useMemo(() => {
    const q = aramaNormalize(ara);
    const l = q ? canliMusteriler.filter(c => aramaNormalize(`${c.name || ""} ${c.serialNo || ""} ${c.model || ""}`).includes(q)) : canliMusteriler;
    return l.slice(0, 30);
  }, [canliMusteriler, ara]);

  const ozet = ({ tur, kayit: r }) => {
    if (tur === "servis") return `${r.type || "Servis"}${r.date ? " · " + fmtTR(r.date) : ""}${parseMoney(r.servisUcreti) ? " · " + fmtCur(parseMoney(r.servisUcreti), r.currency) : ""}`;
    if (tur === "kalip") return `${r.ad || "Kalıp"}${r.olcu ? " " + r.olcu : ""}${r.tarih ? " · " + fmtTR(r.tarih) : ""}${parseMoney(r.ucret) ? " · " + fmtCur(parseMoney(r.ucret), r.currency) : ""}`;
    if (tur === "yedekParca") {
      const p = rawParts.find(x => String(x.id) === String(r.partId));
      return `${parcaAdi(p) || "(parça)"} × ${r.miktar || 0}${r.tarih ? " · " + fmtTR(r.tarih) : ""}${parseMoney(r.birimFiyat) ? " · " + fmtCur((parseInt(r.miktar) || 0) * parseMoney(r.birimFiyat), r.currency) : " · 0"}`;
    }
    return `${fmtCur(parseMoney(r.tutar), r.currency)}${r.tarih ? " · " + fmtTR(r.tarih) : ""}${r.yontem ? " · " + r.yontem : ""}`;
  };

  const setterOf = (tur) => ({ servis: setServices, kalip: setPartSales, yedekParca: setYedekParcaSatislar, odeme: setPayments })[tur];

  const baglaUygula = (musteri) => {
    const { tur, kayit } = bagla;
    const set = setterOf(tur);
    if (!set) return;
    set(p => p.map(x => {
      if (x.id !== kayit.id) return x;
      if (tur === "yedekParca") {
        // Alıcı bu müşteri; eski (kayıp) müşteriye işaret eden tahsisler de yeni müşteriye taşınır
        const eskiId = kayit.musteriId;
        return { ...x, musteriId: musteri.id, tahsisler: (x.tahsisler || []).map(t => t.customerId === eskiId ? { ...t, customerId: musteri.id } : t) };
      }
      return { ...x, customerId: musteri.id };
    }));
    logAction({ serverPermissions, action: "duzenlendi", entity: TUR_AUDIT[tur], entityId: kayit.id, entityName: musteri.name, detail: { sahipsizBaglandi: true, eskiMusteriId: bagla.musteriId } });
    showToast(`${TUR_ETIKET[tur]} kaydı "${musteri.name}" müşterisine bağlandı.`);
    setBagla(null); setAra("");
  };

  const silUygula = () => {
    const { tur, kayit } = sil;
    const set = setterOf(tur);
    if (!set) return;
    if (tur === "yedekParca") yedekParcaGeriAl(kayit.id, setPartStock, setPartStockLog);
    if (tur === "servis") servisParcaGeriAl(kayit.id, setPartStock, setPartStockLog);
    set(p => withDeleted(p, x => x.id === kayit.id, new Date().toISOString()));
    logAction({ serverPermissions, action: "silindi", entity: TUR_AUDIT[tur], entityId: kayit.id, entityName: "(sahipsiz kayıt)", detail: { sahipsiz: true, eskiMusteriId: sil.musteriId } });
    showToast(`${TUR_ETIKET[tur]} kaydı Çöp Kutusu'na taşındı.`);
    setSil(null);
  };

  return (
    <>
      <Section title="Sahipsiz Kayıtlar" icon="search" wide>
        <div className="section-desc">
          Müşterisi artık bulunmayan (silinip kalıcı olarak temizlenmiş ya da hiç eşleşmeyen) servis, Extra Kalıp,
          yedek parça satışı ve ödeme kayıtları. Bu kayıtlar Finans ve Aylık Rapor'a dahil edilmez; burada doğru
          müşteriye bağlayabilir ya da Çöp Kutusu'na taşıyabilirsiniz (silmede parça stoğu iade edilir).
        </div>
        {liste.length === 0 ? (
          <div style={{ padding: "24px 0", textAlign: "center", color: "var(--n400, #94a3b8)", fontSize: 13 }}>Sahipsiz kayıt yok.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--n500, #64748b)", fontSize: 11, textTransform: "uppercase", letterSpacing: ".4px" }}>
                <th style={{ padding: "8px 10px" }}>Tür</th><th style={{ padding: "8px 10px" }}>Kayıt</th><th style={{ padding: "8px 10px" }}>Eski Müşteri ID</th><th style={{ padding: "8px 10px", textAlign: "right" }}>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {liste.map(item => (
                <tr key={`${item.tur}-${item.kayit.id}`} style={{ borderTop: "1px solid var(--n150, #f1f5f9)" }}>
                  <td style={{ padding: "10px", fontWeight: 600 }}>{TUR_ETIKET[item.tur]}</td>
                  <td style={{ padding: "10px" }}>{ozet(item)}</td>
                  <td style={{ padding: "10px", fontFamily: "monospace", color: "var(--n500, #64748b)" }}>{String(item.musteriId)}</td>
                  <td style={{ padding: "10px", textAlign: "right", whiteSpace: "nowrap" }}>
                    <span style={{ display: "inline-flex", gap: 6 }}>
                      <Btn small variant="ghost" onClick={() => { setBagla(item); setAra(""); }}><Icon name="edit" size={12} /> Müşteriye Bağla</Btn>
                      <Btn small variant="danger" onClick={() => setSil(item)}><Icon name="trash" size={12} /> Sil</Btn>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      {bagla && (
        <Modal title="Müşteriye Bağla" onClose={() => setBagla(null)}>
          <div style={{ fontSize: 13, color: "var(--n500, #64748b)", marginBottom: 12 }}>
            <b>{TUR_ETIKET[bagla.tur]}</b> · {ozet(bagla)} — hangi müşteriye ait?
          </div>
          <div style={{ position: "relative", marginBottom: 10 }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--n400, #94a3b8)" }}><Icon name="search" size={15} /></span>
            <input autoFocus value={ara} onChange={e => setAra(e.target.value)} placeholder="Firma adı, seri no veya model ara..."
              style={{ padding: "9px 12px 9px 36px", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 8, width: "100%", boxSizing: "border-box", fontSize: 14, background: "var(--n100, #f8fafc)", outline: "none" }} />
          </div>
          <div style={{ maxHeight: 320, overflowY: "auto", border: "1px solid var(--n150, #f1f5f9)", borderRadius: 8 }}>
            {adaylar.length === 0 ? (
              <div style={{ padding: 16, textAlign: "center", color: "var(--n400, #94a3b8)", fontSize: 13 }}>Eşleşen müşteri yok.</div>
            ) : adaylar.map(c => (
              <button key={c.id} type="button" onClick={() => baglaUygula(c)}
                style={{ display: "flex", width: "100%", justifyContent: "space-between", gap: 10, padding: "9px 12px", border: "none", borderBottom: "1px solid var(--n150, #f1f5f9)", background: "transparent", cursor: "pointer", textAlign: "left", fontSize: 13, color: "var(--n900, #0f172a)" }}>
                <span style={{ fontWeight: 600 }}>{c.name}</span>
                <span style={{ color: "var(--n500, #64748b)", fontSize: 12 }}>{[c.model, c.serialNo].filter(Boolean).join(" · ")}</span>
              </button>
            ))}
          </div>
        </Modal>
      )}

      {sil && (
        <ConfirmDialog
          message={`${TUR_ETIKET[sil.tur]} kaydı (${ozet(sil)}) Çöp Kutusu'na taşınacak${sil.tur === "yedekParca" || sil.tur === "servis" ? "; kullanılan parçalar stoğa iade edilecek" : ""}. 30 gün içinde geri alabilirsiniz.`}
          onConfirm={silUygula} onCancel={() => setSil(null)} />
      )}
    </>
  );
};
