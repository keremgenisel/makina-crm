// @vitest-environment jsdom
// Spec 0160 (AC-6, AC-30, AC-33, R1/4, R5, R6): spec öncesi kodla birebir. Altın `tests/fixtures/0160-once.json` spec öncesi koddan
// üretildi (`YAZ_0160=1`). Ad sorgularının kümesi (kutu başına parça adları, etiketten bağımsız okunur) ve dört akışın kayıt gövdesi
// (servis, yedek parça satışı iki kutu, set bileşeni, model kiti) karşılaştırılır; parça olmayan kurulumda kutuların metinleri de.
import { describe, it, expect, vi, afterEach, beforeAll } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { useState } from "react";
import fs from "node:fs";
import path from "node:path";
import { Settings } from "../../src/components/Settings";
import { ServiceForm } from "../../src/components/ServiceForm";
import { YedekParcaSatisForm } from "../../src/components/YedekParcaSatisForm";
import { PartStokTab } from "../../src/components/stock/PartStokTab";
import { Analiz } from "../../src/components/Analiz";
import { Documents } from "../../src/components/Documents";
import { PARCALAR, canli, AD_SORGULARI, ANALIZ_VERI } from "../fixtures/0160-veri";

vi.mock("../../src/lib/audit", async (orig) => ({ ...(await orig()), logAction: () => {} }));
beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); });
afterEach(() => { cleanup(); });

const ALTIN = path.resolve("tests/fixtures/0160-once.json");
const CANLI = canli(PARCALAR);
// Seçeneğin adı: etiketin ilk parçası. Spec sonrası etiket kendi öğesinde (alt satır kardeşi), öncesinde düz metin.
const adOf = (el) => (el.firstElementChild?.textContent ?? el.textContent).split(" · ")[0];
const BASE = {
  customers: [], services: [], dealers: [], stock: [], setStock: vi.fn(), setCustomers: vi.fn(), setServices: vi.fn(), setDealers: vi.fn(),
  version: "3.63.0", appSettings: {}, setAppSettings: vi.fn(), factory: { name: "Altuntaş" }, setFactory: vi.fn(), kalipDefs: [], setKalipDefs: vi.fn(),
  calisanlar: [], setCalisanlar: vi.fn(), partTypeDefs: [], setPartTypeDefs: vi.fn(), onInitialTabConsumed: vi.fn(), aktifKullanici: "kerem",
  tedarikciler: [], setTedarikciler: vi.fn(), rawCustomModels: [], setCustomModels: vi.fn(), customModels: [],
};
let durum;
function Katalog({ tab = "yedekparca", p0 = PARCALAR, std = [] }) {
  const [parts, setParts] = useState(structuredClone(p0));
  const [standardModels, setStandardModels] = useState(structuredClone(std));
  durum = { parts, standardModels };
  return <Settings {...BASE} initialTab={tab} parts={canli(parts)} setParts={setParts} rawParts={parts} standardModels={standardModels} setStandardModels={setStandardModels} />;
}
const tabloAdlari = () => CANLI.filter(p => screen.queryAllByText(p.ad).some(e => e.closest("tr"))).map(p => p.ad);
const stokRender = (parts = CANLI) => render(<PartStokTab parts={parts} rawParts={parts} partStock={parts.map((p, i) => ({ id: i + 1, partId: p.id, miktar: 5 }))}
  setPartStock={vi.fn()} partStockLog={[]} setPartStockLog={vi.fn()} showToast={vi.fn()} appSettings={{}} />);

const katalogKumeleri = () => {
  render(<Katalog />);
  const kutu = screen.getByPlaceholderText("Yedek parça ara...");
  return Object.fromEntries(AD_SORGULARI.map(q => { fireEvent.change(kutu, { target: { value: q } }); return [q, tabloAdlari()]; }));
};
const stokKumeleri = () => {
  stokRender();
  const kutu = screen.getByPlaceholderText("Parça adı veya model ara...");
  return Object.fromEntries(AD_SORGULARI.map(q => { fireEvent.change(kutu, { target: { value: q } }); return [q, tabloAdlari()]; }));
};
const stokSecici = () => {
  stokRender();
  fireEvent.click(screen.getByText("Stoğa Parça Ekle"));
  const s = {};
  for (const q of AD_SORGULARI) {
    fireEvent.click(screen.getByText("Parça seçin..."));
    fireEvent.change(screen.getByPlaceholderText("Parça ara..."), { target: { value: q } });
    s[q] = { adlar: [...document.querySelectorAll(".ss-option")].filter(b => !b.textContent.startsWith("—")).map(adOf), metin: document.querySelector(".ss-option")?.parentElement?.textContent.includes("Sonuç bulunamadı.") || false };
    fireEvent.click(screen.getByText("Parça seçin..."));
  }
  return s;
};
const analizPanel = () => { const i = screen.getByPlaceholderText("Parça ara..."); return i.parentElement.parentElement.children[1]; };
const analizKumeleri = () => {
  render(<Analiz {...ANALIZ_VERI} parts={CANLI} dealers={[]} appSettings={{}} />);
  const s = {};
  for (const q of AD_SORGULARI) {
    fireEvent.click(screen.getByLabelText("Parça seç"));
    fireEvent.change(screen.getByPlaceholderText("Parça ara..."), { target: { value: q } });
    s[q] = [...analizPanel().querySelectorAll("button")].map(b => b.querySelector("span").textContent);
    fireEvent.click(screen.getByLabelText("Parça seç"));
  }
  return s;
};
let form;
function Servis({ parts = CANLI }) {
  const [f, setF] = useState({ customerId: "", date: "2026-09-20", currency: "TRY", degisenParcalar: [], type: "Bakım" });
  form = f;
  return <ServiceForm title="S" form={f} setForm={setF} customers={[]} parts={parts} onSave={vi.fn()} onCancel={vi.fn()} />;
}
function Yedek({ coklu = true, parts = CANLI }) {
  const [f, setF] = useState(coklu ? { aliciTipi: "bayi", tarih: "2026-09-20", currency: "TRY", satirlar: [{ partId: "", miktar: "", birimFiyat: "" }] }
    : { id: 50, aliciTipi: "bayi", tarih: "2026-09-20", currency: "TRY", partId: "", miktar: "1", birimFiyat: "" });
  form = f;
  return <YedekParcaSatisForm title="Y" form={f} setForm={setF} parts={parts} onSave={vi.fn()} onCancel={vi.fn()} isEdit={!coklu} />;
}
const spAra = (q, ph = "Parça ara...") => { const k = screen.getAllByPlaceholderText(ph).pop(); fireEvent.focus(k); fireEvent.change(k, { target: { value: q } }); };
const spSec = (ad) => fireEvent.mouseDown([...document.querySelectorAll(".sp-option")].find(x => adOf(x) === ad));
const spKumeleri = (bilesen) => {
  render(bilesen);
  return Object.fromEntries(AD_SORGULARI.map(q => { spAra(q); return [q, [...document.querySelectorAll(".sp-option")].map(adOf)]; }));
};
function Evrak({ parts = CANLI }) {
  const t0 = { id: 900, type: "teklif", no: "2026-00001", tarih: "2026-09-20", createdAt: "2026-09-20", dil: "TR", currency: "TRY", durum: "taslak", firma: "K",
    satirlar: [{ rowId: "r1", pickTip: "parca", selectedModel: "", selectedKalip: "", selectedPart: "", subItems: [{ id: "p-r1", type: "parca", kod: "", makinaAdi: "", tanim: "", miktar: "1", birimFiyat: "", tlKarsiligi: "" }] }] };
  const [teklifler, setTeklifler] = useState([t0]);
  return <Documents teklifler={teklifler} setTeklifler={setTeklifler} faturalar={[]} setFaturalar={vi.fn()} customers={[]} partSales={[]}
    allModels={[{ model: "AK100" }]} factory={{ name: "Altuntaş" }} appSettings={{}} showToast={vi.fn()} kalipDefs={[]} parts={parts}
    geoData={{}} loadingGeo={false} serverPermissions={null} dealers={[]} yedekParcaSatislar={[]} onEvrakKaydet={vi.fn()} />;
}
const evrakAc = () => { fireEvent.click(screen.getByText("2026-00001").closest("tr")); fireEvent.click(screen.getByLabelText("Parça seç")); };
const evrakKumeleri = () => {
  render(<Evrak />); evrakAc();
  return Object.fromEntries(AD_SORGULARI.map(q => { spAra(q); return [q, [...document.querySelectorAll(".sp-option")].map(adOf)]; }));
};
const kayitlar = () => {
  const k = {};
  render(<Servis />); spAra("Rulman"); spSec("Rulman 6204"); k.servis = form.degisenParcalar; cleanup();
  render(<Yedek />); spAra("Kayış"); spSec("Kayış"); k.yedekCoklu = form.satirlar; cleanup();
  render(<Yedek coklu={false} />); spAra("Somun"); spSec("Somun"); k.yedekTek = { partId: form.partId, birimFiyat: form.birimFiyat }; cleanup();
  render(<Katalog />);
  fireEvent.click(within(screen.getAllByText("Somun").map(e => e.closest("tr")).find(Boolean)).getByTitle("Düzenle"));
  spAra("Rulman", "Bileşen ara..."); spSec("Rulman 6204");
  fireEvent.click(screen.getByRole("button", { name: /Kaydet/ }));
  k.setBileseni = durum.parts.find(p => p.id === 5).setIcerigi; cleanup();
  render(<Katalog tab="models" std={[{ model: "AK100", defaultParcalar: [] }]} />);
  fireEvent.click(screen.getAllByText("AK100").map(e => e.closest("tr")).find(Boolean).querySelector("button.btn--ghost"));
  spAra("Kayış", "Parça ekle..."); spSec("Kayış");
  fireEvent.click(screen.getByRole("button", { name: /Kaydet/ }));
  k.modelKiti = durum.standardModels[0].defaultParcalar; cleanup();
  return k;
};
// R5 / AC-30: hiç parça tanımlı olmayan kurulumda her kutunun bugünkü metni.
const bosKurulum = () => {
  const m = {};
  const metinVar = (t) => (document.body.textContent.includes(t) ? t : null);
  render(<Katalog p0={[]} />); m.katalog = metinVar("Henüz yedek parça tanımı yok."); cleanup();
  stokRender([]); m.stok = screen.queryByTestId("bos-parca-stok")?.textContent ?? null; cleanup();
  render(<Servis parts={[]} />); m.servis = (() => { const k = screen.queryByPlaceholderText("Parça ara..."); if (!k) return null; fireEvent.focus(k); return [...document.querySelectorAll(".sp-option")].length + "|" + (document.body.textContent.includes("Bulunamadı.") ? "Bulunamadı." : ""); })(); cleanup();
  render(<Yedek parts={[]} coklu={false} />); m.yedekTek = document.body.textContent.includes("Tanımlı yedek parça yok.") ? "Tanımlı yedek parça yok." : null; cleanup();
  // Triyaj (bulgu 3): kalan beş kutu. Kutu parça yokken çizilmiyorsa ya da boş paneli varsa o hâli yazılır.
  const panelMetni = (ph) => { const k = screen.queryAllByPlaceholderText(ph).pop(); if (!k) return null; fireEvent.focus(k); return { secenek: document.querySelectorAll(".sp-option").length, bos: document.body.textContent.includes("Bulunamadı.") }; };
  render(<Evrak parts={[]} />); fireEvent.click(screen.getByText("2026-00001").closest("tr"));
  m.evrak = screen.queryByLabelText("Parça seç") ? (fireEvent.click(screen.getByLabelText("Parça seç")), panelMetni("Parça ara...")) : "dugme-yok"; cleanup();
  render(<Katalog p0={[]} />); fireEvent.click(screen.getByText(/Parça\/Yedek Parça Ekle/)); m.bilesen = panelMetni("Bileşen ara..."); cleanup();
  render(<Katalog tab="models" p0={[]} std={[{ model: "AK100", defaultParcalar: [] }]} />);
  fireEvent.click(screen.getAllByText("AK100").map(e => e.closest("tr")).find(Boolean).querySelector("button.btn--ghost"));
  m.modelKiti = { kitAlani: metinVar("Makina Kiti — Varsayılan Parçalar"), panel: panelMetni("Parça ekle...") }; cleanup();
  render(<Yedek parts={[]} />); m.yedekCoklu = { yok: metinVar("Tanımlı yedek parça yok."), panel: panelMetni("Parça ara...") }; cleanup();
  stokRender([]); m.stokSecici = (() => {
    const d = screen.queryByText("Stoğa Parça Ekle"); if (!d) return "dugme-yok";
    fireEvent.click(d); const s = screen.queryByText("Parça seçin..."); if (!s) return "secici-yok";
    fireEvent.click(s); return { secenek: document.querySelectorAll(".ss-option").length, bos: metinVar("Sonuç bulunamadı.") };
  })(); cleanup();
  render(<Analiz {...ANALIZ_VERI} services={[]} parts={[]} dealers={[]} appSettings={{}} />); m.analiz = { secici: !!screen.queryByLabelText("Parça seç"), bos: screen.queryAllByTestId(/^bos-analiz/).map(e => e.textContent) }; cleanup();
  return m;
};

const simdi = () => JSON.parse(JSON.stringify({
  katalog: katalogKumeleri(), stok: (cleanup(), stokKumeleri()), stokSecici: (cleanup(), stokSecici()), analiz: (cleanup(), analizKumeleri()),
  servis: (cleanup(), spKumeleri(<Servis />)), yedek: (cleanup(), spKumeleri(<Yedek />)), evrak: (cleanup(), evrakKumeleri()),
  kayit: (cleanup(), kayitlar()), bos: (cleanup(), bosKurulum()),
}));

describe("Spec 0160: spec öncesiyle aynı", () => {
  it("AC-6 / AC-30 / AC-33 / R1/4 / R5 / R6: ad sorgularının kümesi, kayıt gövdeleri ve boş kurulum altınla birebir", () => {
    const s = simdi();
    if (process.env.YAZ_0160 === "1") { fs.writeFileSync(ALTIN, JSON.stringify(s, null, 1)); return; }
    expect(s).toEqual(JSON.parse(fs.readFileSync(ALTIN, "utf8")));
  }, 60000);
});
