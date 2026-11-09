// Spec 0139 AC-43, karar 45: gerçek MALZEME LİSTESİ ile yerel ölçüm (CI'da koşmaz; dosya müşteri verisidir, depoya girmez).
// Kullanım: npx vite-node scripts/olc/0139-kaynak-kiyas.mjs "<xlsx yolu>"
// Altı kart Context'in önerilen değerleriyle BELLEKTE kurulur. Satır başına uygulamanın birim maliyeti ile kaynağın "adet TL"
// hücresi (paslanmazda P, plastikte T) karşılaştırılır; Ek 1 satırları (kaynakta adedi uydurulmuş) karşılaştırmaya girmez.
import * as XLSX from "xlsx";
import fs from "node:fs";
import * as A from "../../src/lib/malzemeListesiAktarma.js";
import { malzemeKatalogu } from "../../src/lib/malzeme.js";
import { parcaMaliyetKurus, setKatalogu } from "../../src/lib/urunAgaci.js";
import { KARTLAR, MODELLER } from "../../tests/fixtures/0139-kaynak.js";

const yol = process.argv[2];
const buf = fs.readFileSync(yol);
const { sayfalar, hata } = A.calismaKitabiniOku(XLSX, new Uint8Array(buf), { boyut: buf.length });
if (hata) { console.error(hata); process.exit(1); }
let n = 0;
const plan = A.aktarmaPlani({ sayfalar, malzemeler: KARTLAR, standardModels: MODELLER, yeniId: () => ++n });
const mk = malzemeKatalogu(KARTLAR); const sk = setKatalogu(plan.parcalar);
const tutarCol = { paslanmaz: "P", plastik: "T" };
// Biçimlenmiş değer tam liraya yuvarlı olduğu için ölçüm hücrenin HAM değerini okur (içe aktarma yolu biçimlenmiş değeri okur, C5).
const wb = XLSX.read(new Uint8Array(buf), { type: "array" });
const ham = (sayfa, hucre) => { const c = wb.Sheets[sayfa]?.[hucre]; return c && typeof c.v === "number" ? c.v : null; };
const satirlar = [];
for (const s of A.SAYFALAR) {
  const rows = sayfalar[s.ad];
  for (const r of A.satirlariOku(s, rows)) {
    if (r.neden || r.ek1) continue;
    const parca = plan.parcalar.find(p => p.maliyetKalemleri[0].bicim === r.bicim && JSON.stringify(Object.fromEntries(Object.entries(p.maliyetKalemleri[0]).filter(([k]) => k in r.olculer))) === JSON.stringify(r.olculer) && p.ad.startsWith(r.ad));
    if (!parca) continue;
    const uygulama = parcaMaliyetKurus(parca, undefined, sk, mk) / 100;
    const kaynak = ham(s.ad, `${tutarCol[s.tur]}${r.satirNo}`);
    if (!kaynak) continue;
    satirlar.push({ sayfa: s.ad, satir: r.satirNo, ad: r.ad, bicim: r.bicim, uygulama: Math.round(uygulama * 100) / 100, kaynak, sapma: uygulama / kaynak - 1 });
  }
}
// Triyaj (bulgu 3): eşik "%0,1 (levhada %0,01) artı 1 kuruş"; uygulama kuruşa yuvarlar, yuvarlama geometri sapmasının üstüne biner.
const esik = (b) => (b === "sac" ? 0.0001 : 0.001);
const asan = satirlar.filter(x => Math.abs(x.uygulama - x.kaynak) > esik(x.bicim) * x.kaynak + 0.01);
const sayfaToplam = Object.fromEntries(A.SAYFALAR.map(s => [s.ad, satirlar.filter(x => x.sayfa === s.ad).length]));
console.log(JSON.stringify({ karsilastirilan: satirlar.length, sayfaToplam, esikAsan: asan.length, enBuyukSapma: Math.max(...satirlar.map(x => Math.abs(x.sapma))), asan: asan.map(x => ({ ...x, sapma: Number((x.sapma * 100).toFixed(3)) + "%" })) }, null, 1));
