# 0045 — Tutar Alanlarında Binlik Ayracı ve Form Düğmeleri Arasındaki Boşluk

| | |
|---|---|
| **Durum** | Tamamlandı (2026-09-29; commit `1951b35`, dal `feat/0045-tutar-bicimi`; plan `specs/done/0045-uygulama-plani.md` Q1–Q10) |
| **Sahip** | Analist (spec) · geliştirme sahibi atanacak |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Gider ve Kasa formlarındaki tutar girişi (`TutarInput`), bütün pencere formlarının alt düğme satırı (`Modal`), tasarım sözlüğü |
| **Bağımlı spec'ler** | 0009 (tasarım sözlüğü) · 0015 (form birliği) · 0001, 0024 (tutar alanlarının sahibi) |
| **Revizyon** | R2 (2026-09-29, plan onayı): durumda ham metin saklanır, biçim yalnız görünümdedir (R7/Q1); yazarken elle girilen nokta binlik sayılır, yapıştırmada bugünkü `tutarCoz` kuralı geçer (R2, R5/Q2); oran alanı `%` simgesinden tanınır (R9/Q3); üçüncü ondalık hane yazılamaz, gelen değer kesilmez (R2/Q4); geçersiz girdi biçimlenmez (AC-10/Q5); ayraç silme kuralı (R6/Q6); imleç testinin yeri (R3/Q7); boşluk değeri ve mevcut sarmalayıcılar (R11, R12/Q8); değişen test beklentileri (R1/Q9); görsel kanıt (Q10). |

---

## Intent

Gerçek kullanımda iki görsel kusur bildirildi ve ikisi de aynı sınıftan: kullanıcının her gün baktığı
form yüzeyi kendi içinde tutarsız.

**Birincisi, tutar yazarken rakam basamaklanmıyor.** Kira formunda "80000" yazıldığında alan aynen
"80000" gösteriyor, oysa iki santim sağdaki Hesap Özeti aynı sayıyı "80.000 ₺" diye yazıyor. Personel
formunda "39500" ve "100000" yazılırken altındaki "Kalem tutarı" satırı "139.500 ₺" gösteriyor. Aynı
ekranda aynı sayı iki farklı biçimde duruyor; kullanıcı girdiği rakamın doğru olup olmadığını saymak
zorunda kalıyor ve bir basamak fazla ya da eksik yazmak görünmez hale geliyor.

**İkincisi, form pencerelerinin altındaki İptal ile Kaydet düğmeleri bitişik duruyor**, aralarında hiç
boşluk yok. İki düğme tek bir blok gibi görünüyor ve yanlış düğmeye basma riski artıyor.

Başarı şu demek: tutar yazılırken de okunurken de aynı biçimde görünüyor, ve hiçbir pencerede düğmeler
birbirine yapışık durmuyor.

---

## Requirements

### A. Tutar alanlarında binlik ayracı

- **R1.** Tutar alanı yazarken binlik ayracı gösterir: "80000" yazıldığında alanda "80.000" görünür.
- **R2.** Kuruş girişi bozulmaz: virgülle ondalık yazılabilir, en çok iki hane; "1.234,56" geçerlidir.
  **Uygulama (R2, Q2, Q4):** yazarken elle girilen nokta binlik ayracı sayılır ve yok sayılır (ayraç zaten
  otomatik gelir; "80.000" yazan yine 80.000 kaydeder); ondalık virgülle yazılır. **Bilinçli sapma:** bugün
  "12.5" harf harf yazılınca 12,5 kaydediliyordu, artık 125 olur; noktayı virgüle çevirmek "80.000" yazanı
  80'e düşürürdü. Yapıştırmada ve alanın bütünüyle değiştiği durumda `tutarCoz` kuralı aynen geçer (R5).
  Üçüncü ondalık hane yazılamaz (tuş etkisiz); yapıştırılan ya da kayıttan gelen 3+ haneli değer kesilmez.
- **R3.** Yazarken **imleç konumu korunur.** Sayının ortasına rakam eklendiğinde imleç sona atlamaz;
  ayraç eklenmesi imlecin bulunduğu basamağı kaydırmaz.
- **R4.** Yarım kalan girdi bozulmaz: "80000," ya da "1.234,5" yazılırken alan kullanıcının yazdığını
  silmez ve virgülü kaybetmez.
- **R5.** Yapıştırma çalışır: "1.234,56", "1234,56" ve "1234.56" yapıştırıldığında aynı tutar okunur.
- **R6.** Silme çalışır: geri silme tuşu ayracın üzerinden geçerken bir rakam siler, kullanıcı aynı yeri
  iki kez silmek zorunda kalmaz.
- **R7.** **Saklanan değer değişmez.** Biçimleme yalnız görünümdedir; form durumu ve kayıt bugünkü
  yoldan geçer (kuruş tamsayısı, `parseMoney`/`tutarCoz` kuralları aynı).
  **Uygulama (R2, Q1, Q5):** form durumu **ham** metni tutar (rakamlar, en çok bir virgül, noktasız:
  "80000", "1234,56"); biçim yalnız görünümdedir. Ham metin bugün de geçerli girdilerin alt kümesidir, bütün
  çözümleyiciler aynı sonucu verir. Geçersiz karakter içeren metin biçimlenmeden olduğu gibi durur.
- **R8.** Düzeltme **bir yerde** yapılır (`TutarInput`), böylece onu kullanan bütün ekranlar aynı anda
  düzelir: gider kalemi formu, tekrarlayan gider tanımı, standart giderler, tedarikçi ve çalışan
  maliyet alanları, ödeme kayıt penceresi, çalışan avansı, çek ciro penceresi, Kasa hesap formu.
- **R9.** **Oran alanları ayracı almaz:** stopaj oranı ve KDV oranı yüzdedir, binlik ayracı yanlış olur.
  **Uygulama (R2, Q3):** `TutarInput` `sym="%"` ise ayraç koymaz; çağrı yerlerine dokunulmaz.

### B. Form düğmeleri arasındaki boşluk

- **R10.** Pencere formlarının alt düğme satırında düğmeler arasında boşluk olur; İptal ile Kaydet
  birbirine yapışık durmaz.
- **R11.** Boşluk **kabın kendisinden** gelir, her formun tek tek yazmasından değil. Yeni bir form
  yazan geliştirici bunu unutabilir olmaktan çıkar.
- **R12.** Bugün boşluğu kendi içinde veren formların görünümü değişmez (çift boşluk oluşmaz).
  **Uygulama (R2, Q8):** kabın boşluğu `gap: 8` (0015 sarmalayıcısıyla aynı); mevcut sarmalayıcılar
  kaldırılmaz (tek çocuklu kapta boşluk görünmez), sözlük artık gerekmediklerini yazar.
- **R13.** Düğmelerin sırası ve hizası değişmez: İptal ya da Vazgeç solda, birincil düğme en sağda.
- **R14.** Kural tasarım sözlüğünde güncellenir; "kap boşluk vermez, her form kendi sarmalayıcısını
  yazar" cümlesi yerini yeni kurala bırakır.

---

## Constraints

- **C1.** Hiçbir tutarın **değeri** değişmez; bu iş yalnız görünümü düzeltir. Kayıtlı veriye
  dokunulmaz, göç yoktur.
- **C2.** **Tek gerçek kaynak:** biçimleme ve çözümleme tek yerde durur; ekranlar kendi biçimleme
  kopyasını yazmaz.
- **C3.** Türkçe biçim kuralı: binlik ayracı nokta, ondalık ayracı virgül (uygulamanın her yerinde
  olduğu gibi).
- **C4.** Klavye ve erişilebilirlik bozulmaz: alan yine sayısal klavye açar, etiketi ve hata metni
  aynen çalışır.
- **C5.** Gider modülünün yayın perdesi (0008) bu işi etkilemez; düzeltme perde arkasında da geçerlidir.
- **C6.** Kullanıcıya görünen metinler Türkçedir.

### KAPSAM DIŞI

- **X1.** `ui.jsx` içindeki `MoneyInput`'un değiştirilmesi — *neden:* o alan tam sayı çalışıyor ve
  müşteri, finans ve evrak formlarında kullanılıyor; davranışını değiştirmek bu iki kusurun kapsamını
  aşar. Bu iş yalnız kuruşlu `TutarInput`'u düzeltir.
- **X2.** İki tutar girdisinin (tam sayılı `MoneyInput` ve kuruşlu `TutarInput`) tek bileşende
  birleştirilmesi — *neden:* ayrı bir sadeleştirme işi; önce ikisi de doğru davransın.
- **X3.** Para birimi simgesinin ya da alan yerleşiminin değiştirilmesi — *neden:* bildirilen kusur
  değil.
- **X4.** Tutar alanlarında hesap makinesi, artırma azaltma okları ya da otomatik yuvarlama — *neden:*
  istenmedi.
- **X5.** Alt düğme satırının yeniden tasarlanması (renk, boyut, sıra) — *neden:* R13; yalnız boşluk
  eklenir.
- **X6.** Pencere dışındaki satır içi form düğmeleri — *neden:* bildirilen kusur pencere formlarında.

---

## Context

- **Tutar alanı ham metin (doğrulandı).** `src/components/gider/GiderAlanlari.jsx` içindeki
  `TutarInput` kullanıcının yazdığını olduğu gibi gösteriyor; biçimleme yok. Yanındaki özet kutuları
  ise `fmtTL`/`fmtCur` ile basamaklıyor. Ekrandaki çelişki buradan doğuyor.
- **Neden ayrı bir bileşen var.** `src/components/ui.jsx` içindeki `MoneyInput` binlik ayracını zaten
  gösteriyor ama **tam sayı**: girdiyi rakam dışı her şeyden temizleyip `parseInt` ediyor, yani kuruş
  yazılamıyor. Gider tarafı kuruşla çalıştığı için kendi alanını yazmış ve basamaklamayı almamış.
  Yani bu bir unutma, bilinçli bir sadelik kararı değil.
- **Kaç yeri düzeltir.** `TutarInput`'u on dosya kullanıyor: `GiderForm`, `SettingsGiderTanimlari`,
  `SettingsGider`, `StandartGiderler`, `CalisanManager`, `OdemeKayitPenceresi`, `CalisanAvanslari`,
  `Kasa`, `CiroPenceresi` ve `GiderAlanlari`'nın kendisi. Tek yerde düzeltmek hepsini kapsar (R8).
- **İmleç tuzağı.** Biçimlenen girdilerde klasik hata, her tuş vuruşunda metnin yeniden yazılması ve
  imlecin sona atlamasıdır. Kullanıcı sayının ortasını düzeltmek istediğinde alan kullanılamaz hale
  gelir. R3 bu yüzden kabul kriteri düzeyinde yazıldı; düzeltme bunu ölçmeden bitmiş sayılmaz.
- **Düğme boşluğunun kök sebebi (doğrulandı).** `Modal`'ın alt kabı `display: flex` ve
  `justifyContent: flex-end` ile çiziliyor, **boşluk vermiyor**. 0015 bu yüzden her formun düğmelerini
  `<div style={{ display: "flex", gap: 8 }}>` içine koymasını şart koştu. On dört form bunu yapıyor,
  **altı form yapmıyor**: `GiderForm`, `SettingsGiderTanimlari`, `GiderTurManager`, `Tedarikciler`,
  `StandartGiderler` ve `UserManager`. Beşi gider tarafında, çünkü o ekranlar 0015'ten sonra yazıldı.
- **Kuralı yapıya çevirmek.** Aynı hatanın altı kez tekrarlanması, kuralın yanlış yerde durduğunu
  gösteriyor. Boşluğu kabın kendisine vermek hatayı imkânsız kılar ve bugün sarmalayıcı kullanan
  formlarda bir şeyi bozmaz: kabın tek çocuğu varken boşluk zaten görünmez (R12). Bu, 0009'un kurduğu
  "kuralı sözlükte topla" yaklaşımının bir adım ilerisi: kuralı bileşenin kendisine gömmek.
- **Görsel kanıt.** İkisi de görünüm değişikliği. Tutar alanı ve pencere altı bütün form ekranlarında
  bulunduğu için kanıt kayıtları 0 piksel fark bekleyemez; ilgili kayıtlar `beklenen: "degisti"` ve
  Takım Yöneticisi onayıyla işaretlenir.

---

## Acceptance Criteria

- **AC-1.** Tutar alanına "80000" yazıldığında alanda "80.000" görünür.
- **AC-2.** "1234,56" yazıldığında alanda "1.234,56" görünür ve kuruş korunur.
- **AC-3.** Sayının ortasına rakam eklendiğinde imleç eklenen rakamın sağında kalır, sona atlamaz.
- **AC-4.** "80000," yazılırken virgül silinmez ve alan kullanıcının yazdığını korur.
- **AC-5.** "1.234,56" yapıştırıldığında aynı tutar okunur; "1234.56" yapıştırıldığında da aynı tutar
  okunur.
- **AC-6.** Geri silme tuşu ayracın üzerinden geçerken tek vuruşta bir rakam siler.
- **AC-7.** Kaydedilen tutar biçimlemeden etkilenmez: aynı giriş, düzeltme öncesi ve sonrasında aynı
  kuruş değerini kaydeder.
- **AC-8.** Düzenleme için açılan kayıtta tutar biçimli görünür ve değiştirilmeden kaydedilirse değeri
  değişmez.
- **AC-9.** Boş alan boş kalır, sıfır yazılmaz.
- **AC-10.** Geçersiz giriş bugünkü hata metnini aynen üretir.
- **AC-11.** Stopaj oranı ve KDV oranı alanları binlik ayracı almaz.
- **AC-12.** Gider kalemi formu, ödeme kayıt penceresi, çalışan avansı, çek ciro penceresi ve Kasa
  hesap formundaki tutar alanlarının hepsi basamaklı görünür.
- **AC-13.** Gider kalemi formunun altında İptal ile Kaydet arasında boşluk vardır.
- **AC-14.** Tekrarlayan gider tanımı, gider türü, tedarikçi, standart gider ve kullanıcı yönetimi
  pencerelerinde de düğmeler arasında boşluk vardır.
- **AC-15.** Bugün kendi sarmalayıcısını kullanan formlarda boşluk iki katına çıkmaz.
- **AC-16.** Düğme sırası ve hizası değişmez: ikincil solda, birincil en sağda.
- **AC-17.** Tek düğmeli pencerelerin görünümü değişmez.

---

## Definition of Done

- [x] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [x] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [x] Biçimleme ve çözümleme tek yerde; ekranlarda kopya yok (C2, kaynak taraması testi).
- [x] İmleç davranışı testle ölçüldü (AC-3, AC-6); elle denendiği notu yeterli değildir.
- [x] Kaydedilen değerlerin değişmediği çapraz testle gösterildi (AC-7, AC-8).
- [x] Boşluk kabın kendisinden geliyor; altı formda tek tek sarmalayıcı eklenmedi (R11).
- [x] `docs/tasarim-sozlugu.md` alt düğme satırı kuralıyla güncellendi (R14).
- [x] Görsel kanıt eklendi (`docs/evidence/0045-*.jpg`): basamaklı tutar alanı, düğme satırı;
      aydınlık ve karanlık tema. Kanıt eşlemesindeki kayıtlar `beklenen: "degisti"` ve TY onayıyla
      işaretlendi.
- [x] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [x] `CLAUDE.md` güncellendi: tutar girdisinin biçimlemesi ve `Modal` alt kabının boşluk verdiği
      yazıldı (0015'in eski cümlesi düzeltildi).
- [x] Takım Yöneticisi onayladı. Commit ve sürüm yayını yalnız açık talimatla.
- [x] SCORECARD dolduruldu ve spec `specs/done/` klasörüne taşındı.

---

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Spec revizyon sayısı** | 0 | R2 plan onayı anında işlendi (elle yazılan noktanın anlamı, R2'ye bilinçli sapma olarak yazıldı). Onaylandıktan sonra değişiklik olmadı. |
| **Düzeltme turu sayısı** | 0 | Triyaj turu olmadan kapandı. İş kaç kez geri döndü? |
| **Bulgu gerçek/gürültü oranı** | 0 / 0 | Gözden geçirme bulgusu yok. |
| **Regresyon sayısı** | 0 | Ekranda ham tutar bekleyen 12 test satırı R1 gereği biçimli değere döndü; kuruş beklentileri değişmedi. Harf harf "12.5" girişinin anlamı bilinçli sapmadır (R2). |
| **Kaçan hata** | 0 | Kapanış anında bilinen yok. Gerçek uygulamada sonradan bulunan hata sayısı. |

**Bu spec'ten çıkarılan ders:** Biçimli girdide asıl karar görünüm değil **anlam**dır: aynı nokta karakteri yazarken binlik, yapıştırırken ondalık olabiliyor; bu ayrım saf fonksiyonda açıkça (tek karakter = yazma, uzun ekleme = yapıştırma) ve durumda ham metinle kurulunca bütün tüketiciler ve kayıt yolu dokunulmadan kaldı. İkincisi: bir kural altı kez unutulduysa yeri yanlıştır; boşluğu belgeden bileşene taşımak (kabın `gap`'i) tekrar olasılığını sıfırladı ve mevcut sarmalayıcılarla çakışmadı.
