# 0151 — Kasa hesabının bakiyesi düzeltme hareketiyle ayarlanır

| | |
|---|---|
| **Durum** | Onaylandı (Takım Yöneticisi, 2026-11-20); uygulandı, commit bekliyor |
| **Revizyon** | 3 (2026-11-20 plan onayı: P1–P10; plan `specs/0151-uygulama-plani.md`) |
| **Sahip** | Analist (yazım) |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Kasa ekranı (hesap listesi, hesap hareketleri, hesap silme ve taşıma penceresi), çöp kutusu, yedek geri yükleme, kilit alanları, işlem geçmişi, Aylık Gider ve Kasa Raporu |
| **Bağımlı spec'ler** | 0024, 0044, 0047, 0052, 0056, 0064, 0073, 0078 |
| **QA turu** | 2026-11-20: 25 bulgu (5 Bloklayıcı / 13 Önemli / 7 Küçük), hepsi onaylandı |
| **Düzeltilen iddialar** | 3 (bakiye motorunun satırı ve bakiyeye dokunan kol sayısı, "döviz ek kural istemez", etkilenen alanlar listesi) |

---

## Intent

Kasa bakiyeleri hareketlerden hesaplanıyor ve doğrudan yazılamıyor; ekranda yazan tek çare "başlangıç
rakamını açılış bakiyesiyle ayarlayın". Fabrika uygulamayı yeni kullanmaya başladığı için hesaplarda
deneme kayıtları var, bazı ödemeler iki kez girilmiş, bazıları hiç girilmemiş. Bugün bakiyeyi
gerçeğe çekmenin tek yolu açılış bakiyesini elle kaydırmak, yani geçmişin tamamını yalanlamak ya da
hangi hareketin eksik olduğunu tek tek avlamak. İkisi de yapılmıyor, bakiyeler yanlış kalıyor ve
Kasa ekranı güvenilmez hâle geliyor.

Bu iş bittiğinde kullanıcı bir hesabın bakiyesini "şu anda şu kadar olmalı" diyerek düzeltebilecek:
uygulama aradaki farkı kendi kaydı olarak yazacak. Bakiye yine hareketlerden hesaplanmaya devam
edecek, düzeltmenin ne zaman, kim tarafından ve ne kadar yapıldığı kayıtta duracak, açılış bakiyesi
ve geçmiş hareketler olduğu gibi kalacak.

---

## Requirements

- **R1.** Kullanıcı bir kasa hesabının bakiyesini hedef rakamı yazarak düzeltebilir; uygulama
  bugünkü bakiye ile hedef arasındaki farkı tek bir **bakiye düzeltme hareketi** olarak kaydeder.
- **R1/2.** Düzeltmenin yönü kayıtta ayrı alanda taşınır: tür `duzeltme`, `tutar` her zaman pozitif, yön `yon` alanında (`giren` ya da `cikan`). Eksi tutarlı kasa hareketi yazılmaz.
- **R1/3.** Kredi kartı hesabında alanın adı "Hedef borç"tur ve girilen değer borç olarak okunur (açılış bakiyesi emsali: saklanan bakiye negatiftir); öteki hesap türlerinde alan "Hedef bakiye"dir.
- **R1/4.** Fark, hesabın **toplam** bakiyesi ile hedef arasındaki farktır (bakiye motorunun hesap başına verdiği bakiye); düzeltmenin tarihi yalnız satırın etiketidir, farkın tabanı değildir.
- **R1/5.** Fark kayıt anında güncel hareketlerle yeniden hesaplanır; pencerede görünen rakam önizlemedir.
- **R1/6.** Hedef ile bugünkü bakiye kuruş tamsayısıyla karşılaştırılır; kuruşta eşitse kayıt yazılmaz.
- **R1/7.** Düzeltme düğmesi seçili hesabın hareket kartının başlığındadır ("Bakiyeyi Düzelt"); hiç hareketi olmayan hesapta da görünür, kapalı hesapta pasif ve nedenlidir. Pencere veri girme penceresi ölçüsündedir.
- **R1/8.** Pencere üç satır gösterir: bugünkü bakiye (salt okunur), hedef (girdi), hesaplanan fark ve yönü. Ekran çarpma ya da çıkarma yazmaz, rakamlar motordan gelir.
- **R2.** Düzeltme hareketi bakiyeyi artırabilir ya da azaltabilir.
- **R2/2.** Negatif hedef bakiye kabul edilir; kasa türünde engellemeyen bir uyarı yazılır.
- **R2/3.** Bir hesaba birden çok düzeltme girilebilir, aynı güne ikinci düzeltme de serbesttir; ikinci düzeltmenin farkı birincisini içeren bakiyeden hesaplanır.
- **R3.** Bakiye hesaplanmaya devam eder: düzeltme de bir harekettir, saklanan bir bakiye alanı
  doğmaz.
- **R4.** Düzeltme hareketi bir hesaba bağlıdır; hesapsız düzeltme yapılamaz.
- **R4/2.** Düzeltme hesapsız bırakılamaz: hesap silinirken taşıma yolu düzeltmeyi hedef hesaba taşır, "hesapsız bırak" yolu kaydın tarihi ve tutarıyla nedenlenerek engellenir. Hesap kullanım kırılımında düzeltmenin kendi sayacı ve kendi satırı vardır.
- **R4/3.** Hesabı çöpe atılmış ya da bulunamayan düzeltme Kasa'nın "hesabı belirtilmemiş kayıtlar" listesinde görünür ve ayrıca sayılır; hiçbir bakiyeye girmeyen kayıt en az bir listede durur.
- **R5.** Düzeltme hareketi hesabın para biriminde okunur: döviz hesabın düzeltmesi o dövizdedir.
- **R5/2.** Tutar alanının sembolü hesabın para biriminden gelir ve pencere başlığı hesabın adını ve para birimini yazar.
- **R6.** Düzeltme hareketi **hiçbir gider kalemini kapatmaz**, borç ve alacak toplamlarına,
  gelire, gidere, tedarikçi ve çalışan ekstrelerine girmez. Yalnız hesabın bakiyesini değiştirir.
- **R6/2.** Düzeltme hesabın giren ve çıkan toplamlarına girer (bakiye bu ikisinin türevidir); gider, gelir, borç ve alacak toplamlarına girmez. Hesap kartının başlığı düzeltme varsa bunu tek ibareyle söyler.
- **R7.** Düzeltme hareketi silinebilir; silinince bakiye düzeltmeden önceki hâline döner.
- **R7/2.** Düzeltme düzenlenmez, yalnız silinir: satırda Düzenle düğmesi çizilmez ve nedeni tek sabit metinle yazar.
- **R8.** Düzeltme hareketi çöp kutusuna gider ve öteki kasa hareketleri gibi geri alınabilir.
- **R8/2.** Çöp kutusu satırının türü "Bakiye düzeltmesi"dir ve tutarı hesabın para biriminde yazılır.
- **R9.** Düzeltmenin tarihi ve açıklaması girilebilir; tarih varsayılan olarak bugündür.
- **R9/2.** Gelecek tarihli düzeltme reddedilir; tarih kutusunun üst sınırı yerel bugündür.
- **R9/3.** Açıklama isteğe bağlıdır, kırpılır ve boşsa kayda yazılmaz; düzeltme ödeme yöntemi taşımaz.
- **R10.** Düzeltme yapmak Kasa hesaplarını yönetme iznine bağlıdır ve işlem geçmişine yazılır.
- **R10/2.** Düzeltmenin izni `kasa_hesap`'tır ve aynı kural beş yerde birlikte yazılır: sunucunun tür → izin eşlemesi, var olan kaydın düzenleme izni, Kasa sekmesi şartı, Kasa ekranının satır yetkisi ve çöp kutusunun geri alma ile kalıcı silme kapısı (çöp satırı ayrıca kasa veri yetkisi ister).
- **R10/3.** Düzeltmenin kilit alanı hesabın kendisidir (`kasa_hesap` ve hesap kimliği); pencere açılışta kilidi alır, satırdan silme anlık bakar ve pencere dosyası kilit alanları listesine yazılır.
- **R10/4.** İşlem geçmişi kaydı var olan `kasa_hareketi` türüyle yazılır; eylem `bakiye_duzeltildi`, silmede `silindi`, ad hesabın adı, ayrıntı tutar, yön, tarih ve para birimi. Etiket haritasına Türkçe karşılığı eklenir; silme onayı ve bildirimi düzeltmenin kendi metnini ve hesabın para birimini kullanır.
- **R11.** Aylık Gider ve Kasa Raporu'nda ayın bakiye düzeltmeleri görünür; bakiyedeki değişim
  açıklamasız kalmaz.
- **R11/2.** Rapor düzeltmeyi iki yerde yazar: HAREKETLER özet tablosuna "Bakiye düzeltmesi" satırı (adet ve tutar; tablonun "hareket yok" koşuluna da katılır) ve koşullu `BAKİYE DÜZELTMELERİ` tablosu (tarih, hesap, yön ve para birimli tutar; düzeltme olmayan ayda hiç basılmaz). Açıklama basılmaz.
- **R12.** Hesap formundaki açılış bakiyesi ve ipucu bugünkü gibi kalır; düzeltme ikinci bir yoldur,
  açılış bakiyesinin yerini almaz.
- **R12/2.** Düzeltme hesabın kullanımıdır: yalnız düzeltmesi olan hesap deneme dönemi dışında silinemez, kapatılabilir; hesap satırındaki hareket sayısı düzeltmeyi de sayar.

---

## Constraints

### Uyulması zorunlu

- **C1.** Bakiye türetilmiş kalır (0024 R7): hiçbir yere saklanmış bakiye yazılmaz, ekranlar
  bakiyeyi bugünkü motordan okur.
- **C2.** Düzeltme yeni bir hareket **türüdür**; var olan türlerin (ödeme, virman, avans, mahsup)
  kuralları, doğrulamaları ve izinleri değişmez.
- **C2/2.** Tür adı tek sabittir ("Bakiye düzeltmesi"); çöp kutusu etiketi ve rapor onu okur, ekranda ikinci kez yazılmaz.
- **C3.** Gider tarafı düzeltmeyi görmez: ödeme durumu türetmesi, borç özeti, açık kalemler, ödeme
  hatırlatıcısı ve ekstreler bugünkü kümelerle çalışır.
- **C4.** Yeni kalıcı alan gerekiyorsa dört nokta kuralı uygulanır ve `db-roundtrip` testine eklenir;
  yeni veri bölümü açılmaz (düzeltme `hesapHareketleri` bölümünün bir kaydıdır).
- **C4/2.** Yeni `yon` alanı dört nokta kuralıyla açılır ve okumada boş değer kayıt gövdesine yazılmaz; düzeltmesiz veride hareket bölümünün gövdesi spec öncesiyle birebir kalır.
- **C5.** Yeni izin kimliği açılmaz: düzeltme Kasa ekranına özgü bir kayıttır ve hesap yönetimi
  izniyle yapılır; sunucu da aynı izni arar.
- **C5/2.** Kasa sekmesi olmayan kullanıcının yedek geri yüklemesi bakiye düzeltmelerini bugünkü hâliyle korur (0052 R19'un virman ve avans kuralı düzeltmeyi de kapsar), yoksa kaydın tamamı reddedilir.
- **C6.** Çöp kutusu simetrisi korunur: geri alma, kalıcı silme ve otuz günlük temizlik düzeltme
  hareketini de kapsar.
- **C7.** Tek yazma yolu korunur (0073 R20): düzeltme de hareketleri yazan ortak yoldan geçer.

### KAPSAM DIŞI

- **X1.** Düzeltme hareketinin düzenlenmesi — *neden:* bakiyeyi yeniden düzeltmek aynı sonucu
  verir ve daha anlaşılırdır; silme yolu zaten var.
- **X2.** Banka ekstresi okuyup farkları otomatik bulma — *neden:* ayrı ve çok daha büyük iş.
- **X3.** Hareketleri toptan silen "deneme verisini temizle" aracı — *neden:* gerçek veriye
  geçildikten sonra tek tıkla veri kaybı riski; düzeltme hareketi aynı ihtiyacı izini bırakarak
  karşılıyor.
- **X4.** Düzeltme farkının gider ya da gelir olarak yazılması (sayım farkı muhasebesi)
  — *neden:* bu iş bakiyeyi düzeltir, kâr zarara dokunmaz; istenirse ayrı spec.
- **X5.** Düzeltmenin yalnız deneme döneminde açık olması — *neden:* banka mutabakatında kalıcı
  olarak da gerekir; deneme dönemi kapanınca kaybolması yeni bir kusur olur.
- **X6.** Makina tahsilatı, servis, Extra Kalıp ve yedek parça tahsilatlarının bakiyeye katılma
  kuralları — *neden:* değişmiyor (0044).
- **X7.** Kredi kartı hesabının alacaklı (pozitif) bakiyesinin düzeltilmesi — *neden:* kart bakiyesi ekranda yalnız borç olarak okunuyor, "hedef borç" alanı pozitif alacağı ifade edemez (R1/3); gerekirse ayrı spec.
- **X8.** Raporun HAREKETLER özet tablosunda para birimlerinin ayrışması — *neden:* tablo bugün virman tutarlarını da tek toplamda sayıyor, düzeltmesi bu işin dışında; ayrıntı tablosu para birimini yazar (R11/2).
- **X9.** Geçmiş tarihli düzeltmede ara satırların yürüyen bakiyesinin hedefe çekilmesi — *neden:* fark toplam bakiyeden hesaplanır (R1/4), yalnız son bakiye hedefe eşittir; geçmişin yeniden yazılması bu işin amacı değil.

---

## Context

**Bugünkü kural ekranda yazılı.** `src/components/Kasa.jsx:36` `ACILIS_BAKIYE_IPUCU`: "Bakiye
hareketlerden hesaplanır, doğrudan yazılamaz; bir hesabın başlangıç rakamını açılış bakiyesiyle
ayarlayın." Açılış bakiyesi hareketli hesapta da düzenlenebiliyor (`kasa.hesapDogrula`,
`src/lib/kasa.js:22-35`; yalnız para birimi kilitli), yani bugünkü tek çare geçmişi kaydırmaktır.

**Bakiye nasıl kuruluyor (QA turunda düzeltildi).** `kasa.hesapBakiyeleri` her hesap için açılış +
tahsilat − ödeme ± virman ile yürüyen bakiye üretir; fonksiyon `src/lib/kasa.js:70`'te başlıyor (`:74`
tablonun doldurulduğu satır). Asıl yük tür listesinde değil, **bakiyeye dokunan üç kolda**
(`:76-85`): `odeme` ve `avans` çıkar, `virman` iki hesaba yazılır, `mahsup` bakiyeye hiç girmez. Yani
düzeltme "dört türe eklenecek bir ad" değildir, bakiye motoruna yazılacak dördüncü koldur; yazılmazsa
kayıt doğar ama bakiye değişmez.

**Para birimi motorda sorun değil, metinlerde sorun (QA turunda düzeltildi).** Motor tutarı hesabın
para biriminden bağımsız topluyor, bu doğru; ama "döviz ek bir kural istemez" iddiası yanlış: çöp
kutusu etiketi tutarı `fmtCur(..., "TRY")` ile sabit ₺ basıyor (`src/lib/copKutusu.js:18`), Kasa'nın
silme onayı da (`Kasa.jsx:760`), raporun HAREKETLER özet tablosu ise para birimlerini tek toplamda
sayıyor. R5 bu üç yeri de kapsar (R5/2, R8/2, R10/4, R11/2, X8).

**Hareket türleri ve izinleri.** Bugün dört tür var: `odeme`, `virman`, `avans`, `mahsup`
(`kasa.js:140`). Sunucu izni türe göre seçiyor: `electron/serverAuth.cjs:594`
`hareketIzni` → virman `virman`, avans `avans`, diğerleri `gider_odeme`; Kasa ekranına özgü kayıtlar
ayrıca Kasa sekmesi istiyor (`:603` `KASA_SEKMELI_KAYITLAR`). Düzeltme bu iki listeye girecek.

**Tutarlar bugün pozitif.** Hareketlerin tutarı her yerde pozitif okunuyor (`kurus(m.tutar)`),
yönü türünden geliyor (ödeme çıkar, tahsilat girer). Düzeltme iki yöne de gidebildiği için yön
bilgisinin kayıtta taşınması gerekir; çözümü uygulama planı seçer, ama eksi tutar yazmak bugünkü
okuyucuları (rapor toplamları, çöp kutusu etiketi `copKutusu.js:18`) sessizce bozabilir.

**Çöp kutusu ve rapor bağları.** Hareketler 0078'den beri çöp kutusuna gidiyor ve etiketleri
`src/lib/copKutusu.js:17` `HAREKET_COP_TUR` haritasından geliyor (dört tür yazılı); yeni tür
oraya eklenmezse satır ham anahtarıyla görünür. Aylık Gider ve Kasa Raporu ayın hareketlerini
`kasa.hareketOzeti` ile sayıyor (dört tür + tahsilat); düzeltme eklenmezse rapordaki bakiye değişimi
açıklamasız kalır (R11).

**Birleştirme ve yedek.** `hesapHareketleri` zaten `MERGE_KEYS`'te ve "Giderler" yedek paketinde;
yeni tür ek bir bağ istemez. İşlem geçmişi etiketleri `SettingsAuditLog`'da yazılı olmalıdır,
yoksa kayıt ham anahtarıyla görünür (spec 0068 kuralı).

### QA turunda ölçülenler (2026-11-20)

Hepsi bugünkü HEAD'de ölçüldü; kararların dayanağı bunlar.

| | Ölçüm |
|---|---|
| **A** | `src/components/Kasa.jsx:36` `ACILIS_BAKIYE_IPUCU` metni spec'te yazıldığı gibi; ekranda `:79` `acilis-bakiye-ipucu` ile çizilir. |
| **B** | `src/lib/kasa.js:22-35` `hesapDogrula`: hareketli hesapta yalnız para birimi kilitli, açılış bakiyesi serbest; kartta `-Math.abs(acilis)` saklanır. |
| **C** | `src/lib/kasa.js:70` `hesapBakiyeleri`; bakiyeye dokunan üç kol `:76-85`, `mahsup` yok. |
| **D** | `src/lib/kasa.js:140` `hareketOzeti` dört türü sabit sayar (`odeme`, `virman`, `avans`, `mahsup`). |
| **E** | `electron/serverAuth.cjs:594` `hareketIzni` tanımadığı türe `gider_odeme` döndürür; `:595` `KAYIT_DUZENLE_IZINLERI` aynı fonksiyonu kullanır. |
| **F** | `electron/serverAuth.cjs:601` `KASA_SEKMELI_HAREKETLER` yalnız `virman` ve `avans`; `:603` `KASA_SEKMELI_KAYITLAR` bölüm başına ölçüt tutar. |
| **G** | `src/lib/copKutusu.js:17` `HAREKET_COP_TUR` dört tür; `:18` `hareketCopEtiketi` tutarı sabit `"TRY"` ile basar. |
| **H** | `src/components/Kasa.jsx:388` `hareketYetkisi` ve `:390` `hareketKilidi` varsayılan dalları ödeme kabul eder (`gider_odeme`, `["gider", m.giderId]`). |
| **I** | `src/components/settings/SettingsTrash.jsx:257-258` `hareketIzinli`: virman ve avans `kasaVeriYetki` ister, varsayılan dal yalnız `gider_odeme`. |
| **J** | `src/lib/kasa.js:600-605` `hareketDuzenlemeDurumu` tanımadığı türe `duzenlenebilir: true` döndürür. |
| **K** | `src/lib/yedekKasa.js:5` `kasaHareketiMi` yalnız `virman` ve `avans` korur. |
| **L** | `src/lib/kasa.js:218-231` `hesapKullanimDetayi` tanımadığı türü `diger` kovasına atar; `:239` `hesapTasimaPlani` hesapsız bırakmayı yalnız virman ve verilen çek için engeller. |
| **M** | `src/lib/kasa.js:180-192` `hesapsizOdemeler` yalnız `odeme` ve `avans` türlerini listeler. |
| **N** | `src/lib/gider.js:1385` `KALEM_KAPATAN_TURLER` = `odeme` ve `mahsup`; gider tarafı yeni türü kendiliğinden görmez (R6, C3). |
| **O** | `src/lib/giderRaporu.js:388-390` HAREKETLER tablosu beş satırı her zaman basar ve "hareket yok" koşulu beş sayının toplamıdır; `:244` VİRMANLAR tablosu para birimini yazar, hiçbir kasa tablosu serbest metin basmaz. |
| **P** | `electron/db.cjs:292` `CREATE TABLE hesap_hareketleri`, `:1033` INSERT sütun listesi, `:1813` okuma `SELECT *` + `...rest` (yeni sütun kendiliğinden gövdeye girer). |
| **Q** | `src/components/ui.jsx:358` `TutarInput` `sym` varsayılanı `₺`; `Kasa.jsx:30` `SEMBOL` haritası üç para birimini bilir. |
| **R** | `src/components/Kasa.jsx:759-761` silme onayı "Ödeme silinsin mi?" ve `para(..., "TRY")`; `:428` kalemsiz hareketin iz adı "Silinmiş gider", `:429` bildirim "Ödeme silindi.". |
| **S** | `src/lib/kilitAlanlari.js:34` `kasa_hesap` kilidinin pencere listesi iki dosya; `kasa/` altındaki her dosya listede ya da gerekçeli kilitsiz olmalı (0064 iki yönlü tarama). |
| **T** | `src/lib/kasa.js:400-430` `odemeDogrula` yalnız boş tarihi reddeder (takvim ve gelecek denetimi yok); `src/lib/gecerlilik.js:4` `gecerliGunMu` hazır. |
| **U** | `src/components/Kasa.jsx:521-560` hesap satırının işlem sütunu 230 piksel ve dört öğe taşıyor; seçili hesabın hareket kartı hareket olmasa da çizilir, boş durum kartın içindedir. |

### QA turunda verilen kararlar (2026-11-20)

Yirmi beş bulgu, hepsi Takım Yöneticisi tarafından onaylandı.

**Bloklayıcı**

- **Karar 1 (Bloklayıcı, R1/2, C4/2).** Yön kayıtta ayrı `yon` alanında taşınır, `tutar` pozitif kalır; alan dört nokta kuralıyla açılır ve boş değer gövdeye yazılmaz — *neden:* bütün okuyucular tutarı pozitif varsayıyor (ölçüm C, G, O) ve okuma `SELECT *` + `...rest` olduğu için ayıklanmayan sütun her harekete `yon: null` ekleyip AC-22'nin kıyasını kırar (ölçüm P).
- **Karar 2 (Bloklayıcı, R1/3, X7).** Kredi kartı hesabında alan "Hedef borç"tur ve girilen değer borç olarak okunur; kartın alacaklı bakiyesi bu yolla yazılamaz, bilinen sınırdır — *neden:* kart bakiyesi ekranda yalnız "Borç" olarak okunuyor (`Kasa.jsx:464`), kullanıcıdan görmediği bir işareti hesaplamasını istemek hata üretir; açılış bakiyesinin kuralı da aynı (ölçüm B).
- **Karar 3 (Bloklayıcı, R10/2).** Düzeltmenin izni `kasa_hesap`'tır ve beş yerde birlikte yazılır (sunucu eşlemesi, kayıt düzenleme izni, Kasa sekmesi şartı, ekran satırı yetkisi, çöp kutusu kapısı) — *neden:* eşleme yazılmazsa varsayılan `gider_odeme` olur (ölçüm E, H, I) ve `kasa_hesap`'ı olmayan bir gider kullanıcısı düzeltmeyi silebilir; C5, AC-16, AC-17 ve AC-18 birlikte ihlal olur.
- **Karar 4 (Bloklayıcı, C5/2).** Kasa sekmesi olmayan kullanıcının yedek geri yüklemesi düzeltmeleri korur — *neden:* koruma listesi yalnız virman ve avansı tanıyor (ölçüm K); düzeltme eklenmezse geri yükleme onu ezer, sunucu Kasa'ya özgü kayıt değiştiği için bütün kaydı reddeder (0052 R19'un ödenmiş dersi).
- **Karar 5 (Bloklayıcı, R4/2, R4/3).** Düzeltme hesapsız bırakılamaz: taşıma yolu hedef hesaba taşır, hesapsız bırakma nedenle engellenir, kullanım kırılımında kendi satırı olur; hesabı bulunamayan düzeltme "hesabı belirtilmemiş kayıtlar" listesinde görünür — *neden:* taşıma planı hesap alanını `null` yapıyor (ölçüm L) ve hesapsız düzeltme ne bakiyede ne de o listede görünür (ölçüm M), yani kayıt sessizce yok olur; 0078 triyajının kuralı aynen geçerlidir.

**Önemli**

- **Karar 6 (Önemli, R1/4, X9).** Fark hesabın toplam bakiyesinden hesaplanır, tarih yalnız satırın etiketidir; geçmiş tarihli düzeltmede ara satırların yürüyen bakiyesi hedefi göstermez — *neden:* motor tarih süzmüyor, gelecek tarihli tahsilat da bakiyede (ölçüm C); tarih itibarıyla hesaplanırsa son bakiye hedefe eşit olmaz ve AC-1 ile AC-12 çelişir.
- **Karar 7 (Önemli, R1/5).** Fark kayıt anında güncel hareketlerle yeniden hesaplanır, pencere yalnız önizleme gösterir — *neden:* pencere açıkken giren bir ödeme hedefi kaçırır; 0046 R17 ve 0057'nin "kayıt anında yeniden doğrula" deseni bu uygulamada yerleşiktir.
- **Karar 8 (Önemli, R7/2).** Düzeltme düzenlenmez, satırda Düzenle düğmesi çizilmez ve nedeni tek sabitle yazar — *neden:* durum fonksiyonunun varsayılanı düzenlenebilir (ölçüm J), yani X1 ekranda kendiliğinden uygulanmıyor ve ödeme penceresi yolu açık kalıyor.
- **Karar 9 (Önemli, R10/3).** Kilit alanı hesabın kendisidir (`kasa_hesap` ve hesap kimliği), pencere dosyası kilit alanları listesine yazılır — *neden:* varsayılan dal `["gider", undefined]` üretiyor (ölçüm H) ve listeye yazılmayan `kasa/` dosyası 0064 taramasını düşürür (ölçüm S); düzeltme hesabın kaydıdır, hesap formu ve silme penceresi aynı alanı zaten tutuyor.
- **Karar 10 (Önemli, R8/2).** Çöp satırının türü "Bakiye düzeltmesi", tutarı hesabın para biriminde; etiket yardımcısı isteğe bağlı para birimi alır ve parametresiz çağrı bugünkü çıktıyı birebir verir — *neden:* harita dört türle sınırlı ve tutar sabit ₺ (ölçüm G), yani AC-6 ile AC-11 bugünkü kodla birlikte sağlanamaz.
- **Karar 11 (Önemli, R11/2, X8).** Rapor iki yerde yazar: HAREKETLER özet tablosuna satır (boşluk koşuluna da katılır) ve koşullu `BAKİYE DÜZELTMELERİ` tablosu (para birimli, açıklamasız) — *neden:* özet tablosu beş satırı her zaman basıyor (ölçüm O), yani AC-20'nin "basılmaz" şartı orada karşılanamaz; VİRMANLAR tablosu hazır emsaldir ve hiçbir kasa tablosu serbest metin basmıyor.
- **Karar 12 (Önemli, R10/4).** İz kaydı `kasa_hareketi` türüyle ve `bakiye_duzeltildi` eylemiyle yazılır, etiketi haritaya eklenir; silme onayı, bildirim ve iz adı düzeltmenin kendi metnini ve para birimini kullanır — *neden:* bugünkü varsayılan dallar düzeltmeye "Silinmiş gider", "Ödeme silindi." ve ₺ yazar (ölçüm R); yeni kayıt türü açmak gereksiz, `kasa_hareketi` etiketi 0073'ten beri var.
- **Karar 13 (Önemli, R9/2).** Gelecek tarih reddedilir, tarih kutusunun üst sınırı yerel bugündür — *neden:* ödeme yolu bugün gelecek tarihi engellemiyor (ölçüm T) ama düzeltme "şu anda bakiye şu olmalı" demektir; gelecek tarihli düzeltme bakiyeyi bugün değiştirip rapora başka ayda düşer.
- **Karar 14 (Önemli, R1/6).** Karşılaştırma kuruş tamsayısıyla yapılır; kuruşta eşitse kayıt yazılmaz ve nedeni alanın altında yazar — *neden:* bütün para hesabı kuruşla; float karşılaştırması sıfır kuruşluk, bakiyeyi hiç değiştirmeyen bir satır doğurur.
- **Karar 15 (Önemli, R2/2).** Negatif hedef kabul edilir, kasa türünde engellemeyen uyarı yazılır — *neden:* motor negatif bakiyeyi zaten çiziyor ve banka eksiye düşebilir; yasaklamak gerçek bir durumu girilemez yapar, uyarı yanlış girişi yakalar.
- **Karar 16 (Önemli, R6/2).** Düzeltme hesabın giren ve çıkan toplamlarına girer, R6 "gider, gelir, borç ve alacak toplamlarına girmez" diye okunur; kart başlığı düzeltme varsa tek ibareyle söyler — *neden:* bakiye bu iki toplamın türevi (ölçüm C), düzeltmeyi onlardan çıkarmak ikinci bir bakiye hesabı yazmak olur ve DoD'nin "tek kaynak" maddesine aykırıdır.
- **Karar 17 (Önemli, R4/3).** Hesabı bulunamayan düzeltme hesapsız listesine girer ve ayrı sayılır; parametresiz çağrı bugünkü çıktıyı birebir verir — *neden:* liste yalnız iki türü süzüyor (ölçüm M); 0078 triyajının kuralı, hiçbir bakiyeye girmeyen kayıt en az bir listede görünmek zorunda.
- **Karar 18 (Önemli, R1/7).** Düğme seçili hesabın hareket kartının başlığındadır, kapalı hesapta pasif ve nedenli — *neden:* hesap satırının işlem sütunu 230 piksel ve dört öğe taşıyor (ölçüm U), beşinci düğme ızgarayı kırar; hareket kartı hareketi olmayan hesapta da çizildiği için boş hesap da düzeltilebilir.

**Küçük**

- **Karar 19 (Küçük, R9/3).** Açıklama isteğe bağlı, kırpılır, boşsa kayda yazılmaz; yöntem alanı hiç yazılmaz — *neden:* zorunlu açıklama akışı yavaşlatır, boş dize gövdeyi gereksiz büyütür (bugünkü "boş değer gövdeye yazılmaz" çizgisi); düzeltme bir ödeme değildir.
- **Karar 20 (Küçük, C2/2).** "Bakiye düzeltmesi" tek sabitten gelir, ekranda ikinci kez yazılması taramayla yasaklanır — *neden:* aynı metni üç yer istiyor (satır, çöp, rapor); 0060'ın hedef adları dersi, tek tablodan gelmeyen ad ayrışır.
- **Karar 21 (Küçük, R1/8).** Pencere bugünkü bakiyeyi, hedefi ve hesaplanan farkı yönüyle gösterir; ekran aritmetik yazmaz — *neden:* kullanıcı kaydetmeden ne kadarlık bir kayıt doğacağını görmeli ve önizleme ile kayıt aynı motordan gelirse AC-1 ile AC-3 ayrışmaz.
- **Karar 22 (Küçük, başlık).** Bağımlı spec listesine 0044, 0047, 0052, 0056 ve 0064 eklenir — *neden:* Karar 4, 5, 9 ve 11 doğrudan bu spec'lerin kurallarından doğdu; listede olmayan zincir denetlenmeden kalıyor.
- **Karar 23 (Küçük, R2/3).** Bir hesaba birden çok düzeltme serbest, aynı gün ikinci düzeltme de — *neden:* mutabakat her ay yeniden yapılıyor; tekillik kuralı ikinci ayın düzeltmesini imkânsız kılar.
- **Karar 24 (Küçük, R5/2).** Tutar alanının sembolü hesabın para biriminden gelir, pencere başlığı hesabın adını ve para birimini yazar — *neden:* sembolün varsayılanı ₺ (ölçüm Q), USD hesapta yanlış okutur; AC-11'in ekrandaki karşılığı bu.
- **Karar 25 (Küçük, R12/2).** Düzeltme hesabın kullanımıdır: yalnız düzeltmesi olan hesap deneme dönemi dışında silinemez, kapatılabilir — *neden:* 0024 R16 istisnasız (ölçüm L); muafiyet "hareketi olan hesap silinmez" kuralını deler ve silinen hesapla birlikte düzeltmenin bağı yetim kalır.

### Plan turunda verilen kararlar (2026-11-20)

Takım Yöneticisi planın on önerisini onayladı (plan §3):

- **P1.** Yön bakiyenin işaretine göre tutulur: `giren` bakiyeyi artırır (kartta borcu azaltır); kartta ekran "borç azaldı / arttı" yazar.
- **P2.** Kayıt anında fark, en son çizimin hareket, hesap ve tahsilat verisiyle yeniden hesaplanır (R1/5); güncelleyicinin içinde hesaplanmaz.
- **P3.** Hesabı bulunamayan düzeltme hesapsız listesinde yalnız "Sil" alır; "Hesap ata" ve "kapsam dışı bırak" yok (R4/3).
- **P4.** Hedef kuruşlu tutar alanıyla girilir; kartta girilen değerin mutlak değeri borç olarak okunur (hesap formunun açılış borcu kuralı).
- **P5.** Kasa sekmesi şartı `KASA_SEKMELI_HAREKETLER`'e eklenerek 0052 mekanizmasıyla aranır.
- **P6.** Deneme dönemindeki hesap taşıma yazımı (0056) düzeltmeyi de taşır; sunucuda ek kod yok, testle sabitlenir.
- **P7.** Hareket listesinde tür adı, yön ve açıklama; rapor açıklama basmaz.
- **P8.** Kart başlığı ibaresi düzeltme sayısını yazar ("Giren ve çıkan, n bakiye düzeltmesini içerir.").
- **P9.** Değişen Kasa ve Çöp Kutusu ekranları kanıt eşlemesinde "değişti" + onay alır, kapanışta "aynı".
- **P10.** Sunucu uçtan uca testi üç kullanıcıyla: `kasa_hesap`'sız (403), Kasa sekmesiz (403), `kasa_hesap`'lı ve `gider_odeme`'siz (200).

### QA turu karar kaydı (2026-11-20)

| # | Karar | Derece | İşlendiği yer |
|---|---|---|---|
| 1 | Yön ayrı alanda, tutar pozitif, gövde korunur | Bloklayıcı | R1/2, C4/2, AC-23, AC-24 |
| 2 | Kartta "Hedef borç" | Bloklayıcı | R1/3, X7, AC-25 |
| 3 | İzin `kasa_hesap`, beş yerde birlikte | Bloklayıcı | R10/2, AC-40, AC-41, AC-42 |
| 4 | Yedek geri yükleme düzeltmeyi korur | Bloklayıcı | C5/2, AC-44 |
| 5 | Hesapsız bırakılamaz, taşınır, listede görünür | Bloklayıcı | R4/2, R4/3, AC-45, AC-46 |
| 6 | Fark toplam bakiyeden | Önemli | R1/4, X9, AC-26 |
| 7 | Fark kayıt anında yeniden hesaplanır | Önemli | R1/5, AC-27 |
| 8 | Düzeltme düzenlenmez | Önemli | R7/2, AC-37 |
| 9 | Kilit alanı hesabın kendisi | Önemli | R10/3, AC-43 |
| 10 | Çöp satırı: tür adı ve para birimi | Önemli | R8/2, AC-49 |
| 11 | Rapor: özet satırı ve koşullu tablo | Önemli | R11/2, X8, AC-50, AC-51 |
| 12 | İz kaydı, silme metinleri ve para birimi | Önemli | R10/4, AC-39, AC-48 |
| 13 | Gelecek tarih reddedilir | Önemli | R9/2, AC-35 |
| 14 | Sıfır fark kuruşta ölçülür | Önemli | R1/6, AC-28 |
| 15 | Negatif hedef kabul, kasada uyarı | Önemli | R2/2, AC-29 |
| 16 | Giren ve çıkan toplamlarına girer | Önemli | R6/2, AC-38 |
| 17 | Hesabı bulunamayan düzeltme listelenir | Önemli | R4/3, AC-46 |
| 18 | Düğme hareket kartının başlığında | Önemli | R1/7, AC-31, AC-32 |
| 19 | Açıklama isteğe bağlı, yöntem yok | Küçük | R9/3, AC-36 |
| 20 | Tür adı tek sabit | Küçük | C2/2, AC-52 |
| 21 | Pencere farkı önizler | Küçük | R1/8, AC-33 |
| 22 | Bağımlı spec listesi tamamlandı | Küçük | Başlık tablosu |
| 23 | Çok düzeltme serbest | Küçük | R2/3, AC-30 |
| 24 | Tutar alanının sembolü hesaptan | Küçük | R5/2, AC-34 |
| 25 | Düzeltme hesabın kullanımıdır | Küçük | R12/2, AC-47 |

---

## Acceptance Criteria

- **AC-1.** Kasa ekranında bir hesabın bakiyesi düzeltilebilir: hedef rakam girilince hesabın
  bakiyesi o rakama eşit olur.
- **AC-2.** Düzeltme sonrası hesabın hareket listesinde düzeltme kaydı görünür (tarih, tutar,
  açıklama).
- **AC-3.** Hedef bakiye bugünkünden büyükse hesaba giren yönde, küçükse çıkan yönde tek bir kayıt
  doğar.
- **AC-4.** Hedef bakiye bugünküyle aynıysa kayıt yazılmaz ve kullanıcıya nedeni söylenir.
- **AC-5.** Düzeltme kaydı silinince bakiye düzeltmeden önceki rakama döner.
- **AC-6.** Silinen düzeltme çöp kutusunda "Bakiye düzeltmesi" olarak görünür ve geri alınabilir.
- **AC-7.** Geri alınan düzeltme bakiyeye yeniden girer.
- **AC-8.** Düzeltme hiçbir gider kaleminin ödenen tutarını değiştirmez (çapraz ölçüm: aynı veride
  borç özeti ve açık kalemler spec öncesiyle aynı).
- **AC-9.** Düzeltme aylık raporun gider toplamına, KDV'sine ve tedarikçi borcuna girmez.
- **AC-10.** Düzeltme tedarikçi ve çalışan ekstresinde satır açmaz.
- **AC-11.** Döviz bir hesabın düzeltmesi o hesabın para biriminde okunur ve TL hesapların
  bakiyesini etkilemez.
- **AC-12.** Düzeltme tarihi geçmiş bir güne verilirse o tarihli satır olarak görünür ve rapor o
  ayda sayar.
- **AC-13.** Tarih boş ya da takvimde olmayan bir gün verilirse kayıt yazılmaz, nedeni alanın
  altında yazar.
- **AC-14.** Hedef bakiye alanı boş ya da sayıya çevrilemez bir metinse kayıt yazılmaz, nedeni
  yazar.
- **AC-15.** Kapalı hesapta düzeltme yapılamaz ve nedeni yazar.
- **AC-16.** Kasa hesaplarını yönetme izni olmayan kullanıcıda düzeltme düğmesi çizilmez.
- **AC-17.** Aynı izni olmayan bir istemcinin düzeltme yazma denemesi sunucuda reddedilir.
- **AC-18.** Kasa sekmesi olmayan kullanıcının düzeltme yazma denemesi sunucuda reddedilir.
- **AC-19.** Düzeltme işlem geçmişine yazılır ve ekranda ham anahtarla değil Türkçe etiketiyle
  görünür.
- **AC-20.** Aylık Gider ve Kasa Raporu'nda ayın bakiye düzeltmeleri kendi satırında görünür;
  düzeltme olmayan ayda o satır basılmaz.
- **AC-21.** Hesap formundaki açılış bakiyesi alanı ve ipucu bugünkü gibi çalışır.
- **AC-22.** Düzeltme hareketi olmayan veride Kasa ekranı, bakiyeler ve rapor spec öncesiyle birebir
  aynıdır (kıyas).

### QA turu kriterleri (2026-11-20)

**Kayıt, yön ve fark**

- **AC-23.** Düzeltme kaydı `tur: "duzeltme"`, pozitif `tutar` ve `yon` alanı taşır; kaynakta eksi tutarlı kasa hareketi yazılmaz (tarama).
- **AC-24.** Düzeltmesi olmayan veride hareket bölümünün kayıt gövdesi spec öncesiyle birebir aynıdır (yeni alan boşken gövdeye yazılmaz).
- **AC-25.** Kredi kartı hesabında alan "Hedef borç" olarak çizilir; 12.500 girilince hesabın saklanan bakiyesi −12.500 olur ve ekranda "Borç 12.500,00 ₺" yazar.
- **AC-26.** Fark hesabın toplam bakiyesinden hesaplanır: gelecek tarihli tahsilatı olan hesapta da düzeltmeden sonra toplam bakiye hedefe eşittir.
- **AC-27.** Pencere açıldıktan sonra aynı hesaba yeni bir hareket girilirse kaydedilen düzeltme güncel bakiyeyi hedefe çeker.
- **AC-28.** Hedef ile bugünkü bakiye kuruşta eşitse kayıt yazılmaz; kuruşun altındaki fark da eşit sayılır ve nedeni alanın altında yazar.
- **AC-29.** Negatif hedef kabul edilir; kasa türünde uyarı yazar ama kayıt yapılır.
- **AC-30.** Aynı hesaba aynı gün ikinci düzeltme girilebilir ve ikincisinin farkı birincisini içeren bakiyeden hesaplanır.

**Ekran**

- **AC-31.** "Bakiyeyi Düzelt" düğmesi seçili hesabın hareket kartının başlığındadır ve hiç hareketi olmayan hesapta da görünür.
- **AC-32.** Kapalı hesapta düğme pasiftir ve nedeni yazar.
- **AC-33.** Pencere bugünkü bakiyeyi, hedefi ve hesaplanan farkı yönüyle gösterir; rakamlar motordan gelir.
- **AC-34.** Tutar alanının sembolü hesabın para biriminden gelir ve pencere başlığı hesabın adını ve para birimini yazar.
- **AC-35.** Gelecek tarihli düzeltme reddedilir, nedeni alanın altında yazar.
- **AC-36.** Açıklama boş bırakılırsa kayda yazılmaz; düzeltme kaydında ödeme yöntemi alanı yoktur.
- **AC-37.** Düzeltme satırında Düzenle düğmesi çizilmez ve nedeni yazar; Sil düğmesi çizilir.
- **AC-38.** Hesap kartının başlığındaki giren ve çıkan rakamları düzeltmeyi içerir ve bunu tek ibareyle söyler.
- **AC-39.** Silme onayının başlığı ve metni düzeltmenin kendi metnidir; tutar hesabın para biriminde yazılır.

**Yetki, kilit ve zincir**

- **AC-40.** `kasa_hesap` izni olan ama `gider_odeme` izni olmayan kullanıcı düzeltme girip silebilir.
- **AC-41.** `gider_odeme` izni olan ama `kasa_hesap` izni olmayan kullanıcıda düzeltme düğmesi çizilmez ve aynı kullanıcının yazma denemesi sunucuda reddedilir.
- **AC-42.** Çöp kutusunda düzeltmenin geri alma ve kalıcı silme düğmeleri `kasa_hesap` ile kasa veri yetkisini ister.
- **AC-43.** Düzeltme penceresi hesabın `kasa_hesap` kilidini alır; hesap başkasının kilidindeyse pencere açılmaz ve satırdan silme reddedilir.
- **AC-44.** Kasa sekmesi olmayan kullanıcının yedek geri yüklemesi bakiye düzeltmelerini korur ve kayıt 403 almaz.
- **AC-45.** Hesap silme penceresi düzeltmeyi kendi satırında sayar; "hesapsız bırak" yolu düzeltme varken kaydın tarihi ve tutarıyla nedenlenerek engellenir, taşıma yolu düzeltmeyi hedef hesaba taşır.
- **AC-46.** Hesabı çöpe atılmış düzeltme Kasa'nın "hesabı belirtilmemiş kayıtlar" listesinde görünür ve ayrıca sayılır; aynı listenin parametresiz çıktısı spec öncesiyle aynıdır.
- **AC-47.** Yalnız düzeltmesi olan hesap deneme dönemi dışında silinemez, kapatılabilir; hesap satırındaki hareket sayısı düzeltmeyi de sayar.
- **AC-48.** Düzeltme işlem geçmişinde `bakiye_duzeltildi` eylemiyle ve Türkçe etiketiyle görünür; ayrıntısında yön ve para birimi vardır.

**Çöp kutusu ve rapor**

- **AC-49.** Çöp kutusu satırı "Bakiye düzeltmesi" türüyle ve hesabın para biriminde tutarla görünür.
- **AC-50.** Raporun HAREKETLER tablosunda "Bakiye düzeltmesi" satırı adet ve tutarla basılır; ayın tek hareketi bir düzeltmeyse tablo "hareket yok" demez.
- **AC-51.** `BAKİYE DÜZELTMELERİ` tablosu tarih, hesap, yön ve para birimli tutar yazar, açıklama basmaz ve düzeltme olmayan ayda hiç basılmaz.
- **AC-52.** "Bakiye düzeltmesi" metni kaynakta tek sabitten gelir (tarama).

---

## Definition of Done

- [ ] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [ ] Düzeltmenin farkı ve yönü React'sız saf motorda hesaplanıyor; ekran yalnız gösteriyor.
- [ ] Bakiye tek kaynaktan okunuyor; ikinci bir bakiye hesabı yazılmadı.
- [ ] Yeni kalıcı alan varsa dört nokta kuralı uygulandı ve `db-roundtrip` testine eklendi.
- [ ] Yeni veri bölümü yok; `hesapHareketleri`'nin birleştirme, yedek ve çöp kutusu zinciri
      düzeltmeyi de kapsıyor.
- [ ] Yeni eylem izni eklenmedi; sunucunun tür → izin eşlemesi ve Kasa sekmesi şartı güncellendi.
- [ ] Yön ayrı alanda taşınıyor; kaynakta eksi tutarlı kasa hareketi yok (tarama).
- [ ] İzin kuralı beş yerde birlikte yazıldı (sunucu eşlemesi, kayıt düzenleme izni, Kasa sekmesi şartı, ekran satırı, çöp kutusu).
- [ ] Kilit alanı kaydı yazıldı; yeni pencere dosyası kilit alanları listesinde.
- [ ] Yedek geri yükleme zinciri düzeltmeyi koruyor (Kasa sekmesi olmayan kullanıcı 403 almıyor).
- [ ] Hesap silme ve taşıma penceresi düzeltmeyi kendi satırında sayıyor; hesapsız bırakma nedenle engelli.
- [ ] Hesabı bulunamayan düzeltme en az bir listede görünüyor.
- [ ] Rapor iki yerde yazıyor (özet satırı ve koşullu tablo), açıklama basılmıyor.
- [ ] Tür adı tek sabitten geliyor (tarama).
- [ ] Düzeltmesiz veride kayıt gövdesi, Kasa ekranı, bakiyeler ve rapor spec öncesiyle birebir (kıyas altını).
- [ ] Çöp kutusu geri alma, kalıcı silme ve otuz günlük temizlik simetrisi korundu.
- [ ] İşlem geçmişi etiketi eklendi (ham anahtar görünmüyor).
- [ ] Kullanıcıya görünen metinler Türkçe; çoklu para kuralına uyuluyor (AC-11).
- [ ] Görsel kanıt eklendi: hesap kartı başlığındaki düğme, düzeltme penceresi, hareket listesindeki satır, çöp kutusu satırı.
- [ ] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [ ] `CLAUDE.md`'nin Kasa bölümü güncellendi.
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
