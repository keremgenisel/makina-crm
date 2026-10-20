# 0098 — Tahsilat hesabı seçimi Kasa sekmesinden ayrılır

| | |
|---|---|
| **Durum** | Tamamlandı (revizyon 4; uygulama `4477d2c`, 2026-10-20) |
| **Sahip** | Analist (spec) |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Ayarlar › Sunucu › Sunucu Bağlantısı › Kullanıcı Yönetimi (Kasa işlemleri akordeonu), servis formu, Extra Kalıp satışı formu, yedek parça satışı formu, müşteri detayının tahsilat formu ve "Ödendi" anahtarları, yeni müşteri formunun ilk ödeme satırları, Stok › Yedek Parça Satışı satırının "Ödendi" anahtarı, **bayi detayının iki satış formu**, **Servis ve Kargo Panosu'nun servis ve yedek parça formları (ana pencere sekmesi ve kiosk)**; `src/App.jsx`'in tahsilat hesabı kapısı; izin tanımları (`src/components/settings/serverPermissionDefs.js`) ve `src/components/settings/UserManager.jsx` |
| **Bağımlı spec'ler** | 0044 (tahsilatın hesaba bağlanması, alanın kendisi), 0063 (eksik giriş noktaları: ilk ödeme ve bayi satışları), 0024 (Kasa ekranı ve Giderler + Finans önkoşulu), 0052 (Kasa'nın kendi sekme izni), 0066 (Kasa işlemleri akordeonu ve ortak `giderActions` dizisi), 0008 (gider yayın perdesi), 0026 (genel aramanın kasa kapısı) |
| **Ters çevrilen kriterler** | 0052 AC-12'nin tahsilat yarısı; 0024'ün "Finans sekmesi olmayan kullanıcı tahsilata hesap seçemez" testi; 0044 AC-28'in testi; 0066 AC-20 (grup listesi) ve AC-21 (kutu listesi). Ayrıntı "Ters çevrilen kriterler" bölümünde |

---

## Intent

Fabrikanın satış ve servis tarafında çalışan, Finans ve Giderler ekranlarını görmeyen kullanıcı bugün bir yedek parça satışını, Extra Kalıp satışını, servis ücretini ya da makina tahsilatını "ödendi" diye işaretleyebiliyor, ama o parayı hangi kasaya ya da hangi banka hesabına koyduğunu söyleyemiyor: hesap alanı ekranda hiç çizilmiyor. Parayı teslim alan kişi bu bilgiyi bilen tek kişi olduğu için tahsilat Kasa'da "hesabı belirtilmemiş tahsilatlar" iş listesinde birikiyor ve hesabı günler sonra başka biri, kaydı hatırlamaya çalışarak tek tek atıyor; makina tahsilatı ise hiçbir iş listesinde görünmediği için hesapsız kaldığı fark edilmiyor bile.

Takım Yöneticisi'nin istediği çözüm, parayı teslim alan kullanıcıya **yalnız bu soruyu** açmak: tahsilatı hangi hesaba koyduğunu kaydın kendi formunda söyleyebilsin, Kasa ekranını, bakiyeleri, gider kalemlerini ve Finans'ı **görmeye devam etmesin**. Yetki yöneticinin elinde olsun: Kullanıcı Yönetimi'ndeki Kasa işlemleri bölümünde kullanıcı başına açılıp kapatılabilsin.

Başarı şu: Finans ve Giderler sekmesi olmayan bir kullanıcı yedek parça satışını ödendi işaretlediğinde formda "Tahsilatın girdiği hesap" alanını görür, hesabı seçer, tutar o hesabın bakiyesine girer ve kayıt Kasa'nın iş listesine hiç düşmez. Yöneticinin yetkiyi kapattığı kullanıcıda ekran bugünkü gibi davranır. Kasa ekranı hiçbir kullanıcıda bu işle görünür hâle gelmez.

---

## Requirements

- **R1.** Tahsilat hesabı seçimi kendi yetkisine bağlanır. Yetkinin ölçütü Kasa ekranının görünürlüğü değildir; Kasa ekranını görmeyen kullanıcı da bu yetkiyle hesap seçebilir.
- **R2.** Yetki Ayarlar › Sunucu › Sunucu Bağlantısı › Kullanıcı Yönetimi'nde, **Kasa işlemleri** akordeonunda, kendi başlıklı grubunda bir kutu olarak verilir.
- **R2/2.** Kimliğin ve ekran metinlerinin tamamı sabittir ve spec'te yazılıdır (QA turu, B-3 ve Ö-3): izin kimliği `tahsilat_hesap`; kutu etiketi "Tahsilat hesabını seçme (servis, Extra Kalıp, yedek parça ve makina tahsilatı)"; grubun başlığı "Tahsilat hesabı"; grubun ipucusu `TAHSILAT_HESAP_IPUCU` = "Bu yetki Kasa ekranını açmaz; yalnız tahsilatın hangi hesaba girdiğinin kaydın formunda seçilmesini sağlar."; grup Kasa akordeonunda "Hesaplar ve hareketler"in **önündedir** (yetki Kasa'sız kullanıcıda da işe yaradığı için ipucusuz grup üstte durur, etkisizlik ipucusu altındaki gruba ait olur).
- **R3.** Kutunun etiketi hangi tahsilatları kapsadığını sayar: servis, Extra Kalıp, yedek parça ve makina.
- **R4.** Yetki şu **sekiz** giriş noktasında aynı anda etkilidir (QA turu, B-1 ve Ö-1; sayı altıdan sekize çıktı): (1) servis formu, (2) Extra Kalıp satışı formu, (3) yedek parça satışı formu, (4) müşteri detayının tahsilat formu (ekleme kipinde satır başına, düzenleme kipinde form düzeyinde), (5) yeni müşteri formunun ilk ödeme satırları, (6) "Ödendi" anahtarının açtığı hesap penceresi (müşteri detayı ve Stok › Yedek Parça Satışı), (7) **bayi detayının iki satış formu** (Bayi Aracılığıyla Kalıp Satışı ve Yedek Parça Satışı; bugün de aynı kapıdan besleniyor, `SimpleDealers.jsx:757`, `:766`), (8) **Servis ve Kargo Panosu'nun servis formu ve yedek parça satışı formu** (ana pencere sekmesi ve kiosk; bugün hiç bağlı değil, ölçüm 9).
- **R4/2.** Panonun iki formu için yeni mekanizma kurulmaz: App iki prop'u pano çağrılarında da geçirir (`App.jsx:1727` sekme, `:1415` kiosk) ve `ServisPanosu` onları bugünkü imzalarla `ServiceForm` ve `YedekParcaSatisForm`'a iletir.
- **R4/3.** Panonun **ayrı penceresi** (ServisPencere) kapsam dışıdır (X8); o pencerede alan bugünkü gibi çizilmez ve bu bilinen sınır olarak yazılır.
- **R5.** Yetki **yalnız hesap seçimini** kapsar. Bir tahsilatı "ödendi" işaretleme yetkisi bu spec'le değişmez; bugünkü kayıt izinleri (servis düzenleme, Extra Kalıp düzenleme, yedek parça düzenleme, tahsilat ekleme) aynen geçerlidir.
- **R6.** Yetkisi olan kullanıcı Kasa ekranını bu yetkiyle görmez. Kasa'nın Giderler ve Finans önkoşulu ile kendi sekme izni değişmez.
- **R7.** Yetki, yöneticinin kullanıcı için işlem izinlerini hiç özelleştirmediği durumda **açıktır**. Yönetici izinleri özelleştirmişse kutu işaretli olmadıkça alan çizilmez.
- **R7/2.** Bu, işlem izinleri **daha önce özelleştirilmiş** kullanıcılar için bir kayıptır, yalnız "henüz kazanılmadı" değil (QA turu, Ö-6): bugünkü kapı `giderActions`'a hiç bakmadığı için Kasa sekmesi olan ve `giderActions`'ı özelleştirilmiş bir kullanıcı alanı bugün görüyor, yeni kimlikten sonra kutu işaretlenene kadar göremez. Kapıya `|| kasaYetki` yedeği **konmaz** (C1); kaybın yazılı telafisi `kasa_hesap` izniyle Kasa ekranından hesap atama yoludur (R19) ve bu cümle sürüm notuna girer.
- **R8.** Yetkisi olmayan kullanıcıda alan ekranda **hiç yoktur** (boş listeyle çizilmiş bir seçici de yoktur) ve kayda hesap bilgisi yazılmaz; yazılmış hesap bilgisi de temizlenmez.
- **R8/2.** Tahsilat zinciri iki prop'la yürür (dizinin null olup olmaması ve boolean kapı) ve ikisi de App'teki **tek** değerden beslenir; boolean prop'un adı `tahsilatHesapYetki` olur (QA turu, Ö-5). `kasaYetki` adı `Customers`, `CustomerDetailModal`, `Stock` ve `SimpleDealers`'ta hiç geçmez (kaynak taraması, AC-55), çünkü o ad App'te Anasayfa, Giderler, Finans, Kasa ve genel arama için **başka** anlamda yaşamaya devam eder.
- **R8/3.** (Plan P2.) Dizi prop'unun bugünkü biçimleri korunur: kapalıyken Müşteriler'e `[]`, Bayiler ve Stok'a `null` gider; yalnız koşul yeni kapıya bağlanır. Biçimi birleştirmek `CustomerDetailModal`'ın bugün doğru çalışan dallarına dokunmayı gerektirir (C8).
- **R9.** Yetkisi olmayan kullanıcı bir tahsilatı ödendi işaretlediğinde hesap penceresi açılmaz, işaret doğrudan atılır ve kaydın hesabına dokunulmaz.
- **R10.** Çevrimdışı salt okunur modda alan çizilmez.
- **R11.** Gider yayın perdesi inikken alan çizilmez.
- **R12.** Yetki tek bir kapı olarak hesaplanır ve altı giriş noktası bu tek değeri okur; her ekran kendi koşulunu yazmaz.
- **R12/2.** Kapının bileşimi yazılıdır (QA turu, Ö-2): `tahsilatHesapYetki = !giderPerdesiIndi() && makeCanDo(effectivePermissions, "giderActions")("tahsilat_hesap")`. Üç ayrıntı kriterlerin kendisidir: perde kuralı (R11, C7) bugün `giderYetki`'nin içinden geliyor ve yeni kapıda açıkça yazılmalıdır; salt okunur mod (R10) yalnız `effectivePermissions` okunursa kapanır (`READONLY_SERVER_PERMISSIONS.giderActions = []`); gider **sekmesi** şart değildir (R1) ve Finans ile Kasa sekmeleri hiç okunmaz. Admin ve yerel mod `parsePermissions`'ın null dönüşüyle kendiliğinden açıktır.
- **R12/3.** (Plan P1.) Kapının formülü saf bir yardımcıdadır: `serverPermissionDefs.js` `tahsilatHesapKapisi(izinler, perdeIndi)` ve kimlik sabiti `TAHSILAT_HESAP_ID` orada durur; App onu **tek yerde** `effectivePermissions` ve `giderPerdesiIndi()` ile çağırır. Böylece kimlik dizesi C11'in iki dosyasında kalır, kapının dört dalı (perde, salt okunur, tanımsız, özelleştirilmiş) birim testiyle ölçülür ve App ikinci bir koşul yazmaz.
- **R13.** İzin ekranında bu kutuya "Kasa sekmesi olmayan kullanıcıda bu eylemler kullanılmaz" ipucusu **basılmaz**. Kutunun grubu, yetkinin Kasa ekranını açmadığını söyleyen kendi kısa ipucusunu taşır.
- **R13/2.** Ayrımın mekanizması yazılıdır (QA turu, B-3 ve Ö-4): akordeona **yerleşimi** belirleyen küme `KASA_EYLEM_IDLERI` kalır ve yeni kimlik ona eklenir (0066 AC-12'nin birebir eşitliği korunur, AC-30); **etkisizlik ipucusu** için ikinci bir kimlik kümesi (`KASA_ETKISIZ_IDLERI`, bugünkü üç kimlik) ve ondan türeyen bir grup yüklemi (`kasaEtkisizGrupMu`) eklenir, `UserManager.jsx:184` onu kullanır. Yeni grubun kendi ipucusu **ayrı alanda ve ayrı testId ile** çizilir (grup alanı `notu`, `data-testid="tahsilat-hesap-ipucu"`); `ipucu` alanı ve `kasa-etkisiz-ipucu` testId'si yalnız etkisizlik ipucusuna kalır.
- **R14.** Yetki bugünkü gider ve kasa işlemleri izin listesinin bir kimliği olarak tutulur; yeni bir izin boyutu açılmaz.
- **R15.** Hesap listesinin içeriği değişmez: kaydın para biriminde açık hesaplar, artı aynı para birimindeki mevcut kapalı hesap.
- **R16.** Ön seçim kuralı değişmez: en son kullanılan tahsilat hesabı, yalnız değer hiç seçilmemişken.
- **R17.** Para biriminin uyumsuz kaldığı hesap bugünkü gibi temizlenir ve hesap sorulmayan kayıtta bugünkü neden metni yazılır.
- **R18.** Bakiye, gelir, borç, KDV, alacak, aylık rapor ve Aylık Gider ve Kasa Raporu rakamları bu işle değişmez.
- **R19.** Kasa ekranının hesapsız kayıtlara sonradan hesap atama yolu değişmez.
- **R20.** Sunucu yazma denetimi değişmez; bu formların bugünkü ekleme ve düzenleme izinleri yeterlidir.
- **R21.** Yeni kalıcı alan, yeni veri bölümü, yeni tablo ve yeni kilit alanı yoktur.
- **R22.** Yetkinin kapsamı dışında kalan hiçbir Kasa yeteneği bu yetkiyle açılmaz: hesap tanımlama, virman, avans, çek, gider ödemesi ve kasa iş listesini düzenleme kendi izinlerinde kalır.

---

## Constraints

### Uyulması zorunlu

- **C1. Tek kapı.** Yetki tek bir değer olarak hesaplanır ve propla dağıtılır. Yeni değer bugünkü `kasaYetki`'nin **yalnız tahsilat dağıtımının** yerine geçer: `App.jsx:1695` (Müşteriler), `:1696` (Bayiler), `:1697` (Stok) ve R4/2 ile eklenen iki pano çağrısı (`:1727`, `:1415`). `kasaYetki` bu satırların dışında aynen yaşamaya devam eder (C9). Sekiz giriş noktasından biri kendi başına izin okursa biri açık biri kapalı kalabilir; bu alan bugün tam da bu yüzden tek kapıdan geçiyor.
- **C2. Kasa ekranının önkoşulu dokunulmaz.** `src/lib/permissions.js:38` `kasaSuz` (Kasa yalnız Giderler ve Finans birlikte görünürken görünür, spec 0024 C6) ve spec 0052'nin kendi sekme izni aynen kalır. Bu spec yalnız **alanın** kapısını o kuraldan ayırır.
- **C3. İzin boyutu `giderActions` kalır** (spec 0066 R3, C5: iki akordeon aynı diziyi yazar, ayrı `kasaActions` boyutu bilinçli olarak yok). Yeni kimlik bu dizinin bir üyesidir; sunucuda yeni boyut, göç ve izin ekranında ayrı durum açılmaz.
- **C4. Sunucu alan denetimi eklenmez; bu kabul edilmiş bir sınırdır.** Ölçüm 4: `hesapId` bugün `serverAuth.cjs:569` `ALAN_IZINLERI` haritasında yok ve o harita yalnız **var olan** kaydın düzenlenmesini yakalar, yeni kayıt EKLE dalından geçer. Alanı haritaya eklemek yarım koruma verir (satışı yeni oluştururken denetlenmez) ve `kasa_hesap` izni olup yeni kimliği olmayan Kasa kullanıcılarının hesap atamasını 403'e düşürür. Uygulamanın bölüm düzeyinde güven modeliyle tutarlı olarak denetim eklenmez ve bu sınır spec'te yazılıdır.
- **C5. "Akordeona yerleşim" ile "Kasa'sız kullanıcıda etkisiz" kümeleri ayrılır.** Bugün ikisi aynı kümeden okunuyor (`src/components/settings/serverPermissionDefs.js:28` `KASA_EYLEM_IDLERI`, `:259` `kasaGrubuMu`, `UserManager.jsx:184`). Yeni kimlik Kasa akordeonuna girer ama etkisizlik ipucusunun kapsamına **girmez**; ipucu bugünkü üç kimlikte kalır. Ayrımın nasıl kurulduğu R13/2'de yazılı: bugünkü ekran ipucuyu **grup nesnesine** yazıp **tek** testId ile çiziyor (`:258`), yani iki anlamı aynı yuvaya koymak ölçüm 10'daki üç test iddiasını birden bozar.
- **C6. Varsayılan açık ve eylem izinlerine "varsayılan kapalı" mekanizması eklenmez.** `src/lib/permissions.js:18` `makeCanDo` kuralı "izin listesi tanımsız = serbest"tir; sekmelerdeki `VARSAYILAN_KAPALI_SEKMELER`'in eylem izni karşılığı yok ve bu iş için kurulmaz.
- **C7. Perde kuralı korunur.** Gider yayın perdesi inikken (spec 0008) alan çizilmez; 0024 AC-35 bu spec'te ters çevrilmez. Perde kasa ve gider modülünün bütününü kullanıcıdan kapatır, hesap adları da o bütünün parçasıdır.
- **C8. Alanın içerik kuralları değişmez.** Seçilebilir hesaplar, ön seçim, para birimi uyumu, ipucu metinleri, hesap sorulmayan kaydın nedeni ve tek paylaşılan bileşen kuralı (spec 0044 ve 0063) aynen geçerlidir; bu spec yalnız kapıyı değiştirir.
- **C9. Bugünkü kasa yetkisinin diğer tüketicileri dokunulmaz.** Giderler ekranının çek ve ödeme alanları, Kasa ekranının kendisi, Finans'taki Aylık Gider ve Kasa Raporu düğmesi, o raporun verisi ve **genel arama** bugünkü kurala bağlı kalır (`App.jsx:898`, `:1692`, `:1699`, `:1707`, `:1710` ve genel aramanın üç satırı `:1505`, `:1508`, `:1511`). Yeni yetki **arama kategorisi açmaz**: kasa hesabı ve çek sonuçlarının kapısı `GlobalSearch.jsx:47-48` ile bugünkü `kasaYetki` ve `onGoKasa`'dır (QA turu, B-2).
- **C10. Hesapsız kalan tahsilatın bugünkü yolu bozulmaz.** Yetkisi olmayan ya da hesabı boş bırakan kullanıcının tahsilatı Kasa'nın iş listesinde görünmeye devam eder; bu spec o yolu daraltmaz, yanına ikinci bir yol koyar. Makina tahsilatı bu listede bugün de yok (ölçüm 6, X1) ve kriterler bunu ayrı söyler (AC-10, AC-57).
- **C11. Tek kapının kaynak tarama ölçütü yazılıdır** (QA turu, K-3): `src/` altında `tahsilat_hesap` dizesi yalnız `src/App.jsx` ve `src/components/settings/serverPermissionDefs.js`'te geçer. Formların `kasaHesaplari && form.odendi` koşulu bir **prop** okumasıdır, izin koşulu değildir ve taramaya girmez. İkinci tarama prop adının tekliğidir (R8/2, AC-55).
- **C12. Hiç açık hesap yokken davranış değişmez.** Yetkili ama hesap tanımlayamayan kullanıcı (`kasa_hesap` izni ve Kasa ekranı yok) her kayıtta bugünkü ibareyi görür ("… para biriminde açık hesap yok"); alan gizlenmez (C8, AC-34). Bilinen sınır olarak yazılı ki ilk geri bildirimde "alan boş geliyor" diye yeniden açılmasın (QA turu, K-4).
- **C12/2.** (Triyaj 2026-10-20, bulgu 4; bilinen sınır.) Alanın ipucusu boş bırakılan tahsilatın "Kasa'da hesabı
  belirtilmemiş tahsilatlar arasında" beklediğini söyler (`TahsilatHesap.jsx`); bu spec'ten beri alanı Kasa'yı görmeyen kullanıcı
  da görür. C8 metnin değişmemesini istediği için metin aynen kalır; ilk geri bildirimde yeniden açılmasın diye burada ve kodda
  yazılıdır. Nötrleştirmek ("… hesapsız tahsilatlar arasında bekler") ayrı bir iştir.

### KAPSAM DIŞI

- **X1.** Hesapsız kalan **makina** tahsilatının (müşteri ödemeleri) Kasa'nın iş listesinde görünmesi — *neden:* boşluğun asıl nedeni alanın hiç çizilmemesiydi ve bu spec onu kapatıyor; üstelik düzeltmesi göründüğünden pahalı, çünkü iş listesinin kalemleri aylık raporla paylaşılan tek kaynaktan okunuyor (ölçüm 6) ve makina bacağı yalnız kasa tarafına eklenmeli, yoksa raporun tahsilat rakamı değişir. Bilinen sınır olarak durur (spec 0058 X6, 0063 X6).
- **X2.** Ayrı bir `kasaActions` izin boyutu — *neden:* spec 0066 R3'ün bilinçli kararı; sunucuda yeni boyut, göç ve izin ekranında ayrı durum demek. Bedeli, yöneticinin bu kutuyu tek başına vermek için gider işlemlerini de özelleştirmiş olması (ölçüm 7); ekranda zaten yazılı (`GIDER_KASA_ORTAK_NOT`).
- **X3.** Kasa ekranının Giderler + Finans önkoşulunun gevşetilmesi — *neden:* önkoşulun gerekçesi (yarım veriyle bakiye gösterilmez) hâlâ geçerli ve bu istek Kasa ekranını istemiyor.
- **X4.** Gider tarafının ödeme hesabı seçicileri (gider formu, ödeme penceresi, virman, avans, çek) — *neden:* onlar Giderler ve Kasa ekranlarının işi; bu spec'in kapsamı Kasa'yı görmeyen satış ve servis kullanıcısının tahsilatı.
- **X5.** Hesap adlarının bu kullanıcıdan gizlenmesi ya da okuma filtresi — *neden:* uygulamada okuma filtresi bilinçli olarak yok (hesap listesi bugün de her istemcinin verisinde duruyor, ölçüm 3); gizleme yeni ve büyük bir mekanizma olurdu.
- **X6.** Yeni bir kullanıcı rolü ya da hazır izin paketi ("kasiyer" gibi) — *neden:* uygulamada rol iki değerlidir (admin, user) ve izinler kutu kutu verilir; yeni rol bu işin ihtiyacı değil.
- **X7.** Tahsilat hesabı atamasının İşlem Geçmişi'ne ayrı kayıt yazması — *neden:* bugün de yazmıyor; satışın kendi kaydı ve sunucunun `veri_kaydedildi` satırı yazımı gösteriyor.
- **X8.** Servis ve Kargo Panosu'nun **ayrı penceresi** (ServisPencere) — *neden:* köprü veri taşır, fonksiyon taşımaz (ölçüm 9): `tahsilatHesapVarsayilan` bir fonksiyondur ve IPC'den geçmez, ön seçimi pencerede yeniden hesaplamak için `sonTahsilatHesabi`'nin istediği `payments` dizisi de anlık görüntüde yok (`ServisPencere.jsx:17`). İki yeni köprü yükü (yeni anlık görüntü anahtarı ve pencere içinde ön seçim hesabı) bu işin boyutunu değiştirir. O pencerede alan bugünkü gibi çizilmez; aynı kayıt sekmedeki panodan ya da müşteri detayından işaretlenebilir (R4/3, AC-45).

---

## Context

Bütün ölçümler 2026-10-20'de bugünkü `main` (`b53d94d`) üzerinde yapıldı.

**Ölçüm 1, kapı üç sekme istiyor.** Alanın tek kapısı `App.jsx:193` `kasaYetki = giderYetki && (görünür sekmelerde "kasa" var mı)`. Kasa'nın görünürlüğü `src/lib/permissions.js:38` `kasaSuz` ile Giderler **ve** Finans'ın birlikte görünür olmasına bağlı, üstüne spec 0052'nin kendi sekme izni biner. `gorunurSekmeler` beş izin listesiyle çalıştırıldı:

| İzin listesi | `kasaYetki` |
|---|---|
| `dashboard, customers, stock, servis` | yok |
| `… , kasa` | yok |
| `… , kasa, finance` | yok |
| `… , kasa, gider` | yok |
| `… , kasa, gider, finance` | **var** |

Yani Takım Yöneticisi'nin bildirdiği durum Finans'a özgü değil: Finans açılsa da alan çıkmaz, Giderler ve Kasa da gerekir. Bugünkü tek "çözüm" kullanıcıya üç ağır sekmeyi birden vermek.

**Ölçüm 2, kapı tek yerde ve altı noktayı birlikte besliyor.** App üç ekrana aynı iki değeri kapıyla geçiyor: `App.jsx:1695` (Müşteriler, `kasaHesaplari={kasaYetki ? canliKasaHesaplari : []}`, `kasaYetki`, `tahsilatHesapVarsayilan={kasaYetki ? … : null}`), `:1696` (Bayiler), `:1697` (Stok). Oradan aşağısı:

| Giriş noktası | Kapı |
|---|---|
| Servis formu | `ServiceForm.jsx:522` `{kasaHesaplari && form.odendi && …}` |
| Extra Kalıp formu | `PartSaleForm.jsx:254` aynı koşul |
| Yedek parça formu | `YedekParcaSatisForm.jsx:266` aynı koşul |
| Müşteri detayı, tahsilat satırı | `CustomerDetailModal.jsx:1411` `satirEki={kasaYetki ? … : undefined}` |
| Müşteri detayı, tahsilat düzenleme | `CustomerDetailModal.jsx:1416` `{kasaYetki && paymentForm.id && …}` |
| Yeni müşteri formu, ilk ödeme | `CustomerAddEditForm.jsx:462` `satirEki={kasaHesaplari ? … : undefined}` |
| "Ödendi" anahtarı, müşteri detayı | `CustomerDetailModal.jsx:242` `if (!kasaYetki) return uygula(undefined);` |
| "Ödendi" anahtarı, Stok › Yedek Parça | `YedekParcaSatisTab.jsx:210` `yeni && kasaHesaplari ? … : null` |
| Üç form, müşteri detayından | `CustomerDetailModal.jsx:1479`, `:1492`, `:1507` `kasaHesaplari={kasaYetki ? kasaHesaplari : null}` |
| Kayıt yolu, hesap yazılması | `CustomerDetailModal.jsx:648`, `:669`; `Customers.jsx:303` (ilk ödemede `hesapId` satırdan atılır) |

Taradım: bu üç ekranda `kasaHesaplari`, `kasaYetki` ve `tahsilatHesapVarsayilan` prop'larının **başka hiçbir kullanımı yok** (`Customers.jsx:31`, `:303`, `:663`, `:724`; `Stock.jsx:21`, `:79`; `SimpleDealers.jsx:24`, `:757`, `:766`). Yani kapının değeri değiştiğinde açılan tek şey tahsilat hesabı; başka bir yetenek yan etkiyle açılmıyor.

**Ölçüm 3, bu bir güvenlik kuralı değil, çizim kuralı.** `hesapId` `serverAuth.cjs:569` `ALAN_IZINLERI` haritasında yok; satışı yazabilen kullanıcı hesabı da yazabiliyor. `:367` `tahsilatHesabiYalnizMi` bir **izin**, kısıt değil: yalnız `hesapId`'nin değiştiği yazımda, Müşteriler ya da Stok sekmesi olmayan Kasa kullanıcısının yazmasına kapı açıyor (`:472`, koşulu `:461` `kasaGorunurMu` = gider + finans). Bizim durumumuzdaki kullanıcı satışın kendi bölümünü zaten yazabiliyor, o kapıya ihtiyacı yok. Ayrıca hesap listesi bugün de bu istemcinin verisinde duruyor (uygulamada okuma filtresi bilinçli olarak yok): alan gizlendiğinde saklanan bir bilgi yok, yalnız çizilmiyor.

**Ölçüm 4, ön seçim gider verisi okumuyor.** `App.jsx:865` `tahsilatHesapVarsayilan` → `kasa.sonTahsilatHesabi` (`kasa.js:377`) yalnız tahsilat kayıtlarını ve hesapları okuyor (`payments` + satış kalemleri). Finans ve Giderler sekmesi olmayan kullanıcıda da doğru çalışır, yeni veri gerekmez.

**Ölçüm 5, varsayılan açık olur.** `src/lib/permissions.js:18` `makeCanDo`: `const allowed = perms[groupKey] ?? null; return (action) => !allowed || allowed.includes(action);`. İzin listesi tanımsız olan kullanıcıda her eylem serbest. Yani yeni kimlik, işlem izinleri hiç özelleştirilmemiş kullanıcıda kendiliğinden açık olur ve sorun ilk güncellemede çözülür. Ters taraf: `READONLY_SERVER_PERMISSIONS` (`src/lib/permissions.js:58`, çevrimdışı salt okunur mod; App'te `effectivePermissions`, `:180`) `giderActions: []` yazıyor, yani çevrimdışı modda alan kapalı kalır. Bu doğru sonuç: o modda bütün ekleme ve düzenleme düğmeleri zaten gizli.

**Ölçüm 6, hesapsız kalan para ne oluyor.** Servis, Extra Kalıp ve yedek parça tahsilatı hesapsız kaydedilince Kasa'nın "hesabı belirtilmemiş tahsilatlar" iş listesine düşüyor (`kasa.js:290` `hesapsizTahsilatlar`, `:301`). **Makina tahsilatı düşmüyor:** listenin kalemleri `kasa.js:61` üzerinden `satisTahsilat.js:41` `satisTahsilatKalemleri`'nden geliyor, o da yalnız servis, kalıp ve yedek parçayı tarıyor; `payments` hiç girmiyor. Aynı fonksiyon aylık raporun tahsilat kalemini de üretiyor (`aylikRapor.js:344`), yani makina bacağı oraya eklenirse raporun rakamı değişir. Bu yüzden boşluk X1'de kapsam dışı.

**Ölçüm 7, izin ekranının iki tuzağı.**

1. **Ortak dizi.** "Kasa işlemleri" akordeonu ayrı bir boyut değil; Gider akordeonuyla aynı `giderActions` dizisini ve aynı üç durumu paylaşıyor (`UserManager.jsx:200` ve `:202` aynı `editGiderActions`/`editGiderActionsOn`/`giderOn`; ekranda `GIDER_KASA_ORTAK_NOT` ile yazılı, `src/components/settings/serverPermissionDefs.js:263`). Sonucu: yöneticinin yeni kutuyu tek başına vermesi için "özelleştir"i açıp diğer kutuları kaldırması gerekir ve bu aynı anda gider işlemlerini de özelleştirmiş olur. Bu bilinen ve kabul edilmiş tasarım (X2).
2. **Etkisizlik ipucusu tersine döner.** `UserManager.jsx:184` Kasa akordeonundaki **her gruba** `KASA_ETKISIZ_IPUCU`'yu basıyor: "Kasa sekmesi olmayan kullanıcıda bu eylemler kullanılmaz." Yeni kimlik tam tersi, Kasa sekmesi olmayanda **işe yarayan** ilk kutu; aynı akordeona girince ekran kendi kendini yanlışlar. Bugün "akordeona yerleşim" (`:259` `kasaGrubuMu`) ile "Kasa'sızda etkisiz" aynı kümeden (`:28` `KASA_EYLEM_IDLERI`) okunduğu için ikisi ayrılmalı (C5). `tests/server-permission-defs.test.js:79` AC-12 Kasa akordeonunun kimliklerinin bu kümeyle **birebir eşit** olmasını istiyor; yeni kimlik kümeye eklenirse o kriter korunur, ipucu kümesi ayrı olur.

**Ölçüm 8, ters çevrilecek testler (QA turunda düzeltildi, B-4).** Ayrım **dosya** düzeyinde değil **test** düzeyindedir: aynı dosyada hem prop'u doğrudan süren bileşen testleri hem gerçek App testleri var. Ters çevrilecek üç test:

| Test | Düzenek | Bugün | Bu spec'le |
|---|---|---|---|
| `tests/ui/kasa-app.test.jsx:147` ("AC-25 / C6: Finans sekmesi olmayan kullanıcı tahsilata hesap seçemez") | `tabs: dashboard, customers, gider` | alan yok | alan çizilir |
| `tests/ui/kasa-sekme-izni.test.jsx:177` (0052 AC-12) | `tabs: dashboard, customers, gider, finance` (kasa yok) | tahsilat seçicisi yok | tahsilat yarısı çizilir, ödeme yarısı aynen kalır |
| `tests/ui/tahsilat-hesap.test.jsx:152` ("AC-28: kasa yetkisi (Giderler + Finans) olmayan kullanıcıya hesap sorulmaz") | gerçek App, `tabs: dashboard, customers, gider` | pencere açılmaz, `hesapId == null` | pencere açılır, seçim kayda yazılır |

Üçünün düzeneğinde de `giderActions` tanımsızdır, yani yeni kimlik varsayılan açıktır (ölçüm 5). **Korunanlar:** `tests/ui/kasa-app.test.jsx:138` (0024 AC-35, perde, C7) ve `tests/ui/tahsilat-hesap.test.jsx:144` (0044 AC-20, perde). Gerçekten prop sürülen bileşen testleri etkilenmiyor (`tests/ui/tahsilat-hesap.test.jsx:190`–`:264`, `tests/ui/tahsilat-hesap-0063.test.jsx`); spec 0063'ün AC-3 ve AC-14'ü ("kasa yetkisi olmayan kullanıcıda alan DOM'da yoktur") geçerli kalır, yalnız "kasa yetkisi" ifadesi artık bu spec'in yetkisini anlatır.

**Ölçüm 9, Servis ve Kargo Panosu hiçbir yerden bağlı değil (B-1).** Pano `ServisPanosu.jsx:900`'de **aynı** `ServiceForm`'u, `:885`'te bir `YedekParcaSatisForm`'u çiziyor; ama App panoya ne `kasaHesaplari` ne `tahsilatHesapVarsayilan` geçiriyor (sekme `App.jsx:1727`, kiosk `:1415`; iki satırda da kasa prop'u yok). Formun kapısı `kasaHesaplari && form.odendi` olduğu için kullanıcı hangi yetkiye sahip olursa olsun alan çizilmez; `hesapDurumu` da aynı prop'a bağlı (`ServiceForm.jsx:73`, `YedekParcaSatisForm.jsx:58`), yani ön seçim de hiç çalışmaz. Servis katı kiosk'u (`tabs:["servis"]`, `giderActions` tanımsız) yeni yetkiyi R7 gereği kendiliğinden alır ve hâlâ parayı hangi hesaba koyduğunu söyleyemez; kiosk'un tek ekranı pano olduğu için başka yolu da yok. **Ayrı pencere ayrı bir iştir:** köprü sabit bir anlık görüntü taşıyor (`ServisPencere.jsx:17`'den başlayan `BOS` şekli), içinde `payments` yok ve `tahsilatHesapVarsayilan` bir fonksiyon, IPC'den geçmez (X8).

**Ölçüm 10, tahsilat zincirinin tam envanteri ve iki prop kanalı (Ö-1, Ö-5).** Alanın bugün ulaşılabildiği her yer, kapısıyla:

| Giriş noktası | Dosya | Kapı |
|---|---|---|
| Müşteri detayı, üç form | `CustomerDetailModal.jsx:1479`, `:1492`, `:1507` | `kasaYetki ? kasaHesaplari : null` |
| Müşteri detayı, tahsilat satırı ve düzenleme | `:1411`, `:1416` | `kasaYetki` |
| Müşteri detayı, "Ödendi" penceresi | `:242`, `:1512` | `kasaYetki` |
| Yeni müşteri formu, ilk ödeme | `CustomerAddEditForm.jsx:462` | `kasaHesaplari` (null, `Customers.jsx:724`) |
| Stok › Yedek Parça, form ve anahtar | `YedekParcaSatisTab.jsx:364`, `:210` | `kasaHesaplari` (null, `App.jsx:1697`) |
| **Bayi detayı, iki satış formu** | `SimpleDealers.jsx:757`, `:766` | `kasaHesaplari` (null, `App.jsx:1696`) |
| **Servis Panosu, iki form** | `ServisPanosu.jsx:900`, `:885` | **yok** (ölçüm 9) |

İki ayrı kanal olduğu dikkat ister: bazı noktalar dizinin **null** olmasına, bazıları `kasaYetki` **boolean'ına** bakıyor, App ikisini aynı satırda yazıyor (`:1695`). Müşteriler dalında dizi boş liste olarak gidiyor (`[]`, truthy) ve null'a çevrim `Customers.jsx:724` ile `CustomerDetailModal.jsx:1479` civarında yapılıyor; biri yeni kapıya çevrilip diğeri `kasaYetki`'de kalırsa bir nokta açık, komşusu kapalı kalır. Ayrıca `kasaYetki` genel aramaya da gidiyor (`App.jsx:1505`, `:1508`, `:1511`) ve `GlobalSearch.jsx:47-48` kasa hesabı ile çek kategorilerinin kapısı tam bu değer; C1 harfiyen "kasaYetki dağıtımının yerine" diye okunursa tahsilat yetkili satış kullanıcısı aramada hesapları ve çekleri listeler ve hiçbir şey çizmeyen Kasa sekmesine yollanır (AC-11'in yasakladığı sonuç). Bu yüzden C1 üç satıra daraltıldı ve C9 genel aramayı adıyla saydı.

**Ölçüm 11, izin ekranının üç birebir test iddiası (B-3).** Yeni grup ve yeni kutu bugünkü üç yeşil iddiayı birden bozar:

1. `tests/server-permission-defs.test.js` 0066 **AC-20**: `KASA_AKORDEON_GRUPLARI.map(g => g.grup)` tam olarak `["Hesaplar ve hareketler"]` olmalı. Yeni grup bunu kırar, ters çevrilir.
2. Aynı dosyanın 0066 **AC-21**: `GIDER_ACTION_GROUPS`'un bütün kutuları on iki üyeli listeyle **birebir** eşit olmalı. Yeni kutu bunu kırar, ters çevrilir.
3. `tests/ui/kasa-izin-akordeonu-0066.test.jsx:51` `getAllByTestId("kasa-etkisiz-ipucu")`'nun uzunluğunun **1**, `:52`'nin `within(kasa).getByTestId(...)` ile tek eleman bulmasını istiyor; `:135`'teki yardımcı da "Kasa akordeonunda ipucu var mı" sorusunu aynı testId ile soruyor. İpucu `UserManager.jsx:258`'de grup başına tek alandan ve tek testId'den çiziliyor. Yeni grup kendi ipucusunu bu yuvaya yazarsa sayı 2 olur, `getByTestId` fırlar ve `:135` yardımcısı etkisizlik ipucusu hiç basılmasa da her zaman true döner: AC-25'in koşulunu ölçen test ölçmez olur. Çözüm R13/2'de (ayrı alan, ayrı testId).

Ayrıca `src/` ve `electron/` tarafında yeni kimliği doğrulayan bir beyaz liste **yok**: sunucu izin JSON'unu olduğu gibi saklıyor (`server.cjs:530`, `:547`) ve `serverAuth.cjs` yalnız bildiği kimlikleri soruyor, yani yeni kimlik istemci tarafı bir eklemedir (C4, AC-39).

---

## Kararlar

Dört karar Takım Yöneticisi tarafından **2026-10-20'de**, spec yazılmadan önce onaylandı. Her biri için reddedilen seçeneğin bedeli kalıcı kayıt olarak burada duruyor.

**Karar 1 (onaylandı): yetkinin kapsamı yalnız hesap seçimi, "ödendi" işaretlemesi değil.** Gerekçe: bir tahsilatı ödendi yapma yetkisi bugün servis, Extra Kalıp, yedek parça ve tahsilat izinlerinde ve bu kullanıcıda zaten var; eksik olan yalnız hangi hesaba girdiğini söyleyememek. Reddedilenin bedeli: yetki işaretlemeyi de kapsarsa aynı düğmenin iki izni olur ve yeni kimlik kapalı bırakılan bir kullanıcı bugün yapabildiği işaretlemeyi sessizce kaybeder (R5).

**Karar 2 (onaylandı): varsayılan açık.** Gerekçe: uygulamanın eylem izinlerinde "tanımsız = serbest" kuralı var, yani kimlik işlem izinleri hiç özelleştirilmemiş kullanıcıda kendiliğinden açık olur ve sorun ilk güncellemede çözülür. Reddedilenin bedeli: varsayılanı kapalı yapmak eylem izinleri için bugün olmayan bir "varsayılan kapalı" mekanizması gerektirir (sekmelerde var, eylemlerde yok). Kabul edilen bedel: `giderActions`'ı daha önce özelleştirilmiş kullanıcılarda kutu işaretlenene kadar alan görünmez; bu sürüm notuna yazılır (R7).

**Karar 3 (onaylandı): sunucu denetimi eklenmez, kabul edilen sınır olarak yazılır.** Gerekçe ve reddedilenin bedeli C4'te ölçümle birlikte yazılı: alan düzeyi denetim yalnız düzenlemeyi yakalar, yeni kayıt EKLE dalından geçer ve bugünkü Kasa kullanıcıları 403 alır; yani yarım koruma, tam risk.

**Karar 4 (onaylandı): kimlik kendi grubunda, Kasa işlemleri akordeonunun içinde, etiketi kapsamı sayar.** Gerekçe: yöneticinin bu kutuyu Kasa'yı açmakla karıştırmaması gerekiyor; kendi grubu ve kendi ipucusu olmazsa akordeonun "Kasa sekmesi olmayanda etkisiz" ipucusunun altında yanlış anlaşılır (ölçüm 7, madde 2). Reddedilen: kutuyu bugünkü "Hesaplar ve hareketler" grubuna eklemek; bedeli aynı ipucunun bu kutuyu da yanlışlaması.

### QA turu kararları (2026-10-20)

Dört karar daha, QA boşluk analizinin ardından aynı gün onaylandı.

**Karar 5 (onaylandı): Servis ve Kargo Panosu kapsama girer, ayrı penceresi girmez.** Gerekçe: Intent "servis ücretini ödendi işaretleyen" kullanıcıyı adıyla sayıyor ve servis katı kiosk'unun tek ekranı pano; pano dışarıda kalırsa spec kendi başarı ölçüsünü karşılamaz (ölçüm 9). Panonun iki formu bugünkü prop imzalarıyla beslenir, yeni mekanizma kurulmaz (R4/2). Reddedilenin bedeli: panoyu bütünüyle kapsam dışına almak isteğin asıl sahibini bugünkü boşlukta bırakırdı; ayrı pencereyi kapsama almak ise iki yeni köprü yükü (yeni anlık görüntü anahtarı ve pencere içinde ön seçim hesabı) demekti ve işin boyutunu değiştirirdi (X8).

**Karar 6 (onaylandı): bugünkü Kasa kullanıcısının kaybı kabul edilir, kapıya ikinci bir dal konmaz.** Gerekçe: `giderActions`'ı özelleştirilmiş Kasa kullanıcısı alanı bugün sekme kuralıyla görüyor, yeni kimlikten sonra kutu işaretlenene kadar göremez; bu bir regresyondur ve sürüm notuna yazılır (R7/2). Reddedilen: `canDo(yeni) || kasaYetki` yedeği; bedeli iki doğruluk kaynağı ve yöneticinin kutuyu kapatmasının Kasa kullanıcısında hiç işe yaramaması, yani C1'in ilk günde bozulması.

**Karar 7 (onaylandı): kimlik ve bütün ekran metinleri spec'te sabit yazılır.** Gerekçe: bu dizeler kodda sabit ve testler birebir karşılaştırıyor (0066 AC-21), kanıt aracının adımları da başlıkla çalışıyor; metni vermeyen bir kriter ölçülemez. Karar R2/2'de. Reddedilen: metni uygulama ayrıntısı saymak; bedeli AC-24 ve AC-26'nın "metin var mı" düzeyine inmesi ve grup sırasının kanıt adımlarını kırması.

**Karar 8 (onaylandı): yerleşim kümesi ile etkisizlik ipucusu kümesi ayrı tutulur, yeni grubun notu ayrı testId alır.** Gerekçe: ölçüm 11'in üç iddiası; ipucu bugün grup başına tek alandan ve tek testId'den çiziliyor, iki anlamı aynı yuvaya koymak AC-25'in testini sessizce boşa düşürüyor. Karar R13/2'de. Reddedilen: yerleşimi grup bayrağına (`servisPano` deseni) çevirmek; bedeli 0066 AC-12'nin kimlik kümesi eşitliğini kaybetmek ve AC-30'u ölçülemez kılmak.

---

## Acceptance Criteria

**Yetkinin etkisi**

- **AC-1.** Sekme listesi `dashboard, customers, stock, servis` olan (Finans, Giderler ve Kasa'sı olmayan) kullanıcı, yeni bir yedek parça satışını "ödendi" işaretlediğinde formda "Tahsilatın girdiği hesap" alanını görür.
- **AC-2.** Aynı kullanıcı Extra Kalıp satışı formunda "ödendi" işaretlediğinde alanı görür.
- **AC-3.** Aynı kullanıcı servis formunda "ödendi" işaretlediğinde alanı görür.
- **AC-4.** Aynı kullanıcı müşteri detayının tahsilat formunda, tutarı girilmiş satırda alanı görür.
- **AC-5.** Aynı kullanıcı yeni müşteri formunun ilk ödeme satırında, tutarı girilmiş satırda alanı görür.
- **AC-6.** Aynı kullanıcı Stok › Yedek Parça Satışı satırının "Ödendi" anahtarına bastığında hesap penceresi açılır.
- **AC-7.** Aynı kullanıcı müşteri detayından bir servisi "Ödendi" yaptığında hesap penceresi açılır.
- **AC-8.** Aynı kullanıcının seçtiği hesap kayda yazılır ve tutar o hesabın bakiyesine girer.
- **AC-9.** Aynı kullanıcının hesabı seçtiği **servis, Extra Kalıp ya da yedek parça** tahsilatı, Kasa'nın "hesabı belirtilmemiş tahsilatlar" listesinde **görünmez**.
- **AC-10.** Aynı kullanıcı hesabı boş bırakırsa kayıt hesapsız doğar ve hiçbir bakiyeye girmez; **servis, Extra Kalıp ve yedek parça** tahsilatı Kasa'nın iş listesinde görünür (makina tahsilatı için AC-58).
- **AC-11.** Aynı kullanıcı Kasa sekmesini menüde **görmez**; Kasa ekranına yönlendirilemez.
- **AC-12.** Aynı kullanıcı Giderler ve Finans sekmelerini de görmez (bu iş görünürlük kurallarını değiştirmez).

**Yetki kapalıyken**

- **AC-13.** İşlem izinleri özelleştirilmiş ve yeni kutusu işaretsiz kullanıcıda alan üç formun hiçbirinde **DOM'da yoktur**; boş listeyle çizilmiş bir seçici de yoktur.
- **AC-14.** Aynı kullanıcı müşteri detayından bir servisi "Ödendi" yaptığında pencere açılmaz, işaret atılır ve kaydın hesap bilgisi değişmez.
- **AC-15.** Aynı kullanıcının kaydettiği satışta hesap bilgisi **yazılmaz** (alanın değeri `null` olarak da yazılmaz).
- **AC-16.** Aynı kullanıcı daha önce hesabı atanmış bir kaydı düzenlediğinde kaydın hesap bilgisi korunur, temizlenmez.
- **AC-17.** Yeni müşteri formunun ilk ödeme satırlarında alan yoktur ve kayda hesap bilgisi girmez.

**Sınır durumları**

- **AC-18.** Çevrimdışı salt okunur modda alan hiçbir formda çizilmez.
- **AC-19.** Gider yayın perdesi inikken alan hiçbir formda çizilmez (0024 AC-35 korunur).
- **AC-20.** Yerel modda (sunucu kapalı) ve sunucu PC'de alan bugünkü gibi çizilir.
- **AC-21.** Admin rolünde alan bugünkü gibi çizilir.
- **AC-22.** İşlem izinleri hiç özelleştirilmemiş (`giderActions` tanımsız) kullanıcıda alan çizilir.

**İzin ekranı**

- **AC-23.** Kullanıcı Yönetimi'nin "Kasa işlemleri" akordeonunda, yeni kimlik kendi başlıklı grubunda tek kutu olarak çizilir.
- **AC-24.** Kutunun etiketi servis, Extra Kalıp, yedek parça ve makina tahsilatını sayar.
- **AC-25.** Kasa sekmesi olmayan kullanıcı düzenlenirken "Kasa sekmesi olmayan kullanıcıda bu eylemler kullanılmaz" ipucusu yeni kimliğin grubuna **basılmaz**; akordeonun diğer grubuna bugünkü gibi basılır. Ölçü iki parçalıdır: `kasa-etkisiz-ipucu` testId'si yeni grubun **içinde** yoktur ve ekrandaki sayısı 1 kalır (AC-54).
- **AC-26.** Yeni kimliğin grubu, yetkinin Kasa ekranını açmadığını söyleyen kendi ipucusunu taşır.
- **AC-27.** Kutu işaretlenip kaydedildiğinde kimlik kullanıcının gider ve kasa işlemleri listesine yazılır; yeni bir izin alanı oluşmaz.
- **AC-28.** Kutu "özelleştir" kapalıyken çizilmez ve kaydedilen izinlerde gider ve kasa listesi bugünkü gibi tanımsız kalır.
- **AC-29.** "Özelleştir" açıldığında yeni kutu da işaretli gelir (bugünkü "hepsi işaretlenir" davranışı).
- **AC-30.** Kasa akordeonunun kimlikleri, akordeona yerleşimi belirleyen kümeyle birebir eşit kalır; etkisizlik ipucusunun kümesi bugünkü üç kimliktir.

**Değişmeyenler**

- **AC-31.** Hesap listesinin içeriği, sırası ve "Hesap belirtilmedi" seçeneği değişmez.
- **AC-32.** Ön seçim en son kullanılan tahsilat hesabıdır ve yalnız değer hiç seçilmemişken yazılır; kullanıcının boşalttığı değer yeniden dolmaz.
- **AC-33.** Kaydın para birimi değişince uyumsuz kalan hesap temizlenir; USD tahsilatta yalnız USD açık hesaplar listelenir.
- **AC-34.** Bilinmeyen ya da hiç açık hesabı olmayan para biriminde alan bugünkü ibareyle çizilir ("… para biriminde açık hesap yok").
- **AC-35.** Hesap sorulmayan kayıtta (anlaşmalı firmaya ait bedel, sıfır tutar) bugünkü neden metni yazılır.
- **AC-36.** Tahsilat hesabı seçicisi tek paylaşılan bileşenden gelmeye devam eder; ölçüsü adıyla `tests/ui/tahsilat-hesap.test.jsx:290` (0063 AC-17: `HESAP_TUR_AD` içe alan ve `aria-label="Tahsilat hesabı"` yazan tek bileşen `src/components/kasa/TahsilatHesap.jsx`) ve `:300` (0063 AC-25: `PaymentRowsEditor` kullanan dosyalar `satirEki` yuvasına `OdemeSatiriHesap` geçirir). Yeni giriş noktaları alanı bileşenden aldığı için bu iki tarama dokunulmadan yeşil kalır.
- **AC-37.** Bakiye, gelir, borç, KDV, alacak, aylık rapor ve Aylık Gider ve Kasa Raporu rakamları **aynı veri için** bu işten önce ve sonra aynıdır (yeni yetkiyle kullanıcı artık hesap atadığı için gerçek hayatta bakiyeler elbette değişir; değişmeyen şey motorların çıktısı).
- **AC-38.** Kasa ekranının hesapsız kayıtlara hesap atama yolu ve kapsam dışı bırakma yolu değişmez.
- **AC-39.** Sunucu yazma denetimi değişmez: yeni kimliği olmayan kullanıcının `hesapId` taşıyan yazımı bugünkü gibi bölüm izinleriyle değerlendirilir (403 üretmez).
- **AC-40.** Veritabanı şeması, birleştirme kuralları, yedek paketleri ve kilit alanları değişmez.
- **AC-41.** Giderler ekranının ödeme ve çek alanları, Kasa ekranının kendisi ve Finans'taki Aylık Gider ve Kasa Raporu düğmesi bugünkü kurala bağlı kalır.

**QA turu 2026-10-20: yeni giriş noktaları**

- **AC-42.** Yetkili kullanıcı Servis ve Kargo Panosu'nun servis formunda "ödendi" işaretlediğinde "Tahsilatın girdiği hesap" alanını görür ve seçim kayda yazılır.
- **AC-43.** Yetkili kullanıcı panonun "Yeni Yedek Parça Satışı" formunda alanı görür ve seçim kayda yazılır.
- **AC-44.** Sekme listesi yalnız `servis` olan kiosk kullanıcısında AC-42 ve AC-43 geçerlidir (kiosk çağrısı da iki prop'u alır).
- **AC-45.** Panonun **ayrı penceresinde** alan çizilmez; bu bilinen sınır olarak spec'te ve kodda yazılıdır (X8).
- **AC-46.** Yetkili kullanıcı bayi detayının "Bayi Aracılığıyla Kalıp Satışı" formunda alanı görür ve seçim kayda yazılır.
- **AC-47.** Yetkili kullanıcı bayi detayının "Yedek Parça Satışı" formunda alanı görür ve seçim kayda yazılır.

**QA turu 2026-10-20: yetki kapalıyken eksik ölçümler**

- **AC-48.** Yetkisi olmayan kullanıcıda bayi detayının iki satış formunda alan **DOM'da yoktur** ve kayda hesap bilgisi girmez.
- **AC-49.** Yetkisi olmayan kullanıcıda müşteri detayının tahsilat formunun **iki kipinde** de (ekleme satırı ve düzenleme) alan DOM'da yoktur ve kayda hesap bilgisi girmez.
- **AC-50.** Yetkisi olmayan kullanıcı Stok › Yedek Parça Satışı satırının "Ödendi" anahtarına bastığında pencere açılmaz, işaret atılır ve kaydın hesap bilgisine dokunulmaz.
- **AC-51.** Yetkisi olmayan kullanıcıda panonun iki formunda alan DOM'da yoktur.

**QA turu 2026-10-20: kapı, metin ve kümeler**

- **AC-52.** Kapı tek yerde ve R12/2'deki bileşimle hesaplanır: perde inikken kapalı (AC-19), salt okunur modda kapalı (AC-18), `giderActions` tanımsızken açık (AC-22), gider sekmesi şart değil (AC-1). Kaynak taraması: `tahsilat_hesap` dizesi `src/` altında yalnız `src/App.jsx` ve `src/components/settings/serverPermissionDefs.js`'te geçer (C11).
- **AC-53.** Dört dize birebir R2/2'deki gibidir (kimlik, kutu etiketi, grup başlığı, `TAHSILAT_HESAP_IPUCU`) ve yeni grup Kasa akordeonunda "Hesaplar ve hareketler"in önündedir.
- **AC-54.** Akordeona yerleşim kümesi ile etkisizlik ipucusu kümesi ayrıdır (R13/2): yeni kimlik yerleşim kümesindedir, ipucu kümesi bugünkü üç kimliktir; yeni grubun notu `tahsilat-hesap-ipucu` testId'si ile çizilir ve `kasa-etkisiz-ipucu` ekranda en çok bir kez bulunur.
- **AC-55.** `kasaYetki` adı `Customers.jsx`, `customers/CustomerDetailModal.jsx`, `Stock.jsx` ve `SimpleDealers.jsx`'te hiç geçmez; tahsilat zincirinin boolean prop'u `tahsilatHesapYetki`'dir (R8/2).
- **AC-56.** Kasa sekmesi olan ama `giderActions`'ı yeni kimlik olmadan özelleştirilmiş kullanıcıda alan çizilmez (kabul edilen regresyon, R7/2); aynı kullanıcı `kasa_hesap` izniyle Kasa ekranından hesap atamayı sürdürür.
- **AC-57.** Yeni yetki genel aramada kategori açmaz: tahsilat yetkili ama Kasa'sız kullanıcının aramasında kasa hesabı ve çek sonuçları çıkmaz ve Kasa'ya yönlendiren bağ yoktur (C9, AC-11).
- **AC-58.** Makina tahsilatı, hesap seçilse de seçilmese de hiçbir iş listesinde görünmez (X1'in bilinen sınırı; `satisTahsilat.js` `payments`'ı okumaz).

---

## Plan onayı kararları (revizyon 3, 2026-10-20)

Takım Yöneticisi planın on önerisini kabul etti (`specs/0098-uygulama-plani.md` §3).

| # | Konu | Karar |
|---|---|---|
| P1 | Kapının yeri | Saf yardımcı `tahsilatHesapKapisi` ve `TAHSILAT_HESAP_ID` `serverPermissionDefs.js`'te; App tek çağrı (R12/3) |
| P2 | Prop biçimleri | Kapalıyken Müşteriler `[]`, Bayiler ve Stok `null` kalır (R8/3) |
| P3 | Kiosk ölçümü (AC-44) | Mevcut kiosk düzeneğiyle gerçek App; elverişsizse kaynak taraması + ServisPanosu bileşen testi, SCORECARD'a yazılır |
| P4 | Bakiye ölçümü (AC-8) | Kaydın gövdesinden `kasa.hesapBakiyeleri` (Kasa ekranı da aynı motoru okur) + Kasa'lı kullanıcıda ekran senaryosu |
| P5 | Rakamların değişmemesi (AC-37) | Yeni fikstür yok; motor dosyalarının yeni kimliği ve prop'u okumadığı taraması + mevcut altınlar yeşil |
| P6 | Sunucu PC (AC-20) | Kapının `null` dalı birim testi + yerel mod gerçek App; kapının yalnız `effectivePermissions` okuduğu taramayla |
| P7 | Görsel kanıt | İzin ekranının üç ekranı bilinçli değişti; yeni `kullanici-izin-0098-kasali`, `servis-pano-0098-hesap`, `-hesapsiz`; tahsilat formları 0 piksel; UserManager eşleme kaydı istemez |
| P8 | Sunucu (AC-39) | `server-authz.test.js` bloğu; uçtan uca ek yok (sunucu kodu değişmiyor) |
| P9 | Kimliği sayan başka testler | Yalnız sayı farkıysa "spec 0098 ile" notuyla güncellenir ve özette listelenir; anlam farkıysa sorulur |
| P10 | Bilinen gerileme (R7/2) | Kapıya yedek dal yok; AC-56 testi ve sürüm notu |

---

## Definition of Done

- [x] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [x] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [x] Hesap içeren iş yok; yetkinin kapısı tek yerde ve R12/2'deki bileşimle hesaplanıyor, iki kaynak taramasıyla sabitlendi (kimlik dizesi yalnız `App.jsx` ve `serverPermissionDefs.js`'te; `kasaYetki` adı tahsilat zincirinin dört bileşeninde yok). Sekiz giriş noktasından hiçbiri kendi izin koşulunu yazmıyor; formların `kasaHesaplari` koşulu prop okumasıdır ve taramaya girmez (C11).
- [x] Aynı sayıyı üreten başka ekran/rapor etkilenmedi; bakiye, gelir ve rapor kıyası birebir aynı.
- [x] Yeni kalıcı alan **yok**; dört nokta kuralı uygulanacak bir şey olmadığı açıkça yazıldı.
- [x] Yeni veri bölümü **yok**; `BLOB_SECTIONS` ve `MERGE_KEYS` dokunulmadı (tarama).
- [x] Yeni eylem izni **var**: izin tanımları ve kullanıcı yönetimi ekranı birlikte güncellendi; **sunucu tarafına denetim eklenmediği ve nedeni** spec C4'te ve kodda yazılı. Sunucuda kimlik beyaz listesi olmadığı ölçüldü (ölçüm 11).
- [x] Servis ve Kargo Panosu'nun iki formu kapsama alındı (sekme ve kiosk, R4/2); ayrı pencere bilinen sınır olarak kodda ve spec'te yazılı (X8).
- [x] Soft-delete ve çöp kutusu simetrisi etkilenmedi (bu iş kayıt silmiyor).
- [x] Kullanıcıya görünen tüm metinler Türkçe; yazdırma çıktısı yok.
- [x] Para gösterimi değişmedi; çoklu para birimi ve bilinmeyen para birimi kriterleri (AC-33, AC-34) karşılandı.
- [x] Arayüz kriterlerinin görsel kanıtı eklendi: yetkili ve yetkisiz kullanıcıda üç form ve panonun servis formu, izin ekranının Kasa akordeonu (ipuculu ve ipucusuz hâl).
- [x] Kanıt beklentisi iki ayrı satır olarak yazıldı: izin ekranının üç ekranı (`kullanici-izin-kasa`, `-ipucu`, `-0066`) **bilinçli değişti** (yeni grup, yeni kutu, yeni not); tahsilat formlarının kanıt ekranları **değişmedi**, çünkü kanıt aracı yerel modda çiziyor ve orada izin null, yani alan bugünkü gibi görünüyor (`tests/ui/tahsilat-hesap-0063.test.jsx:416`, iki temada 0 piksel, yeşil).
- [x] Ters çevrilen beş test "spec 0098 ile" notuyla güncellendi (0024 `kasa-app.test.jsx:147`, 0052 `kasa-sekme-izni.test.jsx:177`'nin tahsilat yarısı, 0044 `tahsilat-hesap.test.jsx:152`, 0066 AC-20 ve AC-21) ve yeni adları bu spec'in kriterine bağlandı; korunan iki perde testi (0024 AC-35, 0044 AC-20) yeşil.
- [x] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [x] `CLAUDE.md` güncellendi (yeni izin kimliği ve tahsilat hesabı kapısının Kasa sekmesinden ayrıldığı).
- [x] Sürüm notu yazıldı: yetki varsayılan açık, ama işlem izinleri daha önce özelleştirilmiş kullanıcılarda kutu işaretlenmeli; **Kasa sekmesi olanlar dahil** bu kullanıcılar alanı kutu işaretlenene kadar kaybeder ve bu bir regresyondur (R7/2). Ayrı pencereli Servis Panosu'nda alanın olmadığı da notta yazılı (X8).
- [x] Takım Yöneticisi onayladı (dört karar 2026-10-20). **Commit ve sürüm yayını yalnız açık talimatla yapılır.**
- [x] **SCORECARD dolduruldu** ve spec `specs/done/` klasörüne taşındı.

---

## Ters çevrilen kriterler

| Spec | Kriter | Bu spec'te ne oluyor |
|---|---|---|
| 0052 | AC-12: "Kasa'sı olmayan kullanıcıda tahsilat ve ödeme formlarındaki hesap seçici çizilmez" | **Tahsilat yarısı ters çevrilir:** yeni yetkiyle Kasa'sız kullanıcıda tahsilat seçicisi çizilir. **Ödeme yarısı korunur:** gider ödemesinin hesap seçicisi Giderler ekranının işi ve dokunulmuyor. |
| 0024 | Test `kasa-app.test.jsx:147` "Finans sekmesi olmayan kullanıcı tahsilata hesap seçemez" | Ters çevrilir. Spec 0024'ün AC-25'i (Kasa **ekranını** görmez) korunur; değişen yalnız alanın kapısı. |
| 0024 | AC-35: perde inikken tahsilat formunda hesap alanı yok | **Korunur** (C7). |
| 0044 | Test `tahsilat-hesap.test.jsx:152` "AC-28: kasa yetkisi (Giderler + Finans) olmayan kullanıcıya hesap sorulmaz" | Ters çevrilir (gerçek App testi, ölçüm 8): aynı düzenekte pencere artık açılır ve seçim kayda yazılır. Yeni adı bu spec'in AC-6 ve AC-7'sine bağlanır. |
| 0044 | AC-20 (perde) testi `tahsilat-hesap.test.jsx:144` | **Korunur** (C7). |
| 0066 | AC-20: Kasa akordeonunun grup listesi tam olarak `["Hesaplar ve hareketler"]` | Ters çevrilir: liste iki gruptur, yeni grup ("Tahsilat hesabı") önde (R2/2). |
| 0066 | AC-21: `GIDER_ACTION_GROUPS`'un kutuları birebir on iki üye | Ters çevrilir: on üçüncü üye `tahsilat_hesap` eklenir. |
| 0066 | AC-12: Kasa akordeonunun kimlikleri yerleşim kümesiyle birebir eşit | **Korunur**: yeni kimlik `KASA_EYLEM_IDLERI`'ne eklenir (AC-30, R13/2). |
| 0066 | AC-18 ölçüsü: `kasa-etkisiz-ipucu` ekranda bir kez | **Korunur**: yeni grubun notu ayrı testId ile çizilir (R13/2, AC-54). |
| 0063 | AC-3 ve AC-14: "Kasa yetkisi olmayan kullanıcıda alan DOM'da yoktur" | Korunur; "kasa yetkisi" ifadesi artık bu spec'in yetkisini anlatır (AC-13, AC-17). |
| 0044 / 0063 | Alanın içerik, ön seçim, para birimi ve tek bileşen kuralları | Hepsi korunur (C8, AC-31…AC-36). |

---

## Karar kaydı (QA turu 2026-10-20)

On dokuz boşluk çıkarıldı, Takım Yöneticisi 2026-10-20'de tümünü onayladı ve spec'e işlendi.

| Derece | Bulgu | Karar | Nereye girdi |
|---|---|---|---|
| Bloklayıcı | B-1: Servis ve Kargo Panosu hiçbir yerden bağlı değil, Intent'in kiosk kullanıcısı alanı göremez | Pano kapsama girer (sekme ve kiosk), ayrı pencere kapsam dışı | R4, R4/2, R4/3, X8, Karar 5, ölçüm 9, AC-42…AC-45, AC-51 |
| Bloklayıcı | B-2: C1'in "kasaYetki dağıtımının yerine" cümlesi genel aramayı da kapsıyor gibi okunuyor, C9 onu saymıyor | C1 üç satıra daraltıldı, C9 aramayı adıyla saydı, yeni yetki kategori açmaz | C1, C9, ölçüm 10, AC-57 |
| Bloklayıcı | B-3: AC-23 ve AC-26, 0066'nın üç birebir testiyle birlikte tutmuyor (grup listesi, kutu listesi, tek testId) | Üçü ters çevrilen kriterlere girdi; ipucu ayrı alan ve ayrı testId aldı | R13/2, C5, ölçüm 11, Karar 8, AC-25, AC-54, ters çevrilen kriterler |
| Bloklayıcı | B-4: ters çevrilecek test envanteri eksik, ölçüm 8 bir gerçek App testini "etkilenmez" diyor | Ölçüm 8 test düzeyine indirildi ve tabloya çevrildi, 0044 AC-28 eklendi | Ölçüm 8, ters çevrilen kriterler, DoD |
| Önemli | Ö-1: bayi detayının iki satış formu R4'te ve kriterlerde yok | R4 sekiz noktayı sayar, iki pozitif ve bir negatif kriter eklendi | R4, ölçüm 10, AC-46, AC-47, AC-48 |
| Önemli | Ö-2: kapının bileşimi yazılmamış (perde, hangi izin nesnesi, gider sekmesinin rolü) | Bileşim formülüyle yazıldı | R12/2, AC-52 |
| Önemli | Ö-3: kimlik, etiket, grup başlığı, ipucu ve grup sırası yok | Dört dize ve sıra sabitlendi | R2/2, Karar 7, AC-53 |
| Önemli | Ö-4: etkisizlik ipucusunun kümesi kimlik mi grup mu | Yerleşim kümesi kalır, ipucu için ikinci kimlik kümesi ve grup yüklemi | R13/2, C5, Karar 8, AC-54 |
| Önemli | Ö-5: iki prop kanalı, tek kapı sözü yarısı güncellenirse bozulur | Boolean prop `tahsilatHesapYetki` oldu, ad taraması eklendi | R8/2, ölçüm 10, AC-55 |
| Önemli | Ö-6: bugünkü Kasa kullanıcısı için bu bir kayıp, spec onu kazanç gibi yazıyor | Regresyon açıkça yazıldı, OR yedeği reddedildi | R7/2, Karar 6, AC-56, DoD sürüm notu |
| Önemli | Ö-7: "yetki kapalıyken" bloğu üç giriş noktasını ölçmüyor | Üç negatif kriter eklendi | AC-49, AC-50, AC-51 |
| Önemli | Ö-8: AC-9 ve AC-10 makina tahsilatında yanlış, X1 ile çelişiyor | İkisi daraltıldı, makina için ayrı kriter | AC-9, AC-10, AC-58, C10 |
| Küçük | K-1: AC-37'nin "önce ve sonra aynı" ifadesi | "Aynı veri için" diye yazıldı | AC-37 |
| Küçük | K-2: AC-36'nın ölçüsü adsız | İki tarama dosya ve satırıyla anıldı | AC-36 |
| Küçük | K-3: DoD'nin kaynak tarama satırı ölçütsüz | Ölçüt yazıldı, prop okuması taramadan ayrıldı | C11, DoD |
| Küçük | K-4: hiç açık hesap yokken yetkili kullanıcının gördüğü ibare | Davranış değişmez, bilinen sınır olarak yazıldı | C12 |
| Küçük | K-5: kanıt beklentisi belirsiz | İzin ekranı değişir, tahsilat formları değişmez; iki ayrı satır | DoD |
| Küçük | K-6: yol atıfları eksik (`serverPermissionDefs.js`, `permissions.js`) | Tam yolla yazıldı | Başlık, C2, C5, C6, ölçüm 1, ölçüm 5, ölçüm 7 |
| Küçük | K-7: ters çevrilen testlerin yeni adı yazılmamış | Yeni adların bu spec'in kriterine bağlanması DoD'ye ve tabloya girdi | Ters çevrilen kriterler, DoD |

---


## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Spec revizyon sayısı** | 4 | 1 taslak (dört karar), 2 QA turu (19 bulgu), 3 plan turu (P1–P10), 4 triyaj |
| **Düzeltme turu sayısı** | 1 | Triyaj: dört düşük bulgu (üç kriterin yarım ölçümü, üç adsız kriter, dört eski yorum, ipucu metni bilinen sınır) |
| **Bulgu gerçek/gürültü oranı** | 4/0 | İletilen dört bulgunun hepsi gerçekti; dördüncüsü bilinen sınır olarak kayda geçti (C12/2) |
| **Regresyon sayısı** | 0 | Tam takım Electron dahil yeşil; tahsilat formlarının ve panonun bütün kanıt ekranları 0 piksel. Spec'in kabul ettiği gerileme (R7/2) ayrıca testli |
| **Kaçan hata** | 0 | Triyaj bulguları test boşluğu ve yorumdu; davranış hatası yok |

**Bu spec'ten çıkarılan ders:** Bir kapıyı taşırken onu okuyan her kanalı (dizi prop'u, boolean prop, kayıt dalı, düzenleme kipi)
ayrı ayrı ölçmek gerekiyor: ilk testler yalnız ekleme kipine baktı ve düzenleme kipinin kapısı eski hâlinde kalsa yeşil kalırdı
(triyaj bulgu 1). DoD'nin "her kriterin AC adlı testi" maddesi, davranışı değişmeyen kriterlerde de geçerli. Görüntü aracında
bilinmeyen küçük bir fark çıktığında önce spec öncesi kodla tabanı yeniden çekmek, kodu suçlamaktan önce geliyor.

---

## Revizyonlar

1. 2026-10-20, ilk taslak; dört karar onaylı.
2. 2026-10-20, QA turu (19 bulgu, dört karar daha).
3. 2026-10-20, uygulama planı onayı (P1–P10): R8/3, R12/3 ve plan kararları tablosu.
4. 2026-10-20, triyaj: dört düşük bulgu; C12/2 (ipucu metni bilinen sınır) eklendi, testler ve yorumlar düzeltildi.
5. 2026-10-20, uygulandı (`4477d2c`, triyajın dört bulgusu dahil) ve kapandı.
