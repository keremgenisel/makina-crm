# 0128 — Kilit tamamlama: liste silmeleri, panonun tek alan işlemleri, Extra Kalıp'ın tek kilit alanı

| | |
|---|---|
| **Durum** | Tamamlandı (2026-11-03, uygulama commit `ffa9d0e1`; plan turu Karar 17–27, uygulama Karar 28–30, triyaj Karar 31). Kökeni: analist 2026-11-02, QA boşluk analizi 2026-11-03, 16 bulgu işlendi |
| **Sahip** | Analist |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | **Kaynak:** `src/components/Customers.jsx`, `src/components/SimpleDealers.jsx`, `src/components/Notes.jsx`, `src/components/Documents.jsx`, `src/components/stock/MakinaStokTab.jsx`, `src/components/stock/UretimFormu.jsx`, `src/components/stock/YedekParcaSatisTab.jsx` (silme yolları), `src/components/ServisPanosu.jsx` (sekiz tek alan işleyicisi), `src/components/customers/CustomerDetailModal.jsx` (Extra Kalıp kilidi), `src/lib/kilitAlanlari.js` (pencere listeleri ve tarama kapsamı), `src/lib/utils.js` (`grupKimlikleri`, panodan taşınan grup kimliği yardımcısı; Karar 20), `src/App.jsx` (Bayiler ve Evrak'a `aktifKullanici` prop'u), `src/components/Stock.jsx` (prop'un üç alt bileşene iletilmesi). **Test:** yeni `tests/ui/kilit-tamamlama-0128.test.jsx`, yeni `tests/kilit-tamamlama-0128.test.js` (taramalar), ek blok `tests/kilit-alanlari.test.js`. **Belge:** `CLAUDE.md`, `specs/README.md`. Veri şeması, göç, izin tanımları, sunucu kuralları, birleştirme, yazdırma ve dışa aktarma dokunulmaz. |
| **Bağımlı spec'ler** | 0064 (kilit alanlarının listesini, `useKilitListesi` anlık denetimini ve "bir kayıt, bir kilit" kuralını kuran spec), 0004 (kilidin kendisi), 0111 (partinin bütün kayıtlarına anlık bakma emsali), 0119 (kilitsiz doğan son seçici). |
| **Ters çevrilen kriterler** | 0119 **C7** ters çevrilir (seçici artık kaydın kilidine anlık bakar; izin kapısı ve yazıcı aynen kalır); 0119'un kriterleri ve testleri **etkilenmez** (ölçüldü: iddia AC'lerde değil, C7 ve ölçüm 7'de; hiçbir test kilitsizliği sabitlemiyor). C7'nin simetri gerekçesi ("iki anlık eylem aynı kuralı taşır") **korunur**, çünkü R5 teknisyen seçicisini de denetime alıyor. 0064'ün tarama kriteri (AC-35) beş klasör yerine yazma yapan bütün dosyaları kapsar, iddiası (yeni pencere kilitsiz doğmasın) güçlenir. Başka ters çevrilen kriter yok (ölçüldü: silme yollarının kilide bakmadığını iddia eden test yok). |

---

## Intent

Kilit modeli 0064'te kurulduğunda formlar ve pencereler kapsama alındı, ama kaydı tek tıkla değiştiren ya da silen yollar dışarıda kaldı. Bugünkü sonuç tutarsız: panoda bir kartı **sürüklemek** başkası o kaydı düzenliyorsa reddediliyor, ama aynı kartın teknisyenini değiştirmek, panodan kaldırmak ya da müşteri listesinden o müşteriyi bütün servisleriyle silmek serbest. Üstelik Extra Kalıp satışı iki ayrı kilit alanıyla yazılıyor, yani aynı kayıt iki ekranda aynı anda açılabiliyor. Son olarak bu sınıfı önlemesi gereken tarama yalnız beş klasörü izliyor, yani yeni bir pencere yine kilitsiz doğabiliyor. Bu iş bittiğinde bir kaydı başkası düzenlerken onu silmek, tek alanını değiştirmek ya da ikinci bir ekranda açmak nedeniyle reddedilir.

---

## Requirements

### A. Liste silmeleri kilide bakar

- **R1.** Satır düğmesiyle yapılan silmeler kayıt anında **anlık** kilit denetiminden geçer (`useKilitListesi` → `baskasiKilitli`): müşteri, bayi, makina stoğu satırı, not, teklif ve proforma, yurt dışı faturası, üretim formu, yedek parça satışı. Kilit başkasındaysa hiçbir şey yazılmaz ve neden bildirilir.
- **R1/2.** Silme **kilit tutmaz**, yalnız bakar: tıklamayla biten işlem kilidin ömrünü (iki dakika) hak etmez ve pano sürüklemesi bu deseni zaten kullanıyor.
- **R2.** Denetim her kaydın **kendi** alanındadır: müşteri `customer`, bayi `dealer`, stok satırı `stock`, not `note`, teklif ve proforma `teklif`, fatura `fatura`, üretim formu `uretim_formu`, yedek parça satışı `yedek_parca`.
- **R3.** Kaskad silmelerde (müşteri ve bayi) denetim **kendi kilit alanı olan** çocukları da kapsar: müşterinin yedek parça satışları (`yedek_parca`) ve Extra Kalıp satışları (`part_sale`), bayinin yedek parça satışları (`yedek_parca`). `customer` alanındaki çocuklara (servis, tahsilat, görüşme, dosya) **ayrıca bakılmaz**, çünkü onlar gerçekten ana kaydın kilidi altında düzenleniyor: panonun servis formu da `customer` kilidini alıyor (ölçüm 9), yani ikinci bir denetim aynı kilidi iki kez sorar.
- **R3/2.** Yedek parça satışı partiliyse (`batchId` dolu) partinin **bütün** kayıtlarının kilidine bakılır, tek satır silinse bile (0111 R21 emsali): parti düzenlemesinin kilidi yalnız **birincil** kaydın kimliğinde durur (`_kilitId`, ölçüm 10), bu yüzden tek kimlik sorulursa partinin ikinci satırı korumasız kalır. Kilitli kayıt varsa o silme yapılmaz.
- **R3/3.** Maliyet tek çağrıdır: iki çocuğun kimlikleri silme işleyicisinde zaten hesaplanıyor (müşteri kaskadı alıcı süzgecini `confirmDel` içinde kuruyor), yani denetim hazır diziye bakar. Ayrı alandaki çocuk için bugün ikinci değil **hiç** denetim yok; silinen kayıt başkasının açık formunun konusu olabiliyor.
- **R4.** Red metni **yeni yazılmaz**: var olan nötr yardımcı `kilitAlanlari.js` `kilitRedMesaji(kilit, ad)` kullanılır ve ikinci argümana insan okunur ad geçilir (firma adı, belge adı, parça adı). Panonun yerel kopyası (`ServisPanosu.jsx` `kilitReddet`, "taşınamadı") **silinir** ve sürükleme reddi de bu yardımcıdan geçer; yardımcının cümlesi ("işlem yapılmadı") silmeye, seçiciye ve sürüklemeye birlikte uyuyor.
- **R4/2.** Tek istisna `kalipTamiri.js` `TAMIR_KILITLI`: 0115'in eylem özel cümlesi ("kalıplar işaretlenmedi") yerinde kalır ve gerekçesi yazılıdır. Kaynak taraması: `src/components` altında kilit reddi için serbest metin yasak (tek yol yardımcıdır).

### B. Panonun tek alan işlemleri kilide bakar

- **R5.** Panoda kaydı tek tıkla değiştiren **on** işleyici de aynı anlık denetimden geçer (plan turunda onuncusu eklendi, Karar 17): servisin teknisyeni, **kalıbı gönderen kişi** (0119), **yedek parça kargo sorumlusu** (`kargoSorumluDegistir`, `ServisPanosu.jsx:313`: grubun bütün kayıtlarına `kargoSorumlusu` yazıyor, kilide bakmıyor; Extra Kalıp'taki ikizi listedeydi, bu yoktu), Extra Kalıp kargo sorumlusu, panodan kaldır ve panoya geri al (servis, **kargo** ve Extra Kalıp), hemen düşür (servis, kargo, Extra Kalıp). Kargonun panodan kaldırılması bu turda eklendi (`kargoPanoGizle`, ölçüm 2); AC-7 onu zaten istiyordu.
- **R5/2.** Alan eşlemesi sütun değişiminin bugünkü eşlemesiyle **aynıdır**: servis işlemleri `customer` (servisin müşterisi), kargo işlemleri `yedek_parca`, Extra Kalıp işlemleri `part_sale`. Partili kargo ve Extra Kalıp kayıtlarında grubun bütün kimlikleri sorulur (bugünkü sütun değişiminin yaptığı gibi).
- **R5/3.** Servisin müşterisi çözülmüyorsa (`customerId` boş) denetim **atlanır** ve işlem geçer: bugünkü sütun değişimi de öyle yapıyor (şartlı denetim, ölçüm 17) ve müşterisiz kart 0119'un ayrıca test ettiği gerçek bir hâl.
- **R6.** Reddedilen işlem hiçbir alan yazmaz, işlem geçmişine kayıt düşmez ve seçici eski değerine döner.
- **R7.** İzin kapıları ve yazıcılar değişmez: her işleyici bugünkü iznini aynen arar, kayıt kurucuları (0119'un yazıcısı dahil) dokunulmaz.
- **R8.** Kullanıcının **kendi** kilidi engellemez (bugünkü kural): aynı kişi kaydı bir sekmede açıkken panodan da işleyebilir.

### C. Extra Kalıp satışı tek kilit alanı

- **R9.** Müşteri detayı Extra Kalıp satışını yazarken `part_sale` kilidini **de** kullanır: düzenleme formu açıkken kilidi tutar (yedek parça satışında bugün yapıldığı gibi), ödendi işareti, çek tahsili, durum seçicisi ve silme ise anlık denetimden geçer.
- **R9/2.** Müşteri kilidi aynen kalır: detay penceresi müşterinin kilidini tutmaya devam eder, Extra Kalıp kilidi ona eklenir.
- **R9/3.** Müşteri detayının anlık denetimleri (ödendi, çek tahsili, durum seçicisi, silme) Extra Kalıp **grubunun bütün kimliklerini** sorar; tutulan kilit ise kaydın kendi kimliğidir. `part_sales` de partili olabiliyor (`batchId`, ölçüm 11) ve pano grubu yazarken kilidi birincil kimlikte tutuyor, yani tek kimlik sorulursa partinin ikinci kaydı korumasız kalır. R3/2'nin yedek parçadaki kuralının ikizi.
- **R9/4.** **Düzenleme formu kayıt anında da grubun kilidine bakar (Karar 19).** Pano Extra Kalıp kartının kilidini grubun **birincil** kaydında tutuyor (`useLock("part_sale", kalipDetayId)`), müşteri detayının formu ise kaydın **kendi** kimliğini kilitler; partinin ikinci satırı müşteri detayında açılırsa iki kilit çakışmaz. Form kayıt anında grubun bütün kimliklerine anlık bakar ve başkasında kilit varsa kaydetmez (0111 R21'in yedek parçadaki deseni).
- **R10.** Kilit alanlarının pencere listesi **bütün yeni denetleyicileri** kapsar (liste kaydın hangi ekranlarda yazıldığını anlatan tek belgedir): `part_sale` → müşteri detayı **ve `Customers.jsx`**, `customer` → `Customers.jsx` (bugün hiçbir listede yok ve hiç kilit çağırmıyor, ölçüm 12), **`yedek_parca` → `Customers.jsx` ve `SimpleDealers.jsx`** (plan turu, Karar 18: iki kaskad o kayıtları yazıyor ve kilidine bakacak; R10/2'nin iki yönlü kuralı onları ister). Diğer altı silme ekranı kendi alanının listesinde (ölçüldü, ek giriş gerekmiyor).
- **R10/2.** Kural iki yönlüdür ve emsali var: anlık denetim yapan dosya ya alanın pencere listesine ya gerekçeli kilitsiz listesine girer (`gider/StopajDonemleri.jsx` ikincisini kullanıyor). R11'in taraması bu yönü de ölçer; bugün kural yalnız `kilitAlanlari.js`'in başlık yorumunda yazılı, testte yok (ölçüm 13).

### D. Tarama yazma yapan her dosyayı kapsar

- **R11.** 0064'ün tarama kriteri beş klasör yerine `src/components` altındaki **bütün** dosyaları tarar ve kapsamı dosyanın ne yaptığıyla belirler: bir veri bölümüne yazan ya da kilit çağıran her dosya ya bir kilit alanının penceresidir, ya bir Ayarlar panelidir, ya da gerekçeli kilitsiz listesindedir.
- **R11/2.** "Yazan dosya" ölçütü **türetilir, elle yazılmaz**: `BLOB_SECTIONS`'ın 32 bölüm adının başına `set` eklenip ilk harf büyütülerek üretilen adlar (`setCustomers`, `setYedekParcaSatislar`, `setHesapHareketleri`, `setUretimFormlari`, …) **çıplak ad** olarak aranır. Parantez şartı yoktur, çünkü `useSimpleDefList(parts, setParts, …)` setter'ı çağırmadan geçiriyor; yeni bir veri bölümü eklenince ölçüt kendiliğinden büyür ve elle bakım gerekmez.
- **R11/3.** Ölçüldü: bu ölçütle bugünkü kapsamın dışında **on** dosya kalıyor ve hepsinin sınıfı yazılıdır (ölçüm 8). Kalan kırk dosya hiçbir bölüm adını anmıyor, yani listeye hiç girmiyor: "bütün dosyaları listelemek listeyi gürültüye çevirir" kaygısı ölçümle çürüdü, salt okunur kartlar ve rozetler kendiliğinden dışarıda kalıyor.
- **R11/4.** Bilinen sınır: `onSave` geri çağırımıyla yazan formlar (`ServiceForm`, `PartSaleForm`, `YedekParcaSatisForm`, `TahsisModal`, `KalemSecPenceresi`, `FaturaFormModal`) ölçüte girmez; onların koruması çağıranın kilidi ve bu bilinçlidir.
- **R12.** Yeni kilit alanı açılmaz (ölçüldü: sekiz alanın hepsi `KILIT_ALANLARI`'nda var) ve pencere listelerinin bugünkü eksikleri **sayılarak** kapatılır: `part_sale` → müşteri detayı, `customer` → `Customers.jsx`, `ayar` → `ModelsManager`, `PartManager`, `KalipManager`, `PartTypeManager` (dördü de katalog yazıyor, ad zincirinde `setCustomers` ve `setServices`'e dokunuyor ve bugün hiçbir listede değil, ölçüm 8).

---

## Constraints

### Uyulması zorunlu

- **C1.** Kilit **yumuşak** korumadır ve bu iş onu sertleştirmez: fail-open davranışı (kilit okunamazsa işlem geçer), iki dakikalık ömür ve asıl koruma olan sürüm çakışması (409) aynen kalır. Amaç iki kişinin aynı anda boşa çalışmasını önlemektir, güvenlik sınırı kurmak değildir.
- **C2.** Anlık denetim tek kancadan (`useKilitListesi`) ve tek yardımcıdan (`baskasiKilitli`) gelir; ekranlar kendi kilit listesini çekmez.
- **C3.** Hiçbir yazma yolu, kayıt kurucusu, izin kapısı ve iz kaydı değişmez: bu iş yalnız yazmanın önüne bir denetim koyar.
- **C4.** Kiosk ve panonun ayrı penceresi de kapsanır (ikisi de aynı bileşeni çiziyor ve köprü kilit kanallarını taşıyor, ölçüldü).
- **C5.** Red metinleri Türkçe ve tek yerde; kilidi tutan kullanıcının adı yazılır. Bugün bu iddia **yanlış**: üç metin var (paylaşılan `kilitRedMesaji`, panonun yerel `kilitReddet`, 0115'in `TAMIR_KILITLI`; ölçüm 14). Bu iş sayıyı ikiye indirir (R4, R4/2) ve yeni metin yazmaz.

### KAPSAM DIŞI

- **X1.** Çöp Kutusu'nun geri alma ve kalıcı silme yollarının kilide bakması — *neden:* Çöp Kutusu bir Ayarlar panelidir ve panel kilidi altında çalışıyor; oradaki kayıtlar zaten silinmiş kayıtlardır ve kimse onları düzenlemiyor.
- **X2.** Sunucu tarafında kilit denetimi — *neden:* kilit istemci tarafı bir nezaket katmanıdır (0064 bilinen sınır); sunucu yazımı sürüm çakışmasıyla korunuyor.
- **X3.** Kilidin ömrünün ya da devralma akışının değişmesi — *neden:* bu iş kapsamı genişletir, mekanizmayı değiştirmez.
- **X4.** Satış ve kayıt formlarının kilit kapsamının genişletilmesi (ör. satılmış makinanın düzenlenmesi) — *neden:* 0103 bunu bilinçli olarak dışarıda bıraktı ve ayrı bir karardır.
- **X5.** Aynı kullanıcının iki penceresinin birbirini engellemesi — *neden:* kilit kullanıcı adına göre tutuluyor (0064 bilinen sınır), değiştirmek oturum kimliği gerektirir.
- **X6.** Set Hazırla ve Seti Parçala pencerelerinin, setin içeriği başka bilgisayarda değişirken uyarması — *neden:* iki ayrı kayıt (parça kaydı ile stok satırı) ve iki ayrı kilit alanı; içerik değişimi ne hazırlamayı ne parçalamayı bozar, ikisi de yalnız eski içerikle hesaplar. 0130 içeriği parçalama anında okuduğu için boşluk orada daha görünürdür, ama kapsam dışı kararı aynı kalır: ayrı ölçüm ister.

---

## Context

Ölçümler bugünkü kaynakla yapıldı.

1. **Bugün kilit alan yerler:** 23 dosyada 32 `useLock` çağrısı (formlar, detay pencereleri, Ayarlar panelleri, üretim formu, parça stoğu penceresi, Set Hazırla ve 0130'un Seti Parçala penceresi) ve 7 dosyada 11 anlık denetim çağrısı (`baskasiKilitli(`; adı 15 dosyada geçiyor, sekizi yalnız prop aktarıyor). Yani model kurulu ve çalışıyor.
2. **Panoda yalnız dört işlem korunuyor:** servis sütunu (`ServisPanosu.jsx:412`, `customer`), kargo sütunu (`:300`, `yedek_parca`), Extra Kalıp sütunu (`:343`, `part_sale`) ve kalıpların bitti işaretlenmesi (`:147`, `uretim_formu`). Korunmayan **dokuz** işleyici: `kargoPanoGizle` (`:305`), `kalipPanoGizle` (`:347`), `kalipSorumluDegistir` (`:354`), `kalipHemenDusur` (`:360`), `teknisyenDegistir` (`:436`), `sevkSorumluDegistir` (`:443`), `hemenDusur` (`:449`), `kargoHemenDusur` (`:456`), `panoGizle` (`:462`). Sekizi QA turunda birebir doğrulandı, `kargoPanoGizle` o turda eklendi (kargoyu panodan kaldırıp geri alıyor, grubun bütün kayıtlarına `panoGizli` yazıyor ve kilide bakmıyor). Kanca panoda zaten kurulu (`:134`), yani bu yarım bir eksiklik.
3. **Liste silmeleri hiç bakmıyor:** `Customers.jsx:413` müşteriyi, servislerini, Extra Kalıp satışlarını, tahsilatlarını, kargo satışlarını ve dosyalarını tek damgayla çöpe atıyor (`:417`–`:431`); `SimpleDealers.jsx:272`, `MakinaStokTab.jsx:118`, `Notes.jsx:103`, `YedekParcaSatisTab.jsx:193`, `UretimFormu`'nun silme işleyicisi (`:164` setter satırıdır, işleyici daha yukarıda), `Documents.jsx:355` (`delFatura`) ve `:652` (`del`, teklif ve proforma aynı işleyici) aynı şekilde. Bu yedi dosyada `baskasiKilitli` hiç geçmiyor.
4. **Prop ölçümü (QA turunda düzeltildi):** `aktifKullanici` bugün Müşteriler, Notlar, müşteri detayı, Giderler, Kasa, Makina Maliyeti, pano, Ayarlar **ve `Stock`**'a geçiyor (`App.jsx:1716`); `Stock` prop'u alıyor ama yalnız `PartStokTab`'a iletiyor (`Stock.jsx:75`). Yani App'ten eksik **iki** ekran var (Bayiler `:1715`, Evrak `:1745`) ve `Stock` içinde **üç** yeni iletim gerekiyor (`MakinaStokTab`, `YedekParcaSatisTab`, `UretimFormu`). Prop ulaşmazsa `k.locked_by !== undefined` her zaman doğru olur ve **kullanıcının kendi kilidi de** işlemi reddeder (R8 çiğnenir).
5. **Extra Kalıp ayrışması:** pano `part_sale` kilidini alıyor (`ServisPanosu.jsx:163`), müşteri detayı ise aynı kaydı yalnız müşteri kilidi altında yazıyor. İşleyiciler adlarıyla: `savePartSale` (setter `CustomerDetailModal.jsx:488`), `togglePartSaleOdendi` (`:502`), `togglePartSaleCekTahsil` (`:511`), `deletePartSale` (`:517`) ve 0106'nın durum seçicisi. Ölçüm 2 ve 3 işleyici **başlangıcını**, bu ölçüm **setter satırını** veriyor; atıflar bu yüzden adla verildi (ad kaymaz, satır kayar). Servis ve yedek parça tarafında böyle bir ayrışma yok (ikisi de aynı alanı paylaşıyor), yani düzeltilecek tek kayıt türü budur.
6. **Tarama kapsamı:** koruma testi `gider/`, `kasa/`, `cek/`, `settings/` ve `maliyet/` klasörlerini tarıyor; `stock/`, `customers/` ve bileşen kökü dışarıda. 0121'in Set Hazırla ve 0130'un Seti Parçala penceresi kilidini aldı ve listeye gönüllü yazıldı, ama almasalardı hiçbir test uyarmayacaktı (iki kez üst üste gönüllülüğe kalan bir kural, kuralın kendisi değildir). Kapsam `src/components`'in tamamına açılırsa eklenen yer **üç değil sekiz** (kök 42, `stock/` 14, `customers/` 4, `customers/detail/` 5, `documents/` 2, `rapor/` 1, `harita/` 1, `evrak/` 1) ve dosya sayısı 62 değil **70** (toplam 125, bugün taralı 55). Bu yüzden kapsam ölçütü "yazan dosya" olmalı (R11, R11/2).
7. **Red deseni hazır ama tek değil:** paylaşılan yardımcı `kilitAlanlari.js:103` `kilitRedMesaji` zaten **nötr** bitiyor ("işlem yapılmadı") ve testli (`stopaj-donemi-0084.test.jsx:137`); panonun `ServisPanosu.jsx:135` `kilitReddet`'i ise onun **yerel kopyası** ve "taşınamadı" diyor, hiçbir test onu sabitlemiyor. Üçüncüsü 0115'in `TAMIR_KILITLI`'si. Silme ve seçici kardeşleri yeni cümle değil, paylaşılan yardımcıdır (R4).

### QA turu ölçümleri (2026-11-03)

Hepsi bugünkü kaynakla doğrulandı.

8. **R11'in ölçütüyle kapsam dışı kalan on dosya ve sınıfları:** `Customers.jsx` (yedi bölüm) → `customer` penceresi; `customers/detail/CustomerFilesSection.jsx` ve `DealerFilesSection.jsx` (bileşen kökünde, `customers/detail/` altında değil; Karar 22) (`setDosyalar`) → gerekçeli kilitsiz (ana kaydın kilidi altında); `ModelsManager.jsx` (beş bölüm), `PartManager.jsx` (dört bölüm), `KalipManager.jsx` (üç bölüm), `PartTypeManager.jsx` (iki bölüm) → `ayar` penceresi; `Stock.jsx`, `MakinaMaliyeti.jsx`, `ServisPencere.jsx` (yalnız iletiyor) → gerekçeli kilitsiz (kap). Kalan kırk dosya hiçbir bölüm adını anmıyor.
9. **Panonun servis formu `customer` kilidini alıyor:** `useLock("customer", form.customerId)` yalnız düzenleme kipinde (`ServisPanosu.jsx:294`), yani müşteri kaskadının servis çocukları gerçekten ana kaydın alanı altında (R3'ün gerekçesi bu çocuklar için doğru).
10. **Parti kilidi birincil kimlikte duruyor:** `CustomerDetailModal.jsx:122` `useLock("yedek_parca", ypForm?.id ?? ypForm?._kilitId ?? null)`; `YedekParcaSatisTab.jsx:78` tek kimlikle (`modal?.edit?.id`). Stok sekmesinin `sil(rec)`'i ise tek kayıt siliyor (`:196`), parti silmiyor.
11. **Extra Kalıp partili olabiliyor:** `part_sales` tablosunda `batchId` sütunu var (`db.cjs:193`) ve pano Extra Kalıp işlemlerini `grupIdleri(partSales, id)` ile grup üzerinden yazıyor (`ServisPanosu.jsx:53`), kilidi ise birincil kimlikte tutuyor (`:163`).
12. **`Customers.jsx` bugün kilit API'sine hiç dokunmuyor:** 25 dosya `useLock(` ya da `baskasiKilitli(` çağırıyor, `Customers.jsx` aralarında değil ve hiçbir alanın pencere listesinde de yok; `aktifKullanici`'yi 0111'den beri alıyor (`:43`) ve yalnız detay penceresine iletiyor (`:698`).
13. **Tarama bu yönü denetlemiyor:** `kilit-alanlari.test.js`'in AC-22 taraması yalnız çağrının ilk argümanının **bilinen bir alan adı** olmasını istiyor (`:16-29`); "çağıran dosya o alanın listesinde mi" diye sormuyor. İkinci AC-22 testi bir alanın pencerelerinden **en az birinin** o alanı kullanmasını istiyor (`:30-37`). Emsal: `gider/StopajDonemleri.jsx` `baskasiKilitli("gider")` çağırıyor ama `gider` listesinde değil, `KILITSIZ_DOSYALAR`'da gerekçeyle duruyor.
14. **Üç red metni:** `kilitAlanlari.js:103` `kilitRedMesaji` (nötr, testli), `ServisPanosu.jsx:135` `kilitReddet` (yerel kopya, "taşınamadı", testsiz), `kalipTamiri.js:24` `TAMIR_KILITLI` (0115'in eylem özel cümlesi). Hiçbir test "taşınamadı" dizesini iddia etmiyor.
15. **Ayrı pencere ve kiosk kapsanıyor (C4 doğrulandı):** App anlık görüntüde `aktifKullanici: savedUsername` gönderiyor (`App.jsx:1050`), `ServisPencere.jsx:92` onu panoya iletiyor ve `preload-servis.cjs:30` `crmLocks` ile `onLocksChanged`'ı açıyor.
16. **Yerel kipte kilit listesi hep boş:** `useKilitListesi` köprü yoksa hiç abone olmuyor (`if (!window.crmLocks?.list) return;`), yani tek kullanıcılı kurulumda yeni denetimlerin hiçbiri ateşlenmez.
17. **Sütun değişiminin denetimi şartlı:** `durumDegistir` yalnız `sv?.customerId != null` iken soruyor (`ServisPanosu.jsx:411`), müşterisiz kart denetimi atlıyor ve taşınıyor.
18. **Silme yollarının kilit alanları yerinde:** `dealer` → `SimpleDealers.jsx`, `note` → `Notes.jsx` (`useLock("note", selectedId)`), `teklif` ve `fatura` → `Documents.jsx` (`:228`, `:288`), `stock` → `MakinaStokTab.jsx`, `uretim_formu` → `UretimFormu.jsx`, `yedek_parca` → `YedekParcaSatisTab.jsx`. Altısı için pencere listesine ek giriş gerekmiyor (R10).

### QA turunda verilen kararlar (2026-11-03)

16 bulgunun hepsi Takım Yöneticisi tarafından onaylandı.

- **Karar 1 (B‑1).** Taramanın "yazan dosya" ölçütü `BLOB_SECTIONS`'tan türetilir, çıplak ad aranır; on dosyanın sınıfı yazılır. → R11, R11/2, R11/3, R11/4, ölçüm 8
- **Karar 2 (B‑2).** Yeni red metni yazılmaz; panonun yerel kopyası silinir, `TAMIR_KILITLI` gerekçeli istisna kalır. → R4, R4/2, C5, ölçüm 14
- **Karar 3 (B‑3).** Korunmayan işleyici listesi dokuza çıkar (`kargoPanoGizle`). → R5, ölçüm 2
- **Karar 4 (Ö‑1).** Kaskad kendi alanı olan çocukların kilidine de bakar; `customer` çocuklarına bakmaz. → R3, R3/3, ölçüm 9
- **Karar 5 (Ö‑2).** Prop ölçümü düzeltilir: App'e iki prop, `Stock` içinde üç iletim. → başlık, ölçüm 4
- **Karar 6 (Ö‑3).** Müşterisi olmayan servis kartında denetim atlanır ve işlem geçer. → R5/3, ölçüm 17
- **Karar 7 (Ö‑4).** Ters çevrilen kriter 0119 **C7**'dir; 0119'un testleri etkilenmez, simetri gerekçesi korunur. → başlık
- **Karar 8 (Ö‑5).** Tarama kriteri ikiye ayrılır: sınıflama listesi ve mutasyon ölçümü. → AC-15, AC-24
- **Karar 9 (Ö‑6).** Pencere listesi bütün yeni denetleyicileri kapsar; kuralın iki yönlü olduğu ve emsali yazılır. → R10, R10/2, ölçüm 12, ölçüm 13
- **Karar 10 (Ö‑7).** Extra Kalıp'ın anlık denetimleri grubun bütün kimliklerini sorar. → R9/3, ölçüm 11
- **Karar 11 (K‑1).** R3/2'nin gerekçesi `_kilitId` ile yazılır; "bütünüyle reddedilir" ifadesi düzeltilir. → R3/2, ölçüm 10
- **Karar 12 (K‑2).** Kapsam sayıları düzeltilir (sekiz yer, 70 dosya). → R11/3, ölçüm 6
- **Karar 13 (K‑3).** Bütün atıflar işleyici adıyla verilir. → ölçüm 3, ölçüm 5
- **Karar 14 (K‑4).** Fail-open'ın ikinci hâli (yerel kip, boş liste) kriterleşir. → AC-16, ölçüm 16
- **Karar 15 (K‑5).** R12'nin "eksiksiz" iddiası sayılarak yazılır (dört katalog yöneticisi dahil). → R12
- **Karar 16 (K‑6).** Görsel kanıt gerekmediği DoD'ye yazılır. → DoD

### Plan turunda verilen kararlar (2026-11-03)

Takım Yöneticisi planın bütün önerilerini onayladı.

- **Karar 17.** Onuncu korumasız işleyici `kargoSorumluDegistir` kapsama alınır. → R5, AC‑18
- **Karar 18.** `Customers.jsx` `yedek_parca` ve `part_sale` listelerine, `SimpleDealers.jsx` `yedek_parca` listesine de girer (R10/2'nin iki yönlü kuralı). → R10
- **Karar 19.** Müşteri detayının Extra Kalıp formu kendi kimliğinin kilidini tutar ve kayıt anında grubun bütün kimliklerine bakar. → R9/4, AC‑27
- **Karar 20.** Panonun yerel grup kimliği yardımcısı `utils.grupKimlikleri` olarak taşınır; pano ve müşteri detayı tek tanımı kullanır. → başlık
- **Karar 21.** Silme denetimi onay anındadır (silme düğmesinde değil); reddedilen silmede onay penceresi kapanır, bildirim çıkar. → R1
- **Karar 22.** Ölçüm 8'in yol atfı düzeltildi (`DealerFilesSection.jsx` bileşen kökünde). → ölçüm 8
- **Karar 23.** Red metninin adı: müşteri, servis kartı ve Extra Kalıp → firma adı; kargo → alıcı adı (`aliciAd`); bayi → bayi adı; belge ve fatura → firma adı; stok satırı → model · seri no; not → not başlığı; üretim formu → başlangıç tarihi; çözülemezse yardımcının varsayılanı (kimlik). → R4
- **Karar 24.** Tarama yorum satırlarını ayıklayarak arar (yalnız yorumda geçen ad dosyayı "yazan" yapmaz); sınıflama yeniden ölçülür. → R11/2
- **Karar 25.** AC‑24'ün mutasyon ölçümü uygulamada iki bozmayla yapılır ve sonuç spec'e yazılır. → AC‑24
- **Karar 26.** Kilidi sahteleyen eski testlerde çıkan her ret tek tek incelenir; gerçek davranış değişikliği "spec 0128 ile" notlanır. → başlık
- **Karar 27.** Seçicinin eski değerine dönmesi ek kod istemez (denetimli seçici), testle ölçülür. → R6

### Uygulamada verilen kararlar (2026-11-03)

- **Karar 28.** Anlık denetimin "bak, bildir, dur" deseni yedi ekranda tekrar edeceği için kancaya eklendi: `useKilitListesi` `kilitliIse(alan, idler, ad, bildir)` döndürür (C2: tek kanca); pano da onu kullanır. İki yönlü tarama `kilitliIse(` çağrılarını da sayar.
- **Karar 29.** Ölçümler: yorum satırları ayıklanmış ölçütle (Karar 24) kapsam dışı kalan dosya sayısı yine **on**; iki yönlü kuralın bugünkü ihlali **sıfır** (kurulduktan sonra da); kilidi sahteleyen eski testlerde yeni ret **çıkmadı** (Karar 26), kırılan tek eski test sözlüğün satır atıflarıydı (`tasarim-kaynak`, satırlar kaydı). AC‑24 mutasyonu: gerekçeli kilitsiz listesinden bir giriş silinince, kapsamsız yeni bir yazan dosya eklenince ve `yedek_parca` listesinden `Customers`/`SimpleDealers` çıkarılınca tarama kırıldı. Davranış testlerinde on iki bozma yapıldı, hepsi test kırdı.
- **Karar 30.** `src/components/settings/SettingsBackup.jsx` kendi kilit listesini okur (geri yükleme ön denetimi, 0064 R11–R13: bütün kilitleri devralmak için); bu anlık denetim değildir ve C2 taramasında gerekçeli tek istisnadır.

### Triyajda verilen karar (2026-11-03)

- **Karar 31.** (1) Müşteri kaskadı, alıcısı başkası olup tahsisini serbest metne çevirdiği yedek parça satışlarının (`yedekParcaTahsisliMi`) kilidine de bakar (R3/3'ün gerekçesi onlar için de geçerli). (2) Extra Kalıp "Ödendi" işareti tahsilat hesabı penceresinden sonra yazım anında da grubun kilidine bakar; pencerenin sakladığı geri çağırım açılış anının kapanışını tuttuğu için denetim güncel listeyi bir ref üzerinden okur (bayat kapanış testle yakalandı). (3) AC‑25 gerçek App'te ölçülür: Bayiler sekmesinde kullanıcının kendi kilidi silmeyi engellemez, başkasınınki engeller (`tests/ui/kilit-tamamlama-0128-app.test.jsx`).

### Karar kaydı

| # | Bulgu | Derece | Spec'e işlenen yer |
|---|---|---|---|
| 1 | R11'in "yazan dosya" ölçütü tanımsız, test yazılamaz | Bloklayıcı | R11, R11/2, R11/3, R11/4 |
| 2 | C5 "tek yerde" bugün yanlış, R4 yanlış öncülle yazılmış | Bloklayıcı | R4, R4/2, C5 |
| 3 | Dokuzuncu korunmayan işleyici atlanmış (`kargoPanoGizle`) | Bloklayıcı | R5, ölçüm 2 |
| 4 | R3'ün gerekçesi iki çocuk için yanlış (`yedek_parca`, `part_sale`) | Önemli | R3, R3/3 |
| 5 | Ölçüm 4 yanlış: `Stock` zaten prop'u alıyor | Önemli | başlık, ölçüm 4 |
| 6 | Müşterisi olmayan servis kartının hâli yazılmamış | Önemli | R5/3 |
| 7 | Ters çevrilen kriter yanlış adreste (0119 C7, AC değil) | Önemli | başlık |
| 8 | AC-15 ölçülebilir değil | Önemli | AC-15, AC-24 |
| 9 | R10 eksik; taramanın yönü yok | Önemli | R10, R10/2 |
| 10 | Extra Kalıp partili, tek kimlik yetmez | Önemli | R9/3 |
| 11 | R3/2'nin "bütünüyle reddedilir" ifadesi yanlış | Küçük | R3/2 |
| 12 | Ölçüm 6'nın sayıları yanlış (üç yer, 62 dosya) | Küçük | R11/3, ölçüm 6 |
| 13 | Satır atıfları iki farklı şeyi gösteriyor | Küçük | ölçüm 3, ölçüm 5 |
| 14 | AC-16 fail-open'ın tek hâlini ölçüyor | Küçük | AC-16 |
| 15 | R12'nin "eksiksiz" iddiası sayılmamış | Küçük | R12 |
| 16 | DoD'de kanıt kararı yok | Küçük | DoD |

---

## Acceptance Criteria

- **AC-1.** Başkası müşteriyi düzenlerken müşteri listesinden silme reddedilir, neden kullanıcının adıyla bildirilir ve hiçbir kayıt çöpe atılmaz (servisler, Extra Kalıp satışları, tahsilatlar, kargo satışları ve dosyalar dahil).
- **AC-2.** Kilit kendi kullanıcımızdaysa silme çalışır.
- **AC-3.** Aynı kural bayi, makina stoğu satırı, not, teklif, proforma, fatura, üretim formu ve yedek parça satışı silmelerinde de geçerlidir.
- **AC-4.** Partili yedek parça satışında partinin herhangi bir kaydı başkasındaysa silme bütünüyle reddedilir.
- **AC-5.** Silme kilit **tutmaz**: reddedilmeyen silmeden sonra kayıt üzerinde kilit oluşmaz.
- **AC-6.** Panoda teknisyen seçicisi, kalıbı gönderen kişi seçicisi ve Extra Kalıp kargo sorumlusu seçicisi, kayıt başkasındayken yazmaz ve nedeni bildirir.
- **AC-7.** Panodan kaldır, panoya geri al ve hemen düşür işlemleri (servis, kargo, Extra Kalıp) aynı denetimden geçer.
- **AC-8.** Reddedilen pano işleminde işlem geçmişine kayıt düşmez.
- **AC-9.** Pano işlemlerinin alan eşlemesi sütun değişimiyle aynıdır; partili kayıtlarda grubun bütün kimlikleri sorulur.
- **AC-10.** Kiosk ve panonun ayrı penceresinde de aynı denetimler çalışır.
- **AC-11.** Müşteri detayında Extra Kalıp düzenleme formu açıkken `part_sale` kilidi tutulur; pano o kaydı açmaya çalışınca kilit çakışması görür.
- **AC-12.** Müşteri detayında Extra Kalıp'ın ödendi işareti, çek tahsili, durum seçicisi ve silmesi anlık denetimden geçer.
- **AC-13.** Müşteri kilidi aynen korunur: detay penceresi müşterinin kilidini tutmaya devam eder.
- **AC-14.** Kilit alanlarının pencere listesi `part_sale` için müşteri detayını da içerir.
- **AC-15.** Tarama `src/components` altındaki yazan her dosyayı kapsar: ölçütle (R11/2) bulunan on dosyanın her biri ya bir kilit alanının penceresi, ya bir Ayarlar paneli, ya gerekçeli kilitsiz listesindedir ve test boş `eksik` dizisi ister.
- **AC-16.** Kilit okunamadığında (fail-open) bütün işlemler bugünkü gibi geçer; **ikinci hâl**: köprü yok ya da liste boş (yerel, tek kullanıcılı kurulum) iken silmeler, pano işlemleri ve Extra Kalıp işlemleri de geçer (ölçüm 16).
- **AC-17.** Veri şeması, izin tanımları, sunucu kuralları ve birleştirme değişmez (tarama).

### QA turu kriterleri (2026-11-03)

- **AC-18.** Panonun on işleyicisinin hepsi adıyla denetimden geçer: `teknisyenDegistir`, `sevkSorumluDegistir`, `kargoSorumluDegistir`, `kalipSorumluDegistir`, `panoGizle`, `kargoPanoGizle`, `kalipPanoGizle`, `hemenDusur`, `kargoHemenDusur`, `kalipHemenDusur`.
- **AC-19.** Red metni tek yardımcıdan (`kilitRedMesaji`) gelir ve insan okunur adı yazar; panonun yerel `kilitReddet`'i kaynakta yok, "taşınamadı" dizesi kaynakta yok ve `TAMIR_KILITLI` gerekçeli istisna olarak duruyor (tarama).
- **AC-20.** Müşteri kaskadı silmeden önce yedek parça satışlarının (`yedek_parca`) ve Extra Kalıp satışlarının (`part_sale`) kilidine bakar, bayi kaskadı yedek parça satışlarının kilidine bakar; `customer` alanındaki çocuklar için ikinci bir denetim yapılmaz (tarama ile ölçülür).
- **AC-21.** Müşterisi çözülmeyen servis kartında denetim atlanır ve dört servis işlemi geçer (sütun değişimiyle aynı davranış).
- **AC-22.** Müşteri detayının Extra Kalıp anlık denetimleri grubun bütün kimliklerini sorar: pano partinin birincil kaydını açarken partinin ikinci kaydının ödendi işareti de reddedilir.
- **AC-23.** `Customers.jsx` `customer` alanının pencere listesinde; anlık denetim yapan her dosya ya alanının listesinde ya gerekçeli kilitsiz listesindedir (tarama bu yönü de ölçer).
- **AC-24.** Taramanın ölçütü `BLOB_SECTIONS`'tan türer (elle sayılmış setter listesi yok) ve **mutasyonla ölçülür**: listeden bir giriş silinince test kırılır, ölçüm plan turunda yazılır.
- **AC-25.** `aktifKullanici` beş ekrana ulaşır (Bayiler ve Evrak App'ten, üç Stok çocuğu `Stock`'tan) ve kullanıcının kendi kilidi hiçbir ekranda işlemi engellemez (AC-2'nin zinciri).
- **AC-27.** Müşteri detayında Extra Kalıp düzenleme formu kaydederken grubun başka kaydı başkasında kilitliyse kaydetmez ve nedeni bildirir (R9/4).
- **AC-26.** Red bildirimleri dışında hiçbir ekranın yerleşimi değişmez: görsel kanıt gerekmez ve `docs/evidence/kanit-eslemesi.json` dokunulmaz (tarama).

---

## Definition of Done

- [x] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [x] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [x] Anlık denetim tek kancadan ve tek yardımcıdan geliyor (tarama).
- [x] Yeni kalıcı alan yok, yeni veri bölümü yok, yeni eylem izni yok; **kilidin yumuşak koruma olduğu ve sertleşmediği açıkça yazıldı.**
- [x] Fail-open davranışı testle sabitlendi (AC-16).
- [x] Kullanıcıya görünen bütün metinler Türkçe ve tek yerde.
- [x] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [x] Görsel kanıt gerekmedi (yalnız bildirim metni değişiyor); `docs/evidence/kanit-eslemesi.json` ve görüntü aracı dokunulmadı (AC-26).
- [x] `CLAUDE.md` güncellendi (kilit kapsamının yeni sınırı ve tarama kuralı).
- [x] Takım Yöneticisi onayladı. **Commit ve sürüm yayını yalnız açık talimatla yapılır.**
- [x] **SCORECARD dolduruldu** ve spec `specs/done/` klasörüne taşındı.

---

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Uygulama commit** | `ffa9d0e1` | Dal `feat/0128-kilit`, taban `3b2c24c5`; kapanış ayrı commit |
| **Spec revizyon sayısı** | 4 | QA turu (16 bulgu, Karar 1–16), plan turu (Karar 17–27), uygulama (Karar 28–30), triyaj (Karar 31) |
| **Düzeltme turu sayısı** | 1 | Triyaj: tahsisli bayi satışı, yazım anı denetimi (bayat kapanış), gerçek App prop zinciri testi |
| **Bulgu gerçek/gürültü oranı** | 3 / 0 | Üçüncüsü isteğe bağlı test önerisiydi, uygulandı |
| **Regresyon sayısı** | 0 | Tam takım 467 dosya, 6431 test (Electron dahil); lint 0 hata, uyarı 62 |
| **Kaçan hata** | 0 | |

**Uygulamada bulunanlar:** panoda spec'in saymadığı onuncu korumasız işleyici vardı (`kargoSorumluDegistir`, Karar 17). Pencere listesinin iki yönlü kuralı üç eksik daha gösterdi (Karar 18). Extra Kalıp'ta pano grubun birincil kaydını, müşteri detayı kaydın kendisini kilitlediği için iki kilit çakışmıyordu; kayıt anı grup denetimi eklendi (Karar 19). Yedi ekranda tekrar edecek "bak, bildir, dur" adımı kancaya taşındı (Karar 28). Kilidi sahteleyen yirmiyi aşkın eski testte yeni ret çıkmadı (Karar 29). Triyajda: tahsilat hesabı penceresinin sakladığı geri çağırım açılış anının kilit listesini görüyordu, test yakaladı ve denetim ref'e bağlandı. Mutasyon ölçümü: uygulamada on beş, triyajda üç bozma; hepsi test kırdı.

**Bu spec'ten çıkarılan ders:** bir pencere ya da onay penceresi kullanıcı kararını beklerken sakladığı geri çağırım, açıldığı andaki durumu kapanışında taşır; yazım anında tekrarlanan bir denetim güncel durumu ref'ten okumalıdır, yoksa denetim var gibi görünür ama bayat listeye bakar. İkinci ders: "korunmayan işleyiciler" listesi sayılırken bir türün ikizi (kalıp kargo sorumlusu) varsa öteki türün (yedek parça kargo sorumlusu) aynı işleyicisi de aranmalı. Üçüncüsü: elle tutulan kapsam listeleri yerine ölçütü veriden (BLOB_SECTIONS) türetmek, yeni veri bölümünün taramayı kendiliğinden büyütmesini sağlar.
