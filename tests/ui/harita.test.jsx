// @vitest-environment jsdom
// Harita sekmesi: gerçek harita verisiyle (src/lib/map) uçtan uca. Veri üretici script ile
// hazırlandığı ve elle düzenlenmediği için, buradaki testler asıl olarak "veri ile kod
// birbirini tutuyor mu" sorusunu koruyor: şehir dizini anahtarları, ülke adları, bölge
// sıraları. Bunlar ayrışırsa harita sessizce boş çıkar.
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";

afterEach(cleanup);
import { Harita, ilceEslesmeyenMetni } from "../../src/components/Harita";

const musteriler = [
  { name: "Alfa Ltd.", country: "Türkiye", city: "Konya" },
  { name: "Alfa Ltd.", country: "Türkiye", city: "Konya" },
  { name: "Beta A.Ş.", country: "Türkiye", city: "İstanbul" },
  { name: "Gama GmbH", country: "Almanya", city: "Köln" },
  { name: "Delta BV", country: "Hollanda", city: "Rotterdam" },
];
const factory = { name: "Altuntaş Makina", country: "Türkiye", city: "İstanbul" };
const bayiler = [
  { name: "Konya Bayi", country: "Türkiye", city: "Konya" },
  { name: "Ege Bayi", country: "Türkiye", city: "İzmir" },
  { name: "Rheinland", country: "Almanya", city: "Köln" },
];

const dunyaBekle = () => waitFor(() => expect(document.querySelector('[data-ad="Türkiye"]')).toBeTruthy(), { timeout: 10000 });

describe("Harita", () => {
  it("dünya haritasını çizer ve satış olan ülkeyi boyar", async () => {
    render(<Harita customers={musteriler} dealers={[]} factory={null} />);
    await dunyaBekle();
    const tr = document.querySelector('[data-ad="Türkiye"]');
    expect(tr.getAttribute("data-adet")).toBe("3");
    // Faaliyet haritası: satış olan yer yoğunluğa göre değil, tek logo rengiyle (--hSatis) boyanır
    expect(tr.getAttribute("fill")).toContain("hSatis");
    // Satışı olmayan ülke boyanmaz ve tıklanmaz
    const fr = document.querySelector('[data-ad="Fransa"]');
    expect(fr.getAttribute("data-adet")).toBe("0");
    expect(fr.getAttribute("fill")).toBe("var(--hBos)");
    expect(fr.hasAttribute("data-sec")).toBe(false);
  });

  it("üst satırda dünya toplamlarını gösterir", async () => {
    render(<Harita customers={musteriler} dealers={[]} factory={null} />);
    await dunyaBekle();
    expect(screen.getByText("Satış Yapılan Ülke")).toBeTruthy();
    expect(screen.getByText("Toplam Makina")).toBeTruthy();
    // 3 ülke, 5 makina, 4 firma
    const kartlar = [...document.querySelectorAll(".stat-card")].map((k) => k.textContent);
    expect(kartlar[0]).toMatch(/3/);
    expect(kartlar[2]).toMatch(/5/);
  });

  it("ülkeye tıklayınca o ülkenin bölge haritası açılır ve şehir bölgesine oturur", async () => {
    render(<Harita customers={musteriler} dealers={[]} factory={null} />);
    await dunyaBekle();
    fireEvent.click(screen.getByRole("button", { name: /Almanya/ }));
    // Almanya'nın bölge dosyası gecikmeli yüklenir
    await waitFor(() => expect(document.querySelector('[data-ad="Kuzey Ren-Vestfalya"]')).toBeTruthy(), { timeout: 10000 });
    // "Köln" kaydı Kuzey Ren-Vestfalya'yı boyamalı — dizin ile kodun anlaştığının kanıtı
    expect(document.querySelector('[data-ad="Kuzey Ren-Vestfalya"]').getAttribute("data-adet")).toBe("1");
    expect(document.querySelector('[data-ad="Bavyera"]').getAttribute("data-adet")).toBe("0");
  });

  it("Türkiye'de il adı doğrudan bölgeye oturur (şehir = il)", async () => {
    render(<Harita customers={musteriler} dealers={[]} factory={null} />);
    await dunyaBekle();
    fireEvent.click(screen.getByRole("button", { name: /Türkiye/ }));
    await waitFor(() => expect(document.querySelector('[data-ad="Konya"]')).toBeTruthy(), { timeout: 10000 });
    expect(document.querySelector('[data-ad="Konya"]').getAttribute("data-adet")).toBe("2");
    expect(document.querySelector('[data-ad="İstanbul"]').getAttribute("data-adet")).toBe("1");
    expect(document.querySelector('[data-ad="Ankara"]').getAttribute("data-adet")).toBe("0");
  });

  it("geri düğmesi yan panelde durur ve dünyaya döner", async () => {
    render(<Harita customers={musteriler} dealers={[]} factory={null} />);
    await dunyaBekle();
    fireEvent.click(screen.getByRole("button", { name: /Almanya/ }));
    await waitFor(() => expect(screen.getByRole("button", { name: /Tüm Dünya/ })).toBeTruthy(), { timeout: 10000 });
    // Geri düğmesi harita kartının içindeki yan panelde (üst başlık çubuğunda değil)
    expect(screen.getByRole("button", { name: /Tüm Dünya/ }).closest(".harita-yan")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Tüm Dünya/ }));
    await waitFor(() => expect(document.querySelector('[data-ad="Fransa"]')).toBeTruthy());
  });

  it("fabrika ve bayi pinlerini çizer; bayi pini fabrikadan küçük", async () => {
    render(<Harita customers={musteriler} dealers={bayiler} factory={factory} />);
    await dunyaBekle();
    await waitFor(() => expect(document.querySelector('[data-pin="fabrika"]')).toBeTruthy(), { timeout: 10000 });
    const f = document.querySelector('[data-pin="fabrika"]');
    const bayiPinleri = document.querySelectorAll('[data-pin="bayi"]');
    // Dünyada bayiler ülke başına toplanır: 3 bayi -> 2 pin (Türkiye + Almanya)
    expect(bayiPinleri.length).toBe(2);
    for (const b of bayiPinleri) expect(+b.dataset.o).toBeLessThan(+f.dataset.o);
  });

  it("pinler konumlarına yerleşir (hepsi sol üst köşede yığılmaz)", async () => {
    // Pinler harita çizildikten SONRA gelir (fabrika/bayi ülkelerinin dosyaları gecikmeli
    // yüklenir). Konum transform ile veriliyor; geç gelen pinlere transform uygulanmazsa
    // hepsi 0,0'a yığılıyordu ve bu ekranda kolayca gözden kaçıyor.
    render(<Harita customers={musteriler} dealers={bayiler} factory={factory} />);
    await dunyaBekle();
    await waitFor(() => expect(document.querySelector('[data-pin="fabrika"]')).toBeTruthy(), { timeout: 10000 });
    await waitFor(() => {
      for (const g of document.querySelectorAll("[data-pin]")) {
        const t = g.getAttribute("transform");
        expect(t).toBeTruthy();
        expect(t).toMatch(/translate\([^0]/);   // 0,0 değil, gerçek bir konum
        expect(t).toContain("scale(");
      }
    }, { timeout: 10000 });
  });

  it("'başa dön' düğmesi ülke görünümünden dünyaya döner", async () => {
    // Yalnız yakınlaştırmayı sıfırlasaydı, ülke görünümünde (zaten 1 kat) hiçbir şey
    // yapmaz ve düğme bozuk görünürdü.
    render(<Harita customers={musteriler} dealers={[]} factory={null} />);
    await dunyaBekle();
    fireEvent.click(screen.getByRole("button", { name: /Almanya/ }));
    await waitFor(() => expect(document.querySelector('[data-ad="Kuzey Ren-Vestfalya"]')).toBeTruthy(), { timeout: 10000 });
    fireEvent.click(screen.getByTitle("Başa dön"));
    await waitFor(() => expect(document.querySelector('[data-ad="Fransa"]')).toBeTruthy());
  });

  it("haritada yerine oturmayan şehri sessizce yutmaz, listede gösterir", async () => {
    render(<Harita customers={[{ name: "X", country: "Türkiye", city: "Olmayan Köy" }]} dealers={[]} factory={null} />);
    await dunyaBekle();
    fireEvent.click(screen.getByRole("button", { name: /Türkiye/ }));
    await waitFor(() => expect(document.querySelector('[data-ad="Konya"]')).toBeTruthy(), { timeout: 10000 });
    // Hem şehir listesinde hem de "oturmadı" uyarısında geçer: kayıt kaybolmuyor
    expect(screen.getByText(/haritada yerine oturmadı/)).toBeTruthy();
    expect(screen.getAllByText(/Olmayan Köy/).length).toBeGreaterThan(0);
  });

  it("ilçesi olan ile tıklayınca ilçe haritası açılır ve ilçe boyanır", async () => {
    render(<Harita customers={[
      { name: "A", country: "Türkiye", city: "İstanbul", ilce: "Kadıköy" },
      { name: "B", country: "Türkiye", city: "İstanbul", ilce: "Kadıköy" },
      { name: "C", country: "Türkiye", city: "İstanbul" },   // ilçesiz eski kayıt
    ]} dealers={[]} factory={null} />);
    await dunyaBekle();
    fireEvent.click(screen.getByRole("button", { name: /Türkiye/ }));
    await waitFor(() => expect(document.querySelector('[data-ad="İstanbul"]')).toBeTruthy(), { timeout: 10000 });
    fireEvent.pointerDown(document.querySelector('[data-ad="İstanbul"]'));
    fireEvent.pointerUp(document.querySelector('[data-ad="İstanbul"]'));
    await waitFor(() => expect(document.querySelector('[data-ad="Kadıköy"]')).toBeTruthy(), { timeout: 10000 });
    expect(document.querySelector('[data-ad="Kadıköy"]').getAttribute("data-adet")).toBe("2");
    expect(document.querySelector('[data-ad="Şişli"]').getAttribute("data-adet")).toBe("0");
    // İlçesiz kayıt haritada boyanamaz ama sayısı kaybolmamalı
    expect(screen.getByText(/1 makinanın ilçesi girilmemiş/)).toBeTruthy();
  });

  it("sağdaki listeden de ilçesi olan il açılır (haritadan tıklamakla aynı)", async () => {
    render(<Harita customers={[{ name: "A", country: "Türkiye", city: "İstanbul", ilce: "Kadıköy" }]} dealers={[]} factory={null} />);
    await dunyaBekle();
    fireEvent.click(screen.getByRole("button", { name: /Türkiye/ }));
    await waitFor(() => expect(document.querySelector('[data-ad="İstanbul"]')).toBeTruthy(), { timeout: 10000 });
    // Panelde İstanbul satırı düğme olmalı, düz metin değil
    fireEvent.click(screen.getByRole("button", { name: /İstanbul/ }));
    await waitFor(() => expect(document.querySelector('[data-ad="Kadıköy"]')).toBeTruthy(), { timeout: 10000 });
  });

  it("ilçe haritasından geri Türkiye'ye döner", async () => {
    render(<Harita customers={[{ name: "A", country: "Türkiye", city: "İstanbul", ilce: "Kadıköy" }]} dealers={[]} factory={null} />);
    await dunyaBekle();
    fireEvent.click(screen.getByRole("button", { name: /Türkiye/ }));
    await waitFor(() => expect(document.querySelector('[data-ad="İstanbul"]')).toBeTruthy(), { timeout: 10000 });
    fireEvent.pointerDown(document.querySelector('[data-ad="İstanbul"]'));
    fireEvent.pointerUp(document.querySelector('[data-ad="İstanbul"]'));
    await waitFor(() => expect(screen.getByRole("button", { name: /← Türkiye/ })).toBeTruthy(), { timeout: 10000 });
    fireEvent.click(screen.getByRole("button", { name: /← Türkiye/ }));
    await waitFor(() => expect(document.querySelector('[data-ad="Konya"]')).toBeTruthy());
  });

  it("ilçesi olmayan ile tıklayınca hiçbir şey olmaz (yalnız 11 il bölünür)", async () => {
    render(<Harita customers={[{ name: "A", country: "Türkiye", city: "Kayseri" }]} dealers={[]} factory={null} />);
    await dunyaBekle();
    fireEvent.click(screen.getByRole("button", { name: /Türkiye/ }));
    await waitFor(() => expect(document.querySelector('[data-ad="Kayseri"]')).toBeTruthy(), { timeout: 10000 });
    fireEvent.pointerDown(document.querySelector('[data-ad="Kayseri"]'));
    fireEvent.pointerUp(document.querySelector('[data-ad="Kayseri"]'));
    await new Promise((r) => setTimeout(r, 200));
    expect(document.querySelector('[data-ad="Kayseri"]')).toBeTruthy();   // hâlâ Türkiye görünümünde
  });

  it("müşteri yokken çökmez", async () => {
    render(<Harita customers={[]} dealers={[]} factory={null} />);
    await dunyaBekle();
    expect(screen.getByText(/Henüz ülke bilgisi olan bir müşteri kaydı yok/)).toBeTruthy();
  });
});

// Spec 0094: beş yeni ilin ilçe kırılımı ve eşleşmeyen ilçe değeri (İstanbul/Kadıköy deseni).
describe("Spec 0094: beş ilin ilçe görünümü (R5, R5/2–R5/5)", () => {
  const tikla = (ad) => { const e = document.querySelector(`[data-ad="${ad}"]`); fireEvent.pointerDown(e); fireEvent.pointerUp(e); };
  const turkiyeyeIn = async () => {
    await dunyaBekle();
    fireEvent.click(screen.getByRole("button", { name: /Türkiye/ }));
    await waitFor(() => expect(document.querySelector('[data-ad="Aydın"]')).toBeTruthy(), { timeout: 10000 });
  };
  const satisPinleri = () => [...document.querySelectorAll('[data-pin="satis"]')].map(e => e.getAttribute("data-ad"));

  it("AC-13 / AC-21: Aydın'a tıklanınca ilçe görünümü açılır; ilçesi girilmiş kayıt o ilçeyi boyar ve panelde firma adıyla görünür", async () => {
    render(<Harita customers={[{ id: 1, name: "Kuşadası Fırın", country: "Türkiye", city: "Aydın", ilce: "Kuşadası" }]} dealers={[]} factory={null} />);
    await turkiyeyeIn();
    tikla("Aydın");
    await waitFor(() => expect(document.querySelector('[data-ad="Kuşadası"]')).toBeTruthy(), { timeout: 10000 });
    expect(document.querySelector('[data-ad="Kuşadası"]').getAttribute("data-adet")).toBe("1");
    expect(document.querySelector('[data-ad="Didim"]').getAttribute("data-adet")).toBe("0");
    expect(screen.getByText(/Aydın — ilçeler \(1\)/)).toBeTruthy();
    expect(screen.getAllByText("Kuşadası Fırın").length).toBeGreaterThan(0);
    expect(satisPinleri()).toEqual(["Kuşadası Fırın"]);
  });

  it("AC-14: listede olmayan il (Kayseri) tıklanınca ilçe görünümü açılmaz", async () => {
    render(<Harita customers={[{ id: 1, name: "K", country: "Türkiye", city: "Kayseri" }]} dealers={[]} factory={null} />);
    await turkiyeyeIn();
    tikla("Kayseri");
    await new Promise(r => setTimeout(r, 300));
    expect(screen.queryByText(/Kayseri — ilçeler/)).toBeNull();
    expect(document.querySelector('[data-ad="Talas"]')).toBeNull();
    expect(document.querySelector('[data-ad="Aydın"]')).toBeTruthy(); // hâlâ ülke görünümü
  });

  it("AC-13: beş ilin hepsinde ilçe görünümü açılır (bilinen bir ilçe çizilir)", async () => {
    for (const [il, ilce] of [["Sakarya", "Sapanca"], ["Eskişehir", "Tepebaşı"], ["Gaziantep", "Şahinbey"], ["Yalova", "Çınarcık"]]) {
      render(<Harita customers={[]} dealers={[]} factory={null} baslangicUlke="Türkiye" baslangicIl={il} />);
      await waitFor(() => expect(document.querySelector(`[data-ad="${ilce}"]`), il).toBeTruthy(), { timeout: 10000 });
      if (il === "Yalova") expect(document.querySelector('[data-ad="Yalova"]')).toBeTruthy(); // AC-6/7: merkez ilçe "Yalova"
      cleanup();
    }
  });

  it("AC-20: ilçesi boş kayıt il kartında ilçesiz sayılır, hiçbir ilçeye yazılmaz", async () => {
    render(<Harita customers={[{ id: 1, name: "Eski", country: "Türkiye", city: "Sakarya" }]} dealers={[]} factory={null} baslangicUlke="Türkiye" baslangicIl="Sakarya" />);
    await waitFor(() => expect(document.querySelector('[data-ad="Adapazarı"]')).toBeTruthy(), { timeout: 10000 });
    expect([...document.querySelectorAll("[data-adet]")].every(e => e.getAttribute("data-adet") === "0")).toBe(true);
    expect(screen.getByText(/1 makinanın ilçesi girilmemiş/)).toBeTruthy();
    expect(screen.queryByTestId("ilce-eslesmeyen")).toBeNull();
  });

  it("AC-20/2 / AC-20/3 / AC-20/4: eşleşmeyen ilçe değeri boyanmaz, pin almaz, panelde sayılır; toplam makina üç kümeyi içerir", async () => {
    render(<Harita customers={[
      { id: 1, name: "Doğru", country: "Türkiye", city: "Aydın", ilce: "Kuşadası" },
      { id: 2, name: "Ascii", country: "Türkiye", city: "Aydın", ilce: "Kusadasi" },
      { id: 3, name: "Eski", country: "Türkiye", city: "Aydın" },
    ]} dealers={[]} factory={null} baslangicUlke="Türkiye" baslangicIl="Aydın" />);
    await waitFor(() => expect(document.querySelector('[data-ad="Kuşadası"]')).toBeTruthy(), { timeout: 10000 });
    expect(document.querySelector('[data-ad="Kuşadası"]').getAttribute("data-adet")).toBe("1");
    expect(screen.getByTestId("ilce-eslesmeyen").textContent).toBe(ilceEslesmeyenMetni(1));
    expect(screen.getByText(/1 makinanın ilçesi girilmemiş/)).toBeTruthy();
    await waitFor(() => expect(satisPinleri()).toEqual(["Doğru"]));
    expect(screen.getByText("Makina").parentElement.textContent).toContain("3");
  });

  it("AC-20/4: yalnız eşleşmeyen kaydı olan ilde 'makina kaydı yok' yazılmaz", async () => {
    render(<Harita customers={[{ id: 2, name: "Ascii", country: "Türkiye", city: "Yalova", ilce: "Yalova merkez" }]} dealers={[]} factory={null} baslangicUlke="Türkiye" baslangicIl="Yalova" />);
    await waitFor(() => expect(document.querySelector('[data-ad="Çınarcık"]')).toBeTruthy(), { timeout: 10000 });
    expect(screen.getByTestId("ilce-eslesmeyen").textContent).toBe(ilceEslesmeyenMetni(1));
    expect(screen.queryByText("Bu ilde makina kaydı yok.")).toBeNull();
  });
});

