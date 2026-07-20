// @vitest-environment jsdom
// Ülke seçilince yan panelde her şehrin ALTINDA o şehirdeki firmalar makina sayısıyla
// görünür; ilk 5, sonrası "Tümünü gör" ile açılır. Bu üçü (firma listesi, sayı, genişletme)
// koparsa kullanıcı şehir bazında kimin kaç makinası olduğunu göremez.
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, waitFor, fireEvent, within } from "@testing-library/react";

afterEach(cleanup);
import { Harita } from "../../src/components/Harita";

// Konya: 6 firma (A iki makina), İstanbul: 1 firma
const musteriler = [
  { name: "Firma A", country: "Türkiye", city: "Konya" },
  { name: "Firma A", country: "Türkiye", city: "Konya" }, // aynı firma, 2. makina
  { name: "Firma B", country: "Türkiye", city: "Konya" },
  { name: "Firma C", country: "Türkiye", city: "Konya" },
  { name: "Firma D", country: "Türkiye", city: "Konya" },
  { name: "Firma E", country: "Türkiye", city: "Konya" },
  { name: "Firma F", country: "Türkiye", city: "Konya" },
  { name: "Solo Ltd", country: "Türkiye", city: "İstanbul" },
];

const dunyaBekle = () => waitFor(() => expect(document.querySelector('[data-ad="Türkiye"]')).toBeTruthy(), { timeout: 10000 });

const turkiyeAc = async () => {
  render(<Harita customers={musteriler} dealers={[]} factory={null} />);
  await dunyaBekle();
  fireEvent.click(screen.getByRole("button", { name: /Türkiye/ }));
  await waitFor(() => expect(screen.getByRole("button", { name: /Tüm Dünya/ })).toBeTruthy(), { timeout: 10000 });
};

describe("Harita — şehir altında firma listesi", () => {
  // Firma adları artık haritada da (müşteri pini etiketi) geçtiğinden, yan panel testleri
  // sorguları YAN PANELE (.harita-yan) sabitlemeli; yoksa harita etiketleriyle çift eşleşir.
  const yan = () => document.querySelector(".harita-yan");

  it("şehrin altında firmaları makina sayısıyla gösterir", async () => {
    await turkiyeAc();
    const satir = within(yan()).getByText("Firma A").closest(".harita-firma");
    expect(within(satir).getByText("2")).toBeTruthy();       // A'nın 2 makinası
    expect(within(yan()).getByText("Solo Ltd")).toBeTruthy();       // İstanbul firması da listede
    const solo = within(yan()).getByText("Solo Ltd").closest(".harita-firma");
    expect(within(solo).getByText("1")).toBeTruthy();        // tek makina "1"
  });

  it("ilk 5 firmayı gösterir, 6.'yı 'Tümünü gör' açar", async () => {
    await turkiyeAc();
    // Konya'da 6 firma var → biri (adet'e göre en alttaki) yan panelde gizli
    expect(within(yan()).queryByText("Firma F")).toBeNull();
    const tumu = screen.getByRole("button", { name: /Tümünü gör \(6\)/ });
    expect(tumu).toBeTruthy();
    fireEvent.click(tumu);
    expect(within(yan()).getByText("Firma F")).toBeTruthy();        // artık görünür
    // Tekrar tıklayınca kapanır
    fireEvent.click(screen.getByRole("button", { name: /Daha az/ }));
    expect(within(yan()).queryByText("Firma F")).toBeNull();
  });
});

describe("Harita — firmaya tıklayınca müşteri seçimi", () => {
  const idli = [
    { id: 101, name: "Firma A", country: "Türkiye", city: "Konya" },
    { id: 102, name: "Firma A", country: "Türkiye", city: "Konya" }, // aynı firma, 2. makina
    { id: 103, name: "Firma B", country: "Türkiye", city: "Konya" },
  ];
  it("firma satırı tıklanınca o firmanın ilk müşteri id'siyle onFirmaSec çağrılır", async () => {
    const sec = vi.fn();
    render(<Harita customers={idli} dealers={[]} factory={null} onFirmaSec={sec} />);
    await dunyaBekle();
    fireEvent.click(screen.getByRole("button", { name: /Türkiye/ }));
    await waitFor(() => expect(screen.getByRole("button", { name: /Tüm Dünya/ })).toBeTruthy(), { timeout: 10000 });
    fireEvent.click(screen.getByRole("button", { name: /Firma A/ }));
    expect(sec).toHaveBeenCalledWith(101); // 2 makinalı firmanın ilk kaydı
  });
  it("onFirmaSec verilmezse firma satırı buton değil (tıklanamaz)", async () => {
    render(<Harita customers={idli} dealers={[]} factory={null} />);
    await dunyaBekle();
    fireEvent.click(screen.getByRole("button", { name: /Türkiye/ }));
    await waitFor(() => expect(screen.getByRole("button", { name: /Tüm Dünya/ })).toBeTruthy(), { timeout: 10000 });
    const yan = document.querySelector(".harita-yan");
    expect(within(yan).queryByRole("button", { name: /Firma A/ })).toBeNull();
    expect(within(yan).getByText("Firma A")).toBeTruthy(); // yan panelde düz metin (harita etiketi hariç)
  });
});

describe("Harita — ilçe altında firma listesi", () => {
  // İstanbul'un ilçelerinde firmalar; Kadıköy'de 6 firma (biri 2 makina) → Tümünü gör
  const ilceMusteriler = [
    { name: "Kad A", country: "Türkiye", city: "İstanbul", ilce: "Kadıköy" },
    { name: "Kad A", country: "Türkiye", city: "İstanbul", ilce: "Kadıköy" },
    { name: "Kad B", country: "Türkiye", city: "İstanbul", ilce: "Kadıköy" },
    { name: "Kad C", country: "Türkiye", city: "İstanbul", ilce: "Kadıköy" },
    { name: "Kad D", country: "Türkiye", city: "İstanbul", ilce: "Kadıköy" },
    { name: "Kad E", country: "Türkiye", city: "İstanbul", ilce: "Kadıköy" },
    { name: "Kad F", country: "Türkiye", city: "İstanbul", ilce: "Kadıköy" },
    { name: "Sis Firma", country: "Türkiye", city: "İstanbul", ilce: "Şişli" },
  ];
  it("ile tıklayıp ilçeye inince her ilçenin altında firmalar görünür ve 'Tümünü gör' çalışır", async () => {
    render(<Harita customers={ilceMusteriler} dealers={[]} factory={null} />);
    await dunyaBekle();
    fireEvent.click(screen.getByRole("button", { name: /Türkiye/ }));
    await waitFor(() => expect(document.querySelector('[data-ad="İstanbul"]')).toBeTruthy(), { timeout: 10000 });
    // İstanbul'a listeden tıkla (ilçe görünümüne in)
    fireEvent.click(screen.getByRole("button", { name: /İstanbul/ }));
    await waitFor(() => expect(screen.getByRole("button", { name: /← Türkiye/ })).toBeTruthy(), { timeout: 10000 });
    const yan = document.querySelector(".harita-yan");
    // Şişli firması görünür (tek makina)
    const sis = within(yan).getByText("Sis Firma").closest(".harita-firma");
    expect(within(sis).getByText("1")).toBeTruthy();
    // Kadıköy: 6 firma → 6.'sı yan panelde gizli, Tümünü gör açıyor
    expect(within(yan).queryByText("Kad F")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Tümünü gör \(6\)/ }));
    expect(within(yan).getByText("Kad F")).toBeTruthy();
    // Kad A 2 makina
    const kadA = within(yan).getByText("Kad A").closest(".harita-firma");
    expect(within(kadA).getByText("2")).toBeTruthy();
  });
});
