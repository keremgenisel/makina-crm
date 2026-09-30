# 0044 — Servis, Extra Kalıp ve Yedek Parça Tahsilatlarının Hesaba Bağlanması

| | |
|---|---|
| **Durum** | Tamamlandı (2026-09-29; commit `66d73ff`, dal `feat/0044-tahsilat-hesap`; plan `specs/done/0044-uygulama-plani.md` Q1–Q13) |
| **Sahip** | Analist (spec) · geliştirme sahibi atanacak |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Kasa ekranı ve bakiye, servis / Extra Kalıp / yedek parça "ödendi" işaretleme, müşteri detayı, Stok alt sekmesi |
| **Bağımlı spec'ler** | 0024 (kasa ve ödeme hareketi, tamam) · 0040 (çek portföyü, tamam) |
| **Revizyon** | R1 (QA turu, 2026-09-29): 16 bulgu işlendi, 5'i bloklayıcıydı. En önemlisi, bakiyeye girecek tutarın formülü ve tek tahsilat kuralı yazıldı. R2 (2026-09-29, plan onayı): bayi aracılığıyla satılan kalıbın ve anlaşmalı servise satılan parçanın bedeli bizim kasamıza girer, "bize ait değil" yalnız anlaşmalı/dış servisin işçilik ücretidir (R14, AC-10/Q1); tutarın tek kaynağı aylık raporun tahsilat kalemi ortak modüle taşınır (R13/Q2); kartta satır tarihi `tahsilatTarihiOf` (R5/Q3); motor `bugun` alır (R15/Q4); Kasa'dan hesap atama için sunucu istisnası (R12/Q5); hesap penceresi (R2/Q6); bağlanan giriş noktaları (R2/Q7); ön seçim (R2, R9/Q8); `aliciAd` saf modülde (R10/Q9); hesapsız liste kapsamı (R6/Q10); imza (R15/Q11); makina kartı davranış değişikliği (R5/Q12); görsel kanıt (Q13). |

---

## Intent

Kasa ekranı bugün şunu yazıyor: "Bakiye yalnız kaydı olan hareketleri sayar. Servis, Extra Kalıp ve yedek
parça bedellerinin ödendi işareti ile hesabı belirtilmemiş ödemeler hiçbir hesaba girmez." Not dürüst ama
sonucu şu: bakiye gerçekte kasada ve bankada olandan **sürekli eksik**, çünkü fabrikanın günlük gelirinin
önemli bir kısmı tam da bu üç yerden geliyor. Eksik bakiye, bakılmayan bakiyedir.

Bu üç bölümün dışarıda kalması gelir sayılmamalarından değil, ödemelerinin bir **kayıt** değil bir **onay
kutusu** olmasından geliyordu: tutar var, ama paranın hangi hesaba girdiği hiçbir yerde yoktu. O günden
beri üç bölümün de tahsilat tarihi ve ödeme yöntemi alanı var; eksik olan tek şey hesap.

Başarı şu demek: "ödendi" işaretlenirken paranın hangi hesaba girdiği de söyleniyor, kasa bakiyesi bu
tahsilatları da sayıyor, ve hesabı söylenmemiş olanlar kaybolmuyor, ayrı bir listede bekliyor.

---

## Requirements

- **R1.** Servis, Extra Kalıp (`partSales`) ve yedek parça satışı kayıtlarında tahsilatın **hangi hesaba
  girdiği** saklanır.
- **R2.** "Ödendi" işaretlenirken hesap sorulur. En son kullanılan uygun hesap ön seçili gelir ve alan
  **boş bırakılabilir**; hesap bilinmiyor diye işaretleme engellenmez.
  **Uygulama (R2, Q6, Q7, Q8):** tek tıklık "Ödendi" anahtarı, kasa yetkisi varsa, bize ait tutar sıfırdan büyükse ve
  para birimi uyuyorsa küçük bir hesap penceresi açar ("Hesapsız kaydet" düğmesiyle); aksi hâlde bugünkü gibi hemen
  işaretler. Geri alma pencere açmaz. Formlarda seçici "Ödendi" kutusunun altında durur. Bağlanan giriş noktaları:
  müşteri detayı (üç anahtar ve üç form) ve Stok › Yedek Parça (anahtar ve form). Servis Panosu (ana pencere, kiosk,
  ayrı pencere) ve bayi detay formları hesap sormaz; oradan işaretlenen kayıt hesapsız listeye düşer. Ön seçili hesap:
  kaydın kendi hesabı varsa o (R9), yoksa aynı para birimindeki son tahsilatın hesabı (`sonTahsilatHesabi`, makina
  tahsilatları dahil); gider tarafındaki `sonKullanilanHesap` kullanılmaz.
- **R3.** Hesap seçenekleri kaydın para birimiyle aynı, açık hesaplardan gelir (bugün gider ödemesinde
  kullanılan `secilebilirHesaplar` kuralı). Uygun hesap yoksa alan boş kalır. **Kaydın para birimi
  tektir:** serviste `currency`, parça bedeli de aynı para biriminde sayılır (bugün `parcaCurrency` zaten
  servisin para birimiyle yazılıyor, `CustomerDetailModal.jsx:197`). Eski ya da bozuk bir kayıtta
  `parcaCurrency` farklıysa hesap sorulmaz, kayıt hesapsız kalır ve nedeni yazılır.
- **R4.** Hesap bakiyesi bu tahsilatları **uygulamanın mevcut gelir kurallarıyla** sayar: servis ücretinde
  ücretli ve Altuntaş servisi olma şartı, parça bedelinde anlaşmalı firma kuralı, kalıpta borcun tarafı
  kuralı. **Yeni bir gelir kuralı yazılmaz**, Finans ile aylık raporun kullandığı fonksiyonlar çağrılır.
- **R5.** **Paranın hesaba girip girmediği ve giriş tarihi tek kuralla belirlenir** ve bu kural bakiyenin
  bütün tahsilat kaynakları için aynıdır: çekte çek tahsil edilince, kredi kartında blokaj bitip para
  hesaba geçince, nakit ve havalede tahsilat tarihinde. Bugün `kasa.js` `tahsilatSayilirMi` yalnız çeki
  denetliyor (`p.yontem !== "Çek" || cekDurumuOf(p) === "tahsil"`), **kredi kartı blokajını denetlemiyor**
  ve bakiye satırının tarihini kaydın kendi `tarih` alanından alıyor. Bu iş kuralı tekleştirir:
  `tahsilatSayilirMi` kart blokajını da denetler (`kartTahsilEdildiMi`) ve satır tarihi
  `utils.tahsilatTarihiOf` ile belirlenir. **Bu, makina tahsilatlarının (`payments`) bakiyeye giriş
  davranışını da değiştirir ve bilinçli bir düzeltmedir:** bloke kart parası henüz bankada değildir. Mevcut
  bakiyeler bu yüzden değişebilir; C3 yalnız gelir rakamlarını korur, kasa bakiyesinin bilerek
  değiştiği burada yazılıdır.
  **Uygulama (R2, Q3, Q4, Q12):** kredi kartında satır tarihi de `tahsilatTarihiOf`'tur (aylık raporla aynı gün);
  kayıt bakiyeye blokaj bitince girer. Motor kart kontrolü için `bugun` alır. Makina tahsilatındaki davranış
  değişikliği testle sabitlenir ve sürüm notunda tek cümleyle duyurulur.
- **R6.** Hesabı belirtilmemiş tahsilat hiçbir bakiyeye girmez ve **ayrıca sayılır**. Sayım gelir tarafına
  ait **kendi saf fonksiyonundan** gelir (`hesapsizTahsilatlar`); gider tarafındaki `hesapsizOdemeler`
  değişmez, çünkü içinde iki bilinçli istisna var (ciro hareketleri hariç, 0040 R18; hesapsız avans ayrı
  sayılır, 0024 B4). Kasa ekranı iki ayrı satır gösterir: "hesabı belirtilmemiş ödemeler" ve "hesabı
  belirtilmemiş tahsilatlar". Bilgi notu buna göre yenilenir ve artık "hiç sayılmaz" demez.
  **Uygulama (R2, Q10):** liste silinmemiş, ödendi işaretli, bize ait tutarı sıfırdan büyük, para birimi uyumlu ve
  hesabı boş kayıtlardır; tahsil edilmemiş çek ve blokajı süren kart da listede kalır (hesap önceden atanır, bakiyeye
  tahsil edilince girer). Müşterisi silinmiş (sahipsiz) kayıt da sayılır: sahipsizlik rapordaki görünürlük kararıdır,
  kasadaki paranın değil.
  **Triyaj (2026-09-29):** hesabı bulunamayan ya da para birimi kaydınkiyle uyuşmayan hesaba bağlı kayıt da listelenir
  (bakiyeye giremediği için aksi hâlde hiçbir yerde görünmezdi); formda ve pencerede uyumsuz hesap seçili gelmez.
- **R7.** Hesabı belirtilmemiş tahsilatlar listelenir ve oradan hesap atanabilir.
- **R8.** Geçmiş kayıtlara **otomatik hesap atanmaz**; hepsi hesapsız başlar ve kullanıcı isterse atar.
- **R9.** "Ödendi" geri alınırsa tahsilat bakiyeden çıkar. **Hesap alanı temizlenmez**, korunur; yeniden
  işaretlenince aynı hesap ön seçili gelir. Bakiye zaten "ödendi" ve tahsil şartına baktığı için alanın
  silinmesi gereksizdir ve bir bilgiyi yok ederdi (0040'ta çekin geçmişini koruma kararıyla aynı çizgi).
- **R10.** Kasa ekranının hareket listesinde bu tahsilatlar kaynağıyla görünür. Satır türleri **"Servis
  tahsilatı"**, **"Extra Kalıp tahsilatı"**, **"Yedek parça tahsilatı"**; firma adı serviste ve kalıpta
  müşteri adı, yedek parçada `aliciAd(s, dealers, customers)` (bayi, müşteri ya da anlaşmasız dış firma).
  Satırın tarihi R5'in birleşik kuralından gelir; tutarı R13'ten.
  **Uygulama (R2, Q9):** `aliciAd` saf modüle (`lib/yedekParcaSatis.js`) taşınır, `TahsisModal` onu yeniden dışa verir.
- **R11.** Hareketi olan hesabın silinememesi kuralı bu tahsilatları da sayar.
- **R12.** Yeni izin tanımlanmaz. **Hesap alanı yalnız `kasaYetki` olan kullanıcıya çizilir** (Kasa ekranı
  gider ve finans sekmelerinin ikisini birden istiyor, 0024 C6); yetkisi olmayan kullanıcı "ödendi"
  işaretler ve kayıt hesapsız kalır, tıpkı perde inikken olduğu gibi (C6). Böylece hesap adları gider
  yetkisi olmayan kullanıcıya sızmaz.
  **Uygulama (R2, Q5):** Kasa'yı gören kullanıcının Müşteriler/Stok sekmesi olmayabilir; kayıt eklemeyen/silmeyen ve
  bu üç bölümde yalnız `hesapId` değiştiren yazım, Giderler **ve** Finans sekmesi olan kullanıcıya açılır
  (`tahsilatHesabiYalnizMi`, 0040 ciro istisnası deseni). Yeni izin tanımlanmaz.
- **R13.** **Bakiyeye giren tutar** = bize ait bedellerin toplamı **artı bunların KDV'si**, yani kasaya
  gerçekten giren brüt para. Serviste bu, bize ait servis ücreti ile bize ait parça bedelinin toplamı ve
  KDV'sidir (servis ücreti uygulamada KDV hariç giriliyor, KDV `calcKDV` ile üste ekleniyor). Extra Kalıp
  ve yedek parçada tutar zaten fatura tipine göre brüttür ve oradaki mevcut kural çağrılır. Formül
  `finansOzetiHesapla` ile `hesaplaAylikRapor`'un kullandığı aynı yardımcılardan kurulur, ikinci bir yerde
  tanımlanmaz (C2). Servis kaydında **tek** `odendi` bayrağı iki bedeli birlikte kapattığı için tek hesap
  alanı yeterlidir.
  **Uygulama (R2, Q2):** tutar ve tarih, aylık raporun tahsilat kalemini üreten kodun ortak modüle taşınmış hâlinden
  (`lib/satisTahsilat.js` `satisTahsilatKalemleri`) gelir; aylık rapor ve kasa aynı fonksiyonu çağırır.
- **R14.** **Bedel bize ait değilse hesap hiç sorulmaz.** Anlaşmalı bayinin ya da anlaşmasız dış servisin
  yaptığı işin ücretinde, bedeli bayiye ait kalıpta ve bize ait tutarı sıfır olan her kayıtta (ücretsiz
  kalıp, sıfır kargo bedeli, sıfır servis ücreti) alan çizilmez; yerine tek satır açıklama durur ("Bu bedel
  anlaşmalı firmaya ait, kasaya girmez"). Bu kayıtlar **hesapsız tahsilat sayısına da girmez**, çünkü eksik
  veri değil kapsam dışıdır; aksi hâlde liste hiç boşalmaz ve kullanıcı atayamayacağı kayıtları kovalar.
  **Uygulama (R2, Q1):** 0007'ye göre bayi aracılığıyla satılan kalıbın bedeli fabrikaya borçtur (borçlu bayi, alacaklı
  fabrika); ödendiğinde para bize gelir. Anlaşmalı servise satılan Altuntaş parçası da Finans ve aylık raporda bizim
  gelirimizdir. Bu yüzden kalıp ve parça bedeli kim öderse ödesin kasamıza girer ve hesap sorulur; "bize ait değil"
  yalnız anlaşmalı ya da dış servisin **işçilik ücretidir** (bilgi amaçlı). Ücretsiz kalıp ve sıfır tutar kapsam dışı
  kalır.
- **R15.** Saf motorun imzası **tek bir veri nesnesine** döner:
  `hesapBakiyeleri(hesaplar, hareketler, { payments, services, partSales, yedekParcaSatislar, customers,
  dealers, factory })`; `hesapKullanimi` aynı nesneyi alır ve R11 böylece üç kaynağı da kapsar. Motor
  React'sız kalır; ad çözümü için gereken diziler parametredir, görünüm katmanına kaçırılmaz (yoksa R10
  motor testiyle sabitlenemez).
  **Uygulama (R2, Q11):** üç argümanlı eski çağrı desteklenmez; mevcut testlerin çağrıları güncellenir.
- **R16.** Üç yeni alan çakışma birleştirmesinde **remap edilir**: `services.hesapId`,
  `partSales.hesapId`, `yedekParcaSatislar.hesapId` `src/lib/merge.js` `MERGE_KEYS` remap listesine girer
  (0024'ün `payments.hesapId` deseni) ve `merge.test.js` bunu kapsar. Remap edilmezse birleştirmeden sonra
  hesap kimliği başka bir hesabı gösterir ve bakiye sessizce yanlış olur.
- **R17.** Kasa ekranındaki bilgi notunun yeni metni: **"Bakiye, hesabı belirtilmiş hareket ve tahsilatları
  sayar. Hesabı belirtilmemiş kayıtlar aşağıda ayrıca listelenir."** Sabitin adı (`kasa.js` `HESAPSIZ_NOTU`)
  değişmez.

## Constraints

- **C1.** Hesaplar kuruş tamsayısıyla yapılır.
- **C2.** **Tek gerçek kaynak:** hangi bedelin bize ait olduğu sorusu `utils`'teki mevcut kurallardan
  okunur. Kasa için ikinci bir gelir tanımı yazılmaz (0007'de kalıp borcu için konan kuralın aynısı).
- **C3.** **Bu iş hiçbir gelir rakamını değiştirmez.** Finans ekranı, aylık rapor, borç özeti ve alacak
  toplamları aynı kalır. Koruma şudur: `aylikRapor.js` ve `Finance.jsx` `hesapId` alanını hiç okumaz
  (kaynak taraması), `finans-ozeti-export.test.js` ile `aylik-rapor.test.js`'in mevcut beklenen değerleri
  değişmeden geçer, ve yeni bir çapraz test hesap alanı dolu ile boş iki veri kümesinde
  `hesaplaAylikRapor` çıktısının birebir aynı olduğunu gösterir. **Kasa bakiyesi ise bilerek değişir**
  (R5: kart blokajı ve tarih kuralı tekleşiyor); C3 kasa bakiyesini korumaz.
- **C4.** Tahsilat yine bir **onay kutusudur**, ödeme kaydı değildir: kısmi tahsilat ve tek kayıtta birden
  çok yöntem bu işin kapsamında değildir (X1).
- **C5.** Maliyet ve kârlılık hesabı (0002) etkilenmez.
- **C6.** Gider modülünün yayın perdesi (0008) inikken Kasa ekranı kapalıdır; hesap alanı da o kullanıcıya
  sorulmaz ve kayıt hesapsız kalır.
- **C7.** Yeni kalıcı alanlar dört nokta kuralına uyar (üç bölüm, üç kolon) **ve çakışma
  birleştirmesinde remap edilir** (R16, `MERGE_KEYS`).
- **C9.** **Bakiyede tek tahsilat kuralı vardır** (R5). Kaynak başına ayrı bir "para girdi mi" kuralı
  yazılmaz; `tahsilatSayilirMi` bütün kaynaklar için tek yoldur. Aynı ekranda iki kural, "bakiye neden
  böyle" sorusunu cevaplanamaz hâle getirir.
- **C8.** Kullanıcıya görünen metinler Türkçedir.

### KAPSAM DIŞI

- **X1.** Bu üç bölümün ödemesini gerçek ödeme kaydına (hareket) çevirmek — *neden:* kısmi tahsilat, bir
  tahsilatın iki yöntemle alınması ve çek bağlama bunu gerektirir ama dört bölümün ödeme akışını ve Finans
  ekranını yeniden yazmak demektir. Takım Yöneticisi bu işi (Seçenek B) ayrı tuttu; ihtiyaç doğarsa kendi
  spec'iyle açılır.
- **X2.** Geçmiş kayıtlara hesap tahmini ya da toplu otomatik atama — *neden:* R8; uygulama kullanıcının
  bilmediği bir şeyi uydurmaz.
- **X3.** Çekle yapılan tahsilatın çek portföyüne bağlanması — *neden:* 0040'ın konusu. Burada yalnız
  "çek tahsil edilince bakiyeye girer" kuralı korunur.
- **X4.** Döviz hesaplar arası kur çevrimi ya da kur farkı — *neden:* 0024 C5 ile aynı çizgi; farklı para
  birimi farklı hesaptır.
- **X5.** Müşteri makina tahsilatı (`payments`) tarafında değişiklik — *neden:* orada hesap alanı zaten var
  ve bakiyeye giriyor.
- **X6.** Nakit akış tahmini, banka mutabakatı — *neden:* 0024 X1 ve X5 sürüyor.

---

## Context

- **Bugün ne sayılıyor.** `kasa.hesapBakiyeleri(hesaplar, hareketler, payments)` iki kaynaktan besleniyor:
  gider tarafındaki hareket kayıtları (ödeme, avans, virman) ve müşteri makina tahsilatları (`payments`).
  Üçüncü kaynak, yani servis, Extra Kalıp ve yedek parça bedelleri hiç girmiyor. Bu, 0024 X3'te bilinçli
  bırakılmış bir sınırdı ve o gün "bakiye gerçek bakiyeden bu tahsilatlar kadar eksik kalır" diye
  yazılmıştı. Kullanıcı bunu kullanımda gördü ve yetersiz buldu; karar bu spec'le geri açılıyor.
- **Neden o gün pahalıydı, bugün ucuz.** O gün bu üç bölümde ödemenin tarihi bile yoktu. Bugün üçünde de
  `tahsilatTarihi` ("ödendi" tıklandığı gün yazılıyor) ve `yontem` alanı var, çek ile kredi kartının ne
  zaman gerçekten hesaba geçtiğini söyleyen kurallar (`cekDurumuOf`, kart blokajı) kurulmuş durumda.
  Geriye yalnız "hangi hesaba" sorusu kalıyor: bölüm başına bir kolon.
- **Her "ödendi" bizim paramız değil (bu işin en kritik noktası).** Anlaşmalı bayinin ya da anlaşmasız dış
  servisin yaptığı işte servis ücreti bizim gelirimiz değil; parça bedeli de o firmaya ait olabiliyor
  (`isServisUcretliMi`, `isAltuntasServisi`, `isParcaBorcluAnlasmaliFirmaya`). Kalıpta borcun kime ait
  olduğu 0007'de `kalipBorcTarafi` ile tek kaynağa bağlandı. Bütün "ödendi" işaretlerini toplayan bir
  bakiye, kasada olmayan parayı gösterir. R4 bu yüzden kuralları yeniden yazmayı değil, çağırmayı şart
  koşuyor.
- **Servis kaydında iki bedel, tek bayrak var (doğrulandı).** Servis ücreti ile parça ücreti aynı kayıtta
  duruyor ve hangisinin bize ait olduğunu yukarıdaki kurallar belirliyor. **Tek bir `odendi` bayrağı ikisini
  birlikte kapatıyor ve tek bir `tahsilatTarihi` yazılıyor** (`CustomerDetailModal.jsx:229-233`); kodda
  ikinci bir "parça ödendi" anahtarı **yok** (CLAUDE.md'de `toggleParcaOdendi` diye anılan işlev bulunmuyor,
  o cümle güncellenecek). Bu yüzden kayıt düzeyinde tek hesap alanı yeterlidir; iki bedelin ayrı hesaplara
  girmesi bu işin kapsamında değildir ve gerçekte de aynı tahsilatta olur.
- **Bugünkü tahsilat kuralı eksik (doğrulandı).** `kasa.js:34`
  `tahsilatSayilirMi = (p) => !p.deletedAt && p.hesapId != null && (p.yontem !== "Çek" || cekDurumuOf(p) === "tahsil")`
  yalnız çeki denetliyor; **kredi kartı blokajı denetlenmiyor** ve bakiye satırı kaydın kendi `tarih`
  alanına düşüyor, `tahsilatTarihiOf`'a değil. Üç yeni kaynağa daha sıkı bir kural getirmek aynı bakiyede
  iki kural demek olurdu; R5 bu yüzden kuralı tekleştiriyor ve mevcut kolu da düzeltiyor.
- **Motorun bugünkü imzası dar (doğrulandı).** `hesapBakiyeleri(hesaplar, hareketler, payments)` ve
  `hesapKullanimi(hesapId, hareketler, payments)` üç argüman alıyor. Üç yeni kaynak ve R10'daki firma adı
  çözümü yeni girdiler istiyor; R15 imzayı tek veri nesnesine çeviriyor.
- **Hesapsız kalan kayıtların emsali var.** Gider tarafında `hesapsizOdemeler` zaten "hesabı belirtilmemiş"
  ödemeleri sayıp ekranda gösteriyor. R6 ve R7 aynı deseni gelir tarafına taşıyor; kullanıcı yeni bir
  kavram öğrenmiyor.
- **Sıra sorunu kalmadı.** 0040 (çek portföyü) **tamamlandı** (commit `740c876`) ve `tahsilatSayilirMi`
  çek kuralını `cekDurumuOf` ile zaten uyguluyor; çekle yapılan tahsilatın davranışı ilk günden doğrudur.
  Çekin portföye bağlanması yine kapsam dışıdır (X3).

---

## Acceptance Criteria

- **AC-1.** Servis "ödendi" işaretlenirken hesap seçilebilir ve seçim kaydedilir.
- **AC-2.** Extra Kalıp satışı "ödendi" işaretlenirken hesap seçilebilir ve seçim kaydedilir.
- **AC-3.** Yedek parça satışı "ödendi" işaretlenirken hesap seçilebilir ve seçim kaydedilir.
- **AC-4.** Hesap seçilen tahsilat kadar o hesabın bakiyesi artar.
- **AC-5.** Hesap seçenekleri kaydın para birimiyle aynı hesaplardan gelir.
- **AC-6.** En son kullanılan uygun hesap ön seçili gelir.
- **AC-7.** Hesap boş bırakılarak "ödendi" işaretlenebilir ve kayıt hesapsız listede görünür.
- **AC-8.** Hesapsız listeden hesap atanınca bakiye artar ve kayıt listeden çıkar.
- **AC-9.** Anlaşmalı bayinin yaptığı servisin ücreti hiçbir hesabın bakiyesine girmez.
- **AC-10.** (R2 ile değişti, Q1) Bayi aracılığıyla satılan kalıbın bedeli bayiden tahsil edilince bizim bakiyemize girer
  (0007: borçlu bayi, alacaklı fabrika).
- **AC-11.** Çekle ödenen servis, çek tahsil edilene kadar bakiyeye girmez; tahsil edilince girer.
- **AC-12.** Kredi kartıyla ödenen tahsilat, blokaj bitip para hesaba geçtiği tarihte bakiyeye girer. Bu
  kural **makina tahsilatları (`payments`) için de** geçerlidir; kural tektir.
- **AC-13.** "Ödendi" geri alınınca tahsilat bakiyeden çıkar; hesap alanı korunur ve yeniden işaretlendiğinde
  aynı hesap ön seçili gelir.
- **AC-14.** Kasa ekranının hareket listesinde tahsilat türüyle ("Servis tahsilatı" / "Extra Kalıp
  tahsilatı" / "Yedek parça tahsilatı") ve firma adıyla görünür; yedek parçada ad `aliciAd` ile çözülür.
- **AC-15.** Bu tahsilatı olan hesap silinemez.
- **AC-16.** Kasa ekranındaki bilgi notu R17'deki metindir ve bu üç bölümü "hiç sayılmaz" diye anmaz.
- **AC-17.** Finans ekranının gelir, alacak ve tahsilat rakamları bu işten önce ve sonra aynıdır;
  `finans-ozeti-export.test.js` mevcut beklenen değerleriyle geçer.
- **AC-18.** Aylık faaliyet raporunun rakamları bu işten önce ve sonra aynıdır; hesap alanı dolu ve boş iki
  veri kümesinde `hesaplaAylikRapor` çıktısı birebir aynıdır ve `aylikRapor.js` ile `Finance.jsx` `hesapId`
  alanını hiç okumaz.
- **AC-19.** Hesap alanları veritabanına yazılıp geri okunur (kapanıp açıldığında kaybolmaz).
- **AC-20.** Yayın perdesi inikken hesap sorulmaz ve kayıt hesapsız kalır.
- **AC-21.** Bakiyeye giren tutar brüttür: bize ait bedeller ve KDV'si; net tutar girmez.
- **AC-22.** Bize ait bedeli olmayan kayıtta (anlaşmalı firma, ücretsiz kalıp, sıfır tutar) hesap alanı
  çizilmez ve açıklama satırı görünür.
- **AC-23.** Bu kayıtlar hesabı belirtilmemiş tahsilat sayısına girmez.
- **AC-24.** Hesabı belirtilmemiş tahsilatlar, gider tarafındaki "hesabı belirtilmemiş ödemeler"den **ayrı**
  sayılır ve Kasa ekranında iki ayrı satır olarak görünür.
- **AC-25.** Ciro hareketlerinin hesapsız ödeme listesinden hariç tutulması (0040 R18) ve hesapsız avansın
  ayrı sayılması (0024 B4) bu işten sonra da aynen çalışır.
- **AC-26.** `hesapKullanimi` üç yeni kaynağı da sayar; yalnız servis tahsilatı olan hesap da silinemez.
- **AC-27.** Kaydın `parcaCurrency` alanı servisin para biriminden farklıysa hesap sorulmaz ve neden yazılır.
- **AC-28.** `kasaYetki` olmayan kullanıcıya hesap alanı çizilmez; "ödendi" işaretlenebilir ve kayıt
  hesapsız kalır.
- **AC-29.** Çakışma birleştirmesinden sonra üç bölümün `hesapId` alanı doğru hesabı gösterir (remap).
- **AC-30.** Motor tek veri nesnesiyle çağrılır ve ad çözümü motorda yapılır (R10 motor testiyle sabitlenir).

## Definition of Done

- [x] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [x] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [x] Bakiye hesabı saf motorda (`kasa.js`) genişletildi; ekranlar yalnız çiziyor.
- [x] Gelir kuralları çağrıldı, yeniden yazılmadı; kaynak taraması testi bunu sabitliyor (C2, R4).
- [x] Gelir rakamlarının değişmediği çapraz testle ve kaynak taramasıyla gösterildi (AC-17, AC-18).
- [x] Tahsilat kuralı tekleştirildi: `tahsilatSayilirMi` kart blokajını da denetliyor, satır tarihi
      `tahsilatTarihiOf`'tan geliyor ve makina tahsilatı kolunun davranış değişikliği testle sabitlendi
      (AC-12, R5). Bu değişiklik sürüm notunda tek cümleyle duyurulur (metin planda, §6).
- [x] Hesapsız tahsilat sayımı gider tarafından ayrı bir saf fonksiyondadır; 0040 R18 ve 0024 B4
      istisnaları bozulmadı (AC-24, AC-25).
- [x] Üç yeni alan `MERGE_KEYS` remap listesine eklendi ve `merge.test.js` kapsıyor (AC-29, R16).
- [x] Üç yeni kolon dört noktada eklendi; roundtrip ve temiz kurulum testleri kapsıyor (AC-19).
- [x] Görsel kanıt eklendi (`docs/evidence/0044-*.jpg`): hesap seçimli ödendi işaretleme, hesapsız
      tahsilat listesi, yenilenmiş bilgi notu; aydınlık ve karanlık tema.
- [x] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [x] `CLAUDE.md` güncellendi: bakiyenin üçüncü kaynağı, bakiyeye giren tutarın brüt olduğu, tek tahsilat
      kuralı (kart blokajı dahil) ve "her ödendi bizim paramız değil" kuralı yazıldı; ayrıca müşteri
      detayındaki `toggleParcaOdendi` cümlesi düzeltildi (kodda böyle bir işlev yok, serviste tek `odendi`
      bayrağı var).
- [x] Takım Yöneticisi onayladı. Commit ve sürüm yayını yalnız açık talimatla.
- [x] SCORECARD dolduruldu ve spec `specs/done/` klasörüne taşındı.

---

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Spec revizyon sayısı** | 1 | R2 plan onayı anında işlendi (AC-10 0007 ile çeliştiği için yeniden yazıldı). Onaydan sonra triyaj notu eklendi: hesabının para birimi uyuşmayan ya da bulunamayan tahsilat da hesapsız listede görünür (R6). Onaylandıktan sonra Requirements, Constraints veya Acceptance Criteria kaç kez değişti? |
| **Düzeltme turu sayısı** | 1 | Bir triyaj turu (2 bulgu). İş kaç kez geri döndü? |
| **Bulgu gerçek/gürültü oranı** | 2 / 0 | Uyumsuz hesaba bağlı kalan tahsilatın ne bakiyede ne listede görünmemesi (gerçek, R6'nın başarı tanımıyla çelişiyordu); AC-17 ve AC-25'in kendi adlı testlerinin olmaması (DoD eksiği). Gözden geçirmede çıkan bulgulardan kaçı gerçek sorundu? |
| **Regresyon sayısı** | 0 | Makina tahsilatında kart blokajı kuralı bilinçli davranış değişikliğidir (R5, testli, sürüm notunda). Bu iş yüzünden bozulan, daha önce çalışan davranış sayısı. |
| **Kaçan hata** | 0 | Kapanış anında bilinen yok. Gerçek uygulamada sonradan bulunan hata sayısı. |

**Bu spec'ten çıkarılan ders:** Bir kaydı iki listeye (bakiye ve "eksik veri") bölen her süzgeç, iki koşulun tümleyen olduğunu ayrıca sınamalı: bakiye "hesap var ve para birimi uyuşuyor" derken eksik listesi yalnız "hesap yok" diyordu, aradaki kayıt sessizce kayboldu. R9'un hesabı koruma kararı bu boşluğu normal kullanımla erişilebilir kıldı; korunan her alan, sonradan değişen komşu alanla (burada para birimi) birlikte düşünülmeli. İkincisi: bir spec ilk gün başka bir tamamlanmış spec'in kuralını (0007 kalıp borcu) yanlış okuyabiliyor; planda "bağlı spec'lerle çelişki" taraması bunu R2'de yakaladı.
