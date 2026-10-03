// Spec 0015 kaynak taramaları (plan §5, F2/F4/F5/F7/F8): eski uyarı bileşeni hiçbir yerde kalmadı; eski 32 uyarının
// ifadesi aynı dosyada HataMetni içinde birebir duruyor; plan Ek A'daki ipuçları Ipucu, bölüm başlıkları BolumBasligi
// ile; kapsamdaki pencereler düğmelerini pencerenin alt yuvasına veriyor ("Stoğa Parça Ekle" istisnası adıyla).
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { regexKacis } from "./yardimci/regexKacis.js";

const KOK = path.join(__dirname, "..");
const oku = (d) => readFileSync(path.join(KOK, d), "utf-8");
const tumKaynak = (dizin) => readdirSync(path.join(KOK, dizin)).flatMap(ad => {
  const d = path.join(dizin, ad);
  return statSync(path.join(KOK, d)).isDirectory() ? tumKaynak(d) : /\.(jsx?|cjs|mjs|css)$/.test(ad) ? [d] : [];
});
const C = "src/components/";
// R9 kapsamı. F8: müşteri detayı ve Ayarlar e-posta yalnız eski uyarı bileşeni için kapsamda.
const FORMLAR = ["customers/CustomerAddEditForm.jsx", "ServiceForm.jsx", "PartSaleForm.jsx", "YedekParcaSatisForm.jsx", "SimpleDealers.jsx",
  "stock/MakinaStokTab.jsx", "stock/PartStokTab.jsx", "stock/UretimFormu.jsx", "Notes.jsx", "MailCompose.jsx",
  "ModelsManager.jsx", "KalipManager.jsx", "PartManager.jsx", "PartTypeManager.jsx", "CalisanManager.jsx"].map(f => C + f);
const YALNIZ_UYARI = ["customers/CustomerDetailModal.jsx", "settings/SettingsMail.jsx"].map(f => C + f);

describe("AC-1: eski uyarı bileşeni kalktı", () => {
  it("src'de Warn tanımı, içe aktarımı ve kullanımı yok; warn-msg sınıfı yok", () => {
    for (const d of tumKaynak("src")) {
      const s = readFileSync(path.join(KOK, d), "utf-8");
      expect(s, d).not.toMatch(/(?<![A-Za-z])Warn\b/);
      expect(s, d).not.toContain("warn-msg");
    }
  });
  it("dönüşümden önceki 32 uyarı ifadesi aynı dosyada HataMetni içinde birebir duruyor ve HataMetni tasarim'dan geliyor", () => {
    const { ifadeler } = JSON.parse(oku("tests/fixtures/0015-warn-ifadeleri.json"));
    let say = 0;
    for (const [d, liste] of Object.entries(ifadeler)) {
      const s = oku(d);
      expect(s, d).toMatch(/import \{[^}]*\bHataMetni\b[^}]*\} from "\.\.?\/(\.\.\/)?tasarim";/);
      for (const ifade of liste) {
        const adet = liste.filter(x => x === ifade).length;
        expect(s.split(`<HataMetni>${ifade}</HataMetni>`).length - 1, `${d}: ${ifade}`).toBe(adet);
        say++;
      }
    }
    expect(say).toBe(32);
    expect(Object.keys(ifadeler).length).toBe(14);
  });
});

// Plan Ek A: ipucu sınıflanan 12 metin (dosya, metnin başı).
const IPUCU = [
  ["customers/CustomerAddEditForm.jsx", "Manuel girilen seri no stoktan düşülmez"],
  ["customers/CustomerAddEditForm.jsx", "Stoktan seri no seçebilmek için önce yukarıdan"],
  ["customers/CustomerAddEditForm.jsx", "Stoktan satışta stoğa giriş tarihi otomatik yazılır"],
  ["customers/CustomerAddEditForm.jsx", "Makinenin fabrikadan satıldığı tutar"],
  ["customers/CustomerAddEditForm.jsx", "Gerçek bedelden farklı olabilir (düşük fatura)"],
  ["customers/CustomerAddEditForm.jsx", "Satış anında alınan kapora varsa girin"],
  ["customers/CustomerAddEditForm.jsx", "Ödemeler detay görünümünden (\"Ödeme Ekle\") yönetilir."],
  ["customers/CustomerAddEditForm.jsx", "Otomatik hesaplanır, elle değiştirilemez."],
  ["ServiceForm.jsx", "Tanımlı yedek parça yok. Ayarlar → Katalog'dan ekleyebilirsiniz."],
  ["PartSaleForm.jsx", "Boş bırakılırsa kargo, müşterinin kayıtlı adresine gider."],
  ["YedekParcaSatisForm.jsx", "Boş bırakılırsa kargo, alıcının kayıtlı adresine gider."],
  ["PartTypeManager.jsx", "<b>Müşteri formunda seç:</b>"],
];
// Metnin içinde durduğu en yakın açık öğe <Ipucu> mu?
const ipucuIcinde = (s, metin) => {
  const i = s.indexOf(metin);
  if (i < 0) return null;
  const once = s.slice(0, i);
  const ac = once.lastIndexOf("<Ipucu>"), kapa = once.lastIndexOf("</Ipucu>"), div = once.lastIndexOf("<div"), span = once.lastIndexOf("<span");
  return ac > kapa && ac > div && ac > span;
};

describe("AC-5: plan Ek A'daki ipuçları Ipucu ile", () => {
  it.each(IPUCU)("%s: %s", (d, metin) => {
    const s = oku(C + d);
    expect(ipucuIcinde(s, metin), "metin bulunamadı ya da Ipucu içinde değil").toBe(true);
    expect(s).toMatch(/import \{[^}]*\bIpucu\b[^}]*\} from "\.\.?\/(\.\.\/)?tasarim";/);
  });
});

const BASLIK = [
  ["customers/CustomerAddEditForm.jsx", "Firma Bilgileri"],
  ["customers/CustomerAddEditForm.jsx", "Makina Bilgileri"],
  ["customers/CustomerAddEditForm.jsx", "Satış / Finans"],
  ["stock/MakinaStokTab.jsx", "Kullanılan Parçalar"],
];
// Kapsam dosyalarında kalan büyük harf blokları: hepsi bölüm başlığı değil (plan Ek A "Değil" listesi).
const BUYUK_HARF_ISTISNA = {
  [C + "SimpleDealers.jsx"]: 2,        // bayi DETAY penceresinin rozet ve bilgi etiketi başlıkları (form değil; bölüm başlıkları spec 0016'da KartBolum'a geçti, C3 istisnası)
  [C + "stock/PartStokTab.jsx"]: 1,    // parça stoğu panel başlığı (liste ekranı)
  [C + "stock/UretimFormu.jsx"]: 2,    // tablo başlıkları
  [C + "CalisanManager.jsx"]: 1,       // tablo başlığı
};

// Başlık düz metindir: bütün düzenli ifade karakterleri kaçışlanır (CodeQL alert #44; eskiden yalnız "/" kaçışlanıyordu).
const bolumBasligiDeseni = (ad) => new RegExp(`<BolumBasligi[^>]*>\\s*${regexKacis(ad)}`);

describe("başlık deseni düz metni birebir arar (CodeQL alert #44)", () => {
  it("nokta ya da parantez içeren başlık yalnız kendisiyle eşleşir; eski yalnız-'/' kaçışı yanlış eşleşiyordu", () => {
    const eski = (ad) => new RegExp(`<BolumBasligi[^>]*>\\s*${ad.replace(/[/]/g, "\\/")}`);
    // Parantez: eski desende grup olur, parantezsiz metni de bulur (yanlış geçer).
    expect("<BolumBasligi>İlk Ödeme Kapora/Ödeme").toMatch(eski("İlk Ödeme (Kapora/Ödeme)"));
    expect("<BolumBasligi>İlk Ödeme Kapora/Ödeme").not.toMatch(bolumBasligiDeseni("İlk Ödeme (Kapora/Ödeme)"));
    expect("<BolumBasligi>İlk Ödeme (Kapora/Ödeme)").toMatch(bolumBasligiDeseni("İlk Ödeme (Kapora/Ödeme)"));
    // Nokta: eski desende her karakterle eşleşir.
    expect("<BolumBasligi>Altuntas AxSx").toMatch(eski("Altuntas A.S."));
    expect("<BolumBasligi>Altuntas AxSx").not.toMatch(bolumBasligiDeseni("Altuntas A.S."));
    expect("<BolumBasligi>Altuntas A.S.").toMatch(bolumBasligiDeseni("Altuntas A.S."));
  });
  it("yardımcı bütün düzenli ifade karakterlerini kaçışlar", () => {
    const zor = "a.b*c+d?e^f$g{h}i(j)k|l[m]n\\o/p-q";
    expect(new RegExp(`^${regexKacis(zor)}$`).test(zor)).toBe(true);
    expect(new RegExp(`^${regexKacis("a.b")}$`).test("axb")).toBe(false);
  });
});

describe("AC-6: bölüm başlıkları BolumBasligi ile, yerel büyük harfli başlık bloğu yok", () => {
  it.each(BASLIK)("%s: %s", (d, ad) => {
    const s = oku(C + d);
    expect(s).toMatch(bolumBasligiDeseni(ad));
  });
  it("kapsam formlarında textTransform uppercase yalnız adlandırılmış istisnalarda", () => {
    for (const d of FORMLAR) {
      const adet = (oku(d).match(/textTransform: "uppercase"/g) || []).length;
      expect(adet, d).toBe(BUYUK_HARF_ISTISNA[d] || 0);
    }
  });
  it("BolumBasligi tek tanım: KartBolum'un etiket başlığı da onunla çizilir", () => {
    const s = oku(C + "tasarim.jsx");
    expect(s.match(/export const BolumBasligi/g)).toHaveLength(1);
    expect(s).toContain("<BolumBasligi bosluk={baslikBosluk}>{title}</BolumBasligi>");
  });
});

// Pencere açılışlarını bul: "<Modal" ile başlayan açılış etiketi (süslü parantez derinliği 0'da ilk ">").
const pencereler = (s) => {
  const out = [];
  let i = s.indexOf("<Modal");
  while (i >= 0) {
    let d = 0, j = i;
    for (; j < s.length; j++) {
      const c = s[j];
      if (c === "{") d++;
      else if (c === "}") d--;
      else if (c === ">" && d === 0 && s[j - 1] !== "=") break;
    }
    out.push(s.slice(i, j + 1));
    i = s.indexOf("<Modal", j);
  }
  return out;
};
// Kapsamdaki form pencereleri (başlığın bir parçasıyla) → alt yuva kullanmalı.
const FORM_PENCERELERI = [
  ["customers/CustomerAddEditForm.jsx", "addLabel"], ["ServiceForm.jsx", "title={title}"], ["PartSaleForm.jsx", "title={title}"],
  ["YedekParcaSatisForm.jsx", "title={title}"], ["SimpleDealers.jsx", "Bayi Düzenle"], ["stock/MakinaStokTab.jsx", "Stoğa Makina Ekle"],
  ["stock/PartStokTab.jsx", "Stok Miktarını Düzelt"], ["Notes.jsx", "Kaydedilmemiş Değişiklikler"], ["MailCompose.jsx", "E-posta Gönder"],
  ["ModelsManager.jsx", "Yeni Model Ekle"], ["KalipManager.jsx", "Yeni Kalıp Ekle"], ["KalipManager.jsx", "Kalıbı Düzenle"],
  ["PartManager.jsx", "Yeni Yedek Parça Ekle"], ["PartManager.jsx", "Yedek Parçayı Düzenle"], ["CalisanManager.jsx", "Çalışanı Düzenle"],
];

describe("AC-8: pencere alt eylem satırı pencerenin alt yuvasında", () => {
  it.each(FORM_PENCERELERI)("%s (%s) footer= kullanıyor", (d, iz) => {
    const p = pencereler(oku(C + d)).find(x => x.includes(iz));
    expect(p, "pencere bulunamadı").toBeTruthy();
    expect(p).toMatch(/\bfooter=\{/);
  });
  it("kapsam formlarında gövde içi yapışkan alt çubuk (form-footer-bar) kalmadı", () => {
    for (const d of FORMLAR) expect(oku(d), d).not.toContain("form-footer-bar");
  });
  it("F5 istisnası: 'Stoğa Parça Ekle' penceresi overflowVisible ile gövde içi satırını korur", () => {
    const p = pencereler(oku(C + "stock/PartStokTab.jsx")).find(x => x.includes("Stoğa Parça Ekle"));
    expect(p).toContain("overflowVisible");
    expect(p).not.toMatch(/\bfooter=/);
  });
  it("yalnız uyarı kapsamındaki iki dosya (F8) HataMetni'yi tasarim'dan alıyor", () => {
    for (const d of YALNIZ_UYARI) expect(oku(d), d).toMatch(/import \{[^}]*\bHataMetni\b[^}]*\} from "\.\.\/tasarim";/);
  });
});
