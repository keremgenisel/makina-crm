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

  it("satış tarihi gün/ay/yıl gösterilir (ham YYYY-MM-DD değil)", () => {
    render(<Harness baslangic={[satis5]} />);
    expect(screen.getByText(/15\/07\/2026/)).toBeTruthy();
    expect(screen.queryByText(/2026-07-15/)).toBeNull();
  });

  it("tahsis satırı gün/ay/yıl tarihiyle listelenir", () => {
    const tahsisli = { ...satis5, id: 652, miktar: 5, tahsisler: [{ miktar: 2, customerId: 1, serialNo: "SN-1", tarih: "2026-08-03" }] };
    render(<Harness baslangic={[tahsisli]} />);
    expect(screen.getByText(/→ ABC Makina.*03\/08\/2026/)).toBeTruthy();
  });

  it("'tahsisi eksik' filtresi tam-bağlı satışı gizler", () => {
    const tam = { ...satis5, id: 651, miktar: 2, tahsisler: [{ miktar: 2, customerId: 1, serialNo: "SN-1", tarih: "2026-07-16" }] };
    render(<Harness baslangic={[satis5, tam]} />);
    // "Tümü": tek alıcı → tek grup (otomatik açık), özette "2 satış"
    expect(screen.getByText("Bayi X")).toBeTruthy();
    expect(screen.getByText(/2 satış/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Tahsisi eksik/ }));
    // "Tahsisi eksik" düz worklist: tam bağlı (651) gizli → yalnız 1 satır kartı (bekliyor)
    expect(screen.getAllByText("Bayi X").length).toBe(1);
    expect(screen.getByText(/Bayi stoğu \(bekliyor\)/)).toBeTruthy();
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
  // 12 ayrı alıcı (dış firma) → "Tümü" gruplu görünümde 12 grup → gruplar sayfalanır.
  const cok = Array.from({ length: 12 }, (_, i) => ({ id: 800 + i, disFirma: true, disFirmaAd: `Firma ${String(i).padStart(2, "0")}`, partId: "7", miktar: 1, birimFiyat: 100, currency: "TRY", tarih: `2026-07-${String(i + 1).padStart(2, "0")}`, odendi: false, tahsisler: [] }));

  it("10'dan fazla alıcı grubu sayfalanır; ilk sayfa 10, sonraki sayfada kalan 2", () => {
    render(<Harness baslangic={cok} />);
    expect(screen.getAllByText("ANLAŞMASIZ SERVİS").length).toBe(10); // grup başlığı rozetleri
    fireEvent.click(screen.getByRole("button", { name: /Sonraki/ }));
    expect(screen.getAllByText("ANLAŞMASIZ SERVİS").length).toBe(2);
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

describe("YedekParcaSatisTab — alıcıya göre gruplu görünüm", () => {
  const bayiSatis = { id: 700, dealerId: 5, partId: "7", miktar: 3, birimFiyat: 100, currency: "TRY", faturaTipi: "Faturalı Yurtiçi", tarih: "2026-07-10", odendi: false, tahsisler: [] };
  const musSatis = { id: 701, aliciTipi: "musteri", musteriId: 1, partId: "7", miktar: 2, birimFiyat: 50, currency: "TRY", faturaTipi: "Faturalı Yurtiçi", tarih: "2026-07-11", odendi: true, tahsisler: [{ customerId: 1, miktar: 2 }] };

  it("iki farklı alıcı → iki grup; katlı başlar, başlığa tıklayınca satış açılır", () => {
    render(<Harness baslangic={[bayiSatis, musSatis]} />);
    expect(screen.getByText("Bayi X")).toBeTruthy();
    expect(screen.getByText("ABC Makina")).toBeTruthy();
    // Katlı → satış detay durumu görünmez
    expect(screen.queryByText(/Bayi stoğu \(bekliyor\)/)).toBeNull();
    // Bayi grubunu aç → satış kartı görünür
    fireEvent.click(screen.getByText("Bayi X"));
    expect(screen.getByText(/Bayi stoğu \(bekliyor\)/)).toBeTruthy();
  });

  it("grup özeti satış sayısı/adet + ödenmemiş borcu (KDV dahil) gösterir", () => {
    render(<Harness baslangic={[bayiSatis, musSatis]} />);
    expect(screen.getByText(/1 satış · 3 adet/)).toBeTruthy();   // bayi grubu
    expect(screen.getByText(/Ödenmemiş/)).toBeTruthy();           // 3×100=300 + %20 = 360, yalnız ödenmemiş bayi satışı
  });

  it("tek alıcı grubu otomatik açık gelir (katlamanın anlamı yok)", () => {
    render(<Harness baslangic={[bayiSatis]} />);
    expect(screen.getByText(/Bayi stoğu \(bekliyor\)/)).toBeTruthy(); // tıklamadan görünür
  });

  it("'Tahsisi eksik' filtresi de alıcıya göre gruplu (düz liste değil), varsayılan katlı, akordeon çalışır", () => {
    // İki farklı alıcı, ikisi de eksik tahsisli
    const bayiEksik = { id: 710, dealerId: 5, partId: "7", miktar: 3, birimFiyat: 100, currency: "TRY", tarih: "2026-07-10", odendi: false, tahsisler: [] };
    const musEksik = { id: 711, aliciTipi: "musteri", musteriId: 1, partId: "7", miktar: 2, birimFiyat: 50, currency: "TRY", tarih: "2026-07-11", odendi: false, tahsisler: [] };
    render(<Harness baslangic={[bayiEksik, musEksik]} />);
    fireEvent.click(screen.getByRole("button", { name: /Tahsisi eksik/ }));
    // İki grup başlığı görünür (gruplu), her alıcının adı tam olarak 1 kez (grup başlığı, kart adı gizli)
    expect(screen.getAllByText("Bayi X").length).toBe(1);
    expect(screen.getAllByText("ABC Makina").length).toBe(1);
    // Varsayılan katlı → tahsis butonları başta görünmez
    expect(screen.queryByRole("button", { name: /Makinaya tahsis et/ })).toBeNull();
    // Bayi grubuna tıkla → akordeon açılır, tahsis butonu görünür
    fireEvent.click(screen.getByText("Bayi X"));
    expect(screen.getAllByRole("button", { name: /Makinaya tahsis et/ }).length).toBe(1);
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

  it("tahsis tarihi geçmişe alınabilir (eski kayıt); tahsis satırı o tarihi gün/ay/yıl gösterir", () => {
    render(<Harness baslangic={[satis5]} />);
    fireEvent.click(screen.getByRole("button", { name: /Makinaya tahsis et/ }));
    makinaSec("ABC", /ABC Makina/);
    fireEvent.change(document.querySelector('input[type="date"]'), { target: { value: "2026-03-04" } });
    fireEvent.change(document.querySelector('input[type="number"]'), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: /Tahsis Et/ }));
    // Tahsis satırı girilen geçmiş tarihi gün/ay/yıl gösterir (bugün değil)
    expect(screen.getByText(/→ ABC Makina.*04\/03\/2026/)).toBeTruthy();
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

  it("makinaya tahsis açılırken başkasında kilitliyse tahsis yerine kilit uyarısı gösterir", async () => {
    const acquire = vi.fn().mockResolvedValue({ ok: false, lockedBy: "Ofis", lockedAt: new Date().toISOString() });
    window.crmLocks = { acquire, release: vi.fn().mockResolvedValue({}) };
    render(<Harness baslangic={[satis5]} />);
    fireEvent.click(screen.getByRole("button", { name: /Makinaya tahsis et/ }));
    expect(acquire).toHaveBeenCalledWith("yedek_parca", "650", false);
    expect(await screen.findByText("Bu kayıt şu an düzenleniyor")).toBeTruthy();
    expect(screen.getByText(/Ofis/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Tahsis Et$/ })).toBeNull(); // tahsis alanları gizli
  });

  it("tahsis kilidi alınırsa tahsis modalı normal açılır", async () => {
    const acquire = vi.fn().mockResolvedValue({ ok: true });
    window.crmLocks = { acquire, release: vi.fn().mockResolvedValue({}) };
    render(<Harness baslangic={[satis5]} />);
    fireEvent.click(screen.getByRole("button", { name: /Makinaya tahsis et/ }));
    expect(await screen.findByRole("button", { name: /^Tahsis Et$/ })).toBeTruthy();
    expect(screen.queryByText("Bu kayıt şu an düzenleniyor")).toBeNull();
  });
});

describe("YedekParcaSatisForm — çoklu parça (ekleme modu)", () => {
  const FormHarness = ({ onSave = vi.fn() }) => {
    const [form, setForm] = useState({ aliciTipi: "bayi", dealerId: 5, satirlar: [{ partId: "", miktar: "", birimFiyat: "" }], currency: "TRY", tarih: "2026-07-20", faturaTipi: "Faturalı Yurtiçi" });
    return <YedekParcaSatisForm title="Yeni Yedek Parça Satışı" form={form} setForm={setForm}
      dealers={dealers} customers={customers} parts={parts} partStock={[{ id: 1, partId: "7", miktar: 10 }]} onSave={onSave} onCancel={vi.fn()} />;
  };

  it("ekleme modunda 'Parça Ekle' ile satır eklenir (satır satır aşağı)", () => {
    render(<FormHarness />);
    // Başta tek miktar (adet) alanı
    expect(screen.getAllByPlaceholderText("Adet")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: /Parça Ekle/ }));
    expect(screen.getAllByPlaceholderText("Adet")).toHaveLength(2); // ikinci satır eklendi
    fireEvent.click(screen.getByRole("button", { name: /Parça Ekle/ }));
    expect(screen.getAllByPlaceholderText("Adet")).toHaveLength(3);
  });

  it("düzenleme modunda (form.id) tek parça alanı — çoklu satır yok", () => {
    const EditHarness = () => {
      const [form, setForm] = useState({ id: 900, aliciTipi: "bayi", dealerId: 5, partId: "7", miktar: "5", birimFiyat: "100", currency: "TRY", tarih: "2026-07-20" });
      return <YedekParcaSatisForm title="Yedek Parça Satışını Düzenle" form={form} setForm={setForm}
        dealers={dealers} customers={customers} parts={parts} partStock={[{ id: 1, partId: "7", miktar: 10 }]} onSave={vi.fn()} onCancel={vi.fn()} />;
    };
    render(<EditHarness />);
    expect(screen.queryByRole("button", { name: /Parça Ekle/ })).toBeNull();
  });

  it("'Servis ve Kargo Panosuna gönder' opt-in: varsayılan KAPALI (panoya düşmez), işaretleyince pano alanları açılır", () => {
    render(<FormHarness />);
    const toggle = screen.getByText(/Servis ve Kargo Panosuna gönder/).closest("label").querySelector('input[type="checkbox"]');
    expect(toggle.checked).toBe(false);                            // varsayılan kapalı (panoya düşmez)
    expect(screen.queryByText("Pano Durumu")).toBeNull();
    // Kargo firma/takip teslim şekline (varsayılan Kargo) bağlı; panodan bağımsız zaten görünür.
    expect(screen.getByPlaceholderText("Kargo firması")).toBeTruthy();
    fireEvent.click(toggle);
    expect(screen.getByText("Pano Durumu")).toBeTruthy();          // opt-in işaretlenince pano alanları
  });

  it("'Fabrika Teslim' seçmek fabrikaTeslim:true yapar, panoya DÜŞÜRMEZ, kargo firma/takip gizlenir", () => {
    let sonForm;
    const H = () => {
      const [form, setForm] = useState({ aliciTipi: "bayi", dealerId: 5, satirlar: [{ partId: "7", miktar: "2", birimFiyat: "100" }], currency: "TRY", tarih: "2026-07-20", faturaTipi: "Faturalı Yurtiçi" });
      sonForm = form;
      return <YedekParcaSatisForm title="Yeni Yedek Parça Satışı" form={form} setForm={setForm} dealers={dealers} customers={customers} parts={parts} partStock={[{ id: 1, partId: "7", miktar: 10 }]} onSave={vi.fn()} onCancel={vi.fn()} />;
    };
    render(<H />);
    fireEvent.click(screen.getByRole("button", { name: /Fabrika Teslim/ }));
    expect(sonForm.fabrikaTeslim).toBe(true);
    expect(sonForm.kargoDurum).toBeFalsy();                // teslim şekli AYRI karar → panoya düşürmez
    expect(screen.queryByPlaceholderText("Kargo firması")).toBeNull(); // fabrika teslimde kargo firma yok
    expect(screen.getByText("Teslim Eden Kişi")).toBeTruthy();         // etiket "Teslim Eden Kişi"
  });

  it("Bayi arama kutusundan 'Diğer (anlaşmasız firma)' seçilince dış firma alanları açılır (adres dahil)", () => {
    let sonForm;
    const H = () => {
      const [form, setForm] = useState({ aliciTipi: "bayi", dealerId: "", satirlar: [{ partId: "7", miktar: "2", birimFiyat: "100" }], currency: "TRY" });
      sonForm = form;
      return <YedekParcaSatisForm title="Yeni Yedek Parça Satışı" form={form} setForm={setForm} dealers={dealers} customers={customers} parts={parts} partStock={[{ id: 1, partId: "7", miktar: 10 }]} onSave={vi.fn()} onCancel={vi.fn()} />;
    };
    render(<H />);
    // Arama kutusuna odaklan → "Diğer" seçeneği listede; onMouseDown ile seç
    fireEvent.focus(screen.getByPlaceholderText(/Bayi ara veya 'Diğer' seç/));
    fireEvent.mouseDown(screen.getByText(/Diğer \(anlaşmasız firma\)/));
    expect(sonForm.disFirma).toBe(true);
    expect(screen.getByText(/Anlaşmasız Dış Firma/)).toBeTruthy();
    expect(screen.getByText("Firma Adı")).toBeTruthy();
    expect(screen.getByText("Adres")).toBeTruthy();                       // ülke/şehir üstünde adres satırı
    expect(screen.getByPlaceholderText(/Açık adres/)).toBeTruthy();
    expect(screen.getByText("Ülke")).toBeTruthy();
    expect(screen.getByText("Şehir")).toBeTruthy();
  });

  it("'Farklı adrese kargolat' Kargo seçiliyken görünür (panodan bağımsız); işaretleyince teslimat alanları açılır", () => {
    let sonForm;
    const H = () => {
      const [form, setForm] = useState({ aliciTipi: "bayi", dealerId: 5, satirlar: [{ partId: "7", miktar: "2", birimFiyat: "100" }], currency: "TRY", faturaTipi: "Faturalı Yurtiçi" });
      sonForm = form;
      return <YedekParcaSatisForm title="Yeni Yedek Parça Satışı" form={form} setForm={setForm} dealers={dealers} customers={customers} parts={parts} partStock={[{ id: 1, partId: "7", miktar: 10 }]} onSave={vi.fn()} onCancel={vi.fn()} />;
    };
    render(<H />);
    // Teslim şekli varsayılan Kargo → teslimat seçeneği panoya BAKMADAN görünür.
    const tesToggle = screen.getByText(/Farklı adrese kargolat/).closest("label").querySelector('input[type="checkbox"]');
    expect(tesToggle.checked).toBe(false);
    expect(screen.queryByPlaceholderText("Cadde, mahalle, no")).toBeNull();
    fireEvent.click(tesToggle);
    expect(sonForm.teslimatFarkli).toBe(true);
    expect(screen.getByPlaceholderText("Cadde, mahalle, no")).toBeTruthy();
    expect(screen.getByText("Teslim Alacak (kişi / firma)")).toBeTruthy();
  });

  it("dış firma: Ülke=Türkiye ise Şehir listeden (81 il) seçilir — free text değil", () => {
    const H = () => {
      const [form, setForm] = useState({ aliciTipi: "bayi", disFirma: true, disFirmaAd: "Harici Ltd", disFirmaUlke: "Türkiye", satirlar: [{ partId: "7", miktar: "1", birimFiyat: "100" }], currency: "TRY" });
      return <YedekParcaSatisForm title="Yeni Yedek Parça Satışı" form={form} setForm={setForm} dealers={dealers} customers={customers} parts={parts} partStock={[{ id: 1, partId: "7", miktar: 10 }]} onSave={vi.fn()} onCancel={vi.fn()} />;
    };
    render(<H />);
    expect(screen.getByRole("option", { name: "Türkiye" })).toBeTruthy();  // ülke dropdown
    expect(screen.getByRole("option", { name: "Kocaeli" })).toBeTruthy();  // şehir dropdown'ında il gelir
  });

  it("teslimat: Ülke=Türkiye + Şehir seçili ise İlçe de listeden seçilir", () => {
    const H = () => {
      const [form, setForm] = useState({ aliciTipi: "bayi", dealerId: 5, satirlar: [{ partId: "7", miktar: "1", birimFiyat: "100" }], currency: "TRY", kargoDurum: "Hazırlanıyor", teslimatFarkli: true, teslimatUlke: "Türkiye", teslimatSehir: "Kocaeli" });
      return <YedekParcaSatisForm title="Yeni Yedek Parça Satışı" form={form} setForm={setForm} dealers={dealers} customers={customers} parts={parts} partStock={[{ id: 1, partId: "7", miktar: 10 }]} onSave={vi.fn()} onCancel={vi.fn()} />;
    };
    render(<H />);
    expect(screen.getByRole("option", { name: "Kocaeli" })).toBeTruthy();  // şehir dropdown
    expect(screen.getByRole("option", { name: "Gebze" })).toBeTruthy();    // ilçe dropdown (Türkiye + şehir)
  });

  it("Fabrika Teslim'de 'Farklı adrese kargolat' çıkmaz (sevk adresi anlamsız)", () => {
    const H = () => {
      const [form, setForm] = useState({ aliciTipi: "bayi", dealerId: 5, satirlar: [{ partId: "7", miktar: "2", birimFiyat: "100" }], currency: "TRY", fabrikaTeslim: true, kargoDurum: "Hazırlanıyor" });
      return <YedekParcaSatisForm title="Yeni Yedek Parça Satışı" form={form} setForm={setForm} dealers={dealers} customers={customers} parts={parts} partStock={[{ id: 1, partId: "7", miktar: 10 }]} onSave={vi.fn()} onCancel={vi.fn()} />;
    };
    render(<H />);
    expect(screen.queryByText(/Farklı adrese kargolat/)).toBeNull();
  });

  it("'Alıcının adresini doldur' bayinin kayıtlı adresini teslimat alanlarına kopyalar", () => {
    const zenginBayi = [{ id: 5, name: "Bayi X", bayiMi: true, phone: "0262 111 22 33", adres: "Sanayi Sitesi 3. Blok", city: "Kocaeli", country: "Türkiye", ilce: "Gebze" }];
    let sonForm;
    const H = () => {
      const [form, setForm] = useState({ aliciTipi: "bayi", dealerId: 5, satirlar: [{ partId: "7", miktar: "2", birimFiyat: "100" }], currency: "TRY", kargoDurum: "Hazırlanıyor", teslimatFarkli: true });
      sonForm = form;
      return <YedekParcaSatisForm title="Yeni Yedek Parça Satışı" form={form} setForm={setForm} dealers={zenginBayi} customers={customers} parts={parts} partStock={[{ id: 1, partId: "7", miktar: 10 }]} onSave={vi.fn()} onCancel={vi.fn()} />;
    };
    render(<H />);
    fireEvent.click(screen.getByRole("button", { name: /Alıcının adresini doldur/ }));
    expect(sonForm.teslimatAd).toBe("Bayi X");
    expect(sonForm.teslimatAdres).toBe("Sanayi Sitesi 3. Blok");
    expect(sonForm.teslimatSehir).toBe("Kocaeli");
    expect(sonForm.teslimatIlce).toBe("Gebze");
    expect(sonForm.teslimatTel).toBe("0262 111 22 33");
  });

  it("Teslim Şekli segmenti Kargo↔Fabrika Teslim geçişi (fabrikaTeslim bayrağı), kargoDurum'a dokunmaz", () => {
    let sonForm;
    const H = () => {
      const [form, setForm] = useState({ aliciTipi: "bayi", dealerId: 5, satirlar: [{ partId: "7", miktar: "2", birimFiyat: "100" }], currency: "TRY", fabrikaTeslim: true });
      sonForm = form;
      return <YedekParcaSatisForm title="Yeni Yedek Parça Satışı" form={form} setForm={setForm} dealers={dealers} customers={customers} parts={parts} partStock={[{ id: 1, partId: "7", miktar: 10 }]} onSave={vi.fn()} onCancel={vi.fn()} />;
    };
    render(<H />);
    fireEvent.click(screen.getByRole("button", { name: /📦 Kargo/ })); // Kargo'ya geç → fabrikaTeslim false
    expect(sonForm.fabrikaTeslim).toBe(false);
    expect(sonForm.kargoDurum).toBeFalsy(); // teslim şekli değişimi panoya SOKMAZ
  });
});
