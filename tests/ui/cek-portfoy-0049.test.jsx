// @vitest-environment jsdom
// Spec 0049: Kasa › Çek Portföyü; elle çek ekleme (A) ve kendi çekimiz (B). Gerçek Kasa bileşeni, durumlu düzenek.
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { useState } from "react";
import { Kasa } from "../../src/components/Kasa";
import { cekleriUygula } from "../../src/lib/cek";
import { odemeleriUygula, turHaritasi } from "../../src/lib/gider";

afterEach(() => { cleanup(); vi.useRealTimers(); });
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-09-28T10:00:00")); });

const TUR = [{ id: 1, ad: "Hammadde", davranis: "normal" }];
const turMap = turHaritasi(TUR);
const TED = [{ id: 10, ad: "Demir Bant" }];
const MUSTERI = [{ id: 1, name: "Kutu Gıda" }];
const HESAP = [{ id: 97, ad: "Ziraat", tur: "banka", paraBirimi: "TRY", acilisBakiyesi: 50000, kapali: false }];
const GIDER = [{ id: 1, tarih: "2026-09-01", turId: 1, tutar: 5000, kdvOrani: 20, tedarikciId: 10, sonOdemeTarihi: "2026-09-20", aciklama: "Sac", odendi: false }];
const KASACI = { role: "user", permissions: JSON.stringify({ tabs: ["gider", "finance", "kasa"], giderActions: ["gider_odeme"], customerActions: [] }) };
const ODEMESIZ = { role: "user", permissions: JSON.stringify({ tabs: ["gider", "finance", "kasa"], giderActions: ["gider_edit"], customerActions: ["cust_payment_edit"] }) };

function H({ c0 = [], p0 = [], h0 = [], perms = null, onState }) {
  const [cekler, setCekler] = useState(c0);
  const [hareketler, setHareketler] = useState(h0);
  onState?.({ cekler, hareketler });
  return <Kasa kasaHesaplari={HESAP} setKasaHesaplari={vi.fn()} hesapHareketleri={hareketler} setHesapHareketleri={setHareketler}
    payments={cekleriUygula(p0, cekler)} customers={MUSTERI} giderler={odemeleriUygula(GIDER, hareketler, turMap)} giderTurleri={TUR} tedarikciler={TED}
    calisanlar={[]} cekler={cekler} setCekler={setCekler} giderAyarlari={{ hatirlatmaEsikGun: 7 }} serverPermissions={perms} showToast={vi.fn()} />;
}
const portfoy = () => fireEvent.click(screen.getByRole("tab", { name: "Çek Portföyü" }));
const satir = (no) => screen.getAllByTestId("cek-satiri").find(s => s.textContent.includes(no));
const degis = (el, value) => fireEvent.change(el, { target: { value } });
const P = () => screen.getByTestId("cek-ekle-penceresi");
const cekEkle = ({ no = "555", tutar = "10000", kimden = "Eski müşteri", vade = "2026-11-30" } = {}) => {
  fireEvent.click(screen.getByText("Çek Ekle"));
  degis(within(P()).getByLabelText("Çek numarası"), no);
  degis(within(P()).getByLabelText("Banka"), "İş Bankası");
  degis(within(P()).getByLabelText("Çek tutarı"), tutar);
  degis(within(P()).getByLabelText("Vade"), vade);
  if (kimden) degis(within(P()).getByLabelText("Kimden alındı"), kimden);
  fireEvent.click(screen.getByText("Çeki Ekle"));
};
const BAGSIZ = { id: 400, yon: "alinan", paymentId: null, no: "555", banka: "İş Bankası", kesideci: "", tur: "hamiline", durum: "portfoy", tutar: 10000, currency: "TRY",
  vadeTarihi: "2026-11-30", tarih: "2026-09-05", kimden: "Eski müşteri", customerId: null, gecmis: [{ tarih: "2026-09-05", durum: "portfoy", not: "Portföye elle eklendi" }] };

describe("Spec 0049 A: portföye elle çek ekleme", () => {
  it("AC-1 / AC-2: çek eklenir, listede kendi tutarı ve vadesiyle, 'elle eklendi' ibaresiyle görünür; gelir değildir notu", () => {
    let st;
    render(<H onState={s => { st = s; }} />);
    portfoy();
    fireEvent.click(screen.getByText("Çek Ekle"));
    expect(screen.getByTestId("bagsiz-gelir-notu").textContent).toMatch(/gelir değildir/);
    fireEvent.click(screen.getByText("Vazgeç"));
    cekEkle();
    expect(st.cekler).toEqual([expect.objectContaining({ yon: "alinan", paymentId: null, no: "555", tutar: 10000, vadeTarihi: "2026-11-30", kimden: "Eski müşteri", durum: "portfoy" })]);
    const s = satir("555");
    expect(s.textContent).toMatch(/30\.11\.2026|30\/11\/2026/);
    expect(s.textContent).toMatch(/10\.000/);
    expect(s.textContent).toMatch(/Eski müşteri/);
    expect(s.textContent).toMatch(/elle eklendi/);
  });
  it("R1: zorunlu alan eksikse kaydedilmez ve nedenleri yazılır", () => {
    let st;
    render(<H onState={s => { st = s; }} />);
    portfoy();
    fireEvent.click(screen.getByText("Çek Ekle"));
    fireEvent.click(screen.getByText("Çeki Ekle"));
    expect(within(P()).getByText("Çek numarası girilmedi.")).toBeTruthy();
    expect(within(P()).getByText("Çekin kimden alındığı girilmedi.")).toBeTruthy();
    expect(st.cekler).toEqual([]);
  });
  it("AC-4 / AC-5: elle eklenen çek ciro edilir; gider kapanır, hesap bakiyesi değişmez", () => {
    let st;
    render(<H c0={[BAGSIZ]} onState={s => { st = s; }} />);
    const bakiye = () => screen.getAllByTestId("hesap-satiri")[0].textContent;
    const once = bakiye();
    portfoy();
    fireEvent.click(within(satir("555")).getByText("Ciro Et"));
    fireEvent.change(screen.getByDisplayValue("Tedarikçi seçin"), { target: { value: "10" } });
    fireEvent.click(screen.getAllByText("Ciro Et").pop());
    expect(st.cekler[0].durum).toBe("ciro");
    expect(st.hareketler).toEqual([expect.objectContaining({ tutar: 6000, cekId: 400, hesapId: null })]);
    fireEvent.click(screen.getByRole("tab", { name: "Hesaplar" }));
    expect(bakiye()).toBe(once);
  });
  it("AC-7: elle eklenen çek silinir; ciro edilmişse silinmez, önce ciro iptali istenir", () => {
    let st;
    render(<H c0={[BAGSIZ, { ...BAGSIZ, id: 401, no: "666", durum: "ciro" }]} onState={s => { st = s; }} />);
    portfoy();
    fireEvent.click(screen.getByRole("button", { name: "Tümü" }));
    fireEvent.click(within(satir("666")).getByText("Sil"));
    expect(screen.getByText(/önce ciroyu iptal edin/)).toBeTruthy();
    fireEvent.click(screen.getAllByText("Sil").filter(e => e.closest("button")).pop());
    expect(st.cekler.map(c => c.id)).toEqual([400, 401]);
    fireEvent.click(within(satir("555")).getByText("Sil"));
    fireEvent.click(screen.getAllByText("Sil").filter(e => e.closest("button")).pop());
    expect(st.cekler.filter(c => !c.deletedAt).map(c => c.id)).toEqual([401]); // spec 0078 R2 ile güncellendi: silinen kayıt çöp kutusuna gider
  });
  it("AC-8: elle eklenen çek tahsil edildi işaretlenir; pencere bakiyeye girmediğini yazar", () => {
    let st;
    render(<H c0={[BAGSIZ]} onState={s => { st = s; }} />);
    portfoy();
    fireEvent.click(within(satir("555")).getByText("Durum"));
    const p = screen.getByTestId("cek-durum-penceresi");
    expect(p.textContent).toMatch(/hiçbir hesabın bakiyesine girmez/);
    fireEvent.click(within(p).getByText("Tahsil edildi"));
    expect(st.cekler[0].durum).toBe("tahsil");
  });
  it("AC-22: gider_odeme izni olmayan kullanıcı Çek Ekle ve bağsız çekin Sil/Durum düğmelerini görmez; Kasa kullanıcısı görür", () => {
    render(<H c0={[BAGSIZ]} perms={ODEMESIZ} />);
    portfoy();
    expect(screen.queryByText("Çek Ekle")).toBeNull();
    expect(within(satir("555")).queryByText("Sil")).toBeNull();
    expect(within(satir("555")).queryByText("Durum")).toBeNull();
    cleanup();
    render(<H c0={[BAGSIZ]} perms={KASACI} />);
    portfoy();
    expect(screen.getByText("Çek Ekle")).toBeTruthy();
    expect(within(satir("555")).getByText("Sil")).toBeTruthy();
  });
});

// Q10 + triyaj: çek bölümünün iki sahibi; tek paket seçiliyse öbür paketin çekleri bugünkü hâliyle korunur.
import { SettingsBackup } from "../../src/components/settings/SettingsBackup";
import { waitFor } from "@testing-library/react";
describe("Spec 0049 Q10: yedekten geri yükleme", () => {
  const temel = () => ({ customers: [], services: [], dealers: [], stock: [], customModels: [], standardModels: [], factory: {}, kalipDefs: [], notes: [], parts: [], partSales: [],
    payments: [], teklifler: [], faturalar: [], partStock: [], partStockLog: [], uretimFormlari: [], gorusmeler: [],
    setCustomers: vi.fn(), setServices: vi.fn(), setDealers: vi.fn(), setStock: vi.fn(), setCustomModels: vi.fn(), setStandardModels: vi.fn(), setFactory: vi.fn(),
    setKalipDefs: vi.fn(), setNotes: vi.fn(), setParts: vi.fn(), setPartSales: vi.fn(), setPayments: vi.fn(), setCekler: vi.fn(), setHesapHareketleri: vi.fn(),
    version: "3.39.0", appSettings: {}, setAppSettings: vi.fn(), flash: vi.fn() });
  // Bugün: tahsil edilmiş bağlı çek (yedekten sonra) + yedekten sonra eklenmiş bağlı çek + bugünkü verilen çek.
  const BAGLI_BUGUN = { id: 200, paymentId: 100, no: "1", banka: "Z", durum: "tahsil", gecmis: [] };
  const BAGLI_YENI = { id: 201, paymentId: 101, no: "2", banka: "Z", durum: "portfoy", gecmis: [] };
  const VERILEN_BUGUN = { id: 500, yon: "verilen", paymentId: null, no: "V-1", durum: "yazildi", tutar: 100, gecmis: [] };
  const MEVCUT = [BAGLI_BUGUN, BAGLI_YENI, VERILEN_BUGUN];
  const BAGLI_YEDEK = { ...BAGLI_BUGUN, durum: "portfoy" };
  const yedek = { app: "altunmak-crm", schemaVersion: 3, customers: [], payments: [], cekler: [BAGLI_YEDEK, BAGSIZ], hesapHareketleri: [] };
  const geriYukle = async (kapat, y = yedek) => {
    window.appMail = { getConfigForBackup: () => Promise.resolve(null), getAllLog: () => Promise.resolve([]) };
    window.crmStorage = { restore: () => Promise.resolve(structuredClone(y)), autoBackupPasswordStatus: () => Promise.resolve({ set: false, canEncrypt: true }) };
    const p = temel();
    render(<SettingsBackup {...p} giderYetki giderVeriYetki />);
    fireEvent.click(screen.getByRole("button", { name: /Yedekten Geri Yükle/ }));
    const panel = (await screen.findByText(/Geri yüklenecek bölümler/)).closest("div").parentElement;
    for (const ad of kapat) fireEvent.click(within(panel).getByText(ad));
    fireEvent.click(screen.getByRole("button", { name: /Evet, Geri Yükle/ }));
    await waitFor(() => expect(p.setFactory.mock.calls.length + p.setHesapHareketleri.mock.calls.length + p.setCustomers.mock.calls.length).toBeGreaterThan(0));
    cleanup(); delete window.crmStorage; delete window.appMail;
    const arg = p.setCekler.mock.calls[0]?.[0];
    return typeof arg === "function" ? arg(MEVCUT) : arg;
  };
  it("yalnız Giderler: bağlı çekler bugünkü hâliyle korunur (durum geri alınmaz, yeni çek silinmez), bağsızlar yedekten gelir", async () => {
    const son = await geriYukle(["Müşteri verileri"]);
    expect(son.map(c => [c.id, c.durum])).toEqual([[200, "tahsil"], [201, "portfoy"], [400, "portfoy"]]);
  });
  it("yalnız Müşteri verileri: bağlı çekler yedekten, bağsız (verilen) çekler bugünkü hâliyle", async () => {
    const son = await geriYukle(["Giderler"]);
    expect(son.map(c => [c.id, c.durum])).toEqual([[500, "yazildi"], [200, "portfoy"]]);
  });
  it("ikisi birden (tam geri yükleme): çek bölümü yedekteki gibi; çek bölümü olmayan yedek Giderler'le çeklere dokunmaz", async () => {
    expect((await geriYukle([])).map(c => c.id)).toEqual([200, 400]);
    expect(await geriYukle(["Müşteri verileri"], { ...yedek, cekler: undefined })).toBeUndefined();
  });
});

describe("Spec 0049 B: verilen çekler (Kasa › Çek Portföyü)", () => {
  const verilenSekme = () => { portfoy(); fireEvent.click(screen.getByRole("tab", { name: "Verilen çekler" })); };
  const Y = () => screen.getByTestId("cek-yaz-penceresi");
  const cekYaz = (tutar = "6000") => {
    fireEvent.click(screen.getByText("Çek Yaz"));
    degis(within(Y()).getByLabelText("Çek numarası"), "A-7");
    degis(within(Y()).getByLabelText("Banka hesabı"), "97");
    degis(within(Y()).getByLabelText("Çek vadesi"), "2026-10-02");
    degis(screen.getByDisplayValue("Tedarikçi seçin"), "10");
    // Ön dolu biçimli değer ("6.000") üzerine tüm metni yazmak 0045 ayraç kuralında silme sayılır; önce temizlenir.
    degis(within(Y()).getByLabelText("Çek tutarı"), "");
    degis(within(Y()).getByLabelText("Çek tutarı"), tutar);
    fireEvent.click(screen.getByText("Çeki Yaz"));
    const kalan = screen.queryByTestId("cek-yaz-penceresi");
    if (kalan) throw new Error("Çek yazılamadı: " + [...kalan.querySelectorAll('[role="alert"]')].map(e => e.textContent).join(" | "));
  };
  it("AC-11 / AC-12 / AC-13 / AC-21: çek yazılır, verilen listede görünür, gider kapanır, bakiye değişmez; alınan toplamına karışmaz", () => {
    let st;
    render(<H onState={s => { st = s; }} />);
    const bakiye = () => screen.getAllByTestId("hesap-satiri")[0].textContent;
    const once = bakiye();
    verilenSekme();
    cekYaz();
    expect(st.cekler).toEqual([expect.objectContaining({ yon: "verilen", no: "A-7", durum: "yazildi", tutar: 6000, hesapId: 97, alacakliAd: "Demir Bant" })]);
    expect(st.hareketler).toEqual([expect.objectContaining({ tutar: 6000, yontem: "Çek (kendi)", hesapId: null, cekId: st.cekler[0].id })]);
    expect(screen.getAllByTestId("verilen-cek-satiri")[0].textContent).toMatch(/A-7.*Demir Bant/);
    expect(screen.getByTestId("verilen-toplam").textContent).toMatch(/6\.000/);
    fireEvent.click(screen.getByRole("tab", { name: "Alınan çekler" }));
    expect(screen.getByTestId("portfoy-toplam").textContent).not.toMatch(/6\.000/);
    fireEvent.click(screen.getByRole("tab", { name: "Hesaplar" }));
    expect(once).toMatch(/50\.000/);
    expect(bakiye()).toMatch(/50\.000/); // yazılınca bakiye değişmez
    expect(bakiye()).toMatch(/1 hareket/); // hesap çekle kullanımda (silinmez)
  });
  it("AC-17: çek kapatılan borçtan büyükse fark uyarısı; fark borç kapatmaz", () => {
    let st;
    render(<H onState={s => { st = s; }} />);
    verilenSekme();
    fireEvent.click(screen.getByText("Çek Yaz"));
    degis(screen.getByDisplayValue("Tedarikçi seçin"), "10");
    degis(within(Y()).getByLabelText("Çek tutarı"), "");
    degis(within(Y()).getByLabelText("Çek tutarı"), "8000");
    expect(screen.getByTestId("ciro-fark").textContent).toMatch(/2\.000 ₺ fazla/);
    degis(within(Y()).getByLabelText("Çek numarası"), "A-8");
    degis(within(Y()).getByLabelText("Banka hesabı"), "97");
    degis(within(Y()).getByLabelText("Çek vadesi"), "2026-10-02");
    fireEvent.click(screen.getByText("Çeki Yaz"));
    expect(st.cekler[0].tutar).toBe(8000);
    expect(st.hareketler.reduce((a, h) => a + h.tutar, 0)).toBe(6000);
  });
  it("AC-14 / AC-15 / AC-18: ödendi olunca bakiye düşer; iptal borcu açar; vadesi yaklaşan işaretli", () => {
    let st;
    render(<H onState={s => { st = s; }} />);
    const bakiye = () => screen.getAllByTestId("hesap-satiri")[0].textContent;
    verilenSekme();
    cekYaz();
    expect(within(screen.getAllByTestId("verilen-cek-satiri")[0]).getByText("Yaklaşıyor")).toBeTruthy(); // vade 02.10, bugün 28.09, eşik 7
    fireEvent.click(within(screen.getAllByTestId("verilen-cek-satiri")[0]).getByText("Durum"));
    fireEvent.click(screen.getByText("Ödendi (banka ödedi)"));
    expect(st.cekler[0].durum).toBe("odendi");
    fireEvent.click(screen.getByRole("tab", { name: "Hesaplar" }));
    expect(bakiye()).toMatch(/44\.000/); // 50.000 − 6.000
    cleanup();
    render(<H onState={s => { st = s; }} />);
    verilenSekme();
    cekYaz();
    fireEvent.click(within(screen.getAllByTestId("verilen-cek-satiri")[0]).getByText("Durum"));
    fireEvent.click(screen.getByText("İptal Et"));
    fireEvent.click(screen.getAllByText("İptal Et").filter(e => e.closest("button")).pop());
    expect(st.cekler[0].durum).toBe("iptal");
    expect(st.hareketler).toEqual([]);
  });
  it("AC-22: gider_odeme izni olmayan kullanıcı Çek Yaz ve Durum düğmelerini görmez", () => {
    render(<H c0={[{ id: 900, yon: "verilen", paymentId: null, no: "A-1", durum: "yazildi", tutar: 100, vadeTarihi: "2026-12-01", hesapId: 97, alacakliAd: "X", gecmis: [] }]} perms={ODEMESIZ} />);
    verilenSekme();
    expect(screen.queryByText("Çek Yaz")).toBeNull();
    expect(within(screen.getAllByTestId("verilen-cek-satiri")[0]).queryByText("Durum")).toBeNull();
  });
});
