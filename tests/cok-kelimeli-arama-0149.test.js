// Spec 0149: aramada kelimeler ayrı ayrı aranır. Tek kural `src/lib/utils.js` (aramaKelimeleri, kelimelerEslesir, eksikKelimeler,
// nedenAlani); genel arama (`genelAramaSonuclari`, neden yardımcıları, R9 kapısı), gider araması (`aramaGider.js`), üst küme
// değişmezi, iki ölçüm ve kaynak taramaları.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { aramaNormalize, aramaKelimeleri, kelimelerEslesir, eksikKelimeler, nedenAlani, trLower } from "../src/lib/utils";
import { genelAramaSonuclari, musteriEslesmeNedeni, servisEslesmeNedeni, paletKelimeleri } from "../src/components/GlobalSearch";
import { aramaSorgusu, kalemEslesmesi, tedarikciEslesmesi, partiEslesmesi, cekEslesmesi, tanimEslesmesi } from "../src/lib/aramaGider";

const yeni = (q, degerler, n) => kelimelerEslesir(aramaKelimeleri(q, n), degerler, n);
// Spec öncesi kural (yalnız testte kopya; C1 ikinci kopya yasağı src içindir): sorgunun tamamı bir alanda geçmeli.
const eski = (q, degerler, n = aramaNormalize) => {
  const s = n(String(q).trim());
  return !s || degerler.some(d => n(String(d ?? "")).includes(s));
};
const AYNA = "AYNA MAHRUTİ DİŞLİSİ";

describe("Spec 0149: yardımcı (kural)", () => {
  it("AC-3 / AC-4 (saf): kelime sırası önemsiz, iki kelime birden geçmeli", () => {
    expect(yeni("ayna dişlisi", [AYNA])).toBe(true);
    expect(yeni("dişlisi ayna", [AYNA])).toBe(true);
    expect(yeni("ayna rulman", [AYNA])).toBe(false);
  });
  it("AC-6 / AC-29: fazla boşluk, sekme, satır sonu ve bölünemez boşluk tek ayraç; virgül ayraç değil", () => {
    for (const q of ["  ayna   dişlisi  ", "ayna\tdişlisi", "ayna\ndişlisi", "ayna dişlisi"]) {
      expect(aramaKelimeleri(q), JSON.stringify(q)).toEqual(aramaKelimeleri("ayna dişlisi"));
    }
    expect(aramaKelimeleri("ayna, dişlisi")).toEqual(["ayna,", "dislisi"]);
    expect(yeni("ayna, dişlisi", [AYNA])).toBe(false);
    expect(aramaKelimeleri("20.000 AK-100")).toEqual(["20.000", "ak-100"]);
  });
  it("AC-8 / R5: Türkçe harf katlaması (dislisi ↔ DİŞLİSİ, AYNA ↔ ayna)", () => {
    expect(yeni("dislisi", [AYNA])).toBe(true);
    expect(yeni("AYNA", ["ayna"])).toBe(true);
  });
  it("AC-30 / R1/3: boş kelime atılır; yalnız boşluk sorgusu kelimesiz (süzme yok), kelime sayısına sınır yok", () => {
    expect(aramaKelimeleri("   ")).toEqual([]);
    expect(aramaKelimeleri("")).toEqual([]);
    expect(aramaKelimeleri(null)).toEqual([]);
    expect(kelimelerEslesir([], ["x"])).toBe(true);
    const cok = Array.from({ length: 40 }, (_, i) => `k${i}`).join(" ");
    expect(aramaKelimeleri(cok)).toHaveLength(40);
    expect(yeni(`${cok} zzz`, [cok])).toBe(false); // fazladan kelime sessizce yok sayılmaz
  });
  it("R2: kelimeler farklı alanlarda geçebilir; boş değerler atlanır", () => {
    expect(yeni("ayna istanbul", ["AYNA LTD", null, "", "İstanbul"])).toBe(true);
    expect(yeni("ayna izmir", ["AYNA LTD", "İstanbul"])).toBe(false);
  });
  it("C1/2: normalleştirici parametredir; trLower ile harf sadeleştirmesi yok", () => {
    expect(yeni("dislisi", [AYNA], trLower)).toBe(false);
    expect(yeni("dişlisi ayna", [AYNA], trLower)).toBe(true);
  });
  it("R2/2: neden yardımcıları (eksik kelime, ilk alan; başlık hepsini taşıyorsa null)", () => {
    const k = aramaKelimeleri("ayna 532");
    expect(eksikKelimeler(k, ["AYNA LTD"])).toEqual(["532"]);
    expect(nedenAlani(k, ["AYNA LTD"], [["yetkili", "Ali"], ["telefon", "0532 111"]])).toEqual({ etiket: "telefon", deger: "0532 111" });
    expect(nedenAlani(aramaKelimeleri("ayna ltd"), ["AYNA LTD"], [["telefon", "0532"]])).toBeNull();
  });
});

describe("Spec 0149: genel arama (saf)", () => {
  const PARCA = [{ id: 1, ad: AYNA, kod: "AMD-1" }, { id: 2, ad: "AYNA RULMANI", kod: "AR-1" }, { id: 3, ad: "KONVEYÖR TAHRİK MİLİ" }];
  const MUSTERI = [
    { id: 11, name: "AYNA GIDA", city: "İstanbul", phone: "0532 444 11 22", yetkili1Ad: "Veli" },
    { id: 12, name: "BAŞKA FİRMA", phone: "0532 999" },
  ];
  const kapi = { izinli: () => true, onGoKatalog: () => {} };
  const ara = (q) => genelAramaSonuclari(q, { parts: PARCA, customers: MUSTERI }, kapi);
  it("AC-2 / AC-3 / AC-4: palet parçayı iki kelimeyle, kelime sırasından bağımsız bulur; olmayan kelimeyle bulmaz", () => {
    expect(ara("ayna dişlisi").parcaTanimlari.map(p => p.id)).toEqual([1]);
    expect(ara("dişlisi ayna").parcaTanimlari.map(p => p.id)).toEqual([1]);
    expect(ara("ayna rulman").parcaTanimlari.map(p => p.id)).toEqual([2]);
    expect(ara("ayna tahrik").parcaTanimlari).toEqual([]);
  });
  it("AC-7 / AC-15 / AC-22 / R9: tek karakter ve yalnız boşluk sonuç vermez; 'a b' vermez, 'ayna b' çalışır", () => {
    expect(ara("a")).toBeNull();
    expect(ara("   ")).toBeNull();
    expect(ara("a b")).toBeNull();
    expect(paletKelimeleri("a b")).toBeNull();
    expect(ara("ayna b")).not.toBeNull();
    expect(ara("ayna d").parcaTanimlari.map(p => p.id)).toEqual([1]); // "d" yalnız "DİŞLİSİ"/"AMD-1"de; tek harf kelime süzer
  });
  it("AC-21: 'ayna 532' adı ve telefonu ayrı alanlarda olan müşteriyi bulur", () => {
    expect(ara("ayna 532").musteriler.map(c => c.id)).toEqual([11]);
  });
  it("AC-19: müşteri neden satırı başlıkta geçmeyen kelimeyi taşıyan ilk alanı yazar; iki kelime addayken yok", () => {
    expect(musteriEslesmeNedeni(MUSTERI[0], aramaKelimeleri("ayna 532"))).toBe("telefon: 0532 444 11 22");
    expect(musteriEslesmeNedeni(MUSTERI[0], aramaKelimeleri("ayna gıda"))).toBeNull();
    // Tek kelimede bugünkü sıra: yetkili, telefon (R3).
    expect(musteriEslesmeNedeni(MUSTERI[0], aramaKelimeleri("veli"))).toBe("yetkili: Veli");
    expect(musteriEslesmeNedeni({ name: "X", prevOwners: [{ name: "Eski Sahip" }] }, aramaKelimeleri("eski"))).toBe("eski sahibi: Eski Sahip");
  });
  it("R2/3: servis sekiz alandan gelen kelimeye neden yazmaz, yalnız kalıp alanından", () => {
    const sv = { tech: "Ahmet", type: "Bakım", atolyeKaliplari: [{ id: 1, ad: "Burger 110" }], kalipKargoFirma: "Yurtiçi" };
    expect(servisEslesmeNedeni(sv, { name: "LEZZET" }, aramaKelimeleri("ahmet burger"))).toBe("kalıp: Burger 110");
    expect(servisEslesmeNedeni(sv, { name: "LEZZET" }, aramaKelimeleri("ahmet lezzet"))).toBeNull();
    expect(servisEslesmeNedeni(sv, null, aramaKelimeleri("yurtiçi"))).toBe("kalıp kargo: Yurtiçi");
  });
});

describe("Spec 0149: gider araması (R7, R7/2, R7/3)", () => {
  const TUR = new Map([["1", { id: 1, ad: "Bakım", davranis: "normal" }]]);
  const TED = new Map([["5", { id: 5, ad: "Yıldız Servis" }]]);
  const ctx = { turMap: TUR, tedMap: TED };
  const k = (o) => ({ id: 1, turId: 1, tarih: "2026-03-15", tutar: 120000, kdvOrani: 0, ...o });
  it("triyaj bulgu 3: aramaSorgusu tek parça `metin` alanı taşımaz; eşleşme yalnız kelimeler üzerinden", () => {
    const s = aramaSorgusu("  Ayna  Dişlisi ");
    expect(Object.keys(s).sort()).toEqual(["ham", "kelimeler", "sayisal", "tarih", "tutar"]);
    expect(s.kelimeler).toEqual(["ayna", "dislisi"]);
    expect(fs.readFileSync(path.join("src", "lib/aramaGider.js"), "utf8")).not.toMatch(/\baramaNormalize\b/);
  });
  it("AC-12: tutar eşitliği değişmez ('20.000' 120.000'i bulmaz)", () => {
    expect(kalemEslesmesi(k({ aciklama: "X" }), aramaSorgusu("20.000"), ctx)).toBeNull();
    expect(kalemEslesmesi(k({ aciklama: "X", tutar: 20000 }), aramaSorgusu("20.000"), ctx)?.neden).toMatch(/^tutar:/);
  });
  it("AC-13: tarih eşleşmesi değişmez", () => {
    expect(kalemEslesmesi(k({ aciklama: "X" }), aramaSorgusu("15.03.2026"), ctx)).toEqual({ neden: "tarih: 15/03/2026" });
  });
  it("AC-14: 'araç faturası' açıklaması 'ARAÇ BAKIM FATURASI' olan kalemi bulur", () => {
    expect(kalemEslesmesi(k({ aciklama: "ARAÇ BAKIM FATURASI" }), aramaSorgusu("araç faturası"), ctx)).toEqual({ neden: null });
  });
  it("AC-20: açıklama bir kelimeyi, tedarikçi ötekini taşıyınca neden 'tedarikçi: …'; ikisi açıklamadayken neden yok", () => {
    const kalem = k({ aciklama: "ARAÇ BAKIM FATURASI", tedarikciId: 5 });
    expect(kalemEslesmesi(kalem, aramaSorgusu("araç yıldız"), ctx)).toEqual({ neden: "tedarikçi: Yıldız Servis" });
    expect(kalemEslesmesi(kalem, aramaSorgusu("araç bakım"), ctx)).toEqual({ neden: null });
  });
  it("AC-31: sayısal sorgunun metin dalı kelimelere bölünür; tutar eşitliği etkilenmez", () => {
    expect(kalemEslesmesi(k({ aciklama: "20 000 avans" }), aramaSorgusu("20 avans"), ctx)).toEqual({ neden: null });
    const s = aramaSorgusu("20 000");
    expect(s.sayisal).toBe(true); expect(s.kelimeler).toEqual(["20", "000"]);
    expect(kalemEslesmesi(k({ aciklama: "20 000 avans" }), s, ctx)).toEqual({ neden: null });
    expect(kalemEslesmesi(k({ aciklama: "Y", tutar: 20000 }), s, ctx)?.neden).toMatch(/^tutar:/);
  });
  it("AC-32: karışık sorgu (metin + tarih) eşleşme vermez (X7)", () => {
    expect(kalemEslesmesi(k({ aciklama: "KİRA" }), aramaSorgusu("kira 15.03.2026"), ctx)).toBeNull();
  });
  it("tedarikçi, tanım, çek, parti: kayıt düzeyi ve neden (R2/3)", () => {
    const t = { id: 5, ad: "Yıldız Servis", yetkili: "Ali Kaya", telefon: "0532" };
    expect(tedarikciEslesmesi(t, aramaSorgusu("yıldız ali"))).toEqual({ neden: "yetkili: Ali Kaya" });
    expect(tedarikciEslesmesi(t, aramaSorgusu("yıldız servis"))).toEqual({ neden: null });
    expect(tanimEslesmesi({ id: 9, ad: "Aylık bakım", turId: 1, tedarikciId: 5 }, aramaSorgusu("aylık yıldız"), ctx)).toEqual({ neden: "tedarikçi: Yıldız Servis" });
    expect(cekEslesmesi({ no: "A1", banka: "Ziraat", kesideci: "Demir" }, aramaSorgusu("ziraat demir"))).toEqual({ neden: "keşideci: Demir" });
    expect(cekEslesmesi({ no: "A1", banka: "Ziraat" }, aramaSorgusu("a1 ziraat"))).toEqual({ neden: null });
    const p = { id: 1, ad: "Güz Partisi", baslangicAy: "2026-09", aciklama: "AK100" };
    expect(partiEslesmesi(p, aramaSorgusu("güz ak100"))).toEqual({ neden: "açıklama: AK100" });
    expect(partiEslesmesi(p, aramaSorgusu("09.2026"))).toEqual({ neden: "başlangıç: 2026-09" }); // tarih dalı (R7/3)
  });
});

describe("Spec 0149: üst küme ve tek kelime (R3, R3/2)", () => {
  // Rastgele (tohumlu) kayıtlar ve kayıtların değerlerinden alınmış alt dize sorgular; eski kural eşleştiriyorsa yeni de eşleştirir.
  let tohum = 7;
  const rnd = () => ((tohum = (tohum * 1103515245 + 12345) % 2147483648) / 2147483648);
  const SOZ = ["AYNA", "MAHRUTİ", "DİŞLİSİ", "KONVEYÖR", "tahrik", "mili", "Şişli", "İstanbul", "ç", "20.000", "AK-100", "rulman", "ığ", "Öz"];
  const deger = () => Array.from({ length: 1 + Math.floor(rnd() * 4) }, () => SOZ[Math.floor(rnd() * SOZ.length)]).join(rnd() < 0.2 ? "  " : " ");
  const kayitlar = Array.from({ length: 300 }, () => Array.from({ length: 1 + Math.floor(rnd() * 4) }, deger));
  const sorgular = [];
  for (const r of kayitlar.slice(0, 120)) {
    const d = r[Math.floor(rnd() * r.length)];
    const a = Math.floor(rnd() * d.length); const b = a + 1 + Math.floor(rnd() * (d.length - a));
    sorgular.push(d.slice(a, b)); sorgular.push(` ${d.slice(a, b)} `);
  }
  it("AC-28: eski kuralla eşleşen her kayıt yeni kuralla da eşleşir (iki normalleştiricide)", () => {
    let eskiSayi = 0;
    for (const n of [aramaNormalize, trLower]) {
      for (const q of sorgular) for (const r of kayitlar) {
        if (eski(q, r, n)) { eskiSayi++; expect(yeni(q, r, n), `${q} | ${r.join(" / ")}`).toBe(true); }
      }
    }
    expect(eskiSayi).toBeGreaterThan(1000); // ölçüm boş değil
  });
  it("AC-5: tek kelimelik, kırpılmış sorguda eski ve yeni kural aynı kümeyi verir", () => {
    for (const q of ["ayna", "dişlisi", "20.000", "ak-100", "şişli", "x"]) {
      for (const r of kayitlar) expect(yeni(q, r), q).toBe(eski(q, r));
    }
  });
});

describe("Spec 0149: ölçümler (mutlak eşik)", () => {
  it("AC-17: 400 parça × 10 alan, iki kelimeli sorgu, 200 tur", () => {
    const kayitlar = Array.from({ length: 400 }, (_, i) => Array.from({ length: 10 }, (_, j) => `PARÇA ${i} ALAN ${j} AYNA MAHRUTİ DİŞLİSİ`));
    const kel = aramaKelimeleri("ayna dişlisi");
    const t0 = performance.now();
    let n = 0;
    for (let tur = 0; tur < 200; tur++) for (const r of kayitlar) if (kelimelerEslesir(kel, r)) n++;
    const sure = performance.now() - t0;
    expect(n).toBe(80000);
    expect(sure, `${Math.round(sure)} ms`).toBeLessThan(3000);
  });
  it("AC-34: genel arama, gerçekçi veri kümesiyle tek çağrı (iki kelime)", () => {
    const customers = Array.from({ length: 600 }, (_, i) => ({ id: i, name: `FİRMA ${i} GIDA`, city: "İstanbul", phone: `0532 ${i}`, serialNo: `S-${i}`, model: "AK100", prevOwners: [{ name: "Eski" }] }));
    const services = Array.from({ length: 2000 }, (_, i) => ({ id: i, customerId: i % 600, type: "Bakım", tech: "Ahmet", musteriTalimati: "Kalıp değişimi yapılacak", durum: "Bekliyor" }));
    const parts = Array.from({ length: 400 }, (_, i) => ({ id: i, ad: `PARÇA ${i} AYNA MAHRUTİ DİŞLİSİ`, kod: `P-${i}` }));
    const giderler = Array.from({ length: 1500 }, (_, i) => ({ id: i, turId: 1, tarih: "2026-03-15", tutar: i * 10, aciklama: `Gider ${i} bakım faturası` }));
    const kapi = { izinli: () => true, onGoKatalog: () => {}, onGoGider: () => {} };
    const v = { customers, services, parts, giderler, giderTurleri: [{ id: 1, ad: "Bakım", davranis: "normal" }], tedarikciler: [], notes: [], teklifler: [], dealers: [], stock: [] };
    const k2 = { ...kapi, ...{ izinli: () => true } };
    genelAramaSonuclari("ısınma turu", v, k2);
    const t0 = performance.now();
    const r = genelAramaSonuclari("ayna dişlisi", v, k2);
    const sure = performance.now() - t0;
    expect(r.parcaTanimlari).toHaveLength(400);
    expect(sure, `${Math.round(sure)} ms`).toBeLessThan(500);
  });
});

describe("Spec 0149: kaynak taramaları (C1, C6, R8/3)", () => {
  const dosyalar = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => (e.isDirectory() ? (e.name === "map" ? [] : dosyalar(path.join(d, e.name))) : /\.(js|jsx)$/.test(e.name) ? [path.join(d, e.name)] : []));
  const yorumsuz = (t) => t.replace(/\/\*[\s\S]*?\*\//g, "").split("\n").map(l => l.replace(/(^|[^:"'`])\/\/.*$/, "$1")).join("\n");
  const ifadeler = (f) => yorumsuz(fs.readFileSync(f, "utf8")).split(/;|\n\s*\n/);
  // C6 (plan P2): eski tek parça desen = aynı ifadede normalleştirici çağrısı ve `.includes(`. Gerekçeli istisna YOK (ölçüldü:
  // `benzerKayitBul`, tedarikçi süzgeci ve palet vurgusu bu deseni kullanmıyor).
  const ESKI = (s) => /\b(aramaNormalize|trLower|toLocaleLowerCase)\s*\(/.test(s) && /\.includes\(/.test(s);
  const ISTISNA = [];
  it("AC-16 (b): arama çağrı yerlerinde eski tek parça desen kalmadı; istisna listesi tam yollu ve sayılı", () => {
    const bulunan = [];
    for (const f of dosyalar("src")) for (const s of ifadeler(f)) if (ESKI(s) && !f.endsWith(path.join("lib", "utils.js"))) bulunan.push(f);
    expect(bulunan).toEqual(ISTISNA);
  });
  it("AC-16 (a): kelimelere bölüp hepsini arayan ikinci kopya yok", () => {
    const kopya = [];
    for (const f of dosyalar("src")) {
      if (f.endsWith(path.join("lib", "utils.js"))) continue;
      for (const s of ifadeler(f)) if (/split\(\s*\/\\s\+\//.test(s) && /\.(every|includes)\(/.test(s)) kopya.push(f);
    }
    expect(kopya).toEqual([]);
  });
  it("AC-16 (mutasyon): eski desen geri konursa tarama yakalar", () => {
    expect(ESKI("const l = q ? havuz.filter(c => aramaNormalize(`${c.name} ${c.city}`).includes(q)) : havuz")).toBe(true);
    expect(ESKI("return aramaNormalize([cust?.name, s.type].filter(Boolean).join(\" \")).includes(q)")).toBe(true);
    expect(ESKI("if (!trLower(`${k.aciklama || \"\"} ${tedMap.get(String(k.tedarikciId))?.ad || \"\"}`).includes(trLower(filtre.ara))) return false")).toBe(true);
    expect(ESKI("return kelimelerEslesir(kelimeler, [c.name])")).toBe(false);
  });
  it("R6 / R6/2: envanterin her dosyası paylaşılan yardımcıyı çağırır", () => {
    const ENVANTER = ["components/Customers.jsx", "components/SimpleDealers.jsx", "components/stock/PartStokTab.jsx", "components/ModelsManager.jsx",
      "components/Documents.jsx", "components/ui.jsx", "components/GlobalSearch.jsx", "lib/aramaGider.js", "components/stock/YedekParcaSatisTab.jsx",
      "components/Analiz.jsx", "components/settings/SettingsSahipsiz.jsx", "components/ServiceForm.jsx", "components/PartSaleForm.jsx",
      "components/Notes.jsx", "components/Finance.jsx", "components/stock/UretimSatirEkleModal.jsx", "components/gider/DonemRaporu.jsx",
      "components/tasarim.jsx", "hooks/useFilteredList.js"];
    for (const f of ENVANTER) expect(fs.readFileSync(path.join("src", f), "utf8"), f).toMatch(/kelimelerEslesir\(/);
    // `useFilteredList` ile gelen kutular kancayı kullanır (eşleşme kancada).
    for (const f of ["stock/MakinaStokTab.jsx", "PartManager.jsx", "KalipManager.jsx", "settings/SettingsTrash.jsx", "settings/SettingsSentMail.jsx"]) {
      expect(fs.readFileSync(path.join("src/components", f), "utf8"), f).toMatch(/useFilteredList\(/);
    }
  });
  it("AC-26 / R8/3: searchFn ayrıştırılmış nesneyi (sorgu.kelimeler) okur; dize kullanımı kalmadı", () => {
    for (const f of dosyalar("src")) {
      const t = yorumsuz(fs.readFileSync(f, "utf8"));
      for (const m of t.matchAll(/searchFn:\s*\(([^)]*)\)\s*=>([^\n]*)/g)) {
        expect(m[1], f).toMatch(/sorgu/);
        expect(m[2] + t.slice(m.index, m.index + 600), f).toMatch(/sorgu\.kelimeler/);
      }
    }
  });
});
