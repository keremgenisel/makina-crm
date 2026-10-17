// @vitest-environment jsdom
// Spec 0081: Dönem Raporu'nda stopaj kartı kalkar, beş yan kutu kapalı başlar; katlanan başlık klavyeyle açılır (R14).
// Gerçek bileşenler: Giderler, Finance, KartBolum (iki varyant), SettingsCompany, SettingsSentMail.
process.env.TZ = "Europe/Istanbul";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, within, act } from "@testing-library/react";
import { useState } from "react";
import { kutuAc } from "./kutuAc";
import { Giderler } from "../../src/components/Giderler";
import { Finance } from "../../src/components/Finance";
import { KartBolum } from "../../src/components/tasarim";
import { SettingsCompany } from "../../src/components/settings/SettingsCompany";
import { SettingsSentMail } from "../../src/components/settings/SettingsSentMail";
import { giderKalemDogrula, turHaritasi } from "../../src/lib/gider";

afterEach(() => { cleanup(); vi.useRealTimers(); });
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-10-02T10:00:00")); });

const TURLER = [{ id: 1, ad: "Hammadde", davranis: "normal" }, { id: 2, ad: "Fabrika kirası", davranis: "kira" }, { id: 3, ad: "Personel", davranis: "personel" },
  { id: 4, ad: "Elektrik", davranis: "normal" }];
const turMap = turHaritasi(TURLER);
const TED = [{ id: 11, ad: "Demir Bant" }, { id: 12, ad: "Bölge Elektrik" }];
let nid = 7000;
const k = (f) => { const r = giderKalemDogrula(f, { turMap, tedarikciler: TED, uid: () => ++nid }); if (r.hatalar.length) throw new Error(JSON.stringify(r.hatalar)); return r.kayit; };
const KALEMLER = [
  k({ id: 1, tarih: "2026-10-01", turId: 1, tutar: 1000, kdvOrani: 20, tedarikciId: 11, aciklama: "Sac", sonOdemeTarihi: "2026-10-20" }),
  k({ id: 2, tarih: "2026-10-01", turId: 2, tutar: 20000, stopajOrani: 20, girisYonu: "brut", netTutar: 16000, kdvOrani: 0, tedarikciId: 11, aciklama: "Ekim kira" }),
  k({ id: 3, tarih: "2026-10-01", turId: 3, calisanId: 21, calisanAd: "Hasan Çelik", resmiTutar: 30000, eldenTutar: 0, sonOdemeTarihi: "2026-10-05" }),
  k({ id: 4, tarih: "2026-09-10", turId: 4, tutar: 777, kdvOrani: 20, tedarikciId: 12, aciklama: "Eylül elektrik", sonOdemeTarihi: "2026-09-25" }),
];
const HAREKET = [{ id: 90, tur: "odeme", tarih: "2026-10-01", tutar: 500, hesapId: null, giderId: 1, taksitId: null, yontem: "Havale" }];
const KDV = [{ from: "2000-01-01", rate: 20 }];
const SATIS = { customers: [], services: [], partSales: [], payments: [], teklifler: [], dealers: [], yedekParcaSatislar: [] };

function GH({ g0 = KALEMLER, h0 = HAREKET, yururlukAy = "2026-01" }) {
  const [giderler, setGiderler] = useState(g0);
  const [hesapHareketleri, setHesapHareketleri] = useState(h0);
  return <Giderler giderler={giderler} setGiderler={setGiderler} hesapHareketleri={hesapHareketleri} setHesapHareketleri={setHesapHareketleri} giderTanimlari={[]} setGiderTanimlari={vi.fn()}
    giderTurleri={TURLER} tedarikciler={TED} setTedarikciler={vi.fn()} calisanlar={[]} standardModels={[]} customModels={[]}
    appSettings={{ giderAyarlari: { yururlukAy }, kdvRates: KDV }} kdvRates={KDV} kasaHesaplari={[]} satisVerisi={SATIS} showToast={vi.fn()} />;
}

// Beş kutu: başlık, kabın test kimliği, açıkken görünen gövde metni.
const KUTULAR = [
  ["Makina Maliyeti Kovaları", "kova-karti", /Ortak gider/],
  ["Gider Türü Kırılımı", "tur-kirilimi", /Fabrika kirası/],
  ["KDV Karşılaştırması", "kdv-karsilastirma", /Giderlerden indirilecek KDV/],
  ["Tedarikçi Kırılımı", "tedarikci-kirilimi", /Demir Bant/],
  ["Ödeme Yöntemi Kırılımı", "yontem-kirilimi", /Havale/],
];
const baslik = (ad) => screen.queryByRole("button", { name: new RegExp(`^${ad}`) });
const kapali = (ad, id) => {
  const d = baslik(ad);
  expect(d, ad).not.toBeNull();
  expect(d.getAttribute("aria-expanded"), ad).toBe("false");
  const kap = screen.getByTestId(id);
  expect(kap.children, `${ad}: kapalı kutu yalnız başlık satırı`).toHaveLength(1);
};

describe("Spec 0081 R1–R3: özet kartları", () => {
  it("AC-1 / AC-2: dört kart, sıra Toplam gider · Ödenmemiş gider · Tedarikçilere açık borç · İndirilecek KDV; stopaj kartı yok", () => {
    render(<GH />);
    expect(screen.queryByText("Kesilen kira stopajı")).toBeNull();
    const kap = screen.getByText("Toplam gider").parentElement.parentElement;
    expect(kap.children).toHaveLength(4);
    expect([...kap.children].map(c => c.firstElementChild.textContent))
      .toEqual(["Toplam gider", "Ödenmemiş gider", "Tedarikçilere açık borç (KDV dâhil)", "İndirilecek KDV"]);
  });
  it("AC-3: İndirilecek KDV kartının değeri değişmez (motorun indirilecekKdv'si; 0076 AC-23 240 ₺ ile de sabit)", () => {
    render(<GH />);
    // Ekimin tek KDV'li kalemi 1.000 × %20; kira KDV'siz.
    expect(screen.getByText("İndirilecek KDV").parentElement.textContent).toMatch(/200 ₺/);
  });
});

describe("Spec 0081 R4–R9, R15: yan kutular kapalı başlar", () => {
  it("AC-6 / AC-7: çizilen beş kutunun gövdesi yok; başlık ve alt başlık görünür", () => {
    render(<GH />);
    for (const [ad, id, govde] of KUTULAR) {
      kapali(ad, id);
      expect(screen.getByTestId(id).textContent, ad).not.toMatch(govde);
    }
    expect(screen.getByText("Tahakkuk esası: kalemin gider tarihine göre")).toBeTruthy();
    expect(screen.getByText("Harcamaya göre çoktan aza. Personel kalemleri bu kırılıma girmez.")).toBeTruthy();
  });
  it("AC-8 / AC-9: her kutu tıklanınca açılır, ikinci tıklamada kapanır", () => {
    render(<GH />);
    for (const [ad, id, govde] of KUTULAR) {
      const kap = kutuAc(ad);
      expect(kap.getAttribute("data-testid")).toBe(id);
      expect(kap.textContent, ad).toMatch(govde);
      fireEvent.click(baslik(ad));
      kapali(ad, id);
    }
  });
  it("AC-10 / R13: açık kutu dönem ayı değişince açık kalır ve yeni dönemi gösterir", () => {
    render(<GH />);
    const kap = kutuAc("Gider Türü Kırılımı");
    expect(kap.textContent).toMatch(/Fabrika kirası/);
    fireEvent.click(screen.getByLabelText("Önceki ay"));
    expect(baslik("Gider Türü Kırılımı").getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByTestId("tur-kirilimi").textContent).toMatch(/Elektrik/);
    expect(screen.getByTestId("tur-kirilimi").textContent).not.toMatch(/Fabrika kirası/);
  });
  it("AC-11: Giderler kaldırılıp yeniden çizilince kutular kapalı (tercih saklanmaz)", () => {
    const { unmount } = render(<GH />);
    kutuAc("Gider Türü Kırılımı");
    unmount();
    render(<GH />);
    kapali("Gider Türü Kırılımı", "tur-kirilimi");
  });
  it("AC-12: Gider Kalemleri ve borç özeti açık, katlama işareti yok", () => {
    render(<GH />);
    expect(baslik("Gider Kalemleri")).toBeNull();
    expect(baslik("Kime Ne Kadar Borçluyuz")).toBeNull();
    expect(screen.getByTestId("kalem-listesi").textContent).toMatch(/Sac/);
    expect(screen.getByTestId("borc-ozeti").textContent).toMatch(/Toplam borç/);
  });
  it("AC-33 / R4/1: hareket bölümü yokken dört kutu çizilir, dördü kapalı, yöntem kutusu başlığı hiç yok", () => {
    render(<GH h0={null} />);
    for (const [ad, id] of KUTULAR.slice(0, 4)) kapali(ad, id);
    expect(screen.queryByText("Ödeme Yöntemi Kırılımı")).toBeNull();
  });
  it("AC-28 / R4/3: tür ve KDV satırı flex-start (biri açıkken kapalı kart uzamaz)", () => {
    render(<GH />);
    expect(screen.getByTestId("tur-kirilimi").parentElement.style.alignItems).toBe("flex-start");
    expect(screen.getByTestId("tedarikci-kirilimi").parentElement.style.alignItems).toBe("flex-start");
  });
});

describe("Spec 0081 R10–R12: katlanmayan yerler", () => {
  it("AC-13 / R10: Finans'ın KDV kartı içeriğiyle açık, katlanamaz", () => {
    render(<Finance customers={[]} services={[]} dealers={[]} partSales={[]} yedekParcaSatislar={[]} factory={{ name: "Altuntaş Makina" }} rates={{}} payments={[]} teklifler={[]}
      serverPermissions={null} kdvRates={KDV} giderTurleri={TURLER} giderYururlukAy="2026-01" giderYetki giderler={KALEMLER} />);
    const kart = screen.getByTestId("kdv-karsilastirma");
    expect(kart.textContent).toMatch(/Giderlerden indirilecek KDV/);
    expect(within(kart).queryByRole("button", { name: /^KDV Karşılaştırması/ })).toBeNull();
    expect(kart.querySelector("[aria-expanded]")).toBeNull();
  });
  // Spec 0089 ile (C7 0081 AC-14, R11): Makina ve Model görünümü kalktı; dört kova kartı yalnız Dönem Raporu'nun katlanan
  // "Makina Maliyeti Kovaları" kutusunda durur (0089 envanteri: "kaybolmuyor").
  it("AC-14 / R11 (spec 0089 ile): Makina ve Model görünümü yok; dört kova kartı Dönem Raporu kutusunda, açılınca görünür", () => {
    render(<GH />);
    expect(screen.queryByText("Makina ve Model")).toBeNull();
    const kova = kutuAc("Makina Maliyeti Kovaları");
    for (const e of ["Makinaya atanmış", "Modele atanmış", "Makina maliyetine girmeyen", "Ortak gider"]) expect(within(kova).getByText(new RegExp(`^${e}`))).toBeTruthy();
  });
  it("AC-15: Açık kalemler kipinde beş kutu çizilmez; borç özeti açık", () => {
    render(<GH />);
    fireEvent.click(screen.getByText("Açık kalemler (tüm dönemler)"));
    // Açık kalemlerin kendi yaş kovası düğmeleri de "kova-karti" kimliğini taşır; kutular başlıklarıyla aranır.
    for (const [ad] of KUTULAR) expect(screen.queryByText(ad), ad).toBeNull();
    expect(screen.getByTestId("borc-ozeti").textContent).toMatch(/Toplam borç/);
    expect(baslik("Kime Ne Kadar Borçluyuz")).toBeNull(); // katlanmaz (içindeki "Adları göster" ayrı bir aç/kapa)
  });
  it("AC-16: hatırlatma kipinde beş kutu çizilmez", () => {
    render(<GH />);
    fireEvent.click(screen.getAllByText(/^Hatırlatma kapsamı/).find(e => e.tagName === "BUTTON"));
    for (const [, id] of KUTULAR) expect(screen.queryByTestId(id)).toBeNull();
  });
  it("AC-17: kayıtsız dönemde boş durum ve borç özeti; katlanan kutu yok", () => {
    render(<GH g0={[]} h0={[]} />);
    expect(screen.getByTestId("gider-bos-durum")).toBeTruthy();
    expect(screen.getByTestId("borc-ozeti")).toBeTruthy();
    expect(document.querySelector("[aria-expanded]")).toBeNull();
  });
  it("AC-18: yürürlük öncesi dönemde 'Gider verisi girilmemiş' ve borç özeti", () => {
    render(<GH yururlukAy="2027-01" />);
    expect(screen.getByText("Gider verisi girilmemiş")).toBeTruthy();
    expect(screen.getByTestId("borc-ozeti")).toBeTruthy();
    for (const [, id] of KUTULAR) expect(screen.queryByTestId(id)).toBeNull();
  });
  it("AC-27 / R4/2: tam ay olmayan aralıkta KDV kartı açık ve işaretsiz", () => {
    render(<GH />);
    fireEvent.click(screen.getByText("Tarih Aralığı"));
    fireEvent.change(screen.getByLabelText("Başlangıç tarihi"), { target: { value: "2026-10-01" } });
    fireEvent.change(screen.getByLabelText("Bitiş tarihi"), { target: { value: "2026-10-15" } });
    const kart = screen.getByTestId("kdv-karsilastirma");
    expect(kart.textContent).toMatch(/karşılaştırma yapılamıyor/);
    expect(baslik("KDV Karşılaştırması")).toBeNull();
    expect(kart.querySelector("[aria-expanded]")).toBeNull();
    kapali("Gider Türü Kırılımı", "tur-kirilimi"); // diğer kutular katlanmaya devam eder
  });
  it("AC-27 / R4/2: yürürlük öncesi dönemde de KDV kartı katlanmaz (KdvKarsilastirmaKarti'nin öncesi dalı)", async () => {
    const { KdvKarsilastirmaKarti } = await import("../../src/components/gider/KdvKarsilastirmaKarti");
    render(<KdvKarsilastirmaKarti katlanir durum="oncesi" aralikEtiketi="Eylül 2025" />);
    expect(screen.getByTestId("kdv-karsilastirma").textContent).toMatch(/yürürlük ayından önce/);
    expect(screen.queryByRole("button")).toBeNull();
  });
});

describe("Spec 0081 R6/2: durum yeniden kurulmada sıfırlanır", () => {
  it("AC-24: görünüm değişimi kutuyu kapatır", () => {
    render(<GH />);
    kutuAc("Gider Türü Kırılımı");
    fireEvent.click(screen.getByText("Tedarikler ve Ekstre")); // spec 0082 R12 ile güncellendi
    fireEvent.click(screen.getByText("Dönem Raporu"));
    kapali("Gider Türü Kırılımı", "tur-kirilimi");
  });
  it("AC-25: hatırlatma kipi ve Açık kalemler kipi kutuyu kapatır", () => {
    render(<GH />);
    kutuAc("Gider Türü Kırılımı");
    fireEvent.click(screen.getAllByText(/^Hatırlatma kapsamı/).find(e => e.tagName === "BUTTON"));
    fireEvent.click(screen.getByText(/^Hatırlatma kapsamını kapat/));
    kapali("Gider Türü Kırılımı", "tur-kirilimi");
    kutuAc("Gider Türü Kırılımı");
    fireEvent.click(screen.getByText("Açık kalemler (tüm dönemler)"));
    fireEvent.click(screen.getByText("Açık kalemleri kapat"));
    kapali("Gider Türü Kırılımı", "tur-kirilimi");
  });
  it("AC-26: geçersiz tarih aralığı girilip düzeltilince kutular kapalı", () => {
    render(<GH />);
    fireEvent.click(screen.getByText("Tarih Aralığı"));
    fireEvent.change(screen.getByLabelText("Başlangıç tarihi"), { target: { value: "2026-10-01" } });
    fireEvent.change(screen.getByLabelText("Bitiş tarihi"), { target: { value: "2026-10-31" } });
    kutuAc("Gider Türü Kırılımı");
    fireEvent.change(screen.getByLabelText("Başlangıç tarihi"), { target: { value: "2026-11-15" } });
    expect(screen.queryByTestId("tur-kirilimi")).toBeNull();
    fireEvent.change(screen.getByLabelText("Başlangıç tarihi"), { target: { value: "2026-10-01" } });
    kapali("Gider Türü Kırılımı", "tur-kirilimi");
  });
});

describe("Spec 0081 R14: katlanan başlık klavyeyle açılır ve durumunu bildirir", () => {
  const dene = (ad) => {
    const d = screen.getByRole("button", { name: new RegExp(`^${ad}`) });
    expect(d.tabIndex).toBe(0);
    act(() => d.focus());
    expect(document.activeElement).toBe(d);
    expect(d.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText("gövde")).toBeNull();
    fireEvent.keyDown(d, { key: "Enter" });
    expect(d.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("gövde")).toBeTruthy();
    fireEvent.keyDown(d, { key: " " });
    expect(d.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText("gövde")).toBeNull();
    fireEvent.keyDown(d, { key: "a" });
    expect(d.getAttribute("aria-expanded")).toBe("false");
  };
  it("AC-19 / AC-20: kart varyantı", () => {
    render(<KartBolum varyant="kart" baslikStili="baslik" collapsible title="Deneme kartı" altBaslik="alt"><div>gövde</div></KartBolum>);
    dene("Deneme kartı");
  });
  it("AC-19 / AC-20: ayar varyantı", () => {
    render(<KartBolum title="Deneme ayarı" icon="settings" collapsible><div>gövde</div></KartBolum>);
    dene("Deneme ayarı");
  });
  // Triyaj: ▸/▾ işareti erişilebilir adın parçası olmaz (durum aria-expanded ile bildirilir); ad tam olarak başlıktır, iki
  // varyantta ve iki durumda da.
  it("AC-20: erişilebilir ad tam olarak başlık; açık/kapalı işareti ada girmez (iki varyant)", () => {
    render(<><KartBolum varyant="kart" baslikStili="baslik" collapsible title="Kart başlığı"><div>a</div></KartBolum>
      <KartBolum title="Ayar başlığı" icon="settings" collapsible><div>b</div></KartBolum></>);
    for (const ad of ["Kart başlığı", "Ayar başlığı"]) {
      const d = screen.getByRole("button", { name: ad });
      fireEvent.click(d);
      expect(d.getAttribute("aria-expanded")).toBe("true");
      expect(screen.getByRole("button", { name: ad })).toBe(d);
    }
  });
  it("AC-19: katlanmayan kartın başlığı düğme değildir", () => {
    render(<><KartBolum varyant="kart" baslikStili="baslik" title="Düz kart"><div>x</div></KartBolum><KartBolum title="Düz ayar" icon="settings"><div>y</div></KartBolum></>);
    expect(screen.queryByRole("button")).toBeNull();
  });
  it("AC-21: denetimli katlanan kart (0016 Görüşmeler / Dosyalar deseni) dışarıdan açılır, başlık onAcikDegis'i çağırır", () => {
    const onAcikDegis = vi.fn();
    const { rerender } = render(<KartBolum varyant="kart" baslikStili="baslik" collapsible acik={false} onAcikDegis={onAcikDegis} title="Görüşmeler" eylemler={<button>Ekle</button>}><div>gövde</div></KartBolum>);
    const d = screen.getByRole("button", { name: /^Görüşmeler/ });
    expect(d.getAttribute("aria-expanded")).toBe("false");
    fireEvent.keyDown(d, { key: "Enter" });
    expect(onAcikDegis).toHaveBeenCalledWith(true);
    rerender(<KartBolum varyant="kart" baslikStili="baslik" collapsible acik onAcikDegis={onAcikDegis} title="Görüşmeler" eylemler={<button>Ekle</button>}><div>gövde</div></KartBolum>);
    expect(d.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("gövde")).toBeTruthy();
    expect(d.contains(screen.getByText("Ekle"))).toBe(false); // eylem düğmesi başlık düğmesinin içinde değil
  });
  it("AC-31: Ayarlar'ın altı katlanan kartı kapalı başlar, tıklamayla açılır, dolgusu değişir", () => {
    window.appMail = { getLog: async () => [], getDeletedLog: async () => [] };
    render(<><SettingsCompany factory={{ name: "Altuntaş" }} setFactory={vi.fn()} appSettings={{}} setAppSettings={vi.fn()} flash={vi.fn()} /><SettingsSentMail /></>);
    for (const ad of ["Firma Bilgileri", "Çalışma Saatleri", "Banka ve Ödeme Bilgileri", "Kaşe / İmza", "Gönderilen E-postalar", "Silinen E-postalar"]) {
      const d = screen.getByRole("button", { name: new RegExp(`^${ad.replace("/", "\\/")}`) });
      const kap = d.parentElement;
      expect(d.getAttribute("aria-expanded"), ad).toBe("false");
      expect(kap.style.padding, ad).toBe("18px 24px");
      fireEvent.click(d);
      expect(d.getAttribute("aria-expanded"), ad).toBe("true");
      expect(kap.style.padding, ad).toBe("24px");
      expect(kap.children.length, ad).toBeGreaterThan(1);
    }
    delete window.appMail;
  });
});
