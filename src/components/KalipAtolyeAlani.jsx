import { useRef } from "react";
import { Btn, Icon, Input, Field } from "./ui";
import { HataMetni, Ipucu, UyariSeridi, BolumBasligi, Segment } from "./tasarim";
import {
  kutuAcikMi, tamirListesi, kalipIsiKalemleri, girisAnahtari, kayitliSeciliMi, kayitliDegistir, sevkFabrikaTeslimMi,
  KALIP_KUTU_ETIKETI, KALIP_KUTU_IPUCU, KALIP_ISI_ONERISI, KAYIT_BOLUMU,
} from "../lib/kalipTamiri";

// Spec 0115 R7–R15: servis formunun "Kalıp atölyeye girecek" bölümü. Kutu her servis türünde ve onarım yerinde çizilir
// (R10/2). Kutu açılınca liste boşsa kalıp işi tipli kalemler ön doldurulur (Karar 51); üç kaynak: kalemler, firmanın kayıtlı
// kalıpları, elle giriş (R12). Bölüm kayda hiçbir şey yazmaz: geçici alanlar `_kalipAtolye`, `_tamirHatalari`; kalıcı yazım
// iki kurucunun `tamirYaz` adımıdır (C3). Öneri yalnız `partTypeDefs` verilince çizilir (R11/2).
// Spec 0117 R1–R7: amber kabın sonunda kalıbın dönüşü (yedek parça satışının Teslim Şekli bölümünün aynısı, farklı adres yok).
// Değerler form anahtarlarıdır; kayda yazan iki kurucunun `tamirYaz(…, tamirSevkKur(form))` adımıdır (R29).
export const KalipAtolyeAlani = ({ form, setForm, musteri = null, parts = [], partTypeDefs = null, calisanlar = [] }) => {
  // Geçici anahtar: sayaç listedeki en büyük y<n>'den sonra başlar. Form taslaktan dönünce (useFormDraft) eski girişler
  // y1, y2… taşır; bileşen sayacı sıfırdan başlasa yeni giriş aynı anahtarı alır, satır hatası iki satırda görünürdü (triyaj).
  const sayac = useRef(0);
  const yeniAnahtar = (l) => {
    const enBuyuk = Math.max(0, ...(l || []).map(g => Number(/^y(\d+)$/.exec(String(g?._anahtar ?? ""))?.[1] || 0)));
    sayac.current = Math.max(sayac.current, enBuyuk) + 1;
    return `y${sayac.current}`;
  };
  const acik = kutuAcikMi(form);
  const kalemler = partTypeDefs ? kalipIsiKalemleri(form.degisenParcalar, parts, partTypeDefs) : [];
  const liste = tamirListesi(form);
  const hatalar = form._tamirHatalari || null;
  const kayitlilar = (musteri?.kaliplar || []).filter(k => String(k?.ad ?? "").trim());

  const listeYaz = (fn) => setForm(p => ({ ...p, atolyeKaliplari: fn(tamirListesi(p)), _tamirHatalari: undefined }));
  const kutuDegistir = () => setForm(p => {
    const ac = !kutuAcikMi(p);
    const sonraki = { ...p, _kalipAtolye: ac, _tamirHatalari: undefined };
    if (ac && tamirListesi(p).length === 0) {
      const onDoldur = partTypeDefs ? kalipIsiKalemleri(p.degisenParcalar, parts, partTypeDefs) : [];
      sonraki.atolyeKaliplari = onDoldur.map(k => ({ ...k, _anahtar: yeniAnahtar() }));
    }
    return sonraki;
  });

  return (
    <div data-testid="kalip-atolye" style={{ margin: "4px 0 12px" }}>
      {kalemler.length > 0 && !acik && (
        <div data-testid="kalip-isi-onerisi" style={{ marginBottom: 6 }}>
          <UyariSeridi aile="bilgi">{KALIP_ISI_ONERISI}</UyariSeridi>
        </div>
      )}
      <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", background: acik ? "var(--ambBg, #fffbeb)" : "var(--n100, #f8fafc)", border: `1px solid ${acik ? "var(--ambBr, #fde68a)" : "var(--n200, #e2e8f0)"}`, borderRadius: 8, padding: "10px 12px" }}>
        <input type="checkbox" checked={acik} onChange={kutuDegistir} style={{ width: 16, height: 16, cursor: "pointer", accentColor: "var(--amb700, #b45309)" }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--n600, #475569)" }}>{KALIP_KUTU_ETIKETI}</span>
      </label>
      <Ipucu>{KALIP_KUTU_IPUCU}</Ipucu>

      {acik && (
        <div style={{ border: "1px solid var(--ambBr, #fde68a)", borderRadius: 8, padding: 12, marginTop: 6, display: "flex", flexDirection: "column", gap: 10 }}>
          <div data-testid="atolye-kaynak-kalem">
            <BolumBasligi>{KAYIT_BOLUMU.onDoldur}</BolumBasligi>
            {kalemler.length === 0
              ? <Ipucu>Bu serviste kalıp işi tipli kalem yok.</Ipucu>
              : <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {kalemler.map((k, i) => (
                    <Btn key={i} small variant="ghost" onClick={() => listeYaz(l => [...l, { ...k, _anahtar: yeniAnahtar(l) }])}>
                      <Icon name="plus" size={12} /> {k.ad}
                    </Btn>
                  ))}
                </div>}
          </div>
          <div data-testid="atolye-kaynak-kayitli">
            <BolumBasligi>{KAYIT_BOLUMU.kayitli}</BolumBasligi>
            {kayitlilar.length === 0
              ? <Ipucu>Bu makinanın kayıtlı kalıbı yok.</Ipucu>
              : <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {kayitlilar.map((k, i) => (
                    <label key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, cursor: "pointer" }}>
                      <input type="checkbox" checked={kayitliSeciliMi(liste, k)} onChange={() => listeYaz(l => kayitliDegistir(l, k, yeniAnahtar(l)))} />
                      <span>{k.ad}{k.olcu ? ` · ${k.olcu}` : ""}</span>
                    </label>
                  ))}
                </div>}
          </div>
          <div data-testid="atolye-kaynak-elle">
            <BolumBasligi>{KAYIT_BOLUMU.elle}</BolumBasligi>
            <Btn small variant="ghost" onClick={() => listeYaz(l => [...l, { _anahtar: yeniAnahtar(l), ad: "", olcu: "" }])}>
              <Icon name="plus" size={12} /> Kalıp ekle
            </Btn>
          </div>
          <div data-testid="atolye-liste" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {liste.map((g, i) => {
              const a = girisAnahtari(g, i);
              return (
                <div key={a}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 140px 36px", gap: 8, alignItems: "center" }}>
                    <Input aria-label={`Atölye kalıp adı ${i + 1}`} placeholder="Kalıp adı" value={g.ad || ""}
                      onChange={e => { const v = e.target.value; listeYaz(l => l.map((x, j) => (j === i ? { ...x, ad: v } : x))); }} />
                    <Input aria-label={`Atölye kalıp ölçüsü ${i + 1}`} placeholder="Ölçü" value={g.olcu || ""}
                      onChange={e => { const v = e.target.value; listeYaz(l => l.map((x, j) => (j === i ? { ...x, olcu: v } : x))); }} />
                    <button type="button" title="Bu kalıbı listeden çıkar" aria-label={`Atölye kalıbını çıkar ${i + 1}`}
                      onClick={() => listeYaz(l => l.filter((_, j) => j !== i))}
                      style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid var(--redBr, #fecaca)", background: "var(--redBg, #fef2f2)", color: "var(--red600, #dc2626)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="trash" size={15} /></button>
                  </div>
                  {hatalar?.satirHatalari?.[a] && <div data-testid={`atolye-satir-hatasi-${i}`}><HataMetni>{hatalar.satirHatalari[a]}</HataMetni></div>}
                </div>
              );
            })}
          </div>
          {hatalar?.hata && liste.length === 0 && <div data-testid="atolye-bos-hatasi"><HataMetni>{hatalar.hata}</HataMetni></div>}
          <SevkBolumu form={form} setForm={setForm} calisanlar={calisanlar} />
        </div>
      )}
    </div>
  );
};

// Spec 0117 R2–R6/2: teslim şekli boşken Kargo; Fabrika Teslim seçilince kargo firması ve takip numarası temizlenir ve çizilmez,
// tarih ve kişi alanlarının etiketi değişir. Hiçbir alan zorunlu değil, doğrulanmaz (R7, R7/2).
const SevkBolumu = ({ form, setForm, calisanlar }) => {
  const fabrika = sevkFabrikaTeslimMi(form);
  const yaz = (alan) => (e) => { const v = e.target.value; setForm(p => ({ ...p, [alan]: v })); };
  const adlar = (calisanlar || []).map(c => c?.ad).filter(Boolean);
  return (
    <div data-testid="kalip-sevk" style={{ borderTop: "1px dashed var(--ambBr, #fde68a)", paddingTop: 10 }}>
      <BolumBasligi>{KAYIT_BOLUMU.sevk}</BolumBasligi>
      <Field label="Teslim Şekli">
        <Segment kip="dugme" ariaLabel="Kalıp Teslim Şekli" value={fabrika}
          options={[{ value: true, label: "🏭 Fabrika Teslim" }, { value: false, label: "📦 Kargo" }]}
          onChange={ft => setForm(p => ({ ...p, kalipFabrikaTeslim: ft, ...(ft ? { kalipKargoFirma: "", kalipKargoTakipNo: "" } : {}) }))} />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: fabrika ? "1fr" : "1.4fr 1.4fr 1fr", gap: 8, marginTop: 8 }}>
        {!fabrika && <Field label="Kargo Firması"><Input data-testid="kalip-sevk-firma" aria-label="Kalıp kargo firması" value={form.kalipKargoFirma || ""} placeholder="Kargo firması" onChange={yaz("kalipKargoFirma")} /></Field>}
        {!fabrika && <Field label="Takip No"><Input data-testid="kalip-sevk-takip" aria-label="Kalıp kargo takip no" value={form.kalipKargoTakipNo || ""} placeholder="Takip no" onChange={yaz("kalipKargoTakipNo")} /></Field>}
        <Field label={fabrika ? "Teslim Tarihi" : "Kargo Tarihi"}>
          <Input type="date" data-testid="kalip-sevk-tarih" value={form.kalipKargoTarih || ""} onChange={yaz("kalipKargoTarih")} />
        </Field>
      </div>
      <Field label={fabrika ? "Teslim Eden Kişi" : "Kargoyu Veren Kişi"}>
        <Input list="kalip-sevk-kisi-listesi" data-testid="kalip-sevk-kisi" value={form.kalipKargoSorumlusu || ""} placeholder="Seçin veya yazın..."
          onChange={yaz("kalipKargoSorumlusu")} />
        <datalist id="kalip-sevk-kisi-listesi">{adlar.map(a => <option key={a} value={a} />)}</datalist>
      </Field>
    </div>
  );
};
