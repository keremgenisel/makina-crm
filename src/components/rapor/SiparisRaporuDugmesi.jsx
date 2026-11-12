// Spec 0134 R20, R20/2; spec 0140 B-R1/2, E-R7 (AC-40, AC-49, AC-66): sipariş listesinin yazdırma düğmesi. rapor/ klasöründedir:
// pencerenin dosyası yazdırma API'sini doğrudan çağırmaz (0047'nin GiderKasaRaporuDugmesi emsali). Basılamazsa düğme pasif ve
// nedeni yanında yazar. Spec 0144 B-R1 (0142 A-R6 ters çevrildi): düğme doğrudan basmaz, fiyatlı mı fiyatsız mı diye sorar; sorunun
// durumu çağıranda (`soruAcik`, B-R1/3), pencereyi bu bileşen çizer (sipariş penceresinden sonra çizildiği için üstte, Karar 42).
// B-R9/2: fiyatlı nüshanın dosya adı "Fiyatli" ekiyle ayrılır.
import { Btn, Icon } from "../ui";
import { siparisRaporuHtml, belgeDurumu } from "../../lib/siparisRaporu";
import { BELGE_HATALI, BELGE_BOS } from "../../lib/siparisIhtiyaci";
import { NushaSecPenceresi } from "./NushaSecPenceresi";

export const siparisDosyaAdi = (bugun, fiyatli) => `Siparis-Listesi-${bugun}${fiyatli ? "-Fiyatli" : ""}.pdf`;

export const SiparisRaporuDugmesi = ({ sonuc, bugun, factory = null, partiAd = null, soruAcik = false, onSoruAc = () => {}, onSoruKapat = () => {} }) => {
  const d = belgeDurumu(sonuc, { hata: BELGE_HATALI, bos: BELGE_BOS });
  const yazdir = (fiyatli) => {
    onSoruKapat();
    if (!d.etkin) return;
    const html = siparisRaporuHtml(sonuc, { bugun, factory, partiAd, fiyatli });
    if (window.appPrint?.printHtml) window.appPrint.printHtml(html, null, siparisDosyaAdi(bugun, fiyatli));
  };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      {d.neden && <span data-testid="siparis-yazdir-neden" style={{ fontSize: 12, color: "var(--n500, #64748b)" }}>{d.neden}</span>}
      <Btn onClick={() => { if (d.etkin) onSoruAc(); }} disabled={!d.etkin} testId="siparis-yazdir" title="Sipariş listesini yazdır/PDF kaydet"><Icon name="print" size={13} /> Yazdır</Btn>
      {soruAcik && d.etkin && <NushaSecPenceresi onSec={yazdir} onClose={onSoruKapat} />}
    </span>
  );
};
