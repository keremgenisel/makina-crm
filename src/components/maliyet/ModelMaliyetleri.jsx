import { Fragment, useState } from "react";
import { Btn, Field, Input, Modal, TutarInput, Icon } from "../ui";
import { KartBolum, BosDurum, HataMetni, Ipucu, UyariSeridi } from "../tasarim";
import { tutarMetni } from "../../lib/tutarGirdisi";
import { kilitRedMesaji } from "../../lib/kilitAlanlari";
import { kurusMetni, katsayiDogrula, kalipFiyatDogrula, modelFiyatAlanlariYaz, tlOf, modelSayilari, MODEL_ISARET } from "../../lib/makinaStandartMaliyet";
import { PayOzeti } from "./PayOzeti";

// Spec 0088 R11–R16: her canlı modelin direkt maliyeti (ürün ağacı), genel gider payı ve toplamı AYRI sütunlarda (R7, AC-18);
// kâr katsayısı ile önerilen satış bedeli (KDV hariç, R14/3) ve Extra Kalıp liste fiyatı (maliyete girmez, R15).
export const ONERI_KDV_NOTU = "Önerilen satış bedeli ve önerilen ciro KDV hariçtir; Extra Kalıp liste fiyatı maliyete girmez.";
// Spec 0091 R31: ekran metinleri tek yerde (testler buradan okur). Sayılar motordan (modelSayilari), ekran sayım yapmaz (R26/2).
export const URETIM_METIN = {
  sayiSatiri: (say) => `${say.tanimli} model tanımlı · üretimde: ${say.uretimde}`,
  yanlisEki: (n) => ` · ${n} model üretimde değil ama dönemde üretilmiş`,
  suzgecKapali: (n) => `Üretimde olmayanları da göster (${n})`,
  suzgecAcik: "Yalnız üretimdekiler",
  uretimdeDegil: "üretimde değil",
  eskimis: "dönemde üretilmedi, işaret eskimiş olabilir",
  yanlis: "üretimde değil ama dönemde üretilmiş",
  modelYok: (n) => `${n} makinanın modeli katalogda bulunamadı; model adetlerine girmedi.`,
  ayarsiz: "hesap ayarları girilmedi",
  bosBaslik: "Üretimde işaretli model yok",
  bosMetin: (n) => `${n} model üretimde değil olarak işaretli. Görmek için "Üretimde olmayanları da göster" düğmesini kullanın.`,
};
const th = { padding: "8px 12px", fontSize: 11, fontWeight: 700, color: "var(--n600, #475569)", textAlign: "right", whiteSpace: "nowrap" };
const td = { padding: "9px 12px", fontSize: 13, textAlign: "right", whiteSpace: "nowrap" };

const Dokum = ({ m }) => (
  <div data-testid={`dokum-${m.model}`} style={{ padding: "8px 12px 12px", background: "var(--n100, #f8fafc)" }}>
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead><tr>
        <th style={{ ...th, textAlign: "left" }}>Kalem</th><th style={th}>Adet</th><th style={th}>Birim maliyet</th><th style={th}>Tutar</th>
      </tr></thead>
      <tbody>
        {m.kit.map((r, i) => (
          <tr key={`k${i}`}>
            <td style={{ ...td, textAlign: "left" }}>{r.ad}{r.eksik && <span style={{ marginLeft: 6, fontSize: 11, color: "var(--warnTx, #854d0e)" }}>{r.neden === "parcaYok" ? "parça silinmiş ya da yok" : "maliyeti girilmedi"}</span>}</td>
            <td style={td}>{r.adet}</td><td style={td}>{kurusMetni(r.birimK)}</td><td style={td}>{r.eksik ? "—" : kurusMetni(r.satirK)}</td>
          </tr>
        ))}
        {m.ek.map((k, i) => (
          <tr key={`e${i}`}><td style={{ ...td, textAlign: "left" }}>{k.ad} <span style={{ fontSize: 11, color: "var(--n500, #64748b)" }}>(ek maliyet)</span></td><td style={td}>1</td><td style={td}>{kurusMetni(k.tutarK)}</td><td style={td}>{kurusMetni(k.tutarK)}</td></tr>
        ))}
        <tr><td style={{ ...td, textAlign: "left" }}>Genel gider payı</td><td style={td}>1</td><td style={td}>{kurusMetni(m.payK)}</td><td style={td}>{kurusMetni(m.payK)}</td></tr>
      </tbody>
    </table>
  </div>
);

export const ModelMaliyetleri = ({ pay, gercek, modeller, canDo, baskasiKilitli, showToast, standardModels = [], setStandardModels, setCustomModels }) => {
  const [acik, setAcik] = useState(null);
  // Spec 0091 R7, R9, R10: süzgeç yerel durumdur, saklanmaz (görünüm değişince bileşen çözülür, varsayılana döner).
  const [hepsi, setHepsi] = useState(false);
  const say = modelSayilari(modeller);
  const gorunen = hepsi ? modeller : modeller.filter(m => m.uretimde !== false);
  const [duzen, setDuzen] = useState(null); // { model, katsayi, kalip, hatalar }
  const yetki = canDo("gider_tanim");
  const ac = (m) => setDuzen({ model: m.model, katsayi: m.katsayi == null ? "" : String(m.katsayi).replace(".", ","), kalip: m.kalipListeK == null ? "" : tutarMetni(tlOf(m.kalipListeK)), hatalar: {} });
  const kaydet = () => {
    const k = katsayiDogrula(duzen.katsayi), f = kalipFiyatDogrula(duzen.kalip);
    if (k.hata || f.hata) { setDuzen(d => ({ ...d, hatalar: { katsayi: k.hata, kalip: f.hata } })); return; }
    // R32: model kaydı Makina Modelleri panelinin kilidiyle paylaşılır; başkası açık tutuyorsa yazılmaz.
    const kilit = baskasiKilitli?.("ayar", "models");
    if (kilit) { showToast(kilitRedMesaji(kilit), "err"); return; }
    const yaz = (p) => p.map(m => (m.model === duzen.model ? modelFiyatAlanlariYaz(m, { karKatsayisi: k.deger, kalipListeFiyati: f.deger }) : m));
    if (standardModels.some(m => m.model === duzen.model)) setStandardModels?.(yaz); else setCustomModels?.(yaz);
    showToast(k.uyari ? `Kaydedildi. ${k.uyari}` : "Kâr katsayısı ve liste fiyatı kaydedildi.");
    setDuzen(null);
  };
  const katsayiUyarisi = duzen ? katsayiDogrula(duzen.katsayi).uyari : null;

  return (
    <div>
      <PayOzeti pay={pay} gercek={gercek} />
      {/* Spec 0091 R8, R8/2, R9, R9/2: sayı satırı ve süzgeç tablonun ve iki boş durumun DIŞINDA, üç durumda da çizilir. */}
      <div data-testid="model-sayi-satiri" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", margin: "4px 0 10px", fontSize: 13, color: "var(--n600, #475569)" }}>
        <span>
          <span data-testid="model-sayilari">{URETIM_METIN.sayiSatiri(say)}</span>
          {say.yanlis > 0 && <span data-testid="uretim-isaret-uyari" style={{ color: "var(--warnTx, #854d0e)", fontWeight: 600 }}>{URETIM_METIN.yanlisEki(say.yanlis)}</span>}
        </span>
        <Btn small variant="ghost" testId="uretimde-suzgec" aria-pressed={hepsi} onClick={() => setHepsi(h => !h)}>
          {hepsi ? URETIM_METIN.suzgecAcik : URETIM_METIN.suzgecKapali(say.uretimdeDisi)}
        </Btn>
      </div>
      {/* R27/2: modeli kataloğun hiçbir satırıyla eşleşmeyen makinalar adetlere girmez; ekran farkı susarak bırakmaz. */}
      {gercek?.modelYokAdet > 0 && <div style={{ margin: "0 0 10px" }}><UyariSeridi aile="uyari" testId="model-yok-adet">{URETIM_METIN.modelYok(gercek.modelYokAdet)}</UyariSeridi></div>}
      {modeller.length === 0 ? <BosDurum testId="bos-model-maliyet" baslik="Tanımlı makina modeli yok" metin="Modeller Ayarlar › Katalog › Makina Modelleri'nde tanımlanır." />
      : gorunen.length === 0 ? <BosDurum testId="bos-model-maliyet-uretimde" baslik={URETIM_METIN.bosBaslik} metin={URETIM_METIN.bosMetin(say.uretimdeDisi)} /> : (
        <KartBolum varyant="kart" style={{ padding: 0, overflow: "auto", marginBottom: 16 }} testId="model-maliyet-tablosu">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr style={{ background: "var(--n100, #f8fafc)" }}>
              <th style={{ ...th, textAlign: "left" }}>Model</th><th style={th}>Dönemde üretilen</th><th style={th}>Direkt maliyet</th><th style={th}>Genel gider payı</th><th style={th}>Toplam maliyet</th>
              <th style={th}>Kâr katsayısı</th><th style={th}>Önerilen satış (KDV hariç)</th><th style={th}>Extra Kalıp liste fiyatı</th><th style={th}></th>
            </tr></thead>
            <tbody>
              {gorunen.map(m => (
                <Fragment key={m.model}>
                  <tr data-testid={`model-satiri-${m.model}`} style={{ borderTop: "1px solid var(--n150, #f1f5f9)" }}>
                    <td style={{ ...td, textAlign: "left" }}>
                      <button type="button" aria-expanded={acik === m.model} onClick={() => setAcik(a => (a === m.model ? null : m.model))}
                        style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontWeight: 700, fontSize: 13, color: "inherit" }}>
                        {acik === m.model ? "▾" : "▸"} {m.model}
                      </button>
                      {m.kitBos && <div data-testid="urun-agaci-yok" style={{ fontSize: 11, color: "var(--warnTx, #854d0e)" }}>ürün ağacı girilmemiş</div>}
                      {m.eksikSayisi > 0 && <div data-testid="eksik-isareti" style={{ fontSize: 11, color: "var(--warnTx, #854d0e)" }}>{`eksik · ${m.eksikSayisi} parçanın maliyeti yok`}</div>}
                      {/* Spec 0091 R9, R14, R15: işaretler model adının altındaki bugünkü yerde; karar verisi motordan (m.isaret). */}
                      {m.uretimde === false && <div data-testid="uretimde-degil-isareti" style={{ fontSize: 11, color: "var(--n500, #64748b)" }}>{URETIM_METIN.uretimdeDegil}</div>}
                      {m.isaret === MODEL_ISARET.ESKIMIS && <div data-testid="isaret-eskimis" style={{ fontSize: 11, color: "var(--blu700, #1d4ed8)" }}>{URETIM_METIN.eskimis}</div>}
                      {m.isaret === MODEL_ISARET.YANLIS && <div data-testid="isaret-yanlis" style={{ fontSize: 11, color: "var(--warnTx, #854d0e)", fontWeight: 600 }}>{URETIM_METIN.yanlis}</div>}
                    </td>
                    {/* R13, R13/2, R16: dönem adedi tam sayı ("0" dahil); dönem tanımsızken neden. */}
                    <td style={td} data-testid="donem-adet">{m.adetNeden === "ayarsiz" ? <span style={{ fontSize: 11, color: "var(--n500, #64748b)" }}>{URETIM_METIN.ayarsiz}</span> : m.donemAdet == null ? "—" : String(m.donemAdet)}</td>
                    <td style={td}>{kurusMetni(m.direktK)}</td><td style={td}>{kurusMetni(m.payK)}</td><td style={{ ...td, fontWeight: 700 }}>{kurusMetni(m.toplamK)}</td>
                    <td style={td}>{m.katsayi == null ? "—" : String(m.katsayi).replace(".", ",")}</td><td style={td}>{kurusMetni(m.oneriK)}</td><td style={td}>{kurusMetni(m.kalipListeK)}</td>
                    <td style={td}>{yetki && <Btn small variant="ghost" title="Katsayı ve liste fiyatı" onClick={() => ac(m)}><Icon name="edit" size={12} /></Btn>}</td>
                  </tr>
                  {acik === m.model && <tr><td colSpan={9} style={{ padding: 0 }}><Dokum m={m} /></td></tr>}
                </Fragment>
              ))}
            </tbody>
          </table>
        </KartBolum>
      )}
      <Ipucu><span data-testid="oneri-kdv-haric">{ONERI_KDV_NOTU}</span></Ipucu>

      {duzen && (
        <Modal wide title={`${duzen.model} · kâr katsayısı ve liste fiyatı`} onClose={() => setDuzen(null)}
          footer={<><Btn variant="ghost" onClick={() => setDuzen(null)}>İptal</Btn><Btn onClick={kaydet}><Icon name="check" size={14} /> Kaydet</Btn></>}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Kâr katsayısı">
              <Input value={duzen.katsayi} aria-label="Kâr katsayısı" placeholder="ör. 2,19498" onChange={e => setDuzen(d => ({ ...d, katsayi: e.target.value }))} />
              <HataMetni>{duzen.hatalar.katsayi || ""}</HataMetni>
              {katsayiUyarisi && <Ipucu>{katsayiUyarisi}</Ipucu>}
              <Ipucu>Önerilen satış bedeli = toplam maliyet × katsayı. Boş bırakılırsa öneri fiyat gösterilmez.</Ipucu>
            </Field>
            <Field label="Extra Kalıp liste fiyatı (TL, KDV hariç)">
              <TutarInput value={duzen.kalip} ariaLabel="Extra Kalıp liste fiyatı" placeholder="Girilmedi" invalid={!!duzen.hatalar.kalip} onChange={v => setDuzen(d => ({ ...d, kalip: v }))} />
              <HataMetni>{duzen.hatalar.kalip || ""}</HataMetni>
              <Ipucu>Yalnız fiyat listesi bilgisidir; maliyet hesabına girmez.</Ipucu>
            </Field>
          </div>
        </Modal>
      )}
    </div>
  );
};
