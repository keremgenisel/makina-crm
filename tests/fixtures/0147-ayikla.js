// Spec 0147 (plan P5): sipariş belgesinin kıyas ayıklaması. 0147 belgenin yalnız düzenini değiştirdi (C3): ölçü metninin sonuna " mm",
// bölümde tek "Parçalar" tablosu yerine grup (hammadde) başına tablo, gruplara göre sıra ve iki hammaddeli parçanın hammadde başına
// bölünmesi. Ayıklama her bölümün parça tablolarını tek bir kanonik metne indirir: satırlar "(parça, tek ölçü, sipariş adedi, öteki
// hücreler)" dörtlülerine açılır (bir satırdaki `<br>` ile ayrılmış ölçüler ayrı dörtlü) ve sıralanır. Eski tek satırın iki ölçüsü ile
// yeni iki bölünmüş satır aynı dörtlülere iner; yani her ölçünün adedi değişmemişse kıyas birebir tutar. Tablo dışındaki her şey
// (bölüm başlığı, notlar, toplam, MODELLER, sayfa sonları) olduğu gibi karşılaştırılır. Grup tablolarının sütun genişliği kuralı
// (`GRUP_TABLO_STILI`, başlıktaki stilde) da düşer.
const GENISLIK = /\.siparis-bolum table\{table-layout:fixed;\}(?:\.siparis-bolum th:nth-child\(\d\)\{width:\d+%;\})+/g;
const TABLO = /<div style="font-size:10px;font-weight:700;color:#94a3b8;margin-top:8px;">[^<]*<\/div><table><thead><tr><th[^>]*>Parça<\/th>[\s\S]*?<\/table>/g;
const SATIR = /<tr>([\s\S]*?)<\/tr>/g;
const HUCRE = /<td[^>]*>([\s\S]*?)<\/td>/g;
const MM = / mm(?=( · parça başına \d+)?$)/;

const kanonik = (tablolar) => {
  const dortluler = [];
  for (const t of tablolar) {
    for (const m of t.matchAll(SATIR)) {
      const h = [...m[1].matchAll(HUCRE)].map(c => c[1]);
      if (!h.length) continue;
      const olculer = h[1] ? h[1].split("<br>") : [""];
      for (const o of olculer) dortluler.push([h[0], o.replace(MM, ""), ...h.slice(2)].join(" ‖ "));
    }
  }
  return `<parcalar>${dortluler.sort().join(" ¶ ")}</parcalar>`;
};

export const ayikla0147 = (html) => String(html).replace(GENISLIK, "").split('<div class="siparis-bolum"').map((parca, i) => {
  if (i === 0) return parca;
  const tablolar = parca.match(TABLO) || [];
  if (!tablolar.length) return parca;
  let ilk = true;
  return parca.replace(TABLO, () => (ilk ? ((ilk = false), kanonik(tablolar)) : ""));
}).join('<div class="siparis-bolum"');
