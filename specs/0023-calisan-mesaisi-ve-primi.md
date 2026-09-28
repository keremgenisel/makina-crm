# 0023 — Çalışan Mesaisi ve Priminin Personel Maliyetine Eklenmesi

| | |
|---|---|
| **Durum** | Onaylandı (2026-09-28, plan onayıyla; plan `specs/0023-uygulama-plani.md` P1–P8) |
| **Sahip** | Analist (spec) · geliştirme sahibi atanacak |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Personel gider kalemi, çalışan tanımı, dönem raporu, borç özeti, makina maliyeti |
| **Bağımlı spec'ler** | 0001 (gider kaydı, personel davranışı) · 0020 (personel giderinin atanabilmesi) |
| **Revizyon** | R1 (2026-09-28): onay öncesi QA boşluk analizi, 0001'in uygulanmış koduna göre; 13 açık nokta karara bağlandı — ek ödeme satırlarının kimliksiz alt satır olarak saklanacağı (C7), alan adının `mesai` olmayacağı ve ayrımın kod düzeyinde yapılacağı (R10, AC-18), satır türünün sabit üç değer olduğu (R1), kaydetme şartının kalemin genel toplamına uygulanacağı (R11, AC-15; bugünkü doğrulama yalnız ikramiyesi olan ayı reddediyordu), satır doğrulaması ve aynı türden ikinci satırın serbest olduğu (R9, AC-16, AC-17), ek ödemelerin maaşla aynı ödeme sayıldığı (C8, AC-20), borç özeti ile hatırlatıcının aynı toplamı kullandığı (R3), rapor ayrımının varsayılan kapalı ayrıntıda gösterileceği (R7, AC-19), tekrarlayan üretimin atamasız kalem ürettiği akışı (R6), gizlilik testinin alan adı listesiyle çalıştığı (DoD) ve 0020'nin sıra şartı olduğu (C9) yazıldı. R2 (2026-09-28, plan onayı): adlar sabitlendi (R10/P1: alan `ekOdemeler`, tür kodları `fazlaCalisma`/`prim`/`ikramiye`, tablo `gider_ek_odemeleri`); personel ayrıntısının sütunları yazıldı (R7/P2: Resmi ve Elden yalnız maaş, Ek ödeme, Toplam; satırlar çalışanın altında); "tamamen boş satır" tanımlandı (R9/P3); R11 hatasının yeri (P4) ve AC-18 taramasının yöntemi (P5) yazıldı; 0021 taksitleriyle etkileşim test edilir (R12/P6). |

---

## Intent

Bir çalışanın aylık maliyeti sabit değil. Yoğun aylarda fazla mesai yapılıyor, iş teslim edildiğinde
prim veriliyor, bayramda ikramiye çıkıyor. Bugün uygulamada bir çalışanın maliyeti tanımdaki tek bir
resmi ve elden tutardan geliyor; tekrarlayan gider her ay aynı rakamı üretiyor. Fabrika fazla mesai
ödediği ayda gerçekte daha fazla para harcıyor ama uygulama bunu göstermiyor, dolayısıyla o ayın
personel gideri ve o ay üretilen makinaların maliyeti eksik çıkıyor.

Başarı şu demek: bir çalışanın belirli bir ayına mesai ve prim tutarı girilebiliyor, o ayın personel
gideri bu tutarları içeriyor, ve bu para o ay üretilen makinaların maliyetine yansıyor. Gizlilik
bozulmuyor: kimin ne kadar prim aldığı varsayılan olarak kapalı ve hiçbir çıktıya girmiyor.

---

## Requirements

- **R1.** Personel davranışlı bir gider kalemine, o dönem için **ek ödeme satırları** girilebilir. Satır
  türü **sabit üç değerden** biridir: **Fazla mesai, Prim, İkramiye**. Her satırda ayrıca opsiyonel serbest
  bir açıklama bulunur. Tür sabit olduğu için rapor kırılımı anlamlı kalır, açıklama da kaybolmaz.
  **Adlar (R2, P1):** kalem alanı `ekOdemeler`, satır `{tur, aciklama, resmiTutar, eldenTutar}`; tür kodları
  `fazlaCalisma` ("Fazla mesai"), `prim` ("Prim"), `ikramiye` ("İkramiye"); veritabanı alt tablosu
  `gider_ek_odemeleri`. "Fazla mesai" yalnız ekran etiketidir, kod değerinde `mesai` sözcüğü geçmez (R10).
- **R2.** Her ek tutar, tanımdaki maliyet gibi **resmi** ve **elden** ayrımını taşır; ikisi ayrı girilir.
- **R3.** Kalemin toplamı, tanımdan gelen maaş ile girilen ek ödemelerin toplamıdır; ödenecek tutar da bu
  toplamdır. **Aynı toplam borç özetindeki çalışan borcunda ve ödeme hatırlatıcısında da kullanılır**;
  ikinci bir toplama yazılmaz (C5).
- **R4.** Tekrarlayan gider üretimi, mesai ve prim alanlarını **boş** üretir; bunlar her ay elle girilir.
  Bir ayın tutarı ertesi aya taşınmaz.
- **R5.** Geçmiş bir aya mesai girilebilir; o ayın personel gideri ve o ay üretilen makinaların maliyeti
  yeniden hesaplanır.
- **R6.** Ek ödemeler kalemin atamasını izler: kalem bir makinaya ya da modele atanmışsa (0020) ek tutarlar
  da aynı yere gider, ortaksa ortak kalır. **Akış şöyledir:** tekrarlayan tanımdan üretilen personel kalemi
  her zaman atamasız gelir (`tekrarlayanUret` ürettiği kaleme boş atama yazıyor ve 0020 X5 tanım tarafında
  atamayı kapatıyor), dolayısıyla atama ancak kullanıcı o ayın kalemini **elle düzenlediğinde** oluşur.
  Tanım tarafında bir atama akışı aranmaz.
- **R7.** Dönem raporunda personel toplamı ek tutarları içerir. Ayrım, **varsayılan olarak kapalı** personel
  ayrıntısında gösterilir: bölüm açıldığında her çalışan için **maaş** ve **ek ödeme** tutarları ayrı ayrı
  görünür; kapalıyken yalnız toplam görünür (R8'in gizlilik kuralı korunur).
  **Sütunlar (R2, P2):** Resmi, Elden, Ek ödeme, Toplam. Resmi ve Elden yalnız **maaşı** gösterir (0001'in resmi/elden
  ayrımı korunur); Ek ödeme çalışanın bütün ek ödeme satırlarının toplamıdır ve satırlar (tür, açıklama, tutar)
  çalışanın altında ayrı ayrı listelenir (AC-4). Personel kalem listesindeki satır da ek ödeme varsa tutarını yazar.
- **R8.** Çalışan bazlı ek ödeme tutarları **varsayılan olarak kapalıdır** ve hiçbir yazdırma ya da dışa
  aktarma çıktısına girmez (0001 gizlilik kuralı aynen sürer).
- **R9.** Bir ayda aynı çalışana birden çok ek ödeme girilebilir ve **aynı türden iki satır da olabilir**
  (iki ayrı prim gerçek bir durumdur); satırlar açıklamayla ayrılır. Model satırlarındaki "bir modelden tek
  satır" kuralı buraya **taşınmaz**.
  **Satır doğrulaması:** her satırda resmi artı elden toplamı sıfırdan büyük olmalıdır; tamamen boş satır
  sessizce atılır, negatif değer hata verir.
  **Tamamen boş (R2, P3):** iki tutar alanı ve açıklama boştur (tür her zaman seçili olduğu için sayılmaz). Açıklaması
  olan ama tutarı sıfır olan satır atılmaz, hata verir ("Ek ödeme satırında tutar sıfırdan büyük olmalı."); hata
  satır numarasını taşır.
- **R10.** Yeni alanlar **`mesai` adını taşımaz.** Satırlar tek bir liste alanında ("ek ödemeler") tutulur ve
  satır türü ayrı bir alanda saklanır. Kodda `mesai` adı zaten servis işçilik süresi için kullanılıyor
  (`utils.mesaiDk`, `appSettings.calismaSaatleri`); iki kavramı aynı ada bağlamak, servis çalışma saatleri
  ayarını değiştiren kullanıcının personel maliyetini bozmasına yol açar. Ayrım **kod düzeyinde** yapılır,
  belgeye not düşmek yeterli değildir.
- **R11.** Kalemin kaydedilebilmesi için gereken "tutar sıfırdan büyük olmalı" şartı **kalemin genel
  toplamına** (maaş artı ek ödemeler) uygulanır. Bugün şart yalnız maaş alanlarına bakıyor
  (`gider.js:317`), dolayısıyla maaşı sıfır ve yalnız ikramiyesi olan bir ay kaydedilemiyordu.
  (R2, P4) Genel toplam sıfırken hata bugünkü yerinde (maaşın resmi alanı) ve bugünkü metinle gösterilir.
- **R12.** (R2, P6) 0021 ile birlikte: taksitli personel kaleminde ek ödeme eklenip çıkarılınca hedef toplamı değişir
  ve 0021 R10'un "yalnız ödenmemiş taksitler yeniden bölünür" kuralı kendiliğinden işler; ayrı kod yazılmaz.

---

## Constraints

- **C1.** Hesaplar kuruş tamsayısıyla yapılır (0001 ile aynı).
- **C2.** Mesai **saat olarak takip edilmez**; kullanıcı doğrudan tutar girer.
- **C3.** Ek tutarlarda KDV ve stopaj **yoktur** (personel davranışının bugünkü kuralı; ücret stopajı 0001
  X6 ile kapsam dışı).
- **C4.** Yeni izin boyutu tanımlanmaz; ek ödeme girmek mevcut gider düzenleme iznine bağlıdır.
- **C5.** Tek gerçek kaynak korunur: personel kalem toplamı bugün nerede hesaplanıyorsa ek tutarlar da
  oraya girer, ikinci bir toplama yazılmaz.
- **C6.** Kullanıcıya görünen metinler Türkçedir.
- **C7.** Ek ödeme satırları **kimliksiz alt satır** olarak saklanır (gider model satırları deseni):
  kalemle birlikte yazılır, silinir ve birleştirilir. Satırlar yalnız okunup toplandığı, tek tek
  işaretlenmediği için kalıcı kimlik gerekmez; bu, 0021'in taksitlerinden ayrıldığı noktadır (orada satırlar
  tek tek ödendi işaretlendiği için kimlik zorunluydu).
- **C8.** **Kabul edilen sınır:** ek ödemeler maaşla **aynı ödeme** sayılır; ayrı vade ve ayrı ödendi
  işareti taşımazlar. Primi maaştan başka bir günde ödemek gerekiyorsa kullanıcı ayrı bir personel kalemi
  açar; o zaman 0001'in "aynı çalışan ve ay" mükerrer uyarısı çıkar, engel değildir.
- **C9.** **0020 tamamlanmadan bu iş başlamaz.** Personel kaleminde atama yoksa R6 tanımsız kalır;
  bağımlılık yazılı olmakla kalmaz, sıra şartıdır.

### KAPSAM DIŞI

- **X1.** Puantaj, saat girişi, vardiya takibi — *neden:* fabrika bugün saat tutmuyor; tutar girişi
  ihtiyacı karşılıyor ve saat takibi ayrı bir üründür.
- **X2.** Mesai tutarının kanuni katsayılardan (%50, %100 zamlı saat ücreti) otomatik hesaplanması —
  *neden:* bunun için saat ve saat ücreti gerekir (X1); ayrıca elden ödemede katsayı uygulanmıyor.
- **X3.** Çalışan avansı ve mahsubu — *neden:* 0024'ün konusu; avans bir borç hareketidir, maliyet değil.
- **X4.** Kıdem ve ihbar tazminatı karşılığı — *neden:* dönemsel karşılık ayırmak muhasebe kararıdır,
  uygulama nakit çıkışını takip ediyor.
- **X5.** Servis işçilik süresiyle (`mesaiDk`, çalışma saatleri) herhangi bir bağ — *neden:* Context'te
  yazılı adaş tuzağı; ikisi farklı kavram.
- **X6.** Ek ödemenin bordro ya da SGK bildirimine yansıtılması — *neden:* uygulama beyan etmez (0001 X3).

---

## Context

- **Bugünkü personel kalemi.** `src/lib/gider.js` personel davranışında kalem tutarı
  `resmiTutar + eldenTutar` (kuruş), KDV ve stopaj sıfır. Tekrarlayan üretim çalışan tanımındaki
  `calisanlar[].resmiMaliyet` ve `eldenMaliyet` değerlerini kaleme kopyalıyor, yani her ay aynı rakam
  çıkıyor. Mesai ya da prim diye bir alan yok.
- **Neden tanıma değil kaleme.** Çalışan tanımındaki tutar "bu kişinin normal aylık maliyeti"; mesai aya
  özgü. Tanıma yazılırsa her ay kendiliğinden tekrar eder ve geçmiş aylar da değişir. Bu yüzden ek tutar
  kalemin (yani o ayın) verisidir.
- **Adaş tuzağı (dikkat).** Kodda `mesai` kelimesi zaten kullanılıyor ama **başka anlamda**:
  `utils.mesaiDk` ve `appSettings.calismaSaatleri` servis işçilik süresini firmanın çalışma pencereleriyle
  kırpmak içindir (`tests/mesai.test.js`). Bu işin "mesai"si bordro fazla mesaisidir ve o altyapıyla
  hiçbir ilgisi yoktur. İki kavramı aynı alana bağlamak, servis süresi ayarını değiştiren kullanıcının
  personel maliyetini bozmasına yol açar. Adlandırma bunu ayırt etmelidir.
- **Kalıcı alan kuralı.** Ek tutarlar kalıcıdır, yani `CLAUDE.md`'deki dört (liste ise beş) nokta kuralı
  geçerli. Bir çalışana bir ayda birden çok satır girilebildiği için (R9) alt satır listesi gerekiyor;
  bunun emsali `gider_model_satirlari` (satır kimliği taşımayan alt tablo) ve `yedek_parca_tahsis`.
- **Gizlilik testi alan adı listesiyle çalışıyor.** `tests/gider-gizlilik.test.js` yazdırma ve dışa aktarma
  dosyalarının **belirli alan adlarını** hiç okumadığını sabitliyor. Yeni alan adları o listeye eklenmezse
  test yeşil kalır ama yeni alan bir Excel çıktısına sızabilir; yani testi genişletmek bu işin parçasıdır.
- **Doğrulama bugün yalnız maaşa bakıyor.** Personel dalındaki "tutar sıfırdan büyük olmalı" şartı
  `resmiTutar + eldenTutar` üzerinden kuruluyor (`gider.js:317`) ve bu iki alan maaştan geliyor; R11 şartı
  kalemin genel toplamına taşır.
- **Tekrarlayan üretim atamasız kalem üretiyor.** `tekrarlayanUret` ürettiği kaleme `atamaTur: ""` yazıyor,
  yani R6'nın atanmış hâli ancak elle düzenlemeyle oluşur.
- **Sıra.** 0020 (personel atama) bu işten önce gelir: atama kuralı oturmadan ek tutarın nereye gideceği
  (R6) tanımsız kalır.

---

## Acceptance Criteria

- **AC-1.** Personel kalemine mesai tutarı girilebilir ve kalem toplamı bu tutarı içerir.
- **AC-2.** Personel kalemine prim tutarı girilebilir ve kalem toplamı bu tutarı içerir.
- **AC-3.** Her ek tutar resmi ve elden olarak ayrı girilir; ikisinin toplamı kaleme yansır.
- **AC-4.** Aynı çalışana aynı ayda iki ek ödeme girildiğinde ikisi de toplama girer ve **iki yerde ayrı
  ayrı görünür**: kalem formundaki satır listesinde ve dönem raporunun açılmış personel ayrıntısında.
- **AC-5.** Tekrarlayan gider üretimi ek tutarları boş üretir; önceki ayın mesaisi tekrarlanmaz.
- **AC-6.** Kalemde ek tutar varken ödenecek tutar maaş ile ek tutarların toplamıdır.
- **AC-7.** Geçmiş bir aya mesai girildiğinde o ayın personel gideri artar.
- **AC-8.** Geçmiş bir aya mesai girildiğinde o ay üretilen makinaların maliyeti artar.
- **AC-9.** Kalem bir makinaya atanmışken girilen ek tutar aynı makinaya gider, ortakken ortak kalır.
- **AC-10.** Dönem raporunda personel toplamı ek tutarları içerir.
- **AC-11.** Çalışan bazlı ek ödeme ayrıntısı varsayılan olarak kapalıdır.
- **AC-12.** Ek ödeme tutarları hiçbir yazdırma ve dışa aktarma çıktısında görünmez.
- **AC-13.** Ek tutar alanları veritabanına yazılıp geri okunur (kapanıp açıldığında kaybolmaz).
- **AC-14.** Servis işçilik süresi hesabı bu işten etkilenmez (çalışma saatleri ayarı değişmez).
- **AC-15.** Maaşı sıfır, yalnız 5.000 TL ikramiyesi olan bir personel kalemi kaydedilir; "tutar sıfırdan
  büyük olmalı" şartı kalemin genel toplamına uygulanır (R11).
- **AC-16.** Ek ödeme satırında negatif tutar girildiğinde kalem kaydedilmez ve nedeni söylenir; tamamen
  boş satır sessizce atılır.
- **AC-17.** Aynı çalışana aynı ayda **aynı türden** iki satır (iki ayrı prim) girilebilir; ikisi de toplama
  girer.
- **AC-18.** Yeni alanların hiçbiri `mesai` adını taşımaz; bu, kaynak taramasıyla doğrulanır ve servis
  işçilik süresi alanlarıyla karışmaz (R10). (R2, P5) Tarama tanımlayıcıları hedefler: motorun ürettiği kaydın ve
  satırlarının anahtarları, tür kodları ve tablo adı `mesai` içermez; gider motoru ve formu servis işçilik
  altyapısını (`mesaiDk`, `calismaSaatleri`) kullanmaz. Ekran metnindeki "Fazla mesai" meşrudur.
- **AC-19.** Dönem raporunun personel ayrıntısı kapalıyken yalnız toplam, açıldığında her çalışan için maaş
  ve ek ödeme ayrı ayrı görünür.
- **AC-20.** Ek ödemeler kalemin kendi vadesini ve ödeme durumunu paylaşır; ayrı vade ya da ayrı ödendi
  işareti taşımazlar (C8).

---

## Definition of Done

- [ ] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [ ] Kalıcı alanlar dört (liste ise beş) noktada eklendi; roundtrip testi kapsıyor (AC-13).
- [ ] Gizlilik testinin **taradığı alan adı listesine** yeni alanlar eklendi (AC-12); listeye eklenmeyen bir
      alan testi yeşil bırakıp çıktıya sızabilir.
- [ ] Ek ödeme satırları **kimliksiz alt satır** olarak kuruldu ve kalemle birlikte yazılıp birleştirildiği
      testle gösterildi (C7).
- [ ] 0020 tamamlanmış ve bu iş onun üstüne yazıldı (C9); PR özetinde belirtildi.
- [ ] Personel kalem toplamı tek yerde hesaplanıyor; ikinci toplama yazılmadı (C5).
- [ ] Görsel kanıt eklendi (`docs/evidence/0023-*.jpg`), ek ödeme satırları ve kapalı gizlilik durumu dâhil.
- [ ] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [ ] `CLAUDE.md` güncellendi; `mesai` adının iki farklı anlamı açıkça yazıldı.
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
