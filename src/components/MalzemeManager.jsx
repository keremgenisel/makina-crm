import { useState, useMemo } from "react";
import { uid } from "../lib/utils";
import { logAction } from "../lib/audit";
import { Field, Input, Select, Btn, Modal, ConfirmDialog, Icon } from "./ui";
import { BosDurum, HataMetni, Ipucu, BolumBasligi, KartBolum } from "./tasarim";
import {
  PARA_BIRIMLERI, PARA_ADI, dovizMi, malzemeDogrula, malzemeFormu, malzemeEksikleri, eksikMalzemeSayisi, malzemeKullanimi, kullanimMetni,
  fiyatMetni, bantlarOf, bantMetni, fiyatGecmisiSatirlari, kurOnerisi, PANEL_IPUCU, BOS_BASLIK, BOS_METNI, eksikSayiMetni, EKSIK_ROZETI,
  BANT_LAMA_NOTU, kumeOzeti, fiyatKumesi, EMNIYET_PAYI_ETIKETI, EMNIYET_PAYI_IPUCU,
} from "../lib/malzeme";
import { MalzemeFiyatPenceresi } from "./MalzemeFiyatPenceresi";

// Spec 0132: Ayarlar › Katalog › Malzemeler. Panel `ayar:malzemeler` kilidi altında çizilir (Settings, C6); fiyat güncelleme
// penceresi aynı kilidi kullanır (Karar 31). Liste canlı dizidir, yazım tam dizide işlevsel güncelleyiciyle (çöptekiler korunur).
// Hesap yok: bütün kurallar `lib/malzeme.js`'ten (C1, C2).
export const MALZEME_EKLE = "Yeni Malzeme";
export const FIYAT_GUNCELLE = "Fiyatı Güncelle";
export const GUNUN_KURU_DUGMESI = "Günün kurunu kullan";
export const FIYAT_KARTTA_NOTU = "Fiyat, para birimi, kur, bantlar ve boy fiyatı \"Fiyatı Güncelle\" penceresinden değişir; değişiklik tarihli geçmişe yazılır.";
const BOS_FORM = malzemeFormu({});

// Fiyat kümesinin form alanları (yeni malzemede kartta, düzenlemede pencerede). Pencere de bu bileşeni çizer.
export const FiyatAlanlari = ({ form, set, hatalar = {}, rates, ratesErr }) => {
  const oneri = kurOnerisi(form.paraBirimi, rates, ratesErr);
  const bantlar = form.bantlar || [];
  const bantSet = (i, alan, v) => set("bantlar", bantlar.map((b, j) => (j === i ? { ...b, [alan]: v } : b)));
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Fiyatın para birimi">
          <Select value={form.paraBirimi} onChange={e => {
            const pb = e.target.value;
            const o = kurOnerisi(pb, rates, ratesErr);
            set("paraBirimi", pb);
            if (dovizMi(pb) && !String(form.kur || "").trim() && o.deger) set("kur", String(o.deger).replace(".", ","));
          }} aria-label="Fiyatın para birimi">
            {PARA_BIRIMLERI.map(pb => <option key={pb} value={pb}>{PARA_ADI[pb]}</option>)}
          </Select>
          <HataMetni>{hatalar.paraBirimi}</HataMetni>
        </Field>
        <Field label="Kilo fiyatı (KDV hariç)">
          <Input value={form.kiloFiyati} onChange={e => set("kiloFiyati", e.target.value)} placeholder="0,00" aria-label="Kilo fiyatı" />
          <HataMetni>{hatalar.kiloFiyati}</HataMetni>
        </Field>
      </div>
      {dovizMi(form.paraBirimi) && (
        <Field label={`Kur (1 ${PARA_ADI[form.paraBirimi]} kaç TL)`}>
          <Input value={form.kur} onChange={e => set("kur", e.target.value)} placeholder="0,00" aria-label="Kur" />
          <HataMetni>{hatalar.kur}</HataMetni>
          {oneri.neden ? <Ipucu><span data-testid="kur-neden">{oneri.neden}</span></Ipucu>
            : <Ipucu><span data-testid="kur-oneri">Günün kuru: {String(oneri.deger).replace(".", ",")} TL. Kaydedilen değer bu alandaki kurdur; kur değişince maliyet de değişir.</span>
              {/* Triyaj (bulgu 1, Karar 41): günün kuru yalnız bu düğmeyle alana yazılır; kayıtlı kur kendiliğinden değişmez. */}
              {String(form.kur || "").trim() !== String(oneri.deger).replace(".", ",") && (
                <Btn small variant="ghost" onClick={() => set("kur", String(oneri.deger).replace(".", ","))}>{GUNUN_KURU_DUGMESI}</Btn>)}</Ipucu>}
        </Field>
      )}
      <BolumBasligi>Çap bandı (isteğe bağlı)</BolumBasligi>
      <Ipucu>{BANT_LAMA_NOTU} Bandı ham çap (işleme payı dahil) seçer. İlk bandın alt sınırı 0'dır; en üst bant açık uçludur.</Ipucu>
      <div data-testid="bant-listesi" style={{ marginTop: 8, marginBottom: 14 }}>
        {bantlar.map((b, i) => (
          <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: "var(--n500, #64748b)", width: 70 }}>Ø alt sınır</span>
            <div style={{ width: 110 }}><Input value={i === 0 ? "0" : b.alt} disabled={i === 0} onChange={e => bantSet(i, "alt", e.target.value)} aria-label={`Bant ${i + 1} alt sınırı`} /></div>
            <span style={{ fontSize: 12, color: "var(--n500, #64748b)" }}>kilo fiyatı</span>
            <div style={{ width: 120 }}><Input value={b.fiyat} onChange={e => bantSet(i, "fiyat", e.target.value)} aria-label={`Bant ${i + 1} kilo fiyatı`} /></div>
            <Btn small variant="ghost" aria-label={`Bant ${i + 1} sil`} onClick={() => set("bantlar", bantlar.filter((_, j) => j !== i))}><Icon name="trash" size={13} /></Btn>
          </div>
        ))}
        <Btn small variant="ghost" onClick={() => set("bantlar", [...bantlar, { alt: bantlar.length ? "" : "0", fiyat: "" }])}><Icon name="plus" size={13} /> Bant ekle</Btn>
        <HataMetni>{hatalar.bantlar}</HataMetni>
      </div>
      <Field label="Boy fiyatı (bir boy, KDV hariç; boy yöntemli parçalar için)">
        <Input value={form.boyFiyati} onChange={e => set("boyFiyati", e.target.value)} placeholder="0,00" aria-label="Boy fiyatı" />
        <HataMetni>{hatalar.boyFiyati}</HataMetni>
      </Field>
    </>
  );
};

export const MalzemeManager = ({ malzemeler = [], setMalzemeler, parts = [], tedarikciler = [], giderYetki = false, rates = null, ratesErr = false,
  bugun, showToast = () => {}, serverPermissions = null, fiyatAyarlari = null,
  // Spec 0137 R32 (triyaj bulgu 1): dış işlem listesi zam önizlemesine iletilir (karma parça sayılsın).
  disIslemler = [] }) => {
  const [form, setForm] = useState(null); // { ...malzemeFormu, id }
  const [hatalar, setHatalar] = useState({});
  const [sil, setSil] = useState(null);
  const [fiyat, setFiyat] = useState(null); // güncellenen malzeme
  const eksikSayi = eksikMalzemeSayisi(malzemeler);
  // C9, R20/2: ana tedarikçi Giderler'in canlı tedarikçilerinden; hammadde işaretliler başta (AC-15). Liste Settings'te gider
  // yetkisiyle kapılı gelir; yetkisizde alan çizilmez, saklı değer formda olduğu gibi taşınır (AC-75).
  const tedSecenek = useMemo(() => (tedarikciler || []).filter(t => !t.deletedAt)
    .sort((a, b) => (b.hammadde === true) - (a.hammadde === true) || String(a.ad).localeCompare(String(b.ad), "tr")), [tedarikciler]);
  const set = (alan, v) => setForm(f => ({ ...f, [alan]: v }));
  const ac = (m) => {
    setHatalar({});
    if (!m) { const f = { ...BOS_FORM, id: null }; setForm(f); return; }
    setForm({ ...malzemeFormu(m), id: m.id });
  };
  const kaydet = () => {
    const eski = form.id == null ? null : malzemeler.find(m => String(m.id) === String(form.id));
    // Düzenlemede fiyat kümesi formda yoktur; eskisinden taşınır (değişikliği yalnız pencere yapar, R6).
    const kaynak = eski ? { ...form, ...malzemeFormu(eski), ad: form.ad, alasim: form.alasim, ozgulAgirlik: form.ozgulAgirlik, geldigiBoy: form.geldigiBoy,
      asgariSiparis: form.asgariSiparis, fire: form.fire, emniyetPayi: form.emniyetPayi, tedarikciId: giderYetki ? form.tedarikciId : malzemeFormu(eski).tedarikciId } : form;
    const v = malzemeDogrula(kaynak, malzemeler, form.id);
    if (!v.gecerli) { setHatalar(v.hatalar); return; }
    const yeni = form.id == null;
    const kayit = { ...v.kayit, id: yeni ? uid() : eski.id, ...(eski?.fiyatGecmisi?.length ? { fiyatGecmisi: eski.fiyatGecmisi } : {}) };
    setMalzemeler(p => (yeni ? [...p, kayit] : p.map(m => (String(m.id) === String(kayit.id) ? { ...kayit, ...(m.deletedAt ? { deletedAt: m.deletedAt } : {}) } : m))));
    logAction({ serverPermissions, action: yeni ? "olusturuldu" : "duzenlendi", entity: "malzeme", entityId: kayit.id, entityName: kayit.ad });
    setForm(null);
    showToast(yeni ? "Malzeme eklendi." : "Malzeme güncellendi.");
  };
  const silOnay = () => {
    const damga = new Date().toISOString();
    setMalzemeler(p => p.map(m => (String(m.id) === String(sil.id) ? { ...m, deletedAt: damga } : m)));
    logAction({ serverPermissions, action: "silindi", entity: "malzeme", entityId: sil.id, entityName: sil.ad });
    setSil(null);
    showToast("Malzeme çöp kutusuna taşındı.");
  };
  const eski = form?.id != null ? malzemeler.find(m => String(m.id) === String(form.id)) : null;

  return (
    <div>
      <Ipucu>{PANEL_IPUCU}</Ipucu>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, margin: "12px 0" }}>
        <div data-testid="malzeme-eksik-sayisi" style={{ fontSize: 12.5, color: eksikSayi ? "var(--amb700, #b45309)" : "var(--n500, #64748b)", fontWeight: 600 }}>
          {eksikSayi ? eksikSayiMetni(eksikSayi) : `${malzemeler.length} malzeme`}
        </div>
        <Btn onClick={() => ac(null)}><Icon name="plus" size={14} /> {MALZEME_EKLE}</Btn>
      </div>
      {malzemeler.length === 0 ? (
        <BosDurum testId="bos-malzeme" baslik={BOS_BASLIK} metin={BOS_METNI} />
      ) : (
        <KartBolum varyant="kart" style={{ padding: 0, overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead><tr style={{ textAlign: "left", color: "var(--n500, #64748b)", fontSize: 11.5 }}>
              <th style={{ padding: "10px 14px" }}>Malzeme</th><th style={{ padding: "10px 14px", textAlign: "right" }}>Özgül ağırlık</th>
              <th style={{ padding: "10px 14px" }}>Fiyat</th><th style={{ padding: "10px 14px" }}>Kullanım</th><th style={{ padding: "10px 14px" }} />
            </tr></thead>
            <tbody>
              {malzemeler.map(m => {
                const eksik = malzemeEksikleri(m);
                const k = malzemeKullanimi(m.id, parts);
                return (
                  <tr key={m.id} data-testid="malzeme-satiri" style={{ borderTop: "1px solid var(--n100, #f1f5f9)" }}>
                    <td style={{ padding: "10px 14px" }}>
                      <b>{m.ad}</b>{m.alasim ? <span style={{ color: "var(--n500, #64748b)" }}> · {m.alasim}</span> : null}
                      {eksik.length > 0 && <span data-testid="malzeme-eksik" title={eksik.join(", ")} style={{ marginLeft: 8, fontSize: 10.5, fontWeight: 800, textTransform: "uppercase", padding: "2px 7px", borderRadius: 6, background: "var(--ambBg, #fffbeb)", color: "var(--amb700, #b45309)", border: "1px solid var(--ambBr, #fde68a)" }}>{EKSIK_ROZETI}</span>}
                      {eksik.length > 0 && <div style={{ fontSize: 11, color: "var(--n500, #64748b)" }}>{eksik.join(", ")}</div>}
                    </td>
                    <td style={{ padding: "10px 14px", textAlign: "right" }}>{m.ozgulAgirlik != null ? String(m.ozgulAgirlik).replace(".", ",") : "—"}</td>
                    <td style={{ padding: "10px 14px" }} data-testid="malzeme-fiyat">{kumeOzeti(fiyatKumesi(m))}</td>
                    <td style={{ padding: "10px 14px", color: "var(--n600, #475569)" }}>{kullanimMetni(k)}</td>
                    <td style={{ padding: "10px 14px", whiteSpace: "nowrap", textAlign: "right" }}>
                      <Btn small variant="ghost" title={FIYAT_GUNCELLE} onClick={() => setFiyat(m)}>{FIYAT_GUNCELLE}</Btn>
                      <Btn small variant="ghost" title="Düzenle" aria-label={`${m.ad} düzenle`} onClick={() => ac(m)}><Icon name="edit" size={13} /></Btn>
                      <Btn small variant="ghost" title="Sil" aria-label={`${m.ad} sil`} onClick={() => setSil(m)}><Icon name="trash" size={13} /></Btn>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </KartBolum>
      )}

      {form && (
        <Modal title={form.id == null ? MALZEME_EKLE : "Malzemeyi Düzenle"} onClose={() => setForm(null)} wide
          footer={<><Btn variant="ghost" onClick={() => setForm(null)}>Vazgeç</Btn><Btn onClick={kaydet}>Kaydet</Btn></>}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Malzeme adı"><Input value={form.ad} onChange={e => set("ad", e.target.value)} aria-label="Malzeme adı" /><HataMetni>{hatalar.ad}</HataMetni></Field>
            <Field label="Alaşım / kalite"><Input value={form.alasim} onChange={e => set("alasim", e.target.value)} aria-label="Alaşım" /></Field>
            <Field label="Özgül ağırlık (g/cm³)"><Input value={form.ozgulAgirlik} onChange={e => set("ozgulAgirlik", e.target.value)} placeholder="7,85" aria-label="Özgül ağırlık" /><HataMetni>{hatalar.ozgulAgirlik}</HataMetni></Field>
            <Field label="Varsayılan fire (%)"><Input value={form.fire} onChange={e => set("fire", e.target.value)} placeholder="0" aria-label="Varsayılan fire" /><HataMetni>{hatalar.fire}</HataMetni></Field>
            {/* Spec 0134 R9, R21/2, AC-60: emniyet payı firenin komşusunda; yalnız siparişi etkiler. */}
            <Field label={EMNIYET_PAYI_ETIKETI}><Input value={form.emniyetPayi} onChange={e => set("emniyetPayi", e.target.value)} placeholder="0" aria-label="Malzeme emniyet payı" /><HataMetni>{hatalar.emniyetPayi}</HataMetni><Ipucu>{EMNIYET_PAYI_IPUCU}</Ipucu></Field>
            <Field label="Geldiği boy (metre)"><Input value={form.geldigiBoy} onChange={e => set("geldigiBoy", e.target.value)} placeholder="6" aria-label="Geldiği boy" /><HataMetni>{hatalar.geldigiBoy}</HataMetni></Field>
            <Field label="Asgari sipariş (kilogram)"><Input value={form.asgariSiparis} onChange={e => set("asgariSiparis", e.target.value)} aria-label="Asgari sipariş" /><HataMetni>{hatalar.asgariSiparis}</HataMetni></Field>
          </div>
          {giderYetki && (
            <Field label="Ana tedarikçi">
              <Select value={form.tedarikciId} onChange={e => set("tedarikciId", e.target.value)} aria-label="Ana tedarikçi">
                <option value="">Seçilmedi</option>
                {tedSecenek.map(t => <option key={t.id} value={String(t.id)}>{t.ad}{t.hammadde === true ? " · hammadde" : ""}</option>)}
              </Select>
            </Field>
          )}
          <BolumBasligi ust>Fiyat</BolumBasligi>
          {eski ? (
            <div data-testid="malzeme-fiyat-ozeti">
              <div style={{ fontSize: 13, fontWeight: 600 }}>{kumeOzeti(fiyatKumesi(eski))}</div>
              {bantlarOf(eski).length > 0 && <div style={{ fontSize: 12, color: "var(--n600, #475569)" }}>{bantlarOf(eski).map((b, i, d) => `${bantMetni(d, i)}: ${fiyatMetni(b.fiyat, fiyatKumesi(eski).paraBirimi)}/kg`).join(" · ")}</div>}
              <Ipucu>{FIYAT_KARTTA_NOTU}</Ipucu>
              <BolumBasligi ust>Fiyat geçmişi</BolumBasligi>
              {fiyatGecmisiSatirlari(eski).length === 0 ? <Ipucu>Henüz fiyat değişikliği yok.</Ipucu> : (
                <div data-testid="fiyat-gecmisi">{fiyatGecmisiSatirlari(eski).map((s, i) => (
                  <div key={i} style={{ fontSize: 12.5, display: "flex", gap: 10, padding: "3px 0" }}><span style={{ width: 120, color: "var(--n500, #64748b)" }}>{s.tarihMetni}</span><span>{s.ozet}</span></div>))}</div>
              )}
            </div>
          ) : (
            <FiyatAlanlari form={form} set={set} hatalar={hatalar} rates={rates} ratesErr={ratesErr} />
          )}
        </Modal>
      )}

      {sil && (
        <ConfirmDialog title="Malzeme silinsin mi?" onCancel={() => setSil(null)} onConfirm={silOnay}
          message={<span data-testid="malzeme-sil-kullanim"><b>{sil.ad}</b> çöp kutusuna taşınacak. {kullanimMetni(malzemeKullanimi(sil.id, parts))} Bağlı parçaların maliyeti malzeme geri alınana kadar "girilmedi" görünür.</span>} />
      )}

      {fiyat && (
        <MalzemeFiyatPenceresi malzeme={fiyat} malzemeler={malzemeler} setMalzemeler={setMalzemeler} parts={parts} rates={rates} ratesErr={ratesErr} fiyatAyarlari={fiyatAyarlari} disIslemler={disIslemler}
          bugun={bugun} onClose={() => setFiyat(null)} showToast={showToast} serverPermissions={serverPermissions} />
      )}
    </div>
  );
};
