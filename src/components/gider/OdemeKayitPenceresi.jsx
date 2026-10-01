import { useState, useMemo } from "react";
import { fmtTR, uid } from "../../lib/utils";
import { odemeDurumu, tl, HEDEF, DAVRANIS } from "../../lib/gider";
import { mahsupKapsamda, avansBorcuK, secilebilirHesaplar, sonKullanilanHesap, sonKullanilanYontem } from "../../lib/kasa";
import { CIRO_YONTEMI } from "../../lib/cek";
import { formOdemeHedefleri, odemeGirisiHazirla, ciroCekleri, ciroAlacaklisi } from "../../lib/formOdemesi";
import { Btn, Modal, Icon } from "../ui";
import { Ipucu } from "../tasarim";
import { tl2, hedefAdi, cokHedefliMi } from "./GiderAlanlari";
import { OdemeGirisi, ilkGiris, MAHSUP_KILITLI_HATASI } from "./OdemeGirisi";

// Ödeme kayıt penceresi (spec 0024 R2, R17, R18; 0041; 0053 R10, R17). Listedeki ödeme anahtarı, kira anahtarları, Ödeme
// Planı satırları ve Anasayfa hatırlatıcısındaki "Ödendi" bu pencereyi açar. Spec 0053 R17: pencere, gider formundaki ödeme
// editörünün (OdemeGirisi) tek kalem kapsamında açılan hâlidir; doğrulama ve hareket üretimi formla AYNI fonksiyondur
// (odemeGirisiHazirla). Hedef verilerek açılınca o hedefe iner (plan Q5). Çek yöntemleri ("Çek (ciro)", "Çek (kendi)")
// satırın yöntemidir (R10; eski "Kendi çekiyle öde" düğmesi kalktı). onKaydet({ hareketler, cek }) alır.
// kalem: odemeleriUygula'dan geçmiş (zenginleştirilmiş) kalem. hedef: {taksitId} ya da {hedef: "ana"|"stopaj"|"elden"} ya da null.
export const OdemeKayitPenceresi = ({
  kalem, davranis, turAd, turMap, hedef = null, hareketler = [], hesaplar = [], hesapSecimi = false, odemeYetkisi = false, bugun,
  onKaydet, onSil, onClose,
  // Spec 0024 B (R10, B1, B2): personel kaleminde çalışanın açık avansı varsa "Avanstan mahsup" kipi (giderler: avans borcu).
  giderler = [], yururlukAy = null,
  // Spec 0053 R10, R14: çek yöntemleri yalnız kasa yetkisiyle; tedarikciler alacaklının adı için (ciro "kime" ister).
  cekler = [], payments = [], ciroYetkisi = false, tedarikciler = [],
}) => {
  // Spec 0057 R1 (C2): pencerenin kuralı; kayıtlı kalemi öder, hiçbir hedef pasif değildir.
  const tumHedefler = useMemo(() => formOdemeHedefleri(kalem, turMap).map(h => ({ ...h, pasif: false, neden: null })), [kalem, turMap]);
  // Plan Q5: hedef verilince o hedef; taksit verilince o taksitin hedefi; yoksa bütün hedefler.
  const hedefSecimi = hedef?.taksitId != null ? ((kalem.taksitler || []).find(r => String(r.id) === String(hedef.taksitId))?.hedef || HEDEF.ANA) : hedef?.hedef || null;
  const hedefler = useMemo(() => {
    const s = hedefSecimi ? tumHedefler.filter(h => h.hedef === hedefSecimi) : tumHedefler;
    return s.length ? s : tumHedefler;
  }, [tumHedefler, hedefSecimi]);
  const kalanK = hedefler.reduce((a, h) => a + h.kalanK, 0);
  const avansK = davranis === DAVRANIS.PERSONEL && kalem.calisanId != null ? avansBorcuK(kalem.calisanId, hareketler, giderler) : 0;
  // 0024 triyaj bulgu 2: kapsam dışı (gelecek tarihli / yürürlük öncesi) maaş kalemine mahsup kipi açılmaz.
  const mahsupVar = odemeYetkisi && avansK > 0 && kalanK > 0 && mahsupKapsamda(kalem, { bugun, yururlukAy });
  const uygunHesaplar = useMemo(() => secilebilirHesaplar(hesaplar, "TRY"), [hesaplar]);
  const varsayilanHesap = hesapSecimi ? (sonKullanilanHesap(hareketler, hesaplar) ?? "") : "";
  const varsayilanYontem = sonKullanilanYontem(hareketler);
  const [giris, setGiris] = useState(() => ilkGiris(hedefler, { tarih: bugun, yontem: varsayilanYontem, hesapId: varsayilanHesap, taksitId: hedef?.taksitId ?? null, kalem }));
  const [hatalar, setHatalar] = useState(null);
  const cekSatirlari = useMemo(() => (ciroYetkisi ? ciroCekleri(cekler, payments) : []), [ciroYetkisi, cekler, payments]);
  const alacakli = ciroAlacaklisi(kalem, turMap);
  const alacakliSerbest = alacakli.tur === "serbest";
  const alacakliAd = alacakli.tur === "calisan" ? (kalem.calisanAd || "") : alacakli.tur === "tedarikci" ? (tedarikciler.find(t => String(t.id) === String(kalem.tedarikciId))?.ad || "") : (giris.alacakliAd || "");
  const iki = cokHedefliMi(kalem, davranis); // spec 0054 R16
  const baglam = { turMap, hesaplar, cekler, payments, hareketler, giderler, bugun, yururlukAy, alacakliAd, bosAtla: true, hedefAdi: (h) => hedefAdi(h, davranis, iki) };
  // 0040 R8: ciro fark uyarısı kayıttan önce de görünür (motordan olduğu gibi).
  const ciroSecili = giris.kip !== "mahsup" && giris.satirlar.some(r => r.yontem === CIRO_YONTEMI && r.cekId != null);
  const ciroUyarisi = useMemo(() => (ciroSecili ? odemeGirisiHazirla(kalem, { ...baglam, tarih: giris.tarih, kip: "odeme", satirlar: giris.satirlar }).uyari : null),
    [ciroSecili, kalem, giris, cekler, payments, alacakliAd]);
  const kaydet = () => {
    if (mahsupVar && giris.kip === "mahsup" && giris.mahsupKilitli) { setHatalar({ genel: [MAHSUP_KILITLI_HATASI] }); return; } // spec 0064 R20
    const r = odemeGirisiHazirla(kalem, { ...baglam, tarih: giris.tarih, kip: mahsupVar ? giris.kip : "odeme", satirlar: giris.satirlar, mahsup: giris.mahsup, yeniCekId: uid() });
    if (!r.hareketler) { setHatalar(r.hatalar); return; }
    if (!r.hareketler.length) { setHatalar({ ...r.hatalar, genel: ["En az bir satırın tutarını girin."] }); return; }
    onKaydet({ hareketler: r.hareketler, cek: r.cek });
  };
  const durum = odemeDurumu(kalem);
  const formVar = odemeYetkisi && kalanK > 0;
  const mahsupKipi = mahsupVar && giris.kip === "mahsup";

  return (
    <Modal title="Ödeme Kaydet" onClose={onClose} wide
      footer={<>
        <Btn variant="ghost" onClick={onClose}>{formVar ? "Vazgeç" : "Kapat"}</Btn>
        {formVar && <Btn onClick={kaydet}><Icon name="check" size={14} /> {mahsupKipi ? "Mahsubu Kaydet" : "Ödemeyi Kaydet"}</Btn>}
      </>}>
      <div data-testid="odeme-kayit-penceresi">
        <div style={{ fontSize: 13, color: "var(--n600, #475569)", marginBottom: 12 }}>
          <b style={{ color: "var(--n900, #0f172a)" }}>{turAd}</b> · {fmtTR(kalem.tarih)}{kalem.aciklama || kalem.calisanAd ? ` · ${kalem.aciklama || kalem.calisanAd}` : ""}
          <div style={{ marginTop: 4 }} data-testid="odeme-kayit-ozet">
            Durum: <b>{durum === "odendi" ? "Ödendi" : durum === "kismen" ? "Kısmen ödendi" : "Ödenmedi"}</b>
            {formVar && <> · {hedefSecimi || hedefler.length === 1 ? "Bu hedefin kalanı" : "Kalan"}: <b>{tl2(tl(kalanK))}</b></>}
          </div>
          {avansK > 0 && <div style={{ marginTop: 4 }} data-testid="acik-avans">{kalem.calisanAd || "Çalışan"} açık avansı: <b>{tl2(tl(avansK))}</b></div>}
        </div>
        {!formVar && <div style={{ marginBottom: 8 }}><Ipucu>{!odemeYetkisi ? "Ödeme kaydetme yetkiniz yok." : "Bu kalemin ödenecek kalanı yok."}</Ipucu></div>}
        <OdemeGirisi kapsam="pencere" kalem={kalem} hedefler={formVar ? hedefler : []} davranis={davranis} turMap={turMap} giris={giris} setGiris={setGiris}
          hatalar={hatalar} uyari={ciroUyarisi} hesaplar={uygunHesaplar} hesapSecimi={hesapSecimi} ciroYetkisi={ciroYetkisi} cekSatirlari={cekSatirlari}
          alacakliSerbest={alacakliSerbest} varsayilanYontem={varsayilanYontem} varsayilanHesap={varsayilanHesap} odemeYetkisi={formVar}
          mahsupVar={mahsupVar} avansK={avansK} hareketler={hareketler} onSil={odemeYetkisi ? onSil : null} />
      </div>
    </Modal>
  );
};
