import { fmtTR } from "../../lib/utils";
import { kalemTutari } from "../../lib/gider";
import { tl2 } from "./GiderAlanlari";
import { StatKart, Rozet } from "./DonemRaporu";

// Giderler › Makina ve Model (spec 0001 R7, R8, R20, R21; plan K3, K26, K33–K35). Salt görünümdür:
// dağıtım veya maliyet hesabı yapmaz (0002). Rakamlar hesaplaGiderRaporu çıktısından gelir.
const kart = { background: "var(--surface, #ffffff)", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 12, padding: 18 };
const baslik = (t, alt) => (<div style={{ marginBottom: 10 }}><div style={{ fontSize: 15, fontWeight: 700 }}>{t}</div>{alt && <div style={{ fontSize: 12, color: "var(--n500, #64748b)", marginTop: 2 }}>{alt}</div>}</div>);
const satirStil = { display: "grid", gridTemplateColumns: "100px minmax(0, 1fr) 120px", gap: 12, padding: "8px 0", borderTop: "1px solid var(--n150, #f1f5f9)", fontSize: 13, alignItems: "center" };

export const MakinaModelGorunumu = ({ rapor, turMap }) => {
  const k = rapor.kovalar;
  const tutar = (x) => kalemTutari(x, turMap.get(String(x.turId))?.davranis);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <StatKart etiket="Makinaya atanmış" deger={tl2(k.makina)} alt={`${rapor.makinaBazli.length} makina`} renk="#c2410c" />
        <StatKart etiket="Modele atanmış" deger={tl2(k.model)} alt={`${rapor.modelBazli.length} model`} renk="#1d4ed8" />
        <StatKart etiket="Makina maliyetine girmeyen" deger={tl2(k.dagitma)} alt={`${rapor.dagitmaKalemleri.length} kalem · dağıtılmasın`} renk="#0f766e" />
        <StatKart etiket="Ortak gider" deger={tl2(k.ortak)} alt="Kira ve personel dahil" renk="#94a3b8" />
      </div>
      <div style={{ fontSize: 12.5, color: "var(--n600, #475569)" }}>Dört kovanın toplamı = dönem toplamı <b>{tl2(rapor.toplam)}</b>. Hiçbir tutar iki kovada sayılmaz.</div>

      <div style={kart}>
        {baslik("Makinaya atanmış giderler", "Stoktaki makinaya yapılan atama, makina stoktan seçilerek satılınca o satışa takip edilir.")}
        {rapor.makinaBazli.length === 0 && <div style={{ fontSize: 13, color: "var(--n500, #64748b)" }}>Bu dönemde makinaya atanmış gider yok.</div>}
        {rapor.makinaBazli.map(m => (
          <div key={m.anahtar} style={{ borderTop: "1px solid var(--n150, #f1f5f9)", padding: "10px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div>
                <b>{[m.makina.model, m.makina.seri && `Seri ${m.makina.seri}`].filter(Boolean).join(" · ")}</b>
                <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                  {m.makina.tur === "stok" ? <Rozet>Makina Stoğu</Rozet> : <Rozet renk="yesil">Satıldı · {m.makina.ad}</Rozet>}
                  {m.makina.stoktanTakip && <Rozet renk="mavi">Stoktayken atanmıştı, satışa takip edildi</Rozet>}
                </div>
              </div>
              <div style={{ textAlign: "right" }}><div style={{ fontSize: 12, color: "var(--n500, #64748b)" }}>{m.kalemler.length} kalem · doğrudan gider</div><b style={{ fontSize: 17 }}>{tl2(m.toplam)}</b></div>
            </div>
            {m.kalemler.map(x => <div key={x.id} style={satirStil}><span style={{ color: "var(--n600, #475569)" }}>{fmtTR(x.tarih)}</span><span>{x.aciklama || "—"}</span><b style={{ textAlign: "right" }}>{tl2(tutar(x))}</b></div>)}
          </div>
        ))}
      </div>

      <div style={kart}>
        {baslik("Modele atanmış giderler", "Aynı modele birden fazla kalem atanırsa adetler toplanmaz; makina başına tutar satır bazında gösterilir.")}
        {rapor.modelBazli.length === 0 && <div style={{ fontSize: 13, color: "var(--n500, #64748b)" }}>Bu dönemde modele dağıtılmış gider yok.</div>}
        {rapor.modelBazli.map(m => (
          <div key={m.model} style={{ borderTop: "1px solid var(--n150, #f1f5f9)", padding: "10px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><b><Rozet renk="mavi">Model</Rozet> {m.model}</b><b>{tl2(m.toplam)}</b></div>
            {m.satirlar.map((s, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "100px minmax(0, 1fr) 90px 120px 120px", gap: 10, fontSize: 13, padding: "6px 0" }}>
                <span style={{ color: "var(--n600, #475569)" }}>{fmtTR(s.tarih)}</span><span>{s.aciklama || "—"}</span>
                <span style={{ textAlign: "right" }}>{s.adet} makina</span><span style={{ textAlign: "right" }}>{tl2(s.birimMaliyet)} / makina</span><b style={{ textAlign: "right" }}>{tl2(s.tutar)}</b>
              </div>
            ))}
          </div>
        ))}
        {rapor.kismiOrtak.length > 0 && (
          <div style={{ marginTop: 10, fontSize: 12.5, background: "var(--n100, #f8fafc)", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 8, padding: "8px 10px" }}>
            <b>Kısmi dağıtım:</b> {rapor.kismiOrtak.map(x => `${x.kalem.aciklama || fmtTR(x.kalem.tarih)} (${tl2(x.tutar)})`).join(", ")} modellere dağıtılmadı ve ortak gidere yazıldı.
          </div>
        )}
      </div>

      <div style={kart}>
        {baslik("Makina maliyetine girmeyen giderler", "“Dağıtılmasın” seçilen kalemler. Gider toplamında ve borç özetinde normal görünür, makina maliyetine hiç girmez.")}
        {rapor.dagitmaKalemleri.length === 0 && <div style={{ fontSize: 13, color: "var(--n500, #64748b)" }}>Bu dönemde yok.</div>}
        {rapor.dagitmaKalemleri.map(x => <div key={x.id} style={satirStil}><span style={{ color: "var(--n600, #475569)" }}>{fmtTR(x.tarih)}</span><span>{x.aciklama || "—"}</span><b style={{ textAlign: "right" }}>{tl2(tutar(x))}</b></div>)}
      </div>

      <div style={kart}>
        {baslik("Ortak gidere düşen atamalar", "Atandığı makina veya model silinmiş ya da takip edilemiyor. Kalem silinmez, ortak toplamına girer.")}
        {rapor.dusenAtamalar.length === 0 && <div style={{ fontSize: 13, color: "var(--n500, #64748b)" }}>Yok.</div>}
        {rapor.dusenAtamalar.map((d, i) => (
          <div key={i} style={satirStil}>
            <span style={{ color: "var(--n600, #475569)" }}>{fmtTR(d.kalem.tarih)}</span>
            <span>{d.kalem.aciklama || "—"} <span style={{ color: "var(--amb700, #b45309)", fontSize: 12 }}>· {d.neden === "model" ? `model “${d.modelAd}” silinmiş` : "makina silinmiş veya takip edilemiyor"}</span></span>
            <b style={{ textAlign: "right" }}>{tl2(d.neden === "model" ? d.tutar : tutar(d.kalem))}</b>
          </div>
        ))}
        <div style={{ fontSize: 12, color: "var(--n500, #64748b)", marginTop: 8, lineHeight: 1.6 }}>
          Makina veya özel model çöpten geri alınırsa atama kendiliğinden döner; kalıcı silinirse bağ kopar. Seri numarası elle girilerek satılan makinaya stoktayken atanan gider satışa takip edilemez ve burada görünür.
        </div>
      </div>
    </div>
  );
};
