import { Field, Input, Select, Btn, Icon, TutarInput } from "./ui";
import { HataMetni, Ipucu, BolumBasligi, Segment } from "./tasarim";
import { MalzemeSatiriAlani } from "./MalzemeSatiriAlani";
import { KIP_ADLARI, KIP_ELLE } from "../lib/parcaFiyati";
import { EMNIYET_PAYI_ETIKETI, EMNIYET_PAYI_IPUCU } from "../lib/malzeme";
import { MALIYET_KALEM_SINIRI } from "../lib/maliyetKalemleri";
import {
  MALIYET_ETIKETI, MALIYET_IPUCU, maliyetMetniKurus, KAYNAK_ELLE, KAYNAK_ICERIK, kalemKaynakMetni, SET_PASIF_NEDENI,
  tedarikciAdiCoz, islemTedarikciSecenekleri, bosMalzemeKalemi, bosIslemKalemi,
  KALEM_SINIRI_NEDENI, ISLEM_ZAM_IBARESI, KARMA_TARIH_IBARESI, MALZEME_GECMIS_IBARESI, KALEM_BOS_METNI, ESKI_KATALOG_KALEMI_NEDENI, MALZEME_KATALOG_BOS_NEDENI,
  KALEM_TOPLAM_ETIKETI, KALEM_BOLUM_BASLIGI, KALEM_SET_PASIF_NEDENI,
} from "../lib/urunAgaci";

// Spec 0135 R1–R6/2 (Karar 30): maliyet kipi saklanmaz, kayıttan türer (C3); seçici 0133'ün "Fiyat kipi" seçicisinin ikizidir.
// Adlar tek sabit kümesinden: "Elle sabit" 0133'ün adıdır (ikinci kez yazılmaz), "Hesapla" bu spec'indir.
export const MALIYET_KIPI_ETIKETI = "Maliyet kipi";
export const MALIYET_KIP_HESAPLA = "hesapla";
export const MALIYET_KIP_ELLE = "elle";
export const MALIYET_KIP_ADLARI = { [MALIYET_KIP_ELLE]: KIP_ADLARI[KIP_ELLE], [MALIYET_KIP_HESAPLA]: "Hesapla" };
export const KIP_SET_PASIF_NEDENI = "Set içeriği dolu: maliyet bileşenlerden gelir; maliyet kipi seçilmez.";
export const KIP_ONAY_ELLE = "Elle sabit kipine geçilince maliyet kalemleri listeden kalkar.";
export const KIP_ONAY_HESAPLA = "Hesapla kipine geçilince elle girilen maliyet temizlenir.";
const FIELDSET_STILI = { border: 0, padding: 0, margin: 0, minWidth: 0 };

// R6, R6/2 (Karar 42): emniyet payı kipten bağımsız, kip seçicisinin altında; set doluyken pasif.
const PayAlani = ({ deger, setDeger, hata }) => (
  <div style={{ maxWidth: 260 }} data-testid="emniyet-payi-alani">
    <Field label={EMNIYET_PAYI_ETIKETI}>
      <Input value={deger ?? ""} onChange={e => setDeger(e.target.value)} placeholder="Malzemedeki pay" aria-label="Parça emniyet payı" />
      <HataMetni>{hata}</HataMetni>
      <Ipucu>{EMNIYET_PAYI_IPUCU}</Ipucu>
    </Field>
  </div>
);

// R17, R17/2, R18–R21 (AC-32–AC-40, AC-101): işlem kalemi. Ad ve tutar herkese görünür; tedarikçi seçicisi yalnız gider
// yetkisiyle (R21), bütün canlı tedarikçiler, hammadde işaretliler başta; kaydın kendi tedarikçisinin adı ham diziden ibareyle.
// Tutar düz metin alanıdır (belirsiz sayı reddedilsin, R19/2; binlik ayracı yazan tutar girdisi "2.400"ü 2400'e çevirirdi).
const IslemSatiri = ({ satir, setSatir, sira, tedarikciler = [], giderYetki, hatalar = {}, uyari = null, ozet = null, onKaldir }) => {
  const set = (alan, v) => setSatir({ ...satir, [alan]: v });
  const secenekler = islemTedarikciSecenekleri(tedarikciler);
  const id = String(satir.tedarikciId ?? "");
  const kayitliDisi = id && !secenekler.some(t => String(t.id) === id);
  return (
    <div data-testid="islem-kalemi" style={{ border: "1px solid var(--n200, #e2e8f0)", borderRadius: 10, padding: "10px 12px", display: "grid", gap: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--n600, #475569)" }}>{`İşlem kalemi ${sira}`}</span>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <b data-testid="kalem-tutar" style={{ fontSize: 13, color: "var(--blu700, #1d4ed8)" }}>{ozet?.tutarK == null ? "—" : maliyetMetniKurus(ozet.tutarK)}</b>
          <Btn small variant="danger" title="Kalemi kaldır" aria-label={`İşlem kalemini kaldır ${sira}`} onClick={onKaldir}><Icon name="trash" size={12} /></Btn>
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: giderYetki ? "2fr 2fr 1fr" : "2fr 1fr", gap: 12 }}>
        <Field label="İşlem adı">
          <Input value={satir.ad ?? ""} onChange={e => set("ad", e.target.value)} placeholder="Örn: Lazer kesim" aria-label={`İşlem adı ${sira}`} />
          <HataMetni>{hatalar.ad}</HataMetni>
        </Field>
        {giderYetki && (
          <Field label="Tedarikçi">
            <Select value={id} onChange={e => set("tedarikciId", e.target.value)} aria-label={`İşlem tedarikçisi ${sira}`}>
              <option value="">Tedarikçi seçilmedi (kendi işimiz)</option>
              {kayitliDisi && <option value={id}>{tedarikciAdiCoz(id, tedarikciler)}</option>}
              {secenekler.map(t => <option key={t.id} value={String(t.id)}>{t.ad}</option>)}
            </Select>
          </Field>
        )}
        <Field label="Tutar (TL, KDV hariç)">
          <Input value={satir.tutar ?? ""} inputMode="decimal" onChange={e => set("tutar", e.target.value)} placeholder="Girilmedi" aria-label={`İşlem tutarı ${sira}`} />
          <HataMetni>{hatalar.tutar}</HataMetni>
        </Field>
      </div>
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
  kip, onKip, kalemler = [], setKalemler, elleDeger, setElleDeger, elleHata = null, emniyetPayi, setEmniyetPayi, payHata = null,
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
      <fieldset disabled={set} style={FIELDSET_STILI}>
        {setEmniyetPayi && <PayAlani deger={emniyetPayi} setDeger={setEmniyetPayi} hata={payHata} />}
      </fieldset>
      {kaynak && <div data-testid="maliyet-kaynagi" style={{ fontSize: 12, color: "var(--n500, #64748b)", marginBottom: 4 }}>
        {kaynak.tur === "icerik" ? KAYNAK_ICERIK : kaynak.tur === "kalem" ? kalemKaynakMetni(kaynak) : KAYNAK_ELLE}</div>}
      {!hesapla ? (
        <div data-testid="elle-maliyet" style={{ maxWidth: 360 }}>
          <Field label="Elle girilen maliyet">
            <TutarInput value={set ? "" : elleDeger ?? ""} onChange={setElleDeger} placeholder="Girilmedi" invalid={!!elleHata && !set} ariaLabel="Alış maliyeti" disabled={set} />
            <HataMetni>{!set ? elleHata || "" : ""}</HataMetni>
            <Ipucu>{set ? SET_PASIF_NEDENI : MALIYET_IPUCU}</Ipucu>
          </Field>
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
                : <IslemSatiri key={k._anahtar || i} satir={k} setSatir={v => guncelle(i, v)} sira={++islemSira} tedarikciler={tedarikciler} giderYetki={giderYetki}
                    hatalar={hatalar[k._anahtar ?? `#${i}`] || {}} uyari={uyarilar[i] || null} ozet={ozet?.satirlar?.[i] || null} onKaldir={() => kaldir(i)} />))}
            </div>
          )}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <Btn small variant="ghost" disabled={sinirda || katalogBos} onClick={() => setKalemler([...kalemler, bosMalzemeKalemi()])}><Icon name="plus" size={12} /> Malzeme ekle</Btn>
            <Btn small variant="ghost" disabled={sinirda} onClick={() => setKalemler([...kalemler, bosIslemKalemi()])}><Icon name="plus" size={12} /> İşlem ekle</Btn>
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
