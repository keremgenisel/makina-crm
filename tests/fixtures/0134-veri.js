// Spec 0134 ortak veri: Ø140 × 78 örneği (çapta 4, boyda 5 mm pay, ρ 7,90, %8 fire, 2,95 $, kur 50, 6 m boy) ve kit, set.
export const P304 = { id: 501, ad: "304 Paslanmaz", ozgulAgirlik: 7.9, kiloFiyati: 2.95, paraBirimi: "USD", kur: 50, geldigiBoy: 6, fire: 8, tedarikciId: 12 };
export const MIL140 = { malzemeId: 501, bicim: "mil", cap: 140, boy: 78, payCap: 4, payBoy: 5 };
export const KESME = { id: 41, ad: "Kesme mili", models: [], malzemeSatiri: MIL140 };
export const PUL = { id: 42, ad: "Pul", models: [], maliyet: 5 };
export const SOMUN = { id: 43, ad: "Somun", models: [], maliyet: 2 };
export const SET = { id: 44, ad: "Bağlantı seti", models: [], setIcerigi: [{ partId: 42, miktar: 2 }, { partId: 43, miktar: 3 }] };
export const TED = [{ id: 12, ad: "Ana Çelik", hammadde: true }, { id: 13, ad: "Beta Metal", hammadde: true }];
export const model = (ad, kit) => ({ model: ad, defaultParcalar: kit.map(([partId, miktar, adK]) => ({ partId: String(partId), ad: adK || "", miktar })) });
export const AK100 = model("AK100_DS", [[41, 1], [42, 8], [44, 1]]);
export const veri = (o = {}) => ({ modeller: [AK100], satirlar: [{ model: "AK100_DS", adet: "70" }], parts: [KESME, PUL, SOMUN, SET], partStock: [], malzemeler: [P304], tedarikciler: TED, ...o });
