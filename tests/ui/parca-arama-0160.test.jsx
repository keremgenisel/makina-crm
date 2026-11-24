// @vitest-environment jsdom
// Spec 0160: on kutuda parça kodu, ölçüsü, hammaddesi, cinsi ve İngilizce adıyla bulunur; sonuç satırı iki satırlı (üstte ad,
// altta kod · ölçü · hammadde · cins). Gerçek bileşenler: Settings (katalog listesi, bileşen seçicisi, model kartı), PartStokTab
// (liste ve "Stoğa Parça Ekle" seçicisi), ServiceForm, YedekParcaSatisForm, Documents (seçim penceresi), Analiz; ayrıca dokunulmayan
// kutular (R7) ve kayıt listeleri (X8). Test adları AC-<n> taşır.
import { describe, it, expect, vi, afterEach, beforeAll } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { useState } from "react";
import { Settings } from "../../src/components/Settings";
import { ServiceForm } from "../../src/components/ServiceForm";
import { YedekParcaSatisForm } from "../../src/components/YedekParcaSatisForm";
import { PartStokTab } from "../../src/components/stock/PartStokTab";
import { YedekParcaSatisTab } from "../../src/components/stock/YedekParcaSatisTab";
import { TahsisModal } from "../../src/components/stock/TahsisModal";
import { PartSaleForm } from "../../src/components/PartSaleForm";
import { Analiz } from "../../src/components/Analiz";
import { Documents } from "../../src/components/Documents";
import { SearchPick, SearchSelect } from "../../src/components/ui";
import { PARCALAR, canli, ANALIZ_VERI, UZUN_AD } from "../fixtures/0160-veri";

vi.mock("../../src/lib/audit", async (orig) => ({ ...(await orig()), logAction: () => {} }));
beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

const CANLI = canli(PARCALAR);
const ALT = '[data-testid="arama-alt-satir"]';
const ustOf = (el) => el.firstElementChild && el.querySelector(ALT) ? el.firstElementChild.textContent : el.textContent;
const altOf = (el) => el.querySelector(ALT)?.textContent ?? null;
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
const spSecenekler = () => [...document.querySelectorAll(".sp-option")];
const spAra = (q, ph = "Parça ara...") => { const k = screen.getAllByPlaceholderText(ph).pop(); fireEvent.focus(k); fireEvent.change(k, { target: { value: q } }); return spSecenekler().map(ustOf); };
const spSec = (ad) => fireEvent.mouseDown(spSecenekler().find(x => ustOf(x) === ad));

describe("Spec 0160: katalog listesi (kutu 1)", () => {
  const ara = (q) => { fireEvent.change(screen.getByPlaceholderText("Yedek parça ara..."), { target: { value: q } }); return tabloAdlari(); };
  it("AC-1: kod yazılınca o parça kalır, kodu farklı olan çıkar", () => { render(<Katalog />); expect(ara("ky-12")).toEqual(["Kayış"]); });
  it("AC-2: ölçü ile bulunur", () => { render(<Katalog />); expect(ara("5x16")).toEqual(["Rulman 6204"]); });
  it("AC-3: cins ile bulunur", () => { render(<Katalog />); expect(ara("din 933")).toEqual(["Cıvata"]); });
  it("AC-4: hammadde adı ile bulunur", () => { render(<Katalog />); expect(ara("krom")).toEqual(["Rulman 6204"]); });
  it("AC-5: İngilizce ad ile bulunur", () => { render(<Katalog />); expect(ara("bearing")).toEqual(["Rulman 6204"]); });
  it("AC-6: adıyla arama aynı kümeyi verir (altın: parca-arama-0160-kiyas)", () => { render(<Katalog />); expect(ara("pim")).toEqual(["Pim"]); });
  it("AC-7: iki kelimeden biri ada, biri koda uyar", () => { render(<Katalog />); expect(ara("rulman 625")).toEqual(["Rulman 6204"]); });
  it("AC-8: bir kelime hiçbir alanda yoksa bulunmaz", () => { render(<Katalog />); expect(ara("rulman zzz")).toEqual([]); });
  it("AC-28 / AC-64: satır düzeni değişmez: Kod sütunu ham, 0158 bilgi satırı üç alan, arama alt satırı yok", () => {
    render(<Katalog />);
    const tr = screen.getAllByText("Somun").map(e => e.closest("tr")).find(Boolean);
    expect([...tr.cells].some(td => td.textContent === "  SM-8  ")).toBe(true);
    const rul = screen.getAllByText("Rulman 6204").map(e => e.closest("tr")).find(Boolean);
    expect(within(rul).getByTestId("parca-bilgi-satiri").textContent).toBe("5x16 · Krom çelik · Bilyalı");
    expect(document.querySelectorAll(`table ${ALT}`)).toHaveLength(0);
  });
});

const stokRender = (parts = CANLI) => render(<PartStokTab parts={parts} rawParts={parts} partStock={parts.map((p, i) => ({ id: i + 1, partId: p.id, miktar: 5 }))}
  setPartStock={vi.fn()} partStockLog={[]} setPartStockLog={vi.fn()} showToast={vi.fn()} appSettings={{}} />);
describe("Spec 0160: Parça Stoğu (kutu 2) ve 'Stoğa Parça Ekle' seçicisi (kutu 10)", () => {
  const ara = (q) => { fireEvent.change(screen.getByPlaceholderText("Parça adı veya model ara..."), { target: { value: q } }); return tabloAdlari(); };
  it("AC-9: ölçü yazılınca satır kalır", () => { stokRender(); expect(ara("ø30")).toEqual([UZUN_AD]); });
  it("AC-10: model adıyla arama bugünkü gibi", () => { stokRender(); expect(ara("ak120")).toEqual(["Cıvata"]); });
  it("AC-27: Yedek Parça hücresinde adın altında alt satır; sütun sayısı değişmez", () => {
    stokRender();
    const tr = screen.getAllByText("Rulman 6204").map(e => e.closest("tr")).find(Boolean);
    expect(tr.cells[0].querySelector(ALT).textContent).toBe("625 · 5x16 · Krom çelik · Bilyalı");
    expect(tr.cells.length).toBe(tr.closest("table").querySelectorAll("thead th").length);
    const pim = screen.getAllByText("Pim").map(e => e.closest("tr")).find(Boolean);
    expect(pim.cells[0].querySelector(ALT)).toBeNull();
    // P7: sıra ad, alt satır, set rozeti.
    const set = screen.getAllByText("Dişli Takımı").map(e => e.closest("tr")).find(Boolean).cells[0];
    expect(set.querySelector(ALT).compareDocumentPosition(within(set).getByTestId("set-rozeti")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
  const secici = () => { fireEvent.click(screen.getByText("Stoğa Parça Ekle")); fireEvent.click(screen.getByText("Parça seçin...")); };
  const ssAra = (q) => { fireEvent.change(screen.getByPlaceholderText("Parça ara..."), { target: { value: q } }); return [...document.querySelectorAll(".ss-option")].filter(b => !b.textContent.startsWith("—")); };
  it("AC-41: kod ile arama çalışır", () => { stokRender(); secici(); expect(ssAra("sm-8").map(ustOf)).toEqual(["Somun"]); });
  it("AC-42: ölçü ile arama çalışır ve seçenek alt satırı yazar; Düzelt penceresinde parça seçici yok (P13)", () => {
    stokRender(); secici();
    const [o] = ssAra("5x16");
    expect(ustOf(o)).toBe("Rulman 6204");
    expect(altOf(o)).toBe("625 · 5x16 · Krom çelik · Bilyalı");
    fireEvent.click(o);
    expect(screen.getByText("Rulman 6204", { selector: "button span" })).toBeTruthy(); // kapalı düğme yalnız ad
    cleanup();
    stokRender();
    fireEvent.click(screen.getAllByText("Düzelt")[0]);
    expect(screen.queryByText("Parça seçin...")).toBeNull();
  });
  it("AC-43: boş aramada ilk on seçenek ve '+N sonuç daha'; eşleşme yokken 'Sonuç bulunamadı.'", () => {
    const cok = [...CANLI, ...Array.from({ length: 6 }, (_, i) => ({ id: 100 + i, ad: `Ek parça ${i}`, kod: `E${i}`, models: [] }))];
    stokRender(cok); secici();
    expect(ssAra("")).toHaveLength(10);
    expect(document.body.textContent).toMatch(/\+4 sonuç daha/);
    expect(ssAra("zzzz")).toHaveLength(0);
    expect(screen.getByText("Sonuç bulunamadı.")).toBeTruthy();
  });
});

let form;
function Servis({ parts = CANLI }) {
  const [f, setF] = useState({ customerId: "", date: "2026-09-20", currency: "TRY", degisenParcalar: [], type: "Bakım" });
  form = f;
  return <ServiceForm title="S" form={f} setForm={setF} customers={[]} parts={parts} onSave={vi.fn()} onCancel={vi.fn()} />;
}
describe("Spec 0160: servis formu (kutu 3)", () => {
  it("AC-11: kod ile parça listelenir", () => { render(<Servis />); expect(spAra("ky-12")).toEqual(["Kayış"]); });
  it("AC-12: seçilen parça kayda bugünkü alanlarıyla yazılır; ada kod, ölçü, cins girmez", () => {
    render(<Servis />); spAra("625"); spSec("Rulman 6204");
    expect(form.degisenParcalar[0]).toMatchObject({ partId: "1", ad: "Rulman 6204", adEN: "Bearing" });
    expect(Object.keys(form.degisenParcalar[0]).sort()).toEqual(["adEN", "ad", "disTedarik", "fiyat", "miktar", "partId"].sort());
  });
  it("AC-13: 0120 süzgecinin kümesi aynı (çağrı süzülmüş listeyi alır; 0120 testleri dokunulmadan yeşil)", async () => {
    const { readFileSync } = await import("node:fs");
    expect(readFileSync("src/components/ServiceForm.jsx", "utf8")).toContain("<SearchPick items={parcaKumesi.liste}");
  });
});

function Yedek({ coklu = true, satir = 1 }) {
  const [f, setF] = useState(coklu ? { aliciTipi: "bayi", tarih: "2026-09-20", currency: "TRY", satirlar: Array.from({ length: satir }, () => ({ partId: "", miktar: "", birimFiyat: "" })) }
    : { id: 50, aliciTipi: "bayi", tarih: "2026-09-20", currency: "TRY", partId: "", miktar: "1", birimFiyat: "" });
  form = f;
  return <YedekParcaSatisForm title="Y" form={f} setForm={setF} parts={CANLI} onSave={vi.fn()} onCancel={vi.fn()} isEdit={!coklu} />;
}
describe("Spec 0160: yedek parça satış formu (kutu 4, 5)", () => {
  it("AC-14: tek satırlı kutuda ölçü ile arama", () => { render(<Yedek coklu={false} />); expect(spAra("ø30")).toEqual([UZUN_AD]); });
  it("AC-15: çok satırlı listede cins ile arama; seçim yalnız o satıra yazılır", () => {
    render(<Yedek satir={2} />);
    const kutular = screen.getAllByPlaceholderText("Parça ara...");
    fireEvent.focus(kutular[1]); fireEvent.change(kutular[1], { target: { value: "bilyalı" } });
    expect(spSecenekler().map(ustOf)).toEqual(["Rulman 6204"]);
    spSec("Rulman 6204");
    expect(form.satirlar.map(s => s.partId)).toEqual(["", "1"]);
  });
  it("AC-44 / AC-26 / AC-45: üst metin yalnız ad, kod alt satırın ilk değeri (iki kere yok); onay yalnız adı yazar", () => {
    render(<Yedek />);
    spAra("rulman");
    const [o] = spSecenekler();
    expect(ustOf(o)).toBe("Rulman 6204");
    expect(altOf(o)).toBe("625 · 5x16 · Krom çelik · Bilyalı");
    expect(o.textContent.match(/625/g)).toHaveLength(1);
    spSec("Rulman 6204");
    expect(form.satirlar[0].partId).toBe("1");
    cleanup();
    render(<Yedek coklu={false} />);
    spAra("somun"); spSec("Somun");
    expect(form.partId).toBe("5");
    cleanup();
    // Onay bileşenin etiketini yazar (R2/4): 4. ve 5. kutunun etiketi yalnız ad olduğu için onay da yalnız adı yazar. O iki kutu
    // seçimden sonra seçili parçayı gösterdiği için onay, aynı etiketle duran servis formunda ölçülür; kaynakta etiket yalnız ad.
    render(<Servis />); spAra("625"); spSec("Rulman 6204");
    expect(screen.getByText(/eklendi/).textContent).toBe('✓ "Rulman 6204" eklendi');
  });
  it("AC-26: bugün kodu yazan üç kutunun etiketi yalnız ad (onay da yalnız adı yazar)", async () => {
    const { readFileSync } = await import("node:fs");
    const y = readFileSync("src/components/YedekParcaSatisForm.jsx", "utf8");
    expect(y.match(/getLabel=\{p => parcaAdi\(p\)\}/g)).toHaveLength(2);
    expect(y).not.toMatch(/getLabel=\{p => `\$\{parcaAdi\(p\)\}\$\{p\.kod/);
    expect(readFileSync("src/components/Documents.jsx", "utf8")).toContain('getLabel={p => `${p.ad || ""}${setEtiketEki(p)}`}');
  });
});

function Evrak() {
  const t0 = { id: 900, type: "teklif", no: "2026-00001", tarih: "2026-09-20", createdAt: "2026-09-20", dil: "TR", currency: "TRY", durum: "taslak", firma: "K",
    satirlar: [{ rowId: "r1", pickTip: "parca", selectedModel: "", selectedKalip: "", selectedPart: "", subItems: [{ id: "p-r1", type: "parca", kod: "", makinaAdi: "", tanim: "", miktar: "1", birimFiyat: "", tlKarsiligi: "" }] }] };
  const [teklifler, setTeklifler] = useState([t0]);
  return <Documents teklifler={teklifler} setTeklifler={setTeklifler} faturalar={[]} setFaturalar={vi.fn()} customers={[]} partSales={[]}
    allModels={[{ model: "AK100" }]} factory={{ name: "Altuntaş" }} appSettings={{}} showToast={vi.fn()} kalipDefs={[{ id: 1, ad: "Hamburger 120", kod: "HM-1" }]} parts={CANLI}
    geoData={{}} loadingGeo={false} serverPermissions={null} dealers={[]} yedekParcaSatislar={[]} onEvrakKaydet={vi.fn()} />;
}
const evrakAc = () => { render(<Evrak />); fireEvent.click(screen.getByText("2026-00001").closest("tr")); fireEvent.click(screen.getByLabelText("Parça seç")); };
describe("Spec 0160: Evrak'ın penceresi (kutu 6)", () => {
  it("AC-16: kod ile arama", () => { evrakAc(); expect(spAra("dt-1")).toEqual(["Dişli Takımı · SET · 2 bileşen"]); });
  it("AC-17 / AC-44: set eki üst metinde bugünkü yerinde; kod alt satırda", () => {
    evrakAc(); spAra("takımı");
    const [o] = spSecenekler();
    expect(ustOf(o)).toBe("Dişli Takımı · SET · 2 bileşen");
    expect(altOf(o)).toBe("DT-1");
  });
  it("AC-63: set parçası 'set' yazılarak bulunur", () => { evrakAc(); expect(spAra("set")).toEqual(["Dişli Takımı · SET · 2 bileşen"]); });
});

describe("Spec 0160: bileşen seçicisi (kutu 7) ve model kartı (kutu 8)", () => {
  it("AC-18: bileşen kutusunda ölçü ile arama; aday kümesi bugünkü kuralla (set, bileşenler arası iki yönlü kural)", () => {
    render(<Katalog />);
    fireEvent.click(within(screen.getAllByText("Somun").map(e => e.closest("tr")).find(Boolean)).getByTitle("Düzenle"));
    expect(spAra("5x16", "Bileşen ara...")).toEqual(["Rulman 6204"]);
    expect(spAra("dt-1", "Bileşen ara...")).toEqual([]); // içerikli set aday değil
  });
  it("AC-19: model kartında kod ile arama; liste yalnız o modele işaretli parçalar", () => {
    render(<Katalog tab="models" std={[{ model: "AK100", defaultParcalar: [] }]} />);
    fireEvent.click(screen.getAllByText("AK100").map(e => e.closest("tr")).find(Boolean).querySelector("button.btn--ghost"));
    expect(spAra("ky-12", "Parça ekle...")).toEqual(["Kayış"]);
    expect(spAra("din 933", "Parça ekle...")).toEqual([]); // Cıvata AK120'ye işaretli
  });
});

const analizRender = (parts = CANLI) => render(<Analiz {...ANALIZ_VERI} parts={parts} dealers={[]} appSettings={{}} />);
const analizAc = () => fireEvent.click(screen.getByLabelText("Parça seç"));
const analizSatirlari = () => [...screen.getByPlaceholderText("Parça ara...").parentElement.parentElement.children[1].querySelectorAll("button")];
const analizAra = (q) => { fireEvent.change(screen.getByPlaceholderText("Parça ara..."), { target: { value: q } }); return analizSatirlari().map(b => b.querySelector("span").textContent); };
describe("Spec 0160: Analiz'in seçicisi (kutu 9)", () => {
  it("AC-20: kod ile arama", () => { analizRender(); analizAc(); expect(analizAra("625")).toEqual(["Rulman 6204"]); });
  it("AC-21: kataloğu çözülemeyen satırda alt satır yok, adıyla bulunur", () => {
    analizRender(); analizAc();
    expect(analizAra("conta")).toEqual(["Serbest conta"]);
    expect(analizSatirlari()[0].querySelector(ALT)).toBeNull();
  });
  it("AC-51: kapalı düğme alt satır almaz ve 'ad (adet)' yazar", () => {
    analizRender();
    const d = screen.getByLabelText("Parça seç");
    expect(d.textContent).toBe("Rulman 6204 (3)▾");
    expect(d.querySelector(ALT)).toBeNull();
  });
  it("AC-52: satırda ad kendi öğesinde ve ilk sırada, alt satır kardeşi", () => {
    analizRender(); analizAc(); analizAra("rulman");
    const b = analizSatirlari()[0];
    const ad = b.querySelector("span");
    expect(ad.textContent).toBe("Rulman 6204");
    expect(ad.nextElementSibling.matches(ALT)).toBe(true);
    expect(ad.nextElementSibling.textContent).toBe("625 · 5x16 · Krom çelik · Bilyalı");
  });
  it("AC-53: adı sonradan değişmiş parça eski ve bugünkü adıyla bulunur", () => {
    analizRender(); analizAc();
    expect(analizAra("eski cıvata")).toEqual(["Eski Cıvata Adı"]);
    expect(analizAra("cıvata")).toEqual(["Eski Cıvata Adı"]);
    expect(analizAra("din 933")).toEqual(["Eski Cıvata Adı"]);
  });
  it("AC-55: çöpteki parçanın satırında alt satır yok, adıyla bulunur", () => {
    analizRender(); analizAc();
    expect(analizAra("eski mil")).toEqual(["Eski Mil"]);
    expect(analizSatirlari()[0].querySelector(ALT)).toBeNull();
    expect(analizAra("em-1")).toEqual([]);
  });
  it("AC-56: satır tek satıra kırpar; sarma yalnız arama panellerinde", () => {
    analizRender(); analizAc(); analizAra("rulman");
    const b = analizSatirlari()[0];
    expect(b.querySelector("span").style.whiteSpace).toBe("nowrap");
    expect(b.querySelector(ALT).style.whiteSpace).toBe("nowrap");
    render(<SearchPick items={CANLI} getLabel={p => p.ad} getKey={p => p.id} getAlt={() => "x"} onPick={vi.fn()} placeholder="Z" />);
    fireEvent.focus(screen.getByPlaceholderText("Z"));
    expect(document.querySelector(`.sp-option ${ALT}`).style.whiteSpace).toBe("");
  });
});

describe("Spec 0160: ortak bileşen ve kapsam dışı kutular", () => {
  it("AC-29: üç boş sonuç metni ayrı ayrı korunur", () => {
    render(<Servis />); expect(spAra("zzzz")).toEqual([]); expect(screen.getByText("Bulunamadı.")).toBeTruthy(); cleanup();
    analizRender(); analizAc(); fireEvent.change(screen.getByPlaceholderText("Parça ara..."), { target: { value: "zzzz" } });
    expect(screen.getByText("Sonuç yok.")).toBeTruthy(); cleanup();
    stokRender(); fireEvent.click(screen.getByText("Stoğa Parça Ekle")); fireEvent.click(screen.getByText("Parça seçin..."));
    fireEvent.change(screen.getByPlaceholderText("Parça ara..."), { target: { value: "zzzz" } });
    expect(screen.getByText("Sonuç bulunamadı.")).toBeTruthy();
  });
  it("AC-30: hiç parça olmayan kurulumda boş metinler aynı (altın: parca-arama-0160-kiyas)", () => {
    stokRender([]); expect(screen.getByTestId("bos-parca-stok").textContent).toMatch(/Henüz yedek parça tanımı yok/);
  });
  it("AC-31 / C3 / P4: yeni alanlar verilmeyince SearchPick ve SearchSelect HTML'i birebir eski (müşteri, bayi, kalıp, tahsis)", () => {
    const { container: a } = render(<SearchPick items={[{ id: 1, name: "Lezzet · S-1" }]} getLabel={c => c.name} getKey={c => c.id} onPick={vi.fn()} placeholder="Firma" />);
    fireEvent.focus(screen.getByPlaceholderText("Firma"));
    expect(a.querySelector(".sp-option").innerHTML).toBe("Lezzet · S-1");
    cleanup();
    render(<SearchSelect value="" onChange={vi.fn()} options={[{ value: "a", label: "Hamburger 120" }]} searchPlaceholder="Kalıp ara..." />);
    fireEvent.click(screen.getByText("Seçin..."));
    expect(document.querySelector(".ss-option").innerHTML).toBe("Hamburger 120");
    fireEvent.change(screen.getByPlaceholderText("Kalıp ara..."), { target: { value: "hm" } }); // yeni anahtar yoksa ek değer aranmaz
    expect(document.querySelectorAll(".ss-option")).toHaveLength(0);
  });
  it("AC-59: müşteri formunun kalıp seçicisi seçenek anahtarı geçirmez (birebir eski)", async () => {
    const { readFileSync } = await import("node:fs");
    const s = readFileSync("src/components/customers/CustomerAddEditForm.jsx", "utf8");
    const i = s.indexOf("<SearchSelect"); const cagri = s.slice(i, s.indexOf("/>", i));
    expect(cagri).not.toMatch(/\bara:|\balt:|parcaArama/);
  });
  it("AC-31: kalıp satış formu ve tahsis penceresinin seçicileri alt satır çizmez", () => {
    render(<PartSaleForm title="K" form={{ customerId: "", tarih: "2026-09-20", currency: "TRY", kaliplar: [{ ad: "", olcu: "", fiyat: "" }] }} setForm={vi.fn()} customers={[]} dealers={[]}
      kalipDefs={[{ id: 1, ad: "Hamburger 120", kod: "HM-1" }]} onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(spAra("hamburger", "Kalıp ara...")).toEqual(["Hamburger 120"]);
    expect(document.querySelector(ALT)).toBeNull();
    expect(spAra("hm-1", "Kalıp ara...")).toEqual([]);
  });
  // Triyaj (bulgu 2): iki kayıt listesi ve tahsis penceresi gerçekten çizilir; kodla arama satır getirmez, alt satır çizilmez.
  const SATIS = [{ id: 700, aliciTipi: "bayi", dealerId: 5, partId: "1", miktar: 2, birimFiyat: 150, currency: "TRY", faturaTipi: "Faturalı Yurtiçi", tarih: "2026-07-01", odendi: true, tahsisler: [] }];
  const BAYI = [{ id: 5, name: "Kuzey Bayi", bayiMi: true, country: "Türkiye", city: "Bursa" }];
  it("AC-58 (Stok › Yedek Parça Satışı): parça adıyla bulunur, kodla ve ölçüyle bulunmaz; alt satır yok (X8)", () => {
    render(<YedekParcaSatisTab yedekParcaSatislar={SATIS} setYedekParcaSatislar={vi.fn()} dealers={BAYI} parts={CANLI} customers={[]} showToast={vi.fn()} />);
    const kutu = screen.getByPlaceholderText("Alıcı, parça, kargo no ile ara...");
    fireEvent.change(kutu, { target: { value: "rulman" } });
    expect(screen.queryAllByText(/Kuzey Bayi/).length).toBeGreaterThan(0);
    for (const q of ["625", "5x16"]) { fireEvent.change(kutu, { target: { value: q } }); expect(screen.queryAllByText(/Kuzey Bayi/), q).toHaveLength(0); }
    expect(document.querySelector(ALT)).toBeNull();
  });
  it("AC-58 (bayi detayı): yedek parça satışları parça adıyla bulunur, kodla bulunmaz; alt satır yok (X8)", async () => {
    const { SimpleDealers } = await import("../../src/components/SimpleDealers");
    render(<SimpleDealers dealers={BAYI} setDealers={vi.fn()} factory={{ name: "Altuntaş Makina" }} setFactory={vi.fn()} geoData={null} loadingGeo={false}
      parts={CANLI} yedekParcaSatislar={SATIS} setYedekParcaSatislar={vi.fn()} openDetailId={5} serverPermissions={null} showToast={vi.fn()} />);
    const kutu = screen.getByPlaceholderText("Servis, yedek parça veya kalıp ara...");
    fireEvent.change(kutu, { target: { value: "rulman" } });
    expect(screen.queryAllByText(/Rulman 6204/).length).toBeGreaterThan(0);
    fireEvent.change(kutu, { target: { value: "625" } });
    expect(screen.queryAllByText(/Rulman 6204/)).toHaveLength(0);
    expect(document.querySelector(ALT)).toBeNull();
  });
  it("AC-31 (tahsis penceresi): müşteri seçicisi birebir eski; alt satır çizilmez", () => {
    render(<TahsisModal customers={[{ id: 1, name: "Lezzet Gıda", serialNo: "S-77", model: "AK100" }]} kalan={2} onEkle={vi.fn()} onClose={vi.fn()} />);
    expect(spAra("lezzet", "Firma / model / seri no ara...")).toEqual(["Lezzet Gıda · S-77"]);
    expect(spSecenekler()[0].innerHTML).toBe("Lezzet Gıda · S-77");
    expect(document.querySelector(ALT)).toBeNull();
  });
});
