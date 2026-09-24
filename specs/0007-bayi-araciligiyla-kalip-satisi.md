# 0007 — Bayi Aracılığıyla Kalıp Satışı ve Borç Atıfı

| | |
|---|---|
| **Durum** | Onaylandı (2026-09-24, uygulama planı `specs/0007-uygulama-plani.md` onayıyla, K12) |
| **Sahip** | Analist (spec) · geliştirme sahibi atanacak |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Bayi detay modalı, Extra Kalıp satış formu, borç hesabı (Müşteriler, Anasayfa, Bayiler), aylık faaliyet raporu |
| **Bağımlı spec'ler** | yok |
| **Revizyon** | R1 (2026-09-24, plan turu K1–K12, onay öncesi): fabrika tespitine eski varsayılan ad eklendi (R7), ücretsiz kalıbın bugün her yerde borç dışı olmadığı görüldü ve kural açıkça yazıldı (R8, R9), müşteri detayı beşinci tüketici oldu (R5), yalnız Kalıp türüne uygulanır (R12), aylık rapor anahtarı (R13), müşterisiz kayıt uyarısı (R14), bayi sekmeli kullanıcının yazma yolu (C6), duyuru biçimi (C5). R2 (2026-09-24, gerçek kullanımda bulundu): geçmişi olmayan düz bayide modal dar varyantta açılıyor ve dördüncü buton eklenince eylem satırı taşıp ilk butonu kırpıyordu. Karar: modal genişletilecek, etiketler kısaltılmayacak (R16, AC-19, AC-20). |

---

## Intent

Fabrika kalıbı bayiye satıyor, faturayı bayiye kesiyor, kalıp ise nihai müşterinin makinasına
takılıyor. Uygulama bu akışı kaydedebiliyor ama iki yerde zorlaştırıyor: kaydı başlatmak için
bayi kartından çıkıp müşteriyi bulmak ve formda satış yapan firmayı elle seçmek gerekiyor, ve
ödenmemiş bir kalıp bedeli hem bayinin hem müşterinin borcu gibi görünüyor. Oysa o parayı bize
bayi borçlu; müşteri bayiye borçlu, bize değil.

Başarı şu demek: kullanıcı bayi kartından tek tıkla bu satışı başlatabiliyor, kalıp doğru
makinaya yazılıyor, ve ödenmemiş bedel yalnız bayinin borcunda görünüyor. "Kime ne kadar
borçlular" sorusunun cevabı Müşteriler, Anasayfa, Bayiler ve aylık raporda aynı çıkıyor.

---

## Requirements

- **R1.** Bayi detay modalında, o bayi aracılığıyla yapılacak Extra Kalıp satışını başlatan bir buton
  bulunur. Buton mevcut Extra Kalıp satış formunu açar ve **satış yapan firma olarak o bayiyi ön seçer**.
- **R2.** Kullanıcı formda kalıbın gideceği müşteriyi ve makinayı seçer; kayıt o müşteriye Extra Kalıp
  satışı olarak yazılır. Bayi alıcı değildir.
- **R3.** Butonun adı, bayinin **alıcı değil aracı** olduğunu belli eder. Önerilen ad: "Bayi Aracılığıyla
  Kalıp Satışı". Yanındaki "Yedek Parça Satışı" butonunda bayi **alıcıdır**; ikisi aynı şeyi yapıyormuş gibi
  görünmemelidir.
- **R4.** **Borç atıfı kuralı:** bir Extra Kalıp satışında satış yapan firma fabrika değilse, ödenmemiş
  bedelin borçlusu o firmadır; müşteri bu bedelden dolayı borçlu sayılmaz.
- **R5.** Bu kural **beş yerde aynı** çalışır: Müşteriler ekranındaki borç süzgeci ve satır vurgusu,
  Anasayfa'daki borçlu firma sayısı ve listesi, Bayiler ekranındaki bayi borcu, aylık faaliyet raporundaki
  alacak atıfı ve borçlu firma sayısı, ve **müşteri detayındaki borç toplamı** (R1: detay da aynı kalıbı müşteriye
  yazıyordu; kullanıcı müşteriyi borçlu listesinde görmeyip detayında borçlu görürdü).
- **R6.** Anlaşmasız dış firma ("Diğer") aracılığıyla yapılan satışta borç o firmanın adına yazılır;
  müşteriye yazılmaz. Firma adı kayıtta saklanan addır.
- **R7.** Satış yapan firması boş olan veya fabrika olan kayıtlarda borç bugünkü gibi **müşteriye** aittir.
  Eski kayıtlar bu yüzden davranış değiştirmez. **Fabrika** = güncel fabrika adı **veya** eski varsayılan "Altuntaş
  Makina" metni (servisteki `isAltuntasServisi` emsali); aksi hâlde fabrika adı değiştirilmiş kurulumlarda eski kayıtlar
  hayali bir firmaya borç yazardı.
- **R8.** Ücretsiz verilen kalıplar **hiçbir yerde** borç üretmez. *(R1: bugün Müşteriler, Anasayfa ve aylık rapor ödenmemiş
  ücretsiz kalıbı borç sayıyordu; yalnız görüntüleme onu 0 gösteriyordu.)*
- **R9.** Toplam alacak tutarı değişmez; değişen borcun kime ait olduğudur. **Tek istisna:** ücretsiz işaretli olup ücret alanı
  dolu eski kayıtlar artık toplam alacağa girmez (yanlış sayılan tutarın düzelmesi, R8). Finans'ın toplam alacağı da aynı
  kuralla hizalanır.
- **R10.** Bayi detayındaki "Sattığı Kalıplar" bölümü yeni kaydı kullanıcı ekranı yenilemeden gösterir.
- **R11.** Butonun görünürlüğü mevcut Extra Kalıp ekleme iznine (`cust_kalip_add`) bağlıdır; yeni izin tanımlanmaz.
- **R12.** Atıf kuralı yalnız **Kalıp** türündeki satışlara uygulanır; diğer türlerdeki eski kayıtlar (Evrak'ın eski "Parça"
  kayıtları) bugünkü gibi müşteride kalır.
- **R13.** Aylık raporda bayi borcu, yedek parça bayi borcuyla aynı satırda toplanır: satış yapan ad bayilerde bulunursa bayi
  kimliğiyle, "Diğer" veya bulunamayan adsa firma adıyla anahtarlanır (mevcut ad anahtarlı yol; yeni anahtarlama yok).
- **R14.** Müşteri seçilmeden kayıt denenirse formda neden gösterilir ve kayıt yapılmaz (müşteri detayından açılan form için de).
- **R15.** "Diğer" firmanın borcu Bayiler listesinde görünmez (bayi değildir); Anasayfa'nın Borçlu Bayi/Servis penceresinde ve
  aylık raporda görünür.
- **R16.** Bayi detay modalının eylem satırı **tek satırda ve kırpılmadan** sığar. Modalın dar varyantı
  bunu sağlayacak kadar genişletilir. **Etiketler kısaltılmaz:** "Yedek Parça Satışı" ile "Bayi
  Aracılığıyla Kalıp Satışı" arasındaki fark (bayi alıcı mı, aracı mı) tam da bu etiketlerle anlaşılıyor.

---

## Constraints

### Uyulması zorunlu

- **C1.** Yeni kalıcı alan eklenmez. Satış yapan firma alanı kayıtta zaten var ve bayi adını taşıyor.
- **C2.** Extra Kalıp kaydı **tek formdan** üretilir. Bayi modalı aynı formu açar; ikinci bir form veya
  ikinci bir kayıt yolu yazılmaz.
- **C3.** Borç atıfı kuralı **tek bir paylaşılan fonksiyonda** tanımlanır ve dört ekran onu kullanır. Servis
  tarafında aynı karar zaten böyle uygulanmış (anlaşmalı firmanın üstlendiği parça borcu); kalıp tarafı o
  emsale hizalanır.
- **C4.** Kullanıcıya görünen tüm metinler Türkçedir.
- **C5.** **Kabul edilen davranış değişikliği:** bugüne kadar borçlu görünen bazı müşteriler borçlu
  listelerinden çıkar. Bu, Takım Yöneticisi tarafından bilerek onaylanmıştır (24.09.2026); rakam düzelmesi
  olarak görülmelidir, veri kaybı değildir. Ekranda kalıcı açıklama eklenmez; sürüm notu metni hazırlanır ve sürüm
  yayınında kullanılır.
- **C6.** Yalnız Bayiler sekmesi olan kullanıcı bu kaydı yazabilmelidir: sunucunun bölüm-sekme eşlemesinde Extra Kalıp
  bölümüne "dealers" eklenir; kayıt düzeyindeki `cust_kalip_add` denetimi aynen kalır.

### KAPSAM DIŞI

- **X1.** Kalıbın alıcısının bayi olması, yani bayi stoğuna kalıp satışı — *neden:* kalıp kaydı müşteriye ve
  makinaya bağlı; alıcı türü eklemek yedek parçadaki modelin kalıp tarafına taşınması demek ve kendi işidir.
- **X2.** Geçmiş kayıtların toplu düzeltilmesi veya veri göçü — *neden:* kural okuma anında çalışır, kayıtlar
  değişmez. Satış yapan firması zaten dolu olan eski kayıtlar yeni kuralla doğru tarafa düşer.
- **X3.** Bayinin nihai müşteriye uyguladığı fiyat farkı, kârı veya komisyonu — *neden:* bizim kaydımız
  bayiye kestiğimiz bedeldir; bayinin kendi satış fiyatı bizim defterimizin konusu değil.
- **X4.** Yedek parça tarafında benzer bir değişiklik — *neden:* orada alıcı zaten bayi olabiliyor ve borç
  doğru tarafta.
- **X5.** Servis tarafı — *neden:* aynı karar orada zaten uygulanmış durumda.
- **X6.** Bayi bazlı kâr veya ciro raporu — *neden:* bu spec borcun kime ait olduğunu düzeltir, yeni bir
  rapor açmaz.

---

## Context

Kodda doğrulanmış mevcut durum:

- **Model bu akışa uygun.** Extra Kalıp kaydındaki satış yapan firma alanı bayi seçildiğinde borcu o bayiye
  yazıyor (`SimpleDealers.jsx:85-88`: satış yapan firma fabrika değilse ödenmemiş bedel o firmanın borcu).
  Kalıp ise müşteriye ve makinaya yazılıyor. Yani "fatura bayiye, kalıp makinaya" akışı bugünkü veriyle
  karşılanıyor; eksik olan başlatma kolaylığı ve atıf tutarlılığı.
- **Bayi kartı satılanları zaten gösteriyor.** Bayi detayında "Sattığı Kalıplar" bölümü var
  (`SimpleDealers.jsx:150-154`, satış yapan firma bu bayi olan Extra Kalıp satışları). Eksik olan yalnız
  yeni kayıt açma düğmesi; yanındaki "Yedek Parça Satışı" düğmesi `:734` satırında duruyor.
- **Aynı borç bugün iki yerde.** `customerHasAnyDebt` (`utils.js`) satış yapan firmaya hiç bakmıyor,
  müşteriyi borçlu sayıyor; aylık rapor da alacağı müşteriye yazıyor (`aylikRapor.js:413`). Bayiler ekranı
  ise aynı bedeli bayiye yazıyor. Sonuç: tutar bir kez sayılıyor ama borçlu iki firma görünüyor.
- **Emsal karar serviste var.** Anlaşmalı bir firmanın yaptığı serviste parça bedelinin borçlusunun müşteri
  değil o firma olduğu açıkça kararlaştırılmış ve koda yazılmış (`utils.js`, `isParcaBorcluAnlasmaliFirmaya`,
  yorumunda "Karar: Seçenek A" geçiyor). Bu spec aynı kararı kalıp tarafına taşır.
- **Ad bağı korunuyor.** Bayi adı değiştiğinde Extra Kalıp satışlarındaki satış yapan firma alanı da
  güncelleniyor (`SimpleDealers.jsx:231`, 0006 ile geldi), dolayısıyla borç atıfı ad değişikliğinde bölünmez.
- **Form hazır.** Extra Kalıp formu satış yapan firma seçicisini zaten taşıyor (Fabrika, bayiler, "Diğer");
  bayi modalından açıldığında bu alanın ön seçilmesi yeterli.

- **Modal genişliği koşullu.** Bayi detay modalı, anlaşmalı servis olan veya yedek parça ya da kalıp
  geçmişi bulunan bayilerde geniş, hiçbiri yoksa dar açılıyor (`SimpleDealers.jsx:439`). Eylem satırı sağa
  hizalı ve satır sarması yok (`:751`); bu yüzden dar varyantta dördüncü buton eklenince taşma sola kayıp
  ilk butonu kırpıyordu. **Kabul edilen bedel:** geçmişi olmayan bir bayinin modalı, içeriğine göre bir
  miktar geniş görünecek.

Bilinen tuzaklar:

- **Tek kaynak kuralı.** Borç atıfı dört ekranda ayrı ayrı yazılırsa er geç ayrışır; bu projede aynı rakamın
  iki kaynağı daha önce iki kez hataya yol açtı. C3 bu yüzden bir tercih değil kısıttır.
- **Sessiz liste kısalması.** Kural devreye girdiğinde borçlu müşteri sayısı düşecek. Kullanıcı bunu veri
  kaybı sanabilir; sürüm notunda ve gerekiyorsa ekranda bir kez açıklanmalıdır.
- **Dış firma anahtarı.** Anlaşmasız firmanın kimliği yok, yalnız adı var. Aylık raporda müşteri olmayan
  borçlular için ad anahtarlı ekleme yolu zaten mevcut (yedek parça dış firma alıcısı böyle işleniyor);
  kalıp tarafı da o yolu kullanmalı, yeni bir anahtarlama icat edilmemeli.

---

## Acceptance Criteria

- **AC-1.** Bayi detay modalında Extra Kalıp satışını başlatan buton görünür ve tıklanınca Extra Kalıp satış
  formu açılır.
- **AC-2.** Açılan formda satış yapan firma, modalın ait olduğu bayi olarak seçilidir.
- **AC-3.** Formda müşteri ve makina seçilip kaydedildiğinde Extra Kalıp satışı o müşteriye yazılır ve
  müşterinin makina geçmişinde görünür.
- **AC-4.** Kaydedilen satış, aynı bayinin detayındaki "Sattığı Kalıplar" bölümünde ekran yenilenmeden
  görünür.
- **AC-5.** Müşteri seçilmeden kayıt yapılamaz; kullanıcıya nedeni söylenir.
- **AC-6.** Satış yapan firması bir bayi olan ve ödenmemiş bir Extra Kalıp satışı, o bayinin borcunda
  görünür.
- **AC-7.** Aynı satış yüzünden müşteri, Müşteriler ekranındaki borçlu süzgecinde görünmez ve satırı borç
  rengiyle vurgulanmaz.
- **AC-8.** Aynı satış yüzünden müşteri, Anasayfa'daki borçlu firma sayısına ve listesine girmez.
- **AC-9.** Aynı satış aylık faaliyet raporunda bayinin alacağı olarak görünür, müşterinin değil.
- **AC-10.** Aynı satışın tutarı toplam alacakta **bir kez** sayılır; kuralın devreye girmesi toplam alacağı
  değiştirmez.
- **AC-11.** Satış yapan firması "Diğer" olan ödenmemiş bir kalıpta borç, kayıtta yazan firma adına yazılır;
  müşteri borçlu görünmez.
- **AC-12.** Satış yapan firması boş olan ödenmemiş bir kalıpta borç müşteriye aittir (eski kayıt davranışı
  korunur).
- **AC-13.** Satış yapan firması fabrika olan ödenmemiş bir kalıpta borç müşteriye aittir.
- **AC-14.** Ücretsiz işaretli bir kalıp hiçbir tarafta borç üretmez.
- **AC-15.** Ödendi işaretlenen bir kalıp, bayinin borcundan düşer.
- **AC-16.** Bayinin adı değiştirildiğinde borç atıfı bozulmaz; aynı tutar aynı bayide görünmeye devam eder.
- **AC-17.** Extra Kalıp ekleme izni olmayan bir kullanıcıya bayi modalındaki buton görünmez.
- **AC-18.** Borç atıfı dört ekranda da aynı sonucu verir; aynı veri için Müşteriler, Anasayfa, Bayiler ve
  aylık rapor farklı borçlu göstermez.
- **AC-19.** Geçmişi olmayan düz bir bayinin detay modalında dört eylem butonunun tamamı tek satırda,
  kırpılmadan görünür ve tıklanabilir.
- **AC-20.** Kullanıcının izinlerine göre buton sayısı azaldığında (ör. yedek parça ekleme izni yokken üç
  buton kaldığında) yerleşim bozulmaz ve hiçbir buton kırpılmaz.

---

## Definition of Done

- [ ] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [ ] Borç atıfı **tek bir paylaşılan saf fonksiyonda**; dört ekranın da onu kullandığı testle gösterildi (C3).
- [ ] Dört ekranın aynı veri için aynı borçluyu verdiği çapraz testle gösterildi (AC-18).
- [ ] Toplam alacağın değişmediği testle gösterildi (AC-10).
- [ ] Yeni kalıcı alan eklenmedi ve mevcut kayıtlar değiştirilmedi; PR özetinde yazıldı.
- [ ] Extra Kalıp kaydı için ikinci bir form veya kayıt yolu yazılmadı (C2).
- [ ] Yeni izin eklenmedi; buton görünürlüğünün mevcut izne bağlandığı testle gösterildi.
- [ ] Kullanıcıya görünen tüm metinler Türkçe.
- [ ] Arayüz kriterlerinin görsel kanıtı eklendi (`docs/evidence/0007-ac<n>.png`), bayi modalı ve borçlu
      listeleri dâhil.
- [ ] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [ ] `CLAUDE.md` borç atıfı kuralıyla güncellendi; servis tarafındaki emsale atıf yapıldı.
- [ ] Davranış değişikliği sürüm notunda açıkça yazıldı (C5).
- [ ] Takım Yöneticisi onayladı. Commit ve sürüm yayını yalnız açık talimatla.
- [ ] SCORECARD dolduruldu ve spec `specs/done/` klasörüne taşındı.

---

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Spec revizyon sayısı** | | Onaylandıktan sonra Requirements, Constraints veya Acceptance Criteria kaç kez değişti? |
| **Düzeltme turu sayısı** | | İş kaç kez geri döndü? |
| **Bulgu gerçek/gürültü oranı** | / | Gözden geçirmede çıkan bulgulardan kaçı gerçek sorundu? |
| **Regresyon sayısı** | | Bu iş yüzünden bozulan, daha önce çalışan davranış sayısı. |
| **Kaçan hata** | | Gerçek uygulamada sonradan bulunan hata sayısı. |

**Bu spec'ten çıkarılan ders:**
