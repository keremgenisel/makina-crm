import { Field, Input, Select, Btn, Icon } from "./ui";
import { HataMetni, Ipucu } from "./tasarim";
import { maliyetMetniKurus } from "../lib/urunAgaci";
import { malzemeSatiriFormu, malzemeCopEtiketi, BICIMLER, BICIM_SIRASI, OLCU_ADLARI, kgMetni, BOYDAN_SIPARIS_ETIKETI, CUBUK_BOYU_ETIKETI, CUBUK_KISA_UYARISI, cubukKisaMi } from "../lib/malzeme";

// Spec 0132 R9–R14/2, AC-28–AC-46; spec 0135 R12–R16, R44 (plan turu Karar 44): parçanın TEK malzeme kaleminin satırı. Kalem
// listesindeki her malzeme kalemi bu bileşenle çizilir; alanlar 0132'nin malzeme satırının alanları artı adet (R12, R13). Ölçü
// alanları biçimden gelir (R11); spec 0141 ile işleme payı yok, girilen ölçü satın alınan ölçüdür. Canlı ağırlık, satır tutarı ve
// eksiklik ebeveynin tek canlı özetinden (`ozet`, 0099 C1/2); bu bileşen hesap yapmaz. Erişilebilir adlar satır numarasıyla biter
// (birden çok kalemde benzersiz). Spec 0143 A-R1, B-R1–B-R2/2: "Maliyet yöntemi" seçicisi yok (maliyet her zaman kilodan); dört
// biçimde de "Sipariş boydan verilir" kutusu, işaretliyken çubuk boyu (zorunlu) ve parça çubuktan uzunsa engellemeyen uyarı.
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
          <div data-testid="boydan-siparis" style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, paddingBottom: 10, cursor: "pointer" }}>
              <input type="checkbox" checked={s.boydanSiparis === true} onChange={e => set("boydanSiparis", e.target.checked)} aria-label={`${BOYDAN_SIPARIS_ETIKETI} ${n}`} />
              {BOYDAN_SIPARIS_ETIKETI}
            </label>
            {s.boydanSiparis === true && (
              <div style={{ minWidth: 160 }}>
                <Field label={CUBUK_BOYU_ETIKETI}>
                  <Input value={s.cubukBoyu ?? ""} onChange={e => set("cubukBoyu", e.target.value)} placeholder="6000" aria-label={`Çubuk boyu ${n}`} />
                  <HataMetni>{hatalar.cubukBoyu}</HataMetni>
                </Field>
              </div>
            )}
          </div>
          {b && (
            <div data-testid="malzeme-olculer" style={{ display: "grid", gridTemplateColumns: `repeat(${b.olculer.length}, 1fr)`, gap: 12 }}>
              {b.olculer.map(ad => (
                <div key={ad}>
                  <Field label={`${OLCU_ADLARI[ad]} (mm)`}>
                    <Input value={s[ad]} onChange={e => set(ad, e.target.value)} aria-label={`${OLCU_ADLARI[ad]} ${n}`} />
                    <HataMetni>{hatalar[ad]}</HataMetni>
                  </Field>
                </div>
              ))}
            </div>
          )}
          {oz && (
            <div data-testid="malzeme-ozeti" style={{ fontSize: 12.5, color: "var(--n700, #334155)", background: "var(--n100, #f8fafc)", borderRadius: 8, padding: "8px 12px" }}>
              <div>Ağırlık: <b data-testid="malzeme-ham-kg">{kgMetni(oz.hamKg)}</b> · fire dahil: <b data-testid="malzeme-fireli-kg">{kgMetni(oz.fireliKg)}</b></div>
              <div>Bir adet: <b data-testid="malzeme-maliyet">{oz.maliyetK == null ? `girilmedi (${oz.eksik.join(", ")})` : maliyetMetniKurus(oz.maliyetK)}</b></div>
            </div>
          )}
          {cubukKisaMi(s) && <Ipucu><span data-testid="cubuk-kisa-uyarisi">{CUBUK_KISA_UYARISI}</span></Ipucu>}
        </>
      )}
    </div>
  );
};
