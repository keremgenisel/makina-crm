import { useState } from "react";
import { logAction } from "../../lib/audit";
import { Icon, Field, Input, Btn, Modal, LockConflict } from "../ui";
import { HataMetni, KartBolum, Ipucu, UyariSeridi } from "../tasarim";
import { useLock } from "../../hooks/useLock";
import { useBugun } from "../../hooks/useBugun";
import { setBilesenAdi } from "../../lib/urunAgaci";
import { setHazirlaPlani, setHazirlaOnizleme, setHareketleriniUygula, PENCERE_BASLIGI } from "../../lib/setUretimi";

// Spec 0121 R13–R19, R24/2, R29/2, R30/2: set hazırlama penceresi. Veri girme penceresi olduğu için `wide` açılır (tasarım
// sözlüğü "Pencere boyutu"). Setin kimliğiyle bugünkü `partstock` kilidini alır (komşusu "Stok Miktarını Düzelt" de alıyor);
// başkasındaysa pencere yerine LockConflict. Bileşen tablosu canlı stoktan, yalnız gösterim (R14/2); kırpma kayıt anında
// yeniden hesaplanır ve tek kaynak kayıt anıdır. Hesap `setUretimi.js`'tedir; pencere yalnız sonucu uygular.
export const KIRPMA_IPUCU = "Bileşen stoğu yetmezse eldeki kadarı düşer, eksik kalan düşmez ve set yine hazırlanır; stok sıfırın altına inmez.";

export const SetHazirlaPenceresi = ({ set, hamParts = [], partStock = [], setPartStock, setPartStockLog, onClose, showToast = () => {}, serverPermissions = null }) => {
  const bugun = useBugun();
  const [form, setForm] = useState({ adet: "1", tarih: bugun, not: "" });
  const [hata, setHata] = useState(null);
  const { lockLoading, lockConflict, forceAcquire } = useLock("partstock", set ? String(set.id) : null);
  const onizleme = setHazirlaOnizleme(set, form.adet, partStock);
  const eksikOnizleme = onizleme.filter(s => s.eksik);

  const kaydet = () => {
    const plan = setHazirlaPlani({ set, adet: form.adet, tarih: form.tarih, not: form.not, bugun, partStock });
    if (!plan.ok) { setHata(plan.hata); return; }
    setHareketleriniUygula(setPartStock, setPartStockLog, plan.hareketler);
    logAction({ serverPermissions, action: "set_hazirlandi", entity: "stok_parca", entityId: Number(set.id), entityName: set.ad, detail: { adet: Number(form.adet) } });
    showToast(plan.eksikler.length ? `Set hazırlandı; ${plan.eksikler.length} bileşen stokta yoktu.` : "Set hazırlandı.");
    onClose();
  };

  return (
    <Modal title={PENCERE_BASLIGI(set?.ad)} onClose={onClose} wide
      footer={lockConflict ? undefined : <div style={{ display: "flex", gap: 8 }}>
        <Btn variant="ghost" onClick={onClose}>İptal</Btn>
        <Btn onClick={kaydet} disabled={lockLoading}><Icon name="check" size={14} /> Set Hazırla</Btn>
      </div>}>
      {lockConflict ? (
        <div data-testid="set-hazirla-kilitli">
          <LockConflict lockedBy={lockConflict.lockedBy} lockedAt={lockConflict.lockedAt} onForce={forceAcquire} onCancel={onClose} />
        </div>
      ) : (
        <div data-testid="set-hazirla" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "140px 180px 1fr", gap: 12 }}>
            <Field label="Hazırlanan adet">
              <Input value={form.adet} inputMode="numeric" aria-label="Hazırlanan adet" onChange={e => { setForm(p => ({ ...p, adet: e.target.value })); setHata(null); }} />
            </Field>
            <Field label="Tarih">
              <Input type="date" aria-label="Hazırlama tarihi" value={form.tarih} max={bugun} onChange={e => { setForm(p => ({ ...p, tarih: e.target.value })); setHata(null); }} />
            </Field>
            <Field label="Not (opsiyonel)">
              <Input value={form.not} aria-label="Not" onChange={e => setForm(p => ({ ...p, not: e.target.value }))} placeholder="Örn: Atölye, iş emri..." />
            </Field>
          </div>
          <HataMetni>{hata || ""}</HataMetni>
          <KartBolum varyant="kart" style={{ padding: 0, overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--n100, #f8fafc)" }}>
                  {["Bileşen", "Gereken", "Stokta", "Düşecek"].map(h => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: h === "Bileşen" ? "left" : "right", fontSize: 11, fontWeight: 700, color: "var(--n600, #475569)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {onizleme.map(s => (
                  <tr key={s.partId} data-testid="set-hazirla-satiri" style={{ borderBottom: "1px solid var(--n150, #f1f5f9)", background: s.eksik ? "var(--ambBg2, #fef3c7)" : undefined }}>
                    <td style={{ padding: "8px 12px", fontSize: 12.5, fontWeight: 600 }}>{setBilesenAdi(s.partId, hamParts)}</td>
                    <td style={{ padding: "8px 12px", fontSize: 12.5, textAlign: "right" }}>{s.gereken}</td>
                    <td style={{ padding: "8px 12px", fontSize: 12.5, textAlign: "right" }}>{s.stokta}</td>
                    <td style={{ padding: "8px 12px", fontSize: 12.5, textAlign: "right", fontWeight: 700 }}>{s.dusecek}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </KartBolum>
          {eksikOnizleme.length > 0 && (
            <UyariSeridi aile="uyari" testId="set-hazirla-eksik">
              Stokta yetmeyen bileşenler: <b>{eksikOnizleme.map(s => setBilesenAdi(s.partId, hamParts)).join(", ")}</b>. Set yine hazırlanır ve stoğu artar.
            </UyariSeridi>
          )}
          <Ipucu>{KIRPMA_IPUCU}</Ipucu>
        </div>
      )}
    </Modal>
  );
};
