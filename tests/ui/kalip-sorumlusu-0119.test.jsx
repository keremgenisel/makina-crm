// @vitest-environment jsdom
// Spec 0119: panodaki servis kartında kalıbı gönderen kişi. Satırın çizim ölçütü (Tamamlandı + kalıp, müşteri kapısı yok),
// seçici ve listesi, yazım (tek yazıcı), izin, üç bağlam, sürükleme koruması, iz. Düzenek 0117'nin pano şeklini devralır.
import { describe, it, expect, afterEach, beforeAll, vi } from "vitest";
import { render, screen, cleanup, fireEvent, within, act } from "@testing-library/react";
import { useState } from "react";
import { ServisPanosu } from "../../src/components/ServisPanosu";
import { ServisPencere } from "../../src/components/ServisPencere";
import { SEVK_SORUMLU_SORUSU } from "../../src/lib/kalipTamiri";
import { PARTS, CUSTOMERS, SERVICES } from "../fixtures/0115-veri";

beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); });
afterEach(() => { cleanup(); delete window.servisBridge; delete window.auditLog; });

const CAL = [{ id: 1, ad: "Ayşe Kargo" }, { id: 2, ad: "Mehmet Usta" }];
const LISTE = [{ id: 1, ad: "100_ERKEK KALIPLAR REVİZE", olcu: "" }];
// 0117'nin SV_PANO şekli (ölçüm 25): 41 Yapılıyor, 43 Bekliyor, 44 Tamamlandı, 45 arşiv, 42 kalıpsız, 46 müşterisiz.
const SV_PANO = [
  { ...SERVICES[0], id: 41, durum: "Yapılıyor", atolyeKaliplari: LISTE, kalipFabrikaTeslim: true, kalipKargoTarih: "2026-10-25", kalipKargoSorumlusu: "Mehmet Usta" },
  { ...SERVICES[0], id: 43, durum: "Bekliyor", atolyeKaliplari: LISTE, kalipKargoSorumlusu: "Mehmet Usta" },
  { ...SERVICES[0], id: 44, durum: "Tamamlandı", atolyeKaliplari: LISTE, kalipKargoFirma: "Aras", kalipKargoTakipNo: "T1", kalipKargoTarih: "2026-10-26" },
  { ...SERVICES[0], id: 45, durum: "Tamamlandı", atolyeKaliplari: LISTE, panoGizli: true },
  { ...SERVICES[1], id: 42, durum: "Tamamlandı" }, // kalıpsız Tamamlandı
  { ...SERVICES[0], id: 46, customerId: 999, durum: "Tamamlandı", atolyeKaliplari: LISTE }, // müşterisi çözülmez
];
const dis = { services: null };
function Kap({ ilk = SV_PANO, setServicesYok = false, ...ek }) {
  const [services, setServices] = useState(ilk);
  dis.services = services;
  return <ServisPanosu services={services} setServices={setServicesYok ? undefined : setServices} customers={CUSTOMERS} dealers={[]} parts={PARTS}
    calisanlar={CAL} showToast={vi.fn()} yedekParcaSatislar={[]} setYedekParcaSatislar={vi.fn()} dosyalar={[]} setDosyalar={vi.fn()}
    factory={{ name: "Altuntaş Makina" }} {...ek} />;
}
const kartlar = () => [...document.querySelectorAll("article")];
const sutunu = (a) => a.closest("section").querySelector("h3").textContent;
const kart = (metin, sutun) => kartlar().find(a => sutunu(a) === sutun && a.textContent.includes(metin));
const tamam = () => kartlar().find(a => sutunu(a) === "Tamamlandı" && a.textContent.includes("Anadolu Köfte"));
const secici = (a) => within(a).queryByRole("combobox", { name: "Kalıbı gönderen kişi" });
const kayit = (id) => dis.services.find(s => s.id === id);

describe("Spec 0119 A: satırın yeri ve ölçütü", () => {
  it("AC-1, AC-2, AC-33: Tamamlandı ve kalıplı kartta teknisyenin altında; eylem satırı bugünkü dört öğe", () => {
    render(<Kap />);
    const a = tamam();
    const s = secici(a);
    expect(s).toBeTruthy();
    const eylem = within(a).getByTitle("Kargo Etiketi Yazdır").parentElement;
    expect([...eylem.children].map(c => c.tagName === "SELECT" ? "SELECT" : c.getAttribute("title")))
      .toEqual(["SELECT", "Kargo Etiketi Yazdır", "Servis Formu yazdır", "Kartı panodan kaldır (servis kaydı silinmez)"]);
    expect(eylem.compareDocumentPosition(s) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(eylem.contains(s)).toBe(false);
    expect(eylem.parentElement.contains(s)).toBe(true); // tek kap
    // Triyaj: "altında" yerleşimi satır içi stilden ölçülür (jsdom yerleşim yapmaz); kap sütun, iki satır alt alta (Karar 3).
    expect(eylem.parentElement.style.flexDirection).toBe("column");
    expect(eylem.style.flexDirection).not.toBe("column");
  });
  it("AC-3, AC-4, AC-5, AC-50: Bekliyor, İşlemde ve kalıpsız Tamamlandı kartında yok; formdan girilmiş değer görünmez ama kayıtta durur", () => {
    render(<Kap />);
    expect(secici(kart("Anadolu Köfte", "Bekliyor"))).toBeNull();
    const isl = kart("Anadolu Köfte", "İşlemde");
    expect(secici(isl)).toBeNull();
    expect([...isl.querySelectorAll("select")].map(x => x.value)).not.toContain("Mehmet Usta");
    expect(kayit(41).kalipKargoSorumlusu).toBe("Mehmet Usta");
    const kalipsiz = kartlar().find(a => sutunu(a) === "Tamamlandı" && a.textContent.includes("Bafra"));
    expect(kalipsiz).toBeTruthy();
    expect(secici(kalipsiz)).toBeNull();
  });
  it("AC-6: arşivlenmiş kartta yok", () => {
    render(<Kap />);
    fireEvent.click(screen.getByText(/Arşivlenenler/));
    const arsiv = kartlar().find(a => a.textContent.includes("Panoya Geri Al"));
    expect(arsiv.querySelector("select")).toBeNull();
  });
  it("AC-34: müşterisiz Tamamlandı kartında satır var, etiket düğmesi yok", () => {
    render(<Kap />);
    const a = kartlar().find(x => sutunu(x) === "Tamamlandı" && x.textContent.includes("(müşteri yok)"));
    expect(secici(a)).toBeTruthy();
    expect(within(a).queryByTitle("Kargo Etiketi Yazdır")).toBeNull();
  });
});

describe("Spec 0119 A: seçici ve liste", () => {
  it("AC-8, AC-9, AC-35: boş seçenek sabitten, canlı adlar, ikon aria-hidden, erişilebilir ad", () => {
    render(<Kap />);
    const s = secici(tamam());
    expect([...s.options].map(o => o.textContent)).toEqual([SEVK_SORUMLU_SORUSU, "Ayşe Kargo", "Mehmet Usta"]);
    expect(SEVK_SORUMLU_SORUSU).toBe("Kalıbı kim veriyor?");
    const ikon = s.parentElement.querySelector("span");
    expect(ikon.textContent).toBe("🚚");
    expect(ikon.getAttribute("aria-hidden")).toBe("true");
  });
  it("AC-10: kayıtta duran ad listede yoksa başta görünür ve seçili", () => {
    render(<Kap ilk={SV_PANO.map(s => (s.id === 44 ? { ...s, kalipKargoSorumlusu: "Eski Çalışan" } : s))} />);
    const s = secici(tamam());
    expect([...s.options].map(o => o.value)).toEqual(["", "Eski Çalışan", "Ayşe Kargo", "Mehmet Usta"]);
    expect(s.value).toBe("Eski Çalışan");
  });
  it("AC-37: çalışan listesi boşken satır yine çizilir ve kayıtlı ad görünür", () => {
    render(<Kap calisanlar={[]} ilk={SV_PANO.map(s => (s.id === 44 ? { ...s, kalipKargoSorumlusu: "Ayşe Kargo" } : s))} />);
    const s = secici(tamam());
    expect(s.value).toBe("Ayşe Kargo");
    render(<Kap calisanlar={[]} />);
    expect(secici(kartlar().filter(a => sutunu(a) === "Tamamlandı" && a.textContent.includes("Anadolu Köfte")).at(-1))).toBeTruthy();
  });
});

describe("Spec 0119 B: yazım ve iz", () => {
  it("AC-11, AC-13, AC-24: seçim kayda yazılır, öteki sevk alanları ve kalıp listesi aynı; iz kalip_sorumlu_degisti", () => {
    const log = vi.fn(); window.auditLog = { log };
    render(<Kap />);
    const once = kayit(44);
    fireEvent.change(secici(tamam()), { target: { value: "Ayşe Kargo" } });
    const k = kayit(44);
    expect(k.kalipKargoSorumlusu).toBe("Ayşe Kargo");
    for (const a of ["atolyeKaliplari", "kalipKargoFirma", "kalipKargoTakipNo", "kalipKargoTarih", "kalipFabrikaTeslim"]) expect(k[a]).toEqual(once[a]);
    expect(log).toHaveBeenCalledWith(expect.objectContaining({ action: "kalip_sorumlu_degisti", entity: "servis", entity_id: 44, entity_name: "Anadolu Köfte", detail: JSON.stringify({ kalipKargoSorumlusu: "Ayşe Kargo" }) }));
  });
  it("AC-12: boş seçenek anahtarı siler", () => {
    render(<Kap ilk={SV_PANO.map(s => (s.id === 44 ? { ...s, kalipKargoSorumlusu: "Ayşe Kargo" } : s))} />);
    fireEvent.change(secici(tamam()), { target: { value: "" } });
    expect("kalipKargoSorumlusu" in kayit(44)).toBe(false);
  });
  it("AC-34: müşterisiz kartta iz yazılır, ad boş kalabilir", () => {
    const log = vi.fn(); window.auditLog = { log };
    render(<Kap />);
    const a = kartlar().find(x => sutunu(x) === "Tamamlandı" && x.textContent.includes("(müşteri yok)"));
    fireEvent.change(secici(a), { target: { value: "Mehmet Usta" } });
    expect(kayit(46).kalipKargoSorumlusu).toBe("Mehmet Usta");
    expect(log.mock.calls.at(-1)[0].entity_name).toBeFalsy();
  });
  it("AC-42: kart İşlemde'ye taşınınca satır kaybolur, değer kayıtta durur", () => {
    render(<Kap ilk={SV_PANO.map(s => (s.id === 44 ? { ...s, kalipKargoSorumlusu: "Ayşe Kargo" } : s))} />);
    const islemde = [...document.querySelectorAll("section")].find(s => s.querySelector("h3")?.textContent === "İşlemde");
    const dt = { getData: () => "servis:44", setData: () => {}, dropEffect: "move" };
    fireEvent.dragOver(islemde, { dataTransfer: dt });
    fireEvent.drop(islemde, { dataTransfer: dt });
    expect(kayit(44).durum).toBe("Yapılıyor");
    expect(kayit(44).kalipKargoSorumlusu).toBe("Ayşe Kargo");
    expect(kartlar().filter(a => a.textContent.includes("Anadolu Köfte")).some(a => secici(a) && sutunu(a) !== "Tamamlandı")).toBe(false);
  });
});

describe("Spec 0119 A: izin, bağlamlar, koruma", () => {
  const KISITLI = { role: "user", permissions: JSON.stringify({ tabs: ["servis"], customerActions: ["cust_service_add"] }) };
  const KIOSK = { role: "user", permissions: JSON.stringify({ tabs: ["servis"], customerActions: ["cust_service_add", "cust_service_edit"] }) };
  it("AC-17: cust_service_edit olmayan kullanıcıda seçici pasif ve değeri okunur", () => {
    render(<Kap serverPermissions={KISITLI} ilk={SV_PANO.map(s => (s.id === 44 ? { ...s, kalipKargoSorumlusu: "Ayşe Kargo" } : s))} />);
    const s = secici(tamam());
    expect(s.disabled).toBe(true);
    expect(s.value).toBe("Ayşe Kargo");
  });
  it("AC-18: setServices gelmeyen bağlamda seçim yazmaz ve hata vermez", () => {
    render(<Kap setServicesYok />);
    expect(() => fireEvent.change(secici(tamam()), { target: { value: "Ayşe Kargo" } })).not.toThrow();
    expect(kayit(44).kalipKargoSorumlusu).toBeUndefined();
  });
  it("AC-19: kiosk kipinde çizilir ve yazar", () => {
    render(<Kap kiosk serverPermissions={KIOSK} />);
    fireEvent.change(secici(tamam()), { target: { value: "Mehmet Usta" } });
    expect(kayit(44).kalipKargoSorumlusu).toBe("Mehmet Usta");
  });
  it("AC-20: ayrı pencerede çizilir ve seçim köprü üstünden ana pencereye gider", async () => {
    const mutate = vi.fn();
    const snap = { services: SV_PANO, customers: CUSTOMERS, calisanlar: CAL, parts: [], dealers: [], factory: { name: "A" }, appSettings: null, partStock: [], partStockLog: [],
      dosyalar: [], yedekParcaSatislar: [], partSales: [], serverPermissions: null, aktifKullanici: "ofis", kargoYetki: true, kalipYetki: false, uretimFormlari: [], partTypeDefs: [] };
    window.servisBridge = { ilkVeriAl: () => Promise.resolve(snap), onVeri: () => () => {}, mutate };
    render(<ServisPencere />);
    const s = await screen.findAllByRole("combobox", { name: "Kalıbı gönderen kişi" });
    await act(async () => { fireEvent.change(s[0], { target: { value: "Ayşe Kargo" } }); });
    const cagri = mutate.mock.calls.find(c => c[0] === "services");
    expect(cagri).toBeTruthy();
    expect(cagri[1].find(x => x.id === 44).kalipKargoSorumlusu).toBe("Ayşe Kargo");
  });
  it("AC-21: seçiciye tıklamak düzenleme penceresini açmaz", () => {
    render(<Kap />);
    fireEvent.click(secici(tamam()));
    expect(screen.queryByText("Servis Talebini Düzenle")).toBeNull();
    expect(document.querySelectorAll(".modal-backdrop").length).toBe(0);
  });
  it("AC-22, R1/3: fare kaba girince kart sürüklenmez, iki satır arasında gezinmek açmaz, kaptan çıkınca açılır", () => {
    render(<Kap />);
    const a = tamam();
    const s = secici(a);
    const kap = s.parentElement.parentElement;
    const eylem = within(a).getByTitle("Kargo Etiketi Yazdır").parentElement;
    expect(eylem.parentElement).toBe(kap);
    expect(a.getAttribute("draggable")).toBe("true");
    fireEvent.mouseEnter(kap);
    expect(a.getAttribute("draggable")).toBe("false");
    fireEvent.mouseOver(s.parentElement, { relatedTarget: eylem }); // iki iç satır arası
    expect(a.getAttribute("draggable")).toBe("false");
    fireEvent.mouseLeave(kap);
    expect(a.getAttribute("draggable")).toBe("true");
  });
});
