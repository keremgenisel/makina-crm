import { Field, Input, Select, Btn, Icon, TutarInput } from "./ui";
import { HataMetni, Ipucu, BolumBasligi, Segment } from "./tasarim";
import { MalzemeSatiriAlani } from "./MalzemeSatiriAlani";
import { KIP_ADLARI, KIP_ELLE } from "../lib/parcaFiyati";
import { MALIYET_KALEM_SINIRI } from "../lib/maliyetKalemleri";
import {
  MALIYET_ETIKETI, MALIYET_IPUCU, maliyetMetniKurus, KAYNAK_ELLE, KAYNAK_ICERIK, kalemKaynakMetni, SET_PASIF_NEDENI,
  tedarikciAdiCoz, islemTedarikciSecenekleri, bosMalzemeKalemi, bosIslemKalemi,
  KALEM_SINIRI_NEDENI, ISLEM_ZAM_IBARESI, KARMA_TARIH_IBARESI, MALZEME_GECMIS_IBARESI, KALEM_BOS_METNI, ESKI_KATALOG_KALEMI_NEDENI, MALZEME_KATALOG_BOS_NEDENI,
  KALEM_TOPLAM_ETIKETI, KALEM_BOLUM_BASLIGI, KALEM_SET_PASIF_NEDENI,
  MALIYET_PARA_BIRIMLERI, MALIYET_PB_ETIKETI, maliyetKurEtiketi, GUNUN_KURU_DUGMESI, gununKuruIpucu, pbDegisimi, kurAlaniDurumu, dovizMaliyetMetni,
  ISLEM_TUTAR_ETIKETI, LIRA_KARSILIGI_ETIKETI, elleMaliyetNedeni, TANINMAYAN_PB_EKI,
  MALIYET_KIP, ALIM_ISLEM, alimIslemSatirBasligi, alimIslemErisilebilirAd, elleKipIpucu, TASIMA_NOTU,
} from "../lib/urunAgaci";
import { KUR_KAYNAK, kurGirdisi } from "../lib/doviz";
import { CUR_SYM } from "../lib/constants"; // bileşenler kur ilkellerini doviz.js üzerinden alır (0153 taraması)

// Spec 0157 R1, R2, R2/2, R2/4, R6, R8, P5 (AC-1, AC-3–AC-5, AC-13, AC-48, AC-50): para birimi seçici ve kur alanı; elle maliyet ve
// işlem kalemi aynı bileşeni çizer. Kur düz metin alanıdır (tutar girdisi noktayı binlik sayar, C3/2). Kararlar saf yardımcılardan
// (`pbDegisimi`, `kurAlaniDurumu`); bileşen yalnız gösterir. `onDegis(yama)` formun ilgili alanlarına yazar.
export const DovizAlani = ({ pb = "", kur = "", kurKaynak = KUR_KAYNAK.ELLE, onDegis, kurHata = null, rates = null, ratesErr = false, etiketEki = "", disabled = false, pbHata = null, neden = null }) => {
  const durum = kurAlaniDurumu(pb, kur, kurKaynak, rates, ratesErr);
  const pbSec = (y) => onDegis({ pb: y, ...(pbDegisimi(pb, y, rates, ratesErr) || {}) });
  return (
    <div data-testid="doviz-alani" style={{ display: "grid", gridTemplateColumns: durum ? "1fr 1.4fr" : "1fr", gap: 8 }}>
      <Field label={MALIYET_PB_ETIKETI}>
        <Select value={pb || "TRY"} onChange={e => pbSec(e.target.value === "TRY" ? "" : e.target.value)} aria-label={`${MALIYET_PB_ETIKETI}${etiketEki}`} disabled={disabled}>
          {MALIYET_PARA_BIRIMLERI.map(x => <option key={x} value={x}>{x === "TRY" ? "TL" : x}</option>)}
          {/* Triyaj (bulgu 2): kayıttaki tanınmayan değer seçicide kendi ekiyle görünür (TL sanılıp kaydedilmesin). */}
          {pb && !MALIYET_PARA_BIRIMLERI.includes(pb) && <option value={pb}>{`${pb}${TANINMAYAN_PB_EKI}`}</option>}
        </Select>
        <HataMetni>{pbHata || ""}</HataMetni>
        {neden && !pbHata && <div data-testid="elle-maliyet-nedeni" role="note" style={{ fontSize: 12, color: "var(--amb800, #92400e)", marginTop: 2 }}>{neden}</div>}
      </Field>
      {durum && (
        <Field label={maliyetKurEtiketi(pb)}>
          <Input value={kur} inputMode="decimal" onChange={e => onDegis({ kur: e.target.value, kurKaynak: KUR_KAYNAK.ELLE })} placeholder="Girilmedi" aria-label={`Kur${etiketEki}`} disabled={disabled} />
          <HataMetni>{kurHata || ""}</HataMetni>
          {durum.oneri != null && (
            <div data-testid="gunun-kuru" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--n600, #475569)", marginTop: 2 }}>
              <span>{gununKuruIpucu(durum.oneri)}</span>
              <Btn small variant="ghost" onClick={() => onDegis({ kur: kurGirdisi(durum.oneri), kurKaynak: KUR_KAYNAK.ONERI })} disabled={disabled}>{GUNUN_KURU_DUGMESI}</Btn>
            </div>
          )}
          {durum.neden && <div data-testid="kur-oneri-nedeni" style={{ fontSize: 12, color: "var(--n600, #475569)", marginTop: 2 }}>{durum.neden}</div>}
          {durum.sapma && <div data-testid="kur-sapma-uyarisi" role="note" style={{ fontSize: 12, color: "var(--amb800, #92400e)", marginTop: 2 }}>{durum.sapma}</div>}
        </Field>
      )}
    </div>
  );
};

// Spec 0135 R1–R6/2 (Karar 30): maliyet kipi saklanmaz, kayıttan türer (C3); seçici 0133'ün "Fiyat kipi" seçicisinin ikizidir.
// Adlar tek sabit kümesinden: "Elle sabit" 0133'ün adıdır (ikinci kez yazılmaz), "Hesapla" bu spec'indir.
export const MALIYET_KIPI_ETIKETI = "Maliyet kipi";
// Spec 0159 P9: kip değerleri motorda tek sabit (`MALIYET_KIP`); saf kip kuralı bileşeni içe alamaz. Adlar burada aynen kalır.
export const MALIYET_KIP_HESAPLA = MALIYET_KIP.HESAPLA;
export const MALIYET_KIP_ELLE = MALIYET_KIP.ELLE;
export const MALIYET_KIP_ADLARI = { [MALIYET_KIP_ELLE]: KIP_ADLARI[KIP_ELLE], [MALIYET_KIP_HESAPLA]: "Hesapla" };
export const KIP_SET_PASIF_NEDENI = "Set içeriği dolu: maliyet bileşenlerden gelir; maliyet kipi seçilmez.";
export const KIP_ONAY_ELLE = "Elle sabit kipine geçilince maliyet kalemleri listeden kalkar.";
const FIELDSET_STILI = { border: 0, padding: 0, margin: 0, minWidth: 0 };

// R17, R17/2, R18–R21 (AC-32–AC-40, AC-101): işlem kalemi. Ad ve tutar herkese görünür; tedarikçi seçicisi yalnız gider
// yetkisiyle (R21), bütün canlı tedarikçiler, hammadde işaretliler başta; kaydın kendi tedarikçisinin adı ham diziden ibareyle.
// Tutar düz metin alanıdır (belirsiz sayı reddedilsin, R19/2; binlik ayracı yazan tutar girdisi "2.400"ü 2400'e çevirirdi).
const IslemSatiri = ({ satir, setSatir, sira, tedarikciler = [], giderYetki, hatalar = {}, uyari = null, ozet = null, onKaldir, rates = null, ratesErr = false }) => {
  const set = (alan, v) => setSatir({ ...satir, [alan]: v });
  const secenekler = islemTedarikciSecenekleri(tedarikciler);
  const id = String(satir.tedarikciId ?? "");
  const kayitliDisi = id && !secenekler.some(t => String(t.id) === id);
  return (
    <div data-testid="islem-kalemi" style={{ border: "1px solid var(--n200, #e2e8f0)", borderRadius: 10, padding: "10px 12px", display: "grid", gap: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--n600, #475569)" }}>{alimIslemSatirBasligi(sira)}</span>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Spec 0157 R12/3 (AC-59): döviz kalem kendi tutarını, kurunu ve lira karşılığını yazar. */}
          <b data-testid="kalem-tutar" style={{ fontSize: 13, color: "var(--blu700, #1d4ed8)" }}>{ozet?.tutarK == null ? "—"
            : ozet.dovizTutarK != null ? dovizMaliyetMetni(ozet.dovizTutarK / 100, ozet.paraBirimi, ozet.kur, ozet.tutarK) : maliyetMetniKurus(ozet.tutarK)}</b>
          <Btn small variant="danger" title="Kalemi kaldır" aria-label={alimIslemErisilebilirAd("kaldir", sira)} onClick={onKaldir}><Icon name="trash" size={12} /></Btn>
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: giderYetki ? "2fr 2fr 1fr" : "2fr 1fr", gap: 12 }}>
        <Field label={ALIM_ISLEM.AD_ETIKETI}>
          <Input value={satir.ad ?? ""} onChange={e => set("ad", e.target.value)} placeholder={ALIM_ISLEM.YER_TUTUCU} aria-label={alimIslemErisilebilirAd("ad", sira)} />
          <HataMetni>{hatalar.ad}</HataMetni>
        </Field>
        {giderYetki && (
          <Field label={ALIM_ISLEM.TEDARIKCI_ETIKETI}>
            <Select value={id} onChange={e => set("tedarikciId", e.target.value)} aria-label={alimIslemErisilebilirAd("tedarikci", sira)}>
              <option value="">Tedarikçi seçilmedi (kendi işimiz)</option>
              {kayitliDisi && <option value={id}>{tedarikciAdiCoz(id, tedarikciler)}</option>}
              {secenekler.map(t => <option key={t.id} value={String(t.id)}>{t.ad}</option>)}
            </Select>
          </Field>
        )}
        <Field label={ISLEM_TUTAR_ETIKETI}>
          <Input value={satir.tutar ?? ""} inputMode="decimal" onChange={e => set("tutar", e.target.value)} placeholder="Girilmedi" aria-label={alimIslemErisilebilirAd("tutar", sira)} />
          <HataMetni>{hatalar.tutar}</HataMetni>
        </Field>
      </div>
      <div style={{ maxWidth: 420 }}>
        <DovizAlani pb={satir.paraBirimi || ""} kur={satir.kur || ""} kurKaynak={satir._kurKaynak} kurHata={hatalar.kur} rates={rates} ratesErr={ratesErr} etiketEki={` ${sira}`}
          onDegis={(y) => setSatir({ ...satir, ...(y.pb !== undefined ? { paraBirimi: y.pb } : {}), ...(y.kur !== undefined ? { kur: y.kur } : {}), ...(y.kurKaynak ? { _kurKaynak: y.kurKaynak } : {}) })} />
      </div>
      {ozet?.neden && <div data-testid="islem-kur-nedeni" style={{ fontSize: 12, color: "var(--amb800, #92400e)" }}>{ozet.neden}</div>}
      {satir._eskiKatalog && String(satir.tutar ?? "").trim() === "" && (
        <div data-testid="eski-katalog-kalemi" role="note" style={{ fontSize: 12, color: "var(--amb800, #92400e)" }}>{ESKI_KATALOG_KALEMI_NEDENI}</div>
      )}
      {uyari && <div data-testid="islem-tutar-uyarisi" style={{ fontSize: 12, color: "var(--amb800, #92400e)" }}>{uyari}</div>}
    </div>
  );
};

// R7–R11, R20/2, R35/2, R39, R40–R43: kalem listesi, boş durum, iki ekleme düğmesi, toplam ve koşullu üç ibare. Toplam ve satır
// tutarları ebeveynin tek canlı özetinden (`ozet`, `urunAgaci.formKalemOzeti`); bu bileşen çarpım ve toplama yapmaz (C2).
export const MaliyetKalemleriAlani = ({
  kip, onKip, kalemler = [], setKalemler, elleDeger, setElleDeger, elleHata = null,
  // Spec 0157: elle maliyetin para birimi ve kuru (formun alanları), kur hatası, canlı lira karşılığı ve günün kuru.
  ellePb = "", elleKur = "", elleKurKaynak = KUR_KAYNAK.ELLE, setElleDoviz = null, elleKurHata = null, ellePbHata = null, elleK = null, rates = null, ratesErr = false,
  // Triyaj (bulgu 2, R19/2): kayıttaki elle maliyetin nedeni (kuru girilmemiş döviz ya da tanınmayan para birimi); yalnız düzenlemede.
  kayitNedeni = null,
  // Spec 0159 R3/4, R3/5, P5, P6: Hesapla'dan taşımadan sonra elle alanın altındaki not ve kuru eksik dövizin nedeni (geçici form durumu).
  tasimaNotu = false, tasimaNedeni = null,
  malzemeler = [], hamMalzemeler = [], tedarikciler = [], giderYetki = false, hatalar = {}, uyarilar = {}, ozet = null, set = false, kaynak = null,
}) => {
  const hesapla = kip === MALIYET_KIP_HESAPLA;
  const sinirda = kalemler.length >= MALIYET_KALEM_SINIRI; // R9: giriş kuralı
  const katalogBos = malzemeler.length === 0;
  const guncelle = (i, v) => setKalemler(kalemler.map((k, j) => (j === i ? v : k)));
  const kaldir = (i) => setKalemler(kalemler.filter((_, j) => j !== i));
  const malzemeSayi = kalemler.filter(k => k.tur === "malzeme").length;
  const islemSayi = kalemler.length - malzemeSayi;
  let malzemeSira = 0, islemSira = 0;
  return (
    <div data-testid="maliyet-bolumu" style={{ marginBottom: 12 }}>
      <BolumBasligi>{MALIYET_ETIKETI}</BolumBasligi>
      <div style={{ marginBottom: 6 }} data-testid="maliyet-kipi">
        <Segment kip="radyo" genislik="icerik" ariaLabel={MALIYET_KIPI_ETIKETI} value={kip} onChange={onKip} disabled={set}
          options={[{ value: MALIYET_KIP_ELLE, label: MALIYET_KIP_ADLARI[MALIYET_KIP_ELLE] }, { value: MALIYET_KIP_HESAPLA, label: MALIYET_KIP_ADLARI[MALIYET_KIP_HESAPLA] }]} />
        {set && <div data-testid="kip-set-pasif" style={{ fontSize: 12, color: "var(--n600, #475569)", marginTop: 4 }}>{KIP_SET_PASIF_NEDENI}</div>}
      </div>
      {kaynak && <div data-testid="maliyet-kaynagi" style={{ fontSize: 12, color: "var(--n500, #64748b)", marginBottom: 4 }}>
        {kaynak.tur === "icerik" ? KAYNAK_ICERIK : kaynak.tur === "kalem" ? kalemKaynakMetni(kaynak) : KAYNAK_ELLE}</div>}
      {!hesapla ? (
        <div data-testid="elle-maliyet" style={{ maxWidth: 420 }}>
          <Field label="Elle girilen maliyet">
            <TutarInput value={set ? "" : elleDeger ?? ""} onChange={setElleDeger} placeholder="Girilmedi" invalid={!!elleHata && !set} ariaLabel="Alış maliyeti" disabled={set} sym={CUR_SYM[ellePb] || "₺"} />
            <HataMetni>{!set ? elleHata || "" : ""}</HataMetni>
            <Ipucu>{set ? SET_PASIF_NEDENI : MALIYET_IPUCU}</Ipucu>
          </Field>
          {!set && setElleDoviz && <DovizAlani pb={ellePb} kur={elleKur} kurKaynak={elleKurKaynak} kurHata={elleKurHata} rates={rates} ratesErr={ratesErr}
            etiketEki=" (alış maliyeti)" onDegis={setElleDoviz} pbHata={ellePbHata} neden={elleMaliyetNedeni(ellePb, "-") || tasimaNedeni || kayitNedeni} />}
          {!set && tasimaNotu && <div data-testid="tasima-notu" role="note" style={{ fontSize: 12, color: "var(--n600, #475569)", marginTop: 4 }}>{TASIMA_NOTU}</div>}
          {/* Spec 0159 R4, R4/2 (AC-1, AC-35): hangi kipe geçileceğini söyleyen ipucu; kip adı sabit kümesinden, set doluyken yok. */}
          {!set && <div data-testid="elle-kip-ipucu"><Ipucu>{elleKipIpucu(MALIYET_KIP_ADLARI[MALIYET_KIP_HESAPLA])}</Ipucu></div>}
          {/* R12 (AC-17): döviz maliyette lira karşılığı her zaman yazar (formun tek canlı sonucundan). */}
          {!set && ellePb && <div data-testid="elle-lira-karsiligi" style={{ fontSize: 12.5, color: "var(--n700, #334155)", marginTop: 2 }}>
            {LIRA_KARSILIGI_ETIKETI}: <b>{elleK == null ? "girilmedi" : maliyetMetniKurus(elleK)}</b></div>}
        </div>
      ) : (
        <fieldset disabled={set} style={FIELDSET_STILI} data-testid="kalem-listesi">
          <BolumBasligi>{KALEM_BOLUM_BASLIGI}</BolumBasligi>
          {set && <div data-testid="kalem-set-pasif" style={{ fontSize: 12, color: "var(--n600, #475569)", marginBottom: 6 }}>{KALEM_SET_PASIF_NEDENI}</div>}
          {kalemler.length === 0 ? (
            <div data-testid="kalem-bos" style={{ fontSize: 12.5, color: "var(--n500, #64748b)", padding: "4px 0 8px" }}>{KALEM_BOS_METNI}</div>
          ) : (
            <div style={{ display: "grid", gap: 8, marginBottom: 8 }}>
              {kalemler.map((k, i) => (k.tur === "malzeme"
                ? <MalzemeSatiriAlani key={k._anahtar || i} satir={k} setSatir={v => guncelle(i, v)} sira={++malzemeSira} malzemeler={malzemeler} hamMalzemeler={hamMalzemeler}
                    hatalar={hatalar[k._anahtar ?? `#${i}`] || {}} ozet={ozet?.satirlar?.[i] || null} onKaldir={() => kaldir(i)} />
                : <IslemSatiri key={k._anahtar || i} satir={k} setSatir={v => guncelle(i, v)} sira={++islemSira} tedarikciler={tedarikciler} giderYetki={giderYetki} rates={rates} ratesErr={ratesErr}
                    hatalar={hatalar[k._anahtar ?? `#${i}`] || {}} uyari={uyarilar[i] || null} ozet={ozet?.satirlar?.[i] || null} onKaldir={() => kaldir(i)} />))}
            </div>
          )}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <Btn small variant="ghost" disabled={sinirda || katalogBos} onClick={() => setKalemler([...kalemler, bosMalzemeKalemi()])}><Icon name="plus" size={12} /> Malzeme ekle</Btn>
            <Btn small variant="ghost" disabled={sinirda} onClick={() => setKalemler([...kalemler, bosIslemKalemi()])}><Icon name="plus" size={12} /> {ALIM_ISLEM.EKLE}</Btn>
          </div>
          {katalogBos && !sinirda && <div data-testid="malzeme-katalog-bos" style={{ fontSize: 12, color: "var(--n600, #475569)", marginTop: 4 }}>{MALZEME_KATALOG_BOS_NEDENI}</div>}
          {sinirda && <div data-testid="kalem-sinir" style={{ fontSize: 12, color: "var(--n600, #475569)", marginTop: 4 }}>{KALEM_SINIRI_NEDENI}</div>}
          {kalemler.length > 0 && (
            <div data-testid="kalem-toplam" style={{ marginTop: 8, background: "var(--n100, #f8fafc)", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 12, padding: "12px 14px", fontSize: 13,
              display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
              <span style={{ fontWeight: 600 }}>{KALEM_TOPLAM_ETIKETI}</span>
              <b data-testid="kalem-toplam-tutar" style={{ color: "var(--blu700, #1d4ed8)" }}>{ozet?.toplamK == null ? "girilmedi" : maliyetMetniKurus(ozet.toplamK)}</b>
            </div>
          )}
          {islemSayi > 0 && <div data-testid="kalem-zam-ibaresi"><Ipucu>{ISLEM_ZAM_IBARESI}</Ipucu></div>}
          {islemSayi > 0 && malzemeSayi > 0 && <div data-testid="kalem-karma-ibaresi"><Ipucu>{KARMA_TARIH_IBARESI}</Ipucu></div>}
          {malzemeSayi > 0 && <div data-testid="kalem-gecmis-ibaresi"><Ipucu>{MALZEME_GECMIS_IBARESI}</Ipucu></div>}
        </fieldset>
      )}
    </div>
  );
};
