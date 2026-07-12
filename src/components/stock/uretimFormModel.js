// Kalıp Üretim Formu satır modeli. Hem UretimFormu (collectPending) hem
// UretimSatirEkleModal (addRows) yeni satır üretmek için kullanır.
import { uid } from "../../lib/utils";

/** Boş bir üretim satırı (yeni ID ile). */
export const emptyRow = () => ({
  id: uid(),
  kalipDefId: null,
  kalipKodu: "",
  kalipAdi: "",
  kalipResim: "",
  musteriId: null,
  musteriAdi: "",
  sehir: "",
  makinaKodu: "",
  torna: "",
  kalipOlcusu: "",
  makinaKalipCapi: "",
  tamamlandi: false,
  kaynakTip: null,   // "musteri" | "extra_kalip" | null (manuel)
  kaynakId: null,    // customer.id veya partSale.id
  kalipIdx: null,    // kaynak dizisindeki index
});
