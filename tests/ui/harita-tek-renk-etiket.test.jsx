// @vitest-environment jsdom
// Faaliyet Haritası "faaliyet/varlık" moduna çevrildi: satış olan yer artık yoğunluğa göre
// 5 tonlu turuncu rampayla değil, TEK logo rengiyle (--hSatis) boyanıyor; yoğunluk lejantı
// kaldırıldı, satış olan her yere nötr bir konum pini + yer adı etiketi konuyor.
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";

afterEach(cleanup);
import { Harita } from "../../src/components/Harita";

const musteri = [
  { id: 1, name: "A Firma", country: "Türkiye", city: "İstanbul" },
  { id: 2, name: "B Firma", country: "Türkiye", city: "İstanbul" },
];

describe("Harita — tek renk boyama + satış pini/etiketi", () => {
  it("satış olan şekil --hSatis ile boyanır, --hk (yoğunluk rampası) İLE DEĞİL", async () => {
    render(<Harita customers={musteri} dealers={[]} factory={null} />);
    let tr;
    await waitFor(() => { tr = document.querySelector('[data-ad="Türkiye"]'); expect(tr).toBeTruthy(); }, { timeout: 10000 });
    const fill = tr.getAttribute("fill");
    expect(fill).toContain("hSatis");   // tek logo rengi
    expect(fill).not.toMatch(/hk\d/);   // yoğunluk kovası yok (revert: eski --hk fill dönerse kırılır)
  });

  it("yoğunluk gradyan lejantı kaldırıldı; pin lejantı 'Satış' ve 'Fabrika' ile durur", async () => {
    render(<Harita customers={musteri} dealers={[]} factory={null} />);
    await waitFor(() => expect(screen.getByText("Fabrika")).toBeTruthy(), { timeout: 10000 });
    // Eski gradyan lejant başlığı ("Ülke/Bölge/İlçe başına makina") artık yok
    expect(screen.queryByText(/başına makina/i)).toBeNull();
    expect(screen.getByText("Satış")).toBeTruthy();
  });

  it("dünya görünümünde satış olan ülkenin adı harita üzerine yazılır + satış pini var", async () => {
    render(<Harita customers={musteri} dealers={[]} factory={null} />);
    await waitFor(() => expect(document.querySelector('[data-pin="satis"]')).toBeTruthy(), { timeout: 10000 });
    const etiketler = [...document.querySelectorAll("text.harita-etiket")].map((t) => t.textContent);
    expect(etiketler).toContain("Türkiye");
  });

  it("satış OLMAYAN ülkenin adı da yazılır (pinsiz, soluk etiket)", async () => {
    render(<Harita customers={musteri} dealers={[]} factory={null} />);
    await waitFor(() => expect(document.querySelector('[data-ad="Fransa"]')).toBeTruthy(), { timeout: 10000 });
    const bosEtiketler = [...document.querySelectorAll("text.harita-etiket-bos")].map((t) => t.textContent);
    expect(bosEtiketler).toContain("Fransa"); // satış yok ama adı görünür
  });

  it("satış listesi DIŞINDAKİ (arka plan) ülkenin adı da Türkçe yazılır", async () => {
    render(<Harita customers={musteri} dealers={[]} factory={null} />);
    await waitFor(() => expect(document.querySelector('[data-pin="satis"]')).toBeTruthy(), { timeout: 10000 });
    const bosEtiketler = [...document.querySelectorAll("text.harita-etiket-bos")].map((t) => t.textContent);
    expect(bosEtiketler).toContain("Suriye"); // world.js'te adsız; world-arkaplan.js'ten geliyor
  });

  it("alan eşiğinin altındaki küçük egemen ülkeler de yazılır (Lüksemburg, Malta)", async () => {
    render(<Harita customers={musteri} dealers={[]} factory={null} />);
    await waitFor(() => expect(document.querySelector('[data-pin="satis"]')).toBeTruthy(), { timeout: 10000 });
    const bosEtiketler = [...document.querySelectorAll("text.harita-etiket-bos")].map((t) => t.textContent);
    expect(bosEtiketler).toContain("Lüksemburg");
    expect(bosEtiketler).toContain("Malta");
  });
});
