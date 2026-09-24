// Makina satış kaydına yazılan iki snapshot alanı (spec 0002 C4 istisnaları 1 ve 2): satış kuru ve üretim
// tarihi. Saf fonksiyonlar; Customers.jsx kayıt yollarında çağrılır.
import { CURRENCIES } from "./constants";

const paraOf = (c) => (CURRENCIES.includes(c?.currency) ? c.currency : "TRY");
const gunFarki = (a, b) => Math.round((new Date(`${b}T00:00:00`) - new Date(`${a}T00:00:00`)) / 86400000);
export const KUR_DAMGA_PENCERESI_GUN = 30;

// R12, plan M2. Kur "1 birim yabancı para = X TL" olarak yazılır.
//  - TL'de kur alanı boşalır.
//  - Yeni kayıtta veya para birimi değişince o günün kuru yazılır (alınamıyorsa boş, kayıt engellenmez).
//  - Aynı para biriminde kayıtlı kur korunur.
//  - Kursuz mevcut kayıtta yalnız satış tarihi son 30 gün içindeyse yazılır (çevrimdışı kaydedilmiş yeni
//    satış); daha eski satış "yaklaşık" kalır, geçmişe bugünün kuru sahte kesinlikle yazılmaz.
export const satisKuruUygula = (eski, yeni, rates, bugun) => {
  const para = paraOf(yeni);
  if (para === "TRY") return { ...yeni, satisKuru: null };
  const guncel = Number(rates?.[para.toLowerCase()]);
  const bugunKuru = guncel > 0 ? Math.round(guncel * 10000) / 10000 : null;
  if (!eski || paraOf(eski) !== para) return { ...yeni, satisKuru: bugunKuru };
  const kayitli = Number(eski.satisKuru);
  if (kayitli > 0) return { ...yeni, satisKuru: kayitli };
  const yeniSatis = !!yeni.installDate && !!bugun && gunFarki(yeni.installDate, bugun) <= KUR_DAMGA_PENCERESI_GUN;
  return { ...yeni, satisKuru: yeniSatis ? bugunKuru : null };
};

// R1b: stoktan satışta stok satırının üretim tarihi satış kaydına yazılır ve sonra değişmez. Elle girilmiş
// tarih (formda) önceliklidir. Geri dönen stok satırı özgün tarihini taşır (plan M3).
export const uretimTarihiDamgala = (kayit, stokSatiri) => {
  if (kayit?.uretimTarihi || !stokSatiri) return kayit;
  const t = stokSatiri.uretimTarihi || stokSatiri.addedDate || "";
  return t ? { ...kayit, uretimTarihi: t } : kayit;
};
