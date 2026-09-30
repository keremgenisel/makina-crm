# 0020 — Personel Giderinin Makinaya ve Modele Atanabilmesi

| | |
|---|---|
| **Durum** | Tamamlandı (2026-09-27; commit `8ca7fbe`, dal `feat/0020-personel-atama`; plan `specs/done/0020-uygulama-plani.md` P1–P9) |
| **Sahip** | Analist (spec) · geliştirme sahibi atanacak |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Gider kalemi formu, gider kova dağılımı, dönem raporu, makina maliyeti |
| **Bağımlı spec'ler** | 0001 (gider kaydı), 0002 (makina maliyeti) |
| **Revizyon** | R1 (2026-09-27): onay öncesi QA boşluk analizi, 0001 ve 0002'nin uygulanmış koduna göre; 13 açık nokta karara bağlandı — personelde model dağılımının tabanı `resmi + elden` olarak yazıldı (R2; bugünkü doğrulama personelde dağıtımı baştan imkânsız kılıyordu), kova kuralının yeni hâli tek cümleye indirildi (R1), uyarı metni sabitlendi (R3), makina kırılımında "Personel gideri" etiketi ve düşen atama uyarısı eklendi (R8, R9), tekrarlayan tanımda atamanın açılmayacağı kararlaştırıldı (X5), gizlilik kriteri bütün makina bazlı ekranlara genişletildi (AC-9), AC-13…AC-16 eklendi, tamamlanmış 0001/0002 spec'lerine güncelleme notu DoD'ye girdi. R2 (2026-09-27, plan onayı): kodda doğrulanan noktalar işlendi: "Personel gideri" etiketi açıklama yazılmış olsa bile her zaman kullanılır, çünkü tekrarlayan tanımdan üretilen kalemin açıklaması çoğunlukla çalışanın adıdır (R8/P1); AC-9'daki "çalışan bazlı tutar" çalışan adı ve resmi/elden kırılımı olarak tanımlandı, kalem tutarı görünür (AC-9/P2); makinaya atanmış her personel kalemi ayrı satırdır (R8/P3); dönem raporunun atama sütunu ve "Ortak gider" kartının alt yazısı yeni kurala uyar (R10/P5); maliyet detayındaki model havuzu satırının etiketi işçiliği de kapsayacak biçimde değişir (R11/P6); `makina-maliyeti.test.js` AC-70'in personel yarısı bu spec'in istisnası olarak ters çevrilir (C6/P7). |

---

## Intent

Bir makinanın maliyetinin en büyük iki kalemi malzeme ve işçiliktir. Uygulamada malzeme makinaya
ya da modele atanabiliyor, işçilik atanamıyor: personel davranışlı her gider kalemi zorunlu olarak
ortak gidere düşüyor ve bütün makinalara eşit dağılıyor. Oysa fabrika belirli bir ayda belirli bir
işi belirli makinalara yaptığını biliyor. Bu yüzden bugün "bu makina bana kaça mal oldu" sorusunun
cevabında işçilik tarafı her zaman ortalamadır.

Başarı şu demek: personel gideri de diğer kalemler gibi bir makinaya ya da modellere atanabiliyor,
atanmayan personel gideri bugünkü gibi ortak kalıyor, ve kullanıcı bir aylık maaşın tamamını tek
bir makinaya yüklediğinde bunun ne demek olduğunu ekranda görüyor.

---

## Requirements

- **R1.** Personel davranışlı gider kalemi, normal kalemlerle **aynı atama seçeneklerini** sunar: ortak
  (varsayılan), tek makina, model dağılımı, ya da makina maliyetine dağıtılmasın.
  Kova kuralının yeni hâli tek cümleyle şudur: **kova dağılımı davranışa göre değil, yalnız kira için**
  ortağa zorlar; personel normal kalemlerle aynı yolu izler. (Bugünkü kural "normal olmayan her davranış
  ortaktır" biçiminde yazılı, `gider.js:256`.)
- **R2.** Model dağılımı personelde de aynı biçimde çalışır: model, birim maliyet ve adet satırları; kalan
  tutar ortak kovaya düşer.
  **Dağıtım tabanı personelde `resmi + elden` toplamıdır.** Bugün doğrulama kalemin `tutar` alanına
  bakıyor, personelde o alan boşaltılıyor (`gider.js:148`, `:201`) ve forma da boş geçiriliyor
  (`GiderForm.jsx:228`); düzeltilmezse her model satırı "tutarı aşıyor" hatası verir. Aynı toplam,
  "dağıtılmayan X ₺ ortak gidere yazılacak" ipucunda da kullanılır.
  **Alanların personeldeki anlamı:** birim maliyet "o modelin bir makinasına düşen işçilik", adet
  "kaç makina". Alan etiketleri değişmez; yalnız ipucu metni personelde bunu söyler.
- **R3.** Bir makinaya atanan personel kaleminin **tamamı** o makinaya yüklenir. Kullanıcı bunu seçtiğinde
  ekranda uyarılır; uyarı engel değildir. Metin burada sabittir: **"Bu kalemin tamamı seçilen makinaya
  yüklenecek."**
- **R4.** Atama yapılmamış personel kalemi bugünkü davranışını korur: ortak gider olur ve ayın üretilen
  makinalarına eşit dağılır.
- **R5.** **Kira davranışlı kalem ortak kalmaya devam eder** ve atanamaz.
- **R6.** Personel ayrıntısının gizliliği korunur: atama yapılmış olsun olmasın, çalışan bazlı tutarlar
  bugünkü gizlilik kuralına tabidir ve hiçbir yazdırma veya dışa aktarma çıktısına girmez.
- **R7.** Dört kovanın toplamı dönem gider toplamına eşit kalır; personelin kova değiştirmesi bu eşitliği
  bozmaz.
- **R8.** Makina ve model kırılımında atanmış personel kalemi **"Personel gideri"** etiketiyle görünür;
  çalışan adı yazılmaz. Bugün bu iki ekran kalemin açıklamasını basıyor
  (`MakinaModelGorunumu.jsx:38`, `MakinaMaliyetDetay.jsx:54`) ve personel kaleminin açıklaması çoğunlukla
  boş olduğu için satır "—" görünür; kullanıcı tutarın maaş olduğunu anlamaz. Etiket hem bu boşluğu
  kapatır hem gizliliği korur (R6).
  **Etiket her zaman kullanılır (R2):** kullanıcı açıklama yazmış olsa bile makina bazlı ekranlarda personel kalemi
  "Personel gideri" olarak görünür; tekrarlayan tanımdan üretilen kalemin açıklaması tanım adı ya da **çalışanın
  adıdır** (`gider.js:325`), açıklamayı göstermek adı sızdırırdı. Aynı kural makina kırılımındaki bütün listelere
  uygulanır: makinaya atanmış, modele atanmış, dağıtılmasın, kısmi dağıtım ve düşen atamalar. Makinaya atanmış
  birden çok personel kalemi ayrı satırlarda (tarih, etiket, tutar) görünür.
- **R9.** Atanmış makina silindiğinde kalemin ortağa dönmesi **raporda görünür**: dönem raporundaki
  "düşen atamalar" uyarısı personel kalemlerini de kapsar. Bugün o uyarı yalnız normal davranışta yazılıyor
  (`gider.js:453-455`); personel eklenmezse maliyet sessizce değişir.
- **R10.** (R2) Kova kuralını yansıtan iki metin yeni kurala uyar: dönem raporunun kalem listesindeki atama sütunu
  yalnız kira kalemini zorla "Ortak gider" yazar (`DonemRaporu.jsx:204`); Makina ve Model görünümündeki "Ortak gider"
  kartının alt yazısı "Kira ve atanmamış personel dahil" olur.
- **R11.** (R2) Makina maliyet detayında model havuzlarından gelen satırın etiketi **"Model havuzu payları (malzeme ve
  işçilik)"** olur; personelin model dağılımı bu satıra düşer ve eski "Malzeme payları" etiketi yanlış olurdu. Hesap
  ve satır sayısı değişmez; ayrı bir işçilik satırı açılmaz.

---

## Constraints

- **C1.** Hesap tek kaynaktan yapılır: kova dağılımı 0001'in motorundadır, 0002 onu tüketir. Personel
  için ikinci bir dağıtım yolu yazılmaz.
- **C2.** Gizlilik kuralı gevşetilmez (R6).
- **C3.** Yeni izin tanımlanmaz; personel kalemi zaten gider izinleriyle yönetiliyor.
- **C4.** Kuruş tamsayısı ve artık kuruş kuralı değişmez.
- **C5.** Kullanıcıya görünen metinler Türkçedir.
- **C6.** (R2) Mevcut testlere dokunulmaz; tek istisna `tests/makina-maliyeti.test.js` AC-70'tir: bugünkü "personel
  atansa da ortak" davranışını kilitliyor, kira yarısı aynen kalır, personel yarısı bu spec'in kuralına çevrilir.

### KAPSAM DIŞI

- **X1.** Bir maaşın birden çok makinaya yüzdeyle bölüştürülmesi — *neden:* bu bir puantaj (timesheet)
  işidir; hangi çalışanın hangi makinaya kaç saat çalıştığını toplamayı gerektirir ve kendi spec'ini hak
  eder. Model dağılımı (adet bazlı) kısmi bölüştürmeyi zaten yaklaşık olarak karşılar.
- **X2.** Çalışan bazlı süre veya mesai takibi — *neden:* 0023 olarak ayrı sıradadır.
- **X3.** Kira kaleminin atanabilmesi — *neden:* kira mekânın gideridir, tek makinaya yüklenmesi yanlış
  sinyal verir (R5).
- **X4.** Geçmiş personel kalemlerinin toplu olarak yeniden atanması — *neden:* kullanıcı gerektiğinde tek
  tek düzenler; toplu araç ayrı iştir.
- **X5.** **Tekrarlayan personel tanımında atama** — *neden:* atama alanı bugün tanım formunda da davranışa
  göre kapalı (`SettingsGiderTanimlari.jsx:55`, `:224`). Tanım seviyesinde açılsa her ayın maaşı aynı
  makinaya yüklenirdi; bir çalışanın her ay aynı makinaya çalıştığı varsayımı gerçekçi değil ve sessizce
  yanlış maliyet üretir. Üretilen kalem ortak gelir, kullanıcı o ayın kalemini tek tek düzenler.

---

## Context

- **Kural bugün motorda sabit.** `src/lib/gider.js` içindeki kova hesabı, davranışı normal olmayan her
  kalemi doğrudan ortak kovaya yazıyor: `if (davranis !== DAVRANIS.NORMAL) r.ortak = top;`. Yani kira ve
  personel, atama alanı ne olursa olsun ortak sayılıyor. Kullanıcının sorusunun cevabı budur: hayır,
  bugün seçilemiyor, çünkü kural bu.
- **Doğrulama personelde tabanı bilmiyor (R2).** `giderKalemDogrula` personel dalında `kayit.tutar = null`
  yapıyor (`gider.js:148`) ama model satırı doğrulaması `modelSatirlariDogrula(kayit.tutar ?? 0, …)` ile
  çağrılıyor (`:201`); personelin tutarı `resmiTutar + eldenTutar` (`:73-75`). Form da `AtamaAlani`'na
  `tutar={form.tutar}` geçiriyor (`GiderForm.jsx:228`). Bu üç yer düzeltilmeden model dağılımı personelde
  hiç çalışmaz.
- **Etiket sorunu (R8).** Makina kırılımı ve maliyet detayı kalemin **açıklamasını** basıyor
  (`MakinaModelGorunumu.jsx:38` → `x.aciklama || "—"`, `MakinaMaliyetDetay.jsx:54` → `k.aciklama || "gider"`).
  İyi yanı: çalışan adı hiçbir yerde basılmıyor, yani atama gizliliği kendiliğinden delmiyor. Kötü yanı:
  personel kaleminin açıklaması çoğunlukla boş, satır "—" görünür.
- **Atama alanı iki formda da kapalı (X5).** `GiderForm.jsx:226-228` ve `SettingsGiderTanimlari.jsx:55`,
  `:224` aynı `davranis === normal` kapısını kullanıyor; bu iş yalnız birincisini açar.
- **Uyarının emsali var.** 0002 R21, personel kalemi bir makinaya atandığında kullanıcıya tamamının o
  makinaya yükleneceğini söyleyen bir bilgi öngörüyordu; o zaman atama zaten mümkün olmadığı için kural
  kâğıtta kaldı. R3 onu hayata geçirir.
- **Maliyetin iki büyük kalemi.** 0002'de maliyet formülü doğrudan gider, model havuzu payı ve ortak pay
  olarak kurulu. Malzeme model havuzuyla makina bazına inebiliyor; işçilik bugün yalnız ortak paydan
  geliyor. Bu spec ikinci kalemi de makina bazına indirir.
- **Gizlilik.** Personel tutarları uygulamanın en hassas verisi; ayrıntı her yerde varsayılan kapalı ve
  çıktılara hiç girmiyor. Atama eklenirken bu kural yanlışlıkla delinmemeli: makina maliyet detayında
  "personel gideri" satırı görünebilir, ama hangi çalışanın ne kadar aldığı o ekrana taşınmamalıdır.

Bilinen tuzaklar:

- **Ortalama yerine tek makina.** Bir aylık maaşı tek makinaya yüklemek, o makinanın maliyetini birkaç kat
  şişirebilir. Uyarı (R3) bunun için var; rakamı yorumlayan kişi ne yaptığını bilmeli.
- **Kova toplamının bozulması.** Personel kovası değişirken dört kovanın toplamı dönem toplamına eşit
  kalmalı (R7); bu eşitlik 0001'de testle sabitlenmiş durumda ve korunmalı.

---

## Acceptance Criteria

- **AC-1.** Personel davranışlı bir gider kalemi formunda ortak, makina, model ve dağıtılmasın seçenekleri
  görünür.
- **AC-2.** Bir makinaya atanan personel kaleminin tamamı o makinanın doğrudan gideri olur.
- **AC-3.** Makinaya atama seçildiğinde kullanıcıya "Bu kalemin tamamı seçilen makinaya yüklenecek."
  metni gösterilir ve işlem engellenmez.
- **AC-4.** Modellere dağıtılan personel kaleminde her model satırı kendi havuzunu oluşturur; kalan tutar
  ortak kovaya düşer.
- **AC-5.** Ataması olmayan personel kalemi ortak kovada kalır ve ayın üretilen makinalarına eşit dağılır.
- **AC-6.** Kira davranışlı kalemde atama seçenekleri görünmez; kalem ortak kalır. (Bu kriter bugünkü
  davranışı korur, yani **regresyon korumasıdır**: kira için atama açılmadı.)
- **AC-7.** Dört kovanın toplamı, atama yapılmış personel kalemleri varken de dönem gider toplamına eşittir.
- **AC-8.** Makinaya atanmış bir personel kalemi, o makinanın maliyet detayında doğrudan gider satırında
  görünür.
- **AC-9.** Maliyetin veya giderin makina bazında gösterildiği **her ekranda** (maliyet detayı, dönem
  raporunun makina ve model kırılımı, kârlılık listesi) çalışan adı ve çalışan bazlı tutar gösterilmez;
  gizlilik kuralı korunur. (R2) "Çalışan bazlı tutar" burada çalışanın adıyla eşleşen tutar ve resmi/elden kırılımıdır;
  kalemin toplam tutarı "Personel gideri" etiketiyle görünür (AC-8).
- **AC-10.** Atanmış personel kalemi hiçbir yazdırma veya dışa aktarma çıktısına girmez.
- **AC-11.** Personel kalemi bir makinaya atanmışken makina silinirse, kalem ortak gidere döner (mevcut
  kural aynen işler).
- **AC-12.** Personel kalemi "dağıtılmasın" işaretlendiğinde hiçbir makinanın maliyetine girmez.
- **AC-13.** Personel kaleminde model dağılımının tabanı resmi ve elden tutarların toplamıdır: resmi 30.000
  ile elden 20.000 girilmiş bir kalemde 50.000 ₺'ye kadar dağıtım "aşım" hatası vermez, üstü hata verir ve
  dağıtılmayan kısım için ortak gidere yazılacağı bilgisi gösterilir.
- **AC-14.** Makinaya atanmış bir personel kaleminin makinası silindiğinde dönem raporundaki "düşen
  atamalar" uyarısında o kalem görünür.
- **AC-15.** Makina ve model kırılımında atanmış personel kalemi "Personel gideri" etiketiyle görünür;
  açıklaması boş olsa bile "—" görünmez ve çalışan adı yazılmaz.
- **AC-16.** Tekrarlayan personel tanımında atama seçenekleri görünmez; o tanımdan üretilen kalem ortak
  gider olarak oluşur (X5).

---

## Definition of Done

- [x] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [x] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [x] Kova kuralı yalnız 0001'in motorunda değişti; ikinci bir dağıtım yolu yazılmadı (C1).
- [x] Dört kova toplamının bozulmadığı testle gösterildi (AC-7); `gider.test.js`'teki kova eşitliği bloğuna
      **personel atamalı** bir senaryo eklendi (makinaya atanmış personel + kısmi model dağılımı +
      dağıtılmayan personel aynı dönemde).
- [x] Gizlilik testi genişletildi: atanmış personel kaleminin çıktılara sızmadığı sabitlendi (AC-10).
- [x] Kullanıcıya görünen tüm metinler Türkçe.
- [x] Görsel kanıt eklendi (`docs/evidence/0020-*.jpg`): uyarı metniyle personel kalem formu, makina
      kırılımında personel satırı, maliyet detayında personel satırı.
- [x] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [x] `CLAUDE.md`'deki "kira/personel her zaman ortak" ifadesi güncellendi.
- [x] Tamamlanmış spec'lerdeki artık geçersiz ifadelere tarihli güncelleme notu düşüldü (R2: `specs/done/0001`'de analistin
      commit edilmemiş değişikliği olduğu için commit'e yalnız bu not alınır):
      `specs/done/0002` R21 ve `specs/done/0001` R21 ("kira ve personel atanamaz"); ikisi de bu spec'e
      atıf yapar.
- [x] Takım Yöneticisi onayladı. Commit ve sürüm yayını yalnız açık talimatla.
- [x] SCORECARD dolduruldu ve spec `specs/done/` klasörüne taşındı.

---

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Spec revizyon sayısı** | 0 | R2 onay anında işlendi (plan kararları P1–P9); onaydan sonra Requirements, Constraints ve AC değişmedi. Onaylandıktan sonra Requirements, Constraints veya Acceptance Criteria kaç kez değişti? |
| **Düzeltme turu sayısı** | 1 | Triyaj: üç düşük önemli bulgu (kanıt, atıf, yorum), kod davranışı değişmedi. İş kaç kez geri döndü? |
| **Bulgu gerçek/gürültü oranı** | 3 / 0 | Üçü de gerçek ama düşük: eksik kanıt ekranı, done'a taşınmadan önce kırık görünen atıflar, gerekçesiz bilinçli kapı. | Gözden geçirmede çıkan bulgulardan kaçı gerçek sorundu? |
| **Regresyon sayısı** | 0 | Tam koşu yeşil; 208 ekranın değişmeyen 198'i 0 piksel. Bu iş yüzünden bozulan, daha önce çalışan davranış sayısı. |
| **Kaçan hata** | 0 | Kapanış anında bilinen yok. Gerçek uygulamada sonradan bulunan hata sayısı. |

**Bu spec'ten çıkarılan ders:**

- Kod taraması spec'in saymadığı dört yeri buldu (dönem raporunun atama sütunu, "Ortak gider" alt yazısı, maliyet detayının
  "Malzeme payları" etiketi, açıklamada çalışan adı). Kural değişikliği yapan spec'lerde kuralın **metin olarak** yansıdığı
  yerler de aranmalı; kodu değiştirmek yetmez.
- Kanıt ekranı eklerken çekimin istenen durumu gerçekten gösterdiğine bakılmalı: ilk çekimde araç satır içindeki düğmeye
  değil satıra tıkladığı için personel grubu kapalı kaldı ve fark yanlış yerden geldi. Araca `dugme:` adımı eklendi.
- Kalem tarihi ile üretim tarihi ilişkisi (model havuzu yalnız sonraki üretime pay verir) test verisinde ilk seferde
  gözden kaçtı; motorun zaman kuralları test verisi kurulurken plan dayanaklarında yazılı olmalı.
