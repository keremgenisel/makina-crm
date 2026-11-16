# 0148 — Fiyatı girilmemiş malzeme eksik sayılmaz

| | |
|---|---|
| **Durum** | Onaylandı (Takım Yöneticisi, 2026-11-16); uygulandı, commit bekliyor |
| **Sahip** | Analist (yazım) |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Ayarlar › Katalog › Malzemeler listesi; malzeme motorunun eksiklik kuralı |
| **Bağımlı spec'ler** | 0132 |

---

## Intent

Fabrika bazı malzemelerin kilo fiyatını bilerek girmiyor: o malzemenin fiyatını takip etmiyor ya da
tedarikçiden fiyat almıyor. Malzemeler listesi bu kayıtları bugün amber "eksik" rozetiyle, altında
"kilo fiyatı girilmedi" cümlesiyle ve başlıkta "n malzemenin bilgisi eksik" sayısıyla işaretliyor.
Sonuç, hiç kapanmayan bir uyarı: liste sürekli eksikli görünüyor, gerçekten yarım kalmış kayıtlar
(özgül ağırlığı girilmemiş, para birimi döviz seçilip kuru girilmemiş) bu kalabalığın içinde
kayboluyor ve rozet kullanıcıyı yapacak bir işe yönlendirmiyor.

Bu iş bittiğinde, fiyatı hiç girilmemiş malzeme uyarı almayacak ve başlıktaki sayıya girmeyecek;
uyarı yalnız yarım kalmış girişlerde duracak, yani rozet görüldüğünde gerçekten yapılacak bir iş
olacak. Fiyatın girilmemiş olduğu bilgisi kaybolmayacak: satırın Fiyat hücresi bugün de "fiyat
girilmedi" yazıyor ve yazmaya devam edecek.

---

## Requirements

- **R1.** Fiyatı hiç girilmemiş malzeme eksik sayılmaz: satırında rozet ve neden satırı çizilmez,
  başlıktaki eksik sayısına girmez. "Fiyatı hiç girilmemiş" demek, kilo fiyatının da fiyat bandının
  da bulunmaması demektir.
- **R2.** Fiyatın bir parçası girilmişse eksiklik bildirilmeye devam eder: bantları olup lama ve sac
  için tek kilo fiyatı girilmemiş malzeme, kilo fiyatı girilmiş ama döviz kuru girilmemiş malzeme ve
  para birimi tanınmayan malzeme bugünkü rozetini ve nedenini korur.
- **R3.** Özgül ağırlık eksikliği her hâlde bildirilir; malzemenin fiyatı olsun ya da olmasın. Sipariş
  listesinin alınacak kilogramı özgül ağırlık olmadan hesaplanamadığı için bu gerçekten yapılacak bir
  iştir.
- **R4.** Satırın Fiyat hücresi değişmez ve fiyatı girilmemiş malzemede bugünkü gibi "fiyat girilmedi"
  yazar.
- **R5.** Listede hiç eksik kalmadığında başlık bugünkü gibi malzeme sayısını yazar.

---

## Constraints

### Uyulması zorunlu

- **C1.** Hesap tarafı değişmez. Fiyatı girilmemiş malzemeden yapılan parçanın maliyeti bugünkü gibi
  "girilmedi" kalır, sipariş listesinin fiyatlı nüshasında o satırın tutarı bugünkü nedeniyle boş
  kalır ve "tutarı hesaplanamayan satır" sayacı değişmez. Bu iş yalnız Malzemeler listesinin
  uyarısıdır.
- **C2.** Eksiklik kuralı tek yerde kalır (`malzeme.js` `malzemeEksikleri`); liste kendi ölçütünü
  yazmaz, bugünkü gibi motoru çağırır.
- **C3.** Yeni kalıcı alan yok. Ölçüt kaydın kendi içeriğidir, kullanıcının işaretlemesi gereken bir
  bayrak eklenmez.
- **C4.** Yeni veri bölümü, eylem izni, sunucu kuralı ve göç yok; kayıtlara dokunulmaz.

### KAPSAM DIŞI

- **X1.** Malzeme kartına "fiyatı takip edilmiyor" işareti eklemek — *neden:* kullanıcının elle
  işaretlemesi gereken yeni bir alan olurdu; aynı ayrımı kaydın kendi içeriğinden bedava okuyabiliyoruz.
- **X2.** Rozetin ve eksik sayısının bütünüyle kaldırılması — *neden:* özgül ağırlığı ya da kuru
  girilmemiş kayıt gerçekten yarım kalmış bir giriştir ve o uyarı bugün işe yarıyor.
- **X3.** Parça tarafındaki "maliyeti girilmemiş parça" sayacı — *neden:* ayrı ekranın ayrı sorusu;
  şikâyet edilen o değil.
- **X4.** Sipariş listesindeki tutar nedenleri ve "n satırın tutarı hesaplanamadı" sayacı — *neden:*
  orada belge gerçekten eksik tutar basıyor, uyarı doğru yerde.
- **X5.** Fiyatı girilmemiş malzemeleri listede gizlemek ya da süzgece almak — *neden:* istenmedi;
  liste bütün malzemeleri göstermeyi sürdürür.

---

## Context

**Rozet nerede çiziliyor.** Yalnız Ayarlar › Katalog › Malzemeler listesinde: satırda amber "eksik"
rozeti ve altında nedenlerin virgüllü cümlesi (`src/components/MalzemeManager.jsx:206-207`), listenin
başlığında ise "n malzemenin bilgisi eksik" ya da eksik yoksa "n malzeme" (`:180-181`).

**Kural nerede.** `src/lib/malzeme.js` `malzemeEksikleri(m)` (`:187-192`): özgül ağırlık pozitif
değilse "özgül ağırlık girilmedi", ardından fiyat kümesinin eksikleri (`kumeEksikleri`): para birimi
tanınmıyorsa "para birimi"; kilo fiyatı yoksa (ve bantlı çaplı malzeme değilse) "kilo fiyatı girilmedi"
ya da bantlıysa "lama ve sac için tek kilo fiyatı girilmedi"; para birimi dövizse ve kur yoksa "kur
girilmedi". Üstünde `malzemeEksikMi` ve `eksikMalzemeSayisi` (`:193-194`).

**Ölçüldü: rozet salt gösterimdir.** `malzemeEksikleri`, `malzemeEksikMi` ve `eksikMalzemeSayisi`
`src/` altında yalnız `MalzemeManager.jsx` tarafından okunuyor; maliyet, sipariş, zam önizlemesi ve
Excel yolları kendi ölçütlerini kullanıyor. Yani rozetin ölçütünü daraltmak hiçbir rakamı ve hiçbir
kapıyı değiştirmez.

**Bilgi kaybolmuyor.** Satırın Fiyat hücresi `kumeOzeti(fiyatKumesi(m))` ile yazılıyor ve fiyat kümesi
boşken "fiyat girilmedi" basıyor (`src/lib/malzeme.js`, `kumeOzeti`). Yani fiyatın girilmediği, rozet
olmadan da aynı satırda okunuyor; bugünkü rozet bu cümleyi ikinci kez söylüyor.

**Fiyatsızlığın gerçek sonucu başka yerde görünür ve orada kalır.** O malzemeden yapılan parçanın
maliyeti "girilmedi" olur (parça kartı, katalog listesinin "maliyeti girilmemiş" sayacı, Model
Maliyetleri) ve sipariş listesinin fiyatlı nüshasında satırın tutarı yerine nedeni yazılır. Bu spec
oralara dokunmuyor.

**Dövizli ama fiyatsız kayıt.** Para birimi USD seçilmiş ama ne kilo fiyatı ne kur girilmişse bugün
iki neden birden yazılıyor. R1 bu kaydı bütünüyle fiyatsız sayar, yani kur uyarısı da düşer: kur,
olmayan bir fiyatı çevirmek için istenir.

**Veri, izin ve sunucu.** Bu iş yeni alan, bölüm, izin ya da sunucu kuralı getirmez; dört nokta DB
kuralı, `MERGE_KEYS`, çöp kutusu simetrisi ve yedek paketleri bu spec'te gündeme gelmez.

---

## Acceptance Criteria

- **AC-1.** Kilo fiyatı ve fiyat bandı bulunmayan, özgül ağırlığı girilmiş malzemenin satırında "eksik"
  rozeti çizilmez.
- **AC-2.** Aynı malzemenin satırında nedenlerin yazıldığı açıklama satırı da çizilmez.
- **AC-3.** Aynı malzeme listenin başlığındaki eksik sayısına girmez.
- **AC-4.** Listedeki bütün eksiklikler yalnız bu türdense başlık eksik sayısı yerine malzeme sayısını
  yazar.
- **AC-5.** Özgül ağırlığı girilmemiş ve fiyatı da girilmemiş malzeme rozet alır; nedeni yalnız özgül
  ağırlıktır, fiyatla ilgili neden yazılmaz.
- **AC-6.** Fiyat bandı olan ama lama ve sac için tek kilo fiyatı girilmemiş malzeme bugünkü rozetini
  ve nedenini korur.
- **AC-7.** Kilo fiyatı girilmiş, para birimi döviz olan ve kuru girilmemiş malzeme bugünkü rozetini ve
  nedenini korur.
- **AC-8.** Para birimi döviz olan ama ne kilo fiyatı ne bandı ne kuru girilmiş malzeme rozet almaz.
- **AC-9.** Para birimi tanınmayan malzeme bugünkü rozetini ve nedenini korur.
- **AC-10.** Fiyatı girilmemiş malzemenin satırındaki Fiyat hücresi "fiyat girilmedi" yazmayı sürdürür.
- **AC-11.** Fiyatı girilmemiş malzemeden yapılan parçanın maliyeti bugünkü gibi "girilmedi" kalır
  (çapraz ölçüm: maliyet okuma yolunun çıktısı değişmez).
- **AC-12.** Sipariş listesinin fiyatlı nüshasında o malzemenin satırı bugünkü nedenini yazmayı ve
  "tutarı hesaplanamayan satır" sayacına girmeyi sürdürür (çapraz ölçüm).
- **AC-13.** Hiç malzeme yokken liste bugünkü boş durumunu gösterir.
- **AC-14.** Çöpteki malzeme bugünkü gibi eksik sayısına girmez.

---

## Definition of Done

- [ ] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [ ] Eksiklik kuralı saf motorda tek yerde; liste kendi ölçütünü yazmıyor (kaynak taraması).
- [ ] Maliyet ve sipariş tarafının değişmediği çapraz testle gösterildi (AC-11, AC-12).
- [ ] Yeni kalıcı alan yok; dört nokta kuralı gündeme gelmedi (spec'te yazılı).
- [ ] Yeni veri bölümü, eylem izni ve sunucu kuralı yok; salt gösterim olduğu açıkça yazıldı.
- [ ] Kullanıcıya görünen metinler Türkçe; yazdırma çıktısı yok.
- [ ] Görsel kanıt eklendi: rozetli ve rozetsiz malzeme listesi.
- [ ] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [ ] Gerekiyorsa `CLAUDE.md`'nin malzeme bölümü güncellendi.
- [ ] Takım Yöneticisi onayladı. **Commit ve sürüm yayını yalnız açık talimatla yapılır.**
- [ ] **SCORECARD dolduruldu** ve spec `specs/done/` klasörüne taşındı.

---

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Spec revizyon sayısı** | | |
| **Düzeltme turu sayısı** | | |
| **Bulgu gerçek/gürültü oranı** | / | |
| **Regresyon sayısı** | | |
| **Kaçan hata** | | |

**Bu spec'ten çıkarılan ders:**
