// @vitest-environment jsdom
// Spec 0068: Çöp Kutusu'nda tedarikçi ve üretim partisi (geri alma, kalıcı silme, boşaltma, ad çakışması, yetki kapısı,
// kalıcı silme bilgi satırı); İşlem Geçmişi'nde parti etiketi; içe aktarma kapsam satırı; kalıcı silme penceresi; çek raporu.
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within, waitFor } from "@testing-library/react";
import { useState } from "react";
import { SettingsTrash } from "../../src/components/settings/SettingsTrash";
import { SettingsAuditLog } from "../../src/components/settings/SettingsAuditLog";
import { SettingsImport } from "../../src/components/settings/SettingsImport";
import { SettingsExport } from "../../src/components/settings/SettingsExport";
import { Tedarikciler } from "../../src/components/gider/Tedarikciler";
import { Kasa } from "../../src/components/Kasa";
import { KALICI_SILME_NOTU } from "../../src/lib/copKutusu";
import { regexKacis } from "../yardimci/regexKacis.js";

afterEach(() => { cleanup(); delete window.auditLog; });
const noop = () => {};
const bos = [];
const ZAMAN = "2026-10-01T09:00:00.000Z";

function TrashH({ t0, p0, giderYetki = true, perms = null, onState, showToast = noop }) {
  const [ted, setTed] = useState(t0);
  const [parti, setParti] = useState(p0);
  onState?.({ ted, parti });
  return <SettingsTrash rawCustomers={bos} rawServices={bos} rawPartSales={bos} rawPayments={bos} rawDealers={bos} rawStock={bos} rawNotes={bos}
    rawKalipDefs={bos} rawParts={bos} rawCustomModels={bos} rawTeklifler={bos} rawFaturalar={bos} rawUretimFormlari={bos} rawGorusmeler={bos} rawDosyalar={bos}
    setCustomers={noop} setServices={noop} setPartSales={noop} setPayments={noop} setDealers={noop} setStock={noop} setNotes={noop} setKalipDefs={noop}
    setParts={noop} setCustomModels={noop} setTeklifler={noop} setFaturalar={noop} setUretimFormlari={noop} setGorusmeler={noop} setDosyalar={noop}
    appSettings={{}} showToast={showToast} giderYetki={giderYetki} rawGiderler={bos} setGiderler={noop}
    rawTedarikciler={ted} setTedarikciler={setTed} rawUretimPartileri={parti} setUretimPartileri={setParti} serverPermissions={perms} />;
}
const satir = (metin) => screen.getByText(metin).closest("tr");

describe("Spec 0068 C: Çöp Kutusu'nda tedarikçi ve üretim partisi", () => {
  it("AC-10 / AC-13: iki satır türü görünür ve geri alınır (deletedAt temizlenir)", () => {
    let st;
    render(<TrashH t0={[{ id: 1, ad: "Demir Bant", deletedAt: ZAMAN }]} p0={[{ id: 5, ad: "Yaz", baslangicAy: "2026-07", bitisAy: "2026-08", deletedAt: ZAMAN }]} onState={s => { st = s; }} />);
    expect(within(satir("Demir Bant")).getByText("Tedarikçi")).toBeTruthy();
    expect(within(satir("Yaz · 2026-07 – 2026-08")).getByText("Üretim Partisi")).toBeTruthy();
    fireEvent.click(within(satir("Demir Bant")).getByText("Geri Al"));
    fireEvent.click(within(satir("Yaz · 2026-07 – 2026-08")).getByText("Geri Al"));
    expect(st.ted[0].deletedAt).toBeUndefined();
    expect(st.parti[0].deletedAt).toBeUndefined();
    expect(screen.getByText("Çöp kutusu boş.")).toBeTruthy();
  });
  it("AC-15: kalıcı silme ve çöpü boşaltma iki türü de kapsar", () => {
    let st;
    render(<TrashH t0={[{ id: 1, ad: "Demir Bant", deletedAt: ZAMAN }, { id: 2, ad: "Canlı" }]} p0={[{ id: 5, ad: "Yaz", baslangicAy: "2026-07", deletedAt: ZAMAN }, { id: 6, ad: "Kış", baslangicAy: "2026-12", deletedAt: ZAMAN }]} onState={s => { st = s; }} />);
    fireEvent.click(within(satir("Demir Bant")).getByText("Kalıcı Sil"));
    fireEvent.click(screen.getByText("Evet, Sil"));
    expect(st.ted.map(x => x.id)).toEqual([2]);
    fireEvent.click(screen.getByText("Çöp Kutusunu Boşalt"));
    fireEvent.click(screen.getByText("Evet, Sil"));
    expect(st.parti).toEqual([]);
    expect(st.ted.map(x => x.id)).toEqual([2]);
  });
  it("AC-37: aynı adda canlı kayıt varken geri alma yapılmaz ve nedeni söylenir", () => {
    let st; const toast = vi.fn();
    render(<TrashH t0={[{ id: 1, ad: "Demir Bant", deletedAt: ZAMAN }, { id: 2, ad: "demir bant" }]} p0={[]} showToast={toast} onState={s => { st = s; }} />);
    fireEvent.click(within(satir("Demir Bant")).getByText("Geri Al"));
    expect(st.ted[0].deletedAt).toBe(ZAMAN);
    expect(toast).toHaveBeenCalledWith(expect.stringMatching(/Geri alınamadı: “demir bant” adında bir tedarikçi zaten var/), "err");
  });
  it("AC-38: gider yetkisi yoksa satırlar yok; silme izni yoksa satır görünür, düğme yok", () => {
    render(<TrashH t0={[{ id: 1, ad: "Demir Bant", deletedAt: ZAMAN }]} p0={[{ id: 5, ad: "Yaz", baslangicAy: "2026-07", deletedAt: ZAMAN }]} giderYetki={false} />);
    expect(screen.queryByText("Demir Bant")).toBeNull();
    expect(screen.queryByTestId("kalici-silme-notu")).toBeNull();
    cleanup();
    const perms = { role: "user", permissions: JSON.stringify({ tabs: ["gider", "settings"], giderActions: ["gider_add"] }) };
    render(<TrashH t0={[{ id: 1, ad: "Demir Bant", deletedAt: ZAMAN }]} p0={[{ id: 5, ad: "Yaz", baslangicAy: "2026-07", deletedAt: ZAMAN }]} perms={perms} />);
    expect(within(satir("Demir Bant")).queryByText("Geri Al")).toBeNull();
    expect(within(satir("Demir Bant")).queryByText("Kalıcı Sil")).toBeNull();
    expect(within(satir("Yaz · 2026-07 (açık)")).queryByText("Geri Al")).toBeNull();
  });
  it("AC-17: Çöp Kutusu'nda kalıcı silinen bölümleri söyleyen tek bilgi satırı, aynı sabitle", () => {
    render(<TrashH t0={[]} p0={[]} />);
    const n = screen.getAllByTestId("kalici-silme-notu");
    expect(n).toHaveLength(1);
    expect(n[0].textContent).toContain(KALICI_SILME_NOTU);
    expect(n[0].textContent).toMatch(/Tekrarlayan gider tanımı, gider türü, standart genel gider, kasa hesabı, çek, ödeme hareketi ve kapsam dışı kaydı/);
  });
  it("AC-11: geri alınan tedarikçi listede ekstre düğmesiyle görünür; çöpteyken görünmez", () => {
    const ciz = (t) => render(<Tedarikciler tedarikciler={t} setTedarikciler={noop} giderler={[]} giderTanimlari={[]} rapor={null} hesapHareketleri={[]} />);
    ciz([{ id: 1, ad: "Demir Bant", deletedAt: ZAMAN }]);
    expect(screen.queryByText("Demir Bant")).toBeNull();
    cleanup();
    ciz([{ id: 1, ad: "Demir Bant" }]);
    expect(within(screen.getByText("Demir Bant").closest("tr")).getByText("Ekstre")).toBeTruthy();
  });
});

describe("Spec 0068 A, B: işlem geçmişi, içe aktarma, kalıcı silme penceresi, çek raporu", () => {
  it("AC-1: üretim partisi işlemi okunur adla görünür", async () => {
    window.auditLog = { get: vi.fn(async () => ({ ok: true, rows: [{ ts: "2026-10-01T10:00:00.000Z", username: "admin", role: "admin", action: "silindi", entity: "uretim_partisi", entity_id: 5, entity_name: "Yaz", detail: "" }], total: 1 })) };
    render(<SettingsAuditLog serverPermissions={null} />);
    await waitFor(() => expect(screen.getByText("Yaz")).toBeTruthy());
    expect(within(screen.getByText("Yaz").closest("tr")).getByText("Üretim Partisi")).toBeTruthy();
    expect(screen.queryByText("uretim_partisi")).toBeNull();
  });
  it("AC-8 / AC-9: içe aktarma ekranı neyi eklediğini ve başka bölüme dokunmadığını yazar; bileşen yalnız dört bölümün setter'ını alır", () => {
    render(<SettingsImport customers={[]} setCustomers={noop} setServices={noop} flash={noop} parts={[]} setParts={noop} partTypeDefs={[]} setPartTypeDefs={noop} />);
    expect(screen.getByTestId("ice-aktarma-kapsam").textContent).toMatch(/yalnız müşteri \(makina\) ve servis kayıtlarını.*ekler; gider, kasa, çek, stok, belgeler ve diğer hiçbir bölüme dokunmaz, var olan kayıtları silmez/);
  });
  it("AC-16: kalıcı silme penceresi sabit metni gösterir (kasa hesabı örneği)", () => {
    const hesap = { id: 1, ad: "Eski Kasa", tur: "kasa", paraBirimi: "TRY", acilisBakiyesi: 0, acilisTarihi: "2026-09-01", kapali: false };
    render(<Kasa kasaHesaplari={[hesap]} setKasaHesaplari={noop} hesapHareketleri={[]} setHesapHareketleri={noop} payments={[]} customers={[]} giderler={[]} giderTurleri={[]}
      tedarikciler={[]} showToast={noop} giderAyarlari={{ denemeDonemiBitis: "" }} />);
    fireEvent.click(within(screen.getAllByTestId("hesap-satiri")[0]).getByTitle("Sil"));
    expect(screen.getByText(new RegExp(regexKacis(KALICI_SILME_NOTU)))).toBeTruthy();
  });
  it("AC-5 / AC-41: çek raporu yalnız cekler verildiğinde (kasa yetkisi) listelenir", () => {
    const ortak = { customers: [], services: [], dealers: [], stock: [], partSales: [], payments: [], notes: [], parts: [], appSettings: {}, flash: noop };
    render(<SettingsExport {...ortak} cekler={null} />);
    fireEvent.click(screen.getByText(/^Müşteri & Servis/));
    expect(screen.queryByText("Çek Portföyü")).toBeNull();
    cleanup();
    render(<SettingsExport {...ortak} cekler={[{ id: 1, paymentId: null, no: "B1", banka: "Vakıf", durum: "portfoy", tutar: 100, currency: "TRY" }]} />);
    fireEvent.click(screen.getByText(/^Müşteri & Servis/));
    expect(screen.getByText("Çek Portföyü")).toBeTruthy();
    fireEvent.mouseEnter(screen.getByText("Çek Portföyü").nextSibling); // açıklama ipucu
    expect(screen.getByText(/Alınan ve verilen çekler; numara, banka, tutar, vade, durum \(1 kayıt\)/)).toBeTruthy();
  });
});
