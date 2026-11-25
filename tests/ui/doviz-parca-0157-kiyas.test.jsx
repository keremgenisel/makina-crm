// @vitest-environment jsdom
// Spec 0157 C6, C6/2, C6/3 (AC-2, AC-33, AC-57, AC-61): lira maliyetli veride motor çıktıları (maliyet, kalemler, geçmiş, set, satış
// fiyatı, Model Maliyetleri, Parti Hesabı, sipariş), kayıt gövdesi (parça kartının kayıt fonksiyonu), Excel satırları ve sipariş
// belgesi spec öncesi altınla BİREBİR aynı; ayıklama yok (yeni anahtarlar yalnız dövizde yazılır). Altın `tests/fixtures/0157-once.json`
// spec ÖNCESİ koddan `YAZ_0157=1` ile; veri `tests/fixtures/0157-veri.js` (lira profili ayrıca ölçülür).
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import fs from "node:fs";
import { useState } from "react";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import * as U from "../../src/lib/urunAgaci";
import { malzemeKatalogu } from "../../src/lib/malzeme";
import { maliyetKalemleriOf } from "../../src/lib/maliyetKalemleri";
import { parcaSatisFiyati, fiyatBaglamiKur } from "../../src/lib/parcaFiyati";
import { modelMaliyetleri, partiHesabi } from "../../src/lib/makinaStandartMaliyet";
import { parcaDisaAktarmaSatiri, parcaSatirlariniCoz, PARCA_AKTARMA_BASLIKLARI } from "../../src/lib/parcaAktarma";
import * as S from "../../src/lib/siparisIhtiyaci";
import { siparisRaporuHtml as _siparisRaporuHtml } from "../../src/lib/siparisRaporu";
import { sayfaStiliniAyikla } from "../fixtures/sayfa-stil-ayikla";
const siparisRaporuHtml = (...a) => sayfaStiliniAyikla(_siparisRaporuHtml(...a)); // 2026-11-25: @page satırı ayıklanır
import { PartManager } from "../../src/components/PartManager";
import { cinsSirasiUygula } from "../fixtures/0161-ayikla.js";
import { PARCALAR, MALZEMELER, MODELLER, TEDARIKCILER, FIYAT_AYARLARI, PARTI, BUGUN, FACTORY, veri } from "../fixtures/0157-veri.js";

vi.mock("../../src/lib/audit", async (orig) => ({ ...(await orig()), logAction: () => {} }));
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(`${BUGUN}T10:00:00`)); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

const DOSYA = "tests/fixtures/0157-once.json";
const js = (x) => JSON.parse(JSON.stringify(x === undefined ? null : x));
const TARIHLER = [undefined, "2026-01-15", "2026-06-01", "2026-11-23"];

const motor = () => {
  const kat = U.setKatalogu(PARCALAR); const mk = malzemeKatalogu(MALZEMELER);
  const fb = fiyatBaglamiKur({ parts: PARCALAR, malzemeler: MALZEMELER, fiyatAyarlari: FIYAT_AYARLARI });
  const parca = PARCALAR.map(p => ({
    id: p.id, kurus: TARIHLER.map(t => U.parcaMaliyetKurus(p, t, kat, mk)), metin: U.parcaMaliyetMetni(p, undefined, kat, mk),
    kaynak: U.maliyetKaynagi(p, undefined, kat, mk), satis: parcaSatisFiyati(p, "TRY", fb),
    kalemler: maliyetKalemleriOf(p).length ? U.maliyetKalemleriOzeti(maliyetKalemleriOf(p), mk) : null,
    gecmis: U.maliyetGecmisiSatirlari(p),
  }));
  const g = PARCALAR.find(p => p.id === 20);
  const gecmisKarari = [
    U.maliyetGecmisiYaz(g, 9000, { tarih: "2026-11-01", bugun: BUGUN }),
    U.maliyetGecmisiYaz(g, 7540, { tarih: "2026-07-01", bugun: BUGUN, tarihElle: true }),
    U.maliyetGecmisiYaz(PARCALAR.find(p => p.id === 4), 300, { tarih: "2026-11-01", bugun: BUGUN }),
  ];
  const modeller = modelMaliyetleri({ ...MODELLER, parts: PARCALAR, malzemeler: MALZEMELER }, 1000);
  const parti = partiHesabi(PARTI, { stock: [], customers: [], uretimPartileri: [PARTI] },
    { payK: 1000, modeller, rates: {}, bugun: BUGUN, katalog: { ...MODELLER, parts: PARCALAR, malzemeler: MALZEMELER } });
  const s = S.siparisIhtiyaci(veri(), { tedarikciOdakli: true });
  const belge = { fiyatsiz: siparisRaporuHtml(s, { bugun: BUGUN, factory: FACTORY }), fiyatli: siparisRaporuHtml(s, { bugun: BUGUN, factory: FACTORY, fiyatli: true }) };
  const excel = [PARCA_AKTARMA_BASLIKLARI, ...PARCALAR.map(p => parcaDisaAktarmaSatiri(p, kat, mk))];
  const ice = parcaSatirlariniCoz([...excel, ["Yeni parça", "", "", "", "", "", "", "", "", "15"]], PARCALAR, 1000, BUGUN, MALZEMELER);
  return js({ parca, gecmisKarari, modeller, parti, siparis: s, belge, excel, ice });
};

// Kayıt gövdesi: parça kartının kayıt fonksiyonu (dokunulmadan kayıt, elle tutar değişimi, yeni parça).
const govde = () => {
  const kayit = { parts: PARCALAR };
  const Kap = () => { const [parts, setParts] = useState(PARCALAR); kayit.parts = parts; return <PartManager parts={parts} rawParts={parts} setParts={setParts} showToast={() => {}} malzemeler={MALZEMELER} tedarikciler={TEDARIKCILER} />; };
  render(<Kap />);
  // Liste sayfalı (10 satır): satır arama kutusuyla bulunur.
  const satir = (ad) => { fireEvent.change(screen.getByPlaceholderText("Yedek parça ara..."), { target: { value: ad } }); return screen.getAllByRole("row").find(r => r.querySelector("span")?.textContent === ad); };
  const kaydet = () => fireEvent.click(screen.getByRole("button", { name: /^Kaydet$/ }));
  for (const ad of ["Cıvata M8", "Pirinç burç", "Fason parça", "Geçmişli"]) { fireEvent.click(within(satir(ad)).getByTitle("Düzenle")); kaydet(); }
  fireEvent.click(within(satir("Geçmişli")).getByTitle("Düzenle"));
  fireEvent.change(screen.getByLabelText("Alış maliyeti"), { target: { value: "90,25" } });
  fireEvent.change(screen.getByLabelText(U.GECERLILIK_ETIKETI), { target: { value: "2026-11-01" } });
  kaydet();
  fireEvent.click(screen.getByRole("button", { name: /Parça\/Yedek Parça Ekle/ }));
  fireEvent.change(screen.getByPlaceholderText("Örn: Kesme Bıçağı Seti"), { target: { value: "Yeni lira parça" } });
  fireEvent.change(screen.getByLabelText("Alış maliyeti"), { target: { value: "12,5" } });
  kaydet();
  const sonuc = js(kayit.parts.filter(p => [4, 6, 8, 20].includes(p.id) || p.ad === "Yeni lira parça").map(p => (p.ad === "Yeni lira parça" ? { ...p, id: "yeni" } : p)));
  cleanup();
  return sonuc;
};

describe("Spec 0157 kıyas (lira veri)", () => {
  it("AC-61 / C6/3: kıyas fikstürü gerçekten lira profilinde (parça ve kalemde para birimi ve kur yok, geçmiş yalnız lira)", () => {
    for (const p of PARCALAR) {
      expect(p, p.ad).not.toHaveProperty("maliyetParaBirimi"); expect(p, p.ad).not.toHaveProperty("maliyetKuru");
      for (const k of maliyetKalemleriOf(p).filter(x => x.tur === "islem")) { expect(k).not.toHaveProperty("paraBirimi"); expect(k).not.toHaveProperty("kur"); }
      for (const g of p.maliyetGecmisi || []) expect(Object.keys(g).sort()).toEqual(["gecerli", "kurus"]);
    }
    // Profil boş değil: elle lira, lira işlem kalemi, geçmiş, set ve döviz malzeme (X5) birlikte.
    expect(PARCALAR.some(p => p.maliyet != null)).toBe(true);
    expect(PARCALAR.some(p => maliyetKalemleriOf(p).some(k => k.tur === "islem"))).toBe(true);
    expect(PARCALAR.some(p => p.maliyetGecmisi?.length)).toBe(true);
    expect(PARCALAR.some(p => p.setIcerigi?.length)).toBe(true);
    expect(MALZEMELER.some(m => m.paraBirimi === "USD")).toBe(true);
  });
  it("AC-2 / AC-33 / AC-57 / AC-61: motor çıktıları, kayıt gövdesi, Excel ve sipariş belgesi spec öncesiyle birebir (spec 0159 ile: ad ve R6/2 ayıklaması)", async () => {
    const s = { ...motor(), govde: govde() };
    if (process.env.YAZ_0157 === "1") { fs.writeFileSync(DOSYA, JSON.stringify(s) + "\n"); return; }
    const a = JSON.parse(fs.readFileSync(DOSYA, "utf8"));
    // Spec 0159 ile (C7/3, R6/2, P3, P4): altın yenilenmez. Belgenin yeni adları eski adlara çevrilir; yalnız işlem kalemli parçanın
    // ("Fason parça") hazır satırı artık tutar taşımaz, o satırın ve bölümünün tutar alanları iki taraftan düşer, fiyatlı nüshada o
    // bölüm karşılaştırılmaz. Öteki her şey (maliyet, geçmiş, satış fiyatı, Model Maliyetleri, Parti Hesabı, Excel, gövde) birebir.
    const { ayiklaMotor0159, ayiklaBelge0159, ayiklaAd0159 } = await import(/* @vite-ignore */ "../fixtures/0159-ayikla.js");
    const r62 = s.siparis.tedarikciBolumleri.belge.flatMap(b => b.satirlar.filter(x => x.bedelKalemde));
    expect(r62.map(x => x.ad)).toEqual(["Fason parça"]);
    const ids = r62.map(x => x.partId); const adlar = r62.map(x => x.ad);
    for (const k of Object.keys(a).filter(k => !["siparis", "belge"].includes(k))) expect(s[k], k).toEqual(a[k]);
    // Spec 0161 ile (AC-34): pencerenin cins sırası bilinçli fark; eski altına yeni kural uygulanır (altın yenilenmedi).
    expect(ayiklaMotor0159(s.siparis, ids)).toEqual(ayiklaMotor0159(cinsSirasiUygula(a.siparis), ids));
    expect(ayiklaAd0159(s.belge.fiyatsiz)).toBe(ayiklaAd0159(a.belge.fiyatsiz));
    expect(ayiklaBelge0159(s.belge.fiyatli, adlar)).toBe(ayiklaBelge0159(a.belge.fiyatli, adlar));
    expect(Object.keys(s).sort()).toEqual(Object.keys(a).sort());
  });
});
