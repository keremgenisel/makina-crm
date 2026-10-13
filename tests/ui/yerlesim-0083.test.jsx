// @vitest-environment jsdom
// Spec 0083: Giderler görünüm çubuğunun sırası ve Kasa › Hesaplar'da hesapsız kayıtlar bloğunun (deneme şeridi dahil) sayfa
// sonuna, Çalışan avanslarından sonraya inmesi. Gerçek Giderler ve Kasa. Yalnız çizim sırası değişir; metinler birebir.
// Bu dosya beş görünüm etiketini sıralı dizide taşır (AC-1): AC-6 taramasında gerekçeli istisnadır (P5).
process.env.TZ = "Europe/Istanbul";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { useState } from "react";
import { Giderler } from "../../src/components/Giderler";
import { Kasa, denemeDonemiMetni } from "../../src/components/Kasa";
import { HESAPSIZ_NOTU } from "../../src/lib/kasa";
import { odemeleriUygula, turHaritasi } from "../../src/lib/gider";
import { hesaplaMakinaMaliyetleri } from "../../src/lib/makinaMaliyeti";

afterEach(() => { cleanup(); vi.useRealTimers(); });
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-09-30T10:00:00")); });

// ── Giderler ──
const GTUR = [{ id: 1, ad: "Hammadde", davranis: "normal" }];
const GTED = [{ id: 11, ad: "Demir Bant" }];
const KALEM = [{ id: 1, tarih: "2026-09-10", turId: 1, tutar: 1000, kdvOrani: 20, tedarikciId: 11, aciklama: "Sac", modelSatirlari: [], taksitler: [] }];
function GH({ baslangicGorunum }) {
  const [giderler, setGiderler] = useState(KALEM);
  const [h, setH] = useState([]);
  return <Giderler giderler={giderler} setGiderler={setGiderler} hesapHareketleri={h} setHesapHareketleri={setH} giderTanimlari={[]} setGiderTanimlari={vi.fn()}
    giderTurleri={GTUR} tedarikciler={GTED} setTedarikciler={vi.fn()} calisanlar={[]} standardModels={[]} customModels={[]} baslangicGorunum={baslangicGorunum}
    appSettings={{ giderAyarlari: { yururlukAy: "2026-01" } }} kasaHesaplari={[]} showToast={vi.fn()} canDo={() => true}
    satisVerisi={{ customers: [], services: [], partSales: [], payments: [], teklifler: [], dealers: [], yedekParcaSatislar: [] }}
    makinaMaliyet={hesaplaMakinaMaliyetleri({ giderler: KALEM, giderTurleri: GTUR, giderAyarlari: { yururlukAy: "2026-01" } }, { bugun: "2026-09-30" })} />;
}
const cubuk = () => within(screen.getByRole("radiogroup", { name: "Görünüm" })).getAllByRole("radio");
const gorunum = (ad) => fireEvent.click(screen.getByRole("radio", { name: ad }));
const secili = (ad) => screen.getByRole("radio", { name: ad }).getAttribute("aria-checked");

describe("Spec 0083 A: Giderler görünüm çubuğu (R1–R4)", () => {
  it("AC-1: beş sekme sırayla Dönem Raporu · Tedarikler ve Ekstre · Üretim Partileri · Makina Kârlılığı · Makina ve Model", () => {
    render(<GH />);
    expect(cubuk().map(r => r.textContent)).toEqual(["Dönem Raporu", "Tedarikler ve Ekstre", "Üretim Partileri", "Makina Kârlılığı", "Makina ve Model"]);
  });
  it("AC-2: ikinci sekme 'Tedarikler ve Ekstre', beşinci 'Makina ve Model'", () => {
    render(<GH />);
    expect(cubuk()[1].textContent).toBe("Tedarikler ve Ekstre");
    expect(cubuk()[4].textContent).toBe("Makina ve Model");
  });
  it("AC-3: açılışta Dönem Raporu seçili; her sekme kendi görünümünü çizer", () => {
    render(<GH />);
    expect(secili("Dönem Raporu")).toBe("true");
    expect(screen.getByTestId("kalem-listesi")).toBeTruthy();
    gorunum("Tedarikler ve Ekstre"); expect(screen.getByTestId("tedarikciler")).toBeTruthy();
    gorunum("Üretim Partileri"); expect(screen.getByTestId("bos-uretim-partileri")).toBeTruthy();
    gorunum("Makina Kârlılığı"); expect(screen.queryByTestId("makina-karliligi") || screen.queryByTestId("karlilik-bos")).toBeTruthy();
    gorunum("Makina ve Model"); expect(screen.getByText("Makinaya atanmış")).toBeTruthy();
    expect(screen.queryByTestId("kalem-listesi")).toBeNull();
  });
  it("AC-4: dönem seçicisi yalnız Üretim Partileri'nde çizilmez; geçersiz aralık uyarısı aynı koşulla", () => {
    render(<GH />);
    for (const ad of ["Dönem Raporu", "Tedarikler ve Ekstre", "Makina Kârlılığı", "Makina ve Model"]) {
      gorunum(ad);
      expect(screen.queryByLabelText("Dönem ayı"), ad).toBeTruthy();
    }
    gorunum("Dönem Raporu");
    fireEvent.click(screen.getByText("Tarih Aralığı"));
    fireEvent.change(screen.getByLabelText("Başlangıç tarihi"), { target: { value: "2026-10-15" } });
    fireEvent.change(screen.getByLabelText("Bitiş tarihi"), { target: { value: "2026-10-01" } });
    expect(screen.getByText("Başlangıç tarihi bitişten sonra olamaz.")).toBeTruthy();
    gorunum("Üretim Partileri");
    expect(screen.queryByLabelText("Dönem ayı")).toBeNull();
    expect(screen.queryByLabelText("Başlangıç tarihi")).toBeNull();
    expect(screen.queryByText("Başlangıç tarihi bitişten sonra olamaz.")).toBeNull();
  });
  it("AC-5: genel aramadan 'tedarikci' Tedarikler ve Ekstre'yi açar; bilinmeyen değer sessizce Dönem Raporu", () => {
    const { unmount } = render(<GH baslangicGorunum="tedarikci" />);
    expect(secili("Tedarikler ve Ekstre")).toBe("true");
    expect(screen.getByTestId("tedarikciler")).toBeTruthy();
    unmount();
    render(<GH baslangicGorunum="standart" />);
    expect(secili("Dönem Raporu")).toBe("true");
  });
});

// ── Kasa ──
const TURLER = [{ id: 4, ad: "Hammadde", davranis: "normal" }];
const turMap = turHaritasi(TURLER);
const HESAP = [{ id: 51, ad: "Ziraat", tur: "banka", paraBirimi: "TRY", acilisBakiyesi: 100000, acilisTarihi: "2026-01-01", kapali: false }];
const NORMAL = { id: 23, tarih: "2026-05-01", turId: 4, tutar: 50000, kdvOrani: 0, tedarikciId: 11, aciklama: "Sac" };
const od = (id, tarih, o = {}) => ({ id, tur: "odeme", tarih, tutar: 100, hesapId: null, giderId: 23, taksitId: null, yontem: "Nakit", ...o });
const sv = (id, date, o = {}) => ({ id, customerId: 500, date, type: "Garanti Dışı", repairPlace: "Yerinde Onarım", islemFirma: "Altuntaş Makina", servisUcreti: 1000,
  currency: "TRY", faturaTipi: "Faturalı Yurtiçi", odendi: true, tahsilatTarihi: date, yontem: "Nakit", degisenParcalar: [], hesapId: null, ...o });
const HAREKET = [od(10, "2026-05-10"), od(11, "2026-07-10"), { id: 13, tur: "avans", tarih: "2026-07-01", tutar: 50, calisanId: 7, hesapId: null },
  { id: 14, tur: "odeme", tarih: "2026-06-02", tutar: 100, hesapId: 51, giderId: 23, taksitId: null, yontem: "Havale" }];
const SERVIS = [sv(31, "2026-05-05"), sv(32, "2026-07-05")];

function KH({ hesaplar = HESAP, hareketler = HAREKET, ayar = {}, k0 = [], servis = SERVIS, onState }) {
  const [kasaKapsamDisi, setKasaKapsamDisi] = useState(k0);
  const [services, setServices] = useState(servis);
  const [kh, setKh] = useState(hesaplar);
  onState?.({ kasaKapsamDisi, services });
  return <Kasa kasaHesaplari={kh} setKasaHesaplari={setKh} hesapHareketleri={hareketler} setHesapHareketleri={vi.fn()} giderler={odemeleriUygula([NORMAL], hareketler, turMap)}
    giderTurleri={TURLER} tedarikciler={[{ id: 11, ad: "Yıldız" }]} calisanlar={[{ id: 7, ad: "Hasan Çelik" }]} customers={[{ id: 500, name: "Kutu Gıda" }]}
    services={services} setServices={setServices} factory={{ name: "Altuntaş Makina" }} giderAyarlari={ayar} serverPermissions={null} showToast={vi.fn()}
    kasaKapsamDisi={kasaKapsamDisi} setKasaKapsamDisi={setKasaKapsamDisi} />;
}
const tid = (id) => screen.getByTestId(id);
// a, b'den önce mi (belge sırası).
const once = (a, b) => !!(tid(a).compareDocumentPosition(tid(b)) & Node.DOCUMENT_POSITION_FOLLOWING);
const sira = (...idler) => { for (let i = 0; i + 1 < idler.length; i++) expect(once(idler[i], idler[i + 1]), `${idler[i]} → ${idler[i + 1]}`).toBe(true); };
// Hesaplar görünümünün kabı: hesap-listesi ile calisan-avanslari'nın ortak atası.
const gorunumKabi = () => { let e = tid("calisan-avanslari"); while (e && !e.contains(screen.queryByTestId("hesap-listesi") || screen.getByTestId("bos-kasa"))) e = e.parentElement; return e; };
const sonOge = (kap) => { const ogeler = [...kap.querySelectorAll("[data-testid]")]; return ogeler[ogeler.length - 1]; };

describe("Spec 0083 B: Kasa › Hesaplar yerleşimi (R6–R13)", () => {
  it("AC-8: sıra hesap listesi → hareketler → Çalışan avansları → deneme şeridi → hesapsız notu → eşik satırı → sayı satırları; sayı satırı görünümün son öğesi", () => {
    render(<KH ayar={{ hesapsizBaslangic: "2026-06-01" }} />);
    fireEvent.click(screen.getAllByTestId("hesap-satiri")[0]);
    sira("hesap-listesi", "hesap-hareketleri", "calisan-avanslari", "deneme-donemi", "hesapsiz-notu", "hesapsiz-esik-satiri", "hesapsiz-sayilar");
    const son = sonOge(gorunumKabi());
    expect(tid("hesapsiz-sayilar").contains(son)).toBe(true);
  });
  it("AC-9: Çalışan avansları deneme şeridinden ve hesapsız notundan önce; ikisi de hesap listesinden sonra", () => {
    render(<KH />);
    sira("calisan-avanslari", "deneme-donemi");
    sira("calisan-avanslari", "hesapsiz-notu");
    sira("hesap-listesi", "deneme-donemi");
    sira("hesap-listesi", "hesapsiz-notu");
  });
  it("AC-10: açılan üç liste sayı satırından ve Çalışan avanslarından sonra; açılan son liste görünümün son öğesi", () => {
    render(<KH k0={[{ id: 901, tur: "tahsilat", kaynak: "servis", kayitId: 31, zaman: "2026-09-01T00:00:00.000Z" }]} />);
    fireEvent.click(screen.getByText("Ödemeleri göster"));
    fireEvent.click(screen.getByText("Listeyi göster"));
    fireEvent.click(screen.getByText("Göster"));
    for (const l of ["hesapsiz-odemeler", "hesapsiz-tahsilatlar", "kapsam-disi-listesi"]) { sira("hesapsiz-sayilar", l); sira("calisan-avanslari", l); }
    expect(tid("kapsam-disi-listesi").contains(sonOge(gorunumKabi()))).toBe(true);
  });
  it("AC-11: eşik satırı notun sonrasında, sayı satırının önünde; 'Hepsini göster' çalışır", () => {
    render(<KH ayar={{ hesapsizBaslangic: "2026-06-01" }} />);
    sira("hesapsiz-notu", "hesapsiz-esik-satiri", "hesapsiz-sayilar");
    const onceMetin = tid("hesapsiz-sayilar").textContent;
    fireEvent.click(within(tid("hesapsiz-esik-satiri")).getByText("Hepsini göster"));
    expect(tid("hesapsiz-sayilar").textContent).not.toBe(onceMetin);
  });
  it("AC-12: kapsam dışı açıklaması bugünkü koşuluyla, blok içinde sayı satırından sonra", () => {
    render(<KH />);
    fireEvent.click(screen.getByText("Listeyi göster"));
    sira("hesapsiz-sayilar", "kapsam-disi-aciklama");
    sira("calisan-avanslari", "kapsam-disi-aciklama");
  });
  it("AC-13: hesap yokken boş durum → Çalışan avansları → hesapsız notu", () => {
    render(<KH hesaplar={[]} hareketler={HAREKET.filter(h => h.hesapId == null)} />);
    sira("bos-kasa", "calisan-avanslari", "hesapsiz-notu");
  });
  it("AC-14: Çek Portföyü görünümünde blok parçalarının hiçbiri yok", () => {
    render(<KH />);
    fireEvent.click(screen.getByRole("tab", { name: "Çek Portföyü" }));
    for (const id of ["deneme-donemi", "hesapsiz-notu", "hesapsiz-sayilar", "hesapsiz-esik-satiri", "hesapsiz-odemeler", "hesapsiz-tahsilatlar", "kapsam-disi-listesi"]) {
      expect(screen.queryByTestId(id), id).toBeNull();
    }
  });
  it("AC-15: deneme dönemi kapalıyken şerit yok; not yine Çalışan avanslarından sonra", () => {
    render(<KH ayar={{ denemeDonemiBitis: "" }} />);
    expect(screen.queryByTestId("deneme-donemi")).toBeNull();
    sira("calisan-avanslari", "hesapsiz-notu");
  });
  it("AC-16: taşınan liste sayfalanır: on bir hesapsız ödemede ilk sayfa on satır ve 'Sonraki ›'", () => {
    const cok = Array.from({ length: 11 }, (_, i) => od(100 + i, `2026-06-${String(i + 1).padStart(2, "0")}`, { tutar: 10 }));
    render(<KH hareketler={cok} />);
    fireEvent.click(screen.getByText("Ödemeleri göster"));
    const l = tid("hesapsiz-odemeler");
    expect(within(l).getAllByTestId("hesapsiz-odeme")).toHaveLength(10);
    expect(within(l).getByText("Sonraki ›")).toBeTruthy();
  });
  it("AC-17: satırdan hesap atanır, tek kayıt kapsam dışı bırakılır, kapsama alınır; toplu düğme 'Listedeki n kaydı …'", () => {
    let st;
    render(<KH onState={s => { st = s; }} />);
    fireEvent.click(screen.getByText("Listeyi göster"));
    expect(screen.getByRole("button", { name: "Listedeki tahsilatları kapsam dışı bırak" }).textContent).toMatch(/Listedeki 2 kaydı/);
    fireEvent.click(within(screen.getAllByTestId("hesapsiz-tahsilat")[0]).getByText("Kapsam dışı bırak"));
    expect(st.kasaKapsamDisi).toHaveLength(1);
    fireEvent.click(screen.getByText("Göster"));
    fireEvent.click(within(tid("kapsam-disi-listesi")).getByText("Kapsama al"));
    expect(st.kasaKapsamDisi).toHaveLength(0);
    const sel = screen.getAllByRole("combobox").find(e => /^Hesap ata: /.test(e.getAttribute("aria-label") || ""));
    fireEvent.change(sel, { target: { value: "51" } });
    expect(st.services.filter(x => x.hesapId === 51)).toHaveLength(1);
  });
  it("AC-18: metinler birebir sabitlerden; bloğun üstünde yeni başlık, ayırıcı ya da kap yok", () => {
    // Hesapsız avans yokken not yalnız sabittir (avans varken sonuna bugünkü "n avans hesapsız" eki gelir, değişmedi).
    render(<KH hareketler={HAREKET.filter(h => h.tur !== "avans")} />);
    expect(tid("hesapsiz-notu").textContent).toBe(HESAPSIZ_NOTU);
    expect(tid("deneme-donemi").textContent).toBe(denemeDonemiMetni("2027-01-01"));
    // Deneme şeridinin hemen önceki kardeşi Çalışan avansları kartıdır (araya öğe girmedi).
    expect(tid("deneme-donemi").previousElementSibling).toBe(tid("calisan-avanslari"));
  });
  it("AC-19: hesap satırında 'n hareket' ibaresi, deneme dönemindeki silme düğmesi ve taşıma penceresi çalışır", () => {
    render(<KH />);
    const satir = screen.getAllByTestId("hesap-satiri")[0];
    expect(satir.textContent).toMatch(/1 hareket/);
    fireEvent.click(within(satir).getByRole("button", { name: "Hesabı sil: Ziraat" }));
    expect(screen.getByText("Hesabı Sil: Ziraat")).toBeTruthy();
    expect(screen.getAllByText(/Başka hesaba taşı/).length).toBeGreaterThan(0);
  });
});
