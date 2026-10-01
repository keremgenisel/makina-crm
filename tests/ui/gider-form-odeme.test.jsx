// @vitest-environment jsdom
// Spec 0046: gider formundan hedef bazlı ödeme, hesap seçimi ve çek cirosu (gerçek Giderler bileşeni, durumlu düzenek).
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { Giderler } from "../../src/components/Giderler";
import { hesapBakiyeleri } from "../../src/lib/kasa";
import { cekleriUygula } from "../../src/lib/cek";

afterEach(() => { cleanup(); vi.useRealTimers(); });
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-09-23T10:00:00")); });

const TURLER = [{ id: 1, ad: "Kira", davranis: "kira" }, { id: 3, ad: "Personel", davranis: "personel" }, { id: 4, ad: "Hammadde", davranis: "normal" }];
const CAL = [{ id: 21, ad: "Hasan Çelik", resmiMaliyet: 30000, eldenMaliyet: 20000 }, { id: 22, ad: "Ali Yıldız", resmiMaliyet: 25000 }];
const TED = [{ id: 11, ad: "Yıldız Gayrimenkul" }];
const HESAP = [{ id: 51, ad: "Ziraat", tur: "banka", paraBirimi: "TRY", acilisBakiyesi: 100000, kapali: false },
  { id: 52, ad: "Kasa", tur: "kasa", paraBirimi: "TRY", acilisBakiyesi: 50000, kapali: false },
  { id: 53, ad: "Dolar", tur: "banka", paraBirimi: "USD", acilisBakiyesi: 0, kapali: false }];
// Son ödeme Kasa (52) hesabından: ön seçim (AC-13).
const ONCEKI = [{ id: 900, tur: "odeme", tarih: "2026-09-01", tutar: 10, hesapId: 52, giderId: 999, taksitId: null }];
const P = [{ id: 100, customerId: 1, tarih: "2026-09-01", tutar: 12000, currency: "TRY", yontem: "Çek", vadeTarihi: "2026-10-15" }];
const C = [{ id: 200, paymentId: 100, no: "123456", banka: "Ziraat", kesideci: "Ali", tur: "hamiline", durum: "portfoy", gecmis: [] }];
const ODEMECI = { role: "user", permissions: JSON.stringify({ tabs: ["gider"], giderActions: ["gider_add", "gider_edit"] }) };

function H({ g0 = [], h0 = ONCEKI, c0 = C, kasaYetki = true, perms = null, onState, izle }) {
  const [giderler, setGiderler] = useState(g0);
  const [hesapHareketleri, setHesapHareketleri] = useState(h0);
  const [cekler, setCekler] = useState(c0);
  const [giderTanimlari, setGiderTanimlari] = useState([]);
  const [tedarikciler, setTedarikciler] = useState(TED);
  const [standartGiderler, setStandartGiderler] = useState([]);
  const st = { giderler, hesapHareketleri, cekler };
  onState?.(st); izle?.push(st);
  return <Giderler giderler={giderler} setGiderler={setGiderler} hesapHareketleri={hesapHareketleri} setHesapHareketleri={setHesapHareketleri}
    giderTanimlari={giderTanimlari} setGiderTanimlari={setGiderTanimlari} giderTurleri={TURLER} tedarikciler={tedarikciler} setTedarikciler={setTedarikciler}
    standartGiderler={standartGiderler} setStandartGiderler={setStandartGiderler} calisanlar={CAL} standardModels={[]} customModels={[]}
    appSettings={{ giderAyarlari: { yururlukAy: "2026-06", stopajOrani: 20 } }} serverPermissions={perms}
    kasaHesaplari={HESAP} kasaYetki={kasaYetki} cekler={kasaYetki ? cekler : []} setCekler={kasaYetki ? setCekler : null} payments={kasaYetki ? cekleriUygula(P, cekler) : []}
    satisVerisi={{ customers: [], services: [], partSales: [], payments: [], teklifler: [], dealers: [], yedekParcaSatislar: [] }} showToast={vi.fn()} />;
}
const degis = (el, value) => fireEvent.change(el, { target: { value } });
const L = (ad) => screen.getByLabelText(ad);
const yeni = (turId) => { fireEvent.click(screen.getAllByRole("button", { name: /Yeni Gider/ })[0]); degis(L("Gider türü *"), String(turId)); };
const kaydetBtn = () => fireEvent.click(screen.getAllByText("Kaydet").filter(e => e.closest("button")).pop());
const secenekler = (el) => [...el.querySelectorAll("option")].map(o => o.textContent);
const satirlar = () => screen.getAllByTestId("form-odeme-satiri");
const personelAc = () => { yeni(3); degis(L("Çalışan *"), "21"); };
const normalAc = (tutar = "10000", ted = "11") => { yeni(4); degis(L("Tutar"), tutar); degis(L("KDV oranı"), "0"); if (ted) degis(L("Tedarikçi"), ted); };

describe("Spec 0046: hedef bazlı ödeme satırları", () => {
  it("AC-1 / AC-38 / AC-13 / AC-35 (spec 0048 AC-13: yeni kalem kipinde bugünkü davranış değişmez): personelde Resmi ve Elden iki satır, bu sırayla; son kullanılan hesap ön seçili; yalnız açık TL hesaplar", () => {
    render(<H />);
    personelAc();
    expect(satirlar().map(s => s.dataset.hedef)).toEqual(["ana", "elden"]);
    fireEvent.click(L("Resmi ödendi"));
    fireEvent.click(L("Elden ödendi"));
    expect(L("Resmi hesabı").value).toBe("52");
    expect(L("Elden hesabı").value).toBe("52");
    expect(secenekler(L("Resmi hesabı"))).toEqual(["Hesap belirtilmedi", "Ziraat (Banka)", "Kasa (Kasa)"]);
  });
  it("AC-2 / AC-3: resmi bankadan havaleyle, elden kasadan nakitle; iki ayrı hareket ve iki hesap ayrı düşer", () => {
    let st;
    render(<H onState={s => { st = s; }} />);
    personelAc();
    fireEvent.click(L("Resmi ödendi"));
    degis(L("Resmi ödeme yöntemi"), "Havale");
    degis(L("Resmi hesabı"), "51");
    fireEvent.click(L("Elden ödendi"));
    degis(L("Elden ödeme yöntemi"), "Nakit");
    kaydetBtn();
    const yeniler = st.hesapHareketleri.filter(h => h.id !== 900);
    expect(yeniler.map(h => [h.tutar, h.yontem, h.hesapId])).toEqual([[30000, "Havale", 51], [20000, "Nakit", 52]]);
    const b = hesapBakiyeleri(HESAP, yeniler, {});
    expect([b.get("51").bakiye, b.get("52").bakiye]).toEqual([70000, 30000]);
  });
  it("AC-4 / AC-5 / AC-11: kirada kiraya veren ve stopaj satırı; ana taksitliyken pasif ve nedenli, stopaj ayrı hesaptan ödenir", () => {
    let st;
    render(<H onState={s => { st = s; }} />);
    yeni(1);
    degis(L("Brüt kira"), "20000");
    degis(L("KDV oranı"), "0");
    degis(L("Tedarikçi (kiraya veren)"), "11");
    expect(satirlar().map(s => s.dataset.hedef)).toEqual(["ana", "stopaj"]);
    degis(L("Taksit sayısı"), "3");
    degis(screen.getByLabelText("İlk taksitin vadesi"), "2026-09-30");
    const ana = satirlar()[0];
    expect(within(ana).queryByLabelText("Kiraya verene ödendi")).toBeNull();
    expect(ana.textContent).toMatch(/taksitli; taksitler kalem kaydedildikten sonra ödenir/); // spec 0053: form da öder
    fireEvent.click(L("Vergi dairesine (stopaj) ödendi"));
    degis(L("Vergi dairesine (stopaj) hesabı"), "51");
    kaydetBtn();
    const h = st.hesapHareketleri.filter(x => x.id !== 900);
    expect(h).toHaveLength(1);
    expect(h[0]).toMatchObject({ tutar: 4000, hesapId: 51 });
    expect(st.giderler[0].taksitler.find(r => r.id === h[0].taksitId).hedef).toBe("stopaj");
  });
  it("AC-6 / AC-7 / AC-8: stopajsız kira, eldensiz personel ve normal kalem tek satır", () => {
    render(<H />);
    yeni(1); degis(L("Brüt kira"), "20000"); degis(L("Stopaj oranı"), "0");
    expect(satirlar().map(s => s.dataset.hedef)).toEqual(["ana"]);
    fireEvent.click(screen.getByText("İptal"));
    yeni(3); degis(L("Çalışan *"), "22");
    expect(satirlar().map(s => s.dataset.hedef)).toEqual(["ana"]);
    fireEvent.click(screen.getByText("İptal"));
    normalAc();
    expect(satirlar()).toHaveLength(1);
    fireEvent.click(L("Tedarikçiye ödendi"));
    expect(L("Tedarikçiye hesabı")).toBeTruthy();
  });
  it("AC-9: hiçbir satır işaretlenmezse kalem ödenmemiş kaydedilir", () => {
    let st;
    render(<H onState={s => { st = s; }} />);
    normalAc();
    kaydetBtn();
    expect(st.giderler).toHaveLength(1);
    expect(st.hesapHareketleri).toEqual(ONCEKI);
  });
  it("AC-10 / AC-14: eksik tutar kısmen öder; hesap boş bırakılan ödeme hesapsız kaydedilir", () => {
    let st;
    render(<H onState={s => { st = s; }} />);
    normalAc();
    fireEvent.click(L("Tedarikçiye ödendi"));
    degis(L("Tedarikçiye ödeme tutarı"), "4000");
    degis(L("Tedarikçiye hesabı"), "");
    kaydetBtn();
    const h = st.hesapHareketleri.find(x => x.id !== 900);
    expect(h).toMatchObject({ tutar: 4000, hesapId: null });
    expect(within(screen.getByTestId("kalem-listesi")).getByText(/Kısmen/)).toBeTruthy();
  });
  it("AC-12 / AC-27 / AC-31: kalandan fazla ya da sıfır tutarda hata o satırda; ne kalem ne hareket yazılır", () => {
    let st;
    render(<H onState={s => { st = s; }} />);
    normalAc();
    fireEvent.click(L("Tedarikçiye ödendi"));
    degis(L("Tedarikçiye ödeme tutarı"), "15000");
    kaydetBtn();
    expect(satirlar()[0].textContent).toMatch(/Kalandan fazla ödeme kaydedilemez/);
    degis(L("Tedarikçiye ödeme tutarı"), "0");
    kaydetBtn();
    expect(satirlar()[0].textContent).toMatch(/Tutar sıfırdan büyük olmalı/);
    expect(st.giderler).toEqual([]);
    expect(st.hesapHareketleri).toEqual(ONCEKI);
  });
  // Spec 0053 R25 (AC-45): her hedefin İLK satırını son kullanılan yöntem ve hesapla doldurur; dolu satırlara ve ek satırlara
  // dokunmaz (ikinci basış değişikliği geri almaz). Kalemin "Varsayılan ödeme yöntemi" alanı kalktı (R1).
  it("AC-30 / 0053 AC-45: 'Hepsini ödendi işaretle' her hedefin ilk satırını doldurur; ikinci basış dolu satırlara dokunmaz", () => {
    let st;
    render(<H h0={[{ ...ONCEKI[0], yontem: "Havale" }]} onState={s => { st = s; }} />);
    personelAc();
    fireEvent.click(L("Hepsini ödendi işaretle"));
    expect([L("Resmi ödeme tutarı").value, L("Elden ödeme tutarı").value]).toEqual(["30.000", "20.000"]);
    expect([L("Resmi ödeme yöntemi").value, L("Elden hesabı").value]).toEqual(["Havale", "52"]);
    degis(L("Elden ödeme yöntemi"), "Nakit");
    fireEvent.click(screen.getByRole("button", { name: "Elden için başka yöntemle satır ekle" }));
    fireEvent.click(L("Hepsini ödendi işaretle"));
    expect(L("Elden ödeme yöntemi").value).toBe("Nakit");
    expect(screen.getAllByTestId("form-odeme-satir")).toHaveLength(3);
    fireEvent.click(screen.getAllByTitle("Satırı kaldır").pop());
    kaydetBtn();
    expect(st.hesapHareketleri.filter(h => h.id !== 900).map(h => h.yontem)).toEqual(["Havale", "Nakit"]);
  });
  it("AC-32: bütün hedefleri taksitli kalemde satır yerine tek açıklama", () => {
    render(<H />);
    normalAc();
    degis(L("Taksit sayısı"), "4");
    expect(screen.queryAllByTestId("form-odeme-satiri")).toHaveLength(0);
    expect(screen.getByTestId("form-odeme-hepsi-taksitli").textContent).toMatch(/bütün ödemeleri taksitli/);
  });
});

describe("Spec 0046: çek cirosu", () => {
  it("AC-15 / AC-16 / AC-18 / AC-20 / AC-22 / AC-39: çek seçilir, fark uyarısı motordan; kalem, ciro hareketi ve çek AYNI güncellemede yazılır", () => {
    const izle = [];
    render(<H izle={izle} />);
    normalAc("10000");
    fireEvent.click(L("Tedarikçiye ödendi"));
    const yontem = L("Tedarikçiye ödeme yöntemi");
    expect(secenekler(yontem)).toContain("Çek (ciro)");
    degis(yontem, "Çek (ciro)");
    expect(screen.queryByLabelText("Tedarikçiye hesabı")).toBeNull(); // ciro hesapsız
    expect(secenekler(L("Tedarikçiye çek"))).toEqual(["Çek seçin", "123456 · Ziraat · Ali · 12.000 ₺ · vade 15/10/2026"]);
    degis(L("Tedarikçiye çek"), "200");
    expect(screen.getByTestId("form-odeme-ciro-uyari").textContent).toBe("Çek tutarı kapatılan borçlardan 2.000,00 ₺ fazla. Fark hiçbir borcu kapatmaz ve alacak olarak işlenmez; gerekirse açıklamaya yazın.");
    const once = izle.length;
    kaydetBtn();
    const son = izle[izle.length - 1];
    const ilk = izle.slice(once).find(s => s.giderler.length === 1); // kalemin ilk göründüğü çizim
    expect(ilk.cekler[0].durum).toBe("ciro");
    expect(ilk.hesapHareketleri.some(h => h.cekId === 200)).toBe(true);
    expect(son.hesapHareketleri.find(h => h.cekId === 200)).toMatchObject({ tutar: 10000, yontem: "Çek (ciro)", hesapId: null, giderId: son.giderler[0].id });
    expect(son.cekler[0].gecmis.pop()).toMatchObject({ durum: "ciro", not: "Ciro: Yıldız Gayrimenkul" });
  });
  it("AC-19: stopaj ve elden satırında 'Çek (ciro)' seçeneği yok, nedeni yazılır", () => {
    render(<H />);
    yeni(1); degis(L("Brüt kira"), "20000"); degis(L("KDV oranı"), "0"); degis(L("Tedarikçi (kiraya veren)"), "11");
    fireEvent.click(L("Kiraya verene ödendi"));
    fireEvent.click(L("Vergi dairesine (stopaj) ödendi"));
    expect(secenekler(L("Kiraya verene ödeme yöntemi"))).toContain("Çek (ciro)");
    expect(secenekler(L("Vergi dairesine (stopaj) ödeme yöntemi"))).not.toContain("Çek (ciro)");
    expect(satirlar()[1].textContent).toMatch(/Vergi dairesine çekle ödeme yapılmaz/);
    fireEvent.click(screen.getByText("İptal"));
    personelAc();
    fireEvent.click(L("Elden ödendi"));
    expect(secenekler(L("Elden ödeme yöntemi"))).not.toContain("Çek (ciro)");
    expect(satirlar()[1].textContent).toMatch(/Elden ödeme çekle yapılmaz/);
  });
  it("AC-21: portföyde çek yokken neden okunur; yöntem değiştirilince kayıt yapılır", () => {
    let st;
    render(<H c0={[]} onState={s => { st = s; }} />);
    normalAc();
    fireEvent.click(L("Tedarikçiye ödendi"));
    degis(L("Tedarikçiye ödeme yöntemi"), "Çek (ciro)");
    expect(screen.getByTestId("form-odeme-cek-yok").textContent).toMatch(/Portföyde ciro edilebilecek/);
    degis(L("Tedarikçiye ödeme yöntemi"), "Havale");
    kaydetBtn();
    expect(st.giderler).toHaveLength(1);
  });
  it("AC-33: tedarikçisiz kalemde ciro için ad yazılır; boşsa kayıt yok ve neden satırda", () => {
    let st;
    render(<H onState={s => { st = s; }} />);
    normalAc("10000", null);
    fireEvent.click(L("Tedarikçiye ödendi"));
    degis(L("Tedarikçiye ödeme yöntemi"), "Çek (ciro)");
    degis(L("Tedarikçiye çek"), "200");
    kaydetBtn();
    expect(satirlar()[0].textContent).toMatch(/Kime ciro edildiği girilmedi/);
    expect(st.giderler).toEqual([]);
    degis(L("Kime ciro edildi"), "Serbest Usta");
    kaydetBtn();
    expect(st.cekler[0].gecmis.pop().not).toBe("Ciro: Serbest Usta");
  });
  it("AC-34 / AC-26: kasa yetkisi yokken ciro seçeneği, çek listesi ve hesap seçici yok; ödeme hesapsız kaydedilir", () => {
    let st;
    render(<H kasaYetki={false} onState={s => { st = s; }} />);
    normalAc();
    fireEvent.click(L("Tedarikçiye ödendi"));
    expect(secenekler(L("Tedarikçiye ödeme yöntemi"))).not.toContain("Çek (ciro)");
    expect(screen.queryByLabelText("Tedarikçiye hesabı")).toBeNull();
    kaydetBtn();
    expect(st.hesapHareketleri.find(h => h.id !== 900)).toMatchObject({ tutar: 10000, hesapId: null });
  });
});

describe("Spec 0046: izin ve düzenleme", () => {
  it("AC-25: gider_odeme izni yokken ödeme satırları çizilmez; kalem yine kaydedilir", () => {
    let st;
    render(<H perms={ODEMECI} onState={s => { st = s; }} />);
    normalAc();
    expect(screen.queryByTestId("form-odeme")).toBeNull();
    kaydetBtn();
    expect(st.giderler).toHaveLength(1);
  });
  const KISMEN = { id: 700, tarih: "2026-09-10", turId: 4, tutar: 10000, kdvOrani: 0, tedarikciId: 11, sonOdemeTarihi: "2026-09-30", modelSatirlari: [] };
  const KISMI_ODEME = [{ id: 701, tur: "odeme", tarih: "2026-09-15", tutar: 4000, hesapId: 51, giderId: 700, taksitId: null, yontem: "Havale" }];
  const duzenle = () => fireEvent.click(within(screen.getByTestId("kalem-listesi")).getByTitle("Düzenle"));
  // Spec 0053 R15 (0046 R15'i geri alır; AC-23): düzenleme formunda ödeme girilir ve kalemle aynı kayıtta yazılır.
  it("0053 AC-23: düzenlemede hedef 'Kısmen · kalan'; ödeme formdan kalan dolu girilir ve kalemle birlikte kaydedilir", () => {
    let st;
    render(<H g0={[KISMEN]} h0={KISMI_ODEME} onState={s => { st = s; }} />);
    duzenle();
    const d = screen.getByTestId("form-odeme-durum-satiri");
    expect(d.textContent).toMatch(/Tedarikçiye · 10\.000 ₺Kısmen · kalan 6\.000 ₺/);
    fireEvent.click(L("Tedarikçiye ödendi"));
    expect(L("Tedarikçiye ödeme tutarı").value).toBe("6.000");
    expect(screen.queryByTestId("odeme-kayit-penceresi")).toBeNull();
    kaydetBtn();
    expect(st.hesapHareketleri.filter(h => h.giderId === 700).map(h => h.tutar)).toEqual([4000, 6000]);
    duzenle();
    expect(screen.getByTestId("form-odeme-durum-satiri").textContent).toMatch(/Ödendi/);
  });
  it("AC-37: gider_odeme izni yokken düğme yok, durum okunur", () => {
    render(<H g0={[KISMEN]} h0={KISMI_ODEME} perms={ODEMECI} />);
    duzenle();
    const d = screen.getByTestId("form-odeme-durum-satiri");
    expect(d.textContent).toMatch(/Kısmen · kalan 6\.000 ₺/);
    expect(within(d).queryByText("Ödeme gir")).toBeNull();
  });
  // 0046 triyaj (Q7) korunur, artık formun kendi ödemesiyle: ödenmiş taksit kayıtta korunur; tutar ödenmiş taksitlerin altına
  // düşürülünce kayıt reddedilir.
  it("triyaj (Q7): formdan ödenen taksit korunur; tutar ödenmiş taksitlerin altına düşürülünce kayıt reddedilir", () => {
    let st;
    const TAKSITLI = { id: 710, tarih: "2026-09-10", turId: 4, tutar: 12000, kdvOrani: 0, tedarikciId: 11, sonOdemeTarihi: "2026-09-30", modelSatirlari: [],
      taksitler: [1, 2, 3].map(i => ({ id: 7100 + i, hedef: "ana", sira: i, vade: `2026-${String(8 + i).padStart(2, "0")}-30`, tutar: 4000, odendi: false, odemeTarihi: null }))};
    render(<H g0={[TAKSITLI]} h0={[]} onState={s => { st = s; }} />);
    duzenle();
    fireEvent.click(L("Tedarikçiye ödendi"));
    expect(L("Tedarikçiye ödeme tutarı").value).toBe("4.000");
    kaydetBtn();
    expect(st.hesapHareketleri).toEqual([expect.objectContaining({ giderId: 710, taksitId: 7101, tutar: 4000 })]);
    duzenle();
    degis(L("Tutar"), "3000");
    kaydetBtn();
    expect(screen.getAllByText(/Ödenmiş taksitlerin toplamı \(4\.000 ₺\) yeni ödenecek tutarı aşıyor/).length).toBeGreaterThan(0);
    expect(st.giderler[0].tutar).toBe(12000);
    expect(st.giderler[0].taksitler.map(r => r.tutar)).toEqual([4000, 4000, 4000]);
  });
});

describe("Spec 0049 B: kendi çekimiz (gider formu ve ödeme penceresi)", () => {
  it("AC-20: formun ANA satırından 'Çek (kendi)' ile çek yazılır; kalem, hareket ve yeni çek aynı güncellemede", () => {
    const izle = [];
    render(<H izle={izle} />);
    normalAc("10000");
    fireEvent.click(L("Tedarikçiye ödendi"));
    degis(L("Tedarikçiye ödeme yöntemi"), "Çek (kendi)");
    expect(screen.queryByLabelText("Tedarikçiye hesabı")).toBeNull();
    expect(secenekler(L("Tedarikçiye çek hesabı"))).toEqual(["Hesap seçin", "Ziraat"]); // yalnız TL banka
    degis(L("Tedarikçiye çek numarası"), "B-1");
    degis(L("Tedarikçiye çek hesabı"), "51");
    degis(L("Tedarikçiye çek vadesi"), "2026-10-20");
    const once = izle.length;
    kaydetBtn();
    const son = izle[izle.length - 1];
    expect(izle.length).toBe(once + 1);
    const yeniCek = son.cekler.find(c => c.yon === "verilen");
    expect(yeniCek).toMatchObject({ no: "B-1", hesapId: 51, tutar: 10000, durum: "yazildi", alacakliAd: "Yıldız Gayrimenkul", vadeTarihi: "2026-10-20" });
    expect(son.hesapHareketleri.find(h => h.cekId === yeniCek.id)).toMatchObject({ tutar: 10000, yontem: "Çek (kendi)", hesapId: null, giderId: son.giderler[0].id });
  });
  it("R9 / Q6: kasa yetkisi yokken 'Çek (kendi)' seçeneği yok; elden satırında da yok", () => {
    render(<H kasaYetki={false} />);
    normalAc();
    fireEvent.click(L("Tedarikçiye ödendi"));
    expect(secenekler(L("Tedarikçiye ödeme yöntemi"))).not.toContain("Çek (kendi)");
    cleanup();
    render(<H />);
    personelAc();
    fireEvent.click(L("Elden ödendi"));
    expect(secenekler(L("Elden ödeme yöntemi"))).not.toContain("Çek (kendi)");
  });
  // Spec 0053 R10, R15 (AC-26, AC-36): kendi çek satırın yöntemidir; mevcut gider düzenleme formundan kendi çekle ödenir.
  // Pencerede eski "Kendi çekiyle öde" düğmesi yoktur.
  it("0053 AC-26 / AC-36: mevcut gider formdan kendi çekimizle ödenir; pencerede 'Kendi çekiyle öde' düğmesi yok", () => {
    let st;
    const KALEM = { id: 720, tarih: "2026-09-10", turId: 4, tutar: 10000, kdvOrani: 0, tedarikciId: 11, sonOdemeTarihi: "2026-09-30", modelSatirlari: [] };
    render(<H g0={[KALEM]} h0={[]} onState={s => { st = s; }} />);
    fireEvent.click(within(screen.getByTestId("kalem-listesi")).getByTitle("Ödeme kaydet"));
    expect(screen.queryByText("Kendi çekiyle öde")).toBeNull();
    expect([...within(screen.getByTestId("odeme-kayit-penceresi")).getByLabelText("Ödeme yöntemi").querySelectorAll("option")].map(o => o.value)).toContain("Çek (kendi)");
    fireEvent.click(screen.getByText("Vazgeç"));
    fireEvent.click(within(screen.getByTestId("kalem-listesi")).getByTitle("Düzenle"));
    fireEvent.click(L("Tedarikçiye ödendi"));
    degis(L("Tedarikçiye ödeme yöntemi"), "Çek (kendi)");
    degis(L("Tedarikçiye çek numarası"), "B-2");
    degis(L("Tedarikçiye çek hesabı"), "51");
    degis(L("Tedarikçiye çek vadesi"), "2026-10-20");
    expect(L("Tedarikçiye ödeme tutarı").value).toBe("10.000"); // kalemin kalanıyla ön dolu
    kaydetBtn();
    expect(st.cekler.find(c => c.no === "B-2")).toMatchObject({ yon: "verilen", tutar: 10000, alacakliAd: "Yıldız Gayrimenkul" });
    expect(st.hesapHareketleri).toEqual([expect.objectContaining({ giderId: 720, tutar: 10000, yontem: "Çek (kendi)" })]);
  });
});
