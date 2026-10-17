// @vitest-environment jsdom
// Spec 0090 C16 (revizyon 3, K2) ve AC-36: iki altın spec 0090'dan ÖNCEKİ kodla üretildi (YAZ_0090=1 ile).
//  - tests/fixtures/0090-ekran-once.json: Dönem Raporu'nun kalem listesi ve tam ekran metni; atama sütununun hücreleri DOM'da
//    hücre düzeyinde, Makina Maliyeti Kovaları kutusu bütünüyle çıkarılarak. 0089'un altını düz metin olduğu için atama
//    hücreleri ondan ayıklanamıyordu; 0089 altını yenilenmez, rapor nesnesi, kalan dört kutu ve yazdırma HTML'i onunla ölçülür.
//  - tests/fixtures/0090-parti-once.json: bugünkü maliyet motorunun parti havuzu ve makina başı payı (AC-36 kıyası).
// Karşılaştırma modunda aynı ayıklama bugünkü koda da uygulanır (atama başlığı yoksa hiçbir hücre çıkmaz).
process.env.TZ = "Europe/Istanbul";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { useState } from "react";
import fs from "node:fs";
import { kutuAc } from "./kutuAc";
import { Giderler } from "../../src/components/Giderler";
import { hesaplaMakinaMaliyetleri } from "../../src/lib/makinaMaliyeti";
import { TURLER, TED, STANDART, OZEL, STOCK, KALEMLER, HAREKET, KDV, SATIS, BUGUN } from "../fixtures/0089-veri";
import * as V90 from "../fixtures/0090-veri";

const EKRAN_DOSYA = "tests/fixtures/0090-ekran-once.json";
const PARTI_DOSYA = "tests/fixtures/0090-parti-once.json";
const YAZ = process.env.YAZ_0090 === "1";

afterEach(() => { cleanup(); vi.useRealTimers(); });
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(`${BUGUN}T10:00:00`)); });

const metin = (el) => el.textContent.replace(/\s+/g, " ").trim();
function GH() {
  const [giderler, setGiderler] = useState(KALEMLER);
  const [hesapHareketleri, setHesapHareketleri] = useState(HAREKET);
  return <Giderler giderler={giderler} setGiderler={setGiderler} hesapHareketleri={hesapHareketleri} setHesapHareketleri={setHesapHareketleri} giderTanimlari={[]} setGiderTanimlari={vi.fn()}
    giderTurleri={TURLER} tedarikciler={TED} setTedarikciler={vi.fn()} calisanlar={[]} stock={STOCK} customers={[]} standardModels={STANDART} customModels={OZEL}
    appSettings={{ giderAyarlari: { yururlukAy: "2026-01" }, kdvRates: KDV }} kdvRates={KDV} kasaHesaplari={[]} satisVerisi={SATIS} showToast={vi.fn()} />;
}
const KUTULAR = ["Gider Türü Kırılımı", "KDV Karşılaştırması", "Tedarikçi Kırılımı", "Ödeme Yöntemi Kırılımı"];

// Kalem listesinden atama sütununu hücre düzeyinde çıkarır: başlığın sütun sırası bulunur, her satırda yalnız o sütunu
// TEK BAŞINA kaplayan hücre silinir (personel grup satırının açıklama + atama kaplayan hücresi açıklamadır, kalır).
const atamaSutunuCikar = (kap) => {
  for (const tablo of kap.querySelectorAll("table")) {
    const basliklar = [...tablo.querySelectorAll("thead th")];
    const i = basliklar.findIndex(th => metin(th) === "Atama");
    if (i < 0) continue;
    for (const tr of tablo.querySelectorAll("tr")) {
      let sutun = 0;
      for (const hucre of [...tr.children]) {
        const yayilim = Number(hucre.getAttribute("colspan") || hucre.colSpan || 1);
        if (sutun === i && yayilim === 1) { hucre.remove(); break; }
        sutun += yayilim;
        if (sutun > i) break;
      }
    }
  }
};
const ekranCiktisi = () => {
  const { container } = render(<GH />);
  for (const b of KUTULAR) kutuAc(b);
  const c = container.cloneNode(true);
  c.querySelectorAll('[data-testid="kova-karti"]').forEach(x => x.remove());
  // 0089'un kıyasıyla aynı ayıklama: görünüm çubuğunun kalkan düğmeleri (bu altın 0089 sonrası koddan, çubuk zaten iki düğme).
  atamaSutunuCikar(c);
  return { tam: metin(c), kalemListesi: metin(c.querySelector('[data-testid="kalem-listesi"]')) };
};
const partiOnce = () => {
  const s = hesaplaMakinaMaliyetleri({ customers: V90.CUSTOMERS, stock: V90.STOCK, partStockLog: [], giderler: V90.GIDERLER, giderTurleri: V90.TURLER,
    standardModels: V90.MODELLER, customModels: [], uretimPartileri: V90.PARTILER, giderAyarlari: { yururlukAy: V90.YURURLUK } }, { bugun: V90.BUGUN });
  return s.partiler.map(p => ({ id: p.id, adet: p.adet, havuzK: Math.round(p.havuz * 100), makinaBasiK: p.makinaBasi == null ? null : Math.round(p.makinaBasi * 100),
    aylar: Object.fromEntries([...s.aylar.values()].map(a => [a.ay, a.ortak])) }));
};

describe("Spec 0090 kıyas altınları (C16, AC-36)", () => {
  if (YAZ) {
    it("spec öncesi kodla iki altını yazar", () => {
      fs.writeFileSync(EKRAN_DOSYA, JSON.stringify(ekranCiktisi(), null, 2) + "\n");
      fs.writeFileSync(PARTI_DOSYA, JSON.stringify(partiOnce(), null, 2) + "\n");
    });
    return;
  }
  const once = JSON.parse(fs.readFileSync(EKRAN_DOSYA, "utf8"));
  it("AC-15 / C16: kalem listesi ve tam ekran metni, atama sütunu ve kovalar kutusu dışında spec öncesiyle aynı", () => {
    const simdi = ekranCiktisi();
    expect(simdi.kalemListesi).toBe(once.kalemListesi);
    expect(simdi.tam).toBe(once.tam);
  });
  it("AC-36 (altının kendisi): bugünkü motor dokunulmadı, altını aynen üretir (C10)", () => {
    expect(partiOnce()).toEqual(JSON.parse(fs.readFileSync(PARTI_DOSYA, "utf8")));
  });
});
