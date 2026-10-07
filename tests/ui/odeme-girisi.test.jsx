// @vitest-environment jsdom
// Spec 0053: tek ödeme editörü (OdemeGirisi) gider formunda (yeni ve düzenleme) ve ödeme penceresinde; çek yöntemleri her yolda,
// formda silme, mahsup kipi, açıklama. Gerçek Giderler bileşeni, durumlu düzenek.
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { Giderler } from "../../src/components/Giderler";
import { cekleriUygula } from "../../src/lib/cek";

afterEach(() => { cleanup(); vi.useRealTimers(); });
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-09-23T10:00:00")); });

const TURLER = [{ id: 1, ad: "Kira", davranis: "kira" }, { id: 3, ad: "Personel", davranis: "personel" }, { id: 4, ad: "Hammadde", davranis: "normal" }];
const CAL = [{ id: 21, ad: "Hasan Çelik", resmiMaliyet: 30000, eldenMaliyet: 20000 }];
const TED = [{ id: 11, ad: "Yıldız Gayrimenkul" }];
const HESAP = [{ id: 51, ad: "Ziraat", tur: "banka", paraBirimi: "TRY", acilisBakiyesi: 100000, kapali: false },
  { id: 52, ad: "Kasa", tur: "kasa", paraBirimi: "TRY", acilisBakiyesi: 50000, kapali: false }];
const P = [{ id: 100, customerId: 1, tarih: "2026-09-01", tutar: 12000, currency: "TRY", yontem: "Çek", vadeTarihi: "2026-10-15" }];
const C = [{ id: 200, paymentId: 100, no: "123456", banka: "Ziraat", kesideci: "Ali", tur: "hamiline", durum: "portfoy", gecmis: [] }];
const NORMAL = { id: 20, tarih: "2026-09-01", turId: 4, tutar: 10000, kdvOrani: 0, tedarikciId: 11, sonOdemeTarihi: "2026-09-30", modelSatirlari: [] };

function H({ g0 = [NORMAL], h0 = [], c0 = C, kasaYetki = true, onState, izle }) {
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
    appSettings={{ giderAyarlari: { yururlukAy: "2026-06", stopajOrani: 20 } }} serverPermissions={null}
    kasaHesaplari={HESAP} kasaYetki={kasaYetki} cekler={kasaYetki ? cekler : []} setCekler={kasaYetki ? setCekler : null} payments={kasaYetki ? cekleriUygula(P, cekler) : []}
    satisVerisi={{ customers: [], services: [], partSales: [], payments: [], teklifler: [], dealers: [], yedekParcaSatislar: [] }} showToast={vi.fn()} />;
}
const degis = (el, value) => fireEvent.change(el, { target: { value } });
const L = (ad) => screen.getByLabelText(ad);
const liste = () => screen.getByTestId("kalem-listesi");
const duzenle = () => fireEvent.click(within(liste()).getAllByTitle("Düzenle")[0]);
const pencere = () => { fireEvent.click(within(liste()).getAllByTitle(/Ödeme kaydet|Ödemeleri görüntüle/)[0]); return screen.getByTestId("odeme-kayit-penceresi"); };
const kaydetBtn = () => fireEvent.click(screen.getAllByText("Kaydet").filter(e => e.closest("button")).pop());
const yontemler = (el) => [...el.querySelectorAll("option")].map(o => o.value);
const od = (id, tutar, o = {}) => ({ id, tur: "odeme", tarih: "2026-09-15", tutar, hesapId: 51, giderId: 20, taksitId: null, yontem: "Havale", ...o });

describe("Spec 0053: tek bileşen ve çek her yoldan", () => {
  it("AC-28: form (yeni ve düzenleme) ve pencere aynı bileşeni çizer (aynı testId); pencere ince kabuk", () => {
    render(<H />);
    fireEvent.click(screen.getAllByRole("button", { name: /Yeni Gider/ })[0]);
    degis(L("Gider türü *"), "4");
    degis(L("Tutar"), "100");
    expect(within(screen.getByTestId("form-odeme")).getByTestId("odeme-girisi")).toBeTruthy();
    fireEvent.click(screen.getAllByText("İptal").filter(e => e.closest("button")).pop());
    duzenle();
    expect(within(screen.getByTestId("form-odeme-durumu")).getByTestId("odeme-girisi")).toBeTruthy();
    fireEvent.click(screen.getAllByText("İptal").filter(e => e.closest("button")).pop());
    expect(within(pencere()).getByTestId("odeme-girisi")).toBeTruthy();
    expect(readFileSync("src/components/gider/OdemeKayitPenceresi.jsx", "utf8")).toMatch(/<OdemeGirisi kapsam="pencere"/);
    expect(readFileSync("src/components/GiderForm.jsx", "utf8")).toMatch(/<OdemeGirisi kapsam="form"/);
  });
  it("AC-37: çek yöntemleri yeni form, düzenleme formu ve pencere üç yerde de satırın yöntem listesinde", () => {
    render(<H />);
    fireEvent.click(screen.getAllByRole("button", { name: /Yeni Gider/ })[0]);
    degis(L("Gider türü *"), "4");
    degis(L("Tutar"), "100");
    fireEvent.click(L("Tedarikçiye ödendi"));
    expect(yontemler(L("Tedarikçiye ödeme yöntemi"))).toEqual(expect.arrayContaining(["Çek (ciro)", "Çek (kendi)"]));
    fireEvent.click(screen.getAllByText("İptal").filter(e => e.closest("button")).pop());
    duzenle();
    fireEvent.click(L("Tedarikçiye ödendi"));
    expect(yontemler(L("Tedarikçiye ödeme yöntemi"))).toEqual(expect.arrayContaining(["Çek (ciro)", "Çek (kendi)"]));
    fireEvent.click(screen.getAllByText("İptal").filter(e => e.closest("button")).pop());
    expect(yontemler(within(pencere()).getByLabelText("Ödeme yöntemi"))).toEqual(expect.arrayContaining(["Çek (ciro)", "Çek (kendi)"]));
  });
  it("AC-12 / AC-14: pencerede 'Çek (ciro)' ile portföydeki çekle ödenir; hareket hesapsız, çek ciro", () => {
    let st;
    render(<H onState={s => { st = s; }} />);
    const p = pencere();
    degis(within(p).getByLabelText("Ödeme yöntemi"), "Çek (ciro)");
    degis(within(p).getByLabelText("Çek"), "200");
    expect(within(p).getByLabelText("Ödeme tutarı").textContent).toBe("10.000 ₺"); // çek 12.000, kalan 10.000
    expect(within(p).getByTestId("form-odeme-ciro-uyari")).toBeTruthy(); // fark uyarısı kayıttan önce
    fireEvent.click(screen.getByText("Ödemeyi Kaydet"));
    expect(st.hesapHareketleri).toEqual([expect.objectContaining({ giderId: 20, tutar: 10000, cekId: 200, hesapId: null, yontem: "Çek (ciro)" })]);
    expect(st.cekler.find(c => c.id === 200).durum).toBe("ciro");
  });
  it("AC-13: pencerede 'Çek (kendi)' ile kendi çekimiz yazılır; borç kapanır, hareket hesapsız", () => {
    let st;
    render(<H onState={s => { st = s; }} />);
    const p = pencere();
    degis(within(p).getByLabelText("Ödeme yöntemi"), "Çek (kendi)");
    degis(within(p).getByLabelText("Çek numarası"), "K-1");
    degis(within(p).getByLabelText("Çek hesabı"), "51");
    degis(within(p).getByLabelText("Çek vadesi"), "2026-10-30");
    fireEvent.click(screen.getByText("Ödemeyi Kaydet"));
    expect(st.cekler.find(c => c.no === "K-1")).toMatchObject({ yon: "verilen", tutar: 10000, hesapId: 51, alacakliAd: "Yıldız Gayrimenkul" });
    expect(st.hesapHareketleri).toEqual([expect.objectContaining({ tutar: 10000, hesapId: null, yontem: "Çek (kendi)" })]);
  });
  it("AC-15 / AC-25: mevcut gider düzenleme formundan çekle (ciro) ödenir; başka ekrana gidilmez", () => {
    let st;
    render(<H onState={s => { st = s; }} />);
    duzenle();
    fireEvent.click(L("Tedarikçiye ödendi"));
    degis(L("Tedarikçiye ödeme yöntemi"), "Çek (ciro)");
    degis(L("Tedarikçiye çek"), "200");
    expect(screen.queryByTestId("odeme-kayit-penceresi")).toBeNull();
    kaydetBtn();
    expect(st.hesapHareketleri).toEqual([expect.objectContaining({ giderId: 20, cekId: 200, hesapId: null })]);
    expect(st.cekler.find(c => c.id === 200).durum).toBe("ciro");
  });
  it("AC-16: stopaj ve elden satırlarında çek seçeneği yok ve nedeni yazılı", () => {
    const KIRA = { id: 30, tarih: "2026-09-01", turId: 1, tutar: 20000, kdvOrani: 0, stopajOrani: 20, girisYonu: "brut", tedarikciId: 11, sonOdemeTarihi: "2026-09-30", modelSatirlari: [],
      taksitler: [{ id: 3001, hedef: "ana", sira: 1, vade: "2026-09-30", tutar: 16000 }, { id: 3002, hedef: "stopaj", sira: 1, vade: null, tutar: 4000 }] };
    render(<H g0={[KIRA]} />);
    duzenle();
    fireEvent.click(L("Vergi dairesine (stopaj) ödendi"));
    expect(yontemler(L("Vergi dairesine (stopaj) ödeme yöntemi"))).not.toContain("Çek (ciro)");
    expect(screen.getByTestId("form-odeme-durumu").textContent).toMatch(/Vergi dairesine çekle ödeme yapılmaz/);
  });
  it("AC-18: Kasa görünmeyen kullanıcıda çek seçenekleri form ve pencerede hiç çizilmez", () => {
    render(<H kasaYetki={false} />);
    duzenle();
    fireEvent.click(L("Tedarikçiye ödendi"));
    expect(yontemler(L("Tedarikçiye ödeme yöntemi"))).not.toEqual(expect.arrayContaining(["Çek (ciro)"]));
    expect(yontemler(L("Tedarikçiye ödeme yöntemi"))).not.toContain("Çek (kendi)");
    fireEvent.click(screen.getAllByText("İptal").filter(e => e.closest("button")).pop());
    const p = pencere();
    expect(yontemler(within(p).getByLabelText("Ödeme yöntemi"))).not.toContain("Çek (ciro)");
    expect(yontemler(within(p).getByLabelText("Ödeme yöntemi"))).not.toContain("Çek (kendi)");
  });
  it("AC-19: portföyde uygun çek yokken nedeni yazılır; yöntem değiştirilince kayıt yapılır", () => {
    let st;
    render(<H c0={[]} onState={s => { st = s; }} />);
    duzenle();
    fireEvent.click(L("Tedarikçiye ödendi"));
    degis(L("Tedarikçiye ödeme yöntemi"), "Çek (ciro)");
    expect(screen.getByTestId("form-odeme-cek-yok")).toBeTruthy();
    degis(L("Tedarikçiye ödeme yöntemi"), "Havale");
    kaydetBtn();
    expect(st.hesapHareketleri).toHaveLength(1);
  });
});

describe("Spec 0053: her şey formda", () => {
  it("AC-22: ödeme satırındaki hata yüzünden kayıt durunca gider kalemi de kaydedilmez", () => {
    let st;
    render(<H onState={s => { st = s; }} />);
    duzenle();
    degis(L("Tutar"), "12000");
    fireEvent.click(L("Tedarikçiye ödendi"));
    degis(L("Tedarikçiye ödeme tutarı"), "99000");
    kaydetBtn();
    expect(screen.getAllByText(/Kalandan fazla ödeme kaydedilemez/).length).toBeGreaterThan(0);
    expect(st.giderler[0].tutar).toBe(10000);
    expect(st.hesapHareketleri.filter(h => !h.deletedAt)).toEqual([]); // spec 0078 R2 ile güncellendi: çöp kutusuna gider
    expect(st.hesapHareketleri.every(h => h.deletedAt)).toBe(true);
  });
  it("AC-24 / AC-35: düzenlemede ikinci satır farklı yöntem ve hesapla; satır açıklaması kaydedilir ve listede görünür", () => {
    let st;
    render(<H onState={s => { st = s; }} />);
    duzenle();
    fireEvent.click(L("Tedarikçiye ödendi"));
    degis(L("Tedarikçiye ödeme tutarı"), "6000");
    degis(L("Tedarikçiye ödeme yöntemi"), "Havale");
    degis(L("Tedarikçiye hesabı"), "51");
    degis(L("Tedarikçiye açıklaması"), "prim");
    fireEvent.click(screen.getByRole("button", { name: "Tedarikçiye için başka yöntemle satır ekle" }));
    expect(L("Tedarikçiye ödeme tutarı 2").value).toBe("4.000"); // kalan − ilk satır
    degis(L("Tedarikçiye ödeme yöntemi 2"), "Nakit");
    degis(L("Tedarikçiye hesabı 2"), "52");
    kaydetBtn();
    expect(st.hesapHareketleri.map(h => [h.tutar, h.yontem, h.hesapId, h.aciklama])).toEqual([[6000, "Havale", 51, "prim"], [4000, "Nakit", 52, ""]]);
    duzenle();
    expect(within(screen.getByTestId("odeme-kayit-listesi")).getByText(/prim/)).toBeTruthy();
  });
  it("AC-27 / AC-29: formda kayıtlı ödeme silinir, kalan artar; Kaydet'te kalem ve silme tek güncellemede yazılır, Vazgeç geri alır", () => {
    let st;
    const izle = [];
    render(<H h0={[od(901, 4000)]} onState={s => { st = s; }} izle={izle} />);
    duzenle();
    expect(screen.getByTestId("form-odeme-durum-satiri").textContent).toMatch(/kalan 6\.000 ₺/);
    fireEvent.click(screen.getByTitle("Ödemeyi sil"));
    expect(screen.getByTestId("odeme-silinecek")).toBeTruthy();
    expect(screen.getByTestId("form-odeme-durum-satiri").textContent).toMatch(/Ödenmedi/);
    fireEvent.click(screen.getByTitle("Silmeyi geri al"));
    expect(screen.getByTestId("form-odeme-durum-satiri").textContent).toMatch(/kalan 6\.000 ₺/);
    fireEvent.click(screen.getByTitle("Ödemeyi sil"));
    degis(L("Açıklama"), "düzeltildi");
    const once = izle.length;
    kaydetBtn();
    expect(st.hesapHareketleri.filter(h => !h.deletedAt)).toEqual([]); // spec 0078 R2 ile güncellendi: çöp kutusuna gider
    expect(st.hesapHareketleri.every(h => h.deletedAt)).toBe(true);
    expect(st.giderler[0].aciklama).toBe("düzeltildi");
    // Tek işleyici: kalem ve silme aynı render turunda göründü (ara durumda biri yazılmış öbürü yazılmamış hâl yok).
    expect(izle.slice(once).some(s => s.giderler[0].aciklama === "düzeltildi" && s.hesapHareketleri.filter(h => !h.deletedAt).length === 1)).toBe(false); // spec 0078: silme damgadır
  });
  it("AC-44: cekId taşıyan kayıtlı hareket formdan silinemez; neden ve yönlendirme yazılır", () => {
    render(<H h0={[od(902, 10000, { cekId: 200, hesapId: null, yontem: "Çek (ciro)" }), od(903, 0.01, { giderId: 99 })]} />);
    duzenle();
    const kayit = within(screen.getByTestId("odeme-kayit-listesi")).getAllByTestId("odeme-kaydi")[0];
    expect(within(kayit).queryByTitle("Ödemeyi sil")).toBeNull();
    expect(within(kayit).getByTestId("ciro-hareketi").textContent).toMatch(/ciro iptali Kasa › Çek Portföyü'nden/);
  });
  it("AC-47: mahsup kipi formda tek satır; satır ekleme yok, mahsup hareketi kalemle kaydedilir", () => {
    let st;
    const PERS = { id: 40, tarih: "2026-09-01", turId: 3, calisanId: 21, calisanAd: "Hasan Çelik", resmiTutar: 30000, eldenTutar: 0, sonOdemeTarihi: "2026-09-30", modelSatirlari: [] };
    render(<H g0={[PERS]} h0={[{ id: 904, tur: "avans", tarih: "2026-09-02", tutar: 5000, calisanId: 21, hesapId: null }]} onState={s => { st = s; }} />);
    fireEvent.click(within(liste()).getByText(/Çalışanları göster/));
    duzenle();
    fireEvent.click(screen.getByRole("button", { name: "Avanstan mahsup" }));
    expect(screen.queryByText(/Başka yöntemle satır ekle/)).toBeNull();
    expect(L("Ödeme tutarı").value).toBe("5.000"); // kalan ile açık avansın küçüğü
    kaydetBtn();
    expect(st.hesapHareketleri.find(h => h.tur === "mahsup")).toMatchObject({ giderId: 40, tutar: 5000, calisanId: 21, hesapId: null });
  });
});
