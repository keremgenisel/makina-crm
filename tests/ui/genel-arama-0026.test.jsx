// @vitest-environment jsdom
// Spec 0026: genel aramanın gider modülünü kapsaması. Bileşen (GlobalSearch) yetki bileşimleriyle, saf kurallar
// (aramaGider.js), kaynak taramaları ve gerçek App (tıklayınca doğru ekran, perde inik). Mevcut on bir türün davranışı
// tests/ui/global-search.test.jsx'te dokunulmadan sınanır (AC-13).
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, fireEvent, screen, cleanup, waitFor, within } from "@testing-library/react";
import { readFileSync } from "node:fs";

const perde = vi.hoisted(() => ({ indi: false }));
vi.mock("../../src/lib/yayinPerdesi", () => ({ GIDER_PERDESI: true, giderPerdesiIndi: () => perde.indi }));
const { GlobalSearch, KAT, KAT_SIRA, genelAramaSonuclari } = await import("../../src/components/GlobalSearch");
const { aramaSorgusu, tutarEslesir, tarihEslesir, personelMi, standartGrupSatirlari, kalemEslesmesi } = await import("../../src/lib/aramaGider");
const { turHaritasi } = await import("../../src/lib/gider");
const { default: App } = await import("../../src/App");

afterEach(() => { cleanup(); delete window.crmStorage; delete window.appServer; vi.unstubAllGlobals(); localStorage.clear(); perde.indi = false; });

const TURLER = [{ id: 1, ad: "Hammadde", davranis: "normal" }, { id: 2, ad: "Kira", davranis: "kira" }, { id: 3, ad: "Personel", davranis: "personel" }, { id: 4, ad: "Eski Tür", davranis: "normal" }];
const TED = [
  { id: 11, ad: "Yıldız Döküm", yetkili: "Ayşe Kaya", telefon: "0532 111 22 33", vergiNo: "1234567890", eposta: "info@yildiz.com" },
  { id: 12, ad: "Çöp Tedarikçi", deletedAt: "2026-09-01T00:00:00.000Z" },
];
const GIDER = [
  { id: 101, turId: 1, aciklama: "Bant alımı", tedarikciId: 11, tarih: "2026-03-15", tutar: 20000, kdvOrani: 20, taksitler: [] },
  { id: 102, turId: 1, aciklama: "", tedarikciId: null, tarih: "2026-04-02", tutar: 120000, kdvOrani: 0, taksitler: [] },
  { id: 103, turId: 2, aciklama: "Depo kirası", tarih: "2026-05-01", tutar: 30000, kdvOrani: 0, stopajOrani: 0, girisYonu: "brut",
    taksitler: [{ id: "t1", hedef: "ana", sira: 1, vade: "2026-06-10", tutar: 15000 }, { id: "t2", hedef: "ana", sira: 2, vade: "2026-07-10", tutar: 15000 }] },
  { id: 104, turId: 3, calisanId: 21, calisanAd: "Hasan Çelik", aciklama: "Hasan Çelik", resmiTutar: 31337, eldenTutar: null, tarih: "2026-03-20", taksitler: [] },
  { id: 105, turId: 4, calisanId: 22, aciklama: "Gizli Maaş", tutar: 44444, kdvOrani: 0, tarih: "2026-03-21", taksitler: [] },
  { id: 106, turId: 1, aciklama: "Silinmiş bant", tutar: 5, kdvOrani: 0, tarih: "2026-03-01", deletedAt: "2026-09-01T00:00:00.000Z" },
  { id: 107, turId: 1, aciklama: "Kapanan fatura", tutar: 900, kdvOrani: 0, tarih: "2026-03-02", odendi: true, odemeTarihi: "2026-03-03", _odenen: { ana: 900 } },
  { id: 108, turId: 3, calisanId: 23, calisanAd: "Ali Usta", aciklama: "Usta maaşı", resmiTutar: 25000, tarih: "2026-03-05", taksitler: [] },
];
const TANIM = [
  { id: 201, turId: 1, ad: "Aylık temizlik", tedarikciId: 11, baslangicAy: "2026-01", bitisAy: null },
  { id: 202, turId: 1, ad: "Eski servis", baslangicAy: "2025-01", bitisAy: "2026-02", kapatildi: true },
  { id: 203, turId: 3, ad: "Hasan Çelik", calisanId: 21, baslangicAy: "2026-01" },
  { id: 204, turId: 4, ad: "Gizli Tanım", calisanId: 22, baslangicAy: "2026-01" },
  { id: 205, turId: 3, ad: "Usta maaşı", calisanId: 23, baslangicAy: "2026-01" },
];
const STD = [
  ...["2026-01", "2026-02", "2026-03", "2026-04"].map((a, i) => ({ id: 301 + i, grupId: 301, ad: "Elektrik", tutar: 1000 + i, baslangicAy: a, bitisAy: a })),
  { id: 305, grupId: 301, ad: "Elektrik", tutar: 2000, baslangicAy: "2026-05", bitisAy: null },
  { id: 310, grupId: 310, ad: "Sigorta", tutar: 500, baslangicAy: "2025-01", bitisAy: "2025-12" },
  { id: 320, grupId: 320, ad: "Gelecek Bütçe", tutar: 700, baslangicAy: "2099-01", bitisAy: null },
];
const PARTI = [
  { id: 401, ad: "Yaz Partisi", baslangicAy: "2026-07", bitisAy: "2026-08", aciklama: "AK100 serisi" },
  { id: 402, ad: "Çöp Parti", baslangicAy: "2026-01", deletedAt: "2026-09-01T00:00:00.000Z" },
];
const HESAP = [
  { id: 501, ad: "Ziraat Vadesiz", tur: "banka", paraBirimi: "TRY", acilisBakiyesi: 0, acilisTarihi: "2026-01-01", kapali: false },
  { id: 502, ad: "Eski Kasa", tur: "kasa", paraBirimi: "TRY", acilisBakiyesi: 0, acilisTarihi: "2026-01-01", kapali: true },
];
const CEK = [
  { id: 601, yon: "alinan", paymentId: null, no: "CK-778899", banka: "Vakıfbank", kesideci: "Mehmet Ticaret", tutar: 5000, currency: "TRY", durum: "tahsil", tur: "hamiline", gecmis: [] },
  { id: 602, yon: "verilen", paymentId: null, no: "VR-1001", banka: "Ziraat", alacakliTur: "calisan", alacakliId: 21, alacakliAd: "Hasan Çelik", tutar: 3000, currency: "TRY", hesapId: 501, durum: "odendi", gecmis: [] },
  { id: 603, yon: "verilen", paymentId: null, no: "VR-1002", banka: "Ziraat", alacakliTur: "tedarikci", alacakliId: 11, alacakliAd: "Yıldız Döküm", tutar: 4000, currency: "TRY", hesapId: 501, durum: "yazildi", gecmis: [] },
];

const tamProps = () => ({
  allowedTabs: null, giderYetki: true, kasaYetki: true,
  giderler: GIDER, giderTurleri: TURLER, tedarikciler: TED, standartGiderler: STD, giderTanimlari: TANIM, uretimPartileri: PARTI, kasaHesaplari: HESAP, cekler: CEK,
  onGoGider: vi.fn(), onGoGiderTanim: vi.fn(), onGoKasa: vi.fn(),
});
const norm = (s) => s.replace(/\s+/g, " ").trim();
const ac = (sorgu, ek = {}) => {
  const props = { ...tamProps(), ...ek };
  render(<GlobalSearch {...props} />);
  fireEvent.click(screen.getByTitle("Genel arama (Ctrl+K)"));
  if (sorgu != null) fireEvent.change(screen.getByPlaceholderText(/Müşteri, seri no/), { target: { value: sorgu } });
  return props;
};
// Kategori grubunun sonuç satırları (başlık span'ı → grup kabı).
const grup = (baslik) => {
  const span = screen.queryAllByText(baslik, { selector: "span" }).find(e => e.parentElement?.parentElement?.querySelector("[data-sel]"));
  return span ? [...span.parentElement.parentElement.querySelectorAll("button[data-sel]")].map(b => ({ b, t: norm(b.textContent) })) : [];
};
const sonucMetinleri = () => [...document.querySelectorAll("button[data-sel]")].map(b => norm(b.textContent));

describe("Spec 0026: gider kayıtları aramada", () => {
  it("AC-1: gider kaleminin açıklamasıyla o kalem çıkar", () => {
    ac("Bant alımı");
    expect(grup("Gider Kalemleri").map(r => r.t).some(t => t.startsWith("Bant alımı"))).toBe(true);
  });
  it("AC-2: tür adıyla o türdeki kalemler çıkar; türün kendisi satır olmaz", () => {
    ac("Hammadde");
    const k = grup("Gider Kalemleri").map(r => r.t);
    expect(k.some(t => t.startsWith("Bant alımı"))).toBe(true);
    expect(k.some(t => t.startsWith("Hammadde"))).toBe(true); // açıklamasız kalem (102) başlığı tür adı
    expect(screen.queryByText("Gider Türleri", { selector: "span" })).toBeNull();
  });
  it("AC-3: tedarikçi adıyla hem tedarikçi kaydı hem bağlı kalem çıkar", () => {
    ac("Yıldız");
    expect(grup("Tedarikçiler").map(r => r.t).some(t => t.startsWith("Yıldız Döküm"))).toBe(true);
    expect(grup("Gider Kalemleri").map(r => r.t).some(t => t.startsWith("Bant alımı"))).toBe(true);
  });
  it("AC-4: tekrarlayan tanımın adıyla o tanım çıkar", () => {
    ac("temizlik");
    expect(grup("Tekrarlayan Giderler").map(r => r.t).some(t => t.startsWith("Aylık temizlik"))).toBe(true);
  });
  it("AC-5: standart genel gider adıyla o kayıt çıkar", () => {
    ac("Elektrik");
    expect(grup("Standart Genel Giderler")).toHaveLength(1);
  });
  it("AC-6: personel kalemi çalışan adı, açıklama, tutar ve tarihle bulunmaz", () => {
    for (const q of ["Hasan", "Hasan Çelik", "31337", "31.337", "20.03.2026", "2026-03-20"]) {
      cleanup();
      ac(q);
      expect(grup("Gider Kalemleri")).toHaveLength(0);
      expect(grup("Tekrarlayan Giderler")).toHaveLength(0);
    }
  });
  it("AC-19: tekrarlayan personel kaleminin açıklamasıyla (tanımın adı) sonuç dönmez", () => {
    ac("Usta maaşı");
    expect(sonucMetinleri()).toEqual([]);
  });
  it("AC-20: personel tanımının adıyla sonuç dönmez", () => {
    ac("Hasan Çelik");
    expect(grup("Tekrarlayan Giderler")).toHaveLength(0);
    expect(sonucMetinleri()).toEqual([]);
  });
  it("AC-40: türü personel olmayan ama calisanId taşıyan kalem ve tanım çıkmaz", () => {
    ac("Gizli");
    expect(sonucMetinleri()).toEqual([]);
    const turMap = turHaritasi(TURLER);
    expect(personelMi(GIDER[4], turMap)).toBe(true);
    expect(personelMi(GIDER[0], turMap)).toBe(false);
  });
  it("AC-14 / AC-25: çöpteki kalem, tedarikçi ve parti çıkmaz", () => {
    ac("Silinmiş");
    expect(sonucMetinleri()).toEqual([]);
    cleanup();
    ac("Çöp");
    expect(grup("Tedarikçiler")).toHaveLength(0);
    expect(grup("Üretim Partileri")).toHaveLength(0);
  });
  it("AC-15 / AC-31: taksit vadesiyle bulunur, neden ekrandaki biçimle yazılır", () => {
    ac("10.06.2026");
    const k = grup("Gider Kalemleri").map(r => r.t);
    expect(k).toHaveLength(1);
    expect(k[0]).toContain("Depo kirası");
    expect(k[0]).toContain("taksit vadesi: 10/06/2026");
  });
  it("AC-16: parti adı, açıklaması ve dönemiyle bulunur", () => {
    for (const q of ["Yaz Partisi", "AK100 serisi", "2026-07", "07.2026"]) {
      cleanup();
      ac(q);
      expect(grup("Üretim Partileri").map(r => r.t).some(t => t.startsWith("Yaz Partisi"))).toBe(true);
    }
  });
  it("AC-17 / AC-23: hesap adıyla bulunur; kapalı hesap 'kapalı' ibaresi taşır", () => {
    ac("Ziraat Vadesiz");
    expect(grup("Kasa ve Banka Hesapları")).toHaveLength(1);
    cleanup();
    ac("Eski Kasa");
    const r = grup("Kasa ve Banka Hesapları").map(x => x.t);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatch(/kapalı/);
  });
  it("AC-18: çek numarası, keşidecisi ve bankasıyla bulunur", () => {
    for (const q of ["CK-778899", "Mehmet Ticaret", "Vakıf"]) {
      cleanup();
      ac(q);
      expect(grup("Çekler").map(r => r.t).some(t => t.startsWith("Çek No CK-778899"))).toBe(true);
    }
  });
  it("AC-26: alacaklısı çalışan olan çek numarasıyla bulunur; alacaklı adıyla bulunmaz ve adı yazmaz", () => {
    ac("VR-1001");
    const r = grup("Çekler").map(x => x.t);
    expect(r).toHaveLength(1);
    expect(r[0]).not.toMatch(/Hasan/);
    cleanup();
    ac("Hasan");
    expect(grup("Çekler")).toHaveLength(0);
  });
  it("AC-21: tedarikçi vergi numarasıyla bulunur, e-postasıyla bulunmaz", () => {
    ac("1234567890");
    expect(grup("Tedarikçiler")).toHaveLength(1);
    cleanup();
    ac("info@yildiz");
    expect(grup("Tedarikçiler")).toHaveLength(0);
  });
  it("AC-22: beş sürümlü standart gider tek satır, meta yürürlük ayını yazar", () => {
    ac("Elektrik");
    const r = grup("Standart Genel Giderler").map(x => x.t);
    expect(r).toHaveLength(1);
    expect(r[0]).toContain("yürürlük: 2026-05");
  });
  it("AC-38: bu ay geçerli sürümü olmayan grup da tek satır çıkar ve durumunu yazar", () => {
    ac("Sigorta");
    expect(grup("Standart Genel Giderler").map(x => x.t)).toEqual([expect.stringContaining("sona erdi")]);
    cleanup();
    ac("Gelecek Bütçe");
    expect(grup("Standart Genel Giderler").map(x => x.t)).toEqual([expect.stringContaining("başlamadı")]);
    const g = standartGrupSatirlari(STD, "2026-10");
    expect(g.map(x => [x.grupId, x.temsil.id, x.durum])).toEqual([["301", 305, "gecerli"], ["310", 310, "bitti"], ["320", 320, "baslamadi"]]);
  });
  it("AC-24: kapatılmış tekrarlayan tanım çıkar ve 'kapalı' ibaresi taşır", () => {
    ac("Eski servis");
    const r = grup("Tekrarlayan Giderler").map(x => x.t);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatch(/kapalı/);
  });
  it("AC-29: ekrandaki tarih biçimiyle (ve noktalı, ISO) o tarihli kalem bulunur", () => {
    for (const q of ["15/03/2026", "15.03.2026", "2026-03-15"]) {
      cleanup();
      ac(q);
      expect(grup("Gider Kalemleri").map(r => r.t).some(t => t.startsWith("Bant alımı"))).toBe(true);
    }
  });
  it("AC-30 / AC-39: binlik ayraçlı tutarla bulunur; eşitliktir (20.000 ile 120.000 bulunmaz); metin sorgusu tutara düşmez", () => {
    ac("20.000");
    let k = grup("Gider Kalemleri").map(r => r.t);
    expect(k).toHaveLength(1);
    expect(k[0]).toContain("Bant alımı");
    cleanup();
    ac("24.000"); // Ödenecek (KDV dâhil)
    expect(grup("Gider Kalemleri").map(r => r.t).some(t => t.startsWith("Bant alımı"))).toBe(true);
    cleanup();
    ac("120.000");
    k = grup("Gider Kalemleri").map(r => r.t);
    expect(k).toHaveLength(1);
    expect(k[0]).toMatch(/^Hammadde/);
    const s = aramaSorgusu("20.000");
    expect(tutarEslesir(20000, s)).toBe(true);
    expect(tutarEslesir(120000, s)).toBe(false);
    expect(tutarEslesir(200, s)).toBe(false);
    expect(tutarEslesir(1234.5, aramaSorgusu("1.234,50"))).toBe(true);
    expect(aramaSorgusu("Bant 20").sayisal).toBe(false);
    expect(tarihEslesir("2026-03-15", aramaSorgusu("Bant"))).toBe(false);
  });
  it("AC-32: ad dışı alandan yakalanan kayıtta eşleşme nedeni yazılır", () => {
    ac("Yıldız");
    const k = grup("Gider Kalemleri").map(r => r.t);
    expect(k.find(t => t.startsWith("Bant alımı"))).toContain("tedarikçi: Yıldız Döküm");
    cleanup();
    ac("Ayşe");
    expect(grup("Tedarikçiler")[0].t).toContain("yetkili: Ayşe Kaya");
  });
  it("AC-37: sonuç satırlarında ödeme durumu, ödenen ya da kalan yazmaz; çek durumu yazmaz", () => {
    ac("Kapanan fatura");
    expect(sonucMetinleri().join(" | ")).not.toMatch(/Ödendi|Ödenmedi|Kısmen|kalan|ödenen/i);
    cleanup();
    ac("VR-");
    expect(sonucMetinleri().join(" | ")).not.toMatch(/Ödendi|Yazıldı|Ödenmeyi|kalan/i);
  });
});

describe("Spec 0026: yetki ve kapsam", () => {
  it("AC-10: gider yetkisi olmayan kullanıcıda hiçbir gider sonucu yok", () => {
    ac("Yıldız", { giderYetki: false, kasaYetki: false });
    for (const b of ["Gider Kalemleri", "Tedarikçiler", "Standart Genel Giderler", "Tekrarlayan Giderler", "Üretim Partileri", "Kasa ve Banka Hesapları", "Çekler"]) expect(grup(b)).toHaveLength(0);
  });
  it("AC-27: gider yetkisi olup kasa yetkisi olmayan kullanıcıda hesap ve çek yok, kalem var", () => {
    ac("Ziraat", { kasaYetki: false });
    expect(grup("Kasa ve Banka Hesapları")).toHaveLength(0);
    expect(grup("Çekler")).toHaveLength(0);
    cleanup();
    ac("Bant", { kasaYetki: false });
    expect(grup("Gider Kalemleri").length).toBeGreaterThan(0);
  });
  it("AC-28: Ayarlar sekmesi olmayan gider kullanıcısında tanım yok, standart gider var", () => {
    ac("temizlik", { allowedTabs: ["dashboard", "gider"] });
    expect(grup("Tekrarlayan Giderler")).toHaveLength(0);
    cleanup();
    ac("Elektrik", { allowedTabs: ["dashboard", "gider"] });
    expect(grup("Standart Genel Giderler")).toHaveLength(1);
  });
  it("AC-12 (TY kararı 2026-10-03, R7 geri alındı): boş kutuda ve 'Sonuç bulunamadı' ekranında kapsam listesi çizilmez", () => {
    ac(null);
    expect(screen.getByText("En az 2 karakter yazın.")).toBeTruthy();
    expect(screen.queryByText("Aranan kayıtlar")).toBeNull();
    expect(screen.queryByTestId("arama-kapsami")).toBeNull();
    fireEvent.change(screen.getByPlaceholderText(/Müşteri, seri no/), { target: { value: "zzzzqq" } });
    expect(screen.getByText(/Sonuç bulunamadı\./)).toBeTruthy();
    expect(screen.queryByText("Aranan kayıtlar")).toBeNull();
    expect(screen.queryByText(/Gider Kalemleri/)).toBeNull();
  });
  it("AC-33: yeni kategoriler KAT_SIRA'nın sonunda ve R15 sırasında; ilk on bir aynı", () => {
    expect(KAT_SIRA.slice(0, 11)).toEqual(["musteriler", "servisler", "belgeler", "bayiler", "makinalar", "yedekParcalar", "kaliplar", "uretimler", "dosyalar", "notlar", "calisanlar"]);
    expect(KAT_SIRA.slice(11)).toEqual(["giderler", "tedarikciler", "standartGiderler", "giderTanimlari", "uretimPartileri", "kasaHesaplari", "cekler"]);
  });
  it("AC-35: kategori tablosunun anahtar kümesi sonuç nesnesinin anahtar kümesine eşit", () => {
    const sonuc = genelAramaSonuclari("ab", {}, { izinli: () => true });
    expect(Object.keys(sonuc).sort()).toEqual(Object.keys(KAT).sort());
    expect([...KAT_SIRA].sort()).toEqual(Object.keys(KAT).sort());
  });
  it("AC-36: sonuç tek useMemo içinde üretilir; ödeme motoru çağrılmaz", () => {
    const gs = readFileSync("src/components/GlobalSearch.jsx", "utf-8");
    const lib = readFileSync("src/lib/aramaGider.js", "utf-8");
    expect(gs.match(/useMemo\(/g)).toHaveLength(1);
    expect(gs).toMatch(/useMemo\(\(\) => genelAramaSonuclari\(/);
    for (const kaynak of [gs, lib]) {
      expect(kaynak).not.toMatch(/odemeleriUygula\(/);
      expect(kaynak).not.toMatch(/_odenen|\.odendi\b|odemeTarihi/);
    }
  });
  it("tıklama yönlendiricileri (R3, R18): kalem kendi metniyle, tanım kimlikle, hesap ve çek Kasa'ya", () => {
    const p = ac("20.000");
    fireEvent.click(grup("Gider Kalemleri")[0].b);
    expect(p.onGoGider).toHaveBeenCalledWith({ gorunum: "rapor", ay: "2026-03", kalemFiltresi: { ara: "Bant alımı" } });
    cleanup();
    const p2 = ac("120.000");
    fireEvent.click(grup("Gider Kalemleri")[0].b);
    expect(p2.onGoGider).toHaveBeenCalledWith({ gorunum: "rapor", ay: "2026-04", kalemFiltresi: { tur: "1" } });
    cleanup();
    const p3 = ac("temizlik");
    fireEvent.click(grup("Tekrarlayan Giderler")[0].b);
    expect(p3.onGoGiderTanim).toHaveBeenCalledWith(201);
    cleanup();
    const p4 = ac("VR-1001");
    fireEvent.click(grup("Çekler")[0].b);
    expect(p4.onGoKasa).toHaveBeenCalledWith({ gorunum: "cek", cekYon: "verilen" });
  });
});

// Triyaj (2026-10-03) bulguları.
describe("Spec 0026 triyaj", () => {
  const MART = { id: 901, turId: 1, aciklama: "Mart faturası", tarih: "2026-03-10", tutar: 111, kdvOrani: 0, taksitler: [] };
  const EKIM = { id: 902, turId: 1, aciklama: "Ekim faturası", tarih: "2026-10-03", tutar: 222, kdvOrani: 0, taksitler: [] };
  it("AC-42 (triyaj bulgu 1): kısmi tarih ters sırayla eşleşmez ('10.03' 10 Mart'ı bulur, 3 Ekim'i bulmaz); yıl başlı sorgu ISO'da aranır", () => {
    for (const q of ["10.03", "10/03"]) {
      cleanup();
      ac(q, { giderler: [MART, EKIM] });
      const k = grup("Gider Kalemleri").map(r => r.t);
      expect(k).toHaveLength(1);
      expect(k[0]).toContain("Mart faturası");
      expect(k[0]).toContain("tarih: 10/03/2026");
    }
    cleanup();
    ac("2026-10", { giderler: [MART, EKIM] });
    expect(grup("Gider Kalemleri").map(r => r.t)).toEqual([expect.stringContaining("Ekim faturası")]);
    expect(tarihEslesir("2026-10-03", aramaSorgusu("10.03"))).toBe(false);
    expect(tarihEslesir("2026-03-10", aramaSorgusu("10.03"))).toBe(true);
    expect(tarihEslesir("2026-07", aramaSorgusu("07.2026"))).toBe(true);
  });
  it("AC-43 (triyaj bulgu 3): yürürlük öncesi tarihli kalem aramada çıkmaz (eşik borç özetiyle aynı); yürürlük yoksa çıkar", () => {
    const ESKI = { id: 903, turId: 1, aciklama: "Eski fatura", tarih: "2025-12-31", tutar: 50, kdvOrani: 0, taksitler: [] };
    const ILK = { id: 904, turId: 1, aciklama: "İlk ay faturası", tarih: "2026-01-01", tutar: 60, kdvOrani: 0, taksitler: [] };
    ac("fatura", { giderler: [ESKI, ILK], yururlukAy: "2026-01" });
    expect(grup("Gider Kalemleri").map(r => r.t)).toEqual([expect.stringContaining("İlk ay faturası")]);
    cleanup();
    ac("fatura", { giderler: [ESKI, ILK] });
    expect(grup("Gider Kalemleri")).toHaveLength(2);
  });
  it("triyaj bulgu 4: metin sorgusunda tutar hesaplanmaz; ilk eşleşen alanda durulur", () => {
    let okuma = 0;
    const k = { id: 905, turId: 1, aciklama: "Bant alımı", tarih: "2026-03-15", kdvOrani: 0, taksitler: [] };
    Object.defineProperty(k, "tutar", { get: () => { okuma++; return 100; }, enumerable: true });
    const ctx = { turMap: turHaritasi(TURLER), tedMap: new Map() };
    expect(kalemEslesmesi(k, aramaSorgusu("Bant"), ctx)).toEqual({ neden: null });
    expect(kalemEslesmesi(k, aramaSorgusu("zzzz"), ctx)).toBeNull();
    expect(kalemEslesmesi(k, aramaSorgusu("15.03.2026"), ctx)).toEqual({ neden: "tarih: 15/03/2026" });
    expect(okuma).toBe(0);
    expect(kalemEslesmesi(k, aramaSorgusu("100"), ctx)).toEqual({ neden: "tutar: 100 ₺" });
    expect(okuma).toBeGreaterThan(0);
  });
});

// ── Gerçek App ───────────────────────────────────────────────────────────────
const veri = () => ({
  customers: [], giderTurleri: TURLER, tedarikciler: TED, giderler: GIDER, giderTanimlari: TANIM, standartGiderler: STD,
  uretimPartileri: PARTI, kasaHesaplari: HESAP, cekler: CEK, hesapHareketleri: [],
  calisanlar: [{ id: 21, ad: "Hasan Çelik", resmiMaliyet: 30000 }],
  appSettings: { giderAyarlari: { yururlukAy: "2026-01", hatirlatmaEsikGun: 7 } },
  dataVersion: 1,
});
const baslat = async ({ sunucu = null, ekGider = [] } = {}) => {
  const yuklenen = veri();
  yuklenen.giderler = [...yuklenen.giderler, ...ekGider];
  window.crmStorage = { load: vi.fn(async () => structuredClone(yuklenen)), save: vi.fn(async () => true), getVersion: vi.fn(async () => 1) };
  if (sunucu) {
    const t = { getConfig: async () => ({ serverUrl: "http://10.0.0.2:3000", isActive: true, role: "user", permissions: JSON.stringify(sunucu), username: "u" }) };
    window.appServer = new Proxy(t, { get: (o, k) => o[k] ?? (String(k).startsWith("on") ? () => () => {} : async () => null) });
  }
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("test: ağ yok"))));
  render(<App />);
  await waitFor(() => expect(window.crmStorage.load).toHaveBeenCalled());
  await waitFor(() => expect(screen.getAllByText("Anasayfa").length).toBeGreaterThan(0));
  await new Promise(r => setTimeout(r, 800));
};
const appAra = (q) => {
  fireEvent.click(screen.getByTitle("Genel arama (Ctrl+K)"));
  fireEvent.change(screen.getByPlaceholderText(/Müşteri, seri no/), { target: { value: q } });
};
const secili = (rol, ad) => screen.getByRole(rol, { name: ad }).getAttribute(rol === "radio" ? "aria-checked" : "aria-selected");

describe("Spec 0026: gerçek App", () => {
  it("AC-7: kalem sonucu Giderler › Dönem Raporu'nu kalemin ayında, süzgeç kaydın metniyle açar; tutarla bulunan kalem listede", async () => {
    await baslat();
    appAra("24.000");
    fireEvent.click(grup("Gider Kalemleri")[0].b);
    expect(secili("radio", "Dönem Raporu")).toBe("true");
    expect(screen.getByLabelText("Dönem ayı").value).toBe("2026-03");
    expect(screen.getByLabelText("Açıklama ara").value).toBe("Bant alımı");
    expect(within(screen.getByTestId("kalem-listesi")).getByText(/Bant alımı/)).toBeTruthy();
    // Tür adıyla bulunan açıklamasız, tedarikçisiz kalem: tür süzgeci kurulur, kalem listede görünür.
    appAra("120.000");
    fireEvent.click(grup("Gider Kalemleri")[0].b);
    expect(screen.getByLabelText("Dönem ayı").value).toBe("2026-04");
    expect(screen.getByLabelText("Tür filtresi").value).toBe("1");
    expect(screen.getByLabelText("Açıklama ara").value).toBe("");
    expect(within(screen.getByTestId("kalem-listesi")).getAllByText(/120\.000/).length).toBeGreaterThan(0);
  });
  it("AC-8 / AC-9: tedarikçi → Tedarikçiler, standart → Standart Genel Giderler, tanım → Ayarlar › Tekrarlayan Giderler", async () => {
    await baslat();
    appAra("1234567890");
    fireEvent.click(grup("Tedarikçiler")[0].b);
    expect(secili("radio", "Tedarikçiler")).toBe("true");
    appAra("Elektrik");
    fireEvent.click(grup("Standart Genel Giderler")[0].b);
    expect(secili("radio", "Standart Genel Giderler")).toBe("true");
    appAra("temizlik");
    fireEvent.click(grup("Tekrarlayan Giderler")[0].b);
    await waitFor(() => expect(screen.getAllByText("Tekrarlayan Giderler").length).toBeGreaterThan(1));
    expect(screen.getByText("Aylık temizlik")).toBeTruthy();
  });
  it("AC-41: hesap sonucu Kasa'yı o hesap seçili açar; çek sonucu Çek Portföyü'nü yönünde ve 'Tümü' süzgeciyle açar", async () => {
    await baslat();
    appAra("Eski Kasa");
    fireEvent.click(grup("Kasa ve Banka Hesapları")[0].b);
    expect(screen.getByText("Eski Kasa · hareketler")).toBeTruthy();
    appAra("VR-1001");
    fireEvent.click(grup("Çekler")[0].b);
    expect(secili("tab", "Çek Portföyü")).toBe("true");
    expect(secili("tab", "Verilen çekler")).toBe("true");
    expect(within(screen.getByRole("group", { name: "Verilen çek süzgeci" })).getByRole("button", { name: "Tümü" }).getAttribute("aria-pressed")).toBe("true");
    appAra("CK-778899");
    fireEvent.click(grup("Çekler")[0].b);
    expect(secili("tab", "Alınan çekler")).toBe("true");
    expect(within(screen.getByRole("group", { name: "Çek durumu süzgeci" })).getByRole("button", { name: "Tümü" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("CK-778899")).toBeTruthy();
  });
  it("AC-43 (triyaj bulgu 3, gerçek App): App yürürlük ayını aramaya geçirir; yürürlük öncesi kalem çıkmaz", async () => {
    await baslat({ ekGider: [{ id: 950, turId: 1, aciklama: "Yürürlük öncesi bant", tarih: "2025-11-05", tutar: 77, kdvOrani: 0, taksitler: [] }] });
    appAra("bant");
    const k = grup("Gider Kalemleri").map(r => r.t);
    expect(k.some(t => t.startsWith("Bant alımı"))).toBe(true);
    expect(k.some(t => t.includes("Yürürlük öncesi"))).toBe(false);
  });
  it("AC-10: gider sekmesi olmayan kullanıcıda gider sonucu yok (gerçek App)", async () => {
    await baslat({ sunucu: { tabs: ["dashboard", "customers", "settings"] } });
    appAra("Yıldız");
    expect(grup("Gider Kalemleri")).toHaveLength(0);
    expect(grup("Tedarikçiler")).toHaveLength(0);
    // Denetim: gider sekmeli kullanıcıda aynı sorgu sonuç verir.
    cleanup();
    await baslat({ sunucu: { tabs: ["dashboard", "customers", "settings", "gider"] } });
    appAra("Yıldız");
    expect(grup("Gider Kalemleri").length).toBeGreaterThan(0);
  });
  it("AC-11: yayın perdesi inikken gider, hesap ve çek sonucu yok", async () => {
    perde.indi = true;
    await baslat();
    appAra("Yıldız");
    expect(sonucMetinleri()).toEqual([]);
    fireEvent.change(screen.getByPlaceholderText(/Müşteri, seri no/), { target: { value: "VR-1001" } });
    expect(sonucMetinleri()).toEqual([]);
    // Denetim: aynı veri ve sorgu perde kalkıkken sonuç verir (test boşuna geçmiyor).
    cleanup();
    perde.indi = false;
    await baslat();
    appAra("Yıldız");
    expect(grup("Gider Kalemleri").length).toBeGreaterThan(0);
    expect(grup("Çekler").length).toBeGreaterThan(0);
  });
});

describe("Spec 0078 AC-38: çöpteki personel türü arama gizliliğini delmez", () => {
  it("AC-38: personel türü çöpteyken de kalemi personel sayılır ve aramada çıkmaz (harita ham listeden)", () => {
    const copteTurler = TURLER.map(t => (t.id === 3 ? { ...t, deletedAt: "2026-10-07T09:00:00.000Z" } : t));
    const turMap = turHaritasi(copteTurler);
    const kalem = { id: 104, turId: 3, aciklama: "Hasan Çelik", resmiTutar: 31337, tarih: "2026-03-20", taksitler: [] };
    expect(personelMi(kalem, turMap)).toBe(true);
    expect(kalemEslesmesi(kalem, aramaSorgusu("Hasan"), { turMap, tedMap: new Map() })).toBeNull();
    // App türleri GlobalSearch'e ham verir; GlobalSearch haritayı süzmeden kurar.
    expect(readFileSync("src/components/GlobalSearch.jsx", "utf8")).toMatch(/turHaritasi\(v\.giderTurleri \|\| \[\]\)/);
  });
});
