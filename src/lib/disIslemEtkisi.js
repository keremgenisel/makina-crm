// Spec 0137 R8, R8/2 (AC-18, AC-19, AC-127): dış işlem fiyat güncellemesinin etki önizlemesi (malzeme.fiyatEtkisi'nin ikizi).
// Ayrı modüldür (plan turu Karar 38): tek okuma yolunu ve satış fiyatını içe aldığı için `disIslem.js`'e konsa yeni bir döngüsel içe
// aktarma doğardı. Hesap yok: maliyet tek okuma yolundan, fiyat 0133'ün tek okuma yolundan; burada çarpım geçmez (C3).
// `eski` ve `yeni` aynı işlemin iki hâli; BÜTÜN canlı parçalar karşılaştırılır (bileşeni bu işlemi kullanan set de değişir).
import { parcaMaliyetKurus, setKatalogu } from "./urunAgaci";
import { malzemeKatalogu } from "./malzeme";
import { disIslemKatalogu } from "./disIslem";
import { kalemIslemIdleri } from "./maliyetKalemleri";
import { parcaSatisFiyati, fiyatAyariOf } from "./parcaFiyati";

export const disIslemFiyatEtkisi = (eski, yeni, parts = [], { disIslemler = [], malzemeler = [], fiyatAyarlari = null } = {}) => {
  const katEski = disIslemKatalogu(disIslemler.map(m => (String(m.id) === String(eski.id) ? eski : m)));
  const katYeni = disIslemKatalogu(disIslemler.map(m => (String(m.id) === String(eski.id) ? yeni : m)));
  const canli = (parts || []).filter(p => p && !p.deletedAt);
  const setKat = setKatalogu(canli);
  const malzemeKat = malzemeKatalogu(malzemeler);
  const bagli = canli.filter(p => kalemIslemIdleri(p).includes(String(eski.id))).length;
  const ayar = fiyatAyariOf(fiyatAyarlari);
  const bEski = { setKat, malzemeKat, islemKat: katEski, ayar };
  const bYeni = { ...bEski, islemKat: katYeni };
  const satirlar = [];
  for (const p of canli) {
    const once = parcaMaliyetKurus(p, undefined, setKat, malzemeKat, katEski);
    const sonra = parcaMaliyetKurus(p, undefined, setKat, malzemeKat, katYeni);
    if (once !== sonra) satirlar.push({ id: p.id, ad: p.ad, once, sonra, oncekiFiyat: parcaSatisFiyati(p, "TRY", bEski).deger, yeniFiyat: parcaSatisFiyati(p, "TRY", bYeni).deger });
  }
  return { bagli, degisen: satirlar.length, satirlar, fiyatDegisen: satirlar.filter(r => r.oncekiFiyat !== r.yeniFiyat).length };
};
export const BAGLI_PARCA_YOK = "Bu işleme bağlı parça yok.";
export const etkiMetni = (e) => (e.bagli === 0 ? BAGLI_PARCA_YOK : `${e.degisen} parçanın maliyeti değişecek (${e.bagli} bağlı parça).`);
export const fiyatEtkiMetni = (e) => (e.fiyatDegisen ? `${e.fiyatDegisen} parçanın satış fiyatı değişecek.` : "Satış fiyatı değişecek parça yok (bağlı parçaların fiyatı elle sabit).");
