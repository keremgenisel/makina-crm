// Spec 0046: gider formunda hedef bazlı ödeme. Yeni kalemde her hedefin satırı (işaret, tutar, yöntem, hesap; ANA
// hedefte "Çek (ciro)" ile portföyden çek), düzenlemede her hedefin durumu ve ödeme penceresini ön dolu açan düğme.
// Hedefler ve hareketler saf motordan (lib/formOdemesi.js); bu dosya yalnız çizer.
import { Field, Input, Select, Btn, Icon } from "../ui";
import { HataMetni, Ipucu, KartBolum, UyariSeridi, BolumBasligi } from "../tasarim";
import { TutarInput, ODEME_SECENEKLERI, hedefAdi, tl2 } from "./GiderAlanlari";
import { HESAP_TUR_AD } from "../../lib/kasa";
import { CIRO_YONTEMI } from "../../lib/cek";
import { tl, HEDEF } from "../../lib/gider";
import { fmtTR } from "../../lib/utils";
import { hepsiniOde, ciroTutariK, HEPSI_TAKSITLI_NOTU, CIRO_YALNIZ_ANA_NEDENI, CEK_YOK_NOTU, KAYDEDINCE_ODENIR, PLAN_HATASI_NOTU, TUR_DEGISTI_UYARISI } from "../../lib/formOdemesi";
import { PERSONEL_BOLUNMEZ_NEDENI } from "../../lib/gider";

const cekEtiketi = (s) => [s.cek.no, s.cek.banka, s.cek.kesideci, tl2(tl(s.tutarK)), s.vade ? `vade ${fmtTR(s.vade)}` : ""].filter(Boolean).join(" · ");

// Yeni kalem: odeme = { tarih, hepsi, satirlar: {[hedef]: {isaretli, tutar, yontem, hesapId, cekId}}, alacakliAd }.
export const OdemeFormSatirlari = ({ hedefler = [], davranis, odeme, setOdeme, hesaplar = [], hesapSecimi = false, ciroYetkisi = false,
  cekSatirlari = [], alacakliSerbest = false, varsayilanYontem = "", varsayilanHesap = "", hatalar = { satir: {}, genel: [] }, uyari = null }) => {
  const ikiHedef = hedefler.some(h => h.hedef === HEDEF.ELDEN);
  const cizilebilir = hedefler.filter(h => !h.pasif);
  if (!hedefler.length) return null;
  if (!cizilebilir.length) return <div data-testid="form-odeme-hepsi-taksitli" style={{ marginBottom: 12 }}><Ipucu>{HEPSI_TAKSITLI_NOTU}</Ipucu></div>;
  const satir = (h) => odeme.satirlar[h.hedef];
  const setSatir = (hedef, patch) => setOdeme(o => ({ ...o, hepsi: false, satirlar: { ...o.satirlar, [hedef]: { ...o.satirlar[hedef], ...patch } } }));
  const isaretle = (h, acik) => setOdeme(o => {
    const satirlar = { ...o.satirlar };
    if (acik) satirlar[h.hedef] = { isaretli: true, tutar: tl(h.kalanK), yontem: varsayilanYontem, hesapId: varsayilanHesap, cekId: null };
    else delete satirlar[h.hedef];
    return { ...o, hepsi: false, satirlar };
  });
  const hepsi = (acik) => setOdeme(o => ({ ...o, hepsi: acik, satirlar: acik ? hepsiniOde(hedefler, { yontem: varsayilanYontem, hesapId: varsayilanHesap }) : {} }));
  return (
    <KartBolum varyant="kart" baslikStili="baslik" title="Ödeme" altBaslik="İsteğe bağlı: ödenen bölümleri işaretleyin; kalan borç ödeme penceresinden tamamlanır." testId="form-odeme" style={{ marginBottom: 12, padding: 14 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 10 }}>
        <div style={{ width: 170 }}><Field label="Ödeme tarihi"><Input aria-label="Ödeme tarihi" type="date" value={odeme.tarih} onChange={e => setOdeme(o => ({ ...o, tarih: e.target.value }))} /></Field></div>
        <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, padding: "7px 0", cursor: "pointer" }}>
          <input type="checkbox" aria-label="Hepsini ödendi işaretle" checked={!!odeme.hepsi} onChange={e => hepsi(e.target.checked)} />
          Hepsini ödendi işaretle
        </label>
      </div>
      {hatalar.genel.map((m, i) => <HataMetni key={i}>{m}</HataMetni>)}
      {hedefler.map(h => {
        const ad = hedefAdi(h.hedef, davranis, ikiHedef);
        const s = satir(h);
        const ciro = s?.yontem === CIRO_YONTEMI;
        const cekSatiri = ciro ? cekSatirlari.find(x => String(x.cek.id) === String(s.cekId)) : null;
        const secenekler = [...ODEME_SECENEKLERI, ...(h.ciroOlur && ciroYetkisi ? [{ value: CIRO_YONTEMI, label: CIRO_YONTEMI }] : [])];
        return (
          <div key={h.hedef} data-testid="form-odeme-satiri" data-hedef={h.hedef} style={{ borderTop: "1px solid var(--n150, #f1f5f9)", padding: "10px 0" }}>
            <BolumBasligi bosluk={4}>{ad} · {tl2(tl(h.kalanK))}</BolumBasligi>
            {h.pasif ? <Ipucu>{h.neden}</Ipucu> : (
              <>
                <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, cursor: "pointer" }}>
                  <input type="checkbox" aria-label={`${ad} ödendi`} checked={!!s?.isaretli} onChange={e => isaretle(h, e.target.checked)} />
                  Ödendi
                </label>
                {s?.isaretli && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10, marginTop: 8 }}>
                    <Field label="Tutar">
                      {ciro ? <div aria-label={`${ad} ödeme tutarı`} style={{ fontWeight: 700, padding: "8px 0" }}>{cekSatiri ? tl2(tl(ciroTutariK(cekSatiri, h))) : "—"}</div>
                        : <TutarInput ariaLabel={`${ad} ödeme tutarı`} value={s.tutar} onChange={v => setSatir(h.hedef, { tutar: v })} />}
                    </Field>
                    <Field label="Ödeme yöntemi">
                      <Select aria-label={`${ad} ödeme yöntemi`} value={s.yontem || ""} onChange={e => setSatir(h.hedef, { yontem: e.target.value, cekId: null })}>
                        {secenekler.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </Select>
                    </Field>
                    {ciro ? (
                      <Field label="Ciro edilecek çek">
                        {cekSatirlari.length ? (
                          <Select aria-label={`${ad} çek`} value={s.cekId ?? ""} onChange={e => setSatir(h.hedef, { cekId: e.target.value === "" ? null : cekSatirlari.find(x => String(x.cek.id) === e.target.value)?.cek.id ?? null })}>
                            <option value="">Çek seçin</option>
                            {cekSatirlari.map(x => <option key={x.cek.id} value={x.cek.id}>{cekEtiketi(x)}</option>)}
                          </Select>
                        ) : <div data-testid="form-odeme-cek-yok"><Ipucu>{CEK_YOK_NOTU}</Ipucu></div>}
                      </Field>
                    ) : hesapSecimi && (
                      <Field label="Hesap">
                        <Select aria-label={`${ad} hesabı`} value={s.hesapId ?? ""} onChange={e => setSatir(h.hedef, { hesapId: e.target.value === "" ? "" : hesaplar.find(x => String(x.id) === e.target.value)?.id ?? "" })}>
                          <option value="">Hesap belirtilmedi</option>
                          {hesaplar.map(x => <option key={x.id} value={x.id}>{x.ad} ({HESAP_TUR_AD[x.tur] || x.tur})</option>)}
                        </Select>
                      </Field>
                    )}
                    {ciro && alacakliSerbest && (
                      <Field label="Kime ciro edildi">
                        <Input aria-label="Kime ciro edildi" value={odeme.alacakliAd || ""} onChange={e => setOdeme(o => ({ ...o, alacakliAd: e.target.value }))} placeholder="Alacaklının adı" />
                      </Field>
                    )}
                  </div>
                )}
                {s?.isaretli && !h.ciroOlur && ciroYetkisi && CIRO_YALNIZ_ANA_NEDENI[h.hedef] && <Ipucu>{CIRO_YALNIZ_ANA_NEDENI[h.hedef]}</Ipucu>}
                {ciro && uyari && <div style={{ marginTop: 8 }}><UyariSeridi aile="uyari" testId="form-odeme-ciro-uyari">{uyari}</UyariSeridi></div>}
                <HataMetni>{hatalar.satir[h.hedef]}</HataMetni>
              </>
            )}
          </div>
        );
      })}
    </KartBolum>
  );
};

// Düzenleme (0046 R15, 0048): her hedefin canlı durumu; düğme ödeme penceresini o hedef için açar (yalnız gider_odeme ile).
// durum: formOdemesi.duzenlemeOdemeDurumu çıktısı (kararlar orada; bu bileşen yalnız çizer).
const asimMetni = (odenenK, toplamK) => `Ödenen ${tl2(tl(odenenK))}, yeni toplam ${tl2(tl(toplamK))}; ödenen yeni toplamı aşıyor.`;
export const OdemeDurumSatirlari = ({ durum, davranis, onHedefOde = null, bolunmezNotu = false }) => {
  if (!durum) return null;
  const { hedefler = [], kaybolanlar = [] } = durum;
  if (!hedefler.length && !kaybolanlar.length) return null;
  const ikiHedef = hedefler.some(h => h.hedef === HEDEF.ELDEN);
  return (
    <KartBolum varyant="kart" baslikStili="baslik" title="Ödeme" altBaslik="Ödemeler gider listesindeki ödeme penceresinden kaydedilir ve silinir." testId="form-odeme-durumu" style={{ marginBottom: 12, padding: 14 }}>
      {durum.planHatasi && <div style={{ marginBottom: 8 }}><UyariSeridi aile="uyari" testId="form-odeme-plan-hatasi">{PLAN_HATASI_NOTU}</UyariSeridi></div>}
      {durum.turDegisti && <div style={{ marginBottom: 8 }}><UyariSeridi aile="uyari" testId="form-odeme-tur-uyarisi">{TUR_DEGISTI_UYARISI}</UyariSeridi></div>}
      {bolunmezNotu && <div data-testid="form-odeme-bolunmez"><Ipucu>{PERSONEL_BOLUNMEZ_NEDENI}</Ipucu></div>}
      {hedefler.map(h => {
        const durumMetni = h.kalanK === 0 ? "Ödendi" : h.kalanK < h.toplamK ? `Kısmen · kalan ${tl2(tl(h.kalanK))}` : "Ödenmedi";
        return (
          <div key={h.hedef} data-testid="form-odeme-durum-satiri" data-hedef={h.hedef} style={{ padding: "6px 0", borderTop: "1px solid var(--n150, #f1f5f9)", fontSize: 13 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <b style={{ flex: 1 }}>{hedefAdi(h.hedef, davranis, ikiHedef)} · {tl2(tl(h.toplamK))}</b>
              <span>{durumMetni}</span>
              {onHedefOde && h.dugme && <Btn small variant="ghost" onClick={() => onHedefOde(h.hedef)}><Icon name="check" size={12} /> Ödeme gir</Btn>}
              {onHedefOde && h.kaydedinceOdenir && <span data-testid="form-odeme-kaydedince" style={{ color: "var(--n500)", fontSize: 12 }}>{KAYDEDINCE_ODENIR}</span>}
            </div>
            {(h.ekOdemeK || 0) > 0 && <Ipucu>maaş {tl2(tl(h.maasK))} + ek ödeme {tl2(tl(h.ekOdemeK))}</Ipucu>}
            {h.asimK > 0 && <HataMetni>{asimMetni(h.kayitliOdenenK, h.toplamK)}</HataMetni>}
          </div>
        );
      })}
      {kaybolanlar.map(k => (
        <div key={k.hedef} data-testid="form-odeme-kaybolan" data-hedef={k.hedef} style={{ padding: "6px 0", borderTop: "1px solid var(--n150, #f1f5f9)", fontSize: 13 }}>
          <b>{hedefAdi(k.hedef, davranis, true)} · {tl2(0)}</b>
          <HataMetni>{asimMetni(k.odenenK, 0)}</HataMetni>
        </div>
      ))}
    </KartBolum>
  );
};
