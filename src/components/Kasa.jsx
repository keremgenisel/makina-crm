import { useState, useMemo } from "react";
import { uid, fmtTR, fmtCur, today } from "../lib/utils";
import { makeCanDo } from "../lib/permissions";
import { logAction, snapshotOnceki } from "../lib/audit";
import { tl } from "../lib/gider";
import { HESAP_TURLERI, HESAP_TUR_AD, HESAPSIZ_NOTU, hesapDogrula, hesapBakiyeleri, hesapsizOdemeler, hesapKullanimi, virmanDogrula, secilebilirHesaplar } from "../lib/kasa";
import { Icon, Btn, Field, Input, Select, Modal, ConfirmDialog } from "./ui";
import { KartBolum, BosDurum, UyariSeridi, HataMetni, Ipucu, Segment } from "./tasarim";
import { TutarInput, tutarMetni } from "./gider/GiderAlanlari";

// Kasa üst sekmesi (spec 0024 A; R1, R7, R8, R15, R16; C1, C5, C6). Hesaplar (kasa, banka, kredi kartı), yürüyen
// bakiyeli hareket listesi ve virman. Bakiye saklanmaz, hareketlerden türer (lib/kasa.js). Yalnız gider yetkisi +
// Finans sekmesi olan kullanıcıya görünür (App: kasaYetki). Hesap işlemleri `kasa_hesap`, virman `virman` ister.
const PARA_BIRIMLERI = [{ value: "TRY", label: "TL" }, { value: "USD", label: "USD" }, { value: "EUR", label: "EUR" }];
const SEMBOL = { TRY: "₺", USD: "$", EUR: "€" };
const para = (n, pb) => fmtCur(n, pb || "TRY");
const bosHesap = () => ({ id: null, ad: "", tur: "banka", paraBirimi: "TRY", acilisBakiyesi: "", acilisTarihi: today(), kapali: false });

const HesapFormu = ({ hesap, hesaplar, hareketVar, onKaydet, onClose }) => {
  const [form, setForm] = useState(() => (hesap
    ? { ...hesap, acilisBakiyesi: tutarMetni(hesap.tur === "kart" ? Math.abs(Number(hesap.acilisBakiyesi) || 0) : hesap.acilisBakiyesi) }
    : bosHesap()));
  const [hatalar, setHatalar] = useState({});
  const set = (patch) => setForm(f => ({ ...f, ...patch }));
  const kaydet = () => {
    const r = hesapDogrula(form, hesaplar, { hareketVar });
    if (!r.kayit) { setHatalar(r.hatalar); return; }
    onKaydet(r.kayit);
  };
  const kart = form.tur === "kart";
  return (
    <Modal title={form.id == null ? "Yeni Hesap" : "Hesabı Düzenle"} onClose={onClose} maxWidth={560}
      footer={<div style={{ display: "flex", gap: 8 }}><Btn variant="ghost" onClick={onClose}>İptal</Btn><Btn onClick={kaydet}><Icon name="check" size={14} /> Kaydet</Btn></div>}>
      <div data-testid="hesap-formu" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
        <div style={{ gridColumn: "1 / -1" }}>
          <Field label="Hesap adı *"><Input value={form.ad} onChange={e => set({ ad: e.target.value })} placeholder="Örn. Merkez Kasa, Ziraat Bankası" /></Field>
          <HataMetni>{hatalar.ad}</HataMetni>
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <Field label="Hesap türü">
            <Segment ariaLabel="Hesap türü" kip="dugme" options={HESAP_TURLERI} value={form.tur} onChange={v => set({ tur: v })} />
          </Field>
          <HataMetni>{hatalar.tur}</HataMetni>
        </div>
        <div>
          <Field label="Para birimi">
            <Select value={form.paraBirimi} disabled={hareketVar} onChange={e => set({ paraBirimi: e.target.value })}>
              {PARA_BIRIMLERI.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </Select>
          </Field>
          {hatalar.paraBirimi ? <HataMetni>{hatalar.paraBirimi}</HataMetni> : hareketVar ? <Ipucu>Hareketi olan hesabın para birimi değiştirilemez.</Ipucu> : null}
        </div>
        <div>
          <Field label={kart ? "Açılış borcu" : "Açılış bakiyesi"}>
            <TutarInput ariaLabel={kart ? "Açılış borcu" : "Açılış bakiyesi"} value={form.acilisBakiyesi} onChange={v => set({ acilisBakiyesi: v })} sym={SEMBOL[form.paraBirimi] || "₺"} />
          </Field>
          <Ipucu>{kart ? "Kredi kartında açılış tutarı borç olarak girilir." : "Hesabın takibe başladığı günkü bakiyesi."}</Ipucu>
        </div>
        <div>
          <Field label="Açılış tarihi"><Input type="date" value={form.acilisTarihi || ""} onChange={e => set({ acilisTarihi: e.target.value })} /></Field>
        </div>
      </div>
    </Modal>
  );
};

const VirmanFormu = ({ hesaplar, onKaydet, onClose }) => {
  const acik = hesaplar.filter(h => !h.kapali);
  const [form, setForm] = useState({ hesapId: acik[0]?.id ?? "", karsiHesapId: "", tarih: today(), tutar: "", aciklama: "" });
  const [hatalar, setHatalar] = useState({});
  const set = (patch) => setForm(f => ({ ...f, ...patch }));
  const cikan = acik.find(h => String(h.id) === String(form.hesapId));
  const girenler = cikan ? secilebilirHesaplar(acik, cikan.paraBirimi).filter(h => String(h.id) !== String(cikan.id)) : [];
  const idBul = (v) => acik.find(h => String(h.id) === v)?.id ?? "";
  const kaydet = () => {
    const r = virmanDogrula(form, hesaplar);
    if (!r.kayit) { setHatalar(r.hatalar); return; }
    onKaydet(r.kayit);
  };
  return (
    <Modal title="Virman" onClose={onClose} maxWidth={560}
      footer={<div style={{ display: "flex", gap: 8 }}><Btn variant="ghost" onClick={onClose}>İptal</Btn><Btn onClick={kaydet}><Icon name="check" size={14} /> Virmanı Kaydet</Btn></div>}>
      <div data-testid="virman-formu" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
        <div>
          <Field label="Çıkan hesap">
            <Select value={form.hesapId} onChange={e => set({ hesapId: idBul(e.target.value), karsiHesapId: "" })}>
              {acik.map(h => <option key={h.id} value={h.id}>{h.ad} ({h.paraBirimi})</option>)}
            </Select>
          </Field>
          <HataMetni>{hatalar.hesapId}</HataMetni>
        </div>
        <div>
          <Field label="Giren hesap">
            <Select value={form.karsiHesapId} onChange={e => set({ karsiHesapId: idBul(e.target.value) })}>
              <option value="">Hesap seçin</option>
              {girenler.map(h => <option key={h.id} value={h.id}>{h.ad} ({h.paraBirimi})</option>)}
            </Select>
          </Field>
          {hatalar.karsiHesapId ? <HataMetni>{hatalar.karsiHesapId}</HataMetni> : cikan && !girenler.length ? <Ipucu>Aynı para biriminde başka açık hesap yok.</Ipucu> : <Ipucu>Yalnız aynı para birimindeki hesaplar arasında.</Ipucu>}
        </div>
        <div>
          <Field label="Tarih"><Input type="date" value={form.tarih} onChange={e => set({ tarih: e.target.value })} /></Field>
          <HataMetni>{hatalar.tarih}</HataMetni>
        </div>
        <div>
          <Field label="Tutar"><TutarInput ariaLabel="Virman tutarı" value={form.tutar} onChange={v => set({ tutar: v })} invalid={!!hatalar.tutar} sym={SEMBOL[cikan?.paraBirimi] || "₺"} /></Field>
          <HataMetni>{hatalar.tutar}</HataMetni>
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <Field label="Açıklama"><Input value={form.aciklama} onChange={e => set({ aciklama: e.target.value })} placeholder="İsteğe bağlı" /></Field>
          <Ipucu>Virman gider ya da gelir değildir; yalnız iki hesabın bakiyesini değiştirir.</Ipucu>
        </div>
      </div>
    </Modal>
  );
};

export const Kasa = ({
  kasaHesaplari = [], setKasaHesaplari, hesapHareketleri = [], setHesapHareketleri, payments = [], customers = [],
  giderler = [], giderTurleri = [], tedarikciler = [], serverPermissions = null, showToast = () => {},
}) => {
  const canDo = makeCanDo(serverPermissions, "giderActions");
  const [secili, setSecili] = useState(null);
  const [hesapFormu, setHesapFormu] = useState(null); // null | {hesap}
  const [virmanAcik, setVirmanAcik] = useState(false);
  const [silinecek, setSilinecek] = useState(null);
  const bakiyeler = useMemo(() => hesapBakiyeleri(kasaHesaplari, hesapHareketleri, payments), [kasaHesaplari, hesapHareketleri, payments]);
  const hesapsiz = useMemo(() => hesapsizOdemeler(hesapHareketleri), [hesapHareketleri]);
  const siraliHesaplar = useMemo(() => [...kasaHesaplari].sort((a, b) => (a.kapali ? 1 : 0) - (b.kapali ? 1 : 0) || String(a.ad).localeCompare(String(b.ad), "tr")), [kasaHesaplari]);
  const seciliHesap = kasaHesaplari.find(h => String(h.id) === String(secili)) || siraliHesaplar[0] || null;
  const seciliBakiye = seciliHesap ? bakiyeler.get(String(seciliHesap.id)) : null;
  const giderById = useMemo(() => new Map(giderler.map(k => [String(k.id), k])), [giderler]);
  const turById = useMemo(() => new Map(giderTurleri.map(t => [String(t.id), t])), [giderTurleri]);
  const tedById = useMemo(() => new Map(tedarikciler.map(t => [String(t.id), t])), [tedarikciler]);
  const musteriById = useMemo(() => new Map(customers.map(c => [String(c.id), c])), [customers]);
  const hesapById = useMemo(() => new Map(kasaHesaplari.map(h => [String(h.id), h])), [kasaHesaplari]);

  const satirAciklamasi = (s) => {
    if (s.tur === "tahsilat") {
      const c = musteriById.get(String(s.tahsilat.customerId));
      return { tur: "Tahsilat", metin: [c?.name || "Silinmiş müşteri", s.tahsilat.yontem].filter(Boolean).join(" · ") };
    }
    const m = s.hareket;
    if (s.tur === "virman") {
      const karsi = hesapById.get(String(s.girenK > 0 ? m.hesapId : m.karsiHesapId));
      return { tur: "Virman", metin: [`${s.girenK > 0 ? "Gelen" : "Giden"}: ${karsi?.ad || "Silinmiş hesap"}`, m.aciklama].filter(Boolean).join(" · ") };
    }
    const k = giderById.get(String(m.giderId));
    const taraf = k ? (k.calisanAd || tedById.get(String(k.tedarikciId))?.ad || turById.get(String(k.turId))?.ad || "Gider") : "Silinmiş gider";
    return { tur: "Gider ödemesi", metin: [taraf, k?.aciklama, m.aciklama].filter(Boolean).join(" · ") };
  };

  const hesapKaydet = (kayit) => {
    if (kayit.id == null) {
      const yeni = { ...kayit, id: uid() };
      setKasaHesaplari(p => [...p, yeni]);
      logAction({ serverPermissions, action: "olusturuldu", entity: "kasa_hesap", entityId: yeni.id, entityName: yeni.ad });
      setSecili(yeni.id);
      showToast("Hesap eklendi.");
    } else {
      const eski = kasaHesaplari.find(h => h.id === kayit.id);
      setKasaHesaplari(p => p.map(h => (h.id === kayit.id ? { ...h, ...kayit } : h)));
      logAction({ serverPermissions, action: "duzenlendi", entity: "kasa_hesap", entityId: kayit.id, entityName: kayit.ad, detail: { onceki: snapshotOnceki(eski) } });
      showToast("Hesap güncellendi.");
    }
    setHesapFormu(null);
  };
  // R16, AC-24: kapatılan hesap yeni harekette seçilemez, geçmişi durur; yeniden açılabilir.
  const kapatAc = (h) => {
    setKasaHesaplari(p => p.map(x => (x.id === h.id ? { ...x, kapali: !x.kapali } : x)));
    logAction({ serverPermissions, action: h.kapali ? "acildi" : "kapatildi", entity: "kasa_hesap", entityId: h.id, entityName: h.ad });
    showToast(h.kapali ? "Hesap yeniden açıldı." : "Hesap kapatıldı.");
  };
  const sil = () => {
    const h = silinecek;
    setKasaHesaplari(p => p.filter(x => x.id !== h.id));
    logAction({ serverPermissions, action: "silindi", entity: "kasa_hesap", entityId: h.id, entityName: h.ad });
    setSilinecek(null);
    if (String(secili) === String(h.id)) setSecili(null);
    showToast("Hesap silindi.");
  };
  const virmanKaydet = (kayit) => {
    const yeni = { ...kayit, id: uid() };
    setHesapHareketleri(p => [...p, yeni]);
    const a = hesapById.get(String(kayit.hesapId)), b = hesapById.get(String(kayit.karsiHesapId));
    logAction({ serverPermissions, action: "olusturuldu", entity: "virman", entityId: yeni.id, entityName: `${a?.ad || ""} → ${b?.ad || ""}`, detail: { tutar: kayit.tutar } });
    setVirmanAcik(false);
    showToast("Virman kaydedildi.");
  };
  const virmanSil = (m) => {
    setHesapHareketleri(p => p.filter(x => x.id !== m.id));
    logAction({ serverPermissions, action: "silindi", entity: "virman", entityId: m.id, entityName: `${hesapById.get(String(m.hesapId))?.ad || ""} → ${hesapById.get(String(m.karsiHesapId))?.ad || ""}`, detail: { tutar: m.tutar } });
    showToast("Virman silindi.");
  };

  const bakiyeMetni = (b) => (b.hesap.tur === "kart"
    ? <span>Borç <b>{para(b.borc, b.hesap.paraBirimi)}</b></span>
    : <b style={{ color: b.bakiyeK < 0 ? "var(--red700, #b91c1c)" : "var(--n900, #0f172a)" }}>{para(b.bakiye, b.hesap.paraBirimi)}</b>);
  const acikHesapSayisi = kasaHesaplari.filter(h => !h.kapali).length;
  const izgara = { display: "grid", gridTemplateColumns: "minmax(0, 1.4fr) 110px 70px 150px 190px", gap: 10, alignItems: "center" };
  const hIzgara = { display: "grid", gridTemplateColumns: "90px 120px minmax(0, 1.6fr) 120px 120px 130px 40px", gap: 10, alignItems: "center" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--n900, #0f172a)" }}>Kasa</h2>
          <div style={{ fontSize: 13, color: "var(--n500, #64748b)", marginTop: 2 }}>Kasa, banka ve kredi kartı hesapları. Bakiye hareketlerden hesaplanır.</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {canDo("virman") && setHesapHareketleri && acikHesapSayisi >= 2 && <Btn variant="ghost" onClick={() => setVirmanAcik(true)}><Icon name="refresh" size={14} /> Virman</Btn>}
          {canDo("kasa_hesap") && <Btn onClick={() => setHesapFormu({ hesap: null })}><Icon name="plus" size={14} /> Yeni Hesap</Btn>}
        </div>
      </div>
      <UyariSeridi aile="bilgi" testId="hesapsiz-notu">
        {HESAPSIZ_NOTU}{hesapsiz.adet > 0 && <> <b>{hesapsiz.adet}</b> gider ödemesi hesapsız{hesapsiz.gocAdet > 0 ? `; ${hesapsiz.gocAdet} tanesi eski kayıtlardan aktarıldı` : ""}.</>}
      </UyariSeridi>

      {kasaHesaplari.length === 0 ? (
        <BosDurum testId="bos-kasa" baslik="Henüz hesap yok" metin="Kasa, banka ve kredi kartı hesaplarınızı ekleyin; gider ödemeleri ve müşteri tahsilatları bu hesaplara bağlanır." />
      ) : (
        <>
          <KartBolum varyant="kart" style={{ padding: 0, overflow: "auto" }} testId="hesap-listesi">
            <div style={{ minWidth: 640 }}>
              <div style={{ ...izgara, padding: "10px 14px", fontSize: 11.5, fontWeight: 700, color: "var(--n500, #64748b)", borderBottom: "1px solid var(--n200, #e2e8f0)" }}>
                <span>Hesap</span><span>Tür</span><span>Birim</span><span style={{ textAlign: "right" }}>Bakiye</span><span />
              </div>
              {siraliHesaplar.map(h => {
                const b = bakiyeler.get(String(h.id));
                const secik = seciliHesap && String(seciliHesap.id) === String(h.id);
                const kullanim = hesapKullanimi(h.id, hesapHareketleri, payments);
                return (
                  <div key={h.id} data-testid="hesap-satiri" onClick={() => setSecili(h.id)}
                    style={{ ...izgara, padding: "10px 14px", fontSize: 13, borderTop: "1px solid var(--n150, #f1f5f9)", cursor: "pointer", background: secik ? "var(--ambBg3, #fff7ed)" : "transparent", opacity: h.kapali ? 0.65 : 1 }}>
                    <span style={{ minWidth: 0 }}><b>{h.ad}</b>{h.kapali && <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, color: "var(--n600, #475569)", border: "1px solid var(--n300, #cbd5e1)", borderRadius: 999, padding: "1px 7px" }}>Kapalı</span>}</span>
                    <span>{HESAP_TUR_AD[h.tur] || h.tur}</span>
                    <span>{h.paraBirimi}</span>
                    <span style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{b && bakiyeMetni(b)}</span>
                    <span style={{ display: "flex", gap: 6, justifyContent: "flex-end" }} onClick={e => e.stopPropagation()}>
                      {canDo("kasa_hesap") && <Btn small variant="ghost" onClick={() => setHesapFormu({ hesap: h })} title="Düzenle"><Icon name="edit" size={12} /></Btn>}
                      {canDo("kasa_hesap") && <Btn small variant="ghost" onClick={() => kapatAc(h)}>{h.kapali ? "Aç" : "Kapat"}</Btn>}
                      {canDo("kasa_hesap") && (kullanim === 0
                        ? <Btn small variant="danger" onClick={() => setSilinecek(h)} title="Sil"><Icon name="trash" size={12} /></Btn>
                        : <span title="Hareketi olan hesap silinemez; kapatılabilir." style={{ fontSize: 11, color: "var(--n500, #64748b)", alignSelf: "center" }}>{kullanim} hareket</span>)}
                    </span>
                  </div>
                );
              })}
            </div>
          </KartBolum>

          {seciliHesap && seciliBakiye && (
            <KartBolum varyant="kart" baslikStili="baslik" title={`${seciliHesap.ad} · hareketler`}
              altBaslik={`Açılış ${para(tl(seciliBakiye.acilisK), seciliHesap.paraBirimi)}${seciliHesap.acilisTarihi ? ` (${fmtTR(seciliHesap.acilisTarihi)})` : ""} · giren ${para(seciliBakiye.giren, seciliHesap.paraBirimi)} · çıkan ${para(seciliBakiye.cikan, seciliHesap.paraBirimi)}`}
              style={{ overflow: "auto" }} testId="hesap-hareketleri">
              {seciliBakiye.satirlar.length === 0 ? (
                <BosDurum testId="bos-hesap-hareketi" baslik="Bu hesapta hareket yok" />
              ) : (
                <div style={{ minWidth: 760 }}>
                  <div style={{ ...hIzgara, padding: "8px 0", fontSize: 11.5, fontWeight: 700, color: "var(--n500, #64748b)", borderBottom: "1px solid var(--n200, #e2e8f0)" }}>
                    <span>Tarih</span><span>Tür</span><span>Açıklama</span><span style={{ textAlign: "right" }}>Giren</span><span style={{ textAlign: "right" }}>Çıkan</span><span style={{ textAlign: "right" }}>{seciliHesap.tur === "kart" ? "Bakiye (borç −)" : "Bakiye"}</span><span />
                  </div>
                  {seciliBakiye.satirlar.map((s, i) => {
                    const a = satirAciklamasi(s);
                    return (
                      <div key={`${s.tur}-${s.hareket?.id ?? s.tahsilat?.id}-${i}`} data-testid="hareket-satiri" style={{ ...hIzgara, padding: "8px 0", fontSize: 13, borderTop: "1px solid var(--n150, #f1f5f9)" }}>
                        <span>{fmtTR(s.tarih)}</span>
                        <span>{a.tur}</span>
                        <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={a.metin}>{a.metin}</span>
                        <span style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", color: "var(--grn700, #15803d)" }}>{s.girenK ? para(tl(s.girenK), seciliHesap.paraBirimi) : ""}</span>
                        <span style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", color: "var(--red700, #b91c1c)" }}>{s.cikanK ? para(tl(s.cikanK), seciliHesap.paraBirimi) : ""}</span>
                        <b style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{para(tl(s.bakiyeK), seciliHesap.paraBirimi)}</b>
                        <span style={{ textAlign: "right" }}>{s.tur === "virman" && canDo("virman") && setHesapHareketleri && <Btn small variant="danger" onClick={() => virmanSil(s.hareket)} title="Virmanı sil"><Icon name="trash" size={12} /></Btn>}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </KartBolum>
          )}
        </>
      )}

      {hesapFormu && (
        <HesapFormu hesap={hesapFormu.hesap} hesaplar={kasaHesaplari} hareketVar={!!hesapFormu.hesap && hesapKullanimi(hesapFormu.hesap.id, hesapHareketleri, payments) > 0}
          onKaydet={hesapKaydet} onClose={() => setHesapFormu(null)} />
      )}
      {virmanAcik && <VirmanFormu hesaplar={kasaHesaplari} onKaydet={virmanKaydet} onClose={() => setVirmanAcik(false)} />}
      {silinecek && (
        <ConfirmDialog title="Hesap silinsin mi?" message={`“${silinecek.ad}” hesabının hiç hareketi yok; kalıcı olarak silinecek.`}
          confirmLabel="Hesabı Sil" onConfirm={sil} onCancel={() => setSilinecek(null)} />
      )}
    </div>
  );
};
