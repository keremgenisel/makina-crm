// Spec 0156 C2/2 (AC-38): ekstre motorunun bu spec'le KOŞULSUZ eklenen alanları (`vergi`, `odemeler`, `kalanK`, `anahtar`; P8 `davranis`)
// kıyasta iki taraftan düşülür; satırların öteki bütün alanları, sıraları, bakiyeleri, devri ve özet rakamları birebir
// karşılaştırılır (0143, 0147, 0158 emsali). Yeni alanların değerleri `ekstre-detayi-0156.test.js`'te ölçülür.
// Plan P8 (uygulamada): tedarikçi ekstresinin borç ve ödeme satırına `davranis` da eklendi (kapanış etiketi ve taksit adı).
export const YENI_ALANLAR = ["vergi", "odemeler", "kalanK", "anahtar", "davranis"];
export const ayiklaEkstre0156 = (e) => ({ ...e, satirlar: (e.satirlar || []).map(s => { const x = { ...s }; for (const a of YENI_ALANLAR) delete x[a]; return x; }) });
