// @vitest-environment jsdom
// Spec 0141 (ekran): parça kartının malzeme kalemi (pay alanı yok, özet "Ağırlık", eski payın katlanması ve dokunulmamış kayıt),
// emniyet payı alanının iki kartta da yokluğu, malzeme kartının altı alanlı ızgarası, sipariş penceresinin yedi başlıklı parça
// ihtiyacı tablosu ve ibaresi. Gerçek Settings (Katalog › Parça/Yedek Parça ve Malzemeler) ve gerçek SiparisPenceresi.
process.env.TZ = "Europe/Istanbul";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { useState } from "react";
import { Settings } from "../../src/components/Settings";
import { SiparisPenceresi } from "../../src/components/stock/SiparisPenceresi";
import * as M from "../../src/lib/malzeme";
import * as S from "../../src/lib/siparisIhtiyaci";
import { kutuAc } from "./kutuAc";
import * as F from "../fixtures/0134-veri";

vi.mock("../../src/lib/audit", async (orig) => ({ ...(await orig()), logAction: () => {} }));
afterEach(() => { cleanup(); });

const P304 = { id: 501, ad: "304 Paslanmaz", ozgulAgirlik: 7.9, kiloFiyati: 2.95, paraBirimi: "USD", kur: 50 };
const PAYLI = { id: 41, ad: "Kesme mili", models: [], maliyet: 12, malzemeSatiri: { malzemeId: 501, bicim: "mil", cap: 140, boy: 78, payCap: 4, payBoy: 5, fire: 8 } };
const BASE = {
  customers: [], services: [], dealers: [], stock: [], setStock: vi.fn(), setCustomers: vi.fn(), setServices: vi.fn(), setDealers: vi.fn(),
  version: "3.57.0", appSettings: {}, setAppSettings: vi.fn(), factory: { name: "Altuntaş" }, setFactory: vi.fn(), kalipDefs: [], setKalipDefs: vi.fn(),
  calisanlar: [], setCalisanlar: vi.fn(), partTypeDefs: [], setPartTypeDefs: vi.fn(), onInitialTabConsumed: vi.fn(), aktifKullanici: "kerem",
  standardModels: [], setStandardModels: vi.fn(), customModels: [], setCustomModels: vi.fn(), rawCustomModels: [], tedarikciler: [], setTedarikciler: vi.fn(),
};
let durum;
function Katalog({ p0 = [PAYLI, { id: 43, ad: "Pul", models: [], maliyet: 5 }], m0 = [P304], sekme = "yedekparca" }) {
  const [parts, setParts] = useState(structuredClone(p0));
  const [malzemeler, setMalzemeler] = useState(structuredClone(m0));
  durum = { parts, malzemeler };
  return <Settings {...BASE} initialTab={sekme} parts={parts.filter(p => !p.deletedAt)} rawParts={parts} setParts={setParts}
    malzemeler={malzemeler} rawMalzemeler={malzemeler} setMalzemeler={setMalzemeler} giderYetki />;
}
const satir = (ad) => screen.getAllByText(ad).map(e => e.closest("tr")).find(Boolean);
const duzenle = (ad) => fireEvent.click(within(satir(ad)).getByTitle("Düzenle"));
const kaydet = () => fireEvent.click(screen.getByRole("button", { name: /^Kaydet$/ }));
const yaz = (ad, v) => fireEvent.change(screen.getByLabelText(ad), { target: { value: v } });
const parca = (id) => durum.parts.find(p => p.id === id);

describe("Spec 0141 A: parça kartının malzeme kalemi", () => {
  it("AC-1–AC-4: dört biçimde yalnız ölçü alanları; hiçbir 'işleme payı' alanı yok", () => {
    render(<Katalog />); duzenle("Kesme mili");
    const olculer = () => within(screen.getByTestId("malzeme-olculer")).getAllByRole("textbox").map(e => e.getAttribute("aria-label"));
    expect(olculer()).toEqual(["Çap 1", "Boy 1"]); // AC-1
    yaz("Biçim 1", "lama"); expect(olculer()).toEqual(["Kalınlık 1", "Genişlik 1", "Boy 1"]); // AC-2
    yaz("Biçim 1", "sac"); expect(olculer()).toEqual(["Kalınlık 1", "En 1", "Boy 1"]); // AC-3
    yaz("Biçim 1", "boru"); expect(olculer()).toEqual(["Çap 1", "Et kalınlığı 1", "Boy 1"]); // AC-4
    expect(document.body.textContent).not.toMatch(/işleme payı/i);
  });
  it("AC-6 / AC-7 / AC-46: özet tek satır 'Ağırlık: X · fire dahil: Y', iki kimlik yerinde; 'Pay dahil' hiç geçmez", () => {
    render(<Katalog />); duzenle("Kesme mili");
    const oz = screen.getByTestId("malzeme-ozeti");
    expect(oz.textContent).toMatch(/^Ağırlık: 10,679 kg · fire dahil: 11,533 kg/);
    expect(screen.getByTestId("malzeme-ham-kg").textContent).toBe("10,679 kg");
    expect(screen.getByTestId("malzeme-fireli-kg").textContent).toBe("11,533 kg");
    expect(document.body.textContent).not.toMatch(/Pay dahil/i);
  });
  it("AC-42 / AC-43: payCap ve payBoy taşıyan eski kalem forma katlanmış açılır; canlı maliyet kaldırmadan önceki 1.701,12 ₺", () => {
    render(<Katalog />); duzenle("Kesme mili");
    expect(screen.getByLabelText("Çap 1").value).toBe("144");
    expect(screen.getByLabelText("Boy 1").value).toBe("83");
    expect(screen.getByTestId("malzeme-maliyet").textContent).toBe("1.701,12 ₺");
  });
  it("AC-11 / AC-63: dokunulmadan kaydedilen eski parçanın iki alanında pay yok, ölçü payı kadar büyük; maliyet aynı", () => {
    const iki = { ...PAYLI, maliyet: undefined, malzemeSatiri: undefined, maliyetKalemleri: [{ tur: "malzeme", malzemeId: 501, bicim: "mil", yontem: "kilo", cap: 96, payCap: 4, boy: 100, payBoy: 2, adet: 1 }] };
    render(<Katalog p0={[PAYLI, { ...iki, id: 44, ad: "Kalemli mil" }]} />);
    duzenle("Kesme mili"); yaz("Yedek Parça Adı (TR)", "Kesme mili B"); kaydet();
    expect(parca(41).malzemeSatiri).toEqual({ malzemeId: 501, bicim: "mil", cap: 144, boy: 83, fire: 8 });
    expect(parca(41).maliyet).toBe(12);
    duzenle("Kalemli mil"); kaydet();
    expect(parca(44).maliyetKalemleri).toEqual([{ tur: "malzeme", malzemeId: 501, bicim: "mil", yontem: "kilo", cap: 100, boy: 102, adet: 1 }]);
  });
  it("AC-11: dokunularak kaydedilen eski kalemde de pay anahtarı yok, ölçü katlanmış", () => {
    render(<Katalog />); duzenle("Kesme mili");
    yaz("Malzeme adedi 1", "2"); kaydet();
    expect(parca(41).maliyetKalemleri).toEqual([{ tur: "malzeme", malzemeId: 501, bicim: "mil", cap: 144, boy: 83, fire: 8, adet: 2 }]);
  });
});

describe("Spec 0141 B: emniyet payı alanları", () => {
  it("AC-15 / AC-16 / AC-21: parça kartının iki kipinde emniyet payı alanı yok; yeni parçanın kaydında anahtar yok", () => {
    render(<Katalog />);
    fireEvent.click(screen.getByRole("button", { name: /Parça\/Yedek Parça Ekle/ }));
    expect(screen.queryByLabelText("Parça emniyet payı")).toBeNull();
    const kipi = within(screen.getByTestId("maliyet-kipi"));
    fireEvent.click(kipi.getByRole("radio", { name: "Hesapla" }));
    expect(screen.queryByLabelText("Parça emniyet payı")).toBeNull();
    expect(document.body.textContent).not.toMatch(/Emniyet payı/);
    fireEvent.click(kipi.getByRole("radio", { name: "Elle sabit" }));
    yaz("Yedek Parça Adı (TR)", "Yeni parça"); kaydet();
    const yeni = durum.parts.find(p => p.ad === "Yeni parça");
    expect(yeni).toBeTruthy(); expect(yeni).not.toHaveProperty("emniyetPayi");
  });
  it("AC-13 / AC-14 / AC-20 / AC-48: malzeme kartının iki kipinde emniyet payı yok; ızgara altı alan, sıra aynı; kayıtta anahtar yok", () => {
    render(<Katalog sekme="malzemeler" m0={[{ ...P304, emniyetPayi: 10 }]} />);
    fireEvent.click(screen.getByRole("button", { name: /Yeni Malzeme/ }));
    // Kullanıcı isteği 2026-11-10 ile: Ana tedarikçi alaşımın arkasına geldi, ölçü alanları kendi ızgarasında; altı alan ve
    // sıraları aynı (Ana tedarikçi aradaki yeni konumunda, gider yetkisiyle).
    const etiketler = () => ["malzeme-kimlik", "malzeme-olcu-alanlari"].flatMap(id => [...screen.getByTestId(id).children].map(c => c.querySelector("label")?.textContent)).filter(x => x !== "Ana tedarikçi");
    expect(etiketler()).toEqual(["Malzeme adı", "Alaşım / kalite", "Özgül ağırlık (g/cm³)", "Varsayılan fire (%)", "Geldiği boy (metre)", "Asgari sipariş (kilogram)"]);
    expect(screen.queryByLabelText("Malzeme emniyet payı")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /İptal|Vazgeç/ }));
    fireEvent.click(screen.getByRole("button", { name: "304 Paslanmaz düzenle" }));
    expect(screen.queryByLabelText("Malzeme emniyet payı")).toBeNull();
    expect(etiketler()).toHaveLength(6);
    yaz("Asgari sipariş", "25"); kaydet(); // fire değişseydi 0139'un etki onayı sorulurdu
    expect(durum.malzemeler[0]).not.toHaveProperty("emniyetPayi");
    expect(durum.malzemeler[0].asgariSiparis).toBe(25);
  });
});

describe("Spec 0141 B: sipariş penceresi", () => {
  const VERI = { parts: [{ ...F.KESME, emniyetPayi: 10 }, { ...F.PUL, tedarikciId: 13 }, F.SOMUN, F.SET], partStock: [], malzemeler: [{ ...F.P304, emniyetPayi: 10 }], tedarikciler: F.TED,
    hamTedarikciler: F.TED, standardModels: [F.AK100], customModels: [], uretimPartileri: [{ id: 801, ad: "Güz", baslangicAy: "2026-09", bitisAy: null, planlananAdetler: { AK100_DS: 70 } }],
    appSettings: {}, factory: { name: "Altuntaş" } };
  it("AC-23 / AC-24 / AC-51: parça ihtiyacı tablosu yedi başlık, emniyet payı yok; ibare motorun sabitinden; Ham ihtiyaç = İhtiyaç (kit)", () => {
    render(<SiparisPenceresi veri={VERI} giderYetki bugun="2026-11-10" onClose={vi.fn()} />);
    kutuAc("Parça ihtiyacı");
    const ths = [...screen.getByTestId("siparis-parca-tablosu").querySelectorAll("th")].map(t => t.textContent);
    expect(ths).toEqual(["Parça", "Ham ihtiyaç", "İhtiyaç", "Stok", "Sipariş (öneri)", "Sipariş", "Sipariş etme"]);
    expect(screen.getByTestId("siparis-ham-ibare").textContent).toBe(S.HAM_IHTIYAC_IBARESI);
    const kesme = screen.getAllByTestId("siparis-parca-satiri").find(r => r.textContent.includes("Kesme mili"));
    const h = [...kesme.querySelectorAll("td")].map(td => td.textContent);
    expect(h[1]).toBe("70"); expect(h[2]).toBe("70"); // eski %10 pay uygulanmaz (77 değil)
    expect(screen.queryByTestId("siparis-pay")).toBeNull();
  });
  it("AC-25 (ekran): setten patlatılan bileşende iki sütun ayrışır (1,5 × 3 = 4,5 → 5)", () => {
    const set = { id: 50, ad: "Mil seti", models: [], setIcerigi: [{ partId: 42, miktar: 1.5 }] };
    render(<SiparisPenceresi veri={{ ...VERI, parts: [F.PUL, set], standardModels: [F.model("M1", [[50, 1]])], uretimPartileri: [{ id: 1, ad: "P", baslangicAy: "2026-09", bitisAy: null, planlananAdetler: { M1: 3 } }] }} giderYetki bugun="2026-11-10" onClose={vi.fn()} />);
    kutuAc("Parça ihtiyacı");
    const pul = screen.getAllByTestId("siparis-parca-satiri").find(r => r.textContent.includes("Pul"));
    const h = [...pul.querySelectorAll("td")].map(td => td.textContent);
    expect([h[1], h[2]]).toEqual(["4,5", "5"]);
  });
  it("AC-47 (ekran): malzeme satırının Net kg'si kalemin ham ağırlığı × adet", () => {
    render(<SiparisPenceresi veri={VERI} giderYetki bugun="2026-11-10" onClose={vi.fn()} />);
    const k = screen.getAllByTestId("siparis-kesit-satiri")[0];
    const hamKg = M.malzemeOzeti({ ...F.MIL140 }, M.malzemeKatalogu([F.P304])).hamKg;
    expect([...k.querySelectorAll("td")][1].textContent).toBe(M.kgMetni(hamKg * 70));
  });
});
