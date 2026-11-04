// Spec 0131 R13/2: müşteri detayının zaman çizelgesi ödeme anahtarının yanında kayıtlı tahsilat gününü düz metin olarak yazar.
// Ekran metni kıyasları (0079, 0095) spec öncesi altınla karşılaştırırken bu öğeyi DOM'dan ayıklar; öteki her metin birebir
// karşılaştırılmaya devam eder. Sayaç, ayıklamanın gerçekten iş yaptığını iddia etmek içindir.
let sayac = 0;
export const ayiklanan0131 = () => sayac;
export const metin0131 = (el) => {
  const kopya = el.cloneNode(true);
  const bul = kopya.querySelectorAll('[data-testid="tahsilat-gunu-metni"]');
  sayac += bul.length;
  bul.forEach(e => e.remove());
  return kopya.textContent.replace(/\s+/g, " ").trim();
};
