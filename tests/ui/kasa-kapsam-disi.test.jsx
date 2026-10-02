// @vitest-environment jsdom
// Spec 0058: Kasa'da hesapsız kayıtların kapsam dışı bırakılması (gerçek Kasa bileşeni, durumlu düzenek) ve gerçek App'te
// temizlik (hesap atanan kaydın girişi kayıtta düşer).
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { readFileSync } from "node:fs";

const denetim = vi.hoisted(() => ({ kayitlar: [] }));
vi.mock("../../src/lib/audit", async (orig) => ({ ...(await orig()), logAction: (o) => denetim.kayitlar.push(o) }));
const { Kasa, KAPSAM_DISI_ACIKLAMA, KAPSAM_SUZGEC_FARKI } = await import("../../src/components/Kasa");
const { odemeleriUygula, turHaritasi } = await import("../../src/lib/gider");

afterEach(() => { cleanup(); vi.useRealTimers(); denetim.kayitlar = []; });
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-09-30T10:00:00")); });

const TURLER = [{ id: 4, ad: "Hammadde", davranis: "normal" }];
const turMap = turHaritasi(TURLER);
const HESAP = [{ id: 51, ad: "Ziraat", tur: "banka", paraBirimi: "TRY", acilisBakiyesi: 100000, acilisTarihi: "2026-01-01", kapali: false }];
const TED = [{ id: 11, ad: "Yıldız Gayrimenkul" }];
const CAL = [{ id: 7, ad: "Hasan Çelik" }];
const NORMAL = { id: 23, tarih: "2026-05-01", turId: 4, tutar: 5000, kdvOrani: 0, tedarikciId: 11, aciklama: "Sac" };
const od = (id, tarih, o = {}) => ({ id, tur: "odeme", tarih, tutar: 100, hesapId: null, giderId: 23, taksitId: null, yontem: "Nakit", ...o });
const HAREKET = [od(10, "2026-05-10"), od(11, "2026-07-10"), { id: 13, tur: "avans", tarih: "2026-07-01", tutar: 50, calisanId: 7, hesapId: null }];
const sv = (id, date, o = {}) => ({ id, customerId: 500, date, type: "Garanti Dışı", repairPlace: "Yerinde Onarım", islemFirma: "Altuntaş Makina", servisUcreti: 1000,
  currency: "TRY", faturaTipi: "Faturalı Yurtiçi", odendi: true, tahsilatTarihi: date, yontem: "Nakit", degisenParcalar: [], hesapId: null, ...o });
const SERVIS = [sv(31, "2026-05-05"), sv(32, "2026-07-05")];
const KISITLI = { role: "user", permissions: JSON.stringify({ tabs: ["gider", "finance", "kasa"], giderActions: ["gider_odeme"] }) };

function H({ k0 = [], esik = "", perms = null, onState }) {
  const [kasaKapsamDisi, setKasaKapsamDisi] = useState(k0);
  const [services, setServices] = useState(SERVIS);
  onState?.({ kasaKapsamDisi, services });
  return <Kasa kasaHesaplari={HESAP} setKasaHesaplari={vi.fn()} hesapHareketleri={HAREKET} setHesapHareketleri={vi.fn()} giderler={odemeleriUygula([NORMAL], HAREKET, turMap)}
    giderTurleri={TURLER} tedarikciler={TED} calisanlar={CAL} customers={[{ id: 500, name: "Kutu Gıda" }]} services={services} setServices={setServices}
    factory={{ name: "Altuntaş Makina" }} giderAyarlari={esik ? { hesapsizBaslangic: esik } : {}} serverPermissions={perms} showToast={vi.fn()}
    kasaKapsamDisi={kasaKapsamDisi} setKasaKapsamDisi={setKasaKapsamDisi} />;
}
const sayi = (id) => screen.getByTestId(id).textContent;
const tahsilatlariAc = () => fireEvent.click(screen.getByText("Listeyi göster"));
const odemeleriAc = () => fireEvent.click(screen.getByText("Ödemeleri göster"));

describe("Spec 0058: satır satır kapsam dışı ve geri alma (AC-1–AC-5, AC-11, AC-13, AC-17, AC-28)", () => {
  it("AC-1 / AC-4 / AC-11 / AC-28 / AC-13: tahsilat satırı kapsam dışı bırakılır, listeden ve sayıdan çıkar; ayrı bölümde sayısıyla; metinler birebir", () => {
    let st;
    render(<H onState={s => { st = s; }} />);
    expect(screen.queryByTestId("kapsam-disi-satiri")).toBeNull(); // AC-27: sıfırken çizilmez
    tahsilatlariAc();
    expect(screen.getByTestId("kapsam-disi-aciklama").textContent).toBe(`${KAPSAM_DISI_ACIKLAMA} ${KAPSAM_SUZGEC_FARKI}`);
    expect(KAPSAM_DISI_ACIKLAMA).toBe("Kapsam dışı bırakmak kaydı silmez ve hiçbir tutarı değiştirmez; yalnız bu listeden çıkarır.");
    expect(KAPSAM_SUZGEC_FARKI).toBe("Başlangıç tarihi geçici bir süzgeçtir, kapsam dışı bırakmak kalıcı bir karardır.");
    const ilk = screen.getAllByTestId("hesapsiz-tahsilat")[0];
    fireEvent.click(within(ilk).getByText("Kapsam dışı bırak"));
    expect(st.kasaKapsamDisi).toEqual([expect.objectContaining({ tur: "tahsilat", kaynak: "servis", kayitId: 32 })]);
    expect(screen.getAllByTestId("hesapsiz-tahsilat")).toHaveLength(1);
    expect(sayi("hesapsiz-tahsilat-satiri")).toMatch(/tahsilatlar: 1/);
    expect(sayi("kapsam-disi-satiri")).toMatch(/Kapsam dışı bırakılanlar: 1/);
    expect(st.services).toEqual(SERVIS); // AC-3: kayıt değişmedi
    expect(denetim.kayitlar.at(-1)).toMatchObject({ action: "kapsam_disi", entity: "kasa_kapsam", entityId: 32, entityName: "Servis tahsilatı · Kutu Gıda" });
  });
  it("AC-2 / AC-17 / AC-5 / AC-13: ödeme ve avans satırı kapsam dışı bırakılır; 'Kapsama al' listeye döndürür; avansta çalışan adı işlem geçmişine yazılmaz", () => {
    let st;
    render(<H onState={s => { st = s; }} />);
    odemeleriAc();
    expect(screen.getAllByTestId("hesapsiz-odeme")).toHaveLength(3);
    const avans = screen.getAllByTestId("hesapsiz-odeme").find(r => r.textContent.includes("Avans"));
    fireEvent.click(within(avans).getByText("Kapsam dışı bırak"));
    expect(denetim.kayitlar.at(-1)).toMatchObject({ action: "kapsam_disi", entityName: "Avans" });
    expect(JSON.stringify(denetim.kayitlar)).not.toMatch(/Hasan/);
    fireEvent.click(within(screen.getAllByTestId("hesapsiz-odeme")[0]).getByText("Kapsam dışı bırak"));
    expect(st.kasaKapsamDisi.map(g => [g.tur, g.kayitId]).sort()).toEqual([["hareket", 10], ["hareket", 13]]);
    expect(sayi("hesapsiz-odeme-satiri")).toMatch(/ödemeler: 1/);
    fireEvent.click(screen.getByText("Göster"));
    const bolum = screen.getByTestId("kapsam-disi-listesi");
    expect(within(bolum).getAllByTestId("kapsam-disi-kayit")).toHaveLength(2);
    fireEvent.click(within(within(bolum).getAllByTestId("kapsam-disi-kayit").find(r => r.textContent.includes("Avans"))).getByText("Kapsama al"));
    expect(st.kasaKapsamDisi.map(g => g.kayitId)).toEqual([10]);
    expect(denetim.kayitlar.at(-1)).toMatchObject({ action: "kapsama_alindi", entity: "kasa_kapsam", entityName: "Avans" });
    expect(screen.getAllByTestId("hesapsiz-odeme")).toHaveLength(2);
  });
});

describe("Spec 0058: toplu işlem (AC-6, AC-27)", () => {
  it("AC-6: onay sayıyı, eşiğin açık olduğunu ve R2 cümlesini söyler; yalnız eşik sonrası küme etkilenir", () => {
    // Spec 0062 R17 ile güncellendi: etiket "Görünen" değil "Listedeki" (sayfalama gelince "görünen" sayfa sanılırdı).
    let st;
    render(<H esik="2026-06-01" onState={s => { st = s; }} />);
    tahsilatlariAc();
    expect(screen.getAllByTestId("hesapsiz-tahsilat")).toHaveLength(1); // eşik sonrası yalnız 32
    fireEvent.click(screen.getByLabelText("Listedeki tahsilatları kapsam dışı bırak"));
    const onay = screen.getByText(/kaydı kapsam dışı bırakılacak/).textContent;
    expect(onay).toMatch(/^1 tahsilat kaydı kapsam dışı bırakılacak\./);
    expect(onay).toMatch(/Başlangıç tarihi süzgeci açık \(01\/06\/2026\)/);
    expect(onay).toContain(KAPSAM_DISI_ACIKLAMA);
    fireEvent.click(screen.getByText("Kapsam Dışı Bırak"));
    expect(st.kasaKapsamDisi.map(g => g.kayitId)).toEqual([32]); // eşik öncesi 31 dokunulmadı
    expect(denetim.kayitlar.at(-1)).toMatchObject({ action: "kapsam_disi", entityName: "1 kayıt (toplu)" });
  });
  it("AC-6 / AC-27: eşik kapalıyken onay bunu söyler; liste boşalınca BosDurum ve pasif toplu düğme", () => {
    render(<H />);
    odemeleriAc();
    fireEvent.click(screen.getByLabelText("Listedeki ödemeleri kapsam dışı bırak"));
    expect(screen.getByText(/kaydı kapsam dışı bırakılacak/).textContent).toMatch(/^3 ödeme kaydı kapsam dışı bırakılacak\. Başlangıç tarihi süzgeci kapalı/);
    fireEvent.click(screen.getByText("Kapsam Dışı Bırak"));
    expect(screen.getByTestId("bos-hesapsiz-odeme")).toBeTruthy();
    expect(screen.getByLabelText("Listedeki ödemeleri kapsam dışı bırak").disabled).toBe(true);
    expect(sayi("kapsam-disi-satiri")).toMatch(/Kapsam dışı bırakılanlar: 3/);
  });
});

describe("Spec 0058: izin ve etiketler (AC-12, AC-26)", () => {
  it("AC-12: kasa_hesap izni olmayan kullanıcı düğmeleri görmez; liste ve sayılar görünür", () => {
    render(<H perms={KISITLI} k0={[{ id: 1, tur: "hareket", kaynak: null, kayitId: 10 }]} />);
    tahsilatlariAc();
    odemeleriAc();
    expect(screen.queryAllByText("Kapsam dışı bırak")).toEqual([]);
    expect(screen.queryByLabelText("Listedeki ödemeleri kapsam dışı bırak")).toBeNull();
    fireEvent.click(screen.getByText("Göster"));
    expect(screen.queryAllByText("Kapsama al")).toEqual([]);
    expect(screen.queryByTestId("kapsam-disi-aciklama")).toBeNull();
  });
  it("AC-26: işlem geçmişi etiket haritasında kasa_kapsam, kapsam_disi ve kapsama_alindi var", () => {
    const k = readFileSync("src/components/settings/SettingsAuditLog.jsx", "utf-8");
    expect(k).toMatch(/kasa_kapsam: "Kasa İş Listesi"/);
    expect(k).toMatch(/kapsam_disi: "Kapsam Dışı Bırakıldı"/);
    expect(k).toMatch(/kapsama_alindi: "Kapsama Alındı"/);
    expect(readFileSync("src/components/settings/serverPermissionDefs.js", "utf-8")).toMatch(/ve kasa iş listesini düzenleme/);
  });
});
// Gerçek App'teki temizlik (R5, R20; AC-7, AC-25) tests/ui/tahsilat-hesap.test.jsx içindeki Spec 0058 bloğunda (aynı düzenek).
