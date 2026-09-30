// Spec 0045: kuruşlu tutar girdisinin biçimlemesi ve çözümlemesi, TEK yer (C2). Saf, React'sız.
// Form durumu HAM metni tutar (rakamlar, en çok bir virgül, noktasız: "80000", "1234,56"); görünüm binlik noktalı
// ("80.000", "1.234,56"). Ham metin bugün de geçerli girdilerin alt kümesidir, bütün çözümleyiciler (tutarCoz,
// parseMoney) aynı değeri okur (R7, Q1).
import { noktaOndalikMi } from "./gider";

const ONDALIK_MAX = 2; // R2, Q4: yazarken en çok iki ondalık hane
const TEMIZ = /^-?[0-9.,]*$/; // bunun dışındaki metin biçimlenmez (Q5): doğrulama bugünkü hatayı verir
const ANLAMLI = /[0-9,-]/; // imleç hesabında sayılan karakterler (ayraç sayılmaz)

// Ham metni (ya da her biçimde metni) biçimle; temiz değilse null.
const bicimle = (ham) => {
  const eksi = ham.startsWith("-");
  const govde = eksi ? ham.slice(1) : ham;
  const [tam, ...kalan] = govde.split(",");
  const gruplu = tam.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return (eksi ? "-" : "") + gruplu + (kalan.length ? "," + kalan.join(",") : "");
};
const temizMi = (t) => TEMIZ.test(t) && (t.match(/,/g) || []).length <= 1 && !t.slice(1).includes("-");

// Yapıştırma ve bütün değişim (R5, Q2): tutarCoz'un kuralıyla. Virgülsüz tek nokta + 1–2 hane ondalık; öbür noktalar
// binlik. Temiz değilse null (olduğu gibi kalır).
export const hamaCevir = (metin) => {
  let t = String(metin ?? "").replace(/₺|TL|tl/g, "").replace(/\s/g, "");
  if (!temizMi(t)) return null;
  const eksi = t.startsWith("-");
  if (eksi) t = t.slice(1);
  if (noktaOndalikMi(t)) t = t.replace(".", ",");
  return (eksi ? "-" : "") + t.replace(/\./g, "");
};

// Durumdaki değerin görünümü. Sayı gelirse (kayıttan) Türkçe ondalığa çevrilir; temiz olmayan metin aynen döner.
export const tutarGosterim = (deger) => {
  if (deger == null || deger === "") return "";
  const metin = typeof deger === "number" ? String(deger).replace(".", ",") : String(deger);
  const ham = hamaCevir(metin);
  return ham == null ? metin : bicimle(ham);
};

// Metinde imleçten önceki anlamlı karakter sayısı ve bu sayıya karşılık gelen görünüm konumu (R3).
const anlamliSay = (metin, konum) => [...metin.slice(0, konum)].filter(c => ANLAMLI.test(c)).length;
const konumBul = (gosterim, adet) => {
  if (adet <= 0) return 0;
  let n = 0;
  for (let i = 0; i < gosterim.length; i++) if (ANLAMLI.test(gosterim[i]) && ++n === adet) return i + 1;
  return gosterim.length;
};

// Tek bir değişikliği işler. yeni: alanın yeni metni, onceki: az önceki görünüm, imlec: yeni metindeki imleç,
// tus: son basılan tuş ("Backspace" / "Delete" / diğer). Dönüş: { ham, gosterim, imlec }.
export const tutarGirdisiIsle = ({ yeni = "", onceki = "", imlec = null, tus = null } = {}) => {
  const yer = imlec ?? yeni.length;
  if (yeni === "") return { ham: "", gosterim: "", imlec: 0 };
  // Değişen parça: ortak baş ve son dışında kalan.
  let bas = 0;
  while (bas < yeni.length && bas < onceki.length && yeni[bas] === onceki[bas]) bas++;
  let son = 0;
  while (son < yeni.length - bas && son < onceki.length - bas && yeni[yeni.length - 1 - son] === onceki[onceki.length - 1 - son]) son++;
  const eklenen = yeni.slice(bas, yeni.length - son);
  const silinen = onceki.slice(bas, onceki.length - son);

  // Yapıştırma ya da bütün değişim: tutarCoz kuralı (R5).
  if (eklenen.length > 1) {
    const ham = hamaCevir(yeni);
    if (ham == null) return { ham: yeni, gosterim: yeni, imlec: yer };
    const gosterim = bicimle(ham);
    const sonrasi = yeni.length - yer; // imleçten sonra kalan metin korunur (çoğunlukla boş)
    return { ham, gosterim, imlec: sonrasi ? konumBul(gosterim, anlamliSay(gosterim, gosterim.length) - anlamliSay(yeni.slice(yer), sonrasi)) : gosterim.length };
  }

  let metin = yeni;
  let konum = yer;
  // R6, Q6: ayracın üzerinden silme bir rakam siler (geri silmede soldaki, Delete'te sağdaki).
  if (eklenen === "" && silinen === ".") {
    if (tus === "Delete") { metin = yeni.slice(0, bas) + yeni.slice(bas + 1); konum = bas; }
    else if (bas > 0) { metin = yeni.slice(0, bas - 1) + yeni.slice(bas); konum = bas - 1; }
  }
  // Q2: yazarken nokta binliktir; ayraç zaten otomatik geldiği için yok sayılır.
  if (eklenen === ".") return { ham: hamaCevir(onceki) ?? onceki, gosterim: onceki, imlec: bas };

  if (!temizMi(metin)) return { ham: metin, gosterim: metin, imlec: konum }; // Q5: biçimlenmez
  const ham = metin.replace(/\./g, "");
  // Q4: üçüncü ondalık hane yazılamaz (yalnız yazarken; gelen değer kesilmez).
  const virgul = ham.indexOf(",");
  if (eklenen && /\d/.test(eklenen) && virgul >= 0 && ham.length - virgul - 1 > ONDALIK_MAX && konum > metin.indexOf(",")) {
    return { ham: hamaCevir(onceki) ?? onceki, gosterim: onceki, imlec: bas };
  }
  const gosterim = bicimle(ham);
  return { ham, gosterim, imlec: konumBul(gosterim, anlamliSay(metin, konum)) };
};
