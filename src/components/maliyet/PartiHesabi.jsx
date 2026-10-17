import { useMemo, useState } from "react";
import { Btn, Field, Input, Modal, Select, Icon } from "../ui";
import { KartBolum, BosDurum, HataMetni, Ipucu, UyariSeridi } from "../tasarim";
import { kilitRedMesaji } from "../../lib/kilitAlanlari";
import { kurusMetni, partiHesabi, partisizMakinaSayisi, planAdediDogrula, planAdetleriYaz } from "../../lib/makinaStandartMaliyet";

// Spec 0088 R17–R22, R28: seçilen partinin model-adet tablosu (partiye bağlı makinalardan ya da planlanan adetten), özet
// (standart maliyet, önerilen ciro, gerçekleşen satış, iki kâr) ve gerçekleşen tedarik karşılaştırması. Pay hesap
// ayarlarınındır (tek varsayım, R28); partinin dönemi yalnız tedarik karşılaştırmasında okunur.
export const KAR_KUMELERI_NOTU = "Öneriye göre kâr partinin bütün adedinden hesaplanır (önerilen ciro − toplam standart maliyet); gerçeğe göre kâr yalnız satılmış makinalardan (gerçekleşen satış − o makinaların standart maliyeti). Bedelsiz ve kuru olmayan satışlar ikisine de girmez.";
export const TEDARIK_FARK_CUMLESI = "Fark bir hata değildir: dönemde \"Ürün ağacından gelir\" rolündeki türlere girilen gider ile partinin ürün ağacından hesaplanan direkt maliyeti arasındaki farktır.";
export const TEDARIK_TABAN_CUMLESI = "Taban farkı: standart direkt maliyet KDV hariç matrahtır, gerçekleşen tutar indirilemeyen KDV'yi de içerir; farkın sıfır olmaması normaldir.";
const donemCumlesi = (n) => `Dönem farkı: parti başlamadan önce alınmış tedarik kapsam dışıdır${n > 0 ? `; bu dönemin ayları ${n} partiyle daha paylaşılıyor ve tedarik partilere bölünmez` : ""}.`;
// Spec 0090 R34 (AC-38/5): bu sütunun payı hesap ayarlarının döneminden ve varsayılan adedinden gelir; Üretim Partileri'ndeki pay
// partinin kendi aylarından. İki rakam ayrı soruları cevaplar ve toplanmaz (X8).
export const PAY_AYRIM_IBARESI = "Hesap ayarlarının dönemi ve varsayılan adediyle; Üretim Partileri'ndeki pay partinin kendi aylarından gelir, ikisi toplanmaz.";
const th = { padding: "8px 12px", fontSize: 11, fontWeight: 700, color: "var(--n600, #475569)", textAlign: "right", whiteSpace: "nowrap" };
const td = { padding: "9px 12px", fontSize: 13, textAlign: "right", whiteSpace: "nowrap" };
const Rakam = ({ etiket, deger, alt, testId }) => (
  <div data-testid={testId} style={{ minWidth: 150 }}>
    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--n500, #64748b)", textTransform: "uppercase", letterSpacing: 0.3 }}>{etiket}</div>
    <div style={{ fontSize: 18, fontWeight: 800, marginTop: 2 }}>{deger}</div>
    {alt && <div style={{ fontSize: 12, color: "var(--n500, #64748b)", marginTop: 2 }}>{alt}</div>}
  </div>
);

export const PartiHesabi = ({ pay, modeller, canDo, baskasiKilitli, showToast, veri, rates, bugun, uretimPartileri = [], setUretimPartileri, stock = [], customers = [] }) => {
  const canli = uretimPartileri.filter(p => !p.deletedAt);
  const [secili, setSecili] = useState(() => canli[0]?.id ?? null);
  const [plan, setPlan] = useState(null); // { adetler: {model: ham}, hatalar, kaldirilan: [ad] }
  const parti = canli.find(p => String(p.id) === String(secili)) || canli[0] || null;
  const hesap = useMemo(() => (parti ? partiHesabi(parti, veri, { payK: pay.payK, modeller, rates, bugun }) : null), [parti, veri, pay.payK, modeller, rates, bugun]);
  const partisiz = partisizMakinaSayisi({ stock, customers });
  const yetki = canDo("gider_tanim");

  if (!parti) return <BosDurum testId="bos-parti-hesabi" baslik="Üretim partisi yok" metin="Partiler Üretim Partileri görünümünde tanımlanır." />;
  const planAc = () => setPlan({ adetler: Object.fromEntries(modeller.map(m => [m.model, parti.planlananAdetler?.[m.model] ? String(parti.planlananAdetler[m.model]) : ""])), hatalar: {}, kaldirilan: [] });
  // Triyaj (bulgu 3): planlanan adedi olup modeli bulunamayan adlar pencerede listelenir ve kaldırılabilir (R18/2 şeridi kalıcı kalmasın).
  const planBulunamayan = Object.keys(parti.planlananAdetler || {}).filter(ad => !modeller.some(m => m.model === ad));
  const planKaydet = () => {
    const hatalar = {}; const adetler = { ...(parti.planlananAdetler || {}) }; // R18/2: listede olmayan (bulunamayan) adlar korunur, kaldırılan hariç
    for (const ad of plan.kaldirilan) delete adetler[ad];
    for (const [m, ham] of Object.entries(plan.adetler)) { const d = planAdediDogrula(ham); if (d.hata) hatalar[m] = d.hata; else if (d.bos) delete adetler[m]; else adetler[m] = d.deger; }
    if (Object.keys(hatalar).length) { setPlan(p => ({ ...p, hatalar })); return; }
    const kilit = baskasiKilitli?.("uretim_partisi", parti.id);
    if (kilit) { showToast(kilitRedMesaji(kilit, parti.ad), "err"); return; }
    setUretimPartileri?.(p => p.map(x => (String(x.id) === String(parti.id) ? planAdetleriYaz(x, adetler) : x)));
    showToast("Planlanan adetler kaydedildi.");
    setPlan(null);
  };
  const o = hesap.ozet; const t = hesap.tedarik;

  return (
    <div>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 12 }}>
        <Field label="Üretim partisi">
          <Select aria-label="Üretim partisi" value={String(parti.id)} onChange={e => setSecili(e.target.value)}>
            {canli.map(p => <option key={p.id} value={String(p.id)}>{p.ad}</option>)}
          </Select>
        </Field>
        {yetki && <Btn variant="ghost" onClick={planAc}><Icon name="edit" size={14} /> Planlanan adetler</Btn>}
      </div>
      {partisiz > 0 && <Ipucu><span data-testid="partisiz-makina">{`${partisiz} makinanın partisi yok; parti hesabına girmezler.`}</span></Ipucu>}
      {/* Triyaj (bulgu 1): planlı ve partiye bağlı makinadan türeyen bulunamayan satırların metni ayrı. */}
      {hesap.bulunamayan.some(b => b.planlanan) && (
        <div style={{ margin: "8px 0" }}><UyariSeridi aile="uyari" testId="plan-bulunamayan">
          {`Planlanan adeti olan ama bulunamayan model: ${hesap.bulunamayan.filter(b => b.planlanan).map(b => `${b.model} (${b.adet})`).join(", ")}. Model yeniden adlandırılmış ya da silinmiş olabilir; hesaba girmez. Planlanan adetler penceresinden kaldırılabilir.`}
        </UyariSeridi></div>
      )}
      {hesap.bulunamayan.some(b => !b.planlanan) && (
        <div style={{ margin: "8px 0" }}><UyariSeridi aile="uyari" testId="model-bulunamayan">
          {`Partiye bağlı ama modeli tanımlı olmayan makinalar: ${hesap.bulunamayan.filter(b => !b.planlanan).map(b => `${b.model} (${b.adet})`).join(", ")}. Model silinmiş ya da adı değişmiş olabilir; bu makinalar ne maliyete ne gerçekleşen satışa girer.`}
        </UyariSeridi></div>
      )}
      {hesap.bos ? <BosDurum testId="bos-parti" baslik="Bu partiye bağlı makina yok" metin="Planlanan adet girilirse parti henüz üretilmeden fiyatlanabilir." /> : (
        <>
          <KartBolum varyant="kart" style={{ padding: 0, overflow: "auto", marginBottom: 16 }} testId="parti-tablosu">
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr style={{ background: "var(--n100, #f8fafc)" }}>
                <th style={{ ...th, textAlign: "left" }}>Model</th><th style={th}>Adet</th><th style={th}>Direkt (birim)</th><th style={th}>Genel gider payı (birim)<div data-testid="pay-ayrim-ibaresi" style={{ fontSize: 10.5, fontWeight: 400, whiteSpace: "normal", maxWidth: 220, marginLeft: "auto" }}>{PAY_AYRIM_IBARESI}</div></th>
                <th style={th}>Toplam (birim)</th><th style={th}>Önerilen satış (birim)</th><th style={th}>Toplam maliyet</th><th style={th}>Önerilen ciro</th>
              </tr></thead>
              <tbody>
                {hesap.satirlar.map(r => (
                  <tr key={r.model} data-testid={`parti-satiri-${r.model}`} style={{ borderTop: "1px solid var(--n150, #f1f5f9)" }}>
                    <td style={{ ...td, textAlign: "left", fontWeight: 700 }}>{r.model}{r.eksikSayisi > 0 && <span style={{ marginLeft: 6, fontSize: 11, color: "var(--warnTx, #854d0e)" }}>eksik</span>}</td>
                    <td style={td}>{r.adet}{r.planlanan && <span data-testid="planlanan" style={{ marginLeft: 6, fontSize: 11, color: "var(--n500, #64748b)" }}>planlanan</span>}</td>
                    <td style={td}>{kurusMetni(r.direktK)}</td><td style={td}>{kurusMetni(r.payK)}</td><td style={td}>{kurusMetni(r.toplamK)}</td>
                    <td style={td}>{kurusMetni(r.oneriK)}</td><td style={{ ...td, fontWeight: 700 }}>{kurusMetni(r.toplamMaliyetK)}</td><td style={td}>{kurusMetni(r.oneriCiroK)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </KartBolum>
          <KartBolum varyant="kart" title="Parti özeti" style={{ marginBottom: 16 }} testId="parti-ozeti">
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
              <Rakam testId="ozet-standart" etiket="Toplam standart maliyet" deger={kurusMetni(o.toplamStandartK)} />
              <Rakam testId="ozet-ciro" etiket="Önerilen ciro (KDV hariç)" deger={kurusMetni(o.onerilenCiroK)} alt={o.katsayisiz > 0 ? `${o.katsayisiz} modelin kâr katsayısı yok, ciroya girmedi` : null} />
              <Rakam testId="ozet-satis" etiket="Gerçekleşen satış (KDV hariç)" deger={kurusMetni(o.satisK)} />
              <Rakam testId="ozet-kar-oneri" etiket="Öneriye göre kâr" deger={kurusMetni(o.oneriyeGoreKarK)} />
              <Rakam testId="ozet-kar-gercek" etiket="Gerçeğe göre kâr" deger={kurusMetni(o.gercegeGoreKarK)} />
            </div>
            <div data-testid="ozet-kirilim" style={{ fontSize: 13, marginTop: 10 }}>
              {`Satılmış ${o.kirilim.satilmis} · Stokta ${o.kirilim.stokta} · Bedelsiz ${o.kirilim.bedelsiz} · Kuru olmayan ${o.kirilim.kursuz}${o.kirilim.modelYok > 0 ? ` · Modeli bulunamayan ${o.kirilim.modelYok}` : ""}`}
            </div>
            {o.kirilim.kursuz > 0 && <Ipucu><span data-testid="kursuz-not">{`${o.kirilim.kursuz} döviz satışının kuru yok; gerçekleşen satışa girmedi.`}</span></Ipucu>}
            {(o.kurDurumlari.kayitli + o.kurDurumlari.yaklasik) > 0 && <Ipucu>{`Döviz satışları TL'ye çevrildi: ${o.kurDurumlari.kayitli} kayıtlı kurla, ${o.kurDurumlari.yaklasik} güncel kurla (yaklaşık).`}</Ipucu>}
            <Ipucu>{KAR_KUMELERI_NOTU}</Ipucu>
          </KartBolum>
        </>
      )}
      <KartBolum varyant="kart" title="Gerçekleşen tedarik karşılaştırması" style={{ marginBottom: 16 }} testId="tedarik-karsilastirmasi">
        {t.baslamadi ? <Ipucu><span data-testid="parti-baslamadi">{`Parti henüz başlamadı (başlangıç ${t.donem.bas}); gerçekleşen tedarik karşılaştırması parti başladıktan sonra yapılır.`}</span></Ipucu>
          : t.yururlukOncesi ? <Ipucu>Partinin dönemi gider takibinin yürürlüğünden önce; karşılaştırma yapılamıyor.</Ipucu> : (
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            <Rakam testId="tedarik-gercek" etiket={`Gerçekleşen tedarik (${t.donem.bas} – ${t.donem.bit})`} deger={kurusMetni(t.tedarikK)} />
            <Rakam testId="tedarik-standart" etiket="Standart direkt maliyet" deger={kurusMetni(t.standartDirektK)} />
            <Rakam testId="tedarik-fark" etiket="Fark" deger={kurusMetni(t.farkK)} />
          </div>
        )}
        {!t.baslamadi && <>
          <Ipucu>{TEDARIK_FARK_CUMLESI}</Ipucu>
          <Ipucu>{TEDARIK_TABAN_CUMLESI}</Ipucu>
          <Ipucu><span data-testid="tedarik-donem">{donemCumlesi(t.paylasanParti)}</span></Ipucu>
        </>}
      </KartBolum>

      {plan && (
        <Modal wide title={`${parti.ad} · planlanan adetler`} onClose={() => setPlan(null)}
          footer={<><Btn variant="ghost" onClick={() => setPlan(null)}>İptal</Btn><Btn onClick={planKaydet}><Icon name="check" size={14} /> Kaydet</Btn></>}>
          <Ipucu>Planlanan adet girilen model hesapta bu adetle kullanılır; boş bırakılan model partiye bağlı makinalardan sayılır.</Ipucu>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, marginTop: 8 }}>
            {modeller.map(m => (
              <Field key={m.model} label={m.model}>
                <Input value={plan.adetler[m.model] ?? ""} inputMode="numeric" aria-label={`${m.model} planlanan adedi`} placeholder="—"
                  onChange={e => setPlan(p => ({ ...p, adetler: { ...p.adetler, [m.model]: e.target.value } }))} />
                <HataMetni>{plan.hatalar[m.model] || ""}</HataMetni>
              </Field>
            ))}
          </div>
          {planBulunamayan.length > 0 && (
            <div data-testid="plan-bulunamayan-listesi" style={{ marginTop: 12 }}>
              <Ipucu>Modeli bulunamayan planlanan adetler (model silinmiş ya da adı değişmiş):</Ipucu>
              {planBulunamayan.map(ad => {
                const kaldirildi = plan.kaldirilan.includes(ad);
                return (
                  <div key={ad} style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4, fontSize: 13 }}>
                    <span style={{ textDecoration: kaldirildi ? "line-through" : "none" }}>{`${ad} (${parti.planlananAdetler[ad]})`}</span>
                    <Btn small variant="ghost" aria-label={`${ad} planlanan adedini ${kaldirildi ? "geri al" : "kaldır"}`}
                      onClick={() => setPlan(p => ({ ...p, kaldirilan: kaldirildi ? p.kaldirilan.filter(x => x !== ad) : [...p.kaldirilan, ad] }))}>
                      {kaldirildi ? "Geri al" : "Kaldır"}
                    </Btn>
                  </div>
                );
              })}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
};
