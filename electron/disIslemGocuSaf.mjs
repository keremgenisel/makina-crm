// Spec 0138 R15–R15/4, R16, C4, Karar 29, 31, 32: dış işlem kataloğu kalkarken katalog bağlı işlem kalemini SERBEST kaleme
// çeviren bir kerelik göçün saf çekirdeği. `db.cjs` bunu `require(esm)` ile alır (kasaGocuSaf.mjs emsali). Paketlenmiş uygulamada
// `src/` okunamaz (ölçüm H), bu yüzden hiçbir `src/` modülünü içe almaz; adet birimli satır tutarı yalın aritmetiktir ve 0137
// motorunun (`disIslem.islemKalemiOzeti`) adet dalının aynısıdır (altın `tests/fixtures/0138-goc-altin.json`).
//
// Kurallar:
//   - Adet birimli, fiyatı girilmiş, para birimi tanınan (TL; dövizde kur > 0) ve kaydedilmiş adedi 1..1000 tam sayı olan kalem:
//     tutar = (birim fiyatı × kur → bir kez kuruşa) × adet, TL'ye çevrilip iki ondalık (R15/4).
//   - Kilo birimli kalem HER ZAMAN tutarsız (R15/2, Karar 31): kilo tabanı malzeme geometrisini ister, ikinci bir hesap yazılmaz.
//   - İşlem çöpte, fiyatsız, kursuz ya da adedi geçersiz: tutarsız serbest kalem, ad ve tedarikçi işlemden (R15, AC-24).
//   - İşlemin kaydı hiç yok: tutarsız, tedarikçisiz, ad sabit yer tutucu `YER_TUTUCU_AD` (R15/3).
//   - Boş para birimi TL'dir (Context tuzağı). Kalem sırası korunur, parçanın başka alanına dokunulmaz (C4).
//   - Çöpteki parçalar da göçe girer (Karar 29).
export const YER_TUTUCU_AD = "Dış işlem";
const ADET_UST = 1000;

const doluMu = (v) => v != null && v !== "";
const sayi = (v) => {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return null;
};
// 0137 disIslem.js'teki kuralın aynısı (kayan nokta artığı temizlenip tam yarım yukarı kuruşa).
const kurusYuvarla = (tl) => Math.round(Number((tl * 100).toPrecision(12)));
const paraOf = (m) => (m?.paraBirimi == null || m.paraBirimi === "" ? "TRY" : m.paraBirimi);
const dovizMi = (pb) => pb === "USD" || pb === "EUR";

export const eskiKalemMi = (k) => !!k && k.tur === "islem" && doluMu(k.islemId);

// Tek kalemin çevirisi. `isler` = Map(String(id) → kayıt), çöptekiler dahil (ad ve tedarikçi çöpteki kayıttan da korunur).
export const kalemiCevir = (k, isler) => {
  const m = isler.get(String(k.islemId));
  if (!m) return { tur: "islem", ad: YER_TUTUCU_AD, tutar: null };
  const ad = String(m.ad ?? "").trim() || YER_TUTUCU_AD;
  const ted = doluMu(m.tedarikciId) ? { tedarikciId: m.tedarikciId } : {};
  const bos = { tur: "islem", ad, ...ted, tutar: null };
  if (m.deletedAt) return bos;
  if (m.birim === "kilo") return bos;
  const pb = paraOf(m);
  if (pb !== "TRY" && !dovizMi(pb)) return bos;
  const fiyat = sayi(m.birimFiyati);
  if (fiyat == null) return bos;
  const kur = dovizMi(pb) ? sayi(m.kur) : 1;
  if (!(kur > 0)) return bos;
  const adet = Number(k.miktar);
  if (!Number.isInteger(adet) || adet < 1 || adet > ADET_UST) return bos;
  const tutarK = kurusYuvarla(fiyat * kur) * adet;
  return { tur: "islem", ad, ...ted, tutar: Math.round(tutarK) / 100 };
};

// `parcalar` = [{ id, maliyetKalemleri }] (kalem listesi dizi; JSON çözülmüş), `disIslemler` ölü tablonun satırları.
// Dönüş: yalnız değişen parçalar `[{ id, maliyetKalemleri }]`.
export const disIslemGocPlani = (parcalar = [], disIslemler = []) => {
  const isler = new Map((disIslemler || []).filter(Boolean).map(m => [String(m.id), m]));
  const degisen = [];
  for (const p of parcalar || []) {
    const kalemler = Array.isArray(p?.maliyetKalemleri) ? p.maliyetKalemleri : [];
    if (!kalemler.some(eskiKalemMi)) continue;
    degisen.push({ id: p.id, maliyetKalemleri: kalemler.map(k => (eskiKalemMi(k) ? kalemiCevir(k, isler) : k)) });
  }
  return { degisen };
};
