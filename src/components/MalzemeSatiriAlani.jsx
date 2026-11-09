import { Field, Input, Select, Btn, Icon } from "./ui";
import { HataMetni, Segment } from "./tasarim";
import { maliyetMetniKurus } from "../lib/urunAgaci";
import { malzemeSatiriFormu, malzemeCopEtiketi, BICIMLER, BICIM_SIRASI, OLCU_ADLARI, PAY_ALANI, YONTEMLER, kgMetni, fireBantlariOf, FIRE_KG_BOY_NEDENI } from "../lib/malzeme";

// Spec 0132 R9–R14/2, AC-28–AC-46; spec 0135 R12–R16, R44 (plan turu Karar 44): parçanın TEK malzeme kaleminin satırı. Kalem
// listesindeki her malzeme kalemi bu bileşenle çizilir; alanlar 0132'nin malzeme satırının alanları artı adet (R12, R13). Ölçü
// alanları biçimden gelir (R11); işleme payı biçimin pay listesiyle eşlenir (boruda et kalınlığına pay yok). Canlı ağırlık, satır
// tutarı ve eksiklik ebeveynin tek canlı özetinden (`ozet`, 0099 C1/2); bu bileşen hesap yapmaz. Erişilebilir adlar satır
// numarasıyla biter (birden çok kalemde benzersiz). Emniyet payı bu satırda değil, kip seçicisinin altındadır (R6/2).
export const MALZEME_SEC_SECENEGI = "Malzeme seçin…";
export const SILINMIS_MALZEME = "silinmiş malzeme";
export const BULUNAMAYAN_MALZEME = "kaydı bulunamayan malzeme";
export const MalzemeSatiriAlani = ({ satir, setSatir, sira = 1, malzemeler = [], hamMalzemeler = [], hatalar = {}, ozet = null, onKaldir = null }) => {
  const s = satir || malzemeSatiriFormu(null);
  const set = (alan, v) => setSatir({ ...s, [alan]: v });
  const b = BICIMLER[s.bicim];
  const secili = s.malzemeId !== "";
  const n = sira;
  // R44: seçili malzeme çöpteyse ya da bulunamıyorsa adı ham diziden ibareyle yazılır; seçicide yine seçili kalır, kayıt silinmez.
  const seciliYok = secili && !malzemeler.some(m => String(m.id) === s.malzemeId);
  const hamAd = seciliYok ? (() => { const m = hamMalzemeler.find(x => String(x.id) === s.malzemeId); return m ? `${malzemeCopEtiketi(m)} (${SILINMIS_MALZEME})` : BULUNAMAYAN_MALZEME; })() : null;
  const oz = ozet?.ozet || null;
  // Spec 0139 A-R13/2 (AC-11, AC-52): boy yönteminde çap bandına göre ek fire uygulanmaz; nedeni yalnız malzemenin tablosu doluyken.
  const seciliMalzeme = secili ? malzemeler.find(m => String(m.id) === s.malzemeId) : null;
  const fireKgNedeni = s.yontem === "boy" && fireBantlariOf(seciliMalzeme).length > 0;
  return (
    <div data-testid="malzeme-kalemi" style={{ border: "1px solid var(--n200, #e2e8f0)", borderRadius: 10, padding: "10px 12px", display: "grid", gap: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--n600, #475569)" }}>{`Malzeme kalemi ${n}`}</span>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <b data-testid="kalem-tutar" style={{ fontSize: 13, color: "var(--blu700, #1d4ed8)" }}>{ozet?.tutarK == null ? "girilmedi" : maliyetMetniKurus(ozet.tutarK)}</b>
          {onKaldir && <Btn small variant="danger" title="Kalemi kaldır" aria-label={`Malzeme kalemini kaldır ${n}`} onClick={onKaldir}><Icon name="trash" size={12} /></Btn>}
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: secili ? "2fr 1fr 1fr 1fr" : "2fr 1fr", gap: 12 }}>
        <Field label="Malzeme">
          <Select value={s.malzemeId} onChange={e => set("malzemeId", e.target.value)} aria-label={`Malzeme ${n}`}>
            <option value="">{MALZEME_SEC_SECENEGI}</option>
            {seciliYok && <option value={s.malzemeId}>{hamAd}</option>}
            {malzemeler.map(m => <option key={m.id} value={String(m.id)}>{malzemeCopEtiketi(m)}</option>)}
          </Select>
          <HataMetni>{hatalar.malzemeId}</HataMetni>
        </Field>
        {secili && (
          <Field label="Biçim">
            <Select value={s.bicim} onChange={e => set("bicim", e.target.value)} aria-label={`Biçim ${n}`}>
              {BICIM_SIRASI.map(k => <option key={k} value={k}>{BICIMLER[k].ad}</option>)}
            </Select>
            <HataMetni>{hatalar.bicim}</HataMetni>
          </Field>
        )}
        {secili && (
          <Field label="Fire (%)">
            <Input value={s.fire} onChange={e => set("fire", e.target.value)} placeholder="Malzemedeki varsayılan" aria-label={`Parça firesi ${n}`} />
            <HataMetni>{hatalar.fire}</HataMetni>
          </Field>
        )}
        <Field label="Adet">
          <Input value={s.adet ?? ""} inputMode="numeric" onChange={e => set("adet", e.target.value)} placeholder="1" aria-label={`Malzeme adedi ${n}`} />
          <HataMetni>{hatalar.adet}</HataMetni>
        </Field>
      </div>
      {secili && (
        <>
          <Field label="Maliyet yöntemi">
            <Segment kip="radyo" genislik="icerik" ariaLabel={`Maliyet yöntemi ${n}`} value={s.yontem} onChange={v => set("yontem", v)}
              options={Object.entries(YONTEMLER).map(([value, label]) => ({ value, label }))} />
          </Field>
          {b && (
            <div data-testid="malzeme-olculer" style={{ display: "grid", gridTemplateColumns: `repeat(${b.olculer.length}, 1fr)`, gap: 12 }}>
              {b.olculer.map(ad => (
                <div key={ad}>
                  <Field label={`${OLCU_ADLARI[ad]} (mm)`}>
                    <Input value={s[ad]} onChange={e => set(ad, e.target.value)} aria-label={`${OLCU_ADLARI[ad]} ${n}`} />
                    <HataMetni>{hatalar[ad]}</HataMetni>
                  </Field>
                  {b.paylar.includes(ad) && (
                    <Field label={`${OLCU_ADLARI[ad]} işleme payı (mm)`}>
                      <Input value={s[PAY_ALANI[ad]]} onChange={e => set(PAY_ALANI[ad], e.target.value)} placeholder="0" aria-label={`${OLCU_ADLARI[ad]} işleme payı ${n}`} />
                      <HataMetni>{hatalar[PAY_ALANI[ad]]}</HataMetni>
                    </Field>
                  )}
                </div>
              ))}
            </div>
          )}
          {oz && (
            <div data-testid="malzeme-ozeti" style={{ fontSize: 12.5, color: "var(--n700, #334155)", background: "var(--n100, #f8fafc)", borderRadius: 8, padding: "8px 12px" }}>
              {oz.yontem !== "boy" && <div>Pay dahil ağırlık: <b data-testid="malzeme-ham-kg">{kgMetni(oz.hamKg)}</b> · fire dahil: <b data-testid="malzeme-fireli-kg">{kgMetni(oz.fireliKg)}</b></div>}
              <div>Bir adet: <b data-testid="malzeme-maliyet">{oz.maliyetK == null ? `girilmedi (${oz.eksik.join(", ")})` : maliyetMetniKurus(oz.maliyetK)}</b></div>
            </div>
          )}
          {fireKgNedeni && <div data-testid="fire-kg-uygulanmadi" style={{ fontSize: 12, color: "var(--n600, #475569)" }}>{FIRE_KG_BOY_NEDENI}</div>}
        </>
      )}
    </div>
  );
};
