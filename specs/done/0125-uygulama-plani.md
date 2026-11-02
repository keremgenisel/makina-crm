# 0125 uygulama planı — Genel aramada parça ve kalıp katalogları, serviste kalıp alanları

Spec: `specs/done/0125-aramada-katalog-ve-kalip-alanlari.md` (plan turu Karar 18–25, uygulama Karar 26–28). Dal
`feat/0125-arama-katalog`, taban `60f80e3`. Salt okunur iş: yeni kalıcı alan, veri bölümü, izin, sunucu ya da birleştirme kuralı yok.

## 1. Dosyalar

| Dosya | Değişiklik |
|---|---|
| `src/components/GlobalSearch.jsx` | `KAT_SIRA` sonuna `parcaTanimlari`, `kalipTanimlari`; `KAT` girdileri (altı alan); süzgeçler; satırlar; servis süzgecine `servisKalipEslesmesi` (`tamirListesi`, kargo firması, takip no); `servisEslesmeNedeni` → `ekstra`; `kalipDefs` ve `onGoKatalog` dört noktada. |
| `src/App.jsx` | `katalogAcilis` sayacı ve sıfırlama efekti; palete `kalipDefs` ve `onGoKatalog`; Ayarlar'a `katalogAcilis`. |
| `src/components/Settings.jsx` | İki panel sayaçtan kurulan `key` ve `baslangicArama` ile. |
| `src/components/PartManager.jsx`, `src/components/KalipManager.jsx` | `baslangicArama` prop'u kancaya. |
| `src/hooks/useFilteredList.js` | İsteğe bağlı `baslangicArama` (varsayılan `""`). |
| Testler | Yeni `tests/ui/arama-katalog-0125.test.jsx`; "spec 0125 ile" `tests/ui/genel-arama-0026.test.jsx` (AC-33), `tests/ui/standart-kalkar-0082.test.jsx` (`:108`); `tests/tasarim-kontrast.test.js` iki çift. |
| Kanıt | `scripts/evidence/0009-sayfa.jsx` dört ekran ve `KALIP_0125`; `docs/evidence/0125-*`, eşleme kayıtları. |
| Belge | `CLAUDE.md` (0026 bölümünün sonunda), spec, bu plan; `specs/README.md` satırı kapanışta. |

## 2. Adım sırası

1. Çalışma kopyası, kurulum, taban kanıtı. 2. Kanca, paneller, `Settings`. 3. `GlobalSearch`. 4. App. 5. Ters çevrilen iki test,
kontrast kaydı. 6. Yeni testler, mutasyonlar. 7. Sonra çekimi, eşleme, taban. 8. Belgeler, tam `npm test` ve `npm run lint`.

## 3. Riskler ve kararlar

Spec'te Karar 18–28: neden satırının bastırma ölçütü; tek `onGoKatalog`; süzgecin sıfırlanma anı; hedef satırın sayfalaması; tipin
varsayılanı; çip renkleri; iki ters çevirme; panel satırlarının kayması; yedek renkli girdiler; bayatlık testinin sabit referansı; kanıt.

## 4. Kriter ↔ test eşlemesi

Hepsi `tests/ui/arama-katalog-0125.test.jsx`.

| AC | Test |
|---|---|
| 1 | "AC-1" (saf), "AC-1 / AC-3" (palet) |
| 2 | "AC-2" (saf ve palet) |
| 3 | "AC-1 / AC-3" |
| 4 | "AC-4" |
| 5, 6 | "AC-5 / AC-6 (palet)", gerçek App testi |
| 7, 14 | gerçek App testi (ikinci tıklama); "AC-14" taraması |
| 8 | "AC-8" (saf ve palet) |
| 9, 10, 19 | "AC-9 / AC-10" (saf), "AC-9 / AC-10 / AC-19" (palet) |
| 11 | "AC-11 (R11/2)" |
| 12, 20 | "AC-12 / AC-20"; `genel-arama-0026` AC-33 ve anahtar kümesi eşitliği; `standart-kalkar-0082` |
| 13 | "AC-13 / R10" |
| 15 | "AC-15" (kanca), "AC-15" (tarama) |
| 16 | "AC-16"; `tasarim-kontrast` |
| 17 | "AC-17" (davranış, sabit referans), "AC-17" (tarama) |
| 18 | "AC-18" |

## 5. Ölçümler

- **Mutasyonlar:** `kalipDefs` bağımlılığı çıkarılınca davranış ve tarama testi (Karar 27); `Settings`'te `key` kaldırılınca gerçek App ve tarama; neden bastırması kaldırılınca AC-19; süzgeç kodla doldurulunca palet ve App testi; çöp süzgeci kaldırılınca AC-4. Hepsi test kırdı.
- **Kanıt (Karar 28):** var olan on sekiz görüntü 0 piksel; dört yeni ekran; taban 26 görüntüde 0 fark.
- **Takım:** `npm test` 460 dosya, 6357 test yeşil; `npm run lint` 0 hata. İlk koşuda `useFilteredList` imzasını sabitleyen iki tarama kırıldı (0102 AC-15, 0096 AC-22), "spec 0125 ile" güncellendi (Karar 29).

## 6. Triyaj düzeltmeleri (2026-11-02)

1. Süzgecin yalnız hedef panele gittiği gerçek App'te sınanır (iki yön); koşulsuz `baslangicArama` bozması iki yönde de testi kırıyor (Karar 30).
2. `kalipDefs={liveKalipDefs}` AC-17 taramasında; ham diziyi veren bozma taramayı kırıyor (Karar 30).
3. Taban raporu geçerli (kod değişmedi); kanıt kayıtları ve README kapanışta.
