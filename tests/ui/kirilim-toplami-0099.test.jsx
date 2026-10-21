// @vitest-environment jsdom
// Spec 0099: hammadde kırılımının toplamı satırların altında. Gerçek Settings (Katalog › Parça/Yedek Parça), 0096'nın düzeneği:
// panele çöpü süzülmüş parça dizisi, setter'a tam dizi, tedarikçi dizisi HAM. Kaynak taramaları tests/kirilim-toplami-0099.test.js'te.
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { useState } from "react";
import { Settings } from "../../src/components/Settings";
import { HAMMADDE_TOPLAM_ETIKETI, hammaddeToplamSayisi, HAMMADDE_TOPLAM_HATALI, HAMMADDE_TUTARSIZ_UYARI, HAMMADDE_IPUCU, KAYNAK_KIRILIM,
  kirilimdanGeliyorMetni } from "../../src/lib/urunAgaci";

afterEach(() => { cleanup(); delete window.crmLocks; });

const BASE = {
  customers: [], services: [], dealers: [], stock: [], setStock: vi.fn(), setCustomers: vi.fn(), setServices: vi.fn(), setDealers: vi.fn(),
  version: "3.49.0", appSettings: {}, setAppSettings: vi.fn(), factory: { name: "Altuntaş" }, setFactory: vi.fn(), kalipDefs: [], setKalipDefs: vi.fn(),
  calisanlar: [], setCalisanlar: vi.fn(), partTypeDefs: [], setPartTypeDefs: vi.fn(), onInitialTabConsumed: vi.fn(), aktifKullanici: "kerem",
};
const TED = [
  { id: 31, ad: "Demir Çelik", hammadde: true }, { id: 32, ad: "Sac Ltd", hammadde: true }, { id: 33, ad: "Döküm A.Ş.", hammadde: true },
  { id: 34, ad: "Yakıt A.Ş." }, { id: 35, ad: "Eski Sac", hammadde: true, deletedAt: "2026-10-01T00:00:00.000Z" },
];
const AYNA = { id: 8, ad: "Ayna dişlisi", models: [], hammaddeler: [{ tedarikciId: 31, tutar: 7000 }, { tedarikciId: 32, tutar: 9000 }, { tedarikciId: 33, tutar: 1000 }] };
const PARCALAR = [
  { id: 7, ad: "Rulman", models: [], fiyatTRY: 450, maliyet: 120.5 },
  AYNA,
  { id: 9, ad: "Kayış", models: [] },
  { id: 10, ad: "Tahrik mili", models: [], maliyet: 300, hammaddeler: [{ tedarikciId: 31, tutar: 4250 }, { tedarikciId: 32, tutar: null }] },
  { id: 11, ad: "Çift kayıt", models: [], hammaddeler: [{ tedarikciId: 31, tutar: 100 }, { tedarikciId: 31, tutar: 200 }] },
];
const canli = (a) => a.filter(x => !x.deletedAt);
let durum;
function Katalog({ p0 = PARCALAR, t0 = TED, giderYetki = true, setStandardModels = vi.fn(), standardModels = [], yazim = null }) {
  const [parts, setPartsHam] = useState(structuredClone(p0));
  // Triyaj (bulgu 1): parça dizisine yazım casusu; kaydın gerçekten yapıldığı ölçülür.
  const setParts = (v) => { yazim?.(); setPartsHam(v); };
  durum = { parts };
  return <Settings {...BASE} initialTab="yedekparca" parts={canli(parts)} setParts={setParts} standardModels={standardModels} setStandardModels={setStandardModels}
    customModels={[]} setCustomModels={vi.fn()} rawParts={parts} rawCustomModels={[]} tedarikciler={t0} setTedarikciler={vi.fn()} giderYetki={giderYetki} />;
}
const satir = (ad) => screen.getAllByText(ad).map(e => e.closest("tr")).find(Boolean);
const duzenle = (ad) => fireEvent.click(within(satir(ad)).getByTitle("Düzenle"));
const kaydet = () => fireEvent.click(screen.getByRole("button", { name: /Kaydet/ }));
const kayit = (id) => durum.parts.find(p => p.id === id);
const tedSec = (i, id) => fireEvent.change(screen.getByLabelText(`Hammadde tedarikçisi ${i}`), { target: { value: String(id) } });
const tutar = (i, v) => fireEvent.change(screen.getByLabelText(`Hammadde tutarı ${i}`), { target: { value: v } });
const ekle = () => fireEvent.click(screen.getByRole("button", { name: /Tedarikçi ekle/ }));
const toplam = () => screen.queryByTestId("hammadde-toplam");
const metin = (n, tl) => `${HAMMADDE_TOPLAM_ETIKETI}${hammaddeToplamSayisi(n)}${tl}`;
const once = (a, b) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

describe("Spec 0099: toplam satırı (R2–R6, R13)", () => {
  it("AC-1 / AC-2 / AC-3: kırılımlı parçada satırların altında; etiket, sayı ibaresi ve tutar ayraçsız sırayla", () => {
    render(<Katalog />);
    duzenle("Ayna dişlisi");
    const k = toplam();
    expect(within(screen.getByTestId("hammadde-bolumu")).getByTestId("hammadde-toplam")).toBe(k);
    expect(k.textContent.startsWith("Toplam, parçanın alış maliyeti")).toBe(true);
    expect(k.textContent).toBe(metin(3, "17.000,00 ₺"));
    expect(hammaddeToplamSayisi(3)).toBe("tutarı girilen 3 tedarikçi");
    const satirlar = screen.getAllByTestId("hammadde-satiri");
    expect(once(satirlar[satirlar.length - 1], k)).toBe(true);
  });
  it("AC-4: dördüncü tedarikçi: boş satır sayıyı ve tutarı değiştirmez; 500 girilince aynı etkileşimde 4 ve 17.500,00 ₺", () => {
    render(<Katalog t0={[...TED, { id: 36, ad: "Talaş Ltd", hammadde: true }]} />);
    duzenle("Ayna dişlisi");
    expect(toplam().textContent).toBe(metin(3, "17.000,00 ₺"));
    ekle();
    expect(toplam().textContent).toBe(metin(3, "17.000,00 ₺"));
    tedSec(4, 36);
    expect(toplam().textContent).toBe(metin(3, "17.000,00 ₺"));
    tutar(4, "500");
    expect(toplam().textContent).toBe(metin(4, "17.500,00 ₺"));
  });
  it("AC-5: bir satırın tutarı silinince o satır sayılmaz ve sayı bir azalır", () => {
    render(<Katalog />);
    duzenle("Ayna dişlisi");
    tutar(2, "");
    expect(toplam().textContent).toBe(metin(2, "8.000,00 ₺"));
  });
  it("AC-6: bir satır bütünüyle silinince toplam o satırı saymaz", () => {
    render(<Katalog />);
    duzenle("Ayna dişlisi");
    fireEvent.click(within(screen.getAllByTestId("hammadde-satiri")[0]).getByTitle("Satırı sil"));
    expect(toplam().textContent).toBe(metin(2, "10.000,00 ₺"));
  });
  it("AC-7: kuruşlu tutarlar 17.001,00 ₺", () => {
    render(<Katalog />);
    duzenle("Kayış");
    ekle(); tedSec(1, 31); tutar(1, "8.000,55"); ekle(); tedSec(2, 32); tutar(2, "9.000,45");
    expect(toplam().textContent).toBe(metin(2, "17.001,00 ₺"));
  });
  it("AC-7/2: tek tedarikçi 4.250 → 'tutarı girilen 1 tedarikçi', ayrı görünüm yok", () => {
    render(<Katalog />);
    duzenle("Kayış");
    ekle(); tedSec(1, 31); tutar(1, "4250");
    expect(toplam().textContent).toBe(metin(1, "4.250,00 ₺"));
  });
  it("AC-8: hiçbir satırda tutar yokken toplam satırı çizilmez", () => {
    render(<Katalog />);
    duzenle("Kayış");
    ekle(); tedSec(1, 31);
    expect(screen.getAllByTestId("hammadde-satiri")).toHaveLength(1);
    expect(toplam()).toBeNull();
  });
  it("AC-9: hiç tedarikçi satırı olmayan parçada toplam satırı çizilmez", () => {
    render(<Katalog />);
    duzenle("Kayış");
    expect(screen.queryAllByTestId("hammadde-satiri")).toHaveLength(0);
    expect(toplam()).toBeNull();
  });
  it("AC-10: bütün satırlar 0 → toplam çizilir ve '0,00 ₺' yazar", () => {
    render(<Katalog />);
    duzenle("Kayış");
    ekle(); tedSec(1, 31); tutar(1, "0"); ekle(); tedSec(2, 32); tutar(2, "0");
    expect(toplam().textContent).toBe(metin(2, "0,00 ₺"));
  });
  it("AC-10/2: tutarsız kırılımda ekrandaki satır sayısı değil tutarı girilen sayı; tutarsız uyarısı aynen", () => {
    render(<Katalog />);
    duzenle("Tahrik mili");
    expect(screen.getAllByTestId("hammadde-satiri")).toHaveLength(2);
    expect(toplam().textContent).toBe(metin(1, "4.250,00 ₺"));
    expect(screen.getByTestId("hammadde-tutarsiz").textContent).toBe(HAMMADDE_TUTARSIZ_UYARI);
  });
  it("AC-11: 'Tedarikçi ekle'nin altında, tutarsız uyarısının ve ipucunun üstünde", () => {
    render(<Katalog />);
    duzenle("Tahrik mili");
    const dugme = screen.getByRole("button", { name: /Tedarikçi ekle/ });
    const uyari = screen.getByTestId("hammadde-tutarsiz");
    const ipucu = within(screen.getByTestId("hammadde-bolumu")).getByText(HAMMADDE_IPUCU);
    expect(once(dugme, toplam())).toBe(true);
    expect(once(toplam(), uyari)).toBe(true);
    expect(once(toplam(), ipucu)).toBe(true);
  });
  it("AC-12: bütün uygun tedarikçiler seçiliyken 'Tedarikçi ekle' yok, toplam yine var", () => {
    render(<Katalog />);
    duzenle("Ayna dişlisi");
    expect(screen.queryByRole("button", { name: /Tedarikçi ekle/ })).toBeNull();
    expect(toplam()).toBeTruthy();
  });
});

describe("Spec 0099: rakam ve sayı tek yerde (R7–R10)", () => {
  it("AC-13: yetkili kullanıcıda maliyet alanının altında rakam yok, yalnız sayısız gerekçe", () => {
    render(<Katalog />);
    duzenle("Ayna dişlisi");
    expect(screen.queryByTestId("maliyet-kirilimdan")).toBeNull();
    expect(screen.getByTestId("maliyet-kaynagi").textContent).toBe(KAYNAK_KIRILIM);
    expect(KAYNAK_KIRILIM).toBe("Hammadde kırılımından geliyor");
  });
  it("AC-14: açık pencerenin içinde tedarikçi sayısı bir kez geçer ve o yer toplam satırıdır (liste hücresi pencerenin dışında)", () => {
    render(<Katalog />);
    duzenle("Ayna dişlisi");
    const pencere = document.querySelector(".modal-backdrop");
    expect(pencere.textContent.match(/\d+ tedarikçi/g)).toHaveLength(1);
    expect(toplam().textContent).toMatch(/\d+ tedarikçi/);
    expect(pencere.contains(toplam())).toBe(true);
    expect(pencere.contains(within(satir("Ayna dişlisi")).getByTestId("parca-maliyet"))).toBe(false);
  });
  it("AC-15: yetkisiz kullanıcıda maliyet alanının altında bugünkü rakamlı satır durur", () => {
    render(<Katalog giderYetki={false} />);
    duzenle("Ayna dişlisi");
    expect(screen.getByTestId("maliyet-kirilimdan").textContent).toBe("Maliyet hammadde kırılımından geliyor: 17.000,00 ₺");
    expect(screen.getByTestId("maliyet-kirilimdan").textContent).toBe(kirilimdanGeliyorMetni(1700000));
    expect(screen.getByTestId("maliyet-kaynagi").textContent).toBe(KAYNAK_KIRILIM);
  });
  it("AC-16: yetkisiz kullanıcı toplam satırını ve hiçbir tedarikçi sayısını görmez", () => {
    render(<Katalog giderYetki={false} />);
    duzenle("Ayna dişlisi");
    expect(toplam()).toBeNull();
    expect(document.body.textContent).not.toMatch(/\d+ tedarikçi/);
  });
  it("AC-17: elle girilmiş maliyette alan etkin, 'Elle girildi', toplam yok", () => {
    render(<Katalog />);
    duzenle("Rulman");
    expect(screen.getByLabelText("Alış maliyeti").disabled).toBe(false);
    expect(screen.getByTestId("maliyet-kaynagi").textContent).toBe("Elle girildi");
    expect(toplam()).toBeNull();
  });
  it("AC-18: tutarlar boşaltılınca alan etkinleşir, toplam kaybolur, gerekçe yerini 'Elle girildi'ye ya da boşluğa bırakır", () => {
    render(<Katalog />);
    duzenle("Tahrik mili");
    expect(screen.getByLabelText("Alış maliyeti").disabled).toBe(true);
    tutar(1, "");
    expect(screen.getByLabelText("Alış maliyeti").disabled).toBe(false);
    expect(toplam()).toBeNull();
    expect(screen.getByTestId("maliyet-kaynagi").textContent).toBe("Elle girildi");
    cleanup();
    render(<Katalog />);
    duzenle("Ayna dişlisi");
    for (const i of [1, 2, 3]) tutar(i, "");
    expect(screen.getByLabelText("Alış maliyeti").disabled).toBe(false);
    expect(toplam()).toBeNull();
    expect(screen.queryByTestId("maliyet-kaynagi")).toBeNull();
  });
  it("AC-19: ekleme penceresinde de toplam satırı doğar ve büyür", () => {
    render(<Katalog />);
    fireEvent.click(screen.getByRole("button", { name: /Parça\/Yedek Parça Ekle/ }));
    expect(toplam()).toBeNull();
    ekle(); tedSec(1, 31); tutar(1, "7000");
    expect(toplam().textContent).toBe(metin(1, "7.000,00 ₺"));
    ekle(); tedSec(2, 32); tutar(2, "9000");
    expect(toplam().textContent).toBe(metin(2, "16.000,00 ₺"));
    expect(screen.queryByTestId("maliyet-kirilimdan")).toBeNull();
  });
  it("AC-20: toplamın tutarı kaydedilen parçanın liste hücresiyle birebir aynı", () => {
    render(<Katalog />);
    duzenle("Kayış");
    ekle(); tedSec(1, 31); tutar(1, "8.000,55"); ekle(); tedSec(2, 32); tutar(2, "9.000,45");
    const tutarMetni = toplam().textContent.slice(metin(2, "").length);
    kaydet();
    expect(within(satir("Kayış")).getByTestId("parca-maliyet").textContent).toBe(`${tutarMetni}2 tedarikçiden`);
  });
  it("AC-21: yetkili kullanıcı kırılımlı parçayı dokunmadan kaydedince gövde birebir aynı", () => {
    const yazim = vi.fn();
    render(<Katalog yazim={yazim} />);
    duzenle("Ayna dişlisi");
    expect(document.querySelector(".modal-backdrop")).toBeTruthy();
    kaydet();
    // Triyaj (bulgu 1): kayıt sessizce engellenseydi gövde de aynı kalırdı; kaydın yapıldığı ayrıca ölçülür.
    expect(yazim).toHaveBeenCalled();
    expect(document.querySelector(".modal-backdrop")).toBeNull();
    expect(kayit(8)).toEqual(AYNA);
  });
  it("AC-22: liste hücresi ve ikinci satırı değişmez (pencere açıkken de)", () => {
    render(<Katalog />);
    expect(within(satir("Ayna dişlisi")).getByTestId("parca-maliyet").textContent).toBe("17.000,00 ₺3 tedarikçiden");
    duzenle("Ayna dişlisi");
    expect(within(satir("Ayna dişlisi")).getByTestId("parca-maliyet").textContent).toBe("17.000,00 ₺3 tedarikçiden");
  });
});

describe("Spec 0099: hatalı satır (R15, R16, R16/2–R16/4)", () => {
  it("AC-23: tedarikçisi seçilmemiş tutarlı satır toplama ve sayıya girmez; ibare tutarın altında", () => {
    render(<Katalog />);
    duzenle("Kayış");
    ekle(); tedSec(1, 31); tutar(1, "1000"); ekle(); tutar(2, "500");
    expect(toplam().textContent).toBe(`${metin(1, "1.000,00 ₺")}${HAMMADDE_TOPLAM_HATALI}`);
    expect(HAMMADDE_TOPLAM_HATALI).toBe("Hatalı satır var; toplam yalnız geçerli satırlardan.");
  });
  // Triyaj (bulgu 2): kit yarısı işaretli modeli ve kit adedi olan parçayla kurulur ve adet değiştirilir; aynı düzenleme geçerli
  // tutarla kaydedilince kit yazılır (kontrol), negatif tutarla yazılmaz. Böylece iddia engelleyici etkiyi ölçer.
  const KITLI = { ...AYNA, models: ["AK100"] };
  const MODELLER = [{ model: "AK100", defaultParcalar: [{ partId: "8", ad: "Ayna dişlisi", miktar: 2 }] }];
  const kitDuzenle = (tutarDegeri) => {
    const setStandardModels = vi.fn(); const yazim = vi.fn();
    render(<Katalog p0={[KITLI]} standardModels={MODELLER} setStandardModels={setStandardModels} yazim={yazim} />);
    duzenle("Ayna dişlisi");
    fireEvent.change(screen.getByLabelText("AK100 adedi"), { target: { value: "3" } });
    tutar(1, tutarDegeri);
    return { setStandardModels, yazim };
  };
  it("AC-24 (kontrol): aynı kit düzenlemesi geçerli tutarla kaydedilince kit yazılır", () => {
    const { setStandardModels, yazim } = kitDuzenle("7000");
    kaydet();
    expect(yazim).toHaveBeenCalled();
    expect(setStandardModels).toHaveBeenCalled();
  });
  it("AC-24: negatif tutar toplama girmez, ibare çıkar, kayıt engellenir (parça da kit de yazılmaz)", () => {
    const { setStandardModels, yazim } = kitDuzenle("-5");
    expect(toplam().textContent).toBe(`${metin(2, "10.000,00 ₺")}${HAMMADDE_TOPLAM_HATALI}`);
    kaydet();
    expect(yazim).not.toHaveBeenCalled();
    expect(kayit(8)).toEqual(KITLI);
    expect(setStandardModels).not.toHaveBeenCalled();
    expect(document.querySelector(".modal-backdrop")).toBeTruthy();
    expect(screen.getByText("Tutar negatif olamaz.")).toBeTruthy();
  });
  it("AC-25: aynı tedarikçi iki kez → sayılmaz; düzeltilince sayılır ve ibare kaybolur", () => {
    render(<Katalog />);
    duzenle("Çift kayıt");
    expect(toplam().textContent).toBe(`${metin(1, "100,00 ₺")}${HAMMADDE_TOPLAM_HATALI}`);
    tedSec(2, 32);
    expect(toplam().textContent).toBe(metin(2, "300,00 ₺"));
    expect(screen.queryByTestId("hammadde-toplam-hatali")).toBeNull();
  });
  it("R16/3 (plan P2): geçerli tutarlı satır yokken hatalı satır varsa kutu ve ibare yok, alan etkin", () => {
    render(<Katalog />);
    duzenle("Kayış");
    ekle(); tutar(1, "500");
    expect(toplam()).toBeNull();
    expect(screen.getByLabelText("Alış maliyeti").disabled).toBe(false);
  });
});

describe("Spec 0099: maliyet geçmişi bloğu (X7)", () => {
  it("AC-29: geçmiş bloğu alan ile hammadde bölümünün arasında; tutar değişince geçmiş eski, toplam yeni rakamı gösterir", () => {
    const gecmisli = { ...AYNA, maliyetGecmisi: [{ gecerli: "", kurus: 1500000 }, { gecerli: "2026-03-01", kurus: 1700000 }] };
    render(<Katalog p0={[gecmisli]} />);
    duzenle("Ayna dişlisi");
    const gecmis = screen.getByTestId("maliyet-gecmisi");
    expect(once(screen.getByLabelText("Alış maliyeti"), gecmis)).toBe(true);
    expect(once(gecmis, screen.getByTestId("hammadde-bolumu"))).toBe(true);
    tutar(1, "8000");
    expect(screen.getAllByTestId("maliyet-gecmisi-satiri")[0].textContent).toContain("17.000,00 ₺");
    expect(toplam().textContent).toBe(metin(3, "18.000,00 ₺"));
  });
});
