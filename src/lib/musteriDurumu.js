// Spec 0106: müşteri satırının makina ve kalıp durumu. Saf modül (R25): React almaz, saat okumaz, veri yazmaz; ekranlar
// yalnız buradan döneni çizer (R27, C4). Pil renkleri tema değişkenlerindendir (R22/3: kontrast testi kayıtları bu dosyayı okur).

// R1: müşteri kaydının `makinaDurumu` alanı. Boş değer "bilinmiyor"dur (R6/2), hiçbir pil çizdirmez.
export const MAKINA_DURUMU = Object.freeze({ MONTAJ: "montaj", HAZIR: "hazir", TESLIM: "teslim" });
export const MAKINA_DURUM_ADLARI = Object.freeze({ montaj: "Montajda", hazir: "Hazır", teslim: "Teslim edildi" });
// R7: kalıbın `kalipDurumu` alanı, müşteri kalıbında ve Extra Kalıp satışında aynı ad. Sıra en geriden en ileriye (R18).
export const KALIP_DURUMU = Object.freeze({ BEKLIYOR: "bekliyor", GONDERILDI: "gonderildi", URETIMDE: "uretimde", HAZIR: "hazir", TESLIM: "teslim" });
export const KALIP_SIRASI = Object.freeze([KALIP_DURUMU.BEKLIYOR, KALIP_DURUMU.GONDERILDI, KALIP_DURUMU.URETIMDE, KALIP_DURUMU.HAZIR, KALIP_DURUMU.TESLIM]);
export const KALIP_DURUM_ADLARI = Object.freeze({ bekliyor: "Sipariş bekliyor", gonderildi: "Sipariş verildi", uretimde: "Üretimde", hazir: "Hazır", teslim: "Teslim edildi" });
export const MAKINA_SECILMEDI = "Seçilmedi";
export const MAKINA_DURUMU_ETIKETI = "Makina durumu";
export const KALIP_DURUMU_ETIKETI = "Kalıp durumu";
export const AYNA_SATIR_IBARESI = "Extra Kalıp satışından";
export const DURUM_SUTUNU = "Durum";
export const TESLIM_SUZGECI = Object.freeze({ deger: "teslim-bekleyen", etiket: "Teslim Bekleyenler" });

// R15, R16, R18, R22: pil metinleri ve renkleri tek yerde (C5: "MAKİNA"; C6: ayraç orta nokta). Makina pilleri Stok rozetlerinin
// token'larıyla birebir aynı (R16/2); kalıp paleti amber / nötr / mavi / teal (R18/2). Yalnız nötr ve teal kenar taşır.
export const PILLER = Object.freeze({
  // Triyaj bulgu 4: borçlu satırın hover zemini de redBg2; ince redBr kenarı pili fare üstündeyken de ayırt ettirir.
  odeme: { metin: "ÖDEME BEKLİYOR", renk: "var(--red700, #b91c1c)", zemin: "var(--redBg2, #fee2e2)", kenar: "var(--redBr, #fecaca)" },
  montaj: { metin: "MONTAJ YAPILIYOR", renk: "var(--pur700, #6d28d9)", zemin: "var(--purBg, #f5f3ff)" },
  makinaHazir: { metin: "MAKİNA HAZIR", renk: "var(--grn700, #15803d)", zemin: "var(--grnBg, #f0fdf4)" },
  bekliyor: { metin: "KALIP SİPARİŞİ BEKLİYOR", renk: "var(--amb700, #b45309)", zemin: "var(--ambBg2, #fef3c7)" },
  gonderildi: { metin: "KALIP SİPARİŞ VERİLDİ", renk: "var(--n600, #475569)", zemin: "var(--n150, #f1f5f9)", kenar: "var(--n200, #e2e8f0)" },
  uretimde: { metin: "KALIP ÜRETİMDE", renk: "var(--blu700, #1d4ed8)", zemin: "var(--bluBg, #eff6ff)" },
  hazir: { metin: "KALIP HAZIR · TESLİM BEKLİYOR", renk: "var(--teal2, #0f766e)", zemin: "var(--tealBg, #f0fdfa)", kenar: "var(--tealBr, #99f6e4)" },
});

const MAKINA_DEGERLERI = Object.values(MAKINA_DURUMU);
const KALIP_DEGERLERI = Object.values(KALIP_DURUMU);
const doluMu = (v) => v != null && v !== "";

// R6/2: okuma kuralı. Tanınmayan ya da boş değer "bilinmiyor" (null); `uretimDurumuOf` çağrılmaz.
export const makinaDurumuOf = (kayit) => (MAKINA_DEGERLERI.includes(kayit?.makinaDurumu) ? kayit.makinaDurumu : null);
const elleKalipDurumu = (k) => (KALIP_DEGERLERI.includes(k?.kalipDurumu) ? k.kalipDurumu : null);

// R4, R10, Karar 40: tek yazıcı. Alan her çağrıda silinir, değer o alanın geçerli değerlerinden biriyse geri yazılır; boş seçenek
// alanı kayıttan siler (0101 `kalipCapiYaz` deseni).
export const durumYaz = (kayit, alan, deger) => {
  const { [alan]: _eski, ...kalan } = kayit || {};
  const gecerli = alan === "makinaDurumu" ? MAKINA_DEGERLERI : KALIP_DEGERLERI;
  return gecerli.includes(deger) ? { ...kalan, [alan]: deger } : kalan;
};

// R9, R26, Karar 31: üretim formu bağının haritası, yalnız canlı formlardan, bir kez. formId → (anahtar → satır).
export const musteriKalipAnahtari = (customerId, i) => `musteri:${customerId}:${i}`;
export const extraKalipAnahtari = (partSaleId) => `extra_kalip:${partSaleId}`;
const satirAnahtari = (r) => {
  if (r?.kaynakTip === "musteri" && r.kaynakId != null && r.kalipIdx != null) return musteriKalipAnahtari(r.kaynakId, r.kalipIdx);
  if (r?.kaynakTip === "extra_kalip" && r.kaynakId != null) return extraKalipAnahtari(r.kaynakId);
  return null;
};
export const uretimFormHaritasi = (uretimFormlari) => {
  const harita = new Map();
  for (const f of Array.isArray(uretimFormlari) ? uretimFormlari : []) {
    if (!f || f.deletedAt || f.id == null) continue;
    const satirlar = new Map();
    for (const r of Array.isArray(f.satirlar) ? f.satirlar : []) {
      const a = satirAnahtari(r);
      if (a) satirlar.set(a, r);
    }
    harita.set(String(f.id), satirlar);
  }
  return harita;
};

// R8, R8/2: türetme yalnız kaydın kendi işaretlerini okur. Form ya da satır bulunamazsa `gonderildi` (Karar 17).
export const kalipDurumuTuret = (k, anahtar, harita) => {
  if (doluMu(k?.uretimFormId)) {
    const satir = harita?.get(String(k.uretimFormId))?.get(anahtar);
    if (!satir) return KALIP_DURUMU.GONDERILDI;
    return satir.tamamlandi ? KALIP_DURUMU.HAZIR : KALIP_DURUMU.URETIMDE;
  }
  return k?.uretimFormGonder ? KALIP_DURUMU.GONDERILDI : KALIP_DURUMU.BEKLIYOR;
};
// R10: alan doluysa yazılan değer kazanır.
export const kalipDurumuOf = (k, anahtar, harita) => elleKalipDurumu(k) || kalipDurumuTuret(k, anahtar, harita);
// R10, Karar 8: seçicinin ilk seçeneği.
export const otomatikEtiket = (turetilen) => `Otomatik (${KALIP_DURUM_ADLARI[turetilen] || ""})`;
export const makinaSecenekleri = () => [{ value: "", label: MAKINA_SECILMEDI }, ...MAKINA_DEGERLERI.map(v => ({ value: v, label: MAKINA_DURUM_ADLARI[v] }))];
export const kalipSecenekleri = (turetilen) => [{ value: "", label: otomatikEtiket(turetilen) }, ...KALIP_SIRASI.map(v => ({ value: v, label: KALIP_DURUM_ADLARI[v] }))];

// C7: canlı Extra Kalıp satışları müşteri kimliğine göre bir kez gruplanır.
export const extraKalipGrupla = (partSales) => {
  const g = new Map();
  for (const ps of Array.isArray(partSales) ? partSales : []) {
    if (!ps || ps.deletedAt || ps.tur !== "Kalıp" || ps.customerId == null) continue;
    const k = String(ps.customerId);
    if (!g.has(k)) g.set(k, []);
    g.get(k).push(ps);
  }
  return g;
};
// R7/2, R17/2: `partSaleId` taşıyan satır bir Extra Kalıp satışının aynasıdır.
export const aynaSatirMi = (k) => k?.partSaleId != null;
// R7/2, R11/2: ayna satırın durumu bağlı satıştan okunur; satış bulunamazsa null.
export const aynaDurumu = (k, musteri, grup, harita) => {
  const ps = (grup?.get(String(musteri?.id)) || []).find(p => String(p.id) === String(k?.partSaleId));
  return ps ? kalipDurumuOf(ps, extraKalipAnahtari(ps.id), harita) : null;
};

// R17, R17/2: küme = ayna olmayan müşteri kalıpları + o kayda bağlı canlı Extra Kalıp satışları. Dönüş: durum listesi.
export const kalipKumesi = (musteri, grup, harita) => {
  const kendi = (Array.isArray(musteri?.kaliplar) ? musteri.kaliplar : [])
    .map((k, i) => (aynaSatirMi(k) ? null : kalipDurumuOf(k, musteriKalipAnahtari(musteri.id, i), harita)))
    .filter(Boolean);
  const extra = (grup?.get(String(musteri?.id)) || []).map(ps => kalipDurumuOf(ps, extraKalipAnahtari(ps.id), harita));
  return [...kendi, ...extra];
};

// R16: makina pili. `teslim` ve boş pil çizdirmez.
export const makinaPili = (kayit) => {
  const d = makinaDurumuOf(kayit);
  if (d === MAKINA_DURUMU.MONTAJ) return PILLER.montaj;
  if (d === MAKINA_DURUMU.HAZIR) return PILLER.makinaHazir;
  return null;
};
// R18–R21/2: gösterilebilir durumların en geri kalmışı; `bekliyor` yalnız makina durumu doluyken (teslim dahil) gösterilir;
// sayı "o durumdaki / kümenin toplamı" (payda bastırılanları da sayar), tek kalıplı kümede sayı yok.
export const kalipPili = (durumlar, makinaDurumuDolu) => {
  const liste = Array.isArray(durumlar) ? durumlar : [];
  const gosterilebilir = liste.filter(d => d !== KALIP_DURUMU.TESLIM && (d !== KALIP_DURUMU.BEKLIYOR || makinaDurumuDolu));
  if (!gosterilebilir.length) return null;
  const enGeri = KALIP_SIRASI.find(d => gosterilebilir.includes(d));
  const pil = PILLER[enGeri];
  const sayi = liste.filter(d => d === enGeri).length;
  return { ...pil, durum: enGeri, metin: liste.length > 1 ? `${pil.metin} ${sayi}/${liste.length}` : pil.metin };
};
export const odemePili = (borclu) => (borclu ? PILLER.odeme : null);

// R14, R23, Karar 36: satırın bütün durumu tek çağrıda. Hücre, süzgeç ölçütü ve süzgeç sayısı bunu okur.
export const satirDurumu = (musteri, { harita, grup, borclu = false } = {}) => {
  const makina = makinaDurumuOf(musteri);
  const durumlar = kalipKumesi(musteri, grup, harita);
  const piller = [odemePili(borclu), makinaPili(musteri), kalipPili(durumlar, makina != null)].filter(Boolean);
  return { piller, teslimBekliyor: makina === MAKINA_DURUMU.HAZIR || durumlar.includes(KALIP_DURUMU.HAZIR) };
};
// R23: süzgeç ölçütü (makina hazır ya da en az bir kalıp hazır).
export const teslimBekliyorMu = (musteri, baglam) => satirDurumu(musteri, baglam).teslimBekliyor;
