// Örnek katalog verileri (2026-11-09, TY isteği): Malzemeler ve Dış İşlemler panelleri liste boşken "Örnek verileri ekle"
// düğmesi gösterir; kullanıcı tıklarsa aşağıdaki kayıtlar eklenir. Kendiliğinden hiçbir şey yazılmaz (göç yok).
// Kayıtlar elle girilmiş gibi kartın kendi doğrulayıcısından geçer (şekil ve boş alan kuralı aynı, C7). Adların başında
// "Örnek:" vardır; kullanıcı silebilir ya da düzenleyip kendi kaydına çevirebilir. Fiyatlar yalnız örnektir.
import { malzemeDogrula, kurOnerisi } from "./malzeme";
import { disIslemDogrula } from "./disIslem";

export const ORNEK_DUGMESI = "Örnek verileri ekle";
export const ORNEK_ONEKI = "Örnek: ";
export const ORNEK_IPUCU = "Nasıl çalıştığını görmek için örnek kayıtları ekleyebilirsiniz. Fiyatlar yalnız örnektir; kayıtları düzenleyip kendi verinize çevirebilir ya da silebilirsiniz.";

// Dövizli örnek günün kuruyla eklenir; kur alınamamışsa dövizli örnek eklenmez (uydurma kur yazılmaz).
const kurMetni = (pb, rates, ratesErr) => {
  const o = kurOnerisi(pb, rates, ratesErr);
  return o?.deger ? String(o.deger).replace(".", ",") : null;
};

const MALZEME_FORMLARI = (usdKur) => [
  { ad: `${ORNEK_ONEKI}St37 lama`, alasim: "St37", ozgulAgirlik: "7,85", kiloFiyati: "42", fire: "3", geldigiBoy: "6", asgariSiparis: "100" },
  { ad: `${ORNEK_ONEKI}8620 mil (çapa göre bantlı fiyat)`, alasim: "8620", ozgulAgirlik: "7,85", kiloFiyati: "70", fire: "5", geldigiBoy: "6",
    bantlar: [{ alt: "0", fiyat: "68" }, { alt: "50", fiyat: "64" }, { alt: "100", fiyat: "61" }] },
  { ad: `${ORNEK_ONEKI}304 paslanmaz boru (boy fiyatlı)`, alasim: "AISI 304", ozgulAgirlik: "7,93", kiloFiyati: "180", boyFiyati: "2150", geldigiBoy: "6" },
  ...(usdKur ? [{ ad: `${ORNEK_ONEKI}6061 alüminyum mil (dolar fiyatlı)`, alasim: "6061", ozgulAgirlik: "2,7", kiloFiyati: "4,2", paraBirimi: "USD", kur: usdKur, fire: "4", geldigiBoy: "3" }] : []),
];

const ISLEM_FORMLARI = (eurKur) => [
  { ad: `${ORNEK_ONEKI}Isıl işlem (sertleştirme)`, birim: "adet", birimFiyati: "25" },
  { ad: `${ORNEK_ONEKI}Elektrostatik toz boya`, birim: "adet", birimFiyati: "35" },
  { ad: `${ORNEK_ONEKI}Sıcak daldırma galvaniz`, birim: "kilo", birimFiyati: "18" },
  ...(eurKur ? [{ ad: `${ORNEK_ONEKI}Nitrürleme (euro fiyatlı)`, birim: "kilo", birimFiyati: "1,2", paraBirimi: "EUR", kur: eurKur }] : []),
];

// Var olan (canlı) kayıtlarla ad çakışan örnek atlanır; doğrulamadan geçemeyen örnek de (savunma) eklenmez.
const kur = (formlar, dogrula, mevcut, yeniId) => {
  const sonuc = [];
  for (const f of formlar) {
    const v = dogrula(f, [...mevcut, ...sonuc]);
    if (v.gecerli) sonuc.push({ ...v.kayit, id: yeniId() });
  }
  return sonuc;
};

export const ornekMalzemeler = ({ mevcut = [], rates = null, ratesErr = false, yeniId }) =>
  kur(MALZEME_FORMLARI(kurMetni("USD", rates, ratesErr)), malzemeDogrula, mevcut, yeniId);

export const ornekDisIslemler = ({ mevcut = [], rates = null, ratesErr = false, yeniId }) =>
  kur(ISLEM_FORMLARI(kurMetni("EUR", rates, ratesErr)), disIslemDogrula, mevcut, yeniId);
