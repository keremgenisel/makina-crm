// @vitest-environment jsdom
// Ayrı Servis ve Kargo Panosu penceresinin sarmalayıcısı (ServisPencere): IPC köprüsünden
// (window.servisBridge) gelen veriyi TAM ETKİLEŞİMLİ <ServisPanosu/>'ya geçirir, penceredeki
// yazmaları (kutu sürükleme vb.) ana pencereye "mutate" ile geri gönderir. Kritik nokta:
// yazma tabanı TAM dizidir (silinmişler dahil) → geri dönen değer soft-delete kayıtları KORUR;
// gösterim ise withoutDeleted uygular (silinmiş kart panoda görünmez).
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor, act } from "@testing-library/react";

afterEach(() => {
  cleanup();
  delete window.servisBridge;
  document.documentElement.removeAttribute("data-theme");
});

import { ServisPencere } from "../../src/components/ServisPencere";

const sutun = (ad) => [...document.querySelectorAll("section")].find(s => s.textContent.includes(ad));

const snapshot = () => ({
  services: [
    { id: 10, customerId: 1, type: "Periyodik Bakım", repairPlace: "Yerinde Onarım", durum: "Bekliyor", date: "2026-07-20", tech: "" },
    { id: 99, customerId: 1, type: "Garanti Dışı", durum: "Tamamlandı", date: "2026-07-01", tech: "", deletedAt: "2026-07-02" }, // SİLİNMİŞ
  ],
  customers: [{ id: 1, name: "ABC Makina", model: "AK-100", serialNo: "SN-1" }],
  calisanlar: [], parts: [], dealers: [], factory: { name: "Altuntaş" },
  appSettings: null, geoData: null, loadingGeo: false, partStock: [], partStockLog: [],
  dosyalar: [], yedekParcaSatislar: [], partSales: [], serverPermissions: null,
  aktifKullanici: "ofis", kargoYetki: false, kalipYetki: false, dosyaCevrimdisi: false, tema: "light",
});

const kur = (ilk) => {
  let veriCb = null;
  const mutate = vi.fn();
  window.servisBridge = {
    ilkVeriAl: () => Promise.resolve(ilk),
    onVeri: (cb) => { veriCb = cb; return () => { veriCb = null; }; },
    mutate,
  };
  return { mutate, yayinla: (v) => act(() => veriCb?.(v)) };
};

describe("ServisPencere", () => {
  it("mount'ta ilkVeriAl verisinden 3 sütunu çizer", async () => {
    kur(snapshot());
    render(<ServisPencere />);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Bekliyor" })).toBeTruthy());
    expect(screen.getByRole("heading", { name: "İşlemde" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Tamamlandı" })).toBeTruthy();
  });

  it("silinmiş servis panoda GÖRÜNMEZ (gösterim withoutDeleted)", async () => {
    kur(snapshot());
    render(<ServisPencere />);
    await waitFor(() => expect(document.querySelector('article[draggable="true"]')).toBeTruthy());
    // id 10 (Bekliyor) tek görünür kart; id 99 silinmiş → hiçbir sütunda değil
    const kartlar = document.querySelectorAll('article[draggable="true"]');
    expect(kartlar.length).toBe(1);
  });

  it("kutu sürükleme mutate('services', ...) çağırır ve SİLİNMİŞ kaydı korur", async () => {
    const { mutate } = kur(snapshot());
    render(<ServisPencere />);
    await waitFor(() => expect(document.querySelector('article[draggable="true"]')).toBeTruthy());
    fireEvent.drop(sutun("Tamamlandı"), { dataTransfer: { getData: () => "10" } });
    expect(mutate).toHaveBeenCalledTimes(1);
    const [key, value] = mutate.mock.calls[0];
    expect(key).toBe("services");
    // Yazma tabanı TAM dizi: silinmiş id 99 hâlâ orada (deletedAt korunur), id 10 Tamamlandı oldu
    expect(value).toHaveLength(2);
    expect(value.find(s => s.id === 99).deletedAt).toBe("2026-07-02");
    expect(value.find(s => s.id === 10).durum).toBe("Tamamlandı");
  });

  it("veri GELMEDEN pano mount edilmez (alarm taban çizgisi doğru kurulsun)", async () => {
    // Boş veriyle mount edilirse pano tabanı boş kalır, sonra veri gelince mevcut kayıtlar "yeni"
    // sanılıp alarm öter. Bu yüzden ilk gerçek görüntü gelene kadar "Yükleniyor…" gösterilir.
    let veriCb = null;
    window.servisBridge = {
      ilkVeriAl: () => Promise.resolve(null), // önbellek boş (henüz push gelmedi)
      onVeri: (cb) => { veriCb = cb; return () => { veriCb = null; }; },
      mutate: vi.fn(),
    };
    render(<ServisPencere />);
    await waitFor(() => expect(screen.getByText("Yükleniyor…")).toBeTruthy());
    expect(document.querySelector("section")).toBeNull(); // pano henüz yok
    // İlk gerçek veri gelince pano mount olur (taban = mevcut kayıtlar)
    await act(async () => { veriCb?.(snapshot()); });
    await waitFor(() => expect(screen.getByRole("heading", { name: "Bekliyor" })).toBeTruthy());
  });

  it("tema payload'unu uygular (data-theme)", async () => {
    const { yayinla } = kur({ ...snapshot(), tema: "dark" });
    render(<ServisPencere />);
    await waitFor(() => expect(document.documentElement.getAttribute("data-theme")).toBe("dark"));
    yayinla({ ...snapshot(), tema: "light" });
    await waitFor(() => expect(document.documentElement.getAttribute("data-theme")).toBe("light"));
  });

  it("köprü yoksa çökmez (veri gelmez → Yükleniyor)", async () => {
    // window.servisBridge tanımsız (ör. tarayıcı/preview) — patlamamalı, pano da mount olmamalı.
    render(<ServisPencere />);
    await waitFor(() => expect(screen.getByText("Yükleniyor…")).toBeTruthy());
    expect(document.querySelector("section")).toBeNull();
  });
});
