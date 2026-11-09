// @vitest-environment jsdom
// Spec 0096: hammadde tedarikçisi ve parça maliyetinin tedarikçi kırılımı (ekran). Gerçek Settings (Katalog › Parça/Yedek
// Parça, App gibi bağlanır: panele çöpü süzülmüş parça dizisi, setter'a tam dizi, tedarikçi dizisi HAM), gerçek Tedarikciler
// ekranı ve gerçek Çöp Kutusu. Motor kriterleri tests/hammadde-0096.test.js'te.
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { useState } from "react";
import { Settings } from "../../src/components/Settings";
import { Tedarikciler, HAMMADDE_ISARET_ETIKETI, SIL_PARCA_YONLENDIRME, SIL_KALEM_YONLENDIRME } from "../../src/components/gider/Tedarikciler";
import { SettingsTrash } from "../../src/components/settings/SettingsTrash";
// Spec 0135 ile (R24, R39, R39/2): hammadde bölümü işlem kalemine dönüştü; kaynak ibaresi tek kalem metni, koruma metni kalem dilinde.
import { SILINMIS_TEDARIKCI, BULUNAMAYAN_TEDARIKCI, kalemKaynakMetni } from "../../src/lib/urunAgaci";
import { KALEMDE_TEDARIKCI_NEDENI } from "../../src/lib/gider";
import { SUZGEC_BOS_METNI, SUZGEC_GIRILMEMIS } from "../../src/components/PartManager";

afterEach(() => { cleanup(); delete window.crmLocks; });
const noop = () => {};

const BASE = {
  customers: [], services: [], dealers: [], stock: [], setStock: vi.fn(), setCustomers: vi.fn(), setServices: vi.fn(), setDealers: vi.fn(),
  version: "3.49.0", appSettings: {}, setAppSettings: vi.fn(), factory: { name: "Altuntaş" }, setFactory: vi.fn(), kalipDefs: [], setKalipDefs: vi.fn(),
  calisanlar: [], setCalisanlar: vi.fn(), partTypeDefs: [], setPartTypeDefs: vi.fn(), onInitialTabConsumed: vi.fn(), aktifKullanici: "kerem",
};
const TED = [
  { id: 31, ad: "Demir Çelik", hammadde: true }, { id: 32, ad: "Sac Ltd", hammadde: true }, { id: 33, ad: "Döküm A.Ş.", hammadde: true },
  { id: 34, ad: "Yakıt A.Ş." }, { id: 35, ad: "Eski Sac", hammadde: true, deletedAt: "2026-10-01T00:00:00.000Z" },
];
const PARCALAR = [
  { id: 7, ad: "Rulman", models: [], fiyatTRY: 450, maliyet: 120.5 },
  { id: 8, ad: "Ayna dişlisi", models: [], hammaddeler: [{ tedarikciId: 31, tutar: 7000 }, { tedarikciId: 32, tutar: 9000 }, { tedarikciId: 33, tutar: 1000 }] },
  { id: 9, ad: "Kayış", models: [] },
];
const canli = (a) => a.filter(x => !x.deletedAt);
let durum;
function Katalog({ p0 = PARCALAR, t0 = TED, giderYetki = true }) {
  const [parts, setParts] = useState(structuredClone(p0));
  durum = { parts };
  return <Settings {...BASE} initialTab="yedekparca" parts={canli(parts)} setParts={setParts} standardModels={[]} setStandardModels={vi.fn()}
    customModels={[]} setCustomModels={vi.fn()} rawParts={parts} rawCustomModels={[]} tedarikciler={t0} setTedarikciler={vi.fn()} giderYetki={giderYetki} />;
}
const satir = (ad) => screen.getAllByText(ad).map(e => e.closest("tr")).find(Boolean);
const duzenle = (ad) => fireEvent.click(within(satir(ad)).getByTitle("Düzenle"));
const kaydet = () => fireEvent.click(screen.getByRole("button", { name: /Kaydet/ }));
const kayit = (id) => durum.parts.find(p => p.id === id);
const UC_ISLEM = kalemKaynakMetni({ malzeme: 0, islem: 3 });

describe("Spec 0096: parça kartı (R3–R9, R21, R23)", () => {
  // Spec 0135 ile (R7, R15/2, R17/2, R19/2, R24, R25/2): hammadde bölümü kalktı, kırılım satırları işlem kalemi oldu. Bölümün
  // kendi kriterleri (AC-3, AC-4, AC-7–AC-16, AC-35, AC-42, AC-43) ters çevrildi ya da kalem diline taşındı; karşılıkları
  // tests/ui/maliyet-kalemleri-0135.test.jsx ve tests/maliyet-kalemleri-0135.test.js'te (tekrar eden tedarikçi kuralı ve
  // işaret şartı kalktı, tutar belirsiz sayıyı reddeder, elle maliyet kalem listesi doluyken silinir).
  it("AC-17: elle girilmiş maliyette kartta 'Elle girildi'", () => {
    render(<Katalog />);
    duzenle("Rulman");
    expect(screen.getByTestId("maliyet-kaynagi").textContent).toBe("Elle girildi");
  });
  it("AC-18: 'maliyeti girilmemiş' şeridi kırılımdan maliyeti çıkan parçayı saymaz", () => {
    render(<Katalog />);
    expect(screen.getByTestId("maliyetsiz-parca").textContent).toMatch(/^1 parçanın/);
  });
});

describe("Spec 0096: ad çözümü (R14, R16, R17/2)", () => {
  const p0 = [{ id: 8, ad: "Ayna dişlisi", models: [], hammaddeler: [{ tedarikciId: 35, tutar: 500 }, { tedarikciId: 999, tutar: 100 }, { tedarikciId: 31, tutar: 1 }] }];
  it("AC-27 / AC-38 / AC-39: çöpteki tedarikçi adıyla ve 'silinmiş' ibaresiyle, bulunamayan kimlik kendi metniyle; tutarlar maliyette", () => {
    // Durum birleştirme ya da kısmi geri yüklemeyle oluşur (R16): tedarikçi silinerek değil, veriyle kurulur.
    render(<Katalog p0={p0} />);
    // Spec 0135 ile (R39, R44): liste hücresinin ikinci satırı tek kalem ibaresi; kırılım satırları işlem kalemi olarak açılır.
    expect(within(satir("Ayna dişlisi")).getByTestId("parca-maliyet").textContent).toBe(`601,00 ₺${UC_ISLEM}`);
    duzenle("Ayna dişlisi");
    const s1 = screen.getByLabelText("İşlem tedarikçisi 1");
    expect(s1.options[s1.selectedIndex].textContent).toBe(`Eski Sac (${SILINMIS_TEDARIKCI})`);
    const s2 = screen.getByLabelText("İşlem tedarikçisi 2");
    expect(s2.options[s2.selectedIndex].textContent).toBe(BULUNAMAYAN_TEDARIKCI);
    // Çöpteki tedarikçi başka satırın seçicisinde listelenmez
    expect([...screen.getByLabelText("İşlem tedarikçisi 3").options].map(o => o.textContent)).not.toContain(`Eski Sac (${SILINMIS_TEDARIKCI})`);
  });
  it("AC-25 / AC-26: ad değişince yeni ad; hammadde işareti kaldırılınca kırılım ve maliyet aynı, yeni satır seçicisinde yok", () => {
    const t0 = TED.map(t => (t.id === 31 ? { ...t, ad: "Demir Çelik Sanayi", hammadde: undefined } : t));
    render(<Katalog t0={t0} />);
    expect(within(satir("Ayna dişlisi")).getByTestId("parca-maliyet").textContent).toBe(`17.000,00 ₺${UC_ISLEM}`); // spec 0135 ile (R39)
    duzenle("Ayna dişlisi");
    const s1 = screen.getByLabelText("İşlem tedarikçisi 1");
    expect(s1.options[s1.selectedIndex].textContent).toBe("Demir Çelik Sanayi");
    kaydet();
    expect(kayit(8).hammaddeler).toEqual(PARCALAR[1].hammaddeler);
  });
});

describe("Spec 0096: gider yetkisi (R17, C11)", () => {
  it("AC-5 / AC-45: yetkisiz kullanıcıda süzgeç ve tedarikçi seçicisi yok, hiçbir tedarikçi adı görünmez", () => {
    render(<Katalog giderYetki={false} />);
    expect(screen.queryByTestId("tedarikci-suzgeci")).toBeNull();
    // Spec 0135 ile (R39/2, AC-112): kalem ibaresi yetki istemez (tedarikçi kimliği taşımaz); "tek satır" iddiası ters çevrildi.
    expect(within(satir("Ayna dişlisi")).getByTestId("parca-maliyet").textContent).toBe(`17.000,00 ₺${UC_ISLEM}`);
    duzenle("Ayna dişlisi");
    expect(screen.queryByLabelText("İşlem tedarikçisi 1")).toBeNull();
    for (const t of TED) expect(document.body.textContent).not.toContain(t.ad);
  });
  it("triyaj bulgu 2: yetkisiz kullanıcıda kart da tedarikçi SAYISINI yazmaz (listeyle aynı karar); sayısız ibare çıkar", () => {
    render(<Katalog giderYetki={false} />);
    duzenle("Ayna dişlisi");
    // Spec 0135 ile (R39/2): iki kullanıcı türünde aynı kalem ibaresi; tedarikçi sayısı hiçbir yerde yazılmaz.
    expect(screen.getByTestId("maliyet-kaynagi").textContent).toBe(UC_ISLEM);
    expect(document.body.textContent).not.toMatch(/\d+ tedarikçi/);
    cleanup();
    render(<Katalog />);
    duzenle("Ayna dişlisi");
    expect(screen.getByTestId("maliyet-kaynagi").textContent).toBe(UC_ISLEM);
    expect(screen.getByTestId("kalem-toplam-tutar").textContent).toBe("17.000,00 ₺");
  });
  it("AC-6: yetkisiz kullanıcının kaydı kırılımı birebir korur", () => {
    render(<Katalog giderYetki={false} />);
    duzenle("Ayna dişlisi");
    fireEvent.change(screen.getByPlaceholderText("Örn: Kesme Bıçağı Seti"), { target: { value: "Ayna dişlisi takımı" } });
    kaydet();
    expect(kayit(8)).toEqual({ ...PARCALAR[1], ad: "Ayna dişlisi takımı" });
  });
});

describe("Spec 0096: tedarikçi süzgeci (R10, R22, C13, C14)", () => {
  const p0 = [...PARCALAR, ...Array.from({ length: 12 }, (_, i) => ({ id: 100 + i, ad: `Pul ${String(i).padStart(2, "0")}`, models: [] })),
    { id: 200, ad: "Çöpte", models: [], deletedAt: "x", hammaddeler: [{ tedarikciId: 34, tutar: 1 }] }];
  // Spec 0135 ile (R46): süzgecin adı "Tedarikçi süzgeci", küme türetilmiş kalem listesinin işlem kalemlerinden.
  const suz = (v) => fireEvent.change(screen.getByLabelText("Tedarikçi süzgeci"), { target: { value: v } });
  it("AC-20 / AC-44: seçenekler canlı parçaların kırılımında geçen tedarikçiler (sayılı); seçilince yalnız onun parçaları", () => {
    render(<Katalog p0={p0} />);
    const s = screen.getByLabelText("Tedarikçi süzgeci");
    expect(s.tagName).toBe("SELECT");
    expect([...s.options].map(o => o.textContent)).toEqual(["Tüm parçalar", "Demir Çelik (1)", "Döküm A.Ş. (1)", "Sac Ltd (1)", "Tedarikçi girilmemiş (14)"]); // spec 0140 ile (AC-63): etiket Ana tedarikçiyi de kapsar
    suz("32");
    expect(satir("Ayna dişlisi")).toBeTruthy();
    expect(screen.queryByText("Rulman")).toBeNull();
  });
  it("AC-21: 'girilmemiş' yalnız hiç satırı olmayan parçaları listeler", () => {
    render(<Katalog p0={p0} />);
    suz(SUZGEC_GIRILMEMIS);
    expect(screen.queryByText("Ayna dişlisi")).toBeNull();
    expect(satir("Rulman")).toBeTruthy();
  });
  it("AC-22: süzgeç ile arama birlikte; süzgeç değişince ilk sayfaya döner", () => {
    render(<Katalog p0={p0} />);
    fireEvent.click(screen.getByRole("button", { name: /Sonraki/ }));
    expect(screen.queryByText("Ayna dişlisi")).toBeNull();
    suz(SUZGEC_GIRILMEMIS);
    expect(satir("Kayış")).toBeTruthy(); // 1. sayfa (Kayış ilk 10'da)
    fireEvent.change(screen.getByPlaceholderText("Yedek parça ara..."), { target: { value: "Pul 1" } });
    expect(screen.getAllByText(/^Pul 1/)).toHaveLength(2);
  });
  it("AC-23: süzgeç sonucu boşsa mevcut kapta üçüncü metin, tablo yok, BosDurum yok", () => {
    render(<Katalog p0={p0} />);
    suz("31");
    fireEvent.change(screen.getByPlaceholderText("Yedek parça ara..."), { target: { value: "olmayan" } });
    expect(screen.getByText(SUZGEC_BOS_METNI)).toBeTruthy();
    expect(document.querySelector("table")).toBeNull();
    expect(document.querySelector("[data-testid^='bos-']")).toBeNull();
  });
});

// ── Tedarikler ve Ekstre ─────────────────────────────────────────────────────────────────────────────────────────────
function TedH({ t0 = TED, parts = [], giderler = [], onState }) {
  const [ted, setTed] = useState(t0);
  onState?.(ted);
  return <Tedarikciler tedarikciler={ted} setTedarikciler={setTed} giderler={giderler} giderTanimlari={[]} rapor={null} hesapHareketleri={[]} parts={parts} />;
}
const tedSatir = (ad) => screen.getByText(ad).closest("tr");
describe("Spec 0096: Tedarikler ve Ekstre (R1, R2, R13)", () => {
  it("AC-1: formda hammadde kutusu çizilir, yeni tedarikçide işaretsiz; işaretsiz kayıtta alan yok, işaretlide true", () => {
    let st;
    render(<TedH t0={[]} onState={s => { st = s; }} />);
    fireEvent.click(screen.getByRole("button", { name: /Yeni Tedarikçi/ }));
    expect(screen.getByLabelText(HAMMADDE_ISARET_ETIKETI).checked).toBe(false);
    fireEvent.change(screen.getByPlaceholderText("Tedarikçi adı"), { target: { value: "Yeni A" } });
    fireEvent.click(screen.getByRole("button", { name: /Kaydet/ }));
    expect("hammadde" in st[0]).toBe(false);
    fireEvent.click(within(tedSatir("Yeni A")).getByTitle("Düzenle"));
    fireEvent.click(screen.getByLabelText(HAMMADDE_ISARET_ETIKETI));
    fireEvent.click(screen.getByRole("button", { name: /Kaydet/ }));
    expect(st[0].hammadde).toBe(true);
  });
  it("AC-2: işaretli tedarikçi adın altındaki rozetle; sütun sayısı değişmez (6)", () => {
    render(<TedH />);
    expect(within(tedSatir("Demir Çelik")).getByTestId("hammadde-rozeti").textContent).toBe(HAMMADDE_ISARET_ETIKETI);
    expect(within(tedSatir("Yakıt A.Ş.")).queryByTestId("hammadde-rozeti")).toBeNull();
    expect(document.querySelectorAll("thead th")).toHaveLength(6);
  });
  it("AC-24 / AC-48 / AC-50: yalnız parçada geçen tedarikçi silinemez; pencere parça sayısını (çöpteki dahil) ve parça cümlesini yazar", () => {
    // Spec 0135 ile (R32/2, plan turu Karar 32): kullanım türetilmiş kalem listesinden; tutarı girilmemiş kırılım satırı kalem
    // değildir, bu yüzden çöpteki parçanın satırı tutarlı verildi. Metin kalem dilinde.
    const parts = [{ id: 1, ad: "A", hammaddeler: [{ tedarikciId: 32, tutar: 1 }] }, { id: 2, ad: "B", deletedAt: "x", hammaddeler: [{ tedarikciId: 32, tutar: 3 }] }];
    render(<TedH parts={parts} />);
    expect(within(tedSatir("Sac Ltd")).getAllByRole("cell")[2].textContent).toBe("2 parçanın maliyet kaleminde (1’i çöpte)");
    expect(within(tedSatir("Döküm A.Ş.")).getAllByRole("cell")[2].textContent).toBe("Kullanılmıyor");
    fireEvent.click(within(tedSatir("Sac Ltd")).getByTitle("Sil"));
    expect(screen.getByText(/“Sac Ltd” silinemez/)).toBeTruthy();
    expect(screen.getByTestId("tedarikci-parca-kullanim").textContent).toContain(SIL_PARCA_YONLENDIRME);
    expect(screen.getByTestId("tedarikci-parca-kullanim").textContent).toMatch(/2 parçanın/);
    expect(document.body.textContent).not.toContain(SIL_KALEM_YONLENDIRME);
  });
  it("AC-48: kalem ve parça birlikteyken iki cümle de yazılır", () => {
    const parts = [{ id: 1, ad: "A", hammaddeler: [{ tedarikciId: 31, tutar: 1 }] }];
    render(<TedH parts={parts} giderler={[{ id: 1, tedarikciId: 31 }]} />);
    expect(within(tedSatir("Demir Çelik")).getAllByRole("cell")[2].textContent).toBe("1 kalem · 1 parçanın maliyet kaleminde"); // spec 0135 ile (R32/2)
    fireEvent.click(within(tedSatir("Demir Çelik")).getByTitle("Sil"));
    expect(document.body.textContent).toContain(SIL_KALEM_YONLENDIRME);
    expect(document.body.textContent).toContain(SIL_PARCA_YONLENDIRME);
  });
});

// ── Çöp Kutusu ───────────────────────────────────────────────────────────────────────────────────────────────────────
const bos = [];
function TrashH({ t0, parts = [], onState, showToast = noop }) {
  const [ted, setTed] = useState(t0);
  const [prc, setPrc] = useState(parts);
  onState?.({ ted, prc });
  return <SettingsTrash rawCustomers={bos} rawServices={bos} rawPartSales={bos} rawPayments={bos} rawDealers={bos} rawStock={bos} rawNotes={bos}
    rawKalipDefs={bos} rawParts={prc} rawCustomModels={bos} rawTeklifler={bos} rawFaturalar={bos} rawUretimFormlari={bos} rawGorusmeler={bos} rawDosyalar={bos}
    setCustomers={noop} setServices={noop} setPartSales={noop} setPayments={noop} setDealers={noop} setStock={noop} setNotes={noop} setKalipDefs={noop}
    setParts={setPrc} setCustomModels={noop} setTeklifler={noop} setFaturalar={noop} setUretimFormlari={noop} setGorusmeler={noop} setDosyalar={noop}
    appSettings={{}} showToast={showToast} giderYetki rawGiderler={bos} setGiderler={noop}
    rawTedarikciler={ted} setTedarikciler={setTed} rawUretimPartileri={bos} setUretimPartileri={noop} serverPermissions={null} />;
}
const ZAMAN = "2026-10-01T09:00:00.000Z";
describe("Spec 0096: Çöp Kutusu kapıları (R13/2, R13/5)", () => {
  it("AC-37: kırılımda geçen çöpteki tedarikçinin Kalıcı Sil'i yok, satırda neden yazar; geçmeyen silinir", () => {
    render(<TrashH t0={[{ id: 32, ad: "Sac Ltd", deletedAt: ZAMAN }, { id: 33, ad: "Döküm", deletedAt: ZAMAN }]} parts={[{ id: 1, ad: "A", hammaddeler: [{ tedarikciId: 32, tutar: 5 }] }]} />);
    const s = screen.getByText("Sac Ltd").closest("tr");
    expect(within(s).getByTestId("cop-neden").textContent.startsWith(KALEMDE_TEDARIKCI_NEDENI)).toBe(true); // spec 0140 ile (AC-61): cümlenin arkasında parça adları
    expect(within(s).queryByRole("button", { name: /Kalıcı Sil/ })).toBeNull();
    expect(within(screen.getByText("Döküm").closest("tr")).getByRole("button", { name: /Kalıcı Sil/ })).toBeTruthy();
  });
  it("AC-37 / AC-50: çöpü boşalt kırılımda geçeni bırakır; aynı işlemde silinen çöpteki parçanın kırılımı korumaz", () => {
    let st;
    const parts = [{ id: 1, ad: "Canlı", hammaddeler: [{ tedarikciId: 32, tutar: 5 }] }, { id: 2, ad: "Çöpteki", deletedAt: ZAMAN, hammaddeler: [{ tedarikciId: 33, tutar: 5 }] }];
    render(<TrashH t0={[{ id: 32, ad: "Sac Ltd", deletedAt: ZAMAN }, { id: 33, ad: "Döküm", deletedAt: ZAMAN }]} parts={parts} onState={x => { st = x; }} />);
    fireEvent.click(screen.getByRole("button", { name: /Çöp Kutusunu Boşalt/ }));
    fireEvent.click(screen.getByRole("button", { name: /Evet, Sil/ }));
    expect(st.ted.map(t => t.id)).toEqual([32]);
    expect(st.prc.map(p => p.id)).toEqual([1]);
  });
});
