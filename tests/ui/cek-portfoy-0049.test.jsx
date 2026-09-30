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
    expect(st.cekler.map(c => c.id)).toEqual([401]);
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

// Q10: çekler Giderler paketinde de geri yüklenir (verilen/elle çekler gider hareketlerine bağlı).
import { SettingsBackup } from "../../src/components/settings/SettingsBackup";
import { waitFor } from "@testing-library/react";
describe("Spec 0049 Q10: yedekten geri yükleme", () => {
  const temel = () => ({ customers: [], services: [], dealers: [], stock: [], customModels: [], standardModels: [], factory: {}, kalipDefs: [], notes: [], parts: [], partSales: [],
    payments: [], teklifler: [], faturalar: [], partStock: [], partStockLog: [], uretimFormlari: [], gorusmeler: [],
    setCustomers: vi.fn(), setServices: vi.fn(), setDealers: vi.fn(), setStock: vi.fn(), setCustomModels: vi.fn(), setStandardModels: vi.fn(), setFactory: vi.fn(),
    setKalipDefs: vi.fn(), setNotes: vi.fn(), setParts: vi.fn(), setPartSales: vi.fn(), setPayments: vi.fn(), setCekler: vi.fn(), setHesapHareketleri: vi.fn(),
    version: "3.39.0", appSettings: {}, setAppSettings: vi.fn(), flash: vi.fn() });
  it("yalnız Giderler paketi seçiliyken de yedekteki çekler geri yüklenir; çek bölümü olmayan yedek çeklere dokunmaz", async () => {
    window.appMail = { getConfigForBackup: () => Promise.resolve(null), getAllLog: () => Promise.resolve([]) };
    const yedek = { app: "altunmak-crm", schemaVersion: 3, customers: [], payments: [], cekler: [BAGSIZ], hesapHareketleri: [] };
    const ac = async (y) => {
      window.crmStorage = { restore: () => Promise.resolve(structuredClone(y)), autoBackupPasswordStatus: () => Promise.resolve({ set: false, canEncrypt: true }) };
      fireEvent.click(screen.getByRole("button", { name: /Yedekten Geri Yükle/ }));
      const panel = (await screen.findByText(/Geri yüklenecek bölümler/)).closest("div").parentElement;
      fireEvent.click(within(panel).getByText("Müşteri verileri"));
      fireEvent.click(screen.getByRole("button", { name: /Evet, Geri Yükle/ }));
    };
    let p = temel();
    render(<SettingsBackup {...p} giderYetki giderVeriYetki />);
    await ac(yedek);
    await waitFor(() => expect(p.setHesapHareketleri).toHaveBeenCalled());
    expect(p.setCustomers).not.toHaveBeenCalled();
    expect(p.setCekler).toHaveBeenCalledWith([BAGSIZ]);
    cleanup();
    p = temel();
    render(<SettingsBackup {...p} giderYetki giderVeriYetki />);
    await ac({ ...yedek, cekler: undefined });
    await waitFor(() => expect(p.setHesapHareketleri).toHaveBeenCalled());
    expect(p.setCekler).not.toHaveBeenCalled();
    delete window.crmStorage; delete window.appMail;
  });
});
