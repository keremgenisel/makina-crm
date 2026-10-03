# 0026 — Genel Aramanın Yeni Modülleri Kapsaması

| | |
|---|---|
| **Durum** | Tamamlandı (commit `b7275b8`, dal `feat/0026-genel-arama`) |
| **Sahip** | Analist (spec) · geliştirme sahibi atanacak |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Genel arama kutusu |
| **Bağımlı spec'ler** | 0001 (gider kaydı) · 0020–0024, 0040–0042 (tamamlandı) · 0052 (Kasa sekme izni) · 0062 (sayfalama) · 0068 (çek gizliliği) |
| **Revizyon** | 4 · 2026-10-03 TY kararı: R7'nin kapsam listesi kaldırıldı (palette sağa doğru uzuyordu); R7, R17, R21, R22, X5, AC-12, AC-34 buna göre düzeltildi. Revizyon 3 · triyaj: R16 (tarih adayı sorgu biçimine göre), R25 ve AC-42..AC-43 eklendi (TY kararı). Revizyon 2: plan onayı, R3, R5, R10, R16, R18, AC-7, AC-31 düzeltildi; R19–R24 eklendi (plan U1–U11) |

---

## Intent

Uygulamanın üst köşesindeki arama kutusu, kullanıcının bir şeyi bulmak için ilk baktığı yer.
Bugün müşteri, belge, bayi, makina, yedek parça, kalıp, servis, not, üretim formu, dosya ve
çalışan arıyor; son bir yılda eklenen gider modülünün hiçbir parçasını aramıyor. Kullanıcı bir
tedarikçinin adını ya da bir gider kalemini aradığında sonuç alamıyor ve bunun sebebini
anlamıyor, çünkü arama kutusu neyi aradığını söylemiyor.

Başarı şu demek: gider modülünün kayıtları da aramada çıkıyor, sonuç tıklanınca doğru ekranda
doğru kayda gidiliyor, ve gider verisini görmeye yetkisi olmayan kullanıcıya bu sonuçlar hiç
görünmüyor.

---

## Requirements

- **R1.** Arama şu kayıtları da kapsar: **gider kalemleri**, **tedarikçiler**, **tekrarlayan gider
  tanımları**, **standart genel giderler**. **Gider türü kendi sonuç satırı DEĞİLDİR** (K-19): tür adı
  yalnız gider kaleminin aranan bir alanıdır (AC-2), çünkü kullanıcı tür adını yazdığında o türdeki
  kalemleri bekler, türün tanımını değil. Context'teki "beş veri bölümü" ifadesi bu yüzden dört sonuç
  türüne karşılık gelir.
- **R2.** Gider kaleminde aranan alanlar: açıklama, gider türü adı, tedarikçi adı, tutar ve tarih.
  **Personel davranışlı kalem genel aramada HİÇ ÇIKMAZ** (B-1): ne açıklamasıyla, ne çalışan adıyla, ne
  tutarıyla, ne tarihiyle bulunur; aynı kural **personel tanımları** için de geçerlidir. Sebep kodda
  yazılı: tekrarlayan personel kalemi üretilirken açıklama alanı tanımın adıdır, tanım adı yoksa
  çalışanın adıdır (`src/lib/gider.js:680` `aciklama: t.ad || c.ad`), ayrıca kalemin kendi `calisanAd`
  sütunu vardır (`electron/db.cjs:226`). Yarım çözüm (adı gizle, tutarı göster) satırın varlığını teyit
  eder ki asıl sızıntı odur: "bu kişinin bu ayda maaş kaydı var".
- **R3.** Sonuç tıklanınca ilgili ekranda o kayda gidilir. Hedefler: gider kalemi **Giderler > Dönem
  Raporu**, tedarikçi **Giderler > Tedarikçiler**, standart gider **Giderler > Standart Genel Giderler**
  (Ö-6: bu görünüm Giderler'de yaşıyor, `src/components/Giderler.jsx:36` ve `:373`; Ayarlar'da değil),
  tekrarlayan tanım **Ayarlar > Giderler > Tekrarlayan Giderler** (panelin ekrandaki adı; kimliği `gidertanim`),
  üretim partisi **Giderler > Üretim Partileri**, kasa hesabı **Kasa** (o hesap seçili açılır), çek **Kasa > Çek
  Portföyü** (çekin yönünde, süzgeç "Tümü" ile; varsayılan süzgeçler "Elde" ve "Ödenmeyi bekleyen" tahsil edilmiş,
  ciro edilmiş ya da ödenmiş çeki gizlerdi). Vurgu ve sayfa atlaması yoktur (X8).
- **R4.** Gider sonuçları **yalnız gider yetkisi olan** kullanıcıya görünür; **hesap ve çek sonuçları
  kasa yetkisi** ister (B-4: bu iki tür Kasa ekranında yaşıyor ve Kasa'nın 0052'den beri kendi sekme
  izni var; kapı, sonucun gittiği ekranın iznidir). Yayın perdesi inikken gider sonuçları görünmez.
  **Perde `allowedTabs` ile taşınmaz** (B-3): `src/App.jsx:161` visibleTabs'ı yalnız `kasa` için perdeyle
  süzer, `gider` perde inikken de listede kalır; bu yüzden kapı `izinli("gider")` değil, App'in zaten
  hesapladığı `giderYetki` / `kasaYetki` değerleridir (bkz. C9).
- **R5.** Sıradaki işlerin ürettiği kayıtlar da kapsanır: taksit planı olan kalem **taksidin vade
  tarihiyle** bulunur ve eşleşmenin nedeni ekrandaki tarih biçimiyle (`fmtTR`, GG/AA/YYYY) "taksit vadesi:
  GG/AA/YYYY" olarak yazılır (Ö-13: "2/5" gibi
  sıra biçimi aranmaz, her kalemde bulunduğu için ayırt edici değil), üretim partisi **adı, açıklaması ve
  dönemi (başlangıç/bitiş ayı)** ile bulunur (B-5: parti tablosunda numara alanı YOK,
  `electron/db.cjs:263-266`; "numarasıyla" şartı kaldırıldı), kasa ve banka hesapları adıyla bulunur
  (0024), çek numarasıyla, keşidecisiyle ve bankasıyla bulunur (0040; alacaklı adı için R13).
- **R6.** Sonuç satırları bugünkü desene uyar: başlık, ikinci satırda ayırt edici bilgi, eşleşmenin
  nedeni. Eşleşme nedeni için mevcut `ekstra` alanı kullanılır (bugün yalnız müşterilerde dolu,
  `src/components/GlobalSearch.jsx:83-89`); ad dışı bir alandan yakalanan gider kaydı da nedenini yazar.
- **R7.** Boş kutu ("En az 2 karakter yazın.") ve "Sonuç bulunamadı." ekranları **bugünkü gibi kalır**; aranan
  kayıt türlerinin listesi **gösterilmez** (TY kararı 2026-10-03, revizyon 4: liste paletin içinde sağa doğru uzuyordu).
  Kapsam boşluğu yeni türlerin aramaya eklenmesiyle kapanır; sonuç gelen türler kategori çiplerinde adıyla görünür.
- **R8.** Arama performansı bozulmaz: yeni kayıt türleri de aynı tek geçişli süzme içinde taranır.
  Ölçülebilir şart (Ö-18): arama **ham `giderler`** dizisi üzerinde çalışır, sonuç satırında ödeme
  durumu gösterilmez ve sonuç nesnesi tek `useMemo` içinde üretilirken `odemeleriUygula` çağrılmaz; bu
  bir kaynak taraması testiyle sabitlenir. Sebep: ödeme durumu türetilmiş veridir, tuş başına ödeme
  motoru çalıştırmak R8'i ihlal eder.
- **R9.** Tedarikçide aranan alanlar: **ad, yetkili, telefon, vergiNo** (Ö-12). Eposta, adres ve not
  alanı aranmaz. Gerekçe: bayi emsaliyle aynı dar seçim (ad, yetkili, şehir); vergi no gerçek bir arama
  anahtarı, eposta ve adres gürültü üretir.
- **R10.** Standart gider **grup başına tek satır** olarak çıkar (Ö-8). Tablo grup başına çok sürüm
  tutuyor (`grupId` + `baslangicAy/bitisAy`, `electron/db.cjs:294-297`), süzülmezse "Kira" aranınca aynı
  ad beş kez listelenir. Gösterilen sürüm, bugünün ayı için `standartGiderAyi` kuralıyla seçilen güncel
  sürümdür; **bu ay geçerli sürümü olmayan grup da çıkar** (süresi bitmiş ya da gelecek ayda başlayan):
  gösterilen sürüm sırasıyla bu ay geçerli olan, yoksa gelecekte en erken başlayan, yoksa en son bitendir. Meta
  satırı yürürlük ayını yazar, gerekirse "sona erdi" / "başlamadı" ekler. Ad grubun bütün sürümlerinde aranır.
  Gerekçe: "grup başına ayda tek sürüm" kuralı motorda zaten var, arama onu tekrar etmelidir; ama
  `standartGiderAyi` bu ay geçerli olmayan grubu hiç döndürmez, yalnız onu kullanmak kaydı aramadan sessizce
  düşürürdü (plan U3).
- **R11.** **Kapalı kayıtlar da aranır** ve meta satırında "kapalı" ibaresi taşır (Ö-10): kapalı kasa
  hesabı (`kasa_hesaplari.kapali`), kapatılmış tekrarlayan tanım (`gider_tanimlari.kapatildi`), kapanmış
  üretim partisi. Emsal: üretim formu satırı bugün `u.kapali && "kapalı"` yazıyor
  (`src/components/GlobalSearch.jsx:98`). Gerekçe: kapalı kayıt da geçmişte var, aramanın işi bulmaktır.
- **R12.** Çöp kutusu süzmesi **yalnız soft-delete taşıyan bölümlerde** anlamlıdır (Ö-9): gider kalemi,
  tedarikçi ve üretim partisi `deletedAt` taşır; tekrarlayan tanım, standart gider, kasa hesabı ve çek
  **kalıcı silinir** ve `deletedAt` sütunu yoktur. App aramaya canlı dizileri verir (`liveGiderler`,
  `liveTedarikciler`, `liveUretimPartileri`), süzme koşulunda `!x.deletedAt` savunma amaçlı korunur.
- **R13.** Çekin **alacaklısı çalışan olabilir** (`cekler.alacakliTur` / `alacakliAd`). Çek `no`, `banka`
  ve `kesideci` ile bulunur; `alacakliAd` yalnız `alacakliTur !== "calisan"` iken aranır ve gösterilir,
  çalışan alacaklıda alacaklı alanı ne aranır ne yazılır (Ö-16). Gerekçe: AC-18 çalışır kalır ve
  0068'in "alacaklısı çalışan olan çek çıktıya girmez" duvarı delinmez.
- **R14.** Hedefi Ayarlar olan sonuç **`settings` sekmesini de** ister (Ö-7): tekrarlayan tanım sonucu
  `giderYetki && izinli("settings")` ile çıkar, standart gider sonucu (hedefi Giderler olduğu için)
  yalnız `giderYetki` ile. Emsal: çalışan sonucu bugün `izinli("settings") && onGoCalisanlar` ile
  gösteriliyor (`src/components/GlobalSearch.jsx:69`). Gerekçe: ulaşılamayan sonuç gösterilmez.
- **R15.** Yeni kategoriler `KAT_SIRA`'nın **sonuna**, şu sırayla eklenir (Ö-17): gider kalemleri,
  tedarikçiler, standart giderler, tekrarlayan tanımlar, üretim partileri, kasa hesapları, çekler.
  `KAT_SIRA` hem grup hem çip sırasıdır (`src/components/GlobalSearch.jsx:17`); sona eklemek C4'ü lafzen
  korur ve mevcut çip düzenini kaydırmaz.
- **R16.** Tarih ve tutar aramasının biçim kuralı (Ö-11): `aramaNormalize` noktalama atmıyor
  (`src/lib/utils.js:156-157`), bu yüzden tarihte ayraç olarak **nokta, eğik çizgi ve tire** kabul edilir
  ("15.03.2026", "15/03/2026" ve "2026-03-15" aynı kaydı bulur; ekrandaki `fmtTR` biçimi GG/AA/YYYY'dir). Aday sorgunun
  biçimine göre **tektir**: dört haneli yılla başlayan sorgu ISO biçiminde, diğeri ekran biçiminde aranır; ikisi birden
  aranırsa gün ve ay ters sırada durduğu için kısmi "10.03" (10 Mart) 3 Ekim'i de bulurdu (triyaj). Tutarda
  sorgu ile hedef **noktalamadan arındırılmış rakam dizisine** indirgenir ve **eşitlik** aranır, içerme değil:
  "20.000" 20000 tutarlı kalemi bulur, 120.000 tutarlı kalemi bulmaz; kuruşlu biçim ("1.234,50") de eşitlenir.
  Hedef tutarlar kalem listesinde görünen ikisidir: KDV hariç (`kalemTutari`) ve Ödenecek (`odenecekTutar`), ikisi
  de hareket okumayan saf hesaptır. Tarih ve tutar eşleşmesi **yalnız sorgu rakam ve ayraçtan oluşuyorsa**
  çalışır; metin sorgusu rakam aramasına düşmez. Gerekçe: kullanıcı ekranda gördüğü biçimi yazar; ham alanı
  aramak spec'in kendi "sessiz kapsam boşluğu" tuzağını yeniden kurar, içerme ise gürültü üretir (plan U2, U4).
- **R17.** Kategori tanımları **tek tablodan** gelir (Ö-15): bugünkü `KAT` / `KAT_SIRA` genişletilir ve
  her türün kapısı da o tablodadır. Ölçüt: tablonun anahtar kümesi ile arama sonuç nesnesinin
  anahtar kümesi **eşittir**, bunu bir test doğrular. Gerekçe: yeni bir tür tabloya eklenip sonuç
  nesnesine eklenmezse (ya da tersi) sessizce aranmaz; küme eşitliği bunu yakalar.
- **R18.** Gider kaleminde ve tedarikçide **vurgu/odak altyapısı kurulmaz, mevcut süzgeç ön doldurulur**
  (B-2). `Giderler` bugün odak prop'u almıyor (tek giriş prop'u `baslangicOdemeFiltresi`,
  `src/components/Giderler.jsx:41-60`) ve kalem listesi 10'luk sayfalıdır
  (`src/components/gider/DonemRaporu.jsx:268`), yani vurgulanacak kalem üçüncü sayfada olabilir. Davranış:
  Giderler açılır, dönem kalemin **gider tarihinin** ayına kurulur (taksit vadesiyle bulunan kalemde de; Dönem
  Raporu gider tarihine göre listeler) ve kalem süzgeci **kaydın kendi metniyle** dolu gelir: açıklaması, yoksa
  tedarikçi adı; ikisi de boşsa tür süzgeci kalemin türüne kurulur. Aramadaki sorgu süzgece yazılmaz: ekran
  süzgeci yalnız açıklama, çalışan ve tedarikçi adına bakar ve Türkçe harfleri sadeleştirmez (`trLower`), genel
  arama ise tür, tutar, tarih ve vadeyle de bulur ve sadeleştirir (`aramaNormalize`); sorguyla dolan süzgeç bu
  kalemlerde boş liste açardı (plan U1, C7 süzgeci değiştirmeyi yasaklar). Tedarikçi sonucunda `gorunum`
  "tedarikci" açılır. Gerekçe: süzgeç değeri 0062'nin sayfa sıfırlama anahtarının parçası, liste kendiliğinden
  birinci sayfaya döner ve genelde tek satır kalır. Odak artı sayfa atlama
  yolu 0062 R27'nin kırpma kurallarıyla yeni bir durum üretir ve yeni altyapı ister.

- **R19.** Personel tespiti iki koşulludur (plan U5): kayıt, türünün davranışı personel **ya da** `calisanId`
  alanı dolu ise personeldir. Gerekçe: türü silinmiş ya da değişmiş personel kaleminin davranışı "normal"e düşer
  ve R2'yi deler. Aynı kural tekrarlayan tanımlarda geçerlidir (personel tanımının adı varsayılan olarak çalışanın
  adıdır, `src/components/settings/SettingsGiderTanimlari.jsx`).
- **R25.** Gider tarihi yürürlük ayından önce olan kalem aramada **çıkmaz** (triyaj, TY kararı): yürürlük öncesi kalem
  hiçbir hesaba ve listeye girmez (borç özeti, Dönem Raporu), tıklanınca görünmezdi. Eşik borç özetinin kuralıyla aynıdır
  (`YYYY-AA-01`); App yürürlük ayını aramaya geçirir.
- **R20.** Çek sonuç satırı çekin durumunu ve vadesini yazmaz (plan U7): verilen çekin "Ödendi" durumu bir ödeme
  durumudur (AC-37); bağlı çekin vadesi tahsilattan okunur. Meta satırı yön, banka ve keşideci ya da (çalışan
  değilse) alacaklı yazar.
- **R21.** Arama kutusunun yer tutucusu değişmez (plan U10).
- **R22.** Yetki iki katmanda aynı değerle uygulanır (plan U11): App gider ve kasa dizilerini yalnız `giderYetki`
  / `kasaYetki` varken verir, bileşen aynı iki değeri prop olarak alıp kategori kapısında kullanır. Kapı kategori
  tablosunda tek yerdedir (AC-10, AC-27, AC-28).
- **R23.** Tedarikçi sonucu sayfalı Tedarikçiler listesini açar, kaydın sayfasına atlanmaz (plan U9, X8).
- **R24.** Hedef ekran her sonuç tıklamasında yeniden kurulur (Anasayfa'nın "Giderlerde Görüntüle" emsali,
  `key`); ekrandaki önceki süzgeç ve görünüm durumu korunmaz.

## Constraints

- **C1.** Arama **salt okunurdur**; hiçbir sonuç kaydı değiştirmez.
- **C2.** Yetki kuralı tek kaynaktan gelir: mevcut sekme görünürlüğü kontrolü kullanılır, aramaya özel
  ikinci bir yetki mantığı yazılmaz. Gider ve kasa kapısı için uygulaması C9'dadır.
- **C3.** Yeni izin veya sunucu değişikliği yoktur.
- **C4.** Yeni kayıt türü eklenirken mevcut türlerin davranışı ve sıralaması değişmez (uygulaması R15).
- **C5.** Kullanıcıya görünen metinler Türkçedir.
- **C6.** Personel gizliliği aramada da geçerlidir (R2).
- **C7.** **Ekran içi gider süzgeci değişmez; genel aramanın kapsamı bilerek daha dardır** (K-24).
  Dönem Raporu'nun kalem süzgeci bugün çalışan adını da arıyor
  (`src/components/gider/DonemRaporu.jsx:257`, "Açıklama, çalışan, tedarikçi ara") ve o hâliyle kalır:
  yetkili bir ekranın içinde, personel grubu varsayılan kapalı. Bu iki arama **birleştirilmez**; aksi
  hâlde R2'nin gizlilik kararı delinir.
- **C8.** Yayın perdesi bugün **kalkıktır** (`src/lib/yayinPerdesi.js`, `GIDER_PERDESI = false`,
  2026-09-30'da kaldırıldı). R4'ün perde şartı ve AC-11 yine yazılır, çünkü mekanizma yerindedir ve işaret
  yeniden açılabilir; AC-11 `vi.mock` ile perde inik kurularak sınanır, yoksa kriter bugünkü derlemede
  hiçbir şeyi ölçmez (K-20).
- **C9.** Gider ve kasa kapısı **App'in zaten hesapladığı** `giderYetki` ve `kasaYetki` değerlerinden
  prop olarak gelir; `allowedTabs` bu iş için değiştirilmez (menü dahil her tüketicisini etkiler) ve
  aramada ikinci bir yetki mantığı yazılmaz (B-3; C2'nin uygulaması).

### KAPSAM DIŞI

- **X1.** Hesaplanan rakamların aranması (makina maliyeti, kârlılık, KDV karşılaştırması) — *neden:* bunlar
  kayıt değil, hesap sonucu; arama kayıt bulur.
- **X2.** Gelişmiş arama (tarih aralığı, tutar aralığı, alan seçerek arama) — *neden:* her ekranın kendi
  süzgeci var; arama kutusu hızlı bulma aracıdır.
- **X3.** Arama geçmişi, öneriler veya sık kullanılanlar — *neden:* ayrı bir ürün kararı.
- **X4.** Çöp kutusundaki kayıtların aranması — *neden:* bugünkü davranış canlı kayıtlarla sınırlı ve
  korunuyor (uygulanabilirlik sınırı R12'de).
- **X5.** Yurt dışı faturalarının, müşteri ödemelerinin, **müşteri görüşmelerinin** ve **hesap
  hareketlerinin** aranması — *neden:* bu spec gider modülünü kapatıyor; bu dört tür ayrı bir eksik ve
  kendi kararını bekler. Liste tam yazıldı, çünkü kapsam dışı da bir karardır ve belgede görünür olmalıdır (K-25).
- **X6.** Arama paletinin **tasarım sözlüğüne dönüştürülmesi** — *neden:* sözlük "arama ya da süzgeç
  sonucu boşsa da `BosDurum`" diyor (`docs/tasarim-sozlugu.md:157`) ama palet 0016'da hiç
  dönüştürülmedi ve `tasarim.jsx`'i içe aktarmıyor. Dönüştürülürse `tests/tasarim-kaynak.test.js:131`
  `kanit-eslemesi.json` kaydı ister ve iş piksel kanıtı zincirine girer. Yeni metinler paletin bugünkü
  yerel stiliyle yazılır (K-21).
- **X7.** Sonuç satırında **ödeme durumu, kalan borç ya da ödenen tutar gösterilmesi** — *neden:* bunlar
  hareketlerden türetiliyor ve her tuş vuruşunda ödeme motoru çalıştırmak R8'i ihlal eder.
- **X8.** Gider kaleminin ya da tedarikçinin listede **vurgulanması, odak altyapısı ve sayfa atlaması** —
  *neden:* R18'de karar verildi, mevcut süzgeç ön doldurulur; odak yolu 0062 sayfalamasıyla çarpışır.

## Context

- **Bugün ne aranıyor.** `src/components/GlobalSearch.jsx` on bir tür tarıyor: müşteriler, belgeler,
  bayiler, makinalar, yedek parçalar, kalıplar, servisler, notlar, üretim formları, dosyalar ve
  çalışanlar. Her türün kendi süzme satırı ve kendi sonuç biçimi var; yetki kontrolü `izinli("sekme")`
  ile yapılıyor.
- **Ne aranmıyor.** Gider modülünün veri bölümlerinin hiçbiri: gider kalemleri, gider türleri, tekrarlayan
  tanımlar, tedarikçiler, standart genel giderler. Bu modül uygulamanın en yeni ve en çok kayıt üreten
  parçası; arama kutusunda hiç yok. Bunlardan **gider türü kendi sonuç satırı olmayacak** (R1), yani dört
  sonuç türü eklenecek, artı sıradaki işlerin ürettikleri (R5).
- **Ekranın içinde arama zaten var.** Dönem Raporu'nun kalem süzgeci açıklama, çalışan ve tedarikçi
  arıyor (`src/components/gider/DonemRaporu.jsx:257`) ve 0062'den beri sayfa sıfırlama anahtarıdır
  (`:268`). Bu iki şey işi iki yerden etkiliyor: genel aramanın gider kapsamı bilerek daha dar olacak
  (C7) ve sonuca tıklandığında odak yerine bu süzgeç ön doldurulacak (R18).
- **Yetki ve perde.** Gider sekmesi bu uygulamada özel bir kurala tabi: sekme listesi tanımsız kullanıcı
  onu görmez, ve yayın perdesi inikken modül kullanıcıya kapalıdır. Aramanın bu iki kapıyı da tanıması
  gerekir (R4); yoksa perde arkasındaki veri arama sonucunda görünür ve perdenin anlamı kalmaz. Bugünkü
  kodda `allowedTabs` perdeyi taşımıyor: `src/App.jsx:161` yalnız `kasa`'yı perdeyle süzüyor, `gider`
  perde inikken de listede kalıyor. Perde ayrıca 2026-09-30'da kaldırıldı (C8), bu yüzden AC-11 perdeyi
  testte inik kurarak ölçer. Kasa hesapları ve çekler **Kasa**'nın kendi sekme izninin arkasında (0052),
  yani gider yetkisi onlar için yetmez (R4, B-4).
- **Gizlilik.** Personel kalemlerinde çalışan bazlı tutarlar uygulamanın en hassas verisi ve hiçbir
  çıktıya girmiyor. Arama sonucu bir çıktı değil ama aynı mantık geçerli: çalışan adıyla gider aramak, o
  kişinin maaş kaydını listelemenin kolay yolu olurdu (R2).
- **Sıra.** Bu iş bilerek en sona konuyor. Taksit (0021), parti (0022) ve kasa (0024) yeni kayıt türleri
  üretiyor, çek portföyü (0040) de bir tanesini daha ekliyor; arama onlardan önce yazılırsa her biri için
  yeniden elden geçirilir.

Bilinen tuzaklar:

- **Sessiz kapsam boşluğu.** Kullanıcı aramada sonuç alamayınca "kayıt yok" sanıyor, oysa "aranmıyor". Bu spec
  gider türlerini aramaya ekleyerek boşluğu kapatır; kapsam listesi (revizyon 4 ile) ekranda gösterilmez.
- **Yetki sızıntısı.** Yeni tür eklerken yetki kontrolünü unutmak, gider verisini yetkisiz kullanıcıya
  gösterir. C2 tek kaynak şartını koyar.
- **Performans.** Arama her tuş vuruşunda çalışıyor; yeni türler ayrı geçişler olarak eklenirse yazarken
  takılma başlar (R8). Özel tuzak: kalemin ödeme durumu `odemeleriUygula` ile türetiliyor, bu yüzden arama
  ham `giderler` üzerinde çalışır ve ödeme durumu göstermez (X7).
- **Biçim körlüğü.** `aramaNormalize` noktalama atmıyor (`src/lib/utils.js:156-157`): kullanıcı
  "15.03.2026" ya da "20.000" yazdığında ham alan eşleşmez ve arama sessizce boş döner, yani birinci
  tuzağın aynısı tutar ve tarih için tekrar kurulur (R16).
- **Yinelenen sürüm.** Standart gider grup başına çok sürüm tutuyor; süzülmezse tek ad beş satır olarak
  listelenir (R10).
- **Açıklama = çalışan adı.** Tekrarlayan personel kaleminin açıklaması tanımın adıdır, tanım adı yoksa
  çalışanın adıdır (`src/lib/gider.js:680`). "Açıklamayı ara, çalışan adını aramayacağım" demek bu yüzden
  kendi kendini yalanlar; personel kalemi bütünüyle kapsam dışıdır (R2).

---

## Acceptance Criteria

- **AC-1.** Gider kaleminin açıklamasıyla arama yapıldığında o kalem sonuçlarda çıkar.
- **AC-2.** Gider türünün adıyla arama yapıldığında o türdeki kalemler çıkar (türün kendisi satır olmaz).
- **AC-3.** Tedarikçi adıyla arama yapıldığında hem tedarikçi kaydı hem ona bağlı gider kalemleri çıkar.
- **AC-4.** Tekrarlayan gider tanımının adıyla arama yapıldığında o tanım çıkar (personel tanımları hariç,
  AC-20).
- **AC-5.** Standart genel gider adıyla arama yapıldığında o kayıt çıkar.
- **AC-6.** **Personel kalemi hiçbir alanıyla bulunmaz:** çalışan adıyla, kalemin açıklamasıyla, tutarıyla
  ya da tarihiyle arama yapıldığında o kalem sonuçlarda çıkmaz (R2).
- **AC-7.** Gider kalemi sonucuna tıklandığında Giderler sekmesi açılır, dönem o kalemin gider tarihinin ayına
  kurulur ve kalem süzgeci kaydın kendi metniyle (açıklama, yoksa tedarikçi adı, ikisi de yoksa tür süzgeci) dolu
  gelir; tür adıyla ya da tutarla bulunan kalem de listede görünür (R18).
- **AC-8.** Tedarikçi sonucuna tıklandığında Giderler > Tedarikçiler görünümü açılır.
- **AC-9.** Tekrarlayan tanım sonucuna tıklandığında Ayarlar > Giderler > Tekrarlayan Giderler açılır; standart
  gider sonucuna tıklandığında Giderler > Standart Genel Giderler görünümü açılır (R3).
- **AC-10.** Gider yetkisi olmayan kullanıcının aramasında hiçbir gider sonucu görünmez.
- **AC-11.** Yayın perdesi inikken hiçbir gider sonucu görünmez (perde `vi.mock` ile inik kurulur, C8).
- **AC-12.** Arama kutusunun boş durumunda ve "Sonuç bulunamadı." ekranında kayıt türü listesi çizilmez; iki ekran
  bugünkü metinleriyle kalır (R7, revizyon 4).
- **AC-13.** Mevcut on bir kayıt türünün arama sonuçları ve sıralaması değişmez; ölçütü
  `tests/ui/global-search.test.jsx`'in **dokunulmadan** yeşil kalmasıdır.
- **AC-14.** Çöp kutusundaki gider kalemleri aramada çıkmaz (soft-delete taşıyan bölümler için, R12).
- **AC-15.** Taksit planı olan bir kalem, taksidin vade tarihiyle de bulunur.
- **AC-16.** Üretim partisi adı, açıklaması veya dönemi (başlangıç ayı) ile arama yapıldığında o parti
  bulunur.
- **AC-17.** Kasa veya banka hesabının adıyla arama yapıldığında o hesap bulunur.
- **AC-18.** Çek numarası, keşidecisi ya da bankasıyla arama yapıldığında o çek bulunur.
- **AC-19.** Tekrarlayan personel kaleminin açıklamasıyla (ki o açıklama tanımın adıdır) arama yapıldığında
  sonuç dönmez.
- **AC-20.** Personel tanımının adıyla arama yapıldığında sonuç dönmez.
- **AC-21.** Tedarikçinin vergi numarasıyla arama yapıldığında o tedarikçi bulunur; epostasıyla aranınca
  bulunmaz (R9).
- **AC-22.** Aynı grupta beş sürümü olan standart gider **tek satır** olarak çıkar ve meta satırı yürürlük
  ayını yazar (R10).
- **AC-23.** Kapalı bir kasa hesabı aramada çıkar ve meta satırında "kapalı" ibaresi taşır.
- **AC-24.** Kapatılmış bir tekrarlayan tanım aramada çıkar ve "kapalı" ibaresi taşır.
- **AC-25.** Çöpteki tedarikçi ve çöpteki üretim partisi aramada çıkmaz.
- **AC-26.** Alacaklısı çalışan olan çek numarasıyla bulunur; alacaklının adıyla aranınca bulunmaz ve
  sonuç satırında alacaklı adı yazmaz (R13).
- **AC-27.** Gider yetkisi olup kasa yetkisi olmayan kullanıcının aramasında hesap ve çek sonucu çıkmaz,
  gider kalemi sonucu çıkar.
- **AC-28.** Ayarlar sekmesi olmayan gider kullanıcısında tekrarlayan tanım sonucu çıkmaz, standart gider
  sonucu çıkar (R14).
- **AC-29.** Ekranda görünen tarih biçimiyle (GG.AA.YYYY) arama yapıldığında o tarihli kalem bulunur.
- **AC-30.** Binlik ayracıyla yazılan tutarla (örnek: 20.000) arama yapıldığında o tutarlı kalem bulunur.
- **AC-31.** Taksit vadesiyle bulunan kalemin sonuç satırında eşleşme nedeni "taksit vadesi: GG/AA/YYYY"
  olarak yazar (ekrandaki `fmtTR` biçimi).
- **AC-32.** Gider kaydı ad dışı bir alandan yakalandığında eşleşmenin nedeni sonuç satırında gösterilir
  (R6).
- **AC-33.** Yeni kategoriler `KAT_SIRA`'nın sonunda ve R15'teki sırada yer alır; mevcut on bir kategorinin
  sırası aynı kalır.
- **AC-34.** (Revizyon 4 ile kaldırıldı: kapsam listesi yok; yetki süzmesi AC-10, AC-27, AC-28'de.)
- **AC-35.** Kategori tablosunun anahtar kümesi, arama sonuç nesnesinin anahtar kümesine eşittir (R17).
- **AC-36.** Arama sonuç nesnesi tek `useMemo` içinde üretilir ve `odemeleriUygula` çağrılmaz; kaynak
  taramasıyla sabitlenir (R8).
- **AC-37.** Sonuç satırlarının hiçbirinde ödeme durumu, ödenen tutar ya da kalan borç yazmaz (X7); çek satırı
  çekin durumunu yazmaz (R20).
- **AC-38.** Bu ay geçerli sürümü olmayan (süresi bitmiş ya da gelecek ayda başlayan) standart gider grubu da tek
  satır olarak çıkar ve meta satırı durumunu yazar (R10).
- **AC-39.** Tutar araması eşitliktir: "20.000" ile 120.000 tutarlı kalem bulunmaz; metin sorgusu tutar ve tarih
  aramasına düşmez (R16).
- **AC-40.** Türü personel olmayan ama `calisanId` taşıyan kalem ve tanım aramada çıkmaz (R19).
- **AC-42.** Kısmi tarih sorgusu ters sırayla eşleşmez: "10.03" 10 Mart kalemini bulur, 3 Ekim kalemini bulmaz (R16).
- **AC-43.** Yürürlük ayından önce tarihli kalem aramada çıkmaz; yürürlük ayının ilk günü tarihli kalem çıkar (R25).
- **AC-41.** Çek sonucuna tıklandığında Kasa › Çek Portföyü çekin yönünde ve süzgeç "Tümü" ile açılır; hesap
  sonucuna tıklandığında Kasa o hesap seçili açılır (R3).

## Definition of Done

- [x] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [x] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor. Yeni kriterler
      `tests/ui/genel-arama-0026.test.jsx`'e yazıldı (K-23).
- [x] Yetki kontrolü mevcut tek kaynaktan yapılıyor; aramaya özel ikinci mantık yazılmadı (C2, C9).
- [x] Perde inikken gider sonuçlarının çıkmadığı testle gösterildi (AC-11, perde `vi.mock` ile inik).
- [x] Personel gizliliğinin aramada da korunduğu testle gösterildi (AC-6, AC-19, AC-20).
- [x] Kasa yetkisi ayrımı testle gösterildi (AC-27) ve Ayarlar hedefli sonucun `settings` şartı (AC-28).
- [x] Mevcut arama davranışının değişmediği, `tests/ui/global-search.test.jsx` **dokunulmadan** yeşil
      kalarak gösterildi (AC-13).
- [x] Kategori tablosu tek kaynak; anahtar kümesi eşitliği testi yazıldı (AC-35) ve `odemeleriUygula`
      kaynak taraması eklendi (AC-36).
- [x] Görsel kanıt: `docs/evidence/0026-taban-piksel-raporu.json` ve `0026-piksel-raporu.json`, boş durum,
      "Sonuç bulunamadı" durumu ve gider sonuçları dâhil. Palet `tasarim.jsx` kullanmadığı için
      `kanit-eslemesi.json` kaydı yok (0052 ve 0066 emsali, K-22).
- [x] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [x] `CLAUDE.md` aramanın kapsamıyla güncellendi; yeni kayıt türü eklerken aramaya da eklenmesi gerektiği
      ve ekran içi gider süzgeciyle **birleştirilmemesi** gerektiği (C7) yazıldı.
- [x] Takım Yöneticisi onayladı. Commit ve sürüm yayını yalnız açık talimatla.
- [x] SCORECARD dolduruldu ve spec `specs/done/` klasörüne taşındı.

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Spec revizyon sayısı** | 3 | Revizyon 2 plan onayı (U1–U11: süzgeç ön doldurma, tarih biçimi, standart gider grubu); revizyon 3 triyaj (tarih adayı, yürürlük öncesi kalem); revizyon 4 TY kararı (kapsam listesi kaldırıldı). |
| **Düzeltme turu sayısı** | 2 | Triyaj turu (dört bulgu) ve kapsam listesinin kaldırılması. |
| **Bulgu gerçek/gürültü oranı** | 4 / 0 | Kısmi tarih ters sırayla eşleşiyordu; görsel kanıt dosyaları eksikti (plan "çekildi" diyordu, çekim sürüyordu); yürürlük öncesi kalem bulunup tıklanınca görünmüyordu; kalem eşleşmesi gereksiz hesap yapıyordu. |
| **Regresyon sayısı** | 0 | 270 ekran × 2 tema önce/sonra: ilgisiz bütün ekranlar 0 piksel; `global-search.test.jsx` dokunulmadan yeşil. İki kaynak taraması (sözlük satır atfı, KalemListesi prop listesi) yer değiştiği için güncellendi. |
| **Kaçan hata** | 1 | Boş durumdaki "Aranan kayıtlar" listesi gerçek uygulamada paletin içinde sağa doğru uzuyordu; TY kararıyla kaldırıldı. |

**Takım Yöneticisi onayı:** görsel değişiklik (6 `arama-*` görüntüsü) ve kapanış, 2026-10-03 kapanış talimatıyla.

**Bu spec'ten çıkarılan ders:**
- İki biçimde aynı alanı "içerme" ile aramak, parçaların sırası ters olduğunda yanlış eşleşme üretir ("10.03" ISO'da 3 Ekim'i
  bulur). Tam tarih testi bunu yakalamaz; kısmi sorgu ayrıca sınanmalı ve aday sorgunun biçimine göre tek seçilmeli.
- Bir sonuca tıklayınca açılan ekranın süzgeci, aramanın bulduğu alanlara bakmıyorsa sorguyla doldurmak boş liste açar;
  süzgeç kaydın kendi metniyle doldurulmalı. Aynı mantık "bulunur ama hedef ekranda görünmez" kayıtlara da uygulanır
  (yürürlük öncesi kalem).
- Kanıt planda "çekildi" diye yazılmadan önce dosyalar depoda olmalı; uzun çekim sürerken belge yazmak triyajda eksik
  bulgusu üretir. Çekim sırasında test takımı paralel koşmamalı (ilgisiz ekranlarda 31–249 piksellik sahte fark).
- Kâğıt üzerinde makul görünen bir görsel öğe (kapsam listesi) gerçek pencerede denenmeden spec'e yazıldı; yeni görsel
  öğe spec aşamasında bir taslak görüntüyle sınanmalı.
