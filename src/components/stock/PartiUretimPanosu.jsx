import { useState } from "react";
import { Field, Select, StatCard } from "../ui";
import { KartBolum, BosDurum, Ipucu } from "../tasarim";
import { partiUretimOzeti, panoVarsayilanParti, partiSecenekAdi, DURUM_ADLARI, PANO_BOS_PARTI, PANO_BOS_VERI, FAZLA_IBARESI, PANO_KALAN_ADI, PANO_KALAN_IPUCU } from "../../lib/stokDurumu";

// Spec 0100 R18–R24, C10: seçilen üretim partisinin planlanan, montajda, satışa hazır, satıldı ve kalan sayıları. Yalnız okur, para
// göstermez (R23); kapısı çağıranda (`giderYetki`, R22, Karar 11). Bütün sayılar motordan (C1, C11); ekran saymaz ve sıralamaz.
const SUTUNLAR = [
  ["planlanan", "Planlanan"], ["montajda", DURUM_ADLARI.montaj], ["hazir", DURUM_ADLARI.hazir], ["satildi", "Satıldı"], ["kalan", PANO_KALAN_ADI],
];
const hucre = { padding: "11px 14px", fontSize: 13, textAlign: "right" };
const baslik = { padding: "11px 14px", fontSize: 12, fontWeight: 700, color: "var(--n600, #475569)", borderBottom: "1px solid var(--n200, #e2e8f0)" };

export const PartiUretimPanosu = ({ stock = [], customers = [], uretimPartileri = [] }) => {
  const [secili, setSecili] = useState(() => panoVarsayilanParti(uretimPartileri)?.id ?? null);
  const varsayilan = panoVarsayilanParti(uretimPartileri);
  if (!varsayilan) return <BosDurum testId="bos-parti-panosu" baslik={PANO_BOS_PARTI} />;
  const partiId = uretimPartileri.some(p => String(p.id) === String(secili)) ? secili : varsayilan.id;
  const ozet = partiUretimOzeti({ stock, customers, uretimPartileri }, partiId);
  const fazlaEki = (fazla) => (fazla ? <div data-testid="pano-fazla" style={{ fontSize: 11, fontWeight: 600, color: "var(--red700, #b91c1c)", marginTop: 2 }}>{FAZLA_IBARESI}</div> : null);
  return (
    <div data-testid="parti-uretim-panosu">
      <div style={{ maxWidth: 360 }}>
        <Field label="Üretim partisi">
          <Select aria-label="Üretim partisi" value={String(partiId)} onChange={e => setSecili(e.target.value)}>
            {uretimPartileri.map(p => <option key={p.id} value={String(p.id)}>{partiSecenekAdi(p)}</option>)}
          </Select>
        </Field>
      </div>
      {ozet.bos ? <BosDurum testId="bos-parti-panosu" baslik={PANO_BOS_VERI} /> : (<>
        <div data-testid="pano-ozet" style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 12, marginBottom: 16 }}>
          {/* Sözlük: tek bir sayıyı öne çıkaran özet kartı StatCard'dır; fazla üretim ibaresi ek satır yuvasında (R21). */}
          {SUTUNLAR.map(([k, ad]) => (
            <div key={k} data-testid={`pano-sayi-${k}`}>
              <StatCard label={ad} value={ozet.toplam[k]} color="var(--brand, #e85d1a)" ek={k === "kalan" ? fazlaEki(ozet.toplam.fazla) : null} />
            </div>
          ))}
        </div>
        <KartBolum varyant="kart" style={{ padding: 0, overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--n100, #f8fafc)" }}>
                <th style={{ ...baslik, textAlign: "left" }}>Model</th>
                {SUTUNLAR.map(([k, ad]) => <th key={k} style={{ ...baslik, textAlign: "right" }}>{ad}</th>)}
              </tr>
            </thead>
            <tbody>
              {ozet.satirlar.map(r => (
                <tr key={r.anahtar} data-testid="pano-satir" style={{ borderBottom: "1px solid var(--n150, #f1f5f9)" }}>
                  <td style={{ ...hucre, textAlign: "left", fontWeight: 600 }}>{r.model}</td>
                  {SUTUNLAR.map(([k]) => <td key={k} style={hucre}>{r[k]}{k === "kalan" && fazlaEki(r.fazla)}</td>)}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr data-testid="pano-toplam" style={{ background: "var(--n100, #f8fafc)", fontWeight: 700 }}>
                <td style={{ ...hucre, textAlign: "left" }}>Toplam</td>
                {SUTUNLAR.map(([k]) => <td key={k} style={hucre}>{ozet.toplam[k]}{k === "kalan" && fazlaEki(ozet.toplam.fazla)}</td>)}
              </tr>
            </tfoot>
          </table>
        </KartBolum>
        <Ipucu>{PANO_KALAN_IPUCU}</Ipucu>
      </>)}
    </div>
  );
};
