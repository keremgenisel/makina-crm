import { useMemo, useState } from "react";
import { Segment, UyariSeridi } from "./tasarim";
import { makeCanDo } from "../lib/permissions";
import { useBugun } from "../hooks/useBugun";
import { useKilitListesi } from "../hooks/useKilitListesi";
import { genelGiderPayi, gercekUretim, modelMaliyetleri } from "../lib/makinaStandartMaliyet";
import { ModelMaliyetleri } from "./maliyet/ModelMaliyetleri";
import { PartiHesabi } from "./maliyet/PartiHesabi";
import { HesapAyarlari } from "./maliyet/HesapAyarlari";
import { UretimPartileri } from "./gider/UretimPartileri";

// Spec 0088: Makina Maliyet Hesabı (Mali İşler altında, sekme `maliyet`). Ürün ağacı + genel gider payı × kâr katsayısı;
// bütün hesap saf motorda (`lib/makinaStandartMaliyet.js`), ekran yalnız gösterir (R25). Bugünkü maliyet modeli
// (Giderler › Makina Kârlılığı, Makina ve Model) 0089'a kadar yan yana yaşar; iki hesap toplanmaz.
// R3: dört görünüm bu sırayla. Üretim Partileri yönetimi Giderler'den buraya taşındı (R23); bileşen gider/'de kalır (plan P7).
export const GORUNUMLER = [{ value: "modeller", label: "Model Maliyetleri" }, { value: "parti", label: "Parti Hesabı" }, { value: "partiler", label: "Üretim Partileri" }, { value: "ayarlar", label: "Hesap Ayarları" }];
const gecerliGorunum = (g) => (GORUNUMLER.some(x => x.value === g) ? g : "modeller");
// R31 (AC-48): rakamlar bugünkü ayarlarla; kapanmış partinin standart maliyeti de oynar.
export const BUGUNKU_AYAR_IBARESI = "Rakamlar bugünkü ayarlarla hesaplanır: gider türü rolü, varsayılan üretim adedi, dönem ya da bir parçanın maliyeti değişince kapanmış partilerin rakamı da değişir.";

export const MakinaMaliyeti = ({
  aktifKullanici = "", giderler = [], giderTurleri = [], setGiderTurleri, tedarikciler = [], stock = [], customers = [], partStockLog = [],
  parts = [], standardModels = [], customModels = [], setStandardModels, setCustomModels, uretimPartileri = [], setUretimPartileri,
  appSettings = {}, setAppSettings, rates = null, makinaMaliyet = null, serverPermissions = null, showToast = () => {}, baslangicGorunum = "modeller",
}) => {
  const [gorunum, setGorunum] = useState(() => gecerliGorunum(baslangicGorunum));
  const bugun = useBugun();
  const canDo = makeCanDo(serverPermissions, "giderActions");
  const { baskasiKilitli } = useKilitListesi(aktifKullanici);
  const ayarlar = appSettings?.maliyetAyarlari || null;
  const veri = useMemo(() => ({ giderler, giderTurleri, tedarikciler, stock, customers, partStockLog, uretimPartileri, yururlukAy: appSettings?.giderAyarlari?.yururlukAy || null }),
    [giderler, giderTurleri, tedarikciler, stock, customers, partStockLog, uretimPartileri, appSettings?.giderAyarlari?.yururlukAy]);
  const pay = useMemo(() => genelGiderPayi(veri, ayarlar, bugun), [veri, ayarlar, bugun]);
  const gercek = useMemo(() => gercekUretim(veri, ayarlar, pay.havuzK), [veri, ayarlar, pay.havuzK]);
  const modeller = useMemo(() => modelMaliyetleri({ standardModels, customModels, parts }, pay.payK), [standardModels, customModels, parts, pay.payK]);
  const ortak = { pay, gercek, modeller, canDo, baskasiKilitli, showToast };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Makina Maliyeti</h2>
        <div style={{ minWidth: 0, flex: "0 0 auto", maxWidth: "100%" }}><Segment ariaLabel="Görünüm" options={GORUNUMLER} value={gorunum} onChange={setGorunum} /></div>
      </div>
      <div style={{ marginBottom: 12 }}><UyariSeridi aile="bilgi" testId="bugunku-ayar-ibaresi">{BUGUNKU_AYAR_IBARESI}</UyariSeridi></div>
      {gorunum === "modeller" && <ModelMaliyetleri {...ortak} standardModels={standardModels} setStandardModels={setStandardModels} setCustomModels={setCustomModels} onAyarlar={() => setGorunum("ayarlar")} />}
      {gorunum === "parti" && <PartiHesabi {...ortak} veri={veri} rates={rates} bugun={bugun} uretimPartileri={uretimPartileri} setUretimPartileri={setUretimPartileri} stock={stock} customers={customers} />}
      {gorunum === "partiler" && <UretimPartileri uretimPartileri={uretimPartileri} setUretimPartileri={setUretimPartileri} stock={stock} customers={customers}
        makinaMaliyet={makinaMaliyet} canDo={canDo} showToast={showToast} serverPermissions={serverPermissions} />}
      {gorunum === "ayarlar" && <HesapAyarlari {...ortak} ayarlar={ayarlar} setAppSettings={setAppSettings} giderTurleri={giderTurleri} setGiderTurleri={setGiderTurleri} bugun={bugun} />}
    </div>
  );
};
