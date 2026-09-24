# 0008 — Gider Modülü Yayın Perdesi (geçici)

| | |
|---|---|
| **Durum** | Tamamlandı (2026-09-24; kod commit `ad9c047`, plan `specs/done/0008-uygulama-plani.md` K1–K9) |
| **Sahip** | Analist (spec) · geliştirme sahibi atanacak |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Giderler sekmesi, Anasayfa, Finans, Ayarlar, Firma Çalışanları, Çöp Kutusu, silme onayları, yedekleme ekranı |
| **Bağımlı spec'ler** | 0001, 0002, 0003 (tamamlandı) |
| **Revizyon** | R1 (2026-09-24, plan onayı): R2'ye 0002 türevleri eklendi (K5); AC-14 bütünlük işlemleri açıklaması (K4); R4 ölçütü Vite üretim derlemesi (K1); yedek geri yükleme kuralı (K3) |

---

## Intent

Gider modülü (gider kaydı, makina maliyeti ve kârlılık, ödeme hatırlatıcısı) kodda tamamlandı
ama üzerinde çalışma sürüyor ve kullanıcıya bu hâliyle açılması istenmiyor. Bu arada başka
düzeltmeler için sürüm yayınlanacak; o sürümde modülün yarım hâlinin görünmesi kullanıcıyı
yanlış rakamlara ve eksik ekranlara götürür.

Başarı şu demek: yayınlanan sürümde kullanıcı gider modülünün hiçbir parçasını görmüyor,
Giderler sekmesine girdiğinde çalışmanın sürdüğünü anlatan bir sayfayla karşılaşıyor, ve
**kodda hiçbir şey silinmemiş oluyor**. Perde kalkacağı zaman tek bir işaret kaldırılıyor ve
modül olduğu gibi geri geliyor.

---

## Requirements

- **R1.** Kurulu (paketlenmiş) sürümde gider modülü kullanıcıya kapalıdır. Giderler sekmesi yerinde kalır ve
  içinde çalışmanın sürdüğünü anlatan bir sayfa gösterilir.
- **R2.** Modülden türeyen görünümler **hiç görünmez**: Anasayfa'daki ödeme hatırlatma kartı ve penceresi,
  Finans'taki KDV karşılaştırması kartı, Ayarlar'daki Giderler grubu, Firma Çalışanları'ndaki maliyet
  sütunları, Çöp Kutusu'ndaki gider satırları, müşteri ve makina silme onaylarındaki bağlı gider sayısı,
  yedekleme ekranındaki gider ibaresi; ayrıca (R1, K5) müşteri formundaki üretim tarihi ve satış kuru alanları,
  müşteri detayındaki maliyet ve kâr kutusu ve fiyat önerisi. Bu yerlerde "çalışma devam ediyor" mesajı da gösterilmez, hiçbir iz
  kalmaz.
- **R3.** Perde, kod içinde **tek bir işaretle** tanımlanır. Kullanıcı ayarı değildir; arayüzden, ayarlardan
  veya kullanıcı yetkisiyle açılıp kapatılamaz.
- **R4.** Geliştirme modunda modül **tam olarak** çalışır; perde yalnız yayınlanan sürümde etkilidir.
- **R5.** **Hiçbir kod, dosya, test veya veri silinmez.** Modül olduğu yerde durur; yalnız görünürlük kapısına
  bir koşul eklenir.
- **R6.** Mevcut gider verisi yerinde kalır, yedeklemeye girmeye devam eder ve yedekten geri yükleme
  eksiksiz çalışır.
- **R7.** Sunucu tarafı, kullanıcı izinleri ve yazma denetimi **değişmez**.
- **R8.** Sayfa metni tarih veya süre sözü vermez.
- **R9.** İşaret **geçici** olarak etiketlenir ve nasıl kaldırılacağı yazılı olur; kaldırma tek adımlık bir
  iştir.
- **R10.** Perde, izin modelinin **üstüne** eklenir, yerine geçmez: gider sekmesini görme yetkisi olmayan bir
  kullanıcıda sekme yine hiç görünmez.

---

## Constraints

### Uyulması zorunlu

- **C1.** Modülün koddan çıkarılması, geri alınması (revert) veya dosyalarının silinmesi **yasaktır.**
- **C2.** Yeni kalıcı alan, yeni ayar ve yeni izin tanımlanmaz.
- **C3.** Perde **tek bir kapıdan** uygulanır; her ekrana ayrı ayrı koşul yazılmaz. Modülün bütün
  görünümleri bugün zaten tek bir görünürlük bayrağından besleniyor.
- **C4.** Kullanıcıya görünen tüm metinler Türkçedir.
- **C5.** **Kabul edilen sınır:** bu bir görünürlük perdesidir, güvenlik önlemi değildir. Veri, sunucuya
  erişebilen bir istemci için teknik olarak erişilebilir kalır (0001 C7'nin aynı sınıfı). Yeni bir açık
  yaratılmıyor, var olan sınır da kapatılmıyor.
- **C6.** Perde kaldırıldığında modül eski davranışına **birebir** döner; bunun testle gösterilmesi gerekir.

### KAPSAM DIŞI

- **X1.** Modülün koddan çıkarılması veya sürümden geri alınması — *neden:* çalışma sürüyor, kod korunacak.
- **X2.** Gider verisinin silinmesi, taşınması veya yedekten çıkarılması — *neden:* perde kalkınca veri
  yerinde olmalı.
- **X3.** Perdenin kullanıcı ayarıyla açılıp kapatılması — *neden:* kalıcı ayar demek yeni veri, birleştirme
  ve izin işi demek; geçici bir perde için orantısız, ayrıca kullanıcı yanlışlıkla açabilir.
- **X4.** Sunucu tarafında gerçek veri gizleme — *neden:* uygulamanın bilinen mimari sınırı; ayrı ve büyük
  bir iş.
- **X5.** Gizli bir açma yolu (kısayol, kod, gizli ayar) — *neden:* test için geliştirme modu var; gizli
  kapılar unutulur ve sonradan sürpriz olur.
- **X6.** Gider modülünün kendisinde herhangi bir işlevsel değişiklik — *neden:* bu spec yalnız görünürlüğü
  ele alır.

---

## Context

- **Tek kapı var.** Modülün bütün görünümleri `App.jsx:149`'daki görünürlük bayrağından besleniyor ve
  tüketiciler bugün bile o bayrağa bakıyor: Giderler sekmesi (`App.jsx:1337`), Anasayfa ödeme hatırlatma
  kartı (`Dashboard.jsx:15-25`), Finans KDV karşılaştırması (`Finance.jsx:53-64, 611`), Ayarlar Giderler
  grubu (`Settings.jsx:52, 84`), çalışan maliyet sütunları, çöp kutusu gider satırları, silme onayındaki
  bağlı gider sayısı (`Customers.jsx:666`). Bu yüzden perde tek yerden indirilebilir ve C3 bir tercih değil,
  mevcut yapının doğal sonucudur.
- **Modül tamamlandı.** 0001 (gider kaydı), 0002 (makina maliyeti ve kârlılık) ve 0003 (ödeme hatırlatıcısı)
  uygulandı ve `specs/done/` altında. Bu spec onların hiçbir kuralını değiştirmez.
- **Yayın ile geliştirme ayrımı zaten var.** Uygulama, paketlenmiş sürüm ile geliştirme modunu ayırt
  edebiliyor; otomatik güncelleme bu ayrımı zaten kullanıyor. R4 yeni bir mekanizma icat etmez. (R1, K1: renderer tarafında aynı ayrımın
  karşılığı Vite'ın üretim derlemesi işaretidir; paketlenmemiş üretim derlemesi de perdeli sayılır.)
- **İzin modeli korunuyor.** Gider sekmesinin görünürlüğü bu projede özel bir kural taşıyor: sekme listesi
  tanımsız kullanıcı gider sekmesini görmüyor (0001 C6 kural 3, `permissions.js:27-36`). Perde bu kuralın
  üstüne binerken onu ezmemeli (R10).

Bilinen tuzaklar:

- **Geçici perde kalıcı olur.** Kaldırma talimatı yazılı olmazsa unutulur ve modül aylarca kapalı kalır.
  R9 bu yüzden gereksinimdir.
- **Yarım gizleme.** Bir ekran atlanırsa kullanıcı gider verisinin ucunu görür ve nereye gittiğini
  anlamadığı bir rakamla karşılaşır. R2'deki liste eksiksiz uygulanmalıdır.
- **Yedek sessizliği.** Yedekleme ekranındaki ibare gizlenirken yedeğin **içeriği** korunmalıdır; ikisi
  karıştırılırsa perde kalktığında veri kayıp görünür.

---

## Acceptance Criteria

- **AC-1.** Kurulu sürümde Giderler sekmesine girildiğinde çalışmanın sürdüğünü anlatan sayfa görünür; gider
  ekranlarının hiçbiri (dönem raporu, makina kârlılığı, tedarikçiler, standart giderler) açılmaz.
- **AC-2.** Kurulu sürümde Anasayfa'da ödeme hatırlatma kartı görünmez.
- **AC-3.** Kurulu sürümde Finans ekranında KDV karşılaştırması kartı görünmez.
- **AC-4.** Kurulu sürümde Ayarlar'da Giderler grubu ve alt bölümleri görünmez.
- **AC-5.** Kurulu sürümde Firma Çalışanları ekranında maliyet sütunları görünmez.
- **AC-6.** Kurulu sürümde Çöp Kutusu'nda gider satırları görünmez ve "çöpü boşalt" işlemi gider verisine
  dokunmaz.
- **AC-7.** Kurulu sürümde müşteri veya makina silme onayında bağlı gider sayısı yazmaz.
- **AC-8.** Kurulu sürümde yedekleme ekranında gider ibaresi görünmez, ancak alınan yedek dosyası gider
  verisini **içerir**.
- **AC-9.** Böyle alınmış bir yedek geri yüklendiğinde gider verisi eksiksiz geri gelir.
- **AC-10.** Geliştirme modunda modülün tamamı bugünkü gibi çalışır; perde hiçbir yerde görünmez.
- **AC-11.** Gider sekmesini görme yetkisi olmayan bir kullanıcıda sekme yine hiç görünmez; perde bu kuralı
  ezmez.
- **AC-12.** Sayfa metni hiçbir tarih veya süre taahhüdü içermez.
- **AC-13.** Perde işareti kaldırıldığında modül, perde öncesi davranışına birebir döner.
- **AC-14.** Perde açıkken hiçbir gider kaydı silinmez, değiştirilmez veya oluşturulmaz. (R1, K4: gider yetkisi
  olmayan kullanıcıda bugün de çalışan bütünlük zinciri, yani model adı taşıma ve silinen çalışanın açık tanımını
  kapatma, çalışmaya devam eder; perde bunları durdurmaz.)
- **AC-9 notu (R1, K3):** perde inikken gizli gider paketi yalnız tam geri yüklemede (görünen bütün paketler seçili)
  geri yüklenir; kısmi geri yükleme gider verisine dokunmaz.
- **AC-15.** Perde açıkken gider modülünün mevcut testleri geçmeye devam eder.

---

## Definition of Done

- [ ] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [ ] Perde tek bir işaretle uygulandı; ekran ekran koşul yazılmadığı PR özetinde gösterildi (C3).
- [ ] Hiçbir dosya, test veya veri silinmedi; PR yalnız ekleme içeriyor (C1, R5).
- [ ] Yedeğin içeriğinin korunduğu testle gösterildi (AC-8, AC-9).
- [ ] Perde kaldırıldığında modülün eski davranışına döndüğü testle gösterildi (AC-13).
- [ ] Kullanıcıya görünen tüm metinler Türkçe.
- [ ] Görsel kanıt eklendi (`docs/evidence/0008-ac<n>.png`): perde sayfası, Anasayfa, Finans ve Ayarlar'ın
      perde açıkken görünümü.
- [ ] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [ ] `CLAUDE.md`'ye perdenin varlığı, kapsamı ve **nasıl kaldırılacağı** yazıldı (R9).
- [ ] Sürüm notunda gider modülünün henüz açılmadığı belirtildi.
- [ ] Takım Yöneticisi onayladı. Commit ve sürüm yayını yalnız açık talimatla.
- [ ] SCORECARD dolduruldu ve spec `specs/done/` klasörüne taşındı.

---

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Spec revizyon sayısı** | 0 | R1 plan turunda, onayla eş zamanlı işlendi (R2'ye 0002 türevleri, AC-14 bütünlük zinciri, R4 ölçütü, AC-9 geri yükleme kuralı); onay sonrası değişiklik yok. |
| **Düzeltme turu sayısı** | 0 | İş geri dönmedi. Kullanıcı perdeli hâli üretim derlemesiyle gerçek uygulamada açıp gördü, bulgu çıkmadı. |
| **Bulgu gerçek/gürültü oranı** | 0 / 0 | Gözden geçirme bulgusu yok. Plan turunda kodda bulunan gerçek risk (perde tek kapıdan inince gider verisinin yedekten geri yüklenmemesi, AC-9) uygulamadan önce kararla (K3) kapatıldı. |
| **Regresyon sayısı** | 0 | Mevcut testlerin hiçbiri değişmedi ve hepsi geçti; perde kalkık hâlin perde öncesiyle aynı olduğu aynı adımlarla koşan testlerle gösterildi (AC-13). Son durum: 175 dosya, 1786 test, lint 0 hata. |
| **Kaçan hata** | 0 | Henüz gerçek kullanımda bulunan yok; görsel kanıt turu plan K9 ile atlandı, yerine kullanıcı perdeli derlemeyi elle inceledi. |

**Bu spec'ten çıkarılan ders:** "Tek kapı" varsayımı görünürlük için doğruydu ama aynı bayrak bir yerde görünürlük değil **veri
davranışı** taşıyordu (yedekten geri yükleme paketi); spec'in "yedek sessizliği" tuzağı kodda gerçekti ve yalnız bayrağın her
tüketicisi tek tek okunarak bulundu. Bir bayrağı ikiye bölerken (izin / görünürlük) her tüketicinin hangisine ihtiyaç duyduğu
ayrıca sorulmalı. Perde test ortamında kendiliğinden kalkık olduğu için perdeli davranış modül taklidiyle (`vi.mock`) gerçek
uygulama üzerinden, üretim derlemesindeki durumu ise paket çıktısına bakarak kanıtlandı; ikisi birlikte "testte yeşil, kurulu
sürümde farklı" riskini kapattı.
