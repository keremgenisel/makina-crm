# 0137 uygulama planı: dış işlem kataloğu ve işlem bedelinin zam zinciri

Spec: `specs/0137-dis-islem-katalogu.md` (QA turu 32 bulgu, plan turu Karar 33–46). Dal `feat/0137-dis-islem` (`../wt0137`), taban main `5d2f4285`. Plan Takım Yöneticisi'nin 2026-11-08 onayıyla; on dört önerinin hepsi kabul edildi.

## 1. Dosyalar

**Yeni**
- `src/lib/disIslem.js`: saf motor (yalnız `gecerlilik.js` ve `gider.js`'i içe alır, Karar 38). Sabitler ve metinler, `disIslemKatalogu`, `FIYAT_ALANLARI`, `fiyatKumesi`, `fiyatKumesiTarihte`, `fiyatGecmisiYaz`, `fiyatGecmisiSatirlari`, `disIslemDogrula` ve `disIslemFormu`, `kiloMiktariDogrula`, `islemKalemiOzeti` (işlem bedelinin bütün çarpımları, C3, R31, Karar 35), kullanım ve koruma (`disIslemKullanimi`, `kullanilanDisIslemler`, `disIslemCopEtiketi`), eksik sayısı.
- `src/lib/disIslemEtkisi.js`: zam önizlemesi (Karar 38).
- `src/components/DisIslemManager.jsx`, `src/components/DisIslemFiyatPenceresi.jsx`.
- Testler: `tests/dis-islem-0137.test.js` (motor, taramalar), `tests/dis-islem-0137-kiyas.test.js` (`tests/fixtures/0137-once.json`, spec öncesi koddan, `YAZ_0137=1`), `tests/dis-islem-0137-cagri.test.jsx` (casus), `tests/ui/dis-islem-0137.test.jsx` (panel, pencere, çöp, tedarikçi, kilit), `tests/ui/dis-islem-0137-parca.test.jsx` (parça kartı), `tests/ui/dis-islem-0137-app.test.jsx` (gerçek App); ortak veri `tests/fixtures/0137-veri.js`; bekçi halkası `tests/fixtures/0137-yeni-bolum.js`.

**Değişen**
- `src/lib/maliyetKalemleri.js`: `katalogIslemMi`, `katalogIslemVarMi`, `kalemIslemIdleri`; `kalemTedarikciIdleri` yalnız serbest kalemi okur. `KALEM_TUR` iki değerde.
- `src/lib/malzeme.js`: `islenmisKg` (R28, R14/2); `fiyatEtkisi` seçenek nesnesinde `disIslemler` (R32).
- `src/lib/urunAgaci.js`: `maliyetKalemleriOzeti(kalemler, malzemeKat, tarih, islemKat)` (`islemEksik`, R15/2); beşinci parametre `islemKat` (`parcaMaliyetKurus`, `parcaMaliyetiVar`, `parcaMaliyetMetni`, `maliyetKaynagi`); `setOzeti(icerik, katalog, tarih, malzemeKat, islemKat, fiyatOku)` (Karar 34); `maliyetGecmisiYaz` `katalogIslem` + `islemKat` (Karar 40); `gecmisliKayit`, `maliyetGecmisiSatirlari`, `formKalemOzeti` katalogla; kalem formu ve doğrulama iki çeşit (Karar 36, 37, 41, 42); metinler (R19/2).
- `src/lib/parcaFiyati.js` (bağlam `islemKat`), `src/lib/makinaStandartMaliyet.js` (`modelMaliyeti`, `modelMaliyetleri`, `tarihliDirekt` tembel), `src/lib/parcaAktarma.js` (çağrılar, `parcaSatirlariniCoz` yedinci parametre), `src/lib/gider.js` (tedarikçi koruması, ikinci metin), `src/lib/merge.js`, `src/lib/kilitAlanlari.js`, `src/lib/yedekPaketleri.js`, `src/lib/bolumAdlari.js`.
- Bileşenler: `MaliyetKalemleriAlani.jsx`, `PartManager.jsx`, `MakinaMaliyeti.jsx`, `Settings.jsx`, `settings/SettingsTrash.jsx`, `SettingsExport.jsx`, `SettingsImport.jsx`, `SettingsBackup.jsx`, `SettingsAuditLog.jsx`, `Giderler.jsx`, `gider/Tedarikciler.jsx` (Karar 33), `App.jsx`.
- Sunucu ve veri: `electron/serverAuth.cjs`, `electron/server.cjs`, `electron/db.cjs`.
- Kanıt ve doküman: `scripts/evidence/0009-sayfa.jsx`, `docs/evidence/0137-*`, `kanit-eslemesi.json`, `CLAUDE.md`.
- Güncellenen eski testler ("spec 0137 ile"): `tests/fixtures/0133-yeni-ayar.js`, `cop-kutusu-0078` (23 → 24), `yedek-paketleri-0086`, `parca-fiyati-0133` (iki `setOzeti` satırı), etkilenen bekçi ve metin testleri.

Yeni eylem izni yok (C6). Yeni veri bölümü `disIslemler` (beşli kural).

## 2. Adım sırası

0. Taban: spec öncesi kodla kıyas altını (serbest kalemli, malzemeli, setli, kırılımlı veri; maliyet tarihli ve tarihsiz, satış fiyatı, Model Maliyetleri, Parti Hesabı, Excel, kaynak ibaresi) ve görsel taban.
1. Saf motor; kıyas yeşil.
2. Veri: `db.cjs`, sunucu, birleştirme, yedek, kilit; Electron testleri.
3. App bağları.
4. Ekranlar.
5. Bekçiler, taramalar, ters çevrilen eski testler.
6. Görsel kanıt, tam takım ve Electron, mutasyon yoklaması, sürüm notu, CLAUDE.md.

## 3. Kararlar

Spec'in "Plan turunda onaylanan kararlar" bölümü (Karar 33–46).

## 4. Kriter ↔ test eşlemesi

M = `dis-islem-0137.test.js`, K = `-kiyas`, Ç = `-cagri`, UP = `ui/dis-islem-0137`, UK = `ui/dis-islem-0137-parca`, UA = `ui/dis-islem-0137-app`.

| Kriter | Test |
|---|---|
| AC-1, 2, 12, 13, 14, 83, 116–119 | UP |
| AC-3–11, 128, 130 | M + UP |
| AC-15–19, 127 | UP + M |
| AC-20–25 | M (+ UP AC-24) |
| AC-26–28, 33, 46, 47, 122–124 | UK |
| AC-29–32, 34–45, 89–95, 98–105 | M (+ UK nedenler) |
| AC-48, 52, 53, 107, 120, 121, 125, 126 | UK |
| AC-49–51, 106, 108 | M |
| AC-54, 64, 65 | UA |
| AC-55–61, 114, 129 | UP (+ UA AC-58) |
| AC-62, 63, 131, 132 | UP + M (+ UA otuz gün) |
| AC-66, 67, 113 | M + UP |
| AC-68–71, 85 | `db-roundtrip.cjs`, `db-clean-install.cjs`, UA |
| AC-72–74 | `merge.test.js` |
| AC-75 | `yedek-paketleri-0086` + UP |
| AC-76, 77 | `server-authz.test.js` |
| AC-78, 79, 133 | UP + `kilit-alanlari` |
| AC-80, 110 | K |
| AC-81, 82, 84, 86–88, 96, 97, 115 | M (taramalar) |
| AC-109, 111 | M |
| AC-112 | Ç |
| AC-134 | `islem-gecmisi-etiketleri` + UP |
| AC-135 | bekçiler |

## 5. Uygulama notları

- **Belirsiz sayı kuralı taşındı (Karar 38'e eklendi):** `BELIRSIZ_DESEN` ve `BELIRSIZ_HATASI` döngüsüz `src/lib/tutarGirdisi.js`'e alındı, `malzeme.js` aynı adlarla yeniden dışa verir; `disIslem.js` malzemeyi içe almadan aynı kuralı okur.
- **Kilo yuvarlaması tek yerde:** ilk sürümde `parcaIslenmisKg` de üç ondalığa yuvarlıyordu; mutasyon yoklaması bunun yinelenme olduğunu gösterdi (motordaki yuvarlama silinse de test geçiyordu). Yuvarlama yalnız dış işlem motorunda kaldı (Karar 35'in yazdığı yer), `parcaIslenmisKg` yuvarlanmamış toplamı verir.
- **Tedarikçi haritasının şekli:** işlemsiz tedarikçide değer spec öncesiyle aynı (`{ parca, cop }`), işlem sayıları yalnız gerektiğinde eklenir; 0135'in eşitlik iddiası değişmeden geçer.
- **Kararlı boş liste:** Makina Maliyeti'nde `disIslemler = []` varsayılanı her çizimde yeni dizi üretip model memosunu ve 0136'nın sapma sayacını yeniden koşturuyordu (0136 AC-80 kırıldı); varsayılan modül düzeyinde sabit (`BOS_ISLEMLER`).
- **Giderler satır kayması:** yeni prop Giderler'in imza satırına eklendi (ayrı satır sözlüğün `Giderler.jsx:<satır>` atıflarını kaydırıyordu).
- **Triyaj (Karar 47, 48):** malzeme zammı penceresi dış işlem listesini almıyordu (motor testi tek başına yeterli değildi, ekran testi eklendi); çöpteki adet birimli işlemin miktarı kilo kuralıyla doğrulanıyordu (doğrulama ham haritaya bağlandı). İkisi de düzeltme geri alınınca kırılan testle ölçüldü.
- **Mutasyon yoklaması:** 18 mutasyonun 18'i yakalandı (iki tur; M16'nın ilk biçimi eşdeğer mutasyondu, yerine düzenleme formunda fiyat alanını çizen mutasyon ölçüldü). Mutasyonlar yedek dosyadan geri yüklendi; bir kez `git checkout` ile geri alınan bir mutasyon dosyaya eklenmiş yeni test bloğunu da sildi ve blok yeniden yazıldı (0110 dersinin tekrarı).

## 6. Sürüm notu

Dış işlem kataloğu (Ayarlar › Katalog › Dış İşlemler): ısıl işlem, galvano, lazer kesim gibi dışarıda yaptırılan işlerin fiyatı bir kez yazılır; parça kartında işlem kalemi "Katalogdan" seçilirse fiyatı katalogdan gelir ve işlemin fiyatı güncellenince o işlemin geçtiği bütün parçaların maliyeti ve maliyetten türeyen satış fiyatı kendiliğinden değişir. Kapanmış partilerin donmuş maliyeti değişmez. Kilo birimli işlemde miktar boş bırakılırsa parçanın malzeme kalemlerinin işlenmiş ağırlığı (işleme payı ve fire hariç) kullanılır. Var olan işlem kalemleri olduğu gibi kalır (serbest, sabit tutar); kataloğa geçirmek kullanıcının kararıdır.

**Yeni bir veri bölümü olduğu için önce sunucu PC güncellenmeli, bütün istemciler güncellenene kadar katalog kullanılmamalı.** Güncellenmemiş bir bilgisayarda katalog bağlı kalem maliyete girmez: parçanın maliyeti "girilmedi" değil, sessizce **daha düşük** görünür. O bilgisayarda böyle bir parça düzenlenip kaydedilirse katalog bağı ve miktar silinir.

## 7. Kanıt

- **Yöntem:** taban `5d2f4285` ayrı çalışma kopyasında (`../wt0137-taban`) eski kodla çekildi; seçim, değişen bileşenlere bağlı eşleme ekranları ile bütün `ayarlar-*`, `katalog-*`, `kilit-*` ekranları (152 ekran). Yeni kod aynı seçim ve 13 yeni ekranla tabana karşı çekildi.
- **Rapor `docs/evidence/0137-piksel-raporu.json`:** 148 görüntü (61 eski ekran değişti, 13 yeni ekran), yan yana JPEG'leri depoda. Değişiklik nedenleri: Ayarlar › Katalog menüsündeki yeni "Dış İşlemler" öğesi (Katalog ekranlarında ~18 bin piksel), serbest işlem kalemindeki çeşit seçicisi (0096, 0099, 0135 kart ekranları), yeni boş durum metni (R19/2) ve yedek paketinin "dış işlemler" sözcüğü.
- **Tabanın iki hatası:** `katalog-parca-0135-hata` (karanlık) ve `kilit-geri-yukleme` (aydınlık) taban çekiminde adım uygulanmadan alınmıştı (1 ve 4,6 milyon piksel); eski kodla yeniden çekilince farklar beklenen boyuta indi, raporda yeniden çekilen taban kullanıldı.
- **Rapor dışı bırakılan iki ekran:** `kilit-set-parcala` ve `kilit-toplu-yedek-parca` kilidin yaşını gerçek saatle yazıyor ("az önce" / "5 dakika önce"); fark bu işle ilgisiz.
- **Eşleme:** 123 eski kayıt ve yeni ekran kayıtları `degisti` + "Takım Yöneticisi · 2026-11-08 · spec 0137 Karar 44"; kapanışta `ayni`ye ve kararlılık raporuna (`0137-taban-piksel-raporu.json`) çevrilir.
