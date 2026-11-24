import { useState, useEffect } from "react";
import { Btn, Field, Input, Icon } from "../ui";
import { KartBolum, HataMetni, Ipucu, BosDurum } from "../tasarim";
import { cinsSirasiOf, cinsSirasiDogrula, CINS_SIRA_EN_COK_SATIR, CINS_SIRA_EN_COK_KARAKTER, CINS_SIRA_SATIR_HATASI, CINS_SIRA_KARAKTER_HATASI } from "../../lib/siparisIhtiyaci";

// Spec 0161 R3, R3/2–R3/7, P5, P6 (AC-14–AC-19, AC-42–AC-44, AC-50): Ayarlar › Katalog › Cins Sıralaması. Sipariş listesinde cins
// bloklarının öncelik sırası `appSettings.cinsSirasi`'ye (düz dizi) yazılır; boşalınca `undefined` (anahtar silinmez, 0091 R24/4).
// Panel yerel taslak tutar, tek "Kaydet" ile yazar; sıra yukarı ve aşağı düğmeleriyle değişir. Kilit `AYAR_KILITLI.cinssira`.
// Eylem izni yoktur: Ayarlar sekmesi olan kullanıcının işidir (C6).
export const CINS_SIRA_IPUCU = "Sipariş listesinde aynı cinsteki parçalar ard arda gelir. Burada yazılan cinsler listedeki sırayla en başa alınır; öteki cinsler alfabetik sırayla gelir, cinsi girilmemiş parçalar en sondadır. Büyük küçük harf ve baştaki, sondaki boşluk fark etmez.";
export const CINS_EKLE_ETIKETI = "Eklenecek cins";
// Triyaj (bulgu 3): yinelenen cins eklenmez ve nedeni söylenir (AC-18; harf büyüklüğü ve boşluk farkı da yinelenmedir).
export const CINS_ZATEN_VAR = "Bu cins listede zaten var.";

export const SettingsCinsSira = ({ appSettings, setAppSettings, flash }) => {
  const kayitli = cinsSirasiOf(appSettings);
  const kayitliAnahtar = JSON.stringify(kayitli);
  const [liste, setListe] = useState(kayitli);
  const [yeni, setYeni] = useState("");
  const [hata, setHata] = useState(null);
  const [bilgi, setBilgi] = useState(null);
  // 0133 triyaj dersi: form kayıtlı DEĞER değişince yeniden kurulur, nesnenin kimliği değişince değil.
  useEffect(() => { setListe(JSON.parse(kayitliAnahtar)); }, [kayitliAnahtar]);
  const dolu = liste.length >= CINS_SIRA_EN_COK_SATIR;
  const ekle = () => {
    const t = yeni.trim();
    if (!t) { setYeni(""); return; }
    if (t.length > CINS_SIRA_EN_COK_KARAKTER) { setHata(CINS_SIRA_KARAKTER_HATASI); return; }
    const d = cinsSirasiDogrula([...liste, t]);
    if (d.hata) { setHata(d.hata); return; }
    if (d.liste.length === liste.length) { setBilgi(CINS_ZATEN_VAR); setHata(null); return; }
    setListe(d.liste); setYeni(""); setHata(null);
  };
  const tasi = (i, yon) => setListe(l => { const j = i + yon; if (j < 0 || j >= l.length) return l; const k = [...l]; [k[i], k[j]] = [k[j], k[i]]; return k; });
  const kaldir = (i) => setListe(l => l.filter((_, j) => j !== i));
  const kaydet = () => {
    const d = cinsSirasiDogrula(liste);
    if (d.hata) { setHata(d.hata); return; }
    setHata(null);
    setAppSettings?.(p => ({ ...(p || {}), cinsSirasi: d.liste.length ? d.liste : undefined }));
    flash?.("ok", "Cins sıralaması kaydedildi.");
  };
  return (
    <KartBolum title="Cins Sıralaması" icon="parts">
      <div data-testid="cins-sira-ipucu"><Ipucu>{CINS_SIRA_IPUCU}</Ipucu></div>
      <div data-testid="cins-sira-listesi" style={{ marginTop: 10, maxWidth: 520 }}>
        {liste.length === 0 ? <BosDurum testId="bos-cins-sira" baslik="Öncelikli cins yok." metin="Cinsler alfabetik sırayla bloklanır." /> : liste.map((c, i) => (
          <div key={`${c}-${i}`} data-testid="cins-sira-satiri" style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid var(--n150, #f1f5f9)" }}>
            <span style={{ width: 24, color: "var(--n400, #94a3b8)", fontSize: 12, textAlign: "right" }}>{i + 1}.</span>
            <span style={{ flex: 1, fontSize: 13, overflowWrap: "anywhere" }}>{c}</span>
            <Btn small variant="ghost" aria-label={`${c}: yukarı taşı`} disabled={i === 0} onClick={() => tasi(i, -1)}><Icon name="chevronUp" size={13} /></Btn>
            <Btn small variant="ghost" aria-label={`${c}: aşağı taşı`} disabled={i === liste.length - 1} onClick={() => tasi(i, 1)}><Icon name="chevronDown" size={13} /></Btn>
            <Btn small variant="ghost" aria-label={`${c}: kaldır`} onClick={() => kaldir(i)}><Icon name="close" size={13} /></Btn>
          </div>
        ))}
      </div>
      <div style={{ maxWidth: 520, marginTop: 12 }}>
        <Field label={CINS_EKLE_ETIKETI}>
          <div style={{ display: "flex", gap: 8 }}>
            <Input value={yeni} aria-label={CINS_EKLE_ETIKETI} placeholder="Örn: Rulman" disabled={dolu}
              onChange={e => { setYeni(e.target.value); setHata(null); setBilgi(null); }} onKeyDown={e => { if (e.key === "Enter") ekle(); }} />
            <Btn variant="ghost" onClick={ekle} disabled={dolu}>Ekle</Btn>
          </div>
          {dolu && <Ipucu>{CINS_SIRA_SATIR_HATASI}</Ipucu>}
          {bilgi && <div data-testid="cins-zaten-var"><Ipucu>{bilgi}</Ipucu></div>}
          <HataMetni>{hata}</HataMetni>
        </Field>
      </div>
      <div style={{ marginTop: 12 }}><Btn onClick={kaydet}>Kaydet</Btn></div>
    </KartBolum>
  );
};
