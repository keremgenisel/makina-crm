import { fmtCur, parseMoney, parcaAdi, fmtTR, satisFirmaGoster } from "../lib/utils";
import { Btn, Modal, Input, Icon } from "./ui";
import { aliciAd } from "./stock/TahsisModal";
import { logAction } from "../lib/audit";
import { yedekParcaEtiketYazdir, kalipEtiketYazdir } from "../lib/printTemplates";

// Bayiye/müşteriye yedek parça (kargo) satışları artık Servis Panosu'nun kendi sütunlarında servis
// kartlarıyla BİRLİKTE görünür (ayrı sekme yok). Burası o birleşik görünümün kargo parçalarını sağlar:
// KargoKart (📦 kart) ve KargoDetayModal (kargo bilgisi düzenleme + makinaya tahsis). Sütun eşlemesi
// (Hazırlanıyor→Bekliyor, Kargoya Verildi→Yapılıyor, Teslim Edildi→Tamamlandı) ServisPanosu'ndadır.
export const KARGO_DURUMLAR = [
  { key: "Hazırlanıyor", baslik: "Hazırlanıyor", renk: "var(--amb600, #d97706)", bg: "var(--ambBg, #fffbeb)", br: "var(--ambBr, #fde68a)" },
  { key: "Kargoya Verildi", baslik: "Kargoya Verildi", renk: "var(--blu600, #2563eb)", bg: "var(--bluBg, #eff6ff)", br: "var(--bluBr, #bfdbfe)" },
  { key: "Teslim Edildi", baslik: "Teslim Edildi", renk: "var(--grn600, #16a34a)", bg: "var(--grnBg, #f0fdf4)", br: "var(--grnBr, #bbf7d0)" },
];
export const kargoDurumBilgi = (key) => KARGO_DURUMLAR.find(x => x.key === key) || KARGO_DURUMLAR[0];
// Fabrika tesliminde kargo yok → ortadaki "Kargoya Verildi" yerine "Teslime Hazır" göster (diğerleri aynı).
const FABRIKA_TESLIM_ETIKET = { "Hazırlanıyor": "Hazırlanıyor", "Kargoya Verildi": "Teslime Hazır", "Teslim Edildi": "Teslim Edildi" };
// Bir kargo/kalıp kaydının GÖRÜNEN durum etiketi: fabrika teslimse fabrika sözlüğü, değilse kargo sözlüğü.
export const teslimDurumEtiket = (s) => s?.fabrikaTeslim ? (FABRIKA_TESLIM_ETIKET[s.kargoDurum] || s.kargoDurum || "") : kargoDurumBilgi(s?.kargoDurum).baslik;

// Servis kartıyla aynı sütunda duran kargo kartı — 📦 KARGO etiketiyle ayrışır. Sürüklenince türü
// "kargo:" öneğiyle taşınır (servis kartından ayırt edilsin diye).
export const KargoKart = ({ s, dealers = [], parts = [], customers = [], calisanlar = [], canKargo = false, arsiv = false, dragKapali = false, tur = "kargo", onClick, onSorumluChange, onArsivle, onGeriAl, onKontrolHover, yaniyor = false }) => {
  const d = kargoDurumBilgi(s.kargoDurum);
  const kalip = tur === "kalip"; // Extra Kalıp kargosu (partSales) — yedek parça kargosundan farklı kayıt şekli
  const tamamlandi = s.kargoDurum === "Teslim Edildi"; // = Tamamlandı sütunu
  const surukle = canKargo && !arsiv;
  // "Kim gönderiyor?" — servis kartındaki teknisyen seçicisiyle aynı tasarım (firma çalışanları).
  const sorumluBos = !s.kargoSorumlusu;
  const adlar = (calisanlar || []).map(c => c.ad).filter(Boolean);
  const sorumluListe = s.kargoSorumlusu && !adlar.includes(s.kargoSorumlusu) ? [s.kargoSorumlusu, ...adlar] : adlar;
  const grup = s._grup && s._grup.length ? s._grup : [s]; // toplu satış: karttaki tüm kalemler
  const baslik = kalip ? ((customers || []).find(c => c.id === Number(s.customerId))?.name || "(müşteri yok)") : aliciAd(s, dealers, customers);
  const rozet = kalip
    ? { etiket: <><Icon name="box" size={11} /> KALIP</>, bg: "var(--purBg, #f5f3ff)", fg: "var(--purTx, #7c3aed)", br: "var(--purBr, #ddd6fe)" }
    : { etiket: <><Icon name="parts" size={11} /> YEDEK PARÇA</>, bg: "var(--n100, #f8fafc)", fg: "var(--teal, #0d9488)", br: "var(--n200, #e2e8f0)" };
  return (
    <article draggable={surukle && !dragKapali}
      className={yaniyor ? "servis-alarm-yanip" : undefined}
      onDragStart={surukle ? (e => { e.dataTransfer.setData("text/plain", (kalip ? "kalip:" : "kargo:") + s.id); e.dataTransfer.effectAllowed = "move"; }) : undefined}
      onClick={() => onClick?.(s.id)} title={kalip ? "Kalıp kargo detayı için tıklayın" : "Kargo detayı / makinaya tahsis için tıklayın"}
      style={{ background: arsiv ? "var(--n100, #f8fafc)" : "var(--surface, #fff)", border: "1px solid var(--n200, #e2e8f0)", borderLeft: `3px solid ${d.renk}`, borderRadius: 12, padding: arsiv ? "10px 12px" : "12px 13px", boxShadow: arsiv ? "none" : "0 1px 3px rgba(20,20,30,.07)", opacity: arsiv ? 0.9 : 1, cursor: surukle ? "grab" : "pointer" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 800, letterSpacing: .4, borderRadius: 6, padding: "2px 7px", background: rozet.bg, color: rozet.fg, border: `1px solid ${rozet.br}` }}>{rozet.etiket}</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 800, letterSpacing: .4, borderRadius: 6, padding: "2px 7px", background: d.bg, color: d.renk, border: `1px solid ${d.br}` }}>{s.fabrikaTeslim ? "🏭 FABRİKA TESLİM" : "📦 KARGO"}</span>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--n400, #94a3b8)" }}>{teslimDurumEtiket(s)}</span>
      </div>
      <div style={{ fontSize: 14, fontWeight: 750, color: "var(--n900, #0f172a)" }}>{baslik}{grup.length > 1 ? <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--n400, #94a3b8)", marginLeft: 6 }}>· {grup.length} kalem</span> : null}</div>
      <div style={{ fontSize: 12.5, color: "var(--n600, #475569)", marginTop: 2, display: "flex", flexDirection: "column", gap: 1 }}>
        {grup.map(g => (
          <div key={g.id}>
            {kalip
              ? (g.ad || "(kalıp)") + (g.olcu ? ` · ${g.olcu}` : "")
              : <>{parcaAdi((parts || []).find(p => String(p.id) === String(g.partId))) || "(parça)"} · <strong>{g.miktar} adet</strong></>}
          </div>
        ))}
      </div>
      {kalip && satisFirmaGoster(s) && (
        <div style={{ display: "inline-block", fontSize: 10.5, fontWeight: 700, marginTop: 4, borderRadius: 6, padding: "2px 7px", color: "var(--n600, #475569)", background: "var(--n150, #f1f5f9)", border: "1px solid var(--n200, #e2e8f0)" }}>Satış Yapan: {satisFirmaGoster(s)}</div>
      )}
      {/* Farklı teslimat adresi varsa kartta uyarı — kargoyu hazırlayan yanlış adrese göndermez.
          Hem yedek parça hem Extra Kalıp kargosu için (ikisinde de teslimatFarkli var). */}
      {s.teslimatFarkli && (
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700, color: "var(--acc, #e85d1a)", marginTop: 7, padding: "5px 9px", background: "var(--ambBg3, #fff7ed)", border: "1px solid var(--ambBr3, #fed7aa)", borderRadius: 8 }}>
          📍 Farklı adres{[s.teslimatSehir, s.teslimatIlce].filter(Boolean).join(" / ") ? ` · ${[s.teslimatSehir, s.teslimatIlce].filter(Boolean).join(" / ")}` : ""}
        </div>
      )}
      <div style={{ fontSize: 11.5, color: "var(--n400, #94a3b8)", marginTop: 3 }}>
        {fmtTR(s.tarih)}{s.kargoTakipNo ? ` · ${s.kargoFirma || "Kargo"}: ${s.kargoTakipNo}` : ""}
      </div>
      {/* "Kim gönderiyor?" seçicisi — servis kartındaki teknisyen seçicisiyle aynı tasarım. macOS'ta
          <select>, draggable=true bir ata içindeyken seçim işlemiyor; kontrol satırına gelince kartın
          draggable'ını React-kontrollü kapatıyoruz (onKontrolHover → parent dragKapali). */}
      {!arsiv && (
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 10, paddingTop: 9, borderTop: "1px dashed var(--n200, #e2e8f0)" }}
          onClick={e => e.stopPropagation()}
          onMouseEnter={() => onKontrolHover?.(true)}
          onMouseLeave={() => onKontrolHover?.(false)}>
          <span style={{ fontSize: 12 }}>🚚</span>
          <select value={s.kargoSorumlusu || ""} disabled={!canKargo}
            onChange={e => onSorumluChange?.(s.id, e.target.value)}
            style={{ flex: 1, minWidth: 0, font: "inherit", fontSize: 12.5, fontWeight: sorumluBos ? 500 : 600, color: sorumluBos ? "var(--n400, #94a3b8)" : "var(--n800, #1e293b)", background: "var(--n100, #f8fafc)", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 8, padding: "5px 8px", cursor: canKargo ? "pointer" : "default" }}>
            <option value="">Kim gönderiyor?</option>
            {sorumluListe.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          {/* Teslim Edildi (Tamamlandı) kargo panodan kaldırılabilir — servislerdeki gibi (kayıt silinmez).
              Görünürlük onArsivle'nin geçilmesine bağlı (parent kargo_pano_kaldir iznine göre geçer). */}
          {tamamlandi && onArsivle && (
            <button type="button" title="Kartı panodan kaldır (satış kaydı silinmez)" onClick={e => { e.stopPropagation(); onArsivle(); }}
              style={{ flexShrink: 0, fontSize: 11.5, fontWeight: 600, color: "var(--n500, #64748b)", background: "var(--n100, #f8fafc)", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 8, padding: "5px 9px", cursor: "pointer", whiteSpace: "nowrap" }}>🗄 Kaldır</button>
          )}
        </div>
      )}
      {arsiv && onGeriAl && (
        <div style={{ marginTop: 8 }} onClick={e => e.stopPropagation()}>
          <button type="button" onClick={() => onGeriAl()}
            style={{ fontSize: 12, fontWeight: 600, color: "var(--blu600, #2563eb)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>↩ Panoya Geri Al</button>
        </div>
      )}
    </article>
  );
};

// Kargo kartına tıklayınca açılan detay: kargo durumu/bilgisi hızlı düzenleme. Makina tahsisi burada
// YAPILMAZ — tahsis Stok > Yedek Parça Satışı sekmesinden yapılır. `grup` = tek karta karşılık gelen
// kayıt(lar) dizisi (toplu satışta batchId'li tüm kayıtlar). Ortak kargo alanları grubun TÜMÜNE uygulanır.
export const KargoDetayModal = ({ grup, setYedekParcaSatislar = null, setPartSales = null, tur = "kargo", dealers = [], parts = [], customers = [], factory = null, canKargo = false, onClose, serverPermissions = null }) => {
  if (!grup || !grup.length) return null;
  const kalip = tur === "kalip"; // Extra Kalıp kargosu (partSales) — alıcı = müşteri
  const setKayit = kalip ? setPartSales : setYedekParcaSatislar;
  const satis = grup[0]; // ortak kargo alanları için birincil kayıt (batch tek kargoyla gider)
  const fabTeslim = !!satis.fabrikaTeslim; // fabrika teslim → kargo firma/takip yok, "Teslim" etiketleri (kalıp/yedek parça)
  const coklu = grup.length > 1;
  const idSet = new Set(grup.map(s => s.id));
  const partAd = (s) => parcaAdi((parts || []).find(p => String(p.id) === String(s.partId)));
  // Alıcı iletişim: kalıp → müşteri (customerId); kargo → bayi/müşteri (aliciTipi).
  const musteri = kalip ? customers.find(c => c.id === Number(satis.customerId)) : null;
  const alici = kalip ? musteri : (satis.aliciTipi === "musteri" ? customers.find(c => c.id === Number(satis.musteriId)) : dealers.find(d => d.id === Number(satis.dealerId)));
  const aliciSehir = alici ? [alici.ilce, alici.city, alici.country].filter(Boolean).join(" / ") : "";
  const iletisimSatirlari = ((!kalip && satis.disFirma)
    ? [["Firma (Diğer)", satis.disFirmaAd], ["Yetkili", satis.disFirmaYetkili], ["Telefon", satis.disFirmaTel], ["Adres", satis.disFirmaAdres], ["Şehir / Ülke", [satis.disFirmaSehir, satis.disFirmaUlke].filter(Boolean).join(" / ")]]
    : (alici ? ((kalip || satis.aliciTipi === "musteri")
    ? [["Yetkili 1", alici.yetkili1Ad || alici.contact], ["Yetkili 1 Tel.", alici.yetkili1Tel],
       ["Yetkili 2", alici.yetkili2Ad], ["Yetkili 2 Tel.", alici.yetkili2Tel],
       ["Şirket Tel.", alici.phone], ["Adres", alici.adres], ["Şehir / Ülke", aliciSehir]]
    : [["İletişim Kişisi", alici.contact], ["Telefon", alici.phone],
       ["E-posta", alici.email], ["Adres", alici.adres], ["Şehir / Ülke", aliciSehir]]) : [])).filter(([, v]) => v);
  const baslik = kalip ? (musteri?.name || "(müşteri yok)") : aliciAd(satis, dealers, customers);
  const genelToplam = grup.reduce((t, s) => t + (kalip ? parseMoney(s.ucret) : (parseInt(s.miktar) || 0) * parseMoney(s.birimFiyat)), 0);
  const audit = (action, detail, entityId = satis.id) => logAction({ serverPermissions, action, entity: kalip ? "kalip_satisi" : "yedek_parca_satis", entityId, entityName: baslik, detail });
  const guncelle = (patch) => { // ortak kargo alanları → grubun tümüne
    if (canKargo && setKayit) {
      setKayit(p => p.map(s => idSet.has(s.id) ? { ...s, ...patch } : s));
      audit("kargoDurum" in patch ? "durum_degisti" : "duzenlendi", patch);
    }
  };

  return (
    <>
      <Modal title={kalip ? (fabTeslim ? "Extra Kalıp — Fabrika Teslim" : "Extra Kalıp — Kargo") : (fabTeslim ? "Fabrika Teslim / Yedek Parça Satışı" : "Kargo / Yedek Parça Satışı")} onClose={onClose} wide>
        <div style={{ fontSize: 14, fontWeight: 750, color: "var(--n900, #0f172a)" }}>{baslik}{coklu ? <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--n500, #64748b)", marginLeft: 8 }}>· {grup.length} kalem (toplu satış)</span> : null}</div>
        {iletisimSatirlari.length > 0 && (
          <div style={{ display: "grid", gap: 3, margin: "5px 0 0", fontSize: 12 }}>
            {iletisimSatirlari.map(([label, value]) => (
              <div key={label} style={{ display: "flex", gap: 8 }}>
                <span style={{ color: "var(--n400, #94a3b8)", minWidth: 82, flexShrink: 0 }}>{label}</span>
                <span style={{ color: "var(--n700, #334155)", fontWeight: 600 }}>{value}</span>
              </div>
            ))}
          </div>
        )}
        {/* Farklı teslimat (sevk) adresi — alıcının fatura/iletişim adresinden ayrı, vurgulu kutu.
            Hem yedek parça hem Extra Kalıp kargosu için. */}
        {satis.teslimatFarkli && (
          <div style={{ marginTop: 12, border: "1px solid var(--ambBr3, #fed7aa)", background: "var(--ambBg3, #fff7ed)", borderRadius: 12, padding: "12px 14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 800, color: "var(--acc, #e85d1a)", marginBottom: 8 }}>📍 Teslimat (kargo) Adresi</div>
            <div style={{ display: "grid", gap: 3, fontSize: 12 }}>
              {[["Teslim Alacak", satis.teslimatAd], ["Telefon", satis.teslimatTel], ["Açık Adres", satis.teslimatAdres], ["Şehir / İlçe", [satis.teslimatSehir, satis.teslimatIlce].filter(Boolean).join(" / ")], ["Ülke", satis.teslimatUlke]].filter(([, v]) => v).map(([label, value]) => (
                <div key={label} style={{ display: "flex", gap: 8 }}>
                  <span style={{ color: "var(--amb700, #b45309)", minWidth: 82, flexShrink: 0 }}>{label}</span>
                  <span style={{ color: "var(--n800, #1e293b)", fontWeight: 600 }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <div style={{ fontSize: 11.5, color: "var(--n500, #64748b)", margin: "8px 0 4px" }}>{fmtTR(satis.tarih)} · Genel Toplam: <strong>{fmtCur(genelToplam, satis.currency || "TRY")}</strong></div>

        {/* Kalemler — toplu satışta satır satır */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
          {grup.map(s => {
            const m = parseInt(s.miktar) || 0;
            return (
              <div key={s.id} style={{ border: "1px solid var(--n200, #e2e8f0)", borderRadius: 10, padding: "10px 12px", background: "var(--n100, #f8fafc)" }}>
                <div style={{ fontSize: 12.5, color: "var(--n700, #334155)", fontWeight: 600 }}>
                  {kalip
                    ? <>{s.ad || "(kalıp)"}{s.olcu ? ` · ${s.olcu}` : ""} · {fmtCur(parseMoney(s.ucret), s.currency || "TRY")}{satisFirmaGoster(s) ? ` · Satış: ${satisFirmaGoster(s)}` : ""}</>
                    : <>{partAd(s) || "(parça)"} · <strong>{s.miktar} adet</strong> · {fmtCur(m * parseMoney(s.birimFiyat), s.currency || "TRY")}</>}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--n600, #475569)", marginBottom: 6 }}>{fabTeslim ? "Teslim Durumu" : "Kargo Durumu"}{coklu ? " (tümüne uygulanır)" : ""}</div>
        <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
          {KARGO_DURUMLAR.map(k => (
            <button key={k.key} disabled={!canKargo} onClick={() => guncelle({ kargoDurum: k.key })}
              style={{ padding: "6px 12px", borderRadius: 8, cursor: canKargo ? "pointer" : "default", fontSize: 12, fontWeight: 700,
                border: `1px solid ${satis.kargoDurum === k.key ? k.renk : "var(--n200, #e2e8f0)"}`,
                background: satis.kargoDurum === k.key ? k.bg : "transparent", color: satis.kargoDurum === k.key ? k.renk : "var(--n500, #64748b)" }}>{fabTeslim ? (FABRIKA_TESLIM_ETIKET[k.key] || k.baslik) : k.baslik}</button>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: fabTeslim ? "1fr" : "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
          {!fabTeslim && (<>
            <div><div style={{ fontSize: 11.5, color: "var(--n500, #64748b)", marginBottom: 3 }}>Kargo Firması</div>
              <Input value={satis.kargoFirma || ""} disabled={!canKargo} onChange={e => guncelle({ kargoFirma: e.target.value })} placeholder="örn: Yurtiçi" /></div>
            <div><div style={{ fontSize: 11.5, color: "var(--n500, #64748b)", marginBottom: 3 }}>Takip No</div>
              <Input value={satis.kargoTakipNo || ""} disabled={!canKargo} onChange={e => guncelle({ kargoTakipNo: e.target.value })} placeholder="Takip no" /></div>
          </>)}
          <div><div style={{ fontSize: 11.5, color: "var(--n500, #64748b)", marginBottom: 3 }}>{fabTeslim ? "Teslim Tarihi" : "Kargo Tarihi"}</div>
            <Input type="date" value={satis.kargoTarih || ""} disabled={!canKargo} onChange={e => guncelle({ kargoTarih: e.target.value })} /></div>
        </div>

        {satis.notlar && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--n700, #334155)", marginBottom: 4 }}>Not</div>
            <div style={{ fontSize: 12.5, color: "var(--n600, #475569)", background: "var(--ambBg, #fffbeb)", border: "1px solid var(--ambBr, #fde68a)", borderRadius: 8, padding: "8px 10px", whiteSpace: "pre-wrap" }}>{satis.notlar}</div>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6, gap: 8 }}>
          <Btn variant="ghost" onClick={() => kalip
            ? kalipEtiketYazdir(grup, { customers, factory })
            : yedekParcaEtiketYazdir(grup, { parts, dealers, customers, factory })}>
            <Icon name="print" size={13} /> Kargo Etiketi
          </Btn>
          <Btn onClick={onClose}>Kapat</Btn>
        </div>
      </Modal>
    </>
  );
};
