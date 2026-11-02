import { useState } from "react";
import { logAction } from "../../lib/audit";
import { Icon, Field, Input, Btn, Modal, LockConflict } from "../ui";
import { HataMetni, KartBolum, Ipucu } from "../tasarim";
import { useLock } from "../../hooks/useLock";
import { useBugun } from "../../hooks/useBugun";
import { setBilesenAdi } from "../../lib/urunAgaci";
import { setParcalaPlani, setParcalaOnizleme, setHareketleriniUygula, PARCALA_PENCERE_BASLIGI, PARCALAMA_KIRPMA_IBARESI, SET_PARCALA_DUGMESI } from "../../lib/setUretimi";

// Spec 0130 R14–R19 (Karar 6, 7): setin parçalanması. Veri girme penceresi olduğu için `wide` (tasarım sözlüğü "Pencere boyutu").
// Setin kimliğiyle `partstock` kilidini alır (hazırlama penceresinin emsali); başkasındaysa pencere yerine LockConflict. Bileşen
// tablosu, setin eldeki ve kalacak adedi motorun önizlemesinden (C1: pencere adet aritmetiği yapmaz); karar kayıt anında
// motorda yeniden verilir.
export const SetParcalaPenceresi = ({ set, hamParts = [], partStock = [], setPartStock, setPartStockLog, onClose, showToast = () => {}, serverPermissions = null }) => {
  const bugun = useBugun();
  const [form, setForm] = useState({ adet: "1", tarih: bugun, not: "" });
  const [hata, setHata] = useState(null);
  const { lockLoading, lockConflict, forceAcquire } = useLock("partstock", set ? String(set.id) : null);
  const onizleme = setParcalaOnizleme(set, form.adet, partStock);

  const kaydet = () => {
    const plan = setParcalaPlani({ set, adet: form.adet, tarih: form.tarih, not: form.not, bugun, partStock });
    if (!plan.ok) { setHata(plan.hata); return; }
    setHareketleriniUygula(setPartStock, setPartStockLog, plan.hareketler);
    logAction({ serverPermissions, action: "set_parcalandi", entity: "stok_parca", entityId: Number(set.id), entityName: set.ad, detail: { adet: Number(String(form.adet).trim()) } });
    showToast("Set parçalandı.");
    onClose();
  };

  return (
    <Modal title={PARCALA_PENCERE_BASLIGI(set?.ad)} onClose={onClose} wide
      footer={lockConflict ? undefined : <div style={{ display: "flex", gap: 8 }}>
        <Btn variant="ghost" onClick={onClose}>İptal</Btn>
        <Btn onClick={kaydet} disabled={lockLoading}><Icon name="check" size={14} /> {SET_PARCALA_DUGMESI}</Btn>
      </div>}>
      {lockConflict ? (
        <div data-testid="set-parcala-kilitli">
          <LockConflict lockedBy={lockConflict.lockedBy} lockedAt={lockConflict.lockedAt} onForce={forceAcquire} onCancel={onClose} />
        </div>
      ) : (
        <div data-testid="set-parcala" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "140px 180px 1fr", gap: 12 }}>
            <Field label="Parçalanan adet">
              <Input value={form.adet} inputMode="numeric" aria-label="Parçalanan adet" onChange={e => { setForm(p => ({ ...p, adet: e.target.value })); setHata(null); }} />
            </Field>
            <Field label="Tarih">
              <Input type="date" aria-label="Parçalama tarihi" value={form.tarih} max={bugun} onChange={e => { setForm(p => ({ ...p, tarih: e.target.value })); setHata(null); }} />
            </Field>
            <Field label="Not (opsiyonel)">
              <Input value={form.not} aria-label="Not" onChange={e => setForm(p => ({ ...p, not: e.target.value }))} placeholder="Örn: müşteri yalnız dişliyi istedi..." />
            </Field>
          </div>
          <HataMetni>{hata || ""}</HataMetni>
          <div data-testid="set-parcala-stok" style={{ display: "flex", gap: 18, fontSize: 13 }}>
            <span>Setin stoğu: <b data-testid="set-parcala-eldeki">{onizleme.eldeki}</b></span>
            <span>Parçalamadan sonra kalacak: <b data-testid="set-parcala-kalacak">{onizleme.kalacak ?? "—"}</b></span>
          </div>
          <KartBolum varyant="kart" style={{ padding: 0, overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--n100, #f8fafc)" }}>
                  {["Bileşen", "Stokta", "Stoğa girecek"].map(h => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: h === "Bileşen" ? "left" : "right", fontSize: 11, fontWeight: 700, color: "var(--n600, #475569)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {onizleme.satirlar.map(s => (
                  <tr key={s.partId} data-testid="set-parcala-satiri" style={{ borderBottom: "1px solid var(--n150, #f1f5f9)" }}>
                    <td style={{ padding: "8px 12px", fontSize: 12.5, fontWeight: 600 }}>{setBilesenAdi(s.partId, hamParts)}</td>
                    <td style={{ padding: "8px 12px", fontSize: 12.5, textAlign: "right" }}>{s.stokta}</td>
                    <td style={{ padding: "8px 12px", fontSize: 12.5, textAlign: "right", fontWeight: 700 }}>+{s.girecek}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </KartBolum>
          <Ipucu><span data-testid="set-parcala-ibare">{PARCALAMA_KIRPMA_IBARESI}</span></Ipucu>
        </div>
      )}
    </Modal>
  );
};
