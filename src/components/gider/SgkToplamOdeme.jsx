// Spec 0070 R15, R16, R25, Q4: ayın bütün SGK borcunu tek işlemde ödeme penceresi (0050 Sınıf 1, `wide`). Pencere kalemleri
// çalışan adıyla değil AY ve KİŞİ SAYISIYLA listeler (R13, R17). Hesap saf motordadır (sgkOdeme.js); kayıt, Giderler'in
// onKaydet'iyle tek güncellemede yazılır. Pencere kilit TUTMAZ (çok kayıt, anlık işlem); kayıt anında kapsamdaki her kalemin
// `gider` kilidine bakar ve başkasının kilitlediği tek kalem varsa yazım bütünüyle reddedilir (R25, 0064 R36 emsali).
import { useState, useMemo } from "react";
import { Btn, Field, Input, Select, Modal } from "../ui";
import { Ipucu, UyariSeridi, BosDurum } from "../tasarim";
import { sgkAylari, sgkToplamOdeme, SGK_SATIRSIZ_HATASI } from "../../lib/sgkOdeme";
import { secilebilirHesaplar, sonKullanilanHesap, sonKullanilanYontem, HESAP_TUR_AD } from "../../lib/kasa";
import { ayAdi } from "../../lib/giderRaporu";
import { kilitRedMesaji } from "../../lib/kilitAlanlari";
import { useKilitListesi } from "../../hooks/useKilitListesi";
import { ODEME_SECENEKLERI, tl2 } from "./GiderAlanlari";

export const SGK_ODEME_NOTU = "SGK ödemesi yeni bir gider değildir; seçilen ayın personel kalemlerinin SGK hedeflerini kapatır. Her kalem için ayrı bir ödeme hareketi yazılır.";

export const SgkToplamOdeme = ({ giderler = [], turMap, hesaplar = [], hesapSecimi = false, hareketler = [], varsayilanAy = null, yururlukAy = null,
  bugun, aktifKullanici = "", onKaydet, onClose }) => {
  const aylar = useMemo(() => sgkAylari(giderler, { turMap, yururlukAy, bugun }), [giderler, turMap, yururlukAy, bugun]);
  // Q4: varsayılan Dönem Raporu'nun ayı (o ayda açık SGK varsa), yoksa en eski açık ay.
  const [ay, setAy] = useState(() => (aylar.some(a => a.ay === varsayilanAy) ? varsayilanAy : aylar[0]?.ay || ""));
  const [tarih, setTarih] = useState(bugun);
  const uygun = hesapSecimi ? secilebilirHesaplar(hesaplar, "TRY") : [];
  const [hesapId, setHesapId] = useState(() => (hesapSecimi ? String(sonKullanilanHesap(hareketler, hesaplar) ?? "") : ""));
  const [yontem, setYontem] = useState(() => sonKullanilanYontem(hareketler) || "");
  const [hatalar, setHatalar] = useState([]);
  const { baskasiKilitli } = useKilitListesi(aktifKullanici);
  const secili = aylar.find(a => a.ay === ay) || null;

  const kaydet = () => {
    if (!secili) return;
    // R25: başkasının açık tuttuğu tek kalem varsa hiçbiri yazılmaz; bildirim kilit sahibini söyler.
    const kilit = baskasiKilitli("gider", secili.kalemler.map(x => x.kalem.id));
    if (kilit) { setHatalar([kilitRedMesaji(kilit, "SGK kapsamındaki personel kalemi")]); return; }
    const r = sgkToplamOdeme(secili, { turMap, hesaplar, tarih, hesapId: hesapId === "" ? null : (/^\d+$/.test(hesapId) ? Number(hesapId) : hesapId), yontem });
    if (!r.hareketler) { setHatalar(r.hatalar); return; }
    onKaydet(r.hareketler, secili);
  };

  return (
    <Modal title="SGK'yı Öde" onClose={onClose} wide
      footer={<><Btn variant="ghost" onClick={onClose}>Vazgeç</Btn><Btn onClick={kaydet} disabled={!secili}>Ödemeyi Kaydet</Btn></>}>
      <div data-testid="sgk-toplu-odeme">
        {!aylar.length ? <BosDurum testId="bos-sgk-odeme" baslik="Açık SGK borcu yok" /> : (
          <>
            <Field label="Ay">
              <Select aria-label="SGK ayı" value={ay} onChange={e => { setAy(e.target.value); setHatalar([]); }}>
                {aylar.map(a => <option key={a.ay} value={a.ay}>{`${ayAdi(a.ay)} · ${a.kisi} kişi · ${tl2(a.toplamK / 100)}`}</option>)}
              </Select>
              <Ipucu>Açık SGK borcu olan aylar listelenir; seçilen ayın bütün SGK borcu tek işlemde ödenir.</Ipucu>
            </Field>
            {secili && (
              <div data-testid="sgk-ay-ozeti" style={{ display: "flex", justifyContent: "space-between", background: "var(--n100, #f8fafc)", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 13 }}>
                <span>{ayAdi(secili.ay)} · {secili.kisi} kişi · {secili.kalemler.length} kalem</span><b>{tl2(secili.toplamK / 100)}</b>
              </div>
            )}
            {secili?.satirsiz > 0 && (
              <UyariSeridi aile="uyari" testId="sgk-satirsiz" baslik={`${secili.satirsiz} kalemde SGK ödemesi yapılamıyor.`} metin={SGK_SATIRSIZ_HATASI} />
            )}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 160px" }}><Field label="Ödeme tarihi"><Input aria-label="Ödeme tarihi" type="date" value={tarih || ""} onChange={e => setTarih(e.target.value)} /></Field></div>
              <div style={{ flex: "1 1 160px" }}>
                <Field label="Ödeme yöntemi">
                  <Select aria-label="Ödeme yöntemi" value={yontem} onChange={e => setYontem(e.target.value)}>
                    {ODEME_SECENEKLERI.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </Select>
                </Field>
              </div>
              {hesapSecimi && (
                <div style={{ flex: "1 1 200px" }}>
                  <Field label="Hesap">
                    <Select aria-label="Hesap" value={hesapId} onChange={e => setHesapId(e.target.value)}>
                      <option value="">Hesap seçilmedi</option>
                      {uygun.map(h => <option key={h.id} value={String(h.id)}>{h.ad} ({HESAP_TUR_AD[h.tur] || h.tur})</option>)}
                    </Select>
                  </Field>
                </div>
              )}
            </div>
            <Ipucu>{SGK_ODEME_NOTU}</Ipucu>
          </>
        )}
        {hatalar.length > 0 && (
          <div style={{ marginTop: 10 }}><UyariSeridi aile="hata" testId="sgk-odeme-hata" baslik="Ödeme kaydedilmedi" metin={hatalar.join(" ")} /></div>
        )}
      </div>
    </Modal>
  );
};
