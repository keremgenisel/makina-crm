# 0058 — Hesapsız Kayıtların Kapsam Dışı Bırakılabilmesi

| | |
|---|---|
| **Durum** | Taslak |
| **Sahip** | Analist (spec) · geliştirme sahibi atanacak |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Kasa ekranı (hesabı belirtilmemiş tahsilatlar ve ödemeler), aylık gider ve kasa raporu |
| **Bağımlı spec'ler** | 0016 (boş durum) · 0024 (hesapsız ödemeler) · 0044 (hesapsız tahsilatlar) · 0047 (rapor) · 0051 (başlangıç tarihi süzgeci) · 0052 (kasa sekme izni) |
| **Revizyon** | R1 (QA turu, 2026-10-01): geliştirici hazırlığı denetimi, 15 bulgu işlendi, 5'i bloklayıcıydı. Kaynak listesi düzeltildi (üç kaynak, makina tahsilatı listede hiç yok, X6); kapsam dışı anahtarı iki satır şeklini birden taşıyacak biçimde tanımlandı (R11); sunucu eşlemesi ve beşli kuralın beş noktası yazıldı (R12); `hesapsizOzeti`'nin yeni parametresi ve **önce kapsam dışı, sonra eşik** öncelik kuralı belirlendi (R13); merge semantiği ve bilinen sınır yazıldı (R14). R11–R18 ve AC-16…AC-28 eklendi.<br>**R2 (2026-10-01, plan onayı):** hesapsız ödemelerin listesi bugün yoktu (yalnız sayı), bu işte çizilir (Q1, R19); R5 ve R16'nın temizliği tek bir App efektinde ve sunucuda dar bir silme istisnasıyla (Q2, R20); merge remap'i kaynağa göre (Q3); sayılar ve toplu işlem liste başına (Q4, Q5); işlem geçmişinde avansta çalışan adı yazılmaz (Q6, R21); Kasa sekmesiz geri yükleme bölümü korur (Q7). F bölümü (R19–R21) eklendi. |

---

## Intent

Kasa ekranındaki **hesabı belirtilmemiş tahsilatlar** listesi geçmişten gelen kayıtlarla dolu. Bu liste
bir iş listesi olarak tasarlandı: "şunların hesabı eksik, gir de bakiye tamamlansın". Ama içinde sistem
öncesi dönemin yüzlerce kaydı varken iş listesi olmaktan çıkıyor; kullanıcı hangisini gerçekten
gireceğini seçemiyor.

Önce bir şeyi netleştirmek gerekiyor, çünkü riski değiştiriyor: **bu kayıtlar bugün de hiçbir bakiyeye
girmiyor.** Hesabı belirtilmemiş bir tahsilat ya da ödeme, tanımı gereği hiçbir hesabın bakiyesini
etkilemez (0024 R8, 0044). Yani "bunları bir hesaba katarsak kasa yanlış hesaplanır" doğru, ama bu
ancak kullanıcı onları **elle bir hesaba atarsa** olur. Liste olduğu gibi dururken kasa doğru.
Dolayısıyla bu iş bir para düzeltmesi değil, bir **liste temizliği**: kullanıcı istediğini hesaba
bağlasın, istemediğini listeden kaldırabilsin.

0051 bu sorunu bir **başlangıç tarihi** süzgeciyle hafifletti; o süzgeç kayıtları **gizliyor**. Eksik
olan, tek tek ya da toplu olarak "bu kayıt kasa takibinin dışında" diyebilmek ve bu kararın kalıcı
olması.

Başarı şu demek: liste yalnız gerçekten girilecek kayıtları gösteriyor, kapsam dışı bırakılanlar
kaybolmuyor ve geri alınabiliyor.

---

## Requirements

- **R1.** Hesabı belirtilmemiş **tahsilat** ve **ödeme** listelerindeki her satır **kapsam dışı
  bırakılabilir**; karar kalıcıdır ve bütün kullanıcılar için geçerlidir.
- **R2.** Kapsam dışı bırakmak **hiçbir kaydı silmez ve hiçbir tutarı değiştirmez**: tahsilat yine
  tahsilattır, gelir yine gelirdir, ödeme yine borcu kapatır. Değişen tek şey, kaydın kasa iş
  listesinde görünmemesi. **Ekranda yazılı metin:** "Kapsam dışı bırakmak kaydı silmez ve hiçbir tutarı
  değiştirmez; yalnız bu listeden çıkarır." Aynı cümle toplu işlem onayında da görünür.
- **R3.** Karar **geri alınabilir**: kapsam dışı bırakılanlar ayrı bir bölümde sayısıyla durur ve
  "kapsama al" ile listeye döner.
- **R4.** **Toplu işlem:** o anda **ekranda görünen** listenin tamamı tek hamlede kapsam dışı
  bırakılabilir. Görünen küme, eşik süzgecinden geçmiş ve kapsamda olan kayıtlardır ("Hepsini göster"
  açıkken görünen küme neyse o). Onay ekranı kaç kaydın etkileneceğini **ve eşiğin açık olup olmadığını**
  söyler.
- **R5.** Kapsam dışı bırakılmış bir kayda sonradan hesap atanırsa kapsam dışı **girişi o yazımda silinir**
  (çelişkili durum bırakılmaz). Yalnız "okunmaz hâle gelsin" demek yetmez: giriş veride kalırsa ve hesap
  sonradan kaldırılırsa eski karar sessizce geri döner. Hesap kaldırılınca kayıt listeye **kapsamda** döner.
- **R6.** Hesapsız kayıt **sayıları** kapsam dışı bırakılanları saymaz; sayı ile listenin uzunluğu
  uyuşmaya devam eder (0051 kuralı). Üç boyutun önceliği R13'te yazılıdır.
- **R7.** Aylık rapordaki "hesabı belirtilmemiş hareketler" bölümü de kapsam dışı bırakılanları saymaz;
  ekran ile kâğıt çelişmez.
- **R8.** 0051'in **başlangıç tarihi süzgeci yerinde kalır** ve görünümü süzmeye devam eder; kapsam
  dışılık ondan bağımsız ve kalıcı bir karardır. Ekranın yazdığı cümle: **"Başlangıç tarihi geçici bir
  süzgeçtir, kapsam dışı bırakmak kalıcı bir karardır."**
- **R9.** İşlem **`kasa_hesap`** izni ister ve Kasa sekmesi kuralına tabidir (0052). Bu izin **bilinçli**
  seçimdir: `kasa_hesap` Kasa ekranının kendi iznidir ve yeni bir eylem kimliği açmamak için kullanılır
  (C4), gerçek anlamı "hesap işlemi" olmasa da. İzin ekranındaki açıklamaya "ve kasa iş listesini
  düzenleme" ibaresi eklenir, böylece yönetici ne verdiğini bilir.
- **R10.** Kapsam dışı bırakma ve geri alma işlem geçmişine yazılır.

### QA turunda eklenenler (R1)

- **R11.** **Kapsam dışı kaydının anahtarı `{tur, kaynak, kayitId}`'dir**, çünkü iki listenin satır şekli
  farklı: tahsilat satırı `{kaynak, kayit, neden, turAdi, firma, tarih, tutar}`, **ödeme satırı ise doğrudan
  hareket nesnesidir** (`hesapsizOdemeler`'in `liste`si ödeme ve avans hareketleri) ve `kaynak` alanı
  taşımaz. Kural: `tur: "tahsilat"` → `kaynak` üç satış kaynağından biri (`servis`, `kalip`, `yedekParca`)
  ve `kayitId` kaydın kimliği; `tur: "hareket"` → `kaynak` null ve `kayitId` hareket kimliği. Tek liste
  korunur (C2).
- **R12.** **Bölüm adı `kasaKapsamDisi` ve eşlemeler:** `BLOB_SECTIONS` + `SECTION_GROUP` → `giderActions`;
  `BOLUM_SEKMELERI` → `["kasa"]` ve `ON_KOSUL_SEKMELERI` → `["gider","finance"]` (0052 deseni);
  `GIDER_BOLUMLERI` üyeliği (0001 K6); `EYLEM_IDLERI` ekle ve sil → `kasa_hesap`; 0052'nin
  `KASA_SEKMELI_KAYITLAR` listesine eklenir; `BOLUM_ADLARI`'na Türkçe etiket. Yeni izin **boyutu** yoktur
  (C4), ama eşleme yazılmazsa ekran açılır ve kayıt 403 alır (bu depoda tekrar eden hata sınıfı).
- **R13.** **`hesapsizOzeti` imzası ve öncelik kuralı.** Ekranın tek girişi bugün
  `hesapsizOzeti(hareketler, veri, hesaplar, esik)` (`kasa.js:201`, `Kasa.jsx:152`) ve
  `{esik, odeme, tahsilat, gizli, tarihsiz}` döndürüyor. İmza
  `hesapsizOzeti(hareketler, veri, hesaplar, esik, kapsamDisi)` olur ve öncelik şudur: **önce kapsam dışı
  çıkarılır** (kalıcı karar), **sonra eşik** uygulanır. `gizli` (eşik altında kalanlar, nedene göre) yalnız
  kapsamdaki kayıtları sayar; kapsam dışı kendi sayısıyla ayrı döner
  (`kapsamDisi: { odeme, avans, tahsilat }`). Böylece R6 ile 0051'in sayıları çelişmez.
- **R14.** **Merge:** her girişe `id` (uid) verilir, bölüm `MERGE_KEYS`'e eklenir ve `kayitId` **remap**
  edilir (hareketin `giderId`/`hesapId` deseni). **Bilinen sınır:** çakışma birleştirmesi yalnız eklemeleri
  yeniden uyguladığı için, bir PC'de "kapsama al" (silme) yapılırken başka PC yazarsa karar geri gelebilir;
  bu kabul edilen sınırdır ve kullanıcı işlemi yineleyebilir.
- **R15.** **Rapora geçiş yolu:** `hesapsizOdemeler` ve `hesapsizTahsilatlar` isteğe bağlı bir
  `kapsamDisi` parametresi alır; `giderRaporu.js:120` ve `:135` onları **doğrudan** ay aralığıyla çağırdığı
  için rapor girdisine yeni bölüm eklenir ve rapor onu geçirir. Parametresiz çağrılar bugünkü çıktıyı
  birebir verir (geriye dönük uyum, 0047 deseni).
- **R16.** **Yetim giriş:** kaydı çöpe atılmış ya da artık hesapsız olmayan girişler **okuma anında yok
  sayılır**; kalıcı silmede ve "çöpü boşalt"ta temizlenir. Ayrı bir bakım aracı yazılmaz.
- **R17.** **İşlem geçmişi etiketleri:** `entity: "kasa_kapsam"`, `action: "kapsam_disi"` ve
  `"kapsama_alindi"`; üçü de `SettingsAuditLog.jsx` etiket haritasına eklenir (yoksa ham anahtar olarak
  görünür, CLAUDE.md kuralı). `entity_name` kaydın kaynağı ile firma ya da kalem adıdır.
- **R18.** **Sıfır durumları:** kapsam dışı sayısı sıfırken o bölüm **hiç çizilmez** (0016 boş durum
  kuralı); hesapsız liste tümüyle boşalırsa `BosDurum` ile "hesabı belirtilmemiş kayıt yok" yazılır ve
  toplu işlem düğmesi pasifleşir.

### F. Plan onayında eklenenler (R2)

- **R19.** **Hesapsız ödemelerin listesi çizilir (Q1).** Kasa ekranında bugün yalnız sayı vardı; tahsilat listesinin aynısı
  olarak "Listeyi göster" ile açılan bir ödeme listesi eklenir: tarih, tür (Ödeme / Avans), gider kalemi ya da çalışan,
  tutar, satır başına "Kapsam dışı bırak". Hareketin hesabını sonradan atamak bu işin kapsamında değildir (bugün hiçbir
  yerde yok). Toplu işlem her listenin kendi düğmesidir (Q5).
- **R20.** **Temizlik tek yerde (Q2).** R5'in silmesi ve R16'nın kalıcı silme temizliği, hesap atanan her yola ayrı
  yazılmaz: App'te saf `kapsamDisiTemizle` ile çalışan bir efekt, kaydı artık hesapsız olmayan ya da hiç bulunmayan
  girişleri durumdan düşürür (aynı kayıt penceresinde, yani aynı yazımda). Sunucu, **yalnız silme olan** ve silinen her
  girişin kaydı artık hesapsız olmayan ya da bulunmayan bir yazımı `kasa_hesap` ve Kasa sekmesi istemeden kabul eder;
  yoksa hesap atayan ama `kasa_hesap` izni olmayan kullanıcının kaydı 403 alırdı. Çöpteki kaydın girişi temizlenmez,
  okuma anında yok sayılır ve çöpten geri alınınca karar döner.
- **R21.** **İşlem geçmişinde ad (Q6).** Tahsilatta "kaynak adı · firma", ödemede gider kalemi ya da tedarikçi; avansta
  çalışan adı yazılmaz, "Avans" yazılır (0047'nin kişi bazlı çizgisi).

---

## Constraints

- **C1.** Hiçbir bakiye, tutar, gelir ya da borç değişmez (R2).
- **C2.** Karar **tek bir yerde** tutulur; üç satış bölümüne (servis, Extra Kalıp, yedek parça) ve hareket
  kayıtlarına ayrı ayrı alan eklenmez. Anahtar R11'de tanımlıdır.
- **C3.** Kayıt beşli kurala uyar: yeni liste bölümü, tablo, kayıt ile okuma, `MERGE_KEYS` ve yedek;
  sunucu eşlemeleri R12'de sayılıdır.
- **C4.** Yeni izin boyutu yoktur.
- **C5.** Kullanıcıya görünen metinler Türkçedir.

### KAPSAM DIŞI

- **X1.** Kapsam dışı bırakılan kaydın gelirden, rapordan ya da borç hesabından çıkarılması — *neden:*
  R2; bu bir kasa görünürlüğü kararıdır, muhasebe kararı değil. Gelirden çıkarmak isteniyorsa o,
  kaydın kendisini düzeltmekle olur.
- **X2.** Kapsam dışı kayıtların toplu olarak silinmesi — *neden:* kayıt duruyor; silme ayrı ve geri
  dönüşsüz bir karar.
- **X3.** Bir kuralla otomatik kapsam dışı bırakma (örnek: "şu tarihten öncekiler hep dışarıda") —
  *neden:* 0051'in başlangıç tarihi zaten görünümü süzüyor; ikinci bir otomatik kural iki ayrı gerçek
  üretir. Toplu işlem (R4) kullanıcının kararıyla çalışır.
- **X4.** Kapsam dışılığın kullanıcıya göre değişmesi — *neden:* R1; bu bir veri kararı, görünüm
  tercihi değil.
- **X5.** Aynı mekanizmanın sahipsiz kayıtlar aracına taşınması — *neden:* orası ayrı bir ekran ve ayrı
  bir sorun.
- **X6.** Hesabı belirtilmemiş **makina tahsilatlarının** (`payments`) listeye eklenmesi — *neden:* bu iş
  listeyi küçültmek için; `kasa.js:59` `satisKalemleri` bugün yalnız servis, Extra Kalıp ve yedek parçayı
  kapsıyor, yani hesapsız bir makina tahsilatı hiçbir iş listesinde görünmüyor. Bu **bu işten önce var olan
  ayrı bir boşluktur**; kapatmak listenin motorunu değiştirir ve kendi spec'ini ister.

---

## Context

- **Liste bugün nasıl kuruluyor.** `kasa.hesapsizTahsilatlar` satış kayıtlarından ödenmiş, tutarı sıfırdan
  büyük olanları alıp hesabı olmayanları (ya da hesabı silinmiş, para birimi uyuşmayanları) nedeniyle
  birlikte döndürüyor; her satırda `kaynak` (servis, Extra Kalıp, yedek parça; makina tahsilatı **yok**,
  aşağıdaki maddeye bakın) ve
  `kayit` var. Gider tarafında eşi `hesapsizOdemeler`. 0051 ikisine de bir **başlangıç tarihi** süzgeci
  ekledi ve eşik altında kalanları nedeniyle sayıyor.
- **Satırı adresleyen şey hazır, ama iki şekil var (QA turunda ölçüldü).** Tahsilat satırı
  `{kaynak, kayit, neden, turAdi, firma, tarih, tutar}` taşıyor; **ödeme satırı doğrudan hareket
  nesnesidir** ve `kaynak` alanı yok. Bu yüzden kapsam dışılık tek bir listede ama `{tur, kaynak, kayitId}`
  anahtarıyla tutulur (R11); bölümlere ayrı ayrı bayrak sütunu eklemeye gerek yok (C2) ve o alternatif
  ödeme hareketlerini zaten kapsamıyor.
- **Üç kaynak, dört değil (QA turunda düzeltildi).** `kasa.js:59` `satisKalemleri` yalnız `services`,
  `partSales` ve `yedekParcaSatislar`'ı kapsıyor; `satisTahsilat.js` `SATIS_KAYNAK` üç değerli
  (`servis`, `kalip`, `yedekParca`). **Hesabı belirtilmemiş makina tahsilatı (`payments`) bu listede hiç
  yok** ve hiçbir iş listesinde görünmüyor; bu, bu işten önce var olan ayrı bir boşluktur (X6).
- **Ekranın tek girişi `hesapsizOzeti`.** `kasa.js:201` imzası `(hareketler, veri, hesaplar, esik)` ve
  çıktısı `{esik, odeme, tahsilat, gizli, tarihsiz}`; `Kasa.jsx:152` onu çağırıyor, `:155` eşik bilgisini
  ikinci bir çağrıyla alıyor. Rapor ise iki alt fonksiyonu **doğrudan** çağırıyor (`giderRaporu.js:120`,
  `:135`). Yeni parametre ve öncelik kuralı bu iki yola göre yazıldı (R13, R15).
- **Bakiye zaten güvende.** Hesapsız kayıt hiçbir bakiyeye girmiyor (0024 R8). Bu işin riski düşük
  olmasının sebebi bu: kapsam dışı bırakmak bir rakamı değil, bir listeyi değiştiriyor. Buna karşılık
  **kullanıcı yanlış anlarsa** riskli görünür; bu yüzden R2 ekranda da yazılı olmalı.
- **İki aracın farkı (R8).** 0051'in tarihi bir **görünüm süzgeci**: eşik değişince liste değişir, karar
  kalıcı değildir. Kapsam dışılık ise **kayda bağlı kalıcı bir karar**. İkisi birbirinin yerine geçmez;
  tarih "şimdilik bakmıyorum", kapsam dışı "bu hiç girilmeyecek" demektir. Ekran bu farkı söylemezse
  kullanıcı hangisini kullanacağını bilemez.
- **Rapor tutarlılığı (R7).** 0047 raporunda hesapsız hareketler ayrı bir bölüm. Ekranda kapsam dışı
  bırakılan bir kayıt raporda sayılmaya devam ederse, aynı ayın ekranı ile kâğıdı çelişir; bu projede
  daha önce ödenen bir bedel.

---

## Acceptance Criteria

- **AC-1.** Hesabı belirtilmemiş tahsilat listesindeki bir satır kapsam dışı bırakılır ve listeden çıkar.
- **AC-2.** Aynı işlem hesabı belirtilmemiş ödemeler listesinde de çalışır.
- **AC-3.** Kapsam dışı bırakılan kayıt silinmez; tahsilat, gelir, borç ve bakiye rakamları değişmez.
- **AC-4.** Kapsam dışı bırakılanlar sayısıyla ayrı bir bölümde görünür.
- **AC-5.** "Kapsama al" ile kayıt listeye döner.
- **AC-6.** Toplu işlem **o anda görünen** listenin tamamını kapsam dışı bırakır; onay kaç kaydı
  etkilediğini ve eşiğin açık olup olmadığını söyler (R4).
- **AC-7.** Kapsam dışı bir kayda hesap atanınca kapsam dışılık kendiliğinden kalkar.
- **AC-8.** Ekrandaki hesapsız sayıları kapsam dışı bırakılanları saymaz; önce kapsam dışı çıkarılır,
  sonra eşik uygulanır (R13).
- **AC-9.** Aylık raporun hesapsız hareketler bölümü de onları saymaz.
- **AC-10.** 0051'in başlangıç tarihi süzgeci eskisi gibi çalışır ve kapsam dışılıktan bağımsızdır.
- **AC-11.** Ekran, süzgeç ile kapsam dışılığın farkını yazar.
- **AC-12.** `kasa_hesap` izni olmayan kullanıcı bu işlemleri yapamaz ve düğmeleri görmez.
- **AC-13.** Kapsam dışı bırakma ve geri alma işlem geçmişinde görünür.
- **AC-14.** Kapsam dışılık kaydı veritabanına yazılıp geri okunur ve yedekle taşınır.
- **AC-15.** Çok kullanıcılı kullanımda karar bütün kullanıcılarda aynıdır.

### QA turunda eklenen kriterler

- **AC-16.** Kapsam dışı kaydı `{tur, kaynak, kayitId}` anahtarıyla tutulur; hem tahsilat hem hareket
  satırı adreslenebilir (R11).
- **AC-17.** Hesapsız **ödeme** (hareket) satırı kapsam dışı bırakılıp geri alınabilir (R11).
- **AC-18.** Bölümlere ayrı bayrak sütunu eklenmemiştir (C2, kaynak taraması).
- **AC-19.** Kasa sekmesi olmayan ya da `kasa_hesap` izni olmayan kullanıcı sunucudan bu bölüme yazamaz
  (403) ve düğmeleri görmez (R12).
- **AC-20.** `hesapsizOzeti` kapsam dışı parametresi verilmeden bugünkü çıktısını birebir verir (geriye
  dönük uyum, R13).
- **AC-21.** Kapsam dışı ile eşik birlikteyken `gizli` sayıları yalnız kapsamdaki kayıtları sayar ve
  kapsam dışı kendi sayısıyla döner (R13).
- **AC-22.** `hesapsizOdemeler` ve `hesapsizTahsilatlar` kapsam dışı parametresi verilmeden bugünkü
  çıktısını verir; rapor onu geçirince sayılar ekranla aynı olur (R15, AC-9).
- **AC-23.** Çakışma birleştirmesinde iki PC'nin kapsam dışı eklemeleri birleşir ve `kayitId` remap edilir
  (R14).
- **AC-24.** Kaydı çöpe atılan giriş okuma anında yok sayılır ve "çöpü boşalt" ile temizlenir (R16).
- **AC-25.** Kapsam dışı bir kayda hesap atanınca giriş **silinir**; hesap kaldırılınca kayıt kapsamda
  döner (R5).
- **AC-26.** İşlem geçmişinde `kapsam_disi` ve `kapsama_alindi` etiketleriyle görünür, ham anahtar değil
  (R17).
- **AC-27.** Kapsam dışı yokken o bölüm çizilmez; hesapsız liste boşalınca `BosDurum` görünür ve toplu
  işlem düğmesi pasifleşir (R18).
- **AC-28.** Ekranda R2'nin ve R8'in metinleri birebir görünür.

---

## Definition of Done

- [ ] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [ ] Kapsam dışılık tek bir listede `{tur, kaynak, kayitId}` anahtarıyla tutuluyor; bölümlere ayrı bayrak
      sütunu eklenmedi (C2, R11, AC-18).
- [ ] Sunucu eşlemeleri R12'ye göre yapıldı ve uçtan uca testte sabitlendi (AC-19).
- [ ] `hesapsizOzeti` ile iki alt fonksiyonun geriye dönük uyumu testli; öncelik kuralı (önce kapsam dışı,
      sonra eşik) sabitlendi (AC-20, AC-21, AC-22).
- [ ] Merge'de `kayitId` remap edildi ve bilinen sınır (silmenin geri gelebilmesi) yazıldı (R14, AC-23).
- [ ] Hiçbir bakiyenin, gelirin ve borcun değişmediği çapraz testle gösterildi (AC-3).
- [ ] Ekran ile raporun aynı sayıyı verdiği testle gösterildi (AC-8, AC-9).
- [ ] Beşli kural uygulandı; roundtrip, temiz kurulum, merge ve yedek testleri kapsıyor (AC-14).
- [ ] Görsel kanıt eklendi (`docs/evidence/0058-*.jpg`): liste, kapsam dışı bölümü, toplu işlem onayı.
- [ ] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [ ] `CLAUDE.md` güncellendi: kapsam dışılık kaydı, süzgeçle farkı ve rapora etkisi.
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
