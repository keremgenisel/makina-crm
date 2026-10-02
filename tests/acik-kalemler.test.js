// Spec 0061: açık kalemler motoru ve yaşlandırma (saf). R25: saat dilimi sabit (CI UTC'de koşar).
process.env.TZ = "Europe/Istanbul";
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { acikKalemler, acikOzet } from "../src/lib/acikKalemler";
import { borcOzeti, giderKalemDogrula, turHaritasi, odemeleriUygula, kurus, HEDEF } from "../src/lib/gider";
import { odemeHatirlatmalari } from "../src/lib/odemeHatirlatma";
import { yasKovaAdi, YAS_SIRA } from "../src/lib/yaslandirma";

const kok = path.join(__dirname, "..");
const kod = (f) => readFileSync(path.join(kok, f), "utf-8").split("\n").filter(l => !l.trim().startsWith("//") && !l.trim().startsWith("*")).join("\n");
const dosyalar = (d) => readdirSync(path.join(kok, d)).flatMap(f => {
  const y = path.join(d, f);
  return statSync(path.join(kok, y)).isDirectory() ? dosyalar(y) : /\.(js|jsx)$/.test(f) ? [y.split(path.sep).join("/")] : [];
});

const TURLER = [{ id: 1, ad: "Kira", davranis: "kira" }, { id: 3, ad: "Personel", davranis: "personel" }, { id: 4, ad: "Hammadde", davranis: "normal" }];
const turMap = turHaritasi(TURLER);
const TED = [{ id: 11, ad: "Yıldız Gayrimenkul" }, { id: 12, ad: "Demir Bant" }];
let n = 100;
const k = (f) => { const r = giderKalemDogrula(f, { turMap, tedarikciler: TED, uid: () => ++n }); if (r.hatalar.length) throw new Error(JSON.stringify(r.hatalar)); return r.kayit; };
const AYAR = { turler: TURLER, tedarikciler: TED, yururlukAy: "2026-01" };
const BUGUN = "2026-10-02";
// Geçmiş aya ait vadesiz hammadde; vadeli (geçmiş) hammadde; stopajlı kira; personel; tedarikçisiz; kapsam dışılar.
const VADESIZ = k({ id: 1, tarih: "2026-06-15", turId: 4, tutar: 4000, kdvOrani: 0, tedarikciId: 12, aciklama: "Eski sac" });
const VADELI = k({ id: 2, tarih: "2026-09-20", turId: 4, tutar: 1000, kdvOrani: 0, tedarikciId: 12, aciklama: "Bant", sonOdemeTarihi: "2026-09-30" });
const KIRA = k({ id: 3, tarih: "2026-08-01", turId: 1, girisYonu: "brut", tutar: 20000, stopajOrani: 20, kdvOrani: 0, tedarikciId: 11, aciklama: "Ağustos kirası", sonOdemeTarihi: "2026-08-10" });
const PERS = k({ id: 4, tarih: "2026-09-30", turId: 3, calisanId: 21, calisanAd: "Hasan Çelik", resmiTutar: 30000, eldenTutar: 10000, sonOdemeTarihi: "2026-10-05" });
const SECILMEMIS = k({ id: 5, tarih: "2026-09-25", turId: 4, tutar: 500, kdvOrani: 0, aciklama: "Temizlik", sonOdemeTarihi: "2026-10-20" });
const COP = { ...k({ id: 6, tarih: "2026-07-01", turId: 4, tutar: 900, kdvOrani: 0, aciklama: "Çöpte" }), deletedAt: "2026-07-02" };
const ODENDI = k({ id: 7, tarih: "2026-07-01", turId: 4, tutar: 800, kdvOrani: 0, aciklama: "Ödendi" });
const ONCESI = k({ id: 8, tarih: "2025-12-15", turId: 4, tutar: 700, kdvOrani: 0, aciklama: "Yürürlük öncesi" });
const GELECEK = k({ id: 9, tarih: "2026-10-15", turId: 4, tutar: 600, kdvOrani: 0, aciklama: "Gelecek" });
const TARIHSIZ = { ...k({ id: 10, tarih: "2026-09-01", turId: 4, tutar: 300, kdvOrani: 0, aciklama: "Tarihsiz" }), tarih: "" };
const GIDERLER = [VADESIZ, VADELI, KIRA, PERS, SECILMEMIS, COP, ODENDI, ONCESI, GELECEK, TARIHSIZ];
const H = [{ id: 1, tur: "odeme", tarih: "2026-07-02", tutar: 800, giderId: 7, taksitId: null, hesapId: null, yontem: "Nakit" }];
const G = () => odemeleriUygula(GIDERLER, H, turMap);
const R = (bugun = BUGUN) => acikKalemler(G(), AYAR, bugun);

describe("Spec 0061 A: liste", () => {
  it("AC-3 / AC-4: geçmiş aya ait, vadesi girilmemiş ödenmemiş kalem listede; hatırlatıcıda yok", () => {
    const r = R();
    expect(r.satirlar.some(s => s.kalemId === 1)).toBe(true);
    const h = odemeHatirlatmalari(G(), { ...AYAR, esikGun: 7 }, BUGUN);
    const hIds = new Set([...h.gecmis, ...h.yaklasan].map(o => String(o.kalem?.id ?? o.id)));
    expect(hIds.has("1")).toBe(false);
  });
  it("AC-5 / AC-36: çöpteki, ödenmiş, yürürlük öncesi, gider tarihi gelecekte ve tarihsiz kalem yok", () => {
    const ids = new Set(R().satirlar.map(s => s.kalemId));
    for (const id of [6, 7, 8, 9, 10]) expect(ids.has(id), String(id)).toBe(false);
  });
  it("AC-6 / AC-8: kiranın kiraya veren ve vergi dairesi tarafı ayrı satır; satırda gider tarihi, vade, yaş ve kalan", () => {
    const kira = R().satirlar.filter(s => s.kalemId === 3);
    expect(kira.map(s => [s.hedef, s.tarafAd])).toEqual([[HEDEF.ANA, "Yıldız Gayrimenkul"], [HEDEF.STOPAJ, "Vergi dairesi"]]);
    expect(kira[0]).toMatchObject({ tarih: "2026-08-01", vade: "2026-08-10", yas: 62, kova: "61-90 gün", kalanK: 1600000 });
  });
  it("AC-9 / AC-39: vadesiz satır işaretli ve vadeli satırlardan sonra; vadeliler vade artan", () => {
    const s = R().satirlar;
    const ilkVadesiz = s.findIndex(x => x.vadesiz);
    expect(ilkVadesiz).toBeGreaterThan(0);
    expect(s.slice(ilkVadesiz).every(x => x.vadesiz)).toBe(true);
    const vadeler = s.slice(0, ilkVadesiz).map(x => x.vade);
    expect([...vadeler].sort()).toEqual(vadeler);
  });
});

describe("Spec 0061 B: yaşlandırma", () => {
  it("AC-11 / AC-30: dört kova kalem sayar; kiranın iki hedefi aynı kovada tek kalem", () => {
    const r = R();
    expect(r.kovalar.map(x => x.ad)).toEqual(YAS_SIRA);
    const k6190 = r.kovalar.find(x => x.ad === "61-90 gün");
    expect(k6190.kalemAdet).toBe(1);
    expect(k6190.kalanK).toBe(2000000); // kira 16.000 + stopaj 4.000
    expect(r.kovalar.find(x => x.ad === "90+ gün")).toMatchObject({ kalemAdet: 1, kalanK: 400000 });
    expect(r.kovalar.reduce((a, x) => a + x.kalemAdet, 0)).toBe(r.kalemAdet);
  });
  it("AC-12: yaş gider tarihinden; aynı vadeli iki kalem farklı gider tarihleriyle farklı kovalarda", () => {
    const a = k({ id: 40, tarih: "2026-09-25", turId: 4, tutar: 100, kdvOrani: 0, sonOdemeTarihi: "2026-10-30" });
    const b = k({ id: 41, tarih: "2026-07-10", turId: 4, tutar: 100, kdvOrani: 0, sonOdemeTarihi: "2026-10-30" });
    const s = acikKalemler([a, b], AYAR, BUGUN).satirlar;
    expect(s.find(x => x.kalemId === 40).kova).toBe("0-30 gün");
    expect(s.find(x => x.kalemId === 41).kova).toBe("61-90 gün");
  });
  it("AC-13: vadesi geçmiş ve vadesiz kalem sayar; vadesiz hedef geçmiş sayılmaz", () => {
    const r = R();
    expect(r.gecmisAdet).toBe(2); // VADELI (30.09) ve KIRA (10.08); personel ve seçilmemiş vadesi gelmedi
    expect(r.vadesizAdet).toBe(2); // VADESIZ ve KIRA (stopaj hedefinin vadesi girilmemiş; R35: kalem bir kez)
    expect(r.satirlar.find(s => s.kalemId === 1).gecti).toBe(false);
  });
  it("AC-15 / AC-26 (R26): taraf kırılımında çalışanlar tek satır, kova dağılımı var; adlar yalnız ayrıntıda", () => {
    const c = R().taraflar.find(t => t.tur === "calisanlar");
    expect(c).toMatchObject({ ad: "Çalışanlar", kisi: 1, toplamK: 4000000 });
    expect(c.kovalar["0-30 gün"]).toBe(4000000);
    expect(c.ayrinti[0].ad).toBe("Hasan Çelik");
  });
  it("AC-16 / AC-35: yaş yerel gün sınırına göre; gün dönünce kova değişir (TZ Europe/Istanbul)", () => {
    const x = k({ id: 50, tarih: "2026-09-01", turId: 4, tutar: 100, kdvOrani: 0 });
    expect(acikKalemler([x], AYAR, "2026-10-01").satirlar[0]).toMatchObject({ yas: 30, kova: "0-30 gün" });
    expect(acikKalemler([x], AYAR, "2026-10-02").satirlar[0]).toMatchObject({ yas: 31, kova: "31-60 gün" });
    expect(process.env.TZ).toBe("Europe/Istanbul");
  });
});

describe("Spec 0061 tutarlılık ve tek hesap", () => {
  it("AC-17: toplam kalan borç özetinin 'Toplam borç'una eşit", () => {
    expect(R().toplamK).toBe(kurus(borcOzeti(G(), AYAR, BUGUN).toplam));
  });
  it("AC-17: süzülmüş satırların özeti aynı fonksiyondan (acikOzet)", () => {
    const r = R();
    const suz = acikOzet(r.satirlar.filter(s => s.kova === "61-90 gün"));
    expect(suz.toplamK).toBe(r.kovalar.find(x => x.ad === "61-90 gün").kalanK);
  });
  it("AC-18 / AC-4: hatırlatıcı açık kalemler motorunu kullanmaz; kapsamı ortak kuraldan, vade şartı yerinde", () => {
    const h = kod("src/lib/odemeHatirlatma.js");
    expect(h).not.toMatch(/acikKalemler/);
    expect(h).toMatch(/borcKapsamindaMi\(k, \{ esik, bugun \}\)/);
    expect(h).toMatch(/h\.kalanK > 0 && h\.vade/);
  });
  it("AC-27: kapsam kuralı tek yerde; borcOzeti ve motor borcKapsamindaMi'yi çağırır", () => {
    const desen = /k\.deletedAt \|\| k\.odendi \|\| !k\.tarih/;
    expect(dosyalar("src").filter(f => desen.test(kod(f)))).toEqual(["src/lib/gider.js"]);
    const g = kod("src/lib/gider.js");
    expect((g.match(/k\.deletedAt \|\| k\.odendi \|\| !k\.tarih/g) || []).length).toBe(1);
    expect(g.slice(g.indexOf("export const borcOzeti"))).toMatch(/borcKapsamindaMi\(k, \{ esik, bugun \}\)/);
    expect(kod("src/lib/acikKalemler.js")).toMatch(/borcKapsamindaMi\(k, \{ esik, bugun \}\)/);
  });
  it("AC-28 / AC-34: kova adları tek yardımcıda; faaliyet raporu onu çağırır", () => {
    expect(yasKovaAdi(null)).toBe("90+ gün");
    expect([0, 30, 31, 60, 61, 90, 91].map(yasKovaAdi)).toEqual(["0-30 gün", "0-30 gün", "31-60 gün", "31-60 gün", "61-90 gün", "61-90 gün", "90+ gün"]);
    const tanim = dosyalar("src").filter(f => /"31-60 gün"/.test(kod(f)) || /yasKovaAdi\s*=/.test(kod(f)));
    expect(tanim).toEqual(["src/lib/yaslandirma.js"]);
    expect(kod("src/lib/aylikRapor.js")).toMatch(/from "\.\/yaslandirma"/);
  });
  it("triyaj bulgu 2: hedef listesi kalem başına bir kez alınır; çok hedeflilik doğru", () => {
    expect((kod("src/lib/acikKalemler.js").match(/odemeHedefleri\(/g) || []).length).toBe(1);
    const s = R().satirlar;
    expect(s.filter(x => x.kalemId === 3).every(x => x.cokHedef)).toBe(true);   // stopajlı kira
    expect(s.find(x => x.kalemId === 1).cokHedef).toBe(false);                   // tek hedefli hammadde
  });
  it("AC-29: motor gunFarki ile sayar, şimdiki zamanı okumaz", () => {
    const m = kod("src/lib/acikKalemler.js");
    expect(m).toMatch(/gunFarki\(k\.tarih, bugun\)/);
    expect(m).not.toMatch(/new Date|Date\.now|yerelBugun|today\(/);
    expect(kod("src/lib/yaslandirma.js")).not.toMatch(/new Date|Date\.now/);
  });
});
