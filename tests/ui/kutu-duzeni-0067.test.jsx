// @vitest-environment jsdom
// Spec 0067: Giderler › Dönem Raporu'nun kutu sırası ve müşteri detayından "Maliyet ve Kâr" kutusunun kaldırılması.
// Gerçek Giderler ve Customers bileşenleri.
process.env.TZ = "Europe/Istanbul";
import { describe, it, expect, vi, afterEach, beforeEach, beforeAll } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { useState } from "react";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { Giderler } from "../../src/components/Giderler";
import { Customers } from "../../src/components/Customers";
import { giderKalemDogrula, turHaritasi } from "../../src/lib/gider";
import { hesaplaMakinaMaliyetleri, makinaKarlilik, karlilikOzeti } from "../../src/lib/makinaMaliyeti";

beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); });
afterEach(() => { cleanup(); vi.useRealTimers(); });
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-10-02T10:00:00")); });

const kok = resolve(__dirname, "../..");
const oku = (f) => readFileSync(resolve(kok, f), "utf-8");
const once = (a, b) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

// ── Giderler ──
const TURLER = [{ id: 1, ad: "Hammadde", davranis: "normal" }];
const turMap = turHaritasi(TURLER);
const TED = [{ id: 11, ad: "Demir Bant" }];
let nid = 7000;
const k = (f) => { const r = giderKalemDogrula(f, { turMap, tedarikciler: TED, uid: () => ++nid }); if (r.hatalar.length) throw new Error(JSON.stringify(r.hatalar)); return r.kayit; };
const EKIM = [k({ id: 1, tarih: "2026-10-01", turId: 1, tutar: 1000, kdvOrani: 20, tedarikciId: 11, aciklama: "Sac", sonOdemeTarihi: "2026-10-20" })];
const EYLUL = [k({ id: 2, tarih: "2026-09-05", turId: 1, tutar: 500, kdvOrani: 0, tedarikciId: 11, aciklama: "Eski", sonOdemeTarihi: "2026-09-10" })];
function GiderH({ g0 = EKIM, yururlukAy = "2026-01" }) {
  const [giderler, setGiderler] = useState(g0);
  const [hesapHareketleri, setHesapHareketleri] = useState([]);
  return <Giderler giderler={giderler} setGiderler={setGiderler} hesapHareketleri={hesapHareketleri} setHesapHareketleri={setHesapHareketleri} giderTanimlari={[]} setGiderTanimlari={vi.fn()}
    giderTurleri={TURLER} tedarikciler={TED} setTedarikciler={vi.fn()} standartGiderler={[]} setStandartGiderler={vi.fn()} calisanlar={[]} standardModels={[]} customModels={[]}
    appSettings={{ giderAyarlari: { yururlukAy } }} kasaHesaplari={[]}
    satisVerisi={{ customers: [], services: [], partSales: [], payments: [], teklifler: [], dealers: [], yedekParcaSatislar: [] }} showToast={vi.fn()} />;
}

describe("Spec 0067 A: Dönem Raporu'nun kutu sırası (R1–R5)", () => {
  it("AC-1 / AC-2 / AC-3 / AC-23: özet kartları → kalem listesi → borç özeti (tam genişlik) → kovalar → kırılım kartları", () => {
    render(<GiderH />);
    const ozet = screen.getByText("Toplam gider (KDV hariç)"), liste = screen.getByTestId("kalem-listesi"), borc = screen.getByTestId("borc-ozeti");
    const kova = screen.getByText("Makina Maliyeti Kovaları"), tedarikci = screen.getByTestId("tedarikci-kirilimi");
    expect(once(ozet, liste)).toBe(true);
    expect(once(liste, borc)).toBe(true);
    expect(once(borc, kova)).toBe(true);
    expect(once(kova, tedarikci)).toBe(true);
    // Borç özeti bir kart satırının içinde değil: kalem listesiyle aynı sütun kabının doğrudan çocuğu, flex tabanı yok.
    expect(borc.parentElement).toBe(liste.parentElement);
    expect(borc.style.flex).toBe("");
    expect(tedarikci.parentElement.contains(borc)).toBe(false);
  });
  it("AC-6 / AC-29: iki boş durum dalı da (yürürlük öncesi ve kayıtsız dönem) BosDurum + borç özeti çizer (R4, R25)", () => {
    render(<GiderH g0={EYLUL} yururlukAy="2026-11" />);
    expect(screen.getByText("Gider verisi girilmemiş")).toBeTruthy();
    expect(screen.getByTestId("borc-ozeti")).toBeTruthy();
    cleanup();
    render(<GiderH g0={EYLUL} />);
    expect(screen.getByText("Bu dönemde gider kaydı yok")).toBeTruthy();
    expect(screen.getAllByTestId("borc-ozeti")).toHaveLength(1);
    expect(screen.queryByTestId("kalem-listesi")).toBeNull();
  });
  it("AC-7 / AC-29: açık kalemler kipi AcikKalemler → borç özeti; hatırlatma kipinde borç özeti yok", () => {
    render(<GiderH g0={[...EKIM, ...EYLUL]} />);
    fireEvent.click(screen.getByTestId("acik-kalemler-dugmesi"));
    expect(once(screen.getByTestId("acik-kalemler"), screen.getByTestId("borc-ozeti"))).toBe(true);
    fireEvent.click(screen.getByTestId("acik-kalemler-dugmesi"));
    fireEvent.click(screen.getAllByText(/^Hatırlatma kapsamı/).find(e => e.tagName === "BUTTON"));
    expect(screen.getByTestId("kalem-listesi")).toBeTruthy();
    expect(screen.queryByTestId("borc-ozeti")).toBeNull();
  });
  it("AC-5 / AC-28: KalemListesi'ne geçen props değişmedi (yalnız konumu); kart rakamları aynı", () => {
    const g = oku("src/components/Giderler.jsx");
    expect(g).toContain(`<KalemListesi kalemler={rapor.kalemler} giderTurleri={giderTurleri} tedarikciler={tedarikciler} stock={stock} customers={customers}
                  standardModels={standardModels} customModels={customModels} bugun={bugun} canDo={canDo}
                  onDuzenle={(k) => setForm({ kalemId: k.id })} onSil={setSilinecek} onOdendi={odemeGirisi ? odendiDegistir : null} onOdemePlani={(k) => setPlanKalemId(k.id)} onHedefDegistir={odemeGirisi ? hedefDegistir : null}
                  odemeFiltre={odemeFiltre} onOdemeFiltre={setOdemeFiltre} hatirlatma={hatirlatma} yontemKirilimlari={kirilimlar} donemAnahtari={donemAnahtari} />`);
    render(<GiderH />);
    expect(screen.getByText("Toplam gider (KDV hariç)").parentElement.textContent).toMatch(/1\.000 ₺/);
    expect(within(screen.getByTestId("borc-ozeti")).getByText("Demir Bant")).toBeTruthy();
    expect(screen.getByTestId("borc-ozeti").textContent).toMatch(/1\.200 ₺/);
  });
  it("AC-33: BorcOzeti flex stili taşımaz", () => {
    const s = oku("src/components/gider/DonemRaporu.jsx");
    const satir = s.split("\n").find(l => l.includes('title="Kime Ne Kadar Borçluyuz"'));
    expect(satir).toContain("style={{ minWidth: 0 }}");
    expect(satir).not.toMatch(/flex:/);
  });
});

// ── Müşteri detayı ──
const TUR = [{ id: 1, ad: "Genel", davranis: "normal" }];
const makina = { id: 1, name: "Kutu Gıda", model: "AK100", serialNo: "K-1", installDate: "2026-03-20", fabrikaSatisBedeli: 500000, currency: "TRY", komisyon: 15000, uretimTarihi: "2026-03-05" };
const VERI = { giderler: [{ id: 1, tarih: "2026-03-10", turId: 1, tutar: 60000 }, { id: 2, tarih: "2026-03-11", turId: 1, tutar: 20000, atamaTur: "makina", makinaTur: "musteri", makinaId: 1 }] };
const hesapla = () => hesaplaMakinaMaliyetleri({ customers: [makina], stock: [], giderTurleri: TUR, standartGiderler: [], standardModels: [{ model: "AK100" }], customModels: [],
  giderAyarlari: { yururlukAy: "2026-01" }, ...VERI }, { bugun: "2026-09-24" });
function DetayH(props) {
  const [id, setId] = useState(null);
  return (
    <div>
      <button onClick={() => setId(1)}>aç</button>
      <Customers customers={[makina]} setCustomers={() => {}} services={[]} setServices={() => {}} dealers={[]} models={[]} factory={{ name: "Altuntaş" }}
        parts={[]} partSales={[]} setPartSales={() => {}} yedekParcaSatislar={[]} setYedekParcaSatislar={() => {}} initialDetailId={id} {...props} />
    </div>
  );
}
const detayMetni = (props) => {
  render(<DetayH {...props} />);
  fireEvent.click(screen.getByText("aç"));
  const t = document.body.textContent;
  cleanup();
  return t;
};

describe("Spec 0067 B: müşteri detayında maliyet kutusu yok (R6–R10, R17, R22)", () => {
  it("AC-8 / AC-14 / AC-13: gider yetkisi ve maliyet verisiyle açılsa da kutu yok; render yetkisiz açılışla birebir aynı", () => {
    render(<DetayH giderYetki makinaMaliyet={hesapla()} rates={{ usd: 40 }} />);
    fireEvent.click(screen.getByText("aç"));
    expect(screen.getAllByText("Kutu Gıda").length).toBeGreaterThan(0);
    expect(screen.queryByTestId("maliyet-kar-kutusu")).toBeNull();
    expect(screen.queryByText("Maliyet ve Kâr")).toBeNull();
    expect(screen.queryByTestId("maliyet-detay")).toBeNull();
    cleanup();
    expect(detayMetni({ giderYetki: true, makinaMaliyet: hesapla() })).toBe(detayMetni({ giderYetki: false }));
  });
  it("AC-10 / AC-27: maliyet ve kârlılık rakamları değişmedi (motor çıktısı sabit)", () => {
    const d = makinaKarlilik(hesapla(), "musteri:1", null);
    expect(d.toplamMaliyet).toBe(95000);
    expect(d.kar).toBe(405000);
    const oz = karlilikOzeti(hesapla(), { baslangic: "2026-03-01", bitis: "2026-03-31", rates: null });
    expect(oz.toplam).toMatchObject({ satisBedeli: 500000, toplamMaliyet: 95000, kar: 405000 });
  });
  it("AC-18 / AC-19 / AC-20 / AC-21 / AC-34: prop zinciri temizlendi, rates Customers'ta, App memo ve Giderler geçişi, MakinaKarliligi çağrısı yerinde", () => {
    const cdm = oku("src/components/customers/CustomerDetailModal.jsx");
    expect(cdm).not.toMatch(/MakinaMaliyetDetay|makinaKarlilik|\bmakinaMaliyet\b|\brates\b/);
    const cus = oku("src/components/Customers.jsx");
    expect(cus).not.toMatch(/\bmakinaMaliyet\b/);
    expect(cus).toMatch(/satisKuruUygula\(null, clean, rates, today\(\)\)/);
    expect(cus).not.toMatch(/<CustomerDetailModal[\s\S]{0,4000}rates=\{rates\}/);
    const app = oku("src/App.jsx");
    expect(app).toMatch(/const makinaMaliyet = useMemo\(\(\) => \(giderYetki \? hesaplaMakinaMaliyetleri/);
    expect(app.match(/makinaMaliyet=\{makinaMaliyet\}/g)).toHaveLength(1); // yalnız Giderler
    expect(app).not.toMatch(/<Customers [^\n]*makinaMaliyet=/);
    expect(oku("src/components/gider/MakinaKarliligi.jsx")).toContain("<MakinaMaliyetDetay detay={makinaKarlilik(sonuc, detayAnahtar, rates)} />");
  });
  it("AC-11 / AC-12 / AC-32: 'maliyetKutusuAcik' kaynakta yok; görüntü aracında maliyet-detay-* var, musteri-detay-maliyet-* ve MALIYET_0050 yok, musteri-detay-0067 var", () => {
    const tara = (d) => readdirSync(resolve(kok, d), { withFileTypes: true })
      .flatMap(e => (e.isDirectory() ? tara(`${d}/${e.name}`) : /\.(jsx?|cjs|mjs)$/.test(e.name) ? [`${d}/${e.name}`] : []));
    const bulunan = [...tara("src"), ...tara("scripts"), ...tara("tests")].filter(f => !f.endsWith("kutu-duzeni-0067.test.jsx") && oku(f).includes("maliyetKutusuAcik"));
    expect(bulunan).toEqual([]);
    const arac = oku("scripts/evidence/0009-sayfa.jsx");
    for (const e of ["maliyet-detay-personel", "maliyet-detay-parti-acik", "maliyet-detay-parti-kapali", "musteri-detay-0067"]) expect(arac).toContain(`"${e}":`);
    expect(arac).not.toMatch(/"musteri-detay-maliyet-|MALIYET_0050/);
  });
});
