import { useMemo, useState } from "react";
import { Field, Input, Select, Btn, Icon, Modal } from "../ui";
import { SiparisRaporuDugmesi } from "../rapor/SiparisRaporuDugmesi";
import { BosDurum, UyariSeridi, Ipucu, HataMetni, KartBolum, CokluSecim } from "../tasarim";
import { partiSecenekAdi, panoVarsayilanParti } from "../../lib/stokDurumu";
import { uretimdeSuzulmusModeller } from "../../lib/uretimdekiModeller";
import { useBugun } from "../../hooks/useBugun";
import {
  siparisIhtiyaci, partidenSatirlar, hataliSatirMetni, KIT_BOS_METNI, KESISIM_UYARISI, STOK_UYARISI, PARTI_PLAN_YOK, PATLATILDI,
  SILINMIS_PARCA, kgMetni, tlMetni as tl, pbTutarMetni as pbTutar, adetMetni as sayi, tedarikciSecenekleri, bosDurumNedeni,
  TEDARIKCI_BELIRTILMEMIS, anasizParcaMetni, anasizMalzemeliMetni, CIFT_SAYIM_DEGIL, HAMMADDE_SUZGEC_NEDENI, GECICI_DUZENLEME,
  satirsizSecilenMetni, duzenlemeSayiMetni, SILINMIS_TEDARIKCI_BELGE, PARCALARI_KAPALI,
  HAM_IHTIYAC_IBARESI,
} from "../../lib/siparisIhtiyaci";

// Spec 0140 B-R1/2, B-R5, B-R6, C4: tedarikçi odaklı, düzenlenebilir sipariş listesi. TEK dosya, iki giriş noktası (Ayarlar › Katalog ›
// Parça/Yedek Parça ve Stok › Parça/Yedek Parça Stoğu) aynı bileşeni çizer. Salt okunur: hiçbir veri bölümüne yazmaz, yazıcı
// prop'u almaz, kilit almaz, işlem geçmişine yazmaz. Hesabın tamamı `lib/siparisIhtiyaci.js`'te (C1): bu bileşen girdi satırlarını
// ve düzenlemenin HAM metinlerini tutar, motoru tek `useMemo` ile çağırır ve gösterir; adet ya da kilo aritmetiği yazmaz.
// Düzenlemeler geçicidir (D-R6): bileşenin durumudur, pencere kapanınca kaybolur. Para sütunları yalnız `giderYetki` ile (B-R4, C5);
// tedarikçi adları gider yetkisinden bağımsız iner (B-R4/2). Model listesi üretim işaretinden doğrudan süzülür (B-R7).
export const SIPARIS_PENCERE_BASLIGI = "Sipariş Listesi";
export const SIPARIS_DUGMESI = "Sipariş Listesi";
export const BOS_BASLIK = "Model satırı yok";
export const BOS_METNI = "Bir üretim partisi seçin ya da \"Model Satırı Ekle\" ile model ve makina adedi girin.";
export const ELLE_GIRIS = "Parti seçilmedi (elle giriş)";
export const IKI_KAYNAK = "kitten ve setten";
export const BUTUN_TEDARIKCILER = "Seçim yok: bütün tedarikçiler listelenir.";
export const ONERILERE_DON = "Önerilere dön";
// 0134'ün ekran metinleri (eski Makina Maliyeti › Sipariş İhtiyacı dosyasından taşındı; spec 0135 R30/2 kalem dili).
export const hazirSayiMetni = (n) => `${n} parçada malzeme kalemi yok`;
export const MALZEME_KALEMI_YOK_METNI = "Malzeme kalemi olan parça siparişi yok.";
export const eksikMetni = (e) => `${e.parca} parçanın ve ${e.malzeme} malzemenin bilgisi eksik; tutarları toplama girmedi.`;
const th = { padding: "7px 9px", fontSize: 11.5, color: "var(--n500, #64748b)", textAlign: "right", whiteSpace: "nowrap" };
const td = { padding: "6px 9px", fontSize: 12.5, textAlign: "right", whiteSpace: "nowrap", borderTop: "1px solid var(--n100, #f1f5f9)" };
const kucuk = { fontSize: 11, color: "var(--n500, #64748b)" };
const elleIsaret = { fontSize: 10.5, fontWeight: 800, color: "var(--orTx, #c2410c)", marginLeft: 6 };
const girdiStil = { width: 96 };

export const SiparisPenceresi = ({ veri = {}, giderYetki = false, bugun: bugunProp = null, onClose }) => {
  const bugunYerel = useBugun(); // belgenin tarihi yerel gün (0003 dersi; today() UTC değil)
  const bugun = bugunProp || bugunYerel;
  const { parts = [], hamParts = null, partStock = [], malzemeler = [], tedarikciler = [], hamTedarikciler = null, standardModels = [], customModels = [],
    uretimPartileri = [], appSettings = {}, factory = null } = veri;
  // R9 (karar 42): katalog ve partiler pencerede süzülür (iki giriş aynı kural, AC-72).
  const modeller = useMemo(() => [...(standardModels || []), ...(customModels || [])].filter(m => m && !m.deletedAt), [standardModels, customModels]);
  const partiler = useMemo(() => (uretimPartileri || []).filter(p => p && !p.deletedAt), [uretimPartileri]);
  const [partiId, setPartiId] = useState(() => panoVarsayilanParti(partiler)?.id ?? "");
  const parti = partiler.find(p => String(p.id) === String(partiId)) || null;
  const ilk = useMemo(() => (parti ? partidenSatirlar(parti, modeller) : { satirlar: [], bulunamayan: [], bos: true }), [parti, modeller]);
  const [satirlar, setSatirlar] = useState(() => ilk.satirlar);
  const [secim, setSecim] = useState([]);
  const [duzen, setDuzen] = useState({ parca: {}, kesit: {} });
  const partiSec = (id) => {
    setPartiId(id);
    const p = partiler.find(x => String(x.id) === String(id));
    setSatirlar(p ? partidenSatirlar(p, modeller).satirlar : []);
  };
  const secenekler = useMemo(() => tedarikciSecenekleri({ tedarikciler, parts, malzemeler }).map(t => ({ id: String(t.id), ad: t.ad })), [tedarikciler, parts, malzemeler]);
  const sonuc = useMemo(() => siparisIhtiyaci({ modeller, satirlar, parts, hamParts, partStock, malzemeler, tedarikciler, hamTedarikciler },
    { tedarikciOdakli: true, duzenleme: duzen, secilenTedarikciler: secim }),
  [modeller, satirlar, parts, hamParts, partStock, malzemeler, tedarikciler, hamTedarikciler, duzen, secim]);
  const tb = sonuc.tedarikciBolumleri;
  const yaz = (i, alan, v) => setSatirlar(p => p.map((s, j) => (j === i ? { ...s, [alan]: v } : s)));
  // B-R7, C9: seçici üretim işaretinden süzülür; satırın kendi modeli işaretten çıkmış olsa da korunur (AC-68).
  const modelSecenekleri = (mevcut) => uretimdeSuzulmusModeller(appSettings, modeller, { korunan: [mevcut] }).map(x => x.m.model);
  const parcaYaz = (id, alan, v) => setDuzen(d => ({ ...d, parca: { ...d.parca, [id]: { ...d.parca[id], [alan]: v } } }));
  const kesitYaz = (an, alan, v) => setDuzen(d => ({ ...d, kesit: { ...d.kesit, [an]: { ...d.kesit[an], [alan]: v } } }));
  const parcaAdet = (id, oneri) => duzen.parca[id]?.adet ?? String(oneri ?? 0);
  const kesitDeger = (k) => duzen.kesit[k.anahtar]?.deger ?? (k.yontem === "boy" ? String(k.oneriBoyAdedi ?? k.boyAdedi ?? "") : (k.oneriSiparisKg ?? k.siparisKg) == null ? "" : String(Number((k.oneriSiparisKg ?? k.siparisKg).toFixed(3))).replace(".", ","));
  const bosNeden = bosDurumNedeni(sonuc);
  // Triyaj (bulgu 3, D-R7): hatalı değer de bir düzenlemedir; "Önerilere dön" onu da geri alır.
  const duzenVar = tb && (tb.duzen.duzenlenen > 0 || tb.duzen.kapatilan > 0 || tb.duzen.hata > 0);

  // Tablolar bileşen değil çizim fonksiyonudur: bileşen olsaydı her çizimde yeniden kurulur, giriş alanı her tuşta odağı kaybederdi.
  const hazirTablo = (rows) => (
    <table data-testid="siparis-hazir-tablosu" style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead><tr><th style={{ ...th, textAlign: "left" }}>Hazır parça</th><th style={th}>İhtiyaç</th><th style={th}>Stok</th><th style={th}>Sipariş (öneri)</th><th style={th}>Sipariş adedi</th>
        {giderYetki && <><th style={th}>Birim maliyet</th><th style={th}>Tutar</th></>}<th style={th}>Sipariş etme</th></tr></thead>
      <tbody>{rows.map(x => (
        <tr key={x.partId} data-testid="siparis-hazir-satiri" data-kapali={x.kapali ? "1" : "0"} style={x.kapali ? { opacity: 0.55 } : undefined}>
          <td style={{ ...td, textAlign: "left", whiteSpace: "normal" }}><b>{x.ad}</b>{x.duzenlendi && <span data-testid="siparis-duzenlendi" style={elleIsaret}>DÜZENLENDİ</span>}</td>
          <td style={td}>{sayi(x.ihtiyac)}</td><td style={td}>{sayi(x.stok)}</td>
          <td style={td} data-testid="siparis-oneri">{sayi(x.oneri)}</td>
          <td style={td}><div style={girdiStil}><Input value={parcaAdet(x.partId, x.oneri)} inputMode="numeric" onChange={e => parcaYaz(x.partId, "adet", e.target.value)} aria-label={`${x.ad} sipariş adedi`} disabled={x.kapali} /></div>
            <HataMetni>{x.hata}</HataMetni></td>
          {giderYetki && <><td style={td}>{x.birimK == null ? "—" : tl(x.birimK)}</td>
            <td style={td} data-testid="siparis-hazir-tutar">{x.tutarK == null ? <span style={kucuk}>{x.tutarNeden || "—"}</span> : tl(x.tutarK)}</td></>}
          <td style={td}><input type="checkbox" checked={x.kapali} onChange={e => parcaYaz(x.partId, "kapali", e.target.checked)} aria-label={`${x.ad} sipariş etme`} /></td>
        </tr>))}</tbody>
    </table>
  );
  const malzemeTablo = (rows) => (
    <table data-testid="siparis-malzeme-tablosu" style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead><tr><th style={{ ...th, textAlign: "left" }}>Malzeme · kesit</th><th style={th}>Net kg</th><th style={th}>Fire kg</th><th style={th}>Sipariş (öneri)</th><th style={th}>Sipariş kg / boy</th><th style={th}>Boy</th><th style={th}>Asgari farkı</th>
        {giderYetki && <><th style={th}>Tutar</th><th style={th}>TL</th></>}<th style={th}>Sipariş etme</th></tr></thead>
      <tbody>{rows.map(k => {
        const oneriKg = k.oneriSiparisKg !== undefined ? k.oneriSiparisKg : k.siparisKg;
        const oneriBoy = k.oneriBoyAdedi !== undefined ? k.oneriBoyAdedi : k.boyAdedi;
        return (
          <tr key={k.anahtar} data-testid="siparis-kesit-satiri" data-kapali={k.kapali ? "1" : "0"} style={k.kapali ? { opacity: 0.55 } : undefined}>
            <td style={{ ...td, textAlign: "left", whiteSpace: "normal", minWidth: 260 }}><b>{k.malzemeAd}</b> · {k.kesitMetni}{k.yontem === "boy" ? " · boy fiyatından" : ""}
              {k.elle && <span data-testid="siparis-elle" style={elleIsaret}>ELLE</span>}
              {k.parcalarKapali && <div data-testid="siparis-parcalari-kapali" style={kucuk}>{PARCALARI_KAPALI}</div>}
              {[k.kgNeden, k.boyNeden, k.fireUyarisi, k.tutarNeden, k.asgariUyari].filter(Boolean).map(x => <div key={x} data-testid="siparis-kesit-neden" style={kucuk}>{x}</div>)}</td>
            <td style={td}>{k.netKg == null ? "—" : kgMetni(k.netKg)}</td>
            <td style={td}>{k.fireKg == null ? "—" : kgMetni(k.fireKg)}</td>
            <td style={td} data-testid="siparis-kesit-oneri">{k.yontem === "boy" ? `${sayi(oneriBoy)} boy` : oneriKg == null ? "—" : kgMetni(oneriKg)}</td>
            <td style={td}><div style={girdiStil}><Input value={kesitDeger(k)} onChange={e => kesitYaz(k.anahtar, "deger", e.target.value)} aria-label={`${k.malzemeAd} ${k.kesitMetni} sipariş`} disabled={k.kapali} /></div>
              <HataMetni>{k.hata}</HataMetni></td>
            <td style={td} data-testid="siparis-boy">{k.boyAdedi == null ? "—" : `${k.boyAdedi} boy`}</td>
            <td style={td}>{k.asgariFark == null ? "" : kgMetni(k.asgariFark)}</td>
            {giderYetki && <><td style={td}>{pbTutar(k.tutarK, k.paraBirimi)}</td><td style={{ ...td, fontWeight: 700 }} data-testid="siparis-kesit-tl">{tl(k.tutarTLK)}</td></>}
            <td style={td}><input type="checkbox" checked={!!k.kapali} onChange={e => kesitYaz(k.anahtar, "kapali", e.target.checked)} aria-label={`${k.malzemeAd} ${k.kesitMetni} sipariş etme`} /></td>
          </tr>);
      })}</tbody>
    </table>
  );

  return (
    <Modal title={SIPARIS_PENCERE_BASLIGI} onClose={onClose} wide>
      <div data-testid="siparis-penceresi">
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 8 }}>
          <div style={{ minWidth: 240 }}>
            <Field label="Üretim partisi">
              <Select value={String(partiId ?? "")} onChange={e => partiSec(e.target.value)} aria-label="Üretim partisi">
                <option value="">{ELLE_GIRIS}</option>
                {partiler.map(p => <option key={p.id} value={String(p.id)}>{partiSecenekAdi(p)}</option>)}
              </Select>
            </Field>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8, marginBottom: 12, alignItems: "center", flexWrap: "wrap" }}>
            <Btn variant="ghost" onClick={() => setSatirlar(p => [...p, { model: "", adet: "" }])}><Icon name="plus" size={13} /> Model Satırı Ekle</Btn>
            <Btn variant="ghost" onClick={() => setDuzen({ parca: {}, kesit: {} })} disabled={!duzenVar}>{ONERILERE_DON}</Btn>
            <SiparisRaporuDugmesi sonuc={sonuc} bugun={bugun} factory={factory} partiAd={parti?.ad || null} paraGoster={giderYetki} />
          </div>
        </div>
        {parti && ilk.bos && <Ipucu><span data-testid="siparis-parti-plan-yok">{PARTI_PLAN_YOK}</span></Ipucu>}
        {parti && ilk.bulunamayan.length > 0 && (
          <UyariSeridi aile="uyari" testId="siparis-bulunamayan-model">Partinin planlanan adetlerinde katalogda bulunamayan model hesaba girmedi: {ilk.bulunamayan.join(", ")}</UyariSeridi>)}
        {satirlar.length > 0 && (
          <div data-testid="siparis-model-satirlari" style={{ display: "grid", gap: 6, margin: "6px 0 10px", maxWidth: 560 }}>
            {satirlar.map((s, i) => (
              <div key={i}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 130px auto", gap: 8, alignItems: "center" }}>
                  <Select value={s.model} onChange={e => yaz(i, "model", e.target.value)} aria-label={`Model ${i + 1}`}>
                    <option value="">Model seçin</option>
                    {modelSecenekleri(s.model).map(m => <option key={m} value={m}>{m}</option>)}
                  </Select>
                  <Input value={s.adet} inputMode="numeric" onChange={e => yaz(i, "adet", e.target.value)} placeholder="Makina adedi" aria-label={`Makina adedi ${i + 1}`} />
                  <Btn small variant="danger" title="Sil" aria-label={`Model satırı ${i + 1} sil`} onClick={() => setSatirlar(p => p.filter((_, j) => j !== i))}><Icon name="trash" size={12} /></Btn>
                </div>
                <HataMetni>{sonuc.satirlar[i]?.hata || ""}</HataMetni>
              </div>
            ))}
          </div>
        )}
        <div style={{ maxWidth: 560, marginBottom: 8 }}>
          <Field label="Tedarikçiler">
            <CokluSecim testId="siparis-tedarikci-secici" ariaLabel="Tedarikçi seçimi" secenekler={secenekler} secili={secim} onChange={setSecim}
              aramaYerTutucu="Tedarikçi ara..." bosMetni={BUTUN_TEDARIKCILER} />
          </Field>
          <Ipucu><span data-testid="siparis-suzgec-nedeni">{HAMMADDE_SUZGEC_NEDENI}</span></Ipucu>
          {tb.satirsizSecilen.length > 0 && <Ipucu><span data-testid="siparis-satirsiz-secilen">{satirsizSecilenMetni(secim.length, tb.satirsizSecilen.length)}</span></Ipucu>}
        </div>

        {sonuc.hataliSayi > 0 && <UyariSeridi aile="hata" testId="siparis-hatali-satir">{hataliSatirMetni(sonuc.hataliSayi)}</UyariSeridi>}
        {satirlar.length === 0 ? (
          <BosDurum testId="bos-siparis" baslik={BOS_BASLIK} metin={BOS_METNI} />
        ) : sonuc.gecerliSayi > 0 && (
          <>
            <div style={{ display: "grid", gap: 6, margin: "6px 0" }}>
              {sonuc.kitBos.map(m => <Ipucu key={m}><span data-testid="siparis-kit-bos">{KIT_BOS_METNI(m)}</span></Ipucu>)}
              {sonuc.kesisimler.map(k => <UyariSeridi key={`${k.setAd}|${k.bilesenAd}`} aile="uyari" testId="siparis-kesisim">{KESISIM_UYARISI(k.setAd, k.bilesenAd)}</UyariSeridi>)}
              {sonuc.stokUyarisi && <UyariSeridi aile="uyari" testId="siparis-stok-uyarisi">{STOK_UYARISI(sonuc.stokUyarisi.stoklu, sonuc.stokUyarisi.toplam)}</UyariSeridi>}
              <div data-testid="siparis-eksik" style={{ fontSize: 12.5, color: sonuc.eksik.parca || sonuc.eksik.malzeme ? "var(--amb700, #b45309)" : "var(--n500, #64748b)", fontWeight: 600 }}>
                {sonuc.eksik.parca || sonuc.eksik.malzeme ? eksikMetni(sonuc.eksik) : "Eksik bilgi yok."}
                <span data-testid="siparis-hazir" style={{ color: "var(--n500, #64748b)", fontWeight: 400 }}> · {hazirSayiMetni(sonuc.hazirSayi)}</span>
              </div>
              {sonuc.kesitler.length === 0 && <Ipucu><span data-testid="siparis-malzeme-yok">{MALZEME_KALEMI_YOK_METNI}</span></Ipucu>}
              <div style={{ display: "flex", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
                <span data-testid="siparis-duzen-sayilari" style={{ fontSize: 12.5, fontWeight: 700, color: duzenVar ? "var(--orTx, #c2410c)" : "var(--n500, #64748b)" }}>{duzenlemeSayiMetni(tb.duzen)}</span>
                <span data-testid="siparis-gecici" style={kucuk}>{GECICI_DUZENLEME}</span>
              </div>
              <Ipucu><span data-testid="siparis-cift-sayim">{CIFT_SAYIM_DEGIL}</span></Ipucu>
            </div>
            {bosNeden && <BosDurum testId="bos-siparis-tedarikci" baslik="Sipariş edilecek satır yok" metin={bosNeden} />}
            {tb.bolumler.map(b => (
              <KartBolum key={b.tedarikciId} varyant="kart" style={{ padding: 0, overflow: "auto", marginBottom: 10 }} testId="siparis-tedarikci-bolumu">
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", fontWeight: 700, fontSize: 13 }}>
                  <span data-testid="siparis-tedarikci-adi">{b.ad}</span>{giderYetki && <span data-testid="siparis-tedarikci-toplam">{tl(b.tutarTLK)}</span>}
                </div>
                {b.silinmis && <div style={{ padding: "0 12px 6px" }}><span data-testid="siparis-silinmis-tedarikci" style={kucuk}>{SILINMIS_TEDARIKCI_BELGE}</span></div>}
                {b.hazirParcalar.length > 0 && hazirTablo(b.hazirParcalar)}
                {b.malzemeler.length > 0 && malzemeTablo(b.malzemeler)}
              </KartBolum>))}
            {!tb.secimVar && (tb.belirtilmemis.parcalar.length + tb.belirtilmemis.kesitler.length > 0 || tb.belirtilmemis.anasizMalzemeli > 0) && (
              <KartBolum varyant="kart" collapsible title={`${TEDARIKCI_BELIRTILMEMIS} (${tb.belirtilmemis.parcalar.length + tb.belirtilmemis.kesitler.length})`} testId="siparis-belirtilmemis" style={{ marginBottom: 10 }}>
                {tb.belirtilmemis.parcalar.length > 0 && <Ipucu><span data-testid="siparis-anasiz-parca">{anasizParcaMetni(tb.belirtilmemis.parcalar.length)}</span></Ipucu>}
                {tb.belirtilmemis.anasizMalzemeli > 0 && <Ipucu><span data-testid="siparis-anasiz-malzemeli">{anasizMalzemeliMetni(tb.belirtilmemis.anasizMalzemeli)}</span></Ipucu>}
                {tb.belirtilmemis.parcalar.length > 0 && hazirTablo(tb.belirtilmemis.parcalar)}
                {tb.belirtilmemis.kesitler.length > 0 && malzemeTablo(tb.belirtilmemis.kesitler)}
              </KartBolum>)}
            {/* C-R10 (AC-79), karar 34: bugünkü tam tablo katlanabilir; yalnız set satırları düzenlenir (adet ve kapatma). */}
            <KartBolum varyant="kart" collapsible title="Parça ihtiyacı" testId="siparis-parca-ihtiyaci" style={{ padding: 0, overflow: "auto" }}>
              {/* Spec 0141 B-R4/2 (AC-51): iki sütunun farkını açıklayan ibare motorun sabitinden. */}
              <div style={{ padding: "8px 12px 0" }}><Ipucu><span data-testid="siparis-ham-ibare">{HAM_IHTIYAC_IBARESI}</span></Ipucu></div>
              <table data-testid="siparis-parca-tablosu" style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><th style={{ ...th, textAlign: "left" }}>Parça</th><th style={th}>Ham ihtiyaç</th><th style={th}>İhtiyaç</th><th style={th}>Stok</th><th style={th}>Sipariş (öneri)</th><th style={th}>Sipariş</th><th style={th}>Sipariş etme</th></tr></thead>
                <tbody>{sonuc.parcalar.map(p => {
                  const d = tb.parcaDurumu[p.partId];
                  return (
                    <tr key={p.partId} data-testid="siparis-parca-satiri">
                      <td style={{ ...td, textAlign: "left", whiteSpace: "normal" }}>
                        <b>{p.ad}</b>{p.silinmis && <span data-testid="siparis-silinmis" style={{ color: "var(--red600, #dc2626)" }}> ({SILINMIS_PARCA})</span>}
                        {p.set && <span style={{ marginLeft: 6, fontSize: 10.5, fontWeight: 800, color: "var(--pur700, #6d28d9)" }}>SET{p.patlatildi ? <span data-testid="siparis-patlatildi"> · {PATLATILDI}</span> : null}</span>}
                        {p.setNeden && <div data-testid="siparis-set-neden" style={kucuk}>{p.setNeden}</div>}
                        {p.iki && <div data-testid="siparis-iki-kaynak" style={{ fontSize: 11, color: "var(--amb700, #b45309)" }}>{IKI_KAYNAK}: {p.kaynaklar.map(k => k.metin).join(", ")}</div>}
                      </td>
                      <td style={td}>{sayi(p.ham)}</td>
                      <td style={{ ...td, fontWeight: 600 }}>{sayi(p.ihtiyac)}</td>
                      <td style={td}>{sayi(p.stok)}</td>
                      <td style={td}>{sayi(d ? d.oneri : p.siparis)}</td>
                      <td style={{ ...td, fontWeight: 700 }} data-testid="siparis-siparis">{p.set && d ? (
                        <><div style={girdiStil}><Input value={parcaAdet(p.partId, d.oneri)} inputMode="numeric" onChange={e => parcaYaz(p.partId, "adet", e.target.value)} aria-label={`${p.ad} set sipariş adedi`} disabled={d.kapali} /></div><HataMetni>{d.hata}</HataMetni></>
                      ) : sayi(p.siparis)}</td>
                      <td style={td}>{p.set && d ? <input type="checkbox" checked={d.kapali} onChange={e => parcaYaz(p.partId, "kapali", e.target.checked)} aria-label={`${p.ad} set sipariş etme`} /> : null}</td>
                    </tr>);
                })}</tbody>
              </table>
            </KartBolum>
          </>
        )}
      </div>
    </Modal>
  );
};
