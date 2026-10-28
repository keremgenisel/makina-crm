// @vitest-environment jsdom
// Spec 0115 D: Servis ve Kargo Panosu'nda tamir rozeti, Tamamlandı'ya sürüklemede onay penceresi ya da bildirim, "kalıpları da
// bitti işaretle" düğmesinin kapısı ve kilidi; ayrı pencere ve kiosk.
import { describe, it, expect, afterEach, beforeAll, vi } from "vitest";
import { useState } from "react";
import { render, fireEvent, screen, cleanup, within, act, waitFor } from "@testing-library/react";
import fs from "node:fs";
import { ServisPanosu } from "../../src/components/ServisPanosu";
import { ServisPencere } from "../../src/components/ServisPencere";
import { tamirSatiriKur, TAMIR_BILDIRIMI, TAMIR_ONAY_BASLIGI, TAMIR_ONAY_DUGMESI, TAMIR_ISARETLENDI } from "../../src/lib/kalipTamiri";
import { emptyRow } from "../../src/components/stock/uretimFormModel";
import { CUSTOMERS, SERVICES, URETIM_FORMLARI } from "../fixtures/0115-veri";

beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); });
afterEach(() => { cleanup(); delete window.crmLocks; delete window.appServer; delete window.servisBridge; });

const LISTE = [{ id: 1, ad: "100_ERKEK KALIPLAR REVİZE", olcu: "" }, { id: 2, ad: "HAMBURGER", olcu: "Ø98" }, { id: 3, ad: "KASAP KÖFTE", olcu: "46*80" }];
const SV = SERVICES.map(s => (s.id === 41 ? { ...s, atolyeKaliplari: LISTE } : s));
const tSatir = (g, ek = {}) => ({ ...tamirSatiriKur({ ...emptyRow(), id: 9000 + g.id }, SV[0], g, CUSTOMERS[0]), ...ek });
// Form 31: giriş 1 bitti, giriş 2 bitmedi; form 32: giriş 3 yok (forma girmemiş). Bir de başka servise ait üretim satırı.
const FORMLAR = [
  { ...URETIM_FORMLARI[0], satirlar: [...URETIM_FORMLARI[0].satirlar, tSatir(LISTE[0], { tamamlandi: true }), tSatir(LISTE[1])] },
];
const ADMIN = null;
const kiosk = { role: "user", permissions: JSON.stringify({ tabs: ["servis"], customerActions: ["cust_service_add", "cust_service_edit"] }) };
const stokcuSalt = { role: "user", permissions: JSON.stringify({ tabs: ["servis", "stock"], customerActions: ["cust_service_edit"], stockActions: [] }) };

let dis; let toastlar;
function Kap({ izin = ADMIN, uretimYetki = true, yazici = true, formlar0 = FORMLAR, services0 = SV, aktifKullanici = "ali" }) {
  const [services, setServices] = useState(services0);
  const [uretimFormlari, setUretimFormlari] = useState(formlar0);
  dis = { services, uretimFormlari };
  return <ServisPanosu services={services} setServices={setServices} customers={CUSTOMERS} dealers={[]} parts={[]} calisanlar={[]}
    showToast={(m, t) => toastlar.push([m, t])} serverPermissions={izin} yedekParcaSatislar={[]} setYedekParcaSatislar={vi.fn()} dosyalar={[]} setDosyalar={vi.fn()}
    uretimFormlari={uretimFormlari} setUretimFormlari={yazici ? setUretimFormlari : null} uretimYetki={uretimYetki} aktifKullanici={aktifKullanici} />;
}
const kur = (p = {}) => { toastlar = []; return render(<Kap {...p} />); };
const sutun = (ad) => [...document.querySelectorAll("section")].find(s => s.querySelector("h3")?.textContent === ad);
const surukle = (id, ad) => fireEvent.drop(sutun(ad), { dataTransfer: { getData: () => `servis:${id}`, setData: () => {} } });
const rozet = () => screen.queryByTestId("tamir-rozeti");

describe("Spec 0115 pano rozeti", () => {
  it("AC-44, AC-54, AC-91: bitmemiş tamiri olan kart rozet taşır, 'bitmemiş/toplam' yazar, kalıp adı yazmaz", () => {
    kur();
    expect(rozet().textContent).toBe("KALIP ATÖLYEDE 2/3"); // giriş 3 hiçbir formda yok → bitmemiş
    expect(rozet().closest("article").textContent).not.toMatch(/HAMBURGER|KASAP/);
    expect(screen.getAllByTestId("tamir-rozeti")).toHaveLength(1); // kalıpsız servis (42) rozet taşımaz
  });
  it("AC-45: bütün girişler canlı formda tamamlandı ise rozet çizilmez", () => {
    kur({ formlar0: [{ ...FORMLAR[0], satirlar: LISTE.map(g => tSatir(g, { tamamlandi: true })) }] });
    expect(rozet()).toBeNull();
  });
});

describe("Spec 0115 Tamamlandı'ya sürükleme", () => {
  it("AC-46, AC-47, AC-48, AC-93: taşıma engellenmez; yazabilen kullanıcıda onay penceresi açılır; rozet Tamamlandı sütununda kalır", () => {
    kur();
    surukle(41, "Tamamlandı");
    expect(dis.services.find(s => s.id === 41).durum).toBe("Tamamlandı");
    expect(screen.getByText(TAMIR_ONAY_BASLIGI)).toBeTruthy();
    expect(screen.getByText(/Anadolu Köfte servisinin 2 kalıbı henüz bitmedi\. 1 kalıp henüz hiçbir üretim formunda değil/)).toBeTruthy();
    expect(within(sutun("Tamamlandı")).getByTestId("tamir-rozeti")).toBeTruthy();
  });
  it("AC-50, AC-52, Karar 53: düğme o servisin var olan tamir satırlarını işaretler, başka satıra ve servis durumuna dokunmaz", () => {
    kur();
    surukle(41, "Tamamlandı");
    const durumOnce = dis.services;
    fireEvent.click(screen.getByRole("button", { name: new RegExp(TAMIR_ONAY_DUGMESI) }));
    const satirlar = dis.uretimFormlari[0].satirlar;
    expect(satirlar.filter(r => r.kaynakTip === "servis_tamir").every(r => r.tamamlandi)).toBe(true);
    expect(satirlar.find(r => r.id === 3101).tamamlandi).toBe(false); // PİDE (üretim satırı) dokunulmadı
    expect(dis.services).toBe(durumOnce);
    expect(toastlar.at(-1)[0]).toBe(TAMIR_ISARETLENDI(1));
    expect(rozet().textContent).toBe("KALIP ATÖLYEDE 1/3"); // forma girmemiş giriş bitmemiş kalır
  });
  it("Karar 10, triyaj: düğme başka servisin bitmemiş tamir satırına ve çöpteki formun satırlarına dokunmaz", () => {
    const SV42 = SV.find(s => s.id === 42);
    const baskaGiris = { id: 50, ad: "BAŞKA KALIP", olcu: "" };
    const services0 = SV.map(s => (s.id === 42 ? { ...s, atolyeKaliplari: [baskaGiris] } : s));
    const baskaSatir = { ...tamirSatiriKur({ ...emptyRow(), id: 9900 }, { ...SV42, atolyeKaliplari: [baskaGiris] }, baskaGiris, CUSTOMERS[0]) };
    const copteki = { ...URETIM_FORMLARI[0], id: 33, deletedAt: "2026-10-20T10:00:00", satirlar: [tSatir(LISTE[2], { id: 9950 })] };
    kur({ services0, formlar0: [{ ...FORMLAR[0], satirlar: [...FORMLAR[0].satirlar, baskaSatir] }, copteki] });
    surukle(41, "Tamamlandı");
    fireEvent.click(screen.getByRole("button", { name: new RegExp(TAMIR_ONAY_DUGMESI) }));
    const f31 = dis.uretimFormlari.find(f => f.id === 31);
    expect(f31.satirlar.find(r => r.id === 9900).tamamlandi).toBe(false);
    expect(f31.satirlar.filter(r => r.id === 9001 || r.id === 9002).every(r => r.tamamlandi)).toBe(true);
    expect(dis.uretimFormlari.find(f => f.id === 33)).toBe(copteki);
  });
  it("AC-51, AC-94: formu başkası kilitlemişse düğme hiçbir şey yazmaz ve nedeni bildirir", async () => {
    window.crmLocks = { list: vi.fn(async () => [{ entity_type: "uretim_formu", entity_id: 31, locked_by: "ayse" }]) };
    kur();
    await waitFor(() => expect(window.crmLocks.list).toHaveBeenCalled());
    await act(async () => {});
    surukle(41, "Tamamlandı");
    const once = dis.uretimFormlari;
    fireEvent.click(screen.getByRole("button", { name: new RegExp(TAMIR_ONAY_DUGMESI) }));
    expect(dis.uretimFormlari).toBe(once);
    expect(toastlar.at(-1)).toEqual([expect.stringContaining("ayse"), "err"]);
  });
  it("AC-94: kalıpları iki forma dağılmış serviste düğme iki formu da yazar", () => {
    const iki = [{ ...FORMLAR[0], satirlar: [tSatir(LISTE[0])] }, { ...URETIM_FORMLARI[0], id: 32, satirlar: [tSatir(LISTE[1]), tSatir(LISTE[2])] }];
    kur({ formlar0: iki });
    surukle(41, "Tamamlandı");
    fireEvent.click(screen.getByRole("button", { name: new RegExp(TAMIR_ONAY_DUGMESI) }));
    expect(dis.uretimFormlari.flatMap(f => f.satirlar).every(r => r.tamamlandi)).toBe(true);
    expect(rozet()).toBeNull();
  });
  it("AC-49, AC-92, R28: kioskta (stockActions tanımsız) ve Stok sekmesi olmayan kullanıcıda pencere yok, düz bildirim", () => {
    kur({ izin: kiosk, uretimYetki: false, yazici: false });
    surukle(41, "Tamamlandı");
    expect(screen.queryByText(TAMIR_ONAY_BASLIGI)).toBeNull();
    expect(toastlar.at(-1)).toEqual([TAMIR_BILDIRIMI(2), "err"]);
    cleanup();
    kur({ izin: kiosk, uretimYetki: false, yazici: true }); // yazıcı verilse de Stok sekmesi şart (R27/2)
    surukle(41, "Tamamlandı");
    expect(screen.queryByText(TAMIR_ONAY_BASLIGI)).toBeNull();
  });
  it("R27/2: Stok sekmesi var ama üretim formu düzenleme izni yoksa pencere yok", () => {
    kur({ izin: stokcuSalt });
    surukle(41, "Tamamlandı");
    expect(screen.queryByText(TAMIR_ONAY_BASLIGI)).toBeNull();
    expect(toastlar.at(-1)[0]).toBe(TAMIR_BILDIRIMI(2));
  });
  it("Karar 53: bitmemişlerin hepsi forma girmemişse pencere açılmaz (işaretlenecek satır yok), bildirim çıkar", () => {
    kur({ formlar0: URETIM_FORMLARI });
    surukle(41, "Tamamlandı");
    expect(screen.queryByText(TAMIR_ONAY_BASLIGI)).toBeNull();
    expect(toastlar.at(-1)[0]).toBe(TAMIR_BILDIRIMI(3));
  });
  it("AC-53: tamir biten kart yanıp sönmez; kalıpsız servis bildirim üretmez", () => {
    const r = kur();
    expect(document.querySelector(".servis-alarm-yanip")).toBeNull();
    surukle(42, "Tamamlandı");
    expect(toastlar).toEqual([]);
    r.rerender(<Kap formlar0={[{ ...FORMLAR[0], satirlar: LISTE.map(g => tSatir(g, { tamamlandi: true })) }]} />);
    expect(document.querySelector(".servis-alarm-yanip")).toBeNull();
  });
  it("AC-55 (R31): sürükleme önekleri ve sütun eşlemesi değişmedi (kaynak)", () => {
    const k = fs.readFileSync("src/components/ServisPanosu.jsx", "utf8");
    expect(k).toContain('e.dataTransfer.setData("text/plain", "servis:" + sv.id)');
    expect(k).toMatch(/if \(tur === "kargo"\) kargoDurumDegistir\(id, d\.key\); else if \(tur === "kalip"\) kalipDurumDegistir\(id, d\.key\); else durumDegistir\(id, d\.key\);/);
  });
});

describe("Spec 0115 ayrı pencere (R32/2, C13)", () => {
  it("AC-56: ayrı pencerede rozet çizilir, düğme çizilmez; yazma köprüsü üretim formlarına dokunmaz", async () => {
    const mutate = vi.fn();
    const snap = { services: SV, customers: CUSTOMERS, calisanlar: [], parts: [], dealers: [], factory: { name: "A" }, appSettings: null, partStock: [], partStockLog: [],
      dosyalar: [], yedekParcaSatislar: [], partSales: [], serverPermissions: null, aktifKullanici: "ofis", kargoYetki: true, kalipYetki: false, uretimFormlari: FORMLAR, partTypeDefs: [] };
    window.servisBridge = { ilkVeriAl: () => Promise.resolve(snap), onVeri: () => () => {}, mutate };
    render(<ServisPencere />);
    await screen.findByTestId("tamir-rozeti");
    surukle(41, "Tamamlandı");
    expect(screen.queryByText(TAMIR_ONAY_BASLIGI)).toBeNull();
    expect(screen.getByText(TAMIR_BILDIRIMI(2))).toBeTruthy();
    expect(mutate.mock.calls.map(c => c[0])).toEqual(["services"]);
  });
});
