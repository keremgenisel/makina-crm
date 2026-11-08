// Spec 0133 AC-73: zam penceresinin etki hesabının girdisi (parametresiz dönüşün spec öncesi altını `0133-etki-once.json`).
import { PARCALAR, P304 } from "./0133-veri.js";
export const ETKI_ESKI = P304;
export const ETKI_YENI = { ...P304, kiloFiyati: 3.4 };
export const ETKI_PARCALAR = [...PARCALAR, { id: 67, ad: "Bağlı mil", models: [], fiyatKipi: "maliyet", karKati: 2.4, malzemeSatiri: { malzemeId: 501, bicim: "mil", cap: 60, boy: 40 } },
  { id: 68, ad: "Mil seti", models: [], setIcerigi: [{ partId: 65, miktar: 2 }] }];
