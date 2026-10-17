// @vitest-environment jsdom
// Spec 0089 AC-9, AC-16, AC-17, AC-18 (plan adım 1, C4): Giderler'in iki maliyet görünümü kalkarken Dönem Raporu'nun rapor
// nesnesi, ekrandaki bütün kutuların metni ve Aylık Gider ve Kasa Raporu çıktısı değişmez. "Önce" çıktıları spec 0089'dan
// ÖNCEKİ kodla üretildi (YAZ_0089=1 ile): tests/fixtures/0089-donem-raporu-once.json ve 0089-gider-kasa-raporu-once.html.
// Bilinen tek fark R12'nin kopmuş atama satırıdır (`dusen-atama-sayisi`); karşılaştırmadan önce o satır ve görünüm
// çubuğunun düğmeleri (çubuk bu işle değişir, AC-1 ayrıca ölçer) ayıklanır. Başka her fark bu testi kırar.
// Spec 0090 ile (C16, R5/2, R11): altın YENİLENMEZ. Rapor nesnesi iki taraf da bosAtamaAyikla'dan geçerek ölçülür (doğrulayıcı
// artık boş atama anahtarı yazmaz); kovalar kutusu ekrandan kalktığı için kutu listesinden düşer; tam ekran ve kalem listesi
// metni (atama sütunu kalktı) 0090'ın hücre düzeyinde ayıklanmış altınına devredildi (gider-atama-kalkar-0090-kiyas); yazdırma
// çıktısı "GİDER · MALİYET DAĞILIMI" bölümü iki taraftan ayıklanarak ölçülür.
process.env.TZ = "Europe/Istanbul";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { useState } from "react";
import fs from "node:fs";
import { kutuAc } from "./kutuAc";
import { Giderler } from "../../src/components/Giderler";
import { hesaplaGiderRaporu } from "../../src/lib/gider";
import { giderKasaRaporu, buildGiderKasaRaporuHtml } from "../../src/lib/giderRaporu";
import { girdi } from "../fixtures/0059-veri";
import { bosAtamaAyikla } from "../fixtures/0090-bos-atama";
import { TURLER, TED, STANDART, OZEL, STOCK, KALEMLER, HAREKET, KDV, SATIS, DONEM, BUGUN, raporGirdisi } from "../fixtures/0089-veri";

const RAPOR_DOSYA = "tests/fixtures/0089-donem-raporu-once.json";
const HTML_DOSYA = "tests/fixtures/0089-gider-kasa-raporu-once.html";
const YAZ = process.env.YAZ_0089 === "1";

afterEach(() => { cleanup(); vi.useRealTimers(); });
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(`${BUGUN}T10:00:00`)); });

const metin = (el) => el.textContent.replace(/\s+/g, " ").trim();
const KALKAN_DUGMELER = ["Makina Kârlılığı", "Makina ve Model"];

function GH() {
  const [giderler, setGiderler] = useState(KALEMLER);
  const [hesapHareketleri, setHesapHareketleri] = useState(HAREKET);
  return <Giderler giderler={giderler} setGiderler={setGiderler} hesapHareketleri={hesapHareketleri} setHesapHareketleri={setHesapHareketleri} giderTanimlari={[]} setGiderTanimlari={vi.fn()}
    giderTurleri={TURLER} tedarikciler={TED} setTedarikciler={vi.fn()} calisanlar={[]} stock={STOCK} customers={[]} standardModels={STANDART} customModels={OZEL}
    appSettings={{ giderAyarlari: { yururlukAy: "2026-01" }, kdvRates: KDV }} kdvRates={KDV} kasaHesaplari={[]} satisVerisi={SATIS} showToast={vi.fn()} />;
}

const KUTULAR = [["Gider Türü Kırılımı", "tur"], ["KDV Karşılaştırması", "kdv"], ["Tedarikçi Kırılımı", "tedarikci"], ["Ödeme Yöntemi Kırılımı", "yontem"]];

// Ekranın bütün metni ve beş kutunun ayrı ayrı metni (kutular açık). Ayıklanan: R12 satırı ve kalkan çubuk düğmeleri.
const ekranCiktisi = () => {
  const { container } = render(<GH />);
  const kutular = {};
  for (const [baslik, ad] of KUTULAR) kutular[ad] = kutuAc(baslik);
  const ayikla = (el) => {
    const c = el.cloneNode(true);
    c.querySelectorAll('[data-testid="dusen-atama-sayisi"]').forEach(x => x.remove());
    c.querySelectorAll("button").forEach(b => { if (KALKAN_DUGMELER.includes(metin(b))) b.remove(); });
    return metin(c);
  };
  const sonuc = { tam: ayikla(container), kutular: {} };
  for (const [ad, el] of Object.entries(kutular)) sonuc.kutular[ad] = ayikla(el);
  sonuc.kalemListesi = metin(container.querySelector('[data-testid="kalem-listesi"]'));
  return sonuc;
};

// Spec 0090 R11/2: yazdırmadaki "GİDER · MALİYET DAĞILIMI" bölümünü (kendi kabıyla) altından ayıklar.
const BASLIK = "GİDER · MALİYET DAĞILIMI";
const maliyetDagilimiCikar = (html) => {
  const i = html.indexOf(BASLIK);
  if (i < 0) return html;
  const bas = html.lastIndexOf('<div style="border:1px solid #e2e8f0;', i);
  const son = html.indexOf("\n    </div>", i) + "\n    </div>".length;
  return html.slice(0, bas).replace(/\s*$/, "") + html.slice(son);
};
const raporNesnesi = () => JSON.parse(JSON.stringify(hesaplaGiderRaporu(raporGirdisi(), DONEM, { bugun: BUGUN })));
const yazdirma = () => buildGiderKasaRaporuHtml(giderKasaRaporu(girdi(), "2026-09"));

describe("Spec 0089 kıyas fikstürü (C4)", () => {
  if (YAZ) {
    it("spec öncesi kodla altın çıktıları yazar", () => {
      fs.writeFileSync(RAPOR_DOSYA, JSON.stringify({ rapor: raporNesnesi(), ekran: ekranCiktisi() }, null, 2) + "\n");
      fs.writeFileSync(HTML_DOSYA, yazdirma());
    });
    return;
  }
  const once = JSON.parse(fs.readFileSync(RAPOR_DOSYA, "utf8"));

  it("AC-9: Dönem Raporu'nun rapor nesnesi spec öncesiyle birebir aynı (spec 0090: boş atama anahtarları ayıklanır)", () => {
    expect(bosAtamaAyikla(raporNesnesi())).toEqual(bosAtamaAyikla(once.rapor));
  });

  it("AC-9: kutuların ve ekranın metni spec öncesiyle aynı (tek fark R12 satırı, ayıklanır)", () => {
    const simdi = ekranCiktisi();
    const kalanKutular = { ...once.ekran.kutular }; delete kalanKutular.kova; // spec 0090 R11: kovalar kutusu kalktı
    expect(simdi.kutular).toEqual(kalanKutular);
    // Spec 0090 C16: tam ekran ve kalem listesi metni 0090-ekran-once.json'a devredildi (atama sütunu hücre düzeyinde ayıklanır).
  });

  it("AC-16, AC-17: kısıtlı ve dağıtılmış kalemin rapor rakamları değişmez", () => {
    const r = raporNesnesi();
    expect(r.kisitli).toEqual(once.rapor.kisitli);
    expect(r.kisitli.adet).toBe(1);
    expect(r.kovalar).toEqual(once.rapor.kovalar);
    const dag = r.kalemler.find(x => x.id === 5);
    expect(dag.dagitimAy).toBe(12);
    expect(bosAtamaAyikla(dag)).toEqual(bosAtamaAyikla(once.rapor.kalemler.find(x => x.id === 5)));
  });

  it("AC-18: Aylık Gider ve Kasa Raporu çıktısı spec öncesiyle birebir aynı (spec 0090: maliyet dağılımı bölümü ayıklanır)", () => {
    const simdi = yazdirma();
    expect(simdi).not.toMatch(/GİDER · MALİYET DAĞILIMI/);
    expect(simdi).toBe(maliyetDagilimiCikar(fs.readFileSync(HTML_DOSYA, "utf8")));
  });
});
