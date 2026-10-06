// @vitest-environment jsdom
// Spec 0070 (arayüz): çalışan kartında SGK ve yol parası, gider formunun personel dalı, borç özetinde SGK satırı ve toplu ödeme.
process.env.TZ = "Europe/Istanbul";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, within, act } from "@testing-library/react";
import { useState } from "react";
import { CalisanManager } from "../../src/components/CalisanManager";
import { GiderForm } from "../../src/components/GiderForm";
import { Giderler } from "../../src/components/Giderler";
import { SettingsGiderTanimlari } from "../../src/components/settings/SettingsGiderTanimlari";
import { giderKalemDogrula, turHaritasi, HEDEF } from "../../src/lib/gider";

afterEach(() => { cleanup(); vi.useRealTimers(); delete window.crmLocks; delete window.appServer; });
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-10-06T10:00:00")); });

const TURLER = [{ id: 1, ad: "Kira", davranis: "kira" }, { id: 3, ad: "Personel", davranis: "personel" }, { id: 4, ad: "Elektrik", davranis: "normal" }];
const turMap = turHaritasi(TURLER);
const CAL = [{ id: 21, ad: "Hasan Çelik", resmiMaliyet: 30000, sgkMaliyet: 9000, eldenMaliyet: 10000, yolParasiMaliyet: 1000 }, { id: 22, ad: "Zeynep Arslan", resmiMaliyet: 25000, eldenMaliyet: 5000 }];

describe("Spec 0070 A: çalışan kartı", () => {
  function H({ c0 = CAL, onState }) {
    const [calisanlar, setCalisanlar] = useState(c0);
    onState?.(calisanlar);
    return <CalisanManager calisanlar={calisanlar} setCalisanlar={setCalisanlar} giderYetki maliyetDuzenleyebilir showToast={vi.fn()} />;
  }
  it("AC-1, AC-3: satır içi girişte sıra resmi, SGK, elden, yol parası; düzenleme penceresinde de aynı alanlar", () => {
    render(<H />);
    const etiketler = [...document.querySelectorAll("input[aria-label]")].map(i => i.getAttribute("aria-label")).filter(a => ["Resmi işveren maliyeti", "SGK", "Elden ödenen", "Yol parası"].includes(a));
    expect(etiketler).toEqual(["Resmi işveren maliyeti", "SGK", "Elden ödenen", "Yol parası"]);
    fireEvent.click(screen.getAllByRole("button").find(b => b.className.includes("ghost")));
    const pencere = screen.getByText("Çalışanı Düzenle").closest("div").parentElement;
    for (const a of ["Resmi işveren maliyeti", "SGK", "Elden ödenen", "Yol parası"]) expect(within(document.body).getAllByLabelText(a).length).toBeGreaterThanOrEqual(2);
    expect(pencere).toBeTruthy();
  });
  it("AC-4: resmi alanının etiketi artık SGK'yı kapsadığını söylemez", () => {
    render(<H />);
    fireEvent.click(screen.getAllByRole("button").find(b => b.className.includes("ghost")));
    expect(screen.queryByText(/SGK dahil/)).toBeNull();
    expect(screen.getAllByText("Resmi işveren maliyeti").length).toBeGreaterThan(0);
  });
  it("AC-24: yalnız SGK girilmiş çalışan sayı olarak normalize edilir", () => {
    let st;
    render(<H c0={[]} onState={s => { st = s; }} />);
    fireEvent.change(screen.getByPlaceholderText("Ad Soyad"), { target: { value: "Ali Veli" } });
    fireEvent.change(screen.getByLabelText("Resmi işveren maliyeti"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("SGK"), { target: { value: "8.500" } });
    fireEvent.click(screen.getByText("Ekle"));
    expect(st[0]).toMatchObject({ ad: "Ali Veli", sgkMaliyet: 8500, resmiMaliyet: null, eldenMaliyet: null, yolParasiMaliyet: null });
  });
  it("AC-25: aylık toplam dört bileşeni toplar ve ipucu dört bileşeni sayar", () => {
    render(<H />);
    expect(screen.getAllByTestId("calisan-aylik-toplam").map(t => t.textContent)).toEqual(["50.000 ₺", "30.000 ₺"]);
    expect(screen.getByText(/Gider tutarı = resmi \+ SGK \+ elden \+ yol parası/)).toBeTruthy();
  });
});

const formAc = (props = {}) => {
  const onSave = vi.fn();
  render(<GiderForm giderTurleri={TURLER} tedarikciler={[]} calisanlar={CAL} giderAyarlari={{}} onSave={onSave} onCancel={vi.fn()} {...props} />);
  return onSave;
};
const tur = (id) => fireEvent.change(screen.getByLabelText("Gider türü *"), { target: { value: String(id) } });

describe("Spec 0070 B, C: gider formunun personel dalı", () => {
  it("AC-26: SGK notu yenilenmiştir (kendi kutusu, ayrı gider kalemi değil)", () => {
    formAc();
    tur(3);
    const not = screen.getByTestId("personel-sgk-notu").textContent;
    expect(not).toMatch(/SGK'yı kendi kutusuna yazın/);
    expect(not).toMatch(/ayrı bir gider kalemi değildir/);
    expect(screen.queryByText(/Girilen tutar SGK ve işsizlik primlerini içerir/)).toBeNull();
  });
  it("AC-6 (form), AC-7: çalışan seçilince dört bileşen dolar; toplam dördü toplar; SGK vadesi satırda saklanır", () => {
    const onSave = formAc();
    tur(3);
    fireEvent.change(screen.getByLabelText("Çalışan *"), { target: { value: "21" } });
    expect(["Resmi işveren maliyeti", "SGK", "Elden ödenen", "Yol parası"].map(a => screen.getByLabelText(a).value)).toEqual(["30.000", "9.000", "10.000", "1.000"]);
    expect(screen.getByTestId("personel-toplam").textContent).toBe("50.000 ₺");
    fireEvent.change(screen.getByLabelText("SGK vadesi"), { target: { value: "2026-10-20" } });
    fireEvent.click(screen.getByText("Kaydet"));
    const k = onSave.mock.calls[0][0];
    expect(k).toMatchObject({ resmiTutar: 30000, sgkTutar: 9000, eldenTutar: 10000, yolParasi: 1000 });
    expect(k.taksitler.find(t => t.hedef === HEDEF.SGK)).toMatchObject({ vade: "2026-10-20", tutar: 9000 });
    expect(k).not.toHaveProperty("sgkVade");
  });
  it("AC-28, AC-15: yol parası varken elden bloğunda ipucu; SGK bloğunun adı tek tablodan; yol parası yokken ipucu yok", () => {
    formAc();
    tur(3);
    fireEvent.change(screen.getByLabelText("Çalışan *"), { target: { value: "21" } });
    expect(screen.getByTestId("yol-parasi-ipucu").textContent).toBe("Yol parası bu tutarın içindedir.");
    expect(screen.getByLabelText("SGK'ya ödendi")).toBeTruthy();
    expect(screen.getByLabelText("Maaş (elden) ödendi")).toBeTruthy(); // hedef adı değişmez (B-8)
    fireEvent.change(screen.getByLabelText("Yol parası"), { target: { value: "" } });
    expect(screen.queryByTestId("yol-parasi-ipucu")).toBeNull();
  });
  it("AC-14: SGK hedefinde çek seçeneği yoktur ve nedeni mevcut sabitten yazılır", () => {
    formAc({ ciroYetkisi: true, hesapSecimi: true, hesaplar: [{ id: 501, ad: "Ziraat", tur: "banka", paraBirimi: "TRY" }] });
    tur(3);
    fireEvent.change(screen.getByLabelText("Çalışan *"), { target: { value: "21" } });
    fireEvent.click(screen.getByLabelText("SGK'ya ödendi"));
    const yontem = screen.getByLabelText("SGK'ya ödeme yöntemi");
    expect([...yontem.querySelectorAll("option")].map(o => o.textContent)).not.toEqual(expect.arrayContaining(["Çek (ciro)"]));
    expect(screen.getByText("SGK'ya çekle ödeme yapılmaz; çek yalnız ana alacaklıya verilir.")).toBeTruthy();
  });
  it("AC-42: avanstan mahsup kipinde SGK hedefi listelenmez", () => {
    let n = 300;
    const k = giderKalemDogrula({ id: 77, tarih: "2026-09-30", turId: 3, calisanId: 21, calisanAd: "Hasan Çelik", resmiTutar: "30000", sgkTutar: "9000", eldenTutar: "10000", sonOdemeTarihi: "2026-10-05" },
      { turMap, uid: () => ++n }).kayit;
    formAc({ kalem: k, hareketler: [{ id: 1, tur: "avans", calisanId: 21, tutar: 2000, tarih: "2026-09-01" }], giderler: [k], hareketBolumu: true });
    fireEvent.click(screen.getByRole("button", { name: "Avanstan mahsup" }));
    const secenekler = [...screen.getByLabelText("Mahsup bölümü").querySelectorAll("option")].map(o => o.textContent);
    expect(secenekler.length).toBeGreaterThan(0);
    expect(secenekler.some(t => t.startsWith("SGK"))).toBe(false);
  });
  it("AC-27: tekrarlayan tanım formunda SGK ve yol parası alanı yoktur", () => {
    render(<SettingsGiderTanimlari giderTanimlari={[]} setGiderTanimlari={vi.fn()} giderTurleri={TURLER} calisanlar={CAL} showToast={vi.fn()} />);
    fireEvent.click(screen.getByText("Yeni Tanım"));
    fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: "3" } });
    expect(screen.queryByLabelText("SGK")).toBeNull();
    expect(screen.queryByLabelText("Yol parası")).toBeNull();
  });
});

// ── Borç özeti, toplu ödeme, kalem listesi (gerçek Giderler) ────────────────
let m = 5000;
const k = (f) => { const r = giderKalemDogrula(f, { turMap, tedarikciler: [], uid: () => ++m }); if (r.hatalar.length) throw new Error(JSON.stringify(r.hatalar)); return r.kayit; };
const A = k({ id: 1, tarih: "2026-10-01", turId: 3, calisanId: 21, calisanAd: "Hasan Çelik", resmiTutar: "30000", sgkTutar: "9000", eldenTutar: "10000", yolParasi: "1000", sonOdemeTarihi: "2026-10-05", sgkVade: "2026-10-15" });
const B = k({ id: 2, tarih: "2026-10-01", turId: 3, calisanId: 22, calisanAd: "Zeynep Arslan", resmiTutar: "25000", sgkTutar: "7000", eldenTutar: "5000", sonOdemeTarihi: "2026-10-05" });
const YALNIZ_SGK = k({ id: 3, tarih: "2026-10-02", turId: 3, calisanId: 22, calisanAd: "Zeynep Arslan", resmiTutar: "", sgkTutar: "500", eldenTutar: "", sonOdemeTarihi: "2026-10-05" });
const HESAP = { id: 501, ad: "Ziraat", tur: "banka", paraBirimi: "TRY", acilisBakiyesi: 100000, acilisTarihi: "2026-01-01" };
function GH({ g0 = [A, B], perms = null, onState }) {
  const [giderler, setGiderler] = useState(g0);
  const [hesapHareketleri, setHesapHareketleri] = useState([]);
  onState?.({ hesapHareketleri });
  return <Giderler giderler={giderler} setGiderler={setGiderler} hesapHareketleri={hesapHareketleri} setHesapHareketleri={setHesapHareketleri} giderTanimlari={[]} setGiderTanimlari={vi.fn()}
    giderTurleri={TURLER} tedarikciler={[]} setTedarikciler={vi.fn()} standartGiderler={[]} setStandartGiderler={vi.fn()} calisanlar={CAL} standardModels={[]} customModels={[]}
    appSettings={{ giderAyarlari: { yururlukAy: "2026-01" } }} serverPermissions={perms} kasaHesaplari={[HESAP]} kasaYetki aktifKullanici="kerem"
    satisVerisi={{ customers: [], services: [], partSales: [], payments: [], teklifler: [], dealers: [], yedekParcaSatislar: [] }} showToast={vi.fn()} />;
}
const borcSatiri = (ad) => within(screen.getByTestId("borc-ozeti")).getAllByText(ad).map(e => e.closest("div[style]").parentElement)[0];

describe("Spec 0070 D: borç özeti ve toplu SGK ödemesi", () => {
  it("AC-16: borç özetinde SGK tek satır, 'Kurum' rozeti; çalışan adı yok", () => {
    render(<GH />);
    const ozet = screen.getByTestId("borc-ozeti");
    expect(within(ozet).getByText("Kurum")).toBeTruthy();
    expect(within(ozet).getAllByText("SGK").length).toBe(1);
    const satir = within(ozet).getByText("Kurum").closest("div").parentElement.parentElement;
    expect(satir.textContent).toMatch(/16\.000 ₺/);
    expect(satir.textContent).not.toMatch(/Hasan|Zeynep/);
  });
  it("AC-18: 'SGK'yı Öde' gider_odeme ile görünür, yoksa görünmez", () => {
    render(<GH perms={{ role: "user", permissions: JSON.stringify({ tabs: ["gider"], giderActions: ["gider_edit"] }) }} />);
    expect(screen.queryByRole("button", { name: "SGK'yı Öde" })).toBeNull();
    cleanup();
    render(<GH />);
    expect(screen.getByRole("button", { name: "SGK'yı Öde" })).toBeTruthy();
  });
  it("AC-18, AC-33, AC-20: pencere ayları kişi sayısıyla listeler (ad yok); tek kayıtta kalem başına hareket, SGK satırı kapanır", () => {
    let st;
    render(<GH onState={s => { st = s; }} />);
    fireEvent.click(screen.getByRole("button", { name: "SGK'yı Öde" }));
    const p = screen.getByTestId("sgk-toplu-odeme");
    expect([...within(p).getByLabelText("SGK ayı").querySelectorAll("option")].map(o => o.textContent)).toEqual(["Ekim 2026 · 2 kişi · 16.000 ₺"]);
    expect(p.textContent).not.toMatch(/Hasan|Zeynep/);
    fireEvent.change(within(p).getByLabelText("Hesap"), { target: { value: "501" } });
    fireEvent.click(screen.getByText("Ödemeyi Kaydet"));
    expect(st.hesapHareketleri).toHaveLength(2);
    expect(st.hesapHareketleri.every(h => h.hesapId === 501 && h.tur === "odeme" && h.taksitId != null)).toBe(true);
    expect(st.hesapHareketleri.map(h => h.tutar).sort()).toEqual([7000, 9000]);
    expect(within(screen.getByTestId("borc-ozeti")).queryByText("Kurum")).toBeNull();
  });
  it("AC-34: kapsamdaki bir kalem başkasında kilitliyse hiçbiri yazılmaz ve kilit sahibi söylenir", async () => {
    window.crmLocks = { list: vi.fn(async () => [{ entity_type: "gider", entity_id: "2", locked_by: "ayse" }]), acquire: vi.fn(async () => ({ ok: true })), release: vi.fn(async () => {}), releaseAll: vi.fn(async () => {}) };
    window.appServer = { onLocksChanged: () => () => {} };
    let st;
    render(<GH onState={s => { st = s; }} />);
    fireEvent.click(screen.getByRole("button", { name: "SGK'yı Öde" }));
    await act(async () => {});
    fireEvent.click(screen.getByText("Ödemeyi Kaydet"));
    expect(st.hesapHareketleri).toEqual([]);
    expect(screen.getByTestId("sgk-odeme-hata").textContent).toMatch(/"ayse"/);
  });
  it("AC-23, AC-43: personel ayrıntısı varsayılan kapalı; açılınca SGK ve yol parası sütunları satır toplamıyla tutar", () => {
    render(<GH />);
    expect(screen.queryByTestId("personel-ayrinti")).toBeNull();
    fireEvent.click(screen.getAllByRole("button").find(b => b.textContent.trim() === "▸ Aç"));
    const ayr = screen.getByTestId("personel-ayrinti");
    expect(ayr.textContent).toMatch(/SGK/);
    expect(ayr.textContent).toMatch(/Yol parası/);
    const hasan = within(ayr).getAllByTestId("personel-ayrinti-calisan").find(e => e.textContent.includes("Hasan"));
    expect(hasan.textContent).toMatch(/30\.000 ₺9\.000 ₺10\.000 ₺1\.000 ₺—50\.000 ₺/);
  });
  it("AC-41: yalnız SGK'lı kalem 'Tutar girilmedi' rozeti almaz ve ödeme hücresi '—' değildir", () => {
    render(<GH g0={[A, YALNIZ_SGK]} />);
    fireEvent.click(screen.getByText(/Çalışanları göster/));
    expect(screen.queryAllByTestId("tutar-girilmedi")).toHaveLength(0);
    expect(screen.queryAllByTestId("odeme-hucre-tutarsiz")).toHaveLength(0);
  });
});
