import { useMemo, useState } from "react";
import { Btn, Field, Input, Modal, Select, Icon } from "../ui";
import { KartBolum, BosDurum, HataMetni, Ipucu, UyariSeridi } from "../tasarim";
import { kilitRedMesaji } from "../../lib/kilitAlanlari";
import { kurusMetni, partiHesabi, partisizMakinaSayisi, planAdediDogrula, planAdetleriYaz, modelSayilari, ayAraligiMetni, PAY_KAYNAK_METNI, TARIHSIZ_SATIR_NEDENI } from "../../lib/makinaStandartMaliyet";
import { URETIM_DEGIL_IBARESI } from "../../lib/uretimdekiModeller";

// Spec 0088 R17–R22: seçilen partinin model-adet tablosu (partiye bağlı makinalardan ya da planlanan adetten), özet
// (standart maliyet, önerilen ciro, gerçekleşen satış, iki kâr) ve gerçekleşen tedarik karşılaştırması.
// Spec 0097 ile (0088 R28 ters çevrildi): türetilen satırların payı partinin kendi aylarından (`partiSonucu`, Üretim Partileri'yle
// aynı); planlanan satırınki açık partide hesap ayarlarından, kapanmışta partinin makina başı payından (R17). Aynı modelin farklı
// maliyetle hesaplanan makinaları ayrı satırda, ay aralığıyla (R12); satır kimliği motorun `anahtar`'ı (R12/4).
export const KAR_KUMELERI_NOTU = "Öneriye göre kâr partinin bütün adedinden hesaplanır (önerilen ciro − toplam standart maliyet); gerçeğe göre kâr yalnız satılmış makinalardan (gerçekleşen satış − o makinaların standart maliyeti). Bedelsiz ve kuru olmayan satışlar ikisine de girmez.";
export const TEDARIK_FARK_CUMLESI = "Fark bir hata değildir: dönemde \"Ürün ağacından gelir\" rolündeki türlere girilen gider ile partinin ürün ağacından hesaplanan direkt maliyeti arasındaki farktır.";
export const TEDARIK_TABAN_CUMLESI = "Taban farkı: standart direkt maliyet KDV hariç matrahtır, gerçekleşen tutar indirilemeyen KDV'yi de içerir; farkın sıfır olmaması normaldir.";
const donemCumlesi = (n) => `Dönem farkı: parti başlamadan önce alınmış tedarik kapsam dışıdır${n > 0 ? `; bu dönemin ayları ${n} partiyle daha paylaşılıyor ve tedarik partilere bölünmez` : ""}.`;
// Spec 0097 R19/2 (AC-53; 0090 R34 ve AC-38/5 bu spec'le ters çevrildi): sütun partinin kendi aylarından gelir ve Üretim
// Partileri'ndeki makina başı payla aynıdır; artık kuruş ilk üretilen makinada durduğu için satır toplamı birim × adetten farklı
// olabilir (R16/3). Sabitin adı ve testId'si korunur.
export const PAY_AYRIM_IBARESI = "Partinin kendi aylarının genel gideri; Üretim Partileri'ndeki makina başı payla aynıdır. Artık kuruş ilk üretilen makinadadır, satırın toplamı birim × adetten farklı olabilir.";
// Spec 0093 R11, R11/2: planlanan adetler penceresinin metinleri (testler buradan okur). Pencerenin ızgarası yalnız üretimdeki
// modelleri çizer (R1); işaret satırın kendi `uretimde` alanından okunur, uygulama ayarına bakılmaz (C4, C7).
export const PLAN_SUZGEC_CUMLESI = "Liste yalnız Ayarlar › Katalog › Makina Modelleri'nde \"Üretimde\" işaretli modelleri gösterir.";
export const planGizliEki = (n) => `Üretimde olmayan ${n} model listede yok.`;
export const PLAN_GERI_KOYMA_CUMLESI = "Üretimden kalkmış bir modele adet girmek gerekiyorsa işaret Ayarlar'da geri konur.";
export const PLAN_GIZLI_BASLIK = "Üretimde olmayan ama planlanan adedi girilmiş modeller:";
export const PLAN_GIZLI_KALDIRMA = "Kaldırmak için alanı boşaltın.";
export const PLAN_BOS_MODEL = { baslik: "Tanımlı makina modeli yok", metin: "Modeller Ayarlar › Katalog › Makina Modelleri'nde tanımlanır." };
export const PLAN_BOS_URETIMDE = { baslik: "Üretimde işaretli model yok", metin: (n) => `${n} model üretimde değil olarak işaretli. İşaret Ayarlar › Katalog › Makina Modelleri'nde değiştirilir.` };
const th = { padding: "8px 12px", fontSize: 11, fontWeight: 700, color: "var(--n600, #475569)", textAlign: "right", whiteSpace: "nowrap" };
const td = { padding: "9px 12px", fontSize: 13, textAlign: "right", whiteSpace: "nowrap" };
const Rakam = ({ etiket, deger, alt, testId }) => (
  <div data-testid={testId} style={{ minWidth: 150 }}>
    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--n500, #64748b)", textTransform: "uppercase", letterSpacing: 0.3 }}>{etiket}</div>
    <div style={{ fontSize: 18, fontWeight: 800, marginTop: 2 }}>{deger}</div>
    {alt && <div style={{ fontSize: 12, color: "var(--n500, #64748b)", marginTop: 2 }}>{alt}</div>}
  </div>
);

export const PartiHesabi = ({ pay, modeller, canDo, baskasiKilitli, showToast, veri, katalog = null, partiSonucu = null, rates, bugun, uretimPartileri = [], setUretimPartileri, stock = [], customers = [] }) => {
  const canli = uretimPartileri.filter(p => !p.deletedAt);
  const [secili, setSecili] = useState(() => canli[0]?.id ?? null);
  const [plan, setPlan] = useState(null); // { adetler: {model: ham}, hatalar, kaldirilan: [ad] }
  const parti = canli.find(p => String(p.id) === String(secili)) || canli[0] || null;
  const partiPay = parti ? (partiSonucu?.partiler || []).find(x => String(x.id) === String(parti.id)) || null : null;
  const hesap = useMemo(() => (parti ? partiHesabi(parti, veri, { payK: pay.payK, modeller, rates, bugun, katalog, partiPay }) : null), [parti, veri, pay.payK, modeller, rates, bugun, katalog, partiPay]);
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
  // Spec 0093 R1/2: süzme yalnız çizim anında; `modeller` tam kalır (motor, planAc, planBulunamayan, planKaydet tam listeyle).
  const cizilen = modeller.filter(m => m.uretimde !== false); // R1/3: alanı olmayan satır üretimde sayılır
  // R3, R3/3, R3/4: kayıtlı (saklı) adedi olan gizli modeller, katalog sırasıyla. Ölçüt saklı değerdir ki alan boşaltılınca satır
  // kaybolmasın; kaldırma kayıtta olur (alan boş = sil, R3/2). Satır `kaldirilan`'a girmez (X8).
  const gizliKayitli = modeller.filter(m => m.uretimde === false && parti.planlananAdetler?.[m.model]);
  const say = modelSayilari(modeller); // R7/3: sayı motordan
  const adetAlani = (m, ad) => (
    <Input value={plan.adetler[m.model] ?? ""} inputMode="numeric" aria-label={ad} placeholder="—"
      onChange={e => setPlan(p => ({ ...p, adetler: { ...p.adetler, [m.model]: e.target.value } }))} />
  );

  return (
    <div>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 12 }}>
        <Field label="Üretim partisi">
          <Select aria-label="Üretim partisi" value={String(parti.id)} onChange={e => setSecili(e.target.value)}>
            {canli.map(p => <option key={p.id} value={String(p.id)}>{p.ad}</option>)}
          </Select>
        </Field>
        {/* Kullanıcı isteği 2026-10-18: düğme seçiciyle aynı hizada; Field'ın alt boşluğu (14 px) düğmeye de verilir. */}
        {yetki && <div style={{ marginBottom: 14 }}><Btn variant="ghost" onClick={planAc}><Icon name="edit" size={14} /> Planlanan adetler</Btn></div>}
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
      {/* Spec 0097 R18, R18/2: payı yazılmayan satır varsa nedeni tablonun üstünde tek satır (triyaj bulgu 2: ölçüt "pay yazılmayan
          satır var", yalnız planlanan satırlı kapanmış partide de çizilir; açık partide planlanan satır payını alır, R17/2). */}
      {hesap.payDurumu && hesap.satirlar.some(r => r.payK == null) && (
        <Ipucu><span data-testid="parti-pay-neden">{`Genel gider payı yazılmayan satırlar var: ${hesap.payDurumu.neden}`}</span></Ipucu>
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
                  <tr key={r.anahtar} data-testid={`parti-satiri-${r.anahtar}`} style={{ borderTop: "1px solid var(--n150, #f1f5f9)" }}>
                    <td style={{ ...td, textAlign: "left", fontWeight: 700 }}>{r.model}{r.eksikSayisi > 0 && <span style={{ marginLeft: 6, fontSize: 11, color: "var(--warnTx, #854d0e)" }}>eksik</span>}
                      {r.ayAraligi && <div data-testid="parti-satir-araligi" style={{ fontSize: 11, fontWeight: 400, color: "var(--n500, #64748b)" }}>{ayAraligiMetni(r.ayAraligi)}</div>}
                      {r.tarihsiz && <div data-testid="parti-satir-neden" style={{ fontSize: 11, fontWeight: 400, color: "var(--warnTx, #854d0e)", whiteSpace: "normal", maxWidth: 220 }}>{TARIHSIZ_SATIR_NEDENI}</div>}
                    </td>
                    <td style={td}>{r.adet}{r.planlanan && <span data-testid="planlanan" style={{ marginLeft: 6, fontSize: 11, color: "var(--n500, #64748b)" }}>planlanan</span>}</td>
                    <td style={td}>{kurusMetni(r.direktK)}</td><td style={td}>{kurusMetni(r.payK)}{r.planlanan && <div data-testid="pay-kaynagi" style={{ fontSize: 11, color: "var(--n500, #64748b)" }}>{r.payNeden || PAY_KAYNAK_METNI[r.payKaynak]}</div>}</td><td style={td}>{kurusMetni(r.toplamK)}</td>
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
          {/* Spec 0093 R4/2, R4/3: süzgeç satırı alan anlamı ipucusunun hemen altında; sayı eki yalnız gizli model varken. */}
          <div data-testid="plan-suzgec-ibaresi">
            <Ipucu>{PLAN_SUZGEC_CUMLESI}{say.uretimdeDisi > 0 ? ` ${planGizliEki(say.uretimdeDisi)}` : ""} {PLAN_GERI_KOYMA_CUMLESI}</Ipucu>
          </div>
          {/* R7/2, R7/4: iki boş durum yalnız ızgaranın yerine geçer. */}
          {modeller.length === 0 ? <BosDurum testId="bos-plan-model" baslik={PLAN_BOS_MODEL.baslik} metin={PLAN_BOS_MODEL.metin} />
          : cizilen.length === 0 ? <BosDurum testId="bos-plan-uretimde" baslik={PLAN_BOS_URETIMDE.baslik} metin={PLAN_BOS_URETIMDE.metin(say.uretimdeDisi)} /> : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, marginTop: 8 }}>
              {cizilen.map(m => (
                <Field key={m.model} label={m.model}>
                  {adetAlani(m, `${m.model} planlanan adedi`)}
                  <HataMetni>{plan.hatalar[m.model] || ""}</HataMetni>
                </Field>
              ))}
            </div>
          )}
          {gizliKayitli.length > 0 && (
            <div data-testid="plan-gizli-listesi" style={{ marginTop: 12 }}>
              <Ipucu>{PLAN_GIZLI_BASLIK}</Ipucu>
              <Ipucu>{PLAN_GIZLI_KALDIRMA}</Ipucu>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, marginTop: 4 }}>
                {gizliKayitli.map(m => (
                  <Field key={m.model} label={<>{m.model} <span style={{ fontWeight: 400, color: "var(--n500, #64748b)" }}>· {URETIM_DEGIL_IBARESI}</span></>}>
                    {adetAlani(m, `${m.model} planlanan adedi (${URETIM_DEGIL_IBARESI})`)}
                    <HataMetni>{plan.hatalar[m.model] || ""}</HataMetni>
                  </Field>
                ))}
              </div>
            </div>
          )}
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
