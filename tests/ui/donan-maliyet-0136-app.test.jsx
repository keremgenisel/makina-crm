// @vitest-environment jsdom
// Spec 0136 gerçek App: Makina Maliyeti › Üretim Partileri'nden kapatılan partinin maliyet görüntüsü kaydın gövdesine yazılır (App'in
// parça, malzeme ve model listeleri kapanış geri çağırımına ulaşır, Karar 36); Katalog'da sonradan yapılan zam donmuş partinin Parti
// Hesabı rakamını değiştirmez, sapma kutusunda direkt maliyet satırı çıkar. Görüntüsüz kapanmış parti (ay havuzu görüntüsü olsa da)
// "dondurulmadı" ibaresini taşır (AC-83).
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within, waitFor } from "@testing-library/react";
import { GECERLILIK_ETIKETI } from "../../src/lib/urunAgaci";
import { DONDURULMADI_IBARESI, SAPMA_BASLIGI, SAPMA_DIREKT_ETIKETI } from "../../src/lib/uretimPartisi";
import * as V from "../fixtures/0136-veri";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); delete window.crmStorage; });
const { default: App } = await import("../../src/App");

const veri = () => ({
  giderTurleri: V.TURLER, giderler: V.GIDERLER, tedarikciler: [], parts: V.PARCALAR, standardModels: V.STANDART, customModels: V.OZEL,
  stock: V.STOCK, customers: V.CUSTOMERS, uretimPartileri: V.PARTILER,
  giderTanimlari: [], hesapHareketleri: [], kasaHesaplari: [], cekler: [],
  appSettings: { giderAyarlari: { yururlukAy: V.YURURLUK }, maliyetAyarlari: V.AYAR }, dataVersion: 1,
});
let kayitlar;
const baslat = async () => {
  kayitlar = [];
  window.crmStorage = { load: vi.fn(async () => structuredClone(veri())), save: vi.fn(async (d) => { kayitlar.push(structuredClone(d)); return true; }), getVersion: vi.fn(async () => 1) };
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("test: ağ yok"))));
  render(<App />);
  await waitFor(() => expect(screen.getAllByText("Anasayfa").length).toBeGreaterThan(0));
  await new Promise(r => setTimeout(r, 800));
};
const menu = (ad) => fireEvent.click(screen.getAllByText(ad).find(e => e.closest("nav")));
const gorunum = (ad) => { menu("Makina Maliyeti"); fireEvent.click(screen.getByRole("radio", { name: ad })); };
const satir = (ad) => screen.getAllByTestId("parti-satiri").find(tr => within(tr).queryByText(ad));
const hucreler = (id) => within(screen.getByTestId(`parti-satiri-${id}`)).getAllByRole("cell").map(c => c.textContent);

describe("Spec 0136 gerçek App", () => {
  it("AC-1 / AC-14 / AC-33 (App hattı): kapanış görüntüsü gövdede; sonraki zam donmuş rakamı değiştirmez, sapma kutusu çıkar", async () => {
    await baslat();
    gorunum("Üretim Partileri");
    fireEvent.click(within(satir("Bahar")).getByTitle("Düzenle"));
    fireEvent.change(screen.getByLabelText("Bitiş ayı"), { target: { value: "2026-05" } });
    fireEvent.click(screen.getByText("Kaydet"));
    await waitFor(() => expect(kayitlar.some(d => d.uretimPartileri?.find(p => p.id === 2)?.kapanisMaliyeti)).toBe(true));
    const g = kayitlar.filter(d => d.uretimPartileri?.find(p => p.id === 2)?.kapanisMaliyeti).pop().uretimPartileri.find(p => p.id === 2).kapanisMaliyeti;
    expect(g.makinalar["stok:4"]).toMatchObject({ direktK: 3600, eksikSayisi: 0, tarihsiz: false }); // 2 × 15 + 3 × 2
    expect(g.planlar.OZ).toEqual({ direktK: 1500, eksikSayisi: 0 });
    menu("Ayarlar");
    fireEvent.click(screen.getAllByText("Katalog").filter(e => !e.closest("nav"))[0]);
    fireEvent.click(screen.getAllByText("Parça/Yedek Parça").pop());
    fireEvent.click(within((await screen.findByText("Rulman")).closest("tr")).getByTitle("Düzenle"));
    fireEvent.change(screen.getByLabelText("Alış maliyeti"), { target: { value: "20" } });
    fireEvent.change(screen.getByLabelText(GECERLILIK_ETIKETI), { target: { value: "2026-05-01" } });
    fireEvent.click(screen.getByRole("button", { name: /Kaydet/ }));
    await waitFor(() => expect(kayitlar.some(d => d.parts?.find(p => p.id === 1)?.maliyet === 20)).toBe(true));
    gorunum("Parti Hesabı");
    fireEvent.change(screen.getByLabelText("Üretim partisi"), { target: { value: "2" } });
    expect(hucreler("AK100")[2]).toBe("36,00 ₺");
    expect(screen.getByTestId("donmus-serit")).toBeTruthy();
    gorunum("Üretim Partileri");
    const kutu = screen.getByTestId("parti-degisimleri");
    expect(kutu.textContent).toContain(SAPMA_BASLIGI);
    const d = within(kutu).getByTestId("parti-sapma-direkt");
    expect(d.firstChild.textContent).toBe(SAPMA_DIREKT_ETIKETI);
    expect(d.textContent).toContain("Bahar");
  });
  it("AC-83 / AC-29 (App hattı): ay havuzu görüntüsü olan ama maliyet görüntüsü olmayan Kış dondurulmadı", async () => {
    await baslat();
    gorunum("Parti Hesabı");
    expect(screen.getByTestId("dondurulmadi-serit").textContent).toBe(DONDURULMADI_IBARESI);
    gorunum("Üretim Partileri");
    expect(within(satir("Kış")).getByTestId("parti-dondurulmadi")).toBeTruthy();
  });
});
