// Spec 0106 R4, R10, R11, Karar 33: makina ve kalıp durumu seçicileri. Form, detay penceresi ve zaman çizelgesi aynı iki bileşeni
// çağırır; seçenekler ve "Otomatik (…)" etiketi musteriDurumu.js'ten gelir (R27, C4). Yazım çağıranın işidir (`durumYaz`).
import { Select } from "../ui";
import { makinaSecenekleri, kalipSecenekleri, MAKINA_DURUMU_ETIKETI, KALIP_DURUMU_ETIKETI } from "../../lib/musteriDurumu";

export const MakinaDurumuSecici = ({ value, onChange, ariaLabel = MAKINA_DURUMU_ETIKETI }) => (
  <Select aria-label={ariaLabel} value={value || ""} onChange={e => onChange(e.target.value)}>
    {makinaSecenekleri().map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
  </Select>
);

export const KalipDurumuSecici = ({ value, turetilen, onChange, ariaLabel = KALIP_DURUMU_ETIKETI }) => (
  <Select aria-label={ariaLabel} value={value || ""} onChange={e => onChange(e.target.value)}>
    {kalipSecenekleri(turetilen).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
  </Select>
);
