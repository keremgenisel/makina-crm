// @vitest-environment jsdom
// Kargo kartı (📦) + kargo detay modalı. Kargo satışları artık Servis Panosu'nun sütunlarında servis
// kartlarıyla BİRLİKTE görünür; bu dosya kargo parçalarını (KargoKart, KargoDetayModal) test eder.
import { describe, it, expect, afterEach, vi } from "vitest";
import { useState } from "react";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

afterEach(cleanup);
import { KargoKart, KargoDetayModal } from "../../src/components/KargoPanosu";

const dealers = [{ id: 5, name: "Bayi X" }];
const parts = [{ id: 7, ad: "Dişli", kod: "D-7" }];
const customers = [{ id: 1, name: "ABC Makina", model: "AK-100", serialNo: "SN-1" }];
const satis = { id: 650, dealerId: 5, aliciTipi: "bayi", partId: "7", miktar: 5, birimFiyat: 100, currency: "TRY", tarih: "2026-07-15", kargoDurum: "Hazırlanıyor", kargoFirma: "Yurtiçi", kargoTakipNo: "TK1", tahsisler: [] };

describe("KargoKart", () => {
  it("📦 KARGO etiketi + alıcı + makina durumu gösterir, tıklanınca id ile onClick", () => {
    const onClick = vi.fn();
    render(<KargoKart s={satis} dealers={dealers} parts={parts} customers={customers} canKargo onClick={onClick} />);
    expect(screen.getByText(/YEDEK PARÇA/)).toBeTruthy();          // tür pili (KARGO pilinden önce)
    expect(screen.getByText(/📦 KARGO/)).toBeTruthy();
    expect(screen.getByText("Bayi X")).toBeTruthy();
    expect(screen.getByText(/TK1/)).toBeTruthy();
    const art = document.querySelector('article[draggable="true"]');
    expect(art).toBeTruthy();
    fireEvent.click(art);
    expect(onClick).toHaveBeenCalledWith(650);
  });

  it("fabrikaTeslim: pil '📦 KARGO' yerine '🏭 FABRİKA TESLİM' gösterir", () => {
    render(<KargoKart s={{ ...satis, fabrikaTeslim: true }} dealers={dealers} parts={parts} customers={customers} canKargo onClick={vi.fn()} />);
    expect(screen.getByText(/🏭 FABRİKA TESLİM/)).toBeTruthy();
    expect(screen.queryByText(/📦 KARGO/)).toBeNull();
  });

  it("fabrikaTeslim + 'Kargoya Verildi' → durum etiketi 'Teslime Hazır' (kargo yerine)", () => {
    render(<KargoKart s={{ ...satis, kargoDurum: "Kargoya Verildi", fabrikaTeslim: true }} dealers={dealers} parts={parts} customers={customers} canKargo onClick={vi.fn()} />);
    expect(screen.getByText("Teslime Hazır")).toBeTruthy();
    expect(screen.queryByText("Kargoya Verildi")).toBeNull();
  });

  it("kalıp kartında da fabrikaTeslim → '🏭 FABRİKA TESLİM'", () => {
    const kalip = { id: 900, customerId: 1, tur: "Kalıp", ad: "K", kargoDurum: "Hazırlanıyor", fabrikaTeslim: true, tarih: "2026-07-20" };
    render(<KargoKart s={kalip} tur="kalip" customers={customers} calisanlar={[]} canKargo onClick={vi.fn()} />);
    expect(screen.getByText(/🏭 FABRİKA TESLİM/)).toBeTruthy();
    expect(screen.queryByText(/📦 KARGO/)).toBeNull();
  });

  it("farklı teslimat adresi: kartta 📍 rozet + şehir/ilçe gösterir", () => {
    render(<KargoKart s={{ ...satis, teslimatFarkli: true, teslimatSehir: "Ankara", teslimatIlce: "Sincan" }} dealers={dealers} parts={parts} customers={customers} canKargo onClick={vi.fn()} />);
    expect(screen.getByText(/📍 Farklı adres · Ankara \/ Sincan/)).toBeTruthy();
  });

  it("farklı teslimat adresi yoksa 📍 rozet çıkmaz", () => {
    render(<KargoKart s={satis} dealers={dealers} parts={parts} customers={customers} canKargo onClick={vi.fn()} />);
    expect(screen.queryByText(/Farklı adres/)).toBeNull();
  });

  it("kartta tahsis/makina bilgisi HİÇ yazmaz (tahsissiz, kısmi, tam — hepsinde); fiyat da yok", () => {
    const durumlar = [
      { ...satis, tahsisler: [] },                          // tahsissiz
      { ...satis, tahsisler: [{ miktar: 2, customerId: 1 }] }, // kısmi 2/5
      { ...satis, tahsisler: [{ miktar: 5, customerId: 1 }] }, // tam 5/5
    ];
    for (const s of durumlar) {
      const { unmount } = render(<KargoKart s={s} dealers={dealers} parts={parts} customers={customers} canKargo onClick={vi.fn()} />);
      expect(screen.queryByText(/Makina/)).toBeNull();
      expect(screen.queryByText(/kısmi|tahsis/i)).toBeNull();
      expect(screen.queryByText(/₺|TRY|500|100/)).toBeNull(); // kartta fiyat yok
      unmount();
    }
  });

  it("yetki yoksa draggable değil", () => {
    render(<KargoKart s={satis} dealers={dealers} parts={parts} customers={customers} canKargo={false} onClick={vi.fn()} />);
    expect(document.querySelector('article[draggable="true"]')).toBeNull();
  });

  it("'Kim gönderiyor?' select'i firma çalışanlarını listeler ve değiştirilince onSorumluChange çağrılır", () => {
    const onSorumluChange = vi.fn();
    const calisanlar = [{ id: 1, ad: "Ahmet Yılmaz" }, { id: 2, ad: "Mehmet Demir" }];
    render(<KargoKart s={satis} dealers={dealers} parts={parts} customers={customers} calisanlar={calisanlar} canKargo onClick={vi.fn()} onSorumluChange={onSorumluChange} />);
    expect(screen.getByRole("option", { name: "Kim gönderiyor?" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "Mehmet Demir" })).toBeTruthy();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "Mehmet Demir" } });
    expect(onSorumluChange).toHaveBeenCalledWith(650, "Mehmet Demir");
  });

  it("yetki yoksa 'Kim gönderiyor?' select'i disabled", () => {
    render(<KargoKart s={satis} dealers={dealers} parts={parts} customers={customers} calisanlar={[{ id: 1, ad: "Ahmet" }]} canKargo={false} onClick={vi.fn()} onSorumluChange={vi.fn()} />);
    expect(screen.getByRole("combobox").disabled).toBe(true);
  });

  it("Teslim Edildi kargoda '🗄 Kaldır' butonu çıkar; tıklanınca onArsivle çağrılır (kart tıklamasını tetiklemez)", () => {
    const onArsivle = vi.fn(); const onClick = vi.fn();
    const teslim = { ...satis, kargoDurum: "Teslim Edildi" };
    render(<KargoKart s={teslim} dealers={dealers} parts={parts} customers={customers} canKargo onClick={onClick} onArsivle={onArsivle} />);
    const btn = screen.getByRole("button", { name: /Kaldır/ });
    fireEvent.click(btn);
    expect(onArsivle).toHaveBeenCalledTimes(1);
    expect(onClick).not.toHaveBeenCalled(); // stopPropagation → detay açılmaz
  });

  it("Teslim Edilmemiş kargoda 'Kaldır' butonu YOK", () => {
    render(<KargoKart s={{ ...satis, kargoDurum: "Hazırlanıyor" }} dealers={dealers} parts={parts} customers={customers} canKargo onClick={vi.fn()} onArsivle={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /Kaldır/ })).toBeNull();
  });

  it("onArsivle geçilmezse (kargo_pano_kaldir izni yok) 'Kaldır' görünmez — canKargo'dan bağımsız", () => {
    render(<KargoKart s={{ ...satis, kargoDurum: "Teslim Edildi" }} dealers={dealers} parts={parts} customers={customers} canKargo onClick={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /Kaldır/ })).toBeNull();
  });

  it("tur='kalip': KALIP rozeti, müşteri adı, kalıp adı/ölçü, satış firma rozeti; tahsis/adet yok", () => {
    const kalip = { id: 900, customerId: 1, tur: "Kalıp", ad: "Adana Kalıbı", olcu: "55x125", kargoDurum: "Hazırlanıyor", satisFirma: "Bayi X", tarih: "2026-07-20" };
    render(<KargoKart s={kalip} tur="kalip" customers={customers} calisanlar={[]} canKargo onClick={vi.fn()} />);
    expect(screen.getByText(/KALIP/)).toBeTruthy();
    expect(screen.getByText(/📦 KARGO/)).toBeTruthy();              // kalıp kartında KALIP pilinden sonra KARGO pili
    expect(screen.getByText("ABC Makina")).toBeTruthy();            // müşteri (customerId=1)
    expect(screen.getByText(/Adana Kalıbı · 55x125/)).toBeTruthy();
    expect(screen.getByText(/Satış Yapan: Bayi X/)).toBeTruthy();
    expect(screen.queryByText(/\d+ adet|kısmi|tahsis/i)).toBeNull(); // kalıpta miktar/tahsis yok
    // Sürükleme yükü "kalip:" öneğiyle
    const art = document.querySelector('article[draggable="true"]');
    const dt = { setData: vi.fn(), effectAllowed: "" };
    fireEvent.dragStart(art, { dataTransfer: dt });
    expect(dt.setData).toHaveBeenCalledWith("text/plain", "kalip:900");
  });

  it("arşiv modunda select yok, '↩ Panoya Geri Al' butonu var, draggable değil", () => {
    const onGeriAl = vi.fn();
    render(<KargoKart s={{ ...satis, kargoDurum: "Teslim Edildi", panoGizli: true }} dealers={dealers} parts={parts} customers={customers} canKargo arsiv onClick={vi.fn()} onGeriAl={onGeriAl} />);
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(document.querySelector('article[draggable="true"]')).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Panoya Geri Al/ }));
    expect(onGeriAl).toHaveBeenCalledTimes(1);
  });
});

describe("KargoDetayModal", () => {
  const Harness = ({ canKargo = true }) => {
    const [sat, setSat] = useState([satis]);
    const detay = sat.find(s => s.id === 650);
    return <KargoDetayModal grup={detay ? [detay] : null} setYedekParcaSatislar={setSat}
      dealers={dealers} parts={parts} customers={customers} canKargo={canKargo} onClose={vi.fn()} showToast={vi.fn()} />;
  };

  it("kargo takip no düzenlenebilir", () => {
    render(<Harness />);
    const takip = screen.getByPlaceholderText("Takip no");
    fireEvent.change(takip, { target: { value: "TK-YENİ" } });
    expect(takip.value).toBe("TK-YENİ");
  });

  it("satışın notu detay modalında gösterilir", () => {
    const notlu = { ...satis, notlar: "Acil gönderilecek" };
    const H = () => { const [sat, setSat] = useState([notlu]); return <KargoDetayModal grup={[sat[0]]} setYedekParcaSatislar={setSat} dealers={dealers} parts={parts} customers={customers} canKargo onClose={vi.fn()} showToast={vi.fn()} />; };
    render(<H />);
    expect(screen.getByText("Acil gönderilecek")).toBeTruthy();
  });

  it("kargo detay modalında 'Kargo Etiketi' yazdır düğmesi var", () => {
    render(<Harness />);
    expect(screen.getByRole("button", { name: /Kargo Etiketi/ })).toBeTruthy();
  });

  it("kargo detay modalında makina tahsisi YOK (tahsis yalnız Stok sekmesinde yapılır)", () => {
    render(<Harness />);
    expect(screen.queryByRole("button", { name: /Tahsis Et/ })).toBeNull();
    expect(screen.queryByText(/Makina Tahsisleri/)).toBeNull();
  });

  it("farklı teslimat adresi: modalda ayrı 'Teslimat (kargo) Adresi' kutusu gösterir", () => {
    const teslimatli = { ...satis, teslimatFarkli: true, teslimatAd: "Şantiye Deposu", teslimatTel: "0312 111 22 33", teslimatAdres: "Başkent OSB No:8", teslimatSehir: "Ankara", teslimatIlce: "Sincan" };
    const H = () => { const [sat, setSat] = useState([teslimatli]); return <KargoDetayModal grup={[sat[0]]} setYedekParcaSatislar={setSat} dealers={dealers} parts={parts} customers={customers} canKargo onClose={vi.fn()} showToast={vi.fn()} />; };
    render(<H />);
    expect(screen.getByText(/Teslimat \(kargo\) Adresi/)).toBeTruthy();
    expect(screen.getByText("Şantiye Deposu")).toBeTruthy();
    expect(screen.getByText("Başkent OSB No:8")).toBeTruthy();
    expect(screen.getByText("Ankara / Sincan")).toBeTruthy();
  });

  it("farklı teslimat adresi yoksa modalda kutu çıkmaz", () => {
    render(<Harness />);
    expect(screen.queryByText(/Teslimat \(kargo\) Adresi/)).toBeNull();
  });

  it("müşteri alıcıda yetkili/telefon/adres (telefon ayrı satır) görünür", () => {
    const zengin = [{ id: 2, name: "DEF Sanayi", yetkili1Ad: "Ayşe Kaya", yetkili1Tel: "0212 555 11 22", phone: "0212 000 00 00", adres: "OSB 5. Cadde No 12", city: "İstanbul", ilce: "Tuzla", country: "Türkiye" }];
    const musSatis = { ...satis, id: 660, aliciTipi: "musteri", musteriId: 2, dealerId: null, tahsisler: [] };
    const H = () => { const [sat, setSat] = useState([musSatis]); return <KargoDetayModal grup={[sat[0]]} setYedekParcaSatislar={setSat} dealers={dealers} parts={parts} customers={zengin} canKargo onClose={vi.fn()} showToast={vi.fn()} />; };
    render(<H />);
    expect(screen.getByText("Ayşe Kaya")).toBeTruthy();       // Yetkili 1 (ad tek başına)
    expect(screen.getByText("0212 555 11 22")).toBeTruthy();  // Yetkili 1 Tel. ayrı satır
    expect(screen.getByText("OSB 5. Cadde No 12")).toBeTruthy();
    expect(screen.getByText("Tuzla / İstanbul / Türkiye")).toBeTruthy(); // ilçe önce, sonra şehir
  });

  it("bayi alıcıda 'İletişim Kişisi' + 'Telefon' ayrı satırlarda görünür", () => {
    const zenginBayi = [{ id: 5, name: "Bayi X", contact: "Ali Veli", phone: "0555 111 22 33", adres: "Sanayi Sitesi 3", city: "Kocaeli", country: "Türkiye" }];
    const bayiSatis = { ...satis, id: 661, aliciTipi: "bayi", dealerId: 5, tahsisler: [] };
    const H = () => { const [sat, setSat] = useState([bayiSatis]); return <KargoDetayModal grup={[sat[0]]} setYedekParcaSatislar={setSat} dealers={zenginBayi} parts={parts} customers={customers} canKargo onClose={vi.fn()} showToast={vi.fn()} />; };
    render(<H />);
    expect(screen.getByText("İletişim Kişisi")).toBeTruthy();
    expect(screen.getByText("Ali Veli")).toBeTruthy();
    expect(screen.getByText("Telefon")).toBeTruthy();         // telefon ayrı "Telefon" satırı
    expect(screen.getByText("0555 111 22 33")).toBeTruthy();
    expect(screen.getByText("Sanayi Sitesi 3")).toBeTruthy();
  });
});
