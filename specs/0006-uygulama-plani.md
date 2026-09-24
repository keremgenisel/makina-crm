# 0006: Uygulama Planı, Evrak Satır Bazlı Satış Kaydı

| | |
|---|---|
| **Bağlı spec** | `specs/0006-evrak-satir-bazli-satis-kaydi.md` (R2, plan onayıyla onaylandı) |
| **Durum** | 2026-09-24: E1–E16 önerilerinin tamamı kullanıcı tarafından kabul edildi; spec R2 ile bu kararlara göre güncellendi ve onaylandı (E16); uygulama başladı (branch `feat/0001-gider`). |
| **Önkoşul** | yok (0001–0003'ten bağımsız) |

Bu plan spec'i karşılamak için hangi dosyaya hangi sırayla dokunulacağını, kodda doğrulanan dayanakları ve spec'in
kodla çeliştiği ya da boş bıraktığı noktaları (bölüm 4, kararlar E1–E16) içerir.

---

## 0. Kodda doğrulanan dayanaklar

| Konu | Bulgu | Yer |
|---|---|---|
| Satır yapısı | Satır `{rowId, pickTip, selectedModel, selectedKalip, selectedPart, subItems[]}`; alt kalem `{id, type, kod, makinaAdi, tanim, miktar, birimFiyat, tlKarsiligi}`. **`subItem.id` kalıcı ve benzersiz** (`rowId` kopyalamada yenilenir). | `Documents.jsx:111-118, 529, 644` |
| **Yeni satırlar tek ürün taşır** | Arayüz her satıra tek bir tür (`pickTip`) ve tek alt kalem açar; makina + kalıp + parça **yalnız eski (göç edilmiş) satırlarda** birlikte bulunur. Makinayla verilen kalıp bugün **kendi satırında** durur ve `handleDonusturTeklif` bütün `selectedKalip` satırlarını makinanın standart kalıpları sayar. | `Documents.jsx:647-700, 1300-1313`, `App.jsx:424-451` |
| Parça bağı | Alt kalemde `partId` **yok**; katalog bağı yalnız `row.selectedPart` (satır başına en çok bir parça alt kalemi). Serbest metin satırında bağ yok. | `Documents.jsx:676-693, 698-700` |
| "diger" ve bant | Alt kalem türünde `"diger"` **yok** (yalnız belge düzeyinde `tur`); `bant` türü `migrateRow` ile **siliniyor**. Kalıp alt kaleminde **ölçü alanı yok**. | `Documents.jsx:114-118, 1107` |
| İskonto | Belgede **tutar** (`parseMoney(iskonto)`), yüzde değil; tutarlar KDV hariç. Bugün makina ön doldurması **belgenin tamamını** (tüm satırlar − iskonto) makina bedeli yazıyor. | `Documents.jsx:415`, `App.jsx:430-440` |
| Bugünkü üretim | `handleKaydetSatis` yalnız belge türü parca/kalip ise çalışır: parça → `partSales tur:"Parça"` (**parça bağı, stok düşümü yok**), kalıp → `partSales tur:"Kalıp"` + `kaliplar`; iskonto yok sayılır; `satisTamam=true`. Tür hesabı `effectiveTeklifTur`'un kopyası. | `App.jsx:474-519`, `utils.js:856` |
| `satisTamam` koruması | Tek yönlü bayrak; çakışma birleştirmesinde ve yüklemede yereldeki `true` korunur. `handleCustomerLinked` makina kaydı sonrası `satisTamam=true` yazar. | `App.jsx:235-242, 525-528, 955-963` |
| Kullanıldı mı | `teklifKullanildiMi` = `satisTamam` **veya** canlı müşteri `fromTeklifId` **veya** canlı `partSales.teklifId`; yedek parça satışını görmez. | `utils.js:847-853` |
| Giriş noktaları | Evrak banner'ı, liste satırı ve form başlığı (`evrak_teklif_convert`) ile Anasayfa "İşlem Bekleyen Onaylı Teklifler" kartı (`cust_add` / `cust_detail_add_machine` / `cust_kalip_add`, `withLock("teklif")`). | `Documents.jsx:820-837, 922-931, 1062-1095`, `Dashboard.jsx:145-156, 475-512` |
| Ortak yedek parça yolu | `yedekParcaRec` (doğrulama; alıcı, `partId`, miktar zorunlu; `kargoDurum` varsayılan boş = panoya düşmez) + `yeniYedekParcaSatis` (kayıt + `yedekParcaDus` stok düşümü + müşteri alıcıda otomatik tahsis). | `lib/yedekParcaSatis.js`, `lib/yedekParcaStok.js` |
| **Kalıp satışı için ortak yol yok** | Extra Kalıp kaydı yalnız `CustomerDetailModal.savePartSale` içinde kuruluyor (alanlar, `satisFirma`, `kaliplar` eklemesi). | `CustomerDetailModal.jsx:376-455` |
| DB | `teklifler.satirlar` JSON; `yedek_parca_satis`'te **`teklifId` yok**; `part_sales.teklifId` var. | `db.cjs:184-209, 264-278` |
| Merge | `teklifler` yalnız `customerId` remap; `yedekParcaSatislar.dealerId` remap **edilmez** (bayiler birleştirilmez). | `merge.js:27, 68-76` |
| Sunucu | `BOLUM_SEKMELERI`'nde `"evrak"` yalnız `teklifler`'de; **`customers`, `partSales`, `partStock`, `partStockLog`, `yedekParcaSatislar`'da yok**. `yedekParcaEkleyebilir` dört eklemeden birini kabul ediyor (bilinçli gevşek). | `serverAuth.cjs:78-100, 388-394` |
| Bayi adı kaskadı | Servis `islemFirma`, müşteri `satisYapan`, `prevOwners[].satisYapan` güncelleniyor; **`partSales.satisFirma` yok** (bayi alacağı adla eşleşiyor). | `SimpleDealers.jsx:87, 154, 218-238` |
| Finans / rapor | Finans `"Kalıp"` ve eski `"YedekParca"`yı sayıyor, `"Parça"`yı saymıyor; rapor tüm `partSales`'i Extra Kalıp sayıyor. | `Finance.jsx:118-119`, `aylikRapor.js:60, 117` |

---

## 1. Mimari özet

1. **Saf plan fonksiyonu `src/lib/evrakUretim.js` `teklifUretimPlani(teklif, baglam)`**: belgenin her alt kalemini
   sınıflar (makina / makinayla verilen kalıp / Extra Kalıp / yedek parça / atlanan), iskontoyu dağıtır, daha önce
   üretilmiş kalemleri çıkarır, gereken izinleri toplar ve **uygulanabilir adımlar + atlananlar + eksik izinler**
   döndürür. React'sız; tüm kurallar burada ve testle sabit.
2. **Tek uygulayıcı `App.evrakKaydet(teklif)`**: planı alır; eksik izin varsa hiçbir şey yazmaz (R8); makina adımı
   varsa müşteri formunu açar ve kalanı form kaydından sonra sürdürür (R9); diğer adımları **mevcut ortak yollarla**
   yazar (yedek parça: `yeniYedekParcaSatis`; Extra Kalıp: `CustomerDetailModal`'dan çıkarılacak ortak
   `kalipSatisi` yardımcısı); belgenin `uretilenKalemler` listesini büyütür; özeti gösterir (R16).
3. Evrak'taki üç düğme dalı ve Anasayfa'nın üç düğmesi **tek "CRM'e Kaydet"** eylemine iner.

---

## 2. Değişecek ve eklenecek dosyalar

### Saf katman
| Dosya | Değişiklik |
|---|---|
| `src/lib/evrakUretim.js` **(yeni)** | `teklifUretimPlani`, `iskontoDagit` (kuruş, E7), `teklifUretimDurumu` (kaydedilmedi / kısmen / kaydedildi, R10), `uretilenKayitlar(teklif, veri)` (R16 satır listesi), `gerekenIzinler` |
| `src/lib/kalipSatisi.js` **(yeni)** | `kalipSatisRec(form, …)` + `yeniKalipSatisi(…)`: `CustomerDetailModal.savePartSale`'in ekleme kolundan çıkarılır; iki yol da bunu kullanır (C3) |
| `src/lib/utils.js` | `teklifKullanildiMi` yeni bağı (yedek parça `teklifId`, `uretilenKalemler`) görür ve "tamamen üretildi" anlamına gelir (E10); `effectiveTeklifTur` yalnız görüntü için kalır, üretimi yönlendirmez |

### Kalıcılık (dört nokta kuralı)
| Tablo | Yeni sütun |
|---|---|
| `teklifler` | `aliciTipi TEXT` (`musteri`/`bayi`), `dealer_id INTEGER`, `nihaiMusteriId INTEGER` (E5), `uretilenKalemler TEXT` (JSON, E3) |
| `yedek_parca_satis` | `teklifId INTEGER`, `teklifKalemId TEXT` |
| `part_sales` | `teklifKalemId TEXT` |
| Satır JSON'u (sütun yok) | kalıp satırında `kalipRolu: "makinayla" \| "extra"` (E1) |

`scripts/tests/db-roundtrip.cjs` + `db-clean-install.cjs`, `src/types.d.ts`.

### Birleştirme
| Dosya | Değişiklik |
|---|---|
| `src/lib/merge.js` | `teklifler.nihaiMusteriId` → müşteri remap; `yedekParcaSatislar.teklifId` → teklif remap; `dealerId` **remap edilmez** (E6) |
| `src/App.jsx` `mergeLocalIntoReloaded` + yükleme | `satisTamam` korumasının yanına `uretilenKalemler` **birleşimi** (R10, AC-35) |

### Sunucu
| Dosya | Değişiklik |
|---|---|
| `electron/serverAuth.cjs` | `BOLUM_SEKMELERI`: `yedekParcaSatislar`, `partStock`, `partStockLog`, `partSales` **ve `customers`** listelerine `"evrak"` (E4). `EYLEM_IDLERI` ve ekleme denetimleri **değişmez** |

### Arayüz
| Dosya | Değişiklik |
|---|---|
| `src/components/Documents.jsx` | Alıcı tipi seçimi (müşteri / bayi) ve bayi araması, bayi bilgisiyle firma alanlarının doldurulması (düzenlenebilir); bayi alıcıda "nihai müşteri" seçici; kalıp satırında "makinayla / Extra" seçimi; üç dallı düğme yerine tek **"CRM'e Kaydet"**; durum rozeti (kısmen / kaydedildi); satırda "üretilen kayıtlar" listesi (AC-43) |
| `src/components/evrak/UretimOzeti.jsx` **(yeni)** | Özet penceresi (üretilen, atlanan ve nedeni, makina satırından gelen parça notu, silinmiş kalem uyarısı) |
| `src/components/Dashboard.jsx` | Onaylı teklif kartında üç düğme yerine tek "CRM'e Kaydet" (kilit korunur); özet App'ten gösterilir (AC-42) |
| `src/components/Customers.jsx` | Ön doldurmaya `satisYapan` (R14, AC-40); `onCustomerLinked` makina kalem kimliğini de taşır |
| `src/components/customers/CustomerDetailModal.jsx` | Extra Kalıp eklemesi ortak `kalipSatisi` yardımcısına geçer (davranış aynı) |
| `src/components/SimpleDealers.jsx` | Bayi adı kaskadına `partSales.satisFirma` (R19, AC-22) |
| `src/App.jsx` | `handleKaydetSatis` / `handleDonusturTeklif` / `handleDonusturMakina` → tek `evrakKaydet`; bekleyen üretim durumu (makina formu açıkken); özet durumu; `partSales tur:"Parça"` üretimi kaldırılır (C2) |

### Dokunulmayanlar
`Finance.jsx` / `aylikRapor.js` hesap kuralları (eski `"Parça"` kayıtları C7 gereği olduğu gibi kalır), yazdırma
şablonu (R12), yurt dışı fatura ve proforma (X2, X3), `yedekParcaSatis.js` / `yedekParcaStok.js` (yalnız çağrılır).

---

## 3. Adım sırası

1. **Saf katman:** `iskontoDagit`, `teklifUretimPlani`, `teklifUretimDurumu`, `gerekenIzinler` + motor testleri.
2. **Ortak Extra Kalıp yolu:** `kalipSatisi.js`'e çıkarma; `CustomerDetailModal` onu kullanır; mevcut kalıp testleri kilit.
3. **Kalıcılık ve birleştirme:** DB sütunları, roundtrip, merge remap, App birleşim koruması.
4. **Sunucu:** `BOLUM_SEKMELERI`; `server-authz` + `server-security` e2e (yalnız Evrak sekmeli kullanıcı).
5. **Uygulayıcı:** `App.evrakKaydet`, makina formu sonrası devam, özet.
6. **Arayüz:** Evrak alıcı/bayi/nihai müşteri, kalıp rolü, tek düğme, durum ve üretilen kayıtlar; Anasayfa kartı;
   müşteri ön doldurması; bayi adı kaskadı.
7. **Doğrulama:** Finans/rapor çapraz testi, tam paket, lint, build, CLAUDE.md.

---

## 4. Riskler ve emin olmadığım noktalar (öneri + gerekçe)

**E1. "Makinayla verilen kalıp" ayrımı arayüzle çelişiyor (en kritik).** R3/R4 ayrımı "kalıp alt kalemi makina modeli
seçili bir satırda mı" diye yapıyor. Ancak bugünkü arayüzde **her satır tek ürün**; makinayla verilen kalıp da kendi
satırında duruyor ve bugün makinanın standart kalıbı sayılıyor. Spec harfiyen uygulanırsa yeni belgelerdeki **bütün
kalıplar Extra Kalıp** olur (makinanın kalıbı ayrıca satılmış gibi ciroya ve borca girer); ayrım yalnız eski gruplu
satırlarda çalışır.
*Öneri:* Kalıp satırına açık bir **"Makinayla verilir / Extra Kalıp"** seçimi (satır JSON'unda `kalipRolu`, yeni sütun
yok). Varsayılan: belgede makina alt kalemi varsa "makinayla", yoksa "Extra". Eski gruplu satırlarda aynı satırda
makina varsa zorunlu olarak "makinayla". Ayrım satır sırasından bağımsızdır (R4), AC-2/3/4 bu seçimle sağlanır.

**E2. "Türü belirsiz (diğer)" alt kalem kodda yok; bant türü göçte siliniyor.** *Öneri:* "Belirsiz" = türü
makina/kalıp/parça dışında olan alt kalem **ve** modeli seçilmemiş makina alt kalemi (müşteri kaydı modelsiz
açılmaz). Bant türü planda "atlandı: bant" olarak ele alınır (eski veride veya ileride gelirse); AC-21/26/32 sentetik
veriyle sınanır.

**E3. Üretilmiş kalem listesinin biçimi.** R10 kimlik listesi istiyor, R16 satırda "üretilen kayıtlar"ın görünmesini.
*Öneri:* Belgede `uretilenKalemler: string[]` (alt kalem kimlikleri, yalnız büyür, birleşimde union). Kayıt tarafı
`teklifId` + `teklifKalemId` taşır (yedek parça ve Extra Kalıp; makina için mevcut `customers.fromTeklifId`);
"üretilen kayıtlar" bu bağlardan türetilir. Kayıt kimliklerini belgede tutmuyoruz, çünkü birleştirmede kayıt
kimlikleri yeniden atanabiliyor ve belgede ikinci bir remap yükü doğardı.

**E4. `customers` bölümüne de "evrak" gerekiyor.** C8 dört bölüm sayıyor, ama Extra Kalıp müşterinin `kaliplar`
dizisini de güncelliyor (müşteri bölümü). Yalnız Evrak sekmeli kullanıcıda bu 403 verir ve AC-33 sağlanmaz.
*Öneri:* `customers`'a da `"evrak"` eklenir; kayıt düzeyindeki ekleme denetimi (`cust_add`) aynen kalır.
**Makina** ise müşteri formu Müşteriler sekmesinde açıldığı için Müşteriler sekmesi gerektirir: bu sekmesi olmayan
kullanıcıda makina adımı R8 kapsamında "eksik izin" sayılır ve hiçbir kayıt üretilmez.

**E5. Nihai müşterinin kalıcılığı.** R12 "iki yeni alan" diyor, ama R13'ün nihai müşterisi saklanmazsa kısmen
kaydedilmiş bir bayi belgesi yeniden kaydedilince tekrar sorulur. *Öneri:* Üçüncü alan `nihaiMusteriId` (müşteri
remap'ine tabi). Spec'e not düşülür.

**E6. Bayi kimliğinin birleştirmede yeniden eşlenmesi.** DoD istiyor, ama bayiler birleştirme listesinde değil
(`yedekParcaSatislar.dealerId` de remap edilmiyor). *Öneri:* Remap yok, mevcut kuralla tutarlı; spec'e not.

**E7. İskonto dağıtımı ve kuruş artığı.** İskonto tutar olarak geliyor; dağıtım **fiyatı olan bütün alt kalemler**
üzerinden (atlanan ve "makinayla" kalıplar dahil), yoksa belge toplamı ile üretilen toplam ayrışır. Birim fiyat kuruşa
yuvarlanınca miktarı 1'den büyük kalemde `birim × miktar` paya tam eşit olmayabilir.
*Öneri:* Kuruş hesabı; her kalemin birim fiyatı `floor(pay / miktar)`; toplam artık **miktarı 1 olan en büyük tutarlı**
kaleme yazılır (makina bedeli ideal emicidir). Miktarı 1 olan kalem yoksa artık en büyük kalemin birim fiyatına
eklenmez, kalan birkaç kuruş özette "yuvarlama farkı" olarak yazılır. AC-13, AC-14 ve AC-37 tam sağlanır.

**E8. Makina bedeli.** Bugün makina ön doldurması belgenin tamamını makina bedeli yazıyor; artık diğer kalemler kendi
kaydını üretecek. *Öneri:* Makina bedeli = makina alt kaleminin iskontolu payı + aynı müşteriye "makinayla" verilen
kalıpların payı (ayrı kayıt üretmedikleri için tutarları makinaya katılır). Bu kural testle sabitlenir; eski
davranıştan farklı olduğu PR notunda yazılır.

**E9. Belgede birden çok makina.** Bugün yalnız ilk model kullanılıyor. *Öneri:* Her "CRM'e Kaydet" tek makina adımı
işler; kalan makina kalemleri üretilmemiş kalır ve belge "kısmen kaydedildi" olur; kullanıcı tekrar basınca sıradaki
makinanın formu açılır. Kalıp ve parçalar ilk makinanın müşterisine bağlanır.

**E10. "Kullanıldı" ve Anasayfa listesi.** Kısmen kaydedilmiş belge işlem bekliyor sayılmalı. *Öneri:*
`teklifKullanildiMi` = tamamen üretildi **veya** (eski belge) `satisTamam`. Eski belgelerdeki `satisTamam=true`
"kaydedildi" sayılır (göç yok). "Takipten kaldır" `satisTamam`'ı kullanmaya devam eder.

**E11. R9 "belge müşteriye bağlıysa form açılmaz" ile R2 "makina bugünkü davranışı korur" çelişiyor.** Bugün müşteriye
bağlı belgedeki makina da formu (seri no, stok seçimi) açıyor. *Öneri:* Makina adımı **her zaman** formu açar
(R2); "form açılmaz" makina kalemi olmayan belgeler için geçerlidir.

**E12. İzin kontrolü (R8) istemcide, tam liste.** *Öneri:* Düğme `evrak_teklif_convert` ister; adımlar: yedek parça
`yedek_parca_add` (stockActions, spec C8 gereği; sunucudaki gevşek kabul değişmez), Extra Kalıp `cust_kalip_add`,
yeni müşteri `cust_add`, mevcut firmaya makina `cust_detail_add_machine`, makina için Müşteriler sekmesi (E4). Eksik
olan her izin adıyla listelenir. Sunucu reddederse (409/403) mevcut kaydet-hata akışı devreye girer; istemci
kontrolü birincil güvence.

**E13. Makina formu yarıda bırakılırsa.** *Öneri:* Form kapatılınca bekleyen üretim iptal edilir; makina dışındaki
adımlar **üretilmez** (müşteri belli değil); belge "kaydedilmedi" veya önceden üretilenler varsa "kısmen" kalır
(AC-11 senaryosu: önce parça/kalıp üretilmiş, sonra makina yarıda). Belge müşteriye bağlıysa önce makina dışı adımlar,
en sonda makina formu açılır; form kapatılırsa belge "kısmen kaydedildi" olur.

**E14. Eski `"Parça"` partSales kayıtları (C7).** Finans'ta sayılmıyor, raporda kalıp sayılıyor; dokunulmuyor.
*Öneri:* CLAUDE.md'ye ve özetin yardım metnine "eski Evrak parça kayıtları" notu; temizlik kullanıcıda.

**E15. Bayi adı kaskadı kapsamı.** R19 yalnız bayi diyor; fabrika adı değişince de `satisFirma` eski adda kalıyor.
*Öneri:* Yalnız bayi (spec kapsamı); fabrika adı kaskadı ayrı iş olarak not edilir.

**E16. Spec durumu "Taslak" ve görsel kanıt.** *Öneri:* 0003'teki gibi bu planın onayı spec onayı sayılır; görsel
kanıt alınmaz.

**Genel riskler**
- *Büyük yüzey:* Evrak, App akışları, Anasayfa, sunucu ve DB aynı işte değişiyor. Adım sırası saf katmandan başlar;
  her adımın testi bir sonrakinden önce yeşil olur.
- *C3 ayrışma riski:* Extra Kalıp için ortak yol yoktu; çıkarma sırasında `CustomerDetailModal` davranışı değişmemeli
  (mevcut kalıp/kargo etiketi testleri kilit).
- *LAN'da belge durumu:* `uretilenKalemler` birleşimi App'teki özel korumaya bağlı; MERGE_KEYS yalnız eklemeleri
  taşıdığı için bu koruma yazılmazsa liste kaybolur (0001'deki `calisanlar` sınıfı hata).

---

## 5. Kabul kriteri ↔ test eşlemesi

Gerçek dosyalar: `P` = `tests/evrak-uretim.test.js` (saf plan + `evrakUygula` yazma adımları; `K` bu dosyadaki "yazma adımları ortak
yollarla" bloğudur, ayrı dosya açılmadı), `E` = `tests/ui/evrak-crm-kaydet.test.jsx` (gerçek App, uçtan uca), `A` = aynı dosyadaki
AC-42 testi, `B` = `tests/ui/documents-bayi-alici.test.jsx` (bayi alıcı, kalıp rolü, AC-40 ön doldurma, AC-22 kaskad, özet penceresi),
çapraz = `tests/ui/evrak-finans-capraz.test.jsx`. AC-9/AC-34'ün arayüz tarafı özet penceresiyle (`B`), izin kararı ve "hiçbir şey
yazılmaz" davranışı `P` ile kanıtlanır (yerel modda App izin kısıtı taşımadığı için App düzeyi izin testi yok).

| Kriter | Test | Kanıt |
|---|---|---|
| AC-1, AC-10 | P + E | makina + parça belgesi: müşteri formu → kaydet → yedek parça satışı aynı müşteriye |
| AC-2, AC-3, AC-4 | P + E | "makinayla" kalıp `kaliplar`'a, Extra Kalıp üretmez; "Extra" kalıp `partSales` + `kaliplar` extra; ikisi aynı belgede karışmaz (E1) |
| AC-5, AC-6, AC-7 | P + E | katalog parçası → `yedekParcaSatislar` (Stok listesinde), alanlar elle girilenle aynı, stok ve `bayi_satis` hareketi |
| AC-8 | P + E | serbest metin parça: kayıt yok, özet satır adı + neden |
| AC-9, AC-34 | P + E | izin eksik: hiç kayıt, hiç stok hareketi, eksik izin adı |
| AC-11, AC-12, AC-30 | P + E | form yarıda → "kısmen"; yeniden kaydet → yalnız eksikler; stok ikinci kez düşmez |
| AC-13, AC-14, AC-37 | P | 60.000/40.000 − 10.000 → 54.000/36.000; artık kuruş en büyük (miktar 1) kaleme, toplam tam; 2 × 30.000 − 6.000 → birim 27.000 |
| AC-15, AC-16, AC-17 | P + B | bayi alıcı → bayi alıcılı yedek parça; nihai müşterisiz kalıp atlanır; nihai müşterili kalıp → Extra Kalıp, `satisFirma` = bayi |
| AC-18, AC-43 | E | durum "kaydedildi"; satırda üretilen kayıtlar |
| AC-19, AC-21, AC-26, AC-27, AC-32, AC-36 | P + E | özet: üretilen türler, atlananlar ve nedenleri; yalnız belirsiz; boş belge; bant; silinmiş kalem uyarısı |
| AC-20 | P | yedek parça `kargoDurum` boş |
| AC-22 | B | bayi adı değişince `satisFirma` güncellenir, bayi alacağı tek satır |
| AC-23 | P + E + kaynak taraması | hiçbir yol `partSales tur:"Parça"` üretmez |
| AC-24, AC-25 | çapraz (`tests/ui/evrak-finans-capraz.test.jsx`) | Evrak'tan üretilen yedek parça Finans ve raporda aynı tutar; Extra Kalıp elle girilenle aynı sayılır (Analiz dahil) |
| AC-28, AC-29 | çapraz (`yedekParcaGeriAl`, `yedekParcaKaskad`) + mevcut `customers-delete-cascade` | silinen üretilmiş satış stoğu geri verir; müşteri kaskadı üretilmiş kayıtları kapsar |
| AC-31 | P | makina satırındaki parça → yedek parça, özette "makina satırından" |
| AC-33 | `server-authz.test.js` + `scripts/tests/server-security.cjs` | yalnız Evrak sekmeli, izinli kullanıcının yazımı 200 |
| AC-35 | `tests/merge.test.js` + E | iki istemci farklı kalemler → birleşim, ikinci üretim yok |
| AC-38 | `db-roundtrip.cjs` + B | alıcı tipi / bayi / nihai müşteri gidiş-dönüş, yeniden açınca korunur |
| AC-39 | B + `print-templates.test.js` | bayi bilgisi yazdırmada, alanlar düzenlenebilir |
| AC-40 | E | bayi belgesinde müşteri formu `satisYapan` = bayi adı, değiştirilebilir |
| AC-41 | E | tek düğme; karma belgede önce form, sonra kalanlar + özet |
| AC-42 | A | Anasayfa'dan başlatılınca da özet |
| AC-44 | P | USD belge → USD, "Faturalı Yurtdışı" |
| DoD: C3 ortak yol | K + P | Evrak ve müşteri detayı aynı `kalipSatisRec` / `yedekParcaRec` çıktısı |
| DoD: kullanıldı mı | `tests/utils.test.js` | yedek parça `teklifId` ve `uretilenKalemler` görülür; kısmen belge kullanılmamış sayılır |

---

## 6. Onay istenen kararlar (özet)

| # | Karar | Öneri |
|---|---|---|
| E1 | Makinayla verilen kalıp | Kalıp satırında açık "makinayla / Extra" seçimi, akıllı varsayılan |
| E2 | Belirsiz ve bant kalemi | Tanımlı tür dışı + modelsiz makina = belirsiz; bant atlanır |
| E3 | Üretilen kalem listesi | Belgede kalem kimlikleri; kayıtlarda `teklifId` + `teklifKalemId` |
| E4 | `customers`'a "evrak" | Eklenir; makina Müşteriler sekmesi ister |
| E5 | Nihai müşteri | Kalıcı üçüncü alan `nihaiMusteriId` |
| E6 | Bayi kimliği remap | Yok (bayiler birleştirilmiyor) |
| E7 | İskonto artığı | Kuruş hesabı, artık miktarı 1 olan en büyük kaleme |
| E8 | Makina bedeli | Makina payı + "makinayla" kalıpların payı |
| E9 | Birden çok makina | Her kayıtta bir makina; kalanlar "kısmen" |
| E10 | Kullanıldı / Anasayfa | Tamamen üretildi veya eski `satisTamam`; kısmen olan bekler |
| E11 | Müşteriye bağlı belgede makina | Form her zaman açılır |
| E12 | İzin listesi | Adım başına tanımlı izinler, istemcide ya hep ya hiç |
| E13 | Form yarıda | Makina dışı adımlar müşteri belliyse önce, değilse hiç |
| E14 | Eski "Parça" kayıtları | Dokunulmaz, not düşülür |
| E15 | Fabrika adı kaskadı | Kapsam dışı, ayrı iş |
| E16 | Spec onayı ve görsel kanıt | Plan onayı spec onayı; görsel kanıt yok |

---

## 7. Uygulama notları (2026-09-24)

- **Yeni modüller:** `lib/evrakUretim.js` (plan, iskonto, durum, "kaydedildi mi", liste birleşimi), `lib/evrakUygula.js` (makina dışı
  adımları ortak yollarla yazar; önce hepsini doğrular), `lib/kalipSatisi.js` (Extra Kalıp ortak yolu; `CustomerDetailModal` da
  bunu kullanıyor), `components/evrak/UretimOzeti.jsx`.
- **Kaldırılanlar:** `App.handleDonusturTeklif` / `handleDonusturMakina` / `handleKaydetSatis` ve `utils.teklifKullanildiMi`
  (yerini `evrakUretim.teklifKaydedildiMi` aldı). Evrak ve Anasayfa'daki üç dallı düğme tek "CRM'e Kaydet" oldu.
- **Makina akışı:** `App.evrakKaydet` makina adımında müşteri formunu açar ve bekleyen işi `evrakBekleyenRef`'te tutar;
  `handleCustomerLinked` (form kaydı) makina ve "makinayla" kalıpları üretildi sayar, müşteri bekleniyorsa kalan adımları yeni
  müşteriye yazar ve özeti gösterir. Form kapatılırsa bekleyen iş bir sonraki kaydetmede sıfırlanır (R22).
- **Mükerrer koruması:** belgedeki liste + App'te aynı turda art arda basmaya karşı yerel kimlik kümesi (`evrakYerelUretilenRef`).
- **Uygulamada bulunan hata:** `uretilenKalemBirlesimi`'nin ilk sürümündeki varsayılan parametre (`a = []`), değişiklik olmadığında
  da yeni dizi döndürüp yüklemede her seferinde "değişti, kaydet" sinyali üretecekti; saf testte yakalandı, düzeltildi.
- **Anasayfa:** bekleyen listesi artık yalnız teklifleri gösterir (X3: kayıt tekliften doğar); kısmen kaydedilmiş teklif "Kısmen
  kaydedildi" rozetiyle bekler. Düğme `evrak_teklif_convert` ister (önceden müşteri eylem izinleri).
- **Görsel kanıt:** E16 gereği alınmadı.

## 8. Triyaj düzeltmeleri (2026-09-24)

| # | Bulgu | Düzeltme | Test |
|---|---|---|---|
| 1 | Makina kaleminin "üretildi" sayılması bellekteki bekleyen işe bağlıydı; form açıkken uygulama kapanıp taslak geri yüklenirse belge makinayı bilmiyor, ikinci makina kaydı açılabiliyordu | Belgeye `fromTeklifId` ile bağlı canlı makina kaydı kanıt sayılır (`kanitlaUretilenler`, plan ve durum); `evrakKaydet` kanıtı listeye yazar; bekleyen iş yoksa form kaydı `bekleyenIsYokkenMakinaKalemleri` ile ilk bekleyen makinayı işaretler. Bağlı müşteri kaydı artık "eski belge kaydedildi" kanıtı sayılmaz (yeni akışta da oluşur) | `evrak-uretim.test.js`, `ui/evrak-crm-kaydet.test.jsx` |
| 2 | Kalıp alt kaleminin miktarı yok sayılıyordu (1.000 × 3 → tek kayıt 3.000) | Miktar kadar Extra Kalıp kaydı birim fiyatla ve müşterinin kalıp listesine miktar kadar giriş; "makinayla" kalıplarda da; tam sayı olmayan miktar atlanır | `evrak-uretim.test.js` |
| 3 | Yalnız bant / belirsiz kalemli onaylı teklif sonsuza dek bekliyordu | Yeni durum "gerekmiyor": beklemez, Evrak'ta "Kayıt gerektirmiyor" rozeti, düğme yok; onaylanınca kullanıcıya söylenir (AC-27) | `evrak-uretim.test.js`, `ui/evrak-crm-kaydet.test.jsx`, `ui/documents-bayi-alici.test.jsx` |
| 4 | İskonto artığı kayıt üretmeyen kaleme yazılıp kayboluyordu | `iskontoDagit` artıkları yalnız kayıt üreten kalemlere yazar; uygun kalem yoksa özet'te yuvarlama farkı | `evrak-uretim.test.js` |
| 5 | Yalnız Evrak sekmeli kullanıcının düzenleme alanı genişledi, yazılı değildi | Spec C8 ve CLAUDE.md'ye kabul edilen sınır olarak yazıldı; alan denetimi ayrı iş | `server-authz.test.js` (sınırı sabitler) |
| 6 | Documents'ta yorum yanlış satırdaydı | Yorum `donusturBanner` satırına alındı | davranış değişikliği yok, test gerekmez |
