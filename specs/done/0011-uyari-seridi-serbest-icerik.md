# 0011 — Uyarı Şeridine Serbest İçerik

| | |
|---|---|
| **Durum** | Tamamlandı (2026-09-24; kod commit `907a280`, dal `feat/0011-uyari-seridi-serbest`; plan `specs/done/0011-uygulama-plani.md` S1–S10) |
| **Sahip** | Analist (spec) · geliştirme sahibi atanacak |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Paylaşılan tasarım sözlüğü (uyarı şeridi), sözlük belgesi |
| **Bağımlı spec'ler** | **0009** (sözlüğün kendisi) |
| **Revizyon** | R1 (2026-09-24, plan onayı): çağrı sayısı 7 → 6 düzeltildi (Context, AC-2, DoD; S4); serbest içeriğin prop'u (`children`) ve metin rengi (ailenin 800 tonu) R1'e yazıldı (S1, S2); "verilmiş" tanımı (S3); kanıt biçimi JPEG + piksel raporu (DoD; S7); sözlükte serbest içerik örneğinin 0010'a bırakılması (R5; S8).  R2 (2026-09-24, onay sonrası): 0010'un önünü açmak için iki düzeltme: C3'e tek istisna (0009'un kanıt eşlemesi testi veri dosyasına taşındı, AC-11) ve sözlükteki ilk kullanım notunun 0010'a iş bırakmayacak biçimde yazılması (R5, AC-12). Analist incelemesinde iki kural eklendi: `onay` biçimi ve `degisti` sıfırlama kuralı (AC-11b, AC-11c). |

---

## Intent

Tasarım sözlüğündeki uyarı şeridi bugün tek bir cümle kalıbı dayatıyor: kalın bir başlık, altında
ayrı satırda açıklama. Uygulamadaki gerçek uyarıların bir kısmı bu kalıba girmiyor; vurgulanan
parça cümlenin ortasında duruyor. İlk somut örnek Müşteriler ekranındaki gruplu görünüm şeridi ve
aynı ihtiyaç sonraki ekran dönüşümlerinde de çıkacak.

Bu küçük boşluk kapatılmazsa ekran dönüşümleri iki kötü seçenekten birine zorlanır: ya kullanıcının
gördüğü cümle yeniden yazılır, ya o ekrana özel ikinci bir şerit yazılır. İkincisi sözlüğün varlık
sebebini ortadan kaldırır. Bu iş, dönüşümler başlamadan önce sözlüğü o ihtiyaca hazırlar.

Başarı şu demek: uyarı şeridi hem bugünkü başlık artı açıklama biçimini hem de serbest içeriği
destekliyor, mevcut kullanımların hiçbiri değişmemiş, ve hangi biçimin ne zaman kullanılacağı
sözlük belgesinde yazılı.

---

## Requirements

- **R1.** Uyarı şeridi, bugünkü **başlık artı açıklama** biçiminin yanı sıra **serbest içerik** kabul eder;
  böylece cümle içinde vurgu taşıyan bir uyarı olduğu gibi çizilebilir. (R1, S1–S3) Serbest içerik bileşenin
  `children`'ı olarak verilir ve çizilebilir bir değerse (`null`, `undefined`, `false`, `""` dışında) serbest biçim
  kullanılır. Serbest içeriğin metin rengi **ailenin 800 tonudur** (`blu800` / `amb800` / `grn800`); cümle içindeki
  vurgu aynı rengi miras alır. Bu, uygulamadaki renkli zeminli serbest metin kutularının bugünkü deseni ve ilk tüketicinin
  (Müşteriler gruplu görünüm şeridi) bugünkü rengidir.
- **R2.** Bugünkü çağrılar **değişmeden** çalışır ve aynı görünür. Serbest içerik bir ek yetenektir,
  varsayılan biçim değildir.
- **R3.** Şeridin geri kalan davranışı korunur: `role="status"`, üç renk ailesi (bilgi, uyarı, başarı),
  tanımsız ailenin bilgi ailesine düşmesi ve dışarıdan verilen test kancası.
- **R4.** İki biçim aynı çağrıda birlikte verilirse davranış **tanımlıdır**: serbest içerik çizilir, başlık
  ve açıklama yok sayılır. Sessizce iki biçimi birleştirmek veya hata vermek yoktur.
- **R5.** Sözlük belgesi güncellenir: serbest içeriğin ne zaman kullanılacağı ve ne zaman
  kullanılmayacağı yazılır. Varsayılan biçim başlık artı açıklamadır; serbest içerik yalnız cümle içi
  vurgu gerektiğinde kullanılır. (R1, S8) Serbest içeriğin henüz gerçek bir kullanımı olmadığı için sözlük bu biçim
  için dosya:satır örneği vermez, "ilk kullanım: spec 0010" notunu taşır. (R2) Not kalıcıdır ve 0010'a iş bırakmaz
  (0010 DoD: bu ekranda sözlüğe dokunulmaz); gerçek dosya:satır örneği sözlüğe bir sonraki dokunuşta eklenebilir, zorunlu değildir.
- **R6.** Yeni bir yapı taşı eklenmez ve ikinci bir uyarı şeridi bileşeni doğmaz; değişiklik mevcut
  bileşenin içindedir.

---

## Constraints

### Uyulması zorunlu

- **C1.** **Davranış değişikliği yasak.** Mevcut kullanımların görünümü, metni ve erişilebilirlik
  nitelikleri aynı kalır.
- **C2.** Yeni bağımlılık eklenmez; uygulamanın satır içi stil deseni korunur.
- **C3.** Mevcut testler **değiştirilmeden** geçmelidir. (R2) **Tek istisna** `tests/tasarim-kaynak.test.js`'in 0009 AC-12
  bloğudur: dosya → kanıt ekranı eşlemesi test dosyasının içinden `docs/evidence/kanit-eslemesi.json` veri dosyasına
  taşınır. Test aynı kuralı uygulamaya devam eder (kullanan her dosyanın kaydı var; kaydın gösterdiği raporda ekran iki
  temada çizim hatasız ve 0 fark). Gerekçe: eşleme test dosyasında durdukça sözlüğü kullanmaya başlayan her ekran
  dönüşümü (ilki 0010) mevcut bir test dosyasını değiştirmek zorunda kalıyor ve ekranını 0009'un raporuna bağlamak
  zorunda kalıyordu; bu, 0010 C4 ile çelişiyordu.
- **C4.** Kullanıcıya görünen metinler Türkçedir ve bu işte hiçbir metin değişmez.
- **C5.** Serbest içerik, her ekranın kendi düzenini kurması için bir kapı değildir; kullanım kuralı
  sözlük belgesinde yazılıdır ve dönüşüm işleri ona uyar (R5).

### KAPSAM DIŞI

- **X1.** Kırmızı (hata) renk ailesinin eklenmesi — *neden:* 0009'da bilinçli olarak dışarıda bırakıldı;
  alan hatası için hata metni bileşeni var. Bu iş o kararı değiştirmez.
- **X2.** Sözlüğün diğer beş yapı taşına serbest içerik eklenmesi — *neden:* bugün somut bir ihtiyaç yok;
  çıkarsa kendi işinde tartışılır.
- **X3.** Mevcut çağrıların serbest içeriğe taşınması — *neden:* hepsi bugünkü biçime uyuyor, dokunmanın
  kazancı yok.
- **X4.** Ekran dönüşümlerinin kendisi — *neden:* 0010 ve sonrasının işi; bu spec yalnız sözlüğü hazırlar.

---

## Context

Kodda doğrulanmış mevcut durum:

- **Bileşen** `src/components/tasarim.jsx:104`'te. `aile`, `baslik`, `metin` ve `testId` alıyor; başlığı
  kalın çiziyor, açıklamayı başlığın altında ayrı bir satır olarak veriyor. `role="status"` taşıyor.
- **Bugünkü kullanım dar.** Şerit (R1: yedi değil) altı yerden çağrılıyor ve hepsi `src/components/Giderler.jsx` içinde;
  yani bu değişikliğin dokunacağı yüzey küçük ve regresyon riski düşük.
- **Sözlük belgesi var** (`docs/tasarim-sozlugu.md`) ve bileşenin alanlarını, ne zaman kullanılacağını ve
  kullanılmayacağını yazıyor. R5 bu belgeye yeni biçimi ekler.
- **İlk somut ihtiyaç** Müşteriler ekranındaki gruplu görünüm şeridi: cümlenin ortasında kalın bir parça
  var ("Firmaya göre gruplu görünüm: **N firma** (M makina kaydı). Birden fazla makinası olan firmaya
  tıklayınca tüm makinaları listelenir."). Bugünkü bileşen bu cümleyi aynı biçimde çizemiyor
  (`src/components/Customers.jsx`, gruplu görünüm bilgi kutusu). 0010 bu işin ilk tüketicisidir.

Bilinen tuzaklar:

- **Sessiz görünüm kayması.** Bileşene yeni bir dal eklenirken mevcut dalın dolgu, köşe veya renk değeri
  değişirse yedi çağrının hepsi sessizce kayar; C1 bu yüzden gereksinimdir.
- **Kapının açık kalması.** Serbest içerik, kullanım kuralı yazılmazsa "her ekran kendi şeridini çizsin"e
  dönüşür ve sözlüğün amacı kaybolur (C5, R5).

---

## Acceptance Criteria

- **AC-1.** Serbest içerik verilen bir uyarı şeridi, verilen içeriği olduğu gibi çizer; cümlenin ortasındaki
  kalın parça kalın kalır.
- **AC-2.** Bugünkü (R1) altı çağrı dönüşümden sonra aynı görünür: aynı zemin, kenarlık, dolgu, kalın başlık ve
  açıklama satırı.
- **AC-3.** Serbest içerikli şerit de `role="status"` taşır ve dışarıdan verilen test kancasını korur.
- **AC-4.** Üç renk ailesi serbest içerikle de çalışır ve zemin ile kenarlık renkleri aile başına aynıdır.
- **AC-5.** Serbest içerikli bir çağrıda tanımsız bir renk ailesi verildiğinde şerit hata vermez, bilgi
  ailesiyle çizilir.
- **AC-6.** Aynı çağrıda hem serbest içerik hem başlık ve açıklama verildiğinde serbest içerik çizilir,
  başlık ve açıklama yok sayılır.
- **AC-7.** Sözlük belgesi serbest içeriğin ne zaman kullanılacağını ve ne zaman kullanılmayacağını yazar;
  varsayılan biçimin başlık artı açıklama olduğu belirtilir.
- **AC-8.** Uygulamada ikinci bir uyarı şeridi tanımı bulunmaz.
- **AC-9.** Mevcut testler **değiştirilmeden** geçer.
- **AC-10.** Karanlık temada serbest içerikli şeridin metni okunabilir ve kenarlığı görünür.
- **AC-11.** (R2) Tasarım sözlüğünü kullanan dosyaların kanıt eşlemesi `docs/evidence/kanit-eslemesi.json`'dadır; eşlemesi
  olmayan bir kullanan dosya eklendiğinde test kalır, kaydın gösterdiği rapordaki ekran iki temada çizim hatasızdır ve
  varsayılan olarak 0 farktır. Bilinçli bir görünüm değişikliği (ör. 0010'un yeni tasarımı) kayıtta `beklenen: "degisti"`
  ve bir `onay` gerekçesiyle belirtilir; onaysız "değişti" kaydı testte kalır.
  Yeni bir ekran dönüşümü kendi kaydını ve raporunu bu dosyaya ekleyerek, hiçbir test dosyasına dokunmadan uyar.
- **AC-11b.** (R2) `onay` metni şu biçimdedir: **`Takım Yöneticisi · <YYYY-AA-GG> · spec <no> <madde>`**
  (örnek: `Takım Yöneticisi · 2026-09-24 · spec 0010 AC-12`). Onayı **Takım Yöneticisi** verir; geliştirici veya
  analist kendi başına `degisti` kaydı açamaz. Tarih, farkın ne zaman kabul edildiğini; spec ve madde, hangi kararla
  kabul edildiğini gösterir.
- **AC-11c.** (R2) **`degisti` kalıcı bir muafiyet değildir.** Bir ekran dönüşümü tamamlanıp spec'i `specs/done/`
  klasörüne taşınırken o spec'in açtığı bütün `degisti` kayıtları `ayni`ye çevrilir ve yeni görünüm taban alınır.
  Aksi hâlde o ekran bir daha korunmaz: sonraki bir işte istemeden bozulsa test fark etmez.
- **AC-12.** (R2) Sözlükteki serbest içerik notu ilk kullanımı (spec 0010) kalıcı olarak adlandırır ve sonraki bir işe
  zorunlu sözlük değişikliği bırakmaz.

---

## Definition of Done

- [ ] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor (görsel olanlar kanıt görüntüsüyle).
- [ ] Mevcut test dosyalarına **hiç dokunulmadı**; PR'ın dosya listesinden görülüyor (C3).
- [ ] Bugünkü (R1) altı çağrının görünümünün değişmediği önce ve sonra görüntüsüyle gösterildi
      (`docs/evidence/0011-*.jpg`), aydınlık ve karanlık tema dâhil. (R1, S7) Depoya yan yana küçültülmüş JPEG'ler ve piksel
      raporu (`docs/evidence/0011-piksel-raporu.json`) konur; karşılaştırma tam çözünürlüklü PNG'lerle yapılır, doğrulamak
      için `scripts/evidence/0009-calistir.mjs` yeniden çalıştırılır.
- [ ] İki biçimin birlikte verildiği durumun tanımlı davranışı testle sabitlendi (AC-6).
- [ ] `docs/tasarim-sozlugu.md` güncellendi ve kullanım kuralı yazıldı (R5, AC-7).
- [ ] Yeni bağımlılık eklenmedi ve ikinci bir şerit tanımı doğmadı (C2, AC-8).
- [ ] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [ ] Takım Yöneticisi onayladı. Commit ve sürüm yayını yalnız açık talimatla.
- [ ] SCORECARD dolduruldu ve spec `specs/done/` klasörüne taşındı.

---

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Spec revizyon sayısı** | 1 | R2 (onay sonrası): C3'e tek istisna ile kanıt eşlemesinin veri dosyasına taşınması (AC-11), `beklenen`/`onay` alanları, kalıcı sözlük notu (AC-12); analist incelemesiyle aynı revizyona AC-11b (onay biçimi) ve AC-11c (done'a taşırken `degisti` → `ayni`) eklendi. R1 plan turunda, onayla eş zamanlıydı, sayılmaz. |
| **Düzeltme turu sayısı** | 1 | İş bir kez geri döndü: uygulama bittikten sonra 0010 taslağıyla karşılaştırmada iki çakışma bulundu (R2) ve analist incelemesi iki kural ekledi; aynı gün kapatıldı. |
| **Bulgu gerçek/gürültü oranı** | 3 / 0 | Üçü de gerçekti ve hepsi 0010'u kilitliyordu: 0009'un kanıt testi eşlemeyi test dosyasında tutuyordu (her dönüşüm mevcut bir testi değiştirmek zorunda kalacaktı); ilk düzeltmedeki "her kayıt 0 fark" kuralı 0010'un yeni tasarımını engelleyecekti; sözlük notu 0010'a yasak bir sözlük değişikliği bırakıyordu. |
| **Regresyon sayısı** | 0 | Bugünkü biçimin HTML'i değişiklik öncesiyle birebir aynı; altı çağrı iki temada önce/sonra 0 piksel fark (96 görüntü); C3 istisnası dışındaki mevcut testler değişmeden geçti. Son durum: 183 dosya, 1985 test, lint 0 hata. |
| **Kaçan hata** | 0 | Henüz gerçek kullanımda bulunan yok. |

**Bu spec'ten çıkarılan ders:** Sözlüğü bir tüketici (0010) için hazırlayan bir iş, tüketicinin spec'iyle **plan turunda**
karşılaştırılmalı. Buradaki üç bulgunun hiçbiri 0011'in kendi kodunda değildi; hepsi 0009'dan kalan yapının sonraki işi
nasıl kısıtladığındaydı ve ancak uygulama bittikten sonra 0010 taslağına bakınca görüldü. İkinci ders: bir koruma testini
genişletilebilir yaparken (eşlemeyi veri dosyasına almak) onu kullanacak ilk gerçek durumu da düşünmek gerekiyor; ilk hâli
"görünüm hep aynı kalır" varsayıyordu, oysa ilk tüketici bir yeniden tasarımdı. Üçüncüsü: "önce" HTML'ini değişiklikten
önce teste sabitlemek, piksel karşılaştırmasından çok daha ucuz ve her test koşusunda çalışan bir görünüm koruması oldu.
