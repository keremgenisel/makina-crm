# 0116 — İhraç kayıtlı ibare kutusu formlardan kalkar

| | |
|---|---|
| **Durum** | Tamamlandı (revizyon 2: QA turu ve plan turu Karar 29–36, 2026-10-29; uygulama commit `ea35746`; plan `specs/done/0116-uygulama-plani.md`) |
| **Sahip** | Analist |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | **Kaynak:** `src/components/customers/CustomerAddEditForm.jsx`, `src/components/PartSaleForm.jsx`, `src/components/YedekParcaSatisForm.jsx`, `src/components/IhracKayitliAlani.jsx` (R13 ile `IhracKayitliOzet.jsx`), `src/lib/ihracKayitli.js`'in yalnız bu kutuya ait yedi metin sabiti. **Kanıt ve test:** `scripts/evidence/0009-sayfa.jsx`, `docs/evidence/kanit-eslemesi.json`, `tests/ui/ihrac-kayitli-0114.test.jsx`, `tests/ihrac-kayitli-0114.test.js`, `tests/tasarim-kontrast.test.js`. **Belge:** `CLAUDE.md`, `specs/README.md`, `docs/tasarim-sozlugu.md`. Hesap, veri modeli, rapor ve dışa aktarma dokunulmaz (Ö-9). |
| **Bağımlı spec'ler** | 0114 (işareti kuran spec) |
| **Ters çevrilen kriterler** | 0114 AC-31, AC-32, AC-33, AC-34; 0114 AC-12'nin kutu yokluğu yarısı artık kendiliğinden doğru (AC-7 ile yeniden yazılır). **0114 AC-35 (KDV kutusundaki beş özet satırı) aynen kalır** ve kaldırılan dört kriterle aynı describe'da durduğu için toptan silinmemelidir (K-8). Ölçüldü, başka ters çevrilen yok. |

---

## Intent

Satışı giren kişi, satış tipini "İhraç Kayıtlı" seçtiğinde formun ortasında bir kanun metni, onun altında kopyalanabilir bir ibare kutusu ve bir fatura notu açılıyor. Bu metinler formu uzatıyor ve kaydı girmekle ilgisi olmayan bir karar anlatıyor: ibare faturaya bu uygulamadan değil, e-fatura yazılımından yazılıyor. Takım Yöneticisi kutunun üç satış formundan da kalkmasını istiyor. Bu iş bittiğinde satış tipi seçildiğinde form kısalır, KDV kutusunun içindeki beş rakam satırı (matrah, faturadaki toplam KDV, ertelenen KDV, tahsil edilecek KDV, tahsil edilecek fatura toplamı) aynen yerinde kalır ve hiçbir rakam, rozet, rapor ya da dışa aktarma sütunu değişmez.

---

## Requirements

### A. Kutunun kalkması

- **R1.** Müşteri (satış) formunda ihraç kayıtlı seçildiğinde açıklama kutusu artık çizilmez.
- **R2.** Extra Kalıp satış formunda aynı kutu çizilmez.
- **R3.** Yedek parça satış formunda aynı kutu çizilmez.
- **R4.** Kutunun dört parçası da hiçbir ekranda kalmaz: açıklama cümlesi, salt okunur ibare alanı, Kopyala düğmesi ve onun durum satırı, "uygulama yurt içi fatura basmaz" notu.
- **R5.** Yalnız yedek parça formunda çizilen üretim sınırı satırı da kalkar (kutunun parçasıdır).
- **R6.** Kutuyla birlikte kullanımdan düşen metin sabitleri kaynaktan silinir; ikinci bir kopyası başka bir ekrana taşınmaz.
- **R6/2.** Üç çağrı satırının üstündeki açıklama yorumları da silinir (`CustomerAddEditForm.jsx:561`, `PartSaleForm.jsx:152`, `YedekParcaSatisForm.jsx:167`); kaldırılan bir kutuyu anlatan yorum sahipsiz kalmaz (K-5).

### B. Değişmeyenler

- **R7.** Satış tipi seçicisi beş seçenekle kalır ve "İhraç Kayıtlı" seçeneği aynı yerde durur.
- **R8.** İşaret seçilince KDV kutusunun içindeki beş özet satırı üç formda da bugünkü gibi çizilir.
- **R9.** Tevkifat kutusunun pasifleşmesi ve yanındaki neden cümlesi aynen kalır.
- **R10.** Listelerdeki ihraç kayıtlı rozeti, Kalan Borç kartındaki satır, müşteri detayının KDV hücresi, müşteri listesinin Fatura sütunu ve Makina Geçmişi'nin satış pili değişmez.
- **R11.** Aylık rapor kutusu, Finans ve Giderler'deki ertelenen KDV satırı ve üç dışa aktarma sütunu değişmez.
- **R12.** Kayıtlı veri değişmez: işaret alanı, üç tablodaki sütunu, tek yazıcısı ve tek kapısı aynen kalır.

### C. Kaynak, kanıt ve belge (QA turu, 2026-10-29)

- **R13.** Kutu kalkınca dosyada yalnız iki kardeş kalır (`IhracKayitliOzetSatirlari`, `IhracKayitliRozeti`), yani adı artık var olmayan bir alanı anlatır: dosya **`src/components/IhracKayitliOzet.jsx`** adını alır. Yeni adı gösterecek yerler: beş içe aktarma (`YedekParcaSatisForm.jsx:8`, `PartSaleForm.jsx:10`, `customers/CustomerAddEditForm.jsx:16`, `customers/detail/MachineTimeline.jsx:11`, `stock/YedekParcaSatisTab.jsx:19`), `tests/tasarim-kontrast.test.js`'in rozet satırı, `tests/ihrac-kayitli-0114.test.js`'in C3/C10 tarama listesi ve `docs/tasarim-sozlugu.md`'nin rozet borcu satırı (B-1).
- **R14.** Kutuyla ölü kalan içe aktarmalar da silinir: üç formun `utils` listesinden `ihracKayitliEtkinMi` (üç formdaki tek çağrısı kaldırılan satırdır) ve bileşen dosyasından `useState` ile `./tasarim`. Fonksiyonun kendisi yerinde kalır, beş canlı çağrısı vardır (R12 güvende). Lint bu artığı yakalayamaz, bu yüzden kural taramadır (Ö-1).
- **R15.** Görsel kanıt aracının iki ekranı kaldırılan metne kaydırıyor: `scripts/evidence/0009-sayfa.jsx`'in `yedek-parca-formu-0114-ihrac` ve `musteri-formu-0114` adımları `kaydir:Bu fatura tevkifatlı` yapılır (R9 ile duran pasif kutunun etiketi). Üç `-ihrac` ekranı silinmez; kaldırmanın önce ve sonra kanıtı olarak 0116'nın raporunda çekilir (B-3).
- **R16.** Kanıt eşlemesinde (`docs/evidence/kanit-eslemesi.json`) `src/components/IhracKayitliAlani.jsx` anahtarı yedi kaydıyla birlikte **silinir**: dosya silinmediği hâlde `tasarim.jsx` kullanımı kalktığı için eşlemenin kuralı bunu zorunlu kılar. Değişen ekranların kaydı 0116'nın kendi raporuna, üç formun kendi anahtarları altına yazılır; 0114 raporuna hiçbir `degisti` kaydı eklenmez (B-2, C8).

---

## Zorunlu kısıtlar

- **C1.** Hiçbir hesap değişmez. KDV bölümü, kalan borç, Toplam Alacak, Ödenmesi Muhtemel KDV, kart tabanı ve aylık rapor bu işte okunmaz bile.
- **C2.** Veri modeline dokunulmaz: yeni alan, silinen alan, göç ve veritabanı değişikliği yok.
- **C3.** Yeni izin, yeni veri bölümü, yeni sunucu kuralı ve birleştirme kuralı yok.
- **C4.** Yeni çeviri anahtarı yok; uygulama yurt içi fatura basmıyor (0114 X3).
- **C5.** Kaynakta ölü sabit bırakılmaz: kutuyla birlikte okunmaz hâle gelen her metin silinir ve kaynak taramasıyla sabitlenir.
- **C6.** Silinen bileşenin görsel kanıt kaydı (`docs/evidence/kanit-eslemesi.json`) de silinir; kalan ekranların kaydı bilinçli değişim olarak işaretlenir.
- **C7.** Üç form birbirinden ayrılmaz: kutu üçünden de kalkar, birinde kalmaz.
- **C8.** Kanıt eşlemesinin kuralı dosya düzeyindedir: `tasarim.jsx`'i içe alan dosyalar kümesi eşlemenin anahtarlarına **eşit** olmalıdır. Bileşen dosyasının tek `tasarim` kullanımı kutunun `Ipucu`'sudur, bu yüzden kutu kalkınca anahtar silinir; dosya silinmez. 0114 raporunun kayıtlarına dokunulmaz, çünkü o rapora bağlı hiçbir kayıt `degisti` ya da `onay` taşıyamaz (B-2).
- **C9.** `specs/done/0114-ihrac-kayitli-fatura.md` **tarihsel belgedir ve düzenlenmez** (0070 ile 0074 emsali). Ters çevirme üç yerde kayıtlıdır: bu spec'in `Ters çevrilen kriterler` satırı, 0114 testlerinin "spec 0116 ile" notları ve `CLAUDE.md`'nin 0114 bölümü (Ö-8).
- **C10.** Çeviri tarafına hiç dokunulmaz: kaldırılan yedi metnin çeviri anahtarı yoktu, `tests/ceviri-kapsam.test.js` etkilenmez (K-7).

---

## Kapsam dışı

- **X1.** İbarenin uygulamanın başka bir yerine (Ayarlar, yardım ekranı, bir çıktı) taşınması — *neden:* uygulama yurt içi fatura basmıyor, ikinci bir yer de okunmayacak bir metin olur; istenirse kendi spec'ini hak eder.
- **X2.** Satış tipi seçicisinin kendisi, seçeneklerin adı ve sırası — *neden:* istek yalnız kutuya.
- **X3.** KDV kutusunun içindeki beş özet satırı — *neden:* onlar metin değil rakam; kaydın ne kadar KDV taşıdığını orada görmek gerekiyor.
- **X4.** Tevkifat kutusunun metinleri ve pasiflik kuralı — *neden:* ayrı kavram, 0114 C4'te yazılı.
- **X5.** 0114'ün rapor kutusu, Finans kart satırı ve dışa aktarma sütunları — *neden:* istek form ekranına.
- **X6.** İşaretin kendisinin kaldırılması — *neden:* istenen bu değil; ihraç kayıtlı satış tipi kalıyor, yalnız anlatan kutu kalkıyor.
- **X7.** Satış tipi seçicisinin altına ya da "İhraç Kayıtlı" seçeneğinin `title`'ına tek satır ipucu eklenmesi — *neden:* Karar 2 ve Karar 4'ün doğrudan sonucu; kutuyu kaldırıp yerine yarım bir cümle bırakmak ikinci kopya yasağını sessizce çiğner. Takım Yöneticisi tersini isterse bu yeni bir karardır ve metni `IHRAC_PARCA_SINIRI` değil yeni bir sabit olur (Ö-5).

---

## Ölçümler (2026-10-27 yedeği, bugünkü kod)

1. Kutu üç yerde çizilir: `customers/CustomerAddEditForm.jsx:562`, `PartSaleForm.jsx:153`, `YedekParcaSatisForm.jsx:168`. Üçü de aynı bileşeni çağırır.
2. Bileşen tek dosyada ve tek parçadır: `IhracKayitliAlani.jsx:14-38`; silinecek aralık kendi yorum bloğuyla birlikte **`:11-38`**'dir (`:39` boş satır). Aynı dosyadaki iki kardeş (`IhracKayitliOzetSatirlari`, `IhracKayitliRozeti`) kutudan bağımsızdır ve kalır; kutu kalkınca dosyanın `useState` ve `./tasarim` içe aktarmaları da (`:3`, `:4`) okunmaz hâle gelir (K-1 ile düzeltildi).
3. Yalnız kutuya ait yedi sabit: `lib/ihracKayitli.js:63-70` (açıklama, ibare, fatura notu, Kopyala, kopyalandı, kopyalanamadı, üretim sınırı). `:64`'teki 0114 R23/2 yorumu da silinir; `:62`'deki "Ekran metinleri" bölüm başlığı **kalır**, çünkü kalan metinlerin başlığıdır (K-2).
4. İbare metni kaynakta başka hiçbir yerde geçmiyor: yazdırma şablonları, aylık rapor, dışa aktarma ve Evrak'ın üç belgesi onu basmıyor. **Sonuç:** kutu kalkınca ibare uygulamada hiçbir yerde görünmez. Takım Yöneticisi bunu bilerek kabul etti; açık bulguya kaydedilir.
5. Canlı veride ihraç kayıtlı işaretli kayıt yok: makina 0, Extra Kalıp 0, yedek parça 0. Yani kutu bugüne kadar hiç açılmadı ve kaldırılması kayıtlı hiçbir veriye dokunmaz.
6. Görsel kanıt eşlemesinde bileşenin **yedi** ekran kaydı var: `kalip-formu-0114-ihrac`, `kalip-formu-0114-ozet`, `yedek-parca-formu-0114-ihrac`, `yedek-parca-formu-0114-ozet`, `musteri-formu-0114`, `musteri-detay-0114` ve `stok-yedek-0114` (hepsi `0114-taban-piksel-raporu.json`). Kayıt dosya silindiği için değil, dosyanın `tasarim.jsx` kullanımı kalktığı için silinir (B-2 ile düzeltildi; eski metin "beş" diyor, altı ad sayıyordu).
7. Kutuya bağlı test iddiaları dört kriterde toplanıyor (0114 AC-31, AC-32, AC-33, AC-34) ve hepsi `tests/ui/ihrac-kayitli-0114.test.jsx` içinde; motor testi yalnız ibarenin metnini sabitliyor (`tests/ihrac-kayitli-0114.test.js:363`). **Dördün dışında iki yer daha var:** AC-12'nin `ihrac-kayitli-alani` iddiası (`:98`) ve `:102`'deki describe başlığı (`AC-9, AC-31–AC-35, AC-56`), ki o başlık kalan AC-35'i de içeriyor (K-3).
8. `tests/ui/ihrac-kayitli-0114-kiyas.test.jsx` **hiçbir form çizmiyor** (Finance, SettingsExport, aylık rapor motoru, `satisKdvAylar` ve `kdvKarsilastir`), bu yüzden kutuyla hiç ilgisi yok: bu işten etkilenmez ve dokunulmadan yeşil kalır (K-4 ile düzeltildi; eski metnin "ekranlar altınla daha da yakınlaşır" cümlesi ölçülemez).

### QA turu ölçümleri (2026-10-29)

9. Bileşenin adı dokuz yerde geçiyor: beş içe aktarma (`YedekParcaSatisForm.jsx:8`, `PartSaleForm.jsx:10`, `customers/CustomerAddEditForm.jsx:16`, `customers/detail/MachineTimeline.jsx:11`, `stock/YedekParcaSatisTab.jsx:19`), `tests/tasarim-kontrast.test.js:81` (rozet tonu), `tests/ihrac-kayitli-0114.test.js:435` (C3/C10 taraması), `docs/tasarim-sozlugu.md:356` (rozet borcu) ve kanıt eşlemesinin anahtarı. **Sonuç:** "ad kaynakta hiç geçmez" dosya adı durduğu sürece sağlanamaz (B-1, R13).
10. Kanıt eşlemesinin kuralı `tests/tasarim-kaynak.test.js:143-146`'da bir **eşitliktir**: `tasarim.jsx`'i içe alan dosyalar kümesi = eşlemenin anahtarları. `IhracKayitliAlani.jsx`'in tek `tasarim` kullanımı kutunun `Ipucu`'sudur (`:4` içe aktarma, `:35` çağrı), yani kutu kalkınca anahtarın silinmesi **zorunludur** (B-2, C8, R16).
11. `tests/ihrac-kayitli-0114.test.js:461`, raporu `/0114-` içeren hiçbir kanıt kaydının `degisti` ya da `onay` taşımamasını istiyor. Anahtar silindikten sonra o rapora bağlı kalan tek kayıt `SatisTevkifatAlani.jsx` + `kalip-formu-0114-kart-uyari`'dır; işaret kapalı olduğu için 0 piksel kalır ve `kayitlar.length > 0` iddiası da ayakta durur (B-2).
12. Kanıt aracının iki adımı kaldırılan metni hedefliyor: `scripts/evidence/0009-sayfa.jsx:1393` (`yedek-parca-formu-0114-ihrac`) ve `:1397` (`musteri-formu-0114`) `kaydir:Fatura KDV'li kesilir` ile `IHRAC_ACIKLAMA`'nın ilk cümlesine gidiyor; `kalip-formu-0114-ihrac` (`:1386`) `kaydir:Satış Yapan Firma` kullandığı için ayakta kalır. Araç bulunamayan adımı **yalnız uyarıyla geçer** (CLAUDE.md'de yazılı bilinen borç; spec 0089'da `giderler-0068-parti-sil` böyle aylarca yanlış ekran çekti), yani düzeltilmezse "0 piksel" sonucu yanlış ekranın kanıtı olur (B-3, R15).
13. `ihracKayitliEtkinMi` üç formda yalnız kaldırılacak satırda çağrılıyor (`CustomerAddEditForm.jsx:562`, `PartSaleForm.jsx:153`, `YedekParcaSatisForm.jsx:168`); beş canlı çağrısı kalır (`SatisTevkifatAlani.jsx:31`, `satisTevkifat.js:63` ve `:71`, `utils.js:407` ve `:421`). `eslint.config.mjs:29` `no-unused-vars`'ı `src` için **warn** veriyor, yani ölü içe aktarma lint hata sayısını sıfır bırakır ve AC-21 onu yakalamaz (Ö-1, R14).
14. Gövde iddiaları `tests/ui/ihrac-kayitli-0114-app.test.jsx`'in AC-5, AC-6, AC-7, AC-10, AC-28, AC-56 ve AC-64 bloklarındadır ve alan **varlığını** ölçer; `Object.keys` ya da `JSON.stringify` ile anahtar sırası karşılaştıran hiçbir test yok (Ö-2, AC-13).
15. Kutunun altı `data-testid` dizesi (`ihrac-kayitli-alani`, `ihrac-aciklama`, `ihrac-ibare`, `ihrac-ibare-kopyala`, `ihrac-kopya-durumu`, `ihrac-parca-siniri`) ve ibarenin erişilebilir adı (`aria-label="Faturaya yazılacak ibare"`) bugün hiçbir kriterde yasaklı değil (Ö-3, AC-31).
16. Sabitler silinince iki test dosyasının içe aktarma listesi kırılır: `tests/ui/ihrac-kayitli-0114.test.jsx:23-24` altı sabiti (`IHRAC_ACIKLAMA`, `IHRAC_IBARE`, `IHRAC_FATURA_NOTU`, `IHRAC_PARCA_SINIRI`, `IHRAC_KOPYALANDI`, `IHRAC_KOPYALANAMADI`), `tests/ihrac-kayitli-0114.test.js:13` `IHRAC_IBARE`'yi alıyor. Test eslint ayarında `no-unused-vars` **hata** seviyesindedir (`eslint.config.mjs:58`, recommended), yani artık içe aktarma lintte hata verir (Ö-4).
17. `SatisTipiSecici.jsx` yalnız beş seçenek çizer, `title` ya da ipucu taşımaz. Kaldırmadan sonra ekranda kalan tek açıklama tevkifat kutusunun pasiflik nedenidir (`IHRAC_TEVKIFAT_NEDENI`, `SatisTevkifatAlani.jsx:36`) ve KDV kutusundaki "Ertelenen KDV" satırıdır; "yalnız kendi ürettiğimiz mal" sınırı hiçbir yerde kalmaz (Ö-5, X7).
18. `tests/ui/ihrac-kayitli-0114.test.jsx:95-99` iki şey sınıyor: ücretsiz yedek parçada satış tipi seçicisinin çizilmemesi (`YedekParcaSatisForm.jsx:159`'un `!ucretsiz` kapısı) ve `ihrac-kayitli-alani`'nın yokluğu. İkincisi kutu her yerden kalkınca her veride doğru olur, yani iddia yeşil kalır ama hiçbir şeyi korumaz (Ö-6, AC-7).
19. Değişmeyenleri sayan dokuz kriterin kapsadığı kod (rapor kutusu, iki dipnot, Finans ve Giderler kart satırı, üç dışa aktarma sütunu, satış pili, Kalan Borç satırı, KDV hücresi) `tests/ihrac-kayitli-0114.test.js` ve `tests/ui/ihrac-kayitli-0114.test.jsx` bloklarında **zaten kaplı**; 0116 o dosyalardaki o bloklara dokunmuyor (Ö-7).
20. Yeni kaydırma hedefi üç formda da duruyor: "Bu fatura tevkifatlı" etiketi ihraç dalında da çizilir (`SatisTevkifatAlani.jsx:34`, pasif ve işaretsiz kutu), yani R15'in adımı işaret açıkken hedefini bulur ve `-ozet` ekranlarından ayrı bir bölgeyi gösterir (B-3).

---

## Kararlar (Takım Yöneticisi, 2026-10-29)

1. **Kutu üç formdan da kalkar** (analistin önerisi). Gerekçe: metin üç formda birebir aynı sabitten geliyor ve kaldırma gerekçesi de aynı; birinden kaldırıp ikisinde bırakmak üç formu birbirinden ayırırdı.
2. **İbare uygulamada kalmaz.** Analist bunun bilinen sonucunu yazdı: 11/1-c ibaresini e-fatura yazılımına girerken artık uygulamadan kopyalanamaz. Takım Yöneticisi kabul etti; açık bulgu olarak `specs/README.md`'ye düşer ve istenirse X1 kendi spec'iyle gelir.
3. **KDV özet satırları kalır** (analistin önerisi). Ekran görüntüsünde kırmızıyla işaretlenen yalnız açıklama kutusudur; üstündeki yeşil özet kutusu rakam gösterir ve kaydın doğru girildiğinin tek kontrolüdür.
4. **Metin sabitleri silinir, taşınmaz** (analistin önerisi). Yarı gizli bir kopya bırakmak, kutuyu kaldırma gerekçesini çürütür ve ölü kod sınıfına girer.

### QA turunda verilen kararlar (2026-10-29)

Analist yirmi dört boşluk çıkardı (3 bloklayıcı, 9 önemli, 12 küçük); Takım Yöneticisi hepsini analistin önerdiği gibi onayladı.

5. **Dosya `IhracKayitliOzet.jsx` adını alır** (R13, AC-22, AC-23). Gerekçe: adı "Alani" olan dosyada artık alan yok; eski adla AC-19 testle hiç karşılanamazdı (dokuz yerde geçiyor, ölçüm 9). Kanıt eşlemesinin anahtarı zaten silindiği için (R16) yeniden adlandırmanın bedeli dört küçük düzeltmedir.
6. **Kanıt eşlemesinin anahtarı silinir, 0116 kendi raporunu üretir** (R16, C8, AC-26, AC-27, AC-28). Gerekçe: eşlemenin kuralı dosya düzeyinde bir eşitliktir ve bileşenin tek `tasarim` kullanımı kutudur (ölçüm 10); eski metin ya dosyayı silmeye ya 0114 raporunun kayıtlarını `degisti` yapıp 0114'ün kapanış testini kırmaya götürüyordu (ölçüm 11).
7. **Kanıt aracının iki adımı yeni bir hedefe kaydırılır, üç `-ihrac` ekranı durur** (R15, AC-29). Gerekçe: adımın hedefi kaldırılan metin olduğu için araç sessizce formun tepesini çeker ve "0 piksel" yanlış ekranın kanıtı olur (ölçüm 12); yeni hedef "Bu fatura tevkifatlı" üç formda da duruyor (ölçüm 20).
8. **Ölü içe aktarmalar taramayla yasaklanır** (R14, AC-24, AC-25). Gerekçe: `no-unused-vars` `src` tarafında uyarı seviyesinde, yani AC-21'in "lint hata sayısı sıfır" ölçütü artığı geçirir (ölçüm 13). Bileşenin `./tasarim` içe aktarmasını yasaklamak aynı zamanda Karar 6'nın eşleme silmesini mekanik olarak garanti eder.
9. **AC-13'ün "anahtar sırası" cümlesi kalkar**, yerine 0114'ün gövde testinin dokunulmadan yeşil kalması gelir. Gerekçe: anahtar sırası ölçen test yok (ölçüm 14) ve çizim katmanından çıkan bir kutunun kayıt gövdesini değiştirmesi mümkün değil; ölçülemeyen kriter yerine var olan test kanıt olur.
10. **Altı `data-testid` ve ibarenin erişilebilir adı da taramaya girer** (AC-31). Gerekçe: testid'ler de kutunun parçasıdır; geride kalırsa kutu yarı yarıya geri dönebilir ve AC-18'in sabit taraması bunu görmez (ölçüm 15). Testlerde tek bir olumsuz iddia gerileme bekçisi olarak kalır.
11. **İki test dosyasının içe aktarma listesi ve describe başlığı düzeltilir** (AC-32). Gerekçe: dört kriteri silmek yetmez; artık sabit içe aktarması test tarafında lint **hatası** verir ve `AC-31–AC-35` başlığı kalan AC-35'i yanlış anlatır (ölçüm 16).
12. **Seçiciye ipucu eklenmesi kapsam dışıdır** (X7, AC-33). Gerekçe: kaldırmadan sonra işaretin anlamını anlatan hiçbir metin kalmıyor (ölçüm 17) ve X1 yalnız Ayarlar, yardım ekranı ve çıktıyı sayıyordu; geliştirici "bir satır bırakayım" diye kendi kararını verebilirdi. Takım Yöneticisi tersini isterse yeni bir karar olur.
13. **AC-7 yeniden yazılır: koruduğu şey satış tipi seçicisinin ücretsizde çizilmemesidir.** Gerekçe: kutu her yerden kalkınca testid iddiası her veride doğru olur ve hiçbir şeyi korumaz (ölçüm 18); boşa düşen iddianın neyi koruduğu yazılmalı.
14. **Değişmeyen dokuz kriter 0114'ün var olan testine atıf yapar, yeni test yazılmaz** (AC-14 – AC-17, DoD istisnası). Gerekçe: o kod bloklarına hiç dokunulmuyor (ölçüm 19); her kriter için yeni bir `AC-<n>` testi istemek var olan testlerin kopyasını üretir, bakımı iki yere dağıtır ve yeni güvence vermez.
15. **0114'ün done kopyası tarihsel kalır, düzenlenmez** (C9). Gerekçe: 0070 ile 0074 emsali; ters çevirme üç yerde kayıtlıdır ve done kopyası 0114'ün kapanış testinin okuduğu belgedir.
16. **"Etkilenen alanlar" satırı dokunulacak dosyaların tamamını sayar.** Gerekçe: dokunulmayanların listesi doğruydu ama kanıt, test ve belge dosyaları eksikti; eksik liste bu adımları plan turuna kaydırıyor ve biri atlanıyordu.
17. **Ölçüm 2'nin aralığı `11-38` olur.** Gerekçe: bileşenin kendi yorum bloğu (`:11-13`) silinecek aralığın içindedir, yoksa kaldırılan bir kutuyu anlatan yorum sahipsiz kalır ve C5'e aykırı olur.
18. **Ölçüm 3'e iki satır yazılır:** `:64`'teki yorum silinir, `:62`'deki bölüm başlığı kalır. Gerekçe: başlık kalan metinlerin başlığıdır; silinirse kalan sabitler başlıksız kalır.
19. **Ölçüm 7 iki yeri daha sayar** (AC-12'nin iddiası ve describe başlığı). Gerekçe: "dört kriterde toplanıyor" eksikti, bu iki yer de kutuya bağlıdır.
20. **Ölçüm 8'in gerekçesi düzeltilir:** kıyas testi form çizmiyor, bu işten etkilenmiyor. Gerekçe: eski cümle ölçülemeyen bir iddiaydı ve geliştiriciyi kıyas altınını yenilemeye yöneltebilirdi.
21. **Çağrı satırlarının üç yorumu da silinir** (R6/2, AC-30). Gerekçe: R6 yalnız metin sabitlerini sayıyordu; kaldırılan kutuyu anlatan yorum da ölü metindir.
22. **AC-4'ün testi silinen sabite atıf yapmaz:** iddia düz metinle ("11/1-c" alt dizesi) ya da `queryByTestId` ile kurulur ve kriterde hangisi olduğu yazılır. Gerekçe: sabit silindikten sonra ona atıf yapan test derlenmez.
23. **C4 netleşir: çeviri tarafına hiç dokunulmaz** (C10). Gerekçe: kaldırılan metinlerin çeviri anahtarı yoktu; 0115 çeviri kapsamını genişlettiği için karışmaması gerekir.
24. **"0114 AC-35 kalır" cümlesi başlık satırına yazılır.** Gerekçe: AC-35 kaldırılan dört kriterle aynı describe'da duruyor ve toptan silinme riski var.
25. **CLAUDE.md düzeltmesi cümleyi ve parantezini kapsar.** Gerekçe: `:446`'daki parantez de kutunun parçalarını sayıyor (açıklama, ibare, Kopyala, fatura notu, üretim sınırı); yalnız cümlenin başı düzeltilirse belge yarı yanlış kalır.
26. **0116'nın kendi kapanış bekçisi yazılır** (AC-36). Gerekçe: son on spec'te bu bekçi vardı (0114'ün `:451-467` emsali) ve taşımanın unutulmadığının tek kanıtı o.
27. **CLAUDE.md'ye yazılan rapor adları docs/evidence'da üretilmiş olur** (AC-37). Gerekçe: `tests/spec-atiflari.test.js:36` yazılıp üretilmeyen rapor atfını kırıyor.
28. **Tam `npm test` koşulur, Electron dosyaları atlanmaz.** Gerekçe: spec 0067'nin dersi; bu işte Electron'a dokunulmasa da atlanan koşum bir regresyonu kaçırmıştı.

### Plan turunda verilen kararlar (2026-10-29)

Takım Yöneticisi uygulama planındaki sekiz önerinin hepsini onayladı (`specs/done/0116-uygulama-plani.md`).

29. **Sözlüğün iki `PartSaleForm.jsx` atfı iki satır kaydırılır** (`:335` → `:333`, `:382` → `:380`). Gerekçe: çağrı satırı ve yorumu (`:152-153`) silinince örnekler yukarı kayar ve `tasarim-kaynak`'ın dosya:satır denetimi kırılır; ölçüm 2 bunu saymıyordu. Eski ve yeni satırın içeriği aynıdır (ölçüldü). `CustomerAddEditForm`'un atıfları (`:143`, `:178`) silinen satırdan önce, kaymaz.
30. **CLAUDE.md'nin 0116 bölümü 0114 başlığının önüne yazılır; 0116 bekçisinin dilimi `(spec 0116, plan` ile `(spec 0114, plan` arasıdır.** Gerekçe: 0114 ve 0115 bekçileri `(spec 0113, plan`'a kadar okur; 0115'in ardına konan bölüm iki bekçinin dilimine girer ve ilgisiz bir metin değişikliği onları kırar.
31. **Rapor adları:** `0116-piksel-raporu.json` (eski kod ↔ yeni kod; değişen ekranlar `degisti` ve `Takım Yöneticisi · 2026-10-29 · spec 0116 Karar 1` onayıyla), `0116-taban-piksel-raporu.json` (yeni kod ↔ yeni kodla yeniden çekim, 0 fark). Kapanışta kayıtlar `ayni`'ye çevrilip taban raporuna bağlanır. AC-28'in ve DoD'nin `0116-kapanis-piksel-raporu.json` adı kullanılmaz. Gerekçe: 0113–0115 deseni; aynı içerikte ikinci rapor gereksiz.
32. **AC-34 anlamsal taramayla ölçülür:** done kopyası kutunun anlatımını (R23/2, "Kopyala", 11/1-c) taşımaya devam eder; bayt sabitlenmez. Gerekçe: 0107'nin dersi; testin kanıtlaması gereken "kutunun anlatımı silinmedi"dir.
33. **Değişen ekranlar ölçülerek seçilir, tahmin edilmez.** Ölçüldü: altı ekran değişti (`kalip-formu-0114-ihrac`, `-ozet`, `-kart-uyari`, `yedek-parca-formu-0114-ihrac`, `-ozet`, `musteri-formu-0114`); `-ozet` farkları küçük ama tekrarlanabilir (yeni kod ↔ yeni kod 0 piksel). İşaretsiz form ekranlarının hepsi 0 piksel. `kalip-formu-0114-kart-uyari` spec'te sayılmamıştı: kaydı işaretli olduğu için kutu oradaydı.
34. **Rozet ekranlarının kaydı:** `musteri-detay-0114` zaten `MachineTimeline.jsx` altında kayıtlı (`0114b-taban`); `stok-yedek-0114`'ün kaydı yoktu, `YedekParcaSatisTab.jsx` altına 0116 raporuyla `ayni` olarak eklenir. Gerekçe: yeni adlı dosya `tasarim.jsx`'i içe almadığı için eşlemede anahtarı yok; ekranın kanıtı onu çizen dosyada durmalı.
35. **0114'ün kapanış bekçisi bozulmaz.** Anahtar silindikten sonra `/0114-` raporuna bağlı kayıt kalır (`SatisTevkifatAlani.jsx` + `kalip-formu-0114-kart-uyari`), `length > 0` ayakta (ölçüldü).
36. **AC-24 daha geniş taranır:** üç form dosyasında `ihracKayitliEtkinMi` adı hiç geçmez (yalnız `utils` içe aktarma listesi değil). Gerekçe: üç formdaki tek çağrı kaldırılan satırdı; geniş tarama başka bir yoldan geri gelen ölü kullanımı da yakalar.

### Karar kaydı

| Bulgu | Derece | Karar | İşlendiği yer |
|---|---|---|---|
| B-1 Dosya adı AC-19'u sağlanamaz kılıyor | Bloklayıcı | Karar 5 | R13, AC-22, AC-23, ölçüm 9 |
| B-2 Kanıt eşlemesi kuralı ve 0114 çelişkisi | Bloklayıcı | Karar 6 | R16, C8, AC-26, AC-27, AC-28, ölçüm 6, 10, 11 |
| B-3 Kanıt aracı kaldırılan metne kaydırıyor | Bloklayıcı | Karar 7 | R15, AC-29, ölçüm 12, 20 |
| Ö-1 Ölü içe aktarmaları lint yakalamıyor | Önemli | Karar 8 | R14, AC-24, AC-25, ölçüm 2, 13 |
| Ö-2 AC-13'ün anahtar sırası ölçülemiyor | Önemli | Karar 9 | AC-13, ölçüm 14 |
| Ö-3 Altı testid yasaklı değil | Önemli | Karar 10 | AC-31, ölçüm 15 |
| Ö-4 Test içe aktarma listesi ve başlık | Önemli | Karar 11 | AC-32, ölçüm 16 |
| Ö-5 Seçicide açıklama kalmıyor | Önemli | Karar 12 | X7, AC-33, ölçüm 17 |
| Ö-6 AC-7 boşa düşüyor | Önemli | Karar 13 | AC-7, ölçüm 18 |
| Ö-7 Değişmeyenler için yeni test isteniyor | Önemli | Karar 14 | AC-14, AC-15, AC-16, AC-17, DoD, ölçüm 19 |
| Ö-8 Done kopyası düzenlenecek mi | Önemli | Karar 15 | C9 |
| Ö-9 Etkilenen alanlar eksik | Önemli | Karar 16 | Başlık tablosu |
| K-1 Ölçüm 2'nin aralığı | Küçük | Karar 17 | Ölçüm 2 |
| K-2 Ölçüm 3'ün iki satırı | Küçük | Karar 18 | Ölçüm 3 |
| K-3 Ölçüm 7 eksik | Küçük | Karar 19 | Ölçüm 7 |
| K-4 Ölçüm 8'in gerekçesi yanlış | Küçük | Karar 20 | Ölçüm 8 |
| K-5 Çağrı satırlarının yorumları | Küçük | Karar 21 | R6/2, AC-30 |
| K-6 AC-4'ün testi silinen sabite bakıyor | Küçük | Karar 22 | AC-4 |
| K-7 C4'ün çeviri cümlesi | Küçük | Karar 23 | C10 |
| K-8 0114 AC-35'in kaldığı yazılı değil | Küçük | Karar 24 | Başlık tablosu |
| K-9 CLAUDE.md parantezi | Küçük | Karar 25 | DoD |
| K-10 Kapanış bekçisi yok | Küçük | Karar 26 | AC-36, DoD |
| K-11 Rapor atıfları denetimi | Küçük | Karar 27 | AC-37, DoD |
| K-12 Tam npm test | Küçük | Karar 28 | AC-21, DoD |
| P-1 Sözlük atıfları kayar | Önemli | Karar 29 | `docs/tasarim-sozlugu.md` |
| P-2 CLAUDE.md bölümünün yeri ve bekçi dilimleri | Küçük | Karar 30 | AC-36 |
| P-3 Rapor adları | Küçük | Karar 31 | AC-28, DoD |
| P-4 AC-34'ün ölçümü | Küçük | Karar 32 | AC-34 |
| P-5 Değişen ekran listesi | Küçük | Karar 33 | AC-28 |
| P-6 Rozet ekranlarının kaydı | Küçük | Karar 34 | AC-28 |
| P-7 0114 bekçisi | Küçük | Karar 35 | AC-27 |
| P-8 AC-24'ün kapsamı | Küçük | Karar 36 | AC-24 |

---

## Kabul kriterleri

### A. Kutu yok

- **AC-1.** Müşteri formunda satış tipi "İhraç Kayıtlı" seçilir; açıklama kutusu çizilmez.
- **AC-2.** Extra Kalıp satış formunda ihraç kayıtlı seçilir; açıklama kutusu çizilmez.
- **AC-3.** Yedek parça satış formunda ihraç kayıtlı seçilir; açıklama kutusu çizilmez.
- **AC-4.** Üç formun hiçbirinde ibare metni ekranda geçmez. İddia silinen sabite atıf yapmaz: ya düz metinle (`"11/1-c"` alt dizesi `document.body.textContent` içinde yok) ya da `queryByTestId("ihrac-ibare")` ile kurulur (Karar 22).
- **AC-5.** Üç formun hiçbirinde Kopyala düğmesi yoktur.
- **AC-6.** Yedek parça formunda üretim sınırı satırı yoktur.
- **AC-7.** Yedek parça formunda ücretsiz işareti açıkken satış tipi seçicisi çizilmez (bugünkü `!ucretsiz` kapısı, `YedekParcaSatisForm.jsx:159`); işaret alanı zaten yoktur. Testin koruduğu şey seçici iddiasıdır, testid iddiası AC-31'in tek gerileme bekçisi olarak kalır (Karar 13).

### B. Kalanlar

- **AC-8.** Üç formda da satış tipi seçicisi beş seçenek taşır ve "İhraç Kayıtlı" seçilebilir.
- **AC-9.** İşaret seçiliyken müşteri formunun KDV kutusunda beş özet satırı bugünkü metinleriyle çizilir.
- **AC-10.** Aynı beş satır Extra Kalıp formunda çizilir.
- **AC-11.** Aynı beş satır yedek parça formunda çizilir.
- **AC-12.** İşaret seçiliyken tevkifat kutusu pasiftir ve nedeni yanında yazar.
- **AC-13.** İşaretli bir kayıt üç formdan da kaydedilir; gövde 0114'ün app testinin beklentileriyle birebir aynıdır, yani `tests/ui/ihrac-kayitli-0114-app.test.jsx` (AC-5, AC-6, AC-7, AC-10, AC-28, AC-56, AC-64 blokları) dokunulmadan yeşildir (Karar 9).
- **AC-14.** İşaretli makina kaydının Kalan Borç satırı, müşteri listesinin Fatura sütunu, Makina Geçmişi pili ve müşteri detayının KDV hücresi bugünkü metinleriyle çizilir: `tests/ui/ihrac-kayitli-0114.test.jsx`'in ilgili blokları dokunulmadan yeşil (Karar 14).
- **AC-15.** İşaretli kayıt taşıyan ayda aylık raporun ihraç kayıtlı kutusu, firma firma detayı ve iki dipnotu birebir eski çıktıyı verir: `tests/ihrac-kayitli-0114.test.js`'in rapor blokları dokunulmadan yeşil (Karar 14).
- **AC-16.** Finans ve Giderler'deki ertelenen KDV bilgi satırı değişmez: `tests/ui/ihrac-kayitli-0114.test.jsx`'in kart bloğu dokunulmadan yeşil (Karar 14).
- **AC-17.** Üç dışa aktarma raporunun ihraç kayıtlı sütunları değişmez: `tests/ihrac-kayitli-0114.test.js`'in dışa aktarma blokları ve `tests/ui/ihrac-kayitli-0114-kiyas.test.jsx` dokunulmadan yeşil (Karar 14, Karar 20).

### C. Kaynak ve kanıt

- **AC-18.** Kaldırılan yedi metin sabiti kaynakta hiç geçmez (tarama).
- **AC-19.** `IhracKayitliAlani` adı kaynakta hiç geçmez: ne `export const` tanımı ne `<IhracKayitliAlani` çağrısı ne de dosya adı olarak (R13 ile dosya `IhracKayitliOzet.jsx` oldu). Kardeş iki dışa verim (özet satırları, rozet) yerinde durur ve beş yerden çağrılır (Karar 5).
- **AC-20.** Kanıt eşlemesinde eski bileşen dosyasının anahtarı (yedi kaydıyla) yoktur ve `tests/tasarim-kaynak.test.js`'in "kullanan her dosyanın kaydı var" eşitliği yeşildir (Karar 6; ayrıntı AC-26 – AC-28).
- **AC-21.** Tam `npm test` yeşil (Electron dosyaları dahil, `VITEST_ELECTRON` ayarı verilmeden), `npm run lint` hata sayısı sıfır (Karar 28).

### QA turu kriterleri (2026-10-29)

- **AC-22.** Dosya `src/components/IhracKayitliOzet.jsx` adıyla durur; beş içe aktarma (`YedekParcaSatisForm.jsx`, `PartSaleForm.jsx`, `customers/CustomerAddEditForm.jsx`, `customers/detail/MachineTimeline.jsx`, `stock/YedekParcaSatisTab.jsx`) yeni adı gösterir ve `IhracKayitliAlani.jsx` dosyası yoktur.
- **AC-23.** `tests/tasarim-kontrast.test.js`'in rozet satırı, `tests/ihrac-kayitli-0114.test.js`'in C3/C10 tarama listesi ve `docs/tasarim-sozlugu.md`'nin rozet borcu satırı yeni dosya adını gösterir; üçü de yeşil.
- **AC-24.** Üç satış formunun `utils` içe aktarma listesinde `ihracKayitliEtkinMi` geçmez (tarama); fonksiyonun beş canlı çağrısı yerinde durur.
- **AC-25.** Yeni adlı bileşen dosyası `useState`'i ve `./tasarim`'ı içe almaz (tarama).
- **AC-26.** `docs/evidence/kanit-eslemesi.json`'da eski bileşen dosyasının anahtarı yoktur; `tests/tasarim-kaynak.test.js`'in "tasarim.jsx'i kullanan her dosyanın kaydı var" eşitliği yeşildir.
- **AC-27.** Raporu `/0114-` içeren hiçbir kanıt kaydı `degisti` ya da `onay` taşımaz ve `tests/ihrac-kayitli-0114.test.js`'in 0114 kapanış bekçisi dokunulmadan yeşildir.
- **AC-28.** Değişen ekranlar 0116'nın kendi raporunda (`0116-piksel-raporu.json`) `beklenen: "degisti"` ve AC-11b biçimli onay satırıyla, üç formun kendi anahtarları altında kayıtlıdır; kapanışta `0116-kapanis-piksel-raporu.json` ile 0 piksel ölçülüp kayıtlar `ayni`ye çevrilir. Değişmeyen ekranlar 0 pikseldir. **Karar 31 ile taban raporu:** kapanış raporu `0116-taban-piksel-raporu.json`'dır, `kapanis` adlı dosya üretilmez.
- **AC-29.** `scripts/evidence/0009-sayfa.jsx`'in `yedek-parca-formu-0114-ihrac` ve `musteri-formu-0114` adımları `kaydir:Bu fatura tevkifatlı` hedefini kullanır; üç `-ihrac` ekranı araç listesinde durur ve hiçbir adım bulunamamış olarak geçmez.
- **AC-30.** Üç çağrı satırının üstündeki açıklama yorumları kaynakta kalmaz.
- **AC-31.** Kutunun altı `data-testid` dizesi (`ihrac-kayitli-alani`, `ihrac-aciklama`, `ihrac-ibare`, `ihrac-ibare-kopyala`, `ihrac-kopya-durumu`, `ihrac-parca-siniri`) ve ibarenin erişilebilir adı (`Faturaya yazılacak ibare`) `src` altında hiç geçmez (tarama); testlerde yalnız bir olumsuz iddia gerileme bekçisi olarak kalır.
- **AC-32.** `tests/ui/ihrac-kayitli-0114.test.jsx` ve `tests/ihrac-kayitli-0114.test.js`'in içe aktarma listelerinde silinen sabitler geçmez; `Spec 0114 A` describe başlığının kriter aralığı kalan kriterleri (`AC-9, AC-35, AC-56`) gösterir.
- **AC-33.** `SatisTipiSecici.jsx`'e ipucu, `title` ya da açıklama satırı eklenmemiştir (X7, tarama); seçici beş seçenekten başka bir şey çizmez.
- **AC-34.** `specs/done/0114-ihrac-kayitli-fatura.md` bu işte değişmemiştir (tarihsel belge, C9).
- **AC-35.** `tests/ceviri-kapsam.test.js` dokunulmadan yeşildir ve çeviri sözlüklerine anahtar eklenmemiştir.
- **AC-36.** 0116'nın kapanış bekçisi vardır: plan `specs/done`'a taşınınca `CLAUDE.md`'nin 0116 bölümü "Tamamlandı: commit" satırını taşır, `tests/spec-atiflari.test.js`'in `TASINACAK` listesinde 0116 yoktur, `specs/0116-*.md` kopyası kalmaz ve `specs/README.md`'nin 0116 satırı "(Tamamlandı)" yazar.
- **AC-37.** `CLAUDE.md`'ye yazılan `0116-piksel-raporu.json` ve taban raporu `docs/evidence` altında gerçekten vardır (`tests/spec-atiflari.test.js`'in rapor atfı denetimi yeşil).

---

## Definition of Done

- [ ] Bütün kabul kriterleri karşılandı; kriter ile test eşlemesi tabloyla gösterildi.
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor. **İstisna (Karar 14):** davranışın değişmediğini söyleyen kriterler (AC-14 – AC-17) için 0114'ün var olan testine dosya ve blok adıyla atıf yeterlidir, yeni test yazılmaz.
- [ ] 0114'ün ters çevrilen dört kriteri (AC-31, AC-32, AC-33, AC-34) silindi ya da yeni davranışa çevrildi; her birinde "spec 0116 ile" notu var.
- [ ] Motor testindeki ibare sabiti iddiası (`tests/ihrac-kayitli-0114.test.js:363`) kaldırıldı.
- [ ] Dosya `IhracKayitliOzet.jsx` adını aldı; beş içe aktarma, iki test ve sözlüğün rozet satırı yeni adı gösteriyor (Karar 5).
- [ ] İki test dosyasının içe aktarma listesinden silinen sabitler çıkarıldı ve `Spec 0114 A` describe başlığındaki `AC-31–AC-35` aralığı kalan kriterlere göre düzeltildi (Karar 11).
- [ ] Üç formdan `ihracKayitliEtkinMi` içe aktarması, bileşen dosyasından `useState` ve `./tasarim` içe aktarmaları kaldırıldı; tarama ikisini de yasaklıyor (Karar 8).
- [ ] Kanıt aracının iki adımı `kaydir:Bu fatura tevkifatlı` hedefine çevrildi; hiçbir ekran bulunamayan adımla çekilmedi (Karar 7).
- [ ] Kanıt eşlemesinden eski bileşen anahtarı yedi kaydıyla silindi; 0116'nın kayıtları üç formun anahtarları altında, 0114 raporuna `degisti` kaydı eklenmedi (Karar 6).
- [ ] `specs/done/0114-ihrac-kayitli-fatura.md` dokunulmadı; ters çevirme bu spec'in başlık satırında, 0114 testlerinin "spec 0116 ile" notlarında ve `CLAUDE.md`'de kayıtlı (Karar 15).
- [ ] Yeni kalıcı alan, veri bölümü, izin ve sunucu kuralı **eklenmediği** açıkça yazıldı.
- [ ] Kaynak taraması kaldırılan sabitleri ve bileşen adını yasaklıyor.
- [ ] Görsel kanıt alındı; değişen ekranlar `beklenen: "degisti"` ve onay satırıyla kayıtlı, değişmeyenler 0 piksel. Kapanışta `0116-kapanis-piksel-raporu.json` ile 0 piksel ölçülüp kayıtlar `ayni`ye çevrildi (AC-11c, Karar 6). **Karar 31 ile taban raporu:** kapanışta `0116-taban-piksel-raporu.json` kullanılır.
- [ ] `CLAUDE.md`'ye yazılan piksel raporu adları `docs/evidence` altında üretildi (Karar 27).
- [ ] Tam `npm test` yeşil (çıktısıyla, Electron dosyaları dahil; `VITEST_ELECTRON` ile daraltılmadı), `npm run lint` hata sayısı sıfır (Karar 28).
- [ ] `CLAUDE.md`'nin 0114 bölümündeki "üç formda `IhracKayitliAlani`" cümlesi **ve parantezi** (açıklama, ibare, Kopyala, fatura notu, üretim sınırı) düzeltildi; `IhracKayitliOzetSatirlari` ile `IhracKayitliRozeti` cümleleri yeni dosya adını gösteriyor (Karar 25).
- [ ] İbarenin uygulamada kalmaması `specs/README.md`'nin açık bulgularına yazıldı.
- [ ] 0116'nın kapanış bekçisi yazıldı ve yeşil (AC-36, Karar 26).
- [ ] Takım Yöneticisi onayladı. **Commit ve sürüm yayını yalnız açık talimatla yapılır.**
- [ ] SCORECARD dolduruldu ve spec `specs/done/` klasörüne taşındı.

---

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Uygulama commit** | `ea35746` | Dal `feat/0116-ihrac-ibare-kalkar`, taban `5e7b169`; kapanış ayrı commit |
| **Spec revizyon sayısı** | 2 | QA turu (B-1–B-3, Ö-1–Ö-9, K-1–K-12, Karar 5–28), plan turu (Karar 29–36) |
| **Düzeltme turu sayısı** | 1 | Triyaj: iki bilgi bulgusu: tam koşuda yük altında süre eşikli bir test (`gider-dagitim-0072` AC-29) eşiği aştı, kapanış koşumu boş makinada (plan adım 9); AC-28 ve DoD'nin `kapanis` rapor adı Karar 31'e atıf notu aldı (test eklendi) |
| **Bulgu gerçek/gürültü oranı** | 2 / 0 | İkisi de kod kusuru değil, belge ve süreç |
| **Regresyon sayısı** | 0 | Tam takım 438 dosya, 5942 test (Electron dahil, boş makinada); lint 0 hata |
| **Kaçan hata** | 0 | |

**Uygulamada bulunanlar:** sözlüğün iki `PartSaleForm.jsx` atfı silinen satırlar yüzünden kayıyordu (Karar 29); `kalip-formu-0114-kart-uyari` spec'in saymadığı altıncı değişen ekrandı (Karar 33); ibare taraması "11/1-c" ile yapılamadı, `ihracKayitli.js`'in dosya yorumu kanun maddesini anıyor (tarama ibarenin kendi cümlesiyle).

**Görsel kanıt:** 43 ekran × 2 tema; 6 ekran bilinçli değişti, 37 ekran 0 piksel; taban son kodla 0 fark.

**Bu spec'ten çıkarılan ders:** Kod silmek de satır numarası taşıyan belgeleri kaydırır: dosya:satır atfı içeren bir sözlük varsa, silme işinin ölçümü silinen aralığın **altındaki** atıfları da saymalı. Kanıt ekranı listesi kaydın içeriğinden çıkarılmalı, adından değil: adında `kart-uyari` geçen ekran da işaretli kayıtla çizildiği için kutuyu taşıyordu.
