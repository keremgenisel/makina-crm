import { Field, Input, Select } from "./ui";
import { HataMetni, Ipucu, BolumBasligi, Segment } from "./tasarim";
import { maliyetMetniKurus } from "../lib/urunAgaci";
import { malzemeSatiriFormu, malzemeCopEtiketi, BICIMLER, BICIM_SIRASI, OLCU_ADLARI, PAY_ALANI, YONTEMLER, kgMetni, MALZEME_SET_IPUCU } from "../lib/malzeme";

const FIELDSET_STILI = { border: 0, padding: 0, margin: 0, minWidth: 0 };

// Spec 0132 R9–R14/2, AC-28–AC-46: parçanın tek malzeme satırı (Karar 28). Ölçü alanları biçimden gelir (R11); işleme payı
// biçimin pay listesiyle eşlenir (R10/2: boruda et kalınlığına pay yok). Canlı ağırlık ve tutar formun tek canlı maliyetinden
// (`ozet`, 0099 C1/2); bu bileşen hesap yapmaz. Set içeriği doluyken pasif (R9/2, AC-66).
export const MALZEME_BOLUM_BASLIGI = "Malzemeden maliyet";
export const MALZEME_YOK_SECENEGI = "Malzemeden hesaplanmasın";
export const MALZEME_LISTE_BOS = "Henüz malzeme tanımlanmadı. Malzemeler Ayarlar › Katalog › Malzemeler panelinden eklenir.";
export const MalzemeSatiriAlani = ({ satir, setSatir, malzemeler = [], hatalar = {}, ozet = null, pasif = false, hamMalzemeler = [] }) => {
  const s = satir || malzemeSatiriFormu(null);
  const set = (alan, v) => setSatir({ ...s, [alan]: v });
  const b = BICIMLER[s.bicim];
  const secili = s.malzemeId !== "";
  // Seçili malzeme çöpteyse ya da bulunamıyorsa adı ham diziden ibareyle yazılır; seçicide yine seçili kalır.
  const seciliYok = secili && !malzemeler.some(m => String(m.id) === s.malzemeId);
  const hamAd = seciliYok ? (() => { const m = hamMalzemeler.find(x => String(x.id) === s.malzemeId); return m ? `${malzemeCopEtiketi(m)} (silinmiş malzeme)` : "kaydı bulunamayan malzeme"; })() : null;
  return (
    <fieldset disabled={pasif} style={FIELDSET_STILI} data-testid="malzeme-satiri-bolumu">
      <BolumBasligi>{MALZEME_BOLUM_BASLIGI}</BolumBasligi>
      {pasif && <Ipucu><span data-testid="malzeme-set-pasif">{MALZEME_SET_IPUCU}</span></Ipucu>}
      {malzemeler.length === 0 && !secili ? <Ipucu><span data-testid="malzeme-liste-bos">{MALZEME_LISTE_BOS}</span></Ipucu> : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12 }}>
            <Field label="Malzeme">
              <Select value={s.malzemeId} onChange={e => set("malzemeId", e.target.value)} aria-label="Malzeme">
                <option value="">{MALZEME_YOK_SECENEGI}</option>
                {seciliYok && <option value={s.malzemeId}>{hamAd}</option>}
                {malzemeler.map(m => <option key={m.id} value={String(m.id)}>{malzemeCopEtiketi(m)}</option>)}
              </Select>
            </Field>
            {secili && (
              <Field label="Biçim">
                <Select value={s.bicim} onChange={e => set("bicim", e.target.value)} aria-label="Biçim">
                  {BICIM_SIRASI.map(k => <option key={k} value={k}>{BICIMLER[k].ad}</option>)}
                </Select>
                <HataMetni>{hatalar.bicim}</HataMetni>
              </Field>
            )}
            {secili && (
              <Field label="Fire (%)">
                <Input value={s.fire} onChange={e => set("fire", e.target.value)} placeholder="Malzemedeki varsayılan" aria-label="Parça firesi" />
                <HataMetni>{hatalar.fire}</HataMetni>
              </Field>
            )}
          </div>
          {secili && (
            <>
              <Field label="Maliyet yöntemi">
                <Segment kip="radyo" genislik="icerik" ariaLabel="Maliyet yöntemi" value={s.yontem} onChange={v => set("yontem", v)}
                  options={Object.entries(YONTEMLER).map(([value, label]) => ({ value, label }))} />
              </Field>
              {b && (
                <div data-testid="malzeme-olculer" style={{ display: "grid", gridTemplateColumns: `repeat(${b.olculer.length}, 1fr)`, gap: 12 }}>
                  {b.olculer.map(ad => (
                    <div key={ad}>
                      <Field label={`${OLCU_ADLARI[ad]} (mm)`}>
                        <Input value={s[ad]} onChange={e => set(ad, e.target.value)} aria-label={OLCU_ADLARI[ad]} />
                        <HataMetni>{hatalar[ad]}</HataMetni>
                      </Field>
                      {b.paylar.includes(ad) && (
                        <Field label={`${OLCU_ADLARI[ad]} işleme payı (mm)`}>
                          <Input value={s[PAY_ALANI[ad]]} onChange={e => set(PAY_ALANI[ad], e.target.value)} placeholder="0" aria-label={`${OLCU_ADLARI[ad]} işleme payı`} />
                          <HataMetni>{hatalar[PAY_ALANI[ad]]}</HataMetni>
                        </Field>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {ozet && (
                <div data-testid="malzeme-ozeti" style={{ fontSize: 12.5, color: "var(--n700, #334155)", background: "var(--n100, #f8fafc)", borderRadius: 8, padding: "8px 12px", marginBottom: 12 }}>
                  {ozet.yontem !== "boy" && <div>Pay dahil ağırlık: <b data-testid="malzeme-ham-kg">{kgMetni(ozet.hamKg)}</b> · fire dahil: <b data-testid="malzeme-fireli-kg">{kgMetni(ozet.fireliKg)}</b></div>}
                  <div>Maliyet: <b data-testid="malzeme-maliyet">{ozet.maliyetK == null ? `girilmedi (${ozet.eksik.join(", ")})` : maliyetMetniKurus(ozet.maliyetK)}</b></div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </fieldset>
  );
};

