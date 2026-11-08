// @vitest-environment jsdom
// Spec 0133 C4, C4/2, AC-45, AC-46, AC-95: kipi girilmemiş (elle sabit) veride yedi kalem spec öncesi kodla birebir aynıdır.
// Altın `tests/fixtures/0133-once.json` spec öncesi koddan `YAZ_0133=1` ile üretildi; burada yalnız karşılaştırılır.
// Kalemler: katalog listesinin satırları, Parça Stoğu listesi ve pano kartları, Evrak'ın parça seçimi sonucu, servis sepeti
// satırının fiyatı (para birimi değişimi dahil), yedek parça satır fiyatı (para birimi değişimi dahil), setin bileşen fiyatı
// toplamı ve parça dışa aktarma satırı.
import { describe, it, expect, afterEach, beforeAll, vi } from "vitest";
import { useState } from "react";
import { render, cleanup, screen, fireEvent } from "@testing-library/react";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { Settings } from "../src/components/Settings";
import { PartStokTab } from "../src/components/stock/PartStokTab";
import { Documents } from "../src/components/Documents";
import { ServiceForm } from "../src/components/ServiceForm";
import { YedekParcaSatisForm } from "../src/components/YedekParcaSatisForm";
import { setOzeti, setKatalogu } from "../src/lib/urunAgaci";
import { malzemeKatalogu } from "../src/lib/malzeme";
import { parcaDisaAktarmaSatiri } from "../src/lib/parcaAktarma";
import { PARCALAR, MALZEMELER } from "./fixtures/0133-veri.js";
import { kalemMetniEski } from "./fixtures/0135-ayikla.js"; // spec 0135 ile: kaynak ibaresi kalem diline geçti (R39)

vi.mock("../src/lib/audit", async (orig) => ({ ...(await orig()), logAction: () => {} }));
beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); });
afterEach(cleanup);
const ALTIN = "tests/fixtures/0133-once.json";
const yaz = process.env.YAZ_0133 === "1";

const BASE = {
  customers: [], services: [], dealers: [], stock: [], setStock: vi.fn(), setCustomers: vi.fn(), setServices: vi.fn(), setDealers: vi.fn(),
  version: "3.56.0", appSettings: {}, setAppSettings: vi.fn(), factory: { name: "Altuntaş" }, setFactory: vi.fn(), kalipDefs: [], setKalipDefs: vi.fn(),
  calisanlar: [], setCalisanlar: vi.fn(), partTypeDefs: [], setPartTypeDefs: vi.fn(), onInitialTabConsumed: vi.fn(), aktifKullanici: "kerem",
  standardModels: [], setStandardModels: vi.fn(), customModels: [], setCustomModels: vi.fn(), rawCustomModels: [], tedarikciler: [], setTedarikciler: vi.fn(),
};
const sec = (bas) => fireEvent.mouseDown([...document.querySelectorAll(".sp-option")].find(x => x.textContent.startsWith(bas)));
const ara = (ph, metin) => { const k = screen.getAllByPlaceholderText(ph).pop(); fireEvent.focus(k); fireEvent.change(k, { target: { value: metin } }); };

const katalogSatirlari = () => {
  render(<Settings {...BASE} initialTab="yedekparca" parts={PARCALAR} setParts={vi.fn()} rawParts={PARCALAR} malzemeler={MALZEMELER} />);
  const r = [...document.querySelectorAll("tbody tr")].map(tr => tr.textContent); cleanup(); return r;
};
const stokMetni = () => {
  const partStock = PARCALAR.map((p, i) => ({ id: i + 1, partId: p.id, miktar: 5 }));
  render(<PartStokTab parts={PARCALAR} partStock={partStock} setPartStock={vi.fn()} partStockLog={[]} setPartStockLog={vi.fn()} showToast={vi.fn()}
    appSettings={{ pinnedPartIds: PARCALAR.map(p => String(p.id)) }} />);
  const r = { satirlar: [...document.querySelectorAll("tbody tr")].map(tr => tr.textContent), govde: document.body.textContent }; cleanup(); return r;
};
const evrakFiyati = (p, currency) => {
  let st;
  function H() {
    const [teklifler, setTeklifler] = useState([{ id: 900, type: "teklif", no: "2026-00001", tarih: "2026-09-20", createdAt: "2026-09-20", dil: "TR", currency, durum: "taslak", firma: "F",
      satirlar: [{ rowId: "r1", pickTip: "parca", selectedModel: "", selectedKalip: "", selectedPart: "", subItems: [{ id: "p-r1", type: "parca", kod: "", makinaAdi: "", tanim: "", miktar: "1", birimFiyat: "", tlKarsiligi: "" }] }] }]);
    st = teklifler;
    return <Documents teklifler={teklifler} setTeklifler={setTeklifler} faturalar={[]} setFaturalar={vi.fn()} customers={[]} partSales={[]} allModels={[]} factory={{ name: "A" }}
      appSettings={{}} showToast={vi.fn()} kalipDefs={[]} parts={PARCALAR} malzemeler={MALZEMELER} geoData={{}} loadingGeo={false} serverPermissions={null} dealers={[]} yedekParcaSatislar={[]} onEvrakKaydet={vi.fn()} />;
  }
  render(<H />);
  fireEvent.click(screen.getByText("2026-00001").closest("tr"));
  fireEvent.click(screen.getByLabelText("Parça seç"));
  ara("Parça ara...", p.ad); sec(p.ad);
  fireEvent.click(screen.getByText("Kaydet"));
  const s = st[0].satirlar[0].subItems.find(i => i.type === "parca");
  const r = { birimFiyat: s.birimFiyat, tlKarsiligi: s.tlKarsiligi }; cleanup(); return r;
};
const servisFiyati = (p, currency) => {
  let st;
  function H() {
    const [form, setForm] = useState({ customerId: "", date: "2026-09-20", currency: "TRY", degisenParcalar: [], type: "Bakım" });
    st = form;
    return <ServiceForm title="S" form={form} setForm={setForm} customers={[]} parts={PARCALAR} malzemeler={MALZEMELER} onSave={vi.fn()} onCancel={vi.fn()} />;
  }
  render(<H />);
  ara("Parça ara...", p.ad); sec(p.ad);
  const once = st.degisenParcalar[0]?.fiyat;
  const pb = screen.getAllByRole("combobox").find(c => [...c.options].some(o => o.value === "USD") && [...c.options].some(o => o.value === "TRY"));
  if (pb) fireEvent.change(pb, { target: { value: currency } });
  const r = { secim: once, pb: st.degisenParcalar[0]?.fiyat }; cleanup(); return r;
};
const yedekFiyati = (p, currency) => {
  let st;
  function H() {
    const [form, setForm] = useState({ aliciTipi: "bayi", tarih: "2026-09-20", currency: "TRY", satirlar: [{ partId: "", miktar: "", birimFiyat: "" }] });
    st = form;
    return <YedekParcaSatisForm title="Y" form={form} setForm={setForm} parts={PARCALAR} malzemeler={MALZEMELER} onSave={vi.fn()} onCancel={vi.fn()} />;
  }
  render(<H />);
  ara("Parça ara...", p.ad); sec(p.ad);
  const once = st.satirlar?.[0]?.birimFiyat;
  const pb = screen.getAllByRole("combobox").find(c => [...c.options].some(o => o.value === "USD") && [...c.options].some(o => o.value === "TRY"));
  if (pb) fireEvent.change(pb, { target: { value: currency } });
  const r = { secim: once, pb: st.satirlar?.[0]?.birimFiyat }; cleanup(); return r;
};

const uret = () => {
  const katalog = setKatalogu(PARCALAR); const mk = malzemeKatalogu(MALZEMELER);
  const evrak = {}; const servis = {}; const yedek = {};
  for (const p of PARCALAR) for (const c of ["TRY", "USD", "EUR"]) {
    evrak[`${p.id}-${c}`] = evrakFiyati(p, c);
    servis[`${p.id}-${c}`] = servisFiyati(p, c);
    yedek[`${p.id}-${c}`] = yedekFiyati(p, c);
  }
  return {
    katalog: katalogSatirlari(), stok: stokMetni(), evrak, servis, yedek,
    setToplami: setOzeti(PARCALAR[3].setIcerigi, katalog, undefined, mk),
    disaAktarma: PARCALAR.map(p => parcaDisaAktarmaSatiri(p, katalog, mk)),
  };
};

describe("Spec 0133: kıyas (elle sabit veride yedi kalem spec öncesiyle birebir)", () => {
  it("AC-45 / AC-46 / AC-95: katalog, Parça Stoğu ve pano kartları, Evrak, servis, yedek parça, set toplamı ve dışa aktarma", () => {
    const simdi = JSON.parse(JSON.stringify(uret()));
    if (yaz) writeFileSync(ALTIN, JSON.stringify(simdi, null, 2) + "\n");
    expect(existsSync(ALTIN)).toBe(true);
    const altin = JSON.parse(readFileSync(ALTIN, "utf8"));
    expect(simdi.katalog.map(kalemMetniEski)).toEqual(altin.katalog);
    expect(simdi.stok).toEqual(altin.stok);
    expect(simdi.evrak).toEqual(altin.evrak);
    expect(simdi.servis).toEqual(altin.servis);
    expect(simdi.yedek).toEqual(altin.yedek);
    expect(simdi.setToplami).toEqual(altin.setToplami);
    expect(simdi.disaAktarma).toEqual(altin.disaAktarma);
  }, 60000);
});
