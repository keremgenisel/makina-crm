// Spec 0050 R7, R13, R19 (AC-3, AC-7, AC-19) yerleşim testi sayfası: GERÇEK Sınıf 1 pencereleri gerçek ui.css ile, gerçek
// tarayıcı motorunda (Electron) çizilir. ?p=gider | odeme | cek hangisinin çizileceğini seçer. jsdom yerleşim hesaplamaz.
import { createRoot } from "react-dom/client";
import "../../../src/ui.css";
import { GiderForm } from "../../../src/components/GiderForm";
import { OdemeKayitPenceresi } from "../../../src/components/gider/OdemeKayitPenceresi";
import { CekEklePenceresi } from "../../../src/components/cek/CekEklePenceresi";
import { CiroPenceresi } from "../../../src/components/cek/CiroPenceresi";
import { EkstrePenceresi } from "../../../src/components/gider/EkstrePenceresi";
import { tedarikciEkstresi } from "../../../src/lib/kasa";
import { turHaritasi } from "../../../src/lib/gider";

const bos = () => {};
const TURLER = [{ id: 1, ad: "Fabrika kirası", davranis: "kira" }, { id: 3, ad: "Personel", davranis: "personel" }, { id: 5, ad: "Hammadde", davranis: "normal" }];
const TED = [{ id: 11, ad: "Yıldız Gayrimenkul" }, { id: 12, ad: "Bölge Elektrik" }];
const HESAP = [{ id: 401, ad: "Ziraat Bankası", tur: "banka", paraBirimi: "TRY", acilisBakiyesi: 0, kapali: false }, { id: 402, ad: "Merkez Kasa", tur: "kasa", paraBirimi: "TRY", acilisBakiyesi: 0, kapali: false }];
const KALEM = { id: 7, tarih: "2026-09-01", turId: 5, tutar: 90000, kdvOrani: 0, tedarikciId: 11, aciklama: "Sac levha", sonOdemeTarihi: "2026-09-30" };
// Triyaj: en geniş sabit içerikli iki pencere. Ekstre tablosu (minWidth 720) birkaç kalem ve ödemeyle; dağıtım ızgarası
// (Ciro ve Kendi Çekimizi Yaz aynı ızgara) alacaklısı ve kalemleri ön seçili açılır.
const EKSTRE_G = [1, 2, 3, 4].map(i => ({ id: 70 + i, tarih: `2026-0${5 + i}-10`, turId: 5, tutar: 25000 + i * 1000, kdvOrani: 20, tedarikciId: 11, aciklama: `Sac levha partisi ${i} · uzun açıklama` }));
const EKSTRE_H = EKSTRE_G.map((k, i) => ({ id: 90 + i, tur: "odeme", tarih: `2026-0${5 + i}-20`, tutar: 10000, hesapId: 401, giderId: k.id, taksitId: null, yontem: "Havale", aciklama: "Kısmi ödeme" }));
const p = new URLSearchParams(location.search).get("p") || "gider";
const PENCERE = {
  gider: <GiderForm kalem={{ turId: 5, tutar: "30000", kdvOrani: "20", tedarikciId: 12, tarih: "2026-09-20", aciklama: "Sac" }} giderTurleri={TURLER} tedarikciler={TED}
    hesaplar={HESAP} hareketler={[]} hesapSecimi onSave={bos} onCancel={bos} />,
  odeme: <OdemeKayitPenceresi kalem={KALEM} davranis="normal" turAd="Hammadde" turMap={turHaritasi(TURLER)} hareketler={[]} hesaplar={HESAP} hesapSecimi odemeYetkisi
    bugun="2026-09-30" onKaydet={bos} onSil={bos} onClose={bos} giderler={[KALEM]} />,
  cek: <CekEklePenceresi customers={[]} onKaydet={bos} onClose={bos} />,
  ekstre: <EkstrePenceresi baslik="Yıldız Gayrimenkul" tur="tedarikci" hesapAdi={() => "Ziraat Bankası"} onClose={bos}
    hesapla={(aralik) => tedarikciEkstresi(11, { giderler: EKSTRE_G, hareketler: EKSTRE_H, turler: TURLER, aralik: aralik?.bas && aralik?.bit ? { baslangic: aralik.bas, bitis: aralik.bit } : null })} />,
  ciro: <CiroPenceresi kip="kendi" hesaplar={HESAP} giderler={EKSTRE_G} giderTurleri={TURLER} tedarikciler={TED} calisanlar={[]}
    baslangic={{ tur: "tedarikci", id: 11 }} onKaydet={bos} onClose={bos} />,
};
createRoot(document.getElementById("root")).render(PENCERE[p]);
