import { useCallback, useEffect, useLayoutEffect, useRef } from "react";

// Haritanın çizim ve etkileşim katmanı. Kaydırma/yakınlaştırma her karede React state'i
// güncellemesin diye transform'lar doğrudan DOM'a yazılır; React yalnız şekilleri çizer.

const EN_YAKIN = 30;   // azami yakınlaştırma
const EN_UZAK = 1;

// Pin renkleri. Bir kayıt hem bayi hem anlaşmalı servis olabilir; o zaman pin yarı mavi
// yarı yeşil çizilir (aşağıdaki degrade, ortasında sert geçişle iki rengi böler).
const PIN_RENK = { fabrika: "#e85d1a", bayi: "#2563eb", servis: "#16a34a" };
const pinRengi = (p) => (p.tur === "fabrika" ? PIN_RENK.fabrika
  : p.cesit === "ikisi" ? "url(#pin-ikisi)"
    : p.cesit === "servis" ? PIN_RENK.servis : PIN_RENK.bayi);

export const HaritaSvg = ({
  W, H,
  arkaPlan = [],          // tıklanmayan gri ülkeler (yalnız dünya görünümü)
  sekiller = [],          // { anahtar, d, adet, kova }  — ülke ya da bölge
  pinler = [],            // { x, y, tur, olcek, sayi, ad, alt }
  ikon = null,            // pin başındaki logo (data URI)
  onSec = null,           // (anahtar) => void — null ise şekiller tıklanmaz
  onIpucu = () => {},     // ({ x, y, baslik, alt }) | null
  onBasaDon = null,       // "başa dön": ülke görünümünden dünyaya döner
}) => {
  const svgRef = useRef(null);
  const katRef = useRef(null);
  const pinKatRef = useRef(null);
  const gorunumRef = useRef({ k: 1, x: 0, y: 0 });
  const surukRef = useRef(null);

  /** SVG'nin viewBox'ı görünür alana sığdırırken uyguladığı ölçek ("meet" davranışı). */
  const sigdirmaOlcegi = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return 1;
    const r = svg.getBoundingClientRect();
    const vb = svg.viewBox.baseVal;
    if (!vb.width || !vb.height || !r.width) return 1;
    return Math.min(r.width / vb.width, r.height / vb.height) || 1;
  }, []);

  const uygula = useCallback(() => {
    const { k, x, y } = gorunumRef.current;
    if (katRef.current) katRef.current.setAttribute("transform", `translate(${x},${y}) scale(${k})`);
    if (pinKatRef.current) {
      // Pin boyu EKRAN pikseline sabitlenir. SVG viewBox'ı alana sığdırırken kullandığı ölçek
      // ülkeye göre değişiyor (Almanya dikey: %32'ye iniyor, Türkiye yatay: %96'da kalıyor) ve
      // pinler onunla küçülüyordu. Sığdırma ölçeğine bölünce pin her ülkede aynı boyda görünür.
      const sigdirma = sigdirmaOlcegi();
      for (const g of pinKatRef.current.children) {
        const px = +g.dataset.x * k + x;
        const py = +g.dataset.y * k + y;
        g.setAttribute("transform", `translate(${px},${py}) scale(${(+g.dataset.o / sigdirma).toFixed(3)})`);
      }
    }
  }, [sigdirmaOlcegi]);

  // Görünüm değişince (dünya <-> ülke) sıfırla
  useLayoutEffect(() => { gorunumRef.current = { k: 1, x: 0, y: 0 }; uygula(); }, [W, H, sekiller, uygula]);

  // Pinler geç gelir (fabrika/bayi ülkelerinin dosyaları harita çizildikten sonra yüklenir).
  // Konumları transform ile veriliyor; bu olmadan hepsi sol üst köşede yığılıyordu.
  // Görünümü SIFIRLAMAZ: kullanıcı kaydırmışken pin gelirse harita zıplamasın.
  useLayoutEffect(() => { uygula(); }, [pinler, uygula]);

  /** Ekran pikselini viewBox koordinatına çevirir (SVG "meet" ile ortalanıp ölçekleniyor). */
  const vbNokta = (e) => {
    const r = svgRef.current.getBoundingClientRect();
    const vb = svgRef.current.viewBox.baseVal;
    const olcek = Math.min(r.width / vb.width, r.height / vb.height) || 1;
    return {
      x: (e.clientX - r.left - (r.width - vb.width * olcek) / 2) / olcek,
      y: (e.clientY - r.top - (r.height - vb.height * olcek) / 2) / olcek,
      olcek, r,
    };
  };

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return undefined;
    const teker = (e) => {
      e.preventDefault();
      const p = vbNokta(e);
      const g = gorunumRef.current;
      const yeni = Math.max(EN_UZAK, Math.min(EN_YAKIN, g.k * (e.deltaY < 0 ? 1.18 : 1 / 1.18)));
      g.x = p.x - (p.x - g.x) * (yeni / g.k);
      g.y = p.y - (p.y - g.y) * (yeni / g.k);
      g.k = yeni;
      uygula();
    };
    svg.addEventListener("wheel", teker, { passive: false });
    return () => svg.removeEventListener("wheel", teker);
  }, [uygula]);

  const bas = (e) => {
    // Tıklanan ülkeyi BURADA kaydet: sürükleme için setPointerCapture kullanıyoruz ve o,
    // sonraki "click" olayının hedefini svg'ye kaydırıyor (o yüzden click'e güvenilmez).
    // elementsFromPoint: üstte pin olsa bile tıklama altındaki ülkeye geçsin (pinler
    // dünya ölçeğinde ülkeden büyük olduğu için tıklamayı yutuyorlardı).
    const alttaki = typeof document.elementsFromPoint === "function"
      ? document.elementsFromPoint(e.clientX, e.clientY).find((el) => el.hasAttribute && el.hasAttribute("data-sec"))
      : e.target.closest?.("[data-sec]");
    surukRef.current = {
      x: e.clientX, y: e.clientY, gx: gorunumRef.current.x, gy: gorunumRef.current.y,
      kaydi: false, hedef: alttaki ? alttaki.getAttribute("data-sec") : null,
    };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* yoksay */ }
  };

  const kaydir = (e) => {
    const p = vbNokta(e);
    const s = surukRef.current;
    if (s) {
      const dx = (e.clientX - s.x) / p.olcek, dy = (e.clientY - s.y) / p.olcek;
      if (Math.abs(dx) + Math.abs(dy) > 3) s.kaydi = true;
      gorunumRef.current.x = s.gx + dx;
      gorunumRef.current.y = s.gy + dy;
      uygula();
      onIpucu(null);
      return;
    }
    const pin = e.target.closest?.("[data-pin]");
    const sekil = pin ? null : e.target.closest?.("[data-ad]");
    const hedef = pin || (sekil && sekil.dataset.adet !== "0" ? sekil : null);
    if (!hedef) { onIpucu(null); return; }
    onIpucu({
      x: e.clientX - p.r.left, y: e.clientY - p.r.top,
      baslik: hedef.dataset.ad,
      alt: pin ? hedef.dataset.alt : hedef.dataset.adet + " makina",
      vurgu: !pin,
    });
  };

  /** Düğmeyle yakınlaştır: görüntünün ortasını sabit tutar. */
  const dugmeZoom = (carpan) => {
    const g = gorunumRef.current;
    const yeni = Math.max(EN_UZAK, Math.min(EN_YAKIN, g.k * carpan));
    const cx = W / 2, cy = H / 2;
    g.x = cx - (cx - g.x) * (yeni / g.k);
    g.y = cy - (cy - g.y) * (yeni / g.k);
    g.k = yeni;
    uygula();
  };
  // "Başa dön": yakınlaştırmayı sıfırlar ve bir ülke açıksa dünyaya döner. İkisi ayrı
  // olsaydı ülke görünümünde (zaten 1 kat) düğme hiçbir şey yapmıyor, bozuk görünüyordu.
  const basaDon = () => {
    gorunumRef.current = { k: 1, x: 0, y: 0 };
    uygula();
    onBasaDon?.();
  };

  const birak = () => {
    const s = surukRef.current;
    surukRef.current = null;
    if (s && !s.kaydi && s.hedef && onSec) onSec(s.hedef);
  };

  return (
    <>
    <svg ref={svgRef} className="harita-svg" viewBox={`0 0 ${W} ${H}`}
      onPointerDown={bas} onPointerMove={kaydir} onPointerUp={birak}
      onPointerCancel={() => { surukRef.current = null; }}
      onPointerLeave={() => onIpucu(null)}>
      <g ref={katRef}>
        {arkaPlan.map((d, i) => <path key={"a" + i} className="harita-arkaplan" d={d} />)}
        {sekiller.map((s) => (
          <path key={s.anahtar} className={`harita-sekil${s.adet ? " satisli" : ""}`} d={s.d}
            fill={s.adet ? `var(--hk${s.kova + 1})` : "var(--hBos)"}
            data-ad={s.anahtar} data-adet={s.adet}
            {...(s.adet && onSec ? { "data-sec": s.anahtar } : {})} />
        ))}
      </g>
      <defs>
        {/* Hem bayi hem anlaşmalı servis: sert geçişli degrade pini tam ortadan böler */}
        <linearGradient id="pin-ikisi" x1="0" y1="0" x2="1" y2="0">
          <stop offset="50%" stopColor={PIN_RENK.bayi} />
          <stop offset="50%" stopColor={PIN_RENK.servis} />
        </linearGradient>
      </defs>
      <g ref={pinKatRef}>
        {pinler.map((p, i) => (
          <g key={i} className="harita-pin" data-x={p.x} data-y={p.y} data-o={p.olcek}
            data-pin={p.tur} data-ad={p.ad} data-alt={p.alt}>
            <path d="M0,0 C-2,-6 -13,-13 -13,-23 A13,13 0 1,1 13,-23 C13,-13 2,-6 0,0 Z"
              fill="var(--surface, #ffffff)" stroke={pinRengi(p)} strokeWidth="2.2" />
            {ikon && <image href={ikon} x="-9.5" y="-32.5" width="19" height="19" preserveAspectRatio="xMidYMid meet" />}
            {p.sayi > 1 && (
              <g transform="translate(11,-31)">
                <circle r="8.5" fill={pinRengi(p)} stroke="var(--surface, #ffffff)" strokeWidth="1.6" />
                <text y="3.1" textAnchor="middle" fontSize="10" fontWeight="700" fill="#fff">{p.sayi}</text>
              </g>
            )}
            <circle cx="0" cy="-23" r="16" fill="transparent" />
          </g>
        ))}
      </g>
    </svg>
    <div className="harita-arac">
      <button type="button" title="Yakınlaştır" onClick={() => dugmeZoom(1.4)}>+</button>
      <button type="button" title="Uzaklaştır" onClick={() => dugmeZoom(1 / 1.4)}>−</button>
      <button type="button" title="Başa dön" onClick={basaDon} style={{ fontSize: 13 }}>⟲</button>
    </div>
    </>
  );
};
