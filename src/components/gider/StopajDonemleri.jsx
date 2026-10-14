import { useMemo, useState } from "react";
import { fmtTR } from "../../lib/utils";
import { tl, kurus, tutarCoz } from "../../lib/gider";
import { cokKalemOdemeleri, secilebilirHesaplar, sonKullanilanHesap, sonKullanilanYontem } from "../../lib/kasa";
import { stopajDonemleri, STOPAJ_DURUM_AD, SATIRSIZ_STOPAJ_NEDENI, DONEM_KAPANMADI, VADE_FARKLI } from "../../lib/stopajDonemi";
import { kilitRedMesaji } from "../../lib/kilitAlanlari";
import { Btn, Modal, Field, Input, Select } from "../ui";
import { BosDurum, HataMetni, Ipucu } from "../tasarim";
import { TutarInput, tl2, tutarMetni, ODEME_SECENEKLERI } from "./GiderAlanlari";

// Spec 0084 R12–R19: Kira stopajı beyan dönemleri penceresi. Dönemden bağımsızdır (bir beyan dönemi üç ayı kapsar). Kapsam
// borç özetiyle aynı tek kural (stopajDonemleri). "Dönemi öde" dönemin açık stopaj ÖDEME SATIRLARINI tek tarih, tek hesap,
// tek yöntem ve tek açıklamayla öder: satır başına bir ödeme hareketi (0024 korunur), ya hep ya hiç (kasa.cokKalemOdemeleri).
// Satırsız (eski) kalemin stopajı ödenemez, salt okunur görünür (R17). Pencere kilit tutmaz; kayıt anında dönemin kalemlerinin
// gider kilidine anlık bakılır (R19, 0064'ün toplu işlem kuralı). Listeler sayfalanmaz (C6: yılda dört dönem).
const izgara = { display: "grid", gridTemplateColumns: "minmax(0, 2fr) repeat(3, minmax(0, 1fr)) 96px 44px 96px 104px", gap: 10, alignItems: "center" };
const odemeIzgara = { display: "grid", gridTemplateColumns: "minmax(0, 1.6fr) 90px 70px 90px minmax(0, 1fr) 150px", gap: 10, alignItems: "center" };
const rozet = (metin, renk = "var(--n600, #475569)", zemin = "var(--n100, #f1f5f9)") => (
  <span key={metin} style={{ fontSize: 11, fontWeight: 700, color: renk, background: zemin, borderRadius: 6, padding: "1px 6px", whiteSpace: "nowrap" }}>{metin}</span>);
// İşaretler dönem adının altında, kendi satırında (dar sütunda adın yanına sığmaz).
const isaretler = (d) => (d.kapanmadi || d.vadeFarkli ? (
  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 3 }}>{d.kapanmadi && rozet(DONEM_KAPANMADI)}{d.vadeFarkli && rozet(VADE_FARKLI, "var(--orTx, #c2410c)", "var(--ambBg3, #fff7ed)")}</div>) : null);
const durumRengi = { odendi: "var(--grn700, #15803d)", kismen: "var(--orTx, #c2410c)", acik: "var(--n700, #334155)", gecti: "var(--red700, #b91c1c)" };
const YONTEMLER = ODEME_SECENEKLERI.filter(o => o.value !== "Çek"); // X7: toplu stopaj ödemesinde çek yöntemi yok
// Triyaj bulgu 1: son kullanılan yöntem listede yoksa (ör. düz "Çek") varsayılan boştur; ekranda görünen ile kayda giden aynı kalır.
const varsayilanYontem = (hareketler) => { const y = sonKullanilanYontem(hareketler) || ""; return YONTEMLER.some(o => o.value === y) ? y : ""; };

export const StopajDonemleri = ({ giderler = [], turler = [], turMap, yururlukAy = null, ayar, bugun, hesaplar = [], hesapSecimi = false, hareketler = [],
  odemeYetkisi = false, baskasiKilitli = () => null, onKaydet, onClose }) => {
  const sonuc = useMemo(() => stopajDonemleri(giderler, { turler, yururlukAy, ayar }, bugun), [giderler, turler, yururlukAy, ayar, bugun]);
  const [kapanmislar, setKapanmislar] = useState(false);
  const [secili, setSecili] = useState(null); // dönem anahtarı (ödeme kipi)
  const donem = secili ? sonuc.donemler.find(d => d.anahtar === secili) : null;
  const gorunen = sonuc.donemler.filter(d => kapanmislar || d.acikK > 0);
  const kapanmisSayisi = sonuc.donemler.length - sonuc.donemler.filter(d => d.acikK > 0).length;

  const uygunHesaplar = useMemo(() => secilebilirHesaplar(hesaplar, "TRY"), [hesaplar]);
  const [giris, setGiris] = useState(null);
  const [hatalar, setHatalar] = useState({ genel: null, satir: {} });
  const odemeyeGec = (d) => {
    setSecili(d.anahtar);
    setHatalar({ genel: null, satir: {} });
    setGiris({ tarih: bugun, hesapId: hesapSecimi ? (sonKullanilanHesap(hareketler, hesaplar) ?? "") : "", yontem: varsayilanYontem(hareketler), aciklama: "",
      tutarlar: Object.fromEntries(d.satirlar.filter(s => !s.satirsiz).map(s => [s.anahtar, tutarMetni(tl(s.kalanK))])) });
  };
  const odenebilir = donem ? donem.satirlar.filter(s => !s.satirsiz) : [];
  const girilenK = (a) => { const t = tutarCoz(giris?.tutarlar?.[a] ?? ""); return t.gecersiz || t.bos ? 0 : kurus(t.deger); };
  const toplamK = odenebilir.reduce((t, s) => t + girilenK(s.anahtar), 0);

  const kaydet = () => {
    const satir = {};
    for (const s of odenebilir) if (tutarCoz(giris.tutarlar[s.anahtar] ?? "").gecersiz) satir[s.anahtar] = ["Tutar sayıya çevrilemedi. Örnek: 12.500,00"];
    if (Object.keys(satir).length) { setHatalar({ genel: null, satir }); return; }
    const dagitim = odenebilir.map(s => ({ anahtar: s.anahtar, tutarK: girilenK(s.anahtar) })).filter(d => d.tutarK > 0);
    if (!giris.tarih) { setHatalar({ genel: "Ödeme tarihi girilmedi.", satir: {} }); return; }
    if (!dagitim.length) { setHatalar({ genel: "En az bir satıra ödeme tutarı girin.", satir: {} }); return; }
    // R19, AC-28: başkasının açtığı tek kalem varsa işlem bütünüyle reddedilir; neden o kalemin adıyla.
    for (const d of dagitim) {
      const s = odenebilir.find(x => x.anahtar === d.anahtar);
      const k = baskasiKilitli("gider", s.giderId);
      if (k) { setHatalar({ genel: kilitRedMesaji(k, s.kalem.aciklama || String(s.giderId)), satir: {} }); return; }
    }
    const plan = cokKalemOdemeleri({ satirlar: dagitim, adaylar: odenebilir, tarih: giris.tarih, hesapId: giris.hesapId === "" ? null : giris.hesapId, hesaplar,
      yontem: giris.yontem, aciklama: String(giris.aciklama || "").trim() || donem.odemeAciklamasi, turMap });
    if (plan.hatalar) { setHatalar({ genel: "Hiçbir ödeme kaydedilmedi; satırlardaki hataları düzeltin.", satir: plan.satirHatalari || {} }); return; }
    onKaydet(plan.hareketler, donem);
    setSecili(null); setGiris(null);
  };

  const liste = (
    <>
      <div data-testid="stopaj-donem-toplam" style={{ fontSize: 13, color: "var(--n600, #475569)", marginBottom: 10 }}>
        Kesilen <b>{tl2(tl(sonuc.toplam.kesilenK))}</b> · Ödenen <b>{tl2(tl(sonuc.toplam.odenenK))}</b> · Açık <b>{tl2(tl(sonuc.toplam.acikK))}</b>
      </div>
      {!gorunen.length ? <BosDurum testId="bos-stopaj-donemleri" baslik={sonuc.donemler.length ? "Açık stopaj dönemi yok" : "Stopajlı kira kalemi yok"} /> : (
        <div data-testid="stopaj-donem-listesi">
          <div style={{ ...izgara, fontSize: 11, fontWeight: 700, color: "var(--n500, #64748b)", padding: "0 0 4px" }}>
            <span>Dönem</span><span style={{ textAlign: "right" }}>Kesilen</span><span style={{ textAlign: "right" }}>Ödenen</span><span style={{ textAlign: "right" }}>Açık</span><span>Ödeme tarihi</span><span style={{ textAlign: "right" }}>Satır</span><span>Durum</span><span />
          </div>
          {gorunen.map(d => (
            <div key={d.anahtar} data-testid={`stopaj-donem-${d.anahtar}`} style={{ borderTop: "1px solid var(--n150, #f1f5f9)", padding: "6px 0" }}>
              <div style={{ ...izgara, fontSize: 13 }}>
                <span><b>{d.donemAdi}</b>{isaretler(d)}</span>
                <span style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{tl2(tl(d.kesilenK))}</span>
                <span style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{tl2(tl(d.odenenK))}</span>
                <b style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{tl2(tl(d.acikK))}</b>
                <span>{fmtTR(d.odemeTarihi)}</span>
                <span data-testid="stopaj-donem-satir" style={{ textAlign: "right" }}>{d.satirSayisi}</span>
                <span data-testid="stopaj-donem-durum" style={{ fontSize: 12, fontWeight: 700, color: durumRengi[d.durum] }}>{STOPAJ_DURUM_AD[d.durum]}</span>
                <span style={{ textAlign: "right" }}>{odemeYetkisi && d.satirlar.some(s => !s.satirsiz) && <Btn small variant="ghost" onClick={() => odemeyeGec(d)}>Dönemi öde</Btn>}</span>
              </div>
              {d.satirlar.filter(s => s.satirsiz).map(s => (
                <div key={s.anahtar} data-testid="stopaj-satirsiz" style={{ fontSize: 12, color: "var(--n600, #475569)", marginTop: 4 }}>
                  {s.kalem.aciklama || "Kira kalemi"} · {tl2(tl(s.kalanK))} · {SATIRSIZ_STOPAJ_NEDENI}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
      {kapanmisSayisi > 0 && (
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, marginTop: 10, cursor: "pointer" }}>
          <input type="checkbox" checked={kapanmislar} onChange={e => setKapanmislar(e.target.checked)} /> Kapanmış dönemleri göster ({kapanmisSayisi})
        </label>
      )}
      {!odemeYetkisi && <Ipucu>Ödeme kaydetme yetkiniz yok ya da sunucu ödeme kayıtlarını tanımıyor; dönemler yalnız görüntülenir.</Ipucu>}
      <Ipucu>Stopaj gider kalemi değildir: brüt kira zaten gider toplamındadır; burada yalnız vergi dairesine yapılan ödeme izlenir.</Ipucu>
    </>
  );

  const odeme = donem && giris && (
    <div data-testid="stopaj-donem-odeme">
      <div style={{ fontSize: 13, color: "var(--n600, #475569)", marginBottom: 10 }}>
        <b style={{ color: "var(--n900, #0f172a)" }}>{donem.donemAdi}</b> · ödeme tarihi {fmtTR(donem.odemeTarihi)}{isaretler(donem)}
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <div style={{ width: 170 }}><Field label="Ödeme tarihi"><Input aria-label="Ödeme tarihi" type="date" value={giris.tarih} onChange={e => setGiris(g => ({ ...g, tarih: e.target.value }))} /></Field></div>
        {hesapSecimi && (
          <div style={{ flex: "1 1 180px" }}><Field label="Hesap">
            <Select aria-label="Hesap" value={giris.hesapId} onChange={e => { const v = e.target.value; setGiris(g => ({ ...g, hesapId: v === "" ? "" : (hesaplar.find(x => String(x.id) === v)?.id ?? "") })); }}>
              <option value="">Hesap belirtilmemiş</option>
              {uygunHesaplar.map(h => <option key={h.id} value={h.id}>{h.ad}</option>)}
            </Select></Field></div>
        )}
        <div style={{ width: 170 }}><Field label="Yöntem">
          <Select aria-label="Yöntem" value={giris.yontem} onChange={e => setGiris(g => ({ ...g, yontem: e.target.value }))}>
            {YONTEMLER.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select></Field></div>
        <div style={{ flex: "1 1 220px" }}><Field label="Açıklama">
          <Input aria-label="Açıklama" placeholder={donem.odemeAciklamasi} value={giris.aciklama} onChange={e => setGiris(g => ({ ...g, aciklama: e.target.value }))} /></Field></div>
      </div>
      <div style={{ ...odemeIzgara, fontSize: 11, fontWeight: 700, color: "var(--n500, #64748b)", padding: "4px 0" }}>
        <span>Kalem</span><span>Gider tarihi</span><span>Taksit</span><span>Vade</span><span style={{ textAlign: "right" }}>Açık</span><span style={{ textAlign: "right" }}>Ödenecek</span>
      </div>
      {donem.satirlar.map(s => (
        <div key={s.anahtar} data-testid="stopaj-odeme-satiri" style={{ borderTop: "1px solid var(--n150, #f1f5f9)", padding: "5px 0" }}>
          <div style={{ ...odemeIzgara, fontSize: 13 }}>
            <span>{s.kalem.aciklama || "Kira kalemi"}</span>
            <span>{fmtTR(s.kalem.tarih)}</span>
            <span>{s.toplamAdet > 1 ? `${s.sira}/${s.toplamAdet}` : "—"}</span>
            <span>{s.vade ? fmtTR(s.vade) : "—"}</span>
            <span style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{tl2(tl(s.kalanK))}</span>
            <span>{s.satirsiz ? <span style={{ fontSize: 12, color: "var(--n500, #64748b)" }}>Seçilemez</span>
              : <TutarInput ariaLabel={`${s.kalem.aciklama || "Kira kalemi"} ödenecek tutar`} value={giris.tutarlar[s.anahtar] ?? ""} onChange={v => setGiris(g => ({ ...g, tutarlar: { ...g.tutarlar, [s.anahtar]: v } }))} />}</span>
          </div>
          {s.satirsiz && <Ipucu>{SATIRSIZ_STOPAJ_NEDENI}</Ipucu>}
          {(hatalar.satir[s.anahtar] || []).map(h => <HataMetni key={h}>{h}</HataMetni>)}
        </div>
      ))}
      <div data-testid="stopaj-odeme-toplam" style={{ textAlign: "right", fontSize: 13, marginTop: 8 }}>Toplam ödeme: <b>{tl2(tl(toplamK))}</b></div>
      <HataMetni>{hatalar.genel}</HataMetni>
      <Ipucu>Her satır için ayrı bir ödeme kaydı yazılır (bir ödeme bir kalemi kapatır); açıklama boşsa dönemin adı yazılır.</Ipucu>
    </div>
  );

  return (
    <Modal title="Kira stopajı beyan dönemleri" onClose={onClose} wide
      footer={odeme
        ? <><Btn variant="ghost" onClick={() => { setSecili(null); setGiris(null); }}>Vazgeç</Btn><Btn onClick={kaydet}>Ödemeyi kaydet</Btn></>
        : <Btn variant="ghost" onClick={onClose}>Kapat</Btn>}>
      {odeme || liste}
    </Modal>
  );
};
