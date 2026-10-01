# 0059 — Gider ve Kasa Raporu Aylık Rapor Diliyle Yazılsın

| | |
|---|---|
| **Durum** | Onaylandı (2026-10-01, Takım Yöneticisi) |
| **Sahip** | Analist (spec) · geliştirme sahibi atanacak |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Aylık Gider ve Kasa Raporu (motor ve şablon), paylaşılan yazdırma sunumu |
| **Bağımlı spec'ler** | 0047 (gider ve kasa raporu) · 0051 (hedef etiketi, hesapsız özeti) · 0042 ve 0054 (personel hedef gizliliği) · 0055 ve 0016 (boş durum deseni) · 0009/0011 (görsel kanıt) · aylık faaliyet raporu (referans) |
| **Revizyon** | R1 (QA turu, 2026-10-01): onay **olduğu gibi** verilmişti (ortak sunum modülü, geçen ay karşılaştırması, altı detay tablosu; faaliyet raporu referans kalır, personel her tabloda tek satır). QA turunda 17 bulgu işlendi, 3'ü bloklayıcıydı: hedef etiketinin bugün yeşil olan gizlilik testini kıracağı (R10), etiketin bir React bileşeninde durduğu (R20) ve C2'nin "var olan listeler kullanılır" varsayımının üç tablo için yanlış olduğu (R21) bulundu. R19–R30, C7–C9, X6–X7 ve AC-21…AC-36 eklendi.<br>**R2 (2026-10-01, plan onayı):** bütün öneriler kabul (Q1–Q14): hedef etiketinin ad zinciri lib'e iner (R31), ortak modül beş gizlilik taramasında (R32), gider raporunun görünümü ve geçen ay ekinin yeri (R33, R34), yürürlük öncesi önceki ay (R7 netleşti), tabloların kaynakları ve sütunları (R35–R39), altın çıktılarla ölçüm (R40), belirlenimcilik ölçüsü (R41). |

---

## Intent

Aylık Faaliyet Raporu ile Aylık Gider ve Kasa Raporu yan yana konunca fark açık: faaliyet raporu kutulu,
koyu başlık şeritli, firma firma detay tablolu ve **geçen ayla karşılaştırmalı**; gider ve kasa raporu
ise düz başlıklı, çoğu bölümü tek satır toplamdan ibaret bir özet.

İki sebebi var. Birincisi 0047 raporu bilinçli olarak **dar** tuttu: toplamlar, kırılımlar ve kalem
listesi. İkincisi iki belge **iki ayrı dosyada, iki ayrı sunum diliyle** yazıldı; gider raporu
gizlilik taraması yüzünden `printTemplates.js` dışında durmak zorundaydı ve kendi tablo, başlık ve
çerçeve kodunu yazdı. Sonuç: aynı firmanın aynı ayı için iki belge, iki ayrı tasarım.

Başarı şu demek: gider ve kasa raporu faaliyet raporuyla aynı görünüyor, aynı derinlikte ayrıntı
veriyor, geçen ayla karşılaştırıyor ve bu iki belge bir daha ayrışmayacak biçimde aynı sunum dilinden
besleniyor.

---

## Requirements

### A. Ortak sunum dili

- **R1.** İki rapor aynı sunum dilini kullanır: kutu ve koyu başlık şeridi, istatistik satırı, küçük alt
  başlık, detay tablosu, **sayı biçimi** (binlik ayraçlı, kuruşsuz), sayfa ve yazdırma ayarları.
  **Para birimi gösterimi paylaşılmaz:** faaliyet raporu `"150.875 TL"` yazıyor (`paraSatir`, çok para
  birimli nesne), gider raporu `utils.fmtCur` ile `"₺150.875"` yazıyor (simge önde). Hassasiyet ikisinde
  de aynıdır (`maximumFractionDigits: 0`); R4 faaliyeti dondurduğu için gider raporu **bugünkü `fmtCur`
  biçimini korur**. Ortaklaşan şey sayı biçimi ile tablo ve alt başlık işaretlemesidir. Gerekçe: `fmtCur`
  uygulamanın tek para yardımcısıdır, onu terk etmek rapor ile ekran arasında yeni bir ayrışma açar ve
  AC-19 ile çelişir.
- **R2.** Ortak yardımcılar **tek bir sunum modülünde** toplanır; her iki belge oradan beslenir, kopya
  stil kalmaz.
- **R3.** Ortak modül **hiçbir veri alanı adı bilmez**; yalnız biçimleme ve çerçeve üretir. Böylece
  gider alanlarının yazdırma şablonlarında okunmasını yasaklayan kaynak taraması bozulmaz.
- **R4.** **Aylık faaliyet raporunun görünümü değişmez**; referans odur, gider ve kasa raporu ona uyar.

### B. Geçen ay karşılaştırması

- **R5.** Gider ve kasa raporunun özet rakamlarının yanında geçen ayın değeri küçük ve soluk yazılır
  (faaliyet raporundaki "geçen ay: X" deseni): toplam gider, ödenen, ödenmeyen, indirilecek KDV,
  kesilen stopaj, kasaya giren, kasadan çıkan ve ay sonu toplam bakiye.
- **R6.** Geçen ayın rakamları **aynı motordan ve aynı dönem kilidiyle** hesaplanır (0047 R26); ayrı bir
  hesap yazılmaz. **İkinci çağrı `giderKasaRaporu`'nun içinde yapılır** (dönüşe `onceki` alanı eklenir,
  iç çağrı özyinelemeyi keser) ve ay hesabı `aylikRapor.oncekiAyStr` ile. Faaliyet raporunda bu çağrı
  ekranda duruyor (`Finance.jsx:52`), burada **motorda durur**: gider raporunun düğmesi üç ekranda
  paylaşılıyor (`rapor/GiderKasaRaporuDugmesi.jsx`) ve 0047 Q4 "üç ekran, aynı ay, aynı belge" diyor;
  düğmede yapılsa üç çağırandan biri atlanabilir ve dönem kilidi ikiye bölünürdü.
- **R7.** Karşılaştırma ölçütü **yürürlük ayıdır**, "ilk ay" diye bir veri yok: önceki ay `< yururlukAy`
  ise karşılaştırma hiç basılmaz (motor o ay için `{ yururlukOncesi: true }` döndürür); önceki ay
  yürürlükte ama o ayda kayıt yoksa (`gr.bos`) karşılaştırma **sıfırla** basılır. Kasa bölümü için ayrı
  kural gerekmez (açılış bakiyesi devreder). Hiçbir durumda hata verilmez.

### C. Detay tabloları

- **R8.** **Vadesi geçmiş ve yaklaşan kalemler** tek tek listelenir: tarih, tür, tedarikçi, kalan tutar,
  vade ve gecikme günü. **Kaynak `h.gecmisSatirlar` / `h.yaklasanSatirlar`'dır**, ham `h.gecmis` /
  `h.yaklasan` DEĞİL: ham öğeler bütün gider kaydını (`kalem: k`) ve personelde
  `taraf = k.calisanAd || "Çalışan"` taşır (`odemeHatirlatma.js:99-105`), bölüm satırları ise personeli
  zaten tek satıra toplar (`tur: "personel"`, adet + toplam). İki yasak: **`taraf` personel satırında
  basılmaz** ve **`oge.kalem` hiç okunmaz** (0047'nin `giderRaporu.js` başındaki "hatırlatıcının taraf
  adları hiç okunmaz" kuralı).
  Sütunların kaynağı: *tür* `turMap.get(k.turId).ad` ile çözülür (kalem listesindeki gibi; hatırlatıcı
  satırı tür adı taşımaz), *tedarikçi* personel dışında `taraf`tır (stopajda "Vergi dairesi", boşta
  "Tedarikçi seçilmemiş") ve personel satırında boştur, *kalan tutar* `odenecek`, *vade* `vade`,
  *gecikme günü* `gunFarki`. **Gecikme ay sonuna göre ölçülür** (dönem kilidi, `bugun = son`) ve bu
  belgenin üstünde de yazılır; kullanıcı bugüne göre bekler.
- **R9.** **Tedarikçi kırılımının** altında o tedarikçinin kalemleri okunur.
- **R10.** **Ayın ödeme hareketleri** listelenir: tarih, hesap, yöntem, hangi kalemi ve hangi hedefi
  kapattığı (0051'in hedef etiketi), tutar. İki sınır:
  **(a) Yalnız `tur: "odeme"` girer.** `hareketOzeti` beş tür sayar; avans ve mahsup **çalışan bazlıdır**
  ve bugünkü hesapsız bölümünde olduğu gibi birer **toplu satır** kalır (R15), virman ayrı küçük tabloda
  (tarih, kaynak hesap, hedef hesap, tutar). Avansın tarihli satırı tek çalışanın avansını kâğıda
  düşürür; bu 0047 R31 triyajında bilerek engellenmişti.
  **(b) Hedef etiketi yalnız personel DIŞI kalemde basılır** (kirada "Kiraya veren" / "Vergi dairesi").
  Personel ödemeleri tabloda **tek toplu satırdır** ve hedef hücresi boştur. Sebep ölçülmüş bir
  çakışmadır: `tests/gider-gizlilik.test.js:75-92` dört hedefli bir personel kalemi ve **iki personel
  ödeme hareketi** kurup belgede `"Maaş (resmi)"`, `"Ek ödeme (resmi)"`, `"Ek ödeme (elden)"`, `"1.357"`
  geçmediğini doğrular; etiket basılsa bu test ilk koşuda düşer. Aynı dosyanın `:71` kaynak taraması
  `src/lib/giderRaporu.js`'i de listeye alıp o dizgileri orada yasaklar.
- **R11.** **Ayın tahsilat hareketleri** listelenir: tarih, hesap, kaynak, firma, tutar ve **para
  birimi**. Kaynak `hesapBakiyeleri` çıktısındaki hesap satırlarıdır (`s.tahsilat`, `firma`, `turAdi`,
  `kaynak`; giderRaporu bakiyeleri zaten dolaşıyor). **Hesapsız tahsilatlar bu tabloya girmez**, kendi
  bölümünde kalır (hesapları olmadığı için hiçbir hesabın satırında görünmezler). Para birimi sütunu
  şarttır: hesaplar çok para birimlidir (`bloklar` deseni), yazılmazsa EUR tahsilatı TL gibi okunur.
- **R12.** **Çek hareketleri** tek tek listelenir (ay içinde tahsil edilen, ciro edilen, karşılıksız
  çıkan): numara, banka, tutar, vade.
- **R13.** **Hesabı belirtilmemiş kayıtlar zaten listeyle basılıyor** (QA turu düzeltmesi: onay
  metnindeki "bugün yalnız sayı var" yanlıştı). `giderRaporu.js:207` hesapsız ödemeleri, `:209` hesapsız
  tahsilatları liste olarak basıyor ve `:124-135` personel ödemelerini ve avansları birer toplu satıra
  indiriyor. Bu işte yalnız **ortak tablo biçimine** geçerler; satırlar, sıraları ve personel/avans
  toplaması **bugünkü hâliyle korunur**.
- **R14.** **Yeni** detay tabloları boşsa hiç basılmaz (faaliyetin `detayTablo` deseni); belge gereksiz
  başlıkla şişmez. **Var olan bölümlerin açıklama satırları korunur:** bugün boş bölüm
  `<p class="bos">…</p>` basıyor ("Hesabı belirtilmemiş ödeme ya da avans yok.", 0055 ile kalem listesi
  de böyle) ve bu 0016/0055 desenidir, kaldırılmaz (AC-19).

### D. Gizlilik

- **R15.** Personel her yerde **tek satırdır**: yeni detay tablolarında da çalışan adı ve çalışan bazlı
  tutar yoktur. Özellikle vadesi geçmiş kalemler ve ödeme hareketleri tablolarında personel kalemleri
  "Personel gideri" diye toplanır.
- **R16.** 0047'nin **çıktı temelli** gizlilik testi yeni tabloları da kapsar: ayırt edici çalışan adı ve
  tutarla üretilen belgede hiçbiri geçmez.

### E. Sınırlar

- **R17.** Rapordaki **rakamlar değişmez**; artan şey sunum ve ayrıntıdır.
- **R18.** Grafik, pasta dilimi ve renkli görselleştirme yoktur (0047 X7 sürüyor); belge tablo
  temellidir.

### F. QA turunda eklenenler (R1)

- **R19.** **Ortak modül gizlilik taramasına eklenir.** `tests/gider-gizlilik.test.js` dosyaları **adıyla**
  tarıyor; yeni bir sunum modülü hiçbir listede olmadığı için taranmaz ve R3'ün ölçüsü boşta kalır. Modül
  `YASAKLI` taramasının dosya listesine `printTemplates.js` ile aynı satıra eklenir. Adı
  `/giderKasaRaporu|GiderKasa/` desenine uymaz (`:102` yasağı sürüyor: `printTemplates.js` bu dizgileri
  içermemeli).
- **R20.** **Hedef etiketi saf kitaplığa taşınır.** `hedefEtiketi` ve `cokHedefliMi` bugün
  `src/components/gider/GiderAlanlari.jsx:198-199`'da, yani bir React bileşeni modülünde; `giderRaporu.js`
  saf bir lib ve oraya JSX içe almak React'i yazdırma yoluna sokar. İkisi saf
  **`src/lib/odemeYontemi.js`**'e taşınır (`hareketHedefPaylari` zaten orada), `GiderAlanlari.jsx` onları
  yeniden dışa verir; Kasa, `OdemeGirisi`, `EkstrePenceresi` ve 0051/0054 testleri değişmez, rapor lib
  sürümünü kullanır. Tek tanım kuralı korunur.
- **R21.** **Üç tablo için motor geriye uyumlu genişletilir** (C2'nin "var olan listeler kullanılır"
  varsayımı bu üç yerde yanlıştı): `kasa.hareketOzeti` listeyi **bilerek siliyor**
  (`const strip = ({ liste, ...r }) => r`) ve tahsilat için hiç liste döndürmüyor; `cek.cekAyOzeti` yalnız
  adet ve para birimi bazlı toplam döndürüyor. 0047 R37 deseniyle opt-in genişletme:
  `hareketOzeti(..., { liste: true })` ödeme, avans, mahsup listelerini ve tahsilat satırlarını döndürür;
  `cekAyOzeti(..., { liste: true })` her kovaya `liste` ekler. **Çek listesi motorda üretilir**, rapor
  `gecmis`'i yeniden yürümez: "aynı ay içinde iptal edilen ciro sayılmaz" triyajı `cek.js`'te tek yerde
  durur, kopyalanırsa kural ikiye bölünür. Parametresiz çağrı birebir bugünkü çıktıyı verir.
- **R22.** **Ortak tablonun kaçışlama sözleşmesi yazılıdır: hücreler ÇAĞIRAN tarafından kaçışlanmış
  HTML'dir.** İki belge bugün farklı disiplin kullanıyor: `buildAylikRaporHtml` girdinin tamamını baştan
  kaçışlıyor (`escDeep(rapor)`, `printTemplates.js:1593`) ve hücreyi ham basıyor; `buildGiderKasaRaporuHtml`
  her çağrı yerinde `esc()` / `tlp()` kullanıyor. Sözleşme bu ikisinin kesişimidir ve ikisi de uyumlu
  kalır. Aksi hâlde adında `<` olan bir tedarikçi ya bozuk basılır ya `&amp;lt;` olarak iki kez kaçışlanır.
- **R23.** **AC-5 piksel değil dize eşitliğiyle ölçülür.** Faaliyet belgesinin kanıt ekranı yok
  (`buildAylikRaporHtml` görüntü aracında hiç çizilmiyor); gider belgesinin var
  (`gider-kasa-raporu-belge`, `scripts/evidence/0009-sayfa.jsx:670`, 0047 raporunda iki temada kayıtlı).
  Faaliyet raporunun değişmezliği, aynı girdiyle çıktının bu işten önce ve sonra **birebir aynı dize**
  olduğu testiyle gösterilir; yeni piksel ekranı açılmaz. Gider belgesi ekranının farkı **bilinçlidir**
  (`0059-piksel-raporu.json` + yeni taban).
- **R24.** **Determinizm ölçülebilir yazılır:** aynı girdiyle iki çağrı birebir aynı HTML üretir,
  sıralamalar kararlıdır ve belge `new Date()` / `yerelBugun` okumaz. Bu bir veri değişmezliği iddiası
  değildir; `NOT_ANLIK` zaten "bu rapor yazdırıldığı andaki veriyle üretilmiştir" diyor ve o not kalır.

### G. Plan onayında eklenenler (R2)

- **R31.** **Etiket zinciri bütünüyle lib'e iner.** `hedefEtiketi` `hedefAdi`'ye, o da `PERSONEL_AD` / `HEDEF_AD`
  tablolarına ve `tl2`'ye dayandığı için yalnız iki fonksiyon taşınamaz: `hedefAdi`, `HEDEF_AD`, `PERSONEL_AD`,
  `cokHedefliSatirlar`, `cokHedefliMi`, `hedefEtiketi` ve tutar biçimleyicisi `src/lib/odemeYontemi.js`'e taşınır;
  `GiderAlanlari.jsx` hepsini aynı adlarla yeniden dışa verir (plan Q1). Personel hedef dizgileri `odemeYontemi.js`'e
  geçer; o dosya çıktı taramalarında değildir, `giderRaporu.js` bu dizgileri içermez kuralı sürer.
- **R32.** Ortak modül **`src/lib/raporSunumu.js`**'dir ve yalnız `YASAKLI` değil `MALIYET`, `YONTEM`, 0042 `HEDEF` ve
  0054 `DESEN` taramalarına da eklenir (plan Q2).
- **R33.** **Görünüm:** üst başlık bandı faaliyetle aynıdır (rapor adı, ay, dönem, sağda firma bloğu); bugünkü her
  bölüm koyu şeritli kutudur, başlıklar büyük harf ve "GİDER · …" / "KASA · …" önekli; notlar aynı metinle kutuların
  altında kalır (plan Q3).
- **R34.** **Geçen ay eki:** gider özeti `st` satırlarıdır, R5'in beş rakamının yanında "geçen ay: X"; kasada yeni bir
  özet kutusu para birimi başına Giren / Çıkan / Ay sonu bakiye ve ekleri (önceki ayda o para birimi yoksa 0). Önceki
  ay yürürlük ayından önceyse gider ve kasada hiç ek basılmaz; `yururlukAy` yoksa karşılaştırma hep hesaplanır. İç
  çağrı yalnız özet rakamlarını taşır (plan Q4–Q6).
- **R35.** **Vadesi geçmiş ve yaklaşan tablosu:** personel dışı satırın tarihi ve türü kalemin kimliğiyle ay sonu
  kalem haritasından çözülür (`oge.kalem` okunmaz); personel satırında tür "Personel gideri", tarih "Ay geneli",
  tedarikçi boş, vade en erken vade; gün sütunu hatırlatıcının "n gün geçti / kaldı" metni; "gün ay sonuna göre"
  notu tablonun altında (plan Q7).
- **R36.** **Ödeme hareketleri tablosu:** ayın bütün `odeme` hareketleri (hesaplı, hesapsız, ciro, kendi çek); hesap
  sütunu ad / "Hesapsız" / yöntemin kendisi (çek); personel ödemeleri, avans ve mahsup sonda birer "Ay geneli" toplu
  satırdır; hedef payları dönem kilitli hareketlerle (plan Q8).
- **R37.** **Tahsilat tablosu** `hareketOzeti(..., { liste: true }).tahsilat.liste`'den; satır hesap adı ve para
  birimini taşır (plan Q9).
- **R38.** **Çek tabloları** kova başına (tahsil / ciro / karşılıksız); sütunlar R12'ye ek olarak durumun değiştiği
  **tarih** (plan Q10).
- **R39.** **Tedarikçi altındaki kalemler** tedarikçi kutusunda `altBaslik(ad)` + o tedarikçinin bu ayki kalem
  satırları; kaynak kalem listesi (AC-27), başlıkta "bu ayın kalemleri" (plan Q11).
- **R40.** AC-5 faaliyet HTML'inin, AC-14 / AC-19 gider rapor nesnesinin (yeni alanlar hariç) değişiklikten önce
  HEAD'den alınmış **altın çıktılarla** eşitliğiyle ölçülür (plan Q12). Kanıt: `gider-kasa-raporu-belge` ve `-bos`
  bilinçli değişir, yeni ekran `gider-kasa-raporu-detay` (plan Q13).
- **R41.** AC-20 iki farklı sistem saatinde birebir aynı HTML ve `giderRaporu.js` / `raporSunumu.js`'te zaman okuyan
  çağrı olmaması ile ölçülür (plan Q14).

---

## Constraints

- **C1.** Hesaplar kuruş tamsayısıyla.
- **C2.** **Tek kaynak:** rapor verisi yine mevcut motorlardan gelir (gider raporu, kasa, çek, hatırlatıcı,
  KDV); detay tabloları için **ikinci bir hesap yazılmaz**. Liste hazır değilse motor R21'deki opt-in
  biçimde genişletilir, kural rapor dosyasına kopyalanmaz.
- **C3.** Dönem kilidi korunur: bütün rakamlar ay sonuna sabittir ve aynı ay her yazdırıldığında aynı
  belge çıkar (0047 R26, R27).
- **C4.** Gizlilik duvarı yerinde: gider verisi yalnız bu belgeye girer, müşteriye giden şablonlara ve
  dışa aktarmaya girmez.
- **C5.** Yeni kalıcı alan, yeni izin ve sunucu değişikliği yoktur.
- **C6.** Kullanıcıya görünen metinler Türkçedir.
- **C7.** **Ortak modül saf kalır:** React, JSX ve bileşen içe almaz; `giderRaporu.js` ve
  `printTemplates.js` de bileşen modülü içe almaz (R20'nin sebebi).
- **C8.** Kaçışlama sözleşmesi R22'dedir; ortak modül hiçbir hücreyi kendi başına kaçışlamaz ya da iki
  kez kaçışlamaz.
- **C9.** Personel, avans ve mahsup satırlarında **tarih + kişi** bir araya gelmez: toplu satırın tarihi
  "Ay geneli"dir (bugünkü hesapsız listesi deseni).

### KAPSAM DIŞI

- **X1.** Aylık faaliyet raporunun değiştirilmesi — *neden:* R4; referans belge odur, ona dokunmak bu
  işin kapsamını ve riskini iki katına çıkarır.
- **X2.** Gider bölümünün faaliyet raporuna eklenmesi — *neden:* 0047 X6'daki karar sürüyor; iki raporun
  kitlesi ve yetkisi farklı.
- **X3.** Grafik ve görselleştirme — *neden:* R18.
- **X4.** Belgenin sayfa sayısını sınırlamak ya da detayı seçeneğe bağlamak — *neden:* 0055 ile kalem
  listesi seçeneği kaldırıldı; aynı hatayı yeni tablolarda tekrarlamayalım.
- **X5.** Dışa aktarma (CSV/XLSX) — *neden:* 0047 X1'deki karar sürüyor.
- **X6.** Çek portföyü bölümünün dört satırının (elde / tahsil / ciro / karşılıksız) hepsi sıfırken
  gizlenmesi — *neden:* R14 yalnız yeni tabloları kapsar; bu bölüm bugün hep basılıyor ve gizlemek belgeyi
  değiştirir (AC-19).
- **X7.** Var olan bölümlerin boş durum açıklama satırlarının kaldırılması — *neden:* R14; o satırlar
  0016/0055 desenidir.
- **X8.** Avans ve mahsup hareketlerinin tarih tarih listelenmesi — *neden:* R10 (a); ikisi çalışan
  bazlıdır ve 0047 R31 triyajı bunu bilerek engelledi.

---

## Context

- **İki ayrı sunum dili (doğrulandı).** Faaliyet raporu `printTemplates.js` içinde kendi yardımcılarıyla
  çiziliyor: `kutu(baslik, icerik)` (koyu başlık şeridi), `st(label, deger)` (istatistik satırı),
  `altBaslik(t)`, `detayTablo(baslik, basliklar, satirlar, hizalar)` (boşsa basmaz) ve çok para birimli
  `paraSatir`. Gider ve kasa raporu ise `giderRaporu.js` içinde kendi `tablo`/`bosSatir`'ıyla ve düz
  `<h3>` başlıklarla çiziliyor. Aynı firmanın aynı ayına ait iki belge, iki ayrı dil.
- **Ayrı dosyada olmasının sebebi gizlilik.** 0047, rapor kurucusunu bilerek `printTemplates.js` dışına
  koydu: o dosyanın gider alanlarını okumasını yasaklayan kaynak taraması var. Bu yüzden ortaklaştırma
  **stilde** yapılmalı, veride değil: ortak modül yalnız çerçeve ve biçim üretmeli, hiçbir gider alanı
  adı taşımamalı (R3). Aksi hâlde ya tarama kırılır ya ortaklaştırma yapılamaz.
- **Geçen ay karşılaştırması zaten var ama öbür belgede.** Faaliyet raporu `rapor.onceki`'yi ikinci bir
  motor çağrısıyla üretip her satırın yanına soluk gri "geçen ay: X" yazıyor. Gider ve kasa raporunda
  bu hiç yok; oysa "bu ay geçen aya göre ne oldu" sorusu gider tarafında en az satış tarafı kadar
  anlamlı.
- **Veri zaten elde, gösterilmiyor.** Çek bölümü bugün yalnız sayı ve tutar yazıyor, oysa `cekAyOzeti`
  ay içindeki durum değişikliklerini biliyor; hesapsız kayıtlar yalnız sayıyla geçiyor, oysa 0051
  listeyi döndürüyor; vadesi geçmiş ve yaklaşan yalnız iki rakam, oysa `odemeHatirlatmalari` kalem kalem
  veriyor. Yani detay için yeni hesap gerekmiyor, var olanı basmak yetiyor (C2).
- **QA turu: iki iddia yanlış çıktı.** (1) Hesabı belirtilmemiş kayıtlar **zaten listeyle** basılıyor
  (`giderRaporu.js:207`, `:209`) ve personel ödemeleri ile avanslar birer toplu satıra iniyor (`:124-135`);
  R13 buna göre daraltıldı. (2) "Var olan listeler kullanılır" üç tablo için tutmuyor: `hareketOzeti`
  listeyi bilerek siliyor, tahsilat listesi hiç yok, `cekAyOzeti` yalnız sayı ve toplam döndürüyor (R21).
- **Gizlilik duvarının bu işte dokunduğu üç nokta ölçülmüş.** `tests/gider-gizlilik.test.js:71` kaynak
  taraması **`src/lib/giderRaporu.js`'i de** tarıyor ve personel hedef adlarını orada yasaklıyor; `:75-92`
  çıktı testi dört hedefli personel kalemi ve iki personel ödemesiyle belgeyi üretip o adları arıyor.
  Yani ödeme hareketleri tablosu hedef etiketini basarsa iş ilk koşuda kırmızı döner (R10 b).
- **Detayın tek gerçek riski gizlilik.** Kalem kalem listeler personel kalemlerini de içerir; her yeni
  tabloda personelin tek satıra toplanması şart (R15). 0047'nin çıktı temelli testi bu yüzden yeni
  tabloları da kapsamalı; kaynak taraması bu ayrımı yakalayamaz.

---

## Acceptance Criteria

### Sunum

- **AC-1.** Gider ve kasa raporunun bölümleri faaliyet raporuyla aynı kutu ve başlık şeridi biçimiyle
  çizilir.
- **AC-2.** İki belge aynı tablo ve alt başlık işaretlemesini ve aynı **sayı biçimini** kullanır; para
  birimi gösterimi her belgede bugünkü gibidir (R1).
- **AC-3.** Ortak yardımcılar tek modüldedir; iki belge de oradan besleniyor.
- **AC-4.** Ortak modül hiçbir gider alanı adı içermez, `gider-gizlilik.test.js`'in taranan dosya
  listesine eklenmiştir ve bütün kaynak taramaları yeşil kalır (R19).
- **AC-5.** Aylık faaliyet raporunun çıktısı bu işten önce ve sonra **birebir aynı dizedir** (R23).

### Karşılaştırma

- **AC-6.** Özet rakamların yanında geçen ayın değeri görünür.
- **AC-7.** Geçen ayın değerleri aynı motordan ve ay sonuna kilitli hesaplanır.
- **AC-8.** Karşılaştırılacak ay yoksa satırlar karşılaştırmasız basılır ve hata vermez.

### Detay

- **AC-9.** Vadesi geçmiş ve yaklaşan kalemler tek tek, vade ve gecikme günüyle listelenir; gecikme ay
  sonuna göredir ve bu belgede yazılıdır (R8).
- **AC-10.** Tedarikçi kırılımının altında o tedarikçinin kalemleri okunur.
- **AC-11.** Ayın ödeme hareketleri hesap, yöntem, kalem ve hedefiyle listelenir; tabloya yalnız `odeme`
  türü girer (R10 a).
- **AC-12.** Ayın tahsilat hareketleri hesap, kaynak, firma ve **para birimiyle** listelenir; hesapsız
  tahsilatlar bu tabloda değildir (R11).
- **AC-13.** Ay içinde tahsil, ciro ve karşılıksız olan çekler tek tek listelenir; liste motordan gelir
  ve aynı ay iptal edilen ciro sayılmaz (R21).
- **AC-14.** Hesabı belirtilmemiş kayıtların bugünkü iki listesi (ödeme ve tahsilat) satırları, sırası ve
  personel/avans toplamasıyla **aynı kalır**, yalnız ortak tablo biçimine geçer (R13).
- **AC-15.** Boş olan **yeni** detay tablosu hiç basılmaz; var olan bölümlerin boş durum açıklama satırları
  korunur (R14).

### Gizlilik ve koruma

- **AC-16.** Hiçbir detay tablosunda çalışan adı geçmez; hatırlatıcının `taraf` alanı personel satırında
  basılmaz ve `oge.kalem` hiç okunmaz (R8).
- **AC-17.** Personel kalemleri her tabloda tek satırda toplanır ve o satırın hedef hücresi boştur
  (R10 b); avans ve mahsup da birer toplu satırdır (R10 a).
- **AC-18.** Ayırt edici çalışan adı ve tutarla üretilen belgede bu değerler bulunmaz.
- **AC-19.** Raporun özet rakamları bu işten önce ve sonra aynıdır.
- **AC-20.** Aynı **girdiyle** iki çağrı birebir aynı HTML üretir; sıralamalar kararlıdır ve belge
  `new Date()` / `yerelBugun` okumaz (R24).

### QA turunda eklenenler (R1)

- **AC-21.** Geçen ayın hesabı `giderKasaRaporu` içinde yapılır; üç ekran aynı ay için aynı belgeyi üretir
  (R6).
- **AC-22.** Önceki ay yürürlük ayından önceyse karşılaştırma hiç basılmaz; yürürlükte ama kayıtsızsa
  sıfırla basılır (R7).
- **AC-23.** `hedefEtiketi` ve `cokHedefliMi` saf kitaplıktadır; `giderRaporu.js` hiçbir bileşen modülü
  içe almaz (R20, C7).
- **AC-24.** `GiderAlanlari.jsx` ikisini yeniden dışa verir; 0051 ve 0054 testleri değişmeden geçer (R20).
- **AC-25.** `hareketOzeti` ve `cekAyOzeti` parametresiz çağrıldığında bugünkü çıktıyı birebir verir
  (R21).
- **AC-26.** Aynı ay içinde iptal edilen ciro çek listesinde görünmez (kural yalnız `cek.js`'te durur,
  R21).
- **AC-27.** Tedarikçi kırılımının altındaki kalemler yeni bir hesapla değil mevcut kalem listesinden
  gruplanır (C2).
- **AC-28.** Ortak tabloya `<` içeren bir tedarikçi adı geçtiğinde çıktı ne bozulur ne iki kez kaçışlanır
  (R22).
- **AC-29.** Virman hareketleri ayrı tabloda, kaynak ve hedef hesabıyla listelenir (R10 a).
- **AC-30.** Çek portföyü bölümünün dört satırı hepsi sıfırken de basılır (X6).
- **AC-31.** Hatırlatıcı satırının tür adı `turMap`'ten çözülür; stopaj satırında tedarikçi "Vergi
  dairesi", tedarikçisiz kalemde "Tedarikçi seçilmemiş" yazar (R8).
- **AC-32.** Dört hedefli, ek ödemesi kısmen ödenmiş personel kalemiyle üretilen belgede hedef adlarının
  hiçbiri geçmez (mevcut `gider-gizlilik.test.js` AC-19 senaryosu yeni tablolarla da yeşil).

---

## Definition of Done

- [ ] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [ ] Ortak sunum modülü kuruldu; iki belgede kopya stil kalmadı (R2, AC-3).
- [ ] Ortak modül `tests/gider-gizlilik.test.js`'in taranan dosya listesine eklendi (R19, AC-4).
- [ ] `hedefEtiketi` ve `cokHedefliMi` `src/lib/odemeYontemi.js`'e taşındı, `GiderAlanlari.jsx` yeniden
      dışa veriyor; 0051 ve 0054 testleri değişmeden geçti (R20, AC-23, AC-24).
- [ ] `hareketOzeti` ve `cekAyOzeti` opt-in `liste` ile genişletildi; parametresiz çağrının çıktısı
      birebir aynı (R21, AC-25).
- [ ] Gizlilik kaynak taraması ve çıktı temelli testi birlikte yeşil; dört hedefli personel senaryosu yeni
      tablolarla da temiz (AC-4, AC-18, AC-32).
- [ ] Faaliyet raporunun çıktısının **dize olarak** değişmediği testle gösterildi (R23, AC-5).
- [ ] Rakamların ve hesapsız listelerin değişmediği çapraz testle gösterildi (AC-19, AC-14).
- [ ] Görsel kanıt eklendi (`docs/evidence/0059-*.jpg` + `0059-piksel-raporu.json`, yeni taban): araçtaki
      `gider-kasa-raporu-belge` ekranının farkı bilinçlidir ve yeni detay tablolarını gösterir (R23).
- [ ] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [ ] `CLAUDE.md` güncellendi: ortak sunum modülü, iki raporun aynı dili kullandığı, hedef etiketinin saf
      kitaplığa taşındığı, motorların opt-in `liste` genişlemesi ve personelin her tabloda tek satır
      olduğu (hedef hücresi boş).
- [ ] Takım Yöneticisi onayladı. Commit ve sürüm yayını yalnız açık talimatla.
- [ ] SCORECARD dolduruldu ve spec `specs/done/` klasörüne taşındı.

---

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Spec revizyon sayısı** | | Onaylandıktan sonra Requirements, Constraints veya Acceptance Criteria kaç kez değişti? |
| **Düzeltme turu sayısı** | | İş kaç kez geri döndü? |
| **Bulgu gerçek/gürültü oranı** | / | Gözden geçirmede çıkan bulgulardan kaçı gerçek sorundu? |
| **Regresyon sayısı** | | Bu iş yüzünden bozulan, daha önce çalışan davranış sayısı. |
| **Kaçan hata** | | Gerçek uygulamada sonradan bulunan hata sayısı. |

**Bu spec'ten çıkarılan ders:**
