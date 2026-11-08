// Spec 0133 R17/2, AC-92 (Karar 38): fiyat listesinin yazdırma düğmesi. Salt okunur; hiçbir kayda yazmaz. Kapsamı çağıranın verdiği
// liste (Ayarlar › Katalog › Parça/Yedek Parça'nın süzgeçten geçen canlı parçaları, Karar 35).
import { Btn, Icon } from "../ui";
import { fiyatListesiHtml } from "../../lib/fiyatListesiRaporu";
import { yerelBugun } from "../../lib/utils";

export const FIYAT_LISTESI_DUGMESI = "Fiyat Listesi";
export const FiyatListesiDugmesi = ({ parcalar = [], baglam = null, factory = null }) => {
  const yazdir = () => {
    const bugun = yerelBugun();
    const html = fiyatListesiHtml(parcalar, baglam, { bugun, factory });
    if (window.appPrint?.printHtml) window.appPrint.printHtml(html, null, `Fiyat-Listesi-${bugun}.pdf`);
  };
  return <Btn variant="ghost" onClick={yazdir} disabled={!parcalar.length} title="Listedeki parçaların fiyat listesini yazdır/PDF kaydet"><Icon name="print" size={13} /> {FIYAT_LISTESI_DUGMESI}</Btn>;
};
