# 0050 — Form Pencerelerinin Boyutu ve Müşteri Detayının Uzunluğu

| | |
|---|---|
| **Durum** | Tamamlandı (2026-09-30; commit `dae844e`, dal `feat/0050-pencere-boyutu`; plan `specs/done/0050-uygulama-plani.md` Q1–Q9) |
| **Sahip** | Analist (spec) · geliştirme sahibi atanacak |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Gider ve Kasa form pencereleri, müşteri detay penceresi, tasarım sözlüğü |
| **Bağımlı spec'ler** | 0009 (tasarım sözlüğü) · 0015 (form birliği) · 0016 (katlanan kart) · 0002 (maliyet ve kâr kutusu) · 0041 (çok satırlı ödeme penceresi) · 0044 (tahsilat hesap penceresi) · 0045 (`Modal` footer boşluğu) · 0049 (iki yeni pencere) |
| **Revizyon** | R1 (QA turu, 2026-09-30): geliştirici hazırlığı denetimi, 15 bulgu işlendi, 4'ü bloklayıcıydı. Pencere envanteri koddan çıkarıldı ve kapsam **iki sınıfa** bölündü (R1), yükseklik kararı `wide` üzerinden verildi (R3), AC-7 için Electron testi şart koşuldu (R13), kanıt kayıtlarının hangi ekranlarda `degisti` olacağı sayıldı (R14). **Spec onaylandıktan sonra değiştiği için SCORECARD'ın "Spec revizyon sayısı" ölçütü 1'dir.**<br>**R2 (2026-09-30, plan onayı):** maliyet kutusu testleri kutuyu açarak güncellenir, kutu `KartBolum` kartına döner (Q1); envanterde olmayan Alınan Çek Durumu/Geçmişi Sınıf 2, Standart Gider işlem ve Tahsilat Hesap pencereleri dokunulmadan Sınıf 2 örneği (Q2); kaynak taraması pencere bazında (Q3); boyut değerleri jsdom'da, yerleşim Electron'da (Q4); `maliyetKutusuAcik` `sidebarDar` deseni (Q5); kapalı kutuda rakam yok testi (Q6); kaydedilen veri ve alan sırası testi (Q7); kanıt (Q8); dal 0051 üstünden (Q9). |

---

## Intent

İki şikâyet, tek sebep: **ekranlar aşağı doğru gereğinden uzun.**

Gider ve Kasa'nın veri girme pencereleri dar. Genişlikleri de birbirini tutmuyor: hesap formu 560,
ödeme penceresi 760, ciro penceresi 760, gider formu türe göre değişen bir genişlik. Dar pencerede
alanlar alt alta diziliyor, pencere uzuyor ve kullanıcı her formda kaydırıyor. 0014, 0015 ve 0016 ile
sekmeleri, formları ve listeleri tek dile getirdik; pencere boyutu bu dilin dışında kaldı.

Müşteri detay penceresinde ise "Maliyet ve Kâr" kutusu her zaman açık duruyor. Kutu bilgi dolu ve
yerinde, ama makinanın geçmişine bakmak isteyen kullanıcı her seferinde onun yanından geçmek zorunda;
pencere gereksiz uzuyor.

Başarı şu demek: gider ve kasa formları tek ve geniş bir boyutta açılıyor, alanlar yan yana diziliyor,
pencere kısalıyor; müşteri detayındaki maliyet kutusu isteyene açılıyor, istemeyende yer kaplamıyor.

---

## Requirements

### A. Form pencerelerinin boyutu

- **R1.** Gider ve Kasa pencereleri **iki sınıfa** ayrılır ve her sınıf kendi içinde tek boyuttadır.
  Envanter koddan çıkarıldı (bugünkü `maxWidth` değerleriyle):

  **Sınıf 1, geniş (900): veri girme ve tablo pencereleri.** Gider formu (yeni ve düzenle,
  `kira ? 900 : 640`), Ödeme Kaydet (760), Avans Ver (560), Virman (560), Hesap (560), Ciro ve Kendi
  Çekimizi Yaz (760), Portföye Çek Ekle (640), Tedarikçi (560), Üretim Partisi (560), Ödeme Planı (620),
  Ekstre (860). Ödeme Planı ile Ekstre tablo taşıdığı için bu sınıfa girer.

  **Sınıf 2, kendi küçük boyutunda kalanlar.** Verilen Çek Durumu (560), Verilen Çek Geçmişi (600), onay
  ve "silinemez" pencereleri, tek düğmeli bilgi pencereleri. Bunlar R5 sınıfıdır; genişletmek boş alan
  üretir.

  **Uygulama (R2, Q2):** envanter bağlayıcıdır. Alınan çekin Çek Durumu (560) ve Çek Geçmişi (600) pencereleri, Verilen
  kardeşleri gibi Sınıf 2'dir. `maxWidth` vermeyen Standart Gider işlem penceresi ve 0044'ün Tahsilat Hesap penceresi
  (520) kısa pencerelerdir, dokunulmaz ve sözlükte Sınıf 2 örneği olarak adlarıyla yazılır.
  Spec'in ilk taslağı yalnız altı pencere sayıyordu; Tedarikçiler, Üretim Partileri, Çek Ekle (0049), Çek
  Durumu, Çek Geçmişi, Ödeme Planı ve Ekstre listede yoktu.
- **R2.** Genişlik uygulamada zaten tanımlı geniş pencere ölçüsüdür; yeni bir sayı uydurulmaz.
- **R3.** Yükseklik bugünkü dar pencerelerde 90, geniş pencerelerde 94 yüzde. **Sınıf 1 pencereleri
  `wide` olarak açılır**, böylece yükseklik kendiliğinden **94vh** olur ve tek değere iner. Uygulama biçimi:
  o pencerelerdeki elle verilen `maxWidth` ve `maxHeight` sayıları **silinir**, yerine `wide` geçilir
  (`Modal` bugün `maxWidth: maxWidth ?? (wide ? 900 : 520)`, `maxHeight: maxHeight ?? (wide ? "94vh" : "90vh")`
  veriyor). Böylece C3 yapısal olarak sağlanır ve yeni bir sayı uydurulmaz (R2). İçerik pencerenin
  **içinde** kaydırılır, alt düğme satırı yerinde kalır (bugünkü davranış).
- **R4.** Pencere genişleyince formdaki mevcut sarmalayan alan satırları kendiliğinden yan yana dizilir;
  alanların sırası, etiketi ve doğrulaması **değişmez**.
- **R5.** Onay ve bilgi pencereleri (silme onayı, "silinemez" uyarısı, tek düğmeli pencereler) bu kuralın
  dışındadır; onlar bugünkü küçük boyutlarında kalır.
- **R6.** Kural `docs/tasarim-sozlugu.md`'ye yazılır: hangi pencere hangi boyutta açılır. Bundan sonraki
  her form oradan beslenir.
- **R7.** Dar ekranda (dizüstü) pencere ekrana sığar. **Pencerenin kendisi zaten küçülüyor**
  (`Modal` `width: "100%"` + `maxWidth`); ölçülecek olan **içeriğin taşmaması**, yani içindeki sabit
  genişlikli bir öğenin yatay kaydırma üretmemesidir. Doğrulama R13'teki Electron testiyle yapılır.

### B. Müşteri detayında maliyet ve kâr kutusu

- **R8.** Müşteri detayındaki **"Maliyet ve Kâr" kutusu katlanır**; varsayılan **kapalı** açılır. Kutu
  0016'nın **denetimli** katlanan kartı olur (`acik` / `onAcikDegis`): durumu `CustomerDetailModal` tutar,
  böylece üç katlanan kart (Görüşmeler, Dosyalar, Maliyet) aynı biçimde çalışır ve ileride "dışarıdan aç"
  ihtiyacı doğarsa desen hazırdır (C2).
- **R9.** Açık ya da kapalı olduğu bu bilgisayarda hatırlanır; kullanıcı ayarı değildir, sunucuya gitmez.
  Anahtar `localStorage` **`maliyetKutusuAcik`** (`"1"` / `"0"`), 0043'ün `maliIslerAcik` ve `sidebarDar`
  deseni. Okuma ve yazma **tek yerde** olur ve `try/catch` ile sarılır (özel pencerede `localStorage`
  erişimi hata verebilir); okunamazsa varsayılan **kapalı**. Durum **makina değişiminde korunur** (görünüm
  tercihidir, kayda bağlı değil).
- **R10.** Kapalıyken kutunun başlığı ve `altBaslik` olarak tek satır açıklama görünür kalır: "Makinanın
  maliyeti, satış bedeli ve kârı". **Rakam gösterilmez**, yoksa katlamanın amacı olan kısalık kaybolur.
- **R11.** Kutunun içeriği, hesabı ve görünürlük kuralı (yalnız gider yetkisi) **değişmez**; yalnız
  açık gelip gelmediği değişir.
- **R12.** Aynı kutu Giderler › Makina Kârlılığı'nda bugünkü gibi açık kalır; orada asıl içerik odur.

### C. QA turunda eklenenler

- **R13.** **AC-7 bir Electron testiyle ölçülür.** Yerleşim ölçümü jsdom'da yapılamaz; bu depoda emsal
  `tests/bayi-modal-layout.test.js` ve `tests/suzgec-yerlesim.test.js` (gerçek bileşen vite ile paketlenir,
  Electron'da farklı pencere genişliklerinde ölçülür, `ELECTRON_TESTLERI` listesinde durur). Yeni test
  aynı desende yazılır (`tests/form-pencere-yerlesim.test.js`) ve o listeye eklenir.
- **R14.** **Kanıt kayıtları sayılır.** `docs/evidence/kanit-eslemesi.json` dosya başına ekran kaydı tutuyor
  ve `tests/kanit-eslemesi.test.js` her kaydı denetliyor. Kural: **Sınıf 1'deki her pencere bileşeninin**
  kaydı ve `CustomerDetailModal` kaydı `beklenen: "degisti"` + `onay`
  (`Takım Yöneticisi · 2026-09-30 · spec 0050 R1/R8`) taşır; **Sınıf 2 pencereleri, Makina Kârlılığı ekranı
  (R12) ve kira gider formu (bugün zaten 900) `ayni` kalır.** Spec `done`'a taşınırken bütün kayıtlar
  `ayni`ye çevrilir.
  **Uygulama (TY onayı, 2026-09-30):** kira gider formu `wide` ile açıldığı için yüksekliği 90vh'ten 94vh'e çıktı (R3);
  genişliği aynı (AC-17 sağlanır) ama kira ekranları piksel olarak değiştiği için kanıt kayıtları `degisti` + onay taşır.
- **R15.** **Kira gider formunda görünür değişiklik olmaz**: `GiderForm.jsx` bugün
  `maxWidth={dav === DAVRANIS.KIRA ? 900 : 640}` veriyor, yani kira zaten geniş. Değişen yalnız kira dışı
  türlerdir (640 → 900).
- **R16.** **Ekstre penceresi 860'tan 900'e çıkar** (Sınıf 1, tablo). Ekstre yazdırılmıyor (0024 B9),
  dolayısıyla genişlemenin hiçbir çıktıya etkisi yoktur.
- **R17.** **Kapsamdaki pencerelerde `overflowVisible` kullanılmıyor** (kaynak taramasıyla doğrulandı;
  0015'in istisnası "Stoğa Parça Ekle" bu kapsamda değil). Yeni bir pencere `overflowVisible` isterse boyut
  kuralı yine geçerlidir.
- **R18.** **Mevcut testlerdeki boyut iddiaları taranır ve güncellenir**; kaynak taraması ekranlarda elle
  verilen `maxWidth` ve `maxHeight` sayısı kalmadığını sabitler (C3).
  **Uygulama (R2, Q3):** tarama pencere bazındadır: Sınıf 1 pencerelerinin `<Modal>` açılışları başlıklarıyla bulunur;
  her birinde `wide` vardır, `maxWidth`/`maxHeight` yoktur. Aynı dosyadaki Sınıf 2 pencereleri ve detay modalları (X6)
  sayı taşımaya devam eder.
- **R19.** Çok satırlı ödeme penceresi (0041, en çok 10 satır) genişledikten sonra da içeriği pencere
  içinde kaydırır ve alt düğme satırı yerinde kalır; bu, AC-2 ile AC-3'ün en zorlu hâlidir.

---

## Constraints

- **C1.** Hiçbir formun alanı, sırası, doğrulaması ya da kaydettiği veri değişmez; bu iş yalnız yerleşim.
- **C2.** Katlama 0016'nın kart desenini kullanır; yeni bir katlama mekanizması yazılmaz.
- **C3.** Boyut değerleri tek yerde durur: sayılar `Modal`'ın `wide` dalında, hangi pencerenin hangi sınıfta
  olduğu tasarım sözlüğünde. Ekranlar kendi sayısını yazmaz; Sınıf 1 pencereleri `maxWidth`/`maxHeight`
  vermez, yalnız `wide` geçer (R3).
- **C4.** Yeni kalıcı alan, yeni izin ve sunucu değişikliği yoktur.
- **C5.** Kullanıcıya görünen metinler Türkçedir.

### KAPSAM DIŞI

- **X1.** Formların iki sütuna yeniden tasarlanması (alanların yerini değiştirmek) — *neden:* R4;
  genişleyen pencerede mevcut satırlar zaten yan yana diziliyor, alan düzenini elden geçirmek ayrı ve
  çok daha büyük bir iştir.
- **X2.** Uygulamadaki bütün pencerelerin tek boyuta getirilmesi — *neden:* R5; onay ve bilgi
  pencerelerini büyütmek boş alan üretir.
- **X3.** Müşteri detayının başka bölümlerinin katlanması — *neden:* 0016 Görüşmeler ve Dosyalar için bunu
  zaten yaptı; kalanlar için talep yok.
- **X4.** Maliyet kutusunun Ayarlar'dan bir tercihle tümüyle kapatılması — *neden:* katlanan kart aynı
  sonucu veriyor ve bir ayar alanı, bir kayıt ve bir ekran daha gerektirmiyor. İstenirse ayrı iş.
- **X5.** Pencerelerin kullanıcı tarafından yeniden boyutlandırılması ya da boyutun hatırlanması —
  *neden:* istenmedi.
- **X6.** Müşteri ve bayi **detay** modallarının genişliği — *neden:* bayi detay modalının 760'ı bilinçli
  bir karardır (0007 R16: dört düğme tek satır) ve `tests/bayi-modal-layout.test.js` onu Electron'da
  ölçüyor. "Tek boyut" kuralı yalnız gider ve kasa **form** pencereleri içindir; detay modalları
  süpürülmez.

---

## Context

- **Bugünkü boyutlar (QA turunda tam sayıldı).** `Modal` imzası
  `({ title, onClose, children, footer, wide, maxWidth, maxHeight, overflowVisible })` ve varsayılanları
  `maxWidth: maxWidth ?? (wide ? 900 : 520)`, `maxHeight: maxHeight ?? (wide ? "94vh" : "90vh")`;
  kap `width: "100%"` olduğu için pencere dar ekranda kendiliğinden küçülüyor. Gider ve Kasa pencereleri ise
  tek tek sayı veriyor: **560** (Kasa hesap, Virman, Avans Ver, Tedarikçi, Üretim Partisi, Verilen Çek
  Durumu), **600** (Verilen Çek Geçmişi), **620** (Ödeme Planı), **640** (Portföye Çek Ekle; kira dışı gider
  formu), **760** (Ödeme Kaydet; Ciro ve Kendi Çekimizi Yaz), **860** (Ekstre), **900** (kira gider formu).
  On üç pencere, yedi ayrı sayı. R1'in iki sınıfı bu envanterden çıkarıldı.
- **Yerleşim testi jsdom'da yapılamaz.** Bu depoda iki emsal var: `tests/bayi-modal-layout.test.js` ve
  `tests/suzgec-yerlesim.test.js` gerçek bileşeni vite ile paketleyip Electron'da farklı pencere
  genişliklerinde ölçüyor ve `ELECTRON_TESTLERI` listesinde duruyor. AC-7 bu yüzden R13 ile aynı desene
  bağlandı; jsdom'da yazılırsa sahte yeşil verir.
- **Uzunluğun sebebi genişlik.** Formlar alanlarını sarmalayan satırlarda diziyor (`flexWrap`); pencere
  dar olunca her alan kendi satırına düşüyor ve pencere uzuyor. Genişletmek, alan düzenine hiç
  dokunmadan boyu kısaltır (R4). Bu yüzden iş bir yeniden tasarım değil, bir ölçü kararı.
- **Katlama deseni hazır.** 0016 ile müşteri detayındaki Görüşmeler ve Dosyalar **denetimli katlanan
  kart** oldu (`acik` / `onAcikDegis`). Maliyet kutusu aynı desene giriyor; yeni bir mekanizma gerekmiyor.
- **Maliyet kutusu iki yerde aynı bileşen.** 0002'de karar verilmişti: müşteri detayındaki kutu ile
  Giderler › Makina Kârlılığı'ndaki detay **aynı bileşendir**. Katlama yalnız müşteri detayındaki
  kullanımı ilgilendirir (R12); bileşenin kendisi değişmez.
- **Görsel kanıt bedeli.** İkisi de bilinçli görünüm değişikliği: pencere boyutu gider ve kasa
  ekranlarının bütün görüntülerini, katlama müşteri detayını etkiler. Kanıt kayıtları 0 piksel fark
  bekleyemez; `beklenen: "degisti"` ve Takım Yöneticisi onayıyla işaretlenir.

---

## Acceptance Criteria

- **AC-1.** R1'in **Sınıf 1** pencerelerinin tamamı (gider formu yeni ve düzenle, Ödeme Kaydet, Avans Ver,
  Virman, Hesap, Ciro ve Kendi Çekimizi Yaz, Portföye Çek Ekle, Tedarikçi, Üretim Partisi, Ödeme Planı,
  Ekstre) aynı genişlikte açılır.
- **AC-2.** Bu pencereler aynı en çok yükseklikte açılır ve içerik pencerenin içinde kaydırılır.
- **AC-3.** Alt düğme satırı kaydırmadan bağımsız olarak pencerenin altında kalır.
- **AC-4.** Genişleyen gider formunda alan sırası, etiketleri ve doğrulama mesajları değişmemiştir.
- **AC-5.** Aynı veriyle kaydedilen kalem, bu işten önce ve sonra birebir aynıdır.
- **AC-6.** Onay ve bilgi pencereleri bugünkü küçük boyutunda kalır.
- **AC-7.** Dar bir pencerede (1280 piksel) form ekrana sığar ve yatay kaydırma oluşmaz; ölçüm gerçek
  yerleşimle, Electron testinde yapılır (R13).
- **AC-8.** Müşteri detayı açıldığında "Maliyet ve Kâr" kutusu kapalıdır; başlığı ve "Makinanın maliyeti,
  satış bedeli ve kârı" açıklaması görünür, hiçbir rakam görünmez.
- **AC-9.** Başlığa tıklanınca kutu açılır, içeriği bugünküyle aynıdır.
- **AC-10.** Kutunun açık ya da kapalı olduğu uygulama kapanıp açıldığında korunur.
- **AC-11.** Gider yetkisi olmayan kullanıcıda kutu hiç çizilmez (bugünkü kural).
- **AC-12.** Giderler › Makina Kârlılığı'ndaki maliyet detayı açık gelmeye devam eder.
- **AC-13.** Müşteri detayının diğer bölümlerinin açık/kapalı davranışı değişmez.

### QA turunda eklenen kriterler

- **AC-14.** R1'in **Sınıf 2** pencereleri (Verilen Çek Durumu, Verilen Çek Geçmişi) bugünkü küçük
  boyutunda kalır.
- **AC-15.** Sınıf 1 pencereleri `maxWidth` ve `maxHeight` vermez, yalnız `wide` geçer; kaynak taramasında
  ekranlarda elle verilen boyut sayısı kalmamıştır (C3, R18).
- **AC-16.** Sınıf 1 pencerelerinin en çok yüksekliği 94vh'tir (R3).
- **AC-17.** Kira gider formunun genişliği değişmez (R15).
- **AC-18.** Ekstre penceresi Sınıf 1 boyutunda açılır ve hiçbir çıktı etkilenmez (R16).
- **AC-19.** On satırlı ödeme penceresinde içerik pencere içinde kaydırılır, alt düğme satırı yerinde kalır
  (R19).
- **AC-20.** Maliyet kutusunun durumu `localStorage` `maliyetKutusuAcik` ile tutulur; erişim hata verirse
  kutu kapalı açılır ve uygulama çökmez (R9).
- **AC-21.** Soldaki listeden makina değiştirilince kutunun açık/kapalı durumu korunur (R9).
- **AC-22.** Kutu denetimli katlanan karttır: durumu `CustomerDetailModal` tutar (R8, C2).
- **AC-23.** Müşteri ve bayi detay modallarının genişliği değişmez; `bayi-modal-layout.test.js` aynen geçer
  (X6).
- **AC-24.** Kanıt eşlemesinde Sınıf 1 pencereleri ve müşteri detayı `beklenen: "degisti"` + onay taşır;
  Sınıf 2, Makina Kârlılığı ve kira formu `ayni` kalır (R14).

---

## Definition of Done

- [x] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [x] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [x] Boyutlar tek yerde; ekranlarda tek tek sayı kalmadı (C3, R18, kaynak taraması) ve boyut iddiası
      taşıyan mevcut testler güncellendi.
- [x] AC-7 için Electron yerleşim testi yazıldı ve `ELECTRON_TESTLERI` listesine eklendi (R13); jsdom'da
      ölçüm yapılmadı.
- [x] Kanıt eşlemesindeki kayıtlar R14'e göre `degisti` ya da `ayni` olarak işaretlendi ve
      `kanit-eslemesi.test.js` yeşil.
- [x] Katlama 0016'nın kart desenini kullanıyor; ikinci bir mekanizma yazılmadı (C2).
- [x] Kaydedilen verinin değişmediği testle gösterildi (AC-5).
- [x] `docs/tasarim-sozlugu.md` pencere boyutu kuralıyla güncellendi (R6).
- [x] Görsel kanıt eklendi (`docs/evidence/0050-*.jpg`): geniş form penceresi, kapalı ve açık maliyet
      kutusu, dar ekran; kanıt eşlemesindeki kayıtlar `beklenen: "degisti"` ve TY onayıyla işaretlendi.
- [x] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [x] `CLAUDE.md` güncellendi: form penceresi boyut kuralı ve maliyet kutusunun katlanır olması.
- [x] Takım Yöneticisi onayladı. Commit ve sürüm yayını yalnız açık talimatla.
- [x] SCORECARD dolduruldu ve spec `specs/done/` klasörüne taşındı.

---

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Spec revizyon sayısı** | 2 | R1 QA turunda (spec başlığında); R2 plan onayında (Q1–Q9). Uygulamada kira formunun yüksekliği için TY onaylı not (R15): kanıt `degisti`. Onaylandıktan sonra Requirements, Constraints veya Acceptance Criteria kaç kez değişti? |
| **Düzeltme turu sayısı** | 1 | Bir triyaj turu (2 bulgu). İş kaç kez geri döndü? |
| **Bulgu gerçek/gürültü oranı** | 2 / 0 | Yerleşim testinin en geniş sabit içerikli iki pencereyi (Ekstre, dağıtım ızgarası) ölçmemesi (kapsam boşluğu, gerçek); AC-13 adlı test yoktu (izlenebilirlik). Gözden geçirmede çıkan bulgulardan kaçı gerçek sorundu? |
| **Regresyon sayısı** | 0 | Pencere dışındaki bütün ekranlar 0 piksel; iki mevcut test bilinçli davranış değişikliğiyle güncellendi (kutu kapalı açılıyor; müşteri detayında dördüncü kart). Bu iş yüzünden bozulan, daha önce çalışan davranış sayısı. |
| **Kaçan hata** | 0 | Kapanış anında bilinen yok. Gerçek uygulamada sonradan bulunan hata sayısı. |

**Bu spec'ten çıkarılan ders:** Bir boyut kararı iki eksenlidir; spec genişliği saydı, yüksekliğin de sınıfla birlikte değiştiğini (kira formu 90vh → 94vh) ancak piksel kanıtı gösterdi. "Görünür değişiklik olmaz" iddiası ölçümle doğrulanmadan kanıt beklentisine (`ayni`) yazılmamalı. İkincisi: yerleşim testi en riskli içeriği seçerek kurulmalı; ilk sürüm en kolay üç pencereyi ölçtü, sabit genişlikli tablo ve ızgara triyajla eklendi. Üçüncüsü: Electron'un varsayılan oturumu localStorage'ı çekimler arasında taşır; yerel tercih okuyan her ekran görüntü aracında sıfırlanmalı.
