// @vitest-environment jsdom
// Spec 0061 (arayüz): Giderler › Dönem Raporu'nun "Açık kalemler (tüm dönemler)" kipi. Gerçek Giderler bileşeni; saat ve
// saat dilimi sabit (R25).
process.env.TZ = "Europe/Istanbul";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, within, act } from "@testing-library/react";
import { useState } from "react";
import { Giderler } from "../../src/components/Giderler";
import { giderKalemDogrula, turHaritasi, HEDEF } from "../../src/lib/gider";

afterEach(() => { cleanup(); vi.useRealTimers(); });
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-10-02T10:00:00")); });

const TURLER = [{ id: 1, ad: "Kira", davranis: "kira" }, { id: 3, ad: "Personel", davranis: "personel" }, { id: 4, ad: "Hammadde", davranis: "normal" }];
const turMap = turHaritasi(TURLER);
const TED = [{ id: 11, ad: "Yıldız Gayrimenkul" }, { id: 12, ad: "Demir Bant" }];
const CAL = [{ id: 21, ad: "Hasan Çelik" }];
let n = 7000;
const k = (f) => { const r = giderKalemDogrula(f, { turMap, tedarikciler: TED, uid: () => ++n }); if (r.hatalar.length) throw new Error(JSON.stringify(r.hatalar)); return r.kayit; };
const VADESIZ = k({ id: 1, tarih: "2026-06-15", turId: 4, tutar: 4000, kdvOrani: 0, tedarikciId: 12, aciklama: "Eski sac" });
const KIRA = k({ id: 3, tarih: "2026-08-01", turId: 1, girisYonu: "brut", tutar: 20000, stopajOrani: 20, kdvOrani: 0, tedarikciId: 11, aciklama: "Ağustos kirası", sonOdemeTarihi: "2026-08-10" });
const PERS = k({ id: 4, tarih: "2026-09-30", turId: 3, calisanId: 21, calisanAd: "Hasan Çelik", resmiTutar: 30000, eldenTutar: 10000, sonOdemeTarihi: "2026-10-05" });
const YENI = k({ id: 5, tarih: "2026-09-20", turId: 4, tutar: 1000, kdvOrani: 0, tedarikciId: 12, aciklama: "Bant", sonOdemeTarihi: "2026-09-30" });
// Bu ayın kalemi: Dönem Raporu dolu çizilsin (ödeme süzgeci ve dönem kartları görünsün).
const BU_AY = k({ id: 6, tarih: "2026-10-01", turId: 4, tutar: 500, kdvOrani: 0, tedarikciId: 12, aciklama: "Ekim bandı", sonOdemeTarihi: "2026-10-25" });
const HEPSI = [VADESIZ, KIRA, PERS, YENI, BU_AY];
const ODEMESIZ = { role: "user", permissions: JSON.stringify({ tabs: ["gider"], giderActions: ["gider_edit"] }) };

function H({ g0 = HEPSI, perms = null, onState }) {
  const [giderler, setGiderler] = useState(g0);
  const [hesapHareketleri, setHesapHareketleri] = useState([]);
  onState?.({ hesapHareketleri });
  return <Giderler giderler={giderler} setGiderler={setGiderler} hesapHareketleri={hesapHareketleri} setHesapHareketleri={setHesapHareketleri} giderTanimlari={[]} setGiderTanimlari={vi.fn()}
    giderTurleri={TURLER} tedarikciler={TED} setTedarikciler={vi.fn()} standartGiderler={[]} setStandartGiderler={vi.fn()} calisanlar={CAL} standardModels={[]} customModels={[]}
    appSettings={{ giderAyarlari: { yururlukAy: "2026-01" } }} serverPermissions={perms} kasaHesaplari={[]}
    satisVerisi={{ customers: [], services: [], partSales: [], payments: [], teklifler: [], dealers: [], yedekParcaSatislar: [] }} showToast={vi.fn()} />;
}
const ac = () => fireEvent.click(screen.getByTestId("acik-kalemler-dugmesi"));
const satirlar = () => screen.queryAllByTestId("acik-kalem-satiri");
const kova = (ad) => screen.getAllByTestId("kova-karti").find(b => b.textContent.startsWith(ad));
const tl = (s) => s.replace(/[^\d,]/g, "");

describe("Spec 0061 A: kip", () => {
  it("AC-1 / AC-2 / AC-25: kip açılıp kapanır; dönem seçici pasif, ibare var, borç kartı kalır, dönem kartları ve KalemListesi yok", () => {
    render(<H />);
    expect(screen.getByText("Toplam gider (KDV hariç)")).toBeTruthy();
    ac();
    expect(screen.getByTestId("acik-kalemler-dugmesi").getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("group", { name: /açık kalemlerde devre dışı/ }).disabled).toBe(true);
    expect(screen.getByTestId("acik-kalemler-modu")).toBeTruthy();
    expect(screen.getByText("Kime Ne Kadar Borçluyuz")).toBeTruthy();
    expect(screen.queryByText("Toplam gider (KDV hariç)")).toBeNull();
    expect(screen.queryByTestId("kalem-listesi")).toBeNull();
    expect(screen.getByTestId("acik-kalem-listesi")).toBeTruthy();
    ac();
    expect(screen.queryByTestId("acik-kalemler")).toBeNull();
    expect(screen.getByText("Toplam gider (KDV hariç)")).toBeTruthy();
  });
  it("AC-24 / AC-41: ödeme süzgecinin beş değeri aynı; kip hatırlatma kipiyle birbirini dışlar", () => {
    render(<H />);
    expect([...screen.getByLabelText("Ödeme filtresi").querySelectorAll("option")].map(o => o.value)).toEqual(["", "odenmedi", "odendi", "gecti", "hatirlatma"]);
    fireEvent.click(screen.getByTestId("hatirlatma-dugmesi"));
    expect(screen.getByTestId("hatirlatma-modu")).toBeTruthy();
    ac();
    expect(screen.queryByTestId("hatirlatma-modu")).toBeNull();
    expect(screen.getByTestId("acik-kalemler")).toBeTruthy();
    fireEvent.click(screen.getByTestId("hatirlatma-dugmesi"));
    expect(screen.queryByTestId("acik-kalemler")).toBeNull();
    expect(screen.getByTestId("hatirlatma-modu")).toBeTruthy();
  });
  it("AC-7: personel varsayılan tek toplu satır, ad yok; 'Adları göster' ile çalışan ve hedef satırları", () => {
    render(<H />);
    ac();
    const toplu = screen.getByTestId("acik-personel-toplu");
    expect(toplu.textContent).toMatch(/Çalışanlar · 1 kişi[\s\S]*Personel gideri[\s\S]*1 kalem/);
    expect(screen.getByTestId("acik-kalem-listesi").textContent).not.toContain("Hasan Çelik");
    fireEvent.click(within(toplu).getByText(/Adları göster/));
    const p = satirlar().filter(s => s.textContent.includes("Hasan Çelik"));
    expect(p.map(s => s.textContent)).toEqual([expect.stringContaining("Maaş (resmi)"), expect.stringContaining("Maaş (elden)")]);
  });
  it("AC-9 / AC-39: vadesiz satırlar rozetli ve vadelilerden sonra (yaş azalan); vadeliler vade artan", () => {
    render(<H />);
    ac();
    const t = satirlar().map(s => s.textContent);
    expect(t[0]).toMatch(/Yıldız Gayrimenkul/); // kira ana hedefi, vade 10.08
    const ilk = t.findIndex(x => /Vade girilmemiş/.test(x));
    expect(t.slice(ilk).every(x => /Vade girilmemiş/.test(x))).toBe(true);
    expect(t.slice(ilk).map(x => (/Eski sac/.test(x) ? "sac" : /Vergi dairesi/.test(x) ? "stopaj" : "?"))).toEqual(["sac", "stopaj"]); // 109 gün, 62 gün
  });
  it("AC-10 / AC-32: satırdan ödeme penceresi o hedefle açılır; izinsizde düğme yok", () => {
    render(<H />);
    ac();
    const stopaj = satirlar().find(s => s.textContent.includes("Vergi dairesi"));
    fireEvent.click(within(stopaj).getByTestId("acik-kalem-ode"));
    // Pencere stopaj hedefine iner: tutar stopajın kalanı (4.000), kiraya verenin kalanı (16.000) değil.
    expect(within(screen.getByTestId("odeme-kayit-penceresi")).getByLabelText(/tutar/i).value).toBe("4.000");
    cleanup();
    render(<H perms={ODEMESIZ} />);
    ac();
    expect(screen.queryAllByTestId("acik-kalem-ode")).toEqual([]);
  });
});

describe("Spec 0061 B: yaşlandırma ekranı", () => {
  it("AC-11 / AC-14 / AC-40: kova kartı kalem sayar; tıklanınca liste süzülür; personel toplu satırı yalnız o kovada", () => {
    render(<H />);
    ac();
    expect(kova("61-90 gün").textContent).toMatch(/1 kalem/); // kiranın iki hedefi tek kalem
    fireEvent.click(kova("61-90 gün"));
    expect(satirlar().every(s => /Yıldız Gayrimenkul|Vergi dairesi/.test(s.textContent))).toBe(true);
    expect(screen.queryByTestId("acik-personel-toplu")).toBeNull();
    fireEvent.click(kova("0-30 gün"));
    expect(screen.getByTestId("acik-personel-toplu")).toBeTruthy();
  });
  it("AC-15: taraf kırılımında çalışanlar tek satır, kova dağılımıyla; adlar kapalı", () => {
    render(<H />);
    ac();
    const t = screen.getAllByTestId("acik-taraf-satiri").map(s => s.textContent);
    expect(t.some(x => /^Çalışanlar · 1 kişi/.test(x) && /40\.000/.test(x))).toBe(true);
    expect(screen.getByTestId("acik-taraf-kirilimi").textContent).not.toContain("Hasan Çelik");
  });
  // Kullanıcı isteği (2026-10-03): "Kimde Ne Kadar Eski Borç Var" başlığı kart kenarına dayanmasın; kart, "Kime Ne Kadar
  // Borçluyuz" gibi kendi iç boşluğunu taşır, geniş tablo yalnız kendi sarmalayıcısında kayar.
  it("taraf kırılımı kartı iç boşluğunu korur; tablo kendi içinde kayar", () => {
    render(<H />);
    ac();
    const kart = screen.getByTestId("acik-taraf-kirilimi");
    expect(kart.style.padding).toBe("18px");
    expect(within(kart).getByText("Kimde Ne Kadar Eski Borç Var")).toBeTruthy();
    const sar = within(kart).getByTestId("acik-taraf-tablo");
    expect(sar.style.overflowX).toBe("auto");
    expect(sar.querySelector("table")).toBeTruthy();
  });
  it("AC-13: vadesi geçmiş ve vadesiz sayıları kovalardan ayrı, kalem sayar", () => {
    render(<H />);
    ac();
    expect(screen.getByTestId("acik-capraz-sayilar").textContent).toMatch(/Vadesi geçmiş: 2 kalem[\s\S]*Vadesi girilmemiş: 2 kalem/);
  });
  it("AC-13 / AC-14 (triyaj bulgu 1): kova süzgecinde çapraz sayılar da o kovaya aittir", () => {
    render(<H />);
    ac();
    fireEvent.click(kova("90+ gün"));
    expect(screen.getByTestId("acik-capraz-sayilar").textContent).toMatch(/Vadesi geçmiş: 0 kalem[\s\S]*Vadesi girilmemiş: 1 kalem[\s\S]*Süzgeç: 90\+ gün/);
    fireEvent.click(kova("61-90 gün"));
    expect(screen.getByTestId("acik-capraz-sayilar").textContent).toMatch(/Vadesi geçmiş: 1 kalem[\s\S]*Vadesi girilmemiş: 1 kalem/);
  });
  it("triyaj bulgu 3: süzülmüş satırlar ve özet bellekte tutulur", async () => {
    const { readFileSync } = await import("node:fs");
    const k = readFileSync("src/components/gider/AcikKalemler.jsx", "utf8");
    expect(k).toMatch(/const satirlar = useMemo\(\(\) => \(kova \? r\.satirlar\.filter\(s => s\.kova === kova\) : r\.satirlar\), \[r, kova\]\);/);
    expect(k).toMatch(/const ozet = useMemo\(\(\) => acikOzet\(satirlar\), \[satirlar\]\);/);
  });
  it("AC-17: süzgeçsiz toplam 'Toplam borç'a eşit; süzgeçte 'Seçili kovada' etiketi", () => {
    render(<H />);
    ac();
    const borcToplam = screen.getByText("Toplam borç").parentElement.textContent;
    expect(tl(screen.getByTestId("acik-toplam").textContent)).toBe(tl(borcToplam));
    fireEvent.click(kova("90+ gün"));
    expect(screen.getByTestId("acik-toplam-etiket").textContent).toMatch(/Seçili kovada \(90\+ gün\)/);
  });
  it("AC-16 / AC-35: gün dönümünde yaş ve kova yerel tarihe göre tazelenir", () => {
    const x = k({ id: 60, tarih: "2026-09-01", turId: 4, tutar: 100, kdvOrani: 0, tedarikciId: 12, aciklama: "Sınır" });
    vi.setSystemTime(new Date("2026-10-01T23:50:00"));
    render(<H g0={[x]} />);
    ac();
    expect(kova("0-30 gün").textContent).toMatch(/1 kalem/);
    vi.setSystemTime(new Date("2026-10-02T00:10:00"));
    act(() => { window.dispatchEvent(new Event("focus")); });
    expect(kova("31-60 gün").textContent).toMatch(/1 kalem/);
    expect(satirlar()[0].textContent).toMatch(/31/);
  });
  it("AC-26: açık kalem yoksa BosDurum; tablo ve kova kartları yok", () => {
    render(<H g0={[]} />);
    ac();
    expect(screen.getByTestId("bos-acik-kalemler").textContent).toMatch(/Açık kalem yok/);
    expect(screen.queryAllByTestId("kova-karti")).toEqual([]);
    expect(screen.queryByTestId("acik-kalem-listesi")).toBeNull();
  });
  it("AC-31: ödeme kaydedilip kalan sıfırlanınca satır düşer, kova sayısı tazelenir", () => {
    let st;
    render(<H onState={s => { st = s; }} />);
    ac();
    expect(kova("90+ gün").textContent).toMatch(/1 kalem/);
    const eski = satirlar().find(s => s.textContent.includes("Eski sac"));
    fireEvent.click(within(eski).getByTestId("acik-kalem-ode"));
    fireEvent.click(screen.getByText("Ödemeyi Kaydet"));
    expect(st.hesapHareketleri).toHaveLength(1);
    expect(satirlar().some(s => s.textContent.includes("Eski sac"))).toBe(false);
    expect(kova("90+ gün").textContent).toMatch(/0 kalem/);
  });
});
