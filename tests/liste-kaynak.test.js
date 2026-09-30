// Spec 0016 kaynak taramaları (plan §5, Ek A, G1–G11): boş durum metinleri boş durum kutusunda, mesajlar uyarı şeridinde,
// liste kapları ve bölümler kart bölümde; eski satır içi kalıplar yalnız adıyla yazılmış istisnalarda kalır.
// ASAMA: müşteri detay modalı ikinci aşamada dönüşür (R8); o aşamanın kayıtları ASAMA 2 olunca denetlenir.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const ASAMA = 2;
const KOK = path.join(__dirname, "..");
const oku = (d) => readFileSync(path.join(KOK, d), "utf-8");
const C = "src/components/";
const { bosDurum, mesaj } = JSON.parse(oku("tests/fixtures/0016-metinler.json"));

const ASAMA1 = ["Customers.jsx", "SimpleDealers.jsx", "stock/MakinaStokTab.jsx", "stock/PartStokTab.jsx", "stock/YedekParcaSatisTab.jsx",
  "stock/UretimFormu.jsx", "Finance.jsx", "Documents.jsx", "Notes.jsx", "Analiz.jsx"].map(f => C + f);
const ASAMA2 = ["customers/CustomerDetailModal.jsx", "customers/detail/MachineTimeline.jsx", "customers/detail/CustomerFilesSection.jsx",
  "customers/detail/OwnershipSection.jsx", "customers/detail/PaymentSection.jsx"].map(f => C + f);
const KAPSAM = ASAMA >= 2 ? [...ASAMA1, ...ASAMA2] : ASAMA1;

// Metin, verilen bileşenin açılış etiketinden sonra ve o öğe kapanmadan önce mi duruyor? (baslik/metin özelliği ya da çocuk)
const ogeIcinde = (s, metin, ad) => {
  const i = s.indexOf(metin);
  if (i < 0) return { bulundu: false };
  const ac = s.lastIndexOf(`<${ad}`, i);
  if (ac < 0) return { bulundu: true, icinde: false };
  const ara = s.slice(ac, i);
  const kapandi = ara.includes(`</${ad}>`) || /[^<]\/>/.test(ara); // "</>" (React parçası) kapanış sayılmaz
  return { bulundu: true, icinde: !kapandi, etiket: s.slice(ac, s.indexOf(">", ac) + 1) };
};

describe("AC-1: boş durum metinleri boş durum kutusunda", () => {
  it.each(bosDurum.filter(k => k.asama <= ASAMA).map(k => [k.dosya, k.metin]))("%s: %s", (d, metin) => {
    const s = oku(d);
    const r = ogeIcinde(s, metin, "BosDurum");
    expect(r.bulundu, "metin kaynakta yok (değişmiş olabilir)").toBe(true);
    expect(r.icinde, "metin bir <BosDurum> öğesinin içinde değil").toBe(true);
    // Metnin bir kez geçtiği her yer kutuda olmalı (ör. Finans'ın iki "Veri yok"u).
    let j = s.indexOf(metin);
    while (j >= 0) {
      const onceki = s.slice(0, j);
      const ac = onceki.lastIndexOf("<BosDurum");
      expect(ac >= 0 && !/[^<]\/>|<\/BosDurum>/.test(s.slice(ac, j)), `${d}: ${metin} (konum ${j})`).toBe(true);
      j = s.indexOf(metin, j + metin.length);
    }
  });
  it("R6 / G3: Müşteriler iki durumu ayrı başlık ve sabit açıklamayla gösterir; arama metni emptyLabel'den gelir", () => {
    const s = oku(C + "Customers.jsx");
    expect(s).toContain('<BosDurum testId="bos-musteriler" baslik="Henüz müşteri kaydı yok" metin="Yeni müşteri eklemek için “Yeni Müşteri” düğmesini kullanın." />');
    expect(s).toContain('<BosDurum testId="bos-musteriler" baslik={emptyLabel} metin="Arama ölçütünü değiştirmeyi deneyin." />');
    expect(s).toContain('emptyLabel = "Müşteri bulunamadı."');
  });
  it("kapsam dosyalarında ortalanmış gri boş satır kalıbı yalnız adlandırılmış istisnada", () => {
    const ISTISNA = { [C + "Documents.jsx"]: ["Henüz satır eklenmedi."] }; // Evrak formunun satır listesi (form, Ek A "Değil")
    for (const d of KAPSAM) {
      const satirlar = oku(d).split("\n").filter(l => /textAlign: "center", color: "var\(--n400/.test(l));
      const izinli = ISTISNA[d] || [];
      expect(satirlar.filter(l => !izinli.some(t => l.includes(t))), d).toEqual([]);
    }
  });
});

describe("AC-5: mesajlar uyarı şeridinde", () => {
  it.each(mesaj.filter(k => k.asama <= ASAMA).map(k => [k.dosya, k.metin, k.aile]))("%s: %s (%s)", (d, metin, aile) => {
    const r = ogeIcinde(oku(d), metin, "UyariSeridi");
    expect(r.bulundu, "metin kaynakta yok").toBe(true);
    expect(r.icinde, "metin bir <UyariSeridi> öğesinin içinde değil").toBe(true);
    expect(r.etiket).toContain(`aile="${aile}"`);
  });
  it("kapsam dosyalarında renkli zeminli satır içi mesaj kutusu yalnız adlandırılmış borçlarda (G5)", () => {
    // Kayıt türü etiketi (FABRİKA / ANLAŞMALI SERVİS) ve tutar taşıyan borç özet paneli: mesaj değil, sözlükte borç.
    const ISTISNA = { [C + "SimpleDealers.jsx"]: 3 };
    const KUTU = /<div style=\{\{[^}]*background: "var\(--(red|amb|blu|grn)Bg2?, #[0-9a-f]+\)"[^}]*border: "1px solid var\(--(red|amb|blu|grn)Br/g;
    for (const d of KAPSAM) expect((oku(d).match(KUTU) || []).length, d).toBe(ISTISNA[d] || 0);
  });
});

describe("AC-6: liste kapları ve bölümler kart bölümde", () => {
  const ESKI_KAP = [
    [/borderRadius: 12, boxShadow: "0 1px 4px rgba\(0,0,0,\.0[68]\)", overflow: "auto"/, "gölgeli liste kabı"],
    [/border: "1px solid var\(--n200, #e2e8f0\)", borderRadius: 10, overflow: "auto"/, "kenarlıklı liste kabı"],
    [/\bS\.panel\b|\bS\.h2\b|\bS\.bos\b/, "Analiz yerel kutu stili"],
    [/padding: "14px 18px", fontSize: 13, fontWeight: 700, color: "var\(--n600/, "Finans yerel kart başlığı"],
    [/fontSize: 12, fontWeight: 800, color: "var\(--n600, #475569\)", letterSpacing: \.5, textTransform: "uppercase"/, "detay bölümü yerel başlığı"],
    // Aşama 2 (müşteri detayı, plan Ek B.1).
    [/fontSize: 12, fontWeight: (700|800), color: "var\(--n600, #475569\)", textTransform: "uppercase"/, "detay bölümü yerel başlığı (büyük harf)"],
    [/>\s*(BU FİRMANIN MAKİNALARI|KALIPLAR) \(/, "büyük harfle yazılmış bölüm başlığı (H2)"],
    [/background: "var\(--n100, #f8fafc\)", borderRadius: 12, padding: "16px 18px"/, "Makina Geçmişi yerel kabı"],
    [/background: "var\(--ambBg3, #fff7ed\)", border: "1px solid var\(--ambBr3, #fed7aa\)", borderRadius: 10, padding: "14px 16px"/, "Sahiplik Geçmişi yerel kabı"],
  ];
  // Adlandırılmış istisna: müşteri detayındaki "Sandık Etiketi" penceresinin üç başlığı (Gönderen, Alıcı, Makina); form, kapsam dışı.
  const ISTISNA = { [C + "customers/CustomerDetailModal.jsx"]: { "detay bölümü yerel başlığı (büyük harf)": ["Gönderen", "Alıcı", "Makina"] } };
  it.each(KAPSAM)("%s", (d) => {
    const s = oku(d);
    for (const [re, ad] of ESKI_KAP) {
      const izinli = ISTISNA[d]?.[ad];
      const kalan = s.split("\n").filter(l => re.test(l)).filter(l => !(izinli || []).some(t => l.includes(`>${t}</div>`)));
      expect(kalan, `${d}: ${ad}`).toEqual([]);
    }
  });
  it("Ek A.3: kartla çerçevelenen bölümler KartBolum kullanır, başlık biçimi G8'e göre", () => {
    const say = (d, re) => (oku(C + d).match(re) || []).length;
    const KART = /<KartBolum varyant="kart"/g;
    for (const d of ["Customers.jsx", "Notes.jsx", "stock/MakinaStokTab.jsx", "stock/PartStokTab.jsx", "stock/UretimFormu.jsx"]) expect(say(d, KART), d).toBeGreaterThanOrEqual(1);
    expect(say("Documents.jsx", /<KartBolum varyant="kart" style=\{\{ padding: 0, overflow: "auto" \}\}>/g)).toBe(2);
    expect(say("Finance.jsx", /<KartBolum varyant="kart"[^>]*title=/g)).toBe(3); // etiket (varsayılan) başlık
    expect(say("Analiz.jsx", /<KartBolum varyant="kart" baslikStili="baslik"/g)).toBe(10);
    expect(say("Analiz.jsx", /<section style=\{\{[^}]*\}\}>\s*<KartBolum/g)).toBe(10); // G9: dış <section> korunur
    expect(say("SimpleDealers.jsx", /<KartBolum varyant="kart" baslikStili="baslik"/g)).toBe(3);
  });
  it("Ek B.1 (Aşama 2): müşteri detayının bölümleri KartBolum baslik; katlananlar denetimli; kenar çubuğu yalnız başlık", () => {
    if (ASAMA < 2) return;
    const d = "customers/CustomerDetailModal.jsx";
    const s = oku(C + d);
    expect((s.match(/<KartBolum varyant="kart" baslikStili="baslik"/g) || []).length, d).toBe(4); // Görüşmeler, Kalıplar, İşlemler; 0050: Maliyet ve Kâr
    // Spec 0050 R8, C2: maliyet kutusu da 0016'nın denetimli katlanan kartı (ikinci mekanizma yok).
    expect(s).toMatch(/<KartBolum varyant="kart" baslikStili="baslik" collapsible testId="maliyet-kar-kutusu"[\s\S]{0,120}acik=\{maliyetAcik\} onAcikDegis=\{maliyetDegis\}/);
    expect(s).toMatch(/<KartBolum varyant="kart" baslikStili="baslik" collapsible[\s\S]{0,120}acik=\{gorusmelerAcik \|\| !!gorusmeForm\}/);
    expect(s).toContain("<BolumBasligi bosluk={10}>Bu Firmanın Makinaları ({firmMachines.length})</BolumBasligi>");
    expect(s).toContain("title={`Kalıplar (${detailView.kaliplar.length})`}");
    expect(oku(C + "customers/detail/CustomerFilesSection.jsx")).toMatch(/collapsible acik=\{acik\} onAcikDegis=\{setAcik\}/);
    expect(oku(C + "customers/detail/MachineTimeline.jsx")).toMatch(/<KartBolum varyant="kart" baslikStili="baslik"[^>]*title="Makina Geçmişi" altBaslik=\{`\$\{detailTimelineEvents\.length\} olay`\}/);
    expect(oku(C + "customers/detail/OwnershipSection.jsx")).toMatch(/<KartBolum varyant="kart" baslikStili="baslik"[^>]*title="Sahiplik Geçmişi"/);
  });
});
