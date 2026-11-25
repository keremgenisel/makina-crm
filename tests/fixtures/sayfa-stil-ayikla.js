// 2026-11-25: sipariş belgesine her sayfa için üst/alt boşluk (`siparisRaporu.SAYFA_STIL`, @page) eklendi. Spec öncesi koddan üretilmiş
// belge altınları yenilenmez; kıyaslar yeni belgeden bu tek stil satırını düşerek karşılaştırır (başka hiçbir fark ayıklanmaz).
import { SAYFA_STIL } from "../../src/lib/siparisRaporu";
export const sayfaStiliniAyikla = (html) => String(html).replace(SAYFA_STIL, "");
