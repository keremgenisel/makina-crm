# 0003 — Ödeme Hatırlatıcısı

| | |
|---|---|
| **Durum** | Tamamlandı (2026-09-24, commit `6085b01`; plan `specs/done/0003-uygulama-plani.md`, onay H11 ile plan onayıyla) |
| **Sahip** | Analist (spec) · geliştirme sahibi atanacak |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Anasayfa (yeni kart), Giderler ekranı (vurgu ve liste), Ayarlar (eşik gün) |
| **Bağımlı spec'ler** | **0001** (son ödeme tarihi, ödeme durumu, gider yetkisi) |
| **Revizyon** | R1 (2026-09-24): onay öncesi QA boşluk analizi; 18 açık nokta karara bağlandı — 0001'in uygulanmış hâliyle üç çelişki (tek vade alanı, personel satırının toplanması, mevcut vade hesabı ve süzgeci), ödenecek tutar ayrımı, kart ile süzgecin eşitlenmesi, "bugün"ün canlı tutulması; R1/R2/R3/R5/R6/R7/R8/R10, C1/C2/C3 güncellendi, AC-8/9/10/14 düzeltildi, AC-17…AC-26 eklendi. Spec henüz "Taslak" olduğu için SCORECARD'ın revizyon sayacı işlemez (o sayaç onaydan sonrasını ölçer). |

---

## Intent

Gider kalemleri uygulamaya girilmeye başlandığında ödenmemiş olanlar listede durur, ama kimse
listeye bakmadıkça vadesi geçen fark edilmez. Bugün uygulama sahibine hiçbir şey hatırlatmıyor;
ödeme gününü hatırlamak tamamen kişinin aklına kalmış durumda. Bunun bedeli gecikme, gecikme
zammı ve tedarikçiyle gereksiz gerilimdir.

Başarı şu demek: kullanıcı uygulamayı açtığında, vadesi geçmiş ve yaklaşan ödenmemiş
kalemlerin kaç tane olduğunu Anasayfa'da görüyor, tıklayınca hangi ödemeler olduğunu vadesine
göre sıralı görüyor, ödediğini işaretleyince liste küçülüyor. Bunun için ayrı bir ekran açıp
aramak zorunda kalmıyor.

---

## Requirements

- **R1.** Sistem, **ödenmemiş** ve **son ödeme tarihi girilmiş** gider kalemlerini takip eder; vadesi
  geçmiş olanlarla eşik gün sayısı içinde vadesi gelecek olanları hatırlatır. Kapsam dışı kalanlar, 0001'in
  borç özetiyle **aynı kurallardır**: çöp kutusundaki (silinmiş) kalemler girmez ve geri alındıklarında
  döner; **yürürlük ayından önceki** kalemler girmez (o dönem uygulamada "gider verisi girilmemiş"
  sayılıyor); **gider tarihi gelecekte** olan, yani henüz gerçekleşmemiş kalemler girmez.
- **R2.** Hatırlatma Anasayfa'da bir kart olarak görünür ve **iki ayrı sayı** gösterir: vadesi geçmiş
  kalem sayısı ve yaklaşan kalem sayısı. Tek bir toplam rakam gösterilmez, çünkü aciliyeti gizler.
  Kart tıklanınca Anasayfa'nın mevcut deseninde bir liste penceresi açılır; pencerenin altındaki
  "Giderlerde Görüntüle" düğmesi, hatırlatma süzgeci açık hâlde Giderler ekranına götürür.
- **R3.** Listede her kalem için borcun tarafı, **ödenecek tutar**, son ödeme tarihi ve kaç gün geçtiği ya
  da kaç gün kaldığı görünür. Gösterilen tutar 0001'in **"ödenecek tutar"** tanımıdır (KDV dâhil, kira
  kaleminde stopaj hariç), gider tutarı değil; sütun başlığı bunu söyler. **Personel kalemleri isim isim
  listelenmez:** tek bir satırda toplanır ("Çalışanlar · N kalem · toplam X TL") ve çalışan adları yalnız
  satır açıldığında görünür (0001 C7b ve borç özetiyle aynı davranış). Liste vadesi en eski olandan
  başlayarak sıralanır.
- **R4.** Vadesi geçmiş kalemler, vadesi yaklaşanlardan **görsel olarak ayrılır**.
- **R5.** Eşik gün sayısı Ayarlar'dan değiştirilebilir; varsayılanı 7 gündür. Geçerli aralık **0 ile 365
  gün** arasıdır; dışına çıkan veya sayı olmayan bir değer kaydedilmez ve kullanıcıya nedeni söylenir.
  Ayarı değiştirme yetkisi 0001'in gider ayarlarıyla aynıdır (`gider_tanim`); yeni izin tanımlanmaz.
- **R6.** Bir kalem ödendi işaretlendiğinde hatırlatmadan **anında** düşer. İşaretleme düğmesi 0001'in
  `gider_odeme` iznine bağlıdır: izni olmayan kullanıcı listeyi görür ama düğmeyi görmez (0001 bu alanı
  sunucuda da denetliyor, aksi hâlde kullanıcı düğmeye basınca 403 alırdı).
- **R7.** Son ödeme tarihi girilmemiş ödenmemiş kalemler hatırlatmaya girmez. **Ayrı bir çek vade alanı
  yoktur:** 0001'de vade için tek alan vardır ve ödeme yöntemi Çek seçildiğinde yalnız etiketi "Çek vade
  tarihi" olur. Hatırlatma her iki durumda da aynı alanı kullanır; yöntem Çek ise ekranda çek vadesi olarak
  adlandırılır.
- **R8.** Giderler ekranındaki kalem listesinde hatırlatma kapsamındaki kalemler vurgulanır. Yeni bir
  süzgeç kurulmaz: mevcut ödeme durumu süzgecine **"hatırlatma kapsamı"** seçeneği eklenir (bugün orada
  "vadesi geçti" seçeneği zaten var). Bu seçenek açıkken **dönem filtresi devre dışı kalır** ve liste tüm
  zamanları gösterir; bu, ekranda yazar. Ancak bu koşulda süzgeçteki sayı Anasayfa kartındaki sayıyla
  birebir eşit olur (AC-14).
- **R9.** Hatırlatma **sessizdir**: ses çalmaz, açılışta pencere açmaz, bildirim göndermez.
- **R10.** Hatırlatma gider yetkisine bağlıdır; yetkisi olmayan kullanıcının Anasayfa'sında kart hiç
  çizilmez ve kalem sayısı hiçbir yerde görünmez. Kart iki koşulun birlikte sağlandığı kullanıcıda görünür:
  Anasayfa erişimi **ve** gider yetkisi.

---

## Constraints

### Uyulması zorunlu

- **C1.** Bu spec **yeni gider alanı eklemez**; 0001'in son ödeme tarihi ve ödeme durumu alanlarını
  tüketir (vade tek alandır, bkz. R7). Tek yeni kalıcı değer, Ayarlar'daki eşik gün sayısıdır ve bu değer
  **yeni bir kolon açmadan** 0001'in `appSettings.giderAyarlari` nesnesine yeni bir alan olarak eklenir;
  o nesne zaten sunucu üzerinden paylaşılıyor, yedekleniyor ve birleştiriliyor.
- **C2.** "Vadesi geçmiş" ve "yaklaşan" ayrımı **saf bir hesapta** yapılır ve kendi testiyle gelir; Anasayfa
  kartı ile gider ekranındaki süzgeç aynı hesabı kullanır, iki yerde ayrı kural yazılmaz. **Vade geçmiş
  kuralı yeniden yazılmaz:** 0001 ile gelen mevcut hesap (`gider.js` `vadesiGectiMi`) tek kaynak olarak
  kalır; yeni saf hesap onu sarmalayıp yalnız "yaklaşan" kavramını ve eşik gün mantığını ekler. Üçüncü bir
  vade kuralı hiçbir ekranda tanımlanmaz.
- **C3.** Gün hesabı, uygulamanın tarihleri metin olarak saklama ve metin üzerinden karşılaştırma
  yaklaşımına uyar; saat dilimi kaynaklı gün kayması üretmez. **"Bugün" değeri canlı tutulur:** bu uygulama
  günlerce açık kalabildiği için (servis katı kiosk deseni) hesabın girdisi olan gün en az saatte bir ve
  pencere yeniden odaklandığında tazelenir; gün döndüğünde kart kendiliğinden güncellenir.
- **C4.** Kullanıcıya görünen tüm metinler Türkçedir.
- **C5.** Yeni izin boyutu tanımlanmaz; görünürlük 0001'in gider yetkisine bağlıdır.

### KAPSAM DIŞI

- **X1.** E-posta, SMS veya işletim sistemi bildirimi ile dışarı çıkan hatırlatma — *neden:* uygulamada
  e-posta altyapısı var ama dışarı çıkan otomatik mesaj, yanlış zamanlanmış tek bir kayıtta bile tedarikçiye
  yanlış bilgi gider; v1 uygulama içinde kalsın.
- **X2.** Takvim entegrasyonu — *neden:* aynı sebep, ayrıca dış servis bağımlılığı.
- **X3.** Otomatik ödeme veya ödeme talimatı — *neden:* uygulama para hareketi yapmaz.
- **X4.** Müşteri alacakları için hatırlatıcı (bize borçlu olanlar) — *neden:* bu spec gider tarafıdır;
  alacak tarafında Anasayfa'da zaten "Borçlu Firma" ve "Borçlu Bayi/Servis" kartları var. İkisini birleştirmek
  ayrı bir karardır.
- **X5.** Kalem bazında kişiye özel hatırlatma kuralı (şu tedarikçiye 15 gün, buna 3 gün) — *neden:* tek eşik
  yeterli; kural çoğaldıkça kimse neyin ne zaman hatırlatıldığını bilemez.
- **X6.** Yinelenen hatırlatma geçmişi ("bu kalem için 3 kez uyardım") — *neden:* hatırlatma anlık bir
  görünümdür, kayıt tutmaz.

---

## Context

- **0001'in çıktısını tüketir.** Gider kaleminde son ödeme tarihi (R1), çek vade tarihi (R18) ve ödeme
  durumu alanları 0001'de tanımlandı. Bu spec onlar olmadan çalışamaz, dolayısıyla 0001 uygulanmadan
  geliştirmeye açılmamalıdır.
- **Anasayfa kart deseni hazır.** Uygulamanın Anasayfa'sında sayı gösterip tıklanınca liste açan kartlar
  var: "Borçlu Firma", "Borçlu Bayi/Servis", "Garanti Süresi Dolan", "Seri No Bekleyen"
  (`src/components/Dashboard.jsx:315-324`). Yeni kart bu desenin aynısıdır, yeni bir görsel dil icat edilmez.
- **Eşik gün ayarı deseni hazır.** Ayarlar > Evrak & Süreçler altında "Teklif takip eşiği (gün)" ayarı var
  (`src/components/settings/SettingsTakip.jsx`). Eşik gün sayısı aynı yerde ve aynı biçimde yaşayabilir.
- **Sesli alarm deseni bilinçle kullanılmıyor.** Uygulamada ses ve yanıp sönme yalnız Servis ve Kargo
  Panosu'na ait (yeni servis ve kargo bildirimi). Gider hatırlatması o kanala girmez (R9); iki farklı öneme
  sahip uyarının aynı sesi paylaşması, sesin anlamını yok eder.
- **Gizlilik.** 0001'in C7b kuralı gereği personel kalemleri hassastır. Hatırlatma listesinde bir personel
  kalemi göründüğünde tutar da görünür; bu yüzden R10'un yetki kapısı bu spec'in güvenlik sınırıdır.

Bilinen tuzaklar:

- **Bugün sınırı.** Vadesi bugün olan kalem "geçmiş" değil, "bugün ödenecek" sayılmalı; aksi halde kullanıcı
  her sabah gecikmiş uyarısıyla karşılaşır.
- **Vadesiz kalemler.** Son ödeme tarihi girilmemiş kalemler çoğunlukta olacaktır (alan opsiyonel). Bunları
  hatırlatmaya sokmak, kartı anlamsız bir sayıya çevirir (R7).

---

## Acceptance Criteria

- **AC-1.** Eşik 7 gün iken, son ödeme tarihi bugünden 3 gün sonra olan ödenmemiş bir kalem Anasayfa
  kartındaki sayıya dâhil olur.
- **AC-2.** Aynı eşikte, son ödeme tarihi bugünden 10 gün sonra olan ödenmemiş bir kalem sayıya dâhil olmaz.
- **AC-3.** Son ödeme tarihi dün olan ödenmemiş bir kalem "vadesi geçmiş" olarak sayılır ve listede
  yaklaşanlardan görsel olarak ayrı gösterilir.
- **AC-4.** Son ödeme tarihi bugün olan kalem "vadesi geçmiş" değil, "bugün ödenecek" olarak gösterilir.
- **AC-5.** Ödendi işaretli bir kalem, son ödeme tarihi geçmiş olsa bile hatırlatmada görünmez.
- **AC-6.** Hatırlatma listesindeki bir kalem ödendi işaretlendiğinde kart sayısı bir azalır ve kalem
  listeden çıkar.
- **AC-7.** Son ödeme tarihi girilmemiş ödenmemiş bir kalem hatırlatmada görünmez.
- **AC-8.** Ödeme yöntemi Çek olan ve vade alanı bugünden 3 gün sonra olan ödenmemiş bir kalem, eşik 7 gün
  iken hatırlatmaya girer ve listede tarih "çek vadesi" olarak adlandırılır. (Ayrı bir çek vade alanı
  yoktur; vade alanı tektir.)
- **AC-9.** Listede kalemler vadesi en eski olandan başlayarak sıralanır; aynı vadeli iki kalem **ödenecek
  tutarı** büyük olandan başlayarak, ikisi de eşitse kalem kimliğine göre sıralanır. Aynı veri iki kez
  hesaplandığında sıra değişmez.
- **AC-10.** Listede her satırda borcun tarafı, ödenecek tutar, son ödeme tarihi ve gün farkı görünür.
- **AC-11.** Eşik gün sayısı Ayarlar'dan 15'e çıkarıldığında, bugünden 10 gün sonra vadesi olan kalem
  hatırlatmaya girer.
- **AC-12.** Eşik gün sayısı 0 girildiğinde yalnız vadesi geçmiş ve bugün ödenecek kalemler hatırlatılır.
- **AC-13.** Hatırlatma kapsamında hiç kalem yoksa Anasayfa kartı sıfır gösterir ve tıklanınca boş durum
  mesajı çıkar.
- **AC-14.** Giderler ekranındaki ödeme durumu süzgecinde "hatırlatma kapsamı" seçildiğinde kalemler
  vurgulanır, dönem filtresi devre dışı kalır ve süzgeçteki kalem sayısı Anasayfa kartındaki iki sayının
  toplamıyla birebir aynıdır.
- **AC-15.** Hatırlatma hiçbir durumda ses çalmaz, pencere açmaz ve işletim sistemi bildirimi göndermez.
- **AC-16.** Gider yetkisi olmayan bir kullanıcının Anasayfa'sında hatırlatma kartı hiç çizilmez.
- **AC-17.** Hatırlatma listesinde personel kalemleri isim isim görünmez: tek bir "Çalışanlar" satırında
  kalem sayısı ve toplam tutarla görünür, çalışan adları yalnız satır açıldığında listelenir.
- **AC-18.** KDV hariç 10.000 TL ve %20 KDV'li ödenmemiş bir kalem hatırlatma listesinde 12.000 TL
  (ödenecek tutar) ile görünür.
- **AC-19.** Çöp kutusundaki bir gider kalemi hatırlatmada görünmez; çöpten geri alındığında ve vadesi
  kapsamdaysa yeniden görünür.
- **AC-20.** Yürürlük ayından önceki tarihli ödenmemiş bir kalem, vadesi geçmiş olsa bile hatırlatmada
  görünmez.
- **AC-21.** Gider tarihi gelecekte olan ödenmemiş bir kalem hatırlatmada görünmez.
- **AC-22.** Uygulama açıkken gün döndüğünde kart yeniden hesaplanır: dün "bugün ödenecek" olan kalem
  ertesi gün "vadesi geçmiş" sayısına geçer.
- **AC-23.** Eşik gün alanına negatif bir değer, 365'ten büyük bir değer veya sayı olmayan bir metin
  girildiğinde ayar kaydedilmez ve kullanıcıya nedeni söylenir.
- **AC-24.** `gider_odeme` izni olmayan bir kullanıcı hatırlatma listesini görür ancak "ödendi" düğmesini
  görmez.
- **AC-25.** Anasayfa kartı vadesi geçmiş ve yaklaşan kalem sayılarını iki ayrı rakam olarak gösterir.
- **AC-26.** Son ödeme tarihi bugün olan kalem, "yaklaşan" sayısına dâhil edilir ve listede "bugün"
  etiketiyle görünür.

---

## Definition of Done

- [ ] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [ ] Vade hesabı React'sız **saf motorda**; Anasayfa kartı ile gider ekranı süzgeci aynı hesabı kullanıyor
      ve bu çapraz testle gösterildi (C2, AC-14).
- [ ] Gün sınırı davranışı (dün, bugün, yarın) testle sabitlendi; saat dilimi kaynaklı kayma olmadığı gösterildi.
- [ ] Eşik gün ayarı, yeni kolon açmadan `appSettings.giderAyarlari` nesnesine eklendi ve `db-roundtrip`
      testine girdi (C1); geçerli aralık denetimi testle sabitlendi (AC-23).
- [ ] Vade geçmiş kuralı yeniden yazılmadı: yeni saf hesap 0001'in `vadesiGectiMi` fonksiyonunu sarmalıyor
      ve bu testle gösterildi (C2).
- [ ] Personel kalemlerinin isim isim görünmediği testle gösterildi (AC-17, 0001 C7b).
- [ ] Yeni izin eklenmedi; görünürlüğün 0001'in gider yetkisine bağlandığı testle gösterildi.
- [ ] Kullanıcıya görünen tüm metinler Türkçe.
- [ ] Arayüz kriterlerinin görsel kanıtı eklendi (`docs/evidence/0003-ac<n>.png`), boş durum ve yetkisiz
      kullanıcı görünümü dâhil.
- [ ] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [ ] Takım Yöneticisi onayladı. Commit ve sürüm yayını yalnız açık talimatla.
- [ ] SCORECARD dolduruldu ve spec `specs/done/` klasörüne taşındı.

---

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Spec revizyon sayısı** | 0 | Onaydan (plan onayıyla, H11) sonra Requirements, Constraints ve AC değişmedi. Onay öncesi R1 QA turu 18 açık noktayı karara bağlamıştı; sayaç onay sonrasını ölçer. |
| **Düzeltme turu sayısı** | 1 | Tek triyaj turu (dört bulgu), aynı gün düzeltildi. |
| **Bulgu gerçek/gürültü oranı** | 4 / 0 | Dördü de gerçek: boş ayda Giderler'den hatırlatma süzgecine ulaşılamaması (planda "bilinen sınır" diye geçiştirilmişti), CI'da (UTC) hiçbir şey kanıtlamayan saat dilimi testi, Anasayfa "Ödendi" düğmesinin durumu çevirmesi, bakım (ölü alan, sıra yorumu). |
| **Regresyon sayısı** | 0 | Mevcut davranış bozulmadı. Bir test beklentisi bilinçli güncellendi (Gider Ayarları kaydı artık eşik alanını da yazıyor). Son durum: 164 dosya, 1662 test yeşil (yerel ve TZ=UTC), lint 0 hata. |
| **Kaçan hata** | 0 | Henüz gerçek kullanımda bulunan yok; görsel kanıt turu plan H12 ile atlandı. |

**Bu spec'ten çıkarılan ders:** Planda "bilinen sınır" diye yazılan bir kısıt, gereksinimin (R8) açıkça istediği bir şeyi
engelliyorsa sınır değil hatadır; triyaj onu ilk bulguda yakaladı. Saat dilimine duyarlı testler saat dilimini kendileri
sabitlemeli ve "yanlış" uygulamayı (burada `today()`) ayırt ettiklerini açıkça doğrulamalı; aksi hâlde geliştiricinin
makinasında geçen test CI'da hiçbir şey kanıtlamaz. Plan turu, uygulamanın genelinde yıllardır duran bir hatayı (`today()`
UTC) ortaya çıkardı; bu iş kapsamında yalnız yeni kod düzeltildi, genel düzeltme ayrı iş olarak açık. Görsel kanıt maddesi
(DoD) kullanıcı kararıyla atlandı.
