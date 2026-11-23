// @vitest-environment jsdom
// Spec 0156: ekstre penceresinin açılan ayrıntısı (gerçek motorla), tek liste, klavye, iç düğmeler, çalışan ekstresi ve üç
// yüz satırlık çizim ölçümü. Veri `tests/fixtures/0156-veri.js`. Test adları AC-<n> taşır.
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { EkstrePenceresi, EKSTRE_METIN as M, odenecekEtiketi } from "../../src/components/gider/EkstrePenceresi";
import { tedarikciEkstresi, calisanEkstresi, hesapAdiCoz } from "../../src/lib/kasa";
import { kalemDovizMetni, DAVRANIS } from "../../src/lib/gider";
import { taksitAdi, tl2 } from "../../src/lib/odemeYontemi";
import { paraMetni, kurMetni } from "../../src/lib/doviz";
import { HESAPLAR, TAKSITLI, DOVIZ, PERSONEL, secenek, turMap, tedarikciler } from "../fixtures/0156-veri.js";
import { giderKalemDogrula, tl } from "../../src/lib/gider";
import { computeAccessibleName, computeAccessibleDescription } from "dom-accessibility-api";

afterEach(cleanup);

const ted = (o = {}) => render(<EkstrePenceresi baslik="Sistem Civata" tur="tedarikci" hesapla={(a) => tedarikciEkstresi(11, secenek(a))}
  hesapAdi={(id) => hesapAdiCoz(o.hesaplar ?? HESAPLAR, id)} onKalemdeGoster={o.onKalemdeGoster ?? vi.fn()} onClose={vi.fn()} />);
const cal = (o = {}) => render(<EkstrePenceresi baslik="Çalışan" tur="calisan" hesapla={(a) => calisanEkstresi(21, secenek(a))}
  hesapAdi={(id) => hesapAdiCoz(HESAPLAR, id)} onAvansSil={o.onAvansSil ?? null} onKalemdeGoster={o.onKalemdeGoster ?? null} onClose={vi.fn()} />);
const satirlar = () => screen.getAllByTestId("ekstre-satiri");
const satir = (islem, metin) => satirlar().find(s => s.getAttribute("data-ad").endsWith(islem) && s.textContent.includes(metin));
const kayit = (s) => s.closest('[data-testid="ekstre-kayit"]'); // satır + kardeş düğme hücresi + ayrıntı
const ac = (s) => { fireEvent.click(s); return kayit(s).querySelector('[data-testid="ekstre-ayrinti"]'); };
const satirMetinleri = (a) => within(a).queryAllByTestId(/ayrinti-(satir|kapanis)/).map(x => x.textContent);
const kapanis = (a) => within(a).getByTestId("ayrinti-kapanis").textContent;
const tutarHucresi = (s) => s.children[3].textContent.replace(/^[+−]/, "").split(/(?=[$€])/)[0];

describe("Spec 0156: açılan ayrıntı", () => {
  it("AC-1 / AC-2: satıra tıklanınca ayrıntı açılır, yeniden tıklanınca kapanır; iki satır birlikte açık kalır", () => {
    ted();
    const a = satir("Borç doğdu", "M8 cıvata");
    expect(ac(a)).toBeTruthy();
    expect(a.getAttribute("aria-expanded")).toBe("true");
    ac(satir("Borç doğdu", "Montaj"));
    expect(screen.getAllByTestId("ekstre-ayrinti")).toHaveLength(2);
    fireEvent.click(a);
    expect(a.getAttribute("aria-expanded")).toBe("false");
    expect(screen.getAllByTestId("ekstre-ayrinti")).toHaveLength(1);
  });
  it("AC-48 (R1/4): satır role=button, aria-expanded ve erişilebilir adı tarih + işlem; Enter ve Space ile açılıp kapanır", () => {
    ted();
    const s = screen.getAllByRole("button", { name: "02/09/2026 Borç doğdu" })[0];
    expect(s.getAttribute("tabindex")).toBe("0");
    fireEvent.keyDown(s, { key: "Enter" });
    expect(s.getAttribute("aria-expanded")).toBe("true");
    fireEvent.keyDown(s, { key: " " });
    expect(s.getAttribute("aria-expanded")).toBe("false");
  });
  it("AC-3 / AC-43 / AC-54: normal kalem matrah, KDV (%20) işaretli; kapanış satırı Tutar hücresine eşit", () => {
    ted();
    const s = satir("Borç doğdu", "M8 cıvata");
    const a = ac(s);
    expect(satirMetinleri(a)).toEqual([`${M.matrah}${tl2(10000)}`, `+${M.kdv} (%20)${tl2(2000)}`, `=${odenecekEtiketi("normal")}${tl2(12000)}`]);
    expect(kapanis(a)).toContain(tutarHucresi(s));
  });
  it("AC-5 / AC-6 / AC-54: tevkifatlı kalem tevkifatı kesir oranıyla eksi yazar; tevkifatsız kalemde satır yok", () => {
    ted();
    const s = satir("Borç doğdu", "Montaj");
    const a = ac(s);
    expect(satirMetinleri(a)).toContain(`−${M.tevkifat} (5/10)${tl2(2000)}`);
    expect(kapanis(a)).toContain(tutarHucresi(s));
    expect(ac(satir("Borç doğdu", "M8 cıvata")).textContent).not.toContain(M.tevkifat);
  });
  it("R2/2: kapanış etiketleri gider formunun özetiyle aynı (hedefin yönelme adı + ödenecek)", () => {
    expect([odenecekEtiketi("normal"), odenecekEtiketi("kira")]).toEqual(["Tedarikçiye ödenecek", "Kiraya verene ödenecek"]);
  });
  it("AC-7 / AC-44 / AC-54: kira brüt − stopaj (%20) = net + KDV = kiraya verene ödenecek; kapanış Tutar hücresine eşit", () => {
    ted();
    const s = satir("Borç doğdu", "Depo kirası");
    const a = ac(s);
    expect(satirMetinleri(a)).toEqual([`${M.brut}${tl2(20000)}`, `−${M.stopaj} (%20)${tl2(4000)}`, `=${M.net}${tl2(16000)}`, `+${M.kdv} (%20)${tl2(4000)}`, `=${odenecekEtiketi("kira")}${tl2(20000)}`]);
    expect(kapanis(a)).toContain(tutarHucresi(s));
  });
  it("AC-4 (R3/2): KDV tutarı sıfır olan kalemde (oran sıfır, kuruşa yuvarlanınca sıfır) KDV satırı çizilmez", () => {
    ted();
    expect(ac(satir("Borç doğdu", "Pul")).textContent).not.toMatch(/KDV \(/);
    expect(ac(satir("Borç doğdu", "Eski fatura")).textContent).not.toMatch(/KDV \(/);
  });
  it("AC-8 / AC-58 (R2/5): kısıtlı kalem indirilemeyen KDV'yi borca girmediğini söyleyerek yazar; kısıtsız kalemde yok", () => {
    ted();
    const a = ac(satir("Borç doğdu", "Binek yakıt"));
    const sat = within(a).getAllByTestId("ayrinti-satir").find(x => x.textContent.includes(M.indirilemeyen));
    expect(sat.textContent).toContain(M.indirilemeyenIbare);
    expect(ac(satir("Borç doğdu", "M8 cıvata")).textContent).not.toContain(M.indirilemeyen);
  });
  it("AC-9 / AC-45 (R2/3): döviz kalem kendi döviz tutarını ve donmuş kurunu ayrı etiketle yazar; Tutar hücresindeki çevrilmiş rakam aynı; lira kalemde yok", () => {
    ted();
    const s = satir("Borç doğdu", "İthal rulman");
    const a = ac(s);
    expect(a.textContent).toContain(`${M.dovizTutar}${paraMetni(1000, "USD")}`);
    expect(a.textContent).toContain(`${M.dovizKur}1 USD = ${kurMetni(40)} TL`);
    expect(within(s).getByTestId("ekstre-doviz-tutari").textContent).toBe(kalemDovizMetni(DOVIZ, 4800000));
    expect(ac(satir("Borç doğdu", "M8 cıvata")).textContent).not.toContain(M.dovizTutar);
  });
  it("AC-10 / AC-11: kısmen ödenmiş kalem ödemelerini tarih, yöntem, hesap ve tutarla listeler ve kalanı yazar", () => {
    ted();
    const a = ac(satir("Borç doğdu", "M8 cıvata"));
    expect(within(a).getAllByTestId("ayrinti-odeme").map(x => x.textContent)).toEqual([`10/09/2026Havale · Ziraat${tl2(5000)}`, `03/10/2026Nakit${tl2(2000)}`]);
    expect(within(a).getByTestId("ayrinti-kalan").textContent).toBe(`${M.kalan} ${tl2(5000)}`);
  });
  it("AC-12: hiç ödenmemiş kalem ödeme listesi yerine ödenmediğini yazar", () => {
    ted();
    const a = ac(satir("Borç doğdu", "Somun"));
    expect(within(a).queryAllByTestId("ayrinti-odeme")).toHaveLength(0);
    expect(within(a).getByTestId("ayrinti-odenmedi").textContent).toContain(M.odenmedi);
  });
  it("AC-13: aralık verilmiş ekstrede ayrıntının listesi aralık dışındaki ödemeyi de gösterir", () => {
    ted();
    const [bas, bit] = screen.getByTestId("ekstre-penceresi").querySelectorAll('input[type="date"]');
    fireEvent.change(bas, { target: { value: "2026-09-01" } }); fireEvent.change(bit, { target: { value: "2026-09-30" } });
    expect(satirlar().some(s => s.textContent.startsWith("▸03/10/2026"))).toBe(false);
    expect(within(ac(satir("Borç doğdu", "M8 cıvata"))).getAllByTestId("ayrinti-odeme")).toHaveLength(2);
  });
  it("AC-14 / AC-46 (P2): ödeme ayrıntısı yöntem ve hesap; taksitli kalemde kapanan taksit (taksitAdi), taksitsizde hedef satırı yok", () => {
    ted();
    const a = ac(satir("Ödeme", "Pres kalıbı"));
    expect(a.textContent).toContain(`${M.yontem}Havale`);
    expect(a.textContent).toContain(`${M.hesap}Ziraat`);
    expect(a.textContent).toContain(`${M.taksit}${taksitAdi(TAKSITLI, TAKSITLI.taksitler[0].id, DAVRANIS.NORMAL)}`);
    expect(a.textContent).toMatch(/1\/3\. taksit/);
    const b = ac(satirlar().find(s => s.getAttribute("data-ad") === "10/09/2026 Ödeme"));
    expect(b.textContent).not.toContain(M.taksit); expect(b.textContent).not.toContain(M.hedef);
    // Tek satırlı ana hedefe bağlı ödeme (kira, taksitId dolu): hedef adı sabit metindir, yazılmaz (R5/2).
    const c = ac(satirlar().find(s => s.getAttribute("data-ad") === "15/09/2026 Ödeme"));
    expect(c.textContent).not.toContain(M.taksit); expect(c.textContent).not.toContain("Kiraya verene");
  });
  it("AC-14 (P2, çalışan): çalışan ekstresinde ödeme ayrıntısı kapattığı hedefin adını yazar", () => {
    cal();
    const a = ac(satir("Ödeme", ""));
    expect(a.textContent).toContain(M.hedef);
  });
  it("AC-15: döviz ödemenin ayrıntısı hesaptan çıkan dövizi ve kuru yazar", () => {
    ted();
    const a = ac(satirlar().find(s => s.getAttribute("data-ad") === "22/09/2026 Ödeme"));
    expect(a.textContent).toContain(`${M.hesaptanCikan}${paraMetni(600, "USD")}`);
    expect(a.textContent).toContain(`${M.odemeKuru}1 USD = ${kurMetni(40)} TL`);
    expect(a.textContent).toContain(`${M.hesap}Dolar`);
  });
  it("AC-57 (R5/4): yöntemi ve hesabı boş göç ödemesinde yöntem ve hesap satırı çizilmez", () => {
    ted();
    const a = ac(satir("Ödeme", "Eski fatura"));
    const etiketler = within(a).getAllByTestId("ayrinti-satir").map(x => x.textContent);
    expect(etiketler).toEqual([`${M.kalem}Eski fatura`]); // yöntem ve hesap satırı yok (Açıklama hücresinin bugünkü metni ayrıntının başlığında kalır)
  });
  it("AC-51 (R5/3): Kasa yetkisi olmayan kullanıcıda (hesap listesi boş) hesap satırı yok, 'Silinmiş hesap' yazılmaz", () => {
    ted({ hesaplar: [] });
    const a = ac(satirlar().find(s => s.getAttribute("data-ad") === "10/09/2026 Ödeme"));
    expect(a.textContent).not.toContain(M.hesap);
    expect(screen.getByTestId("ekstre-penceresi").textContent).not.toContain("Silinmiş hesap");
  });
  it("AC-16 / AC-17: çalışan maaş ayrıntısı resmi, elden ve ek ödeme kırılımı; KDV, tevkifat, stopaj satırı yok", () => {
    cal();
    const a = ac(satir("Maaş", ""));
    expect(a.textContent).toContain(`${M.resmi}${tl2(30000)}`);
    expect(a.textContent).toContain(`${M.elden}${tl2(5000)}`);
    expect(a.textContent).toContain(`${M.ekOdeme}${tl2(2000)}`);
    for (const t of [M.kdv, M.tevkifat, M.stopaj, M.matrah]) expect(a.textContent).not.toContain(t);
  });
  it("AC-47 (R1/3): devir satırı tıklanmaz; avans ve mahsup satırı tıklanır ve kendi ayrıntısını yazar", () => {
    cal();
    fireEvent.change(screen.getByTestId("ekstre-penceresi").querySelectorAll('input[type="date"]')[0], { target: { value: "2026-09-09" } });
    const devir = screen.getByTestId("ekstre-devir");
    expect(devir.getAttribute("role")).toBeNull(); expect(devir.getAttribute("aria-expanded")).toBeNull();
    fireEvent.change(screen.getByTestId("ekstre-penceresi").querySelectorAll('input[type="date"]')[0], { target: { value: "" } });
    const av = ac(satir("Avans", ""));
    expect(av.textContent).toContain(`${M.tarih}08/09/2026`); expect(av.textContent).toContain(`${M.hesap}Ziraat`); expect(av.textContent).toContain("Bayram avansı");
    const mh = ac(satir("Avanstan mahsup", ""));
    expect(mh.textContent).toContain(M.kalem); expect(mh.textContent).toContain(M.hedef);
  });
  it("AC-49 (R1/5): satırın içindeki düğmeler ayrıntıyı açmaz (avans silme, Kalemde göster)", () => {
    const onAvansSil = vi.fn();
    cal({ onAvansSil });
    fireEvent.click(within(kayit(satir("Avans", ""))).getByTitle(M.avansSil));
    expect(onAvansSil).toHaveBeenCalledTimes(1);
    expect(screen.queryAllByTestId("ekstre-ayrinti")).toHaveLength(0);
    cleanup();
    const onKalemdeGoster = vi.fn();
    ted({ onKalemdeGoster });
    const s = satir("Borç doğdu", "M8 cıvata");
    fireEvent.click(within(kayit(s)).getByText(M.kalemdeGoster));
    fireEvent.keyDown(within(kayit(s)).getByText(M.kalemdeGoster), { key: "Enter" });
    expect(onKalemdeGoster).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
    expect(s.getAttribute("aria-expanded")).toBe("false");
  });
  it("AC-37 (R1/2): aralık süzgeci değişince açık ayrıntı aynı kaydın üstünde kalır, komşu satıra geçmez", () => {
    ted();
    ac(satir("Borç doğdu", "Pres kalıbı"));
    fireEvent.change(screen.getByTestId("ekstre-penceresi").querySelectorAll('input[type="date"]')[0], { target: { value: "2026-09-11" } });
    const acik = screen.getAllByTestId("ekstre-ayrinti");
    expect(acik).toHaveLength(1);
    expect(acik[0].parentElement.firstChild.textContent).toContain("Pres kalıbı"); // kayıt kabının ilk çocuğu satır
  });
});

describe("Spec 0156: liste ve düğme", () => {
  it("AC-20 / AC-22: süzgeçten geçen bütün satırlar tek listede; sayfa düğmesi yok; özet motorun son bakiyesi", () => {
    ted();
    const r = tedarikciEkstresi(11, secenek());
    expect(satirlar()).toHaveLength(r.satirlar.length);
    expect(r.satirlar.length).toBeGreaterThan(10);
    expect(screen.queryByText(/Sonraki ›/)).toBeNull();
    expect(screen.getByTestId("ekstre-ozet").textContent).toBe(`${M.kalanBorc} ${tl2(r.bakiye)}`);
  });
  it("AC-21 / AC-23: tarih aralığı daraltılınca liste süzülür, devir en üstte bir kez, bakiye motorla yeniden", () => {
    ted();
    fireEvent.change(screen.getByTestId("ekstre-penceresi").querySelectorAll('input[type="date"]')[0], { target: { value: "2026-09-11" } });
    const r = tedarikciEkstresi(11, secenek({ bas: "2026-09-11", bit: "" }));
    expect(screen.getAllByTestId("ekstre-devir")).toHaveLength(1);
    const liste = screen.getByTestId("ekstre-devir").parentElement;
    expect(liste.children[1]).toBe(screen.getByTestId("ekstre-devir"));
    expect(satirlar()).toHaveLength(r.satirlar.length);
    expect(screen.getByTestId("ekstre-devir").textContent).toContain(tl2(r.devirK / 100));
  });
  it("AC-24: hareketi olmayan tedarikçide boş durum bugünkü metniyle", () => {
    render(<EkstrePenceresi baslik="Boş" tur="tedarikci" hesapla={(a) => tedarikciEkstresi(12, secenek(a))} onClose={vi.fn()} />);
    expect(screen.getByTestId("bos-ekstre").textContent).toContain("Bu tedarikçiye bağlı gider kalemi yok.");
  });
  it("AC-18 (R8): alt ipucu tevkifatın da vergi dairesine ödendiğini ve ekstreye girmediğini söyler", () => {
    ted();
    expect(screen.getByTestId("ekstre-penceresi").textContent).toContain("Kira stopajı ve KDV tevkifatı vergi dairesine ödenir, bu ekstreye girmez");
  });
  it("AC-26 / AC-27 / AC-29 (R14, R16): düğme borç ve ödeme satırında; avans/maaş satırında ve çalışan ekstresinde yok", () => {
    ted();
    const borcSatiri = satir("Borç doğdu", "M8 cıvata"), odeme = satirlar().find(s => s.getAttribute("data-ad") === "10/09/2026 Ödeme");
    expect(within(kayit(borcSatiri)).getByText(M.kalemdeGoster)).toBeTruthy();
    expect(within(kayit(odeme)).getByText(M.kalemdeGoster)).toBeTruthy();
    cleanup();
    cal({ onKalemdeGoster: vi.fn() });
    expect(screen.queryByText(M.kalemdeGoster)).toBeNull();
  });
  it("AC-28 (R17/2): kalemi bulunmayan ödeme satırında düğme çizilmez (saf satır nesnesi; motor yoluyla doğmaz)", () => {
    const sat = { anahtar: "odeme::9", tarih: "2026-09-10", tur: "odeme", kalem: null, hareket: { id: 9, tarih: "2026-09-10", yontem: "Havale", hesapId: null }, etkiK: -100, tutarK: 100, bakiyeK: -100 };
    render(<EkstrePenceresi baslik="X" tur="tedarikci" hesapla={() => ({ satirlar: [sat], devirK: null, bakiyeK: -100 })} onKalemdeGoster={vi.fn()} onClose={vi.fn()} />);
    expect(screen.queryByText(M.kalemdeGoster)).toBeNull();
  });
  it("AC-56 (C5/3, P6): üç yüz satırlık ekstre üç saniyenin altında çizilir (ayrıntılar kapalı)", () => {
    const sat = Array.from({ length: 300 }, (_, i) => ({ anahtar: `borc:${i}:`, tarih: "2026-09-01", tur: "borc", kalem: { id: i, aciklama: `Fatura ${i}`, tarih: "2026-09-01" },
      etkiK: 100, tutarK: 100, bakiyeK: 100 * (i + 1), vergi: { kira: false, matrahK: 100, kdvK: 0, tevkifatK: 0, stopajK: 0, indirilemeyenK: 0, odenecekK: 100 }, odemeler: [], kalanK: 100 }));
    const t0 = performance.now();
    render(<EkstrePenceresi baslik="X" tur="tedarikci" hesapla={() => ({ satirlar: sat, devirK: null, bakiyeK: 30000 })} onKalemdeGoster={vi.fn()} onClose={vi.fn()} />);
    const sure = performance.now() - t0;
    expect(satirlar()).toHaveLength(300);
    expect(sure).toBeLessThan(3000);
  });
});

describe("Spec 0156 triyaj", () => {
  it("bulgu 1 (R6, 0070 R8): yol paralı maaşta ayrıntı yol parasını kendi satırıyla yazar; satırların toplamı satırın tutarına eşit", () => {
    const k = giderKalemDogrula({ ...PERSONEL, id: 30, yolParasi: 1000, taksitler: undefined }, { turMap, tedarikciler, uid: (() => { let n = 9500; return () => ++n; })() }).kayit;
    const hesapla = (a) => calisanEkstresi(21, secenek(a, { giderler: [k], hareketler: [] }));
    render(<EkstrePenceresi baslik="Çalışan" tur="calisan" hesapla={hesapla} hesapAdi={() => ""} onClose={vi.fn()} />);
    const satirTutari = hesapla(null).satirlar[0].tutarK;
    expect(satirTutari).toBe(3800000);
    const a = ac(satir("Maaş", ""));
    expect(a.textContent).toContain(`${M.yolParasi}${tl2(1000)}`);
    const sayi = (t) => Number(t.replace(/[^\d,]/g, "").replace(",", "."));
    const toplam = within(a).getAllByTestId("ayrinti-satir").filter(x => [M.resmi, M.elden, M.ekOdeme, M.yolParasi].some(e => x.textContent.startsWith(e)))
      .reduce((t, x) => t + sayi(x.textContent.replace(/^[^\d]*/, "")), 0);
    expect(toplam).toBe(tl(satirTutari));
  });
  it("bulgu 1: yol parasız maaşta yol parası satırı yok (kırılım spec öncesiyle aynı)", () => {
    cal();
    expect(ac(satir("Maaş", "")).textContent).not.toContain(M.yolParasi);
    expect(calisanEkstresi(21, secenek()).satirlar.find(s => s.tur === "maas").kirilim).not.toHaveProperty("yolK");
  });
  it("bulgu 2 (R1/4): rol ilk beş hücrede; içinde düğme yok, düğmeler kardeş hücrede; ad tarih + işlem, açıklama Tutar ve Bakiye'yi taşır", () => {
    ted();
    for (const s of satirlar()) expect(s.querySelector("button"), s.getAttribute("data-ad")).toBeNull();
    const s = satir("Borç doğdu", "M8 cıvata");
    expect(s.getAttribute("role")).toBe("button");
    expect(s.hasAttribute("aria-label")).toBe(false);
    expect(computeAccessibleName(s)).toBe("02/09/2026 Borç doğdu");
    const aciklamaMetni = computeAccessibleDescription(s);
    expect(aciklamaMetni).toContain("M8 cıvata"); expect(aciklamaMetni).toContain(tl2(12000));
    const eylem = s.closest('[data-testid="ekstre-kayit"]').querySelector('[data-testid="ekstre-satir-eylem"]');
    expect(eylem.parentElement).toBe(s.parentElement);
    expect(within(eylem).getByText(M.kalemdeGoster)).toBeTruthy();
  });
});
