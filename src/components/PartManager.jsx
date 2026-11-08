import { useState, useMemo } from "react";
import { parcaAdi, parseMoney, fmtCur } from "../lib/utils";
import { CUR_SYM, tipRenk } from "../lib/constants";
import { Icon, Field, Input, MoneyInput, TutarInput, Btn, Modal, ConfirmDialog, Pagination, ImageUpload, Select, SearchPick } from "./ui";
import { HataMetni, Ipucu, UyariSeridi, BolumBasligi, Segment } from "./tasarim";
import { malzemeKatalogu, malzemeOzeti, malzemeSatiriDogrula, malzemeSatiriFormu, malzemeSatiriVar, KAYNAK_MALZEME, MALZEME_ELLE_IPUCU, emniyetPayiDogrula, sayiMetni } from "../lib/malzeme";
import { MalzemeSatiriAlani } from "./MalzemeSatiriAlani";
import { FiyatListesiDugmesi } from "./rapor/FiyatListesiDugmesi";
import { logAction } from "../lib/audit";
import {
  fiyatBaglamiKur, fiyatKipiOf, maliyeteBagliMi, parcaSatisFiyati, turetilmisFiyat, turetilmisFiyatSayisi, katDogrula, katMetni, kipYaz,
  topluKipOzeti, topluKipMetni, maliyetsizUyariMetni, katsizUyariMetni, TOPLU_KAT_YOK_NEDENI, farkMetni, setFiyatOkuyucu, KIP_MALIYET, KIP_ELLE, KIP_ADLARI, DOVIZ_NOTU, ZARAR_UYARISI,
} from "../lib/parcaFiyati";
import { kalipAdDeseni, parcaKalipIsiMi, PARCA_TIP_IPUCU } from "../lib/kalipTamiri";
import { kilitRedMesaji } from "../lib/kilitAlanlari";
import { MALIYET_ETIKETI, MALIYET_IPUCU, KIT_ADET_IPUCU, KITTEN_DUSECEK_IPUCU, maliyetGirildiMi, parcaMaliyetDogrula,
  kitAdediDogrula, kitAdetMetni, parcaKitAdetleri, parcaKitPlani, kitleriGuncelle, isaretsizKitteMetni,
  parcaMaliyetKurus, parcaMaliyetMetni, elleMaliyetMetni, maliyetKaynagi, KAYNAK_ELLE, kaynakListeMetni, KAYNAK_KIRILIM, kirilimdanGeliyorMetni, maliyetMetniKurus,
  HAMMADDE_BOS_METNI, HAMMADDE_BOLUM_BASLIGI, HAMMADDE_IPUCU, HAMMADDE_TUTARSIZ_UYARI, HAMMADDE_TOPLAM_ETIKETI, hammaddeToplamSayisi, HAMMADDE_TOPLAM_HATALI, hammaddeTedarikciAdi, hammaddeSecilebilirMi,
  hammaddeFormu, hammaddeDogrula, maliyetGecmisiYaz, gecmisliKayit, maliyetGecmisiSatirlari, GECERLILIK_ETIKETI, GECERLILIK_IPUCU, GECMIS_BASLIGI,
  setKatalogu, setMi, setOzeti, parcaKullanimi, parcaKullanimMetni, setKullanimAdlari, setIcerigiDogrula, setIcerigiFormu, setBilesenAdi, setBilesenAdaylari, setEksikMetni, setFiyatsizMetni,
  SET_BOLUM_BASLIGI, SET_BOS_METNI, SET_IPUCU, SET_BILESEN_ARA, SET_TOPLAM_ETIKETI, SET_FIYAT_ETIKETI, SET_FIYAT_DUGMESI,
  KAYNAK_ICERIK, SET_PASIF_NEDENI } from "../lib/urunAgaci";
import { useBugun } from "../hooks/useBugun";
import { SetRozeti } from "./stock/SetRozeti";
import { useSimpleDefList } from "../hooks/useSimpleDefList";
import { useFilteredList } from "../hooks/useFilteredList";

const PER_PAGE = 10;
const FIELDSET_STILI = { border: 0, padding: 0, margin: 0, minWidth: 0 };

// PartManager içinde tanımlanırsa her render'da yeni bir component referansı oluşur ve React
// içindeki input'ları unmount/remount eder — bu da her tuşa basışta focus kaybına yol açar
const PriceFields = ({ value, onChange }) => (
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
    <MoneyInput value={value.fiyatTRY} sym={CUR_SYM.TRY} onChange={v => onChange({ ...value, fiyatTRY: v })} />
    <MoneyInput value={value.fiyatUSD} sym={CUR_SYM.USD} onChange={v => onChange({ ...value, fiyatUSD: v })} />
    <MoneyInput value={value.fiyatEUR} sym={CUR_SYM.EUR} onChange={v => onChange({ ...value, fiyatEUR: v })} />
  </div>
);

// Spec 0133 R1–R3, R12/2, R13, R14, R7/3 (AC-2, AC-28, AC-32, AC-87, AC-88, Karar 37): parça kartının fiyat bölümü. Kip seçici;
// maliyete bağlı kipte TL alanı pasiftir ve türetilmiş değeri gösterir (değer kayda yazılmaz, R13/2), altında neden ya da elle
// girilen ile türetilenin farkı; parçanın kâr katı ve zarar uyarısı; döviz alanları elle kalır ve nedeni tek sabittir.
export const FIYAT_KIPI_ETIKETI = "Fiyat kipi";
export const KAT_ETIKETI = "Parçanın kâr katı";
const FiyatAlani = ({ value, onChange, turetilen = null, eskiTL = null, varsayilanKat = null, katHata = null }) => {
  const kip = value.fiyatKipi === KIP_MALIYET ? KIP_MALIYET : KIP_ELLE;
  const kat = katDogrula(value.karKati);
  return (
    <div data-testid="fiyat-bolumu">
      <div style={{ marginBottom: 6 }}>
        <Segment kip="radyo" genislik="icerik" ariaLabel={FIYAT_KIPI_ETIKETI} value={kip} onChange={v => onChange({ ...value, fiyatKipi: v === KIP_MALIYET ? KIP_MALIYET : "" })}
          options={[{ value: KIP_ELLE, label: KIP_ADLARI[KIP_ELLE] }, { value: KIP_MALIYET, label: KIP_ADLARI[KIP_MALIYET] }]} />
      </div>
      {kip === KIP_ELLE ? <PriceFields value={value} onChange={onChange} /> : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
            <Input value={turetilen?.fiyatK == null ? "" : `${turetilmisFiyatSayisi(turetilen.fiyatK / 100)} ${CUR_SYM.TRY}`} disabled readOnly aria-label="TL fiyatı (türetilen)" placeholder="—" />
            <MoneyInput value={value.fiyatUSD} sym={CUR_SYM.USD} onChange={v => onChange({ ...value, fiyatUSD: v })} />
            <MoneyInput value={value.fiyatEUR} sym={CUR_SYM.EUR} onChange={v => onChange({ ...value, fiyatEUR: v })} />
          </div>
          {turetilen?.neden && <div data-testid="fiyat-neden" style={{ fontSize: 12, color: "var(--amb800, #92400e)", marginTop: 4 }}>{turetilen.neden}</div>}
          {turetilen?.fiyatK != null && Number(eskiTL) > 0 && Math.round(Number(eskiTL) * 100) !== turetilen.fiyatK &&
            <div data-testid="fiyat-fark" style={{ fontSize: 12, color: "var(--n600, #475569)", marginTop: 4 }}>{farkMetni(turetilmisFiyatSayisi(Number(eskiTL)), `${turetilmisFiyatSayisi(turetilen.fiyatK / 100)} ₺`)}</div>}
          <div data-testid="doviz-notu"><Ipucu>{DOVIZ_NOTU}</Ipucu></div>
          <div style={{ maxWidth: 260, marginTop: 6 }}>
            <Field label={KAT_ETIKETI}>
              <Input value={value.karKati ?? ""} onChange={e => onChange({ ...value, karKati: e.target.value })} aria-label={KAT_ETIKETI}
                placeholder={varsayilanKat != null ? `Varsayılan: ${katMetni(varsayilanKat)}` : "Varsayılan girilmedi"} />
              <HataMetni>{katHata}</HataMetni>
            </Field>
          </div>
          {!kat.hata && (kat.zarar || (kat.bos && varsayilanKat != null && varsayilanKat < 1)) && <UyariSeridi aile="uyari" testId="kat-zarar">{ZARAR_UYARISI}</UyariSeridi>}
        </>
      )}
    </div>
  );
};

const ModelChips = ({ selected = [], allModels = [], onChange }) => (
  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
    {allModels.length === 0 && (
      <span style={{ fontSize: 12, color: "var(--n400, #94a3b8)" }}>Henüz makina modeli tanımlanmamış.</span>
    )}
    {allModels.map(m => {
      const name = typeof m === "string" ? m : m.model;
      const active = selected.includes(name);
      return (
        <button key={name} type="button" onClick={() => onChange(active ? selected.filter(x => x !== name) : [...selected, name])}
          style={{
            padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "1px solid",
            background: active ? "var(--ambBg3, #fff7ed)" : "var(--n100, #f8fafc)",
            borderColor: active ? "#fb923c" : "var(--n200, #e2e8f0)",
            color: active ? "var(--orTx, #c2410c)" : "var(--n500, #64748b)",
          }}>
          {name}
        </button>
      );
    })}
  </div>
);

const ModelBadges = ({ models = [] }) => {
  if (!models.length) return <span style={{ color: "var(--n300, #cbd5e1)", fontSize: 12 }}>—</span>;
  const show = models.slice(0, 3);
  const rest = models.length - show.length;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
      {show.map(m => (
        <span key={m} style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 10, background: "var(--ambBg3, #fff7ed)", color: "var(--orTx, #c2410c)", border: "1px solid var(--ambBr3, #fed7aa)" }}>{m}</span>
      ))}
      {rest > 0 && <span style={{ fontSize: 11, color: "var(--n400, #94a3b8)" }}>+{rest}</span>}
    </div>
  );
};

// Spec 0087 R1, R3, R14: TL alış maliyeti (KDV hariç), kuruşlu `TutarInput`; hata kayıt öncesinde alanın altında.
// Spec 0096 R21: kırılımda tutar varken alan çizilir ama pasiftir ve nedenini yazar (`kirilimK`); R9: kaynak ibaresi (`kaynak`).
// Spec 0099 R7, R8, R9: kırılımın toplamı yetkili kullanıcıda hammadde satırlarının altında yazar; burada rakamlı satır yalnız
// kırılım bölümünü görmeyen (gider yetkisi olmayan) kullanıcıya kalır. Kaynak ibaresi iki kullanıcı türü için tek, sayısız metin.
// Spec 0121 R8, Karar 42: içerik doluyken (`set`) alan pasif ve nedenlidir; saklı elle değer kayıtta kalır.
const MaliyetAlani = ({ value, onChange, hata, kirilimK = null, kaynak = null, giderYetki = false, set = null, malzeme = null }) => {
  // Spec 0132 R9/2, Karar 33: malzeme satırı doluyken elle alan pasif; kayıttaki değer durur ama okunmaz (ipucu söyler).
  const pasif = kirilimK != null || !!set || !!malzeme;
  return (
    <Field label={MALIYET_ETIKETI}>
      {/* Pasifken eski elle değer gösterilmez (kayıtta R7 gereği silinecek; "kırılımdan geliyor" satırıyla çelişmesin). */}
      <TutarInput value={pasif ? "" : value ?? ""} onChange={onChange} placeholder="Girilmedi" invalid={!!hata && !pasif} ariaLabel="Alış maliyeti" disabled={pasif} />
      <HataMetni>{!pasif ? hata || "" : ""}</HataMetni>
      {kirilimK != null && !giderYetki && <div data-testid="maliyet-kirilimdan" style={{ fontSize: 12, fontWeight: 600, color: "var(--blu700, #1d4ed8)", marginTop: 4 }}>{kirilimdanGeliyorMetni(kirilimK)}</div>}
      {kaynak && <div data-testid="maliyet-kaynagi" style={{ fontSize: 12, color: "var(--n500, #64748b)", marginTop: 2 }}>{kaynak.tur === "icerik" ? KAYNAK_ICERIK : kaynak.tur === "malzeme" ? KAYNAK_MALZEME : kaynak.tur === "kirilim" ? KAYNAK_KIRILIM : KAYNAK_ELLE}</div>}
      <Ipucu>{set ? SET_PASIF_NEDENI : malzeme ? MALZEME_ELLE_IPUCU : MALIYET_IPUCU}</Ipucu>
    </Field>
  );
};
// Spec 0097 R5, R5/3: geçerlilik tarihi yalnız düzenlemede ve kırılımlı parçada da ETKİN (pasif maliyet alanının komşusu);
// gider yetkisi istemez. `elle` bayrağı (R7/2) kullanıcının alanı değiştirip değiştirmediğidir, kayda yazılmaz.
const GecerlilikAlani = ({ tarih, setTarih, hata }) => (
  <Field label={GECERLILIK_ETIKETI}>
    <Input type="date" aria-label={GECERLILIK_ETIKETI} value={tarih.deger} onChange={e => setTarih({ deger: e.target.value, elle: true })} />
    <HataMetni>{hata || ""}</HataMetni>
    <Ipucu>{GECERLILIK_IPUCU}</Ipucu>
  </Field>
);
// R8, R8/2, R8/3 (AC-16, AC-17, AC-43): salt okunur geçmiş, en yeni üstte; boşken bölüm çizilmez. Kayıttan okunur (form değil).
const MaliyetGecmisi = ({ parca }) => {
  const satirlar = maliyetGecmisiSatirlari(parca);
  if (!satirlar.length) return null;
  return (
    <div data-testid="maliyet-gecmisi" style={{ marginBottom: 12 }}>
      <BolumBasligi>{GECMIS_BASLIGI}</BolumBasligi>
      <div style={{ display: "grid", gap: 2, maxWidth: 360 }}>
        {satirlar.map((r, i) => (
          <div key={`${r.gecerli}-${i}`} data-testid="maliyet-gecmisi-satiri" style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13, padding: "3px 0", borderBottom: "1px solid var(--n150, #f1f5f9)" }}>
            <span style={{ color: "var(--n600, #475569)" }}>{r.tarihMetni}</span>
            <span style={{ fontWeight: 600 }}>{r.tutarMetni}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Spec 0096 R3–R4/2, R8, R11, R12, R17/2, R23: parçanın hammadde tedarikçisi satırları. Seçici yalnız hammadde işaretli canlı
// tedarikçileri listeler (bir parçada bir kez); satırın kendi tedarikçisinin adı HAM diziden çözülür (çöpteki / bulunamayan).
// Satırlar form biçimindedir (tutar metin); kayıt `hammaddeDogrula`'dan geçer. Parça kartı tedarikçi kaydına yazmaz (C7).
// Spec 0099 R2–R6, R15, R16, C1/2: `toplam` ebeveynin `formMaliyeti` sonucudur (kırılım kuruşu ve kaynağın tedarikçi sayısı);
// bölüm maliyeti yeniden okumaz ve toplamaz. Kutu yalnız maliyet kırılımdan geliyorken, "Tedarikçi ekle"den bağımsız çizilir;
// hatalı satır ibaresi bölümün zaten yaptığı doğrulamanın sonucundan canlı okunur (R16/2).
const HammaddeAlani = ({ satirlar = [], setSatirlar, tedarikciler = [], hatalar = {}, toplam = null }) => {
  const secilebilir = tedarikciler.filter(hammaddeSecilebilirMi);
  const secili = new Set(satirlar.map(s => String(s.tedarikciId)).filter(Boolean));
  const kalan = secilebilir.filter(t => !secili.has(String(t.id)));
  const dogrulama = hammaddeDogrula(satirlar);
  const tutarsiz = dogrulama.tutarsizVar;
  const guncelle = (i, alan, deger) => setSatirlar(satirlar.map((s, j) => (j === i ? { ...s, [alan]: deger } : s)));
  return (
    <div data-testid="hammadde-bolumu" style={{ marginTop: 4, marginBottom: 12 }}>
      <BolumBasligi>{HAMMADDE_BOLUM_BASLIGI}</BolumBasligi>
      {secilebilir.length === 0 && satirlar.length === 0 ? (
        <div data-testid="hammadde-bos" style={{ fontSize: 12.5, color: "var(--n500, #64748b)", padding: "6px 0" }}>{HAMMADDE_BOS_METNI}</div>
      ) : (<>
        <div style={{ display: "grid", gap: 6 }}>
          {satirlar.map((s, i) => {
            const id = String(s.tedarikciId ?? "");
            const secenekler = secilebilir.filter(t => String(t.id) === id || !secili.has(String(t.id)));
            const kayitliDisi = id && !secenekler.some(t => String(t.id) === id);
            return (
              <div key={i} data-testid="hammadde-satiri">
                <div style={{ display: "grid", gridTemplateColumns: "minmax(160px, 2fr) minmax(120px, 1fr) auto", gap: 8, alignItems: "center" }}>
                  <Select aria-label={`Hammadde tedarikçisi ${i + 1}`} value={id} onChange={e => guncelle(i, "tedarikciId", e.target.value)}>
                    <option value="">Tedarikçi seçin…</option>
                    {kayitliDisi && <option value={id}>{hammaddeTedarikciAdi(id, tedarikciler)}</option>}
                    {secenekler.map(t => <option key={t.id} value={String(t.id)}>{t.ad}</option>)}
                  </Select>
                  <TutarInput value={s.tutar ?? ""} onChange={v => guncelle(i, "tutar", v)} placeholder="Tutar girilmedi" invalid={!!hatalar[i]} ariaLabel={`Hammadde tutarı ${i + 1}`} />
                  <Btn small variant="ghost" title="Satırı sil" onClick={() => setSatirlar(satirlar.filter((_, j) => j !== i))}><Icon name="trash" size={12} /></Btn>
                </div>
                <HataMetni>{hatalar[i] || ""}</HataMetni>
              </div>
            );
          })}
        </div>
        {kalan.length > 0 && (
          <div style={{ marginTop: 6 }}>
            <Btn small variant="ghost" onClick={() => setSatirlar([...satirlar, { tedarikciId: "", tutar: "" }])}><Icon name="plus" size={12} /> Tedarikçi ekle</Btn>
          </div>
        )}
        {toplam?.kirilimK != null && (
          // Görünüm gider formunun `normal-ozet` kutusunun yakın kopyası (Karar 5, sözlükte bilinen borç); tutarın mavisi eski
          // rakamlı satırdan. Parçalar ayrı öğe, aralarında metin düğümü yok (R4/3).
          <div data-testid="hammadde-toplam" style={{ marginTop: 8, background: "var(--n100, #f8fafc)", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 12, padding: "12px 14px", fontSize: 13 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 600 }}>{HAMMADDE_TOPLAM_ETIKETI}</span>
              <span style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <span style={{ color: "var(--n500, #64748b)" }}>{hammaddeToplamSayisi(toplam.kaynak.n)}</span>
                <b style={{ color: "var(--blu700, #1d4ed8)" }}>{maliyetMetniKurus(toplam.kirilimK)}</b>
              </span>
            </div>
            {!dogrulama.gecerli && <div data-testid="hammadde-toplam-hatali" style={{ fontSize: 12, color: "var(--n600, #475569)", marginTop: 4 }}>{HAMMADDE_TOPLAM_HATALI}</div>}
          </div>
        )}
        {tutarsiz && <div style={{ marginTop: 6 }}><UyariSeridi aile="uyari" testId="hammadde-tutarsiz">{HAMMADDE_TUTARSIZ_UYARI}</UyariSeridi></div>}
        <Ipucu>{HAMMADDE_IPUCU}</Ipucu>
      </>)}
    </div>
  );
};
// Spec 0121 R2, R2/2, R2/3, R3–R6/2, R11, R11/2, R12: setin içeriği bölümü. Satırlar form biçimindedir (kimlik ve adet metin),
// adlar HAM diziden çözülür (çöpteki / bulunamayan), seçici canlı ve içeriği boş parçaları listeler (kendisi hariç). Toplamlar
// ebeveynin tek `formMaliyeti` sonucundan (`ozet`) gelir; bölüm toplama yazmaz (0099 AC-26).
// Spec 0133 R22, AC-70: maliyete bağlı kipte "TL fiyatı toplamına eşitle" pasiftir ve nedenini yazar.
export const SET_FIYAT_MALIYET_NEDENI = "Fiyat maliyetten türüyor; toplam elle sabit kipte fiyata yazılabilir.";
const SetIcerigiAlani = ({ satirlar = [], setSatirlar, kendiId = null, parts = [], hamParts = [], hatalar = {}, genel = null, ozet = null, onFiyat, fiyatPasif = false }) => {
  // Spec 0122 R2/2, R6: adaylar tek kuraldan (içerikte olan parça listelenmez); tıklama satırı adet "1" ile hemen ekler.
  const adaylar = setBilesenAdaylari(parts, kendiId, satirlar);
  const guncelle = (i, deger) => setSatirlar(satirlar.map((s, j) => (j === i ? { ...s, miktar: deger } : s)));
  return (
    <div data-testid="set-icerigi" style={{ marginTop: 4, marginBottom: 12 }}>
      <BolumBasligi>{SET_BOLUM_BASLIGI}</BolumBasligi>
      {satirlar.length === 0 ? (
        <div data-testid="set-icerigi-bos" style={{ fontSize: 12.5, color: "var(--n500, #64748b)", padding: "4px 0 8px" }}>{SET_BOS_METNI}</div>
      ) : (
        <div style={{ display: "grid", gap: 6, marginBottom: 8 }}>
          {satirlar.map((s, i) => (
            <div key={`${s.partId}-${i}`} data-testid="set-bilesen-satiri">
              <div style={{ display: "grid", gridTemplateColumns: "minmax(160px, 2fr) 96px auto", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{setBilesenAdi(s.partId, hamParts)}</span>
                <Input value={s.miktar ?? ""} inputMode="numeric" aria-label={`Bileşen adedi ${i + 1}`} placeholder="Adet" onChange={e => guncelle(i, e.target.value)} />
                <Btn small variant="ghost" title="Bileşeni kaldır" aria-label={`Bileşeni kaldır ${i + 1}`} onClick={() => setSatirlar(satirlar.filter((_, j) => j !== i))}><Icon name="trash" size={12} /></Btn>
              </div>
              <HataMetni>{hatalar[i] || ""}</HataMetni>
            </div>
          ))}
        </div>
      )}
      {/* Spec 0122 R1/3, R5/2: tam genişlik, sabit konum (önünde koşullu öğe yok; SearchPick yazılmış metni iç durumunda tutar). */}
      <div>
        <SearchPick items={adaylar} getLabel={p => p.ad} getKey={p => p.id} placeholder={SET_BILESEN_ARA}
          onPick={p => setSatirlar([...satirlar, { partId: String(p.id), miktar: "1" }])} />
      </div>
      {genel && <div style={{ marginTop: 6 }}><UyariSeridi aile="hata" testId="set-icerigi-genel">{genel}</UyariSeridi></div>}
      {ozet && (
        <div data-testid="set-toplam" style={{ marginTop: 8, padding: "8px 10px", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 8, background: "var(--n100, #f8fafc)", display: "grid", gap: 4, fontSize: 13 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <span style={{ fontWeight: 600 }}>{SET_TOPLAM_ETIKETI}</span>
            <b data-testid="set-toplam-maliyet" style={{ color: "var(--blu700, #1d4ed8)" }}>{maliyetMetniKurus(ozet.maliyetK)}</b>
          </div>
          {ozet.eksik > 0 && <div data-testid="set-eksik" style={{ fontSize: 12, color: "var(--amb800, #92400e)" }}>{setEksikMetni(ozet.eksik)}</div>}
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
            <span>{SET_FIYAT_ETIKETI}: <b data-testid="set-fiyat-toplami">{fmtCur(ozet.fiyatToplam, "TRY")}</b></span>
            <Btn small variant="ghost" onClick={onFiyat} disabled={fiyatPasif || !(ozet.fiyatToplam > 0)}>{SET_FIYAT_DUGMESI}</Btn>
          </div>
          {fiyatPasif && <div data-testid="set-fiyat-pasif" style={{ fontSize: 12, color: "var(--n600, #475569)" }}>{SET_FIYAT_MALIYET_NEDENI}</div>}
          {ozet.fiyatsiz > 0 && <div data-testid="set-fiyatsiz" style={{ fontSize: 12, color: "var(--n600, #475569)" }}>{setFiyatsizMetni(ozet.fiyatsiz)}</div>}
        </div>
      )}
      <Ipucu>{SET_IPUCU}</Ipucu>
    </div>
  );
};

// Spec 0087 R5, R7 (plan P7, P8): işaretli canlı modeller için "Model · Adet" satırları. Adet makina kitine yazılır, boşsa
// yalnız işaret kalır. Bu düzenlemede işareti kaldırılan ve kitinde bu parça olan model için ipucu (onay penceresi yok).
// Triyaj (bulgu 1): ipucu yalnız GERÇEKTEN düşecek modellere çıkar, yani kayıttaki işaretten (`eskiModeller`) bu düzenlemede
// kaldırılan ve kitinde bu parça olan modellere (urunAgaci.kitleriGuncelle'nin kuralı). İşareti hiç olmayan ama kitinde bu parça
// olan model (0087 öncesi yeniden adlandırılmış modellerde olur) ayrı bilgi satırıdır; kayıt o kite dokunmaz.
const ModelAdetleri = ({ selected = [], allModels = [], adetler, setAdetler, hatalar = {}, kittekiler = {}, eskiModeller = [] }) => {
  const isaretli = allModels.map(m => (typeof m === "string" ? m : m.model)).filter(ad => selected.includes(ad));
  const canli = (ad) => allModels.some(m => (typeof m === "string" ? m : m.model) === ad);
  const dusecek = Object.keys(kittekiler).filter(ad => !selected.includes(ad) && eskiModeller.includes(ad) && canli(ad));
  const isaretsizKitte = Object.keys(kittekiler).filter(ad => !selected.includes(ad) && !eskiModeller.includes(ad) && canli(ad));
  if (!isaretli.length && !dusecek.length && !isaretsizKitte.length) return null;
  return (
    <div data-testid="model-adetleri" style={{ marginTop: 8, display: "grid", gap: 6 }}>
      {isaretli.map(ad => {
        const deger = adetler[ad] ?? "";
        return (
          <div key={ad} style={{ display: "grid", gridTemplateColumns: "minmax(120px, 1fr) 96px minmax(120px, 2fr)", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{ad}</span>
            <Input value={deger} inputMode="decimal" aria-label={`${ad} adedi`} placeholder="Adet"
              onChange={e => setAdetler(p => ({ ...p, [ad]: e.target.value }))} />
            <div style={{ fontSize: 12, color: "var(--n400, #94a3b8)" }}>
              {hatalar[ad] ? <HataMetni>{hatalar[ad]}</HataMetni> : (String(deger).trim() === "" ? "kitte yok" : "makina kitinde")}
            </div>
          </div>
        );
      })}
      {dusecek.map(ad => <Ipucu key={ad}>{`${ad}: ${KITTEN_DUSECEK_IPUCU}`}</Ipucu>)}
      {isaretsizKitte.map(ad => <Ipucu key={ad}>{isaretsizKitteMetni(ad, kittekiler[ad])}</Ipucu>)}
      <Ipucu>{KIT_ADET_IPUCU}</Ipucu>
    </div>
  );
};

// Spec 0115 R6, R6/2: tipi kalıp işi olmayan, adı kalıp revize desenine uyan parçada ipucu (engel değil). Koşul ad desenini
// tek kaynağından (kalipAdDeseni) okur; burada ad araması yazılmaz (C14).
const KalipTipIpucu = ({ kayit, partTypeDefs }) => (kalipAdDeseni(kayit?.ad) && !parcaKalipIsiMi(kayit, partTypeDefs)
  ? <div data-testid="parca-kalip-tip-ipucu"><Ipucu>{PARCA_TIP_IPUCU}</Ipucu></div> : null);

// Parça tipi seçici — tipler kullanıcı-tanımlı partTypeDefs listesinden gelir.
const TipSelector = ({ value, onChange, partTypeDefs = [] }) => (
  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
    {partTypeDefs.map(t => {
      const active = (value || "Standart") === t.ad;
      const c = tipRenk(t.ad, partTypeDefs);
      return (
        <button key={t.id} type="button" onClick={() => onChange(t.ad)}
          style={{ padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer",
            border: `1px solid ${active ? c.border : "var(--n200, #e2e8f0)"}`,
            background: active ? c.bg : "var(--n100, #f8fafc)",
            color: active ? c.color : "var(--n400, #94a3b8)" }}>
          {t.ad}
        </button>
      );
    })}
  </div>
);

// Spec 0087 R15/1: panel iki model dizisini (canlı) ve yazıcılarını alır; kit yazımı yalnız urunAgaci'nden geçer (AC-19).
// `baskasiKilitli` Settings'in canlı kilit listesidir (R16).
// Spec 0096 R17, R17/2, C11: `tedarikciler` HAM dizidir ve Settings'te gider yetkisiyle kapatılarak gelir; `giderYetki` yoksa
// hammadde bölümü, süzgeç ve tedarikçi adları hiç çizilmez (kırılım formda taşınır ve aynen geri yazılır, R17/3).
export const SUZGEC_TUMU = "";
export const SUZGEC_GIRILMEMIS = "__girilmemis__";
export const SUZGEC_BOS_METNI = "Bu süzgece uyan parça yok.";
export const PartManager = ({ parts = [], setParts, showToast = () => {}, setServices = null, standardModels = [], customModels = [],
  setStandardModels = null, setCustomModels = null, partTypeDefs = [], baskasiKilitli = null, rawCustomModels = null, tedarikciler = [], giderYetki = false, rawParts = null, baslangicArama = "",
  // Spec 0132 C1/2: canlı malzeme listesi; harita bir kez kurulur ve tek okuma yolunun dördüncü parametresi olur. `rawMalzemeler`
  // yalnız seçili ama çöpteki malzemenin adını çözmek içindir.
  malzemeler = [], rawMalzemeler = null,
  // Spec 0133 R6, R8, Karar 32: uygulama ayarının fiyat alt nesnesi; bağlam bir kez kurulur.
  fiyatAyarlari = null,
  // Triyaj (bulgu 2, 4): işlem geçmişi istemcide sunucuya gitsin; fiyat listesi firma bilgisiyle basılsın.
  serverPermissions = null, factory = null }) => {
  const allModels = [...standardModels, ...customModels];
  // Spec 0121 R6/2 (AC-40): ad çözümü ham diziden; verilmezse canlı diziye düşülür. R9/2: katalog canlı parçalardan, bir kez.
  const hamParts = Array.isArray(rawParts) && rawParts.length ? rawParts : parts; // verilmemiş ya da boş ham dizi canlıya düşer
  const katalog = useMemo(() => setKatalogu(parts), [parts]);
  const malzemeKat = useMemo(() => malzemeKatalogu(malzemeler), [malzemeler]);
  const fiyatBaglami = useMemo(() => fiyatBaglamiKur({ parts, malzemeler, fiyatAyarlari }), [parts, malzemeler, fiyatAyarlari]);
  const emptyForm = { ad: "", adEN: "", kod: "", tanim: "", tanimEN: "", fiyatTRY: "", fiyatUSD: "", fiyatEUR: "", models: [], tip: "Standart", resim: "", maliyet: "", hammaddeler: [], setIcerigi: [], malzemeSatiri: malzemeSatiriFormu(null), emniyetPayi: "", fiyatKipi: "", karKati: "" };
  // Spec 0087 R4, C4 (plan P4): maliyetin ham metni kayıtta sayıya çevrilir; boşsa alan gövdeye hiç yazılmaz.
  // Spec 0096 R7, R7/2, C12: kırılım da HER çağrıda ayrıştırılır (düzenleme `{ ...x, ...editForm }` birleştirmesidir; boşaltılan
  // kırılım eski kayıttan geri gelmesin) ve yalnız doluyken yazılır; kırılımda tutar varsa `maliyet` anahtarı her çağrıda silinir.
  // Spec 0121 R7: içerik de HER çağrıda yeniden kurulur ve yalnız doluyken yazılır (boşaltılan içerik eski kayıttan geri gelmesin).
  const hazirlaTemel = (kayit) => {
    const { maliyet, hammaddeler, maliyetGecmisi: _formKopyasi, setIcerigi, malzemeSatiri, emniyetPayi, fiyatKipi, karKati, ...geri } = kayit;
    // Spec 0133 R13/2, R1/2 (AC-79, AC-80): kip ve parçanın katı HER çağrıda silinir, yalnız dolu değerle yazılır (elle sabit kip
    // değer olarak saklanmaz). Kat yalnız maliyete bağlı kipte anlamlıdır.
    const kipMaliyet = fiyatKipi === KIP_MALIYET;
    const kat = kipMaliyet ? katDogrula(karKati).deger : null;
    // Spec 0134 Karar 28, C4: emniyet payı her çağrıda yeniden kurulur ve yalnız doluyken yazılır (boş değer gövdeye girmez, AC-58).
    const pay = emniyetPayiDogrula(emniyetPayi).deger;
    // Spec 0132 Karar 28: malzeme satırı her çağrıda yeniden kurulur (boşaltılan satır eski kayıttan geri gelmesin); yalnız doluyken.
    // Doğrulayıcı form (metin) ve kayıt (sayı) biçimini aynı okur.
    const ms = malzemeSatiriDogrula(malzemeSatiri).kayit;
    const kirilim = hammaddeDogrula(hammaddeler).kayit;
    const kirilimli = kirilim.some(h => h.tutar != null);
    const d = parcaMaliyetDogrula(maliyet);
    const icerik = setIcerigiDogrula(setIcerigi).kayit;
    return { ...geri, ...(kirilimli || d.bos || d.hata ? {} : { maliyet: d.deger }), ...(kirilim.length ? { hammaddeler: kirilim } : {}), ...(icerik.length ? { setIcerigi: icerik } : {}), ...(ms ? { malzemeSatiri: ms } : {}), ...(pay != null ? { emniyetPayi: pay } : {}), ...(kipMaliyet ? { fiyatKipi: KIP_MALIYET } : {}), ...(kat != null ? { karKati: kat } : {}) };
  };
  // Spec 0097 R4, C13, C13/2 (tuzak 2, 3, 9): formdan gelen geçmiş kopyası atılır; geçmiş güncelleyicinin içindeki ESKİ kayıttan
  // (`eski`) ve yeni kaydın ÇÖZÜLMÜŞ maliyetinden (kırılım toplamı dahil) tek karar motoruyla yazılır. Tarih ve bugün `ek` ile
  // kaydın başında bir kez çözülmüş gelir; bu fonksiyon saat okumaz. Yeni parçada (`eski` yok) geçmiş yazılmaz (R5/2).
  // Triyaj (bulgu 4): karar hata dönerse kayıt hiç değişmez (eski kayıt aynen döner).
  // Spec 0133 R13/2 (AC-79): maliyete bağlı kipte TL fiyat alanı formdan OKUNMAZ; kayıttaki değer aynen korunur (pasif alanın
  // gösterdiği türetilmiş değer gövdeye sızmaz). Yeni parçada formun boş değeri kalır.
  const tlKoru = (temel, eski) => {
    if (!maliyeteBagliMi(temel) || !eski) return temel;
    const { fiyatTRY: _f, ...geri } = temel;
    return "fiyatTRY" in eski ? { ...geri, fiyatTRY: eski.fiyatTRY } : geri;
  };
  const hazirla = (kayit, eski = null, ek = null) => gecmisliKayit(tlKoru(hazirlaTemel(kayit), eski), eski, ek) ?? eski;
  const { form, setForm, editId, editForm, setEditForm, confirmDel, add, startEdit, cancelEdit, saveEdit, requestDelete, cancelDelete, confirmDelete } =
    useSimpleDefList({
      items: parts,
      setItems: setParts,
      genId: () => Date.now(),
      showToast,
      emptyForm,
      addMsg: "Yedek parça tanımı kaydedildi.",
      editMsg: "Yedek parça düzenlendi.",
      deleteMsg: "Yedek parça tanımı silindi.",
      hazirla,
      onRename: (oldAd, newAd) => setServices?.(p => p.map(s =>
        Array.isArray(s.degisenParcalar) && s.degisenParcalar.some(x => parcaAdi(x) === oldAd)
          ? { ...s, degisenParcalar: s.degisenParcalar.map(x => parcaAdi(x) === oldAd ? (typeof x === "string" ? newAd : { ...x, ad: newAd }) : x) }
          : s
      )),
    });
  // Spec 0123 R1, R3/4, R3/6 (Karar 22, 37, 39): onay açıldığında bir kez; harita HAM diziden (çöpteki setler de sayılsın),
  // kit sayısı canlı model dizilerinden. Ekran sayım yazmaz, cümle `parcaKullanimMetni`'nden.
  const silmeKullanimi = useMemo(() => {
    if (!confirmDel) return "";
    const k = parcaKullanimi(confirmDel.id, { parts: hamParts, modelDizileri: [standardModels, customModels] });
    return parcaKullanimMetni({ setAdlari: setKullanimAdlari(confirmDel.id, hamParts), kit: k.kit });
  }, [confirmDel, hamParts, standardModels, customModels]);
  const [addOpen, setAddOpen] = useState(false);
  // Spec 0096 R10, R10/2, R22, C14: tedarikçi süzgeci (gider yetkisiyle). Seçenek kümesi canlı parçaların kırılımında geçen
  // tedarikçiler (sayılı) ve "girilmemiş"; sayfa sıfırlaması süzgeci yazan fonksiyonda (kancanın imzası değişmez).
  const [suzgec, setSuzgecRaw] = useState(SUZGEC_TUMU);
  // Spec 0133 R4, R4/3 (AC-30): fiyat kipi süzgeci (üç seçenek, Segment); tedarikçi süzgeciyle birlikte uygulanır.
  const [kipSuzgec, setKipSuzgecRaw] = useState("tumu");
  const suzgecFn = (p) => {
    if (kipSuzgec !== "tumu" && fiyatKipiOf(p) !== kipSuzgec) return false;
    if (!giderYetki || suzgec === SUZGEC_TUMU) return true;
    const h = p.hammaddeler || [];
    if (suzgec === SUZGEC_GIRILMEMIS) return h.length === 0;
    return h.some(x => String(x.tedarikciId) === suzgec);
  };
  const { search, setSearch, page, setPage, filtered, paged } = useFilteredList(parts, { searchFields: ["ad"], filterFn: suzgecFn, perPage: PER_PAGE, baslangicArama }); // spec 0125 R5/2
  const setSuzgec = (v) => { setSuzgecRaw(v); setPage(1); };
  const setKipSuzgec = (v) => { setKipSuzgecRaw(v); setPage(1); };
  const kipSayisi = (k) => parts.filter(p => fiyatKipiOf(p) === k).length;
  // Spec 0133 R4/2, X10 (AC-29, AC-49, AC-77, Karar 34, 35): toplu kip değiştirme süzgeçten geçen listenin BÜTÜNÜNDE (sayfaya bakmaz,
  // satır seçimi yok). Onay sayıları yazar; maliyetsiz parçalar sayılır ama işlem yine uygulanabilir (AC-50).
  const [topluKip, setTopluKip] = useState(null);
  const katYok = fiyatBaglami.ayar.varsayilanKat == null; // triyaj (bulgu 1)
  const topluOzet = (kip) => topluKipOzeti(filtered, kip, fiyatBaglami);
  const topluUygula = () => {
    const oz = topluOzet(topluKip); const idler = new Set(oz.idler);
    setParts(p => p.map(x => (idler.has(String(x.id)) ? kipYaz(x, topluKip) : x)));
    logAction({ serverPermissions, action: "fiyat_kipi_degisti", entity: "parca_tanimi", entityName: `${oz.degisecek} parça`, detail: { kip: topluKip, adet: oz.degisecek } });
    showToast(`${oz.degisecek} parçanın fiyat kipi değişti.`);
    setTopluKip(null);
  };
  const suzgecSecenekleri = (() => {
    const say = new Map();
    for (const p of parts) for (const h of p.hammaddeler || []) { const k = String(h.tedarikciId); say.set(k, (say.get(k) || 0) + 1); }
    return [...say].map(([id, n]) => ({ id, n, ad: hammaddeTedarikciAdi(id, tedarikciler) })).sort((a, b) => a.ad.localeCompare(b.ad, "tr"));
  })();
  const girilmemisSayi = parts.filter(p => !(p.hammaddeler || []).length).length;

  // Spec 0133 R10, R11/2, AC-18, AC-86: hücre tek okuma yolundan. Elle sabit parçada bugünkü biçim (birebir, C4); maliyete bağlı
  // parçanın TL fiyatı kuruşlu tek gösterim yardımcısıyla, türetilemezse "—" ve açıklayıcı başlık (neden).
  const priceSummary = (p) => {
    if (maliyeteBagliMi(p)) {
      const tl = parcaSatisFiyati(p, "TRY", fiyatBaglami);
      const doviz = ["USD", "EUR"].filter(c => parseMoney(p[`fiyat${c}`]) > 0).map(c => fmtCur(parseMoney(p[`fiyat${c}`]), c));
      return (
        <span data-testid="parca-fiyat-turetilen" title={tl.neden || undefined}>
          {[tl.deger === "" ? "—" : `${CUR_SYM.TRY}${turetilmisFiyatSayisi(tl.deger)}`, ...doviz].join(" · ")}
          <span style={{ display: "block", fontSize: 11, color: "var(--n500, #64748b)" }}>{KIP_ADLARI[KIP_MALIYET]}</span>
        </span>
      );
    }
    const bits = [];
    if (parseMoney(p.fiyatTRY) > 0) bits.push(fmtCur(parseMoney(p.fiyatTRY), "TRY"));
    if (parseMoney(p.fiyatUSD) > 0) bits.push(fmtCur(parseMoney(p.fiyatUSD), "USD"));
    if (parseMoney(p.fiyatEUR) > 0) bits.push(fmtCur(parseMoney(p.fiyatEUR), "EUR"));
    return bits.length ? bits.join(" · ") : "—";
  };

  // Formun kit adetleri kancanın formunda TUTULMAZ (gövdeye sızmasın, plan P4): model adı → ham metin.
  const [adetler, setAdetler] = useState({});
  const [kittekiler, setKittekiler] = useState({});
  const [hatalar, setHatalar] = useState({ maliyet: null, adet: {}, hammadde: {}, tarih: null, set: {}, setGenel: null, malzeme: {} });
  // Spec 0097 R5/4: varsayılan tarih yerel gün (`useBugun`), `today()` değil.
  const bugun = useBugun();
  const [tarih, setTarih] = useState({ deger: "", elle: false });
  // R10, AC-8, AC-9: kümesi bütün canlı parçalar (arama ve sayfadan bağımsız; `parts` App'ten çöpü süzülmüş gelir).
  // Spec 0121 R10/2, R27 (AC-30): maliyeti çözülemeyen set de sayılır; hammadde süzgecinin sayısı (girilmemisSayi) değişmez.
  // Spec 0132 R18/2 (AC-85): sayaç malzeme listesini alır; malzemesi tam olan malzeme kaynaklı parça sayılmaz.
  const maliyetsizSayi = parts.filter(p => !maliyetGirildiMi(p, undefined, katalog, malzemeKat)).length;

  const bosHatalar = { maliyet: null, adet: {}, hammadde: {}, tarih: null, set: {}, setGenel: null, malzeme: {}, pay: null };
  const openAdd = () => { setForm(emptyForm); setAdetler({}); setKittekiler({}); setHatalar(bosHatalar); setAddOpen(true); };
  const openEdit = (k) => {
    const kit = parcaKitAdetleri(k.id, [standardModels, customModels]);
    setKittekiler(kit);
    setAdetler(Object.fromEntries(Object.entries(kit).map(([m, n]) => [m, kitAdetMetni(n)]))); // spec 0134: 0,114
    setHatalar(bosHatalar);
    setTarih({ deger: bugun, elle: false }); // Spec 0097 AC-10: alan bugünün tarihiyle gelir
    // Spec 0096 R17/3: kırılım formda hep form biçiminde (tutar metin), yetkisiz kullanıcıda da (bölüm çizilmese de taşınır).
    // Spec 0097 C13: geçmiş forma kopyalanmaz (kayıt fonksiyonu onu kayıttan okur).
    const { maliyetGecmisi: _g, ...kayit } = k;
    startEdit({ ...kayit, maliyet: elleMaliyetMetni(k), hammaddeler: hammaddeFormu(k.hammaddeler), setIcerigi: setIcerigiFormu(k.setIcerigi), malzemeSatiri: malzemeSatiriFormu(k.malzemeSatiri), emniyetPayi: sayiMetni(k.emniyetPayi), fiyatKipi: maliyeteBagliMi(k) ? KIP_MALIYET : "", karKati: katMetni(k.karKati) });
  };

  // R7, R14–R16, plan P5: doğrula → karşı bölüme yazılacaksa kilide anlık bak (reddedilirse kayıt bütünüyle yazılmaz) →
  // parçayı kancayla yaz → kancanın döndürdüğü kimlikle kiti iki model dizisine aynı `kit` nesnesiyle yaz.
  const kaydet = (kip) => {
    const f = kip === "ekle" ? form : editForm;
    // Spec 0096 R23: kırılım doğrulaması aynı erken dönüşe katılır (hata hâlinde parça da kit de yazılmaz, AC-14); kırılımda
    // tutar varken elle maliyet alanı pasiftir ve doğrulanmaz (R21).
    // Spec 0121 R3–R5/2: içerik doğrulaması aynı erken dönüşe katılır; içerik doluyken elle maliyet ve hammadde bölümü pasiftir,
    // doğrulanmaz (Karar 42).
    const si = setIcerigiDogrula(f.setIcerigi, { kendiId: kip === "ekle" ? null : editId, parts });
    const setli = si.kayit.length > 0;
    // Spec 0132 R9/2, AC-45, AC-46, AC-84: malzeme satırı doğrulaması aynı erken dönüşe katılır; satır doluyken kırılım ve elle
    // alan pasiftir, doğrulanmaz (set kazanırsa satır da pasiftir ve doğrulanmaz).
    const ms = setli ? { gecerli: true, hatalar: {}, kayit: null } : malzemeSatiriDogrula(f.malzemeSatiri);
    const malzemeli = !!ms.kayit;
    const h = setli || malzemeli ? { gecerli: true, hatalar: {}, kayit: [] } : hammaddeDogrula(f.hammaddeler);
    const m = setli || malzemeli || h.kayit.some(x => x.tutar != null) ? { hata: null } : parcaMaliyetDogrula(f.maliyet);
    const isaretli = allModels.map(x => x.model).filter(ad => (f.models || []).includes(ad));
    const adetHata = {}; const adetMap = {};
    for (const ad of isaretli) { const d = kitAdediDogrula(adetler[ad]); if (d.hata) adetHata[ad] = d.hata; else adetMap[ad] = d.deger; }
    const eski = kip === "ekle" ? null : parts.find(x => x.id === editId);
    // Spec 0097 R5/4, R6, R6/3, R7/2: tarih kaydın başında BİR KEZ çözülür; doğrulama yazımla aynı motordan (önizleme).
    // Triyaj (bulgu 6): malzeme listesi de geçer; malzeme satırı kaldırılınca eski değer malzemeden çözülür.
    const ek = kip === "ekle" ? null : { tarih: tarih.deger, bugun, tarihElle: tarih.elle, malzemeKat };
    const temel = eski && !m.hata && h.gecerli && si.gecerli && ms.gecerli ? hazirlaTemel({ ...eski, ...f }) : null;
    // Spec 0121 R7/2, C11 (Karar 43): içeriği olan kayıtta geçmiş motoru çalışmaz; kapı motorun `set` seçeneğidir.
    // Spec 0132 R16/2 (AC-63): malzeme kaynaklı kayıtta da geçmiş motoru çalışmaz (`malzeme` kapısı).
    const tarihHata = temel ? maliyetGecmisiYaz(eski, parcaMaliyetKurus(temel), { ...ek, set: setMi(temel), malzeme: malzemeSatiriVar(temel) }).hata : null;
    const pay = emniyetPayiDogrula(f.emniyetPayi); // spec 0134 AC-21
    const kat = f.fiyatKipi === KIP_MALIYET ? katDogrula(f.karKati) : { hata: null }; // spec 0133 AC-6, AC-60–AC-63
    setHatalar({ maliyet: m.hata, adet: adetHata, hammadde: h.hatalar, tarih: tarihHata, set: si.hatalar, setGenel: si.genel, malzeme: ms.hatalar, pay: pay.hata, kat: kat.hata });
    if (m.hata || Object.keys(adetHata).length || !h.gecerli || !si.gecerli || !ms.gecerli || tarihHata || pay.hata || kat.hata) return;
    const kitGirdisi = { partId: kip === "ekle" ? "__yeni__" : editId, ad: (f.ad || "").trim(), models: f.models || [], eskiModeller: eski?.models || [], adetler: adetMap };
    // Triyaj (bulgu 3): yazma kararı TAM özel model dizisiyle verilir; kit satırı yalnız çöpteki bir modelde duruyorsa ad
    // taşıması da yazılsın (geri alınan model eski adı basmasın). Canlı dizi yalnız ekranda çizilenleri taşır.
    const plan = parcaKitPlani(kitGirdisi, standardModels, rawCustomModels || customModels);
    const kilit = plan.karsiBolumeYazar ? baskasiKilitli?.("ayar", "models") : null;
    if (kilit) { showToast(kilitRedMesaji(kilit), "err"); return; }
    const id = kip === "ekle" ? add() : saveEdit(ek);
    if (!id) return;
    if (kip === "ekle") setAddOpen(false);
    if (!plan.karsiBolumeYazar) return;
    const kit = { ...plan.kit, partId: id };
    setStandardModels?.(p => kitleriGuncelle(p, kit));
    setCustomModels?.(p => kitleriGuncelle(p, kit));
  };
  const submitAdd = () => kaydet("ekle");
  // Spec 0099 C1/2: pencere başına tek canlı maliyet; maliyet alanının pasifliği ve toplam kutusu aynı sonuçtan türer.
  // Formdaki satırlardan canlı maliyet (kuruş) ve kaynak: kayıtla aynı yol (doğrulayıcı + tek okuma yolu). Spec 0121 R2/3
  // (Karar 23): setin maliyeti, eksik bileşen sayısı ve fiyat toplamı da bu tek sonuçtan (`set`) gelir; katalog için bileşen içi.
  const formMaliyeti = (f) => {
    const kayit = hammaddeDogrula(f?.hammaddeler).kayit;
    const icerik = setIcerigiDogrula(f?.setIcerigi).kayit;
    // Spec 0132 R16/4, C1/2: malzeme satırının canlı özeti de bu tek sonuçtan (ağırlık, tutar, eksiklik); set kazanırsa yok.
    const ms = icerik.length ? null : malzemeSatiriDogrula(f?.malzemeSatiri).kayit;
    const p = { hammaddeler: kayit, maliyet: parcaMaliyetDogrula(f?.maliyet).deger, ...(icerik.length ? { setIcerigi: icerik } : {}), ...(ms ? { malzemeSatiri: ms } : {}) };
    const set = icerik.length ? setOzeti(icerik, katalog, undefined, malzemeKat, setFiyatOkuyucu(fiyatBaglami)) : null; // spec 0133 Karar 30
    const malzeme = ms ? malzemeOzeti(ms, malzemeKat) : null;
    // Spec 0133 R2, R11 (AC-2): türetilmiş TL fiyatı formun aynı tek sonucundan; kayda yazılmaz.
    const fiyat = f?.fiyatKipi === KIP_MALIYET ? turetilmisFiyat({ ...p, karKati: f.karKati }, fiyatBaglami) : null;
    return { kirilimK: !set && !malzeme && kayit.some(h => h.tutar != null) ? parcaMaliyetKurus(p) : null, kaynak: maliyetKaynagi(p, undefined, katalog, malzemeKat), set, malzeme, fiyat };
  };
  const canliEkle = addOpen ? formMaliyeti(form) : null;
  const canliDuzenle = editId !== null ? formMaliyeti(editForm) : null;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 12 }}>
        {/* Spec 0133 R17/2, AC-92: fiyat listesi süzgeçten geçen canlı parçaları katalog sırasıyla basar (Karar 35). */}
        <FiyatListesiDugmesi parcalar={filtered} baglam={fiyatBaglami} factory={factory} />
        <Btn onClick={openAdd}><Icon name="plus" size={14} /> Parça/Yedek Parça Ekle</Btn>
      </div>
      {maliyetsizSayi > 0 && (
        <div style={{ marginBottom: 12 }}>
          <UyariSeridi aile="uyari" testId="maliyetsiz-parca">
            <b>{maliyetsizSayi}</b> parçanın alış maliyeti girilmedi; makina maliyeti hesabı bu parçaları eksik sayar.
          </UyariSeridi>
        </div>
      )}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
      <div style={{ position: "relative", flex: 1 }}>
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--n400, #94a3b8)" }}><Icon name="search" size={15} /></span>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Yedek parça ara..."
          style={{ padding: "9px 12px 9px 36px", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 8, width: "100%", boxSizing: "border-box", fontSize: 14, background: "var(--n100, #f8fafc)", outline: "none" }} />
      </div>
      {/* Spec 0096 C14: süzgeç Select'tir (tasarım sözlüğünde adıyla istisna); yalnız gider yetkisiyle (R10/2). */}
      <div data-testid="fiyat-kipi-suzgeci">
        <Segment kip="dugme" genislik="icerik" ariaLabel="Fiyat kipi süzgeci" value={kipSuzgec} onChange={setKipSuzgec}
          options={[{ value: "tumu", label: "Tümü", sayi: parts.length }, { value: KIP_MALIYET, label: KIP_ADLARI[KIP_MALIYET], sayi: kipSayisi(KIP_MALIYET) }, { value: KIP_ELLE, label: KIP_ADLARI[KIP_ELLE], sayi: kipSayisi(KIP_ELLE) }]} />
      </div>
      {giderYetki && (
        <div style={{ width: 280 }} data-testid="tedarikci-suzgeci">
          <Select aria-label="Hammadde tedarikçisi süzgeci" value={suzgec} onChange={e => setSuzgec(e.target.value)}>
            <option value={SUZGEC_TUMU}>Tüm parçalar</option>
            {suzgecSecenekleri.map(o => <option key={o.id} value={o.id}>{`${o.ad} (${o.n})`}</option>)}
            <option value={SUZGEC_GIRILMEMIS}>{`Hammadde tedarikçisi girilmemiş (${girilmemisSayi})`}</option>
          </Select>
        </div>
      )}
      </div>

      {filtered.length > 0 && (
        <div data-testid="toplu-kip" style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
          {[KIP_MALIYET, KIP_ELLE].map(k => (
            <Btn key={k} small variant="ghost" disabled={topluOzet(k).degisecek === 0 || (k === KIP_MALIYET && katYok)} onClick={() => setTopluKip(k)}>{topluKipMetni(filtered.length, k)}</Btn>))}
          {katYok && <span data-testid="toplu-kat-yok" style={{ fontSize: 12, color: "var(--n600, #475569)", alignSelf: "center" }}>{TOPLU_KAT_YOK_NEDENI}</span>}
        </div>
      )}
      {topluKip && (() => { const oz = topluOzet(topluKip); return (
        <ConfirmDialog title="Fiyat kipini değiştir" icon="check" onCancel={() => setTopluKip(null)} onConfirm={topluUygula} confirmLabel="Uygula" confirmIcon="check" confirmVariant="primary"
          message={<span data-testid="toplu-kip-onay">{`Listedeki ${oz.toplam} parçanın ${oz.degisecek} tanesinin fiyat kipi "${KIP_ADLARI[topluKip]}" olacak.`}{oz.maliyetsiz > 0 && <><br />{maliyetsizUyariMetni(oz.maliyetsiz)}</>}{oz.katsiz > 0 && <><br />{katsizUyariMetni(oz.katsiz)}</>}</span>} />
      ); })()}
      <div style={{ border: "1px solid var(--n200, #e2e8f0)", borderRadius: 10, overflow: "auto" }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: "var(--n400, #94a3b8)", fontSize: 13 }}>
            {parts.length === 0 ? "Henüz yedek parça tanımı yok." : giderYetki && suzgec !== SUZGEC_TUMU ? SUZGEC_BOS_METNI : "Arama sonucu bulunamadı."}
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--n100, #f8fafc)" }}>
                <th style={{ padding: "8px 14px", width: 52 }}></th>
                <th style={{ padding: "8px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--n600, #475569)" }}>Yedek Parça Adı</th>
                <th style={{ padding: "8px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--n600, #475569)" }}>Tip</th>
                <th style={{ padding: "8px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--n600, #475569)" }}>Kod</th>
                <th style={{ padding: "8px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--n600, #475569)" }}>Ad / Tanım</th>
                <th style={{ padding: "8px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--n600, #475569)" }}>Modeller</th>
                <th style={{ padding: "8px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--n600, #475569)" }}>Fiyat</th>
                <th style={{ padding: "8px 14px", textAlign: "right", fontSize: 11, fontWeight: 700, color: "var(--n600, #475569)" }}>Maliyet</th>
                <th style={{ padding: "8px 14px", textAlign: "right", fontSize: 11, fontWeight: 700, color: "var(--n600, #475569)" }}></th>
              </tr>
            </thead>
            <tbody>
              {paged.map(k => (
                <tr key={k.id} style={{ borderBottom: "1px solid var(--n150, #f1f5f9)" }}>
                  <td style={{ padding: "10px 14px" }}>
                    {k.resim
                      ? <img src={k.resim} alt={k.ad} style={{ width: 40, height: 30, objectFit: "contain", borderRadius: 4, border: "1px solid var(--n200, #e2e8f0)" }} />
                      : <div style={{ width: 40, height: 30, borderRadius: 4, border: "1px dashed var(--n200, #e2e8f0)", background: "var(--n100, #f8fafc)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "var(--n300, #cbd5e1)" }}>—</div>
                    }
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{k.ad}</span>
                    {/* Spec 0121 R24/2 biçimi: set ad hücresinde rozetle tanınır (sütun sayısı değişmez). */}
                    {setMi(k) && <SetRozeti n={k.setIcerigi.length} />}
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    {(() => { const t = k.tip || "Standart"; const c = tipRenk(t, partTypeDefs); return (
                      <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 10, background: c.bg, color: c.color, border: `1px solid ${c.border}`, whiteSpace: "nowrap" }}>{t}</span>
                    ); })()}
                  </td>
                  <td style={{ padding: "10px 14px", fontSize: 12, color: "var(--n500, #64748b)" }}>{k.kod || "—"}</td>
                  <td style={{ padding: "10px 14px", fontSize: 11 }}>
                    <span style={{ color: k.adEN ? "var(--grn600, #16a34a)" : "var(--n300, #cbd5e1)" }}>TR</span>
                    {" · "}
                    <span style={{ color: k.adEN ? "var(--grn600, #16a34a)" : "var(--n300, #cbd5e1)" }}>EN</span>
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <ModelBadges models={k.models || []} />
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{ fontSize: 13, color: "var(--n600, #475569)" }}>{priceSummary(k)}</span>
                  </td>
                  <td data-testid="parca-maliyet" style={{ padding: "10px 14px", textAlign: "right", fontSize: 13, whiteSpace: "nowrap", color: maliyetGirildiMi(k, undefined, katalog, malzemeKat) ? "var(--n700, #334155)" : "var(--n300, #cbd5e1)" }}>
                    {parcaMaliyetMetni(k, undefined, katalog, malzemeKat)}
                    {/* Spec 0132 R9/2: malzeme kaynaklı parçanın ikinci satırı (yetki istemez; fiyat ve ölçü açık, R20/2). */}
                    {malzemeSatiriVar(k) && !setMi(k) && <div data-testid="parca-maliyet-malzeme" style={{ fontSize: 11, color: "var(--n500, #64748b)" }}>{KAYNAK_MALZEME}</div>}
                    {/* Spec 0096 R9/2: ikinci satır yalnız kırılımdan gelen maliyette (gider yetkisiyle; AC-45). */}
                    {giderYetki && maliyetKaynagi(k, undefined, katalog, malzemeKat)?.tur === "kirilim" && <div data-testid="parca-maliyet-kaynak" style={{ fontSize: 11, color: "var(--n500, #64748b)" }}>{kaynakListeMetni(maliyetKaynagi(k, undefined, katalog, malzemeKat).n)}</div>}
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      <Btn small variant="ghost" title="Düzenle" onClick={() => openEdit(k)}><Icon name="edit" size={12} /></Btn>
                      <Btn small variant="danger" onClick={() => requestDelete(k)}><Icon name="trash" size={12} /></Btn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <Pagination total={filtered.length} page={page} setPage={setPage} perPage={PER_PAGE} />

      {confirmDel && (
        <ConfirmDialog
          message={<>
            {`"${confirmDel.ad}" yedek parça tanımı Çöp Kutusu'na taşınacak (30 gün içinde geri alınabilir). Daha önce verilmiş kayıtlar geçmişte kalır.`}
            {/* Spec 0123 R3, R3/4, R3/6: kullanım satırı (ham diziden; çöpe atma engellenmez). */}
            {silmeKullanimi && <div data-testid="parca-kullanim" style={{ marginTop: 8, fontWeight: 600 }}>{silmeKullanimi}</div>}
          </>}
          onConfirm={confirmDelete}
          onCancel={cancelDelete}
        />
      )}

      {addOpen && (
        <Modal wide title="Yeni Yedek Parça Ekle" onClose={() => setAddOpen(false)}
          footer={<div style={{ display: "flex", gap: 8 }}>
            <Btn variant="ghost" onClick={() => setAddOpen(false)}>İptal</Btn>
            <Btn onClick={submitAdd}><Icon name="check" size={14} /> Kaydet</Btn>
          </div>}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <Field label="Yedek Parça Adı (TR)">
            <Input value={form.ad} onChange={e => setForm(p => ({ ...p, ad: e.target.value }))} placeholder="Örn: Kesme Bıçağı Seti" />
            <HataMetni>{!form.ad.trim() ? "Yedek parça adı girilmedi" : ""}</HataMetni>
          </Field>
          <Field label="Yedek Parça Adı (EN)">
            <Input value={form.adEN || ""} onChange={e => setForm(p => ({ ...p, adEN: e.target.value }))} placeholder="Örn: Cutting Blade Set" />
          </Field>
          <Field label="Kod">
            <Input value={form.kod || ""} onChange={e => setForm(p => ({ ...p, kod: e.target.value }))} placeholder="Örn: KES-001" />
          </Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Tanım (TR)">
            <textarea value={form.tanim || ""} onChange={e => setForm(p => ({ ...p, tanim: e.target.value }))}
              placeholder="Teknik özellikler, boyutlar vb."
              className="input" style={{ fontSize: 13, resize: "vertical", minHeight: 72 }} />
          </Field>
          <Field label="Tanım (EN)">
            <textarea value={form.tanimEN || ""} onChange={e => setForm(p => ({ ...p, tanimEN: e.target.value }))}
              placeholder="Technical specifications, dimensions etc."
              className="input" style={{ fontSize: 13, resize: "vertical", minHeight: 72 }} />
          </Field>
          </div>
          <Field label="Fiyat (TL / USD / EUR — opsiyonel)">
            <FiyatAlani value={form} onChange={setForm} turetilen={canliEkle?.fiyat} eskiTL={form.fiyatTRY} varsayilanKat={fiyatBaglami.ayar.varsayilanKat} katHata={hatalar.kat} />
          </Field>
          <MaliyetAlani value={form.maliyet} onChange={v => setForm(p => ({ ...p, maliyet: v }))} hata={hatalar.maliyet} {...canliEkle} giderYetki={giderYetki} />
          <MalzemeSatiriAlani satir={form.malzemeSatiri} setSatir={v => setForm(p => ({ ...p, malzemeSatiri: v }))} malzemeler={malzemeler} hamMalzemeler={rawMalzemeler || malzemeler}
            emniyetPayi={form.emniyetPayi} setEmniyetPayi={v => setForm(p => ({ ...p, emniyetPayi: v }))} payHata={hatalar.pay}
            hatalar={hatalar.malzeme} ozet={canliEkle?.malzeme} pasif={!!canliEkle?.set} />
          {giderYetki && <fieldset disabled={!!canliEkle?.set || !!canliEkle?.malzeme} style={FIELDSET_STILI}><HammaddeAlani satirlar={form.hammaddeler || []} setSatirlar={v => setForm(p => ({ ...p, hammaddeler: v }))} tedarikciler={tedarikciler} hatalar={hatalar.hammadde} toplam={canliEkle} /></fieldset>}
          <SetIcerigiAlani satirlar={form.setIcerigi || []} setSatirlar={v => setForm(p => ({ ...p, setIcerigi: v }))} parts={parts} hamParts={hamParts}
            hatalar={hatalar.set} genel={hatalar.setGenel} ozet={canliEkle?.set} fiyatPasif={form.fiyatKipi === KIP_MALIYET} onFiyat={() => setForm(p => ({ ...p, fiyatTRY: String(canliEkle.set.fiyatToplam) }))} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Parça Tipi">
            <TipSelector value={form.tip || "Standart"} onChange={v => setForm(p => ({ ...p, tip: v }))} partTypeDefs={partTypeDefs} />
            <KalipTipIpucu kayit={form} partTypeDefs={partTypeDefs} />
          </Field>
          <Field label="Resim">
            <ImageUpload value={form.resim || ""} onChange={v => setForm(p => ({ ...p, resim: v }))} label={form.ad} />
          </Field>
          </div>
          <Field label="Kullanıldığı Modeller ve Kit Adetleri">
            <ModelChips selected={form.models || []} allModels={allModels}
              onChange={models => setForm(p => ({ ...p, models }))} />
            <ModelAdetleri selected={form.models || []} allModels={allModels} adetler={adetler} setAdetler={setAdetler} hatalar={hatalar.adet} />
          </Field>
        </Modal>
      )}

      {editId !== null && (
        <Modal wide title="Yedek Parçayı Düzenle" onClose={cancelEdit}
          footer={<div style={{ display: "flex", gap: 8 }}>
            <Btn variant="ghost" onClick={cancelEdit}>İptal</Btn>
            <Btn onClick={() => kaydet("duzenle")}><Icon name="check" size={14} /> Kaydet</Btn>
          </div>}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <Field label="Yedek Parça Adı (TR)">
            <Input value={editForm.ad || ""} onChange={e => setEditForm(p => ({ ...p, ad: e.target.value }))} placeholder="Örn: Kesme Bıçağı Seti" />
            <HataMetni>{!(editForm.ad || "").trim() ? "Yedek parça adı girilmedi" : ""}</HataMetni>
          </Field>
          <Field label="Yedek Parça Adı (EN)">
            <Input value={editForm.adEN || ""} onChange={e => setEditForm(p => ({ ...p, adEN: e.target.value }))} placeholder="Örn: Cutting Blade Set" />
          </Field>
          <Field label="Kod">
            <Input value={editForm.kod || ""} onChange={e => setEditForm(p => ({ ...p, kod: e.target.value }))} placeholder="Örn: KES-001" />
          </Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Tanım (TR)">
            <textarea value={editForm.tanim || ""} onChange={e => setEditForm(p => ({ ...p, tanim: e.target.value }))}
              placeholder="Teknik özellikler, boyutlar vb."
              className="input" style={{ fontSize: 13, resize: "vertical", minHeight: 72 }} />
          </Field>
          <Field label="Tanım (EN)">
            <textarea value={editForm.tanimEN || ""} onChange={e => setEditForm(p => ({ ...p, tanimEN: e.target.value }))}
              placeholder="Technical specifications, dimensions etc."
              className="input" style={{ fontSize: 13, resize: "vertical", minHeight: 72 }} />
          </Field>
          </div>
          <Field label="Fiyat (TL / USD / EUR — opsiyonel)">
            <FiyatAlani value={editForm} onChange={setEditForm} turetilen={canliDuzenle?.fiyat} eskiTL={parts.find(x => x.id === editId)?.fiyatTRY}
              varsayilanKat={fiyatBaglami.ayar.varsayilanKat} katHata={hatalar.kat} />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
            <MaliyetAlani value={editForm.maliyet} onChange={v => setEditForm(p => ({ ...p, maliyet: v }))} hata={hatalar.maliyet} {...canliDuzenle} giderYetki={giderYetki} />
            {/* Spec 0121 Karar 42: setin geçerlilik tarihi ve geçmişi çizilmez (geçmiş bileşenlerde durur, kayıttaki geçmiş korunur). */}
            {/* Spec 0132 R16/3: malzeme kaynaklı parçanın kendi geçmişi okunmaz; tarih ve geçmiş çizilmez (kayıttaki geçmiş durur). */}
            {!canliDuzenle?.set && !canliDuzenle?.malzeme && <GecerlilikAlani tarih={tarih} setTarih={setTarih} hata={hatalar.tarih} />}
          </div>
          {!canliDuzenle?.set && !canliDuzenle?.malzeme && <MaliyetGecmisi parca={parts.find(x => x.id === editId)} />}
          <MalzemeSatiriAlani satir={editForm.malzemeSatiri} setSatir={v => setEditForm(p => ({ ...p, malzemeSatiri: v }))} malzemeler={malzemeler} hamMalzemeler={rawMalzemeler || malzemeler}
            emniyetPayi={editForm.emniyetPayi} setEmniyetPayi={v => setEditForm(p => ({ ...p, emniyetPayi: v }))} payHata={hatalar.pay}
            hatalar={hatalar.malzeme} ozet={canliDuzenle?.malzeme} pasif={!!canliDuzenle?.set} />
          {giderYetki && <fieldset disabled={!!canliDuzenle?.set || !!canliDuzenle?.malzeme} style={FIELDSET_STILI}><HammaddeAlani satirlar={editForm.hammaddeler || []} setSatirlar={v => setEditForm(p => ({ ...p, hammaddeler: v }))} tedarikciler={tedarikciler} hatalar={hatalar.hammadde} toplam={canliDuzenle} /></fieldset>}
          <SetIcerigiAlani satirlar={editForm.setIcerigi || []} setSatirlar={v => setEditForm(p => ({ ...p, setIcerigi: v }))} kendiId={editId} parts={parts} hamParts={hamParts}
            hatalar={hatalar.set} genel={hatalar.setGenel} ozet={canliDuzenle?.set} fiyatPasif={editForm.fiyatKipi === KIP_MALIYET} onFiyat={() => setEditForm(p => ({ ...p, fiyatTRY: String(canliDuzenle.set.fiyatToplam) }))} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Parça Tipi">
            <TipSelector value={editForm.tip || "Standart"} onChange={v => setEditForm(p => ({ ...p, tip: v }))} partTypeDefs={partTypeDefs} />
            <KalipTipIpucu kayit={editForm} partTypeDefs={partTypeDefs} />
          </Field>
          <Field label="Resim">
            <ImageUpload value={editForm.resim || ""} onChange={v => setEditForm(p => ({ ...p, resim: v }))} label={editForm.ad} />
          </Field>
          </div>
          <Field label="Kullanıldığı Modeller ve Kit Adetleri">
            <ModelChips selected={editForm.models || []} allModels={allModels}
              onChange={models => setEditForm(p => ({ ...p, models }))} />
            <ModelAdetleri selected={editForm.models || []} allModels={allModels} adetler={adetler} setAdetler={setAdetler} hatalar={hatalar.adet} kittekiler={kittekiler}
              eskiModeller={parts.find(x => x.id === editId)?.models || []} />
          </Field>
        </Modal>
      )}
    </div>
  );
};
