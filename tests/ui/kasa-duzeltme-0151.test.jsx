// @vitest-environment jsdom
// Spec 0151: bakiye düzeltme, arayüz. Gerçek Kasa (durumlu düzenek, 0073 emsali), gerçek pencere, gerçek Çöp Kutusu ve İşlem
// Geçmişi etiketi. Test adları AC-<n> taşır.
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, within, act } from "@testing-library/react";
import { useState } from "react";
import fs from "node:fs";
import { Kasa } from "../../src/components/Kasa";
import { SettingsTrash } from "../../src/components/settings/SettingsTrash";
import { odemeleriUygula, turHaritasi } from "../../src/lib/gider";
import * as K from "../../src/lib/kasa";
import { fmtCur, fmtTR } from "../../src/lib/utils";

let audit = [];
let toastlar = [];
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-11-20T10:00:00"));
  audit = []; toastlar = [];
  window.auditLog = { log: vi.fn((e) => { audit.push(e); }) };
});
afterEach(() => { cleanup(); vi.useRealTimers(); delete window.auditLog; delete window.crmLocks; });

const TUR = [{ id: 4, ad: "Elektrik", davranis: "normal" }];
const turMap = turHaritasi(TUR);
const hesap = (id, ad, o = {}) => ({ id, ad, tur: "banka", paraBirimi: "TRY", acilisBakiyesi: 10000, acilisTarihi: "2026-01-01", kapali: false, ...o });
const HESAPLAR = [hesap(1, "Akbank"), hesap(2, "Merkez Kasa", { tur: "kasa", acilisBakiyesi: 500 }), hesap(3, "Dolar", { paraBirimi: "USD", acilisBakiyesi: 100 }),
  hesap(4, "Kart", { tur: "kart", acilisBakiyesi: -2000 }), hesap(5, "Kapalı", { kapali: true })];
const IZIN = (ids) => ({ role: "user", permissions: JSON.stringify({ tabs: ["dashboard", "gider", "finance", "kasa"], giderActions: ids }) });

function Harness({ h0 = HESAPLAR, m0 = [], perms = null, onState, ham = null, ayar = { denemeDonemiBitis: "" } }) {
  const [kasaHesaplari, setKasaHesaplari] = useState(h0);
  const [hesapHareketleri, setHesapHareketleri] = useState(m0);
  const [cekler, setCekler] = useState([]);
  const [kasaKapsamDisi, setKasaKapsamDisi] = useState([]);
  onState?.({ hesapHareketleri, setHesapHareketleri, setKasaHesaplari });
  return <Kasa aktifKullanici="kerem" kasaHesaplari={kasaHesaplari} setKasaHesaplari={setKasaHesaplari} hesapHareketleri={hesapHareketleri} setHesapHareketleri={setHesapHareketleri}
    payments={[]} customers={[]} giderler={odemeleriUygula([], hesapHareketleri, turMap)} giderTurleri={TUR} tedarikciler={[]}
    calisanlar={[]} yururlukAy="2026-01" cekler={cekler} setCekler={setCekler} serverPermissions={perms} showToast={(m) => toastlar.push(m)}
    giderAyarlari={ayar} kasaKapsamDisi={kasaKapsamDisi} setKasaKapsamDisi={setKasaKapsamDisi} hamKasaHesaplari={ham} />;
}
const hesapSec = (ad) => fireEvent.click(screen.getAllByTestId("hesap-satiri").find(s => s.textContent.includes(ad)));
const kart = () => screen.getByTestId("hesap-hareketleri");
const pencereAc = () => fireEvent.click(within(kart()).getByTestId("bakiye-duzelt-dugmesi"));
const pencere = () => screen.getByTestId("bakiye-duzelt-penceresi");
const hedefYaz = (v, etiket = K.HEDEF_BAKIYE_ETIKETI) => fireEvent.change(screen.getByLabelText(etiket), { target: { value: v } });
const kaydet = () => fireEvent.click(screen.getByRole("button", { name: /Kaydet/ }));
const bakiye = (st, id) => K.hesapBakiyeleri(HESAPLAR, st.hesapHareketleri.filter(m => !m.deletedAt), {}).get(String(id)).bakiyeK;
const kilitKur = (kilitli = {}) => {
  window.crmLocks = {
    acquire: vi.fn(async (t, id, force = false) => { const s = kilitli[`${t}:${id}`]; return s && !force ? { ok: false, lockedBy: s, lockedAt: "2026-11-20T09:55:00" } : { ok: true }; }),
    release: vi.fn(async () => {}),
    list: vi.fn(async () => Object.entries(kilitli).map(([k, sahip]) => { const [t, ...r] = k.split(":"); return { entity_type: t, entity_id: r.join(":"), locked_by: sahip }; })),
    releaseAll: vi.fn(async () => {}),
  };
};

describe("Spec 0151: düğme ve pencere", () => {
  it("AC-31 / AC-33 / AC-1 / AC-2 / AC-3: düğme hareket kartının başlığında, hareketsiz hesapta da; pencere bugünkü bakiye, hedef ve farkı gösterir; kayıt bakiyeyi hedefe çeker ve satır görünür", () => {
    let st;
    render(<Harness onState={s => { st = s; }} />);
    hesapSec("Akbank");
    expect(within(kart()).getByTestId("bos-hesap-hareketi")).toBeTruthy();
    pencereAc();
    expect(within(pencere()).getByTestId("duzelt-bugunku").textContent).toContain(fmtCur(10000, "TRY"));
    hedefYaz("12.500");
    expect(within(pencere()).getByTestId("duzelt-fark").textContent).toBe(`${"Yazılacak düzeltme"}: ${fmtCur(2500, "TRY")} · hesaba giren`);
    fireEvent.change(screen.getByLabelText("Düzeltme açıklaması"), { target: { value: "Ekstre" } });
    kaydet();
    expect(bakiye(st, 1)).toBe(1250000);
    expect(st.hesapHareketleri).toEqual([expect.objectContaining({ tur: "duzeltme", tutar: 2500, yon: "giren", hesapId: 1, aciklama: "Ekstre", tarih: "2026-11-20" })]);
    const satir = within(kart()).getAllByTestId("hareket-satiri")[0];
    expect(satir.textContent).toContain(K.DUZELTME_TUR_ADI); expect(satir.textContent).toContain("Ekstre"); expect(satir.textContent).toContain(fmtTR("2026-11-20"));
    expect(toastlar).toContain(`${K.DUZELTME_TUR_ADI} kaydedildi.`);
  });
  it("AC-4 / AC-28 / AC-14: eşit hedefte kayıt yok ve nedeni alanın altında; boş ya da geçersiz hedefte düğme pasif ve nedeni yazar", () => {
    let st;
    render(<Harness onState={s => { st = s; }} />);
    hesapSec("Akbank"); pencereAc();
    expect(screen.getByRole("button", { name: /Kaydet/ }).disabled).toBe(true);
    // Triyaj (bulgu 2): açılışta ve yazıp silince boş hedefin nedeni görünür.
    expect(within(pencere()).getByTestId("duzelt-hedef-bos").textContent).toBe(K.DUZELTME_HEDEF_BOS);
    hedefYaz("5"); expect(within(pencere()).queryByTestId("duzelt-hedef-bos")).toBeNull();
    hedefYaz(""); expect(within(pencere()).getByTestId("duzelt-hedef-bos").textContent).toBe(K.DUZELTME_HEDEF_BOS);
    hedefYaz("10.000,00");
    expect(within(pencere()).getByText(K.DUZELTME_ESIT_NEDENI)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Kaydet/ }).disabled).toBe(true);
    hedefYaz("abc");
    expect(within(pencere()).getByText(K.DUZELTME_HEDEF_NEDENI)).toBeTruthy();
    expect(st.hesapHareketleri).toEqual([]);
  });
  it("AC-13 / AC-35: gelecek ve geçersiz tarih alanın altında nedenli; tarih kutusunun üst sınırı yerel bugün", () => {
    render(<Harness />);
    hesapSec("Akbank"); pencereAc();
    const t = screen.getByLabelText("Düzeltme tarihi");
    expect(t.getAttribute("max")).toBe("2026-11-20");
    hedefYaz("5.000");
    fireEvent.change(t, { target: { value: "2026-11-25" } });
    expect(within(pencere()).getByText(K.DUZELTME_GELECEK_NEDENI)).toBeTruthy();
    fireEvent.change(t, { target: { value: "" } });
    expect(within(pencere()).getByText(K.DUZELTME_TARIH_NEDENI)).toBeTruthy();
  });
  it("AC-15 / AC-32: kapalı hesapta düğme pasif ve nedenli", () => {
    render(<Harness />);
    hesapSec("Kapalı");
    expect(within(kart()).getByTestId("bakiye-duzelt-dugmesi").disabled).toBe(true);
    expect(within(kart()).getByTestId("duzelt-kapali-nedeni").textContent).toBe(K.DUZELTME_KAPALI_NEDENI);
  });
  it("AC-34 / AC-11: tutar alanının sembolü ve pencere başlığı hesabın para birimini yazar", () => {
    render(<Harness />);
    hesapSec("Dolar"); pencereAc();
    expect(screen.getByText(/Bakiyeyi Düzelt · Dolar · USD/)).toBeTruthy();
    expect(within(pencere()).getByText("$")).toBeTruthy();
  });
  it("AC-25: kartta alan 'Hedef borç'; 12.500 girilince borç 12.500,00 ₺ yazar", () => {
    let st;
    render(<Harness onState={s => { st = s; }} />);
    hesapSec("Kart"); pencereAc();
    expect(within(pencere()).getByTestId("duzelt-bugunku").textContent).toContain(fmtCur(2000, "TRY"));
    hedefYaz("12.500", K.HEDEF_BORC_ETIKETI);
    expect(within(pencere()).getByTestId("duzelt-fark").textContent).toContain("borç artar");
    kaydet();
    expect(bakiye(st, 4)).toBe(-1250000);
    expect(screen.getAllByTestId("hesap-satiri").find(s => s.textContent.includes("Kart")).textContent).toContain(`Borç ${fmtCur(12500, "TRY")}`);
  });
  it("AC-29: kasa türünde negatif hedef uyarı yazar, kayıt yapılır", () => {
    let st;
    render(<Harness onState={s => { st = s; }} />);
    hesapSec("Merkez Kasa"); pencereAc();
    hedefYaz("-300");
    expect(within(pencere()).getByTestId("duzelt-negatif").textContent).toBe(K.DUZELTME_NEGATIF_UYARISI);
    kaydet();
    expect(bakiye(st, 2)).toBe(-30000);
  });
  it("AC-27 / R1/5: pencere açıkken giren hareket kayıt anında hesaba katılır, bakiye hedefe eşit", () => {
    let st;
    render(<Harness onState={s => { st = s; }} />);
    hesapSec("Akbank"); pencereAc();
    hedefYaz("8.000");
    act(() => { st.setHesapHareketleri(p => [...p, { id: 77, tur: "virman", tarih: "2026-11-19", tutar: 1500, hesapId: 1, karsiHesapId: 2 }]); });
    kaydet();
    expect(bakiye(st, 1)).toBe(800000);
  });
});

describe("Spec 0151: satır, silme, yetki ve kilit", () => {
  const dz = { id: 50, tur: "duzeltme", tarih: "2026-11-10", tutar: 40, yon: "cikan", hesapId: 3, aciklama: "Kur farkı" };
  it("AC-37 / AC-38 / AC-39 / AC-5 / AC-48: Düzenle yok ve nedeni yazar; başlık ibaresi; silme onayı kendi metniyle ve dövizle; silinince bakiye döner; iz", () => {
    let st;
    render(<Harness m0={[dz]} onState={s => { st = s; }} />);
    hesapSec("Dolar");
    const satir = within(kart()).getAllByTestId("hareket-satiri")[0];
    expect(within(satir).queryByTitle("Düzenle")).toBeNull();
    expect(within(satir).getByTestId("hareket-duzenlenemez").textContent).toBe(K.DUZELTME_DUZENLENMEZ_NEDENI);
    expect(kart().textContent).toContain(K.duzeltmeIbaresi(1));
    fireEvent.click(within(satir).getByTitle("Sil"));
    expect(screen.getByText(`${K.DUZELTME_TUR_ADI} silinsin mi?`)).toBeTruthy();
    expect(screen.getByText(`${K.DUZELTME_TUR_ADI} silinsin mi?`).closest("[role=dialog]")?.textContent || document.body.textContent).toContain(`${fmtTR("2026-11-10")} tarihli ${fmtCur(40, "USD")}`);
    fireEvent.click(screen.getByRole("button", { name: "Sil" }));
    expect(st.hesapHareketleri[0].deletedAt).toBeTruthy();
    expect(toastlar).toContain(`${K.DUZELTME_TUR_ADI} silindi.`);
    expect(audit.at(-1)).toMatchObject({ action: "silindi", entity: "kasa_hareketi", entity_name: "Dolar" });
    expect(JSON.parse(audit.at(-1).detail)).toMatchObject({ tutar: 40, yon: "cikan", paraBirimi: "USD" });
  });
  it("AC-48: kayıt işlem geçmişine bakiye_duzeltildi ile, yön ve para birimiyle", () => {
    render(<Harness />);
    hesapSec("Dolar"); pencereAc(); hedefYaz("150"); kaydet();
    expect(audit.at(-1)).toMatchObject({ action: "bakiye_duzeltildi", entity: "kasa_hareketi", entity_name: "Dolar" });
    expect(JSON.parse(audit.at(-1).detail)).toEqual({ tutar: 50, yon: "giren", paraBirimi: "USD", tarih: "2026-11-20" });
  });
  it("AC-16 / AC-41: kasa_hesap izni olmayan (gider_odeme'li) kullanıcıda düğme ve satırın silme düğmesi yok", () => {
    render(<Harness m0={[dz]} perms={IZIN(["gider_odeme", "virman", "avans"])} />);
    hesapSec("Dolar");
    expect(within(kart()).queryByTestId("bakiye-duzelt-dugmesi")).toBeNull();
    expect(within(within(kart()).getAllByTestId("hareket-satiri")[0]).queryByTitle("Sil")).toBeNull();
  });
  it("AC-40: kasa_hesap'lı ve gider_odeme'siz kullanıcı düzeltme girip silebilir", () => {
    let st;
    render(<Harness perms={IZIN(["kasa_hesap"])} onState={s => { st = s; }} />);
    hesapSec("Akbank"); pencereAc(); hedefYaz("11.000"); kaydet();
    expect(st.hesapHareketleri).toHaveLength(1);
    fireEvent.click(within(within(kart()).getAllByTestId("hareket-satiri")[0]).getByTitle("Sil"));
    fireEvent.click(screen.getByRole("button", { name: "Sil" }));
    expect(st.hesapHareketleri[0].deletedAt).toBeTruthy();
  });
  it("AC-43: hesap başkasının kilidindeyse pencere açılmaz, satırdan silme reddedilir", async () => {
    kilitKur({ "kasa_hesap:3": "ofis" });
    let st;
    render(<Harness m0={[dz]} onState={s => { st = s; }} />);
    await act(async () => {});
    hesapSec("Dolar"); pencereAc();
    await act(async () => {});
    expect(screen.queryByTestId("bakiye-duzelt-penceresi")).toBeNull();
    expect(screen.getByText(/ofis/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Geri Dön" }));
    fireEvent.click(within(within(kart()).getAllByTestId("hareket-satiri")[0]).getByTitle("Sil"));
    fireEvent.click(screen.getByRole("button", { name: "Sil" }));
    expect(st.hesapHareketleri[0].deletedAt).toBeUndefined();
  });
  it("AC-46: hesabı silinmiş düzeltme hesapsız listede ayrıca sayılır; kapsam dışı düğmesi yok, silinebilir", () => {
    render(<Harness h0={HESAPLAR.filter(h => h.id !== 3)} m0={[dz]} />);
    expect(screen.getByTestId("hesapsiz-duzeltme-sayisi").textContent).toContain("1");
    fireEvent.click(screen.getByRole("button", { name: "Ödemeleri göster" }));
    const s = screen.getAllByTestId("hesapsiz-odeme")[0];
    expect(s.textContent).toContain(K.DUZELTME_TUR_ADI);
    expect(within(s).queryByText("Kapsam dışı bırak")).toBeNull();
    expect(within(s).getByTitle("Sil")).toBeTruthy();
  });
  it("R5 (triyaj bulgu 3): hesabı çöpteki USD düzeltmenin hesapsız listedeki tutarı kendi para biriminde", () => {
    const hamUsd = [...HESAPLAR.filter(h => h.id !== 3), { ...HESAPLAR[2], deletedAt: "2026-11-15T10:00:00.000Z" }];
    render(<Harness h0={HESAPLAR.filter(h => h.id !== 3)} ham={hamUsd} m0={[dz]} />);
    fireEvent.click(screen.getByRole("button", { name: "Ödemeleri göster" }));
    const s = screen.getAllByTestId("hesapsiz-odeme")[0];
    expect(s.textContent).toContain(fmtCur(40, "USD"));
    expect(s.textContent).not.toContain(fmtCur(40, "TRY"));
  });
  it("Triyaj (bulgu 1): başlangıç tarihinden önceki hesabı silinmiş düzeltme eşik satırında türüyle sayılır", () => {
    render(<Harness h0={HESAPLAR.filter(h => h.id !== 3)} m0={[{ ...dz, tarih: "2026-09-01" }]} ayar={{ denemeDonemiBitis: "", hesapsizBaslangic: "2026-10-01" }} />);
    const satir = screen.getByTestId("hesapsiz-esik-satiri").textContent;
    expect(satir).toContain(`(1 ${K.DUZELTME_TUR_ADI.toLocaleLowerCase("tr-TR")})`);
    expect(satir).not.toContain("()");
  });
  it("AC-47: yalnız düzeltmesi olan hesabın satırı hareket sayısını düzeltmeyle sayar", () => {
    render(<Harness m0={[dz]} />);
    expect(screen.getAllByTestId("hesap-satiri").find(s => s.textContent.includes("Dolar")).textContent).toMatch(/1 hareket/);
  });
  it("AC-21 / R12: hesap formunun açılış bakiyesi alanı ve ipucu bugünkü gibi", () => {
    render(<Harness />);
    fireEvent.click(screen.getAllByTestId("hesap-satiri").find(s => s.textContent.includes("Akbank")).querySelector('[title="Düzenle"]') || screen.getAllByTitle("Düzenle")[0]);
    expect(screen.getByLabelText("Açılış bakiyesi")).toBeTruthy();
    expect(screen.getByTestId("acilis-bakiye-ipucu")).toBeTruthy();
  });
});

describe("Spec 0151: çöp kutusu ve işlem geçmişi", () => {
  const dz = { id: 51, tur: "duzeltme", tarih: "2026-11-10", tutar: 40, yon: "giren", hesapId: 3, deletedAt: "2026-11-20T10:00:00.000Z" };
  const bos = [], noop = () => {};
  function Cop({ perms = null, kasaVeriYetki = true, onState }) {
    const [hareketler, setHareketler] = useState([dz]);
    onState?.({ hareketler });
    return <SettingsTrash rawCustomers={bos} rawServices={bos} rawPartSales={bos} rawPayments={bos} rawDealers={bos} rawStock={bos} rawNotes={bos}
      rawKalipDefs={bos} rawParts={bos} rawCustomModels={bos} rawTeklifler={bos} rawFaturalar={bos} rawUretimFormlari={bos} rawGorusmeler={bos} rawDosyalar={bos}
      setCustomers={noop} setServices={noop} setPartSales={noop} setPayments={noop} setDealers={noop} setStock={noop} setNotes={noop} setKalipDefs={noop}
      setParts={noop} setCustomModels={noop} setTeklifler={noop} setFaturalar={noop} setUretimFormlari={noop} setGorusmeler={noop} setDosyalar={noop}
      appSettings={{}} showToast={noop} giderYetki rawGiderler={bos} setGiderler={noop} giderTurleri={bos}
      rawTedarikciler={bos} setTedarikciler={noop} rawUretimPartileri={bos} setUretimPartileri={noop} serverPermissions={perms}
      rawHesapHareketleri={hareketler} setHesapHareketleri={setHareketler} cekler={bos} setCekler={noop}
      rawGiderTanimlari={bos} setGiderTanimlari={noop} setGiderTurleri={noop}
      rawKasaHesaplari={HESAPLAR} setKasaHesaplari={noop} kasaVeriYetki={kasaVeriYetki} />;
  }
  const satir = () => screen.getAllByRole("row").find(r => within(r).queryAllByText(K.DUZELTME_TUR_ADI).length && r.querySelector("td"));
  it("AC-6 / AC-7 / AC-49: çöp satırı 'Bakiye düzeltmesi' ve hesabın para biriminde; geri alınır", () => {
    let st;
    render(<Cop onState={s => { st = s; }} />);
    expect(satir().textContent).toContain(fmtCur(40, "USD"));
    fireEvent.click(within(satir()).getByRole("button", { name: /Geri Al/ }));
    expect(st.hareketler[0].deletedAt).toBeFalsy();
  });
  it("AC-42: geri alma ve kalıcı silme kasa_hesap ile kasa veri yetkisi ister", () => {
    render(<Cop perms={IZIN(["gider_odeme"])} />);
    expect(within(satir()).queryByRole("button", { name: /Geri Al/ })).toBeNull();
    cleanup();
    render(<Cop kasaVeriYetki={false} />);
    expect(within(satir()).queryByRole("button", { name: /Geri Al/ })).toBeNull();
    cleanup();
    render(<Cop perms={IZIN(["kasa_hesap"])} />);
    expect(within(satir()).getByRole("button", { name: /Geri Al/ })).toBeTruthy();
  });
  it("AC-19: işlem geçmişi eylemi Türkçe etiketli", () => {
    expect(fs.readFileSync("src/components/settings/SettingsAuditLog.jsx", "utf8")).toMatch(/bakiye_duzeltildi: "Bakiye Düzeltildi"/);
  });
});
