# 0083 — Giderler görünüm sırası ve Kasa'daki iki şeridin sayfa sonuna inmesi

| | |
|---|---|
| **Durum** | Tamamlandı (commit `30d9880`, dal `feat/0083-yerlesim`; plan `specs/done/0083-uygulama-plani.md`) |
| **Sahip** | Analist (spec) · geliştirme atanmadı |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Mali İşler › Giderler (görünüm çubuğu); Mali İşler › Kasa › Hesaplar (ekran yerleşimi); tasarım sözlüğü; görsel kanıt |
| **Bağımlı spec'ler** | 0082 (beş görünüm, adlar, `gecerliGorunum`), 0022 (çubuğun dar pencerede iki satıra bölünmesi), 0061 (Giderler başlık satırı yerleşimi), 0026 (aramadan görünüm açma), 0024 · 0044 · 0051 · 0056 · 0058 (Kasa'da taşınan blokların sahipleri), 0062 (taşınan üç listenin sayfalaması), 0009 (tasarım sözlüğü, `UyariSeridi` kuralı), 0067 (Dönem Raporu yerleşim testi düzeneği) |
| **Taban** | 0082 uygulanmış hâli (commit `52df9a9`); bütün satır numaraları ona göre verildi |
| **Ters çevrilen kriterler** | 0082 (AC-1, AC-2) |
| **Revizyon** | · 1 · 2026-10-13 ilk taslak · 2 · 2026-10-13 geliştirme öncesi QA turu (B-1…B-4, Ö-5…Ö-11, K-12…K-20 işlendi; kanıt kapsamı ölçümle düzeltildi, sözlüğe istisna maddesi, taramalar ölçülebilir hâle getirildi) · 3 · 2026-10-13 plan onayı (P5–P9: AC-6 dizi düzeyinde tarama, kirli ağaç, plan dosyası, AC-7 iddiaları, AC-21 kapsamı) |

---

## Intent

İki yerleşim isteği var ve ikisi de aynı sınıfta: ekranda hiçbir rakam, kural ya da metin
değişmiyor, yalnız **neyin önce, neyin sonra** çizildiği değişiyor.

**Giderler'de** görünüm çubuğunun sırası bugün Dönem Raporu · Makina ve Model · Tedarikler ve
Ekstre · Üretim Partileri · Makina Kârlılığı. Günlük kullanımda Dönem Raporu'ndan sonra en çok
Tedarikler ve Ekstre'ye giriliyor; Makina ve Model ise ara sıra bakılan bir analiz görünümü ama
ikinci sırada duruyor. İstenen sıra: **Dönem Raporu · Tedarikler ve Ekstre · Üretim Partileri ·
Makina Kârlılığı · Makina ve Model.**

**Kasa › Hesaplar'da** ekranın tepesinde iki bilgi şeridi var: deneme dönemi uyarısı ve "bakiye,
hesabı belirtilmiş kayıtları sayar" notu, altında da hesabı belirtilmemiş kayıtların sayıları ve
listeleri. Kullanıcı Kasa'ya **hesap bakiyelerini** görmek için giriyor; bugün bakiye tablosuna
ulaşmak için bu bilgi bloğunun üzerinden geçmek gerekiyor. İstenen: bu blok sayfanın sonuna,
**Çalışan avanslarından sonra** insin.

Başarı şu: Giderler'in çubuğu istenen sırada; Kasa açıldığında ilk görülen şey hesap listesi,
bilgi şeritleri ve hesapsız kayıt araçları sayfanın en altında.

İki iş tek spec'te, çünkü ikisi de "yalnız çizim sırası" işi, ikisi de tek görsel kanıt turunda
ölçülür ve ikisinin de kabul ölçütü aynı: motor, izin, sunucu, veritabanı ve metinler değişmemiş
olacak. Ayrı spec'lere bölünse iki ayrı kanıt turu çekilir ve ikinci tur birincinin görüntülerini
geçersiz kılardı.

---

## Requirements

### A. Giderler görünüm çubuğu

- **R1.** Görünüm çubuğunun sırası şu olur: **Dönem Raporu · Tedarikler ve Ekstre · Üretim
  Partileri · Makina Kârlılığı · Makina ve Model.** Sekme sayısı (beş), etiketleri ve iç
  değerleri (`rapor`, `tedarikci`, `partiler`, `karlilik`, `makina`) **değişmez**; yalnız dizinin
  sırası değişir.
- **R2.** Açılış görünümü **Dönem Raporu** olarak kalır. Varsayılan dizinin sırasından değil,
  `gecerliGorunum`'un `"rapor"` sabitinden geliyor (ölçüldü, `Giderler.jsx:43`), yani sıra
  değişikliği varsayılanı hiç etkilemez. Genel aramadan gelen `baslangicGorunum` yolu (0026 R3) ve
  bilinmeyen değeri sessizce Dönem Raporu'na çeviren `gecerliGorunum` (0082 R10) aynen çalışır.
- **R3.** Dönem seçicisinin hangi görünümde çizildiği değişmez: `DONEMSIZ` yalnız Üretim
  Partileri'ni içerir, diğer dört görünümde dönem seçicisi ve geçersiz aralık uyarısı bugünkü
  gibidir.
- **R4.** Sıra **tek yerde** yazılıdır: `GORUNUMLER` dizisi. Ölçüte dönüştürülmüş hâli: beş
  etiketi **birlikte** taşıyan tek dosya `src/components/Giderler.jsx`'tir; `src/`,
  `scripts/evidence/` ve `tests/` altında ikinci bir dosya beşini birden içermez. Tek gerekçeli
  istisna, sıranın kendisini sınayan `tests/ui/standart-kalkar-0082.test.jsx`'tir (C4 ile ters
  çevrilen kriter). Kaynak taraması bunu sabitler (AC-6). Tek tek etiketler bugün de birçok
  dosyada geçiyor (başlık ve yorum olarak, Context'te ölçüldü); tarama onları aramaz.
- **R5.** Giderler'in başlık satırı kuralı (0061 TY kararı) değişmez: görünüm çubuğu tek satırda
  ve daralmaz (`flex: "0 0 auto"`), sağ grup (hatırlatma kapsamı, açık kalemler, dönem seçici)
  sığmazsa bütün olarak alt satıra iner. Dar pencerede çubuğun kendisi 0022 kararıyla iki satıra
  bölünebilir; **hangi sekmenin alt satıra düştüğü** yeni sırada değişebilir, bu kabul edilir.
  Kural kaynak taramasıyla **ve** gerçek yerleşimle kanıtlanır: var olan Electron testi
  (`scripts/tests/donem-raporu-yerlesim.cjs`, gerçek `Giderler`'i 1280 ve 1024 px'te çizer) iki
  iddia alır, yeni bir yerleşim sayfası açılmaz (AC-7).

### B. Kasa › Hesaplar yerleşimi

- **R6.** Hesaplar görünümünün yeni çizim sırası şudur:

  1. Başlık ve düğmeler (Aylık Gider ve Kasa Raporu, Virman, Yeni Hesap)
  2. Görünüm çubuğu (Hesaplar / Çek Portföyü)
  3. Hesap listesi, hesap yoksa boş durum kutusu
  4. Seçili hesabın hareketleri
  5. **Çalışan avansları**
  6. **Hesabı belirtilmemiş kayıtlar bloğu**, deneme dönemi şeridi dahil, R7'deki sekiz
     parçasıyla ve bugünkü iç sırasıyla

- **R7.** Taşınan parça **bütündür** ve iç sırası korunur. Blok şu sekiz parçadan oluşur
  (bugünkü sırasıyla): deneme dönemi şeridi (`deneme-donemi`) · hesapsız notu (`hesapsiz-notu`) ·
  başlangıç tarihi satırı (`hesapsiz-esik-satiri`) · sayı satırları (`hesapsiz-sayilar`: ödeme,
  tahsilat, kapsam dışı) · kapsam dışı açıklaması (`kapsam-disi-aciklama`) · hesapsız ödemeler
  listesi (`hesapsiz-odemeler`) · hesapsız tahsilatlar listesi (`hesapsiz-tahsilatlar`) · kapsam
  dışı bırakılanlar listesi (`kapsam-disi-listesi`). Blok parçalanmaz, parçaları ekranın iki ayrı
  yerine dağıtılmaz (bulgu B1). Bloğun üstüne **bölüm başlığı, ayırıcı çizgi ya da yeni kap
  eklenmez**; blok bugünkü parçalarıyla olduğu gibi taşınır (C1 yeni metni yasaklıyor, bulgu
  Ö-11).
- **R8.** `HESAPSIZ_NOTU` metni **değişmez**: "… Hesabı belirtilmemiş kayıtlar **aşağıda** ayrıca
  listelenir." Blok bütün olarak taşındığı için listeler yine notun altındadır ve cümle doğru
  kalır. (Yalnız şeritler taşınsaydı bu cümlenin düzeltilmesi gerekirdi, B1.) **Kabul edilen
  ödün:** aynı notun ilk cümlesi ("Bakiye, hesabı belirtilmiş hareket ve tahsilatları sayar") bir
  bakiye kaydıdır ve taşımadan sonra bakiye tablosunun çok altında kalır. Metin C1 gereği
  değişmez, blok R7 gereği bölünmez, bu uzaklık bilinçli olarak kabul edilir (bulgu Ö-11).
- **R9.** Blokların çizilme koşulları değişmez: deneme şeridi yalnız deneme dönemi açıkken,
  başlangıç tarihi satırı bugünkü koşuluyla, kapsam dışı sayı satırı sıfırken hiç çizilmez,
  üç liste yalnız kendi düğmesiyle açılır. Aç/kapa düğmeleri ("Ödemeleri göster", "Listeyi
  göster", kapsam dışı "Göster", "Hepsini göster") kendi satırlarında, blok içinde kalır.
- **R10.** Çek Portföyü görünümü **değişmez**: bu blokların hiçbiri orada çizilmiyordu ve
  çizilmeye başlamaz.
- **R11.** Hesap yokken (boş durum kutusu) blok yine sayfanın sonundadır: boş durum kutusu üstte,
  Çalışan avansları onun altında, blok en altta.
- **R12.** Taşınan üç listenin sayfalaması (0062: 10 satır, sayfa düğmeleri, sıfırlama anahtarları)
  ve toplu işlemlerin "Listedeki n kaydı …" metni **değişmez**.
- **R13.** Bütün işlevler aynı kalır: satırda hesap atama, tek kaydı ve listeyi kapsam dışı
  bırakma, kapsama alma, hareketi olan hesabın silme/taşıma yolu (0056), hesap satırındaki
  "n hareket" ibaresi ve başlık metni.

### C. İkisi için ortak

- **R14.** Bu iş **yalnız çizim sırasıdır.** Saf motorlar (`src/lib/*`), izinler, sunucu
  (`electron/`), veritabanı, birleştirme, yazdırma ve dışa aktarma değişmez.
- **R15.** Test kimlikleri (`data-testid`) ve erişilebilir adlar korunur, hiçbiri yeniden
  adlandırılmaz; bu sayede mevcut testlerin çoğu dokunulmadan yeşil kalır.
- **R16.** `docs/tasarim-sozlugu.md`'nin `UyariSeridi` bölümüne **istisna maddesi** yazılır.
  Bugünkü tanım "ekranın üstünde ya da bir bölümün başında" diyor (`:182`) ve bu iş iki şeridi
  sayfanın sonuna indiriyor; CLAUDE.md'nin kuralı gereği her ekran dönüşümü sözlüğü besler.
  Eklenecek madde: ekran düzeyindeki kalıcı bilgi şeridi, kullanıcının ekrana asıl geliş
  nedeninin önüne geçiyorsa bölümüyle **birlikte** sayfa sonuna alınabilir, şerit kendi
  bölümünden koparılmaz; örnek olarak `src/components/Kasa.jsx`'in Hesaplar görünümü (R6, R7)
  gösterilir. C1'in "hiçbir metin değişmez" kuralı korunur, çünkü değişen sözlük, uygulama metni
  değildir (AC-23).

---

## Constraints

### Uyulması zorunlu

- **C1.** Hiçbir **uygulama** metni değişmez. Ne şerit cümleleri, ne sekme etiketleri, ne sayı
  satırları. Sabitler (`HESAPSIZ_NOTU`, `KAPSAM_DISI_ACIKLAMA`, `KAPSAM_SUZGEC_FARKI`,
  `denemeDonemiMetni`) oldukları dosyada ve oldukları gibi kalır (yerleri Context'te ölçüldü).
  R16'nın sözlük maddesi bu kuralın dışındadır (belge metni).
- **C2.** Giderler'in sırası yalnız `GORUNUMLER` dizisinden gelir (R4). Sekmeleri adıyla gezen
  mevcut testler (`getByText("Makina ve Model")`) ve görüntü aracının adım listeleri sıradan
  bağımsızdır, değiştirilmez. **Dizi tek satır olarak düzenlenir:** `docs/tasarim-sozlugu.md`
  üç yerde `src/components/Giderler.jsx`'in satır numarasına atıf yapıyor (`:282`, `:309`,
  `:343`) ve `tests/tasarim-kaynak.test.js` (0009 AC-20) o satırda bileşenin geçtiğini denetliyor;
  diziyi birden çok satıra bölmek üç atfı birden kırar. Satır sayısı yine de değişirse sözlüğün
  üç örneği aynı işte güncellenir (AC-24).
- **C3.** Kasa'da taşıma bir **JSX bloğunun yer değiştirmesidir**: durum değişkenleri, `useMemo`
  hesapları, `usePagination` çağrıları ve yazma yolları yerinde kalır, yeniden düzenlenmez.
  Taşıma sırasında bileşen bölünmez, yeni dosya açılmaz. Ölçüldü: bloğun okuduğu her değer
  (`esik` `:188`, `hepsiniGoster` `:189`, `hesapsizO` `:192`, `esikBilgisi` `:195`, üç liste
  bayrağı `:198`–`:200`, `topluDugme`, `hoIzgara`/`tIzgara`/`oIzgara`) `return`'den önce
  hesaplanıyor, yani JSX'in yeri değişince hiçbiri etkilenmez.
- **C4.** 0082'nin iki kabul kriteri bu işle **ters çevrilir**. Ölçüldü:
  `tests/ui/standart-kalkar-0082.test.jsx:44` (AC-1) **iki** iddia taşıyor ve ikincisi
  ("'Standart Genel Gider' metni ekranda hiç yok") 0082'nin kaldırma kanıtıdır, **aynen
  korunur**; yalnız dizi yeni sırayla yazılır. `:48` (AC-2) "üçüncü sekme" iddiasını "ikinci
  sekme" olarak alır. İki kriterin seçicisi bugünkü hâliyle kalır
  (`getByRole("radiogroup", { name: "Görünüm" })` içindeki `radio` düğmeleri, `:39`). Test
  yorumlarında "spec 0083 ile güncellendi" notu yazar; kriterler silinmez.
- **C5.** Görsel kanıtın kapsamı ölçülmüş kümelerle yazılır (bulgu B-3, Context'teki tablo):
  1. **Bilinçli değişen:** çubuğun göründüğü Giderler ekranları ve Kasa'nın **35** Hesaplar
     ekranı, kabaca **115 ekran / 230 görüntü**.
  2. **0 fark beklenen:** Kasa'nın **14** Çek Portföyü ekranı, `giderler-mahsup` (Giderler
     kabuğunu hiç çizmiyor, 0082 raporunda kanıtlı 0 piksel) ve uygulamanın geri kalanı.
  3. Hangi ekranın `beklenen: "degisti"` kaydı alacağına **iş raporunun kendi fark listesi**
     karar verir (0082'nin yöntemi); spec önden "bütün ekranlar" demez, çünkü tam boy pencere
     açan bazı ekranlarda çubuk pencerenin arkasında kalıp 0 fark verebiliyor.
  4. `degisti` kaydı **değişen bir ekranın kaydı olan her dosyaya** yazılır, yalnız iki bileşene
     değil: ölçülen on sekiz dosya Context'te sayılı (0081'in emsali de birçok dosyaya yazdı).
     Yalnız Çek Portföyü ekranlarına kaydı olan satırlar `ayni` kalır.
  5. Onay satırı biçimi `Takım Yöneticisi · 2026-10-GG · spec 0083 R1/R6`.
- **C6.** Deneme dönemi şeridi hesap satırındaki silme düğmesinden uzaklaşır. Hesap satırındaki
  bugünkü `title` ibaresi ("Deneme döneminde hareketi olan hesap da silinebilir.") kalır; silme
  penceresine ek uyarı eklenmez (bulgu B2).
- **C7.** Kanıt turu **parçalı** alınır ve birleştirilir: tam tur 333 ekran × iki tema = 666
  görüntü, tek çalıştırma 10 dakika sınırına takılıyor. `EKRAN_PARCA` `rapor-i.json` yazar,
  `0009-birlestir.cjs` ise `rapor.json` okur; parçalar **önce** `rapor.json`'a birleştirilir,
  yoksa araç sessizce takılır (0080'in tuzağı). Bilinen gürültü: `uygulama-menu-kasali` bir kez
  31/37 piksel verdi, iki ağaç aynı turda çekilince 0'a indi; AC-21'in "0 piksel" iddiası bu
  kayıtla yazılır.

### KAPSAM DIŞI

- **X1.** Sekme adlarını değiştirmek. Adlar 0082'de karara bağlandı ("Tedarikler ve Ekstre"),
  burada yalnız sıra değişir.
- **X2.** Kasa'da hesapsız kayıt aracını katlanan kutuya çevirmek (0081'in deseni) ya da ona
  ayrı bir görünüm açmak. Blok alta indiği için ekranın üstünü artık doldurmuyor; katlama ayrı
  bir iştir, istenirse sonra konuşulur.
- **X3.** Deneme dönemi mekanizması (0056), başlangıç tarihi eşiği (0051) ve kapsam dışı
  kuralları (0058). Hiçbiri bu işte açılmaz.
- **X4.** Giderler'in sağ grubunun (hatırlatma kapsamı, açık kalemler, dönem seçici) yerleşimi ve
  Dönem Raporu'nun kutu düzeni (0067, 0081).
- **X5.** Çek Portföyü'nün kendi yerleşimi.
- **X6.** Hesapsız **makina** tahsilatlarının hiçbir iş listesinde görünmemesi (0058 X6, bilinen
  boşluk). Bu spec listelerin yerini değiştirir, kapsamını değiştirmez.
- **X7.** `docs/rehber/` altındaki **iki** kullanıcı belgesinin
  (`gider-kasa-rehberi.html`, `gider-kasa-kurulum.html`) ve PDF'lerinin güncellenmesi (bulgu B3,
  ölçüm Context'te).
- **X8.** Kasa'nın görünüm değerinin doğrulanması. Ölçüldü: Giderler'in `gecerliGorunum`
  emsalinin Kasa'da karşılığı yok, görünüm dalı `gorunum === "cek" ? … : …` olduğu için
  bilinmeyen bir `baslangicGorunum` sessizce Hesaplar'ı açıyor. Bugün zararsız, bu işte
  değişmez.

---

## Context

### Giderler görünüm çubuğu (doğrulandı, taban `52df9a9`)

| Ne | Yer | Bugün |
|---|---|---|
| Sıra dizisi | `src/components/Giderler.jsx:37` | `rapor`, `makina`, `tedarikci`, `partiler`, `karlilik` (tek satır) |
| Dönemsiz görünüm | `src/components/Giderler.jsx:41` | `DONEMSIZ = new Set(["partiler"])` |
| Bilinmeyen görünüm | `src/components/Giderler.jsx:43` | `gecerliGorunum` → `"rapor"` sabiti |
| Açılış durumu | `src/components/Giderler.jsx:69` | `useState(() => gecerliGorunum(baslangicGorunum))` |
| Çubuğun çizimi | `src/components/Giderler.jsx:282` | `Segment ariaLabel="Görünüm" options={GORUNUMLER}`, kap `flex: "0 0 auto"` |
| Dönem seçici ve uyarı | `src/components/Giderler.jsx:302`, `:312` | `!DONEMSIZ.has(gorunum)` koşuluyla |

Değişiklik tek satırdır (`:37`). `DONEMSIZ`, `gecerliGorunum` ve çizim satırı dizinin sırasına
bakmaz, bu yüzden dokunulmaz. `Segment` varsayılan olarak `genislik="esit"` çiziyor, yani
çubuğun toplam genişliği sıradan bağımsızdır (etiketler aynı kaldığı için toplam da aynı kalır).

**Satır numarası bağımlılığı (C2).** `docs/tasarim-sozlugu.md` üç yerde bu dosyanın satırına atıf
yapıyor: `:61` → `Giderler.jsx:282` (Segment), `:176` → `:343` (başka bileşen örneği), `:198` →
`:309` (UyariSeridi). `tests/tasarim-kaynak.test.js:101` (0009 AC-20) o satırda bileşenin geçtiğini
denetliyor. `GORUNUMLER` 37. satırda olduğu için tek satırlık bir değişiklik numaraları
kaydırmaz; dizi çok satıra bölünürse üç atıf birden kırılır.

**Etiketlerin bugünkü dağılımı (R4'ün taraması buna göre yazıldı).** Beş etiket `src/` altında tek
tek birçok dosyada geçiyor: "Dönem Raporu" dört dosyada (`AcikKalemler`, `DonemRaporu`,
`Giderler`, `lib/aramaGider.js`), "Tedarikler ve Ekstre" iki (`Tedarikciler`, `Giderler`),
"Üretim Partileri" dört (`App`, `UretimPartileri`, `Giderler`, `GlobalSearch`), "Makina
Kârlılığı" beş (`App`, `CustomerDetailModal`, `MakinaKarliligi`, `MakinaMaliyetDetay`,
`Giderler`), "Makina ve Model" iki (`MakinaModelGorunumu`, `Giderler`). **Beşini birlikte taşıyan
tek dosya `Giderler.jsx`.** Görüntü aracı (`scripts/evidence/0009-sayfa.jsx`) sekmeyi **adıyla**
geziyor (ör. `["Makina ve Model"]`), sıralı liste tutmuyor.

### Kasa › Hesaplar bugünkü yerleşim (doğrulandı)

| Sıra | Parça | Satır (`src/components/Kasa.jsx`) |
|---|---|---|
| 1 | Başlık, rapor düğmesi, Virman, Yeni Hesap | `:477`–`:489` |
| 2 | Görünüm çubuğu (Hesaplar / Çek Portföyü) | `:490` |
| 3 | Çek Portföyü dalı (`gorunum === "cek"`) | `:491`–`:495` |
| 4 | **Deneme dönemi şeridi** | `:498` |
| 5 | **Hesapsız notu** | `:499`–`:502` |
| 6 | Başlangıç tarihi satırı (0051) | `:504`–`:521` |
| 7 | Sayı satırları (ödeme, tahsilat, kapsam dışı) | `:522`–`:539` |
| 8 | Kapsam dışı açıklaması | `:540`–`:542` |
| 9 | Hesapsız ödemeler listesi | `:543`–`:573` |
| 10 | Hesapsız tahsilatlar listesi | `:574`–`:612` |
| 11 | Kapsam dışı bırakılanlar listesi | `:613`–`:631` |
| 12 | Hesap listesi ya da boş durum | `:633`–`:665` |
| 13 | Seçili hesabın hareketleri | `:667`–`:700` |
| 14 | Çalışan avansları | `:703`–`:704` |

Taşınacak olan 4–11 numaralı parçalardır (`:498`–`:631`); hedef yer 14'ten hemen sonra, görünüm
dalının kapanışından (`:705`) önce. Bloğun içindeki her şey (koşullar, `usePagination` çağrıları,
düğme işleyicileri) olduğu gibi gider.

Üç listenin başlangıç durumu **kapalı** (`:198`–`:200` hepsi `useState(false)`) ve açılışta hesap
seçili değil (`secili = baslangicHesapId`, `:176`), yani taşınan blok varsayılan hâlde üç kısa
satırdır: şerit, not ve sayı satırları.

### Metinlerin yeri (ölçüldü, bulgu K-12)

- `HESAPSIZ_NOTU` → `src/lib/kasa.js:17` ("Bakiye, hesabı belirtilmiş hareket ve tahsilatları
  sayar. Hesabı belirtilmemiş kayıtlar aşağıda ayrıca listelenir.")
- `denemeDonemiMetni` → `src/components/Kasa.jsx:34`
- `KAPSAM_DISI_ACIKLAMA`, `KAPSAM_SUZGEC_FARKI` → **`src/components/Kasa.jsx:31` ve `:32`**
  (0058; `src/lib/kasa.js`'te değil, ikisi de bileşenden dışa veriliyor)
- `calisan-avanslari` kimliği → `src/components/kasa/CalisanAvanslari.jsx:141`

### Tasarım sözlüğüyle çelişki (bulgu B-4)

`docs/tasarim-sozlugu.md:182`: "Uyarı şeridi: **ekranın üstünde** ya da bir bölümün başında,
renkli zeminli bilgi satırı." Bu iş iki şeridi (`aile="uyari"` ve `aile="bilgi"`) sayfanın en
sonuna indiriyor. CLAUDE.md'nin kuralı: "bundan sonraki her ekran dönüşümü ona atıf yapar ve
oradan beslenir." Emsal: 0080 sayfalama istisnasını, 0082 iki satırı sözlüğe yazdı. Bu yüzden
R16 ve AC-23 eklendi.

### Etkilenen testler (ölçüldü)

| Dosya | Durum |
|---|---|
| `tests/ui/standart-kalkar-0082.test.jsx:44` (AC-1) | **Ters çevrilir**: dizi yeni sırayla; ikinci iddia ("Standart Genel Gider" metni yok) aynen korunur (C4) |
| `tests/ui/standart-kalkar-0082.test.jsx:48` (AC-2) | **Ters çevrilir**: "Tedarikler ve Ekstre" artık **ikinci** sekme |
| `tests/tasarim-kaynak.test.js:101` (0009 AC-20) | Sözlüğün üç `Giderler.jsx:<satır>` örneğini denetliyor; dizi tek satır kalırsa dokunulmaz (C2) |
| `scripts/tests/donem-raporu-yerlesim.cjs` | **İki iddia eklenir** (R5, AC-7): 1280 px'te çubuk tek satır, 1024 px'te düğmeler pencerenin içinde |
| Sekmeyi adıyla gezen testler (`gider-dagitim-0072`, `uretim-partisi`, `personel-atama`, `sayfalama-0062`, `gider-perdesi`, `sayfalama-kalkar-0080`, `kutular-kapali-0081`, `kutu-duzeni-0067`) | Dokunulmaz; sıradan bağımsız |
| Kasa testleri (`ui/kasa`, `ui/kasa-avans`, `ui/kasa-0051`, `ui/kasa-deneme-donemi`, `ui/kasa-kapsam-disi`, `ui/tahsilat-hesap`, `ui/kasa-app`) | Dokunulmaz; ölçüldü: hiçbiri DOM sırası iddia etmiyor, `getByTestId` ve seçenek listesiyle çalışıyor; `compareDocumentPosition` yalnız `ui/kasa-izin-akordeonu-0066`'da ve orada UserManager akordeonlarını ölçüyor |
| `getByRole("radiogroup", { name: "Görünüm" })` kullanan tek dosya | `tests/ui/standart-kalkar-0082.test.jsx:39`; indeksle gezen başka test yok |
| `scripts/tests/suzgec-yerlesim.cjs` | Dokunulmaz; ölçüldü: Customers'ın süzgeç çubuğunu ölçüyor, Giderler'i değil |
| `tests/spec-atiflari.test.js` | `TASINACAK` listesi şu an **boş** (0082 kapanışı temiz); bu işin planı yazılınca 0083'ün iki dosyası listeye eklenir |

Sekme etiketleri değişmediği için çubuğun toplam genişliği aynıdır; yeni bir Electron yerleşim
**sayfası** gerekmez, var olan Dönem Raporu düzeneğine iki iddia eklenir (R5).

### Görsel kanıt aracının çekim biçimi (ölçüldü, bulgu K-17)

`scripts/evidence/0009-ekran.cjs` her ekranı **tam sayfa** çekiyor: pencereyi içeriğin yüksekliğine
büyütüyor (`Math.min(Math.max(900, h), 6000)`) ve sonra `capturePage()` çağırıyor. `kaydir:<metin>`
adımı yalnız **pencere içi** kutular için (araçtaki yorum da böyle diyor). Ölçülen en uzun sayfalar:
Kasa'da 1699 CSS px (`kasa-0062-hesapsiz-tahsilatlar`), Giderler'de 3266 CSS px
(`giderler-0080-kalemler-tam`); 6000 px sınırına yaklaşan ekran yok.

**Sonuç:** blok sayfanın sonuna inince de bütünüyle çekilir, hiçbir ekrana yeni `kaydir:` adımı
eklemek gerekmez ve **görüntü aracı bu işte hiç değişmez** (AC-25). Bu ölçüm C5'in dayanağıdır:
araç görünüm bazlı çekiyor olsaydı beş Kasa ekranına adım eklemek gerekirdi.

### Görsel kanıtın büyüklüğü (ölçüldü, 0082 raporu üzerinden)

| Küme | Ölçüm |
|---|---|
| Araçtaki toplam ekran | 333 (666 görüntü, iki tema) |
| `giderler-*` ekran | 81 |
| `kasa-*` ekran | 49 |
| Bunların Çek Portföyü adımı taşıyanı | **14** (`kasa-verilen-cek-bakiye` adında "cek" geçse de adımı boş, Hesaplar görünümü) |
| Kasa'nın Hesaplar ekranı | **35** |
| Giderler'de çubuğu hiç çizmeyen ekran | `giderler-mahsup` (yalnız `OdemeKayitPenceresi`, `0009-sayfa.jsx:721`); 0082 raporunda 0 piksel verdi |
| Tam boy pencere nedeniyle 0 verebilen ekran | `giderler-personel-coklu-odeme` 0082 raporunda 0 verdi; hangi ekranın değiştiğine iş raporu karar verir (C5/3) |
| Bilinçli değişen küme | kabaca **115 ekran / 230 görüntü** |

**`degisti` kaydı yazılacak dosyalar (C5/4, on sekiz dosya; parantezde değişen ekran sayısı):**
`src/components/Giderler.jsx` (81), `gider/DonemRaporu.jsx` (51), `src/components/Kasa.jsx` (34),
`gider/OdemeKayitPenceresi.jsx` (12), `gider/OdemeGirisi.jsx` (12), `gider/GiderAlanlari.jsx` (10),
`gider/Tedarikciler.jsx` (8), `gider/MakinaKarliligi.jsx` (7), `gider/MakinaModelGorunumu.jsx` (6),
`gider/EkstrePenceresi.jsx` (5), `gider/KdvKarsilastirmaKarti.jsx` (4),
`kasa/CalisanAvanslari.jsx` (4), `gider/AcikKalemler.jsx` (4), `gider/OdemePlaniPenceresi.jsx` (3),
`gider/UretimPartileri.jsx` (3), `kasa/HesapSilPenceresi.jsx` (2), `gider/FiyatOnerisi.jsx` (1),
`cek/CiroPenceresi.jsx` (1).

`CalisanAvanslari.jsx` listede, çünkü avans kartı bloğun yukarıdan kalkmasıyla **yukarı kayıyor**,
yani kendi ekranı da bilinçli değişiyor. `Giderler.jsx`'in bugün 241, `Kasa.jsx`'in 93 kaydı var;
bu iş onlara dokunmaz, yalnız yeni raporun kayıtlarını ekler (0076 ve 0081'in yöntemi). Spec
`specs/done/`'a taşınırken bütün `degisti` kayıtları `ayni`ye çevrilir
(`tests/kanit-eslemesi.test.js`, 0011 AC-11c bunu zorunlu tutuyor).

### Beklenen git farkı (AC-20, bulgu B-2)

Bu işin commit'inde yalnız şunlar bulunur: `src/components/Giderler.jsx`,
`src/components/Kasa.jsx`, iki yeni test dosyası, ters çevrilen
`tests/ui/standart-kalkar-0082.test.jsx`, `scripts/tests/donem-raporu-yerlesim.cjs`,
`docs/tasarim-sozlugu.md`, `docs/evidence/kanit-eslemesi.json` ve iki yeni rapor, `CLAUDE.md`,
`specs/README.md`, spec dosyası. `src/lib/`, `electron/`, `src/lib/merge.js` ve yazdırma
şablonları farkta **hiç** olmaz.

**Çalışma ağacı bugün kirli:** `specs/README.md` değişik, `docs/rehber/` ve
`scripts/rehber-pdf.cjs` izlenmiyor. Bunlar bu işin commit'inden **önce ya da ayrı** commitlenir,
yoksa fark kümesi baştan ölçülemez.

### Bulgular (öneri kuralı 5)

**B1 · Kasa'da ne kadarı taşınsın?** İstek "deneme dönemi ve bakiye hesabı belirtilmemiş ile olan
yazılar" diyor, yani iki şerit. Ama şeritlerin hemen altındaki sayı satırları ve üç liste aynı
aracın parçası.

- **(a) Karar: bloğun tamamı taşınır (R7).** Gerekçe: `HESAPSIZ_NOTU` "kayıtlar **aşağıda** ayrıca
  listelenir" diyor; şerit alta, listeler üstte kalırsa cümle yanlış olur. Sayı satırındaki
  düğmeler listeleri açıyor, yani araç tek parça okunuyor. Maliyeti: tek JSX bloğunun yer
  değiştirmesi, metin değişikliği yok.
- (b) Yalnız iki şerit taşınır: `HESAPSIZ_NOTU` cümlesinin düzeltilmesi gerekir ("aşağıda" →
  "yukarıda") ve araç ekranın iki ayrı yerinden okunur. Maliyeti: bir sabit metin değişikliği ve
  onu sabitleyen iki testin güncellenmesi, ama ekran daha karışık.
- (c) Yalnız deneme şeridi taşınır: isteğin yarısı; bakiye tablosuna ulaşmak için hâlâ bilgi
  bloğunun üzerinden geçilir.

**B2 · Deneme şeridi silme düğmesinden uzaklaşıyor.** Şerit bugün hesap listesinin hemen üstünde
duruyor ve hareketi olan hesaptaki silme düğmesinin neden göründüğünü açıklıyor. Alta inince
kullanıcı silme düğmesini açıklamayı görmeden kullanabilir.

- **Karar: taşınır, ek uyarı eklenmez (C6).** Hesap satırındaki `title` ibaresi ve silme
  penceresinin kendi açıklamaları (0056) zaten bu durumu söylüyor; deneme dönemi 2027-01-01'de
  kendiliğinden kapanacak geçici bir hâl, kalıcı arayüz eklemeye değmez. Maliyeti: sıfır.
- Alternatif: şerit hesap listesinin üstünde kalır, yalnız hesapsız bloğu alta iner. İsteğin
  birinci yarısı uygulanmamış olur.

**B3 · Kullanıcı rehberi bugün bile eski.** `docs/rehber/gider-kasa-rehberi.html` (henüz depoda
değil, çalışma dosyası) "Giderler ekranındaki **altı** görünüm" diyor ve tabloda "Tedarikçiler" ile
"Standart Genel Giderler" satırları duruyor; yani 0080–0082 sonrası güncellenmemiş. Ölçüm (QA
turu): aynı eski metin ikinci belgede de var, `docs/rehber/gider-kasa-kurulum.html` üç kez
"Standart Genel Giderler" ve üç kez "Tedarikçiler" yazıyor.

- **Karar: rehber bu spec'in kapsamı dışında (X7), ayrı bir iş olarak 0080–0083'ün tamamını
  kapsayacak şekilde ve iki belgeyi birlikte güncellenir** (tablo, sekme sırası, Kasa'nın yeni
  yerleşimi, kaldırılan kutular, PDF'lerin `scripts/rehber-pdf.cjs` ile yeniden üretilmesi).
  Gerekçe: rehberi bu işe eklemek 0080, 0081 ve 0082'nin rehber farklarını da buraya yükler ve
  "yalnız çizim sırası" kapsamını bozar. Maliyeti: ayrı işin kendi süresi; o işe kadar rehber
  yanlış sırayı gösterir.
- Alternatif: rehberin yalnız görünüm tablosu ve Kasa bölümü bu işte düzeltilir. O zaman rehber
  kısmen güncel, kısmen eski olur (kaldırılan kutular hâlâ yazılı), bu daha yanıltıcı.
- Bulgu `specs/README.md`'nin "Açık bulgular" tablosuna **yazıldı** (satır bugün var, commit
  bekliyor); ikinci belge adı o satıra eklenir.

### QA turu kararları (revizyon 2, Takım Yöneticisi, 2026-10-13)

| Bulgu | Karar | Nereye işlendi |
|---|---|---|
| B-1 | AC-6 ölçülebilir hâle gelir: beş etiketi **birlikte** taşıyan tek dosya `Giderler.jsx`; kapsam `src/` + `scripts/evidence/` + `tests/`; tek gerekçeli istisna 0082'nin ters çevrilen testi | R4, AC-6, Context (etiket dağılımı) |
| B-2 | AC-20 testten çıkar, inceleme denetimi olur; beklenen fark kümesi adıyla sayılır; kirli ağaç ayrı commitlenir | AC-20, Context (beklenen git farkı), DoD |
| B-3 | Kanıt kapsamı ölçülmüş kümelerle yazılır: 115 ekran / 230 görüntü değişir, 14 Çek Portföyü + `giderler-mahsup` 0 verir, kararı iş raporu verir | C5/1–3, AC-21, Context (kanıt büyüklüğü) |
| B-4 | `docs/tasarim-sozlugu.md`'nin `UyariSeridi` bölümüne istisna maddesi yazılır | R16, AC-23, Context (sözlük çelişkisi), DoD |
| Ö-5 | `degisti` kaydı değişen ekranın kaydı olan **on sekiz** dosyaya yazılır; `CalisanAvanslari.jsx` dahil | C5/4, AC-21, Context (dosya listesi) |
| Ö-6 | AC-8, AC-9 ve AC-13 `calisan-avanslari` kimliğiyle ve `compareDocumentPosition` ile ölçülür | AC-8, AC-9, AC-13, Context (metinlerin yeri) |
| Ö-7 | R5'in yerleşim iddiası var olan Electron testine iki iddiayla bağlanır; yeni sayfa açılmaz | R5, AC-7, Context (etkilenen testler) |
| Ö-8 | `GORUNUMLER` tek satır kalır; bozulursa sözlüğün üç `dosya:satır` örneği aynı işte güncellenir | C2, AC-24, Context (satır numarası bağımlılığı) |
| Ö-9 | İki test dosyası: `tests/yerlesim-0083.test.js` (taramalar) ve `tests/ui/yerlesim-0083.test.jsx` (bileşen) | DoD, AC-6, AC-20 |
| Ö-10 | Kanıt turu parçalı alınır ve `rapor.json`'a birleştirilir; bilinen gürültü kaydı yazılır | C7, AC-21, DoD |
| Ö-11 | Bakiye kaydının tablodan uzaklaşması kabul edilen ödündür; bloğun üstüne başlık ya da ayırıcı eklenmez | R7, R8 |
| K-12 | `KAPSAM_DISI_ACIKLAMA` ve `KAPSAM_SUZGEC_FARKI`'nın yeri düzeltilir (`Kasa.jsx:31`, `:32`) | Context (metinlerin yeri), C1 |
| K-13 | R6'nın 6. ve 7. satırı birleşir: deneme şeridi bloğun parçasıdır | R6 |
| K-14 | Spec'in Durum satırı "Onaylandı", README satırı olduğu gibi kalır | Başlık tablosu |
| K-15 | Çek Portföyü 14, Hesaplar 35; `kasa-verilen-cek-bakiye` Hesaplar kümesinde | C5/1–2, Context (kanıt büyüklüğü) |
| K-16 | 0082 AC-1'in ikinci iddiası korunur; iki kriter seçiciyi adıyla yazar | C4, AC-1, AC-22 |
| K-17 | Kanıt aracının tam sayfa çektiği ölçümüyle yazılır; araç bu işte hiç değişmez | Context (çekim biçimi), AC-25 |
| K-18 | AC-8 bloğun görünümün son öğesi olduğunu da iddia eder | AC-8 |
| K-19 | DoD'nin B3 maddesi yapılmış olarak işaretlenir; X7 ve README satırı ikinci belgeyi de sayar | X7, B3 bulgusu, DoD |
| K-20 | Kasa'nın görünüm değerinin doğrulanmaması kapsam dışı maddesi olarak yazılır | X8 |

### Plan onayı kararları (revizyon 3, Takım Yöneticisi, 2026-10-13)

Ölçüm: beş etiketi birlikte taşıyan dosya üç tane (`Giderler.jsx`, `scripts/evidence/0009-sayfa.jsx`,
0082'nin testi); AC-6'nın dosya düzeyindeki metni, değişmesi yasak görüntü aracında (AC-25) kırılırdı.

- **P5.** AC-6 dizi düzeyinde ölçülür (beş etiket tek dizi değişmezinde); istisnalar 0082 ve 0083'ün iki UI testi.
- **P6.** Bu işin commit'i yalnız beklenen dosya kümesini alır (dosya dosya, `git status` ile kontrol). Analist dosyaları
  (`docs/rehber/`, `scripts/rehber-pdf.cjs`, README'nin bu işle ilgisiz satırları) yalnız açık talimatla ayrı commitlenir.
- **P7.** Yeni plan yazılmaz; var olan `specs/0083-uygulama-plani.md` güncellenir.
- **P8.** AC-7'nin Electron iddiası görünüm çubuğunun düğmelerine bakar: 1280 px'te aynı üst kenar, 1024 px'te hepsi
  pencerenin içinde ve belge taşmıyor (1024'te tek satır iddia edilmez, R5).
- **P9.** AC-21'in kesin listesi raporun fark listesinden; Çek Portföyü ekranları ve `giderler-mahsup` 0 fark beklenir,
  fark çıkarsa aynı turda yeniden çekilir, yine çıkarsa durulur.

---

## Acceptance Criteria

### A. Giderler görünüm çubuğu

- **AC-1.** Çubukta beş sekme var ve metinleri sırayla şu:
  `["Dönem Raporu", "Tedarikler ve Ekstre", "Üretim Partileri", "Makina Kârlılığı", "Makina ve Model"]`.
  Ölçüm 0082'nin seçicisiyle: `getByRole("radiogroup", { name: "Görünüm" })` içindeki `radio`
  düğmelerinin metinleri.
- **AC-2.** İkinci sekmenin adı "Tedarikler ve Ekstre", beşinci sekmenin adı "Makina ve Model"
  (0082 AC-2'nin yerine geçer).
- **AC-3.** Ekran açıldığında Dönem Raporu seçilidir; beş sekmeye tek tek tıklanınca her biri kendi
  görünümünü çizer (kalem listesi · tedarikçi listesi · parti listesi · kârlılık listesi · makina
  ve model kovaları).
- **AC-4.** Dönem seçicisi Üretim Partileri'nde çizilmez, diğer dört görünümde çizilir; geçersiz
  tarih aralığı uyarısı da aynı koşulla.
- **AC-5.** Genel aramadan `baslangicGorunum="tedarikci"` ile gelen ekran Tedarikler ve Ekstre'yi
  açar; bilinmeyen bir değer (ör. kaldırılmış `"standart"`) sessizce Dönem Raporu'nu açar.
- **AC-6.** Kaynak taraması (`tests/yerlesim-0083.test.js`): beş etiketi **tek bir dizi
  değişmezinde birlikte** içeren tek kaynak dosya `src/components/Giderler.jsx`'tir (revizyon 3, P5).
  Kapsam `src/`, `scripts/evidence/` ve `tests/`; gerekçeli istisnalar sıranın kendisini sınayan iki
  test dosyasıdır: `tests/ui/standart-kalkar-0082.test.jsx` ve `tests/ui/yerlesim-0083.test.jsx`.
  İstisna listesi tam yollu yazılır ve dosya adı değişince test kırılır. Görüntü aracı beş etiketi
  ayrı adım dizilerinde taşır (sıra tutmaz) ve taramaya takılmaz; bu ayrıca gösterilir.
- **AC-7.** Başlık satırının 0061 kuralı durur. İki kanıt: kaynak taramasında çubuğun kabı
  `flex: "0 0 auto"` taşır ve sağ grup kendi kabında bütün olarak kalır; Electron yerleşim
  testinde (`donem-raporu-yerlesim`) 1280 px'te `aria-label="Görünüm"` çubuğunun bütün düğmeleri
  **tek satırda** (aynı üst kenar) ve 1024 px'te hepsi pencerenin içinde, belge yatay taşmıyor.

### B. Kasa › Hesaplar yerleşimi

- **AC-8.** Hesaplar görünümünde DOM sırası şudur (ölçüm `compareDocumentPosition`):
  `hesap-listesi` → (seçiliyse) `hesap-hareketleri` → `calisan-avanslari` → `deneme-donemi` →
  `hesapsiz-notu` → `hesapsiz-esik-satiri` → `hesapsiz-sayilar`. Açık liste yoksa
  `hesapsiz-sayilar`, varsa açılan son liste **Hesaplar görünümünün son öğesidir** (pencere ve
  onay kutuları hariç).
- **AC-9.** `calisan-avanslari` hem `deneme-donemi`'nden hem `hesapsiz-notu`'ndan **önce** gelir;
  ikisi de `hesap-listesi`'nden **sonra** gelir.
- **AC-10.** "Ödemeleri göster" ile açılan `hesapsiz-odemeler`, "Listeyi göster" ile açılan
  `hesapsiz-tahsilatlar` ve "Göster" ile açılan `kapsam-disi-listesi` DOM'da `hesapsiz-sayilar`'dan
  sonra ve `calisan-avanslari`'ndan sonradır.
- **AC-11.** Başlangıç tarihi satırı (`hesapsiz-esik-satiri`) `hesapsiz-notu`'ndan sonra,
  `hesapsiz-sayilar`'dan önce çizilir; "Hepsini göster" düğmesi orada çalışır.
- **AC-12.** Kapsam dışı açıklaması (`kapsam-disi-aciklama`) bugünkü koşuluyla çizilir ve blok
  içinde, sayı satırından sonradır.
- **AC-13.** Hesap yokken `bos-kasa` kutusu çizilir ve sıra şudur: `bos-kasa` →
  `calisan-avanslari` → `hesapsiz-notu`.
- **AC-14.** Çek Portföyü görünümünde `deneme-donemi`, `hesapsiz-notu`, `hesapsiz-sayilar` ve üç
  listenin hiçbiri yok.
- **AC-15.** Deneme dönemi kapalıyken `deneme-donemi` hiç çizilmez; `hesapsiz-notu` yine sayfanın
  sonunda, `calisan-avanslari`'ndan sonradır.
- **AC-16.** Taşınan üç liste sayfalanır (0062): on bir hareketli hesapsız ödeme listesinde ilk
  sayfada on satır ve "Sonraki ›" düğmesi vardır.
- **AC-17.** İşlevler yerinde: hesapsız tahsilat satırından hesap atanır, tek kayıt kapsam dışı
  bırakılır, kapsam dışı kayıt kapsama alınır, toplu düğme "Listedeki n kaydı …" metnini taşır.
- **AC-18.** `hesapsiz-notu` metni birebir `HESAPSIZ_NOTU` sabitidir; `deneme-donemi` metni birebir
  `denemeDonemiMetni(bitis)`'tir. Bloğun üstünde yeni bir başlık, ayırıcı ya da kap yok (R7).
- **AC-19.** Hesap satırında hareketi olan hesabın "n hareket" ibaresi, deneme dönemindeki silme
  düğmesi ve taşıma penceresi (0056) bugünkü gibi çalışır.

### C. Ortak

- **AC-20.** İnceleme denetimi (test değil, git farkı): fark kümesi Context'teki "Beklenen git
  farkı" listesiyle aynıdır; `src/lib/`, `electron/`, `src/lib/merge.js` ve yazdırma şablonları
  farkta hiç yoktur. Çalışma ağacının bu işten önceki kirli dosyaları ayrı commitlenmiştir.
- **AC-21.** Görsel kanıt: iş raporunun fark listesine göre bilinçli değişen ekranlar
  (kabaca 115 ekran / 230 görüntü) `beklenen: "degisti"` + onay satırıyla, **değişen ekranın
  kaydı olan on sekiz dosyanın hepsinde** kayıtlıdır; 14 Çek Portföyü ekranı, `giderler-mahsup`
  ve uygulamanın geri kalanı taban raporuna göre 0 piksel fark verir. Bilinen gürültü ekranı
  (`uygulama-menu-kasali`) aynı turda yeniden çekilerek 0'a indirilir.
- **AC-22.** 0082'nin AC-1 ve AC-2 testleri yeni sırayla güncellenmiştir, AC-1'in ikinci iddiası
  ("Standart Genel Gider" metni ekranda hiç yok) korunmuştur ve yorumlarında "spec 0083 ile
  güncellendi" notu vardır.
- **AC-23.** `docs/tasarim-sozlugu.md`'nin `UyariSeridi` bölümünde R16'nın istisna maddesi yazılı
  ve Kasa'nın Hesaplar görünümünü örnek gösteriyor; sözlüğün biçim denetimleri
  (`tests/tasarim-kaynak.test.js`) yeşil.
- **AC-24.** `GORUNUMLER` tek satırdır ve sözlüğün üç `src/components/Giderler.jsx:<satır>`
  örneği (`:282`, `:309`, `:343`) geçerliliğini korur (`tasarim-kaynak` 0009 AC-20 yeşil).
- **AC-25.** Görüntü aracı (`scripts/evidence/0009-sayfa.jsx`, `0009-ekran.cjs`) bu işte
  değişmemiştir: yeni ekran, yeni `kaydir:` adımı ve silinen adım yok.

---

## Definition of Done

- [x] R1–R16 uygulanmış; Giderler'de tek dizi satırı, Kasa'da tek JSX bloğu taşınmış.
- [x] AC-1…AC-25 karşılanmış; iki yeni test dosyası var: `tests/yerlesim-0083.test.js`
      (AC-6 taraması, istisna listesi) ve `tests/ui/yerlesim-0083.test.jsx` (sekme sırası ve
      Kasa'nın DOM sırası).
- [x] `scripts/tests/donem-raporu-yerlesim.cjs`'ye R5'in iki yerleşim iddiası eklenmiş (AC-7);
      yeni Electron yerleşim sayfası açılmamış.
- [x] 0082'nin iki kriteri yeni sırayla güncellenmiş, AC-1'in ikinci iddiası korunmuş, yorumunda
      bu spec'e atıf var (C4).
- [x] `docs/tasarim-sozlugu.md`'nin `UyariSeridi` bölümüne istisna maddesi yazılmış (R16, AC-23);
      sözlüğün üç `Giderler.jsx:<satır>` örneği geçerli (AC-24).
- [x] `npm test` ve `npm run lint` yeşil; Electron testleri de koşulmuş (0067'nin dersi).
- [x] Taban raporu (`0083-taban-piksel-raporu.json`) bugünkü kodla değişecek ekranlarda 0 fark
      gösteriyor; iş raporu (`0083-piksel-raporu.json`) alınmış. İki tur da **parçalı** çekilmiş
      (`EKRAN_PARCA`) ve parçalar `0009-birlestir.cjs` çağrılmadan önce `rapor.json`'a
      birleştirilmiş (C7).
- [x] `docs/evidence/kanit-eslemesi.json`'a bu işin kayıtları `beklenen: "degisti"` + onay ile,
      **değişen ekranın kaydı olan dosyaların hepsine** eklenmiş (C5/4; rapor on dokuz dosya verdi, on sekizinci sonrası `GiderForm.jsx`, plan §6); yalnız Çek
      Portföyü ekranlarına kaydı olan satırlar `ayni` kalmış.
- [x] Görüntü aracı değişmemiş (AC-25); kanıt aracının tam sayfa çektiği Context'te yazılı.
- [x] Git farkı Context'teki beklenen kümeyle aynı (AC-20); çalışma ağacının bu işten önceki
      kirli dosyaları (`specs/README.md`, `docs/rehber/`, `scripts/rehber-pdf.cjs`) ayrı
      commitlenmiş.
- [x] `CLAUDE.md`'nin Giderler ve Kasa bölümlerindeki sıra ibareleri güncellenmiş.
- [x] `specs/README.md`'de spec satırı ve sıra cümlesi güncellenmiş; `tests/spec-atiflari.test.js`
      `TASINACAK` listesi bu işin iki dosyasıyla doldurulmuş ve done'a taşınırken boşaltılmış.
- [x] Bulgu B3 açık bulgular tablosunda (satır **zaten yazılı**) ve ikinci belge adı
      (`docs/rehber/gider-kasa-kurulum.html`) o satıra eklenmiş.
- [x] Takım Yöneticisi onayladı. **Commit ve sürüm yayını yalnız açık talimatla yapılır.**
- [x] **SCORECARD dolduruldu**, kanıt eşlemesindeki `degisti` kayıtları `ayni`ye çevrildi
      (`kanit-eslemesi.test.js`, 0011 AC-11c) ve spec `specs/done/` klasörüne taşındı.

---

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Spec revizyon sayısı** | 3 | Revizyon 2 (geliştirme öncesi QA turu), revizyon 3 (plan onayı, P5–P9: AC-6 dizi düzeyinde tarama, commit kümesi, plan dosyası, AC-7 iddiaları, AC-21 kapsamı). |
| **Düzeltme turu sayısı** | 0 | Triyaj turu açılmadı. |
| **Bulgu gerçek/gürültü oranı** | 0 / 0 | |
| **Regresyon sayısı** | 0 | Süit 329 dosya / 4139 test yeşil (Electron dahil), lint 0 hata. |
| **Kaçan hata** | 0 | |

**Bu spec'ten çıkarılan ders:**

- Kanıt kapsamını önceki raporun ekran adlarından tahmin etmek eksik kalır: Giderler sayfasını bir pencerenin ya da kabuğun arkasında çizen on ekran (gider formu, kilit, kayıt perdesi, menü) da değişti. Değişen küme ve `degisti` kaydı alacak dosyalar iş raporundan sayılmalı (C5/3 bu yüzden doğruydu); spec'in 18 dosyası 19 çıktı.
- Yalnız seçili ekranlarla çekilen taban turu da 10 dakika sınırına takılabiliyor (125 ekran, "Object has been destroyed"); `EKRAN_SEC` kümesi ikiye bölünüp çekilmeli.
- Analistin çalışma ağacında sürdürdüğü `specs/README.md` düzenlemeleri iş commit'ine karışmasın diye README parça parça (`git update-index --cacheinfo`) sahnelendi; P6'nın "beklenen dosya kümesi" kuralı dosya içinde de geçerli.
