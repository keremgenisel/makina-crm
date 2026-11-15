// Spec 0146: kalıp durumları penceresi ve makina teslimiyle toplu teslim. Saf yardımcılar (musteriDurumu.js) ve kaynak taramaları.
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import * as MD from "../src/lib/musteriDurumu.js";

const K = MD.KALIP_DURUMU;
const M = MD.MAKINA_DURUMU;
const kok = path.join(__dirname, "..");
const oku = (f) => readFileSync(path.join(kok, f), "utf-8");
const yorumsuz = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
const DETAY = "src/components/customers/CustomerDetailModal.jsx";
const YENI = "src/components/customers/detail/KalipDurumlari.jsx";

// Bir canlı bağlı tamamlanmış satır (türetilmiş hazır) ve bir bitmemiş satır (türetilmiş üretimde).
const H = MD.uretimFormHaritasi([{ id: 50, satirlar: [{ kaynakTip: "musteri", kaynakId: 1, kalipIdx: 0, tamamlandi: true }, { kaynakTip: "musteri", kaynakId: 1, kalipIdx: 1, tamamlandi: false }] }]);
const MUSTERI = Object.freeze({ id: 1, kaliplar: Object.freeze([
  { ad: "A", uretimFormId: 50 },               // 0: türetilmiş hazır
  { ad: "B", uretimFormId: 50 },               // 1: türetilmiş üretimde
  { ad: "C", kalipDurumu: K.HAZIR },           // 2: elle hazır
  { ad: "D", kalipDurumu: K.GONDERILDI },      // 3: sipariş verildi
  { ad: "E", kalipDurumu: K.BEKLIYOR },        // 4: sipariş bekliyor
  { ad: "F" },                                 // 5: teslim (0110 R1)
  { ad: "G", kalipDurumu: K.HAZIR, partSaleId: 70 }, // 6: ayna (kimlik)
  { ad: "H", kalipDurumu: K.HAZIR },           // 7: sondaki satış sayısı kadar satır: Extra Kalıp
]) });
const BAG = { satisAdedi: 1, harita: H };

describe("Spec 0146: saf yardımcılar", () => {
  it("A-R8 / AC-18: ayna ölçütü kartın ölçütü (kimlik ya da sondaki n satır)", () => {
    expect(MD.extraSatistanMi({ partSaleId: 3 }, 0, 5, 0)).toBe(true);
    expect(MD.extraSatistanMi({}, 4, 5, 1)).toBe(true);
    expect(MD.extraSatistanMi({}, 3, 5, 1)).toBe(false);
    expect(MD.extraSatistanMi({}, 4, 5, undefined)).toBe(false);
  });
  it("A-R5 / A-R6/2 / AC-25: liste makina kalıplarıdır, i konumdur; türetilen ve durum ayrı", () => {
    const l = MD.makinaKaliplari(MUSTERI, BAG);
    expect(l.map(x => x.i)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(l.map(x => x.durum)).toEqual([K.HAZIR, K.URETIMDE, K.HAZIR, K.GONDERILDI, K.BEKLIYOR, K.TESLIM]);
    expect(l[2].turetilen).toBe(K.TESLIM);
    expect(l[2].kalip).toBe(MUSTERI.kaliplar[2]);
    const besli = { id: 2, kaliplar: [{}, { partSaleId: 9 }, {}, {}, {}] };
    expect(MD.makinaKaliplari(besli, { satisAdedi: 0 }).map(x => x.i + 1)).toEqual([1, 3, 4, 5]);
  });
  it("AC-2 / AC-3 / AC-24: özet bütün durumları en geriden yazar, teslim dahil, sayı her zaman", () => {
    expect(MD.kalipOzetMetni(MD.makinaKaliplari(MUSTERI, BAG))).toBe("1 Sipariş bekliyor · 1 Sipariş verildi · 1 Üretimde · 2 Hazır · 1 Teslim edildi");
    const d = (...x) => x.map(durum => ({ durum }));
    expect(MD.kalipOzetMetni(d(K.HAZIR, K.HAZIR, K.URETIMDE))).toBe("1 Üretimde · 2 Hazır");
    expect(MD.kalipOzetMetni(d(K.HAZIR, K.TESLIM, K.HAZIR))).toBe("2 Hazır · 1 Teslim edildi");
    expect(MD.kalipOzetMetni(d(K.HAZIR, K.HAZIR, K.HAZIR))).toBe("3 Hazır");
    expect(MD.kalipOzetMetni(d(K.TESLIM, K.TESLIM))).toBe("2 Teslim edildi");
    expect(MD.kalipOzetMetni([])).toBeNull();
    expect(MD.kalipOzetMetni(MD.makinaKaliplari({ id: 3, kaliplar: [{ partSaleId: 8, kalipDurumu: K.HAZIR }] }, {}))).toBeNull(); // yalnız ayna
  });
  it("B-R1/2 / B-R4 / B-R5 / AC-14 / AC-15: plan yalnız hazır makina kalıplarını (elle ve türetilmiş) teslim yapar", () => {
    const p = MD.teslimToplamaPlani(MUSTERI, M.TESLIM, BAG);
    expect(p.sayi).toBe(2);
    expect(p.kaliplar.map(k => k.kalipDurumu)).toEqual([K.TESLIM, undefined, K.TESLIM, K.GONDERILDI, K.BEKLIYOR, undefined, K.HAZIR, K.HAZIR]);
    expect(p.kaliplar[1]).toBe(MUSTERI.kaliplar[1]); // dokunulmayan satır aynı nesne
    expect(p.kaliplar[0]).toEqual({ ad: "A", uretimFormId: 50, kalipDurumu: K.TESLIM });
    expect(MUSTERI.kaliplar[0].kalipDurumu).toBeUndefined(); // girdi değişmez
  });
  it("Plan kararı 25: harita verilmezse türetilmiş hazır görülmez (yalnız elle hazır sayılır)", () => {
    expect(MD.teslimToplamaPlani(MUSTERI, M.TESLIM, { satisAdedi: 1 }).sayi).toBe(1);
  });
  it("B-R3 / B-R6 / AC-13 / AC-16: teslim değilse ya da hazır yoksa null", () => {
    for (const v of [M.HAZIR, M.MONTAJ, "", undefined]) expect(MD.teslimToplamaPlani(MUSTERI, v, BAG)).toBeNull();
    expect(MD.teslimToplamaPlani({ id: 4, kaliplar: [{ kalipDurumu: K.URETIMDE }, {}] }, M.TESLIM, {})).toBeNull();
    expect(MD.teslimToplamaPlani({ id: 4 }, M.TESLIM, {})).toBeNull();
  });
  it("AC-17: yardımcılar saf (aynı girdi aynı çıktı)", () => {
    expect(MD.teslimToplamaPlani(MUSTERI, M.TESLIM, BAG)).toEqual(MD.teslimToplamaPlani(MUSTERI, M.TESLIM, BAG));
    expect(MD.kalipOzetMetni(MD.makinaKaliplari(MUSTERI, BAG))).toBe(MD.kalipOzetMetni(MD.makinaKaliplari(MUSTERI, BAG)));
  });
  it("AC-18 / Tuzak T5: kart, özet, liste ve onay aynı ölçütten aynı kümeyi verir", () => {
    const kart = MUSTERI.kaliplar.map((k, i) => !MD.extraSatistanMi(k, i, MUSTERI.kaliplar.length, 1)).filter(Boolean).length;
    const l = MD.makinaKaliplari(MUSTERI, BAG);
    expect(kart).toBe(l.length);
    expect(MD.kalipOzetMetni(l).split(" · ").reduce((t, p) => t + Number(p.split(" ")[0]), 0)).toBe(l.length);
    expect(MD.teslimToplamaPlani(MUSTERI, M.TESLIM, BAG).sayi).toBe(l.filter(x => x.durum === K.HAZIR).length);
  });
  it("AC-28 / Plan kararı 30: çağıran çöpteki satışı da sayarsa son kalıp düşer (yardımcı düzeyinde)", () => {
    const m = { id: 5, kaliplar: [{ kalipDurumu: K.HAZIR }, { kalipDurumu: K.HAZIR }] };
    expect(MD.makinaKaliplari(m, { satisAdedi: 0 })).toHaveLength(2);
    expect(MD.makinaKaliplari(m, { satisAdedi: 1 })).toHaveLength(1);
    expect(MD.teslimToplamaPlani(m, M.TESLIM, { satisAdedi: 1 }).sayi).toBe(1);
    // App Customers'a yalnız canlı Extra Kalıp satışlarını verir, bu yüzden sonuç uygulamada oluşmaz.
    expect(oku("src/App.jsx").match(/<Customers[\s\S]*?partSales=\{(\w+)\}/g).every(s => s.endsWith("{livePartSales}"))).toBe(true);
  });
  it("A-R5/2 / AC-27 / B-R2/2: metinler kütüphanede", () => {
    expect(MD.extraKalipListeIbaresi(3)).toBe("3 Extra Kalıp satışı bu listede ve özette yoktur; durumları Makina Geçmişi'ndeki satırından yönetilir ve Teslim Bekleyenler süzgecine girer.");
    expect(MD.KALIP_DURUMLARI_BASLIGI).toBe("Kalıp Durumları");
    expect(MD.TESLIM_ONAYI.baslik).toBe("Kalıplar da teslim edilsin mi?");
    expect(MD.TESLIM_ONAYI.onay).toBe("Evet, İşaretle");
    expect(MD.TESLIM_ONAYI.iptal).toBe("Yalnız makina");
  });
});

describe("Spec 0146: kaynak taramaları", () => {
  const detay = () => yorumsuz(oku(DETAY));
  const yeni = () => yorumsuz(oku(YENI));
  it("AC-34 / A-R1/3: satır, pencere ve onay yeni dosyada; detay yalnız çağırır; 0110'un dokuz adı detayda yok", () => {
    expect(existsSync(path.join(kok, YENI))).toBe(true);
    for (const ad of ["export const KalipDurumuSatiri", "export const KalipDurumlariPenceresi", "export const TeslimOnayi"]) expect(yeni()).toContain(ad);
    expect(detay()).toMatch(/from "\.\/detail\/KalipDurumlari"/);
    for (const ad of ["KalipDurumuSecici", "kalipDurumuTuret", "aynaDurumu", "aynaSatirMi", "musteriKalipAnahtari", "KALIP_DURUM_ADLARI", "AYNA_SATIR_IBARESI", "detay-kalip-satiri", "ayna-kalip-durumu"]) {
      expect(detay(), ad).not.toContain(ad);
    }
  });
  it("AC-17 / AC-35 / B-R1/2: ekranlarda MAKINA_DURUMU / KALIP_DURUMU karşılaştırması ve tırnaklı durum dizesi yok", () => {
    for (const s of [detay(), yeni()]) {
      expect(s).not.toMatch(/\b(MAKINA|KALIP)_DURUMU\b/);
      expect(s).not.toMatch(/["'`](montaj|hazir|teslim|bekliyor|gonderildi|uretimde)["'`]/);
      expect(s).not.toMatch(/kalipDurumu\s*===|makinaDurumu\s*===/);
    }
    expect(detay()).toMatch(/const plan = teslimToplamaPlani\(detailView, v, kalipBaglami\);\s*if \(plan\)/);
  });
  it("AC-18: src/components'te partSaleId ile Extra Kalıp satış sayısını birlikte okuyan ifade yok; kart yardımcıyı çağırır", () => {
    const { readdirSync, statSync } = require("node:fs");
    const tara = (d) => readdirSync(path.join(kok, d)).flatMap(f => { const p = `${d}/${f}`; return statSync(path.join(kok, p)).isDirectory() ? tara(p) : /\.jsx?$/.test(f) ? [p] : []; });
    for (const f of tara("src/components")) {
      for (const satir of yorumsuz(oku(f)).split("\n")) {
        expect(/partSaleId/.test(satir) && /[sS]atisAdedi/.test(satir), `${f}: ${satir.trim()}`).toBe(false);
      }
    }
    expect(detay()).toMatch(/const extraSatistan = extraSatistanMi\(k, i, detailView\.kaliplar\.length, detailKalipSatisAdedi\);/);
    expect(yorumsuz(oku("src/lib/musteriDurumu.js"))).not.toMatch(/detailKalipSatisAdedi/);
  });
  it("AC-36 / B-R7/2: pencere ve onay tek durum alanında", () => {
    expect(detay().match(/useState\(null\)/g).length).toBeGreaterThan(0);
    expect(detay()).toMatch(/const \[kalipPenceresi, setKalipPenceresi\] = useState\(null\);/);
    expect(detay()).toMatch(/kalipPenceresi === "liste" &&/);
    expect(detay()).toMatch(/kalipPenceresi\?\.onay != null &&/);
    expect(detay()).not.toMatch(/kalipOnay\w*\]|teslimOnay\w*\] = useState/);
  });
  it("AC-37 / A-R10/2: detayın iki kapanma yolu aynı kapıdan", () => {
    expect(detay()).toMatch(/const detayKapat = kalipPenceresi \? KAPANMAZ : onClose;/);
    expect(detay()).toMatch(/title=\{detailView\.name\} onClose=\{detayKapat\} footer=\{detailLock \? null : \(<Btn variant="ghost" onClick=\{detayKapat\}>Kapat<\/Btn>\)\}/);
  });
  it("AC-9 / A-R9 / AC-9/2: pencere 560, footersüz, overflowVisible'sız; liste detay gövdesinde çizilmez", () => {
    const p = yeni().slice(yeni().indexOf("export const KalipDurumlariPenceresi"), yeni().indexOf("export const TeslimOnayi"));
    expect(p).toMatch(/<Modal title=\{KALIP_DURUMLARI_BASLIGI\} maxWidth=\{560\} onClose=\{onClose\}>/);
    expect(p).not.toMatch(/overflowVisible|footer|wide/);
    expect(detay()).not.toMatch(/detayMakinaKaliplari\.map/);
    expect(detay()).not.toMatch(/kalip-durum-satiri/);
  });
  it("B-R2/2 / AC-31: onay ConfirmDialog seçenekleri yazılı", () => {
    expect(yeni()).toMatch(/icon="check" confirmIcon="check"/);
    expect(yeni()).toMatch(/confirmLabel=\{TESLIM_ONAYI\.onay\} cancelLabel=\{TESLIM_ONAYI\.iptal\} confirmVariant="primary"/);
  });
  it("C3 / Plan kararı 28: yeni dosya veri yazmaz ve kilit almaz", () => {
    expect(yeni()).not.toMatch(/set[A-Z]\w*\(|useLock|baskasiKilitli|kilitliIse/);
  });
  it("AC-20: müşteri formunun kalıp ızgarası bloğu dokunulmadı", () => {
    const s = oku("src/components/customers/CustomerAddEditForm.jsx");
    const a = s.indexOf("<Field label={`Kalıp Ölçüleri"), b = s.indexOf("</Field>", s.indexOf("+ Kalıp Ekle"));
    expect(createHash("sha256").update(s.slice(a, b)).digest("hex")).toBe("8c0061168d728bb667254ab29ac7d9006cf35713ea88d11c1fb73fbc39e9d3f9");
    expect(yorumsuz(s)).not.toMatch(/teslimToplamaPlani|TeslimOnayi/); // X10: formda onay yok
  });
  it("AC-21 / C1: sunucu, izin, veritabanı, birleştirme ve kilit dosyaları yeni adları bilmez", () => {
    for (const f of ["electron/db.cjs", "electron/serverAuth.cjs", "electron/server.cjs", "src/lib/merge.js", "src/lib/kilitAlanlari.js", "src/components/settings/serverPermissionDefs.js", "src/lib/permissions.js"]) {
      expect(oku(f), f).not.toMatch(/teslimToplamaPlani|makinaKaliplari|kalipOzetMetni|extraSatistanMi|KalipDurumlari/);
    }
  });
});

describe("Spec 0146 triyaj: kaynak", () => {
  const detay = () => yorumsuz(oku(DETAY));
  it("bulgu 1: ibareye satış sayısı verilir, satır farkı değil", () => {
    expect(detay()).toMatch(/extraSayisi=\{detailKalipSatisAdedi\}/);
    expect(detay()).not.toMatch(/kaliplar\?\.length \|\| 0\) - detayMakinaKaliplari\.length/);
  });
  it("bulgu 2: kilit kaybında pencere ve onay kapanır", () => {
    expect(detay()).toMatch(/useEffect\(\(\) => \{ if \(detailLock\) setKalipPenceresi\(null\); \}, \[detailLock\]\);/);
  });
  it("bulgu 3: KAPANMAZ sabiti import bloğunun altında (ondan sonra import yok)", () => {
    const s = oku(DETAY);
    const sabit = s.indexOf("const KAPANMAZ");
    expect(sabit).toBeGreaterThan(0);
    expect(s.slice(sabit)).not.toMatch(/^import /m);
  });
});
