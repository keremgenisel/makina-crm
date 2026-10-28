// Spec 0114 R3–R5: satış tipi seçicisinin tek tanımı (makina, Extra Kalıp, yedek parça, servis). Seçenekler ve çevrim
// lib/ihracKayitli.js'ten; formlar kendi seçenek listesini yazmaz. `ihracDahil` servis formunda false (R4): ihraç kayıtlı yalnız
// mal teslimidir. `onSec` seçimden üretilen form anahtarlarını alır (satisTipiUygula); formun kendi yan etkileri (müşteri formunun
// faturaBedeli temizliği) çağıranda kalır (R22/2). Etiket (`Field`) formlarda durur.
import { Select } from "./ui";
import { satisTipiSecenekleri, satisTipiSecimi, satisTipiUygula } from "../lib/ihracKayitli";

export const SatisTipiSecici = ({ kayit, alan = "faturaTipi", ihracDahil = true, onSec, ariaLabel }) => (
  <Select value={satisTipiSecimi(kayit)} aria-label={ariaLabel} onChange={e => onSec(satisTipiUygula(e.target.value, alan))}>
    {satisTipiSecenekleri(ihracDahil).map(t => <option key={t} value={t}>{t}</option>)}
  </Select>
);
