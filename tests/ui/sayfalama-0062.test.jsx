// @vitest-environment jsdom
// Spec 0062: Giderler ve Kasa listelerinde sayfalama. Gerçek bileşenler; her liste sayfa boyutunun üstünde satırla kurulur.
process.env.TZ = "Europe/Istanbul";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { useState } from "react";
import { Kasa } from "../../src/components/Kasa";
import { CekPortfoyu } from "../../src/components/cek/CekPortfoyu";
import { Giderler } from "../../src/components/Giderler";
import { Tedarikciler } from "../../src/components/gider/Tedarikciler";
import { MakinaKarliligi } from "../../src/components/gider/MakinaKarliligi";
import { MakinaModelGorunumu } from "../../src/components/gider/MakinaModelGorunumu";
import { AcikKalemler } from "../../src/components/gider/AcikKalemler";
import { EkstrePenceresi } from "../../src/components/gider/EkstrePenceresi";
import { OdemeHatirlatmaPenceresi } from "../../src/components/gider/OdemeHatirlatma";
import { giderKalemDogrula, turHaritasi, odemeleriUygula } from "../../src/lib/gider";
import { hesapBakiyeleri } from "../../src/lib/kasa";
import { hesaplaMakinaMaliyetleri } from "../../src/lib/makinaMaliyeti";

afterEach(() => { cleanup(); vi.useRealTimers(); });
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-10-02T10:00:00")); });

const gun = (n) => `2026-09-${String(n).padStart(2, "0")}`;
const sonraki = (kap) => fireEvent.click(within(kap).getByText("Sonraki ›"));
const aktif = (kap) => kap.querySelector(".page-num--active")?.textContent ?? null;
const cubukYok = (kap) => expect(within(kap).queryByText("Sonraki ›")).toBeNull();

// ── Kasa ──
const HESAP = (id, ad) => ({ id, ad, tur: "banka", paraBirimi: "TRY", acilisBakiyesi: 0, acilisTarihi: "2026-09-01", kapali: false });
const TAHSILAT = Array.from({ length: 13 }, (_, i) => ({ id: 600 + i, customerId: 70, tarih: gun(i + 1), tutar: 100 * (i + 1), currency: "TRY", yontem: "Havale", hesapId: 1 }));
const IKINCI = Array.from({ length: 12 }, (_, i) => ({ id: 700 + i, customerId: 70, tarih: gun(i + 1), tutar: 10, currency: "TRY", yontem: "Havale", hesapId: 2 }));

function KasaH({ p0 = [...TAHSILAT, ...IKINCI] }) {
  const [kasaHesaplari, setKasaHesaplari] = useState([HESAP(1, "Akbank"), HESAP(2, "Ziraat")]) // hesaplar ada göre sıralı; ilk hesap (Akbank) seçili açılır;
  const [hesapHareketleri, setHesapHareketleri] = useState([]);
  return <Kasa kasaHesaplari={kasaHesaplari} setKasaHesaplari={setKasaHesaplari} hesapHareketleri={hesapHareketleri} setHesapHareketleri={setHesapHareketleri}
    payments={p0} customers={[{ id: 70, name: "Örnek Gıda" }]} giderler={[]} giderTurleri={[]} tedarikciler={[]} showToast={vi.fn()} giderAyarlari={{ denemeDonemiBitis: "" }} />;
}
const hareketKabi = () => screen.getByTestId("hesap-hareketleri");
const hareketSatirlari = () => within(hareketKabi()).getAllByTestId("hareket-satiri");
const hesapSatiri = (ad) => screen.getAllByTestId("hesap-satiri").find(s => s.textContent.includes(ad));

describe("Spec 0062: Kasa hesap hareketleri (R1, R18, R19, R34)", () => {
  it("AC-1 / AC-22 / AC-45: en yeni hareket ilk sayfanın başında; 10 satır; sıra motorun tam tersi; açılış yalnız özette", () => {
    render(<KasaH />);
    const r = hareketSatirlari();
    expect(r).toHaveLength(10);
    expect(r[0].textContent).toMatch(/^13\/09\/2026/);
    expect(r[9].textContent).toMatch(/^04\/09\/2026/);
    expect(hareketKabi().textContent).not.toMatch(/Açılış bakiyesi/); // sentetik satır yok
    expect(within(hareketKabi()).getAllByText(/^Açılış/).length).toBeGreaterThan(0); // özet satırı (altBaslik)
    sonraki(hareketKabi());
    expect(hareketSatirlari().map(s => s.textContent.slice(0, 10))).toEqual(["03/09/2026", "02/09/2026", "01/09/2026"]);
  });
  it("AC-21 / AC-19: bakiye motorun satır değeri; sayfa 2'nin ilk bakiyesi sayfa 1'in son satırından bir önceki hareketin bakiyesi; hesap bakiyesi sayfadan bağımsız", () => {
    const motor = hesapBakiyeleri([HESAP(1, "Akbank")], [], { payments: TAHSILAT, customers: [], bugun: "2026-10-02" }).get("1").satirlar;
    render(<KasaH />);
    const ozet = hesapSatiri("Akbank").textContent;
    expect(ozet).toMatch(/9\.100/);
    sonraki(hareketKabi());
    // Spec 0073 ile güncellendi: satırın son sütunu işlem sütunu (tahsilat ibaresi); bakiye onun önündeki <b> hücresindedir.
    const ilk = hareketSatirlari()[0].querySelector("b").textContent;
    // Sayfa 1'in son satırı 04/09 (motorda indeks 3); bir önceki hareket 03/09 (indeks 2), bakiyesi 600.
    expect(motor[2].bakiyeK).toBe(60000);
    expect(ilk).toMatch(/600,00$|600$/);
    expect(hesapSatiri("Akbank").textContent).toBe(ozet);
  });
  it("AC-27: hesap seçimi değişince sayfa 1'e döner", () => {
    render(<KasaH />);
    sonraki(hareketKabi());
    expect(aktif(hareketKabi())).toBe("2");
    fireEvent.click(hesapSatiri("Ziraat"));
    expect(aktif(hareketKabi())).toBe("1");
    expect(hareketSatirlari()[0].textContent).toMatch(/^12\/09\/2026/);
  });
});

// ── Kasa hesapsız listeler, toplu işlem, kapsam dışı ──
const KTUR = [{ id: 4, ad: "Hammadde", davranis: "normal" }];
const NORMAL = { id: 23, tarih: "2026-05-01", turId: 4, tutar: 50000, kdvOrani: 0, tedarikciId: 11, aciklama: "Sac" };
const HAREKET = Array.from({ length: 12 }, (_, i) => ({ id: 100 + i, tur: "odeme", tarih: gun(i + 1), tutar: 100, hesapId: null, giderId: 23, taksitId: null, yontem: "Nakit" }));
const sv = (id, date) => ({ id, customerId: 500, date, type: "Garanti Dışı", repairPlace: "Yerinde Onarım", islemFirma: "Altuntaş Makina", servisUcreti: 1000,
  currency: "TRY", faturaTipi: "Faturalı Yurtiçi", odendi: true, tahsilatTarihi: date, yontem: "Nakit", degisenParcalar: [], hesapId: null });
const SERVIS = [...Array.from({ length: 12 }, (_, i) => sv(300 + i, gun(i + 1))), sv(399, "2026-01-15")];

function HesapsizH({ onState, esik = "" }) {
  const [kasaKapsamDisi, setKasaKapsamDisi] = useState([]);
  const [services, setServices] = useState(SERVIS);
  onState?.({ kasaKapsamDisi, services });
  const turMap = turHaritasi(KTUR);
  return <Kasa kasaHesaplari={[HESAP(51, "Ziraat")]} setKasaHesaplari={vi.fn()} hesapHareketleri={HAREKET} setHesapHareketleri={vi.fn()} giderler={odemeleriUygula([NORMAL], HAREKET, turMap)}
    giderTurleri={KTUR} tedarikciler={[{ id: 11, ad: "Yıldız" }]} calisanlar={[]} customers={[{ id: 500, name: "Kutu Gıda" }]} services={services} setServices={setServices}
    factory={{ name: "Altuntaş Makina" }} giderAyarlari={esik ? { hesapsizBaslangic: esik, denemeDonemiBitis: "" } : { denemeDonemiBitis: "" }} showToast={vi.fn()}
    kasaKapsamDisi={kasaKapsamDisi} setKasaKapsamDisi={setKasaKapsamDisi} />;
}
const odemeKabi = () => screen.getByTestId("hesapsiz-odemeler");
const tahsilatKabi = () => screen.getByTestId("hesapsiz-tahsilatlar");

describe("Spec 0062: Kasa hesapsız listeler ve toplu işlem (R2, R17, R24, R29)", () => {
  it("AC-2 / AC-3 / AC-34 / AC-35: iki liste sayfalanır, sayfa durumları ayrı; sıra en yeni üstte (değişmedi)", () => {
    render(<HesapsizH />);
    fireEvent.click(screen.getByText("Ödemeleri göster"));
    fireEvent.click(screen.getByText("Listeyi göster"));
    expect(within(odemeKabi()).getAllByTestId("hesapsiz-odeme")).toHaveLength(10);
    expect(within(tahsilatKabi()).getAllByTestId("hesapsiz-tahsilat")).toHaveLength(10);
    const tarihler = within(tahsilatKabi()).getAllByTestId("hesapsiz-tahsilat").map(s => s.textContent.slice(0, 10));
    expect(tarihler[0]).toBe("12/09/2026");
    expect(tarihler[9]).toBe("03/09/2026");
    sonraki(odemeKabi());
    expect(within(odemeKabi()).getAllByTestId("hesapsiz-odeme")).toHaveLength(2);
    expect(aktif(odemeKabi())).toBe("2");
    expect(aktif(tahsilatKabi())).toBe("1");
  });
  it("AC-20: sayfa 2'deyken toplu düğme listenin tamamına uygulanır; etiket ve onay \"Listedeki\" der; hesap ata sayfa 2'de satır başına çalışır", () => {
    let st;
    render(<HesapsizH onState={s => { st = s; }} />);
    fireEvent.click(screen.getByText("Listeyi göster"));
    sonraki(tahsilatKabi());
    const ikinci = within(tahsilatKabi()).getAllByTestId("hesapsiz-tahsilat");
    expect(ikinci).toHaveLength(3);
    fireEvent.change(within(ikinci[0]).getByLabelText("Hesap ata: Kutu Gıda"), { target: { value: "51" } });
    expect(st.services.filter(s => s.hesapId === 51).map(s => s.id)).toEqual([301]); // yalnız o satır (02/09)
    fireEvent.click(screen.getByText("Ödemeleri göster"));
    sonraki(odemeKabi());
    const dugme = screen.getByLabelText("Listedeki ödemeleri kapsam dışı bırak");
    expect(dugme.textContent).toBe("Listedeki 12 kaydı kapsam dışı bırak");
    expect(document.body.textContent).not.toMatch(/Görünen/);
    fireEvent.click(dugme);
    expect(screen.getByText("Listedeki kayıtlar kapsam dışı bırakılsın mı?")).toBeTruthy();
    expect(screen.getByText(/kaydı kapsam dışı bırakılacak/).textContent).toMatch(/^12 ödeme kaydı kapsam dışı bırakılacak\./);
    fireEvent.click(screen.getByText("Kapsam Dışı Bırak"));
    expect(st.kasaKapsamDisi).toHaveLength(12);
    expect(screen.getByTestId("bos-hesapsiz-odeme")).toBeTruthy(); // AC-15/AC-30: boş sayfa değil, boş durum
    cubukYok(odemeKabi());
  });
  it("AC-42 / AC-30: kapsam dışı listesi sayfalanır; satır azalınca sayfa kırpılır, boş sayfa görünmez", () => {
    render(<HesapsizH />);
    fireEvent.click(screen.getByText("Ödemeleri göster"));
    fireEvent.click(screen.getByLabelText("Listedeki ödemeleri kapsam dışı bırak"));
    fireEvent.click(screen.getByText("Kapsam Dışı Bırak"));
    fireEvent.click(screen.getByText("Göster"));
    const kap = () => screen.getByTestId("kapsam-disi-listesi");
    expect(within(kap()).getAllByTestId("kapsam-disi-kayit")).toHaveLength(10);
    sonraki(kap());
    expect(within(kap()).getAllByTestId("kapsam-disi-kayit")).toHaveLength(2);
    fireEvent.click(within(kap()).getAllByText("Kapsama al")[0]);
    fireEvent.click(within(kap()).getAllByText("Kapsama al")[0]);
    expect(aktif(kap())).toBeNull(); // 10 kayıt kaldı: tek sayfa, çubuk yok (AC-16)
    expect(within(kap()).getAllByTestId("kapsam-disi-kayit")).toHaveLength(10);
  });
  it("triyaj: liste boşalıp \"Kapsama al\" ile yeniden dolunca ekran eski sayfaya atlamaz, 1. sayfada açılır", () => {
    render(<HesapsizH />);
    fireEvent.click(screen.getByText("Ödemeleri göster"));
    sonraki(odemeKabi());
    expect(aktif(odemeKabi())).toBe("2");
    fireEvent.click(screen.getByLabelText("Listedeki ödemeleri kapsam dışı bırak"));
    fireEvent.click(screen.getByText("Kapsam Dışı Bırak"));
    expect(screen.getByTestId("bos-hesapsiz-odeme")).toBeTruthy();
    fireEvent.click(screen.getByText("Göster"));
    const kap = () => screen.getByTestId("kapsam-disi-listesi");
    for (let i = 0; i < 12; i++) fireEvent.click(within(kap()).getAllByText("Kapsama al")[0]);
    expect(within(odemeKabi()).getAllByTestId("hesapsiz-odeme")).toHaveLength(10);
    expect(aktif(odemeKabi())).toBe("1");
  });
  it("AC-41: \"Hepsini göster\" değişince hesapsız liste sayfa 1'e döner", () => {
    render(<HesapsizH esik="2026-02-01" />);
    fireEvent.click(screen.getByText("Listeyi göster"));
    sonraki(tahsilatKabi());
    expect(aktif(tahsilatKabi())).toBe("2");
    fireEvent.click(screen.getByText("Hepsini göster"));
    expect(aktif(tahsilatKabi())).toBe("1");
    expect(within(tahsilatKabi()).getAllByTestId("hesapsiz-tahsilat")).toHaveLength(10);
  });
});

// ── Çek portföyü ──
const alinan = (i) => ({ id: 800 + i, yon: "alinan", paymentId: null, no: `A${i}`, banka: "Ziraat", tur: "hamiline", durum: "portfoy", tutar: 1000, currency: "TRY",
  vadeTarihi: `2026-11-${String(i).padStart(2, "0")}`, tarih: "2026-09-01", kimden: "Bayi", gecmis: [] });
const verilen = (i) => ({ id: 900 + i, yon: "verilen", paymentId: null, no: `V${i}`, banka: "Vakıf", durum: "yazildi", tutar: 500, currency: "TRY", hesapId: 51,
  vadeTarihi: `2026-12-${String(i).padStart(2, "0")}`, tarih: "2026-09-01", alacakliTur: "serbest", alacakliAd: "Tedarik", gecmis: [] });

describe("Spec 0062: çek portföyü (R3, R13, R24, R28)", () => {
  it("AC-4 / AC-41: alınan ve verilen iki ayrı sayfa durumu; sekme ve süzgeç değişince sayfa 1; toplam bütün listeden", () => {
    const cekler = [...Array.from({ length: 13 }, (_, i) => alinan(i + 1)), ...Array.from({ length: 12 }, (_, i) => verilen(i + 1))];
    render(<CekPortfoyu cekler={cekler} setCekler={vi.fn()} payments={[]} customers={[]} hesaplar={[HESAP(51, "Ziraat")]} giderAyarlari={{}} />);
    const kap = () => screen.getByTestId("cek-portfoyu");
    expect(screen.getAllByTestId("cek-satiri")).toHaveLength(10);
    expect(screen.getByTestId("portfoy-toplam").textContent).toMatch(/13\.000/);
    sonraki(kap());
    expect(screen.getAllByTestId("cek-satiri").map(s => s.textContent)).toEqual([expect.stringMatching(/A11/), expect.stringMatching(/A12/), expect.stringMatching(/A13/)]);
    expect(screen.getByTestId("portfoy-toplam").textContent).toMatch(/13\.000/);
    fireEvent.click(screen.getByRole("button", { name: "Tümü" }));
    expect(aktif(kap())).toBe("1"); // süzgeç (R28)
    sonraki(kap());
    fireEvent.click(screen.getByRole("tab", { name: "Verilen çekler" }));
    expect(aktif(kap())).toBe("1");
    expect(screen.getAllByTestId("verilen-cek-satiri")).toHaveLength(10);
    sonraki(kap());
    expect(screen.getAllByTestId("verilen-cek-satiri")).toHaveLength(2);
    expect(screen.getByTestId("verilen-toplam").textContent).toMatch(/6\.000/);
    fireEvent.click(screen.getByRole("tab", { name: "Alınan çekler" }));
    expect(aktif(kap())).toBe("1");
  });
});

// ── Giderler: Gider Kalemleri ──
const TURLER = [{ id: 1, ad: "Hammadde", davranis: "normal" }, { id: 2, ad: "Enerji", davranis: "normal" }, { id: 3, ad: "Personel", davranis: "personel" }];
const turMap = turHaritasi(TURLER);
const TED = [{ id: 11, ad: "Demir Bant" }, { id: 12, ad: "Bölge Elektrik" }];
let nid = 5000;
const k = (f) => { const r = giderKalemDogrula(f, { turMap, tedarikciler: TED, uid: () => ++nid }); if (r.hatalar.length) throw new Error(JSON.stringify(r.hatalar)); return r.kayit; };
const KALEMLER = [
  ...Array.from({ length: 23 }, (_, i) => k({ id: 1 + i, tarih: i % 2 ? "2026-10-01" : "2026-10-02", turId: 1, tutar: 1000 + i, kdvOrani: 20, tedarikciId: 11, aciklama: `Sac ${i + 1}`, sonOdemeTarihi: "2026-10-20" })),
  k({ id: 40, tarih: "2026-10-01", turId: 2, tutar: 777, kdvOrani: 20, tedarikciId: 12, aciklama: "Elektrik", sonOdemeTarihi: "2026-10-20" }),
  k({ id: 41, tarih: "2026-10-02", turId: 2, tutar: 888, kdvOrani: 20, tedarikciId: 12, aciklama: "Doğalgaz", sonOdemeTarihi: "2026-10-20" }),
  ...[1, 2, 3].map(i => k({ id: 60 + i, tarih: "2026-10-01", turId: 3, calisanId: 20 + i, calisanAd: `Çalışan ${i}`, resmiTutar: 30000, eldenTutar: 0, sonOdemeTarihi: "2026-10-05" })),
];
function GiderH({ g0 = KALEMLER }) {
  const [giderler, setGiderler] = useState(g0);
  const [hesapHareketleri, setHesapHareketleri] = useState([]);
  return <Giderler giderler={giderler} setGiderler={setGiderler} hesapHareketleri={hesapHareketleri} setHesapHareketleri={setHesapHareketleri} giderTanimlari={[]} setGiderTanimlari={vi.fn()}
    giderTurleri={TURLER} tedarikciler={TED} setTedarikciler={vi.fn()} standartGiderler={[]} setStandartGiderler={vi.fn()} calisanlar={[]} standardModels={[]} customModels={[]}
    appSettings={{ giderAyarlari: { yururlukAy: "2026-01" } }} kasaHesaplari={[]}
    satisVerisi={{ customers: [], services: [], partSales: [], payments: [], teklifler: [], dealers: [], yedekParcaSatislar: [] }} showToast={vi.fn()} />;
}
const liste = () => screen.getByTestId("kalem-listesi");
const govdeSatirlari = () => liste().querySelectorAll("tbody tr");
const altToplam = () => liste().querySelector("tfoot").textContent;

describe("Spec 0062: Gider Kalemleri (R4, R13, R16, R20, R26 a, R32)", () => {
  it("AC-5 / AC-31 / AC-44: çizilen satır kümesi sayfalanır; personel grubu tek satır, başlıktaki kalem sayısı veri gerçeği", () => {
    render(<GiderH />);
    expect(liste().textContent).toMatch(/· 28 kalem/);
    expect(govdeSatirlari()).toHaveLength(10); // grup satırı + 9 kalem; 26 çizim satırı → 3 sayfa
    expect(within(liste()).getByText("3")).toBeTruthy();
    fireEvent.click(within(liste()).getByText("3"));
    expect(govdeSatirlari()).toHaveLength(6);
    fireEvent.click(within(liste()).getByText("1"));
    fireEvent.click(within(liste()).getByText(/Çalışanları göster/));
    expect(aktif(liste())).toBe("1"); // aç/kapa sayfayı korur (R28)
    fireEvent.click(within(liste()).getByText("3"));
    expect(govdeSatirlari()).toHaveLength(9); // 29 çizim satırı
    expect(liste().textContent).toMatch(/· 28 kalem/);
  });
  it("AC-17 / AC-32 / AC-18: alt toplam ve dönem kartları sayfa 1/2'de, personel açık ya da kapalı aynı", () => {
    render(<GiderH />);
    const toplam = altToplam();
    const kart = screen.getByText("Toplam gider (KDV hariç)").parentElement.textContent;
    sonraki(liste());
    expect(altToplam()).toBe(toplam);
    expect(screen.getByText("Toplam gider (KDV hariç)").parentElement.textContent).toBe(kart);
    fireEvent.click(within(liste()).getByText("1"));
    fireEvent.click(within(liste()).getByText(/Çalışanları göster/));
    sonraki(liste());
    expect(altToplam()).toBe(toplam);
  });
  it("AC-29 / AC-14: tür, tedarikçi, ödeme ve arama süzgeci değişince sayfa 1", () => {
    render(<GiderH />);
    const dene = (fn) => { sonraki(liste()); expect(aktif(liste())).toBe("2"); fn(); };
    dene(() => fireEvent.change(within(liste()).getByLabelText("Tür filtresi"), { target: { value: "1" } }));
    expect(aktif(liste())).toBe("1");
    dene(() => fireEvent.change(within(liste()).getByLabelText("Tedarikçi filtresi"), { target: { value: "11" } }));
    expect(aktif(liste())).toBe("1");
    dene(() => fireEvent.change(within(liste()).getByLabelText("Ödeme filtresi"), { target: { value: "odenmedi" } }));
    expect(aktif(liste())).toBe("1");
    dene(() => fireEvent.change(within(liste()).getByLabelText("Açıklama ara"), { target: { value: "Sac" } }));
    expect(aktif(liste())).toBe("1");
  });
  it("AC-28: dönem (Ay ↔ Tarih Aralığı) değişince sayfa 1", () => {
    render(<GiderH />);
    sonraki(liste());
    expect(aktif(liste())).toBe("2");
    fireEvent.click(screen.getByText("Tarih Aralığı"));
    expect(aktif(liste())).toBe("1");
    sonraki(liste());
    fireEvent.click(screen.getByText("Ay"));
    expect(aktif(liste())).toBe("1");
  });
  it("AC-15: süzgece uyan kalem yoksa çubuk yok, bugünkü boş metin duruyor", () => {
    render(<GiderH />);
    fireEvent.change(within(liste()).getByLabelText("Açıklama ara"), { target: { value: "yokboyle" } });
    expect(within(liste()).getByText("Filtreye uyan kalem yok.")).toBeTruthy();
    cubukYok(liste());
  });
});

// ── Tedarikçiler, Makina ve Model, Makina Kârlılığı ──
describe("Spec 0062: Giderler'in diğer listeleri (R5, R6, R7, R26 b)", () => {
  it("AC-8 / AC-16: Tedarikçiler sayfalanır (arama yok); 10 tedarikçide çubuk yok", () => {
    const ted = (n) => Array.from({ length: n }, (_, i) => ({ id: 100 + i, ad: `Tedarikçi ${String(i + 1).padStart(2, "0")}` }));
    const { unmount } = render(<Tedarikciler tedarikciler={ted(12)} setTedarikciler={vi.fn()} giderler={[]} giderTanimlari={[]} rapor={null} hesapHareketleri={[]} />);
    const kap = screen.getByTestId("tedarikciler");
    expect(kap.querySelectorAll("tbody tr")).toHaveLength(10);
    sonraki(kap);
    expect([...kap.querySelectorAll("tbody tr")].map(r => r.textContent)).toEqual([expect.stringMatching(/Tedarikçi 11/), expect.stringMatching(/Tedarikçi 12/)]);
    expect(kap.textContent).toMatch(/Tedarikçiler · 12/);
    unmount();
    render(<Tedarikciler tedarikciler={ted(10)} setTedarikciler={vi.fn()} giderler={[]} giderTanimlari={[]} rapor={null} hesapHareketleri={[]} />);
    cubukYok(screen.getByTestId("tedarikciler"));
  });
  it("AC-7: Makina ve Model'in makina listesi sayfalanır; dönem anahtarı değişince 1. sayfa; kova kartları sayfadan bağımsız", () => {
    const rapor = { kovalar: { makina: 1200, model: 0, dagitma: 0, ortak: 0 }, toplam: 1200, modelBazli: [], dagitmaKalemleri: [], kismiOrtak: [], dusenAtamalar: [],
      makinaBazli: Array.from({ length: 12 }, (_, i) => ({ anahtar: `m${i}`, makina: { tur: "stok", model: "AK100", seri: `S${i + 1}` }, kalemler: [], toplam: 100 })) };
    const { rerender } = render(<MakinaModelGorunumu rapor={rapor} turMap={turMap} donemAnahtari="ay|a" />);
    expect(screen.getAllByText(/^AK100 · Seri S\d+$/)).toHaveLength(10);
    sonraki(document.body);
    expect(screen.getAllByText(/^AK100 · Seri S\d+$/).map(e => e.textContent)).toEqual(["AK100 · Seri S11", "AK100 · Seri S12"]);
    expect(screen.getByText("12 makina")).toBeTruthy();
    rerender(<MakinaModelGorunumu rapor={rapor} turMap={turMap} donemAnahtari="ay|b" />);
    expect(aktif(document.body)).toBe("1");
  });
  it("AC-6: Makina Kârlılığı listesi sayfalanır; dönem toplamı bütün makinalardan", () => {
    const mus = (id) => ({ id, name: `Firma ${id}`, model: "AK100", serialNo: `S${id}`, installDate: "2026-03-20", fabrikaSatisBedeli: 500000, currency: "TRY", uretimTarihi: "2026-03-05" });
    const sonuc = hesaplaMakinaMaliyetleri({ customers: Array.from({ length: 12 }, (_, i) => mus(i + 1)), stock: [], giderler: [], giderTurleri: [{ id: 1, ad: "Genel", davranis: "normal" }],
      standartGiderler: [], standardModels: [{ model: "AK100" }], customModels: [], giderAyarlari: { yururlukAy: "2026-01" } }, { bugun: "2026-09-24" });
    render(<MakinaKarliligi sonuc={sonuc} baslangic="2026-03-01" bitis="2026-03-31" bugun="2026-09-24" modeller={[{ model: "AK100" }]} />);
    const tablo = screen.getByTestId("karlilik-tablosu");
    const toplam = screen.getByTestId("karlilik-toplam").textContent;
    expect(toplam).toMatch(/6\.000\.000/);
    expect(tablo.querySelectorAll("tbody tr")).toHaveLength(11); // 10 makina + dönem toplamı
    sonraki(screen.getByTestId("makina-karliligi"));
    expect(tablo.querySelectorAll("tbody tr")).toHaveLength(3);
    expect(screen.getByTestId("karlilik-toplam").textContent).toBe(toplam);
  });
});

// ── Açık kalemler ──
describe("Spec 0062: Açık kalemler (R10, R13, R32)", () => {
  it("AC-11 / AC-41: liste sayfalanır; kova süzmesi değişince 1. sayfa; personel toplu satırı tek satır, adlar sayfayı korur", () => {
    const g = [...Array.from({ length: 12 }, (_, i) => k({ id: 200 + i, tarih: "2026-09-20", turId: 1, tutar: 100, kdvOrani: 0, tedarikciId: 11, aciklama: `Yeni ${i}` })),
      ...[1, 2].map(i => k({ id: 230 + i, tarih: "2026-06-01", turId: 1, tutar: 100, kdvOrani: 0, tedarikciId: 11, aciklama: `Eski ${i}` })),
      ...[1, 2].map(i => k({ id: 260 + i, tarih: "2026-09-30", turId: 3, calisanId: i, calisanAd: `Kişi ${i}`, resmiTutar: 100, eldenTutar: 0 }))];
    render(<AcikKalemler giderler={g} giderTurleri={TURLER} tedarikciler={TED} yururlukAy="2026-01" bugun="2026-10-02" />);
    const kap = () => screen.getByTestId("acik-kalem-listesi");
    expect(within(kap()).getAllByTestId("acik-kalem-satiri")).toHaveLength(10);
    const toplam = screen.getByTestId("acik-toplam").textContent;
    sonraki(kap());
    expect(within(kap()).getAllByTestId("acik-kalem-satiri")).toHaveLength(4);
    expect(within(kap()).getByTestId("acik-personel-toplu")).toBeTruthy(); // 14 + 1 toplu = 15 satır
    expect(screen.getByTestId("acik-toplam").textContent).toBe(toplam);
    fireEvent.click(within(within(kap()).getByTestId("acik-personel-toplu")).getByText(/Adları göster/));
    expect(aktif(kap())).toBe("2");
    expect(within(kap()).getAllByTestId("acik-kalem-satiri")).toHaveLength(6);
    fireEvent.click(screen.getAllByTestId("kova-karti").find(b => b.textContent.startsWith("0-30 gün")));
    expect(aktif(kap())).toBe("1");
  });
});

// ── Pencereler: ekstre ve hatırlatma ──
describe("Spec 0062: pencere içi listeler (R8, R9, R30, R31, R32)", () => {
  it("AC-9 / AC-23 / AC-33 / AC-43: ekstre 5 satırlık sayfalanır, eskiden yeniye; devir yalnız 1. sayfada; son bakiye ve devir sayfadan bağımsız; tarih aralığı 1. sayfaya döndürür", () => {
    const satirlar = Array.from({ length: 12 }, (_, i) => ({ tarih: gun(i + 1), tur: "borc", kalem: { aciklama: `Fatura ${i + 1}`, tarih: gun(i + 1) }, etkiK: 10000, bakiyeK: 50000 + 10000 * (i + 1) }));
    const hesapla = (a) => ({ satirlar, devirK: a.bas ? 50000 : null, bakiyeK: 170000 });
    render(<EkstrePenceresi baslik="Demir Bant" tur="tedarikci" hesapla={hesapla} onClose={vi.fn()} />);
    const kap = screen.getByTestId("ekstre-penceresi");
    const tarihler = () => within(kap).getAllByTestId("ekstre-satiri").map(s => s.textContent.slice(0, 10));
    expect(tarihler()).toEqual(["01/09/2026", "02/09/2026", "03/09/2026", "04/09/2026", "05/09/2026"]);
    const ozet = screen.getByTestId("ekstre-ozet").textContent;
    expect(ozet).toMatch(/1\.700/);
    const tarihAlanlari = kap.querySelectorAll('input[type="date"]');
    sonraki(kap);
    fireEvent.change(tarihAlanlari[0], { target: { value: "2026-08-01" } });
    expect(aktif(kap)).toBe("1");
    expect(within(kap).getByTestId("ekstre-devir")).toBeTruthy();
    sonraki(kap);
    expect(within(kap).queryByTestId("ekstre-devir")).toBeNull();
    expect(tarihler()).toEqual(["06/09/2026", "07/09/2026", "08/09/2026", "09/09/2026", "10/09/2026"]);
    expect(screen.getByTestId("ekstre-ozet").textContent).toBe(ozet);
  });
  it("AC-10 / AC-44: hatırlatma penceresi bölüm başına 5 satırlık ayrı sayfalanır; personel grubu tek satır", () => {
    const o = (id, gunFarki) => ({ id, anahtar: `k${id}`, taraf: `Tedarikçi ${id}`, personel: false, kalem: { id, aciklama: `Kalem ${id}` }, odenecek: 100, vade: "2026-10-01", vadeEtiketi: "Vade", gunFarki, hedef: "ana" });
    const personel = { tur: "personel", adet: 2, odenecek: 200, vade: "2026-10-05", kalemler: [{ ...o(91, 3), personel: true, taraf: "Kişi 1" }, { ...o(92, 3), personel: true, taraf: "Kişi 2" }] };
    const sonuc = { sayilar: { gecmis: 7, yaklasan: 6 }, esikGun: 7,
      gecmisSatirlar: Array.from({ length: 7 }, (_, i) => o(i + 1, -1)), yaklasanSatirlar: [...Array.from({ length: 4 }, (_, i) => o(20 + i, 2)), personel] };
    render(<OdemeHatirlatmaPenceresi sonuc={sonuc} odendiYetkisi={false} onOdendi={vi.fn()} onClose={vi.fn()} />);
    const gecmis = screen.getByTestId("hatirlatma-bolum-gecmis"), yaklasan = screen.getByTestId("hatirlatma-bolum-yaklasan");
    expect(within(gecmis).getAllByTestId("hatirlatma-satiri")).toHaveLength(5);
    expect(within(yaklasan).getAllByTestId("hatirlatma-satiri")).toHaveLength(4);
    expect(within(yaklasan).getByTestId("hatirlatma-personel")).toBeTruthy(); // 4 + grup satırı = 5, tek sayfa
    cubukYok(yaklasan);
    sonraki(gecmis);
    expect(within(gecmis).getAllByTestId("hatirlatma-satiri")).toHaveLength(2);
    expect(within(gecmis).getByText(/Vadesi geçmiş \(7\)/)).toBeTruthy(); // başlık bütün listeden
    fireEvent.click(within(yaklasan).getByText(/Çalışanları göster/));
    expect(within(yaklasan).getAllByTestId("hatirlatma-satiri")).toHaveLength(4); // 7 çizim satırı → 2. sayfada 2 çalışan
    sonraki(yaklasan);
    expect(within(yaklasan).getAllByTestId("hatirlatma-satiri").map(s => s.textContent)).toEqual([expect.stringMatching(/Kişi 1/), expect.stringMatching(/Kişi 2/)]);
    expect(aktif(gecmis)).toBe("2"); // iki bölümün sayfası ayrı (R24)
  });
});
