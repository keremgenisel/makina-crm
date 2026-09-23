> Bu dosya **şablondur, doldurulmaz.** Yeni spec için kopyala:
> `specs/<dört-haneli-no>-<kebab-ad>.md` → `specs/0001-bayi-konsinye-envanteri.md`
>
> Numara sırayla verilir ve **yeniden kullanılmaz** (bitmiş spec'ler `specs/done/`e taşınır
> ama numaraları serbest kalmaz).
>
> **Spec'siz iş başlamaz.** Branch adı bu numarayı taşır (`feature/0001-bayi-konsinye-envanteri`),
> commit'ler bu numaraya atıf yapar.
>
> Kopyaladıktan sonra bu blok ve `<!-- … -->` yönergeleri silinir.

---

# <NO> — <Başlık>

| | |
|---|---|
| **Durum** | Taslak · Onaylandı · Geliştiriliyor · Tamamlandı |
| **Sahip** | <kim yürütüyor> |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | <hangi sekme / modül / saf motor — CLAUDE.md> |
| **Bağımlı spec'ler** | <numaralar, yoksa "yok"> |

---

## Intent

<!--
3-5 cümle. İŞ DİLİNDE yaz — dosya adı, tablo, alan adı, kütüphane geçmesin.
Üç soruyu cevapla:
  1. Bunu KİM istiyor? (fabrika yönetimi / servis teknisyeni / bayi sorumlusu / muhasebe)
  2. NEDEN istiyor? Şu anda hangi acıyı çekiyor, ne yapamıyor?
  3. BAŞARI neye benziyor? Bu iş bittiğinde ne değişmiş olacak — gözlemlenebilir biçimde?

Bu bölüm spec'in en önemli kısmıdır. Kabul kriterleri tartışıldığında hakem budur.
Teknik bir cümle yazdıysan, bu bölüm yanlış yazılmıştır.
-->

---

## Requirements

<!--
Numaralı liste. Her madde SİSTEMİN NE YAPACAĞINI söyler, nasıl yapacağını değil.
"Yeni bir kolon eklenir", "şu dosyada hesaplanır", "React state'inde tutulur" → hepsi yasak.
-->

- **R1.**
- **R2.**
- **R3.**

---

## Constraints

<!-- Sınırlar. "KAPSAM DIŞI" bölümü boş bırakılmaz — "yok" bile yazılsa doldurulur. -->

### Uyulması zorunlu
<!-- Mimari kural, veri bütünlüğü kuralı, geriye dönük uyumluluk, izin modeli.
     CLAUDE.md'deki bilinçli kararlara atıf yapılabilir. -->
- **C1.**
- **C2.**

### KAPSAM DIŞI
<!-- Bu spec'te BİLİNÇLİ olarak yapılmayacaklar ve NEDEN.
     Kapsam kayması buradan engellenir. -->
- **X1.** … — *neden:* …
- **X2.** … — *neden:* …

---

## Context

<!--
Geliştiricinin bilmesi gereken arka plan. Uydurma yok, kodda doğrulanmış bilgi.
  - Mevcut davranış nedir? (dosya:satır ile göster)
  - Hangi veriler ve saf motorlar etkileniyor?
  - Hangi kararlar daha önce verildi? (CLAUDE.md)
  - Bilinen tuzaklar: dört nokta DB kuralı, MERGE_KEYS, serverAuth bölüm eşlemesi,
    çoklu kullanıcı çakışması, soft-delete (deletedAt) ve çöp kutusu simetrisi.
-->

---

## Acceptance Criteria

<!--
HER SATIR TEK BAŞINA TEST EDİLEBİLİR OLMALI.

Kurallar:
  - Bir kriter bir davranış. "ve" ile bağlanan iki davranış varsa iki kriterdir.
  - Gözlemlenebilir yaz: ne girdi, ne beklenen çıktı/durum.
  - Belirsiz kelime yok: "hızlı", "kullanıcı dostu", "düzgün", "uygun şekilde".
  - Mutlu yol kadar HATA YOLU da yazılır.
  - Arayüz kriterlerinde boş durum ve hata durumu ayrı kriterlerdir.
  - Yazdırma çıktısı varsa TR ve EN ayrı kriterdir.
  - Para söz konusuysa en az bir kriter çoklu para birimini (TL/USD/EUR) ve
    bilinmeyen para biriminin nasıl ele alındığını kapsar.

Her kriter bir testle karşılanır ve testin adı "AC-<n>: <metin>" taşır.
-->

- **AC-1.**
- **AC-2.**
- **AC-3.**
- **AC-4.**

---

## Definition of Done

<!-- Hepsi işaretlenmeden spec "Tamamlandı" olmaz. Gerekirse spec'e özel madde eklenir.
     Bu liste Altunmak CRM'e uyarlanmıştır: buradaki maddelerin her biri bu projede
     gerçekten sessiz veri kaybına veya yetki açığına yol açmış sınıflardan gelir. -->

- [ ] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [ ] Hesap içeren iş, React'sız **saf motorda** yazıldı ve kendi testi var
      (`analiz.js` / `aylikRapor.js` deseni); arayüz yalnız gösteriyor.
- [ ] Aynı sayıyı üreten başka bir ekran/rapor varsa ikisi **aynı kaynağı** kullanıyor
      (Finans ile aylık raporun ayrışması bu projede iki kez hata oldu).
- [ ] Yeni kalıcı alan varsa **dört nokta kuralı** uygulandı (`SCHEMA_SQL` +
      `applyColumnMigrations` + `INSERT` + `SELECT`) ve `db-roundtrip` testine eklendi.
- [ ] Yeni veri bölümü varsa `BLOB_SECTIONS` + `SECTION_GROUP` + `BOLUM_SEKMELERI` +
      `MERGE_KEYS` + `App.mergeLocalIntoReloaded` satırı eklendi.
- [ ] Yeni eylem izni varsa sunucu tarafı (`serverAuth.cjs`), izin tanımları ve kullanıcı
      yönetimi ekranı birlikte güncellendi. Salt okunur işse **izin eklenmediği açıkça yazıldı.**
- [ ] Soft-delete edilen kayıt varsa çöp kutusu geri alma/temizleme simetrisi korundu.
- [ ] Kullanıcıya görünen tüm metinler Türkçe; yazdırma çıktısı varsa TR/EN çeviri
      anahtarları eklendi.
- [ ] Para gösteriliyorsa çoklu para kuralına uyuyor; bilinmeyen para birimi tanımlı
      biçimde ele alınıyor.
- [ ] Arayüz kriterlerinin **görsel kanıtı** eklendi (`docs/evidence/<no>-ac<n>.png`),
      boş ve hata durumları dâhil.
- [ ] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [ ] Yeni kavram veya mimari karar varsa `CLAUDE.md` güncellendi.
- [ ] Takım Yöneticisi onayladı. **Commit ve sürüm yayını yalnız açık talimatla yapılır.**
- [ ] **SCORECARD dolduruldu** ve spec `specs/done/` klasörüne taşındı.

---

## SCORECARD

<!--
İş bittikten SONRA doldurulur. Amaç suçlu bulmak değil, sürecin nerede sızdırdığını görmek.
Dürüst doldurulmayan scorecard işe yaramaz — abartılmış iyi sayılar en pahalı yalandır.

Sayılar ancak TANIMLI oldukları sürece karşılaştırılabilir. Bir ölçüt belirsiz geldiyse
sayıyı tahmin etme, tanımın netleştirilmesini öner.
-->

| Ölçüt | Değer | Not |
|---|---|---|
| **Spec revizyon sayısı** | | Onaylandıktan sonra **Requirements, Constraints veya Acceptance Criteria** kaç kez değişti? Açıklayıcı not eklemek de sayılır: nete ihtiyaç duyan kural, eksik yazılmış kuraldır. Intent, Context, kapsam dışı gerekçeleri ve SCORECARD değişiklikleri **sayılmaz**. Yüksekse spec eksik yazılmıştır. |
| **Düzeltme turu sayısı** | | İş kaç kez geri döndü? Yüksekse kriterler belirsizdir veya iş çok büyüktür. |
| **Bulgu gerçek/gürültü oranı** | / | Gözden geçirmede çıkan bulgulardan kaçı gerçek sorundu, kaçı gürültü? |
| **Regresyon sayısı** | | Bu iş yüzünden bozulan, daha önce çalışan davranış sayısı. |
| **Kaçan hata** | | Kullanıcı gerçek uygulamada bulduğu hata sayısı. En pahalı sütun budur. |

**Bu spec'ten çıkarılan ders:**
<!-- 1-2 cümle. Bir sonraki spec'i nasıl daha iyi yazarız? -->
