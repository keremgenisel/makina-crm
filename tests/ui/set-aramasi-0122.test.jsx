// Spec 0138 ile: spec 0137'nin bu dosyaya eklediği dış işlem iddiaları kaldırıldı, dosya 0136 hâline döndü (C7, AC-41, AC-42).
// @vitest-environment jsdom
// Spec 0122: set içeriğinde bileşen parçası aramayla seçilir. Gerçek Settings (Katalog › Parça/Yedek Parça; App gibi bağlanır:
// panele çöpü süzülmüş dizi, setter'a tam dizi, `rawParts` ham dizi), saf aday yardımcısı ve kaynak taramaları.
// Tutamak (R1/2, Karar 3): kutu yer tutucusuyla, panel `.sp-option` ile okunur, seçim focus + mouseDown.
process.env.TZ = "Europe/Istanbul";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { useState } from "react";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { Settings } from "../../src/components/Settings";
import * as UA from "../../src/lib/urunAgaci";
import { SET_BILESEN_ARA, SET_AYNI_PARCA, SET_PARCA_SECILMEDI, setBilesenAdaylari, setIcerigiDogrula } from "../../src/lib/urunAgaci";

afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-11-02T10:00:00")); });

const BASE = {
  customers: [], services: [], dealers: [], stock: [], setStock: vi.fn(), setCustomers: vi.fn(), setServices: vi.fn(), setDealers: vi.fn(),
  version: "3.53.0", appSettings: {}, setAppSettings: vi.fn(), factory: { name: "Altuntaş" }, setFactory: vi.fn(), kalipDefs: [], setKalipDefs: vi.fn(),
  calisanlar: [], setCalisanlar: vi.fn(), partTypeDefs: [], setPartTypeDefs: vi.fn(), onInitialTabConsumed: vi.fn(), aktifKullanici: "kerem",
};
const PARCALAR = [
  // Triyaj bulgu 2 (R3, X3): adayın kodu var; panel etiketi yine yalnız ad olmalı.
  { id: 7, ad: "Rulman", kod: "R-6204", models: [], fiyatTRY: "500", maliyet: 100 },
  { id: 8, ad: "Pul", models: [], fiyatTRY: "", maliyet: 2.5 },
  { id: 9, ad: "Kayış", models: [], fiyatTRY: "300" },
  { id: 10, ad: "Rulman Seti", models: [], fiyatTRY: "3000", setIcerigi: [{ partId: 7, miktar: 2 }, { partId: 8, miktar: 4 }] },
  { id: 11, ad: "Eski Dişli", models: [], maliyet: 40, deletedAt: "2026-10-01T00:00:00.000Z" },
  { id: 13, ad: "ISITICI REZİSTANS", models: [], maliyet: 50 },
  { id: 14, ad: "Şaft", models: [], maliyet: 30 },
];
const canli = (a) => a.filter(x => !x.deletedAt);
let durum;
function Katalog({ p0 = PARCALAR }) {
  const [parts, setParts] = useState(structuredClone(p0));
  durum = { parts };
  return <Settings {...BASE} initialTab="yedekparca" parts={canli(parts)} setParts={setParts} standardModels={[]} setStandardModels={vi.fn()}
    customModels={[]} setCustomModels={vi.fn()} rawParts={parts} rawCustomModels={[]} tedarikciler={[]} setTedarikciler={vi.fn()} giderYetki />;
}
const satir = (ad) => screen.getAllByText(ad).map(e => e.closest("tr")).find(Boolean);
const duzenle = (ad) => fireEvent.click(within(satir(ad)).getByTitle("Düzenle"));
const kaydet = () => fireEvent.click(screen.getByRole("button", { name: /Kaydet/ }));
const kayit = (id) => durum.parts.find(p => p.id === id);
const kutu = () => within(screen.getByTestId("set-icerigi")).getByPlaceholderText(SET_BILESEN_ARA);
const secenekler = () => [...document.querySelectorAll(".sp-option")];
const panel = () => { fireEvent.focus(kutu()); return secenekler().map(e => e.textContent); };
const yaz = (q) => { fireEvent.focus(kutu()); fireEvent.change(kutu(), { target: { value: q } }); return secenekler().map(e => e.textContent); };
const sec = (ad, n = 0) => { fireEvent.focus(kutu()); fireEvent.mouseDown(secenekler().filter(e => e.textContent === ad)[n]); };
const satirSayisi = () => screen.queryAllByTestId("set-bilesen-satiri").length;
// Kayış düzenlenirken beklenen aday kümesi (katalog sırası; içerikli set, çöpteki ve kendisi hariç).
const KAYIS_ADAYLARI = ["Rulman", "Pul", "ISITICI REZİSTANS", "Şaft"];

describe("Spec 0122 A: arama seçicisi (R1, R1/2, R1/3, R6, R6/2)", () => {
  it("AC-1: bölümde arama kutusu çizilir; açılır liste ve 'Bileşen Ekle' düğmesi yok", () => {
    render(<Katalog />);
    duzenle("Kayış");
    const b = screen.getByTestId("set-icerigi");
    expect(within(b).getByPlaceholderText(SET_BILESEN_ARA)).toBeTruthy();
    expect(b.querySelector("select")).toBeNull();
    expect(within(b).queryByRole("button", { name: /Bileşen Ekle/ })).toBeNull();
  });
  it("AC-2: yazılan metin adında geçen parçaları listeler; Türkçe harf farkı sonucu değiştirmez", () => {
    render(<Katalog />);
    duzenle("Kayış");
    for (const q of ["ISITICI", "ısıtıcı", "isitici", "Isıtıcı"]) expect(yaz(q), q).toEqual(["ISITICI REZİSTANS"]);
    for (const q of ["şaft", "saft", "ŞAFT"]) expect(yaz(q), q).toEqual(["Şaft"]);
    expect(yaz("rul")).toEqual(["Rulman"]);
  });
  it("R3 / X3 (triyaj bulgu 2): kodu olan adayın panel metni birebir adıdır; kodla aranmaz", () => {
    render(<Katalog />);
    duzenle("Kayış");
    expect(panel()).toContain("Rulman");
    expect(panel().some(x => x.includes("R-6204"))).toBe(false);
    expect(yaz("R-6204")).toEqual([]);
  });
  it("AC-3: tıklanan parça satır olur, adedi '1' gelir ve panel kapanır", () => {
    render(<Katalog />);
    duzenle("Kayış");
    yaz("rul");
    fireEvent.mouseDown(secenekler()[0]);
    expect(satirSayisi()).toBe(1);
    expect(screen.getByLabelText("Bileşen adedi 1").value).toBe("1");
    expect(secenekler()).toHaveLength(0);
    expect(kutu().value).toBe("");
  });
  it("AC-23: boş sorguda odaklanınca panel bütün adayları katalog sırasıyla listeler (ada göre sıralama yok)", () => {
    render(<Katalog />);
    duzenle("Kayış");
    const liste = panel();
    expect(liste).toEqual(KAYIS_ADAYLARI);
    expect(liste).not.toEqual([...liste].sort((a, b) => a.localeCompare(b, "tr")));
  });
  it("AC-10: ekleme formunda da aynı arama kutusu çizilir; aday kümesi kendiId'siz (bütün içeriksiz canlı parçalar)", () => {
    render(<Katalog />);
    fireEvent.click(screen.getByRole("button", { name: /Parça\/Yedek Parça Ekle/ }));
    expect(panel()).toEqual(["Rulman", "Pul", "Kayış", "ISITICI REZİSTANS", "Şaft"]);
  });
  it("AC-11: içeriği boş parçada bölüm, açıklama ve kutu çizilir; dokunulmadan kaydedilen parçada setIcerigi oluşmaz", () => {
    render(<Katalog />);
    duzenle("Kayış");
    expect(screen.getByTestId("set-icerigi-bos")).toBeTruthy();
    expect(kutu()).toBeTruthy();
    kaydet();
    expect("setIcerigi" in kayit(9)).toBe(false);
  });
});

describe("Spec 0122 B: yinelenen parça önlenir (R2/2, R7, R8)", () => {
  it("AC-5: içerikli set, çöpteki parça, parçanın kendisi ve içeriğe eklenmiş parça panelde yok; sıra korunur", () => {
    render(<Katalog />);
    duzenle("Kayış");
    sec("Pul");
    expect(panel()).toEqual(["Rulman", "ISITICI REZİSTANS", "Şaft"]);
  });
  it("AC-6: eklenen parça panelden düşer, ikinci kez tıklanamaz; satır kaldırılınca yerine geri gelir", () => {
    render(<Katalog />);
    duzenle("Kayış");
    sec("Rulman");
    expect(panel()).not.toContain("Rulman");
    expect(secenekler().filter(e => e.textContent === "Rulman")).toHaveLength(0);
    fireEvent.click(screen.getByLabelText("Bileşeni kaldır 1"));
    expect(panel()).toEqual(KAYIS_ADAYLARI);
  });
  it("AC-6 (düzenleme): kayıtlı içeriği olan setin bileşenleri panelde listelenmez", () => {
    render(<Katalog />);
    duzenle("Rulman Seti");
    expect(panel()).toEqual(["Kayış", "ISITICI REZİSTANS", "Şaft"]);
  });
  it("AC-7 / AC-20: seçimden sonra tek mesaj 'eklendi' onayıdır; uyarı ya da hata çizilmez ve satır gerçekten eklenmiştir", () => {
    render(<Katalog />);
    duzenle("Kayış");
    sec("Rulman");
    const b = screen.getByTestId("set-icerigi");
    expect(within(b).getByText("✓ \"Rulman\" eklendi")).toBeTruthy();
    expect(within(b).queryAllByRole("alert")).toHaveLength(0);
    expect(screen.queryByText(SET_AYNI_PARCA)).toBeNull();
    expect(satirSayisi()).toBe(1);
  });
  it("AC-21: aynı adlı iki aday iki ayrı satır çizilir, tıklanan doğru parçayı ekler, React anahtar uyarısı yok", () => {
    const hata = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<Katalog p0={[...PARCALAR, { id: 20, ad: "Rulman", models: [], maliyet: 7 }]} />);
    duzenle("Kayış");
    expect(panel().filter(x => x === "Rulman")).toHaveLength(2);
    sec("Rulman", 1);
    kaydet();
    expect(kayit(9).setIcerigi).toEqual([{ partId: 20, miktar: 1 }]);
    expect(hata.mock.calls.flat().join(" ")).not.toMatch(/same key|unique "key"/);
  });
  it("AC-4 (C1): bileşenler aramayla seçilip kaydedilen parçanın gövdesi 0121 AC-2 ile birebir aynı", () => {
    render(<Katalog />);
    duzenle("Kayış");
    sec("Rulman");
    fireEvent.change(screen.getByLabelText("Bileşen adedi 1"), { target: { value: "3" } });
    sec("Pul");
    kaydet();
    expect(kayit(9).setIcerigi).toEqual([{ partId: 7, miktar: 3 }, { partId: 8, miktar: 1 }]);
  });
  it("AC-32: seçicinin önünde koşullu öğe yok; satır ekleme ve kaldırmada (dolu ↔ boş) yazılmış metin kalır", () => {
    render(<Katalog />);
    duzenle("Rulman Seti");
    yaz("Ka");
    fireEvent.click(screen.getByLabelText("Bileşeni kaldır 2"));
    fireEvent.click(screen.getByLabelText("Bileşeni kaldır 1"));
    expect(screen.getByTestId("set-icerigi-bos")).toBeTruthy();
    expect(kutu().value).toBe("Ka");
    sec("Kayış");
    yaz("Şa");
    fireEvent.click(screen.getByLabelText("Bileşeni kaldır 1"));
    expect(kutu().value).toBe("Şa");
  });
});

describe("Spec 0122: saf aday yardımcısı (R2, R2/2, C2)", () => {
  const P = [
    { id: 1, ad: "A" }, { id: 2, ad: "B", deletedAt: "x" }, { id: 3, ad: "C", setIcerigi: [{ partId: 1, miktar: 1 }] },
    { id: 4, ad: "D" }, { id: 5, ad: "E" },
  ];
  it("AC-19: küme setBileseniSecilebilirMi'nin kümesi eksi satırdaki parçalar; sıra katalog sırası; kimlik metin/sayı farkı yok", () => {
    expect(setBilesenAdaylari(P, null, []).map(p => p.id)).toEqual(P.filter(p => UA.setBileseniSecilebilirMi(p, null)).map(p => p.id));
    expect(setBilesenAdaylari(P, 4, []).map(p => p.id)).toEqual([1, 5]);
    expect(setBilesenAdaylari(P, null, [{ partId: "5", miktar: "1" }, { partId: 1, miktar: "2" }]).map(p => p.id)).toEqual([4]);
    expect(setBilesenAdaylari(P, null, [{ partId: "", miktar: "1" }]).map(p => p.id)).toEqual([1, 4, 5]);
    expect(setBilesenAdaylari(undefined, null, undefined)).toEqual([]);
  });
  it("AC-26 / R8: doğrulayıcının iki hata metni yerinde (bozuk kayıtta boş kimlik, yinelenen satır)", () => {
    const { hatalar } = setIcerigiDogrula([{ partId: "", miktar: "1" }, { partId: "1", miktar: "1" }, { partId: "1", miktar: "1" }], P, null);
    expect(hatalar[0]).toBe(SET_PARCA_SECILMEDI);
    expect(hatalar[2]).toBe(SET_AYNI_PARCA);
  });
  it("AC-12 / AC-22: yer tutucu sabiti 'Bileşen ara...'", () => {
    expect(SET_BILESEN_ARA).toBe("Bileşen ara...");
  });
});

describe("Spec 0122: var olan testlerle ölçülen kriterler (triyaj bulgu 5)", () => {
  const ham = (f) => readFileSync(f, "utf8");
  const KAPSAM = {
    "AC-8": [["tests/ui/set-icerigi-0121.test.jsx", "it(\"AC-3: adet 0"], ["tests/ui/set-icerigi-0121.test.jsx", "it(\"AC-7 / AC-8 / AC-40:"]],
    "AC-9": [["tests/kirilim-toplami-0099.test.js", "it(\"AC-26: PartManager'da formMaliyeti("], ["tests/ui/set-icerigi-0121.test.jsx", "it(\"AC-51 / C1:"]],
    "AC-29": [["tests/kanit-eslemesi.test.js", "it(\"AC-11b / AC-11c: eşlemedeki her kayıt kurallara uyar"]],
    "AC-31": [["tests/kirilim-toplami-0099.test.js", "expect(say(s, \"reduce(\")).toBe(0);"], ["tests/hammadde-0096.test.js", "expect(segmentler.length).toBe(2);"]], // spec 0133 ile: iki Segment adla sınırlandı (R4/3)
  };
  for (const [ac, testler] of Object.entries(KAPSAM)) {
    it(`${ac}: ölçen var olan testler yerinde (${testler.map(t => t[0].split("/").pop()).join(", ")})`, () => {
      for (const [f, imza] of testler) expect(ham(f), `${f} · ${imza}`).toContain(imza);
    });
  }
  it("AC-29: eşlemenin 0122 kayıtları 0122 raporunu gösterir; 0121 kayıtları yerinde", () => {
    const L = JSON.parse(ham("docs/evidence/kanit-eslemesi.json")).dosyalar["src/components/PartManager.jsx"];
    const yeni = L.filter(k => k.rapor.includes("/0122-"));
    expect(yeni.length).toBeGreaterThanOrEqual(19);
    expect(yeni.filter(k => k.ekran.startsWith("ayarlar-yedekparca")).every(k => (k.beklenen ?? "ayni") === "ayni")).toBe(true);
    expect(L.some(k => k.rapor === "docs/evidence/0121-taban-piksel-raporu.json")).toBe(true);
  });
});

describe("Spec 0122: kaynak taramaları", () => {
  const kod = (f) => readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
  const ham = (f) => readFileSync(f, "utf8");
  const pm = () => kod("src/components/PartManager.jsx");
  const bolum = () => { const s = pm(); const a = s.indexOf("const SetIcerigiAlani"); return s.slice(a, s.indexOf("\n};", a)); };
  const dosyalar = (kok) => readdirSync(kok).flatMap(f => { const y = path.join(kok, f); return statSync(y).isDirectory() ? dosyalar(y) : /\.(jsx?|cjs|mjs)$/.test(f) ? [y] : []; });
  // R10/2, Karar 26: bugünkü sekiz çağrı (beş dosya); satır metni birebir.
  const SEKIZ = [
    ["src/components/YedekParcaSatisForm.jsx", ": <SearchPick items={customers} getLabel={c => `${c.name}${c.serialNo ? \" · \" + c.serialNo : \"\"}`} getKey={c => c.id} placeholder=\"Firma / model / seri no ara...\""],
    ["src/components/YedekParcaSatisForm.jsx", "<SearchPick items={[{ id: \"__diger__\", name: \"➕ Diğer (anlaşmasız firma)\" }, ...bayiler]}"],
    ["src/components/YedekParcaSatisForm.jsx", ": <SearchPick items={parts} getLabel={p => `${parcaAdi(p)}${p.kod ? \" · \" + p.kod : \"\"}`} getKey={p => p.id} placeholder=\"Parça ara...\""],
    ["src/components/YedekParcaSatisForm.jsx", "<SearchPick items={parts} getLabel={p => `${parcaAdi(p)}${p.kod ? \" · \" + p.kod : \"\"}`} getKey={p => p.id} placeholder=\"Parça ara...\" onPick={p => parcaSec(i, p)} />"],
    ["src/components/ServiceForm.jsx", "<SearchPick items={parcaKumesi.liste} getLabel={p => p.ad} getKey={p => p.id} placeholder=\"Parça ara...\""],
    ["src/components/PartSaleForm.jsx", "<SearchPick items={kalipDefs} getLabel={d => d.ad} getKey={d => d.id} placeholder=\"Kalıp ara...\" onPick={d => kalipSec(i, d)} />"],
    ["src/components/ModelsManager.jsx", "<SearchPick items={parts.filter(p => p.models?.includes(mForm.model))} getLabel={p => p.ad} getKey={p => p.id} placeholder=\"Parça ekle...\""],
    ["src/components/stock/TahsisModal.jsx", "<SearchPick items={customers} getLabel={c => `${c.name}${c.serialNo ? \" · \" + c.serialNo : \"\"}`} getKey={c => c.id}"],
  ];
  it("AC-14 / AC-25: öteki sekiz çağrı birebir aynı, toplam dokuz çağrı altı dosya, PartManager'da tek; SearchPick imzası değişmedi ve etiket taşımaz", () => {
    const cagrilar = dosyalar("src").filter(f => !f.endsWith("ui.jsx"))
      .flatMap(f => ham(f).split("\n").filter(l => l.includes("<SearchPick")).map(l => [f, l.trim()]));
    // Spec 0126 ile: Evrak'ın seçim penceresi onuncu çağrı ve yedinci dosyadır (KalemSecPenceresi.jsx'te tek çağrı).
    expect(cagrilar).toHaveLength(10);
    expect(new Set(cagrilar.map(c => c[0])).size).toBe(7);
    expect(cagrilar.filter(c => c[0].endsWith("KalemSecPenceresi.jsx"))).toHaveLength(1);
    const otekiler = cagrilar.filter(c => !c[0].endsWith("PartManager.jsx") && !c[0].endsWith("KalemSecPenceresi.jsx"));
    expect(otekiler.map(c => c.join(" ")).sort()).toEqual(SEKIZ.map(c => c.join(" ")).sort());
    expect(cagrilar.filter(c => c[0].endsWith("PartManager.jsx"))).toHaveLength(1);
    const ui = ham("src/components/ui.jsx");
    expect(ui).toContain('export const SearchPick = ({ items, onPick, getLabel = (x) => String(x), getKey = (x) => getLabel(x), placeholder = "Ara...", emptyText = "Bulunamadı." }) => {');
    const a = ui.indexOf("export const SearchPick"); const govde = ui.slice(a, ui.indexOf("\nexport ", a + 10));
    expect(govde).not.toMatch(/aria-label/);
  });
  it("AC-15: yeni iki ad src ve electron altında yalnız urunAgaci.js ile PartManager.jsx'te geçer", () => {
    for (const ad of ["setBilesenAdaylari", "SET_BILESEN_ARA"]) {
      const gecen = [...dosyalar("src"), ...dosyalar("electron")].filter(f => ham(f).includes(ad)).map(f => f.split(path.sep).join("/")).sort();
      expect(gecen, ad).toEqual(["src/components/PartManager.jsx", "src/lib/urunAgaci.js"]);
    }
  });
  it("AC-12 / AC-22: yer tutucu PartManager'da düz metin değil, bölüm emptyText geçmez", () => {
    expect(pm()).not.toContain("Bileşen ara...");
    expect(bolum()).toMatch(/placeholder=\{SET_BILESEN_ARA\}/);
    expect(bolum()).not.toMatch(/emptyText/);
  });
  it("AC-13: iki ölü sabit kaynakta ve testlerde hiç geçmez", () => {
    const adlar = ["SET_PARCA_" + "SEC\\b", "SET_BILESEN_" + "EKLE"].map(a => new RegExp(a));
    for (const f of [...dosyalar("src"), ...dosyalar("tests")]) for (const r of adlar) expect(r.test(ham(f)), `${f} ${r}`).toBe(false);
  });
  it("AC-17: 'Bileşen parçası' etiketi kaynakta yok", () => {
    for (const f of dosyalar("src")) expect(ham(f).includes('aria-label="Bileşen parçası"'), f).toBe(false);
  });
  it("AC-18: seçici satırında iki sütunlu ızgara kalmadı; seçicinin kabı genişlik sınırı taşımaz (triyaj bulgu 1)", () => {
    expect(bolum()).not.toContain('"minmax(160px, 2fr) auto"');
    // jsdom yerleşim yapmaz: kabın kendisi taranır. Kap stil taşımayan düz <div>'dir; width, maxWidth, gridTemplateColumns yok.
    const kap = bolum().match(/(<div[^>]*>)\s*<SearchPick/);
    expect(kap).toBeTruthy();
    expect(kap[1]).toBe("<div>");
    const sp = bolum().slice(bolum().indexOf("<SearchPick"));
    expect(sp.slice(0, sp.indexOf("/>"))).not.toMatch(/width|maxWidth|gridTemplateColumns|style=/);
  });
  it("R3 (triyaj bulgu 2): panel etiketi yalnız ad; kodu olan aday kodsuz çizilir, kod aranmaz", () => {
    expect(bolum()).toContain("getLabel={p => p.ad}");
    expect(bolum()).toContain("getKey={p => p.id}");
  });
  it("AC-19: süzme urunAgaci.setBilesenAdaylari'ndan; PartManager ikinci bir süzme yazmaz", () => {
    expect(pm().match(/setBilesenAdaylari\(/g)).toHaveLength(1);
    expect(pm()).not.toMatch(/setBileseniSecilebilirMi\(/);
    expect(bolum()).not.toMatch(/\b(parts|hamParts|adaylar)\.filter\(|items=\{parts/);
  });
  it("AC-24: ekleme formu kendiId geçmez, düzenleme formu geçer; iki form aynı bileşeni çağırır", () => {
    const cagri = pm().split("\n").filter(l => l.includes("<SetIcerigiAlani"));
    expect(cagri).toHaveLength(2);
    expect(cagri[0]).not.toMatch(/kendiId/);
    expect(cagri[1]).toMatch(/kendiId=\{editId\}/);
  });
  it("AC-26: secim, uyari ve ekle kalmadı; Select içe aktarımı ve iki kullanımı duruyor; iki doğrulayıcı metni yerinde", () => {
    const b = bolum();
    expect(b).not.toMatch(/\bsecim\b|\bsetSecim\b|\buyari\b|\bsetUyari\b|const ekle\b/);
    expect(pm()).toMatch(/import \{[^}]*\bSelect\b[^}]*\} from "\.\/ui"/);
    // Spec 0135 ile (R17/2): hammadde tedarikçisi seçicisi işlem kaleminin satırına (MaliyetKalemleriAlani.jsx) taşındı; panelde
    // yalnız tedarikçi süzgeci kaldı. İddia (set bölümü Select kullanmaz, içe aktarım duruyor) korunur.
    expect(pm().match(/<Select\b/g)).toHaveLength(1);
    expect(UA.SET_PARCA_SECILMEDI).toBeTruthy();
    expect(UA.SET_AYNI_PARCA).toBeTruthy();
    expect(pm()).not.toMatch(/SET_AYNI_PARCA/);
  });
  it("AC-16 / AC-27: sözlükte arama seçicisi kuralı açılır liste alt bölümünde düz metin; Segment bölümünde yeni Örnek satırı yok", () => {
    const s = ham("docs/tasarim-sozlugu.md");
    const seg = s.slice(s.indexOf("## Segment"), s.indexOf("## KartBolum"));
    const alt = seg.slice(seg.indexOf("### Ne zaman açılır liste?"));
    expect(alt).toMatch(/SearchPick/);
    expect(alt).toMatch(/spec 0122/);
    const kural = alt.split("\n").filter(l => /SearchPick/.test(l));
    for (const l of kural) expect(l).not.toMatch(/\*\*Örnek:\*\*/);
    expect(seg.match(/\*\*Örnek:\*\*/g)).toHaveLength(6);
  });
  it("AC-28: sözlüğün Erişilebilirlik borcu bölümünde SearchPick'in etiketsizliği ortak borç olarak yazılı", () => {
    const s = ham("docs/tasarim-sozlugu.md");
    const borc = s.slice(s.indexOf("### Erişilebilirlik borcu"));
    expect(borc).toMatch(/SearchPick/);
    expect(borc).toMatch(/spec 0122/);
    expect(borc).toMatch(/[Aa]yrı iş/);
  });
  it("AC-30: kanıt aracında odak: adımı ve panel ekranı var; ara: adımı değişmedi", () => {
    const s = ham("scripts/evidence/0009-sayfa.jsx");
    expect(s).toContain('"katalog-parca-0122-panel"');
    expect(s).toMatch(/metin\.startsWith\("odak:"\)/);
    expect(s).toContain('// Arama kutusundan seçim (SearchPick): "ara:<placeholder>=<yazı>><seçenek>"; odaklanır, yazar, seçeneğe mousedown (spec 0063).');
    expect(s).toContain('if (s) { s.dispatchEvent(new MouseEvent("mousedown", { bubbles: true })); s.click(); } else console.warn("seçenek yok: " + metin);');
  });
});
