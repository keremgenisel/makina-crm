import { useMemo, useState } from "react";
import { Field, Input, Select, Btn, Icon } from "../ui";
import { SiparisRaporuDugmesi } from "../rapor/SiparisRaporuDugmesi";
import { BosDurum, UyariSeridi, Ipucu, HataMetni, KartBolum, BolumBasligi } from "../tasarim";
import { partiSecenekAdi, panoVarsayilanParti } from "../../lib/stokDurumu";
import {
  siparisIhtiyaci, partidenSatirlar, hataliSatirMetni, KIT_BOS_METNI, KESISIM_UYARISI, STOK_UYARISI, PARTI_PLAN_YOK, PATLATILDI,
  SILINMIS_PARCA, kgMetni, tlMetni as tl, pbTutarMetni as pbTutar, adetMetni as sayi, uretimdekiAdlar,
} from "../../lib/siparisIhtiyaci";

// Spec 0134: Makina Maliyeti › Sipariş İhtiyacı. Salt okunur (R21, C8): hiçbir veri bölümüne yazmaz, yazıcı prop'u almaz (AC-61),
// kilit almaz (C8/2). Hesabın tamamı `lib/siparisIhtiyaci.js`'te (C3, C3/2); bu bileşen yalnız girdi satırlarını tutar ve gösterir.
// Model satırları yerel durumdur: partinin planlanan adetleri hazır gelir, düzenleme partiye yazılmaz (AC-6), parti değişince
// satırlar yeniden dolar (Karar 39).
export const SIPARIS_GORUNUM_ADI = "Sipariş İhtiyacı";
export const BOS_BASLIK = "Model satırı yok";
export const BOS_METNI = "Bir üretim partisi seçin ya da \"Model Satırı Ekle\" ile model ve makina adedi girin.";
export const ELLE_GIRIS = "Parti seçilmedi (elle giriş)";
export const IKI_KAYNAK = "kitten ve setten";
// Spec 0135 R30/2 (AC-109): ölçüt "malzeme kalemi yok" kalır, metin kalem dilinde.
export const hazirSayiMetni = (n) => `${n} parçada malzeme kalemi yok`;
export const MALZEME_KALEMI_YOK_METNI = "Malzeme kalemi olan parça siparişi yok.";
export const eksikMetni = (e) => `${e.parca} parçanın ve ${e.malzeme} malzemenin bilgisi eksik; tutarları toplama girmedi.`;
const th = { padding: "8px 10px", fontSize: 11.5, color: "var(--n500, #64748b)", textAlign: "right", whiteSpace: "nowrap" };
const td = { padding: "7px 10px", fontSize: 13, textAlign: "right", whiteSpace: "nowrap", borderTop: "1px solid var(--n100, #f1f5f9)" };

export const SiparisIhtiyaci = ({ modelSatirlari = [], modeller = [], parts = [], hamParts = null, partStock = [], malzemeler = [], tedarikciler = [],
  hamTedarikciler = null, uretimPartileri = [], factory = null, bugun }) => {
  const [partiId, setPartiId] = useState(() => panoVarsayilanParti(uretimPartileri)?.id ?? "");
  const parti = uretimPartileri.find(p => String(p.id) === String(partiId)) || null;
  const ilk = useMemo(() => (parti ? partidenSatirlar(parti, modeller) : { satirlar: [], bulunamayan: [], bos: true }), [parti, modeller]);
  const [satirlar, setSatirlar] = useState(() => ilk.satirlar);
  const partiSec = (id) => {
    setPartiId(id);
    const p = uretimPartileri.find(x => String(x.id) === String(id));
    setSatirlar(p ? partidenSatirlar(p, modeller).satirlar : []);
  };
  const sonuc = useMemo(() => siparisIhtiyaci({ modeller, satirlar, parts, hamParts, partStock, malzemeler, tedarikciler, hamTedarikciler }),
    [modeller, satirlar, parts, hamParts, partStock, malzemeler, tedarikciler, hamTedarikciler]);
  const yaz = (i, alan, v) => setSatirlar(p => p.map((s, j) => (j === i ? { ...s, [alan]: v } : s)));
  const yazdirilabilir = sonuc.gecerliSayi > 0 && sonuc.hataliSayi === 0; // AC-51, AC-102
  const uretimdekiModeller = useMemo(() => uretimdekiAdlar(modelSatirlari), [modelSatirlari]);
  // R3, C5, Karar 41: seçici yalnız üretimdeki modelleri listeler; satırın kendi (partiden gelen) modeli listede yoksa korunur.
  const secenekler = (mevcut) => (mevcut && !uretimdekiModeller.includes(mevcut) ? [mevcut, ...uretimdekiModeller] : uretimdekiModeller);

  return (
    <div data-testid="siparis-ihtiyaci">
      <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 10 }}>
        <div style={{ minWidth: 260 }}>
          <Field label="Üretim partisi">
            <Select value={String(partiId ?? "")} onChange={e => partiSec(e.target.value)} aria-label="Üretim partisi">
              <option value="">{ELLE_GIRIS}</option>
              {uretimPartileri.map(p => <option key={p.id} value={String(p.id)}>{partiSecenekAdi(p)}</option>)}
            </Select>
          </Field>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, marginBottom: 12 }}>
          <Btn variant="ghost" onClick={() => setSatirlar(p => [...p, { model: "", adet: "" }])}><Icon name="plus" size={13} /> Model Satırı Ekle</Btn>
          <SiparisRaporuDugmesi sonuc={sonuc} etkin={yazdirilabilir} bugun={bugun} factory={factory} partiAd={parti?.ad || null} />
        </div>
      </div>
      {parti && ilk.bos && <Ipucu><span data-testid="siparis-parti-plan-yok">{PARTI_PLAN_YOK}</span></Ipucu>}
      {parti && ilk.bulunamayan.length > 0 && (
        <UyariSeridi aile="uyari" testId="siparis-bulunamayan-model">Partinin planlanan adetlerinde katalogda bulunamayan model hesaba girmedi: {ilk.bulunamayan.join(", ")}</UyariSeridi>)}

      {satirlar.length > 0 && (
        <div data-testid="siparis-model-satirlari" style={{ display: "grid", gap: 6, margin: "6px 0 12px", maxWidth: 560 }}>
          {satirlar.map((s, i) => (
            <div key={i}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 130px 34px", gap: 8, alignItems: "center" }}>
                <Select value={s.model} onChange={e => yaz(i, "model", e.target.value)} aria-label={`Model ${i + 1}`}>
                  <option value="">Model seçin</option>
                  {secenekler(s.model).map(m => <option key={m} value={m}>{m}</option>)}
                </Select>
                <Input value={s.adet} inputMode="numeric" onChange={e => yaz(i, "adet", e.target.value)} placeholder="Makina adedi" aria-label={`Makina adedi ${i + 1}`} />
                <Btn small variant="ghost" aria-label={`Model satırı ${i + 1} sil`} onClick={() => setSatirlar(p => p.filter((_, j) => j !== i))}><Icon name="trash" size={13} /></Btn>
              </div>
              <HataMetni>{sonuc.satirlar[i]?.hata || ""}</HataMetni>
            </div>
          ))}
        </div>
      )}

      {sonuc.hataliSayi > 0 && <UyariSeridi aile="hata" testId="siparis-hatali-satir">{hataliSatirMetni(sonuc.hataliSayi)}</UyariSeridi>}
      {satirlar.length === 0 ? (
        <BosDurum testId="bos-siparis" baslik={BOS_BASLIK} metin={BOS_METNI} />
      ) : sonuc.gecerliSayi > 0 && (
        <>
          <div style={{ display: "grid", gap: 6, margin: "8px 0" }}>
            {sonuc.kitBos.map(m => <Ipucu key={m}><span data-testid="siparis-kit-bos">{KIT_BOS_METNI(m)}</span></Ipucu>)}
            {sonuc.kesisimler.map(k => <UyariSeridi key={`${k.setAd}|${k.bilesenAd}`} aile="uyari" testId="siparis-kesisim">{KESISIM_UYARISI(k.setAd, k.bilesenAd)}</UyariSeridi>)}
            {sonuc.stokUyarisi && <UyariSeridi aile="uyari" testId="siparis-stok-uyarisi">{STOK_UYARISI(sonuc.stokUyarisi.stoklu, sonuc.stokUyarisi.toplam)}</UyariSeridi>}
            <div data-testid="siparis-eksik" style={{ fontSize: 12.5, color: sonuc.eksik.parca || sonuc.eksik.malzeme ? "var(--amb700, #b45309)" : "var(--n500, #64748b)", fontWeight: 600 }}>
              {sonuc.eksik.parca || sonuc.eksik.malzeme ? eksikMetni(sonuc.eksik) : "Eksik bilgi yok."}
              <span data-testid="siparis-hazir" style={{ color: "var(--n500, #64748b)", fontWeight: 400 }}> · {hazirSayiMetni(sonuc.hazirSayi)}</span>
            </div>
          </div>

          <BolumBasligi ust>Parça ihtiyacı</BolumBasligi>
          <KartBolum varyant="kart" style={{ padding: 0, overflow: "auto" }}>
            <table data-testid="siparis-parca-tablosu" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={{ ...th, textAlign: "left" }}>Parça</th><th style={th}>Ham ihtiyaç</th><th style={th}>Emniyet payı</th><th style={th}>İhtiyaç</th><th style={th}>Stok</th><th style={th}>Sipariş</th></tr></thead>
              <tbody>{sonuc.parcalar.map(p => (
                <tr key={p.partId} data-testid="siparis-parca-satiri">
                  <td style={{ ...td, textAlign: "left", whiteSpace: "normal" }}>
                    <b>{p.ad}</b>{p.silinmis && <span data-testid="siparis-silinmis" style={{ color: "var(--red600, #dc2626)" }}> ({SILINMIS_PARCA})</span>}
                    {p.set && <span style={{ marginLeft: 6, fontSize: 10.5, fontWeight: 800, color: "var(--pur700, #6d28d9)" }}>SET{p.patlatildi ? <span data-testid="siparis-patlatildi"> · {PATLATILDI}</span> : null}</span>}
                    {p.setNeden && <div data-testid="siparis-set-neden" style={{ fontSize: 11, color: "var(--n500, #64748b)" }}>{p.setNeden}</div>}
                    {p.iki && <div data-testid="siparis-iki-kaynak" style={{ fontSize: 11, color: "var(--amb700, #b45309)" }}>{IKI_KAYNAK}: {p.kaynaklar.map(k => k.metin).join(", ")}</div>}
                  </td>
                  <td style={td}>{sayi(p.ham)}</td>
                  <td style={td} data-testid="siparis-pay">{p.pay == null ? "" : `%${p.pay.toLocaleString("tr-TR")}`}</td>
                  <td style={{ ...td, fontWeight: 600 }}>{sayi(p.ihtiyac)}</td>
                  <td style={td}>{sayi(p.stok)}</td>
                  <td style={{ ...td, fontWeight: 700 }} data-testid="siparis-siparis">{sayi(p.siparis)}</td>
                </tr>))}</tbody>
            </table>
          </KartBolum>

          <div style={{ marginTop: 18 }}><BolumBasligi ust>Malzeme ihtiyacı (ana tedarikçiye göre)</BolumBasligi></div>
          {sonuc.tedarikciGruplari.length === 0 ? <Ipucu><span data-testid="siparis-malzeme-yok">{MALZEME_KALEMI_YOK_METNI}</span></Ipucu> : sonuc.tedarikciGruplari.map(t => (
            <KartBolum key={t.tedarikciId ?? "yok"} varyant="kart" style={{ padding: 0, overflow: "auto", marginBottom: 10 }}>
              <div data-testid="siparis-tedarikci" style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", fontWeight: 700, fontSize: 13 }}>
                <span>{t.ad}</span><span data-testid="siparis-tedarikci-toplam">{tl(t.tutarTLK)}</span>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><th style={{ ...th, textAlign: "left" }}>Malzeme · kesit</th><th style={th}>Net kg</th><th style={th}>Fire kg</th><th style={th}>Sipariş kg</th><th style={th}>Artan kg</th><th style={th}>Boy</th><th style={th}>Asgari farkı</th><th style={th}>Tutar</th><th style={th}>TL</th></tr></thead>
                <tbody>{t.malzemeler.flatMap(m => [
                  <tr key={`b-${m.malzemeId}`} data-testid="siparis-malzeme-basligi" style={{ background: "var(--n100, #f1f5f9)" }}>
                    <td style={{ ...td, textAlign: "left", fontWeight: 700 }}>{m.ad}</td><td style={td}>{kgMetni(m.netKg)}</td><td style={td} /><td style={td}>{kgMetni(m.siparisKg)}</td>
                    <td style={td} /><td style={td} /><td style={td} /><td style={td} /><td style={{ ...td, fontWeight: 700 }}>{tl(m.tutarTLK)}</td>
                  </tr>,
                  ...m.kesitler.map(k => (
                    <tr key={k.anahtar} data-testid="siparis-kesit-satiri">
                      <td style={{ ...td, textAlign: "left", whiteSpace: "normal" }}>{k.kesitMetni}{k.yontem === "boy" ? " · boy fiyatından" : ""}
                        {[k.kgNeden, k.boyNeden, k.fireUyarisi, k.tutarNeden].filter(Boolean).map(x => <div key={x} data-testid="siparis-kesit-neden" style={{ fontSize: 11, color: "var(--n500, #64748b)" }}>{x}</div>)}</td>
                      <td style={td}>{k.netKg == null ? "—" : kgMetni(k.netKg)}</td>
                      <td style={td}>{k.fireKg == null ? "—" : kgMetni(k.fireKg)}</td>
                      <td style={{ ...td, fontWeight: 600 }}>{k.siparisKg == null ? "—" : kgMetni(k.siparisKg)}</td>
                      <td style={td}>{k.artanKg == null ? "—" : kgMetni(k.artanKg)}</td>
                      <td style={td} data-testid="siparis-boy">{k.boyAdedi == null ? "—" : `${k.boyAdedi} boy`}</td>
                      <td style={td}>{k.asgariFark == null ? "" : kgMetni(k.asgariFark)}</td>
                      <td style={td}>{pbTutar(k.tutarK, k.paraBirimi)}</td>
                      <td style={{ ...td, fontWeight: 700 }}>{tl(k.tutarTLK)}</td>
                    </tr>)),
                ])}</tbody>
              </table>
            </KartBolum>))}
          <div data-testid="siparis-toplam" style={{ textAlign: "right", fontWeight: 800, fontSize: 14, marginTop: 6 }}>Toplam: {tl(sonuc.toplamTLK)}</div>
        </>
      )}
    </div>
  );
};
