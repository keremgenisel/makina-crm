// @vitest-environment jsdom
// Spec 0092: gerçek bileşenler. Gider formu ve tanım formunun kapsam alanı (R1–R8/2), tanım listesinin kapsam satırı (R3/2),
// kalem listesinin kapsam rozeti (R19), Makina Maliyeti'nin pay özeti, Üretim Partileri ve rol tablosu (R13/2, R21, R22),
// Gider Ayarları'nın eşik alanı (R35–R37), Anasayfa kartı ve hatırlatma penceresi (R25–R34; izole bileşen).
process.env.TZ = "Europe/Istanbul";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { useState } from "react";
import { GiderForm } from "../../src/components/GiderForm";
import { SettingsGiderTanimlari } from "../../src/components/settings/SettingsGiderTanimlari";
import { SettingsGider } from "../../src/components/settings/SettingsGider";
import { Giderler } from "../../src/components/Giderler";
import { MakinaMaliyeti } from "../../src/components/MakinaMaliyeti";
import { OdemeHatirlatmaKarti, OdemeHatirlatmaPenceresi } from "../../src/components/gider/OdemeHatirlatma";
import { KAPSAM_AY_HATASI, KAPSAM_IPUCU, giderKalemDogrula, turHaritasi } from "../../src/lib/gider";
import { kapsamHatirlatmalari, KAPSAM_SUZGEC_IBARESI, KAPSAM_KART_ALT_METNI } from "../../src/lib/giderKapsami";
import { odemeHatirlatmalari } from "../../src/lib/odemeHatirlatma";
import * as V from "../fixtures/0092-veri";

afterEach(() => { cleanup(); vi.useRealTimers(); delete window.crmLocks; });

const TURLER = [{ id: 1, ad: "İnternet", davranis: "normal", maliyetRolu: "genel" }, { id: 2, ad: "Depo kirası", davranis: "kira", maliyetRolu: "genel" },
  { id: 3, ad: "Personel", davranis: "personel", maliyetRolu: "genel" }, { id: 5, ad: "SGK", davranis: "sgk", maliyetRolu: "genel" }];
const ETIKET = "Kapsadığı ay sayısı";

// ── Gider formu ──────────────────────────────────────────────────────────────────────────────────────────────────────
const formAc = (o = {}) => {
  const onSave = vi.fn();
  render(<GiderForm giderTurleri={TURLER} tedarikciler={[]} calisanlar={[{ id: 21, ad: "Hasan", resmiMaliyet: 30000 }]} giderAyarlari={{ stopajOrani: 20 }}
    onSave={onSave} onCancel={vi.fn()} {...o} />);
  return onSave;
};
const tur = (id) => fireEvent.change(screen.getByLabelText("Gider türü *"), { target: { value: String(id) } });
const kaydetVeAl = (onSave) => { fireEvent.click(screen.getByText("Kaydet")); return onSave.mock.calls[0]?.[0]; };

describe("Spec 0092: gider formunda kapsam alanı (R1–R5)", () => {
  it("AC-1 / AC-2 / AC-3 / AC-4: normal ve kirada çizilir, personel ve SGK'da çizilmez; ipucu R2/2'deki metin", () => {
    formAc();
    tur(1); expect(screen.getByLabelText(ETIKET)).toBeTruthy(); expect(screen.getByText(KAPSAM_IPUCU)).toBeTruthy();
    tur(2); expect(screen.getByLabelText(ETIKET)).toBeTruthy();
    tur(3); expect(screen.queryByLabelText(ETIKET)).toBeNull();
    tur(5); expect(screen.queryByLabelText(ETIKET)).toBeNull();
  });
  it("AC-6 / AC-69/2: 0, 61, 'abc' ve ondalıklı değerde kayıt yok, neden alanın altında", () => {
    for (const x of ["0", "61", "abc", "1,5"]) {
      const onSave = formAc();
      tur(1);
      fireEvent.change(screen.getByLabelText("Tutar"), { target: { value: "1.000" } });
      fireEvent.change(screen.getByLabelText(ETIKET), { target: { value: x } });
      fireEvent.click(screen.getByText("Kaydet"));
      expect(onSave, x).not.toHaveBeenCalled();
      expect(within(screen.getByTestId("kapsam-alani")).getByText(KAPSAM_AY_HATASI)).toBeTruthy();
      cleanup();
    }
  });
  it("AC-7 / AC-8 / AC-9: boş ve 1 gövdeye yazılmaz, 12 yazılır", () => {
    for (const [x, beklenen] of [["", undefined], ["1", undefined], ["12", 12]]) {
      const onSave = formAc();
      tur(1);
      fireEvent.change(screen.getByLabelText("Tutar"), { target: { value: "1.000" } });
      fireEvent.change(screen.getByLabelText(ETIKET), { target: { value: x } });
      const g = kaydetVeAl(onSave);
      if (beklenen === undefined) expect(g, x).not.toHaveProperty("dagitimAy"); else expect(g.dagitimAy).toBe(beklenen);
      cleanup();
    }
  });
  it("AC-10: kapsamı 12 olan eski kalem formda 12 ile açılır, kaydedilince 12 korunur", () => {
    const onSave = formAc({ kalem: { id: 50, turId: 1, tarih: "2026-01-15", tutar: 24000, kdvOrani: 20, dagitimAy: 12 } });
    expect(screen.getByLabelText(ETIKET).value).toBe("12");
    expect(kaydetVeAl(onSave).dagitimAy).toBe(12);
  });
  it("AC-6/2 (R4/2): kapsamı 99 olan eski kalem alan boş açılır, kaydedilebilir, gövdede anahtar yok", () => {
    const onSave = formAc({ kalem: { id: 51, turId: 1, tarih: "2026-01-15", tutar: 24000, kdvOrani: 20, dagitimAy: 99 } });
    expect(screen.getByLabelText(ETIKET).value).toBe("");
    const g = kaydetVeAl(onSave);
    expect(g).toBeTruthy();
    expect(g).not.toHaveProperty("dagitimAy");
  });
  it("AC-69: alanın kullanıcıya görünen metinleri 'dağıtım' demez", () => {
    formAc(); tur(1);
    expect(screen.getByTestId("kapsam-alani").textContent).not.toMatch(/dağıt/i);
  });
});

// ── Tekrarlayan tanım formu ve listesi ───────────────────────────────────────────────────────────────────────────────
let tanimlar;
function TanimHarness({ t0 = [] }) {
  const [giderTanimlari, setGiderTanimlari] = useState(t0);
  tanimlar = giderTanimlari;
  return <SettingsGiderTanimlari giderTanimlari={giderTanimlari} setGiderTanimlari={setGiderTanimlari} giderTurleri={TURLER} calisanlar={[{ id: 21, ad: "Hasan" }]} showToast={vi.fn()} />;
}
const tanimTuru = (id) => fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: String(id) } });

describe("Spec 0092: tekrarlayan tanım (R3, R3/2, R8/2)", () => {
  it("AC-5: tanım formunda normal ve kirada çizilir, personel ve SGK'da çizilmez", () => {
    render(<TanimHarness />);
    fireEvent.click(screen.getByText("Yeni Tanım"));
    for (const [id, var_] of [[1, true], [2, true], [3, false], [5, false]]) {
      tanimTuru(id);
      expect(!!screen.queryByLabelText(ETIKET), String(id)).toBe(var_);
    }
  });
  it("AC-5/2: kapsamı 12 olan tanım listede satır yazar; sütun sayısı yedi kalır", () => {
    const { container } = render(<TanimHarness t0={[{ id: 70, turId: 1, ad: "İnternet", tutar: 2000, kdvOrani: 20, baslangicAy: "2026-01", uretilenAylar: [], dagitimAy: 12 },
      { id: 71, turId: 1, ad: "Elektrik", tutar: 3000, kdvOrani: 20, baslangicAy: "2026-01", uretilenAylar: [] }]} />);
    const kapsam = screen.getAllByTestId("tanim-kapsam");
    expect(kapsam).toHaveLength(1);
    expect(kapsam[0].textContent).toBe("12 ayı kapsar");
    expect(kapsam[0].closest("tr").textContent).toContain("İnternet");
    expect(container.querySelectorAll("thead th")).toHaveLength(7);
    for (const tr of container.querySelectorAll("tbody tr")) expect(tr.children).toHaveLength(7);
  });
  it("AC-11/2: kira tanımının kapsamı formda açılıp kaydedilince korunur; yeni tanıma girilen kapsam yazılır", () => {
    render(<TanimHarness t0={[{ id: 72, turId: 2, ad: "Depo", tutar: 12000, baslangicAy: "2026-01", uretilenAylar: [], girisYonu: "brut", dagitimAy: 12 }]} />);
    fireEvent.click(within(screen.getByText("Depo").closest("tr")).getByTitle("Düzenle"));
    expect(screen.getByLabelText(ETIKET).value).toBe("12");
    fireEvent.click(screen.getByText("Kaydet"));
    expect(tanimlar.find(t => t.id === 72).dagitimAy).toBe(12);
    fireEvent.click(screen.getByText("Yeni Tanım"));
    tanimTuru(1);
    fireEvent.change(screen.getByPlaceholderText("Örn. Fabrika binası kirası"), { target: { value: "Sigorta" } });
    fireEvent.change(screen.getByLabelText("Tutar"), { target: { value: "500" } });
    fireEvent.change(screen.getByLabelText("Başlangıç ayı"), { target: { value: "2026-10" } });
    fireEvent.change(screen.getByLabelText(ETIKET), { target: { value: "61" } });
    fireEvent.click(screen.getByText("Kaydet"));
    expect(screen.getByText(KAPSAM_AY_HATASI)).toBeTruthy();
    fireEvent.change(screen.getByLabelText(ETIKET), { target: { value: "6" } });
    fireEvent.click(screen.getByText("Kaydet"));
    expect(tanimlar.find(t => t.ad === "Sigorta").dagitimAy).toBe(6);
  });
});

// ── Kalem listesi rozeti ─────────────────────────────────────────────────────────────────────────────────────────────
const TM = turHaritasi(TURLER);
let nid = 9200;
const kal = (f) => giderKalemDogrula(f, { turMap: TM, uid: () => ++nid }).kayit;
function GH({ kalemler }) {
  const [giderler, setGiderler] = useState(kalemler);
  return <Giderler giderler={giderler} setGiderler={setGiderler} hesapHareketleri={[]} setHesapHareketleri={vi.fn()} giderTanimlari={[]} setGiderTanimlari={vi.fn()}
    giderTurleri={TURLER} tedarikciler={[]} setTedarikciler={vi.fn()} calisanlar={[]} stock={[]} customers={[]} standardModels={[]} customModels={[]}
    appSettings={{ giderAyarlari: { yururlukAy: "2026-01" } }} kdvRates={[{ from: "2000-01-01", rate: 20 }]} kasaHesaplari={[]}
    satisVerisi={{ customers: [], services: [], partSales: [], payments: [], teklifler: [], dealers: [], yedekParcaSatislar: [] }} showToast={vi.fn()} />;
}
describe("Spec 0092: kalem listesi rozeti (R19, R19/2)", () => {
  beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-01-20T10:00:00")); });
  const kalemler = () => [
    kal({ id: 1, tarih: "2026-01-15", turId: 1, tutar: 24000, kdvOrani: 20, aciklama: "Yıllık internet", dagitimAy: 12 }),
    kal({ id: 2, tarih: "2026-01-10", turId: 1, tutar: 3000, kdvOrani: 20, aciklama: "Elektrik" }),
    kal({ id: 3, tarih: "2026-01-12", turId: 1, tutar: 2000, kdvOrani: 20, aciklama: "Binek kasko", kisitliGider: true, indirilebilirOran: 70, dagitimAy: 3 }),
    { ...kal({ id: 4, tarih: "2026-01-31", turId: 3, calisanId: 21, calisanAd: "Hasan", resmiTutar: 30000, eldenTutar: 0 }), dagitimAy: 12 },
  ];
  it("AC-33 / AC-33/2 / AC-34 / AC-35: 12 ay kapsamlı kalemde rozet ay sayısı ve aralığı yazar; kapsamsız kalemde rozet yok", () => {
    render(<GH kalemler={kalemler()} />);
    const satir = screen.getByText("Yıllık internet").closest("tr");
    expect(within(satir).getByTestId("kapsam-rozeti").textContent).toBe("12 ayı kapsıyor · 01.2026 – 12.2026");
    expect(within(screen.getByText("Elektrik").closest("tr")).queryByTestId("kapsam-rozeti")).toBeNull();
    expect(screen.getByTestId("kalem-listesi").textContent).not.toMatch(/\d+\. ay/);
  });
  it("AC-33/3: kısıtlı ve kapsamlı kalemde iki rozet aynı hücrede, önce kısıtlı sonra kapsam", () => {
    render(<GH kalemler={kalemler()} />);
    const satir = screen.getByText("Binek kasko").closest("tr");
    const kisit = within(satir).getByTestId("kisitli-rozeti"), kapsam = within(satir).getByTestId("kapsam-rozeti");
    expect(kisit.parentElement).toBe(kapsam.parentElement);
    expect(kisit.compareDocumentPosition(kapsam) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
  it("AC-15/2: kapsam taşıyan personel kaleminde rozet yok", () => {
    render(<GH kalemler={kalemler()} />);
    fireEvent.click(screen.getByText("▸ Çalışanları göster"));
    expect(screen.getAllByTestId("kapsam-rozeti")).toHaveLength(2);
  });
});

// ── Makina Maliyeti: pay özeti, Üretim Partileri, rol tablosu ───────────────────────────────────────────────────────
function MM({ gorunum = "modeller", ayar = { baslangicAy: "2026-01", bitisAy: "2026-03", varsayilanAdet: 20 }, giderler = V.GIDERLER, yururlukAy = "2026-01", turler = V.TURLER }) {
  const [giderTurleri, setGiderTurleri] = useState(turler);
  const [appSettings, setAppSettings] = useState({ giderAyarlari: { yururlukAy }, ...(ayar ? { maliyetAyarlari: ayar } : {}) });
  return <MakinaMaliyeti aktifKullanici="kerem" giderler={giderler} giderTurleri={giderTurleri} setGiderTurleri={setGiderTurleri} tedarikciler={[]}
    stock={V.STOCK} customers={[]} partStockLog={[]} parts={[]} standardModels={[{ model: "AK100", defaultParcalar: [] }]} customModels={[]}
    setStandardModels={vi.fn()} setCustomModels={vi.fn()} uretimPartileri={V.PARTILER} setUretimPartileri={vi.fn()}
    appSettings={appSettings} setAppSettings={setAppSettings} rates={null} serverPermissions={null} showToast={vi.fn()} baslangicGorunum={gorunum} />;
}
describe("Spec 0092: Makina Maliyeti (R13/2, R21, R22)", () => {
  beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(`${V.BUGUN}T10:00:00`)); });
  it("AC-22 / AC-38 / AC-38/2: çeyreklik dönemde pay 750 TL ve yayılmış kalem satırı motorun sayısıyla", () => {
    render(<MM />);
    expect(screen.getByTestId("pay-makina").textContent).toContain("750,00 ₺");
    expect(screen.getByTestId("pay-yayilan").textContent).toBe("1 gider kalemi kapsadığı aylara yayıldı; havuza her aya düşen payı girer.");
  });
  it("AC-39: yayılmış kalem yoksa satır yok", () => {
    render(<MM giderler={V.ELEKTRIK} />);
    expect(screen.getByTestId("pay-ozeti")).toBeTruthy();
    expect(screen.queryByTestId("pay-yayilan")).toBeNull();
  });
  it("AC-25/2 / AC-39/2: boş durum dallarında (ayarsız, yürürlük öncesi, rol yok) satır yok", () => {
    render(<MM ayar={null} />);
    expect(screen.getByTestId("pay-bos-ayarsiz")).toBeTruthy();
    expect(screen.queryByTestId("pay-yayilan")).toBeNull();
    cleanup();
    render(<MM ayar={{ baslangicAy: "2025-01", bitisAy: "2025-12", varsayilanAdet: 20 }} />);
    expect(screen.getByTestId("pay-bos-yururlukOncesi")).toBeTruthy();
    expect(screen.queryByTestId("pay-yayilan")).toBeNull();
    cleanup();
    render(<MM turler={V.TURLER.map(t => ({ ...t, maliyetRolu: "yok" }))} />);
    expect(screen.getByTestId("pay-bos-rolYok")).toBeTruthy();
    expect(screen.queryByTestId("pay-yayilan")).toBeNull();
  });
  it("AC-40 / AC-23: Üretim Partileri'nde bilgi tablonun altında bir kez; dört çeyreğin makina başı payı 750 TL", () => {
    render(<MM gorunum="partiler" />);
    expect(screen.getAllByTestId("parti-yayilan")).toHaveLength(1);
    expect(screen.getByTestId("parti-yayilan").textContent).toContain("1 gider kalemi kapsadığı aylara yayıldı");
    // Kullanıcı isteği 2026-10-19: kap boşluksuz (padding 0), yazı kenara yapışmasın; tablo hücreleriyle aynı 12 px.
    expect(screen.getByTestId("parti-yayilan").style.padding).toBe("0px 12px 10px");
    expect(screen.getAllByText("750,00 ₺").length).toBeGreaterThanOrEqual(4);
  });
  it("AC-20/2 / AC-20/3: rol tablosunun 'Dönemde tutar' sütunu yayılmış tutar; pencere dışında tarihli kalemin türü görünür ve rolü değiştirilebilir", () => {
    render(<MM gorunum="ayarlar" ayar={{ baslangicAy: "2026-04", bitisAy: "2026-06", varsayilanAdet: 20 }} />);
    const satir = screen.getByTestId("rol-satiri-1");
    expect(satir.textContent).toContain("İnternet");
    expect(satir.textContent).toContain("6.000,00 ₺"); // Ocak tarihli kalemin üç aylık payı
    expect(screen.getByTestId("rol-satiri-2").textContent).toContain("9.000,00 ₺");
    expect(within(satir).getByRole("combobox", { name: "İnternet maliyet rolü" })).toBeTruthy();
  });
});

// ── Gider Ayarları ───────────────────────────────────────────────────────────────────────────────────────────────────
const ESIK = "Kapsam bitişi hatırlatma eşiği (gün)";
describe("Spec 0092: Gider Ayarları'nda kapsam eşiği (R35–R37, C12)", () => {
  it("AC-58: alan var, varsayılanı 30", () => {
    render(<SettingsGider appSettings={{}} setAppSettings={vi.fn()} giderler={[]} />);
    expect(screen.getByLabelText(ESIK).value).toBe("30");
  });
  it("AC-60: -1, 366 ve 'abc' kaydedilmez, neden yazılır", () => {
    for (const x of ["-1", "366", "abc"]) {
      const set = vi.fn();
      render(<SettingsGider appSettings={{}} setAppSettings={set} giderler={[]} />);
      fireEvent.change(screen.getByLabelText(ESIK), { target: { value: x } });
      fireEvent.click(screen.getByText("Kaydet"));
      expect(set, x).not.toHaveBeenCalled();
      expect(screen.getByText(/Kapsam bitişi hatırlatma eşiği .*(tam sayı|arasında)/)).toBeTruthy();
      cleanup();
    }
  });
  it("AC-61 / AC-63: kaydedilen eşik yeniden açıldığında alanda durur; ödeme eşiği bağımsız", () => {
    let st = { giderAyarlari: { hatirlatmaEsikGun: 7 } };
    const set = (f) => { st = f(st); };
    render(<SettingsGider appSettings={st} setAppSettings={set} giderler={[]} />);
    fireEvent.change(screen.getByLabelText(ESIK), { target: { value: "45" } });
    fireEvent.click(screen.getByText("Kaydet"));
    expect(st.giderAyarlari).toMatchObject({ kapsamBitisEsikGun: 45, hatirlatmaEsikGun: 7 });
    cleanup();
    render(<SettingsGider appSettings={st} setAppSettings={set} giderler={[]} />);
    expect(screen.getByLabelText(ESIK).value).toBe("45");
    expect(screen.getByLabelText("Ödeme hatırlatma eşiği (gün)").value).toBe("7");
  });
});

// ── Kart ve pencere (izole) ──────────────────────────────────────────────────────────────────────────────────────────
const HTUR = [{ id: 1, ad: "İnternet", davranis: "normal" }];
const internet = { id: 1, tarih: "2026-01-15", turId: 1, tutar: 24000, kdvOrani: 20, dagitimAy: 12, odendi: true, aciklama: "Yıllık internet", taksitler: [] };
const borc = { id: 2, tarih: "2026-12-01", turId: 1, tutar: 500, kdvOrani: 20, sonOdemeTarihi: "2026-12-05", aciklama: "Elektrik", taksitler: [] };
const sonuclar = (giderler, bugun) => ({
  sonuc: odemeHatirlatmalari(giderler, { turler: HTUR, yururlukAy: "2026-01", esikGun: 7 }, bugun),
  kapsam: kapsamHatirlatmalari(giderler, { turler: HTUR, yururlukAy: "2026-01", esikGun: 30 }, bugun),
});
describe("Spec 0092: Anasayfa kartı ve penceresi (R25–R34)", () => {
  it("AC-42 / AC-42/2 / R25/2: kart her zaman üç sayı; üçüncü sayı kapsamı dolan kalemi sayar, sıfırken 0 yazar; alt metin iki kavramı söyler", () => {
    const a = sonuclar([internet], "2026-12-10");
    render(<OdemeHatirlatmaKarti {...a} onClick={vi.fn()} />);
    expect(screen.getByTestId("hatirlatma-kapsam-sayi").textContent).toBe("1Kapsamı doluyor (± 30 gün)");
    expect(screen.getByText(KAPSAM_KART_ALT_METNI)).toBeTruthy();
    cleanup();
    render(<OdemeHatirlatmaKarti {...sonuclar([internet], "2026-06-10")} onClick={vi.fn()} />);
    expect(screen.getByTestId("hatirlatma-kapsam-sayi").textContent).toBe("0Kapsamı doluyor (± 30 gün)");
    expect(screen.getByTestId("hatirlatma-gecmis-sayi")).toBeTruthy();
    expect(screen.getByTestId("hatirlatma-yaklasan-sayi")).toBeTruthy();
  });
  it("AC-43 / AC-51 / AC-52 / AC-56/2: pencerenin üçüncü bölümü; satır aralık, gün ve gider tutarı; başlık altında süzgeç ibaresi", () => {
    render(<OdemeHatirlatmaPenceresi {...sonuclar([internet], "2026-12-10")} onClose={vi.fn()} />);
    const b = screen.getByTestId("hatirlatma-bolum-kapsam");
    expect(b.textContent).toContain("Kapsamı doluyor (1) · ± 30 gün");
    expect(within(b).getByTestId("kapsam-suzgec-ibaresi").textContent).toBe(KAPSAM_SUZGEC_IBARESI);
    const s = within(b).getByTestId("hatirlatma-kapsam-satiri");
    expect(s.textContent).toContain("İnternet");
    expect(s.textContent).toContain("Yıllık internet");
    expect(s.textContent).toContain("12 ay · 01.2026 – 12.2026");
    expect(s.textContent).toContain("21 gün kaldı");
    expect(s.textContent).toContain("24.000 ₺"); // R30/2: gider tutarı (ödenecek değil; peşin ödenmiş kalemde 0 olurdu)
    expect(within(s).queryByRole("button")).toBeNull(); // R34
  });
  it("AC-54: liste boşken üçüncü bölüm çizilmez, diğer bölümler aynen", () => {
    render(<OdemeHatirlatmaPenceresi {...sonuclar([borc], "2026-12-03")} onClose={vi.fn()} />);
    expect(screen.queryByTestId("hatirlatma-bolum-kapsam")).toBeNull();
    expect(screen.getByTestId("hatirlatma-bolum-yaklasan")).toBeTruthy();
  });
  it("AC-54/2 / R32/3: yalnız üçüncü bölüm doluyken boş durum yok; aynı kalem iki bölümde görünebilir", () => {
    render(<OdemeHatirlatmaPenceresi {...sonuclar([internet], "2026-12-10")} onClose={vi.fn()} />);
    expect(screen.queryByTestId("hatirlatma-bos")).toBeNull();
    cleanup();
    const ikisi = { ...internet, odendi: false, sonOdemeTarihi: "2026-12-12" };
    render(<OdemeHatirlatmaPenceresi {...sonuclar([ikisi], "2026-12-10")} onClose={vi.fn()} />);
    expect(screen.getByTestId("hatirlatma-bolum-yaklasan").textContent).toContain("Yıllık internet");
    expect(screen.getByTestId("hatirlatma-bolum-kapsam").textContent).toContain("Yıllık internet");
  });
  it("AC-55 / AC-55/2: üç liste boşsa boş durum; metin kapsam bitişinden de söz eder", () => {
    render(<OdemeHatirlatmaPenceresi {...sonuclar([], "2026-12-10")} onClose={vi.fn()} />);
    expect(screen.getByTestId("hatirlatma-bos").textContent).toContain("Kapsadığı süre 30 gün içinde dolan ya da yeni dolmuş peşin ödenmiş gider de yok.");
  });
  it("triyaj bulgu 3: türsüz kapsamlı kalemin satırında kalın başlık 'Türü seçilmemiş'", () => {
    render(<OdemeHatirlatmaPenceresi {...sonuclar([{ ...internet, id: 40, turId: undefined, aciklama: "Türsüz abonelik" }], "2026-12-10")} onClose={vi.fn()} />);
    const s = screen.getByTestId("hatirlatma-kapsam-satiri");
    expect(s.querySelector("b").textContent).toBe("Türü seçilmemiş");
  });
  it("AC-53: satırlar bitişe göre artan", () => {
    const a = { ...internet, id: 10, aciklama: "Geç biten", tarih: "2026-02-03", dagitimAy: 11 };
    const b = { ...internet, id: 11, aciklama: "Erken biten", tarih: "2026-01-03", dagitimAy: 11 };
    render(<OdemeHatirlatmaPenceresi {...sonuclar([a, b], "2026-12-05")} onClose={vi.fn()} />);
    expect(screen.getAllByTestId("hatirlatma-kapsam-satiri").map(x => x.textContent.includes("Erken") ? "e" : "g")).toEqual(["e", "g"]);
  });
});
