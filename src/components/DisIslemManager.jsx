import { useState, useMemo } from "react";
import { uid } from "../lib/utils";
import { logAction } from "../lib/audit";
import { Field, Input, Select, Btn, Modal, ConfirmDialog, Icon } from "./ui";
import { BosDurum, HataMetni, Ipucu, BolumBasligi, KartBolum } from "./tasarim";
import { kurOnerisi } from "../lib/malzeme";
import { kalemIslemIdleri } from "../lib/maliyetKalemleri";
import {
  BIRIMLER, BIRIM_ADI, DIS_PARA_BIRIMLERI, disParaAdi, birimOf, disIslemDogrula, disIslemFormu, disIslemEksikleri, eksikDisIslemSayisi,
  disIslemKullanimi, kullanimMetni, birimKilitNedeni, silmeUyarisi, fiyatGecmisiSatirlari, kumeOzeti, fiyatKumesi,
  PANEL_IPUCU, BOS_BASLIK, BOS_METNI, eksikSayiMetni, EKSIK_ROZETI,
} from "../lib/disIslem";
import { DisIslemFiyatPenceresi } from "./DisIslemFiyatPenceresi";
import { ornekDisIslemler, ORNEK_DUGMESI, ORNEK_IPUCU } from "../lib/ornekKatalog";

// Spec 0137: Ayarlar › Katalog › Dış İşlemler (malzeme panelinin ikizi). Panel `ayar:disislemler` kilidi altında çizilir (Settings,
// R24, R24/2); fiyat güncelleme penceresi aynı kilidi paylaşır. Liste canlı dizidir, yazım tam dizide işlevsel güncelleyiciyle
// (çöptekiler korunur). Hesap yok: bütün kurallar `lib/disIslem.js`'ten (C1, C2, C3).
export const ISLEM_EKLE = "Yeni Dış İşlem";
export const FIYAT_GUNCELLE = "Fiyatı Güncelle";
export const GUNUN_KURU_DUGMESI = "Günün kurunu kullan";
export const FIYAT_KARTTA_NOTU = "Birim fiyatı, para birimi ve kur \"Fiyatı Güncelle\" penceresinden değişir; değişiklik tarihli geçmişe yazılır.";
const BOS_FORM = disIslemFormu({});
const idleriOku = kalemIslemIdleri;

// Fiyat kümesinin form alanları (yeni işlemde kartta, düzenlemede pencerede). Pencere de bu bileşeni çizer.
export const IslemFiyatAlanlari = ({ form, set, hatalar = {}, rates, ratesErr }) => {
  const dovizli = form.paraBirimi === "USD" || form.paraBirimi === "EUR";
  const oneri = kurOnerisi(form.paraBirimi, rates, ratesErr);
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Fiyatın para birimi">
          <Select value={form.paraBirimi} onChange={e => {
            const pb = e.target.value;
            const o = kurOnerisi(pb, rates, ratesErr);
            set("paraBirimi", pb);
            if ((pb === "USD" || pb === "EUR") && !String(form.kur || "").trim() && o.deger) set("kur", String(o.deger).replace(".", ","));
          }} aria-label="Fiyatın para birimi">
            {DIS_PARA_BIRIMLERI.map(pb => <option key={pb} value={pb}>{disParaAdi(pb)}</option>)}
          </Select>
          <HataMetni>{hatalar.paraBirimi}</HataMetni>
        </Field>
        <Field label={`Birim fiyatı (${BIRIM_ADI[form.birim || "adet"].toLocaleLowerCase("tr-TR")} başına, KDV hariç)`}>
          <Input value={form.birimFiyati} onChange={e => set("birimFiyati", e.target.value)} placeholder="0,00" aria-label="Birim fiyatı" />
          <HataMetni>{hatalar.birimFiyati}</HataMetni>
        </Field>
      </div>
      {dovizli && (
        <Field label={`Kur (1 ${disParaAdi(form.paraBirimi)} kaç TL)`}>
          <Input value={form.kur} onChange={e => set("kur", e.target.value)} placeholder="0,00" aria-label="Kur" />
          <HataMetni>{hatalar.kur}</HataMetni>
          {oneri.neden ? <Ipucu><span data-testid="kur-neden">{oneri.neden}</span></Ipucu>
            : <Ipucu><span data-testid="kur-oneri">Günün kuru: {String(oneri.deger).replace(".", ",")} TL. Kaydedilen değer bu alandaki kurdur; kur değişince maliyet de değişir.</span>
              {String(form.kur || "").trim() !== String(oneri.deger).replace(".", ",") && (
                <Btn small variant="ghost" onClick={() => set("kur", String(oneri.deger).replace(".", ","))}>{GUNUN_KURU_DUGMESI}</Btn>)}</Ipucu>}
        </Field>
      )}
    </>
  );
};

export const DisIslemManager = ({ disIslemler = [], setDisIslemler, parts = [], tedarikciler = [], giderYetki = false, rates = null, ratesErr = false,
  bugun, showToast = () => {}, serverPermissions = null, malzemeler = [], fiyatAyarlari = null }) => {
  const [form, setForm] = useState(null); // { ...disIslemFormu, id }
  const [hatalar, setHatalar] = useState({});
  const [sil, setSil] = useState(null);
  const [fiyat, setFiyat] = useState(null);
  const eksikSayi = eksikDisIslemSayisi(disIslemler);
  // R5, AC-12: tedarikçi seçicisi yalnız gider yetkisiyle; hammadde işaretliler başta (0132 emsali).
  const tedSecenek = useMemo(() => (tedarikciler || []).filter(t => !t.deletedAt)
    .sort((a, b) => (b.hammadde === true) - (a.hammadde === true) || String(a.ad).localeCompare(String(b.ad), "tr")), [tedarikciler]);
  const set = (alan, v) => setForm(f => ({ ...f, [alan]: v }));
  const ac = (m) => { setHatalar({}); setForm(m ? { ...disIslemFormu(m), id: m.id } : { ...BOS_FORM, id: null }); };
  const eski = form?.id != null ? disIslemler.find(m => String(m.id) === String(form.id)) : null;
  // R2/2 (AC-119): kullanılan işlemin birimi değişmez (çöpteki parçalar dahil).
  const eskiKullanim = eski ? disIslemKullanimi(eski.id, parts, idleriOku) : { canli: 0, cop: 0 };
  const birimKilitli = eskiKullanim.canli + eskiKullanim.cop > 0;
  const kaydet = () => {
    // R6, AC-14: düzenlemede fiyat kümesi formda yoktur, eskisinden taşınır. R5, AC-13: yetkisizde tedarikçi bağı eskisinden.
    const ef = eski ? disIslemFormu(eski) : null;
    const kaynak = eski ? { ...form, birimFiyati: ef.birimFiyati, paraBirimi: ef.paraBirimi, kur: ef.kur,
      birim: birimKilitli ? ef.birim : form.birim, tedarikciId: giderYetki ? form.tedarikciId : ef.tedarikciId } : form;
    const v = disIslemDogrula(kaynak, disIslemler, form.id);
    if (!v.gecerli) { setHatalar(v.hatalar); return; }
    const yeni = form.id == null;
    const kayit = { ...v.kayit, id: yeni ? uid() : eski.id, ...(eski?.fiyatGecmisi?.length ? { fiyatGecmisi: eski.fiyatGecmisi } : {}) };
    setDisIslemler(p => (yeni ? [...p, kayit] : p.map(m => (String(m.id) === String(kayit.id) ? { ...kayit, ...(m.deletedAt ? { deletedAt: m.deletedAt } : {}) } : m))));
    logAction({ serverPermissions, action: yeni ? "olusturuldu" : "duzenlendi", entity: "dis_islem", entityId: kayit.id, entityName: kayit.ad });
    setForm(null);
    showToast(yeni ? "Dış işlem eklendi." : "Dış işlem güncellendi.");
  };
  // Örnek veriler (2026-11-09): yalnız liste boşken ve kullanıcı isterse; kayıtlar kartın doğrulayıcısından geçer (lib/ornekKatalog).
  const ornekEkle = () => {
    const ornekler = ornekDisIslemler({ mevcut: disIslemler, rates, ratesErr, yeniId: uid });
    if (!ornekler.length) return;
    setDisIslemler(p => [...p, ...ornekler]);
    for (const m of ornekler) logAction({ serverPermissions, action: "olusturuldu", entity: "dis_islem", entityId: m.id, entityName: m.ad });
    showToast(`${ornekler.length} örnek dış işlem eklendi.`);
  };
  const silOnay = () => {
    const damga = new Date().toISOString();
    setDisIslemler(p => p.map(m => (String(m.id) === String(sil.id) ? { ...m, deletedAt: damga } : m)));
    logAction({ serverPermissions, action: "silindi", entity: "dis_islem", entityId: sil.id, entityName: sil.ad });
    setSil(null);
    showToast("Dış işlem çöp kutusuna taşındı.");
  };

  return (
    <div>
      <Ipucu>{PANEL_IPUCU}</Ipucu>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, margin: "12px 0" }}>
        {/* R1/2, AC-116: fiyatı girilmemiş işlem sayısı; hepsinin fiyatı varsa rozet yok. */}
        <div style={{ fontSize: 12.5, color: "var(--n500, #64748b)", fontWeight: 600 }}>
          {disIslemler.length} işlem
          {eksikSayi > 0 && <span data-testid="dis-islem-eksik-sayisi" style={{ marginLeft: 8, color: "var(--amb700, #b45309)" }}>· {eksikSayiMetni(eksikSayi)}</span>}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {disIslemler.length === 0 && <Btn variant="ghost" testId="ornek-dis-islem-ekle" onClick={ornekEkle}>{ORNEK_DUGMESI}</Btn>}
          <Btn onClick={() => ac(null)}><Icon name="plus" size={14} /> {ISLEM_EKLE}</Btn>
        </div>
      </div>
      {disIslemler.length === 0 && <Ipucu>{ORNEK_IPUCU}</Ipucu>}
      {disIslemler.length === 0 ? (
        <BosDurum testId="bos-dis-islem" baslik={BOS_BASLIK} metin={BOS_METNI} />
      ) : (
        <KartBolum varyant="kart" style={{ padding: 0, overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead><tr style={{ textAlign: "left", color: "var(--n500, #64748b)", fontSize: 11.5 }}>
              <th style={{ padding: "10px 14px" }}>İşlem</th><th style={{ padding: "10px 14px" }}>Birim</th>
              <th style={{ padding: "10px 14px" }}>Fiyat</th><th style={{ padding: "10px 14px" }}>Kullanım</th><th style={{ padding: "10px 14px" }} />
            </tr></thead>
            <tbody>
              {disIslemler.map(m => {
                const eksik = disIslemEksikleri(m);
                const k = disIslemKullanimi(m.id, parts, idleriOku);
                return (
                  <tr key={m.id} data-testid="dis-islem-satiri" style={{ borderTop: "1px solid var(--n100, #f1f5f9)" }}>
                    <td style={{ padding: "10px 14px" }}>
                      <b>{m.ad}</b>
                      {eksik.length > 0 && <span data-testid="dis-islem-eksik" title={eksik.join(", ")} style={{ marginLeft: 8, fontSize: 10.5, fontWeight: 800, textTransform: "uppercase", padding: "2px 7px", borderRadius: 6, background: "var(--ambBg, #fffbeb)", color: "var(--amb700, #b45309)", border: "1px solid var(--ambBr, #fde68a)" }}>{EKSIK_ROZETI}</span>}
                      {eksik.length > 0 && <div style={{ fontSize: 11, color: "var(--n500, #64748b)" }}>{eksik.join(", ")}</div>}
                    </td>
                    <td style={{ padding: "10px 14px" }}>{BIRIM_ADI[birimOf(m)]}</td>
                    <td style={{ padding: "10px 14px" }} data-testid="dis-islem-fiyat">{kumeOzeti(fiyatKumesi(m))}</td>
                    <td style={{ padding: "10px 14px", color: "var(--n600, #475569)" }} data-testid="dis-islem-kullanim">{kullanimMetni(k)}</td>
                    <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                      <div data-testid="satir-eylemleri" style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        <Btn small variant="ghost" title={FIYAT_GUNCELLE} onClick={() => setFiyat(m)}>{FIYAT_GUNCELLE}</Btn>
                        <Btn small variant="ghost" title="Düzenle" aria-label={`${m.ad} düzenle`} onClick={() => ac(m)}><Icon name="edit" size={12} /></Btn>
                        <Btn small variant="danger" title="Sil" aria-label={`${m.ad} sil`} onClick={() => setSil(m)}><Icon name="trash" size={12} /></Btn>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </KartBolum>
      )}

      {form && (
        <Modal title={form.id == null ? ISLEM_EKLE : "Dış İşlemi Düzenle"} onClose={() => setForm(null)} wide
          footer={<><Btn variant="ghost" onClick={() => setForm(null)}>Vazgeç</Btn><Btn onClick={kaydet}>Kaydet</Btn></>}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="İşlem adı"><Input value={form.ad} onChange={e => set("ad", e.target.value)} aria-label="İşlem adı" /><HataMetni>{hatalar.ad}</HataMetni></Field>
            <Field label="Birim">
              <Select value={form.birim} disabled={birimKilitli} onChange={e => set("birim", e.target.value)} aria-label="Birim">
                {BIRIMLER.map(b => <option key={b} value={b}>{BIRIM_ADI[b]}</option>)}
              </Select>
              <HataMetni>{hatalar.birim}</HataMetni>
              {birimKilitli && <Ipucu><span data-testid="birim-kilit-nedeni">{birimKilitNedeni(eskiKullanim)}</span></Ipucu>}
            </Field>
          </div>
          {giderYetki && (
            <Field label="Tedarikçi">
              <Select value={form.tedarikciId} onChange={e => set("tedarikciId", e.target.value)} aria-label="Tedarikçi">
                <option value="">Seçilmedi</option>
                {tedSecenek.map(t => <option key={t.id} value={String(t.id)}>{t.ad}{t.hammadde === true ? " · hammadde" : ""}</option>)}
              </Select>
            </Field>
          )}
          <BolumBasligi ust>Fiyat</BolumBasligi>
          {eski ? (
            <div data-testid="dis-islem-fiyat-ozeti">
              <div style={{ fontSize: 13, fontWeight: 600 }}>{kumeOzeti(fiyatKumesi(eski), birimOf(eski))}</div>
              <Ipucu>{FIYAT_KARTTA_NOTU}</Ipucu>
              <BolumBasligi ust>Fiyat geçmişi</BolumBasligi>
              {fiyatGecmisiSatirlari(eski).length === 0 ? <Ipucu>Henüz fiyat değişikliği yok.</Ipucu> : (
                <div data-testid="fiyat-gecmisi">{fiyatGecmisiSatirlari(eski).map((s, i) => (
                  <div key={i} style={{ fontSize: 12.5, display: "flex", gap: 10, padding: "3px 0" }}><span style={{ width: 120, color: "var(--n500, #64748b)" }}>{s.tarihMetni}</span><span>{s.ozet}</span></div>))}</div>
              )}
            </div>
          ) : (
            <IslemFiyatAlanlari form={form} set={set} hatalar={hatalar} rates={rates} ratesErr={ratesErr} />
          )}
        </Modal>
      )}

      {sil && (
        <ConfirmDialog title="Dış işlem silinsin mi?" onCancel={() => setSil(null)} onConfirm={silOnay}
          message={<span data-testid="dis-islem-sil-kullanim"><b>{sil.ad}</b> çöp kutusuna taşınacak. {silmeUyarisi(disIslemKullanimi(sil.id, parts, idleriOku))}</span>} />
      )}

      {fiyat && (
        <DisIslemFiyatPenceresi islem={fiyat} disIslemler={disIslemler} setDisIslemler={setDisIslemler} parts={parts} malzemeler={malzemeler} rates={rates} ratesErr={ratesErr}
          fiyatAyarlari={fiyatAyarlari} bugun={bugun} onClose={() => setFiyat(null)} showToast={showToast} serverPermissions={serverPermissions} />
      )}
    </div>
  );
};
