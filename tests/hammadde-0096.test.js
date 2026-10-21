// Spec 0096: hammadde tedarikçisi ve parça maliyetinin tedarikçi kırılımı. Saf motor (tek okuma yolu, doğrulayıcı, kaynak,
// ad çözücü), tedarikçi kullanımı ve koruma yardımcısı, model maliyeti, aktarma, birleştirme ve kaynak taramaları.
// Ekran kriterleri tests/ui/hammadde-0096.test.jsx, gerçek App tests/ui/hammadde-0096-app.test.jsx, gidiş dönüş
// scripts/tests/db-roundtrip.cjs, kırılımsız parçada spec öncesiyle aynılık tests/hammadde-0096-kiyas.test.js.
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import {
  parcaMaliyetKurus, parcaMaliyetiVar, maliyetGirildiMi, parcaMaliyetMetni, maliyetKaynagi, kirilimTutarliMi, hammaddeDogrula, hammaddeFormu,
  hammaddeTedarikciAdi, hammaddeSecilebilirMi, SILINMIS_TEDARIKCI, BULUNAMAYAN_TEDARIKCI, TEDARIKCI_SECILMEDI, HAMMADDE_EXCEL_HATASI,
} from "../src/lib/urunAgaci";
import { tedarikciKullanim, kirilimdaGecenTedarikciler } from "../src/lib/gider";
import { modelMaliyetleri } from "../src/lib/makinaStandartMaliyet";
import { parcaDisaAktarmaSatiri, parcaSatirlariniCoz, PARCA_AKTARMA_BASLIKLARI } from "../src/lib/parcaAktarma";
import { buildMergePlan } from "../src/lib/merge";
import { uid } from "../src/lib/utils";
import { BLOB_SECTIONS, EYLEM_IDLERI, AYAR_ALAN_SEKMELERI } from "../electron/serverAuth.cjs";
import { MERGE_KEYS } from "../src/lib/merge";
import { KILIT_ALANLARI } from "../src/lib/kilitAlanlari";
// Spec 0097 ile (R20/2, plan P11): içe aktarma yerel günü zorunlu parametre olarak alır.
const BUGUN = "2026-10-20";

const satir = (tedarikciId, tutar) => ({ tedarikciId, tutar });
const parca = (o = {}) => ({ id: 1, ad: "Ayna mahruti dişlisi", models: [], ...o });

describe("Spec 0096: tek okuma yolu (C1, C2, C9)", () => {
  it("AC-7: tek satır 4.250 → 4.250,00 ₺", () => {
    const p = parca({ hammaddeler: [satir(31, 4250)] });
    expect(parcaMaliyetKurus(p)).toBe(425000);
    expect(parcaMaliyetMetni(p)).toBe("4.250,00 ₺");
  });
  it("AC-8: üç satır 7.000 / 9.000 / 1.000 → 17.000,00 ₺", () => {
    expect(parcaMaliyetMetni(parca({ hammaddeler: [satir(31, 7000), satir(32, 9000), satir(33, 1000)] }))).toBe("17.000,00 ₺");
  });
  it("AC-9 / AC-41: kuruşlu tutarlar kuruş kaybı olmadan 17.001,00 ₺; birim kuruş tamsayısı", () => {
    const k = parcaMaliyetKurus(parca({ hammaddeler: [satir(31, 8000.55), satir(32, 9000.45)] }));
    expect(k).toBe(1700100);
    expect(Number.isInteger(k)).toBe(true);
    // 0.1 + 0.2 türü float hatası: TL toplama değil kuruş toplama
    expect(parcaMaliyetKurus(parca({ hammaddeler: [satir(1, 0.1), satir(2, 0.2)] }))).toBe(30);
  });
  it("AC-10: hiçbir satırda tutar yoksa maliyet elle girilen değerdir, satırlar yalnız işarettir", () => {
    const p = parca({ maliyet: 1250, hammaddeler: [satir(31, null), satir(32, null)] });
    expect(parcaMaliyetKurus(p)).toBe(125000);
    expect(maliyetKaynagi(p)).toEqual({ tur: "elle" });
    expect(kirilimTutarliMi(p)).toBe(false);
  });
  it("AC-11 (motor): bir satırda tutar varken maliyet tutarlı satırların toplamı; elle değer okunmaz (R5)", () => {
    const p = parca({ maliyet: 99999, hammaddeler: [satir(31, 7000), satir(32, null)] });
    expect(parcaMaliyetKurus(p)).toBe(700000);
    expect(maliyetKaynagi(p)).toEqual({ tur: "kirilim", n: 1 });
    expect(hammaddeDogrula(hammaddeFormu(p.hammaddeler)).tutarsizVar).toBe(true);
  });
  it("AC-43: tutarı sıfır satır girilmiş sayılır: maliyet 0,00 ₺ ve tutarsız uyarısı yok", () => {
    const p = parca({ hammaddeler: [satir(31, 0)] });
    expect(parcaMaliyetMetni(p)).toBe("0,00 ₺");
    expect(parcaMaliyetiVar(p)).toBe(true);
    expect(hammaddeDogrula([{ tedarikciId: "31", tutar: "0" }]).tutarsizVar).toBe(false);
  });
  it("AC-16 (motor): kırılımsız ve maliyetsiz parça girilmedi; liste metni '—'", () => {
    expect(parcaMaliyetKurus(parca())).toBeNull();
    expect(parcaMaliyetMetni(parca({ hammaddeler: [] }))).toBe("—");
    expect(maliyetGirildiMi).toBe(parcaMaliyetiVar); // 0087'nin adı ikinci fonksiyonun üstüne indi (C1)
  });
});

describe("Spec 0096: doğrulayıcı (R11, R12, R23, R17/3)", () => {
  it("AC-42: tedarikçisi ve tutarı boş satır atılır; tedarikçisi boş tutarı dolu satır 'Tedarikçi seçilmedi.'", () => {
    const r = hammaddeDogrula([{ tedarikciId: "", tutar: "" }, { tedarikciId: "", tutar: "500" }, { tedarikciId: "31", tutar: "1.000,50" }]);
    expect(r.hatalar).toEqual({ 1: TEDARIKCI_SECILMEDI });
    expect(r.gecerli).toBe(false);
    expect(r.kayit).toEqual([{ tedarikciId: 31, tutar: 1000.5 }]);
  });
  it("AC-14 (motor): negatif ve sayıya çevrilemeyen tutar satırında hata", () => {
    const r = hammaddeDogrula([{ tedarikciId: "31", tutar: "-5" }, { tedarikciId: "32", tutar: "abc" }]);
    expect(r.hatalar).toEqual({ 0: "Tutar negatif olamaz.", 1: "Tutar sayı olmalı." });
  });
  it("AC-15 (motor): aynı tedarikçi ikinci kez hata", () => {
    expect(hammaddeDogrula([{ tedarikciId: "31", tutar: "1" }, { tedarikciId: "31", tutar: "2" }]).hatalar).toEqual({ 1: "Bu tedarikçi bu parçada zaten var." });
  });
  it("R17/3 (AC-6 motor yarısı): kayıt → form → kayıt gidiş dönüşü birebir (kuruş, boş tutar, sıra)", () => {
    const kayit = [satir(31, 8000.55), satir(33, null), satir(32, 0), satir(34, 1234567.89)];
    expect(hammaddeDogrula(hammaddeFormu(kayit)).kayit).toEqual(kayit);
  });
});

describe("Spec 0096: tedarikçi adı çözücü (R14, R16, R16/2, R17/2)", () => {
  const ham = [{ id: 31, ad: "Demir Çelik", hammadde: true }, { id: 32, ad: "Eski Sac", hammadde: true, deletedAt: "2026-10-01" }, { id: 33, ad: "Yakıt A.Ş." }];
  it("AC-25: ad kimlikten çözülür (ad değişince yeni ad görünür, maliyet değişmez)", () => {
    expect(hammaddeTedarikciAdi(31, ham)).toBe("Demir Çelik");
    expect(hammaddeTedarikciAdi(31, [{ ...ham[0], ad: "Demir Çelik Sanayi" }])).toBe("Demir Çelik Sanayi");
  });
  it("AC-27 / AC-39 (motor): çöpteki tedarikçinin adı çözülür ve işaretlenir; seçilebilir değil; tutar maliyete girer", () => {
    expect(hammaddeTedarikciAdi(32, ham)).toBe(`Eski Sac (${SILINMIS_TEDARIKCI})`);
    expect(hammaddeSecilebilirMi(ham[1])).toBe(false);
    expect(parcaMaliyetKurus(parca({ hammaddeler: [satir(32, 500)] }))).toBe(50000);
  });
  it("AC-38 (motor): kaydı bulunamayan kimlik kendi metnini alır, tutar maliyete girer", () => {
    expect(hammaddeTedarikciAdi(999, ham)).toBe(BULUNAMAYAN_TEDARIKCI);
  });
  it("AC-26 (motor) / R4: işareti olmayan tedarikçi seçilemez; işareti kaldırılsa da kırılım ve maliyet aynı", () => {
    expect(hammaddeSecilebilirMi(ham[2])).toBe(false);
    expect(hammaddeSecilebilirMi(ham[0])).toBe(true);
    expect(hammaddeTedarikciAdi(33, ham)).toBe("Yakıt A.Ş.");
  });
});

describe("Spec 0096: tedarikçi kullanımı ve koruma (R13, R13/2, R13/3, R13/5)", () => {
  const parts = [parca({ id: 1, hammaddeler: [satir(31, 100)] }), parca({ id: 2, hammaddeler: [satir(31, null), satir(32, 5)] }), parca({ id: 3, deletedAt: "x", hammaddeler: [satir(31, 1)] })];
  it("AC-24 / AC-48 / AC-50 (motor): kullanım parça sayısını ve çöptekini ayrıca sayar; dördüncü parametresiz çağrı eski", () => {
    expect(tedarikciKullanim(31, [], [], parts)).toMatchObject({ kalem: 0, tanim: 0, parca: 3, parcaCop: 1 });
    expect(tedarikciKullanim(32, [], [], parts)).toMatchObject({ parca: 1, parcaCop: 0 });
    expect(tedarikciKullanim(31, [], [])).toMatchObject({ kalem: 0, cop: 0, tanim: 0, parca: 0, parcaCop: 0 });
  });
  it("R13/2: dört kapının tek yardımcısı; çöpteki parça da korur, kalacak parçalar verilince korumaz (AC-50)", () => {
    expect([...kirilimdaGecenTedarikciler(parts).keys()].sort()).toEqual(["31", "32"]);
    expect(kirilimdaGecenTedarikciler([parca({ deletedAt: "x", hammaddeler: [satir(77, 1)] })]).has("77")).toBe(true);
    expect(kirilimdaGecenTedarikciler([]).size).toBe(0);
  });
});

describe("Spec 0096: model maliyeti ve eksik ölçütü (R18, R19, C1)", () => {
  const parts = [parca({ id: 1, hammaddeler: [satir(31, 7000), satir(32, 9000), satir(33, 1000)] }), parca({ id: 2, ad: "Pul", maliyet: 2.5 }), parca({ id: 3, ad: "Maliyetsiz" })];
  const modeller = { standardModels: [{ model: "AK100", defaultParcalar: [{ partId: "1", miktar: 2 }, { partId: "2", miktar: 4 }, { partId: "3", miktar: 1 }] }], customModels: [], parts };
  it("AC-19: kırılımlı parça eksik sayılmaz; kit satırının birim maliyeti kırılımın toplamı, direkt maliyet buna göre", () => {
    const [m] = modelMaliyetleri(modeller);
    const kit = Object.fromEntries(m.kit.map(r => [r.partId, r]));
    expect(kit["1"]).toMatchObject({ eksik: false, birimK: 1700000, satirK: 3400000 });
    expect(kit["3"]).toMatchObject({ eksik: true, neden: "maliyetYok" });
    expect(m.direktK).toBe(3400000 + 1000);
    expect(m.eksikSayisi).toBe(1);
  });
  it("AC-33 / AC-18 (çapraz): 'maliyeti girilmemiş' sayısı ile motorun eksik ölçütü aynı parçaları sayar", () => {
    const [m] = modelMaliyetleri(modeller);
    const motorEksik = new Set(m.kit.filter(r => r.eksik).map(r => r.partId));
    const panelEksik = new Set(parts.filter(p => !maliyetGirildiMi(p)).map(p => String(p.id)));
    expect(panelEksik).toEqual(motorEksik);
  });
});

describe("Spec 0096: aktarma (R24, C9)", () => {
  it("AC-30 / AC-30/2: sütun sayısı aynı; kırılımlı parçada hücre kırılımın toplamı (ham iki haneli sayı)", () => {
    const s = parcaDisaAktarmaSatiri(parca({ maliyet: 5, hammaddeler: [satir(31, 8000.55), satir(32, 9000.45)] }));
    expect(s).toHaveLength(PARCA_AKTARMA_BASLIKLARI.length);
    expect(s[9]).toBe(17001);
    expect(parcaDisaAktarmaSatiri(parca({ hammaddeler: [satir(31, 0.1), satir(32, 0.2)] }))[9]).toBe(0.3);
  });
  it("AC-40: kırılımı tutarlı parçaya Excel'den maliyet yazılmaz; neden satır numarasıyla bildirilir", () => {
    const mevcut = [parca({ id: 5, ad: "Ayna", hammaddeler: [satir(31, 100)] }), parca({ id: 6, ad: "Pul" }), parca({ id: 7, ad: "İşaretli", hammaddeler: [satir(31, null)] })];
    const rows = [PARCA_AKTARMA_BASLIKLARI, ["Ayna", "", "", "", "", "", "", "", "", "250"], ["Pul", "", "", "", "", "", "", "", "", "7,5"], ["İşaretli", "", "", "", "", "", "", "", "", "9"]];
    const r = parcaSatirlariniCoz(rows, mevcut, 100, BUGUN);
    expect("maliyet" in r.parts.find(p => p.ad === "Ayna")).toBe(false);
    expect(r.parts.find(p => p.ad === "Pul").maliyet).toBe(7.5);
    expect(r.parts.find(p => p.ad === "İşaretli").maliyet).toBe(9); // tutarsız kırılım: maliyet bugünkü gibi elle (R6)
    expect(r.errors).toEqual([`Satır 2: ${HAMMADDE_EXCEL_HATASI}`]);
  });
});

describe("Spec 0096 triyaj", () => {
  it("bulgu 1: dışa aktarılan dosya aynen geri yüklenince kırılımlı parça bildirim üretmez; farklı rakamda üretir; ikisinde de maliyet alınmaz", () => {
    const mevcut = [parca({ id: 5, ad: "Ayna", hammaddeler: [satir(31, 8000.55), satir(32, 9000.45)] })];
    const ayni = parcaSatirlariniCoz([PARCA_AKTARMA_BASLIKLARI, parcaDisaAktarmaSatiri(mevcut[0])], mevcut, 100, BUGUN);
    expect(ayni.errors).toEqual([]);
    expect("maliyet" in ayni.parts[0]).toBe(false);
    const metin = parcaSatirlariniCoz([PARCA_AKTARMA_BASLIKLARI, ["Ayna", "", "", "", "", "", "", "", "", "17.001,00"]], mevcut, 100, BUGUN);
    expect(metin.errors).toEqual([]); // Türkçe biçimli aynı toplam da aynı sayılır
    const farkli = parcaSatirlariniCoz([PARCA_AKTARMA_BASLIKLARI, ["Ayna", "", "", "", "", "", "", "", "", "17000"]], mevcut, 100, BUGUN);
    expect(farkli.errors).toEqual([`Satır 2: ${HAMMADDE_EXCEL_HATASI}`]);
    expect("maliyet" in farkli.parts[0]).toBe(false);
  });
  it("bulgu 1: parça içe aktarma özeti bildirimleri 'uyarı' diye sayar, 'satır atlandı' demez", () => {
    const k = kod("src/components/settings/SettingsImport.jsx");
    expect(k).toMatch(/\{partsImportPreview\.errors\.length\} uyarı\./);
    expect(k).not.toMatch(/partsImportPreview\.errors\.length\} satır atlandı/);
  });
  it("bulgu 3: hazır haritayla kullanım sayımı aynı sonucu verir; liste haritayı bir kez kurar ve iki çağrıya geçirir", () => {
    const parts = [parca({ id: 1, hammaddeler: [satir(31, 1)] }), parca({ id: 2, deletedAt: "x", hammaddeler: [satir(31, null)] })];
    const harita = kirilimdaGecenTedarikciler(parts);
    expect(tedarikciKullanim(31, [], [], [], harita)).toEqual(tedarikciKullanim(31, [], [], parts));
    const t = kod("src/components/gider/Tedarikciler.jsx");
    expect(t.match(/kirilimdaGecenTedarikciler\(/g)).toHaveLength(1);
    expect(t).toMatch(/useMemo\(\(\) => kirilimdaGecenTedarikciler\(parts\), \[parts\]\)/);
    expect(t.match(/tedarikciKullanim\(t\.id, giderler, giderTanimlari, parts, kirilimHaritasi\)/g)).toHaveLength(2);
  });
});

describe("Spec 0096: birleştirme (R26, plan P2)", () => {
  it("AC-49: yeniden kimlik alan tedarikçiye bakan yeni parçanın kırılım satırı yeni kimliği taşır", () => {
    // Yerelde bu oturumda doğan (uid) tedarikçi ve onu kullanan yeni parça; sunucuda aynı kimlik BAŞKA bir tedarikçiye ait.
    const tedId = uid(), parcaId = uid();
    const yerel = { tedarikciler: [{ id: tedId, ad: "Yerel Sac" }], parts: [parca({ id: parcaId, ad: "Yeni parça", hammaddeler: [satir(tedId, 120), satir(31, 5)] })] };
    const sunucu = { tedarikciler: [{ id: tedId, ad: "Başka firma" }, { id: 31, ad: "Demir" }], parts: [] };
    const plan = buildMergePlan(yerel, sunucu);
    const yeniTed = plan.adds.tedarikciler.find(t => t.ad === "Yerel Sac");
    expect(yeniTed.id).not.toBe(tedId);
    const yeniParca = plan.adds.parts.find(p => p.ad === "Yeni parça");
    expect(yeniParca.hammaddeler).toEqual([satir(yeniTed.id, 120), satir(31, 5)]);
  });
});

// ── Kaynak taramaları ────────────────────────────────────────────────────────────────────────────────────────────────
const kod = (f) => readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").split("\n").map(l => l.replace(/(^|[^:"'`])\/\/.*$/, "$1")).join("\n");
const tara = (d) => readdirSync(d).flatMap(e => { const p = `${d}/${e}`; return statSync(p).isDirectory() ? (p === "src/lib/map" ? [] : tara(p)) : /\.(jsx?|cjs|mjs)$/.test(e) ? [p] : []; });
const say = (desen, kokler = ["src"]) => Object.fromEntries(kokler.flatMap(tara).map(f => [f, kod(f).split("\n").filter(l => desen.test(l)).length]).filter(([, n]) => n > 0));

describe("Spec 0096: kaynak taramaları", () => {
  it("AC-32: parçanın maliyet alanını doğrudan okuyan yer yalnız tek okuma yolu; motorun satır içi ölçütü kalktı (istisnalar tam yollu, sayılı)", () => {
    expect(say(/\.maliyet\b/)).toEqual({
      "src/lib/urunAgaci.js": 2, // tek okuma yolu (parcaMaliyetKurus) ve elle maliyetin form metni (elleMaliyetMetni)
      "src/components/PartManager.jsx": 4, // FORM durumunun okunması (f.maliyet, form.maliyet, editForm.maliyet), kayıt değil
      "src/lib/makinaMaliyeti.js": 2, // stok partisi toplayıcısının yerel alanı (x.maliyet), parça kaydı değil
    });
    expect(kod("src/lib/makinaStandartMaliyet.js")).not.toMatch(/p\.maliyet|maliyet == null/);
    // Spec 0097 ile (C1/2, AC-56): tarihli okuma aynı fonksiyonun ikinci parametresidir; desen yeni imzayı arar (gevşetilmedi).
    expect(kod("src/lib/makinaStandartMaliyet.js")).toMatch(/parcaMaliyetKurus\(p, tarih\)/);
  });
  it("AC-41: satır tutarlarını TL olarak toplayan ikinci yer yok (kırılım toplamı yalnız urunAgaci'nde, kuruşla)", () => {
    // Kapsam: parça kırılımını (`hammaddeler`) okuyan dosyalar; gider tarafının kendi `.tutar` toplamları bu kavramdan değil.
    // gider.js kırılımı yalnız tedarikçi kimliği için sayar (kirilimdaGecenTedarikciler); oradaki tutar toplamları gider kalemlerinindir.
    const okuyanlar = Object.keys(say(/hammaddeler/)).filter(f => f !== "src/lib/gider.js");
    expect(kod("src/lib/gider.js").match(/hammaddeler/g)).toHaveLength(1);
    const toplayan = okuyanlar.filter(f => /reduce\([^\n]*tutar/.test(kod(f)));
    expect(toplayan).toEqual(["src/lib/urunAgaci.js"]);
    expect(kod("src/lib/urunAgaci.js")).toMatch(/reduce\(\(a, h\) => a \+ kurus\(h\.tutar\), 0\)/);
  });
  it("AC-31: yeni eylem izni, veri bölümü ve kilit alanı yok; birleştirme anahtarları aynı", () => {
    const simdi = JSON.parse(JSON.stringify({ BLOB_SECTIONS, MERGE_KEYS, EYLEM_IDLERI, AYAR_ALAN_SEKMELERI }));
    expect(simdi).toEqual(JSON.parse(readFileSync("tests/fixtures/0093-tarama-once.json", "utf8")));
    expect(Object.keys(KILIT_ALANLARI)).not.toContain("hammadde");
    expect(kod("electron/serverAuth.cjs")).not.toMatch(/hammadde/);
  });
  it("AC-44 (kaynak): parça paneli süzgeci Select; yerel pil ya da segment çubuğu yok; sözlükte adıyla istisna", () => {
    const pm = kod("src/components/PartManager.jsx");
    expect(pm).toMatch(/<Select aria-label="Hammadde tedarikçisi süzgeci"/);
    expect(pm).not.toMatch(/<Segment/);
    expect(readFileSync("docs/tasarim-sozlugu.md", "utf8")).toMatch(/İstisna \(spec 0096 C14\):\*\* Ayarlar › Katalog › Parça\/Yedek Parça'nın \*\*hammadde tedarikçisi süzgeci\*\* `Select`/);
  });
  it("AC-22 (kaynak): useFilteredList imzası değişmedi; sayfa sıfırlaması süzgeci yazan fonksiyonda", () => {
    // Spec 0100 ile (plan P2): kanca isteğe bağlı `ikinciFiltre` aldı (parametresiz çağrı birebir eski); 0096'nın iddiası olan "parça
    // listesi kancayı değiştirmeden sıfırlar" korunur: PartManager ikinci süzgeci kullanmaz.
    expect(kod("src/hooks/useFilteredList.js")).toMatch(/export const useFilteredList = \(data, \{ searchFields, searchFn, filterFn, ikinciFiltre, sortFn, perPage = 10 \} = \{\}\) =>/);
    expect(kod("src/components/PartManager.jsx")).not.toMatch(/ikinciFiltre/);
    expect(kod("src/components/PartManager.jsx")).toMatch(/const setSuzgec = \(v\) => \{ setSuzgecRaw\(v\); setPage\(1\); \};/);
  });
  it("C11 (plan P1): tedarikçi listesi parça paneline kapılı, App'ten Ayarlar'a ve yedeğe ham gider", () => {
    expect(kod("src/components/Settings.jsx")).toMatch(/tedarikciler=\{giderYetki \? tedarikciler : \[\]\} giderYetki=\{giderYetki\}/);
    expect(kod("src/App.jsx")).not.toMatch(/<Settings[^\n]*tedarikciler=\{giderYetki/);
  });
  it("C7: parça paneli tedarikçi kaydına yazmaz", () => {
    expect(kod("src/components/PartManager.jsx")).not.toMatch(/setTedarikciler/);
  });
});
