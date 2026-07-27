import { useState, useMemo, useEffect, useRef } from "react";
import { today, fmtCur, parseMoney, parcaAdi, totalMiktar, aramaNormalize } from "../../lib/utils";
import { DEFAULT_KDV_RATES } from "../../lib/constants";
import { Icon, Btn, Input, Pagination, ConfirmDialog, Modal, LockConflict } from "../ui";
import { useLock } from "../../hooks/useLock";
import { YedekParcaSatisForm } from "../YedekParcaSatisForm";
import { TahsisModal, tahsisToplam, aliciAd } from "./TahsisModal";
import { yedekParcaDus, yedekParcaGeriAl } from "../../lib/yedekParcaStok";
import { yedekParcaRec, yeniYedekParcaSatis } from "../../lib/yedekParcaSatis";
import { logAction } from "../../lib/audit";

// Satışın makina-bağ durumu (bekliyor / kısmi / tam).
const durumBilgi = (s) => {
  const alloc = tahsisToplam(s), m = parseInt(s.miktar) || 0;
  if (alloc <= 0) return { key: "bekliyor", label: "Bayi stoğu (bekliyor)", renk: "var(--amb700, #b45309)", bg: "var(--ambBg, #fffbeb)", br: "var(--ambBr, #fde68a)" };
  if (alloc < m) return { key: "kismi", label: `Kısmi bağlı (${alloc}/${m})`, renk: "var(--blu700, #1d4ed8)", bg: "var(--bluBg, #eff6ff)", br: "var(--bluBr, #bfdbfe)" };
  return { key: "tam", label: `Tam bağlı (${alloc}/${m})`, renk: "var(--grn700, #15803d)", bg: "var(--grnBg, #f0fdf4)", br: "var(--grnBr, #bbf7d0)" };
};

export const YedekParcaSatisTab = ({
  yedekParcaSatislar = [], setYedekParcaSatislar,
  dealers = [], parts = [], customers = [], calisanlar = [],
  partStock = [], setPartStock, partStockLog = [], setPartStockLog,
  kdvRates = DEFAULT_KDV_RATES, showToast = () => {}, canDoStock = () => true, serverPermissions = null,
  odakId = null, onOdakConsumed = null,
}) => {
  const audit = (action, id, rec, detail) => logAction({ serverPermissions, action, entity: "yedek_parca_satis", entityId: id, entityName: aliciAd(rec, dealers, customers), detail });
  const [modal, setModal] = useState(null);   // "add" | {edit: rec}
  const [form, setForm] = useState({});
  // Eşzamanlı düzenleme kilidi: aynı yedek parça satışını iki kullanıcı aynı anda düzenleyemesin.
  const { lockConflict: ypLock, forceAcquire: forceYpLock } = useLock("yedek_parca", modal?.edit?.id ?? null);
  const [tahsisSv, setTahsisSv] = useState(null); // tahsis modalı açık satış
  const [silOnay, setSilOnay] = useState(null);
  const [filtre, setFiltre] = useState("hepsi"); // "hepsi" | "eksik"
  const [arama, setArama] = useState("");
  const [sayfa, setSayfa] = useState(1);
  const perPage = 10;

  const partMap = useMemo(() => { const m = {}; for (const p of parts) m[String(p.id)] = p; return m; }, [parts]);
  const custMap = useMemo(() => { const m = {}; for (const c of customers) m[c.id] = c; return m; }, [customers]);

  const liste = useMemo(() => {
    const arr = [...yedekParcaSatislar].sort((a, b) => String(b.tarih || "").localeCompare(String(a.tarih || "")));
    return filtre === "eksik" ? arr.filter(s => tahsisToplam(s) < (parseInt(s.miktar) || 0)) : arr;
  }, [yedekParcaSatislar, filtre]);
  // Arama: alıcı adı, parça adı, kargo firma/takip no, tarih, kargo durumu.
  const aranmis = useMemo(() => {
    const q = aramaNormalize(arama.trim());
    if (!q) return liste;
    return liste.filter(s => {
      const part = partMap[String(s.partId)];
      const hay = aramaNormalize([aliciAd(s, dealers, customers), parcaAdi(part), s.kargoTakipNo, s.kargoFirma, s.tarih, s.kargoDurum].filter(Boolean).join(" "));
      return hay.includes(q);
    });
  }, [liste, arama, partMap, dealers, customers]);
  const sayfalanmis = useMemo(() => aranmis.slice((sayfa - 1) * perPage, sayfa * perPage), [aranmis, sayfa]);
  useEffect(() => { setSayfa(1); }, [arama, filtre]); // filtre/arama değişince ilk sayfaya dön

  // Bayi detayından "Yedek Parça Satışına git" → hedef satışa odaklan: filtre/arama temizle, sayfasına git,
  // satırı vurgula ve görünüme kaydır. odakRef, arama/filtre sıfırlama effect'inin sayfayı ezmemesi için.
  const [vurgulu, setVurgulu] = useState(null);
  const odakRef = useRef(null);
  const rowRef = useRef(null);
  useEffect(() => {
    if (odakId == null) return;
    odakRef.current = odakId;
    setFiltre("hepsi"); setArama("");
    setVurgulu(odakId);
    onOdakConsumed?.();
  }, [odakId]);
  useEffect(() => { // arama/filtre sıfırlama effect'inden SONRA çalışır → hedef sayfayı kesin uygular
    if (odakRef.current == null) return;
    const sirali = [...yedekParcaSatislar].sort((a, b) => String(b.tarih || "").localeCompare(String(a.tarih || "")));
    const idx = sirali.findIndex(s => s.id === odakRef.current);
    if (idx >= 0) setSayfa(Math.floor(idx / perPage) + 1);
    odakRef.current = null;
  }, [vurgulu]);
  useEffect(() => { // sayfa hazır olunca satırı kaydır + bir süre sonra vurguyu kaldır
    if (vurgulu == null || !rowRef.current) return;
    rowRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    const t = setTimeout(() => setVurgulu(null), 2600);
    return () => clearTimeout(t);
  }, [vurgulu, sayfa]);
  const eksikSayi = useMemo(() => yedekParcaSatislar.filter(s => tahsisToplam(s) < (parseInt(s.miktar) || 0)).length, [yedekParcaSatislar]);

  const openAdd = () => {
    if (!canDoStock("yedek_parca_add")) return;
    setForm({ aliciTipi: "bayi", dealerId: "", musteriId: "", partId: "", miktar: "", birimFiyat: "", currency: "TRY", tarih: today(), faturaTipi: "Faturalı Yurtiçi", odendi: false, kargoDurum: "Hazırlanıyor" });
    setModal("add");
  };
  const openEdit = (rec) => {
    if (!canDoStock("yedek_parca_edit")) return;
    setForm({ ...rec, miktar: String(rec.miktar ?? ""), birimFiyat: rec.birimFiyat ?? "" });
    setModal({ edit: rec });
  };

  const kaydet = () => {
    if (modal === "add") {
      // Ortak yol: doğrulama + stok kontrolü (eksiye düşmez) + alıcı müşteriyse otomatik tahsis.
      const r = yeniYedekParcaSatis(form, { setYedekParcaSatislar, setPartStock, setPartStockLog, partStock });
      if (!r.ok) { showToast(r.hata, "err"); return; }
      audit("olusturuldu", r.id, form);
      showToast("Yedek parça satışı kaydedildi, stoktan düşüldü.");
    } else {
      const sonuc = yedekParcaRec(form);
      if (!sonuc.ok) { showToast(sonuc.hata, "err"); return; }
      const rec = sonuc.rec, eski = modal.edit;
      // Parça/miktar değişmiş olabilir → eski stok hareketini geri al, yenisini düş.
      yedekParcaGeriAl(eski.id, setPartStock, setPartStockLog);
      // Stok eksiye düşmesin: kullanılabilir = mevcut stok + bu satışın (aynı parça) GERİ GELEN düşümü
      // (log'daki gerçek düşüm; eski.miktar değil, çünkü eski satış da kırpılmış olabilir).
      const eskiDusum = (partStockLog || []).filter(l => l.referansId === eski.id && l.tip === "bayi_satis" && String(l.partId) === String(rec.partId)).reduce((s, l) => s + Math.abs(l.miktar), 0);
      const kullanilabilir = totalMiktar(partStock, rec.partId) + eskiDusum;
      const dusulen = Math.min(rec.miktar, Math.max(0, kullanilabilir));
      yedekParcaDus(rec.partId, dusulen, eski.id, setPartStock, setPartStockLog);
      setYedekParcaSatislar(p => p.map(s => s.id === eski.id ? { ...s, ...rec } : s));
      audit("duzenlendi", eski.id, rec);
      showToast("Satış güncellendi.");
    }
    setModal(null);
  };

  const sil = (rec) => {
    if (!canDoStock("yedek_parca_delete")) return;
    yedekParcaGeriAl(rec.id, setPartStock, setPartStockLog);
    setYedekParcaSatislar(p => p.map(s => s.id === rec.id ? { ...s, deletedAt: new Date().toISOString() } : s));
    audit("silindi", rec.id, rec);
    setSilOnay(null);
    showToast("Satış silindi, stok geri alındı.");
  };

  const odendiToggle = (rec) => {
    if (!canDoStock("yedek_parca_edit")) return;
    setYedekParcaSatislar(p => p.map(s => s.id === rec.id ? { ...s, odendi: !s.odendi } : s));
    audit(rec.odendi ? "odeme_iptal" : "odendi", rec.id, rec);
  };

  const tahsisEkle = (satisId, t) => {
    setYedekParcaSatislar(p => p.map(s => s.id === satisId ? { ...s, tahsisler: [...(s.tahsisler || []), t] } : s));
    audit("tahsis_edildi", satisId, yedekParcaSatislar.find(s => s.id === satisId), { miktar: t.miktar });
  };
  const tahsisSil = (satisId, idx) => {
    setYedekParcaSatislar(p => p.map(s => s.id === satisId ? { ...s, tahsisler: (s.tahsisler || []).filter((_, i) => i !== idx) } : s));
    audit("tahsis_kaldirildi", satisId, yedekParcaSatislar.find(s => s.id === satisId));
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        {[["hepsi", `Tümü (${yedekParcaSatislar.length})`], ["eksik", `Tahsisi eksik (${eksikSayi})`]].map(([v, l]) => (
          <button key={v} onClick={() => setFiltre(v)} style={{
            padding: "6px 14px", borderRadius: 999, cursor: "pointer", fontSize: 12.5, fontWeight: 700,
            border: `1px solid ${filtre === v ? "#e85d1a" : "var(--n200, #e2e8f0)"}`,
            background: filtre === v ? "#e85d1a" : "transparent", color: filtre === v ? "#fff" : "var(--n500, #64748b)",
          }}>{l}</button>
        ))}
        <div style={{ position: "relative", flex: "1 1 220px", minWidth: 180, maxWidth: 340 }}>
          <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--n400, #94a3b8)", pointerEvents: "none" }}><Icon name="search" size={14} /></span>
          <input value={arama} onChange={e => setArama(e.target.value)} placeholder="Alıcı, parça, kargo no ile ara..."
            style={{ width: "100%", padding: "8px 12px 8px 32px", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 8, fontSize: 13.5, background: "var(--n100, #f8fafc)", boxSizing: "border-box", outline: "none" }} />
        </div>
        {canDoStock("yedek_parca_add") && <span style={{ marginLeft: "auto" }}><Btn onClick={openAdd}><Icon name="plus" size={14} /> Yeni Satış</Btn></span>}
      </div>

      {aranmis.length === 0 ? (
        <div style={{ padding: "40px 16px", textAlign: "center", color: "var(--n400, #94a3b8)", fontSize: 13.5 }}>
          {arama.trim() ? "Aramanıza uyan satış yok." : filtre === "eksik" ? "Tahsisi eksik satış yok." : "Henüz yedek parça satışı yok. \"Yeni Satış\" ile ekleyin."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {sayfalanmis.map(s => {
            const d = durumBilgi(s);
            const part = partMap[String(s.partId)];
            const toplam = (parseInt(s.miktar) || 0) * parseMoney(s.birimFiyat);
            const kalan = (parseInt(s.miktar) || 0) - tahsisToplam(s);
            const odakli = s.id === vurgulu;
            return (
              <div key={s.id} ref={odakli ? rowRef : null}
                className={odakli ? "servis-alarm-yanip" : undefined}
                style={{ border: odakli ? "1px solid var(--cyan, #0891b2)" : "1px solid var(--n200, #e2e8f0)", borderLeft: `3px solid ${d.renk}`, borderRadius: 12, padding: "12px 14px", background: "var(--surface, #fff)", boxShadow: odakli ? "0 0 0 2px var(--cyan, #0891b2)" : "none" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <div style={{ fontSize: 14, fontWeight: 750, color: "var(--n900, #0f172a)", display: "flex", alignItems: "center", gap: 7 }}>
                      {aliciAd(s, dealers, customers)}
                      <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: .3, borderRadius: 5, padding: "2px 6px", background: s.aliciTipi === "musteri" ? "var(--bluBg2, #dbeafe)" : "var(--ambBg2, #fef3c7)", color: s.aliciTipi === "musteri" ? "var(--blu700, #1d4ed8)" : "var(--amb800, #92400e)" }}>{s.aliciTipi === "musteri" ? "MÜŞTERİ" : "BAYİ"}</span>
                    </div>
                    <div style={{ fontSize: 12.5, color: "var(--n600, #475569)", marginTop: 2 }}>
                      {parcaAdi(part) || "(parça yok)"} · <strong>{s.miktar} adet</strong> · {fmtCur(toplam, s.currency || "TRY")}
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--n400, #94a3b8)", marginTop: 2 }}>
                      {s.tarih}{s.kargoDurum ? ` · 📦 ${s.kargoDurum}` : ""}{s.kargoTakipNo ? ` · ${s.kargoFirma || "Kargo"} ${s.kargoTakipNo}` : ""}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: d.renk, background: d.bg, border: `1px solid ${d.br}`, borderRadius: 999, padding: "2px 10px" }}>{d.label}</span>
                    <button onClick={() => odendiToggle(s)} disabled={!canDoStock("yedek_parca_edit")}
                      style={{ fontSize: 11.5, fontWeight: 700, cursor: canDoStock("yedek_parca_edit") ? "pointer" : "default", border: "none", borderRadius: 999, padding: "2px 10px",
                        color: s.odendi ? "var(--grn700, #15803d)" : "var(--amb800, #92400e)", background: s.odendi ? "var(--grnBg, #f0fdf4)" : "var(--ambBg, #fffbeb)" }}>
                      {s.odendi ? "Ödendi" : "Ödenmedi"}
                    </button>
                  </div>
                </div>

                {/* Tahsisler listesi */}
                {(s.tahsisler || []).length > 0 && (
                  <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                    {s.tahsisler.map((t, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--n600, #475569)", background: "var(--n100, #f8fafc)", borderRadius: 8, padding: "5px 10px" }}>
                        <span>🔗 <strong>{t.miktar} adet</strong> → {custMap[t.customerId]?.name || t.makinaSerbest || "(makina)"}{custMap[t.customerId]?.serialNo ? ` · S/N ${custMap[t.customerId].serialNo}` : t.serialNo ? ` · S/N ${t.serialNo}` : ""}</span>
                        {canDoStock("yedek_parca_edit") && (
                          <button onClick={() => tahsisSil(s.id, i)} title="Tahsisi kaldır"
                            style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--n400, #94a3b8)", fontSize: 12 }}>✕</button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                  {canDoStock("yedek_parca_edit") && kalan > 0 && (
                    <button onClick={() => setTahsisSv(s)} style={{ fontSize: 12, fontWeight: 600, color: "#e85d1a", background: "none", border: "1px solid var(--ambBr, #fde68a)", borderRadius: 8, cursor: "pointer", padding: "5px 11px" }}>
                      🔗 Makinaya tahsis et ({kalan} kaldı)
                    </button>
                  )}
                  {canDoStock("yedek_parca_edit") && <Btn small variant="ghost" title="Düzenle" onClick={() => openEdit(s)}><Icon name="edit" size={14} /></Btn>}
                  {canDoStock("yedek_parca_delete") && <Btn small variant="danger" title="Sil" onClick={() => setSilOnay(s)}><Icon name="trash" size={14} /></Btn>}
                </div>
              </div>
            );
          })}
          <Pagination total={aranmis.length} page={sayfa} setPage={setSayfa} perPage={perPage} />
        </div>
      )}

      {modal && ((ypLock && modal?.edit) ? (
        <Modal title="Yedek Parça Satışını Düzenle" onClose={() => setModal(null)}>
          <LockConflict lockedBy={ypLock.lockedBy} lockedAt={ypLock.lockedAt} onForce={forceYpLock} onCancel={() => setModal(null)} />
        </Modal>
      ) : (
        <YedekParcaSatisForm
          title={modal === "add" ? "Yeni Yedek Parça Satışı" : "Yedek Parça Satışını Düzenle"}
          form={form} setForm={setForm} dealers={dealers} customers={customers} parts={parts} partStock={partStock} calisanlar={calisanlar}
          kdvRates={kdvRates} onSave={kaydet} onCancel={() => setModal(null)} />
      ))}

      {tahsisSv && (
        <TahsisModal customers={customers}
          kalan={(parseInt(tahsisSv.miktar) || 0) - tahsisToplam(tahsisSv)}
          onEkle={(t) => { tahsisEkle(tahsisSv.id, t); setTahsisSv(null); }}
          onClose={() => setTahsisSv(null)} showToast={showToast} />
      )}

      {silOnay && (
        <ConfirmDialog title="Satışı sil" message={`Bu yedek parça satışı silinecek ve düşülen ${silOnay.miktar} adet stoğa geri eklenecek. Makina tahsisleri de kaldırılır.`}
          onConfirm={() => sil(silOnay)} onCancel={() => setSilOnay(null)} />
      )}
    </div>
  );
};
