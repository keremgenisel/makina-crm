// Dekoratif nokta-harita — gerçek satış/coğrafi veriyle bağlantısı YOK, sadece kilit ekranı için
// marka rengindeki bir arka plan dokusu. Kıtalar 1000x500 (eşdikdörtgen) koordinat uzayında kabaca
// elips "blob"larla yaklaştırılır; ızgaradaki bir nokta herhangi bir blobun içine düşüyorsa çizilir.
const VIEW_W = 1000;
const VIEW_H = 500;
const SPACING = 13;
const DOT_R = 1.6;

// [cx, cy, rx, ry] — kıtaların kaba yaklaşık konumları/boyutları
const BLOBS = [
  [230, 119, 95, 65],  // Kuzey Amerika
  [239, 206, 20, 20],  // Orta Amerika
  [342, 308, 62, 90],  // Güney Amerika
  [542, 103, 70, 47],  // Avrupa
  [544, 247, 95, 100], // Afrika
  [631, 181, 35, 36],  // Orta Doğu
  [764, 139, 139, 83], // Asya (ana kütle)
  [825, 236, 62, 42],  // Güneydoğu Asya
  [719, 192, 30, 37],  // Hindistan
  [869, 317, 57, 40],  // Avustralya
];

// Math.random() yerine deterministik bir sahte-rastgelelik — her render'da/her açılışta aynı
// desen çıksın (yoksa nokta deseni her mount'ta titreyip kayar gibi görünür).
const pseudoRandom = (x, y) => {
  const v = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return v - Math.floor(v);
};

const inAnyBlob = (x, y) => BLOBS.some(([cx, cy, rx, ry]) => {
  const dx = (x - cx) / rx, dy = (y - cy) / ry;
  return dx * dx + dy * dy <= 1;
});

const buildDots = () => {
  const dots = [];
  for (let y = SPACING / 2; y < VIEW_H; y += SPACING) {
    for (let x = SPACING / 2; x < VIEW_W; x += SPACING) {
      if (!inAnyBlob(x, y)) continue;
      const r = pseudoRandom(x, y);
      if (r < 0.18) continue; // düz elips değil, pürüzlü/organik bir doku için bir kısmını atla
      dots.push({ x, y, o: 0.4 + pseudoRandom(x + 1, y + 1) * 0.6 });
    }
  }
  return dots;
};

// Modül seviyesinde bir kere hesaplanır — saf dekoratif olduğu için her render'da yeniden üretmeye gerek yok.
const DOTS = buildDots();

export const WorldDotMap = ({ color = "#e85d1a", baseOpacity = 0.16, style }) => (
  <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="xMidYMid slice"
    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", ...style }}>
    {DOTS.map((d, i) => (
      <circle key={i} cx={d.x} cy={d.y} r={DOT_R} fill={color} opacity={d.o * baseOpacity} />
    ))}
  </svg>
);
