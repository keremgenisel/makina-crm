# 0086 — Yedekleme paketleri geri yükledikleri bölümleri tek kaynaktan söyler

| | |
|---|---|
| **Durum** | Uygulanıyor (revizyon 3: plan onayı kararları P1–P4 işlendi; dal `feat/0086-yedek-paketleri`) |
| **Sahip** | Analist (spec) · Geliştirici (uygulama) |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Ayarlar › Veri Yönetimi › Yedekleme (seçmeli geri yükleme paketleri); görüntü aracı ve görsel kanıt |
| **Bağımlı spec'ler** | 0022 (üretim partileri), 0024 (kasa hesapları ve hareketleri), 0040 ve 0049 (çek bölümünün iki pakete bölünmesi), 0052 (Kasa'sız kullanıcının geri yüklemesi), 0058 (kasa iş listesi), 0008 (gider paketinin perde kuralı), 0064 (geri yükleme kilit ön denetimi ve `kilit-geri-yukleme` kanıt ekranı), 0009 ve 0011 (kanıt eşlemesi), 0001 · 0051 · 0076 · 0084 (gider ayarlarının alanları) |
| **Taban** | `9b4de51` (0085 kapanışı, `feat/0085-istemci-surumu`; revizyon 3 P4: 0085 main'e alınmadığı için dal ve kanıt tabanı onun üstü, yoksa 0085'in menü değişiklikleri sahte fark olurdu. Revizyon 2 `7768968` diyordu) |
| **Revizyon** | · 1 · 2026-10-14 ilk taslak · 2 · 2026-10-14 geliştirme öncesi QA turu (B-1…B-5, Ö-6…Ö-10, K-11…K-16 işlendi; sözlük eşitliği, çek ve Kasa cümlesinin üretimi, taramanın tanımı, birleşim kriteri, iki kanıt ekranı) · 3 · 2026-10-14 plan onayı (P1 kanıt ekranları ve Kasa varsayılanı, P2 teklifler özel ifadesi, P3 genel satır deseni, P4 taban; plan `specs/0086-uygulama-plani.md`) |

---

## Intent

Yedekleme ekranındaki seçmeli geri yükleme, bölümleri tek tek değil **paketler** hâlinde seçtiriyor
ve her paketin yanında ne geri yükleyeceğini bir cümleyle yazıyor. Kullanıcı o cümleye bakıp
"müşterilerim yerinde kalsın, yalnız giderleri geri al" gibi bir karar veriyor, yani cümle bir
uyarı metni değil **karar verdiren bilgi**.

Cümleler gerçekle uyuşmuyor. Ölçtüm: paketlerin dördü, geri yükledikleri bölümlerin bir kısmını
söylemiyor. "Stok ve üretim" paketi yedek parça satışlarını da geri yüklüyor ama saymıyor;
"Tanımlar" firma çalışanlarını geri yüklüyor ama saymıyor; "Giderler" üretim partilerini ve kasa iş
listesi kararlarını geri yüklüyor ama saymıyor; "Müşteri verileri" çek kayıtlarının bir kısmını
etkiliyor ama saymıyor. Sapmanın nedeni belli: her yeni bölüm (0022 parti, 0024 hareketler, 0058
kapsam dışı, 0023 çalışanlar) geri yükleme dalına eklendi, açıklama cümlesine eklenmedi. Yani bu
bir yazım hatası değil, **tekrarlayan bir sapma**.

Başarı şu: her paketin kapsadığı bölümler veri olarak yazılı, ekranda görünen cümle o listeden
üretiliyor ve iki test sapmayı imkânsız kılıyor: biri listeyle geri yükleme dalının aynı bölümleri
saydığını, diğeri **paketlerin birleşiminin bütün veri bölümlerini kapsadığını** sabitliyor
(bulgu B-4). Yeni bir bölüm eklendiğinde cümle kendiliğinden doğru olur, yanlış kalamaz.

---

## Requirements

- **R1.** Paket tanımı bölüm listesini **veri olarak** taşır: her paket
  `{ id, ad, bolumler: [...], ekler: [...], notlar? }` (triyaj: Giderler paketinin iki notu olduğu için
  tek `not?` alanı `notlar: [{ metin, yalnizKasasiz? }]` listesi oldu; görünen notları `paketNotlari` seçer).
  1. `bolumler` yedek dosyasındaki bölüm adlarıdır (`giderler`, `uretimPartileri` gibi) ve girdisi
     **iki biçimde** olabilir (bulgu B-2): düz bölüm kimliği (adı sözlükten gelir) ya da
     **`{ bolum, metin }}`** (o paket için özel ifade). Özel biçim yalnız **üç** yerde kullanılır:
     `cekler` bölümünün iki payı (R4) ve **revizyon 3 (P2)** ile `teklifler` ("teklifler ve
     proformalar"): sözlük adı sunucununkiyle aynı olduğu için ("Teklifler") cümle proformaları
     söylemezdi, oysa proformalar `teklifler` bölümünde geri yüklenir ve bu karar verdiren bilgidir. Tarama her iki biçimde de `bolum` alanını okur.
  2. `ekler`, yedek dosyasında bulunan ama uygulama durumuna değil **e-posta köprüsüne** geri
     yüklenen alanlardır (`mailConfig`, `mailLog`); ölçüldü, ikisi de yedek dosyasında var ve
     `BLOB_SECTIONS`'ta yok (bulgu Ö-7).
  3. `notlar`, paketin altında koşullu ya da koşulsuz çizilen satırlardır (R5, R8, R11 ve triyajla Dosyalar
     paketinin notu: dosyaların kendisi yedek açılırken depoya eklenir, kutu yalnız dosya listesini geri
     yükler); her biri tek satır, koşul yalnız `yalnizKasasiz`. Emsali bugünkü
     "müşteriler yüklenip evraklar yüklenmezse" notudur (`SettingsBackup.jsx:468`).
- **R2.** Ekranda görünen açıklama cümlesi bu listeden **üretilir**, elle yazılmaz. Bölümün Türkçe
  adı tek sözlükten gelir (`src/lib/bolumAdlari.js`); ekran kendi ad metnini kurmaz. Küçük harfe
  çevirme **`utils.trLower` ile** yapılır, `toLowerCase()` ile değil (bulgu Ö-6): ölçüldü,
  `"Kasa İş Listesi".toLowerCase()` JavaScript'te bozuk `"kasa i̇ş listesi"` üretir.
- **R3.** Kaynak taraması paket listesiyle geri yükleme dalını karşılaştırır. **Revizyon 3 (P3):**
  desen geneldir (satırdaki her `restoreData?.X` ve `restoreData.X`) ve iki yönlüdür (satırdaki bölüm
  paketin listesinde, paketin her bölümü en az bir satırda). Ölçüldü: aşağıdaki altı bloğun beşi
  (`standardModels`, `factory`, `appSettings`, iki e-posta alanı, göç bloğu) `sec("id")` ile
  `restoreData?.X`'i **aynı satırda** taşıyor; tek gerçek istisna Müşteri paketinin `cekler` payıdır
  (koşulu `payments`'a bağlı, hiçbir satırda `sec("musteri")` ile birlikte geçmez). İstisna tablosu bu
  tek kayıttır. Aşağıdaki revizyon 2 metni tarihseldir. Eşleştirme **satır
  bazlıdır**: aynı satırda bulunan `sec("id")` ile `restoreData?.X` eşleştirilir ve `X` o paketin
  `bolumler` listesinde olmalıdır. Ölçüldü, dalın yedi ayrı yazım şekli var (bulgu B-3, tablo
  Context'te), bu yüzden **çok satırlı altı blok** gerekçeli bir istisna tablosunda paketi ve
  bölümüyle adıyla yazılır: çek bloğu, `standardModels`, `factory`, `appSettings`, iki e-posta
  köprüsü çağrısı ve hareketsiz eski yedeğin göçü. İstisna listesi tam yollu ve satırlıdır, dosya
  şekli değişince kırılır. Geri yükleme dalları **yeniden yazılmaz** (her bölümün kendi setter'ı,
  kendi koşulu ve beş özel durumu var, bulgu B1). İkinci tarama R10'dadır.
- **R4.** Bölünmüş bölüm açıkça yazılır: çek kayıtları iki pakete dağılır (tahsilata bağlı çekler
  Müşteri verileriyle, bağsız ve verilen çekler Giderler ile, 0049 triyajı). İki paketin de
  açıklaması çeki **kendi payıyla** söyler (R1/1'in `{ bolum, metin }` biçimiyle); "çekler"
  kelimesi tek başına iki pakette birden görünmez. **Bugünkü koşul korunur (bulgu Ö-9):** ölçüldü,
  Müşteri payı `Array.isArray(restoreData?.payments)` koşuluna bağlı (`SettingsBackup.jsx:219`),
  yani `cekler` taşıyan ama tahsilat bölümü olmayan bir yedekte uygulanmaz; cümle bu koşulu iddia
  etmez, spec onu kayda geçirir ki hata sanılıp değiştirilmesin (R7).
- **R5.** Gider ayarlarının yeri yazılı olur: gider takibinin ayarları uygulama ayarlarının içinde,
  yani **"Firma ve ayarlar"** paketinde taşınır. Giderler paketinin altında tek satır not bunu
  söyler ve ayarları **sekiz alanıyla** sayar (bulgu Ö-8, ölçüm `SettingsGider.jsx:51`–`:52`):
  yürürlük ayı, stopaj oranı, stopaj beyan dönemi, stopaj ödeme günü, hatırlatma eşiği, binek araç
  indirilebilir oranı, hesapsız kayıt başlangıç tarihi, deneme dönemi bitişi. Böylece yalnız
  Giderler'i geri yükleyen kullanıcı ayarların dönmediğini kaydetmeden önce bilir. Aynı sınıf
  bilginin ikinci yarısı R11'dedir.
- **R6.** Paketlerin kimlikleri, sırası, sayısı ve seçili başlama davranışı **değişmez**; "Tümünü
  Seç / Tümünü Kaldır", gider paketinin yalnız gider yetkisiyle görünmesi ve perde kuralı (0008 K3)
  aynen kalır. Buna seçili paket kümesinin ilk render'da donması da dahildir (bulgu K-13, ölçüm
  `:153` `useState(() => new Set(...))`): R8'in koşullu cümlesi yalnız **metni** değiştirir, seçili
  kümeye dokunmaz.
- **R7.** Geri yüklemenin **davranışı değişmez**: hangi paket hangi bölümü yazıyorsa aynen yazmaya
  devam eder. Bu iş yalnız "ne yazdığını doğru anlatmak" işidir; bir bölümü başka pakete taşımak ya
  da yeni paket açmak kapsam dışıdır (X1). Tamamlanma bildiriminin metni de korunur (bulgu K-15):
  ölçüldü, perde inikken izni olan kullanıcıda gider bölümleri `tamGeriYukleme` ile yazılıyor ama o
  durumda görünen bütün paketler seçili olduğu için bildirim ad listesi basmıyor
  ("Yedek başarıyla yüklendi."), yani bugünkü metin yanlış değil ve bir kriterle kilitlenir.
- **R8.** Kasa'sı olmayan kullanıcının geri yüklemesinde hareketlerin korunması (0052 R19) ve
  hesap hareketleri bölümünün `kasaVeriYetki` dalı değişmez; bu ayrım Giderler paketinin **`not`**
  alanıyla söylenir ("Kasa yetkiniz yoksa virman, avans ve verilen çekler bugünkü hâliyle
  korunur"), cümlenin içine gömülmez (bulgu B-2: koşullu metin sözlükten üretilemez).
- **R9.** Türkçe bölüm adları iki yerde tutulur ve **test eşitliği sabitler**: renderer sözlüğü
  (`src/lib/bolumAdlari.js`) ile sunucunun işlem kaydı sözlüğü (`electron/server.cjs`
  `BOLUM_ADLARI`) aynı adları taşır. Eşitlik **32 blob bölümü** üzerinden iddia edilir (bulgu
  B-1): ölçüldü, `BOLUM_ADLARI` tam olarak `BLOB_SECTIONS` kümesini (32 anahtar) taşıyor;
  `mailConfig` ve `mailLog` `ekler`dir (R1/2), paylaşılan kümenin dışında durur ve test bunu
  açıkça yazar. Sunucu dosyasına dokunulmaz (bulgu B2).
- **R10.** İkinci ve daha güçlü tarama: paketlerin `bolumler` birleşimi **bütün veri bölümlerinin
  kümesine eşittir** (bulgu B-4). Ölçüldü: dokuz paketin dokunduğu bölümlerin birleşimi bugün tam
  olarak **32** bölümdür ve bu `electron/server.cjs` `BOLUM_ADLARI` anahtar kümesine (dolayısıyla
  `BLOB_SECTIONS`'a) eşittir. Eksik ya da fazla bölüm testi düşürür. R3 "dal var mı", R10 "bölüm
  bir pakete bağlı mı" sorusunu cevaplar; Intent'teki tekrarlayan sapmayı kapatan ikincisidir.
- **R11.** "Firma ve ayarlar" paketinin altına ikinci bir not girer (bulgu K-14): makinaya özgü
  alanlar (yedek klasörü ve otomatik yedek zamanlaması) geri **yüklenmez**, bu bilgisayarın
  bugünkü değeri korunur. Ölçüldü: `appSettings` geri yüklenirken `disAppSettingsSuz` bu alanları
  ayıklıyor (`:262`–`:264`). Gerekçe R5'in aynısıdır: karar verdiren bilgi ekranda yazılı olmalı.
- **R12.** **Revizyon 3 (P1):** iki ölçüm düzeltmesi. (1) `ayarlar-backup` paket listesini **çizmiyor**:
  liste yalnız bir yedek seçildikten sonra (`restoreData` doluyken) çizilir, o ekranda yedek seçilmez,
  yani **0 fark** verir. (2) Araç `kasaVeriYetki` geçmiyor ama `Settings.jsx:71` varsayılanı **`true`**;
  bugünkü ekranlar Kasa'**lı** daldır. Bu yüzden kanıt: değişen var olan ekran yalnız
  `kilit-geri-yukleme`; listeyi açık çizen üç yeni ekran eklenir (sahte yedek, "Yedekten Geri Yükle"
  adımına kadar): `ayarlar-backup-paketler` (gider ve Kasa yetkili), `ayarlar-backup-paketler-kasasiz`
  (`kasaVeriYetki: false`, R8 notu görünür), `ayarlar-backup-paketler-gidersiz` (`giderYetki: false`).
  Aşağıdaki revizyon 2 metni tarihseldir. Görsel kanıt kümesi ölçülmüş hâliyle uygulanır (bulgu B-5): paket cümlesini çizen **iki**
  ekran var, `ayarlar-backup` ve **`kilit-geri-yukleme`** (`scripts/evidence/0009-sayfa.jsx:968`;
  o ekran `crmStorage.restore`'u sahte kurup yedek döndürüyor, `:107`–`:110`, yani `restoreData`
  dolu ve liste çiziliyor). Araç `kasaVeriYetki`'yi hiç geçmiyor, yani bugünkü iki ekran zaten
  R8'in **Kasa'sız** dalıdır. DoD'nin istediği diğer iki varyant için `ayarlar(tab, o)` geçersiz
  kılma nesnesiyle iki yeni ekran eklenir (`giderYetki: false` ve `kasaVeriYetki: true`) ve kanıt
  eşlemesine kayıtları girer.

---

## Constraints

### Uyulması zorunlu

- **C1.** Yalnız gösterim ve bir veri listesi eklenir: geri yükleme sırası, koşulları, setter'ları
  ve yazdığı değerler değişmez.
- **C2.** Yedek dosyasının biçimi, `BACKUP_SCHEMA_VERSION` ve yedek alma yolu değişmez.
- **C3.** Sunucu, izin, veritabanı ve birleştirme değişmez.
- **C4.** Açıklama üretimi `bolumler` listesinin sırasını izler; ekranda bugünkü gibi küçük harfle
  ve virgülle ayrılmış tek cümle görünür (görsel değişiklik yalnız cümlenin içeriğidir). Küçültme
  `trLower` ile yapılır (R2). Boş cümle koruması (`pk.aciklama &&`, `:462`) yerinde kalır; dokuz
  paketin hepsi dolu olacağı için koşul daima doğrudur (bulgu K-12).
- **C5.** 0064'ün geri yükleme kilit ön denetimi ve devralma akışı değişmez.
- **C6.** Yeni bir veri bölümü eklendiğinde **üç** yer güncellenir ve kural `CLAUDE.md`'ye yazılır
  (bulgu K-11): geri yükleme dalı, paketin `bolumler` listesi ve kimlik sayacının listesi
  (`SettingsBackup.jsx:284`–`:286`, bugün yirmi sekiz ad). R10'un birleşim kriteri ilk ikisini,
  taramanın bir satırı üçüncüsünü denetler (kimlikli bölümlerin sayaç listesinde bulunması).
- **C7.** Üç var olan geri yükleme testi **dokunulmadan** yeşil kalır. Ölçüldü: `ui/cek-portfoy-0049`
  (`:154` `geriYukle(["Müşteri verileri"])`), `ui/gider-perdesi-yedek` (`:71`
  `getByText("Giderler")`) ve `ui/kasa-sekme-yedek` paketleri **adıyla** seçiyor, açıklama metnine
  hiç bakmıyor; R6 korunduğu sürece üçünün de metin beklentisi yoktur (bulgu Ö-10).

### KAPSAM DIŞI

- **X1.** Bölümleri paketler arasında taşımak, yeni paket açmak ya da bölüm bazında tek tek seçim
  (ilişki bütünlüğü gerekçesi 0024'ten beri yerinde: müşteri çocukları müşteriden ayrı geri
  yüklenemez).
- **X2.** Gider ayarlarını Giderler paketine taşımak (R5 yalnız yazar, taşımaz). Ayarlar
  `appSettings` içinde tek nesnedir; bölmek ayrı bir iştir.
- **X3.** Yedek dosyasının içeriğini ya da şifrelemesini değiştirmek.
- **X4.** İçe Aktar, Dışa Aktar, Çöp Kutusu ekranları (denetledim, kapsam metinleri güncel).
- **X5.** Türkçe bölüm adlarını tek sözlüğe indirip sunucunun da oradan okuması (bulgu B2'nin
  alternatifi; ESM köprüsü gerektirir).
- **X6.** Kimlik sayacının listesini (`bumpId`) paket listelerinin birleşiminden türetmek. C1'in
  "davranış değişmez" sınırında kalır; C6 yalnız kuralı ve denetimi yazar.
- **X7.** `partTypeDefs`'in kimlik sayacı listesinde olmaması. Ölçüldü: liste yirmi sekiz ad
  taşıyor ve `{id, ad}` yapısındaki `partTypeDefs` içinde yok; bu bu işin kapsamı dışında, ayrı bir
  iş olarak `specs/README.md`'nin açık bulgular tablosuna yazılır (bulgu K-11).

---

## Context

### Bugünkü paketler ve gerçek kapsamları (ölçüldü, `SettingsBackup.jsx`)

| Paket | Açıklamada yazan | Dalın gerçekte yazdığı bölümler | Eksik |
|---|---|---|---|
| Müşteri verileri | müşteriler, servisler, kalıp satışları, ödemeler, görüşmeler | `customers`, `services`, `partSales`, `payments`, `gorusmeler`, **`cekler` (tahsilata bağlı kısım)** | çekler |
| Evraklar | teklifler, proformalar, faturalar | `teklifler`, `faturalar` | yok |
| Stok ve üretim | makina stoğu, parça stoğu ve geçmişi, üretim formları | `stock`, `partStock`, `partStockLog`, `uretimFormlari`, **`yedekParcaSatislar`** | yedek parça satışları |
| Bayiler | (boş) | `dealers` | cümle yok |
| Dosyalar | müşteri, makina, servis ve bayi belgeleri | `dosyalar` | yok |
| Tanımlar | modeller, kalıp ve parça tanımları | `kalipDefs`, `partTypeDefs`, **`calisanlar`**, `customModels`, `standardModels`, `parts` | firma çalışanları |
| Notlar | (boş) | `notes` | cümle yok |
| Giderler | gider kalemleri, tekrarlayan tanımlar, gider türleri, tedarikçiler, kasa hesapları, ödemeler ve çekler | `giderTurleri`, `tedarikciler`, `giderTanimlari`, `giderler`, **`uretimPartileri`**, `kasaHesaplari`, **`kasaKapsamDisi`**, `hesapHareketleri`, `cekler` (bağsız ve verilen) | üretim partileri, kasa iş listesi |
| Firma ve ayarlar | firma bilgileri, uygulama ayarları, e-posta yapılandırması | `factory`, `appSettings`, `mailConfig`, **`mailLog`** | e-posta geçmişi |

Satır numaraları: paket tanımı `src/components/settings/SettingsBackup.jsx:142`–`:152`; geri
yükleme dalları `:209`–`:290` (çek bölünmesi `:219`–`:226`, hesap hareketlerinin yetki dalı
`:255`–`:258`, hareket bölümü olmayan eski yedeğin göçü `:287`–`:290`); cümlenin tek çizim yeri
`:462`; koşullu not emsali `:468`; kimlik sayacı listesi `:284`–`:286`; tamamlanma bildirimi
`:292`–`:296`.

### Birleşim ölçümü (R10'un dayanağı)

Dokuz paketin dokunduğu bölümler sayıldığında **tam 32** bölüm çıkıyor ve bu küme
`electron/server.cjs` `BOLUM_ADLARI` anahtarlarıyla (dolayısıyla `BLOB_SECTIONS` ile) **birebir
aynı**: `customers`, `services`, `partSales`, `payments`, `cekler`, `gorusmeler`, `teklifler`,
`faturalar`, `stock`, `partStock`, `partStockLog`, `uretimFormlari`, `yedekParcaSatislar`,
`dealers`, `dosyalar`, `kalipDefs`, `partTypeDefs`, `calisanlar`, `customModels`, `standardModels`,
`parts`, `notes`, `giderTurleri`, `tedarikciler`, `giderTanimlari`, `giderler`, `uretimPartileri`,
`kasaHesaplari`, `kasaKapsamDisi`, `hesapHareketleri`, `factory`, `appSettings`. `mailConfig` ve
`mailLog` bu kümede **yok** (R1/2, R9).

### Geri yükleme dalının yedi yazım şekli (R3'ün istisna tablosunun dayanağı)

| Şekil | Örnek | Tarama |
|---|---|---|
| 1 | `if (sec("stok") && Array.isArray(restoreData?.stock) && setStock) setStock(...)` | satır bazlı eşleşir |
| 2 | `if (sec("tanim")) setStandardModels(safeStandardModels(restoreData?.standardModels))` | istisna: `standardModels` |
| 3 | `if (sec("ayar") && restoreData?.factory) setFactory(...)` | istisna: `factory` |
| 4 | `if (sec("ayar") && restoreData?.appSettings) setAppSettings(...)` | istisna: `appSettings` |
| 5 | `mailConfig` ve `mailLog` köprü çağrıları (`window.appMail.*`) | istisna: iki `ekler` alanı |
| 6 | çek bloğu: iki `sec()` çağrısı, tek bölüm, koşul `payments` dizisine bakıyor (`:219`–`:226`) | istisna: `cekler`, iki paket |
| 7 | göç bloğu: `sec("gider")` + `giderler` **var** + `hesapHareketleri` **yok** → `hesapHareketleri` yazar (`:287`–`:290`) | istisna: `hesapHareketleri` |

### Gider ayarlarının sekiz alanı (R5'in dayanağı)

`SettingsGider.jsx:51`–`:52`: `stopajOrani`, `yururlukAy`, `hatirlatmaEsikGun`,
`indirilebilirOran` (0076), `hesapsizBaslangic` (0051), `denemeDonemiBitis` (0056),
`stopajBeyanDonemi` ve `stopajOdemeGunu` (0084). `varsayilanResmiMaliyet` (0001) de nesnede
korunur (`ortakKaynaksiz` yayılımıyla). Revizyon 1'in listesi `indirilebilirOran` ile
`hesapsizBaslangic`'i saymıyordu.

### Görsel kanıt (R12'nin dayanağı)

**Tarihseldir (revizyon 2):** bu tablonun "`ayarlar-backup` değişir" ve "Kasa'sız dal" satırları
revizyon 3 (P1) ile tersine döndü: `ayarlar-backup` listeyi çizmez (0 fark), araç varsayılanı Kasa'lıdır;
kanıt kümesi R12 ve AC-21'dedir.

| Ekran | Nerede | Durum |
|---|---|---|
| `ayarlar-backup` | `0009-sayfa.jsx` `ayarlar()` jeneratörü | **değişir** (Kasa'sız dal: araç `kasaVeriYetki` geçmiyor) |
| `kilit-geri-yukleme` | `:968`, `ayarlar("backup")` + sahte `crmStorage.restore` (`:107`–`:110`) | **değişir**, paket listesi çizili |
| gider yetkisiz varyant | **yok** | **eklenir** (`ayarlar("backup", { giderYetki: false })`) |
| Kasa'lı varyant | **yok** | **eklenir** (`ayarlar("backup", { kasaVeriYetki: true })`) |

`SettingsBackup.jsx`'in kanıt eşlemesinde bugün dört kaydı var (`ayarlar-backup` ve
`kilit-geri-yukleme`, iki rapor); iki yeni ekranın kayıtları eklenir.

### Üç sonuç

1. **Sapma dört pakette**, yalnız Giderler'de değil; ikisi (bayiler, notlar) hiç cümle taşımıyor.
2. **Hepsi aynı yoldan oluştu:** bölüm dala eklendi, cümleye eklenmedi. Elle düzeltmek bugünü
   kurtarır, bir sonraki bölümde sapma geri gelir; bu yüzden cümle listeden üretilmeli (R2) ve
   birleşim kümesi kriterle kilitlenmeli (R10).
3. **Gider ayarları Giderler paketinde değil.** Yalnız Giderler'i geri yükleyen kullanıcı kalemleri
   ve vadeleri geri alır, ama beyan dönemi (0084), yürürlük ayı ve stopaj oranı dönmez. Bugünkü
   davranış budur ve doğrudur (ayarlar tek nesne), ama ekranda yazılı değil (R5); aynı sınıf bilgi
   makinaya özgü ayarlar için de geçerli (R11).

### Bulgular (öneri kuralı 5)

**B1 · Geri yükleme dalı listeden sürülsün mü?** `bolumler` listesi varken dalları tek döngüye
çevirmek akla geliyor.

- **(a) Karar: dallar olduğu gibi kalır, test listeyle karşılaştırır (R3).** Gerekçe: dalların
  yarısı özel: `standardModels` güvenli kopyayla yazılıyor, `partTypeDefs` boş diziyi atlıyor,
  `hesapHareketleri` Kasa yetkisine göre iki kola ayrılıyor, `cekler` iki pakete bölünüyor,
  hareketsiz eski yedek için göç çağrısı var. Tek döngü bunların hepsini seçenek parametresine
  çevirir ve geri yükleme davranışını riske atar. Maliyeti: liste ile dal iki yerde kalır, ama
  ayrışma testle imkânsız olur.
- (b) Dallar listeden üretilir: tek kaynak olur. Maliyeti: yukarıdaki beş özel durum için
  parametreler ve bunların regresyon riski; bu spec'in asıl faydası (doğru cümle) için gereksiz.
- **QA turu eki (B-3, B-4):** taramanın eşleştirme kuralı satır bazlı yazıldı ve altı çok satırlı
  blok gerekçeli istisna tablosuna girdi; ayrıca R10 ile birleşim kümesi eşitliği eklendi, çünkü
  dal eşleştirmesi hiç pakete bağlanmamış yeni bir bölümü yakalamıyor.

**B2 · Türkçe bölüm adları nerede dursun?** Sunucu işlem kaydı için zaten bir sözlük taşıyor
(`server.cjs` `BOLUM_ADLARI`), ama o dosya renderer'dan içe aktarılamıyor.

- **(a) Karar: renderer'a kendi sözlüğü (`src/lib/bolumAdlari.js`), eşitliği test sabitler (R9).**
  Gerekçe: iki tarafın kullanım bağlamı farklı (biri işlem kaydı etiketi, biri kullanıcıya cümle),
  test ayrışmayı yakalar ve sunucu dosyasına hiç dokunulmaz. Maliyeti: adlar iki yerde yazılı.
- (b) Tek sözlük, sunucu onu ESM köprüsüyle okur (0024'ün `kasaGocuSaf.mjs` emsali). Gerçekten tek
  kaynak olur. Maliyeti: sunucu açılış yoluna yeni bir modül yükleme adımı; bu küçük iş için
  gereksiz risk, X5'te kapsam dışı.
- **QA turu eki (B-1, Ö-6):** eşitlik **32 blob bölümü** üzerinden iddia edilir (iki mail alanı
  `ekler`dir), ve küçültme `trLower` ile yapılır.

**B3 · Boş açıklamalı iki paket.** "Bayiler" ve "Notlar" tek bölümlü olduğu için cümlesi yok.

- **Karar: üretim bunlara da cümle yazar** ("bayiler", "notlar"). Gerekçe: liste tek kuralla
  üretilince istisna kalmaz, ekranda boşluk görünmez. Maliyeti: iki satır metin değişikliği, görsel
  kanıtta iki satır fark.

### QA turu kararları (revizyon 2, Takım Yöneticisi, 2026-10-14)

| Bulgu | Karar | Nereye işlendi |
|---|---|---|
| B-1 | Sözlük eşitliği 32 blob bölümü üzerinden; `mailConfig` ve `mailLog` `ekler`dir | R9, R1/2, AC-16 |
| B-2 | `bolumler` girdisi `{ bolum, metin }` biçimini de kabul eder; Kasa cümlesi paketin `not` alanı | R1/1, R1/3, R4, R8, AC-6, AC-9 |
| B-3 | Tarama satır bazlıdır, altı çok satırlı blok gerekçeli istisna tablosunda | R3, Context (yedi şekil), AC-14 |
| B-4 | Yeni kriter: paketlerin birleşimi bütün veri bölümlerine eşittir (bugün tam 32) | R10, Context (birleşim ölçümü), AC-15 |
| B-5 | Kanıt kümesi iki var olan ekranı sayar; iki yeni varyant ekranı eklenir | R12, Context (kanıt tablosu), AC-21, DoD |
| Ö-6 | Küçültme `trLower` ile; `toLowerCase()` bu cümlede kullanılmaz | R2, C4, AC-5 |
| Ö-7 | `ekler` tanımı düzeltilir: yedekte var, e-posta köprüsüne geri yüklenir | R1/2, AC-2 |
| Ö-8 | Gider ayarları notu sekiz alanı sayar | R5, Context (sekiz alan), AC-10 |
| Ö-9 | Çek payının `payments` koşulu kayda geçer ve korunur | R4, R7, AC-7 |
| Ö-10 | AC-11'in yöntemi yazılır; üç var olan test dokunulmaz | C7, AC-18, AC-19, DoD |
| K-11 | Üç senkron noktası (`dal`, paket listesi, kimlik sayacı) `CLAUDE.md`'ye; `partTypeDefs` eksiği açık bulgu | C6, X6, X7, AC-17, DoD |
| K-12 | Boş cümle koruması yerinde kalır | C4, AC-4 |
| K-13 | Seçili küme ilk render'da donar, koşullu cümle ona dokunmaz | R6, AC-20 |
| K-14 | Makinaya özgü ayarların geri yüklenmediği de yazılır | R11, AC-11 |
| K-15 | Tamamlanma bildiriminin bugünkü metni ölçüldü ve kriterle kilitlenir | R7, AC-13 |
| K-16 | Taban `7768968` olarak güncellenir | Başlık tablosu |

### Plan onayı kararları (revizyon 3, Takım Yöneticisi, 2026-10-14)

| Karar | Ne | Nereye işlendi |
|---|---|---|
| P1 | `ayarlar-backup` listeyi çizmiyor (0 fark); araç varsayılanı Kasa'lı; üç yeni liste ekranı (Kasa'lı, Kasa'sız, gidersiz) | R12, AC-21 |
| P2 | `teklifler` için özel ifade "teklifler ve proformalar"; özel biçim üç yerde | R1/1 |
| P3 | Tarama genel satır deseniyle ve iki yönlü; tek istisna Müşteri'nin çek payı | R3, AC-14 |
| P4 | Dal ve kanıt tabanı `9b4de51` (0085 kapanışı) | Başlık tablosu |

---

## Acceptance Criteria

### Liste ve cümle

- **AC-1.** Her paket `bolumler` listesi taşır; liste yedek dosyasındaki bölüm adlarını kullanır ve
  düz kimlik ile `{ bolum, metin }` biçimlerinin ikisini de kabul eder.
- **AC-2.** `ekler` yalnız `mailConfig` ve `mailLog`'u taşır ve bunlar paylaşılan bölüm kümesinin
  dışındadır.
- **AC-3.** Ekrandaki açıklama cümlesi listeden üretilir; dokuz paketin cümlesi kendi bölümlerinin
  Türkçe adlarını içerir.
- **AC-4.** Dokuz paketin hepsinde parantezli cümle görünür; boş cümle koruması yerinde kalır.
- **AC-5.** Küçültme `trLower` ile yapılır: `kasaKapsamDisi` adının cümledeki hâli
  "kasa iş listesi (kapsam dışı)"dır, bozuk `i̇` üretmez.
- **AC-6.** Çek kayıtları iki paketin cümlesinde kendi payıyla görünür: Müşteri verilerinde
  tahsilata bağlı çekler, Giderler'de bağsız ve verilen çekler; "çekler" kelimesi tek başına iki
  pakette birden geçmez.
- **AC-7.** Çek bloğunun bugünkü koşulu korunur: `cekler` taşıyan ama tahsilat bölümü olmayan bir
  yedekte Müşteri paketi çeklere dokunmaz.
- **AC-8.** "Stok ve üretim" cümlesinde yedek parça satışları, "Tanımlar"da firma çalışanları,
  "Giderler"de üretim partileri ve kasa iş listesi, "Firma ve ayarlar"da e-posta geçmişi görünür.
- **AC-9.** "Bayiler" ve "Notlar" paketlerinin cümlesi boş değildir.

### Notlar

- **AC-10.** Giderler paketinin altında gider ayarlarının "Firma ve ayarlar" paketinde taşındığını
  söyleyen not görünür ve sekiz ayarı sayar; gider yetkisi olmayan kullanıcıda paket de not da
  çizilmez.
- **AC-11.** "Firma ve ayarlar" paketinin altında makinaya özgü alanların (yedek klasörü, otomatik
  yedek zamanlaması) geri yüklenmediğini söyleyen not görünür.
- **AC-12.** Kasa yetkisi olmayan kullanıcıda Giderler paketinin `not` alanı virman, avans ve
  verilen çeklerin korunduğunu söyler; Kasa yetkisi olan kullanıcıda bu not çizilmez.
- **AC-13.** Tamamlanma bildiriminin metni değişmemiştir: görünen bütün paketler seçiliyse
  "Yedek başarıyla yüklendi.", kısmi seçimde seçilen paket adları listelenir.

### Taramalar

- **AC-14.** Satır bazlı tarama: aynı satırdaki `sec("id")` ile `restoreData?.X` eşleşmesi o
  paketin listesinde bulunur ve paketin her bölümü bir satırda geçer (revizyon 3 P3: iki yönlü,
  genel desen); tek istisna (Müşteri'nin çek payı) gerekçeli tabloda tam yolla ve satırla yazılıdır;
  eksik ya da fazla bölümde test düşer.
- **AC-15.** Birleşim kriteri: dokuz paketin `bolumler` birleşimi bütün veri bölümlerinin kümesine
  (bugün 32) **eşittir**; bir bölüm hiçbir pakete bağlı değilse ya da listede olmayan bir bölüm
  yazılıysa test düşer.
- **AC-16.** Renderer bölüm adları sözlüğü ile sunucunun `BOLUM_ADLARI`'sı 32 blob bölümü için aynı
  anahtarları ve aynı adları taşır; `mailConfig` ve `mailLog` bu eşitliğin dışındadır ve test bunu
  açıkça söyler.
- **AC-17.** Kimlik sayacı listesi kimlikli bölümleri kapsar ve kural (üç senkron noktası)
  `CLAUDE.md`'de yazılıdır.

### Değişmeyenler

- **AC-18.** Geri yükleme davranışı birebir aynı: dokuz paketin her biri için çağrılan setter'ların
  listesi (ad, çağrıldı mı, argüman) sabitlenir ve 0052'nin Kasa'sız kolu ile hareketsiz eski
  yedeğin göçü dahil değişmez.
- **AC-19.** Üç var olan geri yükleme testi (`ui/cek-portfoy-0049`, `ui/gider-perdesi-yedek`,
  `ui/kasa-sekme-yedek`) **dokunulmadan** yeşildir.
- **AC-20.** Paket kimlikleri, sırası, sayısı, varsayılan olarak hepsinin seçili başlaması,
  "Tümünü Seç / Tümünü Kaldır" ve gider paketinin yetki kuralı değişmemiştir; koşullu not seçili
  kümeyi etkilemez.
- **AC-21.** Görsel kanıt R12'deki kümeyle aynıdır (revizyon 3 P1): `kilit-geri-yukleme` bilinçli
  değişir, `ayarlar-backup` 0 fark verir, üç yeni ekran (`ayarlar-backup-paketler`, `-kasasiz`,
  `-gidersiz`) eklenir ve kanıt eşlemesinde kayıtlıdır.
- **AC-22.** Yedek alma yolu, dosya biçimi ve şema sürümü değişmemiştir.
- **AC-23.** Kaynak taraması: `electron/`, `src/lib/merge.js` ve veritabanı değişmemiştir.

---

## Definition of Done

- [ ] R1–R12 uygulanmış; paket listesi veri, cümle üretilmiş, iki tarama yerinde (satır eşleşmesi
      ve birleşim eşitliği).
- [ ] AC-1…AC-23 testlerle karşılanmış: `tests/yedek-paketleri-0086.test.js` (liste ile dal
      eşleşmesi, birleşim eşitliği, iki sözlüğün 32 bölüm üzerinden eşitliği, cümle üretimi ve
      `trLower`), `tests/ui/yedek-paketleri-0086.test.jsx` (dokuz paketin cümlesi, üç not, yetki
      dalları, bildirim metni).
- [ ] Üç var olan geri yükleme testi (`ui/cek-portfoy-0049`, `ui/gider-perdesi-yedek`,
      `ui/kasa-sekme-yedek`) **dokunulmadan** yeşil; davranış eşitliği yeni testteki setter çağrı
      listesiyle ölçülmüş (AC-18).
- [ ] `npm test` ve `npm run lint` yeşil.
- [ ] Görsel kanıt R12'deki (revizyon 3 P1) kümeyle çekilmiş: `kilit-geri-yukleme` ve üç yeni
      `ayarlar-backup-paketler*` ekranı değişir, `ayarlar-backup` 0 fark; `docs/evidence/0086-*` ile
      `kanit-eslemesi.json` güncel.
- [ ] `CLAUDE.md`'ye üç senkron noktası kuralı yazılmış: yeni bölüm eklerken geri yükleme dalı,
      paketin `bolumler` listesi ve kimlik sayacı listesi birlikte güncellenir.
- [ ] `specs/README.md` güncel; `partTypeDefs`'in kimlik sayacı listesinde olmaması açık bulgular
      tablosuna yazılmış (X7); `tests/spec-atiflari.test.js` `TASINACAK` listesi bu işin
      dosyalarıyla doldurulmuş ve done'a taşınırken boşaltılmış.
- [ ] Takım Yöneticisi onayladı. **Commit ve sürüm yayını yalnız açık talimatla yapılır.**
- [ ] **SCORECARD dolduruldu**, kanıt eşlemesindeki `degisti` kayıtları `ayni`ye çevrildi
      (`kanit-eslemesi.test.js`, 0011 AC-11c) ve spec `specs/done/` klasörüne taşındı.

---

## SCORECARD

Uygulama bittiğinde doldurulur.
