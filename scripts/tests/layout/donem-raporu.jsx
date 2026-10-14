// Spec 0067 R2 (AC-4, AC-23) yerleşim testi sayfası: GERÇEK Giderler › Dönem Raporu gerçek ui.css ile, gerçek tarayıcı
// motorunda (Electron) çizilir. Bütün kartlar dolu gelsin diye: tedarikçili kalemler, bir ödeme hareketi (yöntem kırılımı),
// satış verisi (KDV karşılaştırması). Tarihler bugünün ayına göre kurulur (Giderler yerel bugünü okur).
// Spec 0080 AC-19: `?uzun` ile yetmiş kalem ve App'in 236 px kenar çubuğu kadar sol boşluk (sayfalanmayan uzun liste).
// Spec 0084 R26 (AC-38): kısa dala stopajlı bir kira kalemi; başlıktaki "Kira stopajı (N dönem açık)" düğmesi çizilsin. Uzun
// dal dokunulmaz (`?uzun` tam 70 satır iddia ediyor).
import { createRoot } from "react-dom/client";
import { useState } from "react";
import "../../../src/ui.css";
import { Giderler } from "../../../src/components/Giderler";

const bos = () => {};
const d = new Date();
const ay = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const TURLER = [{ id: 1, ad: "Hammadde", davranis: "normal" }, { id: 2, ad: "Elektrik", davranis: "normal" }, { id: 3, ad: "Fabrika kirası", davranis: "kira" }];
const TED = [{ id: 11, ad: "Yıldız Gayrimenkul ve Yapı Ticaret" }, { id: 12, ad: "Bölge Elektrik Dağıtım" }];
const UZUN = new URLSearchParams(location.search).has("uzun");
const KALEMLER = Array.from({ length: UZUN ? 70 : 6 }, (_, j) => j + 1).map(i => ({ id: i, tarih: `${ay}-01`, turId: i % 2 ? 1 : 2, tutar: 10000 * i, kdvOrani: 20, tedarikciId: i % 2 ? 11 : 12,
  aciklama: `Kalem ${i} · uzun açıklama metni`, sonOdemeTarihi: `${ay}-25`, modelSatirlari: [] }));
const KIRA = UZUN ? [] : [{ id: 200, tarih: `${ay}-01`, turId: 3, girisYonu: "brut", tutar: 20000, netTutar: 16000, stopajOrani: 20, kdvOrani: 0, tedarikciId: 11,
  aciklama: "Fabrika kirası", taksitler: [{ id: 201, hedef: "ana", sira: 1, vade: `${ay}-10`, tutar: 16000 }, { id: 202, hedef: "stopaj", sira: 1, vade: null, tutar: 4000 }] }];
const HAREKET = [{ id: 90, tur: "odeme", tarih: `${ay}-01`, tutar: 5000, hesapId: null, giderId: 1, taksitId: null, yontem: "Havale" }];
const MUSTERI = [{ id: 500, name: "Kutu Gıda", model: "AK100", serialNo: "S-1", currency: "TRY", faturali: "Faturalı Yurtiçi", faturaBedeli: 250000, installDate: `${ay}-01` }];

function Sayfa() {
  const [giderler, setGiderler] = useState([...KALEMLER, ...KIRA]);
  const [hareketler, setHareketler] = useState(HAREKET);
  const sayfa = <Giderler giderler={giderler} setGiderler={setGiderler} hesapHareketleri={hareketler} setHesapHareketleri={setHareketler} giderTanimlari={[]} setGiderTanimlari={bos}
    giderTurleri={TURLER} tedarikciler={TED} setTedarikciler={bos} calisanlar={[]} standardModels={[]} customModels={[]}
    appSettings={{ giderAyarlari: { yururlukAy: "2020-01" }, kdvRates: [{ from: "2000-01-01", rate: 20 }] }} kasaHesaplari={[]} customers={MUSTERI} stock={[]}
    satisVerisi={{ customers: MUSTERI, services: [], partSales: [], payments: [], teklifler: [], dealers: [], yedekParcaSatislar: [] }} showToast={bos} />;
  return UZUN ? <div style={{ display: "flex" }}><div style={{ width: 236, flex: "0 0 236px" }} /><div style={{ flex: 1, minWidth: 0 }}>{sayfa}</div></div> : sayfa;
}
createRoot(document.getElementById("root")).render(<Sayfa />);
