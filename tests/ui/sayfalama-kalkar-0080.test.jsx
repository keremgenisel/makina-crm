// @vitest-environment jsdom
// Spec 0080: Gider Kalemleri ve Tedarikçiler listelerinde sayfalama kalkar. Gerçek bileşenler (Giderler, KalemListesi,
// Tedarikciler). 0062'nin bu iki listeye ait UI kriterlerinin ters hâlleri burada (plan P1).
process.env.TZ = "Europe/Istanbul";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { useState } from "react";
import fs from "node:fs";
import { Giderler } from "../../src/components/Giderler";
import { Tedarikciler } from "../../src/components/gider/Tedarikciler";
import { KalemListesi } from "../../src/components/gider/DonemRaporu";
import { giderKalemDogrula, turHaritasi } from "../../src/lib/gider";

afterEach(() => { cleanup(); vi.useRealTimers(); });
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-10-02T10:00:00")); });

const TURLER = [{ id: 1, ad: "Hammadde", davranis: "normal" }, { id: 2, ad: "Enerji", davranis: "normal" }, { id: 3, ad: "Personel", davranis: "personel" }];
const turMap = turHaritasi(TURLER);
const TED = [{ id: 11, ad: "Demir Bant" }, { id: 12, ad: "Bölge Elektrik" }];
let nid = 5000;
const k = (f) => { const r = giderKalemDogrula(f, { turMap, tedarikciler: TED, uid: () => ++nid }); if (r.hatalar.length) throw new Error(JSON.stringify(r.hatalar)); return r.kayit; };
const normal = (n, o = {}) => Array.from({ length: n }, (_, i) => k({ id: 1 + i, tarih: i % 2 ? "2026-10-01" : "2026-10-02", turId: 1, tutar: 1000 + i, kdvOrani: 20,
  tedarikciId: 11, aciklama: `Sac ${i + 1}`, sonOdemeTarihi: "2026-10-20", ...o }));
const personel = [1, 2, 3].map(i => k({ id: 60 + i, tarih: "2026-10-01", turId: 3, calisanId: 20 + i, calisanAd: `Çalışan ${i}`, resmiTutar: 30000, eldenTutar: 0, sonOdemeTarihi: "2026-10-05" }));

function GiderH({ g0 }) {
  const [giderler, setGiderler] = useState(g0);
  const [hesapHareketleri, setHesapHareketleri] = useState([]);
  return <Giderler giderler={giderler} setGiderler={setGiderler} hesapHareketleri={hesapHareketleri} setHesapHareketleri={setHesapHareketleri} giderTanimlari={[]} setGiderTanimlari={vi.fn()}
    giderTurleri={TURLER} tedarikciler={TED} setTedarikciler={vi.fn()} calisanlar={[]} standardModels={[]} customModels={[]}
    appSettings={{ giderAyarlari: { yururlukAy: "2026-01" } }} kasaHesaplari={[]}
    satisVerisi={{ customers: [], services: [], partSales: [], payments: [], teklifler: [], dealers: [], yedekParcaSatislar: [] }} showToast={vi.fn()} />;
}
const liste = () => screen.getByTestId("kalem-listesi");
const govdeSatirlari = () => liste().querySelectorAll("tbody tr");
const altToplam = () => liste().querySelector("tfoot").textContent;
const cubukYok = (kap) => {
  expect(within(kap).queryByText("Sonraki ›")).toBeNull();
  expect(within(kap).queryByText("‹ Önceki")).toBeNull();
};
const metin = (el) => el.textContent.replace(/\s+/g, " ").trim();

// ── AC-16 (R10) ve AC-3: makina çözümü ve toplamlar önce/sonra birebir ──
// "Önce" spec 0080'den ÖNCEKİ kodla (YAZ_0080=1) üretildi: o kod sayfalıydı, satırlar bütün sayfalar gezilerek toplandı.
// Yinelenen kimlik yok (plan P2: haritalı çözücü yalnız orada ayrılır).
const DOSYA = "tests/fixtures/0080-atama-once.json";
const STOK = [
  { id: 801, model: "AM-100", serialNo: "S-801" },
  { id: 802, model: "AM-200", serialNo: "S-802", deletedAt: "2026-09-01T00:00:00.000Z" },
  { id: 803, model: "AM-300", seriNo: "S-803" },
];
const MUSTERI = [
  { id: 901, name: "Örnek Gıda", model: "AM-100", serialNo: "M-901" },
  { id: 902, name: "Silinen Firma", model: "AM-200", serialNo: "M-902", deletedAt: "2026-09-01T00:00:00.000Z" },
  { id: 903, firma: "Stoktan Alan", model: "AM-400", serialNo: "S-804", sourceStockId: 804 },
  { id: 904, name: "Çöpteki Kaynak", model: "AM-500", serialNo: "S-805", sourceStockId: 805, deletedAt: "2026-09-01T00:00:00.000Z" },
  { id: 905, name: "Silinen Stoktan", model: "AM-200", serialNo: "S-802", sourceStockId: 802 },
];
const atamalar = [
  { atamaTur: "makina", makinaTur: "stok", makinaId: 801 },
  { atamaTur: "makina", makinaTur: "stok", makinaId: 802 },
  { atamaTur: "makina", makinaTur: "stok", makinaId: 803 },
  { atamaTur: "makina", makinaTur: "stok", makinaId: 804 },
  { atamaTur: "makina", makinaTur: "stok", makinaId: 805 },
  { atamaTur: "makina", makinaTur: "stok", makinaId: 999 },
  { atamaTur: "makina", makinaTur: "musteri", makinaId: 901 },
  { atamaTur: "makina", makinaTur: "musteri", makinaId: 902 },
  { atamaTur: "makina", makinaTur: "musteri", makinaId: 998 },
  { atamaTur: "makina", makinaTur: "musteri", makinaId: null },
  { atamaTur: "dagitma" },
  { atamaTur: "model", modelSatirlari: [{ modelAd: "AM-100", adet: 2, birimMaliyet: 100 }, { modelAd: "Yok Model", adet: 1, birimMaliyet: 50 }] },
  { atamaTur: "" },
];
const ATAMALI = [...normal(atamalar.length).map((x, i) => ({ ...x, ...atamalar[i] })), ...personel];
const kalemListesiCiz = () => render(<KalemListesi kalemler={ATAMALI} giderTurleri={TURLER} tedarikciler={TED} bugun="2026-10-02" canDo={() => true} onDuzenle={vi.fn()} onSil={vi.fn()} />);
// Sayfalı eski kodda bütün sayfaları gezer; sayfasız kodda tek okumadır.
const tumSatirlar = (kap) => {
  const satirlar = [...kap.querySelectorAll("tbody tr")].map(metin);
  for (let i = 0; i < 20; i++) {
    const d = within(kap).queryByText("Sonraki ›");
    if (!d || d.disabled) break;
    fireEvent.click(d);
    satirlar.push(...[...kap.querySelectorAll("tbody tr")].map(metin));
  }
  return satirlar;
};
const ozet = () => {
  const kap = screen.getByTestId("kalem-listesi");
  fireEvent.click(within(kap).getByText(/Çalışanları göster/));
  const ilkToplam = metin(kap.querySelector("tfoot"));
  return { baslik: metin(kap).match(/· \d+ kalem/)[0], altToplam: ilkToplam, satirlar: tumSatirlar(kap) };
};

describe("Spec 0080 R10: makina çözümü tek kez kurulur, çıktı birebir aynı", () => {
  // Spec 0090 R10 ile: atama sütunu kalktı (makina çözümü artık yapılmaz). Başlıktaki kalem sayısı, alt toplam ve satır sayısı
  // spec 0080 öncesiyle aynı; satırların atama metni yok. Tam satır metninin kıyası 0090'ın hücre düzeyinde ayıklanmış altınında.
  it("AC-16 / AC-3 (spec 0090 ile): başlıktaki kalem sayısı, alt toplam ve satır sayısı aynı; atama hücresi yok", () => {
    kalemListesiCiz();
    const simdi = ozet();
    const once = JSON.parse(fs.readFileSync(DOSYA, "utf8"));
    expect(simdi.baslik).toBe(once.baslik);
    expect(simdi.altToplam).toBe(once.altToplam);
    expect(simdi.satirlar).toHaveLength(once.satirlar.length);
    for (const atamaMetni of ["(stoktan satıldı)", "Atandığı makina silinmiş veya takip edilemiyor", "Makina Stoğu", "Örnek Gıda", "Ortak gider", "Dağıtılmasın"])
      expect(simdi.satirlar.some(x => x.includes(atamaMetni)), atamaMetni).toBe(false);
    expect(once.satirlar.some(x => x.includes("Örnek Gıda"))).toBe(true); // altın atamalıydı
  });
});

// ── Gider Kalemleri (R1, R3–R6) ──
describe("Spec 0080: Gider Kalemleri tek sayfada", () => {
  it("AC-1: personel kalemi olmayan on beş kalemli dönemde on beş satır, çubuk yok", () => {
    render(<GiderH g0={normal(15)} />);
    expect(govdeSatirlari()).toHaveLength(15);
    cubukYok(liste());
  });
  it("AC-2: yetmiş kalemli dönemde yetmiş satırın hepsi; 'Sonraki' ve 'Önceki' hiç yok", () => {
    render(<GiderH g0={normal(70)} />);
    expect(govdeSatirlari()).toHaveLength(70);
    expect(screen.getByText("Sac 70")).toBeTruthy();
    cubukYok(liste());
    expect(liste().querySelector(".page-num--active")).toBeNull();
  });
  it("AC-3: on beş kalemde alt toplam ve başlıktaki kalem sayısı bütün listeden", () => {
    render(<GiderH g0={normal(15)} />);
    expect(liste().textContent).toMatch(/· 15 kalem/);
    // 1000 + 1001 + … + 1014 = 15.105; KDV %20 = 3.021.
    expect(altToplam()).toMatch(/15\.105 ₺/);
    expect(altToplam()).toMatch(/3\.021 ₺/);
  });
  it("AC-4: personel grubu kapalıyken tek satır; açılınca çalışan satırlarının hepsi aynı sayfada", () => {
    render(<GiderH g0={[...normal(12), ...personel]} />);
    expect(govdeSatirlari()).toHaveLength(13); // grup + 12
    expect(screen.queryByText("Çalışan 1")).toBeNull();
    fireEvent.click(within(liste()).getByText(/Çalışanları göster/));
    expect(govdeSatirlari()).toHaveLength(16);
    for (const ad of ["Çalışan 1", "Çalışan 2", "Çalışan 3"]) expect(within(liste()).getByText(ad)).toBeTruthy();
    expect(liste().textContent).toMatch(/· 15 kalem/);
    cubukYok(liste());
  });
  it("AC-5: tür süzgeci yalnız uyanları çizer, sayfaya bağlı sıfırlama ya da atlama yok", () => {
    const enerji = [1, 2, 3].map(i => k({ id: 40 + i, tarih: "2026-10-01", turId: 2, tutar: 500, kdvOrani: 20, tedarikciId: 12, aciklama: `Elektrik ${i}`, sonOdemeTarihi: "2026-10-20" }));
    render(<GiderH g0={[...normal(14), ...enerji]} />);
    expect(govdeSatirlari()).toHaveLength(17);
    fireEvent.change(within(liste()).getByLabelText("Tür filtresi"), { target: { value: "2" } });
    expect([...govdeSatirlari()].map(r => r.textContent.match(/Elektrik \d/)?.[0])).toEqual(["Elektrik 1", "Elektrik 2", "Elektrik 3"]);
    fireEvent.change(within(liste()).getByLabelText("Tür filtresi"), { target: { value: "1" } });
    expect(govdeSatirlari()).toHaveLength(14);
    cubukYok(liste());
  });
  it("AC-6: uymayan arama metninde boş satır; tablo başlığı ve alt toplam duruyor, çubuk yok (R6/1)", () => {
    render(<GiderH g0={normal(15)} />);
    fireEvent.change(within(liste()).getByLabelText("Açıklama ara"), { target: { value: "yokboyle" } });
    expect(within(liste()).getByText("Filtreye uyan kalem yok.")).toBeTruthy();
    expect(liste().querySelector("thead")).toBeTruthy();
    expect(liste().querySelector("tfoot").textContent).toMatch(/Toplam/);
    expect(govdeSatirlari()).toHaveLength(1);
    cubukYok(liste());
  });
  it("AC-7: Tarih Aralığı'nda aralığın bütün kalemleri tek seferde", () => {
    const eylul = normal(8, { tarih: "2026-09-15" }).map((x, i) => ({ ...x, id: 300 + i, aciklama: `Eylül ${i + 1}` }));
    render(<GiderH g0={[...normal(12), ...eylul]} />);
    expect(govdeSatirlari()).toHaveLength(12);
    fireEvent.click(screen.getByText("Tarih Aralığı"));
    fireEvent.change(screen.getByLabelText("Başlangıç tarihi"), { target: { value: "2026-09-01" } });
    expect(govdeSatirlari()).toHaveLength(20);
    expect(within(liste()).getByText("Eylül 8")).toBeTruthy();
    cubukYok(liste());
  });
});

// ── Tedarikçiler (R2, R6/2) ──
const ted = (n) => Array.from({ length: n }, (_, i) => ({ id: 100 + i, ad: `Tedarikçi ${String(i + 1).padStart(2, "0")}` }));
const tedCiz = (t) => render(<Tedarikciler tedarikciler={t} setTedarikciler={vi.fn()} giderler={[]} giderTanimlari={[]} rapor={null} hesapHareketleri={[]} />);
describe("Spec 0080: Tedarikçiler tek sayfada", () => {
  it("AC-8: on dört tedarikçide on dört satır, çubuk yok", () => {
    tedCiz(ted(14));
    const kap = screen.getByTestId("tedarikciler");
    expect(kap.querySelectorAll("tbody tr")).toHaveLength(14);
    expect(within(kap).getByText("Tedarikçi 14")).toBeTruthy();
    cubukYok(kap);
  });
  it("AC-9: başlıktaki sayı canlı tedarikçiler; çöptekiler sayılmaz ve çizilmez", () => {
    tedCiz([...ted(12), { id: 999, ad: "Çöpteki", deletedAt: "2026-09-01T00:00:00.000Z" }]);
    const kap = screen.getByTestId("tedarikciler");
    expect(kap.textContent).toMatch(/Tedarikler ve Ekstre · 12/); // spec 0082 R13 ile güncellendi
    expect(kap.querySelectorAll("tbody tr")).toHaveLength(12);
    expect(within(kap).queryByText("Çöpteki")).toBeNull();
  });
  it("AC-10: hiç tedarikçi yokken bugünkü boş metin; tablo ve çubuk yok (R6/2)", () => {
    tedCiz([]);
    const kap = screen.getByTestId("tedarikciler");
    expect(kap.querySelector("table")).toBeNull();
    expect(kap.textContent).toMatch(/Tedarikler ve Ekstre · 0/); // spec 0082 R13 ile güncellendi
    cubukYok(kap);
  });
});

// Plan P3: ölçülen ~1,2 sn (çizim ~1,0 sn + süzgeç ~0,22 sn, 2026-10-13, M serisi Mac); eşik üç katı, en az 10 sn (CI payı).
const ESIK_MS = 10000;
// ── AC-15: jsdom vekil süre ölçümü (B1; gerçek gözlem sürüm sonrası elle) ──
describe("Spec 0080 AC-15 (jsdom vekil ölçüm)", () => {
  it("AC-15: 1.200 kalemli dönemde (bir yıllık aralığın temsili) liste çizimi ve bir süzgeç değişimi eşiğin altında (jsdom vekil ölçüm)", () => {
    const yil = Array.from({ length: 1200 }, (_, i) => k({ id: 10000 + i, tarih: "2026-10-01", turId: 1 + (i % 2), tutar: 100 + i, kdvOrani: 20,
      tedarikciId: 11 + (i % 2), aciklama: `Kalem ${i + 1}`, sonOdemeTarihi: "2026-10-20", ...(i % 5 === 0 ? { atamaTur: "makina", makinaTur: "stok", makinaId: 801 } : {}) }));
    const t0 = performance.now();
    render(<KalemListesi kalemler={yil} giderTurleri={TURLER} tedarikciler={TED} stock={STOK} customers={MUSTERI}
      standardModels={[]} customModels={[]} bugun="2026-10-02" canDo={() => true} onDuzenle={vi.fn()} onSil={vi.fn()} />);
    const t1 = performance.now();
    expect(govdeSatirlari()).toHaveLength(1200);
    // Süzgeç ölçümden önce bulunur: getByLabelText 1.200 satırlık DOM'u tarar ve ölçülen şey uygulama değil, test kütüphanesi olurdu.
    const turSuzgeci = liste().querySelector('select[aria-label="Tür filtresi"]');
    const t2a = performance.now();
    fireEvent.change(turSuzgeci, { target: { value: "2" } });
    const t2 = performance.now();
    expect(govdeSatirlari()).toHaveLength(600);
    console.log(`Spec 0080 AC-15 (jsdom): 1.200 kalem çizim ${Math.round(t1 - t0)} ms, süzgeç ${Math.round(t2 - t2a)} ms`);
    expect((t1 - t0) + (t2 - t2a)).toBeLessThan(ESIK_MS);
  }, 60000);
});
