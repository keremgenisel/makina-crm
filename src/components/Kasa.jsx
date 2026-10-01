import { useState, useMemo } from "react";
import { uid, fmtTR, fmtCur, today } from "../lib/utils";
import { makeCanDo } from "../lib/permissions";
import { logAction, snapshotOnceki } from "../lib/audit";
import { tl, turHaritasi, davranisOf } from "../lib/gider";
import { hareketGruplari, hareketHedefPaylari } from "../lib/odemeYontemi";
import { HESAP_TURLERI, HESAP_TUR_AD, HESAPSIZ_NOTU, hesapDogrula, hesapBakiyeleri, hesapKullanimi, virmanDogrula, secilebilirHesaplar, hesapsizOzeti, kapsamAnahtari, kapsamGirisAnahtari, kapsamGirisi, denemeDonemiAcik, denemeDonemiBitisi, hesapTasimaPlani } from "../lib/kasa";
import { HesapSilPenceresi } from "./kasa/HesapSilPenceresi";
import { SATIS_KAYNAK } from "../lib/satisTahsilat";
import { useBugun } from "../hooks/useBugun";
import { Icon, Btn, Field, Input, Select, Modal, ConfirmDialog } from "./ui";
import { KartBolum, BosDurum, UyariSeridi, HataMetni, Ipucu, Segment } from "./tasarim";
import { TutarInput, tutarMetni, hedefEtiketi, cokHedefliMi } from "./gider/GiderAlanlari";
import { CalisanAvanslari } from "./kasa/CalisanAvanslari";
import { GiderKasaRaporuDugmesi } from "./rapor/GiderKasaRaporuDugmesi";
import { CekPortfoyu } from "./cek/CekPortfoyu";

// Kasa üst sekmesi (spec 0024 A; R1, R7, R8, R15, R16; C1, C5, C6). Hesaplar (kasa, banka, kredi kartı), yürüyen
// bakiyeli hareket listesi ve virman. Bakiye saklanmaz, hareketlerden türer (lib/kasa.js). Yalnız gider yetkisi +
// Finans sekmesi olan kullanıcıya görünür (App: kasaYetki). Hesap işlemleri `kasa_hesap`, virman `virman` ister.
const PARA_BIRIMLERI = [{ value: "TRY", label: "TL" }, { value: "USD", label: "USD" }, { value: "EUR", label: "EUR" }];
const SEMBOL = { TRY: "₺", USD: "$", EUR: "€" };
const para = (n, pb) => fmtCur(n, pb || "TRY");
// Spec 0058 R2, R8 (AC-28): ekranda birebir yazılan iki cümle.
export const KAPSAM_DISI_ACIKLAMA = "Kapsam dışı bırakmak kaydı silmez ve hiçbir tutarı değiştirmez; yalnız bu listeden çıkarır.";
export const KAPSAM_SUZGEC_FARKI = "Başlangıç tarihi geçici bir süzgeçtir, kapsam dışı bırakmak kalıcı bir karardır.";
// Spec 0056 R3, R13 (AC-31, AC-32): ekranda birebir yazılan iki metin.
export const denemeDonemiMetni = (bitis) => `Deneme dönemi ${bitis.split("-").reverse().join(".")}'de biter. O tarihten sonra hareketi olan hesap silinemez, yalnız kapatılabilir.`;
export const ACILIS_BAKIYE_IPUCU = "Bakiye hareketlerden hesaplanır, doğrudan yazılamaz; bir hesabın başlangıç rakamını açılış bakiyesiyle ayarlayın.";
const BOS_KAPSAM = []; // sabit kimlik: her çizimde yeni dizi bellekteki özeti boşa düşürürdü (0051 triyaj)
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
    <Modal title={form.id == null ? "Yeni Hesap" : "Hesabı Düzenle"} onClose={onClose} wide
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
          <div data-testid="acilis-bakiye-ipucu"><Ipucu>{ACILIS_BAKIYE_IPUCU}</Ipucu></div>
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
    <Modal title="Virman" onClose={onClose} wide
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
  // Spec 0024 B: çalışan avansları (silinmişler dahil, C8) ve ekstre kapsamı için yürürlük ayı.
  calisanlar = [], yururlukAy = null,
  // Spec 0040: çek portföyü görünümü.
  cekler = [], setCekler = null, giderAyarlari = {},
  // Spec 0044: servis, Extra Kalıp ve yedek parça tahsilatları (bakiye, hesapsız liste ve hesap ataması).
  services = [], setServices = null, partSales = [], setPartSales = null, yedekParcaSatislar = [], setYedekParcaSatislar = null,
  dealers = [], factory = null, kdvRates = undefined,
  // Spec 0047: Aylık Gider ve Kasa Raporu (Kasa yalnız kasa yetkisiyle çizilir).
  giderKasaRaporVerisi = null,
  // Spec 0058: kasa iş listesinden kapsam dışı bırakılan hesapsız kayıtlar (setter yoksa salt okunur).
  kasaKapsamDisi = BOS_KAPSAM, setKasaKapsamDisi = null,
  // Spec 0056: hesap taşımada makina tahsilatlarının hesap bağı da değişir.
  setPayments = null,
}) => {
  const [gorunum, setGorunum] = useState("hesaplar");
  const canDo = makeCanDo(serverPermissions, "giderActions");
  const [secili, setSecili] = useState(null);
  const [hesapFormu, setHesapFormu] = useState(null); // null | {hesap}
  const [virmanAcik, setVirmanAcik] = useState(false);
  const [silinecek, setSilinecek] = useState(null);
  const bugun = useBugun();
  // Spec 0044 R15: motorun tek veri nesnesi (ad çözümü motorda, R10).
  const veri = useMemo(() => ({ payments, services, partSales, yedekParcaSatislar, customers, dealers, factory, kdvRates, bugun, cekler }),
    [payments, services, partSales, yedekParcaSatislar, customers, dealers, factory, kdvRates, bugun, cekler]);
  const bakiyeler = useMemo(() => hesapBakiyeleri(kasaHesaplari, hesapHareketleri, veri), [kasaHesaplari, hesapHareketleri, veri]);
  // Spec 0051 A (R1–R7): hesapsız iş listesi başlangıç tarihinden (Gider Ayarları) sonrasını gösterir; tarihsiz kayıt her
  // zaman görünür. "Hepsini göster" ekran içi geçici anahtardır (ayarı değiştirmez, hatırlanmaz, R7). Bakiye eşiği görmez.
  const esik = giderAyarlari?.hesapsizBaslangic || "";
  const [hepsiniGoster, setHepsiniGoster] = useState(false);
  // Spec 0058 R13: önce kapsam dışı ayıklanır, sonra eşik; sayılar ve listeler yalnız kapsamdakileri gösterir.
  const kapsamListesi = Array.isArray(kasaKapsamDisi) ? kasaKapsamDisi : BOS_KAPSAM;
  const hesapsizO = useMemo(() => hesapsizOzeti(hesapHareketleri, veri, kasaHesaplari, hepsiniGoster ? null : esik || null, kapsamListesi),
    [hesapHareketleri, veri, kasaHesaplari, hepsiniGoster, esik, kapsamListesi]);
  // Triyaj: eşik bilgisi bellekte; anahtar kapalıyken süzülmüş özetin kendisidir (aynı hesap ikinci kez yapılmaz).
  const esikBilgisi = useMemo(() => (!esik ? null : hepsiniGoster ? hesapsizOzeti(hesapHareketleri, veri, kasaHesaplari, esik, kapsamListesi) : hesapsizO),
    [esik, hepsiniGoster, hesapsizO, hesapHareketleri, veri, kasaHesaplari, kapsamListesi]);
  const hesapsiz = hesapsizO.odeme, hesapsizTahsilat = hesapsizO.tahsilat, kapsamDisiO = hesapsizO.kapsamDisi;
  const [tahsilatListesiAcik, setTahsilatListesiAcik] = useState(false);
  const [odemeListesiAcik, setOdemeListesiAcik] = useState(false);
  const [kapsamDisiAcik, setKapsamDisiAcik] = useState(false);
  const [topluOnay, setTopluOnay] = useState(null); // null | { tur: "odeme"|"tahsilat", satirlar }
  const siraliHesaplar = useMemo(() => [...kasaHesaplari].sort((a, b) => (a.kapali ? 1 : 0) - (b.kapali ? 1 : 0) || String(a.ad).localeCompare(String(b.ad), "tr")), [kasaHesaplari]);
  const seciliHesap = kasaHesaplari.find(h => String(h.id) === String(secili)) || siraliHesaplar[0] || null;
  const seciliBakiye = seciliHesap ? bakiyeler.get(String(seciliHesap.id)) : null;
  const giderById = useMemo(() => new Map(giderler.map(k => [String(k.id), k])), [giderler]);
  const turById = useMemo(() => new Map(giderTurleri.map(t => [String(t.id), t])), [giderTurleri]);
  const tedById = useMemo(() => new Map(tedarikciler.map(t => [String(t.id), t])), [tedarikciler]);
  const hesapById = useMemo(() => new Map(kasaHesaplari.map(h => [String(h.id), h])), [kasaHesaplari]);
  // Spec 0051 B (R8, Q1): her gider ödemesinin kapattığı hedef(ler); yalnız birden çok hedefli kalemler için hesaplanır.
  const turMap = useMemo(() => turHaritasi(giderTurleri), [giderTurleri]);
  const hedefPaylari = useMemo(() => {
    const m = new Map();
    for (const gid of hareketGruplari(hesapHareketleri).keys()) {
      const k = giderById.get(gid);
      if (!k || !cokHedefliMi(k, davranisOf(k, turMap))) continue;
      for (const [hid, p] of hareketHedefPaylari(k, hesapHareketleri, turMap)) m.set(hid, p);
    }
    return m;
  }, [hesapHareketleri, giderById, turMap]);

  const satirAciklamasi = (s) => {
    // Spec 0044 R10, AC-14: tahsilat satırlarının türü ve firma adı motordan gelir.
    if (s.tahsilat) return { tur: s.turAdi, metin: [s.firma, s.tahsilat.yontem || "Nakit"].filter(Boolean).join(" · ") };
    // Spec 0049 B (AC-14): bankanın ödediği kendi çekimiz.
    if (s.cek) return { tur: s.turAdi, metin: [`Çek ${s.cek.no}`, s.cek.alacakliAd].filter(Boolean).join(" · ") };
    const m = s.hareket;
    if (s.tur === "avans") {
      const c = calisanlar.find(x => String(x.id) === String(m.calisanId));
      return { tur: "Avans", metin: [c ? `${c.ad}${c.deletedAt ? " (silinmiş)" : ""}` : "Silinmiş çalışan", m.aciklama].filter(Boolean).join(" · ") };
    }
    if (s.tur === "virman") {
      const karsi = hesapById.get(String(s.girenK > 0 ? m.hesapId : m.karsiHesapId));
      return { tur: "Virman", metin: [`${s.girenK > 0 ? "Gelen" : "Giden"}: ${karsi?.ad || "Silinmiş hesap"}`, m.aciklama].filter(Boolean).join(" · ") };
    }
    const k = giderById.get(String(m.giderId));
    const taraf = k ? (k.calisanAd || tedById.get(String(k.tedarikciId))?.ad || turById.get(String(k.turId))?.ad || "Gider") : "Silinmiş gider";
    // Spec 0051 R8, R9: ödemenin kapattığı hedef (kira stopajında vergi dairesi, personelde resmi/elden); çözülemezse yok (R11).
    const hedef = k ? hedefEtiketi(k, davranisOf(k, turMap), hedefPaylari.get(String(m.id))) : null;
    return { tur: "Gider ödemesi", metin: [taraf, hedef, k?.aciklama, m.aciklama].filter(Boolean).join(" · ") };
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
  // ── Spec 0056: deneme döneminde hareketi olan hesabın silinmesi (R1–R11, R16–R27) ──
  const denemeBitis = denemeDonemiBitisi(giderAyarlari);
  const deneme = denemeDonemiAcik(giderAyarlari, bugun);
  const [tasinacak, setTasinacak] = useState(null); // silinecek hareketli hesap
  const tasimaPlani = useMemo(() => (tasinacak ? hesapTasimaPlani(tasinacak, hesapHareketleri, veri, kasaHesaplari,
    { hesapAdi: (id) => hesapById.get(String(id))?.ad || "Silinmiş hesap", tarihYaz: (t) => (t ? fmtTR(t) : "Tarihsiz") }) : null),
  [tasinacak, hesapHareketleri, veri, kasaHesaplari, hesapById]);
  // R23: hesabın silinmesi ve altı bağın değişmesi aynı işleyicide (React tek güncellemede toplar → tek kayıt).
  const tasiVeSil = (hedefId) => {
    const h = tasinacak, plan = tasimaPlani;
    if (!h || !plan) return;
    const d = plan.detay;
    const eksik = [[d.odeme + d.virman + d.avans + d.diger, setHesapHareketleri], [d.payments, setPayments], [d.servis, setServices], [d.kalip, setPartSales],
      [d.yedekParca, setYedekParcaSatislar], [d.verilenCek, setCekler]].some(([n, f]) => n > 0 && !f);
    if (eksik) { showToast("Bu hesabın bağlı kayıtları bu ekrandan değiştirilemiyor; hesap silinmedi.", "error"); return; }
    const g = plan.guncelle(hedefId);
    setHesapHareketleri?.(g.hesapHareketleri); setPayments?.(g.payments); setServices?.(g.services); setPartSales?.(g.partSales);
    setYedekParcaSatislar?.(g.yedekParcaSatislar); setCekler?.(g.cekler);
    setKasaHesaplari(p => p.filter(x => x.id !== h.id));
    const hedefAd = hedefId == null ? null : hesapById.get(String(hedefId))?.ad || null;
    logAction({ serverPermissions, action: "hareket_tasindi", entity: "kasa_hesap", entityId: h.id, entityName: h.ad,
      detail: { kaynak: h.ad, hedef: hedefAd || "Hesapsız", adet: d.toplam } });
    logAction({ serverPermissions, action: "silindi", entity: "kasa_hesap", entityId: h.id, entityName: h.ad });
    setTasinacak(null);
    if (String(secili) === String(h.id)) setSecili(null);
    showToast(hedefAd ? `Hesap silindi; ${d.toplam} kayıt “${hedefAd}” hesabına taşındı.` : `Hesap silindi; ${d.toplam} kayıt hesapsız bırakıldı.`);
  };
  const virmanKaydet = (kayit) => {
    const yeni = { ...kayit, id: uid() };
    setHesapHareketleri(p => [...p, yeni]);
    const a = hesapById.get(String(kayit.hesapId)), b = hesapById.get(String(kayit.karsiHesapId));
    logAction({ serverPermissions, action: "olusturuldu", entity: "virman", entityId: yeni.id, entityName: `${a?.ad || ""} → ${b?.ad || ""}`, detail: { tutar: kayit.tutar } });
    setVirmanAcik(false);
    showToast("Virman kaydedildi.");
  };
  // Spec 0044 R7, AC-8: hesapsız tahsilata hesap atanır; yalnız hesapId yazılır (sunucu: tahsilatHesabiYalnizMi).
  const TAHSILAT_YAZICI = { [SATIS_KAYNAK.SERVIS]: [setServices, "servis"], [SATIS_KAYNAK.KALIP]: [setPartSales, "kalip_satisi"], [SATIS_KAYNAK.YEDEK]: [setYedekParcaSatislar, "yedek_parca_satis"] };
  const hesapAta = (k, hesapId) => {
    const [yaz, entity] = TAHSILAT_YAZICI[k.kaynak] || [];
    if (!yaz || hesapId == null) return;
    yaz(p => p.map(r => (r.id === k.kayit.id ? { ...r, hesapId } : r)));
    logAction({ serverPermissions, action: "duzenlendi", entity, entityId: k.kayit.id, entityName: k.firma, detail: { hesap: hesapById.get(String(hesapId))?.ad } });
    showToast("Tahsilat hesaba bağlandı.");
  };
  // ── Spec 0058: kapsam dışı bırakma ve geri alma (R1–R5, R9, R10, R17, R21) ──
  const kapsamYetkisi = !!setKasaKapsamDisi && canDo("kasa_hesap");
  // R21 (Q6): işlem geçmişinde tahsilatta "tür · firma", ödemede tedarikçi ya da tür; avansta çalışan adı yazılmaz.
  const kapsamAdi = (sat) => {
    if (sat.kaynak && sat.kayit) return [sat.turAdi, sat.firma].filter(Boolean).join(" · ");
    if (sat.tur === "avans") return "Avans";
    const k = giderById.get(String(sat.giderId));
    return k ? (tedById.get(String(k.tedarikciId))?.ad || turById.get(String(k.turId))?.ad || "Gider ödemesi") : "Gider ödemesi";
  };
  const kapsamDisiBirak = (satirlar, toplu = false) => {
    if (!kapsamYetkisi || !satirlar.length) return;
    const zaman = new Date().toISOString();
    setKasaKapsamDisi(p => {
      const var_ = new Set((p || []).map(kapsamGirisAnahtari));
      return [...(p || []), ...satirlar.filter(sat => !var_.has(kapsamAnahtari(sat))).map(sat => ({ id: uid(), ...kapsamGirisi(sat), zaman }))];
    });
    if (toplu) logAction({ serverPermissions, action: "kapsam_disi", entity: "kasa_kapsam", entityName: `${satirlar.length} kayıt (toplu)`, detail: { adet: satirlar.length } });
    else logAction({ serverPermissions, action: "kapsam_disi", entity: "kasa_kapsam", entityId: kapsamGirisi(satirlar[0]).kayitId, entityName: kapsamAdi(satirlar[0]) });
    showToast(`${satirlar.length} kayıt kapsam dışı bırakıldı.`);
  };
  const kapsamaAl = (sat) => {
    if (!kapsamYetkisi) return;
    const anahtar = kapsamAnahtari(sat);
    setKasaKapsamDisi(p => (p || []).filter(g => kapsamGirisAnahtari(g) !== anahtar));
    logAction({ serverPermissions, action: "kapsama_alindi", entity: "kasa_kapsam", entityId: kapsamGirisi(sat).kayitId, entityName: kapsamAdi(sat) });
    showToast("Kayıt listeye geri alındı.");
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
  // Spec 0056: işlem sütunu deneme dönemindeki "Sil" düğmesine yer açar ("N hareket" kırılmasın).
  const izgara = { display: "grid", gridTemplateColumns: "minmax(0, 1.4fr) 110px 70px 150px 230px", gap: 10, alignItems: "center" };
  const tIzgara = { display: "grid", gridTemplateColumns: "90px 150px minmax(0, 1.6fr) 120px 200px 130px", gap: 10, alignItems: "center" };
  const oIzgara = { display: "grid", gridTemplateColumns: "90px 110px minmax(0, 1.6fr) 120px 130px", gap: 10, alignItems: "center" };
  const odemeSatirlari = [...(hesapsiz.liste || [])];
  const odemeTutari = (m) => (m.tutar == null ? "Tam kapatma (aktarılan)" : para(m.tutar, "TRY"));
  const topluDugme = (tur, satirlar) => (kapsamYetkisi ? (
    <Btn small variant="ghost" disabled={!satirlar.length} onClick={() => setTopluOnay({ tur, satirlar })}
      aria-label={tur === "odeme" ? "Görünen ödemeleri kapsam dışı bırak" : "Görünen tahsilatları kapsam dışı bırak"}>
      Görünen {satirlar.length} kaydı kapsam dışı bırak
    </Btn>
  ) : null);
  const hIzgara = { display: "grid", gridTemplateColumns: "90px 120px minmax(0, 1.6fr) 120px 120px 130px 40px", gap: 10, alignItems: "center" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--n900, #0f172a)" }}>Kasa</h2>
          <div style={{ fontSize: 13, color: "var(--n500, #64748b)", marginTop: 2 }}>Kasa, banka ve kredi kartı hesapları. Bakiye hareketlerden hesaplanır.</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <GiderKasaRaporuDugmesi veri={giderKasaRaporVerisi} kasaYetki />
          {gorunum === "hesaplar" && canDo("virman") && setHesapHareketleri && acikHesapSayisi >= 2 && <Btn variant="ghost" onClick={() => setVirmanAcik(true)}><Icon name="refresh" size={14} /> Virman</Btn>}
          {gorunum === "hesaplar" && canDo("kasa_hesap") && <Btn onClick={() => setHesapFormu({ hesap: null })}><Icon name="plus" size={14} /> Yeni Hesap</Btn>}
        </div>
      </div>
      {/* Spec 0040 Q5: çek portföyü Kasa'nın bir görünümüdür (görünürlük kuralı aynı). */}
      <div style={{ maxWidth: 360 }}><Segment ariaLabel="Kasa görünümü" kip="sekme" options={[{ value: "hesaplar", label: "Hesaplar" }, { value: "cek", label: "Çek Portföyü" }]} value={gorunum} onChange={setGorunum} /></div>
      {gorunum === "cek" ? (
        <CekPortfoyu cekler={cekler} setCekler={setCekler} payments={payments} customers={customers} giderler={giderler} giderTurleri={giderTurleri}
          tedarikciler={tedarikciler} calisanlar={calisanlar} hesapHareketleri={hesapHareketleri} setHesapHareketleri={setHesapHareketleri}
          giderAyarlari={giderAyarlari} serverPermissions={serverPermissions} showToast={showToast} hesaplar={kasaHesaplari} />
      ) : (<>
      {/* Spec 0056 R3 (AC-2, AC-31): deneme dönemi geçici bir hâldir; bitiş ayardan. */}
      {deneme && <UyariSeridi aile="uyari" testId="deneme-donemi">{denemeDonemiMetni(denemeBitis)}</UyariSeridi>}
      <UyariSeridi aile="bilgi" testId="hesapsiz-notu">
        {HESAPSIZ_NOTU}
        {hesapsiz.avansAdet > 0 && <> <b>{hesapsiz.avansAdet}</b> avans hesapsız.</>}
      </UyariSeridi>
      {/* Spec 0051 R7, AC-6, AC-18, AC-25: eşik altında kalanlar nedene göre; tarihsiz kayıtlar listede kalır. */}
      {esik && esikBilgisi && (esikBilgisi.gizli.toplam > 0 || esikBilgisi.tarihsiz > 0 || hepsiniGoster) && (
        <div data-testid="hesapsiz-esik-satiri" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: 12.5, color: "var(--n600, #475569)" }}>
          {hepsiniGoster ? <span>Bütün kayıtlar gösteriliyor; başlangıç tarihi ({fmtTR(esik)}) bu ekranda yok sayıldı.</span> : (
            <span>
              Başlangıç tarihi ({fmtTR(esik)}) öncesi <b>{esikBilgisi.gizli.toplam}</b> kayıt listede gösterilmiyor
              {esikBilgisi.gizli.toplam > 0 && ` (${[
                esikBilgisi.gizli.odeme && `${esikBilgisi.gizli.odeme} ödeme`, esikBilgisi.gizli.avans && `${esikBilgisi.gizli.avans} avans`,
                esikBilgisi.gizli.tahsilat.hesapsiz && `${esikBilgisi.gizli.tahsilat.hesapsiz} hesapsız tahsilat`,
                esikBilgisi.gizli.tahsilat.hesapYok && `${esikBilgisi.gizli.tahsilat.hesapYok} hesabı silinmiş tahsilat`,
                esikBilgisi.gizli.tahsilat.paraBirimi && `${esikBilgisi.gizli.tahsilat.paraBirimi} para birimi uyuşmayan tahsilat`,
              ].filter(Boolean).join(", ")})`}.
              {esikBilgisi.tarihsiz > 0 && <> Tarihi olmayan <b>{esikBilgisi.tarihsiz}</b> kayıt listede kalır.</>}
            </span>
          )}
          <Btn small variant="ghost" onClick={() => setHepsiniGoster(h => !h)}>{hepsiniGoster ? "Başlangıç tarihine göre süz" : "Hepsini göster"}</Btn>
        </div>
      )}
      {/* Spec 0044 R6, AC-24: gider tarafının hesapsız ödemeleri ile satış tahsilatları iki ayrı satır. */}
      <div data-testid="hesapsiz-sayilar" style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, color: "var(--n700)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span data-testid="hesapsiz-odeme-satiri">Hesabı belirtilmemiş ödemeler: <b>{hesapsiz.adet}</b>{hesapsiz.gocAdet > 0 ? ` (${hesapsiz.gocAdet} tanesi eski kayıtlardan aktarıldı)` : ""}</span>
          {/* Spec 0058 R19: ödeme (ve hesapsız avans) listesi; tahsilat listesinin eşi. */}
          {(hesapsiz.adet + hesapsiz.avansAdet > 0 || odemeListesiAcik) && <Btn small variant="ghost" onClick={() => setOdemeListesiAcik(a => !a)}>{odemeListesiAcik ? "Ödemeleri gizle" : "Ödemeleri göster"}</Btn>}
        </div>
        <div data-testid="hesapsiz-tahsilat-satiri" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span>Hesabı belirtilmemiş tahsilatlar: <b>{hesapsizTahsilat.adet}</b></span>
          {(hesapsizTahsilat.adet > 0 || tahsilatListesiAcik) && <Btn small variant="ghost" onClick={() => setTahsilatListesiAcik(a => !a)}>{tahsilatListesiAcik ? "Listeyi gizle" : "Listeyi göster"}</Btn>}
        </div>
        {kapsamDisiO && kapsamDisiO.toplam > 0 && (
          <div data-testid="kapsam-disi-satiri" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span>Kapsam dışı bırakılanlar: <b>{kapsamDisiO.toplam}</b></span>
            <Btn small variant="ghost" onClick={() => setKapsamDisiAcik(a => !a)}>{kapsamDisiAcik ? "Gizle" : "Göster"}</Btn>
          </div>
        )}
      </div>
      {/* Spec 0058 R2, R8 (AC-11, AC-28): iki aracın farkı ve kararın etkisi ekranda yazılı. */}
      {kapsamYetkisi && (tahsilatListesiAcik || odemeListesiAcik || (kapsamDisiO && kapsamDisiO.toplam > 0)) && (
        <div data-testid="kapsam-disi-aciklama"><Ipucu>{KAPSAM_DISI_ACIKLAMA} {KAPSAM_SUZGEC_FARKI}</Ipucu></div>
      )}
      {odemeListesiAcik && (
        <KartBolum varyant="kart" style={{ padding: 0, overflow: "auto" }} testId="hesapsiz-odemeler">
          {!odemeSatirlari.length ? (
            <div style={{ padding: 14 }}>
              <BosDurum testId="bos-hesapsiz-odeme" baslik="Hesabı belirtilmemiş ödeme yok" />
              <div style={{ marginTop: 8 }}>{topluDugme("odeme", [])}</div>
            </div>
          ) : (
          <div style={{ minWidth: 640 }}>
            <div style={{ display: "flex", justifyContent: "flex-end", padding: "8px 14px 0" }}>{topluDugme("odeme", odemeSatirlari)}</div>
            <div style={{ ...oIzgara, padding: "10px 14px", fontSize: 11.5, fontWeight: 700, color: "var(--n500, #64748b)", borderBottom: "1px solid var(--n200, #e2e8f0)" }}>
              <span>Tarih</span><span>Tür</span><span>Açıklama</span><span style={{ textAlign: "right" }}>Tutar</span><span />
            </div>
            {odemeSatirlari.map(m => {
              const a = satirAciklamasi({ hareket: m, tur: m.tur });
              return (
                <div key={m.id} data-testid="hesapsiz-odeme" style={{ ...oIzgara, padding: "8px 14px", fontSize: 13, borderTop: "1px solid var(--n150, #f1f5f9)" }}>
                  <span>{m.tarih ? fmtTR(m.tarih) : "Tarihsiz"}</span>
                  <span>{a.tur}</span>
                  <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={a.metin}>{a.metin}</span>
                  <span style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{odemeTutari(m)}</span>
                  <span>{kapsamYetkisi && <Btn small variant="ghost" onClick={() => kapsamDisiBirak([m])} aria-label={`Kapsam dışı bırak: ${a.metin}`}>Kapsam dışı bırak</Btn>}</span>
                </div>
              );
            })}
          </div>
          )}
        </KartBolum>
      )}
      {tahsilatListesiAcik && !hesapsizTahsilat.adet && (
        <KartBolum varyant="kart" style={{ padding: 14 }} testId="hesapsiz-tahsilatlar">
          <BosDurum testId="bos-hesapsiz-tahsilat" baslik="Hesabı belirtilmemiş tahsilat yok" />
          <div style={{ marginTop: 8 }}>{topluDugme("tahsilat", [])}</div>
        </KartBolum>
      )}
      {tahsilatListesiAcik && hesapsizTahsilat.adet > 0 && (
        <KartBolum varyant="kart" style={{ padding: 0, overflow: "auto" }} testId="hesapsiz-tahsilatlar">
          <div style={{ minWidth: 850 }}>
            <div style={{ display: "flex", justifyContent: "flex-end", padding: "8px 14px 0" }}>{topluDugme("tahsilat", hesapsizTahsilat.liste)}</div>
            <div style={{ ...tIzgara, padding: "10px 14px", fontSize: 11.5, fontWeight: 700, color: "var(--n500, #64748b)", borderBottom: "1px solid var(--n200, #e2e8f0)" }}>
              <span>Tarih</span><span>Tür</span><span>Firma</span><span style={{ textAlign: "right" }}>Tutar</span><span>Hesap ata</span><span />
            </div>
            {hesapsizTahsilat.liste.map(k => {
              const uygun = secilebilirHesaplar(kasaHesaplari, k.currency || "TRY");
              const yazabilir = !!TAHSILAT_YAZICI[k.kaynak]?.[0];
              return (
                <div key={`${k.kaynak}-${k.kayit.id}`} data-testid="hesapsiz-tahsilat" style={{ ...tIzgara, padding: "8px 14px", fontSize: 13, borderTop: "1px solid var(--n150, #f1f5f9)" }}>
                  <span>{fmtTR(k.tarih)}</span>
                  <span>{k.turAdi}</span>
                  <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={k.firma}>{[k.firma, k.yontem].filter(Boolean).join(" · ")}{k.neden === "paraBirimi" ? " · hesabın para birimi uyuşmuyor" : k.neden === "hesapYok" ? " · hesabı bulunamadı" : ""}</span>
                  <span style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{para(k.tutar, k.currency)}</span>
                  <span>
                    {!yazabilir ? null : uygun.length ? (
                      <Select aria-label={`Hesap ata: ${k.firma}`} value="" onChange={e => hesapAta(k, uygun.find(h => String(h.id) === e.target.value)?.id)}>
                        <option value="">Hesap seçin</option>
                        {uygun.map(h => <option key={h.id} value={h.id}>{h.ad} ({HESAP_TUR_AD[h.tur] || h.tur})</option>)}
                      </Select>
                    ) : <span style={{ fontSize: 12, color: "var(--n500, #64748b)" }}>{k.currency || "TRY"} hesabı yok</span>}
                  </span>
                  <span>{kapsamYetkisi && <Btn small variant="ghost" onClick={() => kapsamDisiBirak([k])} aria-label={`Kapsam dışı bırak: ${k.firma}`}>Kapsam dışı bırak</Btn>}</span>
                </div>
              );
            })}
          </div>
        </KartBolum>
      )}
      {/* Spec 0058 R3, R18: kapsam dışı bırakılanlar ayrı bölümde, sayısıyla; sıfırken hiç çizilmez. */}
      {kapsamDisiAcik && kapsamDisiO && kapsamDisiO.toplam > 0 && (
        <KartBolum varyant="kart" style={{ padding: 0, overflow: "auto" }} testId="kapsam-disi-listesi">
          <div style={{ minWidth: 640 }}>
            <div style={{ ...oIzgara, padding: "10px 14px", fontSize: 11.5, fontWeight: 700, color: "var(--n500, #64748b)", borderBottom: "1px solid var(--n200, #e2e8f0)" }}>
              <span>Tarih</span><span>Tür</span><span>Açıklama</span><span style={{ textAlign: "right" }}>Tutar</span><span />
            </div>
            {[...kapsamDisiO.tahsilatListe.map(k => ({ anahtar: kapsamAnahtari(k), sat: k, tarih: k.tarih, tur: k.turAdi, metin: k.firma, tutar: para(k.tutar, k.currency) })),
              ...kapsamDisiO.odemeListe.map(m => { const a = satirAciklamasi({ hareket: m, tur: m.tur }); return { anahtar: kapsamAnahtari(m), sat: m, tarih: m.tarih, tur: a.tur, metin: a.metin, tutar: odemeTutari(m) }; })]
              .map(x => (
                <div key={x.anahtar} data-testid="kapsam-disi-kayit" style={{ ...oIzgara, padding: "8px 14px", fontSize: 13, borderTop: "1px solid var(--n150, #f1f5f9)" }}>
                  <span>{x.tarih ? fmtTR(x.tarih) : "Tarihsiz"}</span>
                  <span>{x.tur}</span>
                  <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={x.metin}>{x.metin}</span>
                  <span style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{x.tutar}</span>
                  <span>{kapsamYetkisi && <Btn small variant="ghost" onClick={() => kapsamaAl(x.sat)} aria-label={`Kapsama al: ${x.metin}`}>Kapsama al</Btn>}</span>
                </div>
              ))}
          </div>
        </KartBolum>
      )}

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
                const kullanim = hesapKullanimi(h.id, hesapHareketleri, veri);
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
                      {canDo("kasa_hesap") && kullanim > 0 && (
                        <span title={deneme ? "Deneme döneminde hareketi olan hesap da silinebilir." : "Hareketi olan hesap silinemez; kapatılabilir."} style={{ fontSize: 11, color: "var(--n500, #64748b)", alignSelf: "center" }}>{kullanim} hareket</span>
                      )}
                      {/* Spec 0056 R4, R6: deneme döneminde hareketli hesapta da silme (taşıma penceresiyle); dönem bitince kendiliğinden kalkar. */}
                      {canDo("kasa_hesap") && (kullanim === 0 || deneme) && (
                        <Btn small variant="danger" onClick={() => (kullanim === 0 ? setSilinecek(h) : setTasinacak(h))} title="Sil" aria-label={`Hesabı sil: ${h.ad}`}><Icon name="trash" size={12} /></Btn>
                      )}
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
                      <div key={`${s.tur}-${s.hareket?.id ?? s.tahsilat?.id ?? s.cek?.id}-${i}`} data-testid="hareket-satiri" style={{ ...hIzgara, padding: "8px 0", fontSize: 13, borderTop: "1px solid var(--n150, #f1f5f9)" }}>
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

      <CalisanAvanslari calisanlar={calisanlar} hesapHareketleri={hesapHareketleri} setHesapHareketleri={setHesapHareketleri} kasaHesaplari={kasaHesaplari}
        giderler={giderler} giderTurleri={giderTurleri} yururlukAy={yururlukAy} canDo={canDo} serverPermissions={serverPermissions} showToast={showToast} />
      </>)}

      {hesapFormu && (
        <HesapFormu hesap={hesapFormu.hesap} hesaplar={kasaHesaplari} hareketVar={!!hesapFormu.hesap && hesapKullanimi(hesapFormu.hesap.id, hesapHareketleri, veri) > 0}
          onKaydet={hesapKaydet} onClose={() => setHesapFormu(null)} />
      )}
      {virmanAcik && <VirmanFormu hesaplar={kasaHesaplari} onKaydet={virmanKaydet} onClose={() => setVirmanAcik(false)} />}
      {tasinacak && tasimaPlani && (
        <HesapSilPenceresi hesap={tasinacak} plan={tasimaPlani} onTasi={tasiVeSil} onHesapsiz={() => tasiVeSil(null)} onClose={() => setTasinacak(null)} />
      )}
      {silinecek && (
        <ConfirmDialog title="Hesap silinsin mi?" message={`“${silinecek.ad}” hesabının hiç hareketi yok; kalıcı olarak silinecek.`}
          confirmLabel="Hesabı Sil" onConfirm={sil} onCancel={() => setSilinecek(null)} />
      )}
      {/* Spec 0058 R4, Q5 (AC-6): toplu işlem o anda görünen listeyi etkiler; onay sayıyı ve eşiğin durumunu söyler. */}
      {topluOnay && (
        <ConfirmDialog title="Görünen kayıtlar kapsam dışı bırakılsın mı?" icon="check" confirmIcon="check" confirmLabel="Kapsam Dışı Bırak"
          message={[`${topluOnay.satirlar.length} ${topluOnay.tur === "odeme" ? "ödeme" : "tahsilat"} kaydı kapsam dışı bırakılacak.`,
            esik && !hepsiniGoster ? `Başlangıç tarihi süzgeci açık (${fmtTR(esik)}); yalnız listede görünen kayıtlar etkilenir.` : "Başlangıç tarihi süzgeci kapalı; listedeki bütün kayıtlar etkilenir.",
            KAPSAM_DISI_ACIKLAMA].join(" ")}
          onConfirm={() => { kapsamDisiBirak(topluOnay.satirlar, true); setTopluOnay(null); }} onCancel={() => setTopluOnay(null)} />
      )}
    </div>
  );
};
