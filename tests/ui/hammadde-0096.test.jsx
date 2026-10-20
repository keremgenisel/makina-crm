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
import { HAMMADDE_BOS_METNI, HAMMADDE_TUTARSIZ_UYARI, SILINMIS_TEDARIKCI, BULUNAMAYAN_TEDARIKCI, TEDARIKCI_SECILMEDI, KAYNAK_KIRILIM_YETKISIZ } from "../../src/lib/urunAgaci";
import { KIRILIMDA_TEDARIKCI_NEDENI } from "../../src/lib/gider";
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
const tedSec = (i, id) => fireEvent.change(screen.getByLabelText(`Hammadde tedarikçisi ${i}`), { target: { value: String(id) } });
const tutar = (i, v) => fireEvent.change(screen.getByLabelText(`Hammadde tutarı ${i}`), { target: { value: v } });
const ekle = () => fireEvent.click(screen.getByRole("button", { name: /Tedarikçi ekle/ }));

describe("Spec 0096: parça kartı (R3–R9, R21, R23)", () => {
  it("AC-3: gider yetkisiyle bölüm çizilir; seçicide yalnız hammadde işaretli CANLI tedarikçiler", () => {
    render(<Katalog />);
    duzenle("Kayış");
    expect(screen.getByTestId("hammadde-bolumu")).toBeTruthy();
    ekle();
    const secenekler = [...screen.getByLabelText("Hammadde tedarikçisi 1").options].map(o => o.textContent);
    expect(secenekler).toEqual(["Tedarikçi seçin…", "Demir Çelik", "Sac Ltd", "Döküm A.Ş."]);
  });
  it("AC-4: hiç hammadde tedarikçisi yokken boş durum metni (yer adıyla), satır eklenemez", () => {
    render(<Katalog t0={[{ id: 34, ad: "Yakıt A.Ş." }]} />);
    duzenle("Kayış");
    expect(screen.getByTestId("hammadde-bos").textContent).toBe(HAMMADDE_BOS_METNI);
    expect(HAMMADDE_BOS_METNI).toContain("Giderler › Tedarikler ve Ekstre");
    expect(screen.queryByRole("button", { name: /Tedarikçi ekle/ })).toBeNull();
  });
  it("AC-7 / AC-13 / AC-17: tek satır 4.250 → maliyet 4.250,00 ₺, elle maliyet kayıttan silinir, listede ikinci satır", () => {
    render(<Katalog />);
    duzenle("Rulman");
    ekle(); tedSec(1, 31); tutar(1, "4250");
    kaydet();
    expect(kayit(7).hammaddeler).toEqual([{ tedarikciId: 31, tutar: 4250 }]);
    expect("maliyet" in kayit(7)).toBe(false);
    const hucre = within(satir("Rulman")).getByTestId("parca-maliyet");
    expect(hucre.textContent).toBe("4.250,00 ₺1 tedarikçiden");
    // Elle girilmiş satırda hücre tek satır (AC-17)
    expect(within(satir("Kayış")).getByTestId("parca-maliyet").textContent).toBe("—");
  });
  it("AC-8 / AC-17 / AC-34: kırılımlı kartta maliyet alanı pasif ve nedenli, kaynak ibaresi; tutarlar boşaltılınca etkin", () => {
    render(<Katalog />);
    expect(within(satir("Ayna dişlisi")).getByTestId("parca-maliyet").textContent).toBe("17.000,00 ₺3 tedarikçiden");
    duzenle("Ayna dişlisi");
    expect(screen.getByLabelText("Alış maliyeti").disabled).toBe(true);
    expect(screen.getByTestId("maliyet-kirilimdan").textContent).toBe("Maliyet hammadde kırılımından geliyor: 17.000,00 ₺");
    expect(screen.getByTestId("maliyet-kaynagi").textContent).toBe("3 tedarikçinin hammadde kırılımından geliyor");
    for (const i of [1, 2, 3]) tutar(i, "");
    expect(screen.getByLabelText("Alış maliyeti").disabled).toBe(false);
    expect(screen.queryByTestId("maliyet-kirilimdan")).toBeNull();
  });
  it("AC-17: elle girilmiş maliyette kartta 'Elle girildi'", () => {
    render(<Katalog />);
    duzenle("Rulman");
    expect(screen.getByTestId("maliyet-kaynagi").textContent).toBe("Elle girildi");
  });
  it("AC-9: kuruşlu tutarlar 17.001,00 ₺", () => {
    render(<Katalog />);
    duzenle("Kayış");
    ekle(); tedSec(1, 31); tutar(1, "8.000,55"); ekle(); tedSec(2, 32); tutar(2, "9.000,45");
    kaydet();
    expect(within(satir("Kayış")).getByTestId("parca-maliyet").textContent).toBe("17.001,00 ₺2 tedarikçiden");
  });
  it("AC-10: hiçbir satırda tutar yoksa maliyet elle girilen değerdir; satırlar işaret olarak kalır", () => {
    render(<Katalog />);
    duzenle("Rulman");
    ekle(); tedSec(1, 32);
    kaydet();
    expect(kayit(7)).toMatchObject({ maliyet: 120.5, hammaddeler: [{ tedarikciId: 32, tutar: null }] });
    expect(within(satir("Rulman")).getByTestId("parca-maliyet").textContent).toBe("120,50 ₺");
  });
  it("AC-11 / AC-12: tutarı boş satır varken uyarı çıkar, kayıt yine yapılır ve maliyet tutarlıların toplamıdır", () => {
    render(<Katalog />);
    duzenle("Kayış");
    ekle(); tedSec(1, 31); tutar(1, "7000"); ekle(); tedSec(2, 32);
    expect(screen.getByTestId("hammadde-tutarsiz").textContent).toBe(HAMMADDE_TUTARSIZ_UYARI);
    kaydet();
    expect(kayit(9).hammaddeler).toEqual([{ tedarikciId: 31, tutar: 7000 }, { tedarikciId: 32, tutar: null }]);
    expect(within(satir("Kayış")).getByTestId("parca-maliyet").textContent).toBe("7.000,00 ₺1 tedarikçiden");
  });
  it("AC-43: tutarı sıfır satır kabul edilir; 0,00 ₺ ve uyarı yok", () => {
    render(<Katalog />);
    duzenle("Kayış");
    ekle(); tedSec(1, 31); tutar(1, "0");
    expect(screen.queryByTestId("hammadde-tutarsiz")).toBeNull();
    kaydet();
    expect(within(satir("Kayış")).getByTestId("parca-maliyet").textContent).toBe("0,00 ₺1 tedarikçiden");
  });
  it("AC-14: negatif ya da sayı olmayan tutar satırında hata; kayıt bütünüyle yazılmaz (ad değişikliği de)", () => {
    render(<Katalog />);
    duzenle("Kayış");
    fireEvent.change(screen.getByPlaceholderText("Örn: Kesme Bıçağı Seti"), { target: { value: "Kayış YENİ" } });
    ekle(); tedSec(1, 31); tutar(1, "-5");
    kaydet();
    expect(screen.getByText("Tutar negatif olamaz.")).toBeTruthy();
    expect(kayit(9)).toEqual(PARCALAR[2]);
  });
  it("AC-42: tedarikçisi boş tutarı dolu satır 'Tedarikçi seçilmedi.'; boş satır sessizce atılır", () => {
    render(<Katalog />);
    duzenle("Kayış");
    ekle(); tutar(1, "500");
    kaydet();
    expect(screen.getByText(TEDARIKCI_SECILMEDI)).toBeTruthy();
    expect(kayit(9)).toEqual(PARCALAR[2]);
    tutar(1, "");
    kaydet();
    expect(kayit(9)).toEqual(PARCALAR[2]);
  });
  it("AC-15: seçilmiş tedarikçi diğer satırın seçicisinde çıkmaz", () => {
    render(<Katalog />);
    duzenle("Kayış");
    ekle(); tedSec(1, 31); ekle();
    const ikinci = [...screen.getByLabelText("Hammadde tedarikçisi 2").options].map(o => o.textContent);
    expect(ikinci).not.toContain("Demir Çelik");
    expect(ikinci).toContain("Sac Ltd");
  });
  it("AC-16 / AC-46: bütün satırlar silinip kaydedilince kırılım anahtarı yok, maliyet 'girilmedi' ve hücre '—'", () => {
    render(<Katalog />);
    duzenle("Ayna dişlisi");
    for (let i = 0; i < 3; i++) fireEvent.click(screen.getAllByTitle("Satırı sil")[0]);
    kaydet();
    expect("hammaddeler" in kayit(8)).toBe(false);
    expect("maliyet" in kayit(8)).toBe(false);
    expect(within(satir("Ayna dişlisi")).getByTestId("parca-maliyet").textContent).toBe("—");
  });
  it("AC-35: alana değer taşıyan eski kayıt kırılımla kaydedilince maliyet anahtarı silinir", () => {
    render(<Katalog p0={[{ id: 8, ad: "Ayna dişlisi", models: [], maliyet: 999, hammaddeler: [{ tedarikciId: 31, tutar: 7000 }] }]} />);
    duzenle("Ayna dişlisi"); kaydet();
    expect("maliyet" in kayit(8)).toBe(false);
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
    expect(within(satir("Ayna dişlisi")).getByTestId("parca-maliyet").textContent).toBe("601,00 ₺3 tedarikçiden");
    duzenle("Ayna dişlisi");
    const s1 = screen.getByLabelText("Hammadde tedarikçisi 1");
    expect(s1.options[s1.selectedIndex].textContent).toBe(`Eski Sac (${SILINMIS_TEDARIKCI})`);
    const s2 = screen.getByLabelText("Hammadde tedarikçisi 2");
    expect(s2.options[s2.selectedIndex].textContent).toBe(BULUNAMAYAN_TEDARIKCI);
    // Çöpteki tedarikçi başka satırın seçicisinde listelenmez
    expect([...screen.getByLabelText("Hammadde tedarikçisi 3").options].map(o => o.textContent)).not.toContain(`Eski Sac (${SILINMIS_TEDARIKCI})`);
  });
  it("AC-25 / AC-26: ad değişince yeni ad; hammadde işareti kaldırılınca kırılım ve maliyet aynı, yeni satır seçicisinde yok", () => {
    const t0 = TED.map(t => (t.id === 31 ? { ...t, ad: "Demir Çelik Sanayi", hammadde: undefined } : t));
    render(<Katalog t0={t0} />);
    expect(within(satir("Ayna dişlisi")).getByTestId("parca-maliyet").textContent).toBe("17.000,00 ₺3 tedarikçiden");
    duzenle("Ayna dişlisi");
    const s1 = screen.getByLabelText("Hammadde tedarikçisi 1");
    expect(s1.options[s1.selectedIndex].textContent).toBe("Demir Çelik Sanayi");
    kaydet();
    expect(kayit(8).hammaddeler).toEqual(PARCALAR[1].hammaddeler);
  });
});

describe("Spec 0096: gider yetkisi (R17, C11)", () => {
  it("AC-5 / AC-45: yetkisiz kullanıcıda bölüm ve süzgeç yok, hiçbir tedarikçi adı görünmez; maliyet hücresi tek satır", () => {
    render(<Katalog giderYetki={false} />);
    expect(screen.queryByTestId("tedarikci-suzgeci")).toBeNull();
    expect(within(satir("Ayna dişlisi")).getByTestId("parca-maliyet").textContent).toBe("17.000,00 ₺");
    duzenle("Ayna dişlisi");
    expect(screen.queryByTestId("hammadde-bolumu")).toBeNull();
    for (const t of TED) expect(document.body.textContent).not.toContain(t.ad);
  });
  it("triyaj bulgu 2: yetkisiz kullanıcıda kart da tedarikçi SAYISINI yazmaz (listeyle aynı karar); sayısız ibare çıkar", () => {
    render(<Katalog giderYetki={false} />);
    duzenle("Ayna dişlisi");
    expect(screen.getByTestId("maliyet-kaynagi").textContent).toBe(KAYNAK_KIRILIM_YETKISIZ);
    expect(document.body.textContent).not.toMatch(/\d+ tedarikçi/);
    cleanup();
    render(<Katalog />);
    duzenle("Ayna dişlisi");
    expect(screen.getByTestId("maliyet-kaynagi").textContent).toBe("3 tedarikçinin hammadde kırılımından geliyor");
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
  const suz = (v) => fireEvent.change(screen.getByLabelText("Hammadde tedarikçisi süzgeci"), { target: { value: v } });
  it("AC-20 / AC-44: seçenekler canlı parçaların kırılımında geçen tedarikçiler (sayılı); seçilince yalnız onun parçaları", () => {
    render(<Katalog p0={p0} />);
    const s = screen.getByLabelText("Hammadde tedarikçisi süzgeci");
    expect(s.tagName).toBe("SELECT");
    expect([...s.options].map(o => o.textContent)).toEqual(["Tüm parçalar", "Demir Çelik (1)", "Döküm A.Ş. (1)", "Sac Ltd (1)", "Hammadde tedarikçisi girilmemiş (14)"]);
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
    const parts = [{ id: 1, ad: "A", hammaddeler: [{ tedarikciId: 32, tutar: 1 }] }, { id: 2, ad: "B", deletedAt: "x", hammaddeler: [{ tedarikciId: 32, tutar: null }] }];
    render(<TedH parts={parts} />);
    expect(within(tedSatir("Sac Ltd")).getAllByRole("cell")[2].textContent).toBe("2 parçada (1’i çöpte)");
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
    expect(within(tedSatir("Demir Çelik")).getAllByRole("cell")[2].textContent).toBe("1 kalem · 1 parçada");
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
    expect(within(s).getByTestId("cop-neden").textContent).toBe(KIRILIMDA_TEDARIKCI_NEDENI);
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
