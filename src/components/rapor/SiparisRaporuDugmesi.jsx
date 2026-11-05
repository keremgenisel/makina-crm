// Spec 0134 R20, R20/2, AC-50, AC-51, AC-101: sipariş listesinin yazdırma düğmesi. maliyet/ klasörünün DIŞINDADIR: gider gizlilik
// taraması (0088 X4) o klasörde yazdırma çağrısını yasaklıyor ve bu kural gevşetilmez (0047'nin GiderKasaRaporuDugmesi emsali).
import { Btn, Icon } from "../ui";
import { siparisRaporuHtml } from "../../lib/siparisRaporu";

export const SiparisRaporuDugmesi = ({ sonuc, etkin = false, bugun, factory = null, partiAd = null }) => {
  const yazdir = () => {
    if (!etkin) return;
    const html = siparisRaporuHtml(sonuc, { bugun, factory, partiAd });
    if (window.appPrint?.printHtml) window.appPrint.printHtml(html, null, `Siparis-Ihtiyaci-${bugun}.pdf`);
  };
  return <Btn onClick={yazdir} disabled={!etkin} title="Sipariş listesini yazdır/PDF kaydet"><Icon name="print" size={13} /> Yazdır</Btn>;
};
