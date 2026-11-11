// Spec 0134 R20, R20/2; spec 0140 B-R1/2, E-R7 (AC-40, AC-49, AC-66): sipariş listesinin yazdırma düğmesi. rapor/ klasöründedir:
// pencerenin dosyası yazdırma API'sini doğrudan çağırmaz (0047'nin GiderKasaRaporuDugmesi emsali). Basılamazsa düğme pasif ve
// nedeni yanında yazar. Spec 0142 A-R6 (AC-5): para seçeneği yok, belge her zaman parasız.
import { Btn, Icon } from "../ui";
import { siparisRaporuHtml, belgeDurumu } from "../../lib/siparisRaporu";
import { BELGE_HATALI, BELGE_BOS } from "../../lib/siparisIhtiyaci";

export const SiparisRaporuDugmesi = ({ sonuc, bugun, factory = null, partiAd = null }) => {
  const d = belgeDurumu(sonuc, { hata: BELGE_HATALI, bos: BELGE_BOS });
  const yazdir = () => {
    if (!d.etkin) return;
    const html = siparisRaporuHtml(sonuc, { bugun, factory, partiAd });
    if (window.appPrint?.printHtml) window.appPrint.printHtml(html, null, `Siparis-Listesi-${bugun}.pdf`);
  };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      {d.neden && <span data-testid="siparis-yazdir-neden" style={{ fontSize: 12, color: "var(--n500, #64748b)" }}>{d.neden}</span>}
      <Btn onClick={yazdir} disabled={!d.etkin} testId="siparis-yazdir" title="Sipariş listesini yazdır/PDF kaydet"><Icon name="print" size={13} /> Yazdır</Btn>
    </span>
  );
};
