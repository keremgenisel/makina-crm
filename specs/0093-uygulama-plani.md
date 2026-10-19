# 0093 Uygulama planı: planlanan adetler penceresi yalnız üretimdeki modelleri listeler

| | |
|---|---|
| **Spec** | `specs/0093-planlanan-adetler-uretimdeki-modeller.md` (revizyon 3) |
| **Durum** | Onaylandı (Takım Yöneticisi, 2026-10-19; §4'ün dokuz önerisi kabul) |
| **Dal** | `feat/0093-plan-uretimdeki` (`bf74e10` üstünde) |

Bu iş yalnız çizim, metin sabitleri ve bir kütüphane sabitidir. Saf motor, veri, sunucu, izin ve birleştirme değişmez.

---

## 1. Değişecek ve eklenecek dosyalar

### Değişen

| Dosya | Değişiklik | Madde |
|---|---|---|
| `src/lib/uretimdekiModeller.js` | `URETIM_ISARETI_IPUCU` R8/2'nin birebir metni; yeni `URETIM_DEGIL_IBARESI = "üretimde değil"` | R8, R8/2, R12 |
| `src/components/maliyet/ModelMaliyetleri.jsx` | `URETIM_METIN.uretimdeDegil: URETIM_DEGIL_IBARESI` (kütüphaneden içe alınır, ekran ve metin aynı) | R12, AC-17/2 |
| `src/components/maliyet/PartiHesabi.jsx` | Çizim anında `cizilen` ve `gizliKayitli`; ızgara `cizilen`'i dolaşır; R4 satırı; R3 bölümü; iki boş durum; yeni dışa verilen sabitler; `modelSayilari` içe alınır | R1–R7, R11 |
| `tests/uretimdeki-modeller-0091.test.js` | `:147-152` taraması daraltılır (Risk 2), "spec 0093 ile" notu | AC-23, AC-24 |
| `tests/ui/uretimdeki-modeller-0091.test.jsx` | `:102-106` birinci ifade yeni kapsamı arar, ikinci ifade korunur; `:240` AC-43 yarısı ters çevrilir | AC-24 |
| `scripts/evidence/0009-sayfa.jsx` | Üç yeni ekran: `maliyet-0093-plan-suzulmus`, `maliyet-0093-plan-gizli-adet`, `maliyet-0093-plan-bos` | AC-30 |
| `docs/evidence/kanit-eslemesi.json` | Üç yeni ekranın kaydı; değişen üç ekranın 0093 raporuna `beklenen: "degisti"` + spec'teki TY onay dizesi | AC-30 |
| `CLAUDE.md` | 0091 bölümündeki "yalnız Model Maliyetleri'ni süzer" cümlesi; kısa 0093 bölümü | DoD |
| `specs/README.md` | Yalnız 0093 satırı (analist eklemeleri sahnelenmez; HEAD + tek satır, `git update-index --cacheinfo`) | DoD |

### Yeni

| Dosya | İçerik |
|---|---|
| `tests/ui/plan-adetler-0093.test.jsx` | Arayüz: AC-1…AC-20, AC-26…AC-28 (gerçek `MakinaMaliyeti`, 0091 fikstür deseni) |
| `tests/plan-adetler-0093.test.js` | Taramalar: AC-1/2, AC-6/2, AC-9/2, AC-21…AC-25, AC-29, AC-30 |
| `tests/fixtures/0093-tarama-once.json` | Spec öncesi koddan üretilmiş dört liste anahtar kümesi (`YAZ_0093=1`; Risk 3) |
| `docs/evidence/0093-taban-piksel-raporu.json`, `0093-piksel-raporu.json` + görüntüler | Görsel kanıt |

### Dokunulmayan (bilerek)

`MakinaMaliyeti.jsx`, `makinaStandartMaliyet.js`, `UretimPartileri.jsx`, `HesapAyarlari.jsx`, `ModelsManager.jsx` (ipucu sabitten gelir), `db.cjs`, `serverAuth.cjs`, `server.cjs`, `merge.js`, 0088'in pencere testleri, `tests/maliyet-yerlesim.test.js`.

---

## 2. Pencerenin yeni yapısı (çizim kararı)

```
cizilen      = modeller.filter(m => m.uretimde !== false)                              // R1/2, R1/3
gizliKayitli = modeller.filter(m => m.uretimde === false && parti.planlananAdetler?.[m.model])  // R3, R3/3, R3/4
say          = modelSayilari(modeller)                                                  // R7/3
```

- `gizliKayitli` ölçütünü **saklı** değerden alır, pencere durumundan değil. Böylece kullanıcı alanı boşaltınca satır ekrandan kaybolmaz; kayıtta düşer (R3/2). Ölçüt `planAc`'ın doğruluk kuralıyla aynıdır.
- `planAc`, `planBulunamayan`, `planKaydet` ve motor çağrısı dokunulmaz (C2, C2/2). R3 satırı aynı `plan.adetler[m.model]` anahtarını ve aynı `plan.hatalar`'ı kullanır. `kaldirilan`'a yazmaz, "Kaldır" düğmesi yok (R3/2, X8).
- Sıra: alan anlamı `Ipucu`'su (aynen) → R4 satırı (`plan-suzgec-ibaresi`) → ızgara **ya da** boş durum (`bos-plan-model` katalog boş, `bos-plan-uretimde` hepsi gizli) → R3 bölümü (`plan-gizli-listesi`) → "modeli bulunamayan" bölümü (aynen) → alt düğmeler.
- R3 satırı: etiket model adı + `URETIM_DEGIL_IBARESI`; girdinin `aria-label`'ı `<model> planlanan adedi (üretimde değil)` (R3/5); altında `HataMetni`.

### Önerilen sabit adları (R11)

| Sabit | Metin |
|---|---|
| `PLAN_SUZGEC_CUMLESI` | Liste yalnız Ayarlar › Katalog › Makina Modelleri'nde "Üretimde" işaretli modelleri gösterir. |
| `planGizliEki(n)` | Üretimde olmayan n model listede yok. |
| `PLAN_GERI_KOYMA_CUMLESI` | Üretimden kalkmış bir modele adet girmek gerekiyorsa işaret Ayarlar'da geri konur. |
| `PLAN_GIZLI_BASLIK` | Üretimde olmayan ama planlanan adedi girilmiş modeller: |
| `PLAN_GIZLI_KALDIRMA` | Kaldırmak için alanı boşaltın. |
| `PLAN_BOS_MODEL` | `{ baslik: "Tanımlı makina modeli yok", metin: "Modeller Ayarlar › Katalog › Makina Modelleri'nde tanımlanır." }` |
| `PLAN_BOS_URETIMDE` | `{ baslik: "Üretimde işaretli model yok", metin: (n) => "n model üretimde değil olarak işaretli. İşaret Ayarlar › Katalog › Makina Modelleri'nde değiştirilir." }` |

---

## 3. Adım sırası

1. **Dal ve taban** (kod değişmeden önce): dal açılır; `0093-tarama-once.json` bugünkü koddan yazılır; değişecek üç mevcut ekranın ve `katalog-model-ekmaliyet`'in taban raporu bugünkü kodla çekilir (`EKRAN_SEC`, 0 fark beklenir).
2. **Kütüphane:** `uretimdekiModeller.js` iki sabit.
3. **Kardeş görünüm:** `ModelMaliyetleri.jsx` yeniden dışa verme; 0091 testleri dokunulmadan yeşil (AC-17).
4. **Pencere:** `PartiHesabi.jsx`.
5. **0091 testleri:** üç yer, "spec 0093 ile" notuyla.
6. **Yeni testler:** iki dosya. Mutasyonla ölçülür: süzgeç kaldırılınca AC-1, `cizilen` motora verilince AC-12/13, R3 satırı `kaldirilan`'a eklenince AC-6 kırılmalı.
7. **Görsel kanıt:** üç yeni ekran aracına eklenir; ilgili ekranlar çekilir; eşleme kaydı.
8. **Tam koşu:** `npm test` (Electron dahil), `npm run lint`.
9. **CLAUDE.md.**
10. Commit, SCORECARD ve `specs/done` taşıma yalnız senin talimatınla.

---

## 4. Riskler ve emin olmadığım noktalar

**Risk 1. Commitlenmemiş iş aynı dosyada.** `PartiHesabi.jsx`, `HesapAyarlari.jsx`, `UretimPartileri.jsx` ve yeni Electron yerleşim testi (`maliyet-yerlesim`) `feat/0092` dalında commitlenmemiş duruyor. AC-29 bu testi "dokunulmadan yeşil" sayıyor.
*Öneri:* Önce bu hizalama düzeltmelerini 0092 dalına ayrı bir commit olarak al, 0093 dalını oradan aç. *Gerekçe:* iki iş tek commit'te karışmaz, 0093'ün farkı yalnız kendi değişikliğini gösterir, AC-29'un dayandığı test kayıtlı olur. Commit senin onayına bağlı.

**Risk 2. R12 ile C7/AC-23 çelişiyor (en önemlisi).** 0091'in taraması (`test.js:150`) işareti okuyan dosyayı modül yoluyla bulur (`/uretimdeOlmayanModeller|uretimdekiModeller|uretimdeMi\b/`). R12 `PartiHesabi.jsx` ile `ModelMaliyetleri.jsx`'e `../../lib/uretimdekiModeller`'den `URETIM_DEGIL_IBARESI` aldırıyor. İki dosya da izinli kümede değil, yani R12 uygulanınca AC-23'ün istediği bekçi kırılır.
*Öneri:* Taramayı modül yolundan değil, işareti **okuyan adlardan** kur: `uretimdeOlmayanModeller | URETIM_ALANI | uretimdeMi | uretimdeOlmayanlar | uretimIsareti(Degistir|Tasi|Dusur)`. Ek bekçi: iki dosyanın bu modülden içe aldığı ad kümesi tam olarak `{URETIM_DEGIL_IBARESI}`. İzinli küme aynen kalır, `PartiHesabi.jsx` ona girmez.
*Gerekçe:* C7'nin amacı ikinci bir **işaret okuma** yolunu engellemek; metin sabiti okumak işaret okumak değildir. R12'den vazgeçmek iki kopya metin doğururdu. Spec'in "silinmez, daraltılır" dili bu daraltmayı karşılıyor.

**Risk 3. AC-21/2 "dosyalar değişmez" testte nasıl ölçülür?** Test git farkına bakamaz (CI temiz klon).
*Öneri:* `BLOB_SECTIONS`, `MERGE_KEYS`, `EYLEM_IDLERI`, `AYAR_ALAN_SEKMELERI` anahtar kümelerini spec öncesi koddan fikstüre yaz (`YAZ_0093=1`) ve eşitliği sına. `PartiHesabi.jsx`'te `setAppSettings` yok taraması ayrıca.
*Gerekçe:* 0088/0090/0092'nin altın fikstür deseni; "eklenmedi" iddiasını gerçekten ölçer.

**Risk 4. "Beş metin" sayımı belirsiz.** R11 beş der ama R4 (üç cümle), R3/6 (iki cümle) ve iki boş durum yediden fazla parça çıkarıyor.
*Öneri:* §2'deki yedi ayrı ad, yani cümle başına bir sabit. *Gerekçe:* testler her cümleyi ayrı sınar (sayı eki sıfırken yok, AC-8/2); R11'in amacı olan "test metni sabitten okur" korunur.

**Risk 5. `bos-plan-uretimde` metni spec'te birebir yazılmamış.** Model Maliyetleri'nin `bosMetin`'i oradaki aç/kapa düğmesine yönlendiriyor. Pencerede bu düğme yok (X7), o yüzden yeniden kullanılamaz.
*Öneri:* §2'deki metin. *Gerekçe:* R7 sayı ve işaretin yeri ister; ikisini de söylüyor.

**Risk 6. Katalog boş metni Model Maliyetleri'nde satır içi yazılı.** Aynı metin ikinci kez yazılır.
*Öneri:* `PartiHesabi.jsx`'te kendi sabiti olsun, `ModelMaliyetleri.jsx`'teki satır içi metne dokunulmasın.
*Gerekçe:* C6 ve AC-17 o ekranı değiştirmememi istiyor; kardeş görünümden içe almak R12'nin "bir görünüm kardeş görünüme bağlanmaz" kuralına aykırı. Bilinen küçük yineleme olarak not edilir.

**Risk 7. Görsel kanıtta `katalog-model-ekmaliyet`.** Spec "raporla doğrulanır" diyor; TY onay dizesi yalnız üç ekranı kapsıyor.
*Öneri:* Ekran değişirse kendim "degisti" yazmam, sana raporlar ve onayını beklerim. *Gerekçe:* eşleme kuralı: `onay` yalnız TY onayıyla.

**Risk 8. 0091'in done spec metni (R29, X9, AC-43).**
*Öneri:* `specs/done/0091-…md` metnine dokunma; ters çevirme test yorumlarında "spec 0093 ile" notuyla ve CLAUDE.md'de kayıtlı olsun. *Gerekçe:* 0089 ve 0090'da da tamamlanmış spec'ler yerinde bırakılıp ters çevirme testlerde kaydedildi.

**Risk 9. AC-19/2 harf büyüklüğü fikstürü.** Katalogda `AK100` ve `ak100` birlikteyken motorun `modelMaliyetleri`'i iki satır üretiyor mu, ölçmedim (gerçek eşleme Türkçe küçültmeli, işaret birebir).
*Öneri:* Testi yazarken önce motor çıktısını ölçerim. İki satır üretmiyorsa bunu sana bildiririm, kriteri kendim değiştirmem.

---

## 5. Kriter ↔ test eşlemesi

`UI` = `tests/ui/plan-adetler-0093.test.jsx`, `T` = `tests/plan-adetler-0093.test.js`

| Kriter | Test | Nasıl |
|---|---|---|
| AC-1 | UI | İşaretli olmayan modelin `<model> planlanan adedi` adlı alanı yok |
| AC-1/2 | T | Kaynak: `modeller` yeniden bağlanmaz (`modeller =` ataması yok); ızgara `cizilen.map`; motor çağrısı, `planAc`, `planBulunamayan`, `planKaydet`'in başlangıcı, R3 kaynağı `modeller`/`parti.planlananAdetler` okur |
| AC-1/3 | UI | `uretimde` alanı silinmiş satır listesiyle `PartiHesabi` doğrudan çizilir, alan var |
| AC-2 | UI | Alan adları DOM sırasıyla kataloğun sırası (standart, sonra özel) |
| AC-3 | UI | Gizli + saklı adetsiz model: ne ızgara adı ne bölüm adı var |
| AC-4 | UI | `plan-gizli-listesi` içinde ad, değer, `URETIM_DEGIL_IBARESI` |
| AC-4/2 | UI | Bölüm adı `… (üretimde değil)`; aynı modelin ızgara adı yok |
| AC-4/3 | UI | Saklı 0 ve "" çizilmez; saklı "abc" çizilir, Kaydet'te hata alanın altında, düzeltince kaydolur |
| AC-5 | UI | 4 → 7, Kaydet, `setUretimPartileri` sonucunda 7 |
| AC-6 | UI | Alan boşaltılır, Kaydet, ad düşer |
| AC-6/2 | UI + T | UI: bölümde "Kaldır" düğmesi yok. T: R3 bölümünün JSX'i `kaldirilan`'a yazmaz |
| AC-7 | UI | Değişiklik yapmadan Kaydet: nesne birebir aynı (gizli adetli ve adetsiz model, bulunamayan ad) |
| AC-7/2 | UI | Gizli geçersiz değer: kayıt yok, `HataMetni` görünür |
| AC-8 | UI | `plan-suzgec-ibaresi` `PLAN_SUZGEC_CUMLESI` içerir |
| AC-8/2 | UI | Gizli yokken ek yok; 2 gizli ile `planGizliEki(2)`; alan anlamı ipucusu duruyor |
| AC-8/3 | UI | `PLAN_GERI_KOYMA_CUMLESI` satırda |
| AC-9 | UI | Hepsi gizli: `bos-plan-uretimde`, metin `PLAN_BOS_URETIMDE.metin(n)` |
| AC-9/2 | T | `PartiHesabi.jsx` `modelSayilari(` çağırır, `.length -` ve `filter(...).length` sayacı yok |
| AC-10 | UI | Hepsi gizli + gizli adetli + bulunamayan: iki bölüm çizilir, Kaydet bulunamayanı kaldırır ve gizli düzeltmeyi yazar |
| AC-11 | UI | Katalog boş: `bos-plan-model` var, `bos-plan-uretimde` yok; "Üretim partisi yok" dalı aynen |
| AC-11/2 | UI | İki boş durumda da ipucu, AC-8 satırı ve Kaydet var |
| AC-12 | UI | Gizli modelin `parti-satiri-<model>` satırı ve adedi çizili |
| AC-13 | UI | Aynı veri işaretli/işaretsiz: özet, ciro, tedarik metinleri birebir; ölçüm 1 kurulumu 14.000,00 TL |
| AC-14 | UI | Gizli model iki uyarı şeridinde ve `plan-bulunamayan-listesi`'nde yok |
| AC-15 | UI | Katalogda olmayan ad bulunamayan bölümünde, "Kaldır" ile düşer |
| AC-16 | UI | Gerçek Settings paneli: `uretim-isareti-ipucu` yeni sabitle |
| AC-16/2 | T | Sabit R8/2 metnine birebir eşit, "Parti Hesabı'nın model-adet tablosu" içerir |
| AC-17 | 0091 testleri | Dokunulmadan yeşil (Model Maliyetleri blokları) |
| AC-17/2 | T | `URETIM_METIN.uretimdeDegil === URETIM_DEGIL_IBARESI`; "üretimde değil" düz metni `src` altında yalnız kütüphanede |
| AC-18 | UI | Üretim Partileri ve Hesap Ayarları metni işaretli/işaretsiz birebir |
| AC-19 | T | `uretimdeMi` ile `AK100` / `ak100` ayrı |
| AC-19/2 | UI | Katalogda iki ad, biri işaretli: ızgarada yalnız diğeri (Risk 9) |
| AC-20 | UI | `gider_tanim`'siz düğme yok; kilitli partide red bildirimi, kayıt yok |
| AC-21, AC-21/2 | T | Dört liste fikstürle eşit; `PartiHesabi.jsx` `setAppSettings` içermez |
| AC-22 | T | `makinaStandartMaliyet.js` git'te değişmedi denilemez, bu yüzden: 0088 ve 0091 motor testleri dokunulmadan koşulur + motor dosyası `URETIM_DEGIL`/0093 adı içermez; çıktı eşitliği AC-13'te |
| AC-23 | T + 0091 | Daraltılmış 0091 taraması (Risk 2) + iki dosyanın içe aldığı ad kümesi |
| AC-24 | 0091 | Üç yerde "spec 0093 ile" notu; `/model seçicileri, Analiz/` korunur (T bunu da kaynakta arar) |
| AC-25 | T | Yedi sabit dışa verilir; UI testi metinleri bu sabitlerden okur (ekranda düz metin araması yok) |
| AC-26 | UI | Bölüm satır sırası katalog sırası |
| AC-27 | UI | `PLAN_GIZLI_BASLIK` ve `PLAN_GIZLI_KALDIRMA` bölümde |
| AC-28 | UI | Dört `data-testid` |
| AC-29 | Koşu | `ui/makina-maliyeti-0088`, `maliyet-yerlesim` (Electron) dokunulmadan yeşil; T dosyaların değişmediğini içerikle değil koşuyla gösterir |
| AC-30 | T | Kanıt eşlemesinde üç yeni ekran ve üç "degisti" kaydı; araçta üç ekran adı |

---

## 6. Sürüm notu

Gerek yok: veri, sunucu ve izin değişmiyor. Karışık sürümde eski istemci pencerede bütün modelleri görmeye devam eder, veri aynıdır.

---

## 7. Uygulama notları (2026-10-19)

- **P1:** hizalama işi `feat/0092-pesin-gider-kapsami` dalına `bf74e10` olarak alındı; 0093 dalı onun üstünde.
- **P9 ölçümü:** `modelMaliyetleri` katalogda `AK100` ve `ak100` için iki satır üretir (`[["AK100", false], ["ak100", true]]`); seçeneksiz çağrıda `uretimde` `null` gelir, `!== false` onu çizer. AC-19/2 olduğu gibi sınandı.
- **Mutasyon ölçümü:** ızgara `modeller`'i dolaşınca 5 test, motora süzülmüş liste verilince 3 test, R3 satırına `kaldirilan`'a yazan "Kaldır" düğmesi konunca 1 test kırıldı.
- **Görsel kanıt, spec'ten sapma:** ölçüm 4 `katalog-model`'in değişeceğini öngörüyordu; ekranda "Yeni Model Ekle" penceresi açık ve ipucu arkasında kaldığı için **0 fark** çıktı. Eşlemede "ayni". Değişen mevcut ekranlar `katalog-model-uretimde` ve `maliyet-parti-plan-formu`; `katalog-model-ekmaliyet` 0 fark (P7'ye gerek kalmadı). Taban 62 görüntü 0 fark; sonra 68 görüntü (31 + 3 yeni ekran × 2 tema).
- **Yeni ekranların kaydı:** "önce" görüntüsü olmadığı için fark sayısı yok; "ayni" 0 fark istediğinden üçü de spec'in TY onay dizesiyle "degisti". Kapanışta hepsi taban raporuna "ayni" olarak çevrilir.
- **Koşular:** Electron'suz takım 352 dosya, 4688 test yeşil; Electron 13 dosya, 20 test yeşil; lint 0 hata.
