# 0125 — Genel aramada parça ve kalıp katalogları, serviste kalıp alanları

| | |
|---|---|
| **Durum** | Tamamlandı (2026-11-02; QA turu Karar 1–17, plan turu Karar 18–25, uygulamada Karar 26–29, triyaj Karar 30; uygulama commit `b69d701`; plan `specs/done/0125-uygulama-plani.md`). Kökeni: 2026-11-02, QA boşluk analizi 2026-11-02, 17 bulgu işlendi |
| **Sahip** | Analist |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | **Kaynak:** `src/components/GlobalSearch.jsx` (iki yeni kategori, servis süzgecinin üç yeni alanı, iki yeni yönlendirme prop'u), `src/App.jsx` (iki `onGo` geri çağırımı ve iki dizi), `src/components/PartManager.jsx` ile `src/components/KalipManager.jsx` (başlangıç süzgeci prop'u), `src/components/Settings.jsx` (prop'un iletilmesi ve panelin `key`'i, `:259` ile `:268`), `src/hooks/useFilteredList.js` (isteğe bağlı `baslangicArama` parametresi; on bir ekran paylaştığı için verilmezse davranış birebir eski, `ikinciFiltre` emsali). **Test:** yeni `tests/ui/arama-katalog-0125.test.jsx`, ek blok `tests/ui/genel-arama-0026.test.jsx`. **Belge:** `CLAUDE.md`, `specs/README.md`. Veri şeması, göç, izin tanımları, sunucu kuralları, birleştirme, yazdırma ve dışa aktarma dokunulmaz. |
| **Bağımlı spec'ler** | 0026 (aramanın kategori tablosunu, kapı kuralını ve yönlendirme desenini kuran spec), 0121 (setin içeriği, rozet), 0115 ve 0117 (servisin kalıp alanları). |
| **Ters çevrilen kriterler** | **Tek iddia ve adıyla yazılı (ölçüm 8):** `genel-arama-0026.test.jsx:259` **AC‑33**'ün ikinci yarısı (`:261`) `KAT_SIRA`'nın son altı anahtarını birebir diziyle sabitliyor → dizi **sekiz** anahtara çıkar; ilk on biri sabitleyen `:260` ve yapısal eşitlikler (`:265-266`) dokunulmaz, testin adındaki "ilk on bir aynı" ifadesi korunur. Başka ters çevrilen kriter yok (ölçüldü: parça ve kalıp kataloğunun aramada olmadığını iddia eden test yok); kaynakta "on altı kategori" diyen başka bir iddia kalıp kalmadığı uygulamada taranır. |

---

## Intent

Ctrl+K paletinde on yedi kayıt türü aranıyor ama parça kataloğu aranmıyor: 380 yedek parça tanımı ve 81 kalıp tanımı adıyla bulunamıyor. Spec 0121'in setleri de bu kataloğun içinde yaşıyor, yani "şu set nerede" sorusunun cevabı yalnız Ayarlar'a gidip listeyi süzmek. Oysa çalışanlar kataloğu aranıyor, yani katalog aramaya girebiliyor. İkinci eksik servis tarafında: spec 0115 servise giren kalıpların adını, 0117 kalıbın kargo firmasını ve takip numarasını kayda yazıyor ama arama bunların hiçbirini görmüyor. Aynı takip numarası kargo satışında aranıyor, tamir sevkinde aranmıyor. Bu iş bittiğinde parça ve kalıp tanımları adıyla bulunur ve bir takip numarası hangi serviste kullanıldıysa oradan çıkar.

---

## Requirements

### A. İki yeni kategori

- **R1.** Aramaya iki kategori eklenir: **Yedek Parça Tanımları** (`parcaTanimlari`) ve **Kalıp Tanımları** (`kalipTanimlari`). İkisi de `KAT` tablosuna ve `KAT_SIRA`'nın **sonuna** girer (0026 R15: yeni türler sona eklenir); iş bitince kategori sayısı on yediden **on dokuza** çıkar. **Anahtar adları veri bölümü adları değildir (Karar 3):** tablonun bütün anahtarları Türkçe çoğuldur (`yedekParcalar`, `kaliplar`, `calisanlar`, `giderTanimlari`) ve `parts` adı `genelAramaSonuclari`'nın `v`'den ayıkladığı **veri dizisiyle** çakışırdı (`:60`, `partMap` ondan kuruluyor); `kalipDefs` de var olan `kaliplar` anahtarının Extra Kalıp olmasından ötürü karışırdı.
- **R1/2.** **`KAT` girdisi altı alan taşır ve hepsi yazılıdır (Karar 4).** `baslik`, `kisa`, `ikon`, `bg`, `fg`, `kapi`. `kisa` kategori çipinde sayıyla birlikte basılıyor (`:252`) ve bugün "Yedek Parça" (kargo satışı) ile "Kalıp" (Extra Kalıp) çipleri var, yani yeni kategorilerin kısa adı onlardan ayırt edilebilir olmak zorundadır: `parcaTanimlari` → `baslik: "Yedek Parça Tanımları"`, `kisa: "Parça Kataloğu"`, ikon 🔩; `kalipTanimlari` → `baslik: "Kalıp Tanımları"`, `kisa: "Kalıp Kataloğu"`, ikon 📐. Renkler tema token'larından ve var olan çiftlerden ayırt edilebilir seçilir (`tasarim-kontrast` karanlık temayı da ölçüyor).
- **R1/3.** **`kalipDefs` dizisi zincire dört noktada girer (Karar 6):** bileşen prop'u (`kalipDefs={liveKalipDefs}`; App bugün onu yalnız Ayarlar'a veriyor), `genelAramaSonuclari`'nın `v` ayıklaması (`:60`), `results` çağrısının nesnesi ve **elle sayılan `useMemo` bağımlılık listesi** (`:114-118`). Yeni `onGo` geri çağırımı da aynı dört noktaya girer. Dosya bu tuzağı yorumla uyarıyor ("kapiCtx her render yeni nesne; içeriğini oluşturan değerler bağımlılıktır"), yani eksik bağımlılık sessiz bayat sonuç üretir.
- **R2.** Aranan alanlar: parça için `ad`, `adEN` ve `kod`; kalıp tanımı için `ad`, `kod`, `urunAdi` ve `urunAdiEN` (Karar 2: `kalipDefs` kaydında `adEN` alanı yok, ürün adı onun karşılığıdır, ölçüm 4). Çöpteki kayıtlar süzülür ve **süzgeç iki katmanlıdır (Karar 17):** App palete canlı dizileri veriyor (`:1505`), ama bugünkü on yedi kategorinin hepsi ayrıca `!x.deletedAt` yazıyor; yeni kategoriler de savunma amaçlı o süzgeci yazar ve yalnız canlı diziye güvenmez (C4).
- **R3.** Satır biçimi: başlık kaydın adı, meta parçada `kod · tip`, **kalıpta `kod · ürün adı`** (Karar 2: kalıp tanımında `olcu` alanı **yok**, ölçüm 4; `olcu` Extra Kalıp satışında ve üretim formu satırlarında var). **Set olan parçanın metasında set ibaresi durur** (bileşen sayısıyla), çünkü aramanın setleri görünür kılması bu işin asıl kazancıdır; ibare `urunAgaci.setRozetMetni(n)` sabitinden gelir ("SET · n bileşen", `urunAgaci.js:366`) ve ikinci kez yazılmaz (Karar 16).
- **R4.** Kapı `izinli("settings")` ve yönlendirme geri çağırımının varlığıdır (çalışanlar kategorisinin birebir deseni). Katalog Ayarlar'da yaşadığı için Ayarlar sekmesi olmayan kullanıcı bu iki kategoriyi görmez; yeni izin açılmaz.
- **R5.** Tıklama Ayarlar'ın ilgili panelini açar (parça → Parça/Yedek Parça, kalıp → Kalıp Modelleri) **ve o panelin kendi arama kutusunu kaydın adıyla doldurur**, böylece kullanıcı listede satırın üstüne düşer. Bu 0026'nın gider kaleminde kurduğu kuraldır: ekran süzgeci sorguyla değil kaydın kendi metniyle doldurulur.
- **R5/2.** **Mekanizma üç halkalıdır ve hepsi yazılıdır (Karar 1).** Bugünkü yol yetmiyor: `settingsTab` tek bir dizge ve bir kez tüketiliyor (`App.jsx:85`, `Settings initialTab` + `onInitialTabConsumed`), yani arama metnini taşıyamaz; iki panel de süzgeci `useFilteredList`'in `useState("")`'ından alıyor (ölçüm 2), yani başlangıç değeri **yalnız mount anında** geçerli ve Settings aynı panel yeniden açılınca onu unmount etmiyor. Halkalar, 0026'nın çalışan zincirinin aynısı:
  1. App'te sayaçlı durum: `katalogAcilis` = `{ panel, ara, no }`, her tıklamada `no` artar (`App.jsx:1522`'nin `setGiderAcilis(o => ({ ...a, no: (o?.no || 0) + 1 }))` deseni) ve sekmeden çıkınca sıfırlanır (`:929`'un efekti).
  2. `Settings` hedef paneli sayaçtan kurulan `key` ile çizer (`App.jsx:1718`'in deseni); paneller `Settings.jsx:259` (`kaliplar`) ve `:268` (`yedekparca`) koşullarındadır.
  3. `useFilteredList` isteğe bağlı `baslangicArama` parametresi alır (varsayılan `""`, verilmezse davranış birebir eski; hook aynı kalıpta bir kez daha genişlemişti, `ikinciFiltre`, spec 0100 plan P2).
  
  Üç halkadan biri eksikse AC‑7 sessizce kırılır: ilk tıklama çalışır, ikincisi çalışmaz. Panelin bugünkü arama kutusu, sayfalaması ve sıralaması değişmez; panelden çıkınca süzgeç unutulur.

### B. Servisin kalıp alanları

- **R6.** Servis araması üç alanı daha kapsar: **servise giren kalıpların adları** (`atolyeKaliplari[].ad`), **kalıp kargo firması** (`kalipKargoFirma`) ve **kalıp takip numarası** (`kalipKargoTakipNo`). Ölçü alanı aranmaz (kalıp adının yanında zaten görünüyor).
- **R6/2.** Kalıp adları liste içindedir; süzgeç listedeki herhangi bir kalıbın adı eşleşince servisi döndürür. Liste okuma yolu **`kalipTamiri.tamirListesi(servis)`**'dir (`kalipTamiri.js:84`), ikinci bir okuma yazılmaz; yanındaki `kalipAtolyedeMi` boolean döndürür ve bu iş için kullanılmaz (Karar 7). Liste girdisi `{ id, ad, olcu }` biçimindedir.
- **R7.** Eşleşme kalıp tarafından geldiyse satırda nedeni yazar (hangi kalıp ya da hangi takip numarası). **Hangi emsal kullanılır, yazılıdır (Karar 8):** dosyada iki emsal var ve yüzeyleri çok farklı. Altı gider/kasa kategorisi `esle` ile `{ kayit, neden }` döndürüyor ve satır yapıcıları o imzayla okuyor; **`musteriler` ise düz kayıt döndürüyor ve nedeni bileşen içindeki `eslesmeNedeni(c)` ile `ekstra` yuvasına yazıyor** (`:131-137`). Servis kategorisi `musteriler` emsalini kullanır: bileşen içinde `servisEslesmeNedeni(s)`, sonucu `ekstra` yuvasına; **sonuç nesnesinin şekli değişmez.** `{kayit, neden}` şekline geçmek sonuç nesnesini, satır yapıcısını, klavye gezinmesinin düz listesini ve 0026'nın küme testini etkilerdi. Normalize edilmiş sorgu (`nq`, `:124`) o fonksiyonun da elindedir.
- **R7/2.** **Neden satırı yalnız üç yeni alan için çizilir (Karar 9).** `eslesmeNedeni` adla eşleşince `null` dönüyor ("ad zaten görünüyor"); servis satırının başlığı `tip · teknisyen`, metası `müşteri · S/N · tarih · durum`, yani bugünkü beş alanın dördü ekranda zaten görünüyor. Müşteri talimatı, fabrika notu ve yapılan işler için neden **yazılmaz**, çünkü R8 mevcut satırın değişmemesini şart koşuyor; onlar için neden eklemek ayrı bir iştir.
- **R8.** Servis kategorisinin kapısı, hedefi (müşteri detayı) ve bugünkü beş alanı değişmez.

### C. Değişmeyenler

- **R9.** Öteki **on yedi** kategori, sıraları, kapıları, satır biçimleri ve klavye gezinmesi dokunulmaz (ölçüm 3: bugünkü sayı on yedi, ilk taslak üç yerde on altı diyordu).
- **R10.** Arama salt okunurdur: hiçbir kayda yazmaz, yeni izin ve yeni sunucu kuralı yoktur.
- **R11.** Sonuç nesnesi her kategori için her zaman anahtar döndürür (0026 R8, R17) ve bileşen onu tek `useMemo` içinde çağırır; iki yeni kategori de bu kurala uyar.
- **R11/2.** **Bugün tetiklenmeyen kriterlerin ölçüm biçimi yazılıdır (Karar 10).** Kalıp alanları canlı veride boş (ölçüm 7), bu yüzden AC‑9, AC‑10 ve AC‑11 **kendi fikstürüyle** çalışır. AC‑11'in değişmezliği spec öncesi koddan üretilmiş bir altınla değil, **kalıp alanları boş** bir veri kümesinde bugünkü beş alanın sonuçlarının aynı kalmasıyla ölçülür (aynı test dosyasında iki çağrının karşılaştırılması).

---

## Constraints

### Uyulması zorunlu

- **C1.** Kategori tanımı tek tablodadır (`KAT` + `KAT_SIRA`); kapı ve başlık ikinci bir yerde yazılmaz.
- **C2.** Yeni kategoriler ağır hesap yapmaz: süzme doğrudan dizi üzerinde, kayıt başına katalog taraması yok.
- **C3.** Panel süzgecini doldurma kuralı 0026 ile aynıdır: kaydın kendi metni, sorgu değil. **Burada teknik bir zorunluluktur (Karar 5):** iki panel de `searchFields: ["ad"]` ile yalnız **adı** arıyor (ölçüm 2), yani global arama `kod` ya da `adEN` ile eşleştiğinde paneli sorguyla doldurmak boş liste gösterirdi. Kriter bu yüzden kodla arama üzerinden ölçülür (AC‑5, AC‑6), yoksa adla arandığında iki uygulama da aynı sonucu verir ve ayrım kaybolur.
- **C4.** Çöpteki kayıt hiçbir kategoride görünmez (bugünkü savunma kuralı; iki katmanlı, R2).
- **C5.** **Çip satırı sarmaz, yatay kayar ve öyle kalır (Karar 15).** `S.chips` `overflowX: "auto"` taşıyor ve `flexWrap` yok (`:310`); iki yeni çip geniş sorgularda satırı uzatır. 0026 R7 tür listesini tam bu yüzden boş ekrandan kaldırmıştı ("paletin içinde sağa doğru uzuyordu") ve sarmak yerine kaymayı seçmişti; bu kabul korunur, `flexWrap` eklenmez.

### KAPSAM DIŞI

- **X1.** Makina modellerinin ve parça tiplerinin aranması — *neden:* model adı müşteri, stok ve belge kategorilerinde zaten geçiyor; parça tipi dört kayıtlık bir listedir ve aramaya girmesi gürültü olur.
- **X2.** Parça kataloğunda tanım (açıklama) metninin aranması — *neden:* teknik açıklamalar uzun ve çoğu boş; ad, İngilizce ad ve kod kimliktir.
- **X3.** Setin **bileşenlerinin** adıyla setin bulunması — *neden:* bir bileşen onlarca sette geçebilir ve sonuç listesi anlamını yitirir; bileşen kendi satırında zaten bulunuyor.
- **X4.** Servis kaydının kalıbı gönderen kişisinin ve kargo tarihinin aranması — *neden:* kişi adları teknisyen alanından zaten aranıyor, tarih araması aramanın hiçbir kategorisinde yok.
- **X5.** Vurgu ve sayfa atlaması (sonucun ekranda işaretlenmesi) — *neden:* 0026 X8 ile bilinçli olarak dışarıda; süzgeç doldurma zaten satırı listenin başına getiriyor.
- **X6.** Üretim formu aramasının değişmesi — *neden:* ölçtüm, satırlardaki kalıp adı, kodu, ölçüsü ve müşteri zaten aranıyor; tamir satırları da bu kümeye giriyor, eksik yok.

---

## Context

Ölçümler 01.11.2026 yedeğiyle ve bugünkü kaynakla yapıldı.

1. **Bugün on yedi kategori var** (`GlobalSearch.jsx:26-27`, tek satır değil) ve parça kataloğu bunların arasında değil. `parts` dizisi palete giriyor ama yalnız kargo satışının parça adını çözmek için kullanılıyor (`:61`, `partMap`). `kalipDefs` palete hiç girmiyor.
2. **Emsal hazır:** `calisanlar` kategorisi Ayarlar'da yaşayan bir kataloğu arıyor; kapısı `izinli("settings") && !!k.onGoCalisanlar` (`:39`), yönlendirmesi `setSettingsTab("calisanlar")` + `setTab("settings")` (`App.jsx:1513`), satırı üç alanlı (`:150`).
3. **İki panelin de kendi arama kutusu var ve ikisi de aynı paylaşılan kancayı kullanıyor:** `PartManager.jsx:355` ile `KalipManager.jsx:38` `useFilteredList`, kutular `:463` ("Yedek parça ara...") ve `:50` ("Kalıp ara..."). İlk taslak PartManager'ı yerel `search` durumuyla sanıyordu, yanlıştı (ölçüm 2); iyi haber, tek bir kanca genişlemesi iki paneli de çözüyor. Panellerin ayar kimlikleri `yedekparca` ve `kaliplar` (`Settings.jsx:54`), çizim koşulları `:268` ve `:259`.
4. **Kitle:** 380 canlı parça, 81 canlı kalıp tanımı. Parçaların 15'i (adında SET, TAKIM ya da FULL geçenler) set olacak; bugün içerik girilmemiş durumda.
5. **Servis araması beş alan artı müşteri adı ve seri no** ile çalışıyor (`:81`): teknisyen, tip, müşteri talimatı, fabrika notu, yapılan işler, durum. Kalıp listesi ve kalıp kargo alanları yok.
6. **Asimetri ölçüldü:** kargo satışı kategorisi `kargoTakipNo` ve `kargoFirma` ile aranıyor (`:77`), yani takip numarasıyla arama kullanıcının bildiği bir davranış; aynı numara kalıp sevkinde aranmıyor.
7. **Bugün bu iki alan boş, iş ileriye dönük:** 885 canlı servisin **1'inde** kalıp listesi var (0115 yeni yayınlandı), kalıp kargo firması ve takip numarası **hiçbirinde** dolu değil. Yani kalıp alanlarının aranması bugün sonuç üretmez; değeri önümüzdeki sevklerdedir. Katalog kategorileri ise ilk günden 461 kaydı aranabilir yapar.

### QA turu ölçümleri (2026-11-02)

İlk taslaktan sonra kod zemini iki kez değişti: **spec 0123 ve spec 0124 uygulandı.** Aşağıdakiler yeni zeminle ölçüldü.

8. **Zemin ve ters çevrilen tek iddia:** 0123 `4c5ea0c3`, 0124 `00e48fec` ile uygulandı; ikisi de `GlobalSearch.jsx`'e dokunmadı. `genel-arama-0026.test.jsx:259` AC‑33 `KAT_SIRA`'nın **iki yarısını da birebir diziyle** sabitliyor: `:260` ilk on bir, `:261` son altı (`["giderler", "tedarikciler", "giderTanimlari", "uretimPartileri", "kasaHesaplari", "cekler"]`); `:265-266` yapısal eşitlikler ve kendiliğinden geçer.
9. **`KAT` girdisi altı alan taşıyor** (`baslik`, `kisa`, `ikon`, `bg`, `fg`, `kapi`) ve `kisa` kategori çipinde sayıyla basılıyor (`:252`); bugün "Yedek Parça" (kargo satışı) ve "Kalıp" (Extra Kalıp) çipleri var. Çip kabı `overflowX: "auto"` ile yatay kayıyor, `flexWrap` yok (`:310`).
10. **Sonuç nesnesinin iki şekli var:** on bir kategori **düz kayıt** döndürüyor, altı gider/kasa kategorisi `esle` ile `{ kayit, neden }`. `musteriler` düz kayıt döndürüp nedeni bileşen içindeki `eslesmeNedeni(c)` ile `ekstra` yuvasına yazıyor (`:131-137`) ve ad eşleşince `null` dönüyor; normalize sorgu `nq` bileşende hazır (`:124`). Servis kategorisi düz kayıt döndürüyor ve neden yuvası kullanmıyor (`:140`).
11. **`kalipDefs` palete hiç girmiyor:** `GlobalSearch` prop'u yok, `genelAramaSonuclari` `v`'den on iki diziyi ayıklıyor (`:60`), `useMemo` bağımlılık listesi elle sayılıyor (`:114-118`) ve dosya bu tuzağı yorumla uyarıyor. App `liveKalipDefs`'i yalnız Ayarlar'a veriyor (`:1742`); palete `parts={liveParts}` gidiyor (`:1505`).
12. **`calisanlar` emsali payload taşımıyor:** kapısı birebir aynı (`izinli("settings") && !!k.onGoCalisanlar`, `:39`) ama yönlendirmesi kimliği **yok sayıyor** (`App.jsx:1515` parametresiz arrow). Payload taşıyan emsaller `onGoGider` ile `onGoKasa`'dır (nesne alır, `:1522`); `giderTanimlari` da kimliği yok sayıyor (`:1523`).
13. **`settingsTab` tek dizge ve bir kez tüketiliyor:** `App.jsx:85` durumu, `Settings initialTab` + `onInitialTabConsumed` (`:1742`). Arama metni için ikinci bir taşıyıcı gerekiyor.
14. **Sayaç ve `key` deseni hazır:** `giderAcilis` (`App.jsx:927`), sekmeden çıkınca sıfırlanması (`:929`), sayacı artıran geri çağırım (`:1522`), sayaçtan kurulan `key` (`:1718`) ve başlangıç prop'ları (`:1719`).
15. **`useFilteredList`'in başlangıç değeri yok:** `useState("")` (`:13`) ve kanca **on bir dosya** tarafından paylaşılıyor; daha önce aynı kalıpta isteğe bağlı bir parametreyle genişlemiş (`ikinciFiltre`, "verilmezse davranış birebir eski", spec 0100 plan P2). İki panel de `searchFields: ["ad"]` ile yalnız adı arıyor (`PartManager.jsx:355`, `KalipManager.jsx:38`).
16. **Kalıp tanımında `olcu` alanı yok:** kaydın alanları `ad`, `kod`, `urunAdi`, `urunAdiEN`, `tanim`, `tanimEN` (`KalipManager.jsx:11`). `olcu` Extra Kalıp satışında (`partSales`) ve üretim formu satırlarında var. Set ibaresinin metni de hazır: `urunAgaci.setRozetMetni(n)` → "SET · n bileşen" (`urunAgaci.js:366`).
17. **Servisin kalıp alanları ve okuyucusu:** liste okuyucusu `kalipTamiri.tamirListesi(servis)` (`:84`), yanındaki `kalipAtolyedeMi` boolean (`:85`); liste girdisi `{ id, ad, olcu }` (`:112`); sevk alanları `kalipKargoFirma` ve `kalipKargoTakipNo`.
18. **İki bulgu olmayan doğrulama:** Extra Kalıp kategorisi kalıbın `olcu`sunu zaten arıyor (`:78`), yani kalıp ölçüsü aramada tümden yok değil; üretim formu araması satırlardaki kalıp adını, kodunu, ölçüsünü ve müşteriyi kapsıyor (`:85`), yani X6'nın ölçümü doğru.

### QA turunda verilen kararlar (2026-11-02)

17 bulgunun hepsi Takım Yöneticisi tarafından onaylandı.

- **Karar 1 (B‑1).** Paneli açıp süzgeci doldurmanın üç halkası (sayaçlı durum, `key`, kancanın isteğe bağlı parametresi) spec'e yazılır. → R5/2, başlık, AC‑14
- **Karar 2 (B‑2).** Kalıp tanımında `olcu` olmadığı için meta `kod · ürün adı` olur ve aranan alanlar `ad`, `kod`, `urunAdi`, `urunAdiEN`'dir. → R2, R3, AC‑2, AC‑15
- **Karar 3 (B‑3).** Kategori anahtarları `parcaTanimlari` ve `kalipTanimlari` olur. → R1
- **Karar 4 (B‑4).** `KAT` girdisinin altı alanı, kısa adları ve ikonları yazılır. → R1/2, AC‑16
- **Karar 5 (Ö‑3).** C3'ün gerekçesi panelin yalnız `ad` araması ölçümüdür; kriter kodla arama üzerinden ölçülür. → C3, AC‑5, AC‑6
- **Karar 6 (Ö‑6).** `kalipDefs`'in dört noktası (prop, ayıklama, çağrı nesnesi, bağımlılık listesi) yazılır. → R1/3, AC‑17
- **Karar 7 (Ö‑7).** Okuyucu `tamirListesi`, alanlar `kalipKargoFirma` ve `kalipKargoTakipNo`. → R6, R6/2
- **Karar 8 (Ö‑1).** Neden satırı `musteriler` emsaliyle kurulur; sonuç nesnesinin şekli değişmez. → R7, AC‑18
- **Karar 9 (Ö‑2).** Neden satırı yalnız üç yeni alan için çizilir. → R7/2, AC‑19
- **Karar 10 (Ö‑8).** Kalıp alanlarının kriterleri kendi fikstürüyle, AC‑11 iki çağrının karşılaştırmasıyla ölçülür. → R11/2
- **Karar 11 (Ö‑4).** Kategori sayısı üç yerde on yedi olur, iş bitince on dokuz. → Intent, Context 1, R9, R1
- **Karar 12 (Ö‑5).** Ters çevrilen tek iddia spec 0026 AC‑33'ün `:261` dizisidir ve adıyla yazılır. → başlık
- **Karar 13 (K‑1).** Context 3 düzeltilir: iki panel de `useFilteredList` kullanıyor. → Context 3
- **Karar 14 (K‑2).** Panellerin çizim satırları (`Settings.jsx:259`, `:268`) yazılır, `key` oraya konur. → R5/2, Context 3
- **Karar 15 (K‑3).** Çip satırı sarmaz, yatay kayar ve bu kabul yazılıdır. → C5
- **Karar 16 (K‑4).** Set ibaresi `setRozetMetni`'nden gelir, ikinci kez yazılmaz. → R3
- **Karar 17 (K‑5).** Çöp süzgeci iki katmanlıdır ve yeni kategoriler de `!deletedAt` yazar. → R2, C4

### Karar kaydı

| # | Bulgu | Derece | Spec'e işlenen yer |
|---|---|---|---|
| 1 | Süzgeci doldurma zinciri üç halkalı, AC‑7 geçemez | Bloklayıcı | R5/2, AC‑14 |
| 2 | Kalıp tanımında `olcu` alanı yok | Bloklayıcı | R2, R3, AC‑15 |
| 3 | Kategori anahtarları veri dizisiyle çakışıyor | Bloklayıcı | R1 |
| 4 | `KAT` altı alan istiyor, `kisa` çipleri karışıyor | Bloklayıcı | R1/2, AC‑16 |
| 5 | Neden satırı için iki emsal var, hangisi yazılmamış | Önemli | R7, AC‑18 |
| 6 | Neden satırının bastırma kuralı yok | Önemli | R7/2, AC‑19 |
| 7 | Panelin yalnız `ad` araması ölçülmemiş | Önemli | C3, AC‑5, AC‑6 |
| 8 | Kategori sayısı üç yerde yanlış | Önemli | Intent, Context 1, R9 |
| 9 | Ters çevrilen iddia adıyla yazılmamış | Önemli | başlık |
| 10 | `kalipDefs` zinciri dört nokta, biri bilinen tuzak | Önemli | R1/3, AC‑17 |
| 11 | Kalıp alanlarının adları ve okuyucusu yazılmamış | Önemli | R6, R6/2 |
| 12 | Tetiklenmeyen kriterlerin fikstürü yazılmamış | Önemli | R11/2 |
| 13 | Context 3'ün iki panel ayrımı yanlış | Küçük | Context 3 |
| 14 | Panellerin çizim satırları yazılmamış | Küçük | R5/2, Context 3 |
| 15 | Çip satırı sarmıyor, kabul yazılmamış | Küçük | C5 |
| 16 | Set ibaresinin sabiti anılmamış | Küçük | R3 |
| 17 | Çöp süzgecinin iki katmanı yazılmamış | Küçük | R2, C4 |

### Plan turunda verilen kararlar (2026-11-02)

Takım Yöneticisi planın bütün önerilerini 2026-11-02'de onayladı (plan `specs/0125-uygulama-plani.md`).

- **Karar 18.** **Servis neden satırının bastırma ölçütü:** `servisEslesmeNedeni(s)` önce bugünkü sekiz alana (teknisyen, tip, müşteri talimatı, fabrika notu, yapılan işler, durum, müşteri adı, seri no) bakar; biri eşleşiyorsa `null` döner. Yalnız hiçbiri eşleşmiyorsa sırasıyla kalıp adı ("kalıp: X"), kalıp kargo firması ("kalıp kargo: X") ve kalıp takip numarası ("kalıp takip no: X"). Bugünkü satırlar birebir aynı kalır (R8), neden yalnız gerçekten yeni alandan gelen eşleşmede görünür. → **R7, R7/2, AC-19**
- **Karar 19.** **Tek yönlendirme geri çağırımı:** iki ayrı `onGo` yerine tek `onGoKatalog({ panel, ara })` ve App'te tek `katalogAcilis` sayacı; iki kategorinin kapısı aynı geri çağırımın varlığına bakar (`calisanlar` deseni). R1/3'ün "yeni `onGo`" ifadesi bu geri çağırımdır. → **R4, R5/2, AC-14**
- **Karar 20.** **Süzgecin sıfırlanma anı:** `katalogAcilis` Ayarlar sekmesinden çıkınca sıfırlanır (gider deseni). Ayarlar içinde başka bir panele geçip aynı panele elle dönülürse panel aynı `key` ile yeniden kurulur ve süzgeç bir kez daha dolu gelir; bu bilinçli kabuldür (panel geçişini App'e taşımak daha büyük bir değişiklik olurdu). → **R5/2**
- **Karar 21.** **Hedef satırın sayfalaması (bilinen sınır):** panel süzgeci adı "içerir" diye aradığı için kısa bir ad (ör. "Rulman") adında onu taşıyan parçalarla birlikte listelenir ve hedef satır ikinci sayfaya düşebilir; sayfa atlaması X5 ile dışarıda. AC-5 gerçek bir katalog adıyla ölçülür. → **AC-5, X5**
- **Karar 22.** **Parça metasında tip:** `p.tip || "Standart"` (boş tip uygulama genelinde Standart sayılır, 0115 ve dışa aktarma). → **R3**
- **Karar 23.** **Çip renkleri:** tema token'larından bugün hiçbir kategorinin kullanmadığı iki çift; karanlık tema kontrastı `tasarim-kontrast`'a yeni çiftler olarak eklenir. → **R1/2, AC-16**
- **Karar 24.** **Ters çevrilen kriterler ikidir** (spec bir tane sayıyordu): 0026 AC-33'ün `:261` dizisi ve `tests/ui/standart-kalkar-0082.test.jsx:108`'in aynı `KAT_SIRA.slice(11)` dizisi. İkisi de sekiz anahtara çıkar, "spec 0125 ile" notlu. Uygulamada başka tarama çıkarsa karar olarak eklenir. → **Ters çevrilen kriterler**
- **Karar 25.** Panellerin çizim satırları `Settings.jsx:264` (`kaliplar`) ve `:273` (`yedekparca`); spec'teki `:259` / `:268` kaymıştı. → **R5/2, Context 3**

### Uygulamada verilen kararlar (2026-11-02)

- **Karar 26.** **Çip renkleri:** parça kataloğu `tealBg` / `teal2`, kalıp kataloğu `purBg2` / `pur700` (bugün hiçbir kategorinin kullanmadığı, karanlıkta zaten ölçülmüş çiftler). `tasarim-kontrast`'ın "sözlük dışı ekran renkleri" bloğu çiftin dosyada yedek renkli (`var(--ad, #açık)`) geçmesini istediği için iki girdi tema tablosunun aydınlık değerlerini yedek olarak taşır; görünüm değişmez. → **AC-16, Karar 23**
- **Karar 27.** **Bayatlık testi sabit referansla ölçülür:** `GlobalSearch`'ün verilmeyen dizi prop'ları her çizimde yeni `[]` varsayılanı alır ve `useMemo`'yu her seferinde yeniden hesaplatır; eksik bağımlılık bu yüzden davranış testinde görünmüyordu (mutasyonla ölçüldü, yalnız tarama yakaladı). Test bütün dizileri sabit referansla verir; eksik bağımlılık şimdi hem davranış hem tarama testini kırar. → **AC-17**
- **Karar 29.** **Ters çevirmeler dörde çıktı** (tam takımda): Karar 24'ün iki `KAT_SIRA` dizisine ek olarak `tests/sayfalama-stok-0102.test.js` AC-15 ve `tests/hammadde-0096.test.js` AC-22 `useFilteredList`'in imza satırını birebir sabitliyordu; yeni isteğe bağlı `baslangicArama = ""` ile güncellendi, "spec 0125 ile" notlu. Dilim satırı ve dönüş şekli iddiaları aynen. → **AC-15, Karar 24**
- **Karar 28.** Görsel kanıt: var olan on sekiz görüntü (altı arama ekranı, Parça/Yedek Parça ve Kalıp Modelleri) 0 piksel; dört yeni ekran (parça araması, kalıp araması ve servis nedeni, iki dolu süzgeç). Taban son kodla 26 görüntüde 0 fark; ilk taban çekiminde `arama-gider` aydınlık görüntüsü bir kez 2,4 milyon piksel oynadı, iki yeniden çekim 0 verdi ve temiz çekim kullanıldı. → **DoD**

### Triyajda verilen karar (2026-11-02)

- **Karar 30.** Triyajın iki test boşluğu kapatıldı, kod değişmedi: (1) süzgecin yalnız **hedef** panele gittiği gerçek App'te sınanır: aramadan parça paneline gidip Ayarlar içinde elle Kalıp Modelleri'ne geçilince kalıp listesi süzgeçsiz açılır, ters yönde de (Karar 20'nin yolu; `baslangicArama`'yı panel koşulu olmadan veren bozma testi kırıyor); (2) App'in palete **canlı** kalıp dizisini verdiği (`kalipDefs={liveKalipDefs}`) AC-17 taramasında sabitlendi, böylece R2'nin iki katmanı da ölçülü. Taban raporu geçerli (yalnız testler değişti); kanıt kayıtları ve README kapanışta. → **R2, R5/2, AC-17**

---

## Acceptance Criteria

- **AC-1.** Parça adının bir parçası yazılınca "Yedek Parça Tanımları" grubunda o parça listelenir; İngilizce ad ve kod da bulur.
- **AC-2.** Kalıp tanımı adı, kodu ve ürün adı (TR ile EN) "Kalıp Tanımları" grubunda bulunur; metası `kod · ürün adı` yazar ve ölçü yazmaz (R3).
- **AC-3.** Set olan parçanın satırında set ibaresi ve bileşen sayısı görünür.
- **AC-4.** Çöpteki parça ve kalıp tanımı hiçbir sorguda görünmez.
- **AC-5.** Parça sonucuna tıklamak Ayarlar › Katalog › Parça/Yedek Parça panelini açar ve panelin arama kutusu o parçanın **adıyla** dolu gelir; **kodla bulunan kayıtta da süzgeç ad ile dolar ve satır listede görünür** (C3).
- **AC-6.** Kalıp sonucuna tıklamak Kalıp Modelleri panelini açar ve arama kutusu o kalıbın **adıyla** dolu gelir; kodla ya da ürün adıyla bulunan kayıtta da süzgeç ad ile dolar ve satır görünür (C3).
- **AC-7.** Aynı kategoriden ikinci bir sonuca tıklamak süzgeci yeni kaydın adıyla yeniler.
- **AC-8.** Ayarlar sekmesi olmayan kullanıcıda iki kategori hiç çizilmez ve sonuç nesnesinde boş döner.
- **AC-9.** Servis araması kalıp adıyla eşleşir ve satırda nedeni (hangi kalıp) yazar.
- **AC-10.** Servis araması kalıp kargo firması ve takip numarasıyla eşleşir ve nedeni yazar.
- **AC-11.** Kalıp listesi boş olan servis bu üç alandan hiç eşleşmez; kalıp alanları boş bir veri kümesinde servisin bugünkü beş alanı aynı sonuçları verir (iki çağrının karşılaştırılmasıyla ölçülür, R11/2).
- **AC-12.** Sonuç nesnesi bütün kategoriler için anahtar döndürür ve kategori kümesi tablodaki sırayla aynıdır (0026 eşitlik testi iki yeni anahtarla geçer).
- **AC-13.** Arama hiçbir kayda yazmaz; veri, izin ve sunucu kuralları değişmez (tarama).

### QA turu kriterleri (2026-11-02)

- **AC-14.** Zincirin üç halkası da yerinde: App'teki sayaç her tıklamada artar, panel sayaçtan kurulan `key` ile çizilir ve kancanın `baslangicArama` parametresi süzgeci doldurur; **aynı panele ikinci kez tıklamak** süzgeci yeniler (AC‑7'nin mekanizması).
- **AC-15.** `useFilteredList` `baslangicArama` verilmeyen on bir çağrıda birebir eski davranır (varsayılan `""`); kancanın öteki parametreleri ve dönüş şekli değişmez.
- **AC-16.** İki yeni `KAT` girdisi altı alanı da taşır; kısa adları var olan "Yedek Parça" ve "Kalıp" çiplerinden ayırt edilir ve karanlık temada okunur (`tasarim-kontrast`).
- **AC-17.** `kalipDefs` dört noktada da zincirde: bileşen prop'u, `v` ayıklaması, `results` çağrısı ve `useMemo` bağımlılık listesi (tarama); dizi değişince sonuç bayat kalmaz.
- **AC-18.** Servisin neden satırı `ekstra` yuvasından gelir; `genelAramaSonuclari`'nın servis anahtarı **düz kayıt** döndürmeye devam eder (şekil değişmez, tarama).
- **AC-19.** Neden satırı yalnız kalıp adı, kalıp kargo firması ve kalıp takip numarası eşleşmelerinde çizilir; teknisyen, tip, durum, müşteri talimatı, fabrika notu ve yapılan işler eşleşmesinde çizilmez.
- **AC-20.** Kategori sayısı on dokuzdur ve `KAT_SIRA` ile `KAT` anahtar kümeleri eşittir; iki yeni anahtar dizinin sonundadır (0026 AC‑33'ün `:261` dizisi sekize çıkar).

---

## Definition of Done

- [ ] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [ ] Kategori tanımı tek tabloda; kapı, başlık ve kısa ad ikinci yerde yazılmadı (tarama).
- [ ] Zincirin üç halkası yerinde ve aynı panele ikinci tıklama süzgeci yeniliyor.
- [ ] `useFilteredList`'in yeni parametresi isteğe bağlı; parametresiz on bir çağrı birebir eski davranıyor.
- [ ] Servisin neden satırı `ekstra` yuvasından geliyor; sonuç nesnesinin şekli değişmedi.
- [ ] Neden satırı yalnız üç yeni alan için çiziliyor.
- [ ] Kalıp metası `kod · ürün adı`; ölçü alanına atıf yok (kalıp tanımında yok).
- [ ] 0026 AC‑33'ün `:261` dizisi sekiz anahtara çıkarıldı ve testin adı korundu.
- [ ] Yeni kalıcı alan yok, yeni veri bölümü yok, yeni eylem izni yok; **salt okunur iş olduğu açıkça yazıldı.**
- [ ] Kullanıcıya görünen bütün metinler Türkçe.
- [ ] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [ ] Görsel kanıt alındı: iki yeni kategorinin sonuç satırları ve yönlendirme sonrası dolu süzgeç.
- [ ] `CLAUDE.md` güncellendi.
- [ ] Takım Yöneticisi onayladı. **Commit ve sürüm yayını yalnız açık talimatla yapılır.**
- [ ] **SCORECARD dolduruldu** ve spec `specs/done/` klasörüne taşındı.

---

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Uygulama commit** | `b69d701` | Dal `feat/0125-arama-katalog`, taban `60f80e3`; kapanış ayrı commit |
| **Spec revizyon sayısı** | 3 | QA turu (17 bulgu, Karar 1–17), plan turu (Karar 18–25), uygulama (Karar 26–29) |
| **Düzeltme turu sayısı** | 1 | Triyaj (Karar 30): süzgecin yalnız hedef panele gittiği ve palete canlı kalıp dizisi verildiği testle sabitlendi; kod değişmedi |
| **Bulgu gerçek/gürültü oranı** | 2 / 0 | Üçüncü bulgu kapanış notuydu |
| **Regresyon sayısı** | 0 | Tam takım 460 dosya, 6358 test (Electron dahil); lint 0 hata, uyarı 62 |
| **Kaçan hata** | 0 | |

**Uygulamada bulunanlar:** spec bir ters çevirme sayıyordu, dört çıktı (iki `KAT_SIRA` dizisi, `useFilteredList` imzasını sabitleyen iki tarama). Panel çizim satırları kaymıştı (Karar 25). `tasarim-kontrast` sözlük dışı çiftin `var(--ad, #açık)` biçiminde geçmesini istediği için iki girdi yedek renk taşır (Karar 26). Bileşenin verilmeyen dizileri her çizimde yeni `[]` aldığı için eksik `useMemo` bağımlılığı davranış testinde görünmüyordu; test bütün dizileri sabit referansla verir (Karar 27). Mutasyon ölçümü: uygulamada beş, triyajda üç bozma; hepsi test kırdı.

**Görsel kanıt:** 13 ekran × 2 tema; var olan on sekiz görüntü 0 piksel, dört yeni ekran. Taban son kodla 26 görüntüde 0 fark (bir ekran bir kez oynadı, yeniden çekildi); `degisti` kayıtları kapanışta `ayni` ve taban raporuna çevrildi.

**Bu spec'ten çıkarılan ders:** paylaşılan bir kancaya isteğe bağlı parametre eklemek davranışı değiştirmese de, imza satırını birebir sabitleyen eski taramaları kırar; ters çevrilecek kriterler sayılırken paylaşılan modüllerin imza taramaları da aranmalı. İkinci ders: önbellek (`useMemo`) bağımlılığını ölçen bir test, bileşenin varsayılan değerleri her çizimde yeni nesne üretiyorsa hiçbir şey ölçmez; girdiler sabit referansla verilmeli.
