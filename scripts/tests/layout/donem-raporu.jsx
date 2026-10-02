// Spec 0067 R2 (AC-4, AC-23) yerleşim testi sayfası: GERÇEK Giderler › Dönem Raporu gerçek ui.css ile, gerçek tarayıcı
// motorunda (Electron) çizilir. Bütün kartlar dolu gelsin diye: tedarikçili kalemler, bir ödeme hareketi (yöntem kırılımı),
// satış verisi (KDV karşılaştırması). Tarihler bugünün ayına göre kurulur (Giderler yerel bugünü okur).
import { createRoot } from "react-dom/client";
import { useState } from "react";
import "../../../src/ui.css";
import { Giderler } from "../../../src/components/Giderler";

const bos = () => {};
const d = new Date();
const ay = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const TURLER = [{ id: 1, ad: "Hammadde", davranis: "normal" }, { id: 2, ad: "Elektrik", davranis: "normal" }];
const TED = [{ id: 11, ad: "Yıldız Gayrimenkul ve Yapı Ticaret" }, { id: 12, ad: "Bölge Elektrik Dağıtım" }];
const KALEMLER = [1, 2, 3, 4, 5, 6].map(i => ({ id: i, tarih: `${ay}-01`, turId: i % 2 ? 1 : 2, tutar: 10000 * i, kdvOrani: 20, tedarikciId: i % 2 ? 11 : 12,
  aciklama: `Kalem ${i} · uzun açıklama metni`, sonOdemeTarihi: `${ay}-25`, modelSatirlari: [] }));
const HAREKET = [{ id: 90, tur: "odeme", tarih: `${ay}-01`, tutar: 5000, hesapId: null, giderId: 1, taksitId: null, yontem: "Havale" }];
const MUSTERI = [{ id: 500, name: "Kutu Gıda", model: "AK100", serialNo: "S-1", currency: "TRY", faturali: "Faturalı Yurtiçi", faturaBedeli: 250000, installDate: `${ay}-01` }];

function Sayfa() {
  const [giderler, setGiderler] = useState(KALEMLER);
  const [hareketler, setHareketler] = useState(HAREKET);
  return <Giderler giderler={giderler} setGiderler={setGiderler} hesapHareketleri={hareketler} setHesapHareketleri={setHareketler} giderTanimlari={[]} setGiderTanimlari={bos}
    giderTurleri={TURLER} tedarikciler={TED} setTedarikciler={bos} standartGiderler={[]} setStandartGiderler={bos} calisanlar={[]} standardModels={[]} customModels={[]}
    appSettings={{ giderAyarlari: { yururlukAy: "2020-01" }, kdvRates: [{ from: "2000-01-01", rate: 20 }] }} kasaHesaplari={[]} customers={MUSTERI} stock={[]}
    satisVerisi={{ customers: MUSTERI, services: [], partSales: [], payments: [], teklifler: [], dealers: [], yedekParcaSatislar: [] }} showToast={bos} />;
}
createRoot(document.getElementById("root")).render(<Sayfa />);
