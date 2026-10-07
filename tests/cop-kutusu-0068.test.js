// Spec 0068: tedarikçi ve üretim partisi çöp kutusunda; çöpteyken motor çıktıları "hiç yokmuş gibi" (R10, R17); kalıcı
// silme metni tek sabit (R12, R13, R22); çek dışa aktarma satırı (R3–R5); canlı/ham dizi ayrımı ve sunucu değişmezliği.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { withoutDeleted } from "../src/lib/utils";
import { borcOzeti, hesaplaGiderRaporu } from "../src/lib/gider";
import { tedarikciEkstresi } from "../src/lib/kasa";
import { hesaplaMakinaMaliyetleri } from "../src/lib/makinaMaliyeti";
import * as copKutusu from "../src/lib/copKutusu";
const { geriAlmaAdCakismasi } = copKutusu;
import { cekExportRow, CEK_EXPORT_HEAD } from "../src/components/settings/SettingsExport";
import { tahsilatHaritasi } from "../src/lib/cek";

const kok = resolve(__dirname, "..");
const oku = (f) => readFileSync(resolve(kok, f), "utf-8");

// ── Motorlar: çöpteki kayıt = kayıt hiç yok (AC-12, AC-19, AC-29) ──
const TURLER = [{ id: 1, ad: "Hammadde", davranis: "normal" }];
const G = [{ id: 10, tarih: "2026-09-05", turId: 1, tutar: 1000, kdvOrani: 20, tedarikciId: 11, aciklama: "Sac", sonOdemeTarihi: "2026-09-20", modelSatirlari: [] }];
const COPTE = [{ id: 11, ad: "Demir Bant", deletedAt: "2026-10-01T09:00:00.000Z" }, { id: 12, ad: "Canlı Ltd" }];
const YOK = [{ id: 12, ad: "Canlı Ltd" }];

describe("Spec 0068 R10, R17: çöpteki tedarikçi motor çıktısını değiştirmez", () => {
  it("AC-12 / AC-19: borç özeti, tedarikçi kırılımı ve ekstre, kayıt çöpteyken (App canlı diziyi verir) hiç yokmuşçasına aynı", () => {
    const canli = withoutDeleted(COPTE);
    expect(borcOzeti(G, { turler: TURLER, tedarikciler: canli, yururlukAy: "2026-01" }, "2026-10-02"))
      .toEqual(borcOzeti(G, { turler: TURLER, tedarikciler: YOK, yururlukAy: "2026-01" }, "2026-10-02"));
    const rapor = (ted) => hesaplaGiderRaporu({ giderler: G, turler: TURLER, tedarikciler: ted, yururlukAy: "2026-01" }, { baslangic: "2026-09-01", bitis: "2026-09-30" }, { bugun: "2026-10-02" });
    expect(rapor(canli).tedarikciKirilimi).toEqual(rapor(YOK).tedarikciKirilimi);
    expect(tedarikciEkstresi(11, { giderler: G, turler: TURLER, yururlukAy: "2026-01", bugun: "2026-10-02" })).toBeTruthy(); // ekstre tedarikçi listesini okumaz
  });
  it("AC-29: motor dosyaları çöp süzmesi almadı (tedarikçi tarafı); maliyet motoru zaten canliPartiler ile süzüyor (0022)", () => {
    expect(oku("src/lib/gider.js")).not.toMatch(/tedarikciler\.filter\(t => !t\.deletedAt\)/);
    expect(oku("src/lib/makinaMaliyeti.js")).toMatch(/canliPartiler\(uretimPartileri\)/);
  });
});

describe("Spec 0068 R9, R10: çöpteki parti makinaları aylık kurala düşürür, geri alınınca eski dağıtım döner", () => {
  const veri = (partiler) => ({
    customers: [], partStockLog: [], giderTurleri: TURLER, standartGiderler: [], standardModels: [{ model: "AK100" }], customModels: [],
    stock: [{ id: 1, model: "AK100", serialNo: "S1", addedDate: "2026-07-10", partiId: 5 }, { id: 2, model: "AK100", serialNo: "S2", addedDate: "2026-08-10", partiId: 5 }],
    giderler: [{ id: 20, tarih: "2026-07-15", turId: 1, tutar: 50000, kdvOrani: 0, modelSatirlari: [] }, { id: 21, tarih: "2026-08-15", turId: 1, tutar: 10000, kdvOrani: 0, modelSatirlari: [] }],
    giderAyarlari: { yururlukAy: "2026-01" }, uretimPartileri: partiler,
  });
  const P = { id: 5, ad: "Yaz", baslangicAy: "2026-07", bitisAy: "2026-08" };
  const hesap = (partiler) => hesaplaMakinaMaliyetleri(veri(partiler), { bugun: "2026-10-02" });
  it("AC-14 / AC-30: çöpteki parti = parti yok; geri alınınca parti dağıtımı aynen döner", () => {
    const partili = hesap([P]), copte = hesap([{ ...P, deletedAt: "2026-10-01T09:00:00.000Z" }]), yok = hesap([]), geri = hesap([{ ...P, deletedAt: undefined }]);
    expect(JSON.stringify(copte)).toBe(JSON.stringify(yok));
    expect(JSON.stringify(geri)).toBe(JSON.stringify(partili));
    expect(JSON.stringify(partili)).not.toBe(JSON.stringify(yok)); // parti gerçekten dağıtımı değiştiriyor
  });
});

describe("Spec 0068 R20: geri almada ad çakışması", () => {
  it("AC-37: canlı aynı ad varsa neden döner (Türkçe harf duyarsız); çöpteki ad engel değildir", () => {
    expect(geriAlmaAdCakismasi({ id: 1, ad: "İzmir Sac" }, [{ id: 2, ad: "izmir sac" }], "tedarikçi")).toMatch(/“izmir sac” adında bir tedarikçi zaten var/);
    expect(geriAlmaAdCakismasi({ id: 1, ad: "İzmir Sac" }, [{ id: 2, ad: "İzmir Sac", deletedAt: "x" }, { id: 1, ad: "İzmir Sac" }])).toBeNull();
  });
});

describe("Spec 0068 R12, R13, R22: kalıcı silme metni tek sabit", () => {
  const BES = ["src/components/settings/SettingsGiderTanimlari.jsx", "src/components/settings/GiderTurManager.jsx", "src/components/gider/StandartGiderler.jsx",
    "src/components/Kasa.jsx", "src/components/cek/CekPortfoyu.jsx"];
  // Spec 0078 R3, AC-35 ile TERS ÇEVRİLDİ: altı bölüm çöp kutusuna girdi; kalıcılık metni ve iki sabit kalktı.
  it("AC-16 / AC-17 (spec 0078 ile ters çevrildi): beş pencere ve Çöp Kutusu kalıcılık metni içermez; sabitler yok", () => {
    for (const f of [...BES, "src/components/settings/SettingsTrash.jsx", "src/components/Settings.jsx", "src/components/kasa/HesapSilPenceresi.jsx"]) {
      expect(oku(f), f).not.toMatch(/KALICI_SILME_NOTU|KALICI_SILINEN_BOLUMLER|kalici-silme-notu|çöp kutusuna gitmez/);
    }
    expect(copKutusu.KALICI_SILME_NOTU).toBeUndefined();
    expect(copKutusu.KALICI_SILINEN_BOLUMLER).toBeUndefined();
  });
  it("AC-39 / AC-32: 'çöp kutusuna düşmez / çöpe düşmez' serbest metni kaynakta yok; ödeme hareketi ve kapsam dışı için ayrı ibare yok", () => {
    const dosyalar = [...BES, "src/components/Settings.jsx", "src/components/kasa/HesapSilPenceresi.jsx", "src/components/gider/OdemeGirisi.jsx", "src/lib/copKutusu.js"];
    for (const f of dosyalar) expect(oku(f), f).not.toMatch(/[çÇ]öp(e| kutusuna) düşmez/);
    expect(oku("src/components/gider/OdemeGirisi.jsx")).not.toMatch(/KALICI_SILME_NOTU/);
  });
});

describe("Spec 0068 C8, R11: canlı/ham ayrımı ve otomatik temizlik (kaynak)", () => {
  const app = oku("src/App.jsx");
  it("AC-27: App canlı dizileri türetir ve ekranlara verir; Ayarlar ham diziyi alır", () => {
    expect(app).toMatch(/const liveTedarikciler\s+= useMemo\(\(\) => withoutDeleted\(tedarikciler\)/);
    expect(app).toMatch(/const liveUretimPartileri = useMemo\(\(\) => withoutDeleted\(uretimPartileri\)/);
    expect(app).toMatch(/tedarikciler=\{liveTedarikciler\} setTedarikciler=\{setTedarikciler\}/);
    expect(app).toMatch(/uretimPartileri=\{liveUretimPartileri\}/);
    expect(app).toMatch(/<Settings [^\n]*tedarikciler=\{tedarikciler\}[^\n]*uretimPartileri=\{uretimPartileri\}/);
  });
  it("AC-28: iki bölüme yazan her yer tam dizi üzerinde işlevsel güncelleyiciyle yazar", () => {
    for (const f of ["src/components/gider/Tedarikciler.jsx", "src/components/gider/UretimPartileri.jsx", "src/components/settings/SettingsTrash.jsx"]) {
      const s = oku(f);
      for (const m of s.matchAll(/set(Tedarikciler|UretimPartileri)\??\.?\(([^)]{0,3})/g)) expect(m[2].trim(), `${f}: ${m[0]}`).toMatch(/^p\b|^p =>|^p$/);
    }
  });
  it("AC-15 / AC-33: 30 günlük otomatik temizlik iki bölümü de kapsar", () => {
    expect(app).toMatch(/data\.tedarikciler = purgeOldTrash\(data\.tedarikciler\)/);
    expect(app).toMatch(/data\.uretimPartileri = purgeOldTrash\(data\.uretimPartileri\)/);
  });
});

describe("Spec 0068 C4, R15, R16, X7: sunucu ve izinler değişmedi", () => {
  const sa = oku("electron/serverAuth.cjs");
  it("AC-22 / AC-24 / AC-36: sekme eşlemesi ['gider'] kaldı; silme izinleri aynı; ALAN_IZINLERI'nde deletedAt yok", () => {
    expect(sa).toMatch(/tedarikciler:\s+\["gider"\],/);
    expect(sa).toMatch(/uretimPartileri:\s+\["gider"\],/);
    expect(sa).toMatch(/uretimPartileri:\s+\{ ekle: "gider_tanim", sil: "gider_tanim" \}/);
    expect(sa).toMatch(/tedarikciler:\s+\{ ekle: "tedarikci_add", sil: "tedarikci_delete" \}/);
    const i = sa.indexOf("const ALAN_IZINLERI"), j = sa.indexOf("};", i);
    expect(sa.slice(i, j)).not.toMatch(/deletedAt/);
  });
});

// ── Çek dışa aktarma satırı (AC-5, AC-6, AC-7, AC-31) ──
describe("Spec 0068 R3–R5: çek dışa aktarma satırı", () => {
  const payments = [{ id: 100, customerId: 7, tarih: "2026-09-01", tutar: 45000, currency: "TRY", vadeTarihi: "2026-11-15" }, { id: 101, customerId: 7, tutar: 1, deletedAt: "x" }];
  const customers = [{ id: 7, name: "Kutu Gıda" }];
  const pById = tahsilatHaritasi(payments);
  it("AC-5 / AC-6: bağlı alınan çekte tutar ve vade tahsilattan; bağsızda çekin kendi alanlarından; verilende alacaklı alacakliAd'dan; iki taraf sütunu ayrı", () => {
    expect(CEK_EXPORT_HEAD).toEqual(["Yön", "Çek No", "Banka", "Keşideci", "Tür", "Tutar", "Para Birimi", "Vade", "Alınma / Yazılma Tarihi", "Durum", "Müşteri / Kimden", "Alacaklı", "Tahsilata Bağlı"]);
    const bagli = cekExportRow({ id: 1, paymentId: 100, no: "0012", banka: "Ziraat", kesideci: "Ali", tur: "hamiline", durum: "portfoy", tutar: 999 }, pById, customers);
    expect(bagli).toEqual(["Alınan", "0012", "Ziraat", "Ali", "Hamiline", 45000, "TRY", "2026-11-15", "2026-09-01", "Portföyde", "Kutu Gıda", "", "Evet"]);
    const bagsiz = cekExportRow({ id: 2, paymentId: null, no: "B1", banka: "Vakıf", tur: "resmi", durum: "ciro", tutar: 12500, currency: "TRY", vadeTarihi: "2026-12-01", tarih: "2026-09-12", kimden: "Kaya Ltd.", alacakliAd: "Yıldız" }, pById, customers);
    expect(bagsiz).toEqual(["Alınan", "B1", "Vakıf", "", "Resmi", 12500, "TRY", "2026-12-01", "2026-09-12", "Ciro edildi", "Kaya Ltd.", "Yıldız", "Hayır"]);
    const verilen = cekExportRow({ id: 3, yon: "verilen", paymentId: null, no: "A-1", banka: "Ziraat", tur: "hamiline", durum: "yazildi", tutar: 18000, vadeTarihi: "2026-10-26", tarih: "2026-09-10", alacakliAd: "Yıldız Gayrimenkul" }, pById, customers);
    expect(verilen.slice(0, 1)).toEqual(["Verilen"]);
    expect(verilen.slice(9)).toEqual(["Yazıldı", "", "Yıldız Gayrimenkul", "Hayır"]);
    expect(cekExportRow({ id: 4, paymentId: 101, no: "X" }, pById, customers)).toBeNull(); // tahsilatı çöpte: portföyle aynı
  });
  it("AC-7 / AC-31: SettingsExport'a eklenen tek yeni prop cekler; gider/kasa bölümleri okunmaz", () => {
    const s = oku("src/components/settings/SettingsExport.jsx");
    expect(s).toMatch(/yedekParcaSatislar = \[\], serverPermissions = null, cekler = null \}\) => \{/);
    expect(s).not.toMatch(/tedarikciler|hesapHareketleri|giderler|kasaHesaplari/);
  });
});
