// @vitest-environment jsdom
// Spec 0060 A/B (arayüz): Giderler kalem listesinde hedef başına rozet (taksitli stopajlı kira, çok hedefli personel),
// taksitsiz kiranın bugünkü metni, ek ödeme türleri, Kasa hareket listesinde taksit adı, mahsup ve ekstre regresyonları.
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { useState } from "react";
import { Giderler } from "../../src/components/Giderler";
import { Kasa } from "../../src/components/Kasa";
import { EkstrePenceresi } from "../../src/components/gider/EkstrePenceresi";
import { giderKalemDogrula, turHaritasi, odemeleriUygula, HEDEF } from "../../src/lib/gider";
import { calisanEkstresi } from "../../src/lib/kasa";

afterEach(() => { cleanup(); vi.useRealTimers(); });
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-09-23T10:00:00")); });

const TURLER = [{ id: 1, ad: "Kira", davranis: "kira" }, { id: 3, ad: "Personel", davranis: "personel" }, { id: 4, ad: "Hammadde", davranis: "normal" }];
const turMap = turHaritasi(TURLER);
const TED = [{ id: 11, ad: "Yıldız Gayrimenkul" }, { id: 12, ad: "Demir Bant" }];
const CAL = [{ id: 21, ad: "Hasan Çelik" }];
let n = 9000;
const k = (f) => { const r = giderKalemDogrula(f, { turMap, tedarikciler: TED, uid: () => ++n }); if (r.hatalar.length) throw new Error(JSON.stringify(r.hatalar)); return r.kayit; };
// Stopajı iki taksitli kira; taksitsiz stopajlı kira; tek hedefli üç taksitli hammadde; dört hedefli, resmi'si 6 taksitli personel.
const KIRA_T = k({ id: 1, tarih: "2026-09-01", turId: 1, girisYonu: "brut", tutar: 20000, stopajOrani: 20, kdvOrani: 0, tedarikciId: 11, aciklama: "Eylül kirası",
  sonOdemeTarihi: "2026-09-10", stopajTaksitSayisi: 2, stopajVade: "2026-09-20" });
const KIRA_D = k({ id: 2, tarih: "2026-09-02", turId: 1, girisYonu: "brut", tutar: 10000, stopajOrani: 20, kdvOrani: 0, tedarikciId: 11, aciklama: "Depo kirası", sonOdemeTarihi: "2026-09-10" });
const TEK = k({ id: 3, tarih: "2026-09-03", turId: 4, tutar: 6000, kdvOrani: 0, tedarikciId: 12, aciklama: "Sac", taksitSayisi: 3, sonOdemeTarihi: "2026-09-10" });
const PERS = k({ id: 4, tarih: "2026-09-04", turId: 3, calisanId: 21, calisanAd: "Hasan Çelik", resmiTutar: 30000, eldenTutar: 10000, taksitSayisi: 6, sonOdemeTarihi: "2026-09-30",
  ekOdemeler: [{ tur: "prim", aciklama: "", resmiTutar: 2000, eldenTutar: 1000 }, { tur: "ikramiye", aciklama: "", resmiTutar: 0, eldenTutar: 500 }] });
const GIDERLER = [KIRA_T, KIRA_D, TEK, PERS];
const stp = (kal) => kal.taksitler.filter(t => t.hedef === HEDEF.STOPAJ);
const resmi = (kal) => kal.taksitler.filter(t => t.hedef === HEDEF.ANA);
const od = (id, giderId, tutar, taksitId, o = {}) => ({ id, tur: "odeme", tarih: "2026-09-15", tutar, hesapId: 51, giderId, taksitId, yontem: "Havale", ...o });
const H0 = [od(1, 1, stp(KIRA_T)[0].tutar, stp(KIRA_T)[0].id), od(2, 4, resmi(PERS)[0].tutar, resmi(PERS)[0].id), od(3, 4, resmi(PERS)[1].tutar, resmi(PERS)[1].id),
  od(4, 3, TEK.taksitler[1].tutar, TEK.taksitler[1].id)];

function GiderH({ h0 = H0, perms = null, onHedef }) {
  const [giderler, setGiderler] = useState(GIDERLER);
  const [hesapHareketleri, setHesapHareketleri] = useState(h0);
  return <Giderler giderler={giderler} setGiderler={setGiderler} hesapHareketleri={hesapHareketleri} setHesapHareketleri={setHesapHareketleri} giderTanimlari={[]} setGiderTanimlari={vi.fn()}
    giderTurleri={TURLER} tedarikciler={TED} setTedarikciler={vi.fn()} standartGiderler={[]} setStandartGiderler={vi.fn()} calisanlar={CAL} standardModels={[]} customModels={[]}
    appSettings={{ giderAyarlari: { yururlukAy: "2026-01" } }} serverPermissions={perms} kasaHesaplari={[{ id: 51, ad: "Ziraat", tur: "banka", paraBirimi: "TRY", acilisBakiyesi: 0, acilisTarihi: "2026-01-01" }]}
    satisVerisi={{ customers: [], services: [], partSales: [], payments: [], teklifler: [], dealers: [], yedekParcaSatislar: [] }} showToast={vi.fn()} />;
}
const liste = () => screen.getByTestId("kalem-listesi");
const satirOf = (metin) => within(liste()).getByText(metin).closest("tr");
const rozetler = (tr) => within(tr).queryAllByTestId("hedef-rozeti").map(r => r.textContent);

describe("Spec 0060 R1, R2, R34: kalem listesinde hedef başına durum", () => {
  it("AC-1 / AC-2 / AC-24: taksitli stopajlı kira iki hedefi ayrı yazar; stopaj adıyla ve kısa biçimde", () => {
    render(<GiderH />);
    expect(rozetler(satirOf("Eylül kirası"))).toEqual(["Kiraya veren: Ödenmedi", "Vergi dairesi: Kısmen 1/2"]);
  });
  it("AC-3 / AC-40: taksitsiz kiranın rozet metni bu işten önceki ile birebir aynı", () => {
    render(<GiderH h0={[od(9, 2, KIRA_D.taksitler.find(t => t.hedef === HEDEF.STOPAJ).tutar, KIRA_D.taksitler.find(t => t.hedef === HEDEF.STOPAJ).id)]} />);
    expect(rozetler(satirOf("Depo kirası"))).toEqual(["Kiraya veren: Ödenmedi", "Vergi dairesi: Ödendi"]);
  });
  it("AC-24: tek hedefli taksitli kalem bugünkü tek rozetini korur", () => {
    render(<GiderH />);
    const tr = satirOf("Sac");
    expect(rozetler(tr)).toEqual([]);
    expect(within(tr).getByText(/Kısmen ödendi 1\/3/)).toBeTruthy();
  });
  it("AC-36 / AC-9: grup kapalıyken personel satırı ve ek ödeme türü görünmez", () => {
    render(<GiderH />);
    expect(within(liste()).queryByText("Hasan Çelik")).toBeNull();
    expect(screen.queryByTestId("ek-odeme-tur-kirilimi")).toBeNull();
    expect(screen.queryByTestId("ek-odeme-tur-ozeti")).toBeNull();
  });
  it("AC-4 / AC-25 / AC-8 / AC-9: grup açılınca dört hedef kısa rozetle, ek ödeme türleri tutarlarıyla ve rozet yanında özetle", () => {
    render(<GiderH />);
    fireEvent.click(within(liste()).getByText(/Çalışanları göster/));
    const tr = satirOf("Hasan Çelik");
    expect(rozetler(tr).map(r => r.replace(/(Prim|Prim, İkramiye)$/, ""))).toEqual(["Maaş (resmi): Kısmen 2/6", "Maaş (elden): Ödenmedi", "Ek ödeme (resmi): Ödenmedi", "Ek ödeme (elden): Ödenmedi"]);
    expect(within(tr).getByTestId("ek-odeme-tur-kirilimi").textContent).toBe(" (Prim 3.000 ₺, İkramiye 500 ₺)");
    // Triyaj (bulgu 1): özet hedef başına; prim iki bileşende, ikramiye yalnız eldende.
    expect(within(tr).getAllByTestId("ek-odeme-tur-ozeti").map(x => x.textContent)).toEqual(["Prim", "Prim, İkramiye"]);
  });
  it("AC-26: rozete tıklamak ödeme penceresini o hedefle açar; gider_odeme yoksa rozet düğme değildir", () => {
    render(<GiderH />);
    const dugme = (r) => (r.tagName === "BUTTON" ? r : r.querySelector("button"));
    fireEvent.click(dugme(within(satirOf("Eylül kirası")).getAllByTestId("hedef-rozeti")[1]));
    expect(screen.getByTestId("odeme-kayit-penceresi").textContent).toMatch(/Vergi dairesine \(stopaj\)/);
    cleanup();
    render(<GiderH perms={{ role: "user", permissions: JSON.stringify({ tabs: ["gider"], giderActions: ["gider_edit"] }) }} />);
    expect(within(satirOf("Eylül kirası")).getAllByTestId("hedef-rozeti").every(r => r.tagName !== "BUTTON" && !r.querySelector("button"))).toBe(true);
  });
  it("AC-10 (regresyon): avanstan mahsup kısmı ödemeden ayırt edilir (yöntem kırılımı 'Avanstan mahsup')", () => {
    const kalem = TEK.taksitler[0];
    render(<GiderH h0={[od(1, 3, kalem.tutar / 2, kalem.id), { id: 2, tur: "mahsup", tarih: "2026-09-16", tutar: kalem.tutar / 2, giderId: 3, taksitId: kalem.id, calisanId: 21, hesapId: null }]} />);
    expect(within(satirOf("Sac")).getByTestId("kalem-yontem-kirilimi").textContent).toMatch(/Avanstan mahsup 1\.000 ₺[\s\S]*Havale 1\.000 ₺/);
  });
});

describe("Spec 0060 R6, R7 (triyaj bulgu 1): ek ödeme özeti hedef başına", () => {
  it("AC-9: yalnız resmi prim ve yalnız elden ikramiye; resmi rozetinin yanında yalnız Prim, elden rozetinin yanında yalnız İkramiye", () => {
    const P2 = k({ id: 5, tarih: "2026-09-05", turId: 3, calisanId: 21, calisanAd: "Hasan Çelik", resmiTutar: 30000, eldenTutar: 10000, sonOdemeTarihi: "2026-09-30",
      ekOdemeler: [{ tur: "prim", aciklama: "", resmiTutar: 2000, eldenTutar: 0 }, { tur: "ikramiye", aciklama: "", resmiTutar: 0, eldenTutar: 5000 }] });
    function H2() {
      const [g, setG] = useState([P2]);
      return <Giderler giderler={g} setGiderler={setG} hesapHareketleri={[]} setHesapHareketleri={vi.fn()} giderTanimlari={[]} setGiderTanimlari={vi.fn()}
        giderTurleri={TURLER} tedarikciler={TED} setTedarikciler={vi.fn()} standartGiderler={[]} setStandartGiderler={vi.fn()} calisanlar={CAL} standardModels={[]} customModels={[]}
        appSettings={{ giderAyarlari: { yururlukAy: "2026-01" } }} serverPermissions={null}
        satisVerisi={{ customers: [], services: [], partSales: [], payments: [], teklifler: [], dealers: [], yedekParcaSatislar: [] }} showToast={vi.fn()} />;
    }
    render(<H2 />);
    fireEvent.click(within(liste()).getByText(/Çalışanları göster/));
    const tr = satirOf("Hasan Çelik");
    const rz = within(tr).getAllByTestId("hedef-rozeti");
    const ozetOf = (ad) => rz.find(r => r.textContent.startsWith(ad)).querySelector("[data-testid='ek-odeme-tur-ozeti']")?.textContent;
    expect(ozetOf("Ek ödeme (resmi)")).toBe("Prim");
    expect(ozetOf("Ek ödeme (elden)")).toBe("İkramiye");
  });
});

describe("Spec 0060 AC-5: adlar her yerde aynı tablodan", () => {
  it("AC-5: listedeki rozet yalın, Kasa satırı, ödeme penceresi ve hatırlatıcı yönelme hâlini aynı tablodan yazar", async () => {
    const { hedefAdi, hedefBasligi } = await import("../../src/lib/odemeYontemi");
    const { DAVRANIS } = await import("../../src/lib/gider");
    render(<GiderH />);
    expect(rozetler(satirOf("Eylül kirası"))[1].startsWith(`${hedefBasligi(HEDEF.STOPAJ, DAVRANIS.KIRA)}:`)).toBe(true);
    fireEvent.click(within(satirOf("Eylül kirası")).getAllByTestId("hedef-rozeti")[1]);
    expect(screen.getByTestId("odeme-kayit-penceresi").textContent).toContain(hedefAdi(HEDEF.STOPAJ, DAVRANIS.KIRA));
    cleanup();
    render(<Kasa kasaHesaplari={[{ id: 51, ad: "Ziraat", tur: "banka", paraBirimi: "TRY", acilisBakiyesi: 0, acilisTarihi: "2026-01-01", kapali: false }]} setKasaHesaplari={vi.fn()}
      hesapHareketleri={H0} setHesapHareketleri={vi.fn()} giderler={odemeleriUygula(GIDERLER, H0, turMap)} giderTurleri={TURLER} tedarikciler={TED} calisanlar={CAL}
      customers={[]} factory={{ name: "Altuntaş Makina" }} giderAyarlari={{}} showToast={vi.fn()} />);
    expect(screen.getAllByTestId("hareket-satiri").some(s => s.textContent.includes(hedefAdi(HEDEF.STOPAJ, DAVRANIS.KIRA)))).toBe(true);
    // Hatırlatıcı ve ekstre aynı fonksiyonları çağırır (yerel ad yok; kaynak taraması AC-6).
    const { readFileSync } = await import("node:fs");
    expect(readFileSync("src/components/gider/OdemeHatirlatma.jsx", "utf8")).toMatch(/hedefAdi\(/);
    expect(readFileSync("src/components/gider/EkstrePenceresi.jsx", "utf8")).toMatch(/hedefEtiketi\(/);
  });
  it("R30 (triyaj bulgu 2): gider formunun kira özeti ana hedefi tablodan yazar ('Kiraya verene ödenecek')", async () => {
    const { GiderForm } = await import("../../src/components/GiderForm");
    render(<GiderForm kalem={{ turId: 1, girisYonu: "brut", tutar: "20000", stopajOrani: "20", kdvOrani: "0", tedarikciId: 11, tarih: "2026-09-01" }} giderTurleri={TURLER}
      tedarikciler={TED} calisanlar={CAL} giderAyarlari={{ yururlukAy: "2026-01", stopajOrani: 20 }} onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText(/Kiraya verene ödenecek/)).toBeTruthy();
    expect(screen.queryByText(/Tedarikçiye ödenecek/)).toBeNull();
  });
});

describe("Spec 0060 R4, R35: Kasa hareket listesi", () => {
  const KasaE = () => (
    <Kasa kasaHesaplari={[{ id: 51, ad: "Ziraat", tur: "banka", paraBirimi: "TRY", acilisBakiyesi: 100000, acilisTarihi: "2026-01-01", kapali: false }]} setKasaHesaplari={vi.fn()}
      hesapHareketleri={H0} setHesapHareketleri={vi.fn()} giderler={odemeleriUygula(GIDERLER, H0, turMap)} giderTurleri={TURLER} tedarikciler={TED} calisanlar={CAL}
      customers={[]} factory={{ name: "Altuntaş Makina" }} giderAyarlari={{}} showToast={vi.fn()} />);
  it("AC-7 / AC-29: tek hedefli taksitli kalemin ödemesi taksit numarasını, çok hedefli taksitli kalemin ödemesi hedef adını ve taksit numarasını yazar", () => {
    render(<KasaE />);
    const satirlar = screen.getAllByTestId("hareket-satiri").map(s => s.textContent);
    expect(satirlar.some(t => /Demir Bant · Tedarikçiye 2\/3\. taksit/.test(t))).toBe(true);
    expect(satirlar.some(t => /Yıldız Gayrimenkul · Vergi dairesine \(stopaj\) 1\/2\. taksit/.test(t))).toBe(true);
    expect(satirlar.some(t => /Hasan Çelik · Maaş \(resmi\) 2\/6\. taksit/.test(t))).toBe(true);
  });
});

describe("Spec 0060 R9 (regresyon): çalışan ekstresi", () => {
  it("AC-11: avans, mahsup ve ödeme satırları türüyle ve hedefiyle okunur", () => {
    const hs = [od(1, 4, resmi(PERS)[0].tutar, resmi(PERS)[0].id), { id: 2, tur: "avans", tarih: "2026-09-10", tutar: 700, calisanId: 21, hesapId: 51 },
      { id: 3, tur: "mahsup", tarih: "2026-09-20", tutar: 700, calisanId: 21, giderId: 4, taksitId: PERS.taksitler.find(t => t.hedef === HEDEF.ELDEN).id, hesapId: null }];
    render(<EkstrePenceresi baslik="Hasan Çelik" tur="calisan" hesapla={() => calisanEkstresi(21, { giderler: [PERS], hareketler: hs, turler: TURLER })} hesapAdi={() => "Ziraat"} onClose={vi.fn()} />);
    const t = screen.getAllByTestId("ekstre-satiri").map(s => s.textContent);
    expect(t.some(x => /Avans/.test(x) && !/mahsup/.test(x))).toBe(true);
    expect(t.some(x => /Avanstan mahsup.*Maaş \(elden\)/.test(x))).toBe(true);
    expect(t.some(x => /Ödeme.*Maaş \(resmi\)/.test(x))).toBe(true);
  });
});
