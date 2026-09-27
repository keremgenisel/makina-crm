import { fmtTR } from "../../lib/utils";
import { odemeDurumu, odemeHedefleri, tl } from "../../lib/gider";
import { Btn, Modal } from "../ui";
import { Ipucu } from "../tasarim";
import { OdemeSatirlari, tl2 } from "./GiderAlanlari";

// Ödeme planı penceresi (spec 0021 R2, AC-4/5/13/20). Gider listesinden açılır; taksitler ve kiranın iki hedefi
// satır satır işaretlenir. Kalem canlı veriden gelir (işaretleme anında güncellenir). İşaretleme `gider_odeme` ister;
// izin yoksa satırlar yalnız okunur.
export const OdemePlaniPenceresi = ({ kalem, davranis, turAd, odemeYetkisi, onIsaretle, onClose }) => {
  if (!kalem) return null;
  const durum = odemeDurumu(kalem);
  const kalan = odemeHedefleri(kalem, davranis).reduce((a, h) => a + h.kalanK, 0);
  return (
    <Modal title="Ödeme Planı" onClose={onClose} maxWidth={620} footer={<Btn variant="ghost" onClick={onClose}>Kapat</Btn>}>
      <div style={{ fontSize: 13, color: "var(--n600, #475569)", marginBottom: 12 }}>
        <b style={{ color: "var(--n900, #0f172a)" }}>{turAd}</b> · {fmtTR(kalem.tarih)}{kalem.aciklama ? ` · ${kalem.aciklama}` : ""}
        <div style={{ marginTop: 4 }} data-testid="odeme-plani-ozet">
          Durum: <b>{durum === "odendi" ? "Ödendi" : durum === "kismen" ? "Kısmen ödendi" : "Ödenmedi"}</b> · Kalan: <b>{tl2(tl(kalan))}</b>
        </div>
      </div>
      <OdemeSatirlari satirlar={kalem.taksitler} davranis={davranis} onIsaretle={odemeYetkisi ? (r) => onIsaretle(kalem, r) : null} testId="odeme-plani-satirlari" />
      {!odemeYetkisi && <Ipucu>Ödeme durumunu değiştirme yetkiniz yok.</Ipucu>}
      <Ipucu>Taksit bir ödeme kavramıdır: gider, doğduğu ayda ve tutarının tamamıyla sayılır; taksitler yalnız borç ve hatırlatmayı etkiler.</Ipucu>
    </Modal>
  );
};
