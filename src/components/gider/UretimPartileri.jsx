import { useState } from "react";
import { uid, simdiYerel } from "../../lib/utils";
import { partiDogrula, partiKapanisUygula, partiMakinaSayisi } from "../../lib/uretimPartisi";
import { logAction } from "../../lib/audit";
import { Icon, Field, Input, Btn, Modal, ConfirmDialog, LockConflict } from "../ui";
import { useLock } from "../../hooks/useLock";
import { AyInput, tl2 } from "./GiderAlanlari";
import { KartBolum, BosDurum, HataMetni, Ipucu } from "../tasarim";
import { Rozet } from "./DonemRaporu";

// Giderler › Üretim Partileri (spec 0022 R1, R3, R7, R11; plan P5, P8). Parti yalnız maliyet dağıtımının
// tabanıdır (C7): kapsadığı ayların ortak gideri partinin makinalarına eşit bölünür. Rakamlar App'te bir kez
// hesaplanan makina maliyetinden gelir (tek motor, C1). Tanım, kapatma ve silme `gider_tanim` ister (C5).
// Spec 0068 R9: silme çöp kutusuna taşır; makina bağı okuma anında çözüldüğü için alan temizlenmez (0022 R11) ve parti geri
// alınınca bağ kendiliğinden döner. Liste canlı dizidir; yazım tam dizi üzerinde işlevsel güncelleyiciyle (C8).
const BOS = { id: null, ad: "", baslangicAy: "", bitisAy: null, aciklama: "" };
const ayAdi = (ay) => { if (!ay) return ""; const [y, m] = ay.split("-").map(Number); return new Date(y, m - 1, 1).toLocaleDateString("tr-TR", { month: "long", year: "numeric" }); };

export const UretimPartileri = ({ uretimPartileri = [], setUretimPartileri, stock = [], customers = [], makinaMaliyet = null, canDo = () => true, showToast = () => {}, serverPermissions }) => {
  const [form, setForm] = useState(null);
  const [hatalar, setHatalar] = useState({});
  const [sil, setSil] = useState(null);
  // Spec 0064 R4: üretim partisi formu ve silme onayı aynı partinin kilidini paylaşır (yeni partide kilit yok).
  const kilitId = form?.id ?? sil?.p?.id ?? null;
  const { lockConflict: partiKilidi, forceAcquire: partiKilidiDevral } = useLock("uretim_partisi", kilitId);
  const kilitli = !!(partiKilidi && kilitId != null);
  const kilitKapat = () => { setForm(null); setSil(null); };
  const ozet = new Map((makinaMaliyet?.partiler || []).map(p => [String(p.id), p]));
  const yetki = canDo("gider_tanim");

  const ac = (p) => { setHatalar({}); setForm(p ? { ...BOS, ...p } : { ...BOS }); };
  const kaydet = () => {
    const { hatalar: h, kayit } = partiDogrula(form, uretimPartileri);
    setHatalar(h);
    if (!kayit) return;
    const yeni = form.id == null;
    const eski = yeni ? null : uretimPartileri.find(p => p.id === form.id);
    // R15: bitiş girilince (ya da aralık değişince) kapanıştaki ay ortakları anlık görüntü olarak yazılır.
    const son = partiKapanisUygula(eski, { ...kayit, id: form.id ?? uid() }, makinaMaliyet?.aylar, simdiYerel());
    setUretimPartileri(p => (yeni ? [...p, son] : p.map(x => (x.id === son.id ? son : x))));
    logAction({ serverPermissions, action: yeni ? "olusturuldu" : "duzenlendi", entity: "uretim_partisi", entityId: son.id, entityName: son.ad });
    setForm(null);
    showToast(yeni ? "Üretim partisi eklendi." : son.bitisAy && !eski?.bitisAy ? "Parti kapatıldı: maliyetlerdeki “geçici” ibaresi kalktı." : "Üretim partisi güncellendi.");
  };
  const silOnayla = () => {
    const zaman = new Date().toISOString();
    setUretimPartileri(p => p.map(x => (x.id === sil.p.id ? { ...x, deletedAt: zaman } : x)));
    logAction({ serverPermissions, action: "silindi", entity: "uretim_partisi", entityId: sil.p.id, entityName: sil.p.ad });
    setSil(null);
    showToast("Üretim partisi çöp kutusuna taşındı.");
  };
  // Spec 0068 C8: liste canlı kayıtlardır (ham dizi gelse de çöptekiler çizilmez).
  const sirali = uretimPartileri.filter(p => !p.deletedAt).sort((a, b) => (a.baslangicAy !== b.baslangicAy ? (a.baslangicAy < b.baslangicAy ? 1 : -1) : String(a.ad).localeCompare(String(b.ad), "tr")));
  const th = { padding: "9px 12px" }, td = { padding: "10px 12px", borderTop: "1px solid var(--n150, #f1f5f9)", verticalAlign: "top" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={{ fontSize: 13, color: "var(--n600, #475569)", maxWidth: 760 }}>
          Parti parti üretimde, partinin sürdüğü ayların ortak gideri o partinin makinalarına eşit dağılır. Makinalar stok kaydından partiye bağlanır; satılınca bağ satış kaydında korunur.
        </div>
        {yetki && <Btn onClick={() => ac(null)}><Icon name="plus" size={14} /> Yeni Üretim Partisi</Btn>}
      </div>
      {sirali.length === 0 ? (
        <BosDurum testId="bos-uretim-partileri" baslik="Henüz üretim partisi yok" metin="Partisiz makinaların ortak gider payı, üretildikleri ayın payıdır." />
      ) : (
        <KartBolum varyant="kart" style={{ padding: 0, overflow: "auto" }} testId="uretim-partileri">
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 820 }}>
            <thead><tr style={{ background: "var(--n100, #f8fafc)", fontSize: 11, color: "var(--n500, #64748b)", textTransform: "uppercase", textAlign: "left" }}>
              <th style={th}>Parti</th><th style={th}>Dönem</th><th style={th}>Durum</th><th style={{ ...th, textAlign: "right" }}>Makina</th>
              <th style={{ ...th, textAlign: "right" }}>Ortak gider havuzu</th><th style={{ ...th, textAlign: "right" }}>Makina başı pay</th><th style={th} />
            </tr></thead>
            <tbody>
              {sirali.map(p => {
                const o = ozet.get(String(p.id));
                const acik = !p.bitisAy;
                return (
                  <tr key={p.id} data-testid="parti-satiri">
                    <td style={td}><b>{p.ad}</b>{p.aciklama && <div style={{ fontSize: 12, color: "var(--n500, #64748b)", marginTop: 2 }}>{p.aciklama}</div>}</td>
                    <td style={{ ...td, whiteSpace: "nowrap" }}>{ayAdi(p.baslangicAy)} – {acik ? "sürüyor" : ayAdi(p.bitisAy)}</td>
                    <td style={td}>{acik ? <Rozet renk="turuncu" title="Parti kapanınca maliyetlerdeki geçici ibaresi kalkar">Açık · geçici</Rozet> : <Rozet renk="yesil">Kapalı</Rozet>}</td>
                    <td style={{ ...td, textAlign: "right" }}>
                      <b>{o?.adet ?? 0}</b>
                      {(o?.adet ?? 0) === 0 && <Ipucu>Bağlı makina yok; ayların gideri makinalar bağlanınca paylaştırılır.</Ipucu>}
                    </td>
                    <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{o ? tl2(o.havuz) : "—"}</td>
                    <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{o?.makinaBasi != null ? <>{tl2(o.makinaBasi)}{acik && <div style={{ fontSize: 11, color: "var(--orTx, #c2410c)" }}>geçici</div>}</> : "—"}</td>
                    <td style={{ ...td, whiteSpace: "nowrap", textAlign: "right" }}>
                      {yetki && <Btn small variant="ghost" onClick={() => ac(p)} title="Düzenle"><Icon name="edit" size={12} /></Btn>}{" "}
                      {yetki && <Btn small variant="danger" onClick={() => setSil({ p, n: partiMakinaSayisi(p.id, { stock, customers }) })} title="Sil"><Icon name="trash" size={12} /></Btn>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </KartBolum>
      )}

      {kilitli && (
        <Modal title={form ? "Üretim Partisini Düzenle" : "Üretim Partisi"} onClose={kilitKapat}>
          <LockConflict lockedBy={partiKilidi.lockedBy} lockedAt={partiKilidi.lockedAt} onForce={partiKilidiDevral} onCancel={kilitKapat} />
        </Modal>
      )}
      {form && !kilitli && (
        <Modal title={form.id == null ? "Yeni Üretim Partisi" : "Üretim Partisini Düzenle"} onClose={() => setForm(null)} wide
          footer={<div style={{ display: "flex", gap: 8 }}><Btn variant="ghost" onClick={() => setForm(null)}>İptal</Btn><Btn onClick={kaydet}><Icon name="check" size={14} /> Kaydet</Btn></div>}>
          <Field label="Parti adı veya numarası *"><Input aria-label="Parti adı" value={form.ad} onChange={e => setForm(f => ({ ...f, ad: e.target.value }))} placeholder="Örn. 2026-1" /><HataMetni>{hatalar.ad}</HataMetni></Field>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}><Field label="Başlangıç ayı *"><AyInput ariaLabel="Başlangıç ayı" value={form.baslangicAy} onChange={v => setForm(f => ({ ...f, baslangicAy: v || "" }))} /><HataMetni>{hatalar.baslangicAy}</HataMetni></Field></div>
            <div style={{ flex: 1 }}>
              <Field label="Bitiş ayı">
                <AyInput ariaLabel="Bitiş ayı" value={form.bitisAy} onChange={v => setForm(f => ({ ...f, bitisAy: v }))} />
                <HataMetni>{hatalar.bitisAy}</HataMetni>
                <Ipucu>Parti kapanınca girin. Boşken parti açıktır ve maliyetler geçicidir.</Ipucu>
              </Field>
            </div>
          </div>
          <Field label="Açıklama"><Input aria-label="Açıklama" value={form.aciklama || ""} onChange={e => setForm(f => ({ ...f, aciklama: e.target.value }))} placeholder="Opsiyonel (ör. 70 makinalık bahar üretimi)" /></Field>
        </Modal>
      )}
      {sil && !kilitli && (
        <ConfirmDialog title="Üretim partisi silinsin mi?"
          message={`“${sil.p.ad}” partisi çöp kutusuna taşınacak. ${sil.n} makina bu partiye bağlı; parti çöpteyken bu makinaların ortak gider payı üretildikleri ayın kuralına döner, geri alınınca parti dağıtımı geri gelir.`}
          onConfirm={silOnayla} onCancel={() => setSil(null)} />
      )}
    </div>
  );
};
