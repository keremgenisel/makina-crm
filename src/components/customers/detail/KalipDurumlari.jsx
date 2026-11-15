// Spec 0146: müşteri detayında kalıp durumu satırı, kalıp durumları penceresi ve makina teslim onayı (A-R1/3, QA kararı 11).
// Bileşenler denetimlidir: durum, liste ve yazım çağırandan (CustomerDetailModal) gelir; bu dosya veri yazmaz (Plan kararı 28, C3).
// Kalıp kümesi, özet ve toplu teslim kararı musteriDurumu.js'tedir; burada durum dizesi karşılaştırması yoktur (B-R1/2, AC-35).
import { Btn, Icon, Modal, ConfirmDialog } from "../../ui";
import { Ipucu } from "../../tasarim";
import { KalipDurumuSecici } from "../DurumSecici";
import { KALIP_DURUMU_ETIKETI, KALIP_DURUMLARI_BASLIGI, TESLIM_ONAYI, extraKalipListeIbaresi } from "../../../lib/musteriDurumu";

// A-R1, A-R3, A-R4: etiket, özet ve (izinle) pencereyi açan düğme. Özet boşsa (makinayla verilen kalıp yok) satır çizilmez.
export const KalipDurumuSatiri = ({ ozet, duzenleyebilir, onAc }) => {
  if (!ozet) return null;
  return (
    <div data-testid="detay-kalip-durumu" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
      <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--n700, #334155)" }}>{KALIP_DURUMU_ETIKETI}</span>
      <span data-testid="detay-kalip-ozeti" style={{ fontSize: 13, color: "var(--n600, #475569)" }}>{ozet}</span>
      {duzenleyebilir && (
        <Btn variant="ghost" small onClick={onAc} testId="detay-kalip-durumu-dugmesi"><Icon name="edit" size={13} /> {KALIP_DURUMLARI_BASLIGI}</Btn>
      )}
    </div>
  );
};

// A-R5–A-R9/3: yalnız makinayla verilen kalıplar; numara `kaliplar` konumu (i + 1); her seçim anında yazılır, kapat düğmesi yok.
// `overflowVisible` verilmez: kaymayı Modal'ın maxHeight + overflowY zinciri sağlar (A-R9, Tuzak T8).
export const KalipDurumlariPenceresi = ({ liste, extraSayisi, onDegis, onClose }) => (
  <Modal title={KALIP_DURUMLARI_BASLIGI} maxWidth={560} onClose={onClose}>
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {liste.map(({ i, kalip, turetilen }) => (
        <div key={i} data-testid="kalip-durum-satiri" style={{ display: "grid", gridTemplateColumns: "28px 1fr 210px", gap: 10, alignItems: "center" }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--n500, #64748b)" }}>{i + 1}.</span>
          <span style={{ fontSize: 13, color: "var(--n800, #1e293b)" }}>{[kalip.olcu, kalip.ad].filter(Boolean).join(" — ") || "—"}</span>
          <KalipDurumuSecici value={kalip.kalipDurumu} turetilen={turetilen} ariaLabel={`${i + 1}. kalıp durumu`} onChange={v => onDegis(i, v)} />
        </div>
      ))}
    </div>
    {extraSayisi > 0 && (
      <div data-testid="kalip-durumu-extra-ibaresi" style={{ marginTop: 14 }}><Ipucu>{extraKalipListeIbaresi(extraSayisi)}</Ipucu></div>
    )}
  </Modal>
);

// B-R2/2: teslim onayı. Escape ConfirmDialog'da onCancel'dır, yani "Yalnız makina" (Plan kararı 28).
export const TeslimOnayi = ({ sayi, onKabul, onRet }) => (
  <ConfirmDialog title={TESLIM_ONAYI.baslik} message={TESLIM_ONAYI.metin(sayi)} icon="check" confirmIcon="check"
    confirmLabel={TESLIM_ONAYI.onay} cancelLabel={TESLIM_ONAYI.iptal} confirmVariant="primary" onConfirm={onKabul} onCancel={onRet} />
);
