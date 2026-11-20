// Spec 0151: bakiye düzeltme hareketi. Saf motor (plan, bakiye, yön, fark, doğrulama), gider tarafının görmezliği (çapraz),
// hesap taşıma ve kullanım, hesapsız liste, çöp etiketi, yedek koruması, rapor ve kaynak taramaları. Veri `0059-veri.js`.
process.env.TZ = "Europe/Istanbul";
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import * as K from "../src/lib/kasa";
import { hareketCopEtiketi, HAREKET_COP_TUR } from "../src/lib/copKutusu";
import { kasaHareketiMi, kasaKayitlariniKoru } from "../src/lib/yedekKasa";
import { giderKasaRaporu, buildGiderKasaRaporuHtml, DUZELTME_TABLO_BASLIGI, KAYIT_YOK } from "../src/lib/giderRaporu";
import { odemeleriUygula, borcOzeti } from "../src/lib/gider";
import { acikKalemler } from "../src/lib/acikKalemler";
import { fmtCur, fmtTR } from "../src/lib/utils";
import { girdi, H, HESAPLAR, PAYMENTS, SERVICES, PART_SALES, CEKLER, GIDERLER, turler, turMap, tedarikciler } from "./fixtures/0059-veri";

const BUGUN = "2026-11-20";
const KART = { id: 57, ad: "Kart", tur: "kart", paraBirimi: "TRY", acilisBakiyesi: -5000, acilisTarihi: "2026-01-01", kapali: false };
const HESAPLAR2 = [...HESAPLAR, KART];
const veri = { payments: PAYMENTS, services: SERVICES, partSales: PART_SALES, yedekParcaSatislar: [], customers: [{ id: 1, name: "Kutu Gıda" }], dealers: [],
  factory: { name: "Altuntaş Makina" }, cekler: CEKLER, bugun: BUGUN };
const hesap = (id) => HESAPLAR2.find(h => h.id === id);
const bakiyeK = (id, hareketler = H, v = veri) => K.hesapBakiyeleri(HESAPLAR2, hareketler, v).get(String(id)).bakiyeK;
const plan = (id, hedef, o = {}, hareketler = H, v = veri) => K.duzeltmePlani(hesap(id), hareketler, v, { hedef, tarih: "2026-11-10", bugun: BUGUN, ...o });
const uygula = (p, hareketler = H, id = 900) => [...hareketler, { ...p.hareket, id }];
const yorumsuz = (f) => fs.readFileSync(f, "utf8").split("\n").filter(l => !/^\s*(\/\/|\*|\/\*|\{\/\*)/.test(l)).map(l => l.replace(/\s\/\/.*$/, "")).join("\n");
const dosyalar = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => (e.isDirectory() ? dosyalar(path.join(d, e.name)) : /\.(jsx?|cjs|mjs)$/.test(e.name) ? [path.join(d, e.name)] : []));

describe("Spec 0151: plan, yön ve fark", () => {
  it("AC-1 / AC-3 / AC-23: hedef büyükse giren, küçükse çıkan tek kayıt; tutar pozitif; uygulanınca bakiye hedefe eşit", () => {
    const once = bakiyeK(51);
    const yuksek = plan(51, String((once + 1234567) / 100).replace(".", ","));
    expect(yuksek.ok).toBe(true);
    expect(yuksek.hareket).toEqual({ tur: "duzeltme", tarih: "2026-11-10", tutar: 12345.67, yon: "giren", hesapId: 51 });
    expect(bakiyeK(51, uygula(yuksek))).toBe(once + 1234567);
    const dusuk = plan(51, "1000");
    expect(dusuk.hareket.yon).toBe("cikan"); expect(dusuk.hareket.tutar).toBeGreaterThan(0);
    expect(bakiyeK(51, uygula(dusuk))).toBe(100000);
  });
  it("AC-4 / AC-28: kuruşta eşit hedef kayıt yazmaz; kuruşun altındaki fark eşit sayılır; nedeni hedef alanında", () => {
    const once = bakiyeK(51);
    const esit = plan(51, String(once / 100).replace(".", ","));
    expect(esit.ok).toBe(false); expect(esit.hatalar.hedef).toBe(K.DUZELTME_ESIT_NEDENI); expect(esit.hareket).toBeNull();
    expect(plan(51, (once / 100 + 0.004).toFixed(3).replace(".", ",")).hatalar.hedef).toBe(K.DUZELTME_ESIT_NEDENI);
  });
  it("AC-5 / AC-7: çöpe atılan düzeltme bakiyeden çıkar, geri alınınca döner (motor canlı hareketle çalışır)", () => {
    const once = bakiyeK(51);
    const l = uygula(plan(51, "5000"));
    const cop = l.map(m => (m.id === 900 ? { ...m, deletedAt: "2026-11-20T10:00:00Z" } : m));
    expect(bakiyeK(51, cop.filter(m => !m.deletedAt))).toBe(once);
    expect(bakiyeK(51, cop.map(m => { const { deletedAt: _d, ...r } = m; return r; }))).toBe(500000);
  });
  it("AC-11 / R5: döviz hesabın düzeltmesi kendi para biriminde; TL hesapların bakiyesi değişmez; çöp etiketi dövizle", () => {
    const tlOnce = [51, 52, 54, 55].map(id => bakiyeK(id));
    const p = plan(53, "2500");
    const l = uygula(p);
    expect(bakiyeK(53, l)).toBe(250000);
    expect([51, 52, 54, 55].map(id => bakiyeK(id, l))).toEqual(tlOnce);
    expect(hareketCopEtiketi(p.hareket, "USD")).toBe(`${fmtTR("2026-11-10")} · ${fmtCur(p.hareket.tutar, "USD")}`);
  });
  it("AC-12: geçmiş tarihli düzeltme o tarihli satır olur ve rapor o ayda sayar", () => {
    const l = uygula(plan(51, "5000", { tarih: "2026-09-15" }));
    const b = K.hesapBakiyeleri(HESAPLAR2, l, veri).get("51");
    expect(b.satirlar.find(s => s.tur === "duzeltme").tarih).toBe("2026-09-15");
    const oz = K.hareketOzeti(l, { baslangic: "2026-09-01", bitis: "2026-09-30" }, null);
    expect(oz.duzeltme.adet).toBe(1);
    expect(K.hareketOzeti(l, { baslangic: "2026-10-01", bitis: "2026-10-31" }, null).duzeltme).toBeUndefined();
  });
  it("AC-13 / AC-35: boş, takvimde olmayan ve gelecek tarih reddedilir; nedenler tarih alanında", () => {
    expect(plan(51, "10", { tarih: "" }).hatalar.tarih).toBe(K.DUZELTME_TARIH_NEDENI);
    expect(plan(51, "10", { tarih: "2026-02-30" }).hatalar.tarih).toBe(K.DUZELTME_TARIH_NEDENI);
    expect(plan(51, "10", { tarih: "2026-11-21" }).hatalar.tarih).toBe(K.DUZELTME_GELECEK_NEDENI);
    expect(plan(51, "10", { tarih: BUGUN }).ok).toBe(true);
  });
  it("AC-14: hedef boş ya da sayıya çevrilemez metinse kayıt yok", () => {
    expect(plan(51, "").hatalar.hedef).toBe(K.DUZELTME_HEDEF_BOS); // triyaj (bulgu 2): boş hedefin kendi nedeni
    expect(plan(51, "abc").hatalar.hedef).toBe(K.DUZELTME_HEDEF_NEDENI);
  });
  it("AC-15: kapalı hesapta düzeltme yapılamaz", () => {
    const p = plan(54, "10");
    expect(p.ok).toBe(false); expect(p.hatalar.hesap).toBe(K.DUZELTME_KAPALI_NEDENI);
  });
  it("AC-25 / R1/3: kartta hedef borçtur; 12.500 girilince bakiye −12.500, borç 12.500 (eksi yazılsa da aynı)", () => {
    const p = plan(57, "12.500");
    const b = K.hesapBakiyeleri(HESAPLAR2, uygula(p), veri).get("57");
    expect(b.bakiyeK).toBe(-1250000); expect(b.borc).toBe(12500);
    expect(p.hareket.yon).toBe("cikan"); // borç arttı
    expect(plan(57, "-12.500").hedefK).toBe(-1250000);
    expect(K.duzeltmeYonAdi("cikan", true)).toBe("borç artar");
  });
  it("AC-26 / R1/4: fark toplam bakiyeden; gelecek tarihli tahsilatlı hesapta da sonuç hedefe eşit", () => {
    const v = { ...veri, payments: [...PAYMENTS, { id: 399, customerId: 1, tarih: "2026-12-20", tutar: 9000, currency: "TRY", yontem: "Havale", hesapId: 51 }] };
    const p = plan(51, "1000", {}, H, v);
    expect(bakiyeK(51, uygula(p), v)).toBe(100000);
  });
  it("AC-27 / R1/5: plan açıldıktan sonra giren hareket kayıt anındaki yeniden hesapla karşılanır", () => {
    const onizleme = plan(51, "1000");
    const sonra = [...H, { id: 950, tur: "odeme", tarih: "2026-11-11", tutar: 777, yontem: "Havale", hesapId: 51, giderId: 1 }];
    const kayitAni = plan(51, "1000", {}, sonra);
    expect(kayitAni.farkK).not.toBe(onizleme.farkK);
    expect(bakiyeK(51, uygula(kayitAni, sonra))).toBe(100000);
  });
  it("AC-29 / R2/2: negatif hedef kabul edilir; kasa türünde uyarı yazar, bankada yazmaz", () => {
    const k = plan(52, "-500");
    expect(k.ok).toBe(true); expect(k.uyari).toBe(K.DUZELTME_NEGATIF_UYARISI);
    expect(bakiyeK(52, uygula(k))).toBe(-50000);
    expect(plan(51, "-500").uyari).toBeNull();
  });
  it("AC-30 / R2/3: aynı gün ikinci düzeltme birincisini içeren bakiyeden", () => {
    const l1 = uygula(plan(51, "5000"));
    const p2 = plan(51, "4000", {}, l1);
    expect(p2.farkK).toBe(-100000);
    expect(bakiyeK(51, uygula(p2, l1, 901))).toBe(400000);
  });
  it("AC-36 / R9/3: açıklama kırpılır, boşsa yazılmaz; yöntem alanı yok", () => {
    expect(plan(51, "5000", { aciklama: "   " }).hareket).not.toHaveProperty("aciklama");
    expect(plan(51, "5000", { aciklama: "  Ekstre mutabakatı " }).hareket.aciklama).toBe("Ekstre mutabakatı");
    expect(plan(51, "5000").hareket).not.toHaveProperty("yontem");
  });
  it("AC-37 (motor) / R7/2: düzeltme düzenlenmez, silinir", () => {
    expect(K.hareketDuzenlemeDurumu({ tur: "duzeltme" })).toEqual({ duzenlenebilir: false, silinebilir: true, neden: K.DUZELTME_DUZENLENMEZ_NEDENI });
  });
});

describe("Spec 0151: gider tarafı düzeltmeyi görmez (R6, C3)", () => {
  const ile = uygula(plan(51, "5000", { tarih: "2026-09-15" }));
  it("AC-8: ödeme durumu, borç özeti ve açık kalemler aynı", () => {
    expect(odemeleriUygula(GIDERLER, ile, turMap)).toEqual(odemeleriUygula(GIDERLER, H, turMap));
    const ozet = (l) => borcOzeti(odemeleriUygula(GIDERLER, l, turMap), { turler, tedarikciler, yururlukAy: "2026-01" }, "2026-09-30");
    expect(ozet(ile)).toEqual(ozet(H));
    const ak = (l) => acikKalemler(odemeleriUygula(GIDERLER, l, turMap), { turler, tedarikciler, yururlukAy: "2026-01" }, "2026-09-30");
    expect(ak(ile)).toEqual(ak(H));
  });
  it("AC-9: aylık raporun gider bölümü (toplam, KDV, tedarikçi borcu) aynı", () => {
    expect(giderKasaRaporu(girdi({ hareketler: ile }), "2026-09").gider).toEqual(giderKasaRaporu(girdi(), "2026-09").gider);
  });
  it("AC-10: tedarikçi ve çalışan ekstresi satır açmaz", () => {
    const o = (l) => ({ giderler: GIDERLER, hareketler: l, turler, yururlukAy: "2026-01", bugun: "2026-09-30" });
    expect(K.tedarikciEkstresi(11, o(ile))).toEqual(K.tedarikciEkstresi(11, o(H)));
    expect(K.calisanEkstresi(21, o(ile))).toEqual(K.calisanEkstresi(21, o(H)));
  });
});

describe("Spec 0151: hesap kullanımı, taşıma ve hesapsız liste", () => {
  const dz55 = { id: 960, tur: "duzeltme", tarih: "2026-11-05", tutar: 300, yon: "giren", hesapId: 55 };
  it("AC-47 / R12/2: yalnız düzeltmesi olan hesap kullanımdadır; kırılımda kendi kovası", () => {
    expect(K.hesapKullanimi(55, H, veri)).toBe(0);
    expect(K.hesapKullanimi(55, [...H, dz55], veri)).toBe(1);
    expect(K.hesapKullanimDetayi(55, [...H, dz55], veri)).toMatchObject({ duzeltme: 1, diger: 0, toplam: 1 });
  });
  it("AC-45 / R4/2: taşıma düzeltmeyi hedefe taşır; hesapsız bırakma tarih ve tutarla nedenlenir", () => {
    const p = K.hesapTasimaPlani(hesap(55), [...H, dz55], veri, HESAPLAR2, { tarihYaz: fmtTR });
    expect(p.detay.duzeltme).toBe(1);
    expect(p.nedenler.hesapsiz).toEqual([`${fmtTR("2026-11-05")} bakiye düzeltmesi (${fmtCur(300, "TRY")}): hesapsız bırakılamaz; başka hesaba taşıyın ya da silin.`]);
    const yeni = p.guncelle(52).hesapHareketleri([...H, dz55]).find(m => m.id === 960);
    expect(yeni.hesapId).toBe(52);
  });
  it("AC-46 / R4/3: hesabı çöpe atılmış düzeltme hesapsız listede ve ayrı sayılır; düzeltmesiz çıktı birebir eski (kıyas)", () => {
    const canli = HESAPLAR2.filter(h => h.id !== 55);
    const r = K.hesapsizOdemeler([...H, dz55], { baslangic: "", tarihsizDahil: true }, null, canli);
    expect(r.duzeltmeAdet).toBe(1);
    expect(r.liste.some(m => m.id === 960)).toBe(true);
    expect(K.hesapsizOdemeler(H, { baslangic: "", tarihsizDahil: true }, null, canli)).not.toHaveProperty("duzeltmeAdet");
    const oz = K.hesapsizOzeti([...H, dz55], veri, canli, null, []);
    expect(oz.odeme.duzeltmeAdet).toBe(1);
    // Triyaj (bulgu 1): başlangıç tarihinden önceki düzeltme gizli sayıya kendi anahtarıyla girer.
    expect(K.hesapsizOzeti([...H, dz55], veri, canli, "2026-12-01", []).gizli.duzeltme).toBe(1);
  });
});

describe("Spec 0151: çöp, yedek ve rapor", () => {
  it("AC-49 / R8/2: çöp satırının türü 'Bakiye düzeltmesi'; parametresiz etiket bugünkü gibi TL", () => {
    expect(HAREKET_COP_TUR.duzeltme).toBe(K.DUZELTME_TUR_ADI);
    expect(hareketCopEtiketi({ tarih: "2026-11-10", tutar: 10 })).toBe(`${fmtTR("2026-11-10")} · ${fmtCur(10, "TRY")}`);
  });
  it("AC-44 / C5/2 (yardımcı): Kasa'sız geri yükleme düzeltmeyi bugünkü hâliyle korur", () => {
    const dz = { id: 970, tur: "duzeltme", tutar: 5, yon: "giren", hesapId: 51 };
    expect(kasaHareketiMi(dz)).toBe(true);
    expect(kasaKayitlariniKoru([dz], [{ id: 1, tur: "odeme" }], kasaHareketiMi)).toEqual([dz, { id: 1, tur: "odeme" }]);
  });
  it("AC-20 / AC-50 / AC-51: HAREKETLER satırı ve BAKİYE DÜZELTMELERİ tablosu (tarih, hesap, yön, para birimli tutar; açıklama yok)", () => {
    const dzTl = { id: 980, tur: "duzeltme", tarih: "2026-09-15", tutar: 1500, yon: "cikan", hesapId: 51, aciklama: "GİZLİ NOT" };
    const dzUsd = { id: 981, tur: "duzeltme", tarih: "2026-09-16", tutar: 40, yon: "giren", hesapId: 53 };
    const r = giderKasaRaporu(girdi({ hareketler: [...H, dzTl, dzUsd] }), "2026-09");
    expect(r.kasa.duzeltmeler).toEqual([
      { tarih: "2026-09-15", hesap: "Ziraat", yon: "hesaptan çıkan", tutarK: 150000, paraBirimi: "TRY" },
      { tarih: "2026-09-16", hesap: "Döviz", yon: "hesaba giren", tutarK: 4000, paraBirimi: "USD" }]);
    const html = buildGiderKasaRaporuHtml(r);
    const doc = new (require("jsdom").JSDOM)(html).window.document;
    const hareketler = [...doc.querySelectorAll("table")].find(t => t.textContent.includes("Mahsup"));
    expect(hareketler.textContent).toContain(K.DUZELTME_TUR_ADI);
    const tablo = [...doc.querySelectorAll("table")].find(t => t.textContent.includes(DUZELTME_TABLO_BASLIGI) || t.previousElementSibling?.textContent?.includes(DUZELTME_TABLO_BASLIGI));
    expect(html).toContain(DUZELTME_TABLO_BASLIGI);
    expect(html).not.toContain("GİZLİ NOT");
    expect(html).toContain("$");
    expect(tablo || html).toBeTruthy();
    expect(buildGiderKasaRaporuHtml(giderKasaRaporu(girdi(), "2026-09"))).not.toContain(DUZELTME_TABLO_BASLIGI);
  });
  it("AC-50: ayın tek hareketi düzeltmeyse HAREKETLER 'hareket yok' demez", () => {
    const yalniz = girdi({ hareketler: [{ id: 990, tur: "duzeltme", tarih: "2026-07-10", tutar: 50, yon: "giren", hesapId: 51 }] });
    const html = buildGiderKasaRaporuHtml(giderKasaRaporu(yalniz, "2026-07"));
    const i = html.indexOf("KASA · HAREKET ÖZETİ"); const j = html.indexOf("KASA · ", i + 5);
    const kutu = html.slice(i, j);
    expect(kutu).toContain(K.DUZELTME_TUR_ADI);
    expect(kutu).not.toContain(KAYIT_YOK);
    // Aynı ayın düzeltmesiz hâlinde kutu boş satır yazar (karşılaştırma ölçüsü).
    const bos = buildGiderKasaRaporuHtml(giderKasaRaporu(girdi({ hareketler: [] }), "2026-07"));
    expect(bos.slice(bos.indexOf("KASA · HAREKET ÖZETİ"), bos.indexOf("KASA · ", bos.indexOf("KASA · HAREKET ÖZETİ") + 5))).toContain(KAYIT_YOK);
  });
});

describe("Spec 0151: kaynak taramaları", () => {
  it("AC-52 / C2/2: 'Bakiye düzeltmesi' metni src altında yalnız kasa.js'te", () => {
    const yerler = dosyalar("src").filter(f => yorumsuz(f).includes("Bakiye düzeltmesi"));
    expect(yerler).toEqual([path.join("src", "lib", "kasa.js")]);
  });
  it("AC-23: kaynakta eksi tutarlı kasa hareketi yazılmaz; düzeltmenin tutarı mutlak değer", () => {
    for (const f of dosyalar("src")) expect(yorumsuz(f), f).not.toMatch(/tutar:\s*-\s*[\w(]/);
    expect(yorumsuz("src/lib/kasa.js")).toMatch(/tutar: tl\(Math\.abs\(farkK\)\)/);
  });
  it("R10/2: izin beş yerde birlikte (sunucu eşlemesi + Kasa sekmesi, ekran satırı, çöp kutusu)", () => {
    const s = fs.readFileSync("electron/serverAuth.cjs", "utf8");
    expect(s).toMatch(/r\?\.tur === "duzeltme" \? "kasa_hesap"/);
    expect(s).toMatch(/KASA_SEKMELI_HAREKETLER = new Set\(\["virman", "avans", "duzeltme"\]\)/);
    expect(yorumsuz("src/components/Kasa.jsx")).toMatch(/m\.tur === DUZELTME_TUR \? canDo\("kasa_hesap"\)/);
    expect(yorumsuz("src/components/settings/SettingsTrash.jsx")).toMatch(/h\.tur === "duzeltme" \? giderCanDo\("kasa_hesap"\) && kasaVeriYetki/);
  });
  it("Triyaj (bulgu 3): App Kasa'ya ham hesap listesini verir (çöpteki hesabın para birimi)", () => {
    expect(fs.readFileSync("src/App.jsx", "utf8")).toMatch(/<Kasa [^>]*hamKasaHesaplari=\{kasaHesaplari\}/);
  });
});
