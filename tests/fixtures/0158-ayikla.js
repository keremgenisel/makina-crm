// Spec 0158 C9/2, C9/3, P10, P11 (AC-53, AC-63, AC-72): kıyas ayıklaması. Eski altınlar yenilenmez; yeni çıktı bu spec'in kurallarını
// geri alarak eski biçime çevrilir ve eski altınla birebir karşılaştırılır. Ayıklamanın geri aldığı her şey bir kuraldır:
//   - motor: yeni anahtarlar (bilgi alanları, ölçü gösterimi, kesim satırları, grup sütun kararı, genel toplam, kesim ibaresi) düşer;
//   - belge: tablo başına sütun sınıfı sarmalayıcısı ve stili (R13/2, P9) eski tek kurala döner; bütün satırlarında boş kaldığı için
//     çizilmeyen Ölçü sütunu (R10, C9/2: belgenin TEK bilinçli farkı) boş başlık ve boş hücreyle geri konur;
//   - belge: kesilecek adet hücreleri (R16–R19/2) eski biçime döner: kalem adedi çarpılmış satırlar parça adedine, karışık hücrede
//     boy satırları dışındaki satırlar düşer (0144'te kilo ölçüsü satır yazmıyordu);
//   - Excel: son beş sütun (R35, R35/2) düşer.
const YENI_MOTOR = new Set(["ustHiza", "olcuSatirlari", "siparisSatirlari", "kesimAciklama", "sutunlar", "genelToplamK", "genelTutarsizSayi", "kesimVar", "bilgi"]);
export const ayiklaMotor0158 = (x) => JSON.parse(JSON.stringify(x, (k, v) => (YENI_MOTOR.has(k) ? undefined : v)));

const TH = (h) => `<th style="text-align:left;padding:4px 8px 4px 0;font-size:9px;color:#94a3b8;font-weight:700;border-bottom:1px solid #cbd5e1;">${h}</th>`;
const BOS_TD = '<td style="text-align:left;padding:3px 8px 3px 0;font-size:10.5px;border-bottom:1px solid #f1f5f9;"></td>';
const SARMA = /<div class="sk-[A-Z]+(?: siparis-genis)?(?: siparis-ust)?">([\s\S]*?<\/table>)<\/div>/g;
const YENI_STIL = /\.siparis-bolum table\{table-layout:fixed;\}(?:\.siparis-bolum \.sk-[A-Z]+ th:nth-child\(\d\)\{width:\d+%;\})+(?:body\{max-width:748px;\}[^<]*?\})?(?:\.siparis-bolum \.siparis-ust td\{vertical-align:top;\})?/;
const eskiStil = (fiyatli) => `.siparis-bolum table{table-layout:fixed;}${(fiyatli ? [26, 28, 22, 24] : [34, 38, 28]).map((w, i) => `.siparis-bolum th:nth-child(${i + 1}){width:${w}%;}`).join("")}`;
const olcuGeriKoy = (tablo) => {
  const ths = [...tablo.matchAll(/<th[^>]*>([^<]*)<\/th>/g)].map(m => m[1]);
  if (ths[0] !== "Parça" || ths.includes("Ölçü")) return tablo;
  return tablo.replace(/(<thead><tr><th[^>]*>Parça<\/th>)/, `$1${TH("Ölçü")}`).replace(/(<tr><td[^>]*>[\s\S]*?<\/td>)/g, (m) => m + BOS_TD);
};
const ALT = /<div style="font-size:9\.5px;color:#64748b;">([\d.]+) parça(?: × [\d.,]+)?<\/div>$/;
const kesimGeriAl = (td) => td.replace(/(<td style="text-align:right;[^"]*">)([\s\S]*?)(<\/td>)/g, (m, a, ic, z) => {
  const alt = ic.match(ALT);
  if (!alt) return m;
  const satirlar = ic.slice(0, alt.index).split("<br>");
  const boylar = satirlar.filter(l => / boy \(/.test(l));
  if (!boylar.length) return /× /.test(alt[0]) || satirlar.length > 1 ? `${a}${alt[1]}${z}` : m;
  return satirlar.length === boylar.length ? m : `${a}${boylar.join("<br>")}${alt[0]}${z}`;
});
// Triyaj (bulgu 1): ölçü başına alt satıra bölünmüş parça (rowspan) eski tek satıra döner; bölünen hücreler `<br>` ile birleşir.
const TD = /<td( rowspan="(\d+)")? style="([^"]*)">([\s\S]*?)<\/td>/g;
const altSatirBirlestir = (tablo) => {
  const trs = [...tablo.matchAll(/<tr>([\s\S]*?)<\/tr>/g)];
  if (!trs.some(m => /rowspan=/.test(m[1]))) return tablo;
  let out = tablo;
  for (let i = 0; i < trs.length; i++) {
    const hucreler = [...trs[i][1].matchAll(TD)];
    const k = Math.max(1, ...hucreler.map(c => +(c[2] || 1)));
    if (k === 1) continue;
    const bolunen = hucreler.map((c, j) => (c[2] ? -1 : j)).filter(j => j >= 0);
    const ic = hucreler.map(c => c[4]);
    const devam = trs.slice(i + 1, i + k);
    devam.forEach(m => [...m[1].matchAll(TD)].forEach((c, j) => { ic[bolunen[j]] += `<br>${c[4]}`; }));
    const yeni = `<tr>${hucreler.map((c, j) => `<td style="${c[3].replace("transparent", "#f1f5f9")}">${ic[j]}</td>`).join("")}</tr>`;
    out = out.replace([trs[i], ...devam].map(m => m[0]).join(""), yeni);
    i += k - 1;
  }
  return out;
};
export const ayiklaBelge0158 = (html) => {
  const fiyatli = /Fiyatlı nüsha/.test(html);
  return String(html).replace(YENI_STIL, eskiStil(fiyatli)).replace(SARMA, "$1").replace(/<table>[\s\S]*?<\/table>/g, (t) => kesimGeriAl(olcuGeriKoy(altSatirBirlestir(t))));
};
export const ayiklaExcel0158 = (satirlar) => satirlar.map(r => r.slice(0, 11));
