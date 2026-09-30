import { useState, useMemo, useRef } from "react";
import { fmtTR, parseMoney } from "../../lib/utils";
import { satirliMi, odemeHedefKalaniK, hedefOdemeleri, odemeDurumu, kurus, tl, HEDEF, DAVRANIS } from "../../lib/gider";
import { cokluOdemeDogrula, mahsupDogrula, mahsupKapsamda, avansBorcuK, secilebilirHesaplar, sonKullanilanHesap, HESAP_TUR_AD, COKLU_ODEME_MAX_SATIR } from "../../lib/kasa";
import { yontemKirilimi, hareketPaylari, hareketHedefPaylari, GOC_YONTEM_NOTU } from "../../lib/odemeYontemi";
import { Btn, Field, Input, Select, Modal, ConfirmDialog, Icon } from "../ui";
import { HataMetni, Ipucu, BolumBasligi, Segment } from "../tasarim";
import { TutarInput, tutarMetni, tl2, ODEME_SECENEKLERI, hedefAdi, eldenHedefliMi, hedefEtiketi } from "./GiderAlanlari";

// Ödeme kayıt penceresi (spec 0024 R2, R17, R18; AC-3–AC-7, AC-20, AC-28, AC-36). Listedeki ödeme anahtarı, kira
// anahtarları, Ödeme Planı satırları ve Anasayfa hatırlatıcısındaki "Ödendi" bu pencereyi açar. Ödeme bir hareket
// kaydıdır (hesapHareketleri); kalemin durumu hareketten türer. Tutar kalanla, hesap son kullanılanla dolu gelir.
// kalem: odemeleriUygula'dan geçmiş (zenginleştirilmiş) kalem. hedef: {taksitId} ya da {hedef: "ana"|"stopaj"}.
// Spec 0041: "Ödeme" kipinde birden çok satır (her satır kendi yöntemi, tutarı, hesabı ve açıklamasıyla ayrı bir hareket;
// tarih pencerenin). onKaydet bir hareket dizisi alır. Yöntem kırılımı ödemelerden türetilir (kalemin alanı yalnız
// varsayılan). "Avanstan mahsup" tek satırlık kip olarak kalır (C8). Ciro yalnız Kasa › Çek Portföyü'nden (R7).
const acikSatirlar = (k) => (k.taksitler || [])
  .map(r => ({ ...r, kalanK: Math.max(0, kurus(r.tutar) - (r._odenenK || 0)) }))
  .filter(r => r.kalanK > 0)
  .sort((a, b) => ((a.vade || "9999") < (b.vade || "9999") ? -1 : (a.vade || "9999") > (b.vade || "9999") ? 1 : (a.sira || 0) - (b.sira || 0)));
const baslangicTaksiti = (k, hedef) => {
  const acik = acikSatirlar(k);
  if (hedef?.taksitId != null && acik.some(r => String(r.id) === String(hedef.taksitId))) return hedef.taksitId;
  const h = hedef?.hedef || HEDEF.ANA;
  return (acik.find(r => (r.hedef || HEDEF.ANA) === h) || acik[0])?.id ?? null;
};
const para = (k) => tl2(tl(k));

export const OdemeKayitPenceresi = ({
  kalem, davranis, turAd, turMap, hedef = null, hareketler = [], hesaplar = [], hesapSecimi = false, odemeYetkisi = false, bugun,
  onKaydet, onSil, onClose,
  // Spec 0024 B (R10, B1, B2): personel kaleminde çalışanın açık avansı varsa "Avanstan mahsup" kipi. giderler: avans
  // borcunun hesabı için (çöpteki kalemin mahsubu sayılmaz, B5). Mahsup para hareketi değildir; hesap ve yöntem sorulmaz.
  giderler = [], yururlukAy = null,
  // Spec 0049 B (Q7): kendi çekimizle ödeme ortak "Çek Yaz" penceresinde; verilirse düğme o pencereyi bu kalemle açar.
  onKendiCek = null,
}) => {
  const satirli = satirliMi(kalem);
  const [taksitId, setTaksitId] = useState(() => (satirli ? baslangicTaksiti(kalem, hedef) : null));
  const kalanK = odemeHedefKalaniK(kalem, davranis, satirli ? taksitId : null);
  const avansK = davranis === DAVRANIS.PERSONEL && kalem.calisanId != null ? avansBorcuK(kalem.calisanId, hareketler, giderler) : 0;
  // Triyaj bulgu 2: kapsam dışı (gelecek tarihli / yürürlük öncesi) maaş kalemine mahsup kipi açılmaz.
  const mahsupVar = odemeYetkisi && avansK > 0 && kalanK > 0 && mahsupKapsamda(kalem, { bugun, yururlukAy });
  const [kip, setKip] = useState("odeme");
  const mahsupKipi = mahsupVar && kip === "mahsup";
  const uygunHesaplar = useMemo(() => secilebilirHesaplar(hesaplar, "TRY"), [hesaplar]);
  const varsayilanHesap = hesapSecimi ? (sonKullanilanHesap(hareketler, hesaplar) ?? "") : "";
  // Mahsup kipinin tek satırı ve pencerenin tarihi.
  const [form, setForm] = useState(() => ({ tarih: bugun, tutar: tutarMetni(tl(kalanK)), aciklama: "" }));
  // Spec 0041 R5: ödeme satırları. Q6: yeni satır ilk satırın taksitini, o taksidin kalanını, kalemin varsayılan
  // yöntemini ve son kullanılan hesabı alır.
  const satirNo = useRef(1);
  const yeniSatir = (taksit, tutarK) => ({ anahtar: satirNo.current++, taksitId: taksit, tutar: tutarK > 0 ? tutarMetni(tl(tutarK)) : "", yontem: kalem.odemeYontemi || "", hesapId: varsayilanHesap, aciklama: "" });
  const [satirlar, setSatirlar] = useState(() => [yeniSatir(satirli ? baslangicTaksiti(kalem, hedef) : null, kalanK)]);
  const [hatalar, setHatalar] = useState({});
  const [silinecek, setSilinecek] = useState(null);
  const set = (patch) => setForm(f => ({ ...f, ...patch }));
  const girilenK = (liste, taksit) => liste.filter(r => !satirli || String(r.taksitId) === String(taksit)).reduce((a, r) => a + Math.max(0, Math.round((parseMoney(r.tutar) || 0) * 100)), 0);
  const satirGuncelle = (i, patch) => setSatirlar(l => l.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const satirTaksitSec = (i, id) => {
    const k = Math.max(0, odemeHedefKalaniK(kalem, davranis, id) - girilenK(satirlar.filter((_, j) => j !== i), id));
    if (i === 0) setTaksitId(id);
    setSatirlar(satirlar.map((r, j) => (j === i ? { ...r, taksitId: id, tutar: k > 0 ? tutarMetni(tl(k)) : "" } : r)));
  };
  const satirEkle = () => {
    if (satirlar.length >= COKLU_ODEME_MAX_SATIR) return;
    const taksit = satirlar[0]?.taksitId ?? null;
    setSatirlar([...satirlar, yeniSatir(taksit, odemeHedefKalaniK(kalem, davranis, satirli ? taksit : null) - girilenK(satirlar, taksit))]);
  };
  const satirSil = (i) => { setSatirlar(satirlar.filter((_, j) => j !== i)); setHatalar({}); };
  const taksitSec = (id) => {
    setTaksitId(id);
    const k = odemeHedefKalaniK(kalem, davranis, id);
    set({ tutar: tutarMetni(tl(Math.min(k, avansK))) });
  };
  const odemeler = hedefOdemeleri(hareketler, kalem.id);
  // R11: göçten gelen tutarsız hareketin gösterilen tutarı, motorun hesapladığı kapattığı tutardır.
  const paylar = useMemo(() => new Map(hareketPaylari(kalem, hareketler, turMap).map(p => [String(p.hareket.id), p.payK])), [kalem, hareketler, turMap]);
  // Spec 0051 R10 (Q2): satırsız kalemde ödemenin (ve mahsubun) kapattığı hedef; birden çok hedefli kalemde yazılır.
  const hedefPaylari = useMemo(() => hareketHedefPaylari(kalem, hareketler, turMap), [kalem, hareketler, turMap]);
  const kirilim = useMemo(() => yontemKirilimi(kalem, hareketler, turMap), [kalem, hareketler, turMap]);
  const satirAdi = (id) => {
    const r = (kalem.taksitler || []).find(x => String(x.id) === String(id));
    if (!r) return null;
    const n = kalem.taksitler.filter(x => (x.hedef || HEDEF.ANA) === (r.hedef || HEDEF.ANA)).length;
    return `${hedefAdi(r.hedef || HEDEF.ANA, davranis, eldenHedefliMi(kalem.taksitler))}${n > 1 ? ` ${r.sira}/${n}. taksit` : ""}`;
  };
  const hesapAdi = (id) => {
    const h = hesaplar.find(x => String(x.id) === String(id));
    return h ? `${h.ad} (${HESAP_TUR_AD[h.tur] || h.tur})` : "Hesap belirtilmedi";
  };
  const kipSec = (k) => {
    setKip(k); setHatalar({});
    if (k === "mahsup") { setTaksitId(satirlar[0]?.taksitId ?? taksitId); set({ tutar: tutarMetni(tl(Math.min(kalanK, avansK))) }); }
  };
  const kaydet = () => {
    if (mahsupKipi) {
      const r = mahsupDogrula({ ...form, taksitId }, { kalem, turMap, hareketler, giderler, bugun, yururlukAy });
      if (!r.kayit) { setHatalar(r.hatalar); return; }
      onKaydet([r.kayit]);
      return;
    }
    // R13: ya hep ya hiç; hatalar satır satır.
    const r = cokluOdemeDogrula({ tarih: form.tarih, satirlar }, { kalem, turMap, hesaplar, hedefAdi: (id) => satirAdi(id) || "Kalem" });
    if (!r.kayitlar) { setHatalar(r.hatalar); return; }
    onKaydet(r.kayitlar);
  };
  const durum = odemeDurumu(kalem);
  const acik = satirli ? acikSatirlar(kalem) : [];
  const formVar = odemeYetkisi && kalanK > 0;

  return (
    <Modal title="Ödeme Kaydet" onClose={onClose} wide
      footer={<div style={{ display: "flex", gap: 8 }}>
        <Btn variant="ghost" onClick={onClose}>{formVar ? "Vazgeç" : "Kapat"}</Btn>
        {formVar && <Btn onClick={kaydet}><Icon name="check" size={14} /> {mahsupKipi ? "Mahsubu Kaydet" : "Ödemeyi Kaydet"}</Btn>}
      </div>}>
      <div data-testid="odeme-kayit-penceresi">
        <div style={{ fontSize: 13, color: "var(--n600, #475569)", marginBottom: 12 }}>
          <b style={{ color: "var(--n900, #0f172a)" }}>{turAd}</b> · {fmtTR(kalem.tarih)}{kalem.aciklama || kalem.calisanAd ? ` · ${kalem.aciklama || kalem.calisanAd}` : ""}
          <div style={{ marginTop: 4 }} data-testid="odeme-kayit-ozet">
            Durum: <b>{durum === "odendi" ? "Ödendi" : durum === "kismen" ? "Kısmen ödendi" : "Ödenmedi"}</b>
            {formVar && <> · Bu hedefin kalanı: <b>{para(kalanK)}</b></>}
          </div>
          {avansK > 0 && <div style={{ marginTop: 4 }} data-testid="acik-avans">{kalem.calisanAd || "Çalışan"} açık avansı: <b>{para(avansK)}</b></div>}
        </div>
        {mahsupVar && (
          <div style={{ marginBottom: 12, maxWidth: 360 }}>
            <Segment ariaLabel="Kayıt türü" kip="dugme" options={[{ value: "odeme", label: "Ödeme" }, { value: "mahsup", label: "Avanstan mahsup" }]} value={kip} onChange={kipSec} />
          </div>
        )}
        {formVar && mahsupKipi ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
            {satirli && (
              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Taksit">
                  <Select value={taksitId ?? ""} onChange={e => taksitSec(e.target.value === "" ? null : acik.find(r => String(r.id) === e.target.value)?.id ?? null)}>
                    {acik.map(r => <option key={r.id} value={r.id}>{satirAdi(r.id)} · vade {r.vade ? fmtTR(r.vade) : "girilmemiş"} · kalan {para(r.kalanK)}</option>)}
                  </Select>
                </Field>
                {hatalar.hedef && <HataMetni>{hatalar.hedef}</HataMetni>}
              </div>
            )}
            {!satirli && hatalar.hedef && <div style={{ gridColumn: "1 / -1" }}><HataMetni>{hatalar.hedef}</HataMetni></div>}
            <div>
              <Field label="Mahsup tarihi"><Input type="date" value={form.tarih || ""} onChange={e => set({ tarih: e.target.value })} /></Field>
              {hatalar.tarih && <HataMetni>{hatalar.tarih}</HataMetni>}
            </div>
            <div>
              <Field label="Tutar"><TutarInput ariaLabel="Ödeme tutarı" value={form.tutar} onChange={v => set({ tutar: v })} invalid={!!hatalar.tutar} /></Field>
              {hatalar.tutar ? <HataMetni>{hatalar.tutar}</HataMetni> : <Ipucu>Kalan ile açık avansın küçüğünü aşamaz. Mahsup para hareketi değildir, hiçbir hesaba girmez.</Ipucu>}
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <Field label="Açıklama"><Input value={form.aciklama} onChange={e => set({ aciklama: e.target.value })} placeholder="İsteğe bağlı" /></Field>
            </div>
          </div>
        ) : formVar ? (
          <div data-testid="odeme-satirlari">
            <div style={{ maxWidth: 220 }}>
              <Field label="Ödeme tarihi"><Input type="date" value={form.tarih || ""} onChange={e => set({ tarih: e.target.value })} /></Field>
              {hatalar.tarih && <HataMetni>{hatalar.tarih}</HataMetni>}
            </div>
            {satirlar.map((r, i) => {
              const h = hatalar.satirlar?.[i] || {};
              const ek = i === 0 ? "" : ` ${i + 1}`;
              const cok = satirlar.length > 1;
              return (
                <div key={r.anahtar} data-testid="odeme-satiri" style={cok ? { border: "1px solid var(--n200, #e2e8f0)", borderRadius: 10, padding: "10px 12px", marginTop: 10 } : { marginTop: 4 }}>
                  {cok && (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--n600, #475569)" }}>{i + 1}. satır</span>
                      <Btn small variant="ghost" onClick={() => satirSil(i)} title="Satırı kaldır"><Icon name="close" size={12} /> Kaldır</Btn>
                    </div>
                  )}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
                    {satirli && (
                      <div style={{ gridColumn: "1 / -1" }}>
                        <Field label="Taksit">
                          <Select aria-label={`Taksit${ek}`} value={r.taksitId ?? ""} onChange={e => satirTaksitSec(i, e.target.value === "" ? null : acik.find(x => String(x.id) === e.target.value)?.id ?? null)}>
                            {acik.map(x => <option key={x.id} value={x.id}>{satirAdi(x.id)} · vade {x.vade ? fmtTR(x.vade) : "girilmemiş"} · kalan {para(x.kalanK)}</option>)}
                          </Select>
                        </Field>
                        {h.hedef && <HataMetni>{h.hedef}</HataMetni>}
                      </div>
                    )}
                    {!satirli && h.hedef && <div style={{ gridColumn: "1 / -1" }}><HataMetni>{h.hedef}</HataMetni></div>}
                    <div>
                      <Field label="Tutar"><TutarInput ariaLabel={`Ödeme tutarı${ek}`} value={r.tutar} onChange={v => satirGuncelle(i, { tutar: v })} invalid={!!h.tutar} /></Field>
                      {h.tutar ? <HataMetni>{h.tutar}</HataMetni> : (!cok && <Ipucu>Kalandan az girilirse kalem kısmen ödenmiş olur.</Ipucu>)}
                    </div>
                    <div>
                      <Field label="Ödeme yöntemi">
                        <Select aria-label={`Ödeme yöntemi${ek}`} value={r.yontem} onChange={e => satirGuncelle(i, { yontem: e.target.value })}>
                          {ODEME_SECENEKLERI.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </Select>
                      </Field>
                      {/* Spec 0040 R19: "Çek (ciro)" listede yok; düz "Çek" takip edilmeyen serbest bir nottur. */}
                      {h.yontem ? <HataMetni>{h.yontem}</HataMetni>
                        : r.yontem === "Çek" ? <Ipucu>Düz “Çek” takip edilmeyen bir nottur. Müşteri çekiyle ödemek için Kasa › Çek Portföyü'nden ciro edin.</Ipucu> : null}
                    </div>
                    {hesapSecimi && (
                      <div>
                        <Field label="Hesap">
                          <Select aria-label={`Hesap${ek}`} value={r.hesapId ?? ""} onChange={e => satirGuncelle(i, { hesapId: e.target.value === "" ? "" : uygunHesaplar.find(x => String(x.id) === e.target.value)?.id ?? "" })}>
                            <option value="">Hesap belirtilmedi</option>
                            {uygunHesaplar.map(x => <option key={x.id} value={x.id}>{x.ad} ({HESAP_TUR_AD[x.tur] || x.tur})</option>)}
                          </Select>
                        </Field>
                        {h.hesapId ? <HataMetni>{h.hesapId}</HataMetni>
                          : !uygunHesaplar.length ? <Ipucu>Açık TL hesabı yok. Ödeme hesapsız kaydedilir ve hiçbir bakiyeye girmez.</Ipucu>
                          : !r.hesapId ? <Ipucu>Hesap seçilmezse ödeme hiçbir bakiyeye girmez.</Ipucu> : null}
                      </div>
                    )}
                    <div style={{ gridColumn: "1 / -1" }}>
                      <Field label="Açıklama"><Input aria-label={`Açıklama${ek}`} value={r.aciklama} onChange={e => satirGuncelle(i, { aciklama: e.target.value })} placeholder="İsteğe bağlı" /></Field>
                    </div>
                  </div>
                </div>
              );
            })}
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
              <Btn small variant="ghost" onClick={satirEkle} disabled={satirlar.length >= COKLU_ODEME_MAX_SATIR}><Icon name="plus" size={12} /> Başka yöntemle satır ekle</Btn>
              <span style={{ fontSize: 12, color: "var(--n500, #64748b)" }}>
                {satirlar.length >= COKLU_ODEME_MAX_SATIR ? `En çok ${COKLU_ODEME_MAX_SATIR} satır; fazlası için ayrı ödeme girin.` : "Her satır ayrı bir ödeme olarak kaydedilir."}
              </span>
            </div>
            {hatalar.genel && <HataMetni>{hatalar.genel}</HataMetni>}
            {(hatalar.hedefler || []).map((m, i) => <HataMetni key={i}>{m}</HataMetni>)}
            <Ipucu>Kalemi bir müşteri çekiyle kapatmak için Kasa › Çek Portföyü'nden çeki ciro edin.</Ipucu>
            {onKendiCek && <div style={{ marginTop: 6 }}><Btn small variant="ghost" onClick={() => onKendiCek(kalem)}><Icon name="plus" size={12} /> Kendi çekiyle öde</Btn></div>}
          </div>
        ) : (
          <Ipucu>{!odemeYetkisi ? "Ödeme kaydetme yetkiniz yok." : "Bu kalemin ödenecek kalanı yok."}</Ipucu>
        )}

        <BolumBasligi ust={16}>Kayıtlı ödemeler</BolumBasligi>
        {kirilim.karar !== "yok" && (
          <div data-testid="odeme-yontem-kirilimi" style={{ fontSize: 13, marginBottom: 8 }}>
            Nasıl ödendi: <b>{kirilim.etiket}</b>
            {kirilim.karar === "karma" && <span style={{ color: "var(--n600, #475569)" }}> · {kirilim.satirlar.map(x => `${x.yontem} ${para(x.tutarK)}`).join(" · ")}</span>}
            {kirilim.gocVar && <div data-testid="goc-yontem-notu" style={{ fontSize: 11.5, color: "var(--n500, #64748b)", marginTop: 2 }}>{GOC_YONTEM_NOTU}</div>}
          </div>
        )}
        {odemeler.length === 0
          ? <div data-testid="odeme-kayit-bos" style={{ fontSize: 13, color: "var(--n500, #64748b)" }}>Bu kalem için kayıtlı ödeme yok.</div>
          : (
            <div data-testid="odeme-kayit-listesi">
              {odemeler.map(h => (
                <div key={h.id} data-testid="odeme-kaydi" style={{ display: "grid", gridTemplateColumns: "90px minmax(0, 1fr) 120px 40px", gap: 10, alignItems: "center", fontSize: 13, padding: "6px 0", borderTop: "1px solid var(--n150, #f1f5f9)" }}>
                  <span>{fmtTR(h.tarih)}</span>
                  <span style={{ minWidth: 0 }}>
                    {h.tur === "mahsup" ? "Avanstan mahsup · " : ""}{satirAdi(h.taksitId) || hedefEtiketi(kalem, davranis, hedefPaylari.get(String(h.id))) || "Kalem"}
                    {/* Spec 0040 Q9: ciro hareketi tek tek silinmez; iptal bütün ciro için portföyden. */}
                    {h.cekId != null && <span data-testid="ciro-hareketi" style={{ marginLeft: 6, fontSize: 11, color: "var(--n600, #475569)" }}>· ciro iptali Kasa › Çek Portföyü'nden</span>}
                    <div style={{ fontSize: 11.5, color: "var(--n500, #64748b)" }}>
                      {[h.yontem || null, h.tur === "mahsup" ? null : hesapAdi(h.hesapId), h.kaynak === "goc" ? "Eski kayıttan aktarıldı" : null, h.aciklama || null].filter(Boolean).join(" · ")}
                    </div>
                  </span>
                  <b style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{h.tamKapatir ? (paylar.has(String(h.id)) ? para(paylar.get(String(h.id))) : "Tamamı") : tl2(h.tutar)}</b>
                  <span style={{ textAlign: "right" }}>{odemeYetkisi && onSil && h.cekId == null && <Btn small variant="danger" onClick={() => setSilinecek(h)} title={h.tur === "mahsup" ? "Mahsubu sil" : "Ödemeyi sil"}><Icon name="trash" size={12} /></Btn>}</span>
                </div>
              ))}
            </div>
          )}
      </div>
      {silinecek && (
        <ConfirmDialog title="Ödeme silinsin mi?" message={`${fmtTR(silinecek.tarih)} tarihli ${silinecek.tamKapatir ? "ödeme" : `${tl2(silinecek.tutar)} ödeme`} silinecek; kalemin durumu geri döner.`}
          confirmLabel="Ödemeyi Sil" onConfirm={() => { onSil(silinecek); setSilinecek(null); }} onCancel={() => setSilinecek(null)} />
      )}
    </Modal>
  );
};
