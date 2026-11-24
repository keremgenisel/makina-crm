// Triyaj (bulgu 2): bu karşılaştırma SIRAYI değil satır içeriğini ölçer (eski altın uygulamanın kendi sıralamasından geçer); sıranın
// doğruluğu `siparis-cins-0161.test.js`'te sabit kimlik dizileriyle ölçülür (AC-1–AC-4, AC-10, AC-36).
// Spec 0161 P11 (AC-34): cinsi dolu veriyle (0158'in dolu verisinden türeyen 0157 ve 0159 kıyasları) üretilmiş spec öncesi altında
// pencerenin iki parça tablosu kit sırasındadır. Altın yenilenmez: eski altına yeni kural (öncelik listesi boş) uygulanır, yani
// karşılaştırmada tek bilinçli fark pencerenin satır sırasıdır; satırların içeriği, belge ve öteki bütün alanlar birebir kalır.
// Belge tarafı bu verilerde değişmez (cinsi dolu parça hazır grubunda zaten ilk sırada, ölçüm C), ayrıca sıralanmaz.
import { cinseGoreSirala } from "../../src/lib/siparisIhtiyaci";

export const cinsSirasiUygula = (siparis) => {
  const tb = siparis?.tedarikciBolumleri;
  if (!tb) return siparis;
  return { ...siparis, tedarikciBolumleri: { ...tb,
    bolumler: tb.bolumler.map(b => ({ ...b, hazirParcalar: cinseGoreSirala(b.hazirParcalar, []) })),
    belirtilmemis: { ...tb.belirtilmemis, parcalar: cinseGoreSirala(tb.belirtilmemis.parcalar, []) } } };
};
