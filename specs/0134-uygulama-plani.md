# 0134 uygulama planı: bir sonraki parti için tedarikçi sipariş ihtiyacı

Spec: `specs/0134-siparis-ihtiyaci.md` (QA turu karar 1–27, plan turu Karar 28–44). Dal `feat/0134-siparis` (`../wt0134`), taban main `eca03258`. Plan Takım Yöneticisi'nin 2026-11-05 onayıyla; on yedi önerinin hepsi kabul edildi.

## 1. Dosyalar

**Yeni**
- `src/lib/siparisIhtiyaci.js`: saf motor (C3, C3/2). Satır doğrulaması (`satirlariDogrula`), partiden satırlar (`partidenSatirlar`, R25), emniyet payı önceliği (`emniyetPayiOf`, R9/2), patlatma, stok düşümü, kesit satırları (`kesitHesabi`), tedarikçi grupları, eksik ve hazır sayıları, stok uyarısı, ekran biçimleri (0088 R25: ekran dosyası çarpım ve bölme yazmaz).
- `src/lib/siparisRaporu.js`: yazdırma kurucusu `siparisRaporuHtml` (R20/2; `raporSunumu.js` dili, kendi kaçışı, yalnız Türkçe).
- `src/components/maliyet/SiparisIhtiyaci.jsx`: beşinci görünüm; yerel model satırları, parti seçici, uyarılar, iki tablo. Yazıcı prop'u almaz (AC-61), kilit almaz (gerekçeli kilitsiz).
- `src/components/rapor/SiparisRaporuDugmesi.jsx`: yazdırma çağrısı `maliyet/` dışında (0088 X4 gizlilik taraması o klasörde yazdırma API'sini yasaklıyor; 0047 emsali).
- `tests/fixtures/0134-veri.js`, `tests/siparis-0134.test.js`, `tests/ui/siparis-0134.test.jsx`, `tests/ui/siparis-0134-app.test.jsx`, `tests/ui/kit-ondalik-0134.test.jsx`, `tests/ui/emniyet-payi-0134.test.jsx`.

**Değişen**
- `src/lib/urunAgaci.js`: `kitAdediDogrula` ondalık (en çok üç hane, kendi ayrıştırıcısı `kitAdediCoz`, Karar 35), `setAdediDogrula` + `SET_ADET_HATASI` (set içeriği tam sayı), `kitAdetMetni`, `kitStokAdedi` (yukarı yuvarlama), `partiAdediCevir` (Karar 37).
- `src/lib/malzeme.js`: `emniyetPayiDogrula` (tek doğrulayıcı), kartta `emniyetPayi`, `tamBoyKg` (C2/2, Karar 43), `hamKesit`, `sayiMetni`.
- `src/lib/makinaStandartMaliyet.js`: ondalık kitte satır kuruşu yuvarlanır (Karar 34).
- `src/components/ModelsManager.jsx`: ondalık kit girişi ve kit satırında "Parti başına gir" (Karar 37).
- `src/components/PartManager.jsx`, `src/components/MalzemeSatiriAlani.jsx`: model ile adet satırında ondalık; parçanın emniyet payı (Karar 28).
- `src/components/MalzemeManager.jsx`: malzemenin emniyet payı.
- `src/components/stock/MakinaStokTab.jsx`: `deductParts` ve "Kiti Uygula" yukarı yuvarlar (Karar 36); `stokKirparakDus` değişmez.
- `src/components/MakinaMaliyeti.jsx`: beşinci görünüm, `partStock`, `rawTedarikciler`, `rawParts`, `factory` prop'ları.
- `src/App.jsx`: dört prop.
- `electron/db.cjs`: `parts.emniyetPayi`, `malzemeler.emniyetPayi` (dört nokta).
- `src/lib/kilitAlanlari.js`: gerekçeli kilitsiz.
- Düzenekler: `scripts/tests/layout/maliyet.jsx`, `tests/maliyet-yerlesim.test.js`, `scripts/evidence/0009-sayfa.jsx`, `scripts/tests/db-roundtrip.cjs`, `scripts/tests/db-clean-install.cjs`.
- "Spec 0134 ile" güncellenen bekçiler: `urun-agaci-0087` (AC-15 ters, AC-19 tarama listesi), `ui/parca-maliyeti-0087` (AC-15), `ui/makina-maliyeti-0088` (beş görünüm), `set-icerigi-0121`, `ui/set-icerigi-0121`, `excel-set-0124` (set sabiti).

Yeni veri bölümü yok, yeni eylem izni yok, sunucu bölüm eşlemesi değişmez (AC-62).

## 2. Adım sırası

1. Veri: iki sütun, roundtrip ve temiz kurulum.
2. Doğrulayıcılar ve eski kriterlerin ters çevrilmesi.
3. Ondalık kitin iki tüketicisi (maliyet satırı kuruşu, stok düşümü).
4. Saf motor ve testleri (spec rakamları birebir).
5. Kartlar (model, parça, malzeme).
6. Görünüm ve App zinciri.
7. Yazdırma.
8. Electron yerleşimi, görsel kanıt, tam takım, lint, mutasyon.

## 3. Kararlar (spec Karar 28–44)

Parçanın payı kendi alanı; kesitte kesirli boylar toplanıp bir kez yuvarlanır; anahtarda yöntem; asgari kesit satırına; pay yalnız satın alınan kaleme; yuvarlama sırası (set satırı, stok, patlatma, bileşen payı); ondalık kitte satır kuruşu; kit adedinin kendi ayrıştırıcısı; "Kiti Uygula" yuvarlanmış adet; parti başına yalnız model kartında; sayfalama yok; parti değişince satırlar yeniden dolar; TL karşılığı kayıtlı kurla; üretimde işareti model maliyeti satırlarından; çubuk sığmazsa sorulur; tam boy ağırlığı malzeme motorundan; beşinci sekme bütün maliyet ekranlarını `degisti` yapar.

## 4. Kriter ↔ test eşlemesi

| Kriter | Test |
|---|---|
| AC-1, AC-89, AC-100 | `maliyet-yerlesim` (Electron) |
| AC-2–AC-9, AC-96 | `ui/siparis-0134` |
| AC-10–AC-11, AC-11d, AC-11e, AC-12, AC-13, AC-16–AC-20, AC-22, AC-23, AC-76–AC-78, AC-80–AC-84 | `siparis-0134` (motor) |
| AC-11a–AC-11c, AC-11f, AC-11g, AC-72, AC-74, AC-75, AC-93, AC-94 | `ui/kit-ondalik-0134`, `siparis-0134` (saf) |
| AC-14, AC-15, AC-24, AC-79, AC-104 | `siparis-0134`, `ui/siparis-0134` |
| AC-21, AC-58–AC-60 | `ui/emniyet-payi-0134`, `db-roundtrip.cjs`, `db-clean-install.cjs` |
| AC-25–AC-49, AC-63–AC-70, AC-86, AC-87, AC-90–AC-92, AC-95, AC-97 | `siparis-0134` (motor; AC-46/AC-87 ekranda da) |
| AC-50, AC-51, AC-101 | `siparis-0134` (rapor ve tarama), `ui/siparis-0134` |
| AC-52–AC-54, AC-61 | `ui/siparis-0134`, `ui/siparis-0134-app` |
| AC-55–AC-57, AC-85, AC-98, AC-99 | `siparis-0134`, `ui/siparis-0134` |
| AC-62, AC-71, AC-73, AC-88 | `siparis-0134` (taramalar) |
| AC-102, AC-103 | `siparis-0134`, `ui/siparis-0134` |

## 5. Uygulama turu

- Karar 41 uygulamada daraltıldı: süzme Makina Maliyeti'nde değil görünümdedir (`uretimdekiAdlar`, model maliyeti satırlarının `uretimde` alanı), çünkü 0093 C6 Makina Maliyeti'nde süzmeyi yasaklıyor; işaret yine yeniden okunmaz.
- Karar 45–47 spec'e yazıldı (yazdırma düğmesinin yeri, AC-15'in anlamı, tutarı çözülmeyen grubun "—" toplamı).
- Mutasyon ölçümü: motorda on bozma; ikisi eşdeğer çıktı (tanınmayan para biriminde kurun değeri, silinmiş satırın gizli birikimi), ikisi gerçek boşluktu ve bekçisi yazıldı (Karar 29'un toplu yuvarlaması, R23/2'nin sıfırdan büyük kolu); salt okunurluk bozması (görünüm partiyi yazsın) yazıcı casusuyla yakalandı.
- Ölçüm (Electron): 1920, 1440 ve 1280 pikselde beş sekmeli çubuk tek satırda ve pencerenin içinde; Karar 42'nin sorusu doğmadı.

## 6. Triyaj (2026-11-05)

Altı bulgu ve bir bilgi maddesi düzeltildi; spec Karar 48–50. Kod: `siparisIhtiyaci.js` (kesit anahtarı üç ondalık, boy yolunda fire ve uyarı, bileşen satırı yalnız patlatılırken), `siparisRaporu.js` (payın Türkçe biçimi), `MakinaStokTab.jsx` (düzenlemenin karşılaştırması yuvarlanmış adetle), `urunAgaci.kitAdediCoz` (sayı girdisinde de üç ondalık). Testler `siparis-0134` triyaj bloğu ve `ui/kit-ondalik-0134` (bulgu 5); her düzeltme geri alınınca kendi testi kırılıyor (beş bozma ölçüldü). Görüntüler değişmedi (yeni ekranlar yeniden çekildi, 0 fark).
