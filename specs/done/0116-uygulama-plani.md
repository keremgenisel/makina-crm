# 0116 Uygulama planı: ihraç kayıtlı ibare kutusu formlardan kalkar

Spec: `specs/done/0116-ihrac-kayitli-ibare-kutusu-kalkar.md`. Tamamlandı: uygulama commit `ea35746`. Dal `feat/0116-ihrac-ibare-kalkar` (`5e7b169` üstünde). Takım Yöneticisi planın sekiz önerisinin hepsini onayladı (spec Karar 29–36). Hesap, veri, sunucu, izin ve birleştirme kuralına dokunulmaz (C1–C3).

## 1. Dosyalar

| Katman | Dosya | İş |
|---|---|---|
| Bileşen | `src/components/IhracKayitliAlani.jsx` → `git mv` `src/components/IhracKayitliOzet.jsx` | `:11-38` (kutu ve yorumu) silindi; `useState`, `./tasarim` ve yedi sabitin içe aktarması gitti; dosya yorumu düzeltildi. Kalan: `IhracKayitliOzetSatirlari`, `IhracKayitliRozeti` |
| Metin | `src/lib/ihracKayitli.js` | Yedi sabit ve R23/2 yorumu silindi; "Ekran metinleri" başlığı kaldı |
| Form | `customers/CustomerAddEditForm.jsx`, `PartSaleForm.jsx`, `YedekParcaSatisForm.jsx` | Çağrı satırı ve üstündeki 0114 yorumu silindi (yedek parçada yalnız 0114 yorumu, 0079 yorumu kaldı); `ihracKayitliEtkinMi` ve `IhracKayitliAlani` içe aktarmaları çıktı, özet satırları yeni dosyadan |
| Rozet kullananlar | `customers/detail/MachineTimeline.jsx`, `stock/YedekParcaSatisTab.jsx` | İçe aktarma yolu |
| Kanıt aracı | `scripts/evidence/0009-sayfa.jsx` | İki adım `kaydir:Bu fatura tevkifatlı`; 0114 ekranlarının yorumu düzeltildi |
| Kanıt eşlemesi | `docs/evidence/kanit-eslemesi.json` | Eski anahtar yedi kaydıyla silindi; üç formun anahtarına altı `degisti` kaydı, `YedekParcaSatisTab.jsx`'e `stok-yedek-0114` `ayni` kaydı (Karar 34) |
| Testler (yeni) | `tests/ihrac-ibare-kalkar-0116.test.js`, `tests/ui/ihrac-ibare-kalkar-0116.test.jsx` | Taramalar ve kapanış bekçisi; ekran davranışı |
| Testler (güncellenen) | `tests/ui/ihrac-kayitli-0114.test.jsx`, `tests/ihrac-kayitli-0114.test.js`, `tests/tasarim-kontrast.test.js` | İçe aktarmalar, AC-12'nin testid iddiası, describe başlığı, AC-31–AC-34'ün dört testi, ibare iddiası, dosya adı ("spec 0116 ile") |
| Belge | `docs/tasarim-sozlugu.md` | Rozet satırının dosya adı; `PartSaleForm.jsx:335` → `:333`, `:382` → `:380` (Karar 29) |
| Belge | `CLAUDE.md`, `specs/README.md`, spec | 0114 bölümünün cümlesi ve parantezi; yeni 0116 bölümü 0114'ün önünde (Karar 30); README satırı ve açık bulgu; plan turu kararları |

## 2. Adım sırası

1. Çalışma kopyası, `npm ci`, Electron kurulumu, `ensure-native --denetle`.
2. Kanıt aracının iki adımı yeni hedefe; eski kodla 43 ekran × 2 tema taban çekimi.
3. Yeniden adlandırma ve beş içe aktarma.
4. Bileşen, yedi sabit, üç çağrı satırı, yorumlar ve ölü içe aktarmalar.
5. 0114 testleri, 0116'nın iki test dosyası.
6. Sözlük atıfları ve dosya adı.
7. Kanıt: yeni kodla çekim → `0116-piksel-raporu.json`; yeni kodla ikinci çekim → `0116-taban-piksel-raporu.json` (86 görüntü, 0 fark); eşleme kayıtları.
8. CLAUDE.md, README, plan; mutasyonla ölçüm; tam `npm test` ve `npm run lint`.
9. Kapanıştaki tam `npm test` (Karar 28) makina boştayken koşulur: süre eşikli testler (ör. `gider-dagitim-0072` AC-29, 3000 ms) Electron koşumuyla aynı anda yük altında eşiği aşabiliyor (triyaj, 0116'dan bağımsız).

## 3. Riskler ve kararlar

- **Ö1 → Karar 29:** sözlüğün iki `PartSaleForm` atfı iki satır kayar; eski ve yeni satırın içeriği aynı (ölçüldü).
- **Ö2 → Karar 30:** 0116 bölümü CLAUDE.md'de 0114'ün önünde; bekçi dilimi `(spec 0114, plan`'da biter, 0114 ve 0115 bekçilerinin dilimine girmez.
- **Ö3 → Karar 31:** rapor adları `0116-piksel-raporu.json` ve `0116-taban-piksel-raporu.json`; `kapanis` adı kullanılmaz.
- **Ö4 → Karar 32:** AC-34 anlamsal tarama (R23/2, "Kopyala", 11/1-c done kopyasında).
- **Ö5 → Karar 33:** altı ekran değişti, işaretsiz ekranların hepsi 0 piksel; `kalip-formu-0114-kart-uyari` spec'te sayılmamıştı.
- **Ö6 → Karar 34:** `stok-yedek-0114` `YedekParcaSatisTab.jsx` altında kayda girdi; `musteri-detay-0114` zaten kayıtlıydı.
- **Ö7 → Karar 35:** 0114 bekçisinin `/0114-` kaydı kaldı (`SatisTevkifatAlani.jsx` + `kalip-formu-0114-kart-uyari`).
- **Ö8 → Karar 36:** üç form dosyasında `ihracKayitliEtkinMi` adı hiç geçmez.
- **Uygulamada bulunan:** ibarenin metin taraması "11/1-c" ile yapılamaz; `ihracKayitli.js`'in dosya yorumu kanun maddesini (11/1-c) anar. Tarama ibarenin kendi cümlesiyle ("hükümlerine göre ihraç edilmek şartıyla teslim edildiğinden"), ekran testi gövde metninde "11/1-c" ile.
- **Mutasyonla ölçüm (yedekten geri koyma):** kutuyu yedek parça formunda geri koymak (AC-1–AC-3, AC-5, AC-31 kırıldı), testid'i tevkifat kutusuna taşımak (AC-31), ölü içe aktarmayı geri koymak (AC-24), seçiciye `title` eklemek (AC-33): dördü de yakalandı.

## 4. Kriter ↔ test

| Kriter | Test |
|---|---|
| AC-1–AC-7 | `ui/ihrac-ibare-kalkar-0116` (gerçek `PartSaleForm`, `YedekParcaSatisForm`, `Customers` formu; AC-4 düz metinle, Karar 22) |
| AC-8–AC-12 | Aynı dosya |
| AC-13 | `ui/ihrac-kayitli-0114-app` dokunulmadan yeşil (Karar 9) |
| AC-14, AC-16 | `ui/ihrac-kayitli-0114` ilgili bloklar dokunulmadan yeşil (Karar 14) |
| AC-15, AC-17 | `ihrac-kayitli-0114` rapor ve dışa aktarma blokları, `ui/ihrac-kayitli-0114-kiyas` dokunulmadan yeşil |
| AC-18, AC-19, AC-22, AC-24, AC-25, AC-30, AC-31, AC-33 | `ihrac-ibare-kalkar-0116` taramaları |
| AC-20, AC-26 | `tasarim-kaynak` (eşitlik) ve 0116 taraması |
| AC-21 | Tam `npm test` (Electron dahil), `npm run lint` |
| AC-23 | `tasarim-kontrast`, `ihrac-kayitli-0114`, `tasarim-kaynak` ve 0116 taraması |
| AC-27 | 0114 kapanış bekçisi dokunulmadan yeşil ve 0116 taraması |
| AC-28 | `kanit-eslemesi` ve 0116 taraması (kayıtların anahtarı, ekranları, onayı) |
| AC-29 | 0116 taraması; çekim çıktısında bulunamayan adım uyarısı yok |
| AC-32 | 0116 taraması |
| AC-34 | 0116 taraması (Karar 32) |
| AC-35 | `ceviri-kapsam` dokunulmadan yeşil ve 0116 taraması |
| AC-36 | 0116 kapanış bekçisi |
| AC-37 | `spec-atiflari` |

## 5. Ters çevrilen kriterler

- 0114 AC-31, AC-32, AC-33, AC-34: testleri silindi, describe'da "spec 0116 ile" notu; AC-9, AC-35 ve AC-56 aynen.
- 0114 AC-12: ihraç alanı yokluğu iddiası kalktı, seçici iddiası kaldı (Karar 13).
- 0114 motor testi: ibare sabitinin birebir metni iddiası kalktı.

## 6. Sürüm notu

İhraç kayıtlı satış: satış tipi "İhraç Kayıtlı" seçilince formda açılan açıklama ve ibare kutusu kaldırıldı; form kısaldı. KDV kutusundaki rakamlar, rozetler, raporlar ve dışa aktarma aynen. 11/1-c ibaresi artık uygulamada gösterilmez; e-fatura yazılımında faturanın açıklamasına elle eklenir. Bu sürüm veri ve sunucu tarafında değişiklik içermez, güncelleme sırası serbesttir.
