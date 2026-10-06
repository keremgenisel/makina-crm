// @vitest-environment jsdom
// Spec 0074: SGK kendi gider türü, arayüz. Tür yöneticisi, gider formu (SGK kalemi ve personel), tanım formu, borç kutusu,
// kalem listesi, çalışan listesi ve ödeme penceresinin mahsup kipi. Test adları AC-<n> taşır.
process.env.TZ = "Europe/Istanbul";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { useState } from "react";
import { GiderTurManager } from "../../src/components/settings/GiderTurManager";
import { GiderForm, PERSONEL_SGK_NOTU } from "../../src/components/GiderForm";
import { Giderler } from "../../src/components/Giderler";
import { SettingsGiderTanimlari } from "../../src/components/settings/SettingsGiderTanimlari";
import { CalisanManager, CALISAN_MALIYET_IPUCU } from "../../src/components/CalisanManager";
import { OdemeKayitPenceresi } from "../../src/components/gider/OdemeKayitPenceresi";
import { giderKalemDogrula, turHaritasi, odemeleriUygula, DAVRANIS, SGK_TOPLAM_YOK_NEDENI } from "../../src/lib/gider";

afterEach(() => { cleanup(); vi.useRealTimers(); });
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-10-07T10:00:00")); });

const TURLER = [{ id: 1, ad: "Kira", davranis: "kira" }, { id: 3, ad: "Personel", davranis: "personel" }, { id: 4, ad: "Elektrik", davranis: "normal" },
  { id: 5, ad: "SGK", davranis: "sgk" }];
const turMap = turHaritasi(TURLER);
const CAL = [{ id: 21, ad: "Hasan Çelik", resmiMaliyet: 30000, sgkMaliyet: 9000, eldenMaliyet: 10000 }, { id: 22, ad: "Zeynep Arslan", resmiMaliyet: 25000, sgkMaliyet: 7000 },
  { id: 23, ad: "Eski Çalışan", sgkMaliyet: 5000, deletedAt: "2026-09-01T00:00:00Z" }, { id: 24, ad: "Yalnız SGK", sgkMaliyet: 4000 }];
let m = 7000;
const k = (f) => { const r = giderKalemDogrula(f, { turMap, tedarikciler: [], uid: () => ++m }); if (r.hatalar.length) throw new Error(JSON.stringify(r.hatalar)); return r.kayit; };

describe("Spec 0074 A: tür yöneticisi", () => {
  function T({ t0 = TURLER.filter(t => t.id !== 5), g0 = [], onState }) {
    const [giderTurleri, setGiderTurleri] = useState(t0);
    const [giderler, setGiderler] = useState(g0);
    onState?.(giderTurleri);
    return <GiderTurManager giderTurleri={giderTurleri} setGiderTurleri={setGiderTurleri} giderler={giderler} setGiderler={setGiderler} giderTanimlari={[]} setGiderTanimlari={vi.fn()} showToast={vi.fn()} />;
  }
  const satir = (ad) => screen.getAllByText(ad).find(el => el.tagName === "TD" || el.closest("td")).closest("tr");
  it("AC-1, AC-5: davranış listesinde SGK seçilebilir; rozet tema değişkenleriyle çizilir", () => {
    let st;
    render(<T onState={s => { st = s; }} />);
    const sec = screen.getAllByRole("combobox")[0];
    expect([...sec.querySelectorAll("option")].map(o => o.textContent)).toContain("SGK");
    fireEvent.change(screen.getByPlaceholderText("Örn. Sigorta"), { target: { value: "SGK primleri" } });
    fireEvent.change(sec, { target: { value: "sgk" } });
    fireEvent.click(screen.getByText("Ekle"));
    expect(st.find(t => t.ad === "SGK primleri").davranis).toBe("sgk");
    const rozet = within(satir("SGK primleri")).getByText("SGK");
    expect(rozet.getAttribute("style")).toMatch(/var\(--blu700/);
  });
  it("AC-4: önerilen türler SGK'yı ekler; Bağkur normal kalır", () => {
    let st;
    render(<T t0={[]} onState={s => { st = s; }} />);
    fireEvent.click(screen.getByText("Önerilen türleri ekle"));
    expect(st.find(t => t.ad === "SGK").davranis).toBe("sgk");
    expect(st.find(t => t.ad === "Sosyal güvenlik (Bağkur)").davranis).toBe("normal");
  });
  it("AC-2, AC-3: kullanımdaki SGK türünün davranışı kilitli; tek SGK türü silinemez ve neden DAVRANIS_AD ile", () => {
    render(<T t0={TURLER} g0={[k({ id: 1, tarih: "2026-09-30", turId: 5, tutar: "100" })]} />);
    fireEvent.click(within(satir("SGK")).getByTitle("Düzenle"));
    expect(screen.getByText(/davranış değiştirilemez/)).toBeTruthy();
    fireEvent.click(screen.getByText("İptal"));
    fireEvent.click(within(satir("SGK")).getByTitle("Sil"));
    expect(screen.getByText(/SGK davranışında başka tür yok, bu yüzden silinemez/)).toBeTruthy();
  });
});

const formAc = (props = {}) => {
  const onSave = vi.fn();
  render(<GiderForm giderTurleri={TURLER} tedarikciler={[{ id: 11, ad: "Telekom" }]} calisanlar={CAL} giderAyarlari={{}} onSave={onSave} onCancel={vi.fn()} {...props} />);
  return onSave;
};
const tur = (id) => fireEvent.change(screen.getByLabelText("Gider türü *"), { target: { value: String(id) } });

describe("Spec 0074 B: gider formu", () => {
  it("AC-6, AC-7, AC-8, AC-9: SGK kaleminde tutar ve vade var; KDV, KDV yönü, tedarikçi, çalışan, stopaj ve atama yok; kayıtta KDV sıfır", () => {
    const onSave = formAc();
    tur(5);
    expect(screen.getByLabelText("Tutar")).toBeTruthy();
    for (const a of ["KDV oranı", "Stopaj oranı", "Çalışan *"]) expect(screen.queryByLabelText(a)).toBeNull();
    expect(screen.queryByText("Tedarikçi")).toBeNull();
    expect(screen.queryByRole("radiogroup", { name: "KDV yönü" })).toBeNull();
    expect(screen.queryByRole("radiogroup", { name: "Makina maliyeti ataması" })).toBeNull();
    fireEvent.change(screen.getByLabelText("Tutar"), { target: { value: "16000" } });
    fireEvent.click(screen.getByText("Kaydet"));
    expect(onSave.mock.calls[0][0]).toMatchObject({ turId: 5, tutar: 16000, kdvOrani: 0, kdvYonu: null, tedarikciId: null, atamaTur: "" });
  });
  it("AC-15, AC-46: 'Çalışanların SGK toplamını kullan' canlı ve dolu değerleri toplar, kişi sayısını yazar; tutar sonra düzeltilir", () => {
    formAc();
    tur(5);
    const kutu = screen.getByTestId("sgk-toplam-onerisi");
    expect(kutu.textContent).toMatch(/3 çalışanın kartındaki SGK toplamı: 20\.000 ₺/);
    fireEvent.click(within(kutu).getByText("Çalışanların SGK toplamını kullan"));
    expect(screen.getByLabelText("Tutar").value).toBe("20.000");
    fireEvent.change(screen.getByLabelText("Tutar"), { target: { value: "19.500" } });
    expect(screen.getByLabelText("Tutar").value).toBe("19.500");
  });
  it("AC-46: hiç SGK değeri yokken düğme pasif ve nedeni yazılı", () => {
    formAc({ calisanlar: [{ id: 1, ad: "A", resmiMaliyet: 1000 }] });
    tur(5);
    expect(screen.getByText("Çalışanların SGK toplamını kullan").closest("button").disabled).toBe(true);
    expect(screen.getByTestId("sgk-toplam-onerisi").textContent).toContain(SGK_TOPLAM_YOK_NEDENI);
  });
  it("AC-15 (yetki): gider formu yalnız Giderler sekmesinden çizilir (düğmeyi gören gider yetkilidir)", () => {
    const tara = (d) => readdirSync(d).flatMap(x => { const p = path.join(d, x); return statSync(p).isDirectory() ? tara(p) : /\.jsx$/.test(x) ? [p] : []; });
    const kullananlar = tara("src/components").filter(f => /<GiderForm\b/.test(readFileSync(f, "utf8")));
    expect(kullananlar.map(f => path.basename(f))).toEqual(["Giderler.jsx"]);
  });
  it("AC-19, AC-24, AC-39: personel formunda SGK alanı ve vadesi yok; not yenilendi; yalnız SGK'sı girilmiş çalışan seçilince uyarı çıkar", () => {
    formAc();
    tur(3);
    expect(screen.queryByLabelText("SGK")).toBeNull();
    expect(screen.queryByLabelText("SGK vadesi")).toBeNull();
    expect(screen.getByTestId("personel-sgk-notu").textContent).toBe(PERSONEL_SGK_NOTU);
    fireEvent.change(screen.getByLabelText("Çalışan *"), { target: { value: "24" } });
    expect(screen.getByText(/Bu çalışanın aylık maliyeti girilmemiş/)).toBeTruthy();
  });
  it("AC-11, AC-16: SGK kaleminin ödeme satırı 'SGK'ya' adıyla; çek yöntemleri seçilebilir", () => {
    formAc({ ciroYetkisi: true, hesapSecimi: true, hesaplar: [{ id: 501, ad: "Ziraat", tur: "banka", paraBirimi: "TRY" }] });
    tur(5);
    fireEvent.change(screen.getByLabelText("Tutar"), { target: { value: "16000" } });
    fireEvent.click(screen.getByLabelText("SGK'ya ödendi"));
    const yontemler = [...screen.getByLabelText("SGK'ya ödeme yöntemi").querySelectorAll("option")].map(o => o.textContent);
    expect(yontemler).toEqual(expect.arrayContaining(["Çek (ciro)", "Çek (kendi)"]));
    expect(screen.queryByLabelText("Tedarikçiye ödendi")).toBeNull();
  });
});

describe("Spec 0074 B: tanım formu", () => {
  it("AC-13, AC-21 (0071): SGK davranışında tanım KDV'siz, tedarikçisiz kurulur ve sıfır tutarla kaydedilir", () => {
    const set = vi.fn();
    render(<SettingsGiderTanimlari giderTanimlari={[]} setGiderTanimlari={set} giderTurleri={TURLER} calisanlar={CAL} showToast={vi.fn()} />);
    fireEvent.click(screen.getByText("Yeni Tanım"));
    fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: "5" } });
    fireEvent.change(screen.getByLabelText("Tanım adı *"), { target: { value: "SGK" } });
    expect(screen.queryByLabelText("KDV oranı")).toBeNull();
    expect(screen.queryByText("Tedarikçi")).toBeNull();
    expect(screen.queryByRole("radiogroup", { name: "KDV yönü" })).toBeNull();
    fireEvent.click(screen.getByText("Kaydet"));
    expect(set.mock.calls[0][0]([])[0]).toMatchObject({ ad: "SGK", turId: 5, tutar: 0, kdvOrani: null, kdvYonu: null, tedarikciId: null });
  });
});

// ── Gerçek Giderler: borç kutusu, kalem listesi ─────────────────────────────────────
const SGK_K = k({ id: 70, tarih: "2026-09-30", turId: 5, tutar: "16000", sonOdemeTarihi: "2026-10-31", aciklama: "Eylül SGK" });
const SGK_SIFIR = k({ id: 71, tarih: "2026-10-01", turId: 5, tutar: "", tanimId: 90, donem: "2026-10" });
function GH({ g0 = [SGK_K], perms = null }) {
  const [giderler, setGiderler] = useState(g0);
  const [hesapHareketleri, setHesapHareketleri] = useState([]);
  return <Giderler giderler={giderler} setGiderler={setGiderler} hesapHareketleri={hesapHareketleri} setHesapHareketleri={setHesapHareketleri} giderTanimlari={[]} setGiderTanimlari={vi.fn()}
    giderTurleri={TURLER} tedarikciler={[]} setTedarikciler={vi.fn()} standartGiderler={[]} setStandartGiderler={vi.fn()} calisanlar={CAL} standardModels={[]} customModels={[]}
    appSettings={{ giderAyarlari: { yururlukAy: "2026-01" } }} serverPermissions={perms} kasaHesaplari={[]} kasaYetki aktifKullanici="kerem"
    satisVerisi={{ customers: [], services: [], partSales: [], payments: [], teklifler: [], dealers: [], yedekParcaSatislar: [] }} showToast={vi.fn()} />;
}
describe("Spec 0074 B: tanım listesi", () => {
  // Kanıt incelemesinde bulundu (2026-10-07): SGK satırında "KDV yok" ile "KDV hariç girildi" alt alta yazıyordu.
  it("AC-13: SGK tanımının tutar hücresi 'KDV yok' der, KDV yönü satırı yok; normal tanımda yön satırı durur", () => {
    const tanimlar = [{ id: 90, ad: "Eylül SGK", turId: 5, tutar: 0, kdvOrani: 0, kdvYonu: null, baslangicAy: "2026-06", uretilenAylar: [] },
      { id: 91, ad: "Ofis elektriği", turId: 4, tutar: 1000, kdvOrani: 20, kdvYonu: "dahil", baslangicAy: "2026-06", uretilenAylar: [] }];
    render(<SettingsGiderTanimlari giderTanimlari={tanimlar} setGiderTanimlari={vi.fn()} giderTurleri={TURLER} calisanlar={CAL} showToast={vi.fn()} />);
    const sgk = screen.getByText("Eylül SGK").closest("tr");
    expect(within(sgk).getByText("KDV yok")).toBeTruthy();
    expect(within(sgk).queryByTestId("tanim-kdv-yonu")).toBeNull();
    expect(within(sgk).queryByText(/KDV (hariç|dâhil) girildi/)).toBeNull();
    const el = screen.getByText("Ofis elektriği").closest("tr");
    expect(within(el).getByTestId("tanim-kdv-yonu").textContent).toBe("KDV dâhil girildi");
  });
});

describe("Spec 0074 C: borç kutusu ve kalem listesi", () => {
  it("AC-20, AC-23: borç kutusunda SGK tek 'Kurum' satırı, düğmesiz; açık kalemler kipinde de düğme yok", () => {
    render(<GH />);
    const ozet = screen.getByTestId("borc-ozeti");
    const satir = within(ozet).getByText("Kurum").closest("div").parentElement.parentElement;
    expect(satir.textContent).toMatch(/SGK/);
    expect(satir.textContent).toMatch(/16\.000 ₺/);
    expect(screen.queryByRole("button", { name: "SGK'yı Öde" })).toBeNull();
    fireEvent.click(screen.getByTestId("acik-kalemler-dugmesi"));
    expect(screen.queryByRole("button", { name: "SGK'yı Öde" })).toBeNull();
  });
  it("AC-47, AC-14: kalem listesinde SGK kaleminin taraf hücresi 'SGK'; tanımdan sıfır doğan kalem 'Tutar girilmedi' taşır", () => {
    render(<GH g0={[SGK_K, SGK_SIFIR]} />);
    const satirlar = screen.getAllByText("SGK", { selector: "div" });
    expect(satirlar.length).toBeGreaterThan(0);
    expect(screen.queryByText("Tedarikçi seçilmemiş", { selector: "div" })).toBeNull();
    expect(screen.getAllByTestId("tutar-girilmedi").length).toBe(1);
  });
  it("AC-38: personel ayrıntısının ızgarası altı sütun (SGK sütunu yok)", () => {
    render(<GH g0={[k({ id: 72, tarih: "2026-10-01", turId: 3, calisanId: 21, calisanAd: "Hasan Çelik", resmiTutar: "30000", eldenTutar: "10000", sonOdemeTarihi: "2026-10-05" })]} />);
    fireEvent.click(screen.getAllByRole("button").find(b => b.textContent.trim() === "▸ Aç"));
    const baslik = screen.getByTestId("personel-ayrinti").firstElementChild;
    expect([...baslik.children].map(c => c.textContent)).toEqual(["Çalışan", "Resmi", "Elden", "Yol parası", "Ek ödeme", "Toplam"]);
  });
});

describe("Spec 0074: çalışan listesi ve mahsup kipi", () => {
  it("AC-30: çalışan listesinde SGK'nın personel kalemine girmediği ve kendi kalemiyle ödendiği yazılı", () => {
    render(<CalisanManager calisanlar={CAL} setCalisanlar={vi.fn()} giderYetki maliyetDuzenleyebilir showToast={vi.fn()} />);
    expect(screen.getByTestId("calisan-maliyet-ipucu").textContent).toBe(CALISAN_MALIYET_IPUCU);
    expect(CALISAN_MALIYET_IPUCU).toMatch(/SGK personel kalemine girmez, aylık SGK kendi gider kalemiyle/);
  });
  it("AC-28 (arayüz): SGK kaleminin ödeme penceresinde 'Avanstan mahsup' kipi yok; personelde var", () => {
    const sgkKalem = odemeleriUygula([SGK_K], [], turMap)[0];
    const avans = [{ id: 1, tur: "avans", calisanId: 21, tutar: 5000, tarih: "2026-09-01" }];
    const ac = (kalem, dav) => render(<OdemeKayitPenceresi kalem={kalem} davranis={dav} turAd="x" turMap={turMap} hareketler={avans} hesaplar={[]} odemeYetkisi
      bugun="2026-10-07" giderler={[kalem]} yururlukAy="2026-01" onKaydet={vi.fn()} onSil={vi.fn()} onClose={vi.fn()} />);
    ac(sgkKalem, DAVRANIS.SGK);
    expect(screen.queryByRole("button", { name: "Avanstan mahsup" })).toBeNull();
    cleanup();
    const p = odemeleriUygula([k({ id: 73, tarih: "2026-09-30", turId: 3, calisanId: 21, calisanAd: "Hasan Çelik", resmiTutar: "30000", eldenTutar: "", sonOdemeTarihi: "2026-10-05" })], [], turMap)[0];
    ac(p, DAVRANIS.PERSONEL);
    expect(screen.getByRole("button", { name: "Avanstan mahsup" })).toBeTruthy();
  });
});
