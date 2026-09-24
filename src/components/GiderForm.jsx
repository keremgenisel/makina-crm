import { useState, useMemo } from "react";
import { today, getKdvRateForDate } from "../lib/utils";
import { turHaritasi, giderKalemDogrula, kiraHesapla, tutarCoz, personelMukerrer, DAVRANIS, ayOf } from "../lib/gider";
import { Icon, Field, Input, Select, Btn, Modal } from "./ui";
import { TutarInput, Segment, AtamaAlani, ODEME_SECENEKLERI, DavranisRozeti, HataMetni, Ipucu, tl2, tutarMetni } from "./gider/GiderAlanlari";

// Gider kalemi formu (spec 0001 R1, R5, R6, R14, R18, R20, R21; plan K14, K18, K19, K24, K25, K29, K38).
// Tek form: ekle ve düzenle. Tür davranışı alanları açar: kira → brüt/net yön, stopaj, hesap özeti;
// personel → çalışan, resmi + elden (KDV ve tedarikçi yok, C19 notu, mükerrer uyarısı). Atama yalnız
// normal davranışta. Doğrulama ve normalleştirme saf motordadır (giderKalemDogrula).
const numId = (v) => (v === "" || v == null ? null : (/^\d+$/.test(String(v)) ? Number(v) : v));
const idMetni = (v) => (v == null ? "" : String(v));

const formdanKalem = (k, { giderAyarlari, kdvRates }) => {
  if (!k) {
    const tarih = today();
    return { id: null, tarih, turId: "", aciklama: "", tedarikciId: "", tutar: "", netTutar: "", girisYonu: "brut",
      kdvOrani: tutarMetni(getKdvRateForDate(tarih, kdvRates)), stopajOrani: tutarMetni(giderAyarlari?.stopajOrani ?? 20),
      calisanId: "", resmiTutar: "", eldenTutar: "", odemeYontemi: "", sonOdemeTarihi: "", odendi: false, odemeTarihi: "",
      atamaTur: "", makinaTur: null, makinaId: null, modelSatirlari: [], tanimId: null, donem: null, _kdvElle: false };
  }
  return { ...k, turId: idMetni(k.turId), tedarikciId: idMetni(k.tedarikciId), calisanId: idMetni(k.calisanId),
    tutar: tutarMetni(k.tutar), netTutar: tutarMetni(k.netTutar), kdvOrani: tutarMetni(k.kdvOrani),
    stopajOrani: tutarMetni(k.stopajOrani ?? giderAyarlari?.stopajOrani ?? 20), resmiTutar: tutarMetni(k.resmiTutar), eldenTutar: tutarMetni(k.eldenTutar),
    sonOdemeTarihi: k.sonOdemeTarihi || "", odemeTarihi: k.odemeTarihi || "", odemeYontemi: k.odemeYontemi || "", girisYonu: k.girisYonu || "brut",
    modelSatirlari: (k.modelSatirlari || []).map(s => ({ ...s, birimMaliyet: tutarMetni(s.birimMaliyet), adet: String(s.adet ?? "") })), _kdvElle: true };
};

export const GiderForm = ({ kalem, giderTurleri = [], tedarikciler = [], calisanlar = [], stock = [], customers = [], modeller = [],
  giderler = [], giderAyarlari = {}, kdvRates, odemeDegistirebilir = true, onSave, onCancel }) => {
  const [form, setForm] = useState(() => formdanKalem(kalem, { giderAyarlari, kdvRates }));
  const [hatalar, setHatalar] = useState([]);
  const turMap = useMemo(() => turHaritasi(giderTurleri), [giderTurleri]);
  const tur = turMap.get(String(form.turId));
  const dav = tur?.davranis || DAVRANIS.NORMAL;
  const set = (patch) => setForm(f => ({ ...f, ...patch }));
  const hata = (alan) => hatalar.find(h => h.alan === alan)?.mesaj;

  const turDegis = (turId) => {
    const yeniDav = turMap.get(String(turId))?.davranis || DAVRANIS.NORMAL;
    set({ turId, ...(yeniDav !== DAVRANIS.NORMAL ? { atamaTur: "", makinaTur: null, makinaId: null, modelSatirlari: [] } : {}) });
  };
  const tarihDegis = (tarih) => set({ tarih, ...(form._kdvElle ? {} : { kdvOrani: tutarMetni(getKdvRateForDate(tarih, kdvRates)) }) });
  // AC-37 / AC-54 (K14): çalışan seçilince bileşenler YALNIZ boş alana ön doldurulur; tanımsızsa boş kalır.
  const calisanSec = (calisanId) => {
    const c = calisanlar.find(x => String(x.id) === String(calisanId));
    set({
      calisanId,
      resmiTutar: form.resmiTutar !== "" ? form.resmiTutar : tutarMetni(c?.resmiMaliyet),
      eldenTutar: form.eldenTutar !== "" ? form.eldenTutar : tutarMetni(c?.eldenMaliyet),
    });
  };
  const odendiDegis = (odendi) => set({ odendi, odemeTarihi: odendi ? (form.odemeTarihi || today()) : "" });

  const mukerrer = dav === DAVRANIS.PERSONEL ? personelMukerrer(giderler, { calisanId: form.calisanId, tarih: form.tarih, id: form.id }) : [];
  const secilenCalisan = calisanlar.find(x => String(x.id) === String(form.calisanId));
  const calisanMaliyetsiz = secilenCalisan && tutarCoz(secilenCalisan.resmiMaliyet).bos && tutarCoz(secilenCalisan.eldenMaliyet).bos;

  // Hesap özeti (kira: R6; normal: AC-3). Ham metinden anlık hesaplanır.
  const kira = dav === DAVRANIS.KIRA ? kiraHesapla({
    girisYonu: form.girisYonu, tutar: tutarCoz(form.tutar).deger, netTutar: tutarCoz(form.netTutar).deger,
    stopajOrani: tutarCoz(form.stopajOrani).deger, kdvOrani: tutarCoz(form.kdvOrani).deger,
  }) : null;
  const normalTutar = tutarCoz(form.tutar).deger;
  const normalKdv = Math.round(normalTutar * (tutarCoz(form.kdvOrani).deger || 0)) / 100;
  const personelToplam = tutarCoz(form.resmiTutar).deger + tutarCoz(form.eldenTutar).deger;

  const kaydet = () => {
    const ham = {
      ...form,
      turId: numId(form.turId), tedarikciId: dav === DAVRANIS.PERSONEL ? null : numId(form.tedarikciId), calisanId: numId(form.calisanId),
      sonOdemeTarihi: form.sonOdemeTarihi || null, odemeTarihi: form.odemeTarihi || null,
    };
    const { hatalar: h, kayit } = giderKalemDogrula(ham, { turMap, tedarikciler });
    setHatalar(h);
    if (!kayit) return;
    delete kayit._kdvElle;
    if (dav === DAVRANIS.PERSONEL) kayit.calisanAd = secilenCalisan?.ad || kayit.calisanAd || "";
    if (dav !== DAVRANIS.PERSONEL) kayit.aciklama = String(form.aciklama || "").trim();
    onSave(kayit);
  };

  const cekMi = form.odemeYontemi === "Çek";
  const vadeEtiket = cekMi ? "Çek vade tarihi" : "Son ödeme tarihi";
  const sayac = new Set(hatalar.map(h => h.alan)).size;
  return (
    <Modal title={form.id == null ? "Yeni Gider" : "Gider Düzenle"} onClose={onCancel} maxWidth={dav === DAVRANIS.KIRA ? 900 : 640}
      footer={<><Btn variant="ghost" onClick={onCancel}>İptal</Btn><Btn onClick={kaydet}><Icon name="check" size={14} /> {mukerrer.length ? "Yine de Kaydet" : "Kaydet"}</Btn></>}>
      {sayac > 0 && <div role="alert" style={{ background: "var(--redBg, #fef2f2)", border: "1px solid var(--redBr, #fecaca)", color: "var(--red700, #b91c1c)", borderRadius: 10, padding: "10px 14px", fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Kayıt yapılmadı: {sayac} alan düzeltilmeli.</div>}
      {form.tanimId != null && (
        <div style={{ background: "var(--bluBg, #eff6ff)", border: "1px solid var(--bluBr, #bfdbfe)", borderRadius: 10, padding: "10px 14px", fontSize: 12.5, marginBottom: 14 }}>
          <b style={{ color: "var(--blu700, #1d4ed8)" }}>Tekrarlayan tanımdan oluşturuldu{form.donem ? ` · ${form.donem}` : ""}.</b> Bu kalemi düzenlemek yalnız bu ayın kalemini değiştirir; tanım ve diğer ayların kalemleri aynı kalır.
        </div>
      )}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <div style={{ width: 170 }}><Field label="Tarih *"><Input type="date" value={form.tarih} onChange={e => tarihDegis(e.target.value)} /><HataMetni>{hata("tarih")}</HataMetni></Field></div>
        <div style={{ flex: "1 1 220px" }}>
          <Field label="Gider türü *">
            <Select value={form.turId} onChange={e => turDegis(e.target.value)}>
              <option value="">Tür seçin</option>
              {giderTurleri.map(t => <option key={t.id} value={t.id}>{t.ad}</option>)}
            </Select>
            {tur && <div style={{ marginTop: 4 }}><DavranisRozeti davranis={dav} /></div>}
            <HataMetni>{hata("turId")}</HataMetni>
          </Field>
        </div>
        {dav !== DAVRANIS.PERSONEL && (
          <div style={{ flex: "1 1 200px" }}>
            <Field label={dav === DAVRANIS.KIRA ? "Tedarikçi (kiraya veren)" : "Tedarikçi"}>
              <Select value={form.tedarikciId} onChange={e => set({ tedarikciId: e.target.value })}>
                <option value="">Seçilmemiş</option>
                {tedarikciler.map(t => <option key={t.id} value={t.id}>{t.ad}</option>)}
              </Select>
              <HataMetni>{hata("tedarikciId")}</HataMetni>
            </Field>
          </div>
        )}
      </div>
      {giderTurleri.length === 0 && <Ipucu>Önce Ayarlar › Giderler › Gider Türleri'nden tür tanımlayın.</Ipucu>}

      {dav === DAVRANIS.PERSONEL && (
        <>
          {/* C19: form açık olduğu sürece görünen, kapatılamayan not (AC-57, AC-58: engel değil) */}
          <div style={{ display: "flex", gap: 10, background: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 12.5, lineHeight: 1.5, color: "#3b0764" }}>
            <Icon name="warning" size={16} />
            <div><b>Girilen tutar SGK ve işsizlik primlerini içerir.</b> SGK prim ödemesini ve maaş transferini ayrıca gider olarak girmeyin; aynı para iki kez sayılır.</div>
          </div>
          <Field label="Çalışan *">
            <Select value={form.calisanId} onChange={e => calisanSec(e.target.value)}>
              <option value="">Çalışan seçin</option>
              {calisanlar.map(c => <option key={c.id} value={c.id}>{c.ad}</option>)}
            </Select>
            <HataMetni>{hata("calisanId")}</HataMetni>
            {calisanMaliyetsiz && <Ipucu>Bu çalışanın aylık maliyeti girilmemiş; alanlar boş bırakıldı (sıfır yazılmadı).</Ipucu>}
          </Field>
          {mukerrer.length > 0 && (
            <div role="status" style={{ background: "var(--ambBg, #fffbeb)", border: "1px solid var(--ambBr, #fde68a)", borderRadius: 10, padding: "10px 14px", fontSize: 12.5, marginBottom: 14 }}>
              <b style={{ color: "var(--amb700, #b45309)" }}>{secilenCalisan?.ad} için {ayOf(form.tarih)} ayında zaten {mukerrer.length} personel kalemi var.</b> Yine de kaydedebilirsiniz.
            </div>
          )}
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}><Field label="Resmi işveren maliyeti"><TutarInput ariaLabel="Resmi işveren maliyeti" value={form.resmiTutar} onChange={v => set({ resmiTutar: v })} invalid={!!hata("resmiTutar")} /><HataMetni>{hata("resmiTutar")}</HataMetni></Field></div>
            <div style={{ flex: 1 }}><Field label="Elden ödenen"><TutarInput ariaLabel="Elden ödenen" value={form.eldenTutar} onChange={v => set({ eldenTutar: v })} invalid={!!hata("eldenTutar")} /><HataMetni>{hata("eldenTutar")}</HataMetni></Field></div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", background: "#faf7ff", border: "1px solid #ede9fe", borderRadius: 10, padding: "10px 14px", marginBottom: 14 }}>
            <span style={{ fontSize: 13, color: "var(--n600, #475569)", fontWeight: 600 }}>Kalem tutarı (resmi + elden)</span><b style={{ fontSize: 16 }}>{tl2(personelToplam)}</b>
          </div>
          <Ipucu>Personel kaleminde KDV oranı ve tedarikçi alanı yoktur. Boş bileşen sıfır sayılır.</Ipucu>
        </>
      )}

      {dav !== DAVRANIS.PERSONEL && (
        <Field label="Açıklama"><Input value={form.aciklama || ""} onChange={e => set({ aciklama: e.target.value })} placeholder="Opsiyonel (ör. fatura numarası)" /></Field>
      )}

      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div style={{ flex: "1 1 320px", minWidth: 0 }}>
          {dav === DAVRANIS.KIRA && (
            <>
              <Field label="Hangi tutarı giriyorsunuz?">
                <Segment ariaLabel="Giriş yönü" options={[{ value: "brut", label: "Brüt kira" }, { value: "net", label: "Net ödenen kira" }]} value={form.girisYonu} onChange={v => set({ girisYonu: v })} />
                <Ipucu>Seçim kayıtta saklanır, listede “{form.girisYonu === "net" ? "Net" : "Brüt"} girildi” rozetiyle görünür.</Ipucu>
              </Field>
              {form.girisYonu === "net"
                ? <Field label="Net ödenen kira *"><TutarInput ariaLabel="Net ödenen kira" value={form.netTutar} onChange={v => set({ netTutar: v })} invalid={!!hata("netTutar")} /><HataMetni>{hata("netTutar")}</HataMetni></Field>
                : <Field label="Brüt kira (KDV hariç) *"><TutarInput ariaLabel="Brüt kira" value={form.tutar} onChange={v => set({ tutar: v })} invalid={!!hata("tutar")} /><HataMetni>{hata("tutar")}</HataMetni></Field>}
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}><Field label="Stopaj oranı"><TutarInput sym="%" ariaLabel="Stopaj oranı" value={form.stopajOrani} onChange={v => set({ stopajOrani: v })} /><HataMetni>{hata("stopajOrani")}</HataMetni></Field></div>
                <div style={{ flex: 1 }}><Field label="KDV oranı"><TutarInput sym="%" ariaLabel="KDV oranı" value={form.kdvOrani} onChange={v => set({ kdvOrani: v, _kdvElle: true })} /><HataMetni>{hata("kdvOrani")}</HataMetni></Field></div>
              </div>
            </>
          )}
          {dav === DAVRANIS.NORMAL && (
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}><Field label="Tutar (KDV hariç) *"><TutarInput ariaLabel="Tutar" value={form.tutar} onChange={v => set({ tutar: v })} invalid={!!hata("tutar")} /><HataMetni>{hata("tutar")}</HataMetni></Field></div>
              <div style={{ width: 130 }}><Field label="KDV oranı"><TutarInput sym="%" ariaLabel="KDV oranı" value={form.kdvOrani} onChange={v => set({ kdvOrani: v, _kdvElle: true })} /><HataMetni>{hata("kdvOrani")}</HataMetni></Field></div>
            </div>
          )}
          {dav !== DAVRANIS.PERSONEL && <Ipucu>KDV oranı gider tarihine göre ön doldurulur, değiştirilebilir.</Ipucu>}
        </div>
        {dav === DAVRANIS.KIRA && kira && (
          <div style={{ flex: "0 0 300px", background: "var(--ambBg3, #fffaf5)", border: "1px solid var(--ambBr3, #fed7aa)", borderRadius: 12, padding: "14px 16px" }} data-testid="kira-ozet">
            <div style={{ fontSize: 13.5, fontWeight: 800, color: "var(--orTx, #c2410c)", marginBottom: 4 }}>Hesap Özeti</div>
            <div style={{ fontSize: 11.5, color: "var(--n500, #64748b)", marginBottom: 6 }}>Stopaj ve KDV, KDV hariç brüt tutar üzerinden hesaplanır.</div>
            {[["Brüt kira", tl2(kira.brut)], ["Stopaj", `− ${tl2(kira.stopaj)}`], ["Net kira", tl2(kira.net)], ["KDV", `+ ${tl2(kira.kdv)}`]].map(([a, b]) => (
              <div key={a} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "6px 0", borderBottom: "1px solid #fde7d4" }}><span>{a}</span><b>{b}</b></div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, padding: "8px 0", borderBottom: "1px solid #fde7d4" }}><span>Tedarikçiye ödenecek <span style={{ fontSize: 11, color: "var(--n500, #64748b)" }}>net + KDV</span></span><b>{tl2(kira.nakit)}</b></div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "6px 0" }}><span>Vergi dairesine (stopaj)</span><b style={{ color: "var(--amb700, #b45309)" }}>{tl2(kira.stopaj)}</b></div>
            <div style={{ fontSize: 12, color: "var(--n600, #475569)", marginTop: 6 }}>Gider toplamına giren: <b>{tl2(kira.brut)}</b> (brüt)</div>
          </div>
        )}
        {dav === DAVRANIS.NORMAL && normalTutar > 0 && (
          <div style={{ flex: "0 0 220px", background: "var(--n100, #f8fafc)", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 12, padding: "12px 14px", fontSize: 13 }} data-testid="normal-ozet">
            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}><span>KDV</span><b>{tl2(normalKdv)}</b></div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}><span>Ödenecek</span><b>{tl2(normalTutar + normalKdv)}</b></div>
            <div style={{ fontSize: 11.5, color: "var(--n500, #64748b)", marginTop: 4 }}>Gider toplamına {tl2(normalTutar)} girer.</div>
          </div>
        )}
      </div>

      <Field label="Ödeme yöntemi">
        <Segment ariaLabel="Ödeme yöntemi" options={ODEME_SECENEKLERI} value={form.odemeYontemi} onChange={v => set({ odemeYontemi: v })} />
        <Ipucu>Opsiyonel. Ödeme durumundan bağımsızdır, kalem ödenmeden önce de seçilebilir.</Ipucu>
      </Field>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 170px" }}>
          <Field label={vadeEtiket}>
            <Input type="date" value={form.sonOdemeTarihi} onChange={e => set({ sonOdemeTarihi: e.target.value })} />
            <HataMetni>{hata("sonOdemeTarihi")}</HataMetni>
            <Ipucu>Gider tarihinden önce olamaz.</Ipucu>
          </Field>
        </div>
        <div style={{ flex: "1 1 200px" }}>
          <Field label="Ödeme durumu">
            <Segment ariaLabel="Ödeme durumu" disabled={!odemeDegistirebilir} options={[{ value: true, label: "Ödendi" }, { value: false, label: "Ödenmedi" }]} value={!!form.odendi} onChange={odendiDegis} />
            {!odemeDegistirebilir && <Ipucu>Ödeme durumunu değiştirme yetkiniz yok.</Ipucu>}
          </Field>
        </div>
        {form.odendi && (
          <div style={{ flex: "1 1 150px" }}><Field label="Ödeme tarihi"><Input type="date" value={form.odemeTarihi} disabled={!odemeDegistirebilir} onChange={e => set({ odemeTarihi: e.target.value })} /></Field></div>
        )}
      </div>

      {dav === DAVRANIS.NORMAL && (
        <Field label="Makina maliyeti ataması">
          <AtamaAlani value={form} onChange={p => set(p)} stock={stock} customers={customers} modeller={modeller} tutar={form.tutar} />
          <HataMetni>{hatalar.filter(h => h.alan === "modelSatirlari" || h.alan === "makinaId").map(h => h.mesaj).find(Boolean)}</HataMetni>
        </Field>
      )}
    </Modal>
  );
};
