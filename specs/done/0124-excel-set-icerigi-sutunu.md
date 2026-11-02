# 0124 — Parça şablonuna set içeriği sütunu

| | |
|---|---|
| **Durum** | Tamamlandı (2026-11-02; QA turu Karar 1–17, plan turu Karar 18–25, uygulamada Karar 26–31, triyaj Karar 32–36; uygulama commit `00e48fe`; plan `specs/done/0124-uygulama-plani.md`). Kökeni: 2026-11-02, QA boşluk analizi 2026-11-02, 17 bulgu işlendi |
| **Sahip** | Analist |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | **Kaynak:** `src/lib/parcaAktarma.js` (on birinci sütun, çözümleme ve doğrulama), `src/lib/urunAgaci.js` (biçim çözücü ve hata metinleri), `src/components/settings/SettingsImport.jsx` (hata satırlarının gösterimi, içeriği yazılan parça sayısı ve **sütun kutusunun başlık dizisinden türetilmesi**, R10/2), `src/components/settings/SettingsExport.jsx` (on birinci hücrenin yazıldığı yer; yeni prop zinciri açılmaz, R3). **Test:** yeni `tests/excel-set-0124.test.js`, ek blok `tests/parca-aktarma-0087.test.js`, ters çevrilen `tests/set-icerigi-0121-kiyas.test.js`, `tests/hammadde-0096-kiyas.test.js`, `tests/maliyet-gecmisi-0097-kiyas.test.js`. **Belge:** `CLAUDE.md`, `specs/README.md`. Veri şeması (alan 0121'de kurulu), göç, izin tanımları, sunucu kuralları, birleştirme ve yazdırma dokunulmaz. |
| **Bağımlı spec'ler** | 0121 (`setIcerigi` alanını, doğrulamayı ve iç içe set yasağını kuran spec), 0087 (parça şablonunu ve konuma göre eşlemeyi kuran spec), 0096 ve 0097 (maliyet hücresinin bugünkü kuralları), 0130 (hazırlanmış setin parçalanması; parçalama içeriği işlem anında okuduğu için Excel'den yazılan içerik stok hareketini de yönetir), 0123 (sette geçen parçanın kalıcı silinmekten korunması; Excel artık bir parçayı o korumaya tabi bileşene çevirebilir ve 0123'ün `setteGecenParcalar` haritası ters yön denetiminin emsalidir, C6). |
| **Ters çevrilen kriterler** | **Beş iddia ters çevrilir (ölçüm 12, ölçüm 13; ilk taslak "yok" diyordu, yanlıştı).** (1) `parca-aktarma-0087.test.js:15` başlık dizisinin uzunluğunu 10'a sabitliyor → 11 olur; (2) `:17` örnek satırın uzunluğunu 10'a sabitliyor → 11 olur; (3) AC‑29'un adı "maliyet onuncu ve **son** sütun" diyor → adına "spec 0124 ile" notu girer, iddiası (konuma göre eşleme, araya sütun eklenmez) aynen korunur; (4), (5) ve (6) üç kıyas altını dışa aktarma satırını `toEqual` ile karşılaştırıyor (`set-icerigi-0121-kiyas.test.js:52`, `hammadde-0096-kiyas.test.js:27`, `maliyet-gecmisi-0097-kiyas.test.js:33`) → **altınlar yenilenmez**, üç test satırı `s.slice(0, 10)` ile dilimler (aynı dosyada var olan deyim, `parca-aktarma-0087.test.js:19` `slice(0, 9)`). 0130'un karşılaştırması iki canlı hesabı karşılaştırdığı için kırılmaz (`set-parcalama-0130.test.js:201`, ölçüldü). 0121 AC-50 setin **maliyet** hücresinin alınmadığını iddia ediyor ve bu kural aynen korunur (R9). |

---

## Intent

Spec 0121 setin içeriğini kurdu ama içerik yalnız parça kartından, tek tek tıklanarak girilebiliyor. Katalogda set olması beklenen 15 parça var ve her birinin içinde birkaç bileşen olacak; bu bugün yüzlerce tıklama demek. Parça kataloğu zaten Excel ile dışa ve içe aktarılıyor, yani veri girişinin doğal yeri orada. Üstelik dışa aktarılan dosya bugün hangi satırın set olduğunu da söylemiyor: setin hücresinde yalnız çözülmüş maliyet var. Bu iş bittiğinde set içerikleri Excel'de yazılıp bir kerede içe aktarılabilir, dışa aktarılan dosya da setleri okunur biçimde gösterir.

---

## Requirements

### A. Sütun ve biçim

- **R1.** Parça şablonuna **on birinci ve son** sütun eklenir: "Set İçeriği". İçe aktarma başlığı okumadığı ve hücreleri konuma göre eşlediği için sütun yalnız sona eklenir; araya eklenirse eski şablonla alınmış dosyalar kayar.
- **R2.** Biçim **elle yazılabilir** olmalıdır (bu sütun yalnız dışa aktarma değil, girişin kendisidir): `PARÇA ADI x ADET; PARÇA ADI x ADET`. Ayraç noktalı virgüldür (uygulamanın kendi çoklu değer geleneği: yedek parça satışının tahsis hücresi `"; "` ile ayırıyor).
- **R2/2.** Çözücü toleranslıdır: adet ayracı olarak `x`, `X`, `*` ve `×` kabul edilir; ayracın çevresindeki boşluklar serbest; adet yazılmamışsa **1** sayılır; satır sonundaki boş parçalar atlanır. `×` yalnız **tolerans**tır (kopyala yapıştırdan gelebilir, klavyeyle yazılamaz; Context 8'in `→` için verdiği gerekçenin aynısı); **dışa aktarmanın yazdığı biçim her zaman `x`'tir** (Karar 16), yoksa C2'nin tersliği için tek bir yazım biçimi kalmazdı.
- **R3.** Dışa aktarma aynı biçimi yazar: içeriği olan parçanın hücresi bileşenleri **içerikteki sırayla** listeler, içeriği olmayan parçanın hücresi boştur. Bileşen adı **okuma anında** katalogdan çözülür (ad kopyalanmaz, 0121 C kuralı). **Ad yalnız canlı katalogdan çözülür ve yeni prop zinciri açılmaz (Karar 5):** `SettingsExport`'un ham parça dizisi yok (`:164`, ölçüm 16) ve dışa aktarma `parts` ile `setKatalogu(parts)` üzerinden dönüyor. Çözülemeyen bileşen (çöpte ya da kaydı yok) için **ada benzemeyen nötr bir yer tutucu** yazılır; iki ayrı ibare (çöpte, bulunamadı) yerine tek hâl vardır. Emsal 0121 Karar 47: ham dizi almayan yer canlıdan çözer ve bulunamayanı nötr adlandırır (`LISTEDE_OLMAYAN_PARCA`).
- **R3/2.** Şablon örneği satırı (`PARCA_SABLON_ORNEGI`) on birinci hücreyi örnekle doldurur ki kullanıcı biçimi dosyada görsün. **Sonucu yazılıdır (Karar 15):** şablon olduğu gibi içe aktarılırsa o satır için "bulunamadı" bildirilir ve içeriği alınmaz; bu bugünkü davranışın aynısıdır (örnek satır bugün de "Örnek Parça" diye gerçek bir parça yaratıyor), örnek satır bir şablon artefaktıdır. Biçim ayrıca içe aktarma ekranında da yazılı olur (R10/2), yani kullanıcı örnek satırı silse de biçimi görür.
- **R3/3.** Ad çözümü için dizi verilmezse on birinci hücre **boş** kalır (Karar 14): `parcaDisaAktarmaSatiri` dört testte tek argümanla çağrılıyor (`maliyet-gecmisi-0097.test.js:44`, `hammadde-0096.test.js:142` ve üç kıyas testi) ve `maliyetHucresi` bu hâlde zaten boş dönüyor (0121 C2'nin katalog kuralı). Aynı kural on birinci hücre için de geçerlidir.
- **R4.** Hücre CSV'de de güvenlidir: CSV yazıcısı bütün hücreleri çift tırnaklıyor ve içindeki tırnağı ikiliyor, yani noktalı virgül hücre içinde kalır (ölçüldü). Biçimde tırnak kullanılmaz.

### B. İçe aktarma kuralları

- **R5.** Bileşen **adıyla** eşlenir, kimlikle değil: Excel'de kimlik yok. Eşleme bugünkü kuralla aynı, Türkçe küçültmeli ve yalnız canlı parçalarda (`trLower`). Aynı dosyada tanımlanan yeni parçalar da aday olur: dosya hem bileşeni hem seti aynı anda yazabilir.
- **R5/2.** **Ad → kimlik adımı yazılıdır (Karar 3).** `setIcerigi` satırı **kimlik** tutar (`setIcerigiDogrula` kimliği sayıya çeviriyor), Excel'de kimlik yoktur, `byAd` yalnız canlı parçaları indeksler ve döngü sırasında **güncellenmez**, aynı dosyada doğan yeni parçaların kimliği ise birinci geçişte `++idc` ile verilir (ölçüm 15). Bu yüzden: **birinci geçiş** bütün satırların kimliğini atar ve `ad → id` haritasını kurar (var olan parçalar `byAd`'dan, yeni parçalar yeni kimlikten), **ikinci geçiş** içerik metnini kimliğe çevirip 0121'in doğrulamasına verir. Haritasız bir sıra kurulamaz: aynı dosyada doğan bileşenin kimliği ancak bütün satırlar okunduktan sonra bilinir (AC‑7'nin gereği).
- **R5/3.** **Dosyada yinelenen ad bir satır hatasıdır (Karar 4).** İkinci ve sonraki satır atlanır ve bildirilir: `Satır <n>: Bu ad dosyada daha önce geçti, satır atlandı.` (boş ad emsalinin aynısı). Bugün bu hâl sessizce bozuyor: katalogda olmayan bir ad iki satıra yazılırsa iki ayrı kimlik doğuyor (parça kartının reddettiği hâl), katalogda olan bir ad iki satıra yazılırsa ikisi de aynı kimliği alıyor ve uygulama kolu sessizce **son satırı** kazandırıyor (ölçüm 15). 0124 ad → kimlik zincirini kurduğu için belirsizliği de bu spec kapatır; aksi hâlde set, kimliği belli olmayan bir bileşene bağlanır ve 0130'un parçalaması onu stoğa yazar.
- **R6.** **Doğrulama dosya sonrası kataloğa göre yapılır.** İç içe set yasağı iki yönlüdür ve bir satırın geçerliliği aynı dosyadaki başka satıra bağlı olabilir (A'nın bileşeni B, aynı dosyada B'ye içerik verilmişse A artık set içeriyor demektir). Bu yüzden çözümleme iki geçişlidir: önce bütün satırların içerikleri okunur, sonra sonuç kataloğu üzerinde 0121'in kuralları uygulanır. Satır satır doğrulamak sessizce yanlış kabul üretirdi.
- **R6/2.** Reddedilen durumlar ve nedenleri satır numarasıyla bildirilir: adı katalogda ve dosyada bulunamayan bileşen, parçanın kendisi, içeriği olan bileşen (iç içe set), başka bir setin içinde geçen parçaya içerik verilmesi (ters yön), aynı bileşenin iki kez yazılması ve **geçersiz adet**. Adet için **tek metin** vardır (Karar 8): `kitAdediDogrula` sıfırı, negatifi, ondalığı ve sayı olmayanı aynı mesajla reddediyor (`KIT_ADET_HATASI`, ölçüm 18); dört ayrı neden beklenmez ve `urunAgaci`'ya yeni metin eklenmez (C1).
- **R6/3.** **Dosya satırı başına tek bildirim (Karar 7).** Doğrulama hataları içerik satırının indeksine göre dönüyor, Excel biçimi ise dosya satırı başına (ölçüm 17). Biçim: `Satır <n>: Set içeriği alınmadı: <neden> (<bileşen adı>).`; birden çok hatalı bileşen varsa sonuna "ve n bileşen daha" eklenir. R7 zaten hep ya hiç olduğu için ilk neden kararı veriyor; mevcut maliyet yolu da satır başına en çok bir neden yazıyor ve önizlemenin hata kutusu kaydırmalı (`maxHeight: 100`).
- **R7.** **Hata satırı atlatmaz, yalnız içeriği alınmaz** (maliyet sütununun bugünkü kuralı): parçanın öteki hücreleri yazılır, içerik alanı hiç yazılmaz, neden bildirilir. Böylece tek yazım hatası 380 satırlık bir aktarmayı geri çevirmez.
- **R8.** **Boş hücre içeriği silmez, korur** (maliyet ve bütün öteki sütunların kuralı; `parcaIceAktarmaUygula` var olan kaydı `{ ...x, ...guncel }` ile birleştiriyor). İçeriği boşaltmanın tek yolu parça kartıdır ve spec'te yazılıdır.
- **R9.** Setin **maliyet** hücresi bugünkü gibi alınmaz (0121 AC-50): maliyet içerikten gelir. Bir satır aynı aktarmada hem içerik hem farklı bir maliyet yazıyorsa içerik alınır, maliyet alınmaz ve nedeni bildirilir. **Sıra önemlidir:** set olup olmadığı dosyadan gelen içerikle belirlenir, yalnız kayıtlı hâliyle değil.
- **R9/2.** İçerik alınan parçanın maliyet geçmişi yazılmaz: 0121 R'si gereği içeriği olan parça geçmiş tutmaz ve `maliyetGecmisiYaz`'ın `set` kapısı dosyadan gelen yeni hâle göre geçirilir (kayıtlı hâle göre değil, yoksa yeni set geçmiş satırı yazardı).
- **R9/3.** **"Set mi" ölçütü iki dalda da kullanılır (Karar 9).** Bugün kırılım dalının kapısı `!setMi(mevcut)`'tir (ölçüm 19), yani hammadde kırılımı tutarlı bir parçaya dosyadan içerik verilirse kırılım dalı tetiklenir ve yanlış neden (`HAMMADDE_EXCEL_HATASI`) bildirilir. Ölçüt `setMi(mevcut) || dosyadan içerik geldi` olur ve **hem kırılım dalının kapısında hem set dalında** kullanılır, böylece neden `SET_EXCEL_HATASI` olur. Bu, 0121'in triyajda aldığı "set kontrolü kırılımdan önce gelir" kararının korunmasıdır.
- **R10.** İçe aktarma özeti bugünkü biçimini korur ve yeni bir sayı ekler: **içeriği yazılan parça sayısı**. Sayı **iki yüzeyde de aynı rakamdır (Karar 10):** önizleme penceresinin özet cümlesi (kararın verildiği ekran) ve kaydetme bildirimi (ölçüm 20). Tanımı dardır: hata yüzünden içeriği alınmayan satır **sayılmaz**, boş hücreli satır da sayılmaz.
- **R10/2.** **İçe aktarma ekranının sütun kutusu başlık dizisinden türetilir ve biçim satırı taşır (Karar 11).** Bugünkü kutu sütunları elle sayıyor ve "Fiyat (EUR)"de bitiyor, yani 0087'nin eklediği maliyet sütununu hiç anmıyor (ölçüm 20). Kutu `PARCA_AKTARMA_BASLIKLARI`'ndan üretilir (elle sayım biter, bir daha geride kalmaz) ve altına biçim satırı eklenir: "Set İçeriği: `Bileşen Adı x Adet; Bileşen Adı x Adet`". Biçim metni `urunAgaci`'da sabittir (C3) ve `PARCA_SABLON_ORNEGI`'nin hücresiyle aynı kalıbı kullanır. R2 biçimin elle yazılabilir olmasını şart koştuğu için biçimin ekranda yazılı olması zorunludur.

### C. Değişmeyenler

- **R11.** Sütun sayısı ve sırası dışında şablon değişmez; eski on sütunlu dosya aynen çalışır ve içeriklere dokunmaz (R8).
- **R12.** Parça kartının içerik bölümü, doğrulaması ve kayıt yolu dokunulmaz; Excel yolu aynı kurallara uyar, kendi kurallarını yazmaz.
- **R13.** Yeni izin, yeni veri bölümü ve yeni sunucu kuralı yoktur.

---

## Constraints

### Uyulması zorunlu

- **C1.** Kurallar tek yerde: iç içe set, kendine referans, yinelenen bileşen ve adet kuralları `urunAgaci`'nın bugünkü doğrulamasından gelir; `parcaAktarma.js` ikinci bir kural yazmaz (kaynak taraması). **Tek muafiyet (Karar 3):** ada göre eşleme ile "bulunamadı" hatası Excel yolunun kendi kuralıdır, çünkü kataloğun doğrulaması kimlikle çalışır ve adı bilmez; o hatanın metni de `urunAgaci`'da yeni bir sabit olur (C3). Muafiyet tarama testinde adıyla yazılıdır.
- **C2.** Biçim çözücü ve yazıcı **aynı** modülde ve birbirinin tersidir: dışa aktarılan dosya geri yüklendiğinde içerik birebir aynı kalır ve hiçbir bildirim üretmez (0096 triyaj dersi: aynı dosyanın geri yüklenmesi uyarı üretmemeli). **Değişmez yalnız bütün bileşenleri canlı olan setler için geçerlidir (Karar 6):** ad eşlemesi canlı parçalarda yapıldığı için çözülemeyen bileşeni olan setin hücresi geri yüklendiğinde "bulunamadı" verir ve R7 gereği içeriğin tamamı yazılmaz; içerik korunur (R8), veri kaybı yoktur. Bu hâl spec 0123'ten beri yalnız **çöpteki** bileşende kalır (kalıcı silme engelli) ve geçicidir; bilinen sınır olarak yazılıdır.
- **C3.** Konuma göre eşleme korunur: yeni sütun yalnız sona eklenir.
- **C4.** İçeriksiz parçalarda dışa aktarma satırının **ilk on hücresi** birebir eski kalır ve on birinci boştur; kıyas altınları yenilenmez, üç kıyas testi satırı `s.slice(0, 10)` ile dilimleyerek karşılaştırır (ölçüm 13, Karar 1). "Satır birebir eski kalır" yazılamaz, çünkü on bir elemanlı dizi on elemanlı altına eşit değildir.
- **C5.** Modül saat okumaz; `bugun` bugünkü gibi parametredir.
- **C6.** **Sayım O(satır + katalog) kalır (Karar 2).** İki geçişte haritalar **bir kez** kurulur ve geçirilir: ters yön denetimi için 0123'ün `setteGecenParcalar(sonuç kataloğu)` haritası, iç içe denetimi için tek bir kimlik haritası. Bugünkü doğrulama her çağrıda yeni bir kimlik haritası kuruyor ve ters yön için bütün kataloğu geziyor (ölçüm 14), yani satır başına çağrı O(satır × katalog) olurdu; içe aktarma sınırı **50.000 satır** olduğu için bu donma demektir. Hangi yol seçilirse (doğrulamaya 0096 ve 0123'ün `harita` deseniyle isteğe bağlı parametre eklemek ya da içe aktarma yolunun haritaları kurup geçirmesi) spec'e yazılır; ölçülebilir sınır AC‑15'tedir.
- **C7.** **Hücre içi `;` iki tarafa bağlıdır (Karar 17).** Ayraç CSV'nin alan ayracıyla aynı karakterdir; biçim hem `buildCSV`'nin **koşulsuz tırnaklamasına** hem `parseCSV`'nin **tırnak farkındalığına** dayanır (ikisi de ölçüldü, ölçüm 21). İkisinden biri sadeleştirilirse bu sütun bozulur; bu bağımlılık kısıt olarak yazılıdır ve testle sabitlenir.

### KAPSAM DIŞI

- **X1.** Bileşenin koduyla eşlenmesi — *neden:* 380 canlı parçanın yalnız birinde kod var, adlar ise tekrarsız (ölçüldü); kod ikinci bir belirsizlik kaynağı olurdu.
- **X2.** Excel'den içerik boşaltma — *neden:* R8; boş hücre bütün sütunlarda "dokunma" demek ve bu kuralın sütun başına değişmesi sessiz veri kaybı üretir.
- **X3.** Model kitinin (makina kiti adetlerinin) Excel'e eklenmesi — *neden:* ayrı bir kavram ve ayrı bir ekran (model kartı); aynı dosyaya sıkıştırmak iki kavramı karıştırır.
- **X4.** Hammadde kırılımının Excel'e eklenmesi — *neden:* 0096 bilinçli olarak dışarıda bıraktı (tedarikçi kimliği ve gizlilik kapısı var); bu spec onu açmaz.
- **X5.** İçe aktarmanın ön izlemesi (hangi setin hangi bileşeni alacağının kaydetmeden gösterilmesi) — *neden:* bugünkü içe aktarma ekranı özet ve hata listesi gösteriyor; ön izleme bütün sütunlar için ayrı bir iştir.
- **X6.** Setin stoğunun ya da fiyatının Excel'den yazılması — *neden:* stok sayım işidir (stok hareketi yazılır), fiyat bugünkü sütunlardan zaten geliyor.

---

## Context

Ölçümler 01.11.2026 yedeğiyle ve bugünkü kaynakla yapıldı.

1. **Bugünkü şablon on sütun** (`parcaAktarma.js:9`): ad, ad EN, kod, tip, tanım TR, tanım EN, fiyat TL, fiyat USD, fiyat EUR, maliyet. İçe aktarma başlığı okumuyor, hücreleri konuma göre eşliyor (`:37`).
2. **Eşleme ada göre:** `byAd` yalnız canlı parçaları `trLower(p.ad)` anahtarıyla tutuyor (`:35`), yeni parçaya kimlik `++idc` ile veriliyor (`:41`). Ölçtüm: 380 canlı parça adının **hiçbiri tekrar etmiyor**, yani adla eşleme güvenli.
3. **Dışa aktarma setin maliyetini zaten çözüyor** (`:21`, `:22`): hücre `parcaMaliyetKurus(p, undefined, katalog)` sonucudur. İçeriğin kendisi Excel'e hiç girmiyor (0121 X10).
4. **İçe aktarmada setin maliyet hücresi alınmıyor** (`:60`, `:61`) ve farklı rakam yazılmışsa `SET_EXCEL_HATASI` satır numarasıyla bildiriliyor. Ölçüt kayıtlı parçanın set olması (`setMi(mevcut)`); dosyadan set olan satır bu kapıya girmiyor, bu yüzden R9'un sırası gerekli.
5. **Hata deseni kurulu:** her satır hatası `Satır <n>: <neden>` biçiminde `errors` dizisine giriyor ve satır atlanmıyor (`:51`, `:57`, `:61`, `:68`); yalnız parça adı boşsa satır atlanıyor (`:39`).
6. **Uygulama kolu var olan kaydı koruyor:** `parcaIceAktarmaUygula` `{ ...x, ...guncel }` ile birleştiriyor (`:91`), yani yazılmayan alan düşmüyor. R8 bu davranışın sonucudur.
7. **CSV iki tarafta da güvenli:** `buildCSV` bütün hücreleri çift tırnaklıyor ve tırnağı ikiliyor (**`src/components/settings/csvUtils.js:14`**; ilk taslak yolu `csvUtils.js` diye yazmıştı, dosya `src/lib` altında değil), ayrıca formül enjeksiyonuna karşı `csvSafeCell` var. QA turunda **okuyucu da ölçüldü** (ölçüm 21): `parseCSV` tırnak farkında bir durum makinesi ve `""` kaçışını çözüyor, ayracı ilk satırdan sayarak seçiyor. Hücre içindeki noktalı virgül dosyayı bozmaz.
8. **Çoklu değer geleneği var:** yedek parça satışının tahsis hücresi `"; "` ile ayrılıyor (`SettingsExport.jsx:42`). Orada adet ile hedef arasında `→` kullanılıyor; bu sütunda kullanılmaz, çünkü klavyeyle yazılamaz ve bu sütun elle yazılacak.
9. **Kitle bugün 15 parça:** adında SET, TAKIM ya da FULL geçen 15 canlı parça var ve hiçbirinin içeriği girilmemiş; katalogda çöpte parça yok. Yani ilk içe aktarma 15 satırlık bir dosyayla yapılabilir.
10. **Sıkı doğrulamanın gerekçesi 0130 ile büyüdü:** içerik artık yalnız maliyeti belirlemiyor; Set Hazırla bileşenleri o içerikle düşüyor, Seti Parçala bileşenleri o içerikle stoğa geri yazıyor ve ikisi de içeriği işlem anında okuyor. Yani Excel'den gelen yanlış bir adet sessiz bir maliyet sapması değil, sessiz bir stok sapmasıdır; R6/2'nin reddettiği durumlar, R7'nin "içerik hiç yazılmaz" kuralı ve C1'in tek kural kaynağı bu ölçümle daha da zorunludur.

### QA turu ölçümleri (2026-11-02)

İlk taslaktan sonra kod zemini iki kez değişti: **spec 0130 (setin parçalanması) ve spec 0123 (sette geçen parçanın korunması) uygulandı.** Aşağıdakiler yeni zeminle ölçüldü.

11. **Zemin:** 0130 `ea02a3b7` ile, 0123 `4c5ea0c3` ile uygulandı ve v3.54.0 yayınlandı; ikisi de `parcaAktarma.js`'e **dokunmadı**, yani spec'in andığı bütün satırlar (`:9`, `:12`, `:21`, `:22`, `:35`, `:37`, `:39`, `:41`, `:51`, `:57`, `:60`, `:61`, `:91`) yeni kodla yeniden okundu ve tutuyor. 0123 `urunAgaci.js`'e `setteGecenParcalar`, `parcaKullanimi`, `setteGecenParcaMi` ve `setKullanimAdlari`'nı ekledi.
12. **İki uzunluk iddiası 10'a sabitli:** `parca-aktarma-0087.test.js:15` `expect(PARCA_AKTARMA_BASLIKLARI).toHaveLength(10)`, `:17` `expect(PARCA_SABLON_ORNEGI).toHaveLength(10)`; aynı testin adı "maliyet onuncu ve **son** sütun" diyor. `:19` ilk dokuz hücreyi `slice(0, 9)` ile karşılaştırıyor ve `:20` onuncuyu ayrı okuyor, yani o iki satır kırılmıyor.
13. **Üç kıyas altını dışa aktarma satırını `toEqual` ile karşılaştırıyor:** `set-icerigi-0121-kiyas.test.js:52`, `hammadde-0096-kiyas.test.js:27`, `maliyet-gecmisi-0097-kiyas.test.js:33` saklı JSON altınına karşı. 0130'un karşılaştırması (`set-parcalama-0130.test.js:201`) iki **canlı** hesabı karşılaştırdığı için kırılmıyor.
14. **Performans sınırı yok ve doğrulama pahalı:** `MAX_IMPORT_ROWS = 50000` (`SettingsImport.jsx:185`); `setIcerigiDogrula` her çağrıda `new Map(parts)` kuruyor ve ters yön için `parcayiIcerenSetler(kendiId, parts)` bütün kataloğu geziyor. İçerik taşıyan her satır için bir çağrı, yani O(satır × katalog).
15. **`byAd` döngü sırasında güncellenmiyor** (`parcaAktarma.js:33-35`) ve yeni kimlik birinci geçişte `++idc` ile veriliyor (`:41`). Sonuçları: katalogda olmayan bir ad iki satıra yazılırsa iki ayrı kimlik doğuyor; katalogda olan bir ad iki satıra yazılırsa ikisi de aynı kimliği alıyor ve `parcaIceAktarmaUygula`'nın `guncelMap.set(x.id, clean)`'i (`:90`) sessizce son satırı kazandırıyor.
16. **`SettingsExport` ham parça dizisi almıyor:** prop listesinde `rawParts` yok (`:164`); `exportParts` `parts` üzerinden dönüyor ve `katalog = setKatalogu(parts)` de canlı (`:347-348`).
17. **Hata granülerliği ayrışıyor:** `setIcerigiDogrula` hataları içerik satırının **indeksine** göre döndürüyor (`hatalar[i]`), Excel biçimi ise dosya satırı başına (`Satır <n>: ...`); önizlemenin hata kutusu `maxHeight: 100` ile kaydırmalı (`SettingsImport.jsx:414`).
18. **Adet hatası tek metin:** `kitAdediDogrula` sıfırı, negatifi, ondalığı ve sayı olmayanı `KIT_ADET_HATASI = "Adet en az 1 tam sayı olmalı."` ile reddediyor (`urunAgaci.js:254`) ve `setIcerigiDogrula` onu kullanıyor.
19. **Kırılım dalının kapısı `!setMi(mevcut)`:** `parcaAktarma.js:56` `const kirilimli = !!mevcut && !setMi(mevcut) && kirilimTutarliMi(mevcut) && ...`; `:55`'teki 0121 triyaj notu "set kontrolü kırılımdan önce gelir, neden içeriktendir" diyor.
20. **Ekrandaki sütun kutusu elle yazılmış ve bir sütun geride:** `SettingsImport.jsx:401` sütunları adıyla sayıyor ve "Fiyat (EUR)"de bitiyor, maliyet sütununu hiç anmıyor. Sayılar iki yüzeyde: önizleme özeti (`:409-412`) ve kaydetme bildirimi (`:281`).
21. **CSV okuyucusu da güvenli:** `parseCSV` (`SettingsImport.jsx:12-31`) tırnak farkında bir durum makinesi (`inQ`), `""` kaçışını çözüyor ve ayracı ilk satırdaki `;` ile `,` sayısını karşılaştırarak seçiyor (`:14`); on bir başlıkta `;` kazanıyor.
22. **Üç bulgu olmayan doğrulama:** `setIcerigiDogrula`'nın iç içe denetimi canlı haritayla çalışıyor (`:454`), yani çöpteki bileşen zaten "bulunamadı"ya düşüyor ve iki yol tutarlı; XLSX okuması eksik hücreleri `defval: ""` ile dolduruyor, yani on sütunlu eski dosyada `cell(10)` boş geliyor ve R8 kendiliğinden işliyor; `kayit.push` kimliği sayıya çeviriyor (`:466`), Excel'in ürettiği `++idc` kimlikleri de sayı olduğu için biçim tutuyor.

### QA turunda verilen kararlar (2026-11-02)

17 bulgunun hepsi Takım Yöneticisi tarafından onaylandı.

- **Karar 1 (B‑1).** Beş iddia ters çevrilen olarak ilan edilir; üç kıyas testi altını yenilemek yerine satırı `slice(0, 10)` ile dilimler. → başlık, C4, AC‑14
- **Karar 2 (B‑2).** Haritalar iki geçişte bir kez kurulur ve geçirilir; ölçülebilir süre sınırı yazılır. → C6, AC‑15
- **Karar 3 (B‑3).** Ad → kimlik adımı birinci geçişte kurulur; ada göre eşleme ile "bulunamadı" hatası C1'in tek muafiyetidir. → R5/2, C1, AC‑16
- **Karar 4 (B‑4).** Dosyada yinelenen ad bir satır hatasıdır, ikinci satırdan itibaren atlanır. → R5/3, AC‑17
- **Karar 5 (Ö‑1).** Dışa aktarma adı yalnız canlı katalogdan çözer, yeni prop zinciri açılmaz, çözülemeyen bileşen için tek nötr yer tutucu yazılır. → R3, başlık
- **Karar 6 (Ö‑2).** C2'nin değişmezi yalnız bütün bileşenleri canlı olan setler için geçerlidir. → C2, AC‑5
- **Karar 7 (Ö‑3).** Dosya satırı başına tek bildirim; birden çok hatalı bileşende "ve n bileşen daha". → R6/3, AC‑18
- **Karar 8 (Ö‑4).** Adet hatası tek metindir (`KIT_ADET_HATASI`), dört ayrı neden beklenmez. → R6/2, AC‑8
- **Karar 9 (Ö‑5).** "Set mi" ölçütü kırılım dalının kapısında da kullanılır, neden `SET_EXCEL_HATASI` olur. → R9/3, AC‑19
- **Karar 10 (Ö‑6).** İçeriği yazılan parça sayısı önizlemede ve kaydetme bildiriminde aynı rakamdır; hata yüzünden alınmayan satır sayılmaz. → R10, AC‑20
- **Karar 11 (Ö‑7).** Sütun kutusu başlık dizisinden türetilir ve biçim satırı taşır. → R10/2, başlık, AC‑21
- **Karar 12 (K‑1).** `csvUtils.js`'in tam yolu yazılır. → Context 7
- **Karar 13 (K‑2).** Bağımlı spec'ler satırına 0123 eklenir. → başlık
- **Karar 14 (K‑3).** Ad çözümü dizisi verilmezse on birinci hücre boş kalır. → R3/3, AC‑22
- **Karar 15 (K‑4).** Şablonun örnek satırının içe aktarmada "bulunamadı" vereceği yazılır. → R3/2
- **Karar 16 (K‑5).** `×` yalnız toleranstır; dışa aktarma her zaman `x` yazar. → R2/2
- **Karar 17 (K‑6).** Hücre içi `;` hem yazıcının tırnaklamasına hem okuyucunun tırnak farkındalığına bağlıdır. → C7, Context 7, ölçüm 21

### Karar kaydı

| # | Bulgu | Derece | Spec'e işlenen yer |
|---|---|---|---|
| 1 | "Ters çevrilen kriterler: Yok" yanlış, beş iddia kırılıyor | Bloklayıcı | başlık, C4, AC‑14 |
| 2 | 50.000 satır sınırına karşı satır başına katalog taraması | Bloklayıcı | C6, AC‑15 |
| 3 | Ad → kimlik adımı hiçbir yere ait değil, C1 ile çelişiyor | Bloklayıcı | R5/2, C1, AC‑16 |
| 4 | Dosyada yinelenen ad tanımsız ve sessizce bozuyor | Bloklayıcı | R5/3, AC‑17 |
| 5 | Dışa aktarma çöpteki bileşenin adını çözemez | Önemli | R3, başlık |
| 6 | C2'nin değişmezi çözülemeyen bileşende yanlış | Önemli | C2, AC‑5 |
| 7 | Hata granülerliği yazılmamış | Önemli | R6/3, AC‑18 |
| 8 | Adet hatalarının tek metni var, R6/2 dördünü sayıyor | Önemli | R6/2, AC‑8 |
| 9 | Kırılım dalı dosyadan gelen içeriğe göre atlanmıyor | Önemli | R9/3, AC‑19 |
| 10 | R10'un yeni sayısının yeri ve tanımı belirsiz | Önemli | R10, AC‑20 |
| 11 | Ekrandaki sütun listesi elle yazılmış ve bir sütun geride | Önemli | R10/2, AC‑21 |
| 12 | `csvUtils.js`'in yolu eksik | Küçük | Context 7 |
| 13 | Bağımlı spec'ler satırında 0123 yok | Küçük | başlık |
| 14 | Tek argümanlı çağrıda hücrenin kuralı yok | Küçük | R3/3, AC‑22 |
| 15 | Şablon örnek satırının içe aktarma sonucu yazılmamış | Küçük | R3/2 |
| 16 | `×` toleransının gerekçesi yazılmamış | Küçük | R2/2 |
| 17 | `;` seçiminin okuyucuya bağımlılığı kısıt değil | Küçük | C7, ölçüm 21 |

### Plan turunda verilen kararlar (2026-11-02)

Takım Yöneticisi planın bütün önerilerini 2026-11-02'de onayladı (plan `specs/0124-uygulama-plani.md`).

- **Karar 18.** **Ölçü taşıyan adlar biçimi belirsiz yapıyor (yeni ölçüm).** 01.11.2026 yedeğinde 18 canlı parçanın adı ölçüyle bitiyor ("…RULMANLARI 30x55x13", "…35X80X21"); adet yazılmayan hücrede (R2/2) saf bir "son ayraç" kuralı adı "…30x55", adedi "13" okurdu. Çözüm kuralı: hücre parçasının **tamamı** ad olarak aranır, bulunursa adet 1; bulunmazsa **son** ayraçta bölünür, sol taraf ad, sağ taraf adet. Dışa aktarma her zaman `x ADET` yazdığı için dışa aktarılan her hücre geri okunur. Bu yüzden biçim çözücü yalnız metni parçalar (`;` ile), adın çözümü ikinci geçişte ad haritasıyla yapılır. → **R2, R2/2, C2, AC-6**
- **Karar 19.** **Doğrulama yeni ret çıkmayana kadar tekrarlanır.** Bütün içerikleri uygulanmış sayan tek geçiş, reddedilip eski içeriğinde kalan satırı (R8) hesaba katmaz ve iç içe set kabul edebilir (X'in eski içeriği Y'yi içerirken dosya Y'ye içerik verir, X'in hatalı yeni içeriği reddedilir). Reddedilen satırlar eski içeriğine dönmüş olarak katalog yeniden kurulur ve doğrulama yeni ret çıkmayana kadar tekrarlanır; retler yalnız artar, en çok satır sayısı kadar tur. Fazladan reddetmek güvenli taraftır. → **R6, C6**
- **Karar 20.** **İçerik yalnız kayıtlıdan farklıysa yazılır ve sayılır.** Aynı içerik alanı hiç yazmaz ve sayıya girmez (maliyet geçmişinin kuralı); dışa aktarılan dosyanın geri yüklenmesi hiçbir şey bildirmez ve sayı 0'dır. → **R10, AC-5, AC-20**
- **Karar 21.** **Nötr yer tutucu parantezli var olan sabittir:** `(listede olmayan parça)` (`LISTEDE_OLMAYAN_PARCA`, 0121 Karar 47); tek tanım kalır, parantez onu addan ayırır, geri yüklemede "bulunamadı" verir (C2'nin yazılı istisnası). → **R3, AC-4**
- **Karar 22.** **Ters yön denetimi canlı setleri sayar** (0123 haritasının `set` alanı; `parcayiIcerenSetler`'in canlı kuralıyla aynı). Set adları yalnız ret çıkan satırda `parcayiIcerenSetler` ile alınır. → **R6/2, C6**
- **Karar 23.** **Süre sınırı ölçülür:** 1.000 içerikli satırın çözümlemesi ölçülür, test tavanı ölçülen değerin birkaç katıdır; haritanın tek kurulduğunu casus ayrıca sabitler. → **AC-15**
- **Karar 24.** Ters çevrilen iddialar uygulamada yeniden taranır; geri yükleme yapan iki test (`set-icerigi-0121.test.js`, `hammadde-0096.test.js`) Karar 20 ile kırılmaz, kırılırsa karar olarak yazılır. → **Ters çevrilen kriterler**
- **Karar 25.** Ölçüm 9 düzeltilir: adında SET/TAKIM/FULL geçen 15 parçanın üçü "SETUSKUR" (vida) ve set değildir; set adayı on ikidir. Kod kararını değiştirmez. → **Context 9**

### Uygulamada verilen kararlar (2026-11-02)

- **Karar 26.** **Karar 19'un iyimser turu tek başına fazla reddediyordu.** Uygulamada ölçüldü: iki satırdan biri gerçekten geçersizken (Pul, Rulman Seti'nde geçtiği için içerik alamaz) iyimser katalogda Pul set sayıldığı için geçerli olan öteki satır (Kayış) da ters yönden reddediliyordu. Algoritma iki adım oldu: (1) iyimser tur yeni ret çıkmayana kadar (yanlış kabulü önler); (2) reddedilenler dosya sırasıyla tek tek yeniden denenir, kabul edilenlerin hepsiyle birlikte geçerliyse satır kurtulur. Son bir doğrulama geçersiz çıkan kabulü yazmaz. Kayıtlıyla aynı içerik aday sayılmaz (Karar 20'nin uzantısı; kurtarma adımı da sonucu düzelttiği için yalnız hızlandırmadır, mutasyonla ölçüldü). → **R6, Karar 19, AC-8**
- **Karar 27.** **Ters çevrilen iddialar beş değil sekiz.** Spec'in saydığı beşe ek olarak: `parca-aktarma-0087` AC-30 sonucu altınla `toEqual` karşılaştırıyordu, dönüşe `icerikYazilanlar` girdiği için yeni alan ayrı okunur; aynı dosyanın "triyaj bulgu 2" testi aynı adı altı satıra yazıyordu, R5/3 ile satırlar ayrı adlarla yazıldı (iddia maliyet çözümü, aynı); `maliyet-gecmisi-0097-kiyas` içe aktarma sonucunu altınla karşılaştırıyordu, `icerikYazilanlar` 0 iken ayıklanır; `set-silme-0123` taraması `parcaAktarma.js`'in 0123'ün yardımcılarını anmamasını istiyordu, C6 gereği listeden çıktı. Hepsi "spec 0124 ile" notlu. `set-icerigi-0121` ve `hammadde-0096`'nın geri yükleme testleri Karar 20 ile kırılmadı. → **Ters çevrilen kriterler, Karar 24**
- **Karar 31.** **Dokuzuncu ters çevirme (tam takımda çıktı):** `ui/set-icerigi-0121.test.jsx` AC-38 taraması `parcaAktarma.js`'te `set: setMi(mevcut)` metnini arıyordu; R9/2 gereği geçmiş kapısı artık `set: setOlacak` (`setMi(mevcut) || !!yeniIcerik`). Tarama "spec 0124 ile" notuyla yeni metne çevrildi. → **R9/2, Karar 27**
- **Karar 28.** **Dışa aktarma yazıcısı yalnız gerçek bir haritada çalışır.** Testlerde ve kodda `rows.map(parcaDisaAktarmaSatiri)` biçimi ikinci argüman olarak dizi indeksini geçiriyor; içerikli bir parçada `katalog.get` çökerdi. Yazıcı `katalog.get` bir fonksiyon değilse boş hücre yazar (R3/3 ile aynı sonuç). → **R3/3, AC-22**
- **Karar 29.** **Süre ölçüldü (AC-15):** 400 parçalık katalogda 1.000 içerikli satırın çözümlemesi beş koşuda 8, 5, 5, 5, 4 ms; test tavanı 500 ms. Haritaların doğrulama çağrısı başına bir kez ve satır döngüsünün dışında kurulduğu tarama testiyle sabit (ESM içi çağrı casusla yakalanamadığı için). → **C6, AC-15**
- **Karar 30.** Görsel kanıt ölçüldü: İçe Aktar ekranı değişti (sütun kutusu on bir sütun, biçim satırı), Dışa Aktar'ın iki ekranı 0 piksel. Rapor `0124-piksel-raporu.json`, taban son kodla 6 görüntüde 0 fark. → **DoD**

### Triyajda verilen kararlar (2026-11-02)

- **Karar 32.** **Kurtarma adımı artımlı oldu (C6, triyaj bulgu 1).** Karar 26'nın kurtarması reddedilen her satır için bütün kataloğu kurup kabul edilenleri yeniden doğruluyordu: O(ret × (satır + katalog)), ölçümde 2.000 reddedilen satır 371 ms, 50.000 sınırında dakikalar. Artık haritalar bir kez kurulur ve kabul edilen her satırla artımlı güncellenir; reddedilen satır yalnız kendisi doğrulanır. Yeterlidir, çünkü çakışmalar simetriktir (kabul edilmiş bir set bu satırı içeriyorsa satırın ters yön denetimi, bu satır kabul edilmiş bir seti içeriyorsa iç içe denetimi yakalar). Ters yönün set adları da tur başına bir kez kurulan haritadan okunur (`urunAgaci.icerenSetAdlariHaritasi`, doğrulamanın yeni `icerenAdlari` seçeneği), yani ret yolunda da katalog gezilmez. Ölçüm: 250, 500, 1.000, 2.000 ve 10.000 reddedilen satır 4, 3, 5, 10, 49 ms; test tavanı 2.000 satırda 150 ms (karesel sürüm 489 ms ile kırılıyor). → **C6, AC-15**
- **Karar 33.** **"Bulunamadı" bildirimi kullanıcının yazdığı parçayı gösterir** (triyaj bulgu 2): ad bulunamayınca çözücü son ayraçta bölüyor ve bildirim bölünmüş sol tarafı ("RULMAN 30x55") gösteriyordu; artık hücre parçasının kendisi ("RULMAN 30x55x13"). Yedekte 23 canlı parça adı ayraç ve sözcükle bitiyor, yani bu hâl gerçek veride sıktır. → **R6/3, AC-8**
- **Karar 34.** **Setin maliyet uyarısı dosya sonrası bileşen maliyetleriyle karşılaştırır** (triyaj bulgu 3): aynı dosyada bileşenin maliyeti değişince ya da bileşen aynı dosyada doğunca uyarı yanlış çıkıyordu (veri doğruydu, yalnız uyarı yanıltıcıydı). Set olmayan, kırılımsız ve hatasız satırların dosyadaki maliyeti karşılaştırma kataloğuna yazılır. → **R9, AC-10**
- **Karar 35.** **C2'nin bilinen sınırı: adında `;` olan parça** (triyaj bulgu 4). Ayraç hücre içinde de `;` olduğu için böyle bir bileşenin hücresi geri yüklenince "bulunamadı" verir ve içerik korunur (R8, veri kaybı yok). Yedekte adında `;` olan parça 0; parça adında `;`'yi reddetmek ayrı iştir. Testle sabit. → **C2, AC-5**
- **Karar 36.** Taban raporu son kodla yenilendi; `ayarlar-import`'un `degisti` kaydı kapanışta ona çevrilir. → **DoD**

---

## Acceptance Criteria

- **AC-1.** Şablon on bir sütun döner; on birincinin başlığı "Set İçeriği" ve örnek satırda biçim örneği var.
- **AC-2.** İçeriği olan parçanın dışa aktarma hücresi bileşenleri içerik sırasıyla `AD x ADET; AD x ADET` biçiminde yazar.
- **AC-3.** İçeriği olmayan parçanın on birinci hücresi boştur ve satırın **ilk on hücresi** spec öncesiyle birebir aynıdır (üç kıyas testi satırı `slice(0, 10)` ile dilimler, C4).
- **AC-4.** Adı canlı katalogdan çözülemeyen bileşen (çöpte ya da kaydı yok) dışa aktarmada **tek** nötr yer tutucuyla görünür ve o yer tutucu bir ada benzemez (R3).
- **AC-5.** Bütün bileşenleri canlı olan setlerde dışa aktarılan dosya geri yüklendiğinde içerik birebir aynı kalır ve hiçbir hata bildirilmez; çözülemeyen bileşeni olan set bu değişmezin dışındadır, nedeni bildirilir ve içeriği korunur (C2).
- **AC-6.** `AD x 2`, `AD X 2`, `AD * 2`, `AD × 2`, `AD` (adet yok, 1 sayılır) ve fazladan boşluklu yazımlar aynı sonucu verir.
- **AC-7.** Aynı dosyada hem bileşen hem set tanımlanabilir: yeni bileşen ve onu içeren yeni set tek aktarmada doğar.
- **AC-8.** Bulunamayan bileşen adı, parçanın kendisi, içeriği olan bileşen, başka setin bileşeni olan parçaya içerik verilmesi, yinelenen bileşen ve geçersiz adet (tek metin `KIT_ADET_HATASI`) satır numarasıyla reddedilir; satırın öteki hücreleri yazılır, içerik alanı yazılmaz.
- **AC-9.** Boş içerik hücresi var olan içeriği korur; eski on sütunlu dosya içeriklere dokunmaz.
- **AC-10.** Dosyadan set olan satırın maliyet hücresi alınmaz ve nedeni bildirilir; maliyet geçmişi yazılmaz.
- **AC-11.** İçe aktarma özeti içeriği yazılan parça sayısını söyler.
- **AC-12.** Doğrulama kuralları `urunAgaci`'dan gelir; `parcaAktarma.js` kendi iç içe set ya da adet kuralını yazmaz (kaynak taraması). Tek muafiyet ada göre eşleme ile "bulunamadı" hatasıdır ve taramada adıyla yazılıdır (C1).
- **AC-13.** Veri şeması, izin tanımları, sunucu kuralları ve birleştirme değişmez (tarama).

### QA turu kriterleri (2026-11-02)

- **AC-14.** Başlık dizisi ve örnek satır on bir uzunluktadır, on birincinin başlığı "Set İçeriği"; üç kıyas testi dışa aktarma satırının ilk on hücresini karşılaştırır ve altınlar yenilenmemiştir (Karar 1).
- **AC-15.** Haritalar iki geçişte bir kez kurulur ve geçirilir (casusla ölçülür); 1.000 satırlık ve içerik taşıyan bir dosyanın çözümlemesi ölçülen sınırın altında kalır (C6).
- **AC-16.** Ad → kimlik haritası birinci geçişte kurulur: aynı dosyada doğan bir bileşen, setin içeriğine **kimlikle** bağlanır ve iki kayıt tek aktarmada doğar (AC‑7'nin mekanizması).
- **AC-17.** Dosyada yinelenen ad ikinci satırdan itibaren atlanır ve satır numarasıyla bildirilir; aynı adda iki kayıt doğmaz ve sessiz "son satır kazanır" davranışı kalmaz.
- **AC-18.** Bir satırda birden çok hatalı bileşen varsa **tek** bildirim yazılır ve sonuna "ve n bileşen daha" eklenir.
- **AC-19.** Hammadde kırılımı tutarlı bir parçaya dosyadan içerik verilirse bildirilen neden `SET_EXCEL_HATASI`'dır, `HAMMADDE_EXCEL_HATASI` değildir.
- **AC-20.** İçeriği yazılan parça sayısı önizleme penceresinde ve kaydetme bildiriminde aynı rakamdır; hata yüzünden içeriği alınmayan satır ve boş hücreli satır sayılmaz.
- **AC-21.** İçe aktarma ekranının sütun kutusu `PARCA_AKTARMA_BASLIKLARI`'ndan türer (elle sayım yoktur) ve biçim satırını `urunAgaci`'daki sabitten basar.
- **AC-22.** Ad çözümü dizisi verilmeyen `parcaDisaAktarmaSatiri` çağrısında on birinci hücre boştur (0121'in katalog kuralının aynısı).

---

## Definition of Done

- [ ] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [ ] Biçim çözücü ve yazıcı saf modülde yazıldı; ikisinin tersliği testle sabitlendi (C2).
- [ ] İçeriksiz veride dışa aktarma satırının ilk on hücresinin birebir aynı kaldığı kıyas fikstürüyle ölçüldü (C4); üç kıyas testi dilimlendi, altın yenilenmedi.
- [ ] Ters çevrilen beş iddia test yorumlarında "spec 0124 ile" notu taşıyor.
- [ ] Ad → kimlik haritası birinci geçişte kuruluyor; dosyada yinelenen ad atlanıyor ve bildiriliyor.
- [ ] Haritalar bir kez kuruluyor (casusla ölçüldü) ve 1.000 satırlık dosyanın süresi ölçülüp spec'e yazıldı (C6).
- [ ] Dışa aktarma adı canlı katalogdan çözüyor; yeni prop zinciri açılmadı.
- [ ] Satır başına tek içerik bildirimi yazılıyor; adet hatası tek metinden geliyor.
- [ ] Kırılım dalı dosyadan gelen içeriği de hesaba katıyor (neden `SET_EXCEL_HATASI`).
- [ ] İçeriği yazılan parça sayısı iki yüzeyde de aynı rakam.
- [ ] Sütun kutusu başlık dizisinden türüyor ve biçim satırını taşıyor.
- [ ] Hücre içi `;` bağımlılığı (yazıcının tırnaklaması, okuyucunun tırnak farkındalığı) testle sabitlendi (C7).
- [ ] Yeni kalıcı alan yok (alan 0121'de kurulu), yeni veri bölümü yok, yeni eylem izni yok.
- [ ] Kullanıcıya görünen bütün metinler Türkçe; hata satırları satır numarası taşıyor.
- [ ] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [ ] `CLAUDE.md` güncellendi.
- [ ] Takım Yöneticisi onayladı. **Commit ve sürüm yayını yalnız açık talimatla yapılır.**
- [ ] **SCORECARD dolduruldu** ve spec `specs/done/` klasörüne taşındı.

---

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Uygulama commit** | `00e48fe` | Dal `feat/0124-excel-set`, taban `8b29174`; kapanış ayrı commit |
| **Spec revizyon sayısı** | 3 | QA turu (17 bulgu, Karar 1–17), plan turu (Karar 18–25), uygulama (Karar 26–31) |
| **Düzeltme turu sayısı** | 1 | Triyaj (Karar 32–36): kurtarmanın karesel süresi, bildirimdeki ad, maliyet uyarısının bileşen maliyetleri, `;` sınırı, taban raporu |
| **Bulgu gerçek/gürültü oranı** | 4 / 0 | Beşinci bulgu kapanış adımıydı; birinci bulgunun önerisi ve ikinci bulgunun başlığı yapıştırmada kesik geldi |
| **Regresyon sayısı** | 0 | Tam takım 459 dosya, 6332 test (Electron dahil); lint 0 hata, uyarı 62 |
| **Kaçan hata** | 0 | |

**Uygulamada bulunanlar:** ölçüyle biten 18 parça adı "AD x ADET" biçimini belirsiz yapıyordu, önce tamamı ad olarak aranır (Karar 18). Onaylanan "yeni ret çıkmayana kadar" turu yanlış kabulü önlüyor ama birbirine bağlı satırlarda fazla reddediyordu; reddedilenler yeniden denenir (Karar 26), triyajda bu adım artımlı oldu (Karar 32). Spec beş ters çevirme sayıyordu, dokuz çıktı (Karar 27, 31). `rows.map(parcaDisaAktarmaSatiri)` dizi indeksini katalog diye geçirir; yazıcı yalnız gerçek haritada çalışır (Karar 28). Mutasyon ölçümü: uygulamada altı, triyajda üç bozma; değişmeyen içeriğin aday dışı tutulması dışında hepsi test kırdı (o adım yalnız hızlandırmadır).

**Görsel kanıt:** 3 ekran × 2 tema; İçe Aktar değişti, Dışa Aktar'ın iki ekranı 0 piksel. Taban son kodla 6 görüntüde 0 fark; `degisti` kaydı kapanışta `ayni` ve taban raporuna çevrildi.

**Bu spec'ten çıkarılan ders:** bir biçim elle yazılacaksa ayracın gerçek verideki adlarla çakışıp çakışmadığı veriyle ölçülmeli; "x" ayracı katalogdaki ölçü yazımıyla çakışıyordu ve bu ancak yedekte adlar tarandığında görüldü. İkinci ders: karşılıklı bağımlı doğrulamada doğruluğu kuran adım (iyimser tur, kurtarma) ile hızı koruyan yapı (artımlı haritalar) ayrı ayrı ölçülmeli; doğru ama karesel bir kurtarma hatasız dosyada görünmüyor, yalnız hatalı dosyada ortaya çıkıyor.
