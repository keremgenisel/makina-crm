// @vitest-environment jsdom
// Spec 0073: kasa hareketlerinin düzenlenmesi ve silinmesi, arayüz. Gerçek Kasa bileşeni durumlu düzenekte (App'in yaptığı gibi
// giderler her çizimde hareketlerle zenginleşir), ödeme penceresi gerçek bileşen. Test adları AC-<n> taşır.
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, within, waitFor } from "@testing-library/react";
import { useState } from "react";
import { Kasa } from "../../src/components/Kasa";
import { OdemeKayitPenceresi, SATIRSIZ_HEDEF_IPUCU } from "../../src/components/gider/OdemeKayitPenceresi";
import { odemeleriUygula, turHaritasi } from "../../src/lib/gider";
import { kapsamDisiTemizle, KAPALI_HESAP_NEDENI, CEK_HAREKETI_NEDENI, SILINMIS_KALEM_NEDENI, VERILEN_CEK_IBARESI } from "../../src/lib/kasa";
import { GOC_DUZENLEME_NOTU, CEK_YONTEMI_DUZENLEME_HATASI } from "../../src/lib/formOdemesi";

let audit = [];
let toastlar = [];
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-09-28T10:00:00"));
  audit = []; toastlar = [];
  window.auditLog = { log: vi.fn((e) => { audit.push(e); }) };
});
afterEach(() => { cleanup(); vi.useRealTimers(); delete window.auditLog; delete window.crmLocks; });

const TUR = [{ id: 4, ad: "Elektrik", davranis: "normal" }, { id: 3, ad: "Personel", davranis: "personel" }];
const turMap = turHaritasi(TUR);
const TED = [{ id: 12, ad: "Bölge Elektrik" }];
const CAL = [{ id: 7, ad: "Hasan Çelik" }];
const ELEKTRIK = { id: 1, tarih: "2026-09-01", turId: 4, tutar: 1000, kdvOrani: 0, tedarikciId: 12, aciklama: "Eylül faturası", sonOdemeTarihi: "2026-09-30" };
const hesap = (id, ad, o = {}) => ({ id, ad, tur: "banka", paraBirimi: "TRY", acilisBakiyesi: 10000, acilisTarihi: "2026-01-01", kapali: false, ...o });
const HESAPLAR = [hesap(1, "Akbank"), hesap(2, "Merkez Kasa", { tur: "kasa" })];
const odeme = (o = {}) => ({ id: 900, tur: "odeme", tarih: "2026-09-12", tutar: 600, yontem: "Havale", hesapId: 1, giderId: 1, taksitId: null, aciklama: "", ...o });

function Harness({ h0 = HESAPLAR, m0 = [], g0 = [ELEKTRIK], p0 = [], c0 = [], perms = null, onState, kapsam0 = [] }) {
  const [kasaHesaplari, setKasaHesaplari] = useState(h0);
  const [hesapHareketleri, setHesapHareketleri] = useState(m0);
  const [cekler, setCekler] = useState(c0);
  const [kasaKapsamDisi, setKasaKapsamDisi] = useState(kapsam0);
  onState?.({ hesapHareketleri, kasaKapsamDisi });
  return <Kasa aktifKullanici="kerem" kasaHesaplari={kasaHesaplari} setKasaHesaplari={setKasaHesaplari} hesapHareketleri={hesapHareketleri} setHesapHareketleri={setHesapHareketleri}
    payments={p0} customers={[{ id: 70, name: "Örnek Gıda" }]} giderler={odemeleriUygula(g0, hesapHareketleri, turMap)} giderTurleri={TUR} tedarikciler={TED}
    calisanlar={CAL} yururlukAy="2026-01" cekler={cekler} setCekler={setCekler} serverPermissions={perms} showToast={(m) => toastlar.push(m)}
    giderAyarlari={{ denemeDonemiBitis: "" }} kasaKapsamDisi={kasaKapsamDisi} setKasaKapsamDisi={setKasaKapsamDisi} />;
}
const hareketSatirlari = () => within(screen.getByTestId("hesap-hareketleri")).getAllByTestId("hareket-satiri");
const satir = (metin) => hareketSatirlari().find(s => s.textContent.includes(metin));
const hesapSec = (ad) => fireEvent.click(screen.getAllByTestId("hesap-satiri").find(s => s.textContent.includes(ad)));
const kilitKur = (kilitli = {}) => {
  const cagrilar = [];
  window.crmLocks = {
    acquire: vi.fn(async (t, id, force = false) => { cagrilar.push([t, String(id)]); const s = kilitli[`${t}:${id}`]; return s && !force ? { ok: false, lockedBy: s, lockedAt: "2026-09-28T09:55:00" } : { ok: true }; }),
    release: vi.fn(async () => {}),
    list: vi.fn(async () => Object.entries(kilitli).map(([k, sahip]) => { const [t, ...r] = k.split(":"); return { entity_type: t, entity_id: r.join(":"), locked_by: sahip }; })),
    releaseAll: vi.fn(async () => {}),
  };
  return cagrilar;
};

describe("Spec 0073 A: iki liste, düzenleme ve hesap değişimi", () => {
  it("AC-1 / AC-6 / AC-23 / AC-28 / AC-19: hesabın listesindeki ödeme düzenlenir; kimlik ve sayı aynı, hesabı değişen satır listeden çıkar, bildirim hesabı söyler, işlem geçmişi önceki değerle", () => {
    let st;
    render(<Harness m0={[odeme()]} onState={s => { st = s; }} />);
    fireEvent.click(within(satir("Eylül faturası")).getByLabelText("Hareketi düzenle: Eylül faturası"));
    const p = screen.getByTestId("odeme-kayit-penceresi");
    expect(screen.getByText("Ödemeyi Düzenle")).toBeTruthy();
    fireEvent.change(within(p).getByLabelText("Ödeme tutarı"), { target: { value: "700" } });
    fireEvent.change(within(p).getByLabelText("Ödeme yöntemi"), { target: { value: "Nakit" } });
    fireEvent.change(within(p).getByLabelText("Hesap"), { target: { value: "2" } });
    fireEvent.change(within(p).getByLabelText("Ödeme tarihi"), { target: { value: "2026-09-14" } });
    fireEvent.change(within(p).getByLabelText("Açıklama"), { target: { value: "düzeltildi" } });
    fireEvent.click(screen.getByText("Değişikliği Kaydet"));
    expect(st.hesapHareketleri).toHaveLength(1);
    expect(st.hesapHareketleri[0]).toMatchObject({ id: 900, tur: "odeme", giderId: 1, tutar: 700, yontem: "Nakit", hesapId: 2, tarih: "2026-09-14", aciklama: "düzeltildi" });
    expect(screen.queryByTestId("odeme-kayit-penceresi")).toBeNull();
    // R21: seçili hesap (Akbank) değişmez, satır oradan çıkar.
    expect(screen.queryByTestId("hesap-hareketleri") && within(screen.getByTestId("hesap-hareketleri")).queryAllByTestId("hareket-satiri")).toHaveLength(0);
    expect(toastlar.at(-1)).toBe("Ödeme güncellendi. Hareket “Merkez Kasa” hesabına taşındı.");
    const k = audit.find(e => e.action === "duzenlendi");
    expect(k).toMatchObject({ entity: "kasa_hareketi", entity_id: 900, entity_name: "Eylül faturası" });
    expect(JSON.parse(k.detail).onceki).toMatchObject({ tutar: 600, hesapId: 1 });
  });
  it("AC-26 / AC-22: hesapsız ödemeler listesinden Düzenle ve Sil açılır; hesap atanınca kapsam dışı girişi bugünkü temizlik kuralıyla düşer", () => {
    let st;
    const m = odeme({ hesapId: null });
    const kapsam0 = [{ id: 5, tur: "hareket", kaynak: null, kayitId: 900, zaman: "2026-09-20T00:00:00Z" }];
    render(<Harness m0={[m]} onState={s => { st = s; }} />);
    fireEvent.click(screen.getByText("Ödemeleri göster"));
    const r = screen.getByTestId("hesapsiz-odeme");
    expect(within(r).getByLabelText("Hareketi sil: Eylül faturası")).toBeTruthy();
    fireEvent.click(within(r).getByLabelText("Hareketi düzenle: Eylül faturası"));
    fireEvent.change(within(screen.getByTestId("odeme-kayit-penceresi")).getByLabelText("Hesap"), { target: { value: "1" } });
    fireEvent.click(screen.getByText("Değişikliği Kaydet"));
    expect(st.hesapHareketleri[0]).toMatchObject({ id: 900, hesapId: 1 });
    expect(screen.queryAllByTestId("hesapsiz-odeme")).toHaveLength(0);
    // R17: App'teki temizlik efektinin saf kuralı; hesabı atanan kaydın girişi düşer.
    expect(kapsamDisiTemizle(kapsam0, st.hesapHareketleri, {}, HESAPLAR)).toEqual([]);
    expect(kapsamDisiTemizle(kapsam0, [m], {}, HESAPLAR)).toBe(kapsam0);
  });
  it("AC-27 / AC-3: hesapsız avans düzenlenir; çalışan değişmez", () => {
    let st;
    const av = { id: 61, tur: "avans", tarih: "2026-08-15", tutar: 8000, calisanId: 7, hesapId: null, yontem: "", aciklama: "" };
    render(<Harness m0={[av]} onState={s => { st = s; }} />);
    fireEvent.click(screen.getByText("Ödemeleri göster"));
    fireEvent.click(within(screen.getByTestId("hesapsiz-odeme")).getByLabelText("Hareketi düzenle: Hasan Çelik"));
    expect(screen.getByText("Avansı Düzenle")).toBeTruthy();
    const f = screen.getByTestId("avans-formu");
    expect(within(f).getByDisplayValue("Hasan Çelik").disabled).toBe(true);
    fireEvent.change(within(f).getByLabelText("Avans tutarı"), { target: { value: "7500" } });
    fireEvent.click(screen.getByText("Değişiklikleri Kaydet"));
    expect(st.hesapHareketleri).toEqual([expect.objectContaining({ id: 61, tur: "avans", calisanId: 7, tutar: 7500 })]);
    expect(audit.find(e => e.action === "duzenlendi")).toMatchObject({ entity: "avans", entity_id: 61 });
  });
  it("AC-30: avans tutarı mahsupların altına düşürülemez; hata en az tutarı söyler", () => {
    let st;
    const av = { id: 61, tur: "avans", tarih: "2026-08-15", tutar: 8000, calisanId: 7, hesapId: 1, yontem: "", aciklama: "" };
    const maas = { id: 5, tarih: "2026-09-01", turId: 3, calisanId: 7, calisanAd: "Hasan Çelik", resmiTutar: 30000, eldenTutar: 0, sonOdemeTarihi: "2026-09-30" };
    const mah = { id: 62, tur: "mahsup", tarih: "2026-09-05", tutar: 5000, calisanId: 7, giderId: 5, taksitId: null, hesapId: null };
    render(<Harness m0={[av, mah]} g0={[ELEKTRIK, maas]} onState={s => { st = s; }} />);
    fireEvent.click(within(satir("Hasan Çelik")).getByLabelText("Hareketi düzenle: Hasan Çelik"));
    fireEvent.change(within(screen.getByTestId("avans-formu")).getByLabelText("Avans tutarı"), { target: { value: "4000" } });
    fireEvent.click(screen.getByText("Değişiklikleri Kaydet"));
    expect(screen.getByText("Bu avans en az 5.000,00 ₺ olmalı; 5.000,00 ₺ tutarında mahsup edilmiş.")).toBeTruthy();
    expect(st.hesapHareketleri[0].tutar).toBe(8000);
  });
  it("Triyaj bulgu 3: silinmiş çalışanın duran avansı düzenlenebilir (çalışan değişmediği için silinmişlik denetimi atlanır)", () => {
    let st;
    const av = { id: 61, tur: "avans", tarih: "2026-08-15", tutar: 800, calisanId: 9, hesapId: 1, yontem: "", aciklama: "" };
    const cal = [...CAL, { id: 9, ad: "Veli Kaya", deletedAt: "2026-09-20T10:00:00Z" }];
    function H() {
      const [m, setM] = useState([av]);
      st = m;
      return <Kasa aktifKullanici="kerem" kasaHesaplari={HESAPLAR} setKasaHesaplari={vi.fn()} hesapHareketleri={m} setHesapHareketleri={setM} giderler={[]} giderTurleri={TUR}
        tedarikciler={TED} calisanlar={cal} cekler={[]} setCekler={vi.fn()} showToast={(x) => toastlar.push(x)} giderAyarlari={{ denemeDonemiBitis: "" }} />;
    }
    render(<H />);
    fireEvent.click(within(satir("Veli Kaya")).getByLabelText("Hareketi düzenle: Veli Kaya"));
    fireEvent.change(within(screen.getByTestId("avans-formu")).getByLabelText("Avans tutarı"), { target: { value: "750" } });
    fireEvent.click(screen.getByText("Değişiklikleri Kaydet"));
    expect(screen.queryByText("Silinmiş çalışana avans verilemez.")).toBeNull();
    expect(st).toEqual([expect.objectContaining({ id: 61, calisanId: 9, tutar: 750 })]);
  });
  it("AC-2 / AC-28: virmanın tarih, tutar, kaynak ve karşı hesabı düzenlenir; kaynağı değişen satır listeden çıkar", () => {
    let st;
    const h0 = [...HESAPLAR, hesap(3, "Vakıf")];
    const v = { id: 70, tur: "virman", tarih: "2026-09-10", tutar: 500, hesapId: 1, karsiHesapId: 2, aciklama: "" };
    render(<Harness h0={h0} m0={[v]} onState={s => { st = s; }} />);
    hesapSec("Akbank");
    fireEvent.click(within(satir("Virman")).getByLabelText("Hareketi düzenle: Akbank → Merkez Kasa"));
    const f = screen.getByTestId("virman-formu");
    expect(screen.getByText("Virmanı Düzenle")).toBeTruthy();
    fireEvent.change(within(f).getAllByRole("combobox")[0], { target: { value: "3" } });
    fireEvent.change(within(f).getAllByRole("combobox")[1], { target: { value: "2" } });
    fireEvent.change(within(f).getByLabelText("Virman tutarı"), { target: { value: "650" } });
    fireEvent.click(screen.getByText("Değişiklikleri Kaydet"));
    expect(st.hesapHareketleri).toEqual([expect.objectContaining({ id: 70, tur: "virman", hesapId: 3, karsiHesapId: 2, tutar: 650 })]);
    expect(toastlar.at(-1)).toBe("Virman güncellendi. Hareket “Vakıf” hesabına taşındı.");
    expect(within(screen.getByTestId("hesap-hareketleri")).queryAllByTestId("hareket-satiri")).toHaveLength(0);
    expect(audit.find(e => e.action === "duzenlendi")).toMatchObject({ entity: "virman", entity_id: 70 });
  });
  it("AC-21: tarih düzeltilince hareket yerini değiştirir ama sayfa sıfırlanmaz", () => {
    let st;
    const m0 = Array.from({ length: 12 }, (_, i) => odeme({ id: 900 + i, tarih: `2026-09-${String(i + 2).padStart(2, "0")}`, tutar: 10, aciklama: `ö${i}` }));
    render(<Harness m0={m0} onState={s => { st = s; }} />);
    fireEvent.click(screen.getByText("Sonraki ›"));
    expect(hareketSatirlari()).toHaveLength(2); // en eski iki ödeme 2. sayfada
    fireEvent.click(within(hareketSatirlari()[0]).getByLabelText("Hareketi düzenle: Eylül faturası"));
    fireEvent.change(within(screen.getByTestId("odeme-kayit-penceresi")).getByLabelText("Ödeme tarihi"), { target: { value: "2026-08-30" } });
    fireEvent.click(screen.getByText("Değişikliği Kaydet"));
    expect(st.hesapHareketleri.find(m => m.id === 901).tarih).toBe("2026-08-30");
    expect(hareketSatirlari()).toHaveLength(2); // hâlâ 2. sayfa
    expect(hareketSatirlari()[1].textContent).toMatch(/30\/08\/2026/);
  });
});

describe("Spec 0073 C: dokunulmayanlar ve ibareler", () => {
  it("AC-14 / AC-33: tahsilat ve verilen çek satırında düzenleme yok, kaynağını söyleyen ibare var (tıklanamaz)", () => {
    const p0 = [{ id: 61, customerId: 70, tarih: "2026-09-05", tutar: 5000, currency: "TRY", yontem: "Havale", hesapId: 1 }];
    const c0 = [{ id: 40, yon: "verilen", no: "A-1", tutar: 300, currency: "TRY", hesapId: 1, durum: "odendi", alacakliAd: "Bölge", gecmis: [{ tarih: "2026-09-08", durum: "odendi" }] }];
    render(<Harness p0={p0} c0={c0} />);
    const t = satir("Örnek Gıda");
    expect(within(t).queryByTitle("Düzenle")).toBeNull();
    expect(within(t).getByTestId("hareket-ibaresi").textContent).toBe("Müşteri detayından değiştirilir");
    const c = satir("Çek A-1");
    expect(within(c).queryByTitle("Düzenle")).toBeNull();
    expect(within(c).getByTestId("hareket-ibaresi").textContent).toBe(VERILEN_CEK_IBARESI);
    expect(within(c).getByTestId("hareket-ibaresi").tagName).toBe("SPAN");
  });
  it("AC-34: kalemi kalıcı silinmiş ödeme silinebilir ama düzenlenemez; nedeni yazılıdır", () => {
    let st;
    render(<Harness m0={[odeme({ giderId: 999 })]} onState={s => { st = s; }} />);
    const r = satir("Silinmiş gider");
    expect(within(r).queryByTitle("Düzenle")).toBeNull();
    expect(within(r).getByTestId("hareket-duzenlenemez").textContent).toBe(SILINMIS_KALEM_NEDENI);
    fireEvent.click(within(r).getByTitle("Sil"));
    fireEvent.click(screen.getByText("Sil", { selector: "button" }));
    expect(st.hesapHareketleri).toEqual([]);
  });
  it("AC-35: kapsam dışı bırakılmış satırda düzenleme yok, yalnız 'Kapsama al'", () => {
    const kapsam0 = [{ id: 5, tur: "hareket", kaynak: null, kayitId: 900, zaman: "2026-09-20T00:00:00Z" }];
    render(<Harness m0={[odeme({ hesapId: null })]} kapsam0={kapsam0} />);
    fireEvent.click(screen.getByText("Göster"));
    const r = screen.getByTestId("kapsam-disi-kayit");
    expect(within(r).queryByTitle("Düzenle")).toBeNull();
    expect(within(r).queryByTitle("Sil")).toBeNull();
    expect(within(r).getByText("Kapsama al")).toBeTruthy();
  });
  it("AC-15: göç hareketi düzenleme penceresinde tutar boş ve zorunlu, bilgi şeridi yazılı; boş kaydedilmez", () => {
    let st;
    const m = odeme({ hesapId: null, tamKapatir: true, tutar: undefined, kaynak: "goc", gocKaynak: "kalem:1", tarih: "2026-06-05" });
    render(<Harness m0={[m]} onState={s => { st = s; }} />);
    fireEvent.click(screen.getByText("Ödemeleri göster"));
    fireEvent.click(within(screen.getByTestId("hesapsiz-odeme")).getByLabelText("Hareketi düzenle: Eylül faturası"));
    const p = screen.getByTestId("odeme-kayit-penceresi");
    expect(within(p).getByTestId("goc-duzenleme-notu").textContent).toContain(GOC_DUZENLEME_NOTU);
    expect(within(p).getByLabelText("Ödeme tutarı").value).toBe("");
    fireEvent.click(screen.getByText("Değişikliği Kaydet"));
    expect(st.hesapHareketleri[0].tamKapatir).toBe(true);
    fireEvent.change(within(p).getByLabelText("Ödeme tutarı"), { target: { value: "1000" } });
    fireEvent.click(screen.getByText("Değişikliği Kaydet"));
    expect(st.hesapHareketleri[0]).toMatchObject({ id: 900, tamKapatir: false, tutar: 1000, gocKaynak: "kalem:1" });
  });
  it("AC-44: kapalı hesaptaki hareketin düzenlemesi nedeniyle reddedilir; silme yapılabilir", () => {
    let st;
    render(<Harness h0={[hesap(1, "Ziraat", { kapali: true }), hesap(2, "Merkez Kasa")]} m0={[odeme()]} onState={s => { st = s; }} />);
    hesapSec("Ziraat");
    fireEvent.click(within(satir("Eylül faturası")).getByLabelText("Hareketi düzenle: Eylül faturası"));
    const p = screen.getByTestId("odeme-kayit-penceresi");
    expect(within(p).getByTestId("kapali-hesap-notu").textContent).toContain(KAPALI_HESAP_NEDENI);
    // Triyaj bulgu 4: hareketin kapalı hesabı seçicide seçili görünür (boş değil).
    expect(within(p).getByLabelText("Hesap").value).toBe("1");
    expect(within(p).getByLabelText("Hesap").selectedOptions[0].textContent).toMatch(/Ziraat/);
    fireEvent.change(within(p).getByLabelText("Ödeme tutarı"), { target: { value: "650" } });
    fireEvent.click(screen.getByText("Değişikliği Kaydet"));
    expect(st.hesapHareketleri[0].tutar).toBe(600);
    fireEvent.click(screen.getByText("Vazgeç"));
    fireEvent.click(within(satir("Eylül faturası")).getByTitle("Sil"));
    fireEvent.click(screen.getByText("Sil", { selector: "button" }));
    expect(st.hesapHareketleri).toEqual([]);
  });
});

describe("Spec 0073 D: yetki ve kilit", () => {
  it("AC-16 / AC-17: izni olmayan kullanıcı o türün satırında düzenleme ve silme görmez", () => {
    const v = { id: 70, tur: "virman", tarih: "2026-09-10", tutar: 500, hesapId: 1, karsiHesapId: 2, aciklama: "" };
    const av = { id: 61, tur: "avans", tarih: "2026-08-15", tutar: 80, calisanId: 7, hesapId: 1 };
    const yalnizVirman = { role: "user", permissions: JSON.stringify({ tabs: ["gider", "finance", "kasa"], giderActions: ["virman"] }) };
    render(<Harness m0={[odeme(), v, av]} perms={yalnizVirman} />);
    expect(within(satir("Eylül faturası")).queryByTitle("Düzenle")).toBeNull();
    expect(within(satir("Eylül faturası")).queryByTitle("Sil")).toBeNull();
    expect(within(satir("Hasan Çelik")).queryByTitle("Düzenle")).toBeNull();
    expect(within(satir("Virman")).getByTitle("Düzenle")).toBeTruthy();
    cleanup();
    const yalnizOdeme = { role: "user", permissions: JSON.stringify({ tabs: ["gider", "finance", "kasa"], giderActions: ["gider_odeme"] }) };
    render(<Harness m0={[odeme(), v, av]} perms={yalnizOdeme} />);
    expect(within(satir("Eylül faturası")).getByTitle("Düzenle")).toBeTruthy();
    expect(within(satir("Virman")).queryByTitle("Düzenle")).toBeNull();
    expect(within(satir("Virman")).queryByTitle("Virmanı sil")).toBeNull();
    expect(within(satir("Hasan Çelik")).queryByTitle("Sil")).toBeNull();
  });
  it("AC-18 / AC-38: ödeme penceresi kalemin gider kilidini alır; başkası tutuyorsa pencere açılmaz, satırdan silme reddedilir", async () => {
    let st;
    const c = kilitKur({ "gider:1": "ayse" });
    render(<Harness m0={[odeme()]} onState={s => { st = s; }} />);
    await waitFor(() => expect(window.crmLocks.list).toHaveBeenCalled());
    fireEvent.click(within(satir("Eylül faturası")).getByLabelText("Hareketi düzenle: Eylül faturası"));
    await screen.findByText("Bu kayıt şu an düzenleniyor");
    expect(c.some(([t, id]) => t === "gider" && id === "1")).toBe(true);
    expect(screen.queryByTestId("odeme-kayit-penceresi")).toBeNull();
    fireEvent.click(screen.getByText("Geri Dön"));
    fireEvent.click(within(satir("Eylül faturası")).getByTitle("Sil"));
    fireEvent.click(screen.getByText("Sil", { selector: "button" }));
    expect(st.hesapHareketleri).toHaveLength(1);
    expect(toastlar.at(-1)).toMatch(/ayse/);
  });
  it("AC-45: virman penceresi eski kaynak hesabın kilidini alır; yeni kaynak başkasındaysa kayıt reddedilir", async () => {
    let st;
    const h0 = [...HESAPLAR, hesap(3, "Vakıf")];
    const c = kilitKur({ "kasa_hesap:3": "ayse" });
    const v = { id: 70, tur: "virman", tarih: "2026-09-10", tutar: 500, hesapId: 1, karsiHesapId: 2, aciklama: "" };
    render(<Harness h0={h0} m0={[v]} onState={s => { st = s; }} />);
    await waitFor(() => expect(window.crmLocks.list).toHaveBeenCalled());
    hesapSec("Akbank");
    fireEvent.click(within(satir("Virman")).getByTitle("Düzenle"));
    await waitFor(() => expect(c.some(([t, id]) => t === "kasa_hesap" && id === "1")).toBe(true));
    fireEvent.change(within(screen.getByTestId("virman-formu")).getAllByRole("combobox")[0], { target: { value: "3" } });
    fireEvent.change(within(screen.getByTestId("virman-formu")).getAllByRole("combobox")[1], { target: { value: "2" } });
    fireEvent.click(screen.getByText("Değişiklikleri Kaydet"));
    expect(c.some(([t, id]) => t === "kasa_hesap" && id === "3")).toBe(false); // pencere yeni kaynağın kilidini almaz
    expect(st.hesapHareketleri[0].hesapId).toBe(1);
    expect(toastlar.at(-1)).toMatch(/ayse/);
  });
});

describe("Spec 0073: ödeme penceresinin düzenleme kipi", () => {
  const MAAS = { id: 5, tarih: "2026-09-01", turId: 3, calisanId: 7, calisanAd: "Hasan Çelik", resmiTutar: 30000, eldenTutar: 20000, sonOdemeTarihi: "2026-09-30" };
  const pencere = (kalemHam, hareketler, o = {}) => {
    const kalem = odemeleriUygula([kalemHam], hareketler, turMap)[0];
    return render(<OdemeKayitPenceresi kalem={kalem} davranis={turMap.get(String(kalemHam.turId)).davranis} turAd="Gider" turMap={turMap} hareketler={hareketler}
      hesaplar={HESAPLAR} hesapSecimi odemeYetkisi bugun="2026-09-28" giderler={[kalemHam]} yururlukAy="2026-01" onKaydet={vi.fn()} onSil={vi.fn()} onClose={vi.fn()} {...o} />);
  };
  it("AC-41 / AC-4: 'Kayıtlı ödemeler'de ödeme ve mahsup satırında Düzenle var; mahsup oradan düzenlenir, çalışan ve kalem değişmez", () => {
    const av = { id: 61, tur: "avans", tarih: "2026-08-15", tutar: 8000, calisanId: 7, hesapId: 1 };
    const mah = { id: 62, tur: "mahsup", tarih: "2026-09-05", tutar: 3000, calisanId: 7, giderId: 5, taksitId: null, hesapId: null, aciklama: "" };
    const od = { id: 63, tur: "odeme", tarih: "2026-09-06", tutar: 1000, giderId: 5, taksitId: null, hesapId: 1, yontem: "Havale" };
    const onDuzenle = vi.fn();
    pencere({ ...MAAS, eldenTutar: 0 }, [av, mah, od], { onDuzenle });
    expect(screen.getByLabelText("Ödemeyi düzenle")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Mahsubu düzenle"));
    expect(screen.getByText("Mahsubu Düzenle")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Ödeme tutarı"), { target: { value: "4000" } });
    fireEvent.click(screen.getByText("Değişikliği Kaydet"));
    expect(onDuzenle).toHaveBeenCalledWith(expect.objectContaining({ id: 62, tur: "mahsup", calisanId: 7, giderId: 5, tutar: 4000 }), mah);
  });
  it("AC-13: çeke bağlı hareketin 'Kayıtlı ödemeler' satırında Düzenle ve Sil yok", () => {
    const ciro = { id: 64, tur: "odeme", tarih: "2026-09-06", tutar: 500, giderId: 1, hesapId: null, yontem: "Çek (ciro)", cekId: 40 };
    pencere(ELEKTRIK, [ciro], { onDuzenle: vi.fn() });
    expect(screen.queryByLabelText("Ödemeyi düzenle")).toBeNull();
    expect(screen.getByTestId("ciro-hareketi")).toBeTruthy();
    expect(CEK_HAREKETI_NEDENI).toMatch(/çek işleminden/);
  });
  it("AC-42: düzenleme kipinde yöntem listesinde çekli yöntemler yok", () => {
    const od = odeme({ id: 63, giderId: 1 });
    pencere(ELEKTRIK, [od], { duzenlenen: od, onDuzenle: vi.fn(), ciroYetkisi: true, cekler: [], payments: [] });
    const secenekler = [...screen.getByLabelText("Ödeme yöntemi").querySelectorAll("option")].map(o => o.value);
    expect(secenekler).not.toContain("Çek (ciro)");
    expect(secenekler).not.toContain("Çek (kendi)");
    expect(CEK_YONTEMI_DUZENLEME_HATASI).toMatch(/silip/);
  });
  it("AC-43: satırsız çok hedefli kalemin ödemesi düzenlenirken ipucu görünür", () => {
    const od = { id: 63, tur: "odeme", tarih: "2026-09-06", tutar: 1000, giderId: 5, taksitId: null, hesapId: 1, yontem: "Havale" };
    pencere(MAAS, [od], { duzenlenen: od, onDuzenle: vi.fn() });
    expect(screen.getByTestId("satirsiz-hedef-ipucu").textContent).toContain(SATIRSIZ_HEDEF_IPUCU);
  });
});
