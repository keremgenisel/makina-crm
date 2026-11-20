// @vitest-environment jsdom
// Spec 0149: aramada kelimeler ayrı ayrı aranır, gerçek ekranlarda. Parça kataloğu (toplu fiyat kipi ve Fiyat Listesi dahil),
// müşteri listesi, seçiciler (SearchPick, SearchSelect, Evrak seçim penceresi, CokluSecim), kırpma düzeltmesi yapılan üç ekran,
// kendi normalleştiricisiyle giren kutular (Notlar) ve sunucuda aranan iki günlük ekranı.
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within, waitFor, renderHook } from "@testing-library/react";
import { useState } from "react";
import { PartManager } from "../../src/components/PartManager";
import { Customers } from "../../src/components/Customers";
import { Notes } from "../../src/components/Notes";
import { ServiceForm } from "../../src/components/ServiceForm";
import { PartSaleForm } from "../../src/components/PartSaleForm";
import { SettingsSahipsiz } from "../../src/components/settings/SettingsSahipsiz";
import { SettingsAuditLog } from "../../src/components/settings/SettingsAuditLog";
import { SettingsSecurityLog } from "../../src/components/settings/SettingsSecurityLog";
import { KalemSecPenceresi } from "../../src/components/documents/KalemSecPenceresi";
import { SearchPick, SearchSelect } from "../../src/components/ui";
import { CokluSecim } from "../../src/components/tasarim";
import { useFilteredList } from "../../src/hooks/useFilteredList";

vi.mock("../../src/lib/audit", async (orig) => ({ ...(await orig()), logAction: () => {} }));
afterEach(() => { cleanup(); delete window.appPrint; delete window.auditLog; delete window.securityLog; });

const PARCALAR = [
  { id: 1, ad: "AYNA MAHRUTİ DİŞLİSİ", kod: "AMD-1", fiyatTRY: 100 },
  { id: 2, ad: "AYNA RULMANI", kod: "AR-1", fiyatTRY: 50 },
  { id: 3, ad: "KONVEYÖR TAHRİK MİLİ", kod: "KTM", fiyatTRY: 70 },
];
const yaz = (ph, v) => fireEvent.change(screen.getByPlaceholderText(ph), { target: { value: v } });

describe("Spec 0149: parça kataloğu (useFilteredList, searchFields)", () => {
  const ciz = (ek = {}) => render(<PartManager parts={PARCALAR} setParts={vi.fn()} showToast={vi.fn()} {...ek} />);
  const gorunen = () => PARCALAR.filter(p => screen.queryByText(p.ad)).map(p => p.id);
  it("AC-1 / AC-3 / AC-4: 'ayna dişlisi' ve 'dişlisi ayna' bulur; 'ayna rulman' dişliyi bulmaz", () => {
    ciz();
    yaz("Yedek parça ara...", "ayna dişlisi"); expect(gorunen()).toEqual([1]);
    yaz("Yedek parça ara...", "dişlisi ayna"); expect(gorunen()).toEqual([1]);
    yaz("Yedek parça ara...", "ayna rulman"); expect(gorunen()).toEqual([2]);
  });
  it("AC-6 / AC-7 / AC-18 / AC-30: fazla boşluk aynı sonuç; yalnız boşluk ve boş kutu tam liste", () => {
    ciz();
    yaz("Yedek parça ara...", "  ayna   dişlisi  "); expect(gorunen()).toEqual([1]);
    yaz("Yedek parça ara...", "    "); expect(gorunen()).toEqual([1, 2, 3]);
    yaz("Yedek parça ara...", ""); expect(gorunen()).toEqual([1, 2, 3]);
  });
  it("AC-22: liste ekranına kısa kelime kapısı yok ('a b' ve 'ayna b' süzer)", () => {
    ciz();
    yaz("Yedek parça ara...", "m t"); expect(gorunen()).toEqual([1, 3]);
    yaz("Yedek parça ara...", "ayna d"); expect(gorunen()).toEqual([1]);
  });
  it("AC-33 / R10: toplu fiyat kipinin sayısı ve onayı süzülmüş kümeyi söyler; Fiyat Listesi aynı kümeyi basar", () => {
    const yazdir = vi.fn();
    window.appPrint = { printHtml: yazdir };
    ciz({ appSettings: { fiyatAyarlari: { karKati: 2 } } });
    yaz("Yedek parça ara...", "ayna dişlisi");
    const kip = within(screen.getByTestId("toplu-kip"));
    expect(kip.getByText("Listedeki 1 parçayı elle sabite al")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Fiyat Listesi/ }));
    const html = yazdir.mock.calls[0][0];
    expect(html).toContain("AYNA MAHRUTİ DİŞLİSİ"); expect(html).not.toContain("AYNA RULMANI"); expect(html).not.toContain("KONVEYÖR");
  });
});

describe("Spec 0149: müşteri listesi (searchFn, R8/3)", () => {
  const MUS = [
    { id: 11, name: "AYNA GIDA", city: "İstanbul", model: "AK100", serialNo: "S-1" },
    { id: 12, name: "AYNA PASTANESİ", city: "Ankara", model: "AK100", serialNo: "S-2" },
    { id: 13, name: "BAŞKA", city: "İstanbul", model: "AK100", serialNo: "S-3", prevOwners: [{ name: "Eski Ayna" }] },
  ];
  it("AC-9 / AC-23: 'ayna istanbul' adı ve şehri ayrı alanlarda olan kayıtları bulur (eski sahip dahil)", () => {
    render(<Customers isCustomer customers={MUS} setCustomers={vi.fn()} services={[]} setServices={vi.fn()} dealers={[]} models={[]} factory={{ name: "Altuntaş" }}
      parts={[]} partSales={[]} setPartSales={vi.fn()} yedekParcaSatislar={[]} setYedekParcaSatislar={vi.fn()} payments={[]} setPayments={vi.fn()} stock={[]} />);
    const kutu = screen.getAllByRole("textbox").find(i => i.placeholder && /ara/i.test(i.placeholder));
    fireEvent.change(kutu, { target: { value: "ayna istanbul" } });
    expect(screen.queryByText("AYNA GIDA")).toBeTruthy();
    expect(screen.queryByText("AYNA PASTANESİ")).toBeNull();
    expect(screen.queryByText("BAŞKA")).toBeTruthy();
  });
});

describe("Spec 0149: seçiciler (ui.jsx, R8/2)", () => {
  it("AC-10 / AC-23: SearchPick iki kelimeli sorguyla süzer", () => {
    render(<SearchPick items={PARCALAR} getLabel={p => p.ad} getKey={p => p.id} placeholder="Parça ara..." onPick={vi.fn()} />);
    const kutu = screen.getByPlaceholderText("Parça ara...");
    fireEvent.focus(kutu);
    fireEvent.change(kutu, { target: { value: "dişlisi ayna" } });
    expect([...document.querySelectorAll(".sp-option")].map(e => e.textContent)).toEqual(["AYNA MAHRUTİ DİŞLİSİ"]);
    fireEvent.change(kutu, { target: { value: "   " } });
    expect(document.querySelectorAll(".sp-option")).toHaveLength(3);
  });
  it("AC-11: Evrak satırının parça seçme penceresi aynı kuralla", () => {
    render(<KalemSecPenceresi baslik="Parça Kataloğundan Seç" items={PARCALAR} getLabel={p => `${p.ad} · ${p.kod}`} getKey={p => p.id} placeholder="Parça ara..." onPick={vi.fn()} onClose={vi.fn()} />);
    const kutu = screen.getByPlaceholderText("Parça ara...");
    fireEvent.change(kutu, { target: { value: "ayna amd" } });
    expect([...document.querySelectorAll(".sp-option")].map(e => e.textContent)).toEqual(["AYNA MAHRUTİ DİŞLİSİ · AMD-1"]);
  });
  it("AC-23: SearchSelect iki kelimeli sorguyla süzer", () => {
    render(<SearchSelect value="" onChange={vi.fn()} options={PARCALAR.map(p => ({ value: String(p.id), label: p.ad }))} searchPlaceholder="Kalıp ara..." />);
    fireEvent.click(screen.getByRole("button", { name: /Seçin/ }));
    fireEvent.change(screen.getByPlaceholderText("Kalıp ara..."), { target: { value: "mili konveyör" } });
    expect(screen.queryByText("KONVEYÖR TAHRİK MİLİ")).toBeTruthy();
    expect(screen.queryByText("AYNA RULMANI")).toBeNull();
  });
  it("R6/2 / AC-25: CokluSecim kelime kuralıyla, harf sadeleştirmesi olmadan", () => {
    render(<CokluSecim secenekler={[{ id: 1, ad: "Yıldız Çelik Sanayi" }, { id: 2, ad: "Beta Plastik" }]} secili={[]} onChange={vi.fn()} aramaYerTutucu="Tedarikçi ara..." testId="cs" />);
    yaz("Tedarikçi ara...", "sanayi yıldız");
    expect(screen.queryByText("Yıldız Çelik Sanayi")).toBeTruthy(); expect(screen.queryByText("Beta Plastik")).toBeNull();
    yaz("Tedarikçi ara...", "yildiz");
    expect(screen.queryByText("Yıldız Çelik Sanayi")).toBeNull();
  });
});

describe("Spec 0149: kırpma düzeltmesi (R3, AC-5)", () => {
  const MUS = [{ id: 1, name: "AYNA GIDA", contact: "Ali", model: "AK100", serialNo: "S-1" }, { id: 2, name: "BETA", serialNo: "S-2" }];
  it("AC-5: servis formunun müşteri aramasında 'ayna ' (sonda boşluk) artık bulur; iki kelime de çalışır", () => {
    const Kap = () => { const [form, setForm] = useState({ customerId: "", type: "Bakım" }); return <ServiceForm title="S" form={form} setForm={setForm} customers={MUS} onSave={vi.fn()} onCancel={vi.fn()} />; };
    render(<Kap />);
    yaz("Firma adı, kişi veya seri no ile ara...", "ayna ");
    expect(screen.queryByText(/AYNA GIDA/)).toBeTruthy();
    yaz("Firma adı, kişi veya seri no ile ara...", "ali s-1");
    expect(screen.queryByText(/AYNA GIDA/)).toBeTruthy(); expect(screen.queryByText(/BETA/)).toBeNull();
  });
  it("AC-5: Extra Kalıp formunun müşteri aramasında 'ayna ' artık bulur", () => {
    const Kap = () => { const [form, setForm] = useState({ customerId: "", kaliplar: [{ ad: "", olcu: "", fiyat: "" }] }); return <PartSaleForm title="Extra Kalıp Satışı" form={form} setForm={setForm} customers={MUS} kalipDefs={[]} dealers={[]} factory={{ name: "Altuntaş" }} onSave={vi.fn()} onCancel={vi.fn()} />; };
    render(<Kap />);
    const kutu = screen.getAllByRole("textbox").find(i => /ara/i.test(i.placeholder || ""));
    fireEvent.change(kutu, { target: { value: "ayna " } });
    expect(screen.queryByText(/AYNA GIDA/)).toBeTruthy();
  });
  it("AC-5: Sahipsiz Kayıtlar'ın bağlama aramasında 'lezzet ' artık bulur; iki kelime alanlar arası", () => {
    render(<SettingsSahipsiz rawCustomers={[{ id: 1, name: "LEZZET BAHÇESİ", model: "AKF3701S", serialNo: "F0000288", city: "İzmir" }, { id: 2, name: "Başka Firma", city: "İzmir" }]}
      rawServices={[{ id: 10, customerId: 999, type: "Garanti Dışı", date: "2026-07-28" }]} setServices={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Müşteriye Bağla/ }));
    yaz("Firma adı, seri no veya model ara...", "lezzet ");
    expect(screen.queryByText("LEZZET BAHÇESİ")).toBeTruthy();
    yaz("Firma adı, seri no veya model ara...", "izmir akf");
    expect(screen.queryByText("LEZZET BAHÇESİ")).toBeTruthy(); expect(screen.queryByText("Başka Firma")).toBeNull();
  });
});

describe("Spec 0149: kendi normalleştiricisiyle giren kutular (R5/2, AC-25)", () => {
  it("AC-25: Notlar iki kelimeyle çalışır; 'dişlisi' bulur, 'dislisi' bulmaz (harf sadeleştirmesi yok)", () => {
    const notes = [{ id: 1, content: "Ayna mahruti dişlisi siparişi", updatedAt: 2 }, { id: 2, content: "Rulman notu", updatedAt: 1 }];
    render(<Notes notes={notes} setNotes={vi.fn()} aktifKullanici="" />);
    yaz("Notlarda ara...", "siparişi ayna");
    expect(screen.queryAllByText(/Ayna mahruti/).length).toBeGreaterThan(0); expect(screen.queryAllByText(/Rulman notu/)).toHaveLength(0);
    yaz("Notlarda ara...", "dislisi");
    expect(screen.queryAllByText(/Ayna mahruti/)).toHaveLength(0);
  });
});

describe("Spec 0149: sunucuda aranan günlük ekranları (X6, AC-24)", () => {
  it("AC-24: İşlem Geçmişi'nin iki kelimeli sorgusu sunucuya tek parça gider", async () => {
    window.auditLog = { get: vi.fn(async () => ({ ok: true, rows: [], total: 0 })) };
    render(<SettingsAuditLog serverPermissions={null} />);
    const kutu = screen.getByPlaceholderText("Ara: kayıt adı, detay...");
    fireEvent.change(kutu, { target: { value: "ayna dişlisi" } });
    fireEvent.keyDown(kutu, { key: "Enter" });
    await waitFor(() => expect(window.auditLog.get.mock.calls.some(c => c[0].q === "ayna dişlisi")).toBe(true));
  });
  it("AC-24: Kullanıcı Geçmişi'nin iki kelimeli sorgusu sunucuya kırpılmış tek parça gider", async () => {
    window.securityLog = { get: vi.fn(async () => ({ ok: true, rows: [], total: 0 })) };
    render(<SettingsSecurityLog serverPermissions={null} />);
    const kutu = screen.getByPlaceholderText("Ara: kullanıcı, IP, detay...");
    fireEvent.change(kutu, { target: { value: "  admin 192.168  " } });
    fireEvent.keyDown(kutu, { key: "Enter" });
    await waitFor(() => expect(window.securityLog.get.mock.calls.some(c => c[0].q === "admin 192.168")).toBe(true));
  });
});

describe("Spec 0149: kanca sözleşmesi (R8/3)", () => {
  it("AC-26: searchFn ayrıştırılmış nesneyi alır ({ kelimeler })", () => {
    const fn = vi.fn(() => true);
    const { result } = renderHook(() => useFilteredList([{ id: 1 }], { searchFn: fn, baslangicArama: "Ayna  Dişlisi" }));
    expect(result.current.filtered).toHaveLength(1);
    expect(fn.mock.calls[0][1]).toEqual({ kelimeler: ["ayna", "dislisi"] });
  });
});
