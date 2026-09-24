import { useMemo, useState } from "react";
import { fmtTR } from "../../lib/utils";
import { fiyatOnerisi, sonOnIkiAy, FIYAT_YONTEM, FIYAT_YONTEM_ETIKET, ORTAK_KAYNAK_ETIKET } from "../../lib/makinaMaliyeti";
import { Field, Input, Select } from "../ui";
import { tl2, Segment, HataMetni } from "./GiderAlanlari";

// Fiyat önerisi (spec 0002 R9, R9b, R24). Model bazlı: seçilen modelin dönemde üretilmiş makinalarının
// ortalama ÜRETİM maliyeti (komisyon hariç). Varsayılan dönem son 12 ay (plan M11).
const YONTEMLER = [FIYAT_YONTEM.MARJ, FIYAT_YONTEM.EKLE, FIYAT_YONTEM.KAT].map(v => ({ value: v, label: FIYAT_YONTEM_ETIKET[v] }));

export const FiyatOnerisi = ({ sonuc, bugun, modeller = [] }) => {
  const varsayilan = useMemo(() => sonOnIkiAy(bugun), [bugun]);
  const [model, setModel] = useState("");
  const [yontem, setYontem] = useState(FIYAT_YONTEM.MARJ);
  const [deger, setDeger] = useState("");
  const [bas, setBas] = useState(varsayilan.baslangic);
  const [bit, setBit] = useState(varsayilan.bitis);
  const sayi = String(deger).replace(",", ".");
  const sonucOneri = model ? fiyatOnerisi(sonuc, { model, baslangic: bas, bitis: bit, yontem, deger: sayi }) : null;
  const birim = yontem === FIYAT_YONTEM.KAT ? "kat" : "%";
  return (
    <div data-testid="fiyat-onerisi" style={{ background: "var(--surface, #ffffff)", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 12, padding: 18 }}>
      <div style={{ fontSize: 15, fontWeight: 700 }}>Fiyat önerisi</div>
      <div style={{ fontSize: 12, color: "var(--n500, #64748b)", margin: "2px 0 12px" }}>Seçilen modelin dönemde üretilmiş makinalarının ortalama üretim maliyeti üzerinden. Komisyon dahil değildir.</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <Field label="Model">
          <Select aria-label="Model" value={model} onChange={e => setModel(e.target.value)}>
            <option value="">Model seçin</option>
            {modeller.map(m => <option key={m.model} value={m.model}>{m.model}</option>)}
          </Select>
        </Field>
        <Field label="Dönem başlangıcı"><Input type="date" aria-label="Dönem başlangıcı" value={bas} onChange={e => setBas(e.target.value)} /></Field>
        <Field label="Dönem bitişi"><Input type="date" aria-label="Dönem bitişi" value={bit} onChange={e => setBit(e.target.value)} /></Field>
      </div>
      <div style={{ margin: "10px 0" }}><Segment ariaLabel="Yöntem" options={YONTEMLER} value={yontem} onChange={setYontem} /></div>
      <Field label={yontem === FIYAT_YONTEM.KAT ? "Kat (ör. 2,2)" : yontem === FIYAT_YONTEM.MARJ ? "Hedef marj (%)" : "Eklenecek kâr (%)"}>
        <div style={{ maxWidth: 200 }}><Input aria-label="Hedef değer" inputMode="decimal" value={deger} onChange={e => setDeger(e.target.value)} placeholder={birim === "kat" ? "2,2" : "25"} /></div>
      </Field>
      <div data-testid="oneri-sonuc" style={{ marginTop: 10, fontSize: 13, lineHeight: 1.6 }}>
        <div>Yöntem: <b>{FIYAT_YONTEM_ETIKET[yontem]}</b></div>
        {!model && <div style={{ color: "var(--n500, #64748b)" }}>Öneri için bir model seçin.</div>}
        {sonucOneri && sonucOneri.ortalama != null && (
          <div>{fmtTR(bas)} – {fmtTR(bit)} döneminde üretilen {sonucOneri.adet} makinanın ortalama üretim maliyeti: <b>{tl2(sonucOneri.ortalama)}</b></div>
        )}
        {sonucOneri?.hata && <HataMetni>{sonucOneri.hata}</HataMetni>}
        {sonucOneri?.uyari && <div style={{ color: "var(--orTx, #c2410c)", fontWeight: 700 }}>{sonucOneri.uyari}</div>}
        {sonucOneri?.fiyat != null && <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>Önerilen fiyat: {tl2(sonucOneri.fiyat)}</div>}
        <div style={{ fontSize: 11.5, color: "var(--n500, #64748b)", marginTop: 6 }}>Ortak gider kaynağı: {ORTAK_KAYNAK_ETIKET[sonuc.kaynak]}. Stoktan çekilen parçaların maliyeti hariç.</div>
      </div>
    </div>
  );
};
