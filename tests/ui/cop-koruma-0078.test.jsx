// @vitest-environment jsdom
// Spec 0078 AC-15, R9, R33: bir ekrandan yazım yapıldığında çöpteki kayıtlar korunur. Her düzenek App gibi TAM diziyi tutar
// ve bileşene canlı diziyi verir (`tahsilat-cop-korunur` deseni); bileşen tam diziye işlevsel güncelleyiciyle yazmazsa
// çöpteki kayıt sessizce kalıcı silinir. Altı bölüm ayrı ayrı.
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { useState } from "react";
import { Kasa } from "../../src/components/Kasa";
import { StandartGiderler } from "../../src/components/gider/StandartGiderler";
import { GiderTurManager } from "../../src/components/settings/GiderTurManager";
import { SettingsGiderTanimlari } from "../../src/components/settings/SettingsGiderTanimlari";
import { cekleriUygula } from "../../src/lib/cek";
import { odemeleriUygula, turHaritasi } from "../../src/lib/gider";
import { withoutDeleted } from "../../src/lib/utils";

afterEach(() => { cleanup(); vi.useRealTimers(); });
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-09-28T10:00:00")); });
const Z = "2026-09-01T09:00:00.000Z";
const TUR = [{ id: 1, ad: "Hammadde", davranis: "normal" }];
const turMap = turHaritasi(TUR);
const GIDER = [{ id: 1, tarih: "2026-09-01", turId: 1, tutar: 5000, kdvOrani: 20, tedarikciId: 10, aciklama: "Sac" }];
const HESAP = (id, ad, o = {}) => ({ id, ad, tur: "banka", paraBirimi: "TRY", acilisBakiyesi: 0, kapali: false, ...o });
const cek = (id, paymentId, no, o = {}) => ({ id, paymentId, no, banka: "Ziraat", kesideci: "Ali", tur: "hamiline", durum: "portfoy", gecmis: [{ tarih: "2026-09-10", durum: "portfoy", not: "Alındı" }], ...o });
const odeme = (id, tutar) => ({ id, customerId: 1, tarih: "2026-09-10", tutar, currency: "TRY", yontem: "Çek", vadeTarihi: "2026-10-15", tahsilEdildi: false });
const COPTE_HAREKET = { id: 999, tur: "odeme", tarih: "2026-09-02", tutar: 10, hesapId: 97, giderId: 1, deletedAt: Z };
const COPTE_CEK = cek(299, null, "000", { yon: "alinan", tutar: 5, currency: "TRY", vadeTarihi: "2026-10-01", deletedAt: Z });
const COPTE_HESAP = HESAP(98, "Çöpteki", { deletedAt: Z });

// App gibi: tam dizi state'te, Kasa'ya canlısı gider (çekler bilinçli olarak ham, R12).
function KasaH({ c0, h0, k0 = [HESAP(97, "Ziraat"), COPTE_HESAP], onState }) {
  const [cekler, setCekler] = useState(c0);
  const [hareketler, setHareketler] = useState(h0);
  const [hesaplar, setHesaplar] = useState(k0);
  onState?.({ cekler, hareketler, hesaplar });
  const canli = withoutDeleted(hareketler);
  return <Kasa kasaHesaplari={withoutDeleted(hesaplar)} setKasaHesaplari={setHesaplar} hesapHareketleri={canli} setHesapHareketleri={setHareketler}
    payments={cekleriUygula([odeme(100, 12000)], cekler)} customers={[{ id: 1, name: "Kutu Gıda" }]} giderler={odemeleriUygula(GIDER, canli, turMap)} giderTurleri={TUR}
    tedarikciler={[{ id: 10, ad: "Demir Bant" }]} calisanlar={[]} cekler={cekler} setCekler={setCekler} giderAyarlari={{ hatirlatmaEsikGun: 7, denemeDonemiBitis: "" }}
    showToast={vi.fn()} />;
}
const portfoy = () => fireEvent.click(screen.getByRole("tab", { name: "Çek Portföyü" }));
const cekSatiri = (no) => screen.getAllByTestId("cek-satiri").find(s => s.textContent.includes(no));

describe("Spec 0078 AC-12, AC-21, AC-22, AC-23: çöp kutusu silme engellerini gevşetmez ve çöptekini göstermez", () => {
  it("AC-12 (standart gider): grubun bütün sürümleri çöpteyse grup listede görünmez", () => {
    const copte = { id: 5, grupId: 5, ad: "Eski Kira", tutar: 1, baslangicAy: "2026-01", bitisAy: null, deletedAt: Z };
    render(<StandartGiderler standartGiderler={withoutDeleted([copte])} setStandartGiderler={vi.fn()} showToast={vi.fn()} canDo={() => true} />);
    expect(screen.queryByText("Eski Kira")).toBeNull();
  });
  it("AC-21: hareketi olan kasa hesabı (deneme dönemi kapalı) yine silinemez; yalnız çöpteki hareketi olan silinebilir", () => {
    const kasa = (h0) => render(<KasaH c0={[]} h0={h0} k0={[HESAP(97, "Ziraat")]} />);
    kasa([{ id: 1, tur: "odeme", tarih: "2026-09-02", tutar: 10, hesapId: 97, giderId: 1 }]);
    const satir = () => screen.getAllByTestId("hesap-satiri").find(x => x.textContent.includes("Ziraat"));
    expect(within(satir()).queryByTitle("Sil")).toBeNull();
    cleanup();
    kasa([{ id: 1, tur: "odeme", tarih: "2026-09-02", tutar: 10, hesapId: 97, giderId: 1, deletedAt: Z }]); // AC-40
    expect(within(satir()).getByTitle("Sil")).toBeTruthy();
  });
  it("AC-22: kullanımdaki gider türü yine yalnız aynı davranıştaki (canlı) türe taşınarak silinir", () => {
    function H() {
      const [turler, setTurler] = useState([{ id: 1, ad: "Elektrik", davranis: "normal" }, { id: 2, ad: "Su", davranis: "normal" },
        { id: 3, ad: "Çöpteki Gider", davranis: "normal", deletedAt: Z }, { id: 4, ad: "Kira", davranis: "kira" }]);
      return <GiderTurManager giderTurleri={turler} setGiderTurleri={setTurler} giderler={[{ id: 9, turId: 1, tarih: "2026-09-01", tutar: 1 }]} setGiderler={vi.fn()}
        giderTanimlari={[]} setGiderTanimlari={vi.fn()} showToast={vi.fn()} />;
    }
    render(<H />);
    fireEvent.click(within(screen.getAllByText("Elektrik").find(e => e.tagName === "TD").closest("tr")).getByTitle("Sil"));
    const secenekler = [...screen.getByLabelText("Kayıtları şu türe taşı").querySelectorAll("option")].map(o => o.textContent);
    expect(secenekler).toEqual(["Su"]);
  });
  it("AC-23: tahsilatı duran (bağlı) çek yine silinemez; Sil düğmesi yok", () => {
    render(<KasaH c0={[cek(200, 100, "123456")]} h0={[]} />);
    portfoy();
    expect(within(cekSatiri("123456")).queryByText("Sil")).toBeNull();
  });
});

describe("Spec 0078 AC-15: çöpteki kayıtlar ekran yazımında korunur", () => {
  it("hesapHareketleri (R33): ciro iptali tam diziden yalnız ciro hareketlerini çıkarır; çöpteki ödeme kalır", () => {
    let st;
    const cirolu = cek(200, 100, "123456", { durum: "ciro", gecmis: [{ tarih: "2026-09-10", durum: "portfoy", not: "Alındı" }, { tarih: "2026-10-02", durum: "ciro", not: "Ciro" }] });
    const ciroH = { id: 900, tur: "odeme", tarih: "2026-10-02", tutar: 6000, giderId: 1, hesapId: null, cekId: 200, yontem: "Çek (ciro)" };
    render(<KasaH c0={[cirolu]} h0={[ciroH, COPTE_HAREKET]} onState={s => { st = s; }} />);
    portfoy();
    fireEvent.click(screen.getByRole("button", { name: "Ciro edildi" }));
    fireEvent.click(within(cekSatiri("123456")).getByText("Durum"));
    fireEvent.click(within(screen.getByTestId("cek-durum-penceresi")).getByRole("button", { name: "Ciroyu İptal Et" }));
    fireEvent.click(screen.getAllByText("Ciroyu İptal Et").pop());
    expect(st.hareketler).toEqual([COPTE_HAREKET]);
    expect(st.cekler[0].durum).toBe("portfoy");
  });
  it("cekler: bağsız çekin çöpe atılması öteki çöpteki çeki korur", () => {
    let st;
    render(<KasaH c0={[cek(201, null, "777", { yon: "alinan", tutar: 5, currency: "TRY", vadeTarihi: "2026-10-01" }), COPTE_CEK]} h0={[]} onState={s => { st = s; }} />);
    portfoy();
    fireEvent.click(within(cekSatiri("777")).getByText("Sil"));
    fireEvent.click(screen.getAllByText("Sil").filter(e => e.closest("button")).pop());
    expect(st.cekler.map(c => [c.id, !!c.deletedAt])).toEqual([[201, true], [299, true]]);
    expect(st.cekler.find(c => c.id === 299)).toEqual(COPTE_CEK);
  });
  it("AC-12 (kasa hesabı), AC-15 kasaHesaplari: hareketsiz hesabın çöpe atılması öteki çöpteki hesabı korur; çöpteki hesap listede görünmez", () => {
    let st;
    render(<KasaH c0={[]} h0={[]} k0={[HESAP(97, "Ziraat"), HESAP(96, "Boş"), COPTE_HESAP]} onState={s => { st = s; }} />);
    expect(screen.queryByText("Çöpteki")).toBeNull();
    const satir = screen.getAllByTestId("hesap-satiri").find(s => s.textContent.includes("Boş"));
    fireEvent.click(within(satir).getByTitle("Sil"));
    fireEvent.click(screen.getByText("Hesabı Sil"));
    expect(st.hesaplar.find(h => h.id === 98)).toEqual(COPTE_HESAP);
    expect(st.hesaplar.find(h => h.id === 96).deletedAt).toBeTruthy();
    expect(st.hesaplar.find(h => h.id === 97).deletedAt).toBeUndefined();
  });
  it("standartGiderler (R9): yeni grup eklemek çöpteki sürümleri korur (copuKoru)", () => {
    let st;
    const copte = { id: 5, grupId: 5, ad: "Eski", tutar: 1, baslangicAy: "2026-01", bitisAy: null, deletedAt: Z };
    function H() {
      const [sg, setSg] = useState([copte]);
      st = sg;
      return <StandartGiderler standartGiderler={withoutDeleted(sg)} setStandartGiderler={setSg} showToast={vi.fn()} canDo={() => true} />;
    }
    render(<H />);
    fireEvent.change(screen.getByPlaceholderText("Örn. Kira"), { target: { value: "Kira" } });
    fireEvent.change(screen.getByLabelText("Aylık tutar"), { target: { value: "20.000" } });
    fireEvent.change(screen.getByLabelText("Geçerlilik başlangıcı"), { target: { value: "2026-01" } });
    fireEvent.click(screen.getByText("Ekle"));
    expect(st).toHaveLength(2);
    expect(st.find(s => s.id === 5)).toEqual(copte);
  });
  it("AC-12 (gider türü), AC-15 giderTurleri: tür ham gelir; listede çöpteki görünmez, başka türü silmek onu korur", () => {
    let st;
    const copte = { id: 3, ad: "Sigorta", davranis: "normal", deletedAt: Z };
    function H() {
      const [turler, setTurler] = useState([{ id: 1, ad: "Elektrik", davranis: "normal" }, copte]);
      st = turler;
      return <GiderTurManager giderTurleri={turler} setGiderTurleri={setTurler} giderler={[]} setGiderler={vi.fn()} giderTanimlari={[]} setGiderTanimlari={vi.fn()} showToast={vi.fn()} />;
    }
    render(<H />);
    expect(screen.queryByText("Sigorta")).toBeNull();
    fireEvent.click(within(screen.getAllByText("Elektrik").find(e => e.tagName === "TD").closest("tr")).getByTitle("Sil"));
    fireEvent.click(screen.getByText("Sil"));
    expect(st.find(t => t.id === 3)).toEqual(copte);
    expect(st.find(t => t.id === 1).deletedAt).toBeTruthy();
  });
  it("AC-12 (tanım), AC-15 giderTanimlari: Ayarlar canlı tanımı verir; bir tanımı silmek çöpteki tanımı korur", () => {
    let st;
    const copte = { id: 92, turId: 1, ad: "Eski tanım", tutar: 1, baslangicAy: "2026-01", uretilenAylar: [], modelSatirlari: [], deletedAt: Z };
    function H() {
      const [t, setT] = useState([{ id: 91, turId: 1, ad: "İnternet", tutar: 1250, baslangicAy: "2026-01", uretilenAylar: [], modelSatirlari: [] }, copte]);
      st = t;
      return <SettingsGiderTanimlari giderTanimlari={withoutDeleted(t)} setGiderTanimlari={setT} giderTurleri={TUR} calisanlar={[]} showToast={vi.fn()} />;
    }
    render(<H />);
    expect(screen.queryByText("Eski tanım")).toBeNull();
    fireEvent.click(screen.getByTitle("Sil"));
    fireEvent.click(screen.getByText("Evet, Sil"));
    expect(st.find(x => x.id === 92)).toEqual(copte);
    expect(st.find(x => x.id === 91).deletedAt).toBeTruthy();
  });
});
