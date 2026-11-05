// @vitest-environment jsdom
// Spec 0121: parça kartında setin içeriği (ekran). Gerçek Settings (Katalog › Parça/Yedek Parça, App gibi bağlanır: panele çöpü
// süzülmüş parça dizisi, setter'a tam dizi, `rawParts` ham dizi) ve gerçek Makina Maliyeti (Model Maliyetleri). Motor kriterleri
// tests/set-icerigi-0121.test.js'te.
process.env.TZ = "Europe/Istanbul";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { useState } from "react";
import { readFileSync } from "node:fs";
import { Settings } from "../../src/components/Settings";
import { MakinaMaliyeti } from "../../src/components/MakinaMaliyeti";
import {
  SET_BOS_METNI, SET_BOLUM_BASLIGI, SET_AYNI_PARCA, KIT_ADET_HATASI, SILINMIS_PARCA, BULUNAMAYAN_PARCA, KAYNAK_ICERIK, SET_PASIF_NEDENI,
  setEksikMetni, setFiyatsizMetni, setBileseniHatasi, SET_FIYAT_DUGMESI, GECERLILIK_ETIKETI, GECMIS_BASLIGI, SET_BILESEN_ARA,
} from "../../src/lib/urunAgaci";

afterEach(() => { cleanup(); vi.useRealTimers(); delete window.crmLocks; });
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-10-16T10:00:00")); });

const BASE = {
  customers: [], services: [], dealers: [], stock: [], setStock: vi.fn(), setCustomers: vi.fn(), setServices: vi.fn(), setDealers: vi.fn(),
  version: "3.52.0", appSettings: {}, setAppSettings: vi.fn(), factory: { name: "Altuntaş" }, setFactory: vi.fn(), kalipDefs: [], setKalipDefs: vi.fn(),
  calisanlar: [], setCalisanlar: vi.fn(), partTypeDefs: [], setPartTypeDefs: vi.fn(), onInitialTabConsumed: vi.fn(), aktifKullanici: "kerem",
};
const PARCALAR = [
  { id: 7, ad: "Rulman", models: [], fiyatTRY: "500", maliyet: 100 },
  { id: 8, ad: "Pul", models: [], fiyatTRY: "", maliyet: 2.5 },
  { id: 9, ad: "Kayış", models: [], fiyatTRY: "300" },
  { id: 10, ad: "Rulman Seti", models: [], fiyatTRY: "3000", maliyet: 9999, maliyetGecmisi: [{ gecerli: "", kurus: 800 }, { gecerli: "2026-05-01", kurus: 999900 }],
    setIcerigi: [{ partId: 7, miktar: 2 }, { partId: 8, miktar: 4 }] },
  { id: 11, ad: "Eski Dişli", models: [], maliyet: 40, deletedAt: "2026-10-01T00:00:00.000Z" },
  { id: 12, ad: "Bozuk Set", models: [], setIcerigi: [{ partId: 11, miktar: 1 }, { partId: 404, miktar: 1 }] },
];
const canli = (a) => a.filter(x => !x.deletedAt);
let durum;
function Katalog({ p0 = PARCALAR, ham = true, giderYetki = true }) {
  const [parts, setParts] = useState(structuredClone(p0));
  durum = { parts };
  return <Settings {...BASE} initialTab="yedekparca" parts={canli(parts)} setParts={setParts} standardModels={[]} setStandardModels={vi.fn()}
    customModels={[]} setCustomModels={vi.fn()} {...(ham ? { rawParts: parts } : {})} rawCustomModels={[]} tedarikciler={[{ id: 31, ad: "Demir", hammadde: true }]}
    setTedarikciler={vi.fn()} giderYetki={giderYetki} />;
}
const satir = (ad) => screen.getAllByText(ad).map(e => e.closest("tr")).find(Boolean);
const duzenle = (ad) => fireEvent.click(within(satir(ad)).getByTitle("Düzenle"));
const kaydet = () => fireEvent.click(screen.getByRole("button", { name: /Kaydet/ }));
const kayit = (id) => durum.parts.find(p => p.id === id);
// Spec 0122 ile (R1/2, R6, Karar 3): seçici arama kutusudur; tutamak yer tutucu, seçim focus + mouseDown ve TEK adımdır
// (eski "seç, sonra Bileşen Ekle" iki adımı birleşti). Kimlikle seçmek için adı fikstürden çözülür.
const aramaKutusu = () => within(screen.getByTestId("set-icerigi")).getByPlaceholderText(SET_BILESEN_ARA);
const panel = () => { fireEvent.focus(aramaKutusu()); return [...document.querySelectorAll(".sp-option")].map(e => e.textContent); };
const bilesenSec = (id) => {
  const ad = PARCALAR.find(p => p.id === id).ad;
  fireEvent.focus(aramaKutusu());
  const s = [...document.querySelectorAll(".sp-option")].find(e => e.textContent === ad);
  // Triyaj (spec 0122 bulgu 4): panelde olmayan parça sessizce geçilmez.
  if (!s) throw new Error(`panelde yok: ${ad}`);
  fireEvent.mouseDown(s);
};
const adet = (i, v) => fireEvent.change(screen.getByLabelText(`Bileşen adedi ${i}`), { target: { value: v } });

describe("Spec 0121 A: setin içeriği bölümü (R2, R2/2)", () => {
  // Spec 0122 ile: okuma yolu değişti ("Bileşen Ekle" düğmesi yerine arama kutusu), iddia aynı.
  it("AC-1 / AC-54: içeriği boş parçada bölüm, açıklama ve bileşen arama kutusu çizilir; kayıtta içerik alanı oluşmaz", () => {
    render(<Katalog />);
    duzenle("Kayış");
    const b = screen.getByTestId("set-icerigi");
    expect(within(b).getByText(SET_BOLUM_BASLIGI)).toBeTruthy();
    expect(screen.getByTestId("set-icerigi-bos").textContent).toBe(SET_BOS_METNI);
    expect(within(b).getByPlaceholderText(SET_BILESEN_ARA)).toBeTruthy();
    kaydet();
    expect("setIcerigi" in kayit(9)).toBe(false);
  });
  it("AC-2: iki bileşen eklenip kaydedilen parça set olur; satır yalnız { partId, miktar } taşır", () => {
    render(<Katalog />);
    duzenle("Kayış");
    bilesenSec(7); adet(1, "3");
    bilesenSec(8);
    expect(screen.getAllByTestId("set-bilesen-satiri")).toHaveLength(2);
    kaydet();
    expect(kayit(9).setIcerigi).toEqual([{ partId: 7, miktar: 3 }, { partId: 8, miktar: 1 }]);
  });
  it("AC-3: adet 0, boş ya da ondalıklıysa kayıt yapılmaz ve neden satırın yanında yazar", () => {
    for (const v of ["0", "", "1,5"]) {
      render(<Katalog />);
      duzenle("Kayış");
      bilesenSec(7); adet(1, v);
      kaydet();
      expect("setIcerigi" in kayit(9)).toBe(false);
      expect(within(screen.getAllByTestId("set-bilesen-satiri")[0]).getByText(KIT_ADET_HATASI)).toBeTruthy();
      cleanup();
    }
  });
  // Spec 0122 ile (Karar 5): iddia değişti, uyarı yerine ÖNLEME. İçerikte olan parça panelde listelenmez, ikinci tıklama
  // imkânsızdır; ekranda "adedini artırın" uyarısı yazılmaz (SearchPick'in koşulsuz "eklendi" onayıyla çelişirdi).
  it("AC-4: içerikte olan parça ikinci kez seçilemez (panelde yok); satır eklenmez, uyarı yazılmaz", () => {
    render(<Katalog />);
    duzenle("Kayış");
    bilesenSec(7);
    expect(panel()).not.toContain("Rulman");
    expect(() => bilesenSec(7)).toThrow(/panelde yok: Rulman/);
    expect(screen.getAllByTestId("set-bilesen-satiri")).toHaveLength(1);
    expect(screen.queryByText(SET_AYNI_PARCA)).toBeNull();
  });
  // Spec 0122 ile: okuma yolu `<option>` listesi yerine panel (`.sp-option`); boş "Parça seçin" seçeneği yok, iddia aynı.
  it("AC-5 / AC-6: seçicide içeriği olan parçalar, çöpteki parça ve parçanın kendisi listelenmez", () => {
    render(<Katalog />);
    duzenle("Kayış");
    expect(panel()).toEqual(["Rulman", "Pul"]);
  });
  it("AC-7 / AC-8 / AC-40: çöpteki bileşen ham diziden adıyla 'silinmiş parça', bulunmayan 'kaydı bulunamayan parça'; maliyet girilmedi", () => {
    render(<Katalog />);
    expect(within(satir("Bozuk Set")).getByTestId("parca-maliyet").textContent).toBe("—");
    duzenle("Bozuk Set");
    const satirlar = screen.getAllByTestId("set-bilesen-satiri").map(s => s.textContent);
    expect(satirlar[0]).toContain(`Eski Dişli (${SILINMIS_PARCA})`);
    expect(satirlar[1]).toContain(BULUNAMAYAN_PARCA);
    expect(screen.getByTestId("set-eksik").textContent).toBe(setEksikMetni(2));
  });
  it("AC-40: ham dizi verilmezse canlı diziye düşülür; çökmez, boş satır çizmez", () => {
    render(<Katalog ham={false} />);
    duzenle("Rulman Seti");
    const satirlar = screen.getAllByTestId("set-bilesen-satiri").map(s => s.textContent);
    expect(satirlar[0]).toContain("Rulman");
    expect(satirlar[1]).toContain("Pul");
  });
  it("AC-41: başka bir setin içeriğinde geçen parçaya içerik eklenmesi reddedilir, neden setin adını yazar", () => {
    render(<Katalog />);
    duzenle("Pul");
    bilesenSec(9);
    kaydet();
    expect("setIcerigi" in kayit(8)).toBe(false);
    expect(screen.getByTestId("set-icerigi-genel").textContent).toBe(setBileseniHatasi(["Rulman Seti"]));
  });
});

describe("Spec 0121 B: maliyet ve fiyat (R2/3, R8, R10, R11)", () => {
  it("AC-38 / AC-11: setin listedeki maliyeti içerikten (elle değer okunmaz), kartın kaynak ibaresi içerik; alan pasif ve nedenli", () => {
    render(<Katalog />);
    expect(within(satir("Rulman Seti")).getByTestId("parca-maliyet").textContent).toContain("210,00 ₺");
    expect(within(satir("Rulman Seti")).getByTestId("set-rozeti").textContent).toBe("SET · 2 bileşen");
    duzenle("Rulman Seti");
    expect(screen.getByTestId("maliyet-kaynagi").textContent).toBe(KAYNAK_ICERIK);
    expect(screen.getByLabelText("Alış maliyeti").disabled).toBe(true);
    expect(screen.getByText(SET_PASIF_NEDENI)).toBeTruthy();
  });
  it("AC-51: kaydedilmemiş formda maliyet, eksik bileşen ve fiyat toplamı canlı görünür", () => {
    render(<Katalog />);
    duzenle("Kayış");
    bilesenSec(7); adet(1, "2");
    expect(screen.getByTestId("set-toplam-maliyet").textContent).toBe("200,00 ₺");
    expect(screen.getByTestId("set-fiyat-toplami").textContent).toContain("1.000");
    bilesenSec(8);
    expect(screen.getByTestId("set-toplam-maliyet").textContent).toBe("202,50 ₺");
    expect(screen.getByTestId("set-fiyatsiz").textContent).toBe(setFiyatsizMetni(1));
    expect(screen.getByTestId("maliyet-kaynagi").textContent).toBe(KAYNAK_ICERIK);
  });
  it("AC-15 / AC-52: düğme yalnız fiyatTRY'yi toplamla doldurur; USD/EUR ve kayıt değişmez; toplamı olmayan sette pasif", () => {
    render(<Katalog />);
    duzenle("Rulman Seti");
    const once = structuredClone(kayit(10));
    fireEvent.click(screen.getByRole("button", { name: SET_FIYAT_DUGMESI }));
    expect(kayit(10)).toEqual(once);
    kaydet();
    expect(kayit(10).fiyatTRY).toBe("1000");
    expect(kayit(10).fiyatUSD).toBe(once.fiyatUSD);
    expect(kayit(10).fiyatEUR).toBe(once.fiyatEUR);
    cleanup();
    render(<Katalog />);
    duzenle("Kayış");
    bilesenSec(8);
    expect(screen.getByRole("button", { name: SET_FIYAT_DUGMESI }).disabled).toBe(true);
  });
  it("AC-52 (triyaj bulgu 3, ekleme penceresi): düğme yalnız fiyatTRY'yi doldurur; USD ve EUR boş kalır", () => {
    render(<Katalog />);
    fireEvent.click(screen.getByRole("button", { name: /Parça\/Yedek Parça Ekle/ }));
    fireEvent.change(screen.getByPlaceholderText("Örn: Kesme Bıçağı Seti"), { target: { value: "Yeni Set" } });
    bilesenSec(7); adet(1, "3");
    fireEvent.click(screen.getByRole("button", { name: SET_FIYAT_DUGMESI }));
    kaydet();
    const yeni = durum.parts.find(p => p.ad === "Yeni Set");
    expect(yeni.fiyatTRY).toBe("1500");
    expect(yeni.fiyatUSD).toBe("");
    expect(yeni.fiyatEUR).toBe("");
    expect(yeni.setIcerigi).toEqual([{ partId: 7, miktar: 3 }]);
  });
  it("Karar 42 (triyaj bulgu 3): içerik doluyken hammadde bölümü pasif, içerik boşken etkin", () => {
    render(<Katalog />);
    duzenle("Rulman Seti");
    expect(screen.getByTestId("hammadde-bolumu").closest("fieldset").disabled).toBe(true);
    cleanup();
    render(<Katalog />);
    duzenle("Kayış");
    expect(screen.getByTestId("hammadde-bolumu").closest("fieldset").disabled).toBe(false);
  });
  it("AC-16: bileşenin TL fiyatı yoksa toplam o satırı saymaz ve ekranda söyler", () => {
    render(<Katalog />);
    duzenle("Rulman Seti");
    expect(screen.getByTestId("set-fiyatsiz").textContent).toBe(setFiyatsizMetni(1));
  });
  it("AC-30: 'maliyeti girilmemiş parça' sayacı maliyeti çözülemeyen seti sayar; hammadde süzgecinin sayısı değişmez", () => {
    render(<Katalog />);
    // Kayış (girilmemiş) + Bozuk Set (eksik bileşen) = 2; Rulman Seti çözülür, sayılmaz.
    expect(screen.getByTestId("maliyetsiz-parca").textContent).toContain("2 parçanın");
    const sec = [...screen.getByLabelText("Hammadde tedarikçisi süzgeci").options].map(o => o.textContent);
    expect(sec.at(-1)).toBe("Hammadde tedarikçisi girilmemiş (5)");
  });
  it("AC-13 / AC-39 (kart yolu): setin kaydında maliyet geçmişi yazılmaz, var olan geçmiş korunur; tarih alanı ve geçmiş listesi çizilmez", () => {
    render(<Katalog />);
    duzenle("Rulman Seti");
    expect(screen.queryByLabelText(GECERLILIK_ETIKETI)).toBeNull();
    expect(screen.queryByText(GECMIS_BASLIGI)).toBeNull();
    adet(1, "5");
    kaydet();
    expect(kayit(10).setIcerigi).toEqual([{ partId: 7, miktar: 5 }, { partId: 8, miktar: 4 }]);
    expect(kayit(10).maliyetGecmisi).toEqual(PARCALAR[3].maliyetGecmisi);
    expect(kayit(10).maliyet).toBe(9999);
  });
  it("AC-39: içerik kaldırılınca alanlar geri gelir ve eski geçmiş yeniden devreye girer", () => {
    render(<Katalog />);
    duzenle("Rulman Seti");
    fireEvent.click(screen.getByLabelText("Bileşeni kaldır 2"));
    fireEvent.click(screen.getByLabelText("Bileşeni kaldır 1"));
    expect(screen.getByLabelText(GECERLILIK_ETIKETI)).toBeTruthy();
    expect(screen.getByLabelText("Alış maliyeti").disabled).toBe(false);
    kaydet();
    expect("setIcerigi" in kayit(10)).toBe(false);
    expect(kayit(10).maliyetGecmisi).toEqual(PARCALAR[3].maliyetGecmisi);
  });
});

describe("Spec 0121 R32/2: Model Maliyetleri kesişim uyarısı (Karar 39)", () => {
  it("AC-46: kitinde hem set hem bileşeni olan modelin satırında uyarı; kayıt engellenmez, rakam bugünkü kural", () => {
    const parts = [{ id: 7, ad: "Rulman", maliyet: 100 }, { id: 10, ad: "Rulman Seti", setIcerigi: [{ partId: 7, miktar: 2 }] }];
    const modeller = [{ model: "AK100", defaultParcalar: [{ partId: "10", miktar: 1 }, { partId: "7", miktar: 1 }] }, { model: "AK200", defaultParcalar: [{ partId: "7", miktar: 1 }] }];
    render(<MakinaMaliyeti aktifKullanici="kerem" giderler={[]} giderTurleri={[]} setGiderTurleri={vi.fn()} tedarikciler={[]} stock={[]} customers={[]} partStockLog={[]}
      parts={parts} standardModels={modeller} customModels={[]} setStandardModels={vi.fn()} setCustomModels={vi.fn()} uretimPartileri={[]} setUretimPartileri={vi.fn()}
      appSettings={{ giderAyarlari: { yururlukAy: "2026-01" } }} setAppSettings={vi.fn()} rates={{}} serverPermissions={null} showToast={vi.fn()} baslangicGorunum="modeller" />);
    const u = screen.getAllByTestId("set-kesisim-uyarisi");
    expect(u).toHaveLength(1);
    expect(u[0].textContent).toBe("kitte hem set hem bileşeni var: Rulman Seti › Rulman");
    expect(screen.getByTestId("model-satiri-AK100").textContent).toContain("300,00");
  });
});

describe("Spec 0121: kaynak taramaları (C1, R2/2, R2/3)", () => {
  const kod = (f) => readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
  it("AC-54: bölüm kimlikleri ekranda, metinler urunAgaci.js'ten (ekranda yerel kopya yok)", () => {
    const pm = kod("src/components/PartManager.jsx");
    for (const id of ["set-icerigi", "set-bilesen-satiri", "set-icerigi-bos", "set-toplam"]) expect(pm).toContain(`data-testid="${id}"`);
    // Spec 0122 ile (R11): "Bileşen Ekle" listeden çıktı, yeni yer tutucu girdi.
    for (const metin of ["Setin içeriği", "Bileşen ara...", "Setin içeriğinden geliyor", "TL fiyatı toplamına eşitle", "kaydı bulunamayan parça", "silinmiş parça"]) {
      expect(pm).not.toContain(metin);
      expect(kod("src/lib/urunAgaci.js")).toContain(metin);
    }
  });
  it("AC-51 / C1: PartManager toplama yapmaz; set özeti tek formMaliyeti sonucundan, setOzeti tek çağrı", () => {
    const pm = kod("src/components/PartManager.jsx");
    expect(pm.match(/setOzeti\(/g)).toHaveLength(1);
    expect(pm).toMatch(/ozet=\{canliEkle\?\.set\}/);
    expect(pm).toMatch(/ozet=\{canliDuzenle\?\.set\}/);
    expect(pm).not.toMatch(/reduce\(|\+=/);
  });
  it("AC-38 (dokuz okuyucu): maliyet zincirinin PartManager çağrıları katalogla", () => {
    const pm = kod("src/components/PartManager.jsx");
    // Spec 0132 ile (C1/2): dördüncü parametre malzeme haritasıdır; desenler yeni imzayı arar, iddia (katalog geçer) aynı.
    expect(pm).toMatch(/maliyetGirildiMi\(p, undefined, katalog, malzemeKat\)/);
    expect(pm).toMatch(/maliyetGirildiMi\(k, undefined, katalog, malzemeKat\)/);
    expect(pm).toMatch(/parcaMaliyetMetni\(k, undefined, katalog, malzemeKat\)/);
    expect(pm.match(/maliyetKaynagi\([^)]*katalog, malzemeKat\)/g).length).toBeGreaterThanOrEqual(3);
    expect(pm).toMatch(/set: setMi\(temel\)/);
    expect(kod("src/lib/urunAgaci.js")).toMatch(/set: setMi\(temel\)/);
    // Spec 0124 ile (R9/2, Karar 31): içe aktarmanın geçmiş kapısı dosyadan gelen içeriği de sayar (`setOlacak`).
    expect(kod("src/lib/parcaAktarma.js")).toMatch(/set: setOlacak/);
    expect(kod("src/lib/parcaAktarma.js")).toMatch(/const setOlacak = setMi\(mevcut\) \|\| !!yeniIcerik;/);
    expect(kod("src/lib/makinaStandartMaliyet.js")).toMatch(/parcaMaliyetKurus\(p, tarih, partMap, malzemeKat\)/);
    expect(kod("src/components/settings/SettingsExport.jsx")).toMatch(/parcaDisaAktarmaSatiri\(p, katalog, malzemeKat\)/);
  });
});
