# 0131 — Tahsilat tarihi, işaretlendiği gündür

| | |
|---|---|
| **Durum** | Tamamlandı (2026-11-04, commit `12f158e0`; plan turu Karar 17–26, uygulama turu Karar 27–32, triyaj Karar 33). Kökeni: analist 2026-11-04, QA boşluk analizi 2026-11-04, 16 bulgu işlendi |
| **Sahip** | Analist |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Müşteriler (müşteri detayının Makina Geçmişi zaman çizelgesi), Stok › Yedek Parça Satışı, Kasa (hesap hareketleri ve hesabı belirtilmemiş tahsilatlar), Servis Panosu (sekme, kiosk ve ayrı pencere), Bayiler detayının iki satış formu, servis formu, Extra Kalıp formu, yedek parça satış formu; saf motorlar `utils.tahsilatTarihiOf`, `satisTahsilat.js`, `kasa.js`, `aylikRapor.js`, `yedekParcaSatis.js`, `kalipSatisi.js`, `cek.js`; sunucu `serverAuth.cjs` |
| **Bağımlı spec'ler** | 0044 (tahsilatların hesaba bağlanması; tahsilat kaleminin tek tanımı), 0051 A (hesapsız kayıtlarda başlangıç tarihi; eşik bu tarihi okur), 0047 (Aylık Gider ve Kasa Raporu), 0063 (makina tahsilatının hesabı), 0095 (ücretsiz yedek parça), 0098 (tahsilat hesabı izni), 0111 (toplu yedek parça düzenlemesi), 0121 ve 0130 (tarih alanının emsali), 0040 (çekin gelir tarihi ve `cekleriUygula`'nın kapsamı), 0073 (tahsilat satırı hareket değildir), 0128 (kayıt anı kilit denetimi), 0129 (panonun ayrı penceresi ve sahte köprü düzeneği) |
| **Ters çevrilen kriterler** | Ölçümle (Karar 22): 0111'in toplu düzenleme çek beklentisi (R12/2), 0098 AC-16'nın ileri günlü fikstürü (Karar 30), 0079 AC-31 ve 0095 AC-27 ekran kıyaslarında zaman çizelgesinin yeni gün metni ayıklanır (R13/2). 0073 R1'in "tahsilat satırı hareket değildir, kaynak ekrandan değiştirilir" ibaresi yalnız **tahsilat günü** için gevşer (R11/3); tutar, hesap, yöntem ve silme hâlâ kaynak ekrandan yapılır. |

---

## Intent

Muhasebe "bu para hangi gün kasaya girdi" sorusunu Kasa ekranından ve aylık rapordan cevaplamak istiyor. Bugün uygulama paranın alındığını kaydediyor ama **hangi gün alındığını çoğu yolda kaydetmiyor**: tahsilat, işin yapıldığı ya da satışın olduğu güne yazılıyor. 2024 tarihli bir servisin bedeli bugün tahsil edildiğinde Kasa'nın hareket listesinde 2024'te duruyor, aylık rapor onu 2024'ün ayına sayıyor ve hesabın yürüyen bakiyesi yanlış sırada ilerliyor. Bu iş bittiğinde ödeme işaretini koyan kişi paranın girdiği günü söyleyebilecek, söylemezse bugün sayılacak ve geçmişte işaretlenmiş bir tahsilatın günü sonradan düzeltilebilecek.

---

## Requirements

- **R1.** Bir servisin, Extra Kalıp satışının ya da yedek parça satışının ödeme işareti ilk kez konulduğunda tahsilatın yapıldığı gün kayda yazılır. Varsayılan gün, kullanıcının bilgisayarındaki yerel gündür.
- **R1/2.** Gün alanının ilk değeri kaydın durumuna bağlıdır, üç hâl vardır: (1) ödeme işareti bu kaydetmede işaretsizden işaretliye geçiyorsa yerel bugün, (2) işaret zaten duruyor ve kayıtlı gün varsa o gün, (3) işaret zaten duruyor ama kayıtlı gün yoksa alan **boş** gelir. Üç hâl de aynı saf yazıcıdan geçer.
- **R2.** İşaret konulurken açılan hesap penceresi, hesabın yanında tahsilat gününü de sorar; alan bugünle dolu gelir ve değiştirilebilir.
- **R2/2.** Pencerede geçersiz gün girilince hata pencerenin içinde, alanın altında yazılır ve pencere açık kalır; bildirim kullanılmaz. Pencerenin iki kaydet düğmesi ("Hesapsız kaydet" ve "Ödendi olarak kaydet") aynı doğrulamadan geçer.
- **R3.** Takvimde olmayan ya da bugünden sonraki bir gün kabul edilmez: kayıt yapılmaz, ödeme işareti konulmaz ve nedeni yazılır.
- **R3/2.** Boş gün reddedilmez: alan boşaltılırsa kayda `null` yazılır ve okuma C1'in son basamağına (kaydın satış ya da servis tarihi) düşer. Alanın yanında "gün belirtilmedi" ipucu durur.
- **R3/3.** Alt sınır yoktur: satış ya da servis tarihinden önceki bir gün kabul edilir ve uyarı yazılmaz (peşin tahsilat gerçek bir hâldir).
- **R4.** Pencerenin "hesapsız kaydet" seçeneği de günü yazar; gün hesabın seçilmiş olmasına bağlı değildir.
- **R5.** Pencerenin hiç açılmadığı durumlarda (kasaya girecek tutar yok, bedel anlaşmalı firmaya ait, parça bedelinin para birimi servisle uyuşmuyor, kullanıcının tahsilat hesabı yetkisi yok) işaret yine yerel bugünle damgalanır.
- **R5/2.** R5 yalnız tek tık anahtarının yoludur. Formda gün alanı yetkiden bağımsız çizilir (R8/3), yani formda gün sessizce bugüne damgalanmaz; kullanıcı onu görür ve değiştirebilir.
- **R6.** Ödeme işareti kaldırıldığında tahsilat günü de silinir.
- **R7.** İşaret duruyorken yapılan hiçbir düzenleme tahsilat gününü değiştirmez.
- **R7/2.** R1/2'nin (2) ve (3) hâllerinde alana dokunulmazsa kayda hiçbir şey yazılmaz: kayıtlı gün aynen kalır, günsüz kayıt günsüz kalır (R15 ve X4 korunur, Kasa'nın R11 işareti onu yakalamaya devam eder).
- **R8.** Ödeme işaretinin konulabildiği her yol aynı kuralı uygular: müşteri detayındaki ödeme anahtarı (servis, Extra Kalıp, yedek parça), servis formu, Extra Kalıp formu, yedek parça satış formu (yeni kayıt ve düzenleme) ve Stok › Yedek Parça Satışı satırındaki anahtar. Formlarda gün alanı, hesap alanının yanındadır.
- **R8/2.** R8'in "form" dediği yollar paylaşılan bileşenlerdir ve açıldıkları her ekranda kapsamdadır: Servis Panosunun servis formu ve yedek parça satış formu (sekme, kiosk ve ayrı pencere) ile bayi detayının Extra Kalıp ve yedek parça formları.
- **R8/3.** Gün alanı hesap alanından bağımsız çizilir: `tahsilat_hesap` izni olmayan, yani hesap alanını görmeyen kullanıcıda da yalnız gün alanı görünür ve yazılır. Böylece ayrı pencerede köprüye yeni veri eklemek de gerekmez.
- **R8/4.** Yedek parçanın tek satırlı düzenlemesi de kapsamdadır (partisiz kaydın müşteri detayından düzenlenmesi ve Stok'un düzenleme formu); bugün bu yol günü hiç yazmıyor.
- **R9.** Yedek parça partisinde işaret form düzeyindedir: partinin ücretli bütün satırlarına aynı gün yazılır.
- **R9/2.** R9 yalnız form düzeyindeki işarete aittir. Stok › Yedek Parça Satışı satırındaki anahtar bugün olduğu gibi satırın kendi kaydına yazar; parti yazmaz, çünkü düğme satır başına çizilir.
- **R10.** Kasa'da hesabı sonradan atanan tahsilatta hesabın yanında tahsilat günü de girilebilir. Alan kaydın bugün geçerli günüyle dolu gelir, yani kullanıcı dokunmazsa hareketin yeri değişmez.
- **R10/2.** Dokunulmayan alan yazılmaz: kayıt `tahsilatTarihi` alanı boş kalır ve R11'in işareti düşmez. Yalnız kullanıcının değiştirdiği gün yazılır.
- **R10/3.** Hesap seçilmeden yalnız gün de girilebilir: hesapsız kalmasını isteyen kullanıcı günü düzeltebilir.
- **R11.** Hesaba bağlı olduğu hâlde tahsilat günü girilmemiş hareket, Kasa'nın hesap hareketleri listesinde işaretlenir ve günü o satırdan girilebilir.
- **R11/2.** İşaretin ölçütü dardır: satırın kaynağı servis, Extra Kalıp ya da yedek parça **ve** kaydın yöntemi Çek ya da Kredi Kartı değil **ve** `tahsilatTarihi` boş. Makina tahsilatı (X2) ve verilen çek satırı hiç işaretlenmez; çek ve kart kaydında boş alan eksiklik değildir.
- **R11/3.** Ölçüte giren satırda bugünkü "kaynak ekrandan değiştirilir" ibaresi düzeltme bağına dönüşür; ölçüte girmeyen satırda ibare aynen kalır. Gevşeyen tek şey gündür.
- **R11/4.** Düzeltme satır düzeyinde yazar (parti yazmaz), kayıt anında 0064 R14 emsaliyle `baskasiKilitli` denetiminden geçer ve iz olarak bugünkü `duzenlendi` kaydının `detail`'ine tarihi ekler; yeni eylem kimliği açılmaz.
- **R12.** Yöntemi Çek ya da Kredi Kartı olan kayıtta tahsilat günü sorulmaz. Kredi Kartında kayda yazılmaz da: gün `kartKomisyonu.hesabaGecis`'ten okunmaya devam eder.
- **R12/2.** Çekte gün yazılır ama sorularak değil: "çek tahsil edildi" işareti işaretsizden işaretliye geçtiği an tek yazıcı yerel günü yazar, işaret kaldırılınca siler. Kapsam bu işareti koyan beş yoldur: müşteri detayının Extra Kalıp ve yedek parça anahtarları ile servis, Extra Kalıp ve yedek parça formlarının "Çek tahsil edildi" kutusu.
- **R12/3.** Gün alanının çizilmediği çek ve kart kaydında pencere ve form bunun nedenini yazar.
- **R13.** Tahsilat günü kullanıcıya görünür: müşteri detayındaki ödeme anahtarı günü taşır. Günü olmayan eski kayıtta anahtarın bugünkü metni değişmez.
- **R13/2.** Gün anahtarın metnine girmez, yanında düz metin olarak durur ve yalnız kayıtlı gün varken çizilir. Yedek parça partisinde grubun ücretli ilk satırının günü yazılır, günler farklıysa hiç yazılmaz; çek ve kart kaydında türetilmiş gün gösterilmez.
- **R14.** Kasa ekranının hesap hareketleri listesi, aylık faaliyet raporu ve Aylık Gider ve Kasa Raporu aynı günü okur.
- **R15.** Bugün kayıtlı olan tahsilatların günü bu işle değişmez.

---

## Constraints

### Uyulması zorunlu
- **C1.** Günün okunma sırası değişmez: `utils.tahsilatTarihiOf` önce çek kaydının gelir tarihine, sonra kaydın tahsilat gününe, sonra kredi kartının hesaba geçiş gününe, en sonunda kaydın kendi satış ya da servis tarihine bakar (`utils.js:711`). Bu spec yalnız ikinci basamağın **yazılmasını** tamamlar.
- **C1/2.** İlk basamak bu üç bölümde hiç dolmaz: `cekleriUygula(payments, cekler)` yalnız ödeme defterini zenginleştirir (`cek.js:124-131`; çek kaydı `paymentId` ile bağlanır) ve tek çağrısı `App.jsx:845`'tir. Yani servis, Extra Kalıp ve yedek parça kaydında `_cek.gelirTarihi` yoktur ve çek tahsilatının günü yalnız `tahsilatTarihi` ile taşınır (R12/2'nin gerekçesi).
- **C2.** Tahsilat gününü yazan **tek bir saf yol** olur ve kaynakta `tahsilatTarihi` ataması yalnız orada geçer. Emsal uygulamada yerleşiktir: `ucretsizUygula` (spec 0095), `ihracKayitliUygula` (0114), `kalipCapiYaz` (0101), `tamirYaz` (0115). Yardımcı React almaz, saat okumaz: günü parametre alır. Yeri `src/lib/satisTahsilat.js`'tir (tahsilat kaleminin zaten sahibi).
- **C2/2.** Metinler de tek yerdedir ve 0121 emsalinin adlandırmasını izler: iki hata sabiti ("Tahsilat tarihi takvimde var olan bir gün olmalı." ve "Tahsilat tarihi bugünden sonra olamaz."), alan etiketi ve erişilebilir ad ("Tahsilat tarihi"). Pencere ve formlar aynı sabitleri okur; ikinci kez yazılmaz.
- **C3.** Gün **yerel** gündür (`utils.yerelBugun`). Bugünkü altı yazım `today()` kullanıyor ve o UTC'dir: Türkiye'de 00:00 ile 03:00 arası işaretlenen tahsilat düne yazılır. Yeni yolda `today()` kullanılmaz.
- **C3/2.** Kural çağrı yerlerini de kapsar: 0111'in toplu düzenleme yolu bugün `bugun: today()` ile besleniyor (`CustomerDetailModal.jsx:353`); o parametre de yerel güne çevrilir.
- **C4.** Tarih doğrulaması ikinci kez yazılmaz: `urunAgaci.gecerliGunMu` ile 0121 ve 0130'un iki hata sabiti deseni kullanılır (`setUretimi.js:54-56`), tarih kutusu `max={bugun}` taşır (`SetHazirlaPenceresi.jsx:50`).
- **C5.** Kapalı değer gövdeye yazılmaz: işaret yoksa alan `null` olur (bugünkü davranış; `db.cjs` üç tabloda yazarken `tahsilatTarihi ?? null` veriyor, okuma düz TEXT olduğu için `...rest` ile geliyor).
- **C6.** Sunucunun `tahsilatHesabiYalnizMi` kuralı (`serverAuth.cjs:367`) bugün yalnız `hesapId` farkına izin veriyor; R10 ve R11 ile izinli alan listesi `tahsilatTarihi`'yi de kapsar. Üçüncü bir alan değişirse kural yine reddeder, yani Giderler ve Finans sekmeli kullanıcının o yazımla başka hiçbir şeyi değiştiremediği güvencesi korunur.
- **C6/2.** İzinli alan listesi bölüme göredir: `tahsilatTarihi` yalnız üç satış bölümünde (`services`, `partSales`, `yedekParcaSatislar`) serbest kalır. Aynı istisnanın kapsadığı `payments` bölümünde (0056 R20) ve `cekler`'de yalnız `hesapId` farkı kabul edilir; `payments.tahsilatTarihi` farkı reddedilir, çünkü makina tahsilatı kapsam dışıdır (X2) ve hiçbir arayüz o alanı yazmaz.
- **C7.** Tutar ve KDV satış tarihinin oranıyla hesaplanmaya devam eder; tahsilat günü yalnız **ay grubunu** belirler (0044 R5, `aylikRapor.js:363` yorumu). Tahsilat günü hiçbir tutarı değiştirmez.
- **C8.** 0051'in hesapsız başlangıç eşiği, 0058'in kapsam dışı anahtarı ve 0044'ün "hangi kayıt hesap sorar" kuralı (`satisTahsilat.js:50`) değişmez.
- **C9.** Yeni izin açılmaz. Hesap penceresi bugün olduğu gibi `tahsilat_hesap` iznine bağlı kalır (spec 0098); izni olmayan kullanıcıda pencere açılmaz ve gün R5 ile damgalanır.
- **C9/2.** Gün alanı `tahsilat_hesap` istemez (R8/3). İzin yalnız hesabın seçilmesini ve pencerenin açılmasını yönetir; gün muhasebe bilgisidir ve ödeme işaretini koyabilen her kullanıcı onu söyleyebilir.
- **C10.** Yeni kalıcı alan, yeni veri bölümü, yeni kilit alanı ve göç yok. Alan üç tabloda 0044'ten beri var.

### KAPSAM DIŞI
- **X1.** Müşteri detayının zaman çizelgesine servis için "çek tahsil edildi" anahtarı eklenmesi — *neden:* anahtar Extra Kalıp ve yedek parça satırında var, servis satırında yok; bu eksik bir işarettir, tarih kusuru değil. Üç formun "Çek tahsil edildi" kutusu yerindedir (`ServiceForm.jsx:576`, `PartSaleForm.jsx:286`, `YedekParcaSatisForm.jsx:305`) ve R12/2 ile kapsamdadır; kapsam dışı olan yalnız çizelgedeki eksik anahtardır. Ölçtüm: bugün hiçbir servisin, Extra Kalıp satışının ya da yedek parça satışının yöntemi Çek değil (880 servisin yöntemi boş, 5'i Kredi Kartı; 2 çek kaydının ikisi de makina tahsilatına bağlı), yani pratik etkisi sıfır. Ayrı ölçüm ister.
- **X2.** Makina tahsilatları (`payments`) — *neden:* ödeme satırının kendi tarihi zaten kullanıcı tarafından giriliyor ve hesabı satır başına seçiliyor (0063); bu spec'in kusuru orada yok.
- **X3.** Bayi detay modalındaki ödeme rozetleri — *neden:* salt okunur, oradan işaret konulamıyor (`SimpleDealers.jsx:619, 664, 704`); tıklanabilir yapmak yeni bir davranıştır.
- **X4.** Bugünkü kayıtların toplu düzeltilmesi ya da göç — *neden:* gerçek tahsilat günü bilinmiyor. Bugüne yazmak 2011'e kadar uzanan 2448 tahsilatı bu ayın hareketi yapar ve kapanmış ayların raporunu değiştirir; satış tarihinde bırakmak bugünkü davranıştır. Düzeltme yolu R10 ve R11 ile elle açılır.
- **X5.** Ücretsiz Extra Kalıp satırında ödeme anahtarının gizlenmesi — *neden:* ayrı bir tutarsızlık. Aynı satırda tutar, tevkifat rozeti ve çek anahtarı ücretsizde gizleniyor (`MachineTimeline.jsx:357, 373`) ama ödeme anahtarı gizlenmiyor (`:358`); yedek parça dalında bütünüyle ücretsiz partide anahtar hiç çizilmiyor (0095 R10). Ölçtüm: bugün ücretsiz işaretli Extra Kalıp kaydı yok, tutarı sıfır 11 kayıt var ve onlar da hesap sormuyor. Bu spec'in konusu değil.
- **X6.** 0051 eşiğinin kendisi ve Kasa iş listesinin süzgeci — *neden:* eşik bilinçli bir karardır (R12-R15, spec 0051). Bu spec kayda doğru günü yazar; hangi günün listede göründüğünü değiştirmez.
- **X7.** Tahsilat gününün dışa aktarma ve yazdırma çıktılarına eklenmesi — *neden:* o sütun listeleri curated ve istek yok.
- **X8.** Gider tarafının ödeme tarihi — *neden:* gider ödemesi 0024'ten beri gerçek bir hareket kaydıdır ve tarihi zaten ödeme penceresinde soruluyor; bu kusur yalnız satış ve servis tarafındadır.

---

## Context

**Alan 0044'ten beri var, yazılmıyor.** `tahsilatTarihi` üç tabloda kayıtlı (`db.cjs:158, 199, 217; TAHSILAT_TARIHI_COLUMN:439`) ve `utils.tahsilatTarihiOf` (`utils.js:711`) onu okuyan tek kapıdır. Kasa'nın hesap hareketleri (`kasa.js:97`), hesabı belirtilmemiş tahsilat listesi (`kasa.js:290`), aylık faaliyet raporu (`aylikRapor.js:370`) ve 0047 raporu aynı kalemden okur, yani tek kaynak kuralı bugün sağlıklı. Kusur okuma tarafında değil, yazma tarafında.

**Ölçüm 1, yazan ve yazmayan yollar (kod okundu).** Ödeme işaretini yazan sekiz yol var, üçü günü yazıyor:

| İşaretin konulduğu yer | Hesap sorulur | Tahsilat günü |
|---|---|---|
| Müşteri detayı, servis anahtarı (`CustomerDetailModal.jsx:286`) | evet | bugün (`today()`) |
| Müşteri detayı, Extra Kalıp anahtarı (`:513`) | evet | bugün |
| Müşteri detayı, yedek parça anahtarı (`:424`) | evet | bugün |
| Müşteri detayı, çek tahsil anahtarları (`:435`, `:523`) | hayır | bugün |
| Stok › Yedek Parça Satışı satırı (`YedekParcaSatisTab.jsx:214`) | evet | bugün |
| Servis formundaki "Ödendi" kutusu (`ServiceForm.jsx:546` hesap alanı) | form alanı | **yazılmaz** |
| Extra Kalıp formundaki kutu (`PartSaleForm.jsx:256`) | form alanı | **yazılmaz** (`kalipSatisi.js:15`) |
| Yedek parça formu, yeni kayıt (`YedekParcaSatisForm.jsx:275`) | form alanı | **yazılmaz** (`yedekParcaSatis.js:88`) |
| Yedek parça formu, kutuya dokunulan toplu düzenleme (0111) | form alanı | bugün (`yedekParcaSatis.js:304`) |
| Yedek parça, tek satırlı düzenleme (müşteri detayı `:390`, Stok `YedekParcaSatisTab.jsx:190`) | form alanı | **yazılmaz** (`yedekParcaSatis.js:117`) |
| Panonun servis formu ve yedek parça formu (`ServisPanosu.jsx:570`, `:106`) | form alanı | **yazılmaz** |
| Üç formun "Çek tahsil edildi" kutusu (`ServiceForm.jsx:576` ve kardeşleri) | hayır | **yazılmaz** |
| Kasa › hesabı belirtilmemiş tahsilat › "Hesap ata" (`Kasa.jsx:331`) | hesap seçilir | **yazılmaz** |

Yedek parça düzenlemesinin kutuya dokunulmayan dalı günü bilerek korur (0111 R6/4, `yedekParcaSatis.js:299`); bu kural R7'nin ta kendisidir ve korunur. O yolun `bugun` parametresi bugün `today()` ile besleniyor (`CustomerDetailModal.jsx:353`), yani UTC gün dolaylı olarak oradan giriyor (C3/2). Hiçbir yol günü **silmiyor** değil: düzenleme formları alanı taşıdığı ya da `{ ...eski, ...alanlar }` ile birleştirdiği için veri kaybı yok (`kalipSatisi.js` `kalipGuncelle`, `CustomerDetailModal` `setSvForm({ ...sv })`). Yani kusur tek cins: gün hiç yazılmıyor.

**Ölçüm 2, veride ne görünüyor (01.11.2026 yedeği, motorlar kendi kodundan çağrıldı).** Ödeme işareti duran 3012 kayıt var (829 servis, 1214 Extra Kalıp, 969 yedek parça). Bunların yalnız **15'inde** tahsilat günü yazılı ve yalnız **37'si** bir hesaba bağlı. Hesaba bağlı 37 kaydın **33'ü** Kasa'nın hareket listesinde kendi satış ya da servis tarihinde duruyor: 16 servis ve 17 yedek parça satırının günü hiç yazılmamış. En eskileri 2024-03-09 tarihli servis ve 2024-09-14 tarihli yedek parça; yani Kasa bugün o hesabın 2024 hareketi olarak gösteriyor. Doğru tarihte duran 4 kaydın 2'si pille işaretlenmiş, 2'si Extra Kalıp ve rastlantı (satış ile tahsilat aynı gün).

**Ölçüm 3, eşiğin ikinci etkisi.** Kasa'nın "hesabı belirtilmemiş tahsilatlar" listesi 0051'in başlangıç eşiğini kaydın **tahsilat gününe** uygular (`kasa.js:301`, `hesapsizOzeti:317`). Ayardaki eşik bugün 2026-10-01. Ölçtüm: hesapsız tahsilat sayısı 2448 ve bunların 2409'u eşik altında kaldığı için liste "Hepsini göster" açılmadan görünmüyor (yıl kırılımı 2011'den 2026'ya yayılıyor, 2024 yılı tek başına 398 kayıt). Sonuç: bugün tahsil edilen eski bir kayıt işaretlendiği anda eski yılın kovasına düşüyor ve kullanıcının onu bulup hesaba bağlaması için eşiği kaldırması gerekiyor. R1 bunu kendiliğinden düzeltir (yeni işaretlenen her tahsilat bugüne düşer).

**Ölçüm 4, hesap penceresi zaten kurulu.** Pencere üç anahtar için de çalışıyor (`CustomerDetailModal.jsx:266` `tahsilatSor`, `TahsilatHesap.jsx:82` `TahsilatHesapPenceresi`) ve yalnız bize ait tutar varsa açılıyor (`satisTahsilat.js:50`). Ölçtüm: anahtar çizilen 651 servisin 645'i tıklanınca hesap soruyor, 6'sı sormuyor (işçilik anlaşmalı firmaya ait); 1214 Extra Kalıp kaydının 1203'ü soruyor, 11'i sormuyor (tutar sıfır). Yani pencereyi açmak için yeni bir kapı gerekmiyor, pencereye tek alan ekleniyor. Takım Yöneticisi'nin ilk isteği (hesabın seçilmesi) bu yüzden bu spec'in kapsamında değil: mekanizma var, görünmüyorsa nedeni kullanıcının `tahsilat_hesap` iznidir ve sunucudan verilecektir (2026-11-04 kararı).

**Ölçüm 5, alanın kendisi hiçbir yerde yazılı ya da düzenlenebilir değil.** Kaynakta `tahsilatTarihi` 24 kez geçiyor; 10'u atama (`CustomerDetailModal.jsx` beş, `YedekParcaSatisTab.jsx` bir, `yedekParcaSatis.js` dört) ve altısı `today()` ile yazıyor, gerisi okuma ve yorum. Kasa'nın hareket listesi ile hesabı belirtilmemiş tahsilat listesi `tahsilatTarihiOf`'un **türetilmiş** gününü zaten basıyor (`Kasa.jsx:668`, `kasa.js:97`), ama kullanıcı günün alandan mı satış tarihinden mi geldiğini ayırt edemiyor ve yanlışsa düzeltemiyor. R13, R11 ve R10 bu üç boşluğu kapatır.

**Ölçüm 6, çekin gelir tarihi bu üç bölümde okunmuyor.** `cekleriUygula(payments, cekler)` yalnız ödeme defterini zenginleştiriyor (`cek.js:124-131`) ve uygulamadaki tek çağrısı `App.jsx:845`. Yani `utils.js:712`'nin `_cek.gelirTarihi` basamağı servis, Extra Kalıp ve yedek parça kaydında hiç dolmuyor: çek yöntemli bir satışın gelir günü bugün yalnız çek tahsil anahtarının yazdığı `today()` sayesinde doğru (`CustomerDetailModal.jsx:435`, `:523`). Üç formun "Çek tahsil edildi" kutusu hiç gün yazmıyor. Bu yüzden "çekte gün yazılmaz" kuralı gerileme olurdu (R12, R12/2).

**Ölçüm 7, panonun kendi yazma yolu.** `ServisPanosu.jsx:1008` ve `:1024` aynı `ServiceForm`'u çiziyor; `:570` `kaydet` müşteri detayının kayıt yolunun birebir kopyası (satır 572 yorumu bunu söylüyor) ve `{...form}` yayarak kaydı kuruyor, yani gün alanını taşır ama bugün hiç yazmıyor. Pano kendi yedek parça satış formunu da açıyor (`:106`). Ayrı pencereye `kasaHesaplari` verilmiyor (`ServisPencere.jsx:107-108`), bu yüzden gün alanı hesap alanından bağımsız olmalı (R8/3). Bayi detayı da iki paylaşılan formu ödeme işaretiyle açıyor (`SimpleDealers.jsx:31`, `:44`); oradaki salt okunur rozetler kapsam dışıdır (X3).

**Ölçüm 8, formun hesap kapısı izne bağlı.** Üç formda hesap alanı `kasaHesaplari && form.odendi` kapısında (`ServiceForm.jsx:545`, `PartSaleForm.jsx:255`, `YedekParcaSatisForm.jsx:274`) ve App bu prop'u yalnız `tahsilatHesapYetki` ile veriyor (`App.jsx:1450`, `Customers.jsx:768`, `CustomerDetailModal.jsx:1528`, `:1545`, `:1560`). Gün alanı aynı kapıya konursa 0098'in tipik satış kullanıcısı günü hiçbir yerde söyleyemez (R8/3, C9/2).

**Ölçüm 9, Kasa'nın iki listesi.** Hareket listesinde tahsilat satırı tıklanamıyor, yerine `tahsilatSatiriIbaresi` basılıyor (`kasa.js:598`, 0073 R1); aynı listede makina tahsilatı ve verilen çek satırı da var. `hesapAta` yalnız `hesapId` yazıyor, `hesapId == null` ise hiç yazmıyor ve kayıt anında kilide bakıyor (`Kasa.jsx:332-338`). R11/2, R11/3, R11/4, R10/2 ve R10/3 bu üç olguyu adresliyor.

**Ölçüm 10, rapor ile Kasa aynı kümeyi saymıyor.** Aylık rapor tahsilatı hesaba bakmadan sayıyor (`aylikRapor.js:370-375`, süzgeç `satisTahsilEdildi` ve ay); Kasa'nın `girenK`'si yalnız hesabı dolu ve para birimi uyumlu kayıtları sayıyor (`kasa.js:95-97`) ve içine makina tahsilatı, virman, ciro ve verilen çek de giriyor. Ölçüm 2'ye göre ödenmiş 3012 kaydın yalnız 37'si bir hesaba bağlı, yani iki rakam bugün birbirinden kat kat farklı; "tek kaynak çaprazı" ancak kapsamı denkleştirilmiş kurulu veride ölçülebilir (AC-27, AC-47).

**Ölçüm 11, anahtarın metni.** Üç ödeme anahtarının metni bugün yalnız "Ödendi" ya da "Ödenmedi · işaretle: Ödendi" (`MachineTimeline.jsx:311`, `:361`, `:466`). X5'in andığı `:358` satırı anahtar değil, tevkifat rozetinin komşusudur. Anahtar bir aç ve kapa düğmesi olduğu için gün metnin içine girmez (R13/2).

**Ölçüm 12, pencerenin hata yeri yok.** Pencerenin bugün üç düğmesi var ve hata gösterecek yeri yok (`TahsilatHesap.jsx:86-91`); formlarda `HataMetni` emsali var (R2/2).

**Ölçüm 13, sunucunun istisnası beş bölümü kapsıyor.** `TAHSILAT_HESAP_BOLUMLERI` servis, Extra Kalıp, yedek parça, `payments` ve `cekler`'i içeriyor (`serverAuth.cjs:366`); `tahsilatTarihi` `payments`'ta da var, `cekler`'de yok (C6/2).

**Ölçüm 14, Stok'un anahtarı satır bazlı.** Stok'taki düğme satır başına çiziliyor ve tek kayda yazıyor (`YedekParcaSatisTab.jsx:214`, `:271`); müşteri detayındaki anahtar partinin ücretli bütün satırlarına yazıyor (`CustomerDetailModal.jsx:406`). Ayrım bu işle değişmez (R9/2).

**Bilinen sonuç, elle düzeltme kapanmış ayı değiştirir.** X4 toplu göçü "kapanmış ayların raporunu değiştirir" diye reddediyor; R10 ve R11 aynı etkiyi elle, kayıt kayıt üretir. Düzeltilen kaydın hem eski hem yeni ayının tahsilat rakamı değişir ve rapor yeniden basılırsa fark görünür. Bu, düzeltme yolunun kabul edilen bedelidir ve sürüm notunda yazılır.

**Varsayılan gün tartışması (öneri kuralı).** İki seçenek vardı: (a) alan her yerde bugünle dolu gelir, (b) formda satışın kendi tarihiyle, pencerede bugünle gelir. **Önerim (a)**, çünkü tek kural öngörülebilir ve R3 ileri tarihi zaten reddediyor; (b) eski bir satışı girerken doğru tahmini yapar ama "bugün tahsil ettim" hâlinde kullanıcıyı her seferinde alanı değiştirmeye zorlar ve iki yerde iki farklı varsayılan açıklanması gereken bir istisna doğurur. Geçmiş tarihli satışı girerken doğru günün yazılması, formda alanın hesabın yanında durmasıyla (R8) sağlanır.

**Bilinen tuzaklar.** (1) Üç tabloda alan zaten var, dört nokta kuralı için yeni iş yok, ama `db-roundtrip` yine koşulmalı. (2) Birleştirme kuralı değişmiyor; iki bilgisayar aynı kaydı aynı anda işaretlerse bugünkü çakışma kuralı geçerlidir (var olan kaydın düzenlemesi sunucu kopyasına yenilir). (3) Pencerenin başlığı bugün "Tahsilat Hesabı"; gün alanı eklenince başlık yanıltıcı olur. **Önerim:** başlık "Tahsilat Bilgisi" olsun, düğme metinleri ("Hesapsız kaydet", "Ödendi olarak kaydet") aynen kalsın. (4) Pencere `wide` değildir ve öyle kalır: iki alanlı kısa penceredir (tasarım sözlüğü "Pencere boyutu", Sınıf 2).

### QA turunda verilen kararlar (2026-11-04)

Boşluk analizi 16 soru çıkardı, hepsi onaylandı ve gereksinimlere işlendi.

1. **Çekin günü kayda yazılır, sorulmaz.** `_cek.gelirTarihi` bu üç bölümde hiç dolmadığı için (Ölçüm 6) "çekte gün yazılmaz" kuralı gerileme olurdu. Karar R12, R12/2, R12/3, C1/2 ve X1'in düzeltilmiş hâlinde.
2. **Zaten işaretli kaydın formu günü kendiliğinden bugüne çekmez.** Alanın ilk değeri üç hâlde tanımlı ve dokunulmayan alan yazılmaz. Karar R1/2 ve R7/2'de; AC-11 yalnız işaretsizden işaretliye geçişi ölçer, AC-33 ve AC-34 öteki iki hâli.
3. **Kasa'nın işareti dar ölçütle, düzeltme satır düzeyinde, kilitli ve izli.** Karar R11/2, R11/3, R11/4'te; 0073 R1'in gevşeyen yarısı başlık tablosunda yazılı.
4. **Panonun iki formu ve bayi detayının iki formu kapsamda.** Karar R8/2'de; gün alanı hesap alanından bağımsız olduğu için ayrı pencere de çalışır (R8/3).
5. **Gün alanı tahsilat hesabı iznine bağlanmaz.** Karar R8/3, R5/2 ve C9/2'de.
6. **Boş gün serbest, alt sınır yok.** Karar R3/2 ve R3/3'te.
7. **Kasa'da dokunulmayan gün alanı yazılmaz ve hesap seçilmeden de gün girilebilir.** Karar R10/2 ve R10/3'te; AC-18 ölçülebilir hâle getirildi.
8. **Rapor ile Kasa çaprazı ikiye bölündü.** Karar AC-27 (rapor) ve AC-47 (tek hesaplı kurulu veride Kasa) ile; gerekçesi Ölçüm 10.
9. **Yedek parçanın tek satırlı düzenlemesi de kapsamda.** Karar R8/4'te; `today()` yasağı çağrı yerini de kapsar (C3/2).
10. **Gün anahtarın yanında düz metin.** Karar R13/2'de.
11. **Metinler ve yazıcının yeri sabit.** Karar C2 ve C2/2'de (`src/lib/satisTahsilat.js`, iki hata sabiti, "Tahsilat tarihi" etiketi ve erişilebilir adı).
12. **Pencerede hata içeride yazılır, pencere açık kalır.** Karar R2/2'de.
13. **Sunucunun izinli alanı bölüme göre.** Karar C6/2'de; `payments.tahsilatTarihi` farkı reddedilir.
14. **Elle düzeltmenin kapanmış ayı değiştirmesi bilinen sonuç.** Context'in "Bilinen sonuç" cümlesinde.
15. **Ölçüm 5'in rakamı düzeltildi.** 24 geçiş, 10 atama, altısı `today()`; Kasa türetilmiş günü zaten basıyor.
16. **Stok'un satır bazlı anahtarı korunur.** Karar R9/2'de; AC-17 netleştirildi.

### Plan turunda verilen kararlar (2026-11-04)

Takım Yöneticisi planın bütün önerilerini onayladı.

- **Karar 17.** Yazıcının imzası `tahsilatGunuYaz(kayit, { eski, bugun, gun })`; ek bayrak tutulmaz. İşaret kalkmışsa alan silinir; işaretsizden işaretliye geçişte formun günü yazılır (`gun` hiç verilmemişse, yani pencere açılmayan anahtarda, bugün; boşaltılmışsa `null`); işaret zaten duruyorsa formun günü eski günle aynıysa kayda dokunulmaz, farklıysa yazılır. Formdaki alan kutu işaretlenince bugünle dolar. Kredi Kartı'nda gün yazılmaz; Çek'te gün "çek tahsil edildi" işaretinin geçişinde bugünle yazılır, kalkınca silinir (yazıcı yönteme kendisi bakar). → R1/2, R7/2, R12, R12/2
- **Karar 18.** `ucretsizUygula` alanı yazıcının temizleyicisiyle (`tahsilatGunuTemizle`) siler; davranış aynı, AC‑28 taraması korunur. → C2, AC‑28
- **Karar 19.** Geçersiz gün iki katmanda reddedilir: üç paylaşılan form kaydı kendisi engeller ve nedeni alanın altında yazar; kayıt kurucuları da doğrular ve geçersiz günü yazmaz (güvenlik ağı). → R3, AC‑16
- **Karar 20.** Kasa'da yeni pencere açılmaz: iki listede aynı satır içi gün girdisi (hesapsız listede hesap seçicinin yanında, hareket listesinde ibarenin yerinde). Kutu kaydın bugün geçerli günüyle dolu gelir; geçerli ve farklı bir gün seçildiği anda yalnız o kayda yazılır, kilide bakılır, iz yazılır; dokunulmazsa hiçbir şey yazılmaz. → R10, R10/2, R10/3, R11/3, R11/4
- **Karar 21.** Pencere `onKaydet(hesapId, gun)` ve başlık "Tahsilat Bilgisi"; iki kaydet düğmesi de doğrular. Pencerenin iki çağıranı (müşteri detayı, Stok) güncellenir. → R2, R2/2, R4
- **Karar 22.** Ters çevrilen kriterler tam takımla ölçülür; gerçek davranış değişikliği "spec 0131 ile" notlanır, değilse kod düzeltilir; başlık tablosu ölçüme göre güncellenir. → başlık
- **Karar 23.** Görsel kanıt taban ve sonra çekimiyle; değişen ekranlar `degisti` kaydıyla, kapanışta taban raporu. → DoD
- **Karar 24.** "Bugün" eylem anında `yerelBugun()`; tarih kutusunun `max`'ı çizimde aynı çağrı. Yazıcı saat okumaz. → C2, C3, AC‑29
- **Karar 25.** Zaman çizelgesinde gün anahtarın yanında soluk `GG/AA/YYYY`, başlığı "Tahsilat tarihi"; partide ücretli satırların günleri farklıysa ya da Çek/Kart kaydında yazılmaz. → R13/2
- **Karar 26.** Çek ve Kart dalları yazıcıdadır; beş çek yolu aynı yazıcıdan geçer. → R12/2

### Uygulama turunda verilen kararlar (2026-11-04)

- **Karar 27.** Formların gün alanı tek bileşendir (`kasa/TahsilatHesap.jsx` `FormTahsilatGunu`); form durumunu yazan üç küçük yardımcı da tek yazıcının yanındadır (`tahsilatGunuIsareti`: kutu işaretlenince bugün, kaldırılınca boş; `tahsilatGunuFormHatasi`: formun ve kurucuların ortak denetimi; `tahsilatGunuFormu` / `topluTahsilatGunuFormu`: düzenleme formunun açılış değeri). Böylece `tahsilatTarihi:` ataması kaynakta yalnız `satisTahsilat.js`'te kalır (AC-28). → C2, R1/2
- **Karar 28.** Kasa düzeltmesinin izi `duzenlendi` kaydının `detail.tahsilatGunu` anahtarıdır (alan adı `tahsilatTarihi` olsaydı AC-28 taraması kayıt ataması sanırdı). → R11/4
- **Karar 29.** Çek nedeni "Çekte tahsilat günü, çekin tahsil edildiği gündür; ayrıca sorulmaz." (formdaki "Çek tahsil edildi" kutusunun metnini tekrarlasaydı aynı ekranda iki eşleşme doğardı). → R12/3
- **Karar 30.** Kayıtlı ileri günlü bir tahsilatın formu, gün düzeltilmeden kaydedilmez (R3 kayıtlı değere de uygulanır). 0098'in AC-16 fikstürü ayın 6'sını kullanıyordu ve ayın ilk günlerinde ileri gündü; gün 01 yapıldı ("spec 0131 ile"). → R3, Karar 22
- **Karar 31.** 0111 toplu düzenlemesinde dokunulmayan gün satır formuna taşınmaz; bunun tek görünür etkisi partiye bu düzenlemede eklenen ödenmiş satırın bugünü almasıdır (güncellenen satırlar zaten son yazıcı adımında kendi günlerini korur). → R9, R7/2
- **Karar 32.** Görsel kanıt yeni dört ekranla: `musteri-0131-pencere-cek`, `servis-formu-0131-gun-bos` (tahsilat hesabı yetkisi yok), `servis-formu-0131-gun-hata`, `kasa-0131-gun-eksik`. Seçim kutusu oku çalıştırmadan çalıştırmaya iki hâlde çiziliyor (spec öncesi kodun iki çekimi birbirinden 79–96 piksel ayrıldı, eski taban ile yeni kodun çekimi 0 piksel tuttu); bu yüzden değişen küme iki taban × iki sonra çekiminin çapraz karşılaştırmasıyla belirlendi: 23 ekran (46 görüntü) her eşleşmede farklı, öteki 118 ekran en az bir eşleşmede 0 piksel. Rapor `0131-piksel-raporu.json` yalnız bu 23 ekranı taşır, eşlemeye 28 `degisti` kaydı yazıldı. → DoD

### Triyaj turunda verilen kararlar (2026-11-04)

- **Karar 33.** Kasa'nın satır içi gün kutusu değişimde değil, odak kaybında ya da Enter'da yazar. Gerçek Electron'da tarih kutusuna klavyeyle yıl yazılırken her hane bir değişim olayı üretiyor ("0002", "0020", "0202", "2026"); "0202-05-03" geçerli bir gün olduğu için değişimde yazmak onu kaydediyor, hareket satırını listeden düşürüp kutuyu kaldırıyor, iz ve bildirim üretiyordu. Formlar ve pencere etkilenmez (düğmeyle kaydeder). → R10, R11, Karar 20

### Karar kaydı

| # | Bulgu | Derece | Karar |
|---|---|---|---|
| 1 | R12 ile C1 çelişiyor, çekin gelir tarihi bu üç bölümde okunmuyor | Bloklayıcı | Çekte gün "çek tahsil edildi" anında yazılır (R12/2); kartta yazılmaz (R12) |
| 2 | Zaten işaretli ve günsüz kaydın formdan kaydedilmesi tanımsız | Bloklayıcı | Alanın ilk değeri üç hâlde tanımlı, dokunulmayan alan yazılmaz (R1/2, R7/2) |
| 3 | Kasa'daki düzeltme 0073 R1 ile çarpışıyor, işaretin ölçütü yok | Bloklayıcı | Dar ölçüt, ibare yalnız gün için gevşer, satır düzeyinde yazım, kilit ve iz (R11/2, R11/3, R11/4) |
| 4 | Servis Panosu ve bayi detayı kapsamda değil ama aynı kaydı yazıyor | Önemli | R8/2 ile kapsama alındı, alan hesaptan bağımsız (R8/3) |
| 5 | Gün alanının tahsilat hesabı iznine bağlı olup olmadığı yazılı değil | Önemli | Bağlanmaz (R8/3, R5/2, C9/2) |
| 6 | Boş gün ve alt sınır tanımsız | Önemli | Boş serbest ve `null` yazılır, alt sınır yok (R3/2, R3/3) |
| 7 | R10'un ön dolu değerinin yazılıp yazılmadığı ölçülemiyor | Önemli | Dokunulmayan alan yazılmaz, hesapsız düzeltme açık (R10/2, R10/3, AC-18) |
| 8 | AC-27'nin eşitlik çaprazı bugünkü motorlarla doğru değil | Önemli | İkiye bölündü (AC-27, AC-47) |
| 9 | Yedek parçanın tek satırlı düzenleme yolu ölçümde yok | Önemli | R8/4 ve C3/2; Ölçüm 1 tablosuna üç satır eklendi |
| 10 | R13'ün gösterimi tanımsız | Küçük | Anahtarın yanında düz metin, parti ve çek kartı dalıyla (R13/2) |
| 11 | Hata metinleri, alan etiketi ve yazıcının yeri yazılı değil | Küçük | C2 ve C2/2 ile sabitlendi |
| 12 | Pencerede hatanın yeri ve pencerenin kapanıp kapanmayacağı tanımsız | Küçük | İçeride `HataMetni`, pencere açık kalır, iki düğme de doğrular (R2/2) |
| 13 | Sunucunun izinli alan listesi beş bölümü birden gevşetiyor | Küçük | Bölüme göre tanımlandı (C6/2, AC-52) |
| 14 | Elle düzeltmenin kapanmış ayı değiştirmesi yazılmamış | Küçük | Context'e bilinen sonuç cümlesi |
| 15 | Ölçüm 5'in rakamı ve "gün görünmüyor" cümlesi kodla tutmuyor | Küçük | Ölçüm 5 düzeltildi |
| 16 | AC-17'nin "aynı kural"ı parti mi satır mı belirsiz | Küçük | Satır düzeyi (R9/2, AC-17) |

---

## Acceptance Criteria

- **AC-1.** Müşteri detayında ödeme anahtarı "Ödenmedi" olan bir servis işaretlenip pencerede gün değiştirilmezse kayda yerel bugün yazılır.
- **AC-2.** Aynı anahtar ikinci kez tıklanıp işaret kaldırılınca tahsilat günü silinir ve pencere açılmaz.
- **AC-3.** Pencerede gün düne çekilirse kayda o gün yazılır ve Kasa'nın hareket satırı o güne düşer.
- **AC-4.** Pencerede yarının tarihi girilirse kayıt yapılmaz, ödeme işareti konulmaz ve "bugünden sonra olamaz" nedeni yazılır.
- **AC-5.** Pencerede takvimde olmayan bir gün (2026-02-30) girilirse kayıt yapılmaz ve "takvimde var olan bir gün olmalı" nedeni yazılır.
- **AC-6.** Pencerede "Hesapsız kaydet" seçilirse hesap boş kalır ama tahsilat günü yazılır.
- **AC-7.** İşçiliği anlaşmalı firmaya ait bir serviste anahtar tıklanınca pencere açılmaz, bugünkü neden bildirimi çıkar ve tahsilat günü yerel bugünle yazılır.
- **AC-8.** `tahsilat_hesap` izni olmayan kullanıcıda pencere açılmaz ve tahsilat günü yerel bugünle yazılır.
- **AC-9.** Extra Kalıp anahtarı aynı kuralı uygular: gün sorulur, yazılır, kaldırılınca silinir.
- **AC-10.** Yedek parça partisinin anahtarı partideki ücretli bütün satırlara aynı günü yazar; ücretsiz satıra ödeme alanı yazılmaz (0095 kuralı korunur).
- **AC-11.** Servis formunda "Ödendi" kutusu **işaretsizden işaretliye** çevrilip kaydedilince tahsilat günü yerel bugünle yazılır; alan hesabın yanındadır ve bugünle dolu gelir (R1/2 hâl 1).
- **AC-12.** Extra Kalıp formunda aynı davranış ölçülür.
- **AC-13.** Yedek parça formunda yeni kayıt işaretli kaydedilince tahsilat günü yazılır.
- **AC-14.** Yedek parça formunda "Ödendi" kutusuna dokunulmayan düzenleme, kayıtlı tahsilat gününü aynen korur (0111 R6/4).
- **AC-15.** İşaret duruyorken servis ücreti değiştirilip kaydedilirse tahsilat günü değişmez.
- **AC-16.** Formda yarının tarihi girilirse kayıt reddedilir ve nedeni alanın altında yazar.
- **AC-17.** Stok › Yedek Parça Satışı satırındaki anahtar aynı kuralı **satırın kendi kaydına** uygular; partinin diğer satırlarına dokunmaz (R9/2).
- **AC-18.** Kasa'da hesabı belirtilmemiş bir tahsilata hesap atanırken gün alanı kaydın bugün geçerli günüyle dolu gelir; alana dokunulmazsa kayda `tahsilatTarihi` **yazılmaz** (alan boş kalır) ve hareket satırının tarihi değişmez (R10/2).
- **AC-19.** Aynı yerde gün bugüne çekilirse hareket satırı bugüne taşınır ve hesabın yürüyen bakiyesi yeni sıraya göre hesaplanır; hesabın kapanış bakiyesi değişmez.
- **AC-20.** Hesaba bağlı olduğu hâlde tahsilat günü girilmemiş hareket satırı Kasa'da işaretlenir ve günü o satırdan girilebilir.
- **AC-21.** Kasa'da günü girilmemiş hiçbir satır yoksa o işaret ve düzeltme yolu çizilmez (boş durum).
- **AC-22.** Yöntemi Kredi Kartı olan kayıtta gün sorulmaz, nedeni yazılır, kayda tahsilat günü yazılmaz ve hareketin tarihi kartın hesaba geçiş gününden gelmeye devam eder.
- **AC-23.** Yöntemi Çek olan kayıtta pencere ve form gün sormaz ve nedenini yazar; gün "çek tahsil edildi" işareti konulduğunda yerel günle yazılır, işaret kaldırılınca silinir (R12/2).
- **AC-24.** USD tahsilatta pencere yalnız USD hesaplarını listeler (0044 R3) ve gün kuralı birebir aynıdır.
- **AC-25.** Para birimi tanınmayan kayıt bir hesaba bağlanamaz ama tahsilat günü yazılır; aylık raporun bilinmeyen para birimini TL kovasına koyma kuralı değişmez.
- **AC-26.** Müşteri detayındaki ödeme anahtarı, günü yazılı bir kayıtta günü de gösterir; günü olmayan eski kayıtta bugünkü metin değişmez.
- **AC-27.** Aylık faaliyet raporu, günü bugüne yazılmış bir tahsilatı bu ayın tahsilat listesinde ve toplamında sayar (Kasa çaprazı AC-47'de).
- **AC-28.** Kaynak taraması: `tahsilatTarihi` ataması yalnız tek yazıcıda geçer.
- **AC-29.** Kaynak taraması: tahsilat gününü üreten yolda UTC `today()` kullanılmaz.
- **AC-30.** Sunucu: yalnız `hesapId` ve `tahsilatTarihi` değişen yazım, Giderler ve Finans sekmeli kullanıcıda kabul edilir; aynı yazımda üçüncü bir alan değişirse 403 ile reddedilir.
- **AC-31.** Kıyas: tahsilat günü girilmemiş bir veride Kasa'nın hareket listesi, hesabı belirtilmemiş tahsilat listesi ve aylık rapor spec öncesi kodla birebir aynı çıktıyı verir.
- **AC-32.** Tarih kutusu ileri günü seçilemez hâle getirir (`max`) ve erişilebilir adı vardır; klavyeyle yazılan ileri gün R3 ile reddedilir.

### QA turu kriterleri (2026-11-04)

- **AC-33.** İşareti zaten duran ve günü yazılı bir kaydın formu o günü gösterir; başka bir alanı değiştirip kaydedince gün aynen kalır (R1/2 hâl 2).
- **AC-34.** İşareti zaten duran ama günü olmayan kayıtta form alanı **boş** gelir; alana dokunulmadan kaydedilince kayda gün yazılmaz (R1/2 hâl 3, R7/2).
- **AC-35.** Yöntemi Çek olan Extra Kalıp kaydında "çek tahsil edildi" işareti konulunca yerel gün yazılır, kaldırılınca silinir; ödeme penceresi gün sormaz.
- **AC-36.** Servis formundaki "Çek tahsil edildi" kutusu işaretlenip kaydedilince tahsilat günü yerel günle yazılır (R12/2).
- **AC-37.** Kasa'nın hesap hareketleri listesinde Kredi Kartı ve Çek yöntemli satır, makina tahsilatı satırı ve verilen çek satırı "günü girilmedi" diye işaretlenmez (R11/2).
- **AC-38.** Kasa'dan yapılan gün düzeltmesi yalnız o satırın kaydına yazar; aynı partinin diğer satırları değişmez (R11/4).
- **AC-39.** Kayıt başkasının kilidindeyse Kasa'dan gün düzeltmesi yazılmaz ve nedeni bildirilir (R11/4, 0064 R14).
- **AC-40.** Gün düzeltmesi işlem geçmişinde bugünkü `duzenlendi` kaydının detayında tarihiyle görünür; yeni eylem kimliği yoktur (R11/4).
- **AC-41.** Servis Panosunun servis formunda gün alanı çizilir ve kaydedilince yazılır; aynı alan panonun ayrı penceresinde de (sahte köprüyle) çizilir (R8/2, R8/3).
- **AC-42.** Bayi detayından açılan Extra Kalıp ve yedek parça formunda aynı kural ölçülür (R8/2).
- **AC-43.** `tahsilat_hesap` izni olmayan kullanıcıda formda hesap alanı çizilmez ama gün alanı çizilir ve kaydedilince yazılır (R8/3, C9/2).
- **AC-44.** Gün alanı boşaltılıp kaydedilince kayda `null` yazılır, okuma kaydın satış ya da servis tarihine düşer ve alanın yanında "gün belirtilmedi" ipucu durur (R3/2).
- **AC-45.** Satış tarihinden önceki bir gün kabul edilir, kayıt yazılır ve uyarı çıkmaz (R3/3).
- **AC-46.** Kasa'da hesap seçilmeden yalnız gün girilip kaydedilebilir; hesap alanı boş kalır (R10/3).
- **AC-47.** Tek TL hesaba bağlı ve yalnız o kaydı içeren kurulu veride, hesabın ay aralığındaki giren tutarı o kaydın brüt tahsilat tutarına eşittir (tek kaynak çaprazının ölçülebilir hâli).
- **AC-48.** Stok'un tek satırlı yedek parça düzenlemesinde "Ödendi" kutusu işaretlenip kaydedilince tahsilat günü yazılır (R8/4).
- **AC-49.** Müşteri detayındaki ödeme anahtarının yanında gün düz metin olarak görünür; partide günler farklıysa yazılmaz, çek ve kart kaydında türetilmiş gün gösterilmez (R13/2).
- **AC-50.** Pencerede geçersiz gün girilince hata pencerenin içinde alanın altında yazar, pencere açık kalır ve "Hesapsız kaydet" de aynı doğrulamadan geçer (R2/2, R4).
- **AC-51.** Kaynak taraması: iki hata sabiti ve alan etiketi tek yerde tanımlı; `aria-label="Tahsilat tarihi"` yalnız gün alanında geçer (C2/2).
- **AC-52.** Sunucu: `payments` bölümünde yalnız `hesapId` farkı kabul edilir, `tahsilatTarihi` farkı 403 ile reddedilir (C6/2).

---

## Definition of Done

- [x] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [x] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [x] Tahsilat gününü yazan tek yol React'sız saf bir yardımcıdır, günü parametre alır ve kendi testi vardır; arayüz yalnız alanı çizer.
- [x] Kasa, aylık faaliyet raporu ve 0047 raporu aynı günü aynı kaynaktan okuyor (çapraz test yazıldı).
- [x] Çek tahsil işaretinin yazdığı gün de aynı tek yazıcıdan geçiyor; `_cek` basamağının bu üç bölümde dolmadığı ölçümü spec'te yazılı (R12/2, C1/2).
- [x] Servis Panosu (sekme, kiosk, ayrı pencere) ve bayi detayının formları kriterle ölçüldü (R8/2).
- [x] Gün alanı `tahsilat_hesap` izni olmadan da çiziliyor ve yazılıyor (R8/3).
- [x] 0073 R1'in gevşeyen yarısı test yorumlarında "spec 0131 ile" notuyla işaretlendi ve başlık tablosunda yazılı.
- [x] Yeni kalıcı alan yok; `tahsilatTarihi` üç tabloda zaten var ve `db-roundtrip` yeşil.
- [x] Yeni veri bölümü yok; birleştirme kuralı değişmedi (açıkça yazıldı).
- [x] Yeni eylem izni yok; hesap penceresi `tahsilat_hesap` kapısında kaldı ve bu açıkça yazıldı. Sunucunun izinli alan listesi genişletildi ve `server-authz` ile `server-security` bloğu eklendi.
- [x] Soft-delete ve çöp kutusu simetrisi etkilenmedi (açıkça yazıldı).
- [x] Kullanıcıya görünen tüm metinler Türkçe; yazdırma çıktısı değişmedi.
- [x] Para gösterilen yerlerde çoklu para kuralı korundu; bilinmeyen para birimi tanımlı biçimde ele alındı.
- [x] Arayüz kriterlerinin görsel kanıtı eklendi (pencerenin gün alanı, formdaki alan, Kasa'nın işaretli satırı, boş durum), taban raporu 0 piksel farkla alındı.
- [x] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [x] `CLAUDE.md`'nin 0044 bölümüne tahsilat gününün tek yazım yolu ve yerel gün kuralı yazıldı.
- [x] Takım Yöneticisi onayladı. **Commit ve sürüm yayını yalnız açık talimatla yapılır.**
- [x] **SCORECARD dolduruldu** ve spec `specs/done/` klasörüne taşındı.

---

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Uygulama commit** | `12f158e0` | Dal `feat/0131-tahsilat-gunu`, taban `d63bd83f`; kapanış ayrı commit |
| **Spec revizyon sayısı** | 3 | Plan turu (Karar 17–26), uygulama (Karar 27–32), triyaj (Karar 33) |
| **Düzeltme turu sayısı** | 1 | Triyaj: Kasa kutusu ara değerleri yazıyordu, 0107 eşleme testi, AC-40 iz iddiası, Extra Kalıp açılış günü |
| **Bulgu gerçek/gürültü oranı** | 4 / 0 | İkisi önemli (biri gerçek Electron ölçümüyle bulundu), ikisi küçük test boşluğu |
| **Regresyon sayısı** | 0 | Tam takım 472 dosya, 6521 test (Electron dahil); lint 0 hata, uyarı 62 |
| **Kaçan hata** | 0 | |

**Uygulamada bulunanlar:** üç ters çevirme ölçümle çıktı (0111 çek beklentisi, 0098 AC-16'nın ayın ilk günlerinde ileri günlü fikstürü, 0079/0095 ekran kıyaslarında yeni gün metni). Çek nedeninin ilk metni formdaki "Çek tahsil edildi" kutusunun metnini tekrarlıyordu, iki eşleşme doğurdu. Mutasyon ölçümü: uygulamada on beş bozma, triyajda üç; kaçan üçü (toplu planın gün düğümü, pano formu, müşteri detayının servis formu) ek testlerle yakalandı, toplu plan düğümünün yalnız partiye eklenen yeni satırda görünür olduğu bu sırada ölçüldü.

**Görsel kanıt:** seçim kutusu oku süreç içindeki çizim sırasına bağlı iki hâlde çiziliyor; değişen küme iki taban × iki sonra çekiminin çapraz karşılaştırmasıyla bulundu: 23 ekran (dördü yeni) bilinçli değişti, 118'i değişmedi. Taban son kodla 46 görüntüde 0 fark (ok yüzünden `kalip-formu-0107-duzenle` tek başına çekilince 355 piksel ayrılıyordu, onaylı görüntünün çekildiği toplu listeyle 0); altı dosyadaki 28 `degisti` kaydı kapanışta `ayni` ve `0131-taban-piksel-raporu.json`'a çevrildi.

**Bu spec'ten çıkarılan ders:** değişim olayında kayıt yazan satır içi tarih kutusu, klavyeyle yazılan ara değerleri de kaydeder; jsdom testi tam değeri tek olayla verdiği için bunu göremez. Satır içi girdiler odak kaybında ya da Enter'da yazmalı ve test ara değerlerle sürmelidir.
