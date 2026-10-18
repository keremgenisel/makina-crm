// @vitest-environment jsdom
// Spec 0090: gider ataması ve aylara dağıtım kalkar, gerçek bileşenler. Gider formu (AC-1, AC-2, AC-4, AC-5, AC-6), tanım
// formu ve tablosu (AC-3, AC-7, AC-12/2), Dönem Raporu ve kalem listesi (AC-9–AC-13). Kayıt gövdesi onSave/setter anında
// ölçülür (R5/2), yeniden yüklenmiş kayıt değil.
process.env.TZ = "Europe/Istanbul";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { useState } from "react";
import { kutuAc } from "./kutuAc";
import { GiderForm } from "../../src/components/GiderForm";
import { Giderler } from "../../src/components/Giderler";
import { KalemListesi } from "../../src/components/gider/DonemRaporu";
import { SettingsGiderTanimlari } from "../../src/components/settings/SettingsGiderTanimlari";
import { ATAMA_ANAHTARLARI } from "../../src/lib/gider";
import { TURLER as T89, TED, STANDART, OZEL, STOCK, KALEMLER, HAREKET, KDV, SATIS, BUGUN } from "../fixtures/0089-veri";

afterEach(() => { cleanup(); vi.useRealTimers(); });
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(`${BUGUN}T10:00:00`)); });

const TURLER = [{ id: 1, ad: "Hammadde", davranis: "normal" }, { id: 2, ad: "Fabrika kirası", davranis: "kira" },
  { id: 3, ad: "Personel", davranis: "personel" }, { id: 5, ad: "SGK", davranis: "sgk" }];
const ATAMA_YOK = () => {
  expect(screen.queryByText("Makina maliyeti ataması")).toBeNull();
  expect(screen.queryByRole("radiogroup", { name: "Makina maliyeti ataması" })).toBeNull();
  for (const r of ["Ortak gider", "Makina", "Model", "Dağıtılmasın"]) expect(screen.queryByRole("radio", { name: r }), r).toBeNull();
};
const DAGITIM_YOK = () => {
  expect(screen.queryByLabelText("Maliyete dağıtım (ay)")).toBeNull();
  expect(screen.queryByText(/aya dağıt/i)).toBeNull();
};
// Spec 0092 ile (AC-1–AC-5, C14): alan "Kapsadığı ay sayısı" adıyla normal ve kirada geri döndü; personel ve SGK'da yok.
const KAPSAM_VAR = (id) => (id === 1 || id === 2 ? expect(screen.getByLabelText("Kapsadığı ay sayısı")).toBeTruthy() : expect(screen.queryByLabelText("Kapsadığı ay sayısı")).toBeNull());
const formAc = (o = {}) => {
  const onSave = vi.fn();
  render(<GiderForm giderTurleri={TURLER} tedarikciler={TED} calisanlar={[{ id: 21, ad: "Hasan", resmiMaliyet: 30000 }]} giderAyarlari={{ stopajOrani: 20 }}
    onSave={onSave} onCancel={vi.fn()} {...o} />);
  return onSave;
};
const tur = (id) => fireEvent.change(screen.getByLabelText("Gider türü *"), { target: { value: String(id) } });

describe("Spec 0090: gider formu (R1, R2, R4, R5)", () => {
  it("AC-1 / AC-2 (spec 0092 ile ters çevrildi): yeni gider formunda atama bölümü yok; kapsam alanı normal ve kirada var, personel ve SGK'da yok", () => {
    formAc();
    for (const id of [1, 2, 3, 5]) { tur(id); ATAMA_YOK(); DAGITIM_YOK(); KAPSAM_VAR(id); }
  });
  it("AC-6 (spec 0092 ile: kapsam girilmemişse anahtar yine yok): yeni kalemin kaydedilen gövdesinde atama ve dağıtım anahtarları hiç yok", () => {
    const onSave = formAc();
    tur(1);
    fireEvent.change(screen.getByLabelText("Tutar"), { target: { value: "1.000" } });
    fireEvent.click(screen.getByText("Kaydet"));
    const govde = onSave.mock.calls[0][0];
    for (const a of ATAMA_ANAHTARLARI) expect(govde, a).not.toHaveProperty(a);
    expect(govde).not.toHaveProperty("dagitimAy");
  });
  it("AC-4: model ataması ve iki model satırı taşıyan eski kalem formda açılıp kaydedilince birebir korunur", () => {
    const satirlar = [{ modelAd: "AK100", birimMaliyet: 300, adet: 2 }, { modelAd: "AK200", birimMaliyet: 100, adet: 1 }];
    const onSave = formAc({ kalem: { id: 50, turId: 1, tarih: "2026-10-01", tutar: 1000, kdvOrani: 20, tedarikciId: 11, atamaTur: "model", modelSatirlari: satirlar } });
    ATAMA_YOK();
    fireEvent.click(screen.getByText("Kaydet"));
    expect(onSave.mock.calls[0][0]).toMatchObject({ id: 50, atamaTur: "model", modelSatirlari: satirlar });
  });
  it("AC-5: on iki aya dağıtılmış eski kalem formda açılıp kaydedilince dağıtım ayı korunur", () => {
    const onSave = formAc({ kalem: { id: 51, turId: 1, tarih: "2026-10-01", tutar: 1200, kdvOrani: 20, tedarikciId: 11, dagitimAy: 12 } });
    DAGITIM_YOK();
    fireEvent.click(screen.getByText("Kaydet"));
    expect(onSave.mock.calls[0][0].dagitimAy).toBe(12);
  });
});

describe("Spec 0090: tekrarlayan tanım formu ve tablosu (R3, R5, R10/2)", () => {
  function TanimHarness({ t0 = [], onState }) {
    const [giderTanimlari, setGiderTanimlari] = useState(t0);
    onState?.(giderTanimlari);
    return <SettingsGiderTanimlari giderTanimlari={giderTanimlari} setGiderTanimlari={setGiderTanimlari} giderTurleri={TURLER} calisanlar={[{ id: 21, ad: "Hasan" }]} showToast={vi.fn()} />;
  }
  const yeniTanim = (turId, ad) => {
    fireEvent.click(screen.getByText("Yeni Tanım"));
    fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: String(turId) } });
    fireEvent.change(screen.getByPlaceholderText("Örn. Fabrika binası kirası"), { target: { value: ad } });
    fireEvent.change(screen.getByLabelText("Başlangıç ayı"), { target: { value: "2026-10" } });
  };
  it("AC-3 (spec 0092 ile ters çevrildi): tanım formunda atama bölümü yok; kapsam alanı normal ve kirada var, SGK'da yok", () => {
    render(<TanimHarness />);
    fireEvent.click(screen.getByText("Yeni Tanım"));
    for (const id of [1, 2, 5]) { fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: String(id) } }); ATAMA_YOK(); DAGITIM_YOK(); KAPSAM_VAR(id); }
  });
  it("AC-7: yeni tanımın kaydedilen gövdesinde atama ve dağıtım anahtarları hiç yok; eski tanımın verisi düzenlemede korunur", () => {
    let st;
    const eski = { id: 70, turId: 1, ad: "Sigorta", tutar: 1200, kdvOrani: 20, baslangicAy: "2026-01", uretilenAylar: [],
      atamaTur: "model", modelSatirlari: [{ modelAd: "AK100", birimMaliyet: 100, adet: 2 }], dagitimAy: 12 };
    render(<TanimHarness t0={[eski]} onState={s => { st = s; }} />);
    yeniTanim(1, "İnternet");
    fireEvent.change(screen.getByLabelText("Tutar"), { target: { value: "500" } });
    fireEvent.click(screen.getByText("Kaydet"));
    const yeni = st.find(t => t.ad === "İnternet");
    for (const a of ATAMA_ANAHTARLARI) expect(yeni, a).not.toHaveProperty(a);
    expect(yeni).not.toHaveProperty("dagitimAy"); // spec 0092 ile: kapsam girilmemişse anahtar yok
    fireEvent.click(within(screen.getByText("Sigorta").closest("tr")).getByTitle("Düzenle"));
    fireEvent.click(screen.getByText("Kaydet"));
    expect(st.find(t => t.id === 70)).toMatchObject({ atamaTur: "model", modelSatirlari: eski.modelSatirlari, dagitimAy: 12 });
  });
  // Triyaj (bulgu 3): "Tüm çalışanlar için tanım oluştur" yolu boş atama anahtarlarını yazıyordu.
  it("AC-7 (triyaj bulgu 3): 'Tüm çalışanlar için tanım oluştur' ile doğan personel tanımlarının gövdesinde atama anahtarı yok", () => {
    let st;
    render(<TanimHarness onState={s => { st = s; }} />);
    fireEvent.click(screen.getByText(/Tüm çalışanlar için tanım oluştur/));
    expect(st).toHaveLength(1);
    expect(st[0]).toMatchObject({ turId: 3, calisanId: 21 });
    for (const a of ATAMA_ANAHTARLARI) expect(st[0], a).not.toHaveProperty(a);
  });
  it("AC-12/2: Tekrarlayan Giderler tablosu yedi sütun, atama başlığı yok", () => {
    render(<TanimHarness t0={[{ id: 71, turId: 1, ad: "Sigorta", tutar: 1200, kdvOrani: 20, baslangicAy: "2026-01", uretilenAylar: [], atamaTur: "makina", makinaTur: "stok", makinaId: 501 }]} />);
    const b = [...document.querySelectorAll("thead th")].map(th => th.textContent.trim());
    expect(b).toHaveLength(7);
    expect(b).not.toContain("Atama");
    const satir = screen.getByText("Sigorta").closest("tr");
    expect(satir.children).toHaveLength(7);
    expect(satir.textContent).not.toMatch(/Ortak|Makina Stoğu|AK100/);
  });
});

describe("Spec 0090: Dönem Raporu ve kalem listesi (R7–R10)", () => {
  function GH({ g0 = KALEMLER }) {
    const [giderler, setGiderler] = useState(g0);
    const [hesapHareketleri, setHesapHareketleri] = useState(HAREKET);
    return <Giderler giderler={giderler} setGiderler={setGiderler} hesapHareketleri={hesapHareketleri} setHesapHareketleri={setHesapHareketleri} giderTanimlari={[]} setGiderTanimlari={vi.fn()}
      giderTurleri={T89} tedarikciler={TED} setTedarikciler={vi.fn()} calisanlar={[]} stock={STOCK} customers={[]} standardModels={STANDART} customModels={OZEL}
      appSettings={{ giderAyarlari: { yururlukAy: "2026-01" }, kdvRates: KDV }} kdvRates={KDV} kasaHesaplari={[]} satisVerisi={SATIS} showToast={vi.fn()} canDo={() => true} />;
  }
  const DORT = ["Gider Türü Kırılımı", "KDV Karşılaştırması", "Tedarikçi Kırılımı", "Ödeme Yöntemi Kırılımı"];
  it("AC-9 / AC-10: kovalar kutusu ve kopmuş atama satırı yok (veride kopmuş atama varken, kutular açıkken)", () => {
    render(<GH />);
    for (const ad of DORT) kutuAc(ad);
    expect(screen.queryByText("Makina Maliyeti Kovaları")).toBeNull();
    expect(screen.queryByTestId("dusen-atama-sayisi")).toBeNull();
    expect(document.body.textContent).not.toMatch(/ataması ortak gidere düştü|Makinaya atanmış|Modele atanmış/);
  });
  it("AC-11: katlanan yan kutu dört ve dördü kapalı başlar", () => {
    render(<GH />);
    // Katlanan kart başlıkları (KartBolum katlanirBaslik: role=button + aria-expanded); "Çalışanları göster" gibi aç/kapalar sayılmaz.
    const katlanan = [...document.querySelectorAll('[role="button"][aria-expanded]')].map(b => b.textContent);
    expect(katlanan).toHaveLength(4);
    expect(DORT.map(ad => katlanan.some(t => t.includes(ad)))).toEqual([true, true, true, true]);
    for (const ad of DORT) expect(screen.getByRole("button", { name: new RegExp(`^${ad}`) }).getAttribute("aria-expanded"), ad).toBe("false");
  });
  const satirSpan = (tr) => [...tr.children].reduce((t, td) => t + Number(td.getAttribute("colspan") || 1), 0);
  it("AC-12: kalem tablosu sekiz sütun, atama başlığı yok; veri, boş durum ve alt toplam satırları sekize uyar", () => {
    const { container } = render(<KalemListesi kalemler={KALEMLER} giderTurleri={T89} tedarikciler={TED} bugun={BUGUN} canDo={() => true} onDuzenle={vi.fn()} onSil={vi.fn()} />);
    const basliklar = [...container.querySelectorAll("thead th")].map(th => th.textContent.trim());
    expect(basliklar).toHaveLength(8);
    expect(basliklar).not.toContain("Atama");
    for (const tr of container.querySelectorAll("tbody tr, tfoot tr")) expect(satirSpan(tr), tr.textContent.slice(0, 40)).toBe(8);
    fireEvent.change(screen.getByLabelText("Açıklama ara"), { target: { value: "yok böyle bir kalem" } });
    const bos = screen.getByText("Filtreye uyan kalem yok.");
    expect(Number(bos.getAttribute("colspan"))).toBe(8);
    expect(satirSpan(container.querySelector("tfoot tr"))).toBe(8);
  });
  it("AC-13 (spec 0092 ile ters çevrildi, ikinci yarısı korunur): kapsamlı kalemde kapsam rozeti çizilir; eski rozet ve 'aya dağıtılmış' metni yok", () => {
    render(<GH />);
    expect(KALEMLER.some(k => k.dagitimAy === 12)).toBe(true);
    expect(screen.queryByTestId("dagitim-rozeti")).toBeNull();
    expect(screen.getAllByTestId("kapsam-rozeti").length).toBeGreaterThan(0);
    expect(document.body.textContent).not.toMatch(/aya dağıtılmış/);
  });
});
