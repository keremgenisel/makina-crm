import { useEffect, useMemo, useRef, useState } from "react";
import { Icon, StatCard, Btn } from "./ui";
import { HaritaSvg } from "./harita/HaritaSvg";
import { haritaOzeti, dunyaToplami, bolgeToplami, ilOzeti, kovala, pinleriTopla, sadeAd, sehirAnahtar, sehirFirmaKirilim, ilceFirmaKirilim } from "../lib/mapStats";
import { ILCELER } from "../lib/map/ilceler";
// Pin başındaki simge: masaüstü ikonu (kare "A"). logo.avif 500x110 yazılı logodur,
// 19x19 pine sıkışınca okunmuyordu.
import APP_ICON from "../assets/app-icon.png?inline";

// Satış haritası. Harita verisi (src/lib/map/*) büyük olduğu için ana pakete girmez:
// sekme açılınca dünya, bir ülkeye tıklanınca yalnız o ülkenin bölgeleri yüklenir.
// Veri scripts/gen-map-paths.cjs ile üretilir, çevrimdışı çalışır.

const bolgeYukleyiciler = import.meta.glob("../lib/map/regions/*.js");
const bolgeYukle = (kod) => {
  const yukleyici = bolgeYukleyiciler["../lib/map/regions/" + kod + ".js"];
  return yukleyici ? yukleyici() : Promise.resolve(null);
};
// İlçe kırılımı olan iller (şimdilik 11) — ile tıklanınca yalnız o ilin dosyası yüklenir.
const ilceYukleyiciler = import.meta.glob("../lib/map/ilce/*.js");
const ilceYukle = (il) => {
  const yukleyici = ilceYukleyiciler["../lib/map/ilce/" + sadeAd(il) + ".js"];
  return yukleyici ? yukleyici() : Promise.resolve(null);
};

const Yukleniyor = ({ metin }) => (
  <div style={{ height: "100%", display: "grid", placeItems: "center", color: "var(--n400, #94a3b8)", fontSize: 13 }}>{metin}</div>
);

export const Harita = ({ customers = [], dealers = [], factory = null, onAyriPencere = null, onFirmaSec = null, baslangicUlke = null, baslangicIl = null, onDurumChange = null }) => {
  const [dunya, setDunya] = useState(null);
  const [hata, setHata] = useState("");
  // Başlangıç seçimi App'ten gelir: firmaya tıklayıp Müşteriler'e geçince Harita unmount olur;
  // modal kapanıp geri dönülünce aynı ülke/il görünümü korunsun diye (yoksa dünyaya sıfırlanıyordu).
  const [seciliUlke, setSeciliUlke] = useState(() => baslangicUlke || null);
  const [seciliIl, setSeciliIl] = useState(() => baslangicIl || null);   // yalnız Türkiye görünümünde, ilçesi olan iller
  const [ilModul, setIlModul] = useState(null);
  const [bolgeler, setBolgeler] = useState({}); // ülke adı -> modül
  const [ipucu, setIpucu] = useState(null);
  const [tamEkran, setTamEkran] = useState(false);
  const kartRef = useRef(null);

  // Tam ekran: harita kartı uygulamanın dışına, ekranın tamamına açılır. ESC ya da
  // düğme ile çıkılır; durum tarayıcıdan dinlenir, çünkü ESC bizden habersiz kapatıyor.
  useEffect(() => {
    const degisti = () => setTamEkran(document.fullscreenElement === kartRef.current);
    document.addEventListener("fullscreenchange", degisti);
    return () => document.removeEventListener("fullscreenchange", degisti);
  }, []);
  const tamEkranAcKapat = () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else kartRef.current?.requestFullscreen?.().catch(() => {});
  };

  // Seçim değişince App'e bildir (bir sonraki mount'ta geri yüklenmek üzere hatırlansın)
  useEffect(() => { onDurumChange?.(seciliUlke, seciliIl); }, [seciliUlke, seciliIl, onDurumChange]);

  const ozet = useMemo(() => haritaOzeti(customers), [customers]);
  const toplam = useMemo(() => dunyaToplami(ozet), [ozet]);

  useEffect(() => {
    let iptal = false;
    import("../lib/map/world.js")
      .then((m) => { if (!iptal) setDunya(m); })
      .catch(() => { if (!iptal) setHata("Harita verisi yüklenemedi."); });
    return () => { iptal = true; };
  }, []);

  // Pinler için: fabrikanın ve bayilerin ülkelerinin şehir dizinleri gerekiyor
  const pinUlkeleri = useMemo(() => {
    const s = new Set();
    const f = String(factory?.country ?? "").trim();
    if (f) s.add(f);
    for (const b of dealers || []) { const u = String(b?.country ?? "").trim(); if (u) s.add(u); }
    return [...s];
  }, [factory, dealers]);

  const gerekenUlkeler = useMemo(
    () => [...new Set([...pinUlkeleri, ...(seciliUlke ? [seciliUlke] : [])])],
    [pinUlkeleri, seciliUlke],
  );

  useEffect(() => {
    if (!dunya) return undefined;
    let iptal = false;
    const eksik = gerekenUlkeler.filter((u) => !(u in bolgeler) && dunya.ULKE_KOD[u]);
    if (!eksik.length) return undefined;
    Promise.all(eksik.map((u) => bolgeYukle(dunya.ULKE_KOD[u]).then((m) => [u, m]).catch(() => [u, null])))
      .then((cift) => { if (!iptal) setBolgeler((p) => ({ ...p, ...Object.fromEntries(cift) })); });
    return () => { iptal = true; };
  }, [dunya, gerekenUlkeler, bolgeler]);

  const konumlar = useMemo(() => {
    const o = {};
    for (const [u, m] of Object.entries(bolgeler)) if (m) o[u] = m.KONUM;
    return o;
  }, [bolgeler]);

  // İlçe görünümünde harita ilin kendi projeksiyonunda: pin konumları ilçe merkezlerinden gelir
  const ilceMerkezleri = useMemo(() => {
    if (!ilModul) return null;
    const o = {};
    ilModul.ILCE_ADLARI.forEach((ad, i) => { o[sadeAd(ad)] = ilModul.ILCE_MERKEZ[i]; });
    return o;
  }, [ilModul]);

  const pinler = useMemo(
    () => pinleriTopla({ factory, dealers, seciliUlke, seciliIl, konumlar, ilceMerkezleri }),
    [factory, dealers, seciliUlke, seciliIl, konumlar, ilceMerkezleri],
  );

  // Seçili ilin ilçe haritasını yükle
  useEffect(() => {
    if (!seciliIl) { setIlModul(null); return undefined; }
    let iptal = false;
    setIlModul(null);
    ilceYukle(seciliIl).then((m) => { if (!iptal) setIlModul(m); }).catch(() => {});
    return () => { iptal = true; };
  }, [seciliIl]);

  const ulkeModul = seciliUlke ? bolgeler[seciliUlke] : null;
  const ilVerisi = useMemo(() => (seciliIl ? ilOzeti(customers, seciliIl) : null), [customers, seciliIl]);
  // Seçili ülkenin şehir -> firma kırılımı (yan panelde her şehrin altında gösterilir)
  const firmaKirilim = useMemo(() => (seciliUlke ? sehirFirmaKirilim(customers, seciliUlke) : {}), [customers, seciliUlke]);
  // Seçili ilin ilçe -> firma kırılımı (ilçe panelinde her ilçenin altında)
  const ilceKirilim = useMemo(() => (seciliIl ? ilceFirmaKirilim(customers, seciliIl) : {}), [customers, seciliIl]);

  // Çizilecek şekiller: dünyada ülkeler, ülke görünümünde bölgeler
  const gorunum = useMemo(() => {
    if (!dunya) return null;
    if (!seciliUlke) {
      const kova = kovala(Object.values(ozet).map((v) => v.makina));
      return {
        W: dunya.W, H: dunya.H, arkaPlan: dunya.ARKA_PLAN,
        sekiller: Object.entries(dunya.ULKELER).map(([ad, d]) => {
          const adet = ozet[ad]?.makina || 0;
          return { anahtar: ad, d, adet, kova: kova(adet) };
        }),
      };
    }
    if (seciliIl) {
      if (!ilModul) return null;
      const kova = kovala(Object.values(ilVerisi.ilceler));
      return {
        W: ilModul.W, H: ilModul.H, arkaPlan: [],
        sekiller: ilModul.ILCELER.map((d, i) => {
          const ad = ilModul.ILCE_ADLARI[i];
          const adet = ilVerisi.ilceler[ad] || 0;
          return { anahtar: ad, d, adet, kova: kova(adet) };
        }),
      };
    }
    if (!ulkeModul) return null;
    const { bolgeler: toplamlar } = bolgeToplami(ozet[seciliUlke]?.sehirler || {}, ulkeModul.SEHIR);
    const kova = kovala(Object.values(toplamlar));
    return {
      W: ulkeModul.W, H: ulkeModul.H, arkaPlan: [],
      sekiller: ulkeModul.BOLGELER.map((d, i) => {
        const adet = toplamlar[i] || 0;
        return { anahtar: ulkeModul.BOLGE_ADLARI[i], d, adet, kova: kova(adet) };
      }),
    };
  }, [dunya, seciliUlke, ulkeModul, ozet, seciliIl, ilModul, ilVerisi]);

  const eslesmeyen = useMemo(() => {
    if (!seciliUlke || !ulkeModul) return [];
    return bolgeToplami(ozet[seciliUlke]?.sehirler || {}, ulkeModul.SEHIR).eslesmeyen;
  }, [seciliUlke, ulkeModul, ozet]);

  const enBuyuk = gorunum ? Math.max(0, ...gorunum.sekiller.map((s) => s.adet)) : 0;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--n900, #0f172a)" }}>Faaliyet Haritası</h2>
        {/* Yalnız ana penceredeki sekmede görünür; ayrı pencerenin içinde prop geçilmez → çıkmaz. */}
        {onAyriPencere && (
          <Btn small variant="ghost" onClick={onAyriPencere} title="Haritayı ayrı pencerede aç (2. monitör)">
            <Icon name="expand" size={14} /> Ayrı pencerede aç
          </Btn>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 16 }}>
        {!seciliUlke ? (
          <>
            <StatCard label="Satış Yapılan Ülke" value={toplam.ulke} color="#e85d1a"
              sub={toplam.enCok ? `En çok: ${toplam.enCok} (${ozet[toplam.enCok].makina})` : ""} />
            <StatCard label="Satış Yapılan Şehir" value={toplam.sehir} sub="Toplam" color="var(--blu500, #3b82f6)" />
            <StatCard label="Toplam Makina" value={toplam.makina} sub="Tüm dünya" color="#8b5cf6" />
            <StatCard label="Toplam Firma" value={toplam.firma} sub="Tekilleştirilmiş" color="var(--grn600, #16a34a)" />
          </>
        ) : seciliIl ? (
          <IlKartlari il={seciliIl} veri={ilVerisi} toplamMakina={toplam.makina} />
        ) : (
          <UlkeKartlari ulke={seciliUlke} ozet={ozet} toplamMakina={toplam.makina} modul={ulkeModul} />
        )}
      </div>

      <div className="harita-kart" ref={kartRef}>
        <div className="harita-alan">
          {hata ? <Yukleniyor metin={hata} />
            : !gorunum ? <Yukleniyor metin={seciliIl ? `${seciliIl} ilçe haritası yükleniyor…` : seciliUlke ? `${seciliUlke} haritası yükleniyor…` : "Harita yükleniyor…"} />
              : (
                <>
                  <HaritaSvg W={gorunum.W} H={gorunum.H} arkaPlan={gorunum.arkaPlan} sekiller={gorunum.sekiller}
                    pinler={pinler} ikon={APP_ICON} onIpucu={setIpucu}
                    onBasaDon={() => { setIpucu(null); if (seciliIl) setSeciliIl(null); else setSeciliUlke(null); }}
                    onSec={
                      seciliIl ? null
                        : seciliUlke === "Türkiye" ? (ad) => { if (ILCELER[ad]) { setIpucu(null); setSeciliIl(ad); } }
                          : seciliUlke ? null
                            : (ad) => { setIpucu(null); setSeciliUlke(ad); }
                    } />
                  <div className="harita-lejant">
                    <div className="lb">{seciliIl ? "İlçe başına makina" : seciliUlke ? "Bölge başına makina" : "Ülke başına makina"}</div>
                    <div className="kutular">
                      <i style={{ background: "var(--hBos)" }} />
                      {[1, 2, 3, 4, 5].map((n) => <i key={n} style={{ background: `var(--hk${n})` }} />)}
                    </div>
                    <div className="uc"><span>satış yok</span><span>{enBuyuk} makina</span></div>
                    <div className="pin-lej">
                      <span><i style={{ background: "#e85d1a" }} />Fabrika</span>
                      <span><i style={{ background: "#2563eb" }} />Bayi</span>
                      <span><i style={{ background: "#16a34a" }} />Servis</span>
                      {/* Hem bayi hem anlaşmalı servis: pin yarı mavi yarı yeşil */}
                      <span><i style={{ background: "linear-gradient(90deg, #2563eb 50%, #16a34a 50%)" }} />İkisi</span>
                    </div>
                  </div>
                  <button type="button" className="harita-tam" onClick={tamEkranAcKapat}
                    title={tamEkran ? "Tam ekrandan çık (ESC)" : "Tam ekran"}>
                    <Icon name={tamEkran ? "close" : "expand"} size={15} />
                  </button>
                  {ipucu && (
                    <div className="harita-ipucu" style={{ left: ipucu.x, top: ipucu.y }}>
                      {ipucu.baslik} <span className={ipucu.vurgu ? "adet" : "alt"}>· {ipucu.alt}</span>
                    </div>
                  )}
                </>
              )}
        </div>
        <aside className="harita-yan">
          {!seciliUlke ? (
            <>
              <div className="harita-yan-bas">Satış yapılan ülkeler ({toplam.ulke})</div>
              <div className="harita-liste">
                {Object.entries(ozet).sort((a, b) => b[1].makina - a[1].makina).map(([ad, v]) => {
                  const kova = kovala(Object.values(ozet).map((x) => x.makina));
                  return (
                    <button key={ad} type="button" className="harita-satir"
                      onClick={() => { setSeciliIl(null); setSeciliUlke(ad); }}>
                      <span className="nokta" style={{ background: `var(--hk${kova(v.makina) + 1})` }} />
                      <span className="ad">{ad}</span>
                      <span className="sy">{v.makina}</span>
                      <span className="ok">›</span>
                    </button>
                  );
                })}
                {!toplam.ulke && <div className="harita-bos">Henüz ülke bilgisi olan bir müşteri kaydı yok.</div>}
              </div>
            </>
          ) : (
            seciliIl ? (
              <IlPaneli il={seciliIl} veri={ilVerisi} firmaKirilim={ilceKirilim} onFirmaSec={onFirmaSec}
                onGeri={() => { setIpucu(null); setSeciliIl(null); }} />
            ) : (
              <UlkePaneli ulke={seciliUlke} ozet={ozet} modul={ulkeModul} eslesmeyen={eslesmeyen}
                firmaKirilim={firmaKirilim} onFirmaSec={onFirmaSec}
                onGeri={() => { setIpucu(null); setSeciliUlke(null); }}
                onIlSec={(il) => { setIpucu(null); setSeciliIl(il); }} />
            )
          )}
        </aside>
      </div>
    </div>
  );
};

const IlKartlari = ({ il, veri, toplamMakina }) => {
  const makina = Object.values(veri.ilceler).reduce((a, b) => a + b, 0) + veri.ilcesiz;
  const enCok = Object.entries(veri.ilceler).sort((a, b) => b[1] - a[1])[0];
  return (
    <>
      <StatCard label="İl" value={il} sub={`${Object.keys(veri.ilceler).length} ilçede satış var`} color="#e85d1a" />
      <StatCard label="Makina" value={makina} color="#8b5cf6"
        sub={toplamMakina ? `Payı: %${Math.round((makina / toplamMakina) * 100)}` : ""} />
      <StatCard label="Satış Yapılan İlçe" value={Object.keys(veri.ilceler).length} color="var(--blu500, #3b82f6)"
        sub={enCok ? `En çok: ${enCok[0]} (${enCok[1]})` : ""} />
      <StatCard label="İlçesi Girilmemiş" value={veri.ilcesiz} sub={veri.ilcesiz ? "Haritada boyanmıyor" : "Hepsi girilmiş"}
        color={veri.ilcesiz ? "var(--amb600, #d97706)" : "var(--grn600, #16a34a)"} />
    </>
  );
};

const IlPaneli = ({ il, veri, firmaKirilim = {}, onGeri, onFirmaSec }) => {
  const ilceler = Object.entries(veri.ilceler).sort((a, b) => b[1] - a[1]);
  const kova = kovala(ilceler.map((x) => x[1]));
  return (
    <>
      <button type="button" className="harita-geri" onClick={onGeri}>← Türkiye</button>
      <div className="harita-yan-bas" style={{ marginTop: 9 }}>{il} — ilçeler ({ilceler.length})</div>
      <div className="harita-liste">
        {ilceler.map(([ad, n]) => (
          <div key={ad} className="harita-sehir-grup">
            <div className="harita-satir" style={{ cursor: "default" }}>
              <span className="nokta" style={{ background: `var(--hk${kova(n) + 1})` }} />
              <span className="ad">{ad}</span>
              <span className="sy">{n}</span>
            </div>
            <FirmaListesi firmalar={firmaKirilim[ad] || []} onFirmaSec={onFirmaSec} />
          </div>
        ))}
        {!ilceler.length && !veri.ilcesiz && <div className="harita-bos">Bu ilde makina kaydı yok.</div>}
        {/* Eski kayıtların çoğunda ilçe yok: sayıları kaybolmasın, kullanıcı zamanla doldursun */}
        {!!veri.ilcesiz && (
          <div className="harita-bos">
            {veri.ilcesiz} makinanın ilçesi girilmemiş, haritada boyanmıyor. Müşteri kaydını
            düzenleyip ilçe seçerseniz burada görünür.
          </div>
        )}
      </div>
    </>
  );
};

const UlkeKartlari = ({ ulke, ozet, toplamMakina, modul }) => {
  const v = ozet[ulke] || { makina: 0, firma: 0, sehirler: {} };
  const enCokSehir = Object.entries(v.sehirler).sort((a, b) => b[1] - a[1])[0];
  const bolgeSayisi = modul ? Object.keys(bolgeToplami(v.sehirler, modul.SEHIR).bolgeler).length : 0;
  return (
    <>
      <StatCard label="Ülke" value={ulke} sub={modul ? `${bolgeSayisi} bölgede satış var` : "yükleniyor…"} color="#e85d1a" />
      <StatCard label="Makina" value={v.makina} color="#8b5cf6"
        sub={toplamMakina ? `Payı: %${Math.round((v.makina / toplamMakina) * 100)}` : ""} />
      <StatCard label="Firma" value={v.firma} sub="Bu ülkede" color="var(--grn600, #16a34a)" />
      <StatCard label="Satış Yapılan Şehir" value={Object.keys(v.sehirler).length} color="var(--blu500, #3b82f6)"
        sub={enCokSehir ? `En çok: ${enCokSehir[0]} (${enCokSehir[1]})` : ""} />
    </>
  );
};

// İlk gösterilecek firma sayısı; üstü "Tümünü gör" ile açılır.
const FIRMA_ON = 5;

// Bir şehrin/ilçenin altındaki firma listesi: makina sayısıyla, ilk 5, sonrası "Tümünü gör".
// Hem şehir (UlkePaneli) hem ilçe (IlPaneli) satırları bunu kullanır. onFirmaSec verilirse
// (ve firmanın id'si varsa) satır tıklanınca o müşterinin detayına gidilir.
const FirmaListesi = ({ firmalar = [], onFirmaSec = null }) => {
  const [hepsi, setHepsi] = useState(false);
  if (!firmalar.length) return null;
  const gosterilen = hepsi ? firmalar : firmalar.slice(0, FIRMA_ON);
  return (
    <div className="harita-firma-liste">
      {gosterilen.map((f) => {
        const ic = (<><span className="fad" title={f.ad}>{f.ad}</span><span className="fsy">{f.adet}</span></>);
        return (onFirmaSec && f.id != null)
          ? <button key={f.ad} type="button" className="harita-firma tikla" onClick={() => onFirmaSec(f.id)} title={`${f.ad} — müşteri kartını aç`}>{ic}</button>
          : <div key={f.ad} className="harita-firma">{ic}</div>;
      })}
      {firmalar.length > FIRMA_ON && (
        <button type="button" className="harita-tumu" onClick={() => setHepsi((h) => !h)}>
          {hepsi ? "Daha az" : `Tümünü gör (${firmalar.length})`}
        </button>
      )}
    </div>
  );
};

const SehirSatiri = ({ ulke, sehir, adet, kova, modul, firmalar, onIlSec, onFirmaSec }) => {
  const i = modul?.SEHIR[sehirAnahtar(sehir)];
  const bolge = i === undefined ? null : modul.BOLGE_ADLARI[i];
  // Bölge adı şehrin tekrarıysa yazma ("Erbil / Erbil ili" gibi)
  const ayni = bolge && (sadeAd(bolge) === sadeAd(sehir) || sadeAd(bolge).startsWith(sadeAd(sehir)));
  // İlçe kırılımı olan iller listeden de açılabilmeli (haritadan zaten açılıyor)
  const acilir = ulke === "Türkiye" && !!ILCELER[sehir] && !!onIlSec;
  const ic = (
    <>
      <span className="nokta" style={{ background: `var(--hk${kova(adet) + 1})` }} />
      <span className="ad">{sehir}{!ayni && bolge ? <span className="bolge"> · {bolge}</span> : null}</span>
      <span className="sy">{adet}</span>
      {acilir && <span className="ok">›</span>}
    </>
  );
  return (
    <div className="harita-sehir-grup">
      {acilir
        ? <button type="button" className="harita-satir" onClick={() => onIlSec(sehir)}>{ic}</button>
        : <div className="harita-satir" style={{ cursor: "default" }}>{ic}</div>}
      <FirmaListesi firmalar={firmalar} onFirmaSec={onFirmaSec} />
    </div>
  );
};

const UlkePaneli = ({ ulke, ozet, modul, eslesmeyen, firmaKirilim = {}, onGeri, onIlSec, onFirmaSec }) => {
  const v = ozet[ulke] || { sehirler: {} };
  const sehirler = Object.entries(v.sehirler).sort((a, b) => b[1] - a[1]);
  const kova = kovala(sehirler.map((s) => s[1]));
  return (
    <>
      {/* Geri düğmesi bu kutunun içinde durur (üst çubukta değil) */}
      <button type="button" className="harita-geri" onClick={onGeri}>← Tüm Dünya</button>
      <div className="harita-yan-bas" style={{ marginTop: 9 }}>{ulke} — şehirler ({sehirler.length})</div>
      <div className="harita-liste">
        {sehirler.map(([ad, n]) => (
          <SehirSatiri key={ad} ulke={ulke} sehir={ad} adet={n} kova={kova} modul={modul}
            firmalar={firmaKirilim[ad] || []} onIlSec={onIlSec} onFirmaSec={onFirmaSec} />
        ))}
        {!!eslesmeyen.length && (
          <div className="harita-bos">
            {eslesmeyen.length} şehir haritada yerine oturmadı, yalnız listede: {eslesmeyen.join(", ")}
          </div>
        )}
      </div>
    </>
  );
};
