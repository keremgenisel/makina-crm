# 0073 — Kasa Hareketlerinin Düzenlenmesi ve Silinmesi

| | |
|---|---|
| **Durum** | Tamamlandı (commit `222b831`, dal `feat/0073-hareket-duzenleme`) |
| **Sahip** | Analist (spec) · geliştirme sahibi atanacak |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Kasa > Hesaplar (hareket listesi), ödeme penceresi, çalışan ekstresi, kasa doğrulama motoru, işlem geçmişi |
| **Bağımlı spec'ler** | 0024 (ödeme bir harekettir, virman, avans, mahsup) · 0040 ve 0049 (çek hareketleri) · 0044 ve 0058 (tahsilat satırları, kapsam dışı) · 0051 (hedef payları) · 0053 (tek ödeme editörü) · 0056 (hesap taşıma, `hesapId` yazımı) · 0059 (silinmiş kalem ödemeleri) · 0062 (sayfalama, en yeni üstte) · 0064 (kilitler) · 0068 (işlem geçmişi etiket kapsamı) |
| **Revizyon** | 2 · 2026-10-06 uygulama planı onayı: Q1–Q9 işlendi (R1, R2, R6, R14, R20, R25–R29, AC-41–AC-45); plan `specs/done/0073-uygulama-plani.md` |
| **Önceki revizyon** | 1 · 2026-10-06 QA turu: B-1..B-8, Ö-9..Ö-22, K-23..K-26 işlendi (Takım Yöneticisi onayı) |

---

## Intent

Bugün bir kasa hareketi yazıldıktan sonra **düzeltilemiyor.** Tarihi yanlış girilmiş bir ödeme, yanlış
hesaptan çıkmış görünen bir virman, tutarı 1.500 yerine 15.000 yazılmış bir avans ancak silinip
yeniden girilerek düzeltilebiliyor. Silme de dağınık: ödeme ve mahsup gider kaleminin ödeme
penceresinden, avans çalışan ekstresinden, virman Kasa listesinden siliniyor. Kasa'da hesabın
hareketlerine bakan kullanıcı, gözüyle gördüğü yanlış satıra oradan dokunamıyor.

İstenen: **seçilen hesabın hareket listesinden, satırın kendisi düzeltilebilsin ve silinebilsin.**

Başarı şu demek: bakiyesi tutmayan bir hesabın hareketlerini açıp yanlış satırı bulan kullanıcı,
listeden çıkmadan tarihi, tutarı, yöntemi ya da hesabı düzeltiyor; düzelttiği anda bakiye ve kalemin
ödeme durumu kendiliğinden doğruya geliyor.

---

## Requirements

### A. Neyin düzenlendiği

- **R1.** **Düzenle** ve **Sil** eylemi yetkiye bağlı olarak **iki listede** bulunur (B-1): (a) seçilen
  hesabın hareket listesi (bugün işlem sütununda yalnız virman silme var, `Kasa.jsx:608`), ve (b)
  Kasa'nın **hesapsız ödemeler ve avanslar** listesi (bugünkü "Hesap ata" ve "kapsam dışı" düğmelerinin
  yanında). İkincisi şart: hesapsız hareketler hesabın listesinde **hiç görünmüyor** (hesaplı liste
  `hesapBakiyeleri`'nin satırlarından, hesapsızlar `kasa.hesapsizOdemeler`'den gelir, `kasa.js:176-185`),
  yani R17 yalnız o listeden ulaşılabilir. Virmanın bugünkü silme düğmesi bu düzenin parçası olur.
  **Revizyon 2 (Q3):** üçüncü giriş noktası, ödeme penceresinin **"Kayıtlı ödemeler"** listesidir: silinebilen her
  ödeme ve mahsup satırının yanında Düzenle de vardır. Mahsup hesapsız olduğu ve hesapsız listeye girmediği için
  (`hesapsizOdemeler` yalnız ödeme ve avans alır) mahsubun tek düzenleme yolu budur.
- **R2.** Düzenlenebilen alanlar: **tarih, tutar, yöntem, hesap, açıklama.** Virmanda **iki hesabın
  ikisi de** (kaynak ve karşı hesap) düzenlenir (K-25; Intent'in "yanlış hesaptan çıkmış virman" örneği
  tam bu durum). Ödemede ayrıca **taksit seçimi**, ama **yalnız satırlı kalemde** (B-6): harekette
  `hedef` alanı yoktur (`hesap_hareketleri` sütunları `db.cjs:280-284`), satırsız kalemde hedef okuma
  anında dağıtım sırasıyla türetilir (0042, 0054), bu yüzden orada seçim yoktur ve pencere bunu söyler.
  Avans ve mahsupta **çalışan** düzenlenmez (R4).
- **R3.** **Hareketin türü değişmez:** ödeme avansa, avans virmana dönüşmez.
- **R4.** **Hareketin neye bağlı olduğu değişmez:** ödemenin gider kalemi, mahsubun kalemi ve çalışanı,
  avansın çalışanı aynı kalır. Bağı değişecekse hareket silinip yeniden girilir; nedeni ekranda yazar.
- **R5.** Düzenleme kaydın kimliğini korur (silme artı yeniden ekleme değildir), böylece işlem geçmişi
  ve sunucu denetimi bunu düzenleme olarak görür. Çakışma birleştirmesindeki sınırı R24 yazar.
- **R20.** Bugünkü üç silme kapısı **kalır** ve hepsi aynı saf yazma yolunu çağırır (Ö-11; **revizyon 2, Q8:** bu yol
  `formOdemesi.odemeGirisiYaz`'dır, `guncellenenler` alır; avans ve virman silme de oradan geçer): ödeme ve
  mahsup ödeme penceresinden, avans çalışan ekstresinden, virman Kasa listesinden silinebilmeye devam
  eder; R1'in iki listesi bunlara **eklenir**. Bu, C1'in "tek editör" kuralının silme tarafındaki
  karşılığıdır; iki ayrı silme yolu iki ayrı davranış demektir.
- **R21.** Hesabı değişen satır **listeden çıkar** (Ö-12): kayıttan sonra bildirim hangi hesaba
  taşındığını söyler ve seçili hesap değişmez. Virmanda kaynak hesap değişirse aynı davranış.
- **R22.** **Kalemi kalıcı silinmiş ödeme hareketi** silinebilir, **düzenlenemez** (Ö-14): kalan
  hesaplanamaz, çünkü kalem yok (Kasa listesi onu bugün "Silinmiş gider" yazıyor, `Kasa.jsx:225`; 0059
  raporunda "Silinmiş kalem ödemeleri" toplu satırı). Pencere yerine nedeni yazılır.

### B. Doğrulama

- **R6.** Düzenlenen hareket, **yeni bir hareketle aynı doğrulamalardan** geçer: ödeme için ödeme
  doğrulaması, virman için virman doğrulaması, mahsup için mahsup doğrulaması. Düzenleme yeni bir kural
  icat etmez. **Avansta ek şart var** (Ö-10): bugünkü `avansSilinebilirMi` (`kasa.js:541-547`) mahsupları
  açık avansı aşan avansın silinmesini engelliyor; tutarı düşürmek aynı tutarsızlığı açar, bu yüzden
  avans düzenlemesi o kuralın tutar duyarlı karşılığından geçer (yeni tutarla açık avans mahsup
  toplamının altına düşemez) ve hata metni bugünkü "eksik" tutarını söyler. Silme bugünkü kuralı korur.
- **R7.** Tutar yükseltilirken sınır, **bu hareketin kendisi hariç** hesaplanan kalandır. **Ödeme
  kolunda mekanizma:** kalan zenginleştirilmiş kalemden okunur (`odemeHedefKalaniK`, kalemin `_odenen`'i
  `odemeleriUygula`'dan gelir), yani çağıran kalemi **hareketler eksi düzenlenen hareketle yeniden
  zenginleştirir** (B-5). Doğrulayıcı imzaları değişmez (C2).
- **R8.** Mahsupta sınır, aynı şekilde bu hareket hariç açık avans ile kalemin kalanının küçüğüdür.
  **Mahsup kolunda mekanizma farklı:** `mahsupDogrula(form, { kalem, hareketler, giderler, ... })`
  hareketleri parametre olarak alıyor (`kasa.js:571`), bu yüzden çağıran "hareketler eksi düzenlenen"
  kümesini doğrudan geçirir (B-5).
- **R9.** Hata iletileri, hangi hedefin ya da taksidin sınırının aşıldığını söyler (bugünkü ödeme
  doğrulamasının dili).
- **R25 (Q2).** Düzenleme kipinde yöntem listesinde **"Çek (ciro)" ve "Çek (kendi)" yoktur**: doğrulayıcı onları bayraksız
  zaten reddeder ve düzenleme yeni bir çek işlemi doğuramaz (X3, R10).
- **R26 (Q4).** Satırsız çok hedefli kalemde ödemenin kapattığı hedef ödeme sırasından türer; tarih düzeltmesi kapanan
  hedefi değiştirebilir. Davranış değişmez, pencere ipucu yazar: "Bu kalemde ödemenin kapattığı bölüm ödeme sırasından
  belirlenir."
- **R27 (Q5).** Kapalı hesaptaki hareket için kural aynen kalır (doğrulayıcı kapalı hesaba hareket yazmaz); pencere nedeni
  yazar: "Hesap kapalı; düzeltmek için hesabı geçici olarak açın." Silme açıktır.
- **R28 (Q6).** Avans düzenleme sınırı: çalışanın bütün avansları − bu avansın eski tutarı + yeni tutar ≥ o çalışanın mahsup
  toplamı (`avansSilinebilirMi` ile aynı kapsam; silme, yeni tutarın sıfır olduğu özel durumdur). Hata: "Bu avans en az X
  olmalı; Y tutarında mahsup edilmiş."
- **R23.** **Yeni tarih sınırı yoktur ve bu yazılıdır** (Ö-16): hesabın açılış tarihinden önceye ya da
  geleceğe tarih girilebilir, çünkü bugünkü doğrulama da buna izin veriyor ve yürüyen bakiye böyle bir
  hareketi baştan sayıyor. R6'nın "yeni kural icat etmez" lafzı bu boşluğu bilinçli bırakır.

- **R29 (Q1).** İş `feat/0070-sgk-yol` (0071'i de içerir) üstünde yapılır; SGK hedefine yapılmış ödemenin düzenlenmesi bu
  dalda sınanır.

### C. Dokunulmayanlar

- **R10.** **Çeke bağlı hareket düzenlenmez ve silinmez.** Bu, satır düzeyinde bir ibare DEĞİL, **ortak
  editörde ve ortak doğrulamada bir kapıdır** (B-2): ciro ve kendi çek hareketleri hesapsız doğar
  (0040, 0049) ve `hesapsizOdemeler` onları `m.cekId == null` ile süzer (`kasa.js:180`), yani Kasa'nın
  hiçbir listesinde görünmezler. Tek görünürlükleri ödeme penceresinin "Kayıtlı ödemeler" listesidir;
  bugünkü silme engeli (`OdemeGirisi.jsx:375`'in `h.cekId == null` koşulu ve `:366`'daki
  `ciro-hareketi` ibaresi) düzenlemeyi de kapsar ve kullanıcı çek işlemine (ciro iptali, çek iptali)
  yönlendirilir.
- **R11.** **Tahsilat satırları ve verilen çek satırı hareket değildir.** Hesap hareket listesinde
  görünen müşteri, servis, Extra Kalıp ve yedek parça tahsilatları (`s.tahsilat`, `Kasa.jsx:212`) ile
  **verilen çekin bakiye satırı** (`s.cek`, `:214`, Ö-19) bu listeden düzenlenmez; satırda düzenleme
  eylemi yoktur, yerine kaynağına göre yazılı bir ibare vardır (Ö-18): makina tahsilatı, servis ve Extra
  Kalıp müşteri detayına, yedek parça Stok > Yedek Parça Satışı'na, verilen çek Kasa > Çek Portföyü'ne
  (ödeme geri alma ve iptal orada). İbare **tıklanabilir değildir** (X8).
- **R12.** **Göçten gelen tutarsız hareket** (eski ödeme işaretinden üretilmiş, `tamKapatir`) ayrı ele
  alınır: silinebilir, düzenlenmesi ancak bir tutar girilerek olur. Pencere açılır, tutar alanı **boş ve
  zorunlu** gelir, bilgi şeridi "Bu hareket eski ödeme işaretinden üretildi ve tutarsızdır; tutar
  girince normal ödeme olur." yazar; kaydedilince `tamKapatir` false olur ve **`gocKaynak` korunur**
  (Ö-17): o iz ikinci göçü engelliyor (0024 R4), silinirse göç yeniden çalışıp ikinci kayıt üretir.
  Tutarsız bırakıp kaydetmek engellenir.

### D. Yetki, kilit, iz

- **R13.** Düzenleme ve silme **dört türün** bugünkü iznini ister (Ö-21): ödeme `gider_odeme`, **mahsup
  `gider_odeme`** (0024 B, `hareketIzni`; mahsup ödeme penceresinden girilir), virman `virman`, avans
  `avans`. Virman ve avans ayrıca **Kasa sekmesi** ve Giderler artı Finans önkoşulunu ister
  (`KASA_SEKMELI_KAYITLAR`, 0052 R21). Yeni izin eklenmez. Arayüz kapısı sunucuyla aynı olmazsa düğme
  görünür ama kayıt 403 alır; bu projenin tekrar eden hata sınıfıdır.
- **R14.** Kilit iki katmanlıdır (B-7): **düzenleme penceresi** açık kaldığı sürece kaydın kilidini alır
  (`useLock`; ödeme ve mahsupta `gider` artı kalem kimliği, virmanda `kasa_hesap` artı kaynak hesap,
  avansta `calisan` artı çalışan kimliği; **revizyon 2, Q7:** virmanda pencere açılırken **eski** kaynak hesabın kilidi
  alınır, kayıt anında yeni kaynak hesap başkasında kilitliyse anlık denetim reddeder) ve dosya `src/lib/kilitAlanlari.js`'teki ilgili alanın pencere
  listesine **eklenir**, yoksa `tests/kilit-alanlari.test.js` düşer (0064). **Satırdan silme** anlık
  işlemdir ve bugünkü `baskasiKilitli` yolunu kullanır (`Kasa.jsx:252`, `:357`). Kilit başkasındaysa
  işlem reddedilir ve nedeni bildirilir; kendi kilidi engellemez.
- **R15.** Düzenleme ve silme işlem geçmişine yazılır; düzenlemede **önceki değerler** de kaydedilir.
  **Entity adları (B-4):** ödeme ve mahsup hareketi için **yeni entity `kasa_hareketi`** ("Kasa
  Hareketi"), virman ve avans bugünkü `virman` ve `avans` entity'lerinde kalır, üçüne de bugünkü
  `duzenlendi` action'ı. **`odeme` adı kullanılamaz:** o entity müşteri tahsilatı demek ve `geriAl`
  haritasında `rawPayments` ile eşleşiyor (`Settings.jsx:235`), hareket için kullanılırsa audit log
  hareket kimliğini `payments` içinde arayan bir "Geri Al" düğmesi üretir
  (`SettingsAuditLog.jsx:342`, `:355`). Yeni entity `SettingsAuditLog` etiket haritasına eklenir, yoksa
  `tests/islem-gecmisi-etiketleri.test.js` düşer (0068). **Kayıt alanları bugünkü ekleme ve silme
  kayıtlarıyla aynıdır** (B-3): avans kaydı bugün çalışan adını ve tutarı yazıyor
  (`CalisanAvanslari.jsx:100`, `:109`) ve bu değişmez; gizlilik duvarı yazdırma ve dışa aktarma
  temellidir, işlem geçmişi o duvarın içinde değildir ve yalnız admin'e açıktır.

### E. Türev etkiler

- **R16.** Düzenleme sonrası hesap bakiyesi, kalemin ödeme durumu, borç özeti, hatırlatıcı, ekstre ve
  yöntem kırılımı kendiliğinden doğruya gelir (hepsi okuma anında türetilir; ek bir işlem gerekmez).
- **R17.** Hesapsız bir ödemeye hesap atanırsa, o kayıt kapsam dışı listesindeyse bugünkü temizlik
  kuralı işler (0058 R5, App'teki `kapsamDisiTemizle`). Bu yol **hesapsız ödemeler listesinin**
  düzenleme düğmesiyle açılır (R1 b).
- **R18.** Hareketin tarihi değişince listedeki sırası (en yeni üstte) ve ekstredeki yeri değişir.
  **Sayfa sıfırlanmaz** (Ö-13): hareket listesinin sıfırlama anahtarı yalnız hesap kimliğidir
  (`Kasa.jsx:377`) ve anahtara yeni bileşen eklenmez; kullanıcı aynı sayfada kalır (0062 R27'nin kırpma
  kuralı). Her düzenlemede birinci sayfaya atmak uzun listede çalışmayı bozar.
- **R19.** Aynı hesabı etkileyen hareketlerin yürüyen bakiyesi yeniden hesaplanır; saklı bakiye yoktur.
- **R24.** **Kabul edilen sınır (B-8):** `hesapHareketleri` `MERGE_KEYS`'te ama `mergeLocalIntoReloaded`
  yalnız **eklemeleri** yeniden uyguluyor, var olan kaydın düzenlemesi yeniden yüklenen kopyaya yeniliyor.
  LAN kipinde eşzamanlı çakışmada hareket düzenlemesi kaybolabilir; ekleme ve silme korunur. Bu sınıf
  0065'in stok hareketi işi gibi ayrı bir iştir ve bu spec'te çözülmez.

## Constraints

- **C1.** **Tek editör:** hareketin düzenleme penceresi, o türü ekleyen pencerenin **kendisidir ve yeni
  bir kipidir** (Ö-9): `OdemeGirisi` bugün yalnız yeni hareket üretiyor (`odemeGirisiHazirla` satırlardan
  yeni kayıtlar kurar, `odemeGirisiYaz` silinenler artı yenileri yazar) ve "Kayıtlı ödemeler" listesi
  yalnız siliyor; var olan bir hareketi güncelleme yolu **yok**. Bu yüzden aynı dosyaya ve aynı saf
  motora `kip: "duzenle"` eklenir: motor düzenlenen hareketin kimliğini alır, tek satır çizer ve
  güncellenmiş hareketi döndürür. Virman ve avans pencereleri `hareket` prop'u ile düzenleme kipine
  geçer. İkinci bir form dosyası yazılmaz.
- **C2.** **Tek doğrulama:** ekleme ve düzenleme aynı saf doğrulama fonksiyonunu çağırır ve
  **imzaları değişmez**; "bu hareket hariç" kuralını çağıran kurar (R7, R8).
- **C3.** Yeni kalıcı alan, yeni tablo ve yeni DB sütunu yoktur (`hedef` sütunu da eklenmez, R2).
- **C4.** Yeni izin ve yeni sunucu kuralı yoktur; sunucuda şu listeler değişmez (K-24):
  `BLOB_SECTIONS`, `SECTION_GROUP`, `BOLUM_SEKMELERI`, `ON_KOSUL_SEKMELERI`, `EYLEM_IDLERI`,
  `KAYIT_DUZENLE_IZINLERI` ve `KASA_SEKMELI_KAYITLAR`. Var olan hareketin düzenlenmesi
  `KAYIT_DUZENLE_IZINLERI` ile bugünkü izni istiyor ve virman ile avans Kasa sekmesi şartına tabi
  (0052 R21); ikisi aynen geçerlidir.
- **C5.** Düzenleme **çift sayım yaratmaz:** hareketin tutarı değişir, yeni bir hareket doğmaz.
- **C6.** Kullanıcıya görünen metinler Türkçedir.
- **C7.** İşlem geçmişi kaydı **mevcut etiket kümesine bağlıdır** (B-4): yeni entity `kasa_hareketi`
  `SettingsAuditLog`'un haritasına eklenir ve üç entity'nin (`kasa_hareketi`, `virman`, `avans`) hiçbiri
  `geriAl` haritasına eklenmez, böylece audit log'un geri al düğmesi bu kayıtlarda çıkmaz (X9).

### KAPSAM DIŞI

- **X1.** Hareketin başka bir gider kalemine ya da başka bir çalışana taşınması — *neden:* R4. Bu,
  iki kalemin ödeme planını birden oynatır; sil ve yeniden gir yolu açık ve anlaşılır.
- **X2.** Türün değiştirilmesi (ödeme → avans) — *neden:* R3; farklı alan kümeleri, farklı izinler.
- **X3.** Çeke bağlı hareketlerin düzenlenmesi — *neden:* R10; çekin durumu ve hareketleri birlikte
  tutulur, tek hareketi oynatmak çeki tutarsız bırakır.
- **X4.** Tahsilat kayıtlarının ve verilen çek satırının Kasa'dan düzenlenmesi — *neden:* R11; onlar
  müşteri, servis, satış ve çek kayıtlarının alanı.
- **X5.** Toplu düzenleme (seçili birkaç hareketin tarihini birden değiştirmek) — *neden:* ihtiyaç
  belirtilmedi; tek tek düzeltme yeterli.
- **X6.** Düzenleme geçmişinin kayıt üstünde tutulması (sürüm listesi) — *neden:* işlem geçmişi
  önceki değeri zaten yazıyor (R15).
- **X7.** **Kapsam dışı bırakılmış hareketin düzenlenmesi** — *neden:* Ö-15; kapsam dışı bir karar
  kaydıdır, veri düzeltme yeri değil. O listede yalnız "Kapsama al" vardır (bugünkü davranış); kullanıcı
  önce kapsama alır, sonra düzeltir.
- **X8.** Tahsilat ve verilen çek satırındaki ibarenin **tıklanabilir yönlendirme** olması — *neden:*
  R11; yeni bir gezinme kuralı açar, yazılı ibare yeterli ve ölçülebilir.
- **X9.** Hareket düzenlemesinin işlem geçmişinden **geri alınması** — *neden:* C7; `geriAl` haritası
  bütün kaydı diziye geri yazıyor ve hareketin türev etkileri (kalan, bakiye, kapsam dışı temizliği)
  bununla tutarlı değil. Kullanıcı düzeltmeyi yine düzenleme penceresinden geri alır.

## Context

- **Bugün hangi kapı var, hangisi yok (ölçüldü).** Hareketler eklenebiliyor ve silinebiliyor;
  **düzenleme hiçbir ekranda yok** ve ekleme penceresinin güncelleme yolu da yok (`odemeGirisiHazirla`
  yalnız yeni kayıt kurar, "Kayıtlı ödemeler" listesi yalnız siler). Silme dağınık: ödeme ve mahsup
  gider kaleminin ödeme penceresinden, avans çalışan ekstresinden, virman yalnız Kasa'nın hareket
  listesinden siliniyor. Kasa'daki hareket listesinde işlem sütunu **yalnız virman** için dolu
  (`Kasa.jsx:608`), diğer satırlarda boş bir hizalama hücresi var.
- **Hesapsız hareketler bu listede HİÇ yok.** Hesaplı liste `hesapBakiyeleri`'nin satırlarından geliyor;
  hesapsız ödeme ve avans yalnız Kasa'nın "Ödemeleri göster" listesinde (`kasa.hesapsizOdemeler`,
  `kasa.js:176-185`). Bu yüzden R1 iki listeye yazıldı ve R17 (hesap atama) o listeye bağlandı.
- **Çek hareketleri hiçbir listede görünmüyor.** `hesapsizOdemeler` `m.cekId == null` ile süzüyor
  (`kasa.js:180`) ve ciro ile kendi çek hareketleri hesapsız doğduğu için hesaplı listeye de girmiyor.
  Tek görünürlükleri ödeme penceresinin kayıtlı ödemeler listesi; R10 bu yüzden satır ibaresi değil,
  editör ve doğrulama kapısı olarak yazıldı.
- **Sunucu tarafı hazır, bu yüzden iş ucuz.** Sunucu, var olan bir hareketin değişmesini zaten
  düzenleme olarak görüyor ve o hareketin türüne karşılık gelen izni istiyor; virman ve avans
  hareketleri ayrıca Kasa sekmesi (ve Giderler + Finans önkoşulu) istiyor. Yani düzenleme kapısı
  açıldığında sunucuda yeni bir kural yazılması gerekmiyor (C4). Bu, işin maliyetini arayüz ve
  doğrulama tarafına indiriyor.
- **Bakiye saklanmıyor, bu yüzden düzeltme kendiliğinden yayılıyor.** Hesap bakiyeleri, kalemin ödeme
  durumu, borç özeti, hatırlatıcı, ekstre ve yöntem kırılımı hepsi okuma anında türetiliyor. Bir
  hareketin tutarı düzeltildiğinde hiçbir yerde "yeniden hesapla" işlemi gerekmiyor (R16). Düzenlemenin
  bu kadar az yan etkisi olmasının nedeni 0024'ün ödeme modelidir.
- **En ince yer: kendi tutarını sınır sanmak, ve iki kolda iki ayrı mekanizma.** Kalan tutar, kaleme
  yapılmış ödemeler düşülerek bulunuyor; düzenlenen hareket de bu ödemelerin içinde olduğu için tutarı
  yükseltmek isteyen kullanıcı "kalan 0" duvarına çarpar. Ama "bu hareket hariç" iki yerde farklı
  yapılıyor: **ödeme kolunda** kalan zenginleştirilmiş kalemden okunuyor (`odemeHedefKalaniK`, kalemin
  `_odenen`'i `odemeleriUygula`'dan), yani kalem hareketler eksi düzenlenen hareketle yeniden
  zenginleştirilir; **mahsup kolunda** `mahsupDogrula` hareketleri parametre alıyor (`kasa.js:571`), yani
  küme doğrudan geçirilir. İkisi de doğrulayıcı imzasını değiştirmeden olur (R7, R8, C2).
- **Avansta üçüncü bir sınır var.** `avansSilinebilirMi` (`kasa.js:541-547`) mahsupları açık avansı aşan
  avansın silinmesini engelliyor. Tutarı düşürmek aynı tutarsızlığı açıyor, bu yüzden R6 düzenleme için
  o kuralın tutar duyarlı karşılığını istiyor; aksi hâlde düzenleme, silmenin kapattığı deliği arka
  kapıdan açar.
- **Çek hareketleri neden dışarıda.** Ciro ve kendi çekimiz, çekin durumuyla hareketleri birbirine
  bağlı tutuyor: çek iptal edilince hareketler siliniyor, hareket olmadan ciro yazılamıyor (sunucu
  aynı yazımda hareket arıyor). Tek hareketi elle oynatmak bu dengeyi bozar. Bugün de ödeme
  penceresinde çeke bağlı hareket silinemiyor; bu spec aynı sınırı düzenlemeye de koyuyor (R10).
- **Göç hareketleri tutarsız.** 0024'ün göçü, eski "ödendi" işaretinden tutar bilgisi olmadan
  hareket üretti; bunlar "tam kapatma" olarak görünüyor ve kalanı o anki değerle kapatıyor.
  Düzenleme penceresi tutar alanını boş bulacak. Doğru davranış, silmeyi serbest bırakmak ve
  düzenlemeyi "tutar girerek normale çevirme" olarak tanımlamaktır (R12); aksi hâlde pencere boş
  tutarla kaydedip hareketi bozar.
- **Kilit zaten tanımlı.** 0064 her kaydı tek kilit alanına bağladı: ödeme ve mahsup gider kaleminin,
  virman kaynak hesabın, avans çalışanın kilidini kullanıyor. Düzenleme bu alanları yeniden
  tanımlamıyor, mevcutları okuyor (R14).
- **Aynı listede ÜÇ cins var.** Hesap hareket listesi hareketleri, hesaba giren tahsilatları
  (`s.tahsilat`, `Kasa.jsx:212`) ve **verilen çekin bakiye satırını** (`s.cek`, `:214`) birlikte
  gösteriyor; son ikisi `hesapHareketleri` değil. Yan yana durdukları için kullanıcı ayırt etmeyecek; bu
  yüzden R11 yönlendirmeyi ekranda yazılı tutuyor ve üçüncü cinsi de kapsıyor.
- **İşlem geçmişinde ad çakışması riski var.** Ödeme ve mahsup bugün `entity: "gider"` altında
  (`Giderler.jsx:154`, `:157`), virman ve avans kendi entity'lerinde. **`odeme` entity'si zaten müşteri
  tahsilatı demek** ve `geriAl` haritasında `rawPayments` ile eşleşiyor (`Settings.jsx:235`), yani
  hareket için o adı kullanmak audit log'da hareket kimliğini `payments` içinde arayan bir geri al
  düğmesi üretir. R15 bu yüzden `kasa_hareketi` adını seçiyor ve C7 üç entity'yi `geriAl`'ın dışında
  tutuyor.
- **Gizlilik iddiası bugünkü davranışla çelişiyordu.** Avans ekleme ve silme kaydı çalışan adını ve
  tutarı yazıyor (`CalisanAvanslari.jsx:100`, `:109`). Düzenleme kaydının bunları yazmaması aynı ekranda
  tutarsız bir iz bırakırdı; R15 bu yüzden "bugünkü ekleme ve silme kayıtlarıyla aynı alanlar" diyor.
  Gizlilik duvarı yazdırma ve dışa aktarma temellidir ve işlem geçmişi yalnız admin'e açıktır.

---

## Acceptance Criteria

### Düzenleme

- **AC-1.** Hesabın hareket listesindeki ödeme satırından Düzenle açılır; tarih, tutar, yöntem, hesap
  ve açıklama değiştirilip kaydedilir.
- **AC-26.** **Hesapsız ödemeler listesindeki** satırdan da Düzenle ve Sil açılır (hesaplı listede
  görünmeyen hareketler için tek yol).
- **AC-27.** **Hesapsız avans** satırından da Düzenle ve Sil açılır.
- **AC-2.** Virman satırından tarih, tutar, **kaynak hesap**, karşı hesap ve açıklama düzenlenir.
- **AC-3.** Avans satırından tarih, tutar, hesap ve açıklama düzenlenir; çalışan değişmez.
- **AC-4.** Mahsup satırı düzenlenir; çalışan ve kalem değişmez.
- **AC-5.** Hareketin türü hiçbir yoldan değiştirilemez.
- **AC-6.** Düzenleme hareketin kimliğini korur.
- **AC-7.** **Satırlı** kalemin ödemesinde taksit seçimi değiştirilebilir; **satırsız** kalemde taksit
  ya da hedef seçimi yoktur ve pencere bunu söyler.
- **AC-28.** Hesabı (virmanda kaynak hesabı) değişen satır listeden çıkar, bildirim hangi hesaba
  taşındığını söyler ve seçili hesap değişmez.
- **AC-29.** Bugünkü üç silme kapısı (ödeme penceresi, çalışan ekstresi, Kasa listesi) çalışmaya devam
  eder ve hepsi aynı yazma yolunu kullanır.

### Doğrulama

- **AC-8.** Düzenlenen ödeme, yeni ödeme ile aynı doğrulamadan geçer; geçersiz hesap, geçersiz para
  birimi ve kalanı aşan tutar reddedilir.
- **AC-9.** Tutar yükseltilirken sınır bu hareket hariç hesaplanır: tek ödemeyle tam kapanmış bir
  kalemin ödemesi, kalem tutarı artırıldıktan sonra yeni tutara yükseltilebilir.
- **AC-10.** Mahsupta sınır bu hareket hariç açık avans ile kalemin kalanının küçüğüdür.
- **AC-30.** Avans düzenlemesinde tutar, mahsupların toplamının altına düşürülemez; hata eksik tutarı
  söyler. Avans silmenin bugünkü kuralı değişmemiştir.
- **AC-11.** Hata iletisi hangi hedefin sınırının aşıldığını söyler.
- **AC-12.** Virman düzenlemesi aynı para birimi şartını ve kaynak ile hedefin farklı olması şartını
  korur; iki şart **iki hesabın ikisine de** uygulanır.
- **AC-31.** Doğrulayıcı imzaları değişmemiştir: `odemeDogrula`, `cokluOdemeDogrula`, `virmanDogrula`,
  `avansDogrula` ve `mahsupDogrula` aynı parametrelerle çağrılır (kaynak taraması artı mevcut testlerin
  dokunulmadan yeşil kalması).
- **AC-32.** Hesabın açılış tarihinden önceye ve geleceğe tarih girilebilir (yeni sınır yok, R23).

### Sınırlar

- **AC-13.** Çeke bağlı hareket düzenlenemez ve silinemez; kural **ödeme penceresinde** ölçülür (Kasa
  listesinde böyle satır hiç görünmez) ve ekranda nedeni ile yönlendirme yazılıdır.
- **AC-14.** Tahsilat satırında düzenleme eylemi yoktur; yerine kendi ekranını adıyla söyleyen bir ibare
  vardır ve ibare tıklanabilir değildir.
- **AC-33.** Verilen çekin bakiye satırında da düzenleme yoktur; ibare Çek Portföyü'ne yönlendirir.
- **AC-34.** Kalemi kalıcı silinmiş ödeme hareketi silinebilir ama düzenlenemez; nedeni yazılıdır.
- **AC-35.** Kapsam dışı bırakılmış satırda düzenleme eylemi yoktur; yalnız "Kapsama al" vardır.
- **AC-15.** Göçten gelen tutarsız hareket silinebilir; düzenleme penceresi tutarın girilmesi
  gerektiğini söyler, boş tutarla kaydedilemez ve tutar girilince hareket normal ödeme olur.
- **AC-36.** Göç hareketi düzenlendikten sonra `tamKapatir` false olur ama **`gocKaynak` korunur**
  (göç ikinci kez çalışıp kayıt üretmez).

### Yetki, kilit, iz

- **AC-16.** Ödeme izni olmayan kullanıcı ödeme **ve mahsup** satırında düzenleme ve silme göremez.
- **AC-17.** Virman izni olmayan kullanıcı virman satırında, avans izni olmayan kullanıcı avans
  satırında bu eylemleri göremez.
- **AC-37.** Kasa sekmesi (ve Giderler artı Finans önkoşulu) olmayan kullanıcı virman ve avans
  satırında bu eylemleri göremez.
- **AC-18.** Hareketin kaydı başkasında kilitliyse düzenleme ve silme reddedilir ve bildirilir; kendi
  kilidi engellemez.
- **AC-38.** Düzenleme penceresi açıkken kaydın kilidi tutulur ve dosya kilit kapsam listesindedir
  (`kilit-alanlari` testi yeşil).
- **AC-19.** Düzenleme işlem geçmişine önceki değerlerle yazılır; ödeme ve mahsup `kasa_hareketi`
  entity'siyle, virman ve avans bugünkü entity'leriyle, hepsi `duzenlendi` action'ıyla.
- **AC-39.** Yeni entity etiket haritasındadır (`islem-gecmisi-etiketleri` testi yeşil) ve üç entity
  `geriAl` haritasında **yoktur**, yani audit log'da bu kayıtlarda geri al düğmesi çıkmaz.

### Revizyon 2 eklemeleri

- **AC-41.** *(Q3)* "Kayıtlı ödemeler" listesinde silinebilir ödeme ve mahsup satırının yanında Düzenle vardır; mahsup oradan
  düzenlenir.
- **AC-42.** *(Q2)* Düzenleme kipinde yöntem listesinde "Çek (ciro)" ve "Çek (kendi)" yoktur.
- **AC-43.** *(Q4)* Satırsız çok hedefli kalemin ödemesi düzenlenirken ipucu görünür.
- **AC-44.** *(Q5)* Kapalı hesaptaki hareketin düzenlemesi nedeniyle reddedilir; silme yapılabilir.
- **AC-45.** *(Q7)* Virman penceresi eski kaynak hesabın kilidini alır.

### Türev etkiler

- **AC-20.** Tutar düzeltildikten sonra hesap bakiyesi, kalemin ödeme durumu ve borç özeti aynı anda
  doğruya gelir.
- **AC-21.** Tarih düzeltildikten sonra hareket listedeki ve ekstredeki yerini değiştirir; **sayfa
  sıfırlanmaz** ve kullanıcı aynı sayfada kalır.
- **AC-22.** Hesapsız bir ödemeye hesap atanınca kapsam dışı girişi bugünkü temizlik kuralıyla düşer.
- **AC-23.** Düzenleme hareket sayısını değiştirmez ve kaydın kimliği aynı kalır; **silme** bir hareket
  eksiltir.

### Tek editör

- **AC-24.** Ekleme ve düzenleme aynı pencereyi ve aynı doğrulama fonksiyonunu kullanır; düzenleme
  bir **kip**tir, ikinci bir form dosyası yoktur (kaynak taraması).
- **AC-25.** Yeni izin, yeni sunucu kuralı ve yeni DB sütunu eklenmemiştir (`hedef` sütunu dahil);
  C4'teki yedi liste değişmemiştir.
- **AC-40.** Çakışma birleştirmesinin bilinen sınırı yazılıdır ve testle sabitlenmiştir: eşzamanlı
  çakışmada düzenleme kaybolabilir, ekleme ve silme korunur (R24). *(Revizyon 2, Q9: test
  `hareket-duzenleme-0073.test.js`'te `buildMergePlan` ile; `merge.test.js` dokunulmaz.)*

## Definition of Done

- [x] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [x] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor. Dosyalar: motor
      `tests/hareket-duzenleme-0073.test.js` (dört türün düzenleme doğrulaması, "kendi tutarı hariç" iki
      kol, avans sınırı, göç hareketi), bileşen `tests/ui/hareket-duzenleme-0073.test.jsx` (iki liste,
      dört pencere, çek ve tahsilat ibareleri, kilit reddi), gerçek App `tests/ui/hareket-duzenleme-0073-app.test.jsx`
      (AC-37); güncellenen `ui/sayfalama-0062` (işlem sütunu) ve `ui/form-pencere-boyutu` (başlık ifadesi).
      *(Triyaj: `kasa.test.js` ve `ui/kasa` değişmedi; `islem-gecmisi-etiketleri` ve `kilit-alanlari` yeni entity'yi ve
      pencereleri kaynak taramasıyla kendiliğinden kapsar ve yeşildir; `server-authz` ile `merge.test.js` dokunulmadı,
      birleştirme düzeltmesinin testi AC-40 bloğunda.)*
- [x] "Kendi tutarı sınır sanılmaz" kuralı iki kolda ayrı ayrı sabitlendi (AC-9, AC-10) ve doğrulayıcı
      imzalarının değişmediği gösterildi (AC-31).
- [x] Çek, tahsilat, verilen çek, kapsam dışı ve silinmiş kalem sınırları testlerle sabitlendi
      (AC-13, AC-14, AC-33, AC-34, AC-35).
- [x] Göç hareketinin `gocKaynak` izinin korunduğu testle gösterildi (AC-36).
- [x] İşlem geçmişi kaydı yeni entity ile yazılıyor, etiket haritasında ve `geriAl`'ın dışında
      (AC-19, AC-39).
- [x] Kilit kapsam listesi güncellendi ve `kilit-alanlari` testi yeşil (AC-38).
- [x] Görsel kanıt: `docs/evidence/0073-taban-piksel-raporu.json` ve `0073-piksel-raporu.json`;
      ekranlar hareket listesinin işlem sütunu, hesapsız liste satırı, dört düzenleme penceresi, çek ve
      tahsilat ibareleri, göç hareketinin uyarısı. `Kasa.jsx`, `OdemeGirisi.jsx` ve
      `CalisanAvanslari.jsx` tasarım sözlüğünü kullandığı için `docs/evidence/kanit-eslemesi.json`
      kayıtları `beklenen: "degisti"` artı onay satırı taşır; spec `done`'a taşınırken `ayni`ye
      çevrilir.
- [x] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [x] `CLAUDE.md` güncellendi: hareketin iki listeden düzenlenebildiği, türün ve bağın değişmediği,
      taksit seçiminin yalnız satırlı kalemde olduğu, çek ve tahsilat sınırları, "kendi tutarı hariç"
      kuralının iki kolu, yeni `kasa_hareketi` entity'si ve çakışma birleştirmesinin bilinen sınırı.
- [x] Takım Yöneticisi onayladı. Commit ve sürüm yayını yalnız açık talimatla.
- [x] SCORECARD dolduruldu ve spec `specs/done/` klasörüne taşındı.

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Spec revizyon sayısı** | 2 | R2 plan onayı (Q1–Q9: dal, çekli yöntem yok, "Kayıtlı ödemeler"den mahsup düzenlemesi, satırsız ipucu, kapalı hesap, avans sınırı, virman kilidi, tek yazma yolu, birleştirme testi); triyajda R24'ün ötesindeki çift kayıt sınıfı `merge.js` düzeltmesiyle kapatıldı (plan "merge.js değişmez" maddesi geçersiz). Onaylandıktan sonra Requirements, Constraints veya Acceptance Criteria kaç kez değişti? |
| **Düzeltme turu sayısı** | 1 | Triyaj: birleştirmede bu oturumda üretilip düzenlenen hareketin çift yazılması, görsel kanıtın eksikliği (çekim sürüyordu), silinmiş çalışanın avansı, kapalı hesabın seçicide görünmemesi, AC-37 testi ve DoD listesi. İş kaç kez geri döndü? |
| **Bulgu gerçek/gürültü oranı** | 5 / 0 | Beşi gerçek; birleştirme bulgusu planın §6'sında not edilmişti ama CLAUDE.md'de yanlış anlatılmıştı. Gözden geçirmede çıkan bulgulardan kaçı gerçek sorundu? |
| **Regresyon sayısı** | 0 | Güncellenen dört eski test bilinçli değişiklik (spec atfıyla: sayfalama işlem sütunu, pencere başlığı ifadesi, 0058 AC-23 birleştirme beklentisi, tasarım sözlüğü satır atıfları); Electron dahil bütün testler yeşil. Bu iş yüzünden bozulan, daha önce çalışan davranış sayısı. |
| **Kaçan hata** | 0 | Kapanış anında bilinen yok. Gerçek uygulamada sonradan bulunan hata sayısı. |

**Bu spec'ten çıkarılan ders:** Bir kaydı düzenlenebilir yapmak, o kaydın birleştirme davranışını da değiştirir: düzenleme yokken "aynı kimlik, farklı içerik" yalnız nadir bir durumdu ve birleştirme onu yeni kayıt sayıyordu; düzenleme gelince bu dal sıradan hâle gelir ve para hareketinde çift ödeme demektir. Düzenleme açılan her bölüm için birleştirme planı (özellikle bu oturumda üretilmiş kimlik dalı) ayrıca sınanmalı. İkincisi: bilinen bir sınır plana not edilince iş bitmiş sayılmamalı; belgeye geçen cümle (CLAUDE.md) sınırı doğru anlatmıyorsa okuyan onu kabul edilmiş sanır. Üçüncüsü: düzenleme kipi, ekleme kipinin doğrulamasını aynen çağırdığında ekleme için doğru olan bir kural (silinmiş çalışana avans verilmez, kapalı hesap seçilmez) düzenlemede yanlış ya da kafa karıştırıcı olabilir; "kayıtla değişmeyen alan" için kural çağıranda gevşetilmeli, doğrulayıcı imzası değiştirilmeden.
