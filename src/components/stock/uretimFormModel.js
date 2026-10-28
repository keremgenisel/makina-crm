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
  kaynakTip: null,   // "musteri" | "extra_kalip" | "servis_tamir" (spec 0115) | null (manuel)
  kaynakId: null,    // customer.id, partSale.id ya da servis id
  kalipIdx: null,    // kaynak dizisindeki index (yalnız müşteri kalıbı; tamirde null, spec 0115 C2)
  tur: "uretim",     // spec 0115 R16/2: "uretim" | "tamir"; alanı olmayan eski satır üretim sayılır
  kaynakKalipId: null, // spec 0115 R17/2: tamir satırının servis girişi kimliği
  servisTarihi: "",  // spec 0115 Karar 48: tamir satırının servis tarihi kopyası
});
