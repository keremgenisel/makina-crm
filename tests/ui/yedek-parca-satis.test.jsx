// @vitest-environment jsdom
// Bayiye yedek parça (kargo) satışı sekmesi: satış kaydı (stok düşer), makina tahsisi parça parça
// (5 dişli → 2 + 2, kalan bekler), "tahsisi eksik" filtresi, ödendi toggle.
import { describe, it, expect, afterEach, vi } from "vitest";
import { useState } from "react";
import { render, screen, cleanup, fireEvent, within } from "@testing-library/react";

afterEach(cleanup);
import { YedekParcaSatisTab } from "../../src/components/stock/YedekParcaSatisTab";
import { YedekParcaSatisForm } from "../../src/components/YedekParcaSatisForm";

const dealers = [{ id: 5, name: "Bayi X", bayiMi: true, city: "Kocaeli", country: "Türkiye" }];
const parts = [{ id: 7, ad: "Dişli", kod: "D-7", fiyatTRY: 120 }];
const customers = [
  { id: 1, name: "ABC Makina", model: "AK-100", serialNo: "SN-1" },
  { id: 2, name: "DEF Sanayi", model: "AK-200", serialNo: "SN-2" },
];

// setState davranışını taklit eden, gerçek state tutan sarmalayıcı (tahsis/ödeme mutasyonları görünür).
const Harness = ({ baslangic = [] }) => {
  const [satislar, setSatislar] = useState(baslangic);
  const [partStock, setPartStock] = useState([{ id: 1, partId: "7", miktar: 10 }]);
  const [partStockLog, setPartStockLog] = useState([]);
  return (
    <YedekParcaSatisTab
      yedekParcaSatislar={satislar} setYedekParcaSatislar={setSatislar}
      dealers={dealers} parts={parts} customers={customers}
      partStock={partStock} setPartStock={setPartStock} partStockLog={partStockLog} setPartStockLog={setPartStockLog}
      showToast={vi.fn()} canDoStock={() => true} />
  );
};

const satis5 = { id: 650, dealerId: 5, partId: "7", miktar: 5, birimFiyat: 120, currency: "TRY", tarih: "2026-07-15", odendi: false, tahsisler: [] };

// SearchPick paneli yalnız odaklanınca açılır → odakla + yaz + seç.
const makinaSec = (arama, adSecili) => {
  const inp = screen.getByPlaceholderText(/Firma \/ model \/ seri no ara/);
  fireEvent.focus(inp);
  fireEvent.change(inp, { target: { value: arama } });
  // SearchPick seçenekleri onMouseDown ile seçilir (blur'dan önce; e.preventDefault).
  fireEvent.mouseDown(screen.getByText(adSecili));
};

describe("YedekParcaSatisTab — liste + durum", () => {
  it("tahsissiz satış 'Bayi stoğu (bekliyor)' rozetiyle görünür", () => {
    render(<Harness baslangic={[satis5]} />);
    expect(screen.getByText("Bayi X")).toBeTruthy();
    expect(screen.getByText(/Bayi stoğu \(bekliyor\)/)).toBeTruthy();
  });

  it("'tahsisi eksik' filtresi tam-bağlı satışı gizler", () => {
    const tam = { ...satis5, id: 651, miktar: 2, tahsisler: [{ miktar: 2, customerId: 1, serialNo: "SN-1", tarih: "2026-07-16" }] };
    render(<Harness baslangic={[satis5, tam]} />);
    // Başta ikisi de görünür (Bayi X iki kez)
    expect(screen.getAllByText("Bayi X").length).toBe(2);
    fireEvent.click(screen.getByRole("button", { name: /Tahsisi eksik/ }));
    // Tam bağlı (651) gizlenir → yalnız 1 kalır
    expect(screen.getAllByText("Bayi X").length).toBe(1);
  });

  it("ödendi toggle durumu çevirir", () => {
    render(<Harness baslangic={[satis5]} />);
    const btn = screen.getByRole("button", { name: "Ödenmedi" });
    fireEvent.click(btn);
    expect(screen.getByRole("button", { name: "Ödendi" })).toBeTruthy();
  });

  it("silme / ödendi / tahsis İşlem Geçmişine (audit) yazılır", () => {
    const log = vi.fn();
    window.auditLog = { log };
    render(<Harness baslangic={[satis5]} />);
    // ödendi toggle → "odendi"
    fireEvent.click(screen.getByRole("button", { name: "Ödenmedi" }));
    expect(log).toHaveBeenCalledWith(expect.objectContaining({ action: "odendi", entity: "yedek_parca_satis" }));
    // sil → onay → "silindi"
    fireEvent.click(screen.getByRole("button", { name: "Sil" }));
    fireEvent.click(screen.getByText("Evet, Sil"));
    expect(log).toHaveBeenCalledWith(expect.objectContaining({ action: "silindi", entity: "yedek_parca_satis" }));
    delete window.auditLog;
  });
});

describe("YedekParcaSatisTab — arama + sayfalama (10/sayfa)", () => {
  const cok = Array.from({ length: 12 }, (_, i) => ({ id: 800 + i, dealerId: 5, partId: "7", miktar: 1, birimFiyat: 100, currency: "TRY", tarih: `2026-07-${String(i + 1).padStart(2, "0")}`, odendi: false, tahsisler: [] }));

  it("10'dan fazla satış sayfalanır; ilk sayfa 10, sonraki sayfada kalan 2", () => {
    render(<Harness baslangic={cok} />);
    expect(screen.getAllByText("Bayi X").length).toBe(10);
    fireEvent.click(screen.getByRole("button", { name: /Sonraki/ }));
    expect(screen.getAllByText("Bayi X").length).toBe(2);
  });

  it("arama alıcı adı / kargo takip no ile filtreler", () => {
    const karisik = [
      { id: 900, aliciTipi: "musteri", musteriId: 1, partId: "7", miktar: 1, currency: "TRY", tarih: "2026-07-01", tahsisler: [] },
      { id: 901, dealerId: 5, partId: "7", miktar: 1, currency: "TRY", tarih: "2026-07-02", kargoTakipNo: "TK-BENZERSIZ", tahsisler: [] },
    ];
    render(<Harness baslangic={karisik} />);
    const arama = screen.getByPlaceholderText(/Alıcı, parça, kargo no/);
    fireEvent.change(arama, { target: { value: "ABC" } });
    expect(screen.getByText("ABC Makina")).toBeTruthy();
    expect(screen.queryByText("Bayi X")).toBeNull();
    fireEvent.change(arama, { target: { value: "TK-BENZERSIZ" } });
    expect(screen.getByText("Bayi X")).toBeTruthy();
    expect(screen.queryByText("ABC Makina")).toBeNull();
  });
});

describe("YedekParcaSatisForm / Tab — alıcı bayi VEYA müşteri", () => {
  const FormHarness = () => {
    const [form, setForm] = useState({ aliciTipi: "bayi", dealerId: "", musteriId: "", partId: "", miktar: "", currency: "TRY" });
    return <YedekParcaSatisForm title="Yeni" form={form} setForm={setForm} dealers={dealers} customers={customers} parts={parts} partStock={[]} onSave={vi.fn()} onCancel={vi.fn()} />;
  };

  it("formun en altında 'Not' alanı vardır ve yazılabilir", () => {
    render(<FormHarness />);
    expect(screen.getByText("Not")).toBeTruthy();
    const not = screen.getByPlaceholderText(/kargo detayında görünür/);
    fireEvent.change(not, { target: { value: "Acil" } });
    expect(not.value).toBe("Acil");
  });

  it("formda 'Müşteri' alıcı tipine geçip müşteri seçilebilir", () => {
    render(<FormHarness />);
    fireEvent.click(screen.getByRole("button", { name: "Müşteri" }));
    // Müşteri picker'ı çıkar (bayi değil)
    const inp = screen.getByPlaceholderText(/Firma \/ model \/ seri no ara/);
    fireEvent.focus(inp);
    fireEvent.change(inp, { target: { value: "ABC" } });
    fireEvent.mouseDown(screen.getByText(/ABC Makina/));
    // Seçili müşteri kartı görünür
    expect(screen.getByText("ABC Makina")).toBeTruthy();
  });

  it("önceden bayi seçili açılırsa (bayi detayından) bayi seçili gelir", () => {
    const H = () => {
      const [form, setForm] = useState({ aliciTipi: "bayi", dealerId: 5, musteriId: "", partId: "", miktar: "", currency: "TRY" });
      return <YedekParcaSatisForm title="Yeni" form={form} setForm={setForm} dealers={dealers} customers={customers} parts={parts} partStock={[]} onSave={vi.fn()} onCancel={vi.fn()} />;
    };
    render(<H />);
    expect(screen.getByText("Bayi X")).toBeTruthy();
  });

  it("anlaşmalı servis firması (bayiMi:false) ön-seçili açılırsa seçili gelir", () => {
    // Regresyon: bayiMi=false anlaşmalı-servis firması bayi listesinden eleniyor, ön-seçim çözülmüyordu.
    const anlasmali = [{ id: 8, name: "Servis Ltd", bayiMi: false, anlasmaliServisMi: true }];
    const H = () => {
      const [form, setForm] = useState({ aliciTipi: "bayi", dealerId: 8, musteriId: "", partId: "", miktar: "", currency: "TRY" });
      return <YedekParcaSatisForm title="Yeni" form={form} setForm={setForm} dealers={anlasmali} customers={customers} parts={parts} partStock={[]} onSave={vi.fn()} onCancel={vi.fn()} />;
    };
    render(<H />);
    expect(screen.getByText("Servis Ltd")).toBeTruthy();
  });

  it("önceden müşteri seçili açılırsa (müşteri detayından) müşteri seçili gelir", () => {
    const H = () => {
      const [form, setForm] = useState({ aliciTipi: "musteri", musteriId: 1, dealerId: "", partId: "", miktar: "", currency: "TRY" });
      return <YedekParcaSatisForm title="Yeni" form={form} setForm={setForm} dealers={dealers} customers={customers} parts={parts} partStock={[]} onSave={vi.fn()} onCancel={vi.fn()} />;
    };
    render(<H />);
    expect(screen.getByText("ABC Makina")).toBeTruthy();
  });

  it("listede alıcı müşteri satışı müşteri adı + MÜŞTERİ etiketiyle görünür", () => {
    const musSatis = { id: 660, aliciTipi: "musteri", musteriId: 1, partId: "7", miktar: 2, birimFiyat: 100, currency: "TRY", tarih: "2026-07-15", odendi: false, tahsisler: [] };
    render(<Harness baslangic={[musSatis]} />);
    expect(screen.getByText("ABC Makina")).toBeTruthy();
    expect(screen.getByText("MÜŞTERİ")).toBeTruthy();
  });
});

describe("YedekParcaSatisTab — makina tahsisi (bölme)", () => {
  it("5 adet satış 2 + 2 bölünür, kalan 1 bekler (kısmi durum)", () => {
    render(<Harness baslangic={[satis5]} />);

    // 1. tahsis: 2 adet → ABC Makina
    fireEvent.click(screen.getByRole("button", { name: /Makinaya tahsis et/ }));
    makinaSec("ABC", /ABC Makina/);
    fireEvent.change(document.querySelector('input[type="number"]'), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: /Tahsis Et/ }));

    // Kısmi rozet 2/5
    expect(screen.getByText(/Kısmi bağlı \(2\/5\)/)).toBeTruthy();

    // 2. tahsis: 2 adet → DEF Sanayi
    fireEvent.click(screen.getByRole("button", { name: /Makinaya tahsis et/ }));
    makinaSec("DEF", /DEF Sanayi/);
    fireEvent.change(document.querySelector('input[type="number"]'), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: /Tahsis Et/ }));

    // 4/5 kısmi, kalan 1 → "tahsis et (1 kaldı)" hâlâ var
    expect(screen.getByText(/Kısmi bağlı \(4\/5\)/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /1 kaldı/ })).toBeTruthy();
    // İki tahsis satırı listelenir
    expect(screen.getByText(/→ ABC Makina/)).toBeTruthy();
    expect(screen.getByText(/→ DEF Sanayi/)).toBeTruthy();
  });

  it("kalandan fazla tahsis engellenir (showToast err, tahsis eklenmez)", () => {
    const toast = vi.fn();
    const H = () => {
      const [satislar, setSatislar] = useState([satis5]);
      const [ps, setPs] = useState([{ id: 1, partId: "7", miktar: 10 }]);
      const [pl, setPl] = useState([]);
      return <YedekParcaSatisTab yedekParcaSatislar={satislar} setYedekParcaSatislar={setSatislar}
        dealers={dealers} parts={parts} customers={customers}
        partStock={ps} setPartStock={setPs} partStockLog={pl} setPartStockLog={setPl}
        showToast={toast} canDoStock={() => true} />;
    };
    render(<H />);
    fireEvent.click(screen.getByRole("button", { name: /Makinaya tahsis et/ }));
    makinaSec("ABC", /ABC Makina/);
    fireEvent.change(document.querySelector('input[type="number"]'), { target: { value: "9" } }); // kalan 5'ten fazla
    fireEvent.click(screen.getByRole("button", { name: /Tahsis Et/ }));
    expect(toast).toHaveBeenCalledWith(expect.stringMatching(/en fazla 5/i), "err");
    // Tahsis eklenmedi → hâlâ bekliyor
    expect(screen.getByText(/Bayi stoğu \(bekliyor\)/)).toBeTruthy();
  });
});

describe("YedekParcaSatisTab — eşzamanlı düzenleme kilidi", () => {
  afterEach(() => { delete window.crmLocks; });

  it("satış düzenlenirken başkasında kilitliyse form yerine kilit uyarısı gösterir", async () => {
    const acquire = vi.fn().mockResolvedValue({ ok: false, lockedBy: "Ofis", lockedAt: new Date().toISOString() });
    window.crmLocks = { acquire, release: vi.fn().mockResolvedValue({}) };
    render(<Harness baslangic={[satis5]} />);
    fireEvent.click(screen.getByTitle("Düzenle"));
    expect(acquire).toHaveBeenCalledWith("yedek_parca", "650", false);
    expect(await screen.findByText("Bu kayıt şu an düzenleniyor")).toBeTruthy();
    expect(screen.getByText(/Ofis/)).toBeTruthy();
  });

  it("kilit alınırsa düzenleme formu normal açılır", async () => {
    const acquire = vi.fn().mockResolvedValue({ ok: true });
    window.crmLocks = { acquire, release: vi.fn().mockResolvedValue({}) };
    render(<Harness baslangic={[satis5]} />);
    fireEvent.click(screen.getByTitle("Düzenle"));
    expect(await screen.findByText("Yedek Parça Satışını Düzenle")).toBeTruthy();
    expect(screen.queryByText("Bu kayıt şu an düzenleniyor")).toBeNull();
  });
});
