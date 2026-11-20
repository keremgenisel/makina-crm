# 0149 — Aramada kelimeler ayrı ayrı aranır

| | |
|---|---|
| **Durum** | Onaylandı (Takım Yöneticisi, 2026-11-20); uygulandı, commit bekliyor |
| **Revizyon** | 2 (2026-11-20 QA turu kararları işlendi) |
| **Sahip** | Analist (yazım) |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | `src/lib/utils.js`'te yeni arama yardımcısı (tek kural), `hooks/useFilteredList.js`, `components/GlobalSearch.jsx`, `lib/aramaGider.js`, `components/ui.jsx`'in iki seçicisi (`SearchPick`, `SearchSelect`) ve istemcideki on dokuz arama kutusu; beş kutu kendi normalleştiricisiyle (`Notes.jsx`, `Finance.jsx` iki arama, `stock/UretimSatirEkleModal.jsx` iki arama, `gider/DonemRaporu.jsx`) |
| **Bağımlı spec'ler** | 0026, 0120, 0122, 0125, 0126, 0133 |
| **QA turu** | 2026-11-20: 22 bulgu (3 Bloklayıcı / 9 Önemli / 10 Küçük), hepsi onaylandı |
| **Düzeltilen iddialar** | 4 (çağrı sayısı, sorgunun nerede normalleştiği, kapsam listesi, R4'ün parantezi) |

---

## Intent

Fabrikada parça adları uzun ve değişken yazılıyor: "AYNA MAHRUTİ DİŞLİSİ", "KONVEYÖR TAHRİK
MİLİ". Kullanıcı aradığını adın tamamıyla değil, aklında kalan iki kelimeyle çağırıyor: "ayna
dişlisi". Bugün arama kutusu yazılanı tek bir metin parçası olarak arıyor, yani "ayna dişlisi"
hiçbir şey bulmuyor, aradaki "mahruti" yüzünden. Kullanıcı aramanın çalışmadığını düşünüp listeyi
gözüyle taramaya dönüyor, 384 parçalık katalogda bu her seferinde dakikalar demek.

Bu iş bittiğinde arama kutusuna yazılan her kelime ayrı ayrı aranacak: "ayna dişlisi" de,
"dişlisi ayna" da "AYNA MAHRUTİ DİŞLİSİ"yi bulacak. Tek kelime yazan kullanıcı için hiçbir şey
değişmeyecek.

---

## Requirements

- **R1.** Arama kutusuna yazılan metin boşluklardan kelimelere ayrılır ve bir kaydın eşleşmesi için
  **her kelimenin** aranan metinlerde geçmesi gerekir. Kelimelerin sırası ve araya giren başka
  kelimeler eşleşmeyi bozmaz.
- **R1/2.** Ayraç yalnız boşluk karakterleridir (`/\s+/`: boşluk, sekme, satır sonu, bölünemez
  boşluk). Noktalama ayraç sayılmaz ve kelimeden silinmez: "20.000" ve "AK-100" tek kelimedir,
  "ayna, dişlisi" sorgusunun ilk kelimesi "ayna," olduğu için eşleşme vermez (bilinen sınır, R7'nin
  sayı kurallarını ve kod aramasını bozmamak için bilinçli).
- **R1/3.** Boş kelime atılır ve kelime listesi boş kalırsa sorgu yok sayılır; kelime sayısına üst
  sınır konulmaz (fazladan yazılan kelime sessizce yok sayılmaz).
- **R2.** Bir kelimenin geçtiği yerin hangi alan olduğu serbesttir: aranan alanların herhangi
  birinde geçmesi yeter. "ayna istanbul" yazıldığında adı "AYNA…" olan ve şehri İstanbul olan kayıt
  bulunur.
- **R2/2.** R2 genel aramada ve gider aramasında da geçerlidir; ekranlardaki `has(a) || has(b)`
  zincirleri kayıt düzeyine çevrilir. "Neden çıktı?" satırının tek kuralı şudur: başlıkta (müşteride
  ad, servis ve gider kaleminde bugünkü başlık alanı) geçmeyen kelimeler bulunur, neden olarak
  bugünkü alan sırasında bu kelimelerden birini taşıyan **ilk** alan yazılır; başlık bütün kelimeleri
  taşıyorsa neden yazılmaz. Kayıt eşleştiyse her kelime bir alanda bulunduğu için bu kural her zaman
  bir cevap üretir.
- **R3.** Tek kelimelik ve kırpılmış aramanın sonucu bugünküyle birebir aynıdır. Tek istisna
  bugünkü kırpma hatasıdır: `ServiceForm`, `PartSaleForm` ve `SettingsSahipsiz` sorguyu kırpmadığı
  için "ayna " (sonda boşluk) bugün hiçbir şey bulmuyor; kırpma zorunlu olduğu için bu üç yerde
  sorgu çalışmaya başlar (düzeltme, üst küme yönünde).
- **R3/2.** Yeni kural eski kuralın **üst kümesidir**: aynı alan kümesinde bugün eşleşen her kayıt
  yeni kuralla da eşleşir, yeni kural hiçbir sonucu daraltamaz. Eski bir testin beklentisi değişecekse
  ölçüt budur: sonucu **artan** test beklenen davranıştır, sonucu **azalan** test hatadır.
- **R4.** Baştaki, sondaki ve aradaki fazla boşluklar tek ayraç sayılır; yalnız boşluktan oluşan
  sorgu boş sorgu gibi davranır: liste ekranlarında ve form seçicilerinde liste tam görünür, genel
  aramada sonuç çizilmez (paletin iki karakter kapısı `null` döndürdüğü için orada görünecek liste
  yoktur).
- **R5.** Türkçe harf katlaması bugünkü gibi kalır: "dislisi" ile "DİŞLİSİ", "AYNA" ile "ayna"
  eşleşir.
- **R5/2.** Kendi normalleştiricisini yazan beş arama kutusu (`Notes.jsx:72`, `Finance.jsx:470-471`
  ve `:528`, `stock/UretimSatirEkleModal.jsx:28` ve `:46-47`, `gider/DonemRaporu.jsx:241`) kelime
  kuralına **girer**, ama normalleştiricisi bu işte **değişmez**: `trLower` kalır, harf
  sadeleştirmesi o beş kutuda yoktur (bilinen sınır, X9). Yardımcı normalleştiriciyi parametre
  aldığı için kural yine tek yerdedir; `DonemRaporu`'nun sadeleştirmemesi spec 0026 R18'in bilinçli
  kararıdır ve bu işte ters çevrilmez.
- **R6.** Kural istemcideki **bütün** arama kutularında aynıdır. Aşağıdaki liste örnek değil, tam
  envanterdir (on dokuz kutu):
  - **`useFilteredList` ile gelenler:** Müşteriler (`Customers.jsx:136`), Bayiler
    (`SimpleDealers.jsx:198`), Makina Stoğu (`MakinaStokTab.jsx:47`), Parça Stoğu
    (`PartStokTab.jsx:71`), parça kataloğu (`PartManager.jsx:404`), kalıp kataloğu
    (`KalipManager.jsx:38`), Modeller (`ModelsManager.jsx:71`), Evrak listesi
    (`Documents.jsx:442`), Çöp Kutusu (`SettingsTrash.jsx:418`), Gönderilen Postalar
    (`SettingsSentMail.jsx:38`, `:41`).
  - **`ui.jsx` ile gelenler:** `SearchPick`'in bütün çağıranları (servis formunun parça araması,
    yedek parça formunun müşteri, bayi ve parça kutuları, Evrak'ın parça ve kalıp seçme penceresi,
    `TahsisModal`, `ModelsManager`'ın parça ekleme kutusu, `PartManager`'ın set bileşen kutusu,
    `PartSaleForm`'un kalıp kutusu) ve `SearchSelect`'in çağıranları (müşteri formunun kalıp
    seçicisi, Parça Stoğu'nun kit seçicisi).
  - **Kendi eşleşmesini `aramaNormalize` ile yazanlar:** menüdeki genel arama (`GlobalSearch.jsx`),
    gider araması (`lib/aramaGider.js`), Yedek Parça Satışı (`YedekParcaSatisTab.jsx:104`), bayi
    detayının üç listesi (`SimpleDealers.jsx:148`, `:172`, `:189`), Analiz'in parça araması
    (`Analiz.jsx:117`), Sahipsiz Kayıtlar (`SettingsSahipsiz.jsx:38`), Evrak'ın fatura, bayi, nihai
    müşteri ve müşteri aramaları (`Documents.jsx:302`, `:405`, `:410`, `:420`), `ServiceForm` ve
    `PartSaleForm`'un müşteri seçicileri.
  - **Kendi normalleştiricisiyle girenler:** R5/2'deki beş kutu.
  - **Kapsam dışı:** Kullanıcı Geçmişi ve İşlem Geçmişi aramaları (X6).
- **R7.** Gider aramasının sayı kuralları değişmez: tutar eşitliği ve tarih eşleşmesi bugünkü gibi
  yalnız sayısal sorguda çalışır ve kelimelere bölünmez.
- **R2/3 (plan kararı P3).** R2/2'deki "başlık" bugün **nedensiz** geçen alan kümesidir: müşteride ad;
  serviste bugünkü sekiz alan (teknisyen, tür, talimat, fabrika notu, yapılan işler, durum, müşteri adı,
  seri no); gider kaleminde başlık ve açıklama; tedarikçi, tanım, parti ve kasa hesabında ad; çekte
  numara ve banka. Böylece tek kelimede bütün neden satırları bugünküyle birebir kalır (R3).
- **R6/2 (plan kararı P1).** Envanterin yirminci kutusu: `tasarim.jsx` `CokluSecim`'in araması
  (sipariş penceresinin tedarikçi seçimi). Kelime kuralına girer, normalleştiricisi değişmez
  (`toLocaleLowerCase("tr-TR")`, R5/2'deki beş kutunun kuralı).
- **R7/3 (plan kararı P4).** Üretim partisinin başlangıç ve bitiş ayı hem tarih hem metin olarak
  aranır: tarih dalı tek alanda ve ham sorguyla kalır, metin dalı kelime kuralına girer.
- **R7/2.** Sayısal sorgunun **metin** dalı da kelimelere bölünür (tek kural, iki dal arasında
  tutarsızlık bırakılmaz); tutar ve tarih dalları ham sorguyla çalışmaya devam eder. Bir kelimesi
  tarih ya da tutar, diğeri metin olan karışık sorgu eşleşme vermez (X7).
- **R8.** Kural tek bir paylaşılan yardımcıda yazılır; ekranlar kendi eşleştirme kurallarını yazmaz.
- **R8/2.** Yardımcı iki parçadır (`aramaGider`'in `aramaSorgusu` artı `metinEslesir` emsali):
  `aramaKelimeleri(sorgu, normalize?)` kelime dizisini **bir kez** üretir ve çağıran onu döngünün
  dışında (render başına ya da `useMemo` ile) çağırır; `kelimelerEslesir(kelimeler, degerler)` kayıt
  başına çalışır. Bugün sorguyu kayıt başına normalleştiren dört yer (`ui.jsx:168`, `ui.jsx:305`,
  `ServiceForm.jsx:90-92`, `PartSaleForm.jsx:57-59`) kelime üretimini döngü dışına alır.
- **R8/3.** `useFilteredList`'in `searchFn` sözleşmesi değişir: ikinci parametre normalleştirilmiş
  dize değil **ayrıştırılmış nesnedir** (ör. `{ kelimeler }`) ve adı `sorgu` olur; dört çağıran
  (`Customers.jsx:136`, `Documents.jsx:442`, `ModelsManager.jsx:71`, `PartStokTab.jsx:71`)
  paylaşılan yardımcıyı çağırır. Nesne seçilmesi bilinçlidir: güncellenmemiş bir `includes(sorgu)`
  çağrısı `"[object Object]"` üretip hiç eşleşmez, yani hata ilk testte görünür. Dizi geçilseydi
  aynı çağrı tek kelimede sessizce çalışır, iki kelimede sessizce hiçbir şey bulmazdı.
- **R9.** Genel aramanın iki karakter kapısı (C4) korunur ve üstüne tek ek kural gelir: sorgunun en
  az bir kelimesi iki karakter olmalıdır, yoksa sonuç çizilmez. "a b" sonuç vermez, "ayna b"
  çalışır. Liste ekranlarına ve form seçicilerine kapı **eklenmez** (orada daralan süzgeç
  zararsızdır).
- **R10.** Süzülmüş liste iki yerde yazmayı ve yazdırmayı besler: parça kataloğunun toplu fiyat kipi
  (`PartManager.jsx:593`) ve Fiyat Listesi çıktısı (`PartManager.jsx:556`) `filtered` kümesini okur.
  Kelime kuralı bu kümeyi genişletir; onay penceresinin "Listedeki n parça" sayısı bugünkü gibi aynı
  kümeden geldiği için ek bir değişiklik gerekmez. Yeni bir çıktı eklenmez.

---

## Constraints

### Uyulması zorunlu

- **C1.** Eşleştirme kuralı tek yerde (`src/lib/utils.js`) ve saftır: React almaz, veri yazmaz.
  Kaynakta ikinci bir "kelimelere böl ve hepsini ara" kopyası bulunmaz.
- **C1/2.** Yardımcı normalleştiriciyi parametre alır, varsayılanı `aramaNormalize`'dır. R5/2'deki
  beş kutu `trLower` geçirir; böylece kural tek yerde kalırken C2 de bozulmaz.
- **C2.** Normalleştirme bugünkü `aramaNormalize`'dır ve değişmez (Türkçe küçültme + harf
  sadeleştirme); yeni bir karakter kuralı eklenmez.
- **C3.** Aranan alan kümeleri değişmez: hangi ekran hangi alanı arıyorsa aynen arar. Bu iş
  eşleşmenin **nasıl** yapıldığını değiştirir, **neyin** arandığını değil.
- **C3/2.** Karışık sorguyu çalıştırmak için gider kaleminin tarihi ve tutarı metin havuzuna
  **katılmaz** (X5 ile aynı gerekçe: alan kümesi genişlemez). Her kelimeyi ayrı ayrı tarih, tutar ve
  metin olarak denemek de yasaktır: tutar eşitliği kelime başına uygulanınca AC-12'nin güvencesi
  ("20.000" 120.000'i bulmaz) kaybolur.
- **C4.** Genel aramanın bugünkü iki karakter alt sınırı ham (kırpılmış) sorguya uygulanmaya devam
  eder; kelime başına uygulanmaz. Ek kural R9'dadır (en az bir kelime iki karakter), çünkü paletin
  grup başına sonuç sınırı yoktur (`GlobalSearch.jsx:79`) ve bütün kelimeleri tek harf olan sorgu
  binlerce satır çizdirebilir.
- **C5.** Yeni kalıcı alan, veri bölümü, izin ve sunucu kuralı yoktur; arama salt okunurdur.
- **C5/2.** Aramanın kendisi salt okunurdur ama süzülmüş liste R10'daki iki yeri besler: toplu fiyat
  kipi bir yazmadır, Fiyat Listesi bir çıktıdır. Kullanıcı arama kutusuyla bu ikisinin kapsamını
  değiştirdiğini bilmelidir.
- **C6.** Kaynak taraması **eski deseni** yasaklar: `src` altında arama çağrı yerlerinde
  `aramaNormalize(...).includes(...)` ve `toLocaleLowerCase(...).includes(...)` kalmaz. Gerekçeli
  istisna listesi tam yollu ve sayılıdır (günlük ekranları istemcide arama yapmaz; `benzerKayitBul`
  ve `PartManager`'ın tedarikçi süzgeci arama değildir). "İkinci kopya yoktur" taraması tek başına
  yetmez: bir ekranın eski tek parça desenini sürdürmesini engellemez, oysa R6 ve R8'in gerçek
  güvencesi budur.

### KAPSAM DIŞI

- **X1.** Yazım hatasına toleranslı (bulanık) arama — *neden:* yanlış kaydı doğru göstermenin
  bedeli, bulamamanın bedelinden yüksek; istenmedi.
- **X2.** Eş anlamlı sözcük sözlüğü ("mil" = "şaft") — *neden:* bakımı kullanıcıya kalır, ayrı iş.
- **X3.** Arama sonuçlarının eşleşme kalitesine göre sıralanması — *neden:* bugünkü sıralamalar
  (katalog sırası, tarih, ad) bilinçli; sıralamayı değiştirmek ayrı karardır.
- **X4.** Eşleşen kelimelerin sonuçta vurgulanması — *neden:* spec 0026 X8 ile zaten kapsam dışı.
- **X5.** Aranan alan kümesinin genişletilmesi (ör. parçanın kodunun her ekranda aranması)
  — *neden:* C3; istenirse ayrı iştir.
- **X6.** Kullanıcı Geçmişi ve İşlem Geçmişi ekranlarının araması — *neden:* eşleşme istemcide
  değil, SQL `LIKE` ile sunucuda (`electron/db.cjs:2082`, `:2100`); kelimelere bölmek sorgu yazmak
  demek olur ve C5'in "sunucu kuralı yok" çerçevesini aşar.
- **X7.** Gider aramasında karışık sorgu (bir kelimesi tarih ya da tutar, diğeri metin; ör. "kira
  15.03.2026") — *neden:* C3/2; tarihi ve tutarı metin havuzuna katmak alan kümesini değiştirir,
  kelime başına sayı denemesi ise tutar eşitliğini bozar. Bilinen sınır olarak yazılıdır.
- **X8.** Tırnaklı tam ifade arama — *neden:* kelime kuralı eski kuralın üst kümesi (R3/2), tam
  ifade isteyen kullanıcıya ayrı bir sözdizimi öğretmenin bedeli kazancından yüksek.
- **X9.** R5/2'deki beş kutunun `aramaNormalize`'a geçirilmesi — *neden:* ayrı karar; o kutularda
  harf sadeleştirmesinin olmaması bilinen sınırdır ve `DonemRaporu` için spec 0026 R18 bilinçlidir.
- **X10.** Sınırlı seçicilerde (`Documents.jsx` ilk 6, `UretimSatirEkleModal` 25 ve 40) kesilme ve
  sonuç sıralaması — *neden:* X3; kelime kuralı VE ile birleştiği için her yeni kelime sonucu
  daraltır, yani kesilme riski tek kelimeli aramadan düşüktür.

---

## Context

**Bugünkü eşleşme tek parçadır.** İki yerde yazılı ve ikisi de aynı deseni kullanıyor:
`src/hooks/useFilteredList.js:23` (`searchFields.some(f => aramaNormalize(item[f]).includes(q))`)
ve `src/components/GlobalSearch.jsx:67` (`has = (val) => aramaNormalize(String(val || "")).includes(query)`).
Sorgu çağıranların çoğunda bir kez normalleştiriliyor (`aramaNormalize(search.trim())`), sonra
`includes` ile tek parça aranıyor. `aramaNormalize` `src/lib/utils.js:156`'da: Türkçe küçültme +
`ç/ğ/ı/ö/ş/ü` sadeleştirmesi.

**Düzeltme (QA turu, ölçüm B): "bir kez" dört yerde doğru değil.** `ui.jsx:168`, `ui.jsx:305`,
`ServiceForm.jsx:90-92` ve `PartSaleForm.jsx:57-59` sorguyu döngünün İÇİNDE, kayıt başına
normalleştiriyor; `ServiceForm`, `PartSaleForm` ve `SettingsSahipsiz.jsx:38` ise sorguyu hiç
kırpmıyor (R3 ve R8/2 bu yüzden yazıldı).

**Kaç yer var.** `aramaNormalize` 15 dosyada geçiyor: biri tanım (`utils.js`), 14'ü çağıran; 47
satırda toplam 58 çağrı (QA turu, ölçüm A; spec'in ilk yazımındaki "61 yerde" sayısı içe alma
satırlarını da sayan grep çıktısıydı). Desen her yerde aynı
(`aramaNormalize(değer).includes(sorgu)`), yani değişiklik mekaniktir: `src/lib/utils.js` (tanım),
`hooks/useFilteredList.js`, `components/GlobalSearch.jsx`, `lib/aramaGider.js`, `components/ui.jsx`
(arama kutulu seçici ve `SearchPick`), `Customers.jsx`, `SimpleDealers.jsx`, `Documents.jsx`,
`ServiceForm.jsx`, `PartSaleForm.jsx`, `ModelsManager.jsx`, `Analiz.jsx`, `stock/PartStokTab.jsx`,
`stock/YedekParcaSatisTab.jsx`, `settings/SettingsSahipsiz.jsx`.

**Düzeltme (QA turu, ölçüm C ve D): yedi arama kutusu bu desende değil.** `Notes.jsx:72`,
`Finance.jsx:470-471` ve `:528`, `stock/UretimSatirEkleModal.jsx:28` ve `:46-47`,
`gider/DonemRaporu.jsx:241` kendi `toLocaleLowerCase("tr")` eşleşmesini yazıyor (harf
sadeleştirmesi de yok); Kullanıcı Geçmişi ile İşlem Geçmişi'nin araması ise istemcide bile değil,
SQL `LIKE` ile (`electron/db.cjs:2082`, `:2100`). İlk beşi R5/2 ile kapsamda, son ikisi X6 ile
dışında. Spec'in ilk yazımındaki "bütün liste aramaları" ifadesi bu yüzden R6'nın tam envanteriyle
değiştirildi.

**Alanlar arası eşleşme neyi değiştirir.** Bugün `useFilteredList` alan alan bakıyor: bir alan
sorgunun tamamını içermeli. R2 ile kural kayda taşınıyor: her kelime, aranan alanların birinde
geçmeli. Bu yüzden `searchFn` ile özel eşleştirme yapan ekranlar (başka listeyle join gerektiren
aramalar, ör. müşteri adından servis bulma) sorgunun kelimelerini alacak biçimde güncellenir. Aynı şey genel aramada da yapılır: `GlobalSearch.jsx`'in
yaklaşık yirmi `has(a) || has(b)` zinciri ve `aramaGider.js`'in alan alan eşleşmeleri kayıt düzeyine
çevrilir. Bunun bedeli, "neden çıktı?" satırlarının tek eşleşen alan varsayımını kaybetmesidir
(`GlobalSearch.jsx:144-155` müşteri, `:157-163` servis, `aramaGider.js`'in bütün `{ neden }`
alanları); kuralı R2/2 yazar.

**Gider aramasının sayı tarafı ayrıdır.** `src/lib/aramaGider.js` sorguyu beş alanlı bir nesne
olarak çözüyor (`aramaSorgusu`, `:14-29`; alanlar ham, metin, sayisal, tarih, tutar): tutar
**eşitlikle** ve tarih biçim
duyarlı eşleşiyor, ikisi de yalnız sayısal sorguda (spec 0026 R16). Kelime kuralı yalnız `metin`
tarafını ilgilendirir (`metinEslesir`, `:31`); sayısal dallar olduğu gibi kalır.

**Bilinen tuzak: "sonuç çıkmamalı" diyen testler.** Kelime kuralı aramayı genişlettiği için,
bugüne kadar "bu sorgu hiçbir şey bulmamalı" diyen testler artık sonuç bulabilir. Her biri tek tek
okunur: gerçekten bulunmaması gereken bir kayıt mı, yoksa kuralın eski darlığını mı sabitliyor.

**Veri, izin ve sunucu.** Bu iş hiçbir kaydı değiştirmez; dört nokta DB kuralı, `MERGE_KEYS`,
`serverAuth` ve çöp kutusu gündeme gelmez.

### QA turunda ölçülenler (2026-11-20)

Hepsi HEAD (`ff1a8612`, v3.61.0) üzerinde ölçüldü.

- **Ölçüm A.** `aramaNormalize`: 15 dosya (biri tanım), 47 satır, 58 çağrı.
- **Ölçüm B.** Sorguyu kayıt başına normalleştiren dört yer: `ui.jsx:168`, `ui.jsx:305`,
  `ServiceForm.jsx:90-92`, `PartSaleForm.jsx:57-59`. Sorguyu kırpmayan üç yer: `ServiceForm`,
  `PartSaleForm`, `SettingsSahipsiz.jsx:38`.
- **Ölçüm C.** `aramaNormalize` kullanmayan beş arama kutusu: `Notes.jsx:72`, `Finance.jsx:470-471`,
  `Finance.jsx:528`, `UretimSatirEkleModal.jsx:28`, `UretimSatirEkleModal.jsx:46-47`,
  `DonemRaporu.jsx:241` (yedi arama, beş dosya); hiçbiri harf sadeleştirmesi yapmıyor.
- **Ölçüm D.** Kullanıcı Geçmişi ve İşlem Geçmişi araması sunucuda SQL `LIKE` ile
  (`electron/db.cjs:2082`, `:2100`), istemcide eşleşme kodu yok.
- **Ölçüm E.** "Neden çıktı?" satırları tek eşleşen alana dayanıyor: `GlobalSearch.jsx:144-155`
  (müşteri: yetkili, telefon, yetkili tel, seri no, model, eski sahip sırası), `:157-163` (servis:
  kalıp, kalıp kargo, kalıp takip no) ve `aramaGider.js`'in bütün eşleşmeleri (tür, tedarikçi,
  yetkili, telefon, vergi no, keşideci, alacaklı, açıklama, dönem). Kayıt düzeyine çevrilecek
  `has(a) || has(b)` zinciri yaklaşık yirmi ifade.
- **Ölçüm F.** Genel aramada grup başına sonuç sınırı yok (`GlobalSearch.jsx:79`, "Tüm gruplar
  LİMİTSİZ"); iki karakter kapısı `:66`'da ve kırpılmış normalleştirilmiş sorguya uygulanıyor.
  Normalleştirme uzunluğu değiştirmediği için ham ile normalleştirilmiş uzunluk aynı.
- **Ölçüm G.** Üst küme kanıtı: tek parça sorgu bir alanda geçiyorsa o sorgunun her kelimesi de aynı
  alanda geçer, yani aynı alan kümesinde yeni kural hiçbir sonucu daraltamaz. Birleştirilmiş havuz
  yazan üç ekranda (`SimpleDealers`, `YedekParcaSatisTab`, `SettingsSahipsiz`) alan sınırını aşan
  eşleşmeler de korunur.
- **Ölçüm H.** `useFilteredList` çağrıları: dört `searchFn` (`Customers.jsx:136`,
  `Documents.jsx:442`, `ModelsManager.jsx:71`, `PartStokTab.jsx:71`), yedi `searchFields`
  (`KalipManager`, `PartManager`, `SimpleDealers`, `SettingsSentMail` iki kez, `SettingsTrash`,
  `MakinaStokTab`). `searchFn`'e dizi geçilirse `includes(["ayna"])` tek kelimede çalışıyor, iki
  kelimede sessizce boş dönüyor (ölçüldü).
- **Ölçüm I.** Süzülmüş listeyi okuyan yazma ve çıktı: `PartManager.jsx:593` (toplu fiyat kipi) ve
  `:556` (Fiyat Listesi). Kasa'nın "Listedeki n kaydı kapsam dışı bırak" işlemi süzülmüş listeyle
  çalışıyor ama o ekranda arama kutusu yok, yani etkilenmiyor.
- **Ölçüm J.** Sınırlı seçiciler: `Documents.jsx:406`, `:411`, `:426` ilk 6 kayıt;
  `UretimSatirEkleModal` firma aramasında 25, kalıp aramasında 40.
- **Ölçüm K.** Kanıt aracı: beş `arama-*` ekranının sorgusu tek kelimeli ya da tarihli
  (`0009-sayfa.jsx:1631-1640`: "zzzz", "Yıldız", "10.06.2026", "ayna"), yani R3 gereği 0 piksel
  beklenir. Araçta `doldur:<placeholder>=<yazı>` (`:1888`) ve `odak:<placeholder>=<yazı>` (`:1933`)
  adımları var; genel arama paleti odakla açıldığı için palet ekranı `odak:` ister.
- **Ölçüm L.** Test triyajı küçük: `tests/ui/parca-suzgeci-0120.test.jsx` AC-8 iki kelimeli "KALIP
  MİLİ" sorgusunda sıfır sonuç bekliyor ve yeni kuralla da yeşil kalıyor (fikstürün iki kalıp işi
  parçası "100_ERKEK KALIPLAR REVİZE" ve "120_DİŞİ KALIP REVİZE", ikisi de "mili" taşımıyor), yani
  tip süzgecini sabitleyen gerçek bir iddia. Seçenek listesini birebir karşılaştıran üç test
  (`ui/documents-kalip-secici.test.jsx:36`, `ui/evrak-secici-0126.test.jsx:32`,
  `ui/parca-suzgeci-0120.test.jsx:37`) tek kelimeli sorgu kullanıyor.
- **Ölçüm M.** Spec 0026 R18'in "ekran süzgeci harf sadeleştirmez" kararını sabitleyen bir test yok;
  yani o kutuyu `aramaNormalize`'a geçirmek test kırmazdı, ama bu işte bilinçli olarak yapılmıyor (X9).

### QA turunda verilen kararlar (2026-11-20)

Takım Yöneticisi 22 bulgunun hepsini onayladı. Metinde "QA kararı n" bu listeye atıf yapar.

**Bloklayıcı**

- **1. Neden satırının kuralı (R2/2).** R2 genel aramada ve gider aramasında da uygulanır; neden
  satırı "başlıkta geçmeyen kelimeyi taşıyan ilk alan" kuralıyla yazılır — *neden:* kayıt eşleştiyse
  her kelime bir alanda vardır, bu kural her zaman bir cevap üretir ve satırın "neden çıktı?" amacını
  korur; tek eşleşen alan varsayımı R2 ile çöküyor.
- **2. Kısa kelime kapısı (R9, C4).** İki karakter sınırı ham sorguda kalır, üstüne "en az bir
  kelime iki karakter" kuralı gelir; liste ekranlarına kapı eklenmez — *neden:* yazarken oluşan ara
  hâller (ör. "ayna b") çalışmaya devam eder, yalnız bütün kelimeleri tek harf olan sorgu engellenir;
  paletin grup sınırı olmadığı için bugünkü "sel yok" özelliği böyle korunur.
- **3. Kapsam envanteri (R5/2, R6, X6).** Kelime kuralı istemcideki on dokuz kutunun hepsinde
  geçerli; iki günlük ekranı kapsam dışı; beş kutunun normalleştiricisi değişmez — *neden:* iki ayrı
  arama davranışı kullanıcıya ezberletilemez; SQL tarafı C5'in çerçevesini aşar; `DonemRaporu`'nun
  sadeleştirmemesi spec 0026 R18'in bilinçli kararı ve onu ters çevirmek ayrı bir karar.

**Önemli**

- **4. `searchFn` sözleşmesi (R8/3).** İkinci parametre ayrıştırılmış nesne olur, adı `sorgu`'ya
  çevrilir — *neden:* nesne, güncellenmemiş bir `includes` çağrısında hiç eşleşmez ve hata ilk testte
  çıkar; dize ya da dizi kalsa tek kelimeli testler yeşil kalıp iki kelimeli durum sahada patlardı.
- **5. Yardımcının imzası ve tokenizasyonun yeri (R8/2).** `aramaKelimeleri` artı
  `kelimelerEslesir` ayrımı; kelime üretimi döngü dışında — *neden:* `aramaSorgusu` artı
  `metinEslesir` emsali; AC-34'ün ölçümünü anlamlı kılar ve dört çağrı yerinin kayıt başına
  normalleştirmesini kapatır.
- **6. Ölçümün yeri ve eşiği (AC-34).** İki mutlak eşik (saf yardımcı ve genel arama), oran
  karşılaştırması kriterden çıkar — *neden:* asıl risk paletin on dokuz kategorisinde, çünkü R2 orada
  kayıt başına değer listesi kurduruyor; tek kelime mikrosaniye sürdüğü için oran ölçümü CI'da
  kararsız olurdu.
- **7. Üst küme değişmezi (R3/2, AC-28).** Kriter olarak yazılır ve iki kural karşılaştırılarak
  ölçülür — *neden:* "sonuç çıkmamalı" diyen eski testlerin triyaj ölçütü bu olur: artan sonuç
  beklenen, azalan sonuç hata.
- **8. Ayraç kümesi (R1/2).** Yalnız boşluk karakterleri ayraçtır, noktalama ayraç sayılmaz ve
  silinmez — *neden:* nokta ve virgül tutarın ("20.000") ve kodun ("AK-100") parçası; onları ayraç ya
  da gürültü saymak R7'yi ve kod aramasını bozar.
- **9. Gider: karışık sorgu ve sayısal sorgunun metin dalı (R7/2, C3/2, X7).** Karışık sorgu bilinen
  sınır; sayısal sorgunun metin dalı da kelimelere bölünür — *neden:* tarih ve tutarı metin havuzuna
  katmak alan kümesini değiştirir (X5), kelime başına tutar denemesi ise AC-12'nin güvencesini
  kaybettirir; tek kural iki dal arasında tutarsızlık bırakmaz.
- **10. Taramanın yönü (C6).** Tarama eski deseni yasaklar, istisna listesi tam yollu ve sayılı olur
  — *neden:* "ikinci kopya yok" taraması bir ekranın eski tek parça desenini sürdürmesini
  engellemiyor, oysa R6 ve R8'in gerçek güvencesi bu; emsali spec 0138'in kimlik bazlı taraması.
- **11. R3'ün kırpma istisnası (R3).** Üç ekranın kırpma hatası düzeltilir ve R3 bu istisnayla
  yazılır — *neden:* aksi hâlde R3'ü sabitleyen test o üç ekranda kırmızı yanar ve geliştirici kuralı
  mı testi mi değiştireceğini bilemez; düzeltme üst küme yönünde, yani zararsız.
- **12. Boş kelime ve kelime sayısı (R1/3).** Boş kelime atılır, üst sınır konulmaz — *neden:*
  `includes("")` her kayıtta doğru olduğu için yanlış kurulmuş bir ayrıştırıcı bütün listeyi
  "eşleşti" sayar; üst sınır ise fazladan yazılan kelimenin sessizce yok sayılması demek olurdu.

**Küçük**

- **13. R4'ün parantezi (R4).** "Liste tam görünür" yerine liste ve palet dalları ayrı yazılır
  — *neden:* paletin iki karakter kapısı `null` döndürüyor, orada görünecek liste yok.
- **14. Çağrı sayısı düzeltildi (Context).** 14 çağıran dosya, 47 satır, 58 çağrı — *neden:* 61
  sayısı içe alma satırlarını da sayıyordu ve işin boyutunu yanlış ölçtürüyordu.
- **15. "Bir kez normalleştiriliyor" düzeltildi (Context).** Dört yer kayıt başına normalleştiriyor,
  üç yer kırpmıyor — *neden:* QA kararı 5 ve 11'in dayanağı bu; Context yanlış kaldığında iki iş
  sessizce atlanır.
- **16. Aramanın beslediği yazma ve çıktı (R10, C5/2).** İki yer spec'e yazılır, DoD'nin "yazdırma
  çıktısı yok" satırı düzeltilir — *neden:* kullanıcı arama kutusuyla bir yazmanın kapsamını
  değiştirdiğini bilmeli; Fiyat Listesi yeni bir çıktı değil ama satır kümesi aramaya bağlı.
- **17. Sınırlı seçiciler (X10).** Bugünkü sınırlar korunur, risk bilinen sınır olur — *neden:*
  kelime kuralı VE ile birleştiği için her yeni kelime sonucu daraltıyor, kesilme riski tek kelimeli
  aramadan düşük; sıralamayı değiştirmek X3'ü açar.
- **18. Tam ifade arama (X8).** Kapsam dışı yazılır — *neden:* X1 ve X2 varken bu boşluk soru olarak
  kalıyordu; kelime kuralı üst küme olduğu için kayıp yok.
- **19. Kanıt adımları (AC-36, DoD).** Üç ekran adıyla yazılır ve var olan `arama-*` ekranlarında 0
  fark beklenir; palet ekranı `odak:` ister — *neden:* spec 0117 Karar 51'den beri bulunamayan adım
  yalnız uyarıyla geçiyor, yani yanlış adım sessizce yanlış ekran çeker.
- **20. Sonuç sırası (X3).** Sıralamanın eşleşme kalitesine göre olmadığı yazılı kalır — *neden:*
  "ayna dişlisi" artık birkaç kayıt bulabilir ve kullanıcı en üsttekinin en iyi eşleşme olmasını
  bekler; beklentiyi şimdiden yazmak sonraki "arama yanlış sıralıyor" bulgusunu önler.
- **21. Beş kutuda sadeleştirme yok (X9, R5/2).** Bilinen sınır olarak yazılır — *neden:* AC-8 yalnız
  `aramaNormalize` kullanan kutular için doğru; yazılmazsa bütün ekranlar için okunup yanlış güvence
  verir.
- **22. Test triyajının somut listesi (Context, ölçüm L).** Ölçüm Context'e yazılır — *neden:* "sonuç
  çıkmamalı diyen testler" tuzağı soyut duruyordu; liste kısa olduğu için işin riski de küçük ve bunu
  bilmek plan turunu hızlandırır.

### QA turu karar kaydı (2026-11-20)

| # | Karar | Derece | İşlendiği yer |
|---|---|---|---|
| 1 | Neden satırının kuralı | Bloklayıcı | R2/2, AC-19, AC-20 |
| 2 | Kısa kelime kapısı | Bloklayıcı | R9, C4, AC-22 |
| 3 | Kapsam envanteri | Bloklayıcı | R5/2, R6, X6, X9, AC-23, AC-24, AC-25 |
| 4 | `searchFn` sözleşmesi | Önemli | R8/3, AC-26 |
| 5 | Yardımcının imzası | Önemli | R8/2, C1/2, AC-27 |
| 6 | Ölçümün yeri ve eşiği | Önemli | AC-17, AC-34 |
| 7 | Üst küme değişmezi | Önemli | R3/2, AC-28 |
| 8 | Ayraç kümesi | Önemli | R1/2, AC-29 |
| 9 | Karışık sorgu ve metin dalı | Önemli | R7/2, C3/2, X7, AC-31, AC-32 |
| 10 | Taramanın yönü | Önemli | C6, AC-16 |
| 11 | R3'ün kırpma istisnası | Önemli | R3, AC-5 |
| 12 | Boş kelime ve kelime sayısı | Önemli | R1/3, AC-30 |
| 13 | R4'ün parantezi | Küçük | R4, AC-7 |
| 14 | Çağrı sayısı | Küçük | Context, ölçüm A |
| 15 | Normalleştirmenin yeri | Küçük | Context, ölçüm B |
| 16 | Beslediği yazma ve çıktı | Küçük | R10, C5/2, AC-33, DoD |
| 17 | Sınırlı seçiciler | Küçük | X10 |
| 18 | Tam ifade arama | Küçük | X8 |
| 19 | Kanıt adımları | Küçük | AC-36, DoD |
| 20 | Sonuç sırası | Küçük | X3 |
| 21 | Beş kutuda sadeleştirme | Küçük | X9, R5/2, AC-25 |
| 22 | Test triyajı | Küçük | Context, ölçüm L, AC-35 |

---

## Acceptance Criteria

> QA turunun 22 kararı Context'teki "QA turunda verilen kararlar (2026-11-20)" bölümünde duruyor ve
> metinde "QA kararı n" olarak anılıyor; karar kaydı tablosu her kararın işlendiği yeri gösteriyor.

- **AC-1.** Parça kataloğunda "ayna dişlisi" aranınca adı "AYNA MAHRUTİ DİŞLİSİ" olan parça
  listelenir.
- **AC-2.** Menüdeki genel aramada aynı sorgu aynı parçayı bulur.
- **AC-3.** "dişlisi ayna" aranınca da aynı parça bulunur (kelime sırası önemsiz).
- **AC-4.** "ayna rulman" aranınca, adında ikisi birden geçmeyen parça listelenmez.
- **AC-5.** Tek kelimelik ve kırpılmış arama ("ayna") spec öncesiyle aynı kümeyi döndürür; tek
  istisna R3'teki kırpma düzeltmesidir ve servis formu, Extra Kalıp formu ile Sahipsiz Kayıtlar için
  ayrıca ölçülür ("ayna " sonda boşlukla artık bulur).
- **AC-6.** "  ayna   dişlisi  " (baştaki, sondaki ve aradaki fazla boşluklarla) tek boşlukla
  yazılmış sorguyla aynı sonucu verir.
- **AC-7.** Yalnız boşluk yazılan sorguda liste ekranında ve form seçicisinde liste tam görünür,
  genel aramada sonuç çizilmez (boş sorgu davranışı, R4).
- **AC-8.** "dislisi" (şapkasız ve noktasız yazım) "DİŞLİSİ" ile eşleşir.
- **AC-9.** Müşteri listesinde "ayna istanbul" aranınca, adı "AYNA…" ve şehri İstanbul olan kayıt
  bulunur (kelimeler ayrı alanlarda).
- **AC-10.** Servis formunun "Değişen Parçalar" aramasında iki kelimeli sorgu aynı kuralla çalışır.
- **AC-11.** Evrak satırının parça seçme penceresinde iki kelimeli sorgu aynı kuralla çalışır.
- **AC-12.** Gider aramasında tutar eşitliği değişmez: "20.000" yazınca 120.000 TL'lik kalem
  bulunmaz.
- **AC-13.** Gider aramasında tarih eşleşmesi değişmez: "15.03.2026" bugünkü kaydı bulur.
- **AC-14.** Gider kaleminin metin eşleşmesi kelime kuralını kullanır: açıklaması "ARAÇ BAKIM
  FATURASI" olan kalem "araç faturası" ile bulunur.
- **AC-15.** Genel aramada tek karakterlik sorgu bugünkü gibi sonuç döndürmez (iki karakter alt
  sınırı ham sorguya uygulanır).
- **AC-16.** Kaynak taraması iki yönlüdür: (a) `src` altında kelimelere bölüp hepsini arayan ikinci
  bir kopya yoktur; (b) arama çağrı yerlerinde eski tek parça deseni
  (`aramaNormalize(...).includes(...)`, `toLocaleLowerCase(...).includes(...)`) kalmaz ve gerekçeli
  istisna listesi tam yollu, sayılıdır (C6).
- **AC-17.** Saf yardımcı ölçümü: 400 parça × 10 alan, iki kelimeli sorgu, 200 tur, testte yazılı
  mutlak eşiğin altında (tek kelimeyle oran karşılaştırması yapılmaz, CI'da kararsız olduğu için).
- **AC-18.** Boş arama kutusunda bütün listeler bugünkü sayıda kayıt gösterir (hiçbir ekran
  kelime kuralı yüzünden boşalmaz).

### QA turu kriterleri (2026-11-20)

**Neden satırları ve alanlar arası eşleşme**

- **AC-19.** Genel aramada müşteri kaydı, adı bir kelimeyi, telefonu ötekini taşıyarak eşleşince
  neden satırı "telefon: …" yazar; iki kelime de addayken neden yazılmaz (R2/2).
- **AC-20.** Gider kalemi, açıklaması bir kelimeyi, tedarikçi adı ötekini taşıyarak eşleşince neden
  "tedarikçi: …" olur; iki kelime de açıklamadayken neden yazılmaz (R2/2).
- **AC-21.** Genel aramada "ayna 532" gibi sorgu, adı "AYNA…" ve telefonu "532…" olan müşteriyi
  bulur (kelimeler ayrı alanlarda, palet tarafında R2).

**Kapı ve kapsam**

- **AC-22.** Genel aramada "a b" sonuç çizmez, "ayna b" çalışır; aynı iki sorgu parça kataloğunun
  arama kutusunda süzme yapar (liste ekranına kapı eklenmedi, R9).
- **AC-23.** R6 envanterindeki her kutu kelime kuralını kullanır: ölçüm, `useFilteredList` ve
  `ui.jsx` yollarından birer örnek ekran artı kendi eşleşmesini yazan her ekran için bir iki kelimeli
  sorgu.
- **AC-24.** Kullanıcı Geçmişi ve İşlem Geçmişi aramaları değişmez: iki kelimeli sorgu sunucuya tek
  parça olarak gider (X6; istek gövdesi ölçülür).
- **AC-25.** R5/2'deki beş kutu iki kelimeli sorguyla çalışır ama harf sadeleştirmesi yoktur:
  "dislisi" o kutularda "DİŞLİSİ"yi bulmaz, "dişlisi" bulur.

**Yardımcı, sözleşme ve kural**

- **AC-26.** `searchFn` ayrıştırılmış nesne alır; kaynakta `includes(sorgu)` biçiminde eski dize
  kullanımı kalmaz (R8/3).
- **AC-27.** Kelime üretimi döngü dışındadır: casusla ölçülür, 400 kayıtlık listede
  `aramaKelimeleri` kayıt sayısı kadar değil, bir kez çağrılır (R8/2).
- **AC-28.** Üst küme değişmezi: her ekranın alan kümesiyle üretilen sorgularda eski kuralla eşleşen
  her kayıt yeni kuralla da eşleşir (R3/2).
- **AC-29.** Ayraç kümesi: sekme ve çoklu boşlukla yazılan sorgu tek boşlukla aynı sonucu verir,
  "ayna, dişlisi" (virgüllü) eşleşme vermez (R1/2).
- **AC-30.** Boş kelime atılır: yalnız boşluk sorgusu liste ekranında tam listeyi, genel aramada hiç
  sonucu verir; hiçbir ekranda "hepsi eşleşti" davranışı doğmaz (R1/3).
- **AC-31.** Sayısal sorgunun metin dalı kelimelere bölünür: açıklaması "20 000 avans" olan kalem
  "20 avans" ile bulunur, tutar eşitliği etkilenmez.
- **AC-32.** Karışık sorgu eşleşme vermez: "kira 15.03.2026" sonuç döndürmez (X7, yazılı sınır).

**Beslediği yazma, ölçüm, triyaj ve kanıt**

- **AC-33.** Parça kataloğunda iki kelimeli arama yapılınca toplu fiyat kipi düğmesinin ve onay
  penceresinin sayısı süzülmüş kümeyi söyler; Fiyat Listesi çıktısı aynı kümeyi basar (R10).
- **AC-34.** Genel arama ölçümü: gerçekçi veri kümesiyle `genelAramaSonuclari` tek çağrısı testte
  yazılı mutlak eşiğin altında (iki kelimeli sorgu, R2 kayıt düzeyine çevrildikten sonra).
- **AC-35.** Spec 0120 AC-8 (iki kelimeli "KALIP MİLİ" sorgusunda sıfır sonuç) dokunulmadan yeşil
  kalır: tip süzgecini sabitleyen iddia korunur (ölçüm L).
- **AC-36 (plan kararı P5: palet adımı var olan `baslik:` + `doldur:` desenidir, `odak:` değil).** Görsel kanıt: parça kataloğu, müşteri listesi ve genel arama paleti üçlüsü boş sorgu,
  tek kelime ve iki kelime hâlleriyle çekilir (palet `odak:` adımıyla); var olan beş `arama-*`
  ekranında 0 piksel fark beklenir (ölçüm K).

---

## Definition of Done

- [ ] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [ ] Eşleştirme kuralı React'sız saf yardımcıda ve tek yerde; yardımcı normalleştiriciyi parametre
      alıyor (C1/2) ve kaynak taraması iki yönlü (ikinci kopya yok, eski desen de yok).
- [ ] Aynı soruyu cevaplayan iki arama (genel arama ve liste araması) aynı yardımcıyı kullanıyor.
- [ ] R6'nın envanteri tam: on dokuz kutunun hepsi kelime kuralını kullanıyor, kapsam dışı iki
      günlük ekranı ve normalleştiricisi değişmeyen beş kutu spec'te yazılı.
- [ ] "Neden çıktı?" satırlarının kuralı R2/2 ile yazılı ve genel arama ile gider tarafında ölçüldü.
- [ ] `searchFn` sözleşmesi ayrıştırılmış nesne; kelime üretimi döngü dışında (casusla ölçüldü).
- [ ] Üst küme değişmezi ölçüldü: hiçbir aramada sonuç daralmadı.
- [ ] İki ölçüm (saf yardımcı ve genel arama) mutlak eşiklerle yazılı ve yeşil.
- [ ] Yeni kalıcı alan yok; dört nokta kuralı gündeme gelmedi (spec'te yazılı).
- [ ] Yeni veri bölümü ve eylem izni yok; arama salt okunur olduğu için izin eklenmediği açıkça
      yazıldı.
- [ ] Kullanıcıya görünen metinler Türkçe; yeni yazdırma çıktısı yok, ama Fiyat Listesi çıktısının
      ve toplu fiyat kipinin satır kümesi aramaya bağlı olduğu spec'te yazılı (R10).
- [ ] Genişleyen eşleşme yüzünden değişen eski test beklentileri tek tek gerekçelendirildi.
- [ ] Görsel kanıt eklendi: parça kataloğu, müşteri listesi ve genel arama paleti (boş sorgu, tek
      kelime, iki kelime); var olan beş `arama-*` ekranı 0 piksel.
- [ ] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [ ] `CLAUDE.md`'nin arama bölümü güncellendi.
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
