// @vitest-environment jsdom
// Spec 0051: Kasa'da hesapsız iş listesinin başlangıç tarihi (A) ve ödemenin kapattığı hedef (B). Gerçek bileşenler.
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { Kasa } from "../../src/components/Kasa";
import { EkstrePenceresi } from "../../src/components/gider/EkstrePenceresi";
import { OdemeKayitPenceresi } from "../../src/components/gider/OdemeKayitPenceresi";
import { calisanEkstresi } from "../../src/lib/kasa";
import { odemeleriUygula, turHaritasi } from "../../src/lib/gider";

afterEach(() => { cleanup(); vi.useRealTimers(); });
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-09-30T10:00:00")); });

const TURLER = [{ id: 1, ad: "Kira", davranis: "kira" }, { id: 3, ad: "Personel", davranis: "personel" }, { id: 4, ad: "Hammadde", davranis: "normal" }];
const turMap = turHaritasi(TURLER);
const HESAP = [{ id: 51, ad: "Ziraat", tur: "banka", paraBirimi: "TRY", acilisBakiyesi: 100000, acilisTarihi: "2026-01-01", kapali: false }];
const TED = [{ id: 11, ad: "Yıldız Gayrimenkul" }];
const CAL = [{ id: 7, ad: "Hasan Çelik" }];
const KIRA = { id: 20, tarih: "2026-09-01", turId: 1, tutar: 10000, kdvOrani: 0, stopajOrani: 20, tedarikciId: 11, aciklama: "Eylül kira",
  taksitler: [{ id: 201, hedef: "ana", sira: 1, vade: "2026-09-30", tutar: 8000 }, { id: 202, hedef: "stopaj", sira: 1, vade: "2026-10-26", tutar: 2000 }] };
const KIRA_ESKI = { id: 21, tarih: "2026-09-01", turId: 1, tutar: 10000, kdvOrani: 0, stopajOrani: 20, tedarikciId: 11, aciklama: "Ağustos kira" };
const PERS = { id: 22, tarih: "2026-09-01", turId: 3, calisanId: 7, calisanAd: "Hasan Çelik", resmiTutar: 30000, eldenTutar: 10000, ekOdemeler: [] };
const NORMAL = { id: 23, tarih: "2026-09-01", turId: 4, tutar: 5000, kdvOrani: 0, tedarikciId: 11, aciklama: "Sac" };
const GIDERLER = [KIRA, KIRA_ESKI, PERS, NORMAL];
const od = (id, giderId, tutar, o = {}) => ({ id, tur: "odeme", tarih: "2026-09-20", tutar, hesapId: 51, giderId, taksitId: null, yontem: "Havale", ...o });
const HAREKET = [od(1, 20, 2000, { taksitId: 202 }), od(2, 20, 8000, { taksitId: 201 }), od(3, 21, 9000), od(4, 22, 35000), od(5, 23, 5000), od(6, 999, 100),
  // hesapsız: eşik öncesi, sonrası, tarihsiz göç; avans eşik öncesi
  od(10, 23, 1, { hesapId: null, tarih: "2026-05-10" }), od(11, 23, 1, { hesapId: null, tarih: "2026-07-10" }), od(12, 23, null, { hesapId: null, tarih: null, kaynak: "goc", tamKapatir: true }),
  { id: 13, tur: "avans", tarih: "2026-05-01", tutar: 50, calisanId: 7, hesapId: null }];
const sv = (id, date, o = {}) => ({ id, customerId: 500, date, type: "Garanti Dışı", repairPlace: "Yerinde Onarım", islemFirma: "Altuntaş Makina", servisUcreti: 1000,
  currency: "TRY", faturaTipi: "Faturalı Yurtiçi", odendi: true, tahsilatTarihi: date, yontem: "Nakit", degisenParcalar: [], hesapId: null, ...o });
const SERVIS = [sv(31, "2026-05-05"), sv(32, "2026-07-05")];
const KISITLI = { role: "user", permissions: JSON.stringify({ tabs: ["gider", "finance"], giderActions: ["gider_odeme"] }) };

const KasaEkrani = ({ esik = "", perms = null, h = HAREKET }) => (
  <Kasa kasaHesaplari={HESAP} setKasaHesaplari={vi.fn()} hesapHareketleri={h} setHesapHareketleri={vi.fn()} giderler={odemeleriUygula(GIDERLER, h, turMap)}
    giderTurleri={TURLER} tedarikciler={TED} calisanlar={CAL} customers={[{ id: 500, name: "Kutu Gıda" }]} services={SERVIS} factory={{ name: "Altuntaş Makina" }}
    giderAyarlari={esik ? { hesapsizBaslangic: esik } : {}} serverPermissions={perms} showToast={vi.fn()} />);
const sayi = (id) => screen.getByTestId(id).textContent;
const satirlar = () => screen.getAllByTestId("hareket-satiri").map(s => s.textContent);
const var_ = (re) => expect(satirlar().some(t => re.test(t)), String(re)).toBe(true);

describe("Spec 0051 A: hesapsız iş listesinde başlangıç tarihi", () => {
  it("AC-2: tarih boşken bütün hesapsız kayıtlar sayılır; eşik satırı yok", () => {
    render(<KasaEkrani />);
    expect(sayi("hesapsiz-odeme-satiri")).toMatch(/ödemeler: 3/);
    expect(sayi("hesapsiz-tahsilat-satiri")).toMatch(/tahsilatlar: 2/);
    expect(screen.queryByTestId("hesapsiz-esik-satiri")).toBeNull();
  });
  it("AC-3 / AC-4 / AC-5 / AC-6 / AC-18 / AC-25: eşik girilince eşik öncesi gizlenir, sayılar süzülür, eşik satırı nedenleri ve tarihsizi yazar", () => {
    render(<KasaEkrani esik="2026-06-01" />);
    expect(sayi("hesapsiz-odeme-satiri")).toMatch(/ödemeler: 2 \(1 tanesi eski kayıtlardan aktarıldı\)/); // tarihsiz göç görünür
    expect(sayi("hesapsiz-tahsilat-satiri")).toMatch(/tahsilatlar: 1/);
    fireEvent.click(screen.getByText("Listeyi göster"));
    expect(screen.getAllByTestId("hesapsiz-tahsilat")).toHaveLength(1);
    const e = sayi("hesapsiz-esik-satiri");
    expect(e).toMatch(/öncesi 3 kayıt listede gösterilmiyor \(1 ödeme, 1 avans, 1 hesapsız tahsilat\)/);
    expect(e).toMatch(/Tarihi olmayan 1 kayıt listede kalır/);
  });
  it("AC-22: 'Hepsini göster' ayarı değiştirmez, hatırlanmaz ve gider_tanim izni olmayan kullanıcıda da çalışır", () => {
    render(<KasaEkrani esik="2026-06-01" perms={KISITLI} />);
    fireEvent.click(screen.getByText("Hepsini göster"));
    expect(sayi("hesapsiz-odeme-satiri")).toMatch(/ödemeler: 3/);
    expect(sayi("hesapsiz-esik-satiri")).toMatch(/yok sayıldı/);
    cleanup();
    render(<KasaEkrani esik="2026-06-01" perms={KISITLI} />);
    expect(sayi("hesapsiz-odeme-satiri")).toMatch(/ödemeler: 2/); // yeniden açılışta süzülü
  });
});

describe("Spec 0051 B: hareket listesinde ödemenin kapattığı hedef", () => {
  it("AC-11 / AC-12 / AC-9: kira stopajına ödeme vergi dairesini, kiranın kendisine ödeme kiraya vereni yazar", () => {
    render(<KasaEkrani />);
    var_(/Yıldız Gayrimenkul · Vergi dairesine \(stopaj\) · Eylül kira/);
    var_(/Yıldız Gayrimenkul · Kiraya verene · Eylül kira/);
  });
  it("AC-26 / AC-27 / AC-13: satırsız kirada bölünmüş ödeme iki hedefi tutarlarıyla, satırsız personel Resmi + Elden yazar", () => {
    render(<KasaEkrani />);
    var_(/Kiraya verene 8\.000 ₺ \+ Vergi dairesine \(stopaj\) 1\.000 ₺ · Ağustos kira/);
    var_(/Hasan Çelik · Maaş \(resmi\) 30\.000 ₺ \+ Maaş \(elden\) 5\.000 ₺/);
  });
  it("AC-14 / AC-15: normal kalemde metin değişmez; silinmiş kalemin ödemesi bugünkü metinle, hatasız", () => {
    render(<KasaEkrani />);
    var_(/Gider ödemesiYıldız Gayrimenkul · Sac(?! ·)/); // normal kalem: hedef yok
    var_(/Gider ödemesiSilinmiş gider/);
  });
  // Spec 0054 R16 ile güncellendi: çok hedeflilik artık tek kaynaktan (cokHedefliMi); eski eldenHedefliMi || personelIkiHedef
  // birleşimi dört hedefte eksik kaldığı için kaldırıldı.
  it("AC-16 / AC-30: hedef adı yalnız hedefAdi'dan; ekranlarda kopya metin yok, çok hedeflilik cokHedefliMi'den", () => {
    for (const f of ["src/components/Kasa.jsx", "src/components/gider/EkstrePenceresi.jsx", "src/components/gider/OdemeKayitPenceresi.jsx"]) {
      const src = readFileSync(f, "utf-8").split("\n").filter(l => !l.trim().startsWith("//")).join("\n");
      expect(src, f).not.toMatch(/"(Resmi|Elden|Kiraya verene|Vergi dairesine \(stopaj\))"/);
    }
    // Spec 0059 R31 ile güncellendi: tanım saf kitaplığa (odemeYontemi.js) taşındı, GiderAlanlari.jsx yeniden dışa verir.
    const alanlar = readFileSync("src/lib/odemeYontemi.js", "utf-8").split("\n").filter(l => !l.trim().startsWith("//")).join("\n");
    expect(alanlar).not.toMatch(/eldenHedefliMi|personelIkiHedef/);
    expect(alanlar).toMatch(/if \(!kalem \|\| !paylar\?\.length \|\| !cokHedefliMi\(kalem, davranis\)\) return null;/);
    expect(readFileSync("src/components/gider/GiderAlanlari.jsx", "utf-8")).toMatch(/export \{[^}]*hedefEtiketi[^}]*\}/);
  });
});

describe("Spec 0051 B: çalışan ekstresi ve ödeme penceresi", () => {
  const MAHSUP = { id: 40, tur: "mahsup", tarih: "2026-09-25", tutar: 2000, calisanId: 7, giderId: 22, hesapId: null };
  it("AC-17 / AC-28: çalışan ekstresinde ödeme Resmi + Elden, mahsup 'Avanstan mahsup' ve hedefiyle", () => {
    const hs = [od(4, 22, 35000), MAHSUP];
    render(<EkstrePenceresi baslik="Hasan Çelik" tur="calisan" hesapla={() => calisanEkstresi(7, { giderler: [PERS], hareketler: hs, turler: TURLER })} hesapAdi={() => "Ziraat"} onClose={vi.fn()} />);
    const satirlar = screen.getAllByTestId("ekstre-satiri");
    expect(satirlar.find(s => s.textContent.startsWith("20.09") || s.textContent.includes("Ödeme")).textContent).toMatch(/Maaş \(resmi\) 30\.000 ₺ \+ Maaş \(elden\) 5\.000 ₺/);
    expect(satirlar.find(s => s.textContent.includes("Avanstan mahsup")).textContent).toMatch(/Avanstan mahsup.*Maaş \(elden\)/); // spec 0054 R16 adı
  });
  it("R10 / Q2: ödeme penceresinin kayıtlı ödemelerinde satırsız kalem 'Kalem' yerine hedefi yazar; mahsup da", () => {
    const hs = [od(4, 22, 35000), MAHSUP];
    const kalem = odemeleriUygula([PERS], hs, turMap)[0];
    render(<OdemeKayitPenceresi kalem={kalem} davranis="personel" turAd="Personel" turMap={turMap} hareketler={hs} hesaplar={HESAP} odemeYetkisi
      bugun="2026-09-30" onKaydet={vi.fn()} onSil={vi.fn()} onClose={vi.fn()} giderler={[PERS]} />);
    const kayitlar = screen.getAllByTestId("odeme-kaydi").map(k => k.textContent);
    expect(kayitlar.some(t => /Maaş \(resmi\) 30\.000 ₺ \+ Maaş \(elden\) 5\.000 ₺/.test(t))).toBe(true);
    expect(kayitlar.some(t => /Avanstan mahsup · Maaş \(elden\)/.test(t))).toBe(true);
    expect(kayitlar.some(t => /Kalem/.test(t))).toBe(false);
  });
});
