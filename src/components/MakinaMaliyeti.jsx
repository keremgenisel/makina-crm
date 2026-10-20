import { useMemo, useState } from "react";
import { Segment, UyariSeridi } from "./tasarim";
import { makeCanDo } from "../lib/permissions";
import { useBugun } from "../hooks/useBugun";
import { useKilitListesi } from "../hooks/useKilitListesi";
import { genelGiderPayi, gercekUretim, modelMaliyetleri, partiGenelPaylari, partiKapanisHavuzu } from "../lib/makinaStandartMaliyet";
import { ModelMaliyetleri } from "./maliyet/ModelMaliyetleri";
import { PartiHesabi } from "./maliyet/PartiHesabi";
import { HesapAyarlari } from "./maliyet/HesapAyarlari";
import { UretimPartileri } from "./gider/UretimPartileri";

// Spec 0088: Makina Maliyet Hesabı (Mali İşler altında, sekme `maliyet`). Ürün ağacı + genel gider payı × kâr katsayısı;
// bütün hesap saf motorda (`lib/makinaStandartMaliyet.js`), ekran yalnız gösterir (R25). Spec 0090'dan beri uygulamada tek
// maliyet modeli budur: Üretim Partileri'nin payı da bu motordan (aylık genel gider havuzu, `partiGenelPaylari`) gelir.
// R3: dört görünüm bu sırayla. Üretim Partileri yönetimi Giderler'den buraya taşındı (R23); bileşen gider/'de kalır (plan P7).
export const GORUNUMLER = [{ value: "modeller", label: "Model Maliyetleri" }, { value: "parti", label: "Parti Hesabı" }, { value: "partiler", label: "Üretim Partileri" }, { value: "ayarlar", label: "Hesap Ayarları" }];
const gecerliGorunum = (g) => (GORUNUMLER.some(x => x.value === g) ? g : "modeller");
// Spec 0097 R19 (AC-30; 0088 R31 bu spec'le yeniden yazıldı): bugünkü ayarlar yalnız Model Maliyetleri ile planlanan adet
// satırlarını etkiler; üretilmiş makinalar üretim gününün parça maliyeti ve partinin kendi aylarının genel gideriyle hesaplanır.
// Tek satıra sığar (AC-58: Model Maliyetleri ekranlarında fark yalnız şeritte kalsın, alttaki içerik kaymasın).
export const BUGUNKU_AYAR_IBARESI = "Bugünkü tür rolü, varsayılan adet ve dönem yalnız Model Maliyetleri ile planlanan adet satırlarını etkiler; üretilmiş makinalar üretim günü maliyetiyle hesaplanır.";

export const MakinaMaliyeti = ({
  aktifKullanici = "", giderler = [], giderTurleri = [], setGiderTurleri, tedarikciler = [], stock = [], customers = [], partStockLog = [],
  parts = [], standardModels = [], customModels = [], setStandardModels, setCustomModels, uretimPartileri = [], setUretimPartileri,
  appSettings = {}, setAppSettings, rates = null, tumMusteriler = null, serverPermissions = null, showToast = () => {}, baslangicGorunum = "modeller",
}) => {
  const [gorunum, setGorunum] = useState(() => gecerliGorunum(baslangicGorunum));
  const bugun = useBugun();
  const canDo = makeCanDo(serverPermissions, "giderActions");
  const { baskasiKilitli } = useKilitListesi(aktifKullanici);
  const ayarlar = appSettings?.maliyetAyarlari || null;
  const veri = useMemo(() => ({ giderler, giderTurleri, tedarikciler, stock, customers, partStockLog, uretimPartileri, yururlukAy: appSettings?.giderAyarlari?.yururlukAy || null }),
    [giderler, giderTurleri, tedarikciler, stock, customers, partStockLog, uretimPartileri, appSettings?.giderAyarlari?.yururlukAy]);
  const pay = useMemo(() => genelGiderPayi(veri, ayarlar, bugun), [veri, ayarlar, bugun]);
  // Spec 0091 R25/3, R26: model kırılımı (dönem adedi, modeli bulunamayan makina) ve satırların üretim işareti; süzme ekranda (C6).
  const katalog = useMemo(() => [...standardModels, ...customModels].filter(m => m && !m.deletedAt).map(m => m.model), [standardModels, customModels]);
  const gercek = useMemo(() => gercekUretim(veri, ayarlar, pay.havuzK, { modelKirilimi: true, katalog }), [veri, ayarlar, pay.havuzK, katalog]);
  const uretimdeDisi = appSettings?.uretimdeOlmayanModeller;
  const modeller = useMemo(() => modelMaliyetleri({ standardModels, customModels, parts }, pay.payK, { uretimdeDisi, uretim: gercek }),
    [standardModels, customModels, parts, pay.payK, uretimdeDisi, gercek]);
  // Spec 0090 R12–R37, R37/3 (K8): parti payı burada kurulur (App'te ağır hesap yok). Üretim tarihi zinciri çöpteki müşteriyi de
  // okur (stoğa dönen makinanın özgün tarihi); bu yüzden müşteriler ham dizidir (bugünkü motorun girdisiyle aynı).
  const veriHam = useMemo(() => ({ ...veri, customers: tumMusteriler || customers }), [veri, tumMusteriler, customers]);
  const partiSonucu = useMemo(() => partiGenelPaylari(veriHam, bugun), [veriHam, bugun]);
  // Spec 0097 R9/2, R9/4, C11: Parti Hesabı tarihli maliyeti katalogdan kurar ve payla AYNI ham müşteri dizisini okur; dönem kilitli
  // pay burada zaten hesaplanıyor, görünüme geçirilir (yeni ağır hesap yok).
  const parcaKatalogu = useMemo(() => ({ parts, standardModels, customModels }), [parts, standardModels, customModels]);
  // Triyaj (bulgu 2): kapanış haritası kaydedilen partinin aralığından (tek yol, C15).
  const kapanisHavuzu = (parti) => partiKapanisHavuzu(veri, parti, bugun);
  const ortak = { pay, gercek, modeller, canDo, baskasiKilitli, showToast };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Makina Maliyeti</h2>
        <div style={{ minWidth: 0, flex: "0 0 auto", maxWidth: "100%" }}><Segment ariaLabel="Görünüm" options={GORUNUMLER} value={gorunum} onChange={setGorunum} /></div>
      </div>
      <div style={{ marginBottom: 12 }}><UyariSeridi aile="bilgi" testId="bugunku-ayar-ibaresi">{BUGUNKU_AYAR_IBARESI}</UyariSeridi></div>
      {gorunum === "modeller" && <ModelMaliyetleri {...ortak} standardModels={standardModels} setStandardModels={setStandardModels} setCustomModels={setCustomModels} />}
      {gorunum === "parti" && <PartiHesabi {...ortak} veri={veriHam} katalog={parcaKatalogu} partiSonucu={partiSonucu} rates={rates} bugun={bugun} uretimPartileri={uretimPartileri} setUretimPartileri={setUretimPartileri} stock={stock} customers={customers} />}
      {gorunum === "partiler" && <UretimPartileri uretimPartileri={uretimPartileri} setUretimPartileri={setUretimPartileri} stock={stock} customers={customers}
        partiSonucu={partiSonucu} kapanisHavuzu={kapanisHavuzu} canDo={canDo} showToast={showToast} serverPermissions={serverPermissions} />}
      {gorunum === "ayarlar" && <HesapAyarlari {...ortak} ayarlar={ayarlar} setAppSettings={setAppSettings} giderTurleri={giderTurleri} setGiderTurleri={setGiderTurleri} bugun={bugun} />}
    </div>
  );
};
