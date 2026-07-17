// Harita sekmesinin saf hesap katmanı: ülke özeti, bölge toplamı, renk kovaları, pinler.
import { describe, it, expect } from "vitest";
import { sadeAd, haritaOzeti, dunyaToplami, bolgeToplami, ilOzeti, kovala, pinleriTopla, bayiTuru, pinleriAyir } from "../src/lib/mapStats";

describe("sadeAd", () => {
  // Bu normalize, scripts/gen-map-paths.cjs içindeki `sad` ile BİREBİR aynı olmak zorunda:
  // şehir dizini orada bu anahtarla üretiliyor, burada bu anahtarla aranıyor. Ayrışırsa
  // hiçbir şehir haritada yerini bulamaz ve bu sessizce olur. Bu test o sözleşmeyi kilitler.
  it("aksan ve büyük/küçük harf farkını yok sayar", () => {
    expect(sadeAd("Köln")).toBe("koln");
    expect(sadeAd("İstanbul")).toBe("istanbul");
    expect(sadeAd("Şırnak")).toBe("sirnak");
    expect(sadeAd("Afyonkarahisar")).toBe("afyonkarahisar");
    expect(sadeAd("Ağrı")).toBe("agri");
    expect(sadeAd("Çorum")).toBe("corum");
    expect(sadeAd("Kahramanmaraş")).toBe("kahramanmaras");
  });
  it("noktalama ve boşlukları atar", () => {
    expect(sadeAd("San José")).toBe("sanjose");
    expect(sadeAd("  Rotterdam ")).toBe("rotterdam");
    expect(sadeAd("Nizhny-Novgorod")).toBe("nizhnynovgorod");
  });
  it("boş/eksik değerde patlamaz", () => {
    expect(sadeAd(null)).toBe("");
    expect(sadeAd(undefined)).toBe("");
    expect(sadeAd("")).toBe("");
  });
});

describe("haritaOzeti", () => {
  const musteriler = [
    { name: "Alfa Ltd.", country: "Türkiye", city: "Konya" },
    { name: "Alfa Ltd.", country: "Türkiye", city: "Konya" },   // aynı firma, 2. makina
    { name: "Beta A.Ş.", country: "Türkiye", city: "İzmir" },
    { name: "Gama GmbH", country: "Almanya", city: "Köln" },
  ];
  it("bir müşteri kaydını bir makina sayar", () => {
    const o = haritaOzeti(musteriler);
    expect(o["Türkiye"].makina).toBe(3);
    expect(o["Almanya"].makina).toBe(1);
  });
  it("firmayı ada göre tekilleştirir (aynı firmanın 2 makinası 1 firma)", () => {
    expect(haritaOzeti(musteriler)["Türkiye"].firma).toBe(2);
  });
  it("firma tekilleştirmesi Türkçe büyük/küçük harfe takılmaz", () => {
    const o = haritaOzeti([
      { name: "İŞ MAKİNA", country: "Türkiye", city: "Konya" },
      { name: "iş makina", country: "Türkiye", city: "Konya" },
    ]);
    expect(o["Türkiye"].firma).toBe(1);
  });
  it("şehir başına makina sayar", () => {
    expect(haritaOzeti(musteriler)["Türkiye"].sehirler).toEqual({ Konya: 2, "İzmir": 1 });
  });
  it("ülkesi boş kayıtları atlar, şehri boş kaydı ülkeye yine sayar", () => {
    const o = haritaOzeti([
      { name: "X", country: "", city: "Konya" },
      { name: "Y", country: "Türkiye", city: "" },
    ]);
    expect(o["Türkiye"].makina).toBe(1);
    expect(o["Türkiye"].sehirler).toEqual({});
    expect(Object.keys(o)).toEqual(["Türkiye"]);
  });
  it("boş/bozuk girdide patlamaz", () => {
    expect(haritaOzeti([])).toEqual({});
    expect(haritaOzeti(undefined)).toEqual({});
    expect(haritaOzeti([null, {}])).toEqual({});
  });
});

describe("dunyaToplami", () => {
  it("ülke/şehir/makina/firma toplar ve en çok satan ülkeyi bulur", () => {
    const o = haritaOzeti([
      { name: "A", country: "Türkiye", city: "Konya" },
      { name: "B", country: "Türkiye", city: "İzmir" },
      { name: "C", country: "Almanya", city: "Köln" },
    ]);
    expect(dunyaToplami(o)).toEqual({ ulke: 2, sehir: 3, makina: 3, firma: 3, enCok: "Türkiye" });
  });
  it("boş özette enCok null", () => {
    expect(dunyaToplami({}).enCok).toBe(null);
  });
});

describe("bolgeToplami", () => {
  // dizin: sadeAd -> bölge sırası
  const dizin = { koln: 7, dusseldorf: 7, munchen: 2 };
  it("aynı bölgedeki şehirleri toplar", () => {
    const { bolgeler } = bolgeToplami({ "Köln": 4, "Düsseldorf": 1, "München": 2 }, dizin);
    expect(bolgeler).toEqual({ 7: 5, 2: 2 });
  });
  it("dizinde olmayan şehri eslesmeyen'e koyar, sessizce yutmaz", () => {
    const { bolgeler, eslesmeyen } = bolgeToplami({ "Köln": 4, "Bilinmeyen Köy": 3 }, dizin);
    expect(bolgeler).toEqual({ 7: 4 });
    expect(eslesmeyen).toEqual(["Bilinmeyen Köy"]);
  });
  it("boş dizinde her şehir eslesmeyen olur", () => {
    expect(bolgeToplami({ "Köln": 1 }, {}).eslesmeyen).toEqual(["Köln"]);
  });
});

describe("ilOzeti", () => {
  const musteriler = [
    { name: "A", country: "Türkiye", city: "İstanbul", ilce: "Kadıköy" },
    { name: "B", country: "Türkiye", city: "İstanbul", ilce: "Kadıköy" },
    { name: "C", country: "Türkiye", city: "İstanbul", ilce: "Şişli" },
    { name: "D", country: "Türkiye", city: "İstanbul" },              // eski kayıt: ilçesi yok
    { name: "E", country: "Türkiye", city: "İstanbul", ilce: "  " },  // boşluk = yok
    { name: "F", country: "Türkiye", city: "Ankara", ilce: "Çankaya" },
    { name: "G", country: "Almanya", city: "İstanbul", ilce: "Kadıköy" }, // başka ülke, sayılmaz
  ];
  it("ilçe başına makina sayar", () => {
    expect(ilOzeti(musteriler, "İstanbul").ilceler).toEqual({ "Kadıköy": 2, "Şişli": 1 });
  });
  it("ilçesi girilmemiş eski kayıtları ayrı sayar, yutmaz", () => {
    // Bu kayıtlar haritada hiçbir ilçeyi boyayamaz ama sayıları kaybolmamalı.
    expect(ilOzeti(musteriler, "İstanbul").ilcesiz).toBe(2);
  });
  it("yalnız istenen ilin ve yalnız Türkiye'nin kayıtlarını sayar", () => {
    expect(ilOzeti(musteriler, "Ankara")).toEqual({ ilceler: { "Çankaya": 1 }, ilcesiz: 0 });
  });
  it("boş/bozuk girdide patlamaz", () => {
    expect(ilOzeti([], "İstanbul")).toEqual({ ilceler: {}, ilcesiz: 0 });
    expect(ilOzeti(undefined, "İstanbul")).toEqual({ ilceler: {}, ilcesiz: 0 });
    expect(ilOzeti([null, {}], "İstanbul")).toEqual({ ilceler: {}, ilcesiz: 0 });
  });
});

describe("kovala", () => {
  it("satış yoksa -1 döner", () => {
    expect(kovala([1, 2, 3])(0)).toBe(-1);
  });
  it("tek başına baskın bir değer diğerlerini aynı tona ezmez (sıralama temelli)", () => {
    // Türkiye 129, gerisi 1-11: düz ölçekte hepsi en açık tona düşerdi.
    const degerler = [129, 11, 9, 5, 4, 3, 2, 1];
    const k = kovala(degerler, 5);
    expect(k(129)).toBe(4);          // en koyu
    expect(k(1)).toBe(0);            // en açık
    // 5 tonun en az 4'ü gerçekten kullanılmalı, yoksa harita okunmuyor
    expect(new Set(degerler.map(k)).size).toBeGreaterThanOrEqual(4);
  });
  it("küçükten büyüğe tek yönlü artar", () => {
    const k = kovala([1, 5, 20, 50, 100]);
    const kovalar = [1, 5, 20, 50, 100].map(k);
    for (let i = 1; i < kovalar.length; i++) expect(kovalar[i]).toBeGreaterThanOrEqual(kovalar[i - 1]);
  });
});

describe("bayiTuru", () => {
  it("yalnız bayi -> bayi, yalnız anlaşmalı servis -> servis, ikisi -> ikisi", () => {
    expect(bayiTuru({ bayiMi: true, anlasmaliServisMi: false })).toBe("bayi");
    expect(bayiTuru({ bayiMi: false, anlasmaliServisMi: true })).toBe("servis");
    expect(bayiTuru({ bayiMi: true, anlasmaliServisMi: true })).toBe("ikisi");
  });
  it("bayiMi tanımsızsa bayi sayılır (SimpleDealers'taki `bayiMi !== false` kuralıyla aynı)", () => {
    expect(bayiTuru({})).toBe("bayi");
    expect(bayiTuru({ anlasmaliServisMi: true })).toBe("ikisi");
    expect(bayiTuru(null)).toBe("bayi");
  });
});

describe("pinleriAyir", () => {
  it("fabrika HER ZAMAN en sonda, yani en üstte çizilir", () => {
    const l = [
      { x: 1, y: 1, tur: "bayi", ad: "B1" },
      { x: 50, y: 50, tur: "fabrika", ad: "F", olcek: 1 },
      { x: 9, y: 9, tur: "bayi", ad: "B2" },
    ];
    expect(pinleriAyir(l).at(-1).tur).toBe("fabrika");
  });
  it("aynı noktaya düşen pinleri ayırır; fabrika yerinde kalır, diğeri kayar", () => {
    // Fabrika ve bayi aynı ilçedeyse ikisi de ilçe merkezine konuyordu ve alttaki kayboluyordu.
    const l = [
      { x: 100, y: 200, tur: "fabrika", ad: "F", olcek: 1 },
      { x: 100, y: 200, tur: "bayi", ad: "B", olcek: 1 },
    ];
    const c = pinleriAyir(l);
    const f = c.find((p) => p.tur === "fabrika");
    const b = c.find((p) => p.tur === "bayi");
    expect(f).toMatchObject({ x: 100, y: 200 });                 // fabrika kıpırdamaz
    expect(b.x !== 100 || b.y !== 200).toBe(true);               // bayi kaydı
    expect(Math.hypot(b.x - 100, b.y - 200)).toBeGreaterThan(5); // gözle ayırt edilecek kadar
  });
  it("çakışmayan pinlere dokunmaz", () => {
    const l = [{ x: 10, y: 10, tur: "bayi", ad: "A" }, { x: 300, y: 400, tur: "bayi", ad: "B" }];
    expect(pinleriAyir(l)).toEqual(l);
  });
  it("aynı noktada üç pin varsa üçü de ayrı yerde", () => {
    const l = [
      { x: 5, y: 5, tur: "fabrika", ad: "F", olcek: 1 },
      { x: 5, y: 5, tur: "bayi", ad: "B1", olcek: 1 },
      { x: 5, y: 5, tur: "bayi", ad: "B2", olcek: 1 },
    ];
    const noktalar = new Set(pinleriAyir(l).map((p) => p.x + ":" + p.y));
    expect(noktalar.size).toBe(3);
  });
});

describe("pinleriTopla", () => {
  // konum: sadeAd -> [dünyaX, dünyaY, ülkeX, ülkeY]
  const konumlar = {
    "Türkiye": { istanbul: [610, 130, 800, 60], konya: [615, 140, 500, 250], izmir: [600, 138, 200, 240] },
    "Almanya": { koln: [540, 100, 300, 400] },
  };
  const factory = { name: "Altuntaş Makina", country: "Türkiye", city: "İstanbul" };
  const dealers = [
    { name: "Konya Bayi", country: "Türkiye", city: "Konya" },
    { name: "Ege Bayi", country: "Türkiye", city: "İzmir" },
    { name: "Köln Bayi", country: "Almanya", city: "Köln" },
  ];

  it("dünyada bayiler ülke başına tek pinde toplanır (yoksa ülkeyi kapatıyorlar)", () => {
    const p = pinleriTopla({ factory, dealers, seciliUlke: null, konumlar });
    const bayiPinleri = p.filter((x) => x.tur === "bayi");
    expect(bayiPinleri.length).toBe(2);                       // Türkiye + Almanya, 3 bayi değil
    const tr = bayiPinleri.find((x) => x.ad.startsWith("Türkiye"));
    expect(tr.sayi).toBe(2);                                  // rozette 2 yazacak
    expect(tr.x).toBeCloseTo((615 + 600) / 2, 1);             // iki bayinin ortası
  });
  it("ülke görünümünde bayiler tek tek çıkar", () => {
    const p = pinleriTopla({ factory, dealers, seciliUlke: "Türkiye", konumlar });
    expect(p.filter((x) => x.tur === "bayi").length).toBe(2);
    expect(p.filter((x) => x.tur === "bayi").every((x) => x.sayi === 1)).toBe(true);
  });
  it("bayi pini fabrika pininden HER ZAMAN küçük (üç görünümde de)", () => {
    for (const secili of [null, "Türkiye"]) {
      const p = pinleriTopla({ factory, dealers, seciliUlke: secili, konumlar });
      const f = p.find((x) => x.tur === "fabrika");
      for (const b of p.filter((x) => x.tur === "bayi")) expect(b.olcek).toBeLessThan(f.olcek);
    }
    // İlçe görünümü: pinler büyütüldü ama sıralama korunmalı
    const ilce = pinleriTopla({
      factory: { name: "F", country: "Türkiye", city: "İstanbul", ilce: "Kadıköy" },
      dealers: [{ name: "B", country: "Türkiye", city: "İstanbul", ilce: "Kadıköy" }],
      seciliUlke: "Türkiye", seciliIl: "İstanbul", konumlar, ilceMerkezleri: { kadikoy: [10, 20] },
    });
    const f = ilce.find((x) => x.tur === "fabrika");
    const b = ilce.find((x) => x.tur === "bayi");
    expect(b.olcek).toBeLessThan(f.olcek);
    // Yakınlaştıkça büyümeli: ilçe > ülke > dünya, yoksa haritada kayboluyorlar
    const ulkeBayi = pinleriTopla({ factory, dealers, seciliUlke: "Türkiye", konumlar }).find((x) => x.tur === "bayi");
    const dunyaBayi = pinleriTopla({ factory, dealers, seciliUlke: null, konumlar }).find((x) => x.tur === "bayi");
    expect(b.olcek).toBeGreaterThan(ulkeBayi.olcek);
    expect(ulkeBayi.olcek).toBeGreaterThan(dunyaBayi.olcek);
    // Ülke görünümünde de gözle görülür olmalı (0.62 iken çok ufak kalıyordu)
    expect(ulkeBayi.olcek).toBeGreaterThanOrEqual(1);
  });
  it("dünyada dünya konumu, ülke görünümünde ülke konumu kullanılır", () => {
    const d = pinleriTopla({ factory, dealers: [], seciliUlke: null, konumlar });
    expect(d[0]).toMatchObject({ x: 610, y: 130 });
    const u = pinleriTopla({ factory, dealers: [], seciliUlke: "Türkiye", konumlar });
    expect(u[0]).toMatchObject({ x: 800, y: 60 });
  });
  it("fabrika yalnız kendi ülkesinin görünümünde çıkar", () => {
    const p = pinleriTopla({ factory, dealers, seciliUlke: "Almanya", konumlar });
    expect(p.some((x) => x.tur === "fabrika")).toBe(false);
    expect(p.filter((x) => x.tur === "bayi").length).toBe(1);
  });
  it("şehri dizinde bulunmayan bayi pin üretmez, patlamaz", () => {
    const p = pinleriTopla({ factory, dealers: [{ name: "Yok", country: "Türkiye", city: "Bilinmeyen" }], seciliUlke: null, konumlar });
    expect(p.filter((x) => x.tur === "bayi").length).toBe(0);
  });
  it("ilçe görünümünde pinler İLÇE merkezinden konumlanır (ülke koordinatı geçersiz)", () => {
    // İlçe haritası ilin kendi projeksiyonunda çizilir. Ülke koordinatları kullanılınca
    // bayiler haritada rastgele yerlerde çıkıyordu.
    const ilceMerkezleri = { kadikoy: [400, 300], gebze: [900, 250] };
    const f = { name: "Altuntaş Makina", country: "Türkiye", city: "İstanbul", ilce: "Kadıköy" };
    const d = [{ name: "Kadıköy Bayi", country: "Türkiye", city: "İstanbul", ilce: "Kadıköy" }];
    const p = pinleriTopla({ factory: f, dealers: d, seciliUlke: "Türkiye", seciliIl: "İstanbul", konumlar, ilceMerkezleri });
    expect(p).toHaveLength(2);
    const fab = p.find((x) => x.tur === "fabrika");
    const bay = p.find((x) => x.tur === "bayi");
    expect(fab).toMatchObject({ x: 400, y: 300 });     // fabrika ilçe merkezinde
    expect(bay.olcek).toBeLessThan(fab.olcek);
    // Aynı ilçedeler: bayi kaydırılmış olmalı, yoksa fabrikanın altında kaybolur
    expect(bay.x !== 400 || bay.y !== 300).toBe(true);
  });
  it("ilçe görünümünde: ilçesi girilmemiş ya da başka ildeki kayıt pin almaz", () => {
    const ilceMerkezleri = { kadikoy: [400, 300] };
    const p = pinleriTopla({
      factory: { name: "F", country: "Türkiye", city: "İstanbul" },              // ilçesi yok
      dealers: [
        { name: "Başka il", country: "Türkiye", city: "Kocaeli", ilce: "Gebze" }, // başka il
        { name: "Bilinmeyen ilçe", country: "Türkiye", city: "İstanbul", ilce: "Yok Böyle" },
      ],
      seciliUlke: "Türkiye", seciliIl: "İstanbul", konumlar, ilceMerkezleri,
    });
    expect(p).toEqual([]);
  });
  it("pin çeşidi bayi türünü taşır (renk buradan geliyor)", () => {
    const d = [
      { name: "Sadece bayi", country: "Türkiye", city: "Konya", bayiMi: true, anlasmaliServisMi: false },
      { name: "Sadece servis", country: "Türkiye", city: "İzmir", bayiMi: false, anlasmaliServisMi: true },
    ];
    const p = pinleriTopla({ factory: null, dealers: d, seciliUlke: "Türkiye", konumlar });
    expect(p.map((x) => x.cesit).sort()).toEqual(["bayi", "servis"]);
  });
  it("dünyada toplu pinde türler karışıksa 'ikisi' olur", () => {
    const d = [
      { name: "A", country: "Türkiye", city: "Konya", bayiMi: true, anlasmaliServisMi: false },
      { name: "B", country: "Türkiye", city: "İzmir", bayiMi: false, anlasmaliServisMi: true },
    ];
    expect(pinleriTopla({ factory: null, dealers: d, seciliUlke: null, konumlar })[0].cesit).toBe("ikisi");
  });
  it("dünyada toplu pinde türler aynıysa o tür korunur", () => {
    const d = [
      { name: "A", country: "Türkiye", city: "Konya", bayiMi: false, anlasmaliServisMi: true },
      { name: "B", country: "Türkiye", city: "İzmir", bayiMi: false, anlasmaliServisMi: true },
    ];
    expect(pinleriTopla({ factory: null, dealers: d, seciliUlke: null, konumlar })[0].cesit).toBe("servis");
  });
  it("fabrika/bayi bilgisi eksikse patlamaz", () => {
    expect(pinleriTopla({ factory: null, dealers: [], konumlar })).toEqual([]);
    expect(pinleriTopla({})).toEqual([]);
    expect(pinleriTopla({ factory: { country: "Türkiye" }, konumlar })).toEqual([]); // şehir yok
  });
});
