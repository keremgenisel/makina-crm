import { useState, useMemo } from "react";
import { uid, fmtTR, fmtCur, today } from "../../lib/utils";
import { tl } from "../../lib/gider";
import { makeCanDo } from "../../lib/permissions";
import { logAction } from "../../lib/audit";
import {
  portfoySatirlari, baglanmamisCekTahsilatlari, cekDurumDegistir, cekKarsiliksiz, ciroIptal, ciroHareketleri, elleGecilebilir,
  CEK_DURUM, CEK_DURUM_AD, CEK_TURLERI, CEK_TUR_AD, PORTFOY_NOTU, BAGSIZ_TAHSIL_NOTU, bagsizCekSilinebilirMi, yeniBagsizCek, bagliCekler,
  VERILEN_DURUM, verilenCekSatirlari, verilenCekOdendi, verilenCekOdemeGeriAl, verilenCekKapat,
} from "../../lib/cek";
import { useLock } from "../../hooks/useLock";
import { useKilitListesi } from "../../hooks/useKilitListesi";
import { kilitRedMesaji } from "../../lib/kilitAlanlari";
import { CekEklePenceresi } from "./CekEklePenceresi";
import { hatirlatmaEsigi } from "../../lib/odemeHatirlatma";
import { Btn, Field, Input, Select, Modal, ConfirmDialog, Icon, LockConflict } from "../ui";
import { KartBolum, BosDurum, UyariSeridi, Segment, HataMetni, Ipucu } from "../tasarim";
import { tl2 } from "../gider/GiderAlanlari";
import { Rozet } from "../gider/DonemRaporu";
import { CiroPenceresi, cekPlaniniYaz } from "./CiroPenceresi";

// Kasa › Çek Portföyü (spec 0040 R3, R10–R17; Q5, Q10; AC-3–AC-5, AC-7, AC-14–AC-16, AC-26–AC-29). Elde bulunan çekler
// (portföyde + tahsile verildi) vade sırasıyla ve toplamıyla; süzgeçle diğer durumlar. Durum değişikliği `cust_payment_edit`,
// ciro ve ciro iptali `gider_odeme` ister; ciro edilmiş çekin karşılıksız işaretlenmesi ikisini birlikte ister.
const DURUM_SUZGECI = [
  { value: "elde", label: "Elde" }, { value: "portfoy", label: "Portföyde" }, { value: "tahsile", label: "Tahsile verildi" },
  { value: "tahsil", label: "Tahsil edildi" }, { value: "ciro", label: "Ciro edildi" }, { value: "karsiliksiz", label: "Karşılıksız" }, { value: "tumu", label: "Tümü" },
];
const DURUM_RENK = { portfoy: "mavi", tahsile: "camgobegi", tahsil: "yesil", ciro: "mor", karsiliksiz: "kirmizi", yazildi: "turuncu", odendi: "yesil", iptal: "gri" };
// Spec 0049 B (R13, R14): verilen çekler ayrı görünüm; süzgeç yazılmış (ödenmeyi bekleyen), ödenmiş, kapanmış.
const YON_SECENEKLERI = [{ value: "alinan", label: "Alınan çekler" }, { value: "verilen", label: "Verilen çekler" }];
const VERILEN_SUZGECI = [{ value: "yazildi", label: "Ödenmeyi bekleyen" }, { value: "odendi", label: "Ödendi" }, { value: "kapanan", label: "İptal / karşılıksız" }, { value: "tumu", label: "Tümü" }];
const VERILEN_DURUMLAR = { yazildi: new Set(["yazildi"]), odendi: new Set(["odendi"]), kapanan: new Set(["iptal", "karsiliksiz"]), tumu: new Set(["yazildi", "odendi", "iptal", "karsiliksiz"]) };

// R8, R10, R11 (AC-14, AC-15): verilen çekin durumu. Ödendi: bakiye o gün düşer; karşılıksız / iptal: kapattığı borç açılır.
const VerilenDurumPenceresi = ({ cek, hareketler, hesapAdi, onDegistir, onKapat, onClose }) => {
  const [tarih, setTarih] = useState(today());
  const [hata, setHata] = useState("");
  const [onay, setOnay] = useState(null); // "iptal" | "karsiliksiz"
  const dene = (r) => { if (r.hata) { setHata(r.hata); return; } onDegistir(r.cek); };
  const kapattigi = ciroHareketleri(cek.id, hareketler).length;
  return (
    <Modal title="Verilen Çek Durumu" onClose={onClose} maxWidth={560} footer={<Btn variant="ghost" onClick={onClose}>Kapat</Btn>}>
      <div data-testid="verilen-durum-penceresi">
        <div style={{ fontSize: 13, marginBottom: 10 }}>Çek <b>{cek.no} · {hesapAdi}</b> · {cek.alacakliAd} · şimdiki durum <b>{CEK_DURUM_AD[cek.durum]}</b></div>
        <Field label="Tarih"><Input aria-label="Durum tarihi" type="date" value={tarih} onChange={e => setTarih(e.target.value)} /></Field>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
          {cek.durum === VERILEN_DURUM.YAZILDI && <Btn small onClick={() => dene(verilenCekOdendi(cek, tarih))}>Ödendi (banka ödedi)</Btn>}
          {cek.durum === VERILEN_DURUM.ODENDI && <Btn small variant="ghost" onClick={() => dene(verilenCekOdemeGeriAl(cek, tarih))}>Ödemeyi Geri Al</Btn>}
          {cek.durum === VERILEN_DURUM.YAZILDI && <Btn small variant="danger" onClick={() => setOnay("iptal")}>İptal Et</Btn>}
          {cek.durum === VERILEN_DURUM.YAZILDI && <Btn small variant="danger" onClick={() => setOnay("karsiliksiz")}>Karşılıksız</Btn>}
        </div>
        <Ipucu>Ödendi işaretlenince çekin tutarı bu tarihte {hesapAdi} bakiyesinden düşer. İptal ya da karşılıksız çek, kapattığı {kapattigi} ödemeyi siler ve gider borcu yeniden açılır.</Ipucu>
        <HataMetni>{hata}</HataMetni>
      </div>
      {onay && (
        <ConfirmDialog title={onay === "iptal" ? "Çek iptal edilsin mi?" : "Çek karşılıksız işaretlensin mi?"} confirmLabel={onay === "iptal" ? "İptal Et" : "Karşılıksız İşaretle"}
          message="Çekin ödeme hareketleri silinir ve kapattığı gider borçları yeniden açılır."
          onConfirm={() => { const h = onay; setOnay(null); const r = verilenCekKapat(cek, hareketler, tarih, h); if (r.hata) setHata(r.hata); else onKapat(r); }} onCancel={() => setOnay(null)} />
      )}
    </Modal>
  );
};
const VerilenGecmisPenceresi = ({ cek, hesapAdi, hareketler, giderler, onClose }) => {
  const h = ciroHareketleri(cek.id, hareketler);
  const kalemAdi = (id) => { const k = giderler.find(x => String(x.id) === String(id)); return k ? (k.aciklama || k.calisanAd || fmtTR(k.tarih)) : "Silinmiş kalem"; };
  return (
    <Modal title="Verilen Çek Geçmişi" onClose={onClose} maxWidth={600} footer={<Btn variant="ghost" onClick={onClose}>Kapat</Btn>}>
      <div data-testid="verilen-cek-gecmisi" style={{ fontSize: 13 }}>
        <div style={{ marginBottom: 10 }}>Çek <b>{cek.no}</b> · {hesapAdi} · kime <b>{cek.alacakliAd}</b> · tutar {fmtCur(cek.tutar, "TRY")} · vade {cek.vadeTarihi ? fmtTR(cek.vadeTarihi) : "—"}{cek.aciklama ? ` · ${cek.aciklama}` : ""}</div>
        {(cek.gecmis || []).map((g, i) => (
          <div key={i} data-testid="cek-gecmis-satiri" style={{ display: "grid", gridTemplateColumns: "90px 130px 1fr", gap: 10, padding: "6px 0", borderTop: "1px solid var(--n150, #f1f5f9)" }}>
            <span>{fmtTR(g.tarih)}</span><b>{CEK_DURUM_AD[g.durum] || g.durum}</b><span>{g.not}</span>
          </div>
        ))}
        {h.length > 0 && (
          <div style={{ marginTop: 12 }} data-testid="verilen-kapatilan-kalemler">
            <b>Bu çekle kapatılan gider kalemleri</b>
            {h.map(x => <div key={x.id} style={{ padding: "4px 0" }}>{fmtTR(x.tarih)} · {kalemAdi(x.giderId)} · {tl2(x.tutar)}</div>)}
          </div>
        )}
      </div>
    </Modal>
  );
};

const DurumPenceresi = ({ satir, hareketler, izin, onDegistir, onKarsiliksiz, onCiroIptal, onClose }) => {
  const { cek } = satir;
  const [tarih, setTarih] = useState(today());
  const [not, setNot] = useState("");
  const [hata, setHata] = useState("");
  const [onay, setOnay] = useState(null); // "karsiliksiz" | "iptal"
  const ciro = cek.durum === CEK_DURUM.CIRO;
  const secenekler = elleGecilebilir(cek.durum).filter(d => d !== CEK_DURUM.KARSILIKSIZ);
  const dene = (hedef) => { const r = cekDurumDegistir(cek, hedef, tarih, not); if (r.hata) { setHata(r.hata); return; } onDegistir(r.cek); };
  const karsiliksizOlabilir = ciro ? izin.durum && izin.ciro : izin.durum && elleGecilebilir(cek.durum).includes(CEK_DURUM.KARSILIKSIZ);
  return (
    <Modal title="Çek Durumu" onClose={onClose} maxWidth={560} footer={<Btn variant="ghost" onClick={onClose}>Kapat</Btn>}>
      <div data-testid="cek-durum-penceresi">
        <div style={{ fontSize: 13, marginBottom: 10 }}>Çek <b>{cek.no} · {cek.banka}</b> · şimdiki durum <b>{CEK_DURUM_AD[cek.durum]}</b></div>
        <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 12 }}>
          <Field label="Tarih"><Input type="date" value={tarih} onChange={e => setTarih(e.target.value)} /></Field>
          <Field label="Not"><Input value={not} onChange={e => setNot(e.target.value)} placeholder="İsteğe bağlı" /></Field>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
          {izin.durum && secenekler.map(d => <Btn key={d} small variant="ghost" onClick={() => dene(d)}>{CEK_DURUM_AD[d]}</Btn>)}
          {/* AC-26: ciro edilmiş çekte "tahsil edildi" denenebilir ama motor nedenini yazarak reddeder (C2, çift sayım). */}
          {izin.durum && ciro && <Btn small variant="ghost" onClick={() => dene(CEK_DURUM.TAHSIL)}>Tahsil edildi</Btn>}
          {karsiliksizOlabilir && <Btn small variant="danger" onClick={() => setOnay("karsiliksiz")}>Karşılıksız</Btn>}
          {ciro && izin.ciro && <Btn small variant="danger" onClick={() => setOnay("iptal")}>Ciroyu İptal Et</Btn>}
        </div>
        {!izin.durum && <Ipucu>Çek durumunu değiştirme yetkiniz yok.</Ipucu>}
        {!satir.bilgi?.bagli && <Ipucu>{BAGSIZ_TAHSIL_NOTU}</Ipucu>}
        {ciro && <Ipucu>Ciro edilmiş çek elle tahsil edildi yapılamaz; ciro iptaliyle portföye döner ya da karşılıksız işaretlenir. Kapattığı {ciroHareketleri(cek.id, hareketler).length} ödeme bu işlemlerde silinir.</Ipucu>}
        <HataMetni>{hata}</HataMetni>
      </div>
      {onay === "karsiliksiz" && (
        <ConfirmDialog title="Çek karşılıksız işaretlensin mi?" confirmLabel="Karşılıksız İşaretle"
          message={!satir.bilgi?.bagli
            ? (ciro ? "Ciro ile kapattığı gider borçları yeniden açılır (ödeme hareketleri silinir). Çek portföye dönmez." : "Çek karşılıksız işaretlenir. Tahsilat kaydı olmadığı için gelir ya da müşteri borcu değişmez.")
            : ciro ? "Çekin tahsilatı gelirden çıkar ve ciro ile kapattığı gider borçları yeniden açılır (ödeme hareketleri silinir). Çek portföye dönmez." : "Çekin tahsilatı gelirden çıkar ve müşteri borcu yeniden açılır."}
          onConfirm={() => { setOnay(null); onKarsiliksiz(tarih); }} onCancel={() => setOnay(null)} />
      )}
      {onay === "iptal" && (
        <ConfirmDialog title="Ciro iptal edilsin mi?" confirmLabel="Ciroyu İptal Et" icon="refresh" confirmIcon="refresh"
          message="Çekin ödeme hareketleri silinir, kapattığı gider borçları yeniden açılır ve çek portföye döner."
          onConfirm={() => { setOnay(null); onCiroIptal(tarih); }} onCancel={() => setOnay(null)} />
      )}
    </Modal>
  );
};

// R12, AC-16, AC-35: kimden alındı, durum geçmişi (çek kaydından), kime ciro edildi ve hangi kalemleri kapattı (hareketlerden).
const GecmisPenceresi = ({ satir, musteriAdi, hareketler, giderler, onClose }) => {
  const { cek, bilgi } = satir;
  const ciroH = ciroHareketleri(cek.id, hareketler);
  const kalemAdi = (id) => { const k = giderler.find(x => String(x.id) === String(id)); return k ? (k.aciklama || k.calisanAd || fmtTR(k.tarih)) : "Silinmiş kalem"; };
  return (
    <Modal title="Çek Geçmişi" onClose={onClose} maxWidth={600} footer={<Btn variant="ghost" onClick={onClose}>Kapat</Btn>}>
      <div data-testid="cek-gecmisi" style={{ fontSize: 13 }}>
        <div style={{ marginBottom: 10 }}>Çek <b>{cek.no} · {cek.banka}</b>{cek.kesideci ? ` · keşideci ${cek.kesideci}` : ""} · {CEK_TUR_AD[cek.tur] || cek.tur}</div>
        <div style={{ marginBottom: 10 }}>Kimden: <b>{musteriAdi}</b> · alındı {fmtTR(bilgi.tarih)} · tutar {fmtCur(tl(bilgi.tutarK), bilgi.currency)} · vade {bilgi.vade ? fmtTR(bilgi.vade) : "girilmemiş"}{!bilgi.bagli && " · elle eklendi (tahsilat kaydı yok)"}</div>
        {(cek.gecmis || []).map((g, i) => (
          <div key={i} data-testid="cek-gecmis-satiri" style={{ display: "grid", gridTemplateColumns: "90px 130px 1fr", gap: 10, padding: "6px 0", borderTop: "1px solid var(--n150, #f1f5f9)" }}>
            <span>{fmtTR(g.tarih)}</span><b>{CEK_DURUM_AD[g.durum] || g.durum}</b><span>{g.not}</span>
          </div>
        ))}
        {ciroH.length > 0 && (
          <div style={{ marginTop: 12 }} data-testid="cek-ciro-kalemleri">
            <b>Ciro ile kapatılan gider kalemleri</b>
            {ciroH.map(h => <div key={h.id} style={{ padding: "4px 0" }}>{fmtTR(h.tarih)} · {kalemAdi(h.giderId)} · {tl2(h.tutar)}</div>)}
          </div>
        )}
      </div>
    </Modal>
  );
};

export const CekPortfoyu = ({
  cekler = [], setCekler, payments = [], customers = [], giderler = [], giderTurleri = [], tedarikciler = [], calisanlar = [],
  hesapHareketleri = [], setHesapHareketleri = null, giderAyarlari = {}, serverPermissions = null, showToast = () => {}, hesaplar = [],
  aktifKullanici,
}) => {
  const [yon, setYon] = useState("alinan");
  const [vSuzgec, setVSuzgec] = useState("yazildi");
  const [yaz, setYaz] = useState(false);
  const [vDurum, setVDurum] = useState(null);
  const [vGecmis, setVGecmis] = useState(null);
  const canGider = makeCanDo(serverPermissions, "giderActions");
  const canCust = makeCanDo(serverPermissions, "customerActions");
  const izin = { durum: canCust("cust_payment_edit") && !!setCekler, ciro: canGider("gider_odeme") && !!setCekler && !!setHesapHareketleri,
    // Spec 0049 R15 (Q8): bağsız çek ekleme, silme ve durumu gider_odeme ister.
    bagsiz: canGider("gider_odeme") && !!setCekler };
  const satirIzni = (s) => (s.bilgi?.bagli ? izin : { ...izin, durum: izin.bagsiz });
  const [ekle, setEkle] = useState(false);
  const [silinecek, setSilinecek] = useState(null);
  const [suzgec, setSuzgec] = useState("elde");
  const [tur, setTur] = useState("");
  const [ciroSatiri, setCiroSatiri] = useState(null);
  const [durumSatiri, setDurumSatiri] = useState(null);
  const [gecmisSatiri, setGecmisSatiri] = useState(null);
  // Spec 0064 R2, R25 (AC-4, AC-5): ciro, durum, geçmiş, silme ve verilen çekin durum / geçmiş pencereleri aynı çekin TEK
  // kilidini paylaşır (pencereleri açan burada). Yeni çek (Çek Ekle, kendi çekimizi yaz) kimliksizdir, kilit alınmaz.
  const kilitCekId = ciroSatiri?.cek?.id ?? durumSatiri?.cek?.id ?? gecmisSatiri?.cek?.id ?? silinecek?.cek?.id ?? vDurum?.id ?? vGecmis?.id ?? null;
  const { lockConflict: cekKilidi, forceAcquire: cekKilidiDevral } = useLock("cek", kilitCekId);
  const cekKilitli = !!(cekKilidi && kilitCekId != null);
  const kilitKapat = () => { setCiroSatiri(null); setDurumSatiri(null); setGecmisSatiri(null); setSilinecek(null); setVDurum(null); setVGecmis(null); };
  const kilitEkrani = cekKilitli && (
    <Modal title="Çek" onClose={kilitKapat}>
      <LockConflict lockedBy={cekKilidi.lockedBy} lockedAt={cekKilidi.lockedAt} onForce={cekKilidiDevral} onCancel={kilitKapat} />
    </Modal>
  );
  const bugun = today();
  const durumlar = suzgec === "elde" ? null : suzgec === "tumu" ? new Set(Object.values(CEK_DURUM)) : new Set([suzgec]);
  const { satirlar, toplamK } = useMemo(() => portfoySatirlari(cekler, payments, { durumlar, tur, bugun, esikGun: hatirlatmaEsigi(giderAyarlari) }),
    [cekler, payments, suzgec, tur, bugun, giderAyarlari]);
  const baglanmamis = baglanmamisCekTahsilatlari(payments, cekler).length;
  const musteriAdi = (id) => customers.find(c => String(c.id) === String(id))?.name || "Silinmiş müşteri";
  const kimden = (b) => (b.customerId != null ? musteriAdi(b.customerId) : b.kimden || "—");
  const ekleKaydet = (kayit) => {
    const cek = yeniBagsizCek(kayit, uid());
    setCekler(p => [...(p || []), cek]); log("olusturuldu", cek, { tutar: cek.tutar, bagsiz: true }); setEkle(false); showToast("Çek portföye eklendi.");
  };
  const sil = () => {
    const c = silinecek.cek;
    if (!bagsizCekSilinebilirMi(c)) { showToast("Ciro edilmiş çek silinemez; önce ciroyu iptal edin."); setSilinecek(null); return; }
    setCekler(p => p.filter(x => x.id !== c.id)); log("silindi", c); setSilinecek(null); showToast("Çek silindi.");
  };
  const cekYaz = (yeni) => setCekler(p => p.map(c => (c.id === yeni.id ? yeni : c)));
  const log = (action, cek, detail = {}) => logAction({ serverPermissions, action, entity: "cek", entityId: cek.id, entityName: `${cek.no} · ${cek.banka}`, detail });

  // Spec 0064 R36 (triyaj bulgu 2): ciro ve "Çek Yaz" seçilen gider kalemlerine ödeme hareketi yazar; kilitledikleri çekin
  // kendisidir. Kalemlerden biri başkasının elindeyse (ödeme penceresi, gider formu) kayıt anında reddedilir (R14 deseni);
  // yoksa iki kullanıcı aynı kalemi aynı anda kapatırdı (iki yeni hareket birleştirmeden sağ çıkar).
  const { baskasiKilitli } = useKilitListesi(aktifKullanici);
  const kalemKilidi = (plan) => {
    const k = baskasiKilitli("gider", (plan.hareketler || []).map(h => h.giderId));
    if (k) showToast(kilitRedMesaji(k), "err");
    return !!k;
  };
  const ciroKaydet = (plan) => {
    if (kalemKilidi(plan)) return;
    const hareketler = cekPlaniniYaz(plan, { setHesapHareketleri, setCekler });
    log("ciro_edildi", plan.cek, { hareket: hareketler.length, tutar: hareketler.reduce((a, h) => a + h.tutar, 0) });
    setCiroSatiri(null);
    showToast(plan.uyari ? "Çek ciro edildi. Fark hiçbir borcu kapatmadı." : "Çek ciro edildi.");
  };
  const durumYaz = (yeni) => { cekYaz(yeni); log("durum_degisti", yeni, { durum: yeni.durum }); setDurumSatiri(null); showToast(`Çek: ${CEK_DURUM_AD[yeni.durum]}.`); };
  const karsiliksiz = (tarih) => {
    const r = cekKarsiliksiz(durumSatiri.cek, hesapHareketleri || [], tarih);
    if (r.hata) { showToast(r.hata); return; }
    if (r.silinen.length) setHesapHareketleri(() => r.hareketler);
    cekYaz(r.cek); log("karsiliksiz", r.cek, { silinenHareket: r.silinen.length }); setDurumSatiri(null);
    showToast(r.silinen.length ? "Çek karşılıksız işaretlendi; ciro ile kapatılan borçlar yeniden açıldı." : "Çek karşılıksız işaretlendi.");
  };
  const iptal = (tarih) => {
    const r = ciroIptal(durumSatiri.cek, hesapHareketleri || [], tarih);
    if (r.hata) { showToast(r.hata); return; }
    setHesapHareketleri(() => r.hareketler);
    cekYaz(r.cek); log("ciro_iptal", r.cek); setDurumSatiri(null); showToast("Ciro iptal edildi; çek portföye döndü.");
  };
  const izgara = { display: "grid", gridTemplateColumns: "95px minmax(0, 1.3fr) minmax(0, 1fr) 90px 130px 130px 250px", gap: 10, alignItems: "center" };
  // ── Spec 0049 B: verilen çekler ──
  const esik = hatirlatmaEsigi(giderAyarlari);
  const verilen = useMemo(() => verilenCekSatirlari(cekler, { durumlar: VERILEN_DURUMLAR[vSuzgec], bugun, esikGun: esik }), [cekler, vSuzgec, bugun, esik]);
  const bekleyen = useMemo(() => verilenCekSatirlari(cekler, { bugun, esikGun: esik }), [cekler, bugun, esik]);
  const hesapAdi = (id) => hesaplar.find(h => String(h.id) === String(id))?.ad || "Silinmiş hesap";
  const yazKaydet = (plan) => {
    if (kalemKilidi(plan)) return;
    const hareketler = cekPlaniniYaz(plan, { setHesapHareketleri, setCekler });
    log("olusturuldu", plan.cek, { verilen: true, hareket: hareketler.length, tutar: plan.cek.tutar }); setYaz(false);
    showToast(plan.uyari ? "Çek yazıldı. Fark hiçbir borcu kapatmadı." : "Çek yazıldı; borç kapandı.");
  };
  const vDurumYaz = (yeni) => { cekYaz(yeni); log("durum_degisti", yeni, { durum: yeni.durum }); setVDurum(null); showToast(`Çek: ${CEK_DURUM_AD[yeni.durum]}.`); };
  const vKapat = (r) => {
    setHesapHareketleri(() => r.hareketler); cekYaz(r.cek); log("durum_degisti", r.cek, { durum: r.cek.durum, silinenHareket: r.silinen.length }); setVDurum(null);
    showToast("Çek kapandı; kapattığı gider borçları yeniden açıldı.");
  };
  const vIzgara = { display: "grid", gridTemplateColumns: "95px minmax(0, 1.1fr) minmax(0, 1.1fr) 130px 120px 170px", gap: 10, alignItems: "center" };
  const verilenGorunumu = (
    <>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ minWidth: 0, flex: "1 1 420px" }}><Segment ariaLabel="Verilen çek süzgeci" kip="dugme" genislik="icerik" options={VERILEN_SUZGECI} value={vSuzgec} onChange={setVSuzgec} /></div>
        {izin.ciro && <Btn small onClick={() => setYaz(true)}><Icon name="plus" size={13} /> Çek Yaz</Btn>}
      </div>
      <div data-testid="verilen-toplam" style={{ fontSize: 14 }}>
        Ödenmeyi bekleyen verilen çekler: <b>{fmtCur(tl(bekleyen.toplamK), "TRY")}</b>
        <span style={{ color: "var(--n500, #64748b)", fontSize: 12.5 }}> · {bekleyen.satirlar.filter(s => s.gecti).length} vadesi geçmiş · {bekleyen.satirlar.filter(s => s.yaklasan).length} yaklaşan ({esik} gün)</span>
      </div>
      {verilen.satirlar.length === 0 ? (
        <BosDurum testId="bos-verilen-cek" baslik={vSuzgec === "yazildi" ? "Ödenmeyi bekleyen verilen çek yok" : "Bu süzgeçte çek yok"} metin="Kendi çekimizle gider ödemek için “Çek Yaz” ya da gider formunda “Çek (kendi)” yöntemini kullanın." />
      ) : (
        <KartBolum varyant="kart" style={{ padding: 0, overflow: "auto" }} testId="verilen-cek-listesi">
          <div style={{ minWidth: 820 }}>
            <div style={{ ...vIzgara, padding: "10px 14px", fontSize: 11.5, fontWeight: 700, color: "var(--n500, #64748b)", borderBottom: "1px solid var(--n200, #e2e8f0)" }}>
              <span>Vade</span><span>Çek</span><span>Kime</span><span style={{ textAlign: "right" }}>Tutar</span><span>Durum</span><span />
            </div>
            {verilen.satirlar.map(s => (
              <div key={s.cek.id} data-testid="verilen-cek-satiri" style={{ ...vIzgara, padding: "9px 14px", fontSize: 13, borderTop: "1px solid var(--n150, #f1f5f9)",
                background: s.gecti ? "var(--redBg, #fef2f2)" : s.yaklasan ? "var(--ambBg, #fffbeb)" : "transparent" }}>
                <span>{s.vade ? fmtTR(s.vade) : "—"}{s.gecti && <div><Rozet renk="kirmizi">Vadesi geçti</Rozet></div>}{s.yaklasan && <div><Rozet renk="turuncu">Yaklaşıyor</Rozet></div>}</span>
                <span style={{ minWidth: 0 }}><b>{s.cek.no}</b> · {hesapAdi(s.cek.hesapId)}{s.cek.aciklama && <div style={{ fontSize: 11.5, color: "var(--n500, #64748b)" }}>{s.cek.aciklama}</div>}</span>
                <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.cek.alacakliAd}<div style={{ fontSize: 11.5, color: "var(--n500, #64748b)" }}>yazıldı {fmtTR(s.cek.tarih)}</div></span>
                <b style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmtCur(tl(s.tutarK), "TRY")}</b>
                <span><Rozet renk={DURUM_RENK[s.cek.durum]}>{CEK_DURUM_AD[s.cek.durum]}</Rozet></span>
                <span style={{ display: "flex", gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }}>
                  {izin.ciro && <Btn small variant="ghost" onClick={() => setVDurum(s.cek)}>Durum</Btn>}
                  <Btn small variant="ghost" onClick={() => setVGecmis(s.cek)}>Geçmiş</Btn>
                </span>
              </div>
            ))}
          </div>
        </KartBolum>
      )}
      {yaz && <CiroPenceresi kip="kendi" hesaplar={hesaplar} giderler={giderler} giderTurleri={giderTurleri} tedarikciler={tedarikciler} calisanlar={calisanlar}
        onKaydet={yazKaydet} onClose={() => setYaz(false)} />}
      {kilitEkrani}
      {vDurum && !cekKilitli && <VerilenDurumPenceresi cek={vDurum} hareketler={hesapHareketleri || []} hesapAdi={hesapAdi(vDurum.hesapId)} onDegistir={vDurumYaz} onKapat={vKapat} onClose={() => setVDurum(null)} />}
      {vGecmis && !cekKilitli && <VerilenGecmisPenceresi cek={vGecmis} hesapAdi={hesapAdi(vGecmis.hesapId)} hareketler={hesapHareketleri || []} giderler={giderler} onClose={() => setVGecmis(null)} />}
    </>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }} data-testid="cek-portfoyu">
      <div style={{ maxWidth: 380 }}><Segment ariaLabel="Çek yönü" kip="sekme" options={YON_SECENEKLERI} value={yon} onChange={setYon} /></div>
      {yon === "verilen" ? verilenGorunumu : (<>
      <UyariSeridi aile="bilgi" testId="portfoy-notu">{PORTFOY_NOTU}{baglanmamis > 0 && <> <b>{baglanmamis}</b> eski çek tahsilatı çek kaydına bağlı değil; bağlamak için tahsilatı müşteri detayından düzenleyin.</>}</UyariSeridi>
      {izin.bagsiz && <div style={{ display: "flex", justifyContent: "flex-end" }}><Btn small onClick={() => setEkle(true)}><Icon name="plus" size={13} /> Çek Ekle</Btn></div>}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ minWidth: 0, flex: "1 1 520px" }}><Segment ariaLabel="Çek durumu süzgeci" kip="dugme" genislik="icerik" options={DURUM_SUZGECI} value={suzgec} onChange={setSuzgec} /></div>
        <div style={{ width: 170 }}><Select aria-label="Çek türü süzgeci" value={tur} onChange={e => setTur(e.target.value)}>
          <option value="">Tüm türler</option>{CEK_TURLERI.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</Select></div>
      </div>
      <div data-testid="portfoy-toplam" style={{ fontSize: 14 }}>
        Elde bulunan toplam: {Object.keys(toplamK).length ? Object.entries(toplamK).map(([pb, k]) => <b key={pb} style={{ marginRight: 10 }}>{fmtCur(tl(k), pb)}</b>) : <b>—</b>}
        <span style={{ color: "var(--n500, #64748b)", fontSize: 12.5 }}> · {satirlar.filter(s => s.gecti).length} vadesi geçmiş · {satirlar.filter(s => s.yaklasan).length} yaklaşan ({hatirlatmaEsigi(giderAyarlari)} gün)</span>
      </div>
      {satirlar.length === 0 ? (
        <BosDurum testId="bos-cek-portfoyu" baslik={suzgec === "elde" ? "Elde çek yok" : "Bu süzgeçte çek yok"} metin="Çekle tahsilat müşteri detayındaki ödeme formundan girilir; tahsilatı olmayan bir çek “Çek Ekle” ile portföye eklenir." />
      ) : (
        <KartBolum varyant="kart" style={{ padding: 0, overflow: "auto" }} testId="cek-listesi">
          <div style={{ minWidth: 940 }}>
            <div style={{ ...izgara, padding: "10px 14px", fontSize: 11.5, fontWeight: 700, color: "var(--n500, #64748b)", borderBottom: "1px solid var(--n200, #e2e8f0)" }}>
              <span>Vade</span><span>Çek</span><span>Kimden</span><span>Tür</span><span style={{ textAlign: "right" }}>Tutar</span><span>Durum</span><span />
            </div>
            {satirlar.map(s => {
              const tlDisi = s.currency !== "TRY";
              return (
                <div key={s.cek.id} data-testid="cek-satiri" style={{ ...izgara, padding: "9px 14px", fontSize: 13, borderTop: "1px solid var(--n150, #f1f5f9)",
                  background: s.gecti ? "var(--redBg, #fef2f2)" : s.yaklasan ? "var(--ambBg, #fffbeb)" : "transparent" }}>
                  <span>{s.vade ? fmtTR(s.vade) : "—"}{s.gecti && <div><Rozet renk="kirmizi">Vadesi geçti</Rozet></div>}{s.yaklasan && <div><Rozet renk="turuncu">Yaklaşıyor</Rozet></div>}</span>
                  <span style={{ minWidth: 0 }}><b>{s.cek.no}</b> · {s.cek.banka}{s.cek.kesideci && <div style={{ fontSize: 11.5, color: "var(--n500, #64748b)" }}>Keşideci: {s.cek.kesideci}</div>}</span>
                  <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{kimden(s.bilgi)}<div style={{ fontSize: 11.5, color: "var(--n500, #64748b)" }}>alındı {fmtTR(s.bilgi.tarih)}{!s.bilgi.bagli && " · elle eklendi"}</div></span>
                  <span>{CEK_TUR_AD[s.cek.tur] || s.cek.tur}</span>
                  <b style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmtCur(tl(s.tutarK), s.currency)}</b>
                  <span><Rozet renk={DURUM_RENK[s.cek.durum]}>{CEK_DURUM_AD[s.cek.durum]}</Rozet></span>
                  <span style={{ display: "flex", gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }}>
                    {s.cek.durum === CEK_DURUM.PORTFOY && izin.ciro && (tlDisi
                      ? <span title="Gider ödemeleri TL'dir." style={{ fontSize: 11.5, color: "var(--n500, #64748b)" }}><Btn small variant="ghost" disabled>Ciro Et</Btn> yalnız TL çek</span>
                      : <Btn small onClick={() => setCiroSatiri(s)}>Ciro Et</Btn>)}
                    {(satirIzni(s).durum || izin.ciro) && <Btn small variant="ghost" onClick={() => setDurumSatiri(s)}>Durum</Btn>}
                    <Btn small variant="ghost" onClick={() => setGecmisSatiri(s)}>Geçmiş</Btn>
                    {!s.bilgi.bagli && izin.bagsiz && <Btn small variant="ghost" onClick={() => setSilinecek(s)}>Sil</Btn>}
                  </span>
                </div>
              );
            })}
          </div>
        </KartBolum>
      )}
      {kilitEkrani}
      {ciroSatiri && !cekKilitli && <CiroPenceresi satir={ciroSatiri} giderler={giderler} giderTurleri={giderTurleri} tedarikciler={tedarikciler} calisanlar={calisanlar}
        onKaydet={ciroKaydet} onClose={() => setCiroSatiri(null)} />}
      {durumSatiri && !cekKilitli && <DurumPenceresi satir={durumSatiri} hareketler={hesapHareketleri || []} izin={satirIzni(durumSatiri)} onDegistir={durumYaz} onKarsiliksiz={karsiliksiz} onCiroIptal={iptal} onClose={() => setDurumSatiri(null)} />}
      {ekle && <CekEklePenceresi cekler={bagliCekler(cekler, payments)} customers={customers} onKaydet={ekleKaydet} onClose={() => setEkle(false)} />}
      {silinecek && !cekKilitli && <ConfirmDialog title="Çek silinsin mi?" confirmLabel="Sil"
        message={silinecek.cek.durum === CEK_DURUM.CIRO ? "Ciro edilmiş çek silinemez; önce ciroyu iptal edin." : `Çek ${silinecek.cek.no} · ${silinecek.cek.banka} portföyden kalıcı olarak silinir.`}
        onConfirm={sil} onCancel={() => setSilinecek(null)} />}
      {gecmisSatiri && !cekKilitli && <GecmisPenceresi satir={gecmisSatiri} musteriAdi={kimden(gecmisSatiri.bilgi)} hareketler={hesapHareketleri || []} giderler={giderler} onClose={() => setGecmisSatiri(null)} />}
      </>)}
    </div>
  );
};
