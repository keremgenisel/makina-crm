// @vitest-environment jsdom
// Spec 0158 C9, C9/2, C9/3, C9/4 (AC-53, AC-63, AC-72, AC-80): dokunulmamış veride motor çıktısı, pencere, parça listesi ve Excel
// spec öncesiyle birebir; belgenin tek farkı bütün satırlarında boş kalan Ölçü sütununun çizilmemesidir. Altın
// `tests/fixtures/0158-once.json` spec ÖNCESİ koddan `YAZ_0158=1` ile; yeni anahtarlar ve belgedeki bilinçli fark
// `tests/fixtures/0158-ayikla.js` ile ayıklanır (P10, P11).
import { describe, it, expect, afterEach, vi } from "vitest";
import fs from "node:fs";
import { render, cleanup, fireEvent, screen } from "@testing-library/react";
import * as S from "../../src/lib/siparisIhtiyaci";
import { siparisRaporuHtml } from "../../src/lib/siparisRaporu";
import { SiparisPenceresi } from "../../src/components/stock/SiparisPenceresi";
import { PartManager } from "../../src/components/PartManager";
import { PARCA_AKTARMA_BASLIKLARI, parcaDisaAktarmaSatiri } from "../../src/lib/parcaAktarma";
import { setKatalogu } from "../../src/lib/urunAgaci";
import { malzemeKatalogu } from "../../src/lib/malzeme";
import { PARCALAR, MALZEMELER, SENARYOLAR, FACTORY, BUGUN, PENCERE_VERI } from "../fixtures/0158-veri.js";
import * as DOLU from "../fixtures/0158-dolu.js";

vi.mock("../../src/lib/audit", async (orig) => ({ ...(await orig()), logAction: () => {} }));
afterEach(() => cleanup());

const DOSYA = "tests/fixtures/0158-once.json";
const AYIKLA = "../fixtures/0158-ayikla.js";
const ayiklaYukle = () => import(/* @vite-ignore */ AYIKLA);

const uret = () => {
  const motor = {}; const belge = {};
  for (const [ad, [v, sec, ops]] of Object.entries(SENARYOLAR())) {
    const r = S.siparisIhtiyaci(v, sec);
    if (ad === "odakli" || ad === "duzenleme") motor[ad] = JSON.parse(JSON.stringify(r)); // altın küçük kalsın: iki senaryo
    belge[ad] = { fiyatsiz: siparisRaporuHtml(r, { bugun: BUGUN, factory: FACTORY, ...ops }), fiyatli: siparisRaporuHtml(r, { bugun: BUGUN, factory: FACTORY, fiyatli: true, ...ops }) };
  }
  render(<SiparisPenceresi veri={PENCERE_VERI()} bugun={BUGUN} onClose={() => {}} />);
  fireEvent.change(screen.getByLabelText("Üretim partisi"), { target: { value: "801" } });
  const pencere = screen.getByTestId("siparis-penceresi").innerHTML;
  cleanup();
  const { container } = render(<PartManager parts={PARCALAR} setParts={() => {}} showToast={() => {}} malzemeler={MALZEMELER} />);
  const liste = container.innerHTML;
  cleanup();
  const kat = setKatalogu(PARCALAR); const mk = malzemeKatalogu(MALZEMELER);
  const excel = [PARCA_AKTARMA_BASLIKLARI, ...PARCALAR.map(p => parcaDisaAktarmaSatiri(p, kat, mk))];
  // AC-38 / C8: kalem adedi birden büyük dolu veride kilogram, boy, asgari, kesit tutarı ve bölüm toplamları (kesilecek adet
  // kuralı yalnız yazılan rakamı değiştirir). Eski kod bilgi alanlarını ve işlem kalemlerinin tedarikçisini aynen okur.
  const d = S.siparisIhtiyaci(DOLU.veri(), { tedarikciOdakli: true });
  const adetli = {
    kesitler: d.kesitler.map(x => ({ anahtar: x.anahtar, siparisKg: x.siparisKg, boyAdedi: x.boyAdedi, asgariFark: x.asgariFark ?? null, tutarK: x.tutarK, tutarTLK: x.tutarTLK })),
    bolumler: d.tedarikciBolumleri.belge.map(b => ({ ad: b.ad, toplamlar: b.toplamlar, toplamTLK: b.toplamTLK, tutarsizSayi: b.tutarsizSayi, islemToplamK: b.islemToplamK, siparis: b.satirlar.map(x => [x.ad, x.siparis]) })),
  };
  return { motor, belge, pencere, liste, excel, adetli };
};

describe("Spec 0158 kıyas", () => {
  it("AC-53 / AC-63 / AC-72 / AC-80 / AC-38: dokunulmamış veride motor, pencere, liste ve Excel birebir; belgenin tek farkı boş Ölçü sütunu", async () => {
    const s = uret();
    if (process.env.YAZ_0158 === "1") { fs.writeFileSync(DOSYA, JSON.stringify(s) + "\n"); return; }
    const a = JSON.parse(fs.readFileSync(DOSYA, "utf8"));
    const { ayiklaMotor0158, ayiklaBelge0158, ayiklaExcel0158 } = await ayiklaYukle();
    expect(ayiklaMotor0158(s.motor)).toEqual(a.motor);
    expect(s.pencere).toBe(a.pencere);
    expect(s.liste).toBe(a.liste);
    expect(ayiklaExcel0158(s.excel)).toEqual(a.excel);
    for (const ad of Object.keys(a.belge)) for (const n of ["fiyatsiz", "fiyatli"]) expect(ayiklaBelge0158(s.belge[ad][n]), `${ad}/${n}`).toBe(a.belge[ad][n]);
    expect(s.adetli).toEqual(a.adetli); // AC-38
    // Ayıklama gerçekten bir şey geri alıyor: dokunulmamış veride en az bir tabloda Ölçü sütunu düşmüş olmalı.
    expect(Object.values(s.belge).some(b => b.fiyatsiz !== a.belge.odakli.fiyatsiz || b.fiyatsiz.split("<th").length < a.belge.odakli.fiyatsiz.split("<th").length)).toBe(true);
  });
  // Triyaj (bulgu 4, C9/2, AC-63): dokunulmamış ama kodu girilmiş katalogda ilk baskıda Kod sütunu da çıkar (R7); ikinci bilinçli fark
  // yalnız budur: Kod sütunu düşülünce belge yine altınla birebir.
  it("AC-63 / C9/2 (kodlu katalog): belgenin ikinci farkı Kod sütunudur; o sütun düşülünce altınla birebir", async () => {
    const a = JSON.parse(fs.readFileSync(DOSYA, "utf8"));
    const { ayiklaBelge0158 } = await ayiklaYukle();
    const ilk = PARCALAR.find(p => p.maliyetKalemleri?.length);
    const [v, sec, ops] = SENARYOLAR().odakli;
    const kodlu = S.siparisIhtiyaci({ ...v, parts: PARCALAR.map(p => (p.id === ilk.id ? { ...p, kod: "KD-1" } : p)) }, sec);
    const h = ayiklaBelge0158(siparisRaporuHtml(kodlu, { bugun: BUGUN, factory: FACTORY, ...ops }));
    const kodDus = (html) => html.replace(/<table>[\s\S]*?<\/table>/g, (t) => {
      const i = [...t.matchAll(/<th[^>]*>([^<]*)<\/th>/g)].map(m => m[1]).indexOf("Kod");
      if (i < 0) return t;
      return t.replace(/<tr>([\s\S]*?)<\/tr>/g, (m, ic) => `<tr>${[...ic.matchAll(/<t[hd][^>]*>[\s\S]*?<\/t[hd]>/g)].map(c => c[0]).filter((_, j) => j !== i).join("")}</tr>`);
    });
    expect(h).toContain(">Kod<"); expect(h).toContain(">KD-1<");
    expect(h).not.toBe(a.belge.odakli.fiyatsiz);
    expect(kodDus(h)).toBe(a.belge.odakli.fiyatsiz);
  });
});
