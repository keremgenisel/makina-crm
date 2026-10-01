// @vitest-environment jsdom
// Spec 0048: gider düzenleme formundaki "Ödeme" kutusu canlı (gerçek Giderler bileşeni, durumlu düzenek).
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { Giderler } from "../../src/components/Giderler";
import { PERSONEL_BOLUNMEZ_NEDENI } from "../../src/lib/gider";

afterEach(() => { cleanup(); vi.useRealTimers(); });
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-09-23T10:00:00")); });

const TURLER = [{ id: 1, ad: "Kira", davranis: "kira" }, { id: 3, ad: "Personel", davranis: "personel" }, { id: 4, ad: "Hammadde", davranis: "normal" }];
const CAL = [{ id: 21, ad: "Hasan Çelik", resmiMaliyet: 30000 }];
const TED = [{ id: 11, ad: "Yıldız Gayrimenkul" }];
const HESAP = [{ id: 51, ad: "Ziraat", tur: "banka", paraBirimi: "TRY", acilisBakiyesi: 100000, kapali: false }];

function H({ g0 = [], h0 = [], onState }) {
  const [giderler, setGiderler] = useState(g0);
  const [hesapHareketleri, setHesapHareketleri] = useState(h0);
  const [giderTanimlari, setGiderTanimlari] = useState([]);
  const [tedarikciler, setTedarikciler] = useState(TED);
  const [standartGiderler, setStandartGiderler] = useState([]);
  onState?.({ giderler, hesapHareketleri });
  return <Giderler giderler={giderler} setGiderler={setGiderler} hesapHareketleri={hesapHareketleri} setHesapHareketleri={setHesapHareketleri}
    giderTanimlari={giderTanimlari} setGiderTanimlari={setGiderTanimlari} giderTurleri={TURLER} tedarikciler={tedarikciler} setTedarikciler={setTedarikciler}
    standartGiderler={standartGiderler} setStandartGiderler={setStandartGiderler} calisanlar={CAL} standardModels={[]} customModels={[]}
    appSettings={{ giderAyarlari: { yururlukAy: "2026-06", stopajOrani: 20 } }} serverPermissions={null}
    kasaHesaplari={HESAP} kasaYetki cekler={[]} setCekler={vi.fn()} payments={[]}
    satisVerisi={{ customers: [], services: [], partSales: [], payments: [], teklifler: [], dealers: [], yedekParcaSatislar: [] }} showToast={vi.fn()} />;
}
const degis = (el, value) => fireEvent.change(el, { target: { value } });
const L = (ad) => screen.getByLabelText(ad);
const duzenle = () => {
  const liste = screen.getByTestId("kalem-listesi");
  const ac = within(liste).queryByText(/Çalışanları göster/); // personel satırları ayrıntı açılınca görünür
  if (ac) fireEvent.click(ac);
  fireEvent.click(within(liste).getAllByTitle("Düzenle")[0]);
};
const kaydetBtn = () => fireEvent.click(screen.getAllByText("Kaydet").filter(e => e.closest("button")).pop());
const iptal = () => fireEvent.click(screen.getAllByText("İptal").filter(e => e.closest("button")).pop());
const satir = (hedef) => screen.getAllByTestId("form-odeme-durum-satiri").find(s => s.dataset.hedef === hedef);
const hedefler = () => screen.queryAllByTestId("form-odeme-durum-satiri").map(s => s.dataset.hedef);
const ekEkle = (resmi, elden) => {
  fireEvent.click(screen.getByText("Ek ödeme ekle"));
  const i = screen.getAllByTestId("ek-odeme-satiri").length;
  if (resmi) degis(L(`Ek ödeme resmi ${i}`), resmi);
  if (elden) degis(L(`Ek ödeme elden ${i}`), elden);
};
const od = (id, tutar, giderId, extra = {}) => ({ id, tur: "odeme", tarih: "2026-09-15", tutar, hesapId: 51, giderId, taksitId: null, yontem: "Havale", ...extra });
// Ödeme planı önizlemesinde bir hedefe ait satırların toplamı (AC-12).
const planToplami = (ad) => {
  const plan = screen.getByTestId("odeme-plani-onizleme");
  const grup = [...plan.children].find(g => g.firstChild.textContent.startsWith(ad));
  return within(grup).getAllByTestId("odeme-satiri").map(r => r.querySelector("b").textContent).join(" + ");
};

const PERS = { id: 10, tarih: "2026-09-01", turId: 3, calisanId: 21, resmiTutar: 30000, eldenTutar: 0, ekOdemeler: [], sonOdemeTarihi: "2026-09-30", modelSatirlari: [] };
const NORMAL = { id: 20, tarih: "2026-09-01", turId: 4, tutar: 39500, kdvOrani: 0, tedarikciId: 11, sonOdemeTarihi: "2026-09-30", modelSatirlari: [] };

describe("Spec 0048: personel ek ödemesi kutuya anında yansır", () => {
  // Spec 0053 R15, R24 (AC-40): formda ödeme kalem ile aynı yazımda girildiği için yeni doğan Elden hedefine de ödeme girilir;
  // 0048'in "Kaydedince ödenebilir" ibaresi formda yoktur (pencere yolunun bilgisi olarak motorda kalır).
  // Spec 0054 R1, R4 ile güncellendi: elden ek ödeme maaş eldenine değil, kendi "Ek ödeme (elden)" hedefine düşer; formda hemen
  // ödenebilir (0053 R24) ve kaldırılınca kalkar.
  it("AC-1 / AC-2 / AC-19 / AC-12 / AC-11 / AC-23 (0053 AC-40, 0054 R1): elden ek ödeme kendi hedefi olarak doğar ve hemen ödenebilir; kaldırılınca kalkar", () => {
    render(<H g0={[PERS]} />);
    duzenle();
    expect(hedefler()).toEqual(["ana"]);
    expect(L("Çalışana ödendi")).toBeTruthy();
    ekEkle("", "9500");
    expect(hedefler()).toEqual(["ana", "ekElden"]);
    const e = satir("ekElden");
    expect(e.textContent).toMatch(/Ek ödeme \(elden\) · 9\.500 ₺Ödenmedi/);
    expect(L("Ek ödeme (elden) ödendi")).toBeTruthy();
    expect(screen.queryByTestId("form-odeme-kaydedince")).toBeNull();
    expect(e.textContent).toMatch(/maaş 0 ₺ \+ ek ödeme 9\.500 ₺/);
    expect(satir("ana").textContent).not.toMatch(/ek ödeme/); // maaş hedefinde ek ödeme yok: ipucu çizilmez
    // AC-12: kutudaki hedef toplamı = plandaki o hedefin satırları.
    expect(planToplami("Ek ödeme (elden)")).toBe("9.500 ₺");
    expect(planToplami("Maaş (resmi)")).toBe("30.000 ₺");
    fireEvent.click(L("Ek ödeme 1 sil"));
    expect(hedefler()).toEqual(["ana"]);
  });
  // Spec 0054 R4, R14 ile güncellendi: ödenen maaşta kalır; resmi ek ödeme kendi hedefinde açık doğar (Intent).
  it("AC-3 / AC-4 / AC-5 / AC-17 (0054 R4): kısmen ödenmiş kalemde ek ödeme kendi hedefinde; maaş değişimi maaş hedefini günceller, ödenen korunur", () => {
    render(<H g0={[PERS]} h0={[od(700, 12000, 10)]} />);
    duzenle();
    expect(satir("ana").textContent).toMatch(/Çalışana · 30\.000 ₺Kısmen · kalan 18\.000 ₺/);
    ekEkle("5000", "");
    expect(satir("ana").textContent).toMatch(/Maaş \(resmi\) · 30\.000 ₺Kısmen · kalan 18\.000 ₺/);
    expect(satir("ekResmi").textContent).toMatch(/Ek ödeme \(resmi\) · 5\.000 ₺Ödenmedi/);
    degis(L("Resmi işveren maliyeti"), "40000");
    expect(satir("ana").textContent).toMatch(/40\.000 ₺Kısmen · kalan 28\.000 ₺/);
    ekEkle("", "2000");
    expect(satir("ana").textContent).toMatch(/Maaş \(resmi\) · 40\.000 ₺Kısmen · kalan 28\.000 ₺/);
    expect(satir("ekElden").textContent).toMatch(/2\.000 ₺Ödenmedi/);
  });
  it("AC-9 / AC-27: bölünemeyen personel kaleminde tek hedef ve neden kutunun içinde, iki yerde aynı metin", () => {
    const k = { ...PERS, eldenTutar: 10000, taksitler: [{ id: 1001, hedef: "ana", sira: 1, vade: "2026-09-30", tutar: 20000 }, { id: 1002, hedef: "ana", sira: 2, vade: "2026-10-30", tutar: 20000 }] };
    render(<H g0={[k]} h0={[od(701, 20000, 10, { taksitId: 1001 })]} />);
    duzenle();
    expect(hedefler()).toEqual(["ana"]);
    expect(within(screen.getByTestId("form-odeme-durumu")).getByTestId("form-odeme-bolunmez").textContent).toBe(PERSONEL_BOLUNMEZ_NEDENI);
    expect(screen.getAllByText(PERSONEL_BOLUNMEZ_NEDENI)).toHaveLength(2);
  });
});

describe("Spec 0048: aşım, düğme ve dallar", () => {
  it("AC-6 / AC-22 / AC-7: tutar ödenenin altına düşünce kalan 0, aşım yazılır, düğme yok; kayıt engellenmez", () => {
    let st;
    render(<H g0={[NORMAL]} h0={[od(702, 39500, 20)]} onState={s => { st = s; }} />);
    duzenle();
    degis(L("Tutar"), "30000");
    const s = satir("ana");
    expect(s.textContent).toMatch(/30\.000 ₺Ödendi/);
    expect(s.textContent).toMatch(/Ödenen 39\.500 ₺, yeni toplam 30\.000 ₺/);
    expect(screen.queryByLabelText("Tedarikçiye ödendi")).toBeNull(); // kalan 0: ödeme girilemez
    kaydetBtn();
    expect(st.giderler[0].tutar).toBe(30000);
    expect(st.hesapHareketleri).toHaveLength(1);
  });
  // Spec 0053 R30: taksit sayısı bu düzenlemede değişen hedef pasiftir (taksit kimlikleri kayıtta yeniden kurulur).
  it("AC-21 (0053 R30): kayıtta tek satırken taksit sayısı ikiye çıkarılınca ödeme girişi pasif ve nedenli", () => {
    render(<H g0={[NORMAL]} />);
    duzenle();
    expect(L("Tedarikçiye ödendi")).toBeTruthy();
    degis(L("Taksit sayısı"), "2");
    expect(screen.queryByLabelText("Tedarikçiye ödendi")).toBeNull();
    expect(screen.getByTestId("form-odeme-durumu").textContent).toMatch(/Taksit planı değişti; kaydettikten sonra ödeyin\./);
  });
  // Spec 0053 R15, R30: yapısı değişmemiş taksitli hedef formda taksit seçiciyle ödenir (pencere açılmaz).
  it("AC-20 (Q3, 0053 R30): yapısı değişmemiş taksitli hedef formda taksit seçerek ödenir", () => {
    let st;
    const k = { ...NORMAL, tutar: 40000, taksitler: [{ id: 2001, hedef: "ana", sira: 1, vade: "2026-09-30", tutar: 20000 }, { id: 2002, hedef: "ana", sira: 2, vade: "2026-10-30", tutar: 20000 }] };
    render(<H g0={[k]} onState={s => { st = s; }} />);
    duzenle();
    fireEvent.click(L("Tedarikçiye ödendi"));
    expect(screen.queryByTestId("odeme-kayit-penceresi")).toBeNull();
    degis(L("Tedarikçiye taksiti"), "2");
    expect(L("Tedarikçiye ödeme tutarı").value).toBe("20.000");
    kaydetBtn();
    expect(st.hesapHareketleri).toEqual([expect.objectContaining({ giderId: 20, taksitId: 2002, tutar: 20000 })]);
  });
  it("AC-24: plan hatasında kutu kayıtlı hâli ibareyle gösterir; taksitli kalem tek hedefe düşmez", () => {
    const k = { ...NORMAL, tutar: 12000, taksitler: [1, 2, 3].map(i => ({ id: 3000 + i, hedef: "ana", sira: i, vade: "2026-09-30", tutar: 4000 })) };
    render(<H g0={[k]} h0={[od(703, 4000, 20, { taksitId: 3001 })]} />);
    duzenle();
    degis(L("Tutar"), "3000");
    expect(screen.getByTestId("form-odeme-plan-hatasi")).toBeTruthy();
    expect(hedefler()).toEqual(["ana"]);
    expect(satir("ana").textContent).toMatch(/12\.000 ₺Kısmen · kalan 8\.000 ₺/);
  });
  it("AC-25: kayıtlı ödemesi olan kalemde tür (davranış) değişince uyarı; kayıt engellenmez", () => {
    let st;
    render(<H g0={[{ ...NORMAL, tutar: 50000 }]} h0={[od(704, 10000, 20)]} onState={s => { st = s; }} />);
    duzenle();
    expect(screen.queryByTestId("form-odeme-tur-uyarisi")).toBeNull();
    degis(L("Gider türü *"), "1");
    expect(screen.getByTestId("form-odeme-tur-uyarisi")).toBeTruthy();
    kaydetBtn();
    expect(st.giderler[0].turId).toBe(1);
  });
  it("AC-26: toplamı sıfırlanan hedef kalkar; kayıtlı ödemesi varsa ayrı satırda aşım görünür", () => {
    const k = { ...PERS, eldenTutar: 9500 }; // satırsız eski iki hedefli personel
    render(<H g0={[k]} h0={[od(705, 39500, 10)]} />);
    duzenle();
    expect(hedefler()).toEqual(["ana", "elden"]);
    degis(L("Elden ödenen"), "0");
    expect(hedefler()).toEqual(["ana"]);
    const kay = screen.getByTestId("form-odeme-kaybolan");
    expect(kay.dataset.hedef).toBe("elden");
    expect(kay.textContent).toMatch(/Ödenen 9\.500 ₺, yeni toplam 0 ₺/);
  });
  it("AC-15: kirada tutar değişince ana ve stopaj hedefleri anında güncellenir", () => {
    const kira = { id: 30, tarih: "2026-09-01", turId: 1, tutar: 25000, kdvOrani: 0, stopajOrani: 20, girisYonu: "brut", tedarikciId: 11, sonOdemeTarihi: "2026-09-30", modelSatirlari: [],
      taksitler: [{ id: 4001, hedef: "ana", sira: 1, vade: "2026-09-30", tutar: 20000 }, { id: 4002, hedef: "stopaj", sira: 1, vade: null, tutar: 5000 }] };
    render(<H g0={[kira]} />);
    duzenle();
    expect(satir("stopaj").textContent).toMatch(/5\.000 ₺/);
    degis(L("Brüt kira"), "30000");
    expect(satir("ana").textContent).toMatch(/24\.000 ₺/);
    expect(satir("stopaj").textContent).toMatch(/6\.000 ₺/);
    expect(satir("stopaj").textContent).not.toMatch(/ek ödeme/);
  });
});

describe("Spec 0048: triyaj, göçsüz eski kalemler", () => {
  const hepsindeDugme = (beklenen) => {
    expect(hedefler()).toEqual(beklenen);
    // Spec 0053 R15: "Ödeme gir" artık formun içindeki giriş (hedefin işareti); her hedefte açık.
    for (const h of beklenen) expect(within(screen.getAllByTestId("form-odeme-satiri").find(b => b.dataset.hedef === h)).getByText("Ödeme gir")).toBeTruthy();
    expect(screen.queryByTestId("form-odeme-kaydedince")).toBeNull();
  };
  it("eski satırsız iki hedefli personel (0042 öncesi) hiçbir şey değiştirilmeden açılınca her hedefte 'Ödeme gir' durur", () => {
    render(<H g0={[{ ...PERS, resmiTutar: 1000, eldenTutar: 500 }]} />);
    duzenle();
    hepsindeDugme(["ana", "elden"]);
  });
  it("eski satırsız stopajlı kira (0021 öncesi) hiçbir şey değiştirilmeden açılınca her hedefte 'Ödeme gir' durur", () => {
    render(<H g0={[{ id: 31, tarih: "2026-09-01", turId: 1, tutar: 10000, kdvOrani: 0, stopajOrani: 20, girisYonu: "brut", tedarikciId: 11, sonOdemeTarihi: "2026-09-30", modelSatirlari: [] }]} />);
    duzenle();
    hepsindeDugme(["ana", "stopaj"]);
  });
});

describe("Spec 0048: yeniden açma ve veri", () => {
  it("AC-14 / AC-16 / AC-8: kaydetmeden kapatınca kayıtlı duruma döner, veri değişmez; kaydedince canlı = kayıtlı", () => {
    let st;
    render(<H g0={[PERS]} h0={[od(706, 12000, 10)]} onState={s => { st = s; }} />);
    const once = JSON.stringify(st);
    duzenle();
    expect(screen.queryByTestId("form-odeme")).toBeNull(); // AC-8: düzenlemede ödeme girişi yok
    ekEkle("", "9500");
    iptal();
    expect(JSON.stringify(st)).toBe(once);
    duzenle();
    expect(hedefler()).toEqual(["ana"]);
    ekEkle("", "9500");
    const canli = screen.getAllByTestId("form-odeme-durum-satiri").map(s => s.firstChild.textContent.replace("Kaydedince ödenebilir", "Ödeme gir").replace(/\s+/g, ""));
    kaydetBtn();
    duzenle();
    const kayitli = screen.getAllByTestId("form-odeme-durum-satiri").map(s => s.firstChild.textContent.replace(/\s+/g, ""));
    expect(kayitli).toEqual(canli);
    expect(st.hesapHareketleri).toHaveLength(1);
  });
});
