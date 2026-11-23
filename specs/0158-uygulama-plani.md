# 0158 Uygulama planı: Sipariş belgesi, parça bilgileri, kesilecek adet ve genel toplam

| | |
|---|---|
| **Spec** | `specs/0158-siparis-belgesi-paketi.md` (Onaylandı, 2026-11-23) |
| **Onay** | Takım Yöneticisi, 2026-11-23 ("tum onerilerini onayliyorum, spece isle, plani yaz ve uygula") |
| **Dal** | `feat/0158-siparis-belgesi` (main `3363e1d2` üstünde) |
| **Durum** | Uygulandı; commit ve kapanış Takım Yöneticisinin talimatını bekliyor |

## 1. Dosyalar

- **`electron/db.cjs`:** `parts.olcu`, `parts.hammaddeAdi`, `parts.cins` TEXT; dört nokta (`PARTS_BILGI_COLUMNS`), okumada ayıklama, yalnız doluyken gövdede (C2/2).
- **`src/components/PartManager.jsx`:** iki formda Kod'dan sonra üç alan; `hazirlaTemel` siler, kırpar, yalnız doluyken yazar (R2/2); liste hücresinde `parca-bilgi-satiri` (R5/2).
- **`src/lib/parcaAktarma.js`:** 16 sütun (12–13 0157'ye ayrılmış, P14); dışa aktarma yazar; içe aktarma boş hücrede kayıtlı değere düşer, ikisi boşsa anahtar yok (R37/2).
- **`src/components/GlobalSearch.jsx`:** parça kategorisi üç alanı arar; neden satırı `nedenAlani` ile (P16).
- **`src/lib/siparisIhtiyaci.js`:** `parcaBilgisi` (tek okuyucu, P12), ölçü gösterimi (`olcuSatirlari`, R8/2), kesim satırları (`siparisSatirlari`, `kesimAciklama`, P2–P5), grup `sutunlar`, `genelToplamK` / `genelTutarsizSayi` (P6, P7), `kesimVar` (P15), üç metin sabiti (C11/2).
- **`src/lib/siparisRaporu.js`:** sütun kümesinden başlık, hiza, genişlik (P9), hücreler, genel toplam satırı, koşullu genişleme ve küçük punto (P1, P8).
- **`src/components/stock/SiparisPenceresi.jsx`:** ölçü hücresi motor alanından, üç alan adın altında, ibare (R15/2, R25).
- **Testler:** `parca-bilgi-0158`, `ui/parca-bilgi-0158`, `siparis-belgesi-0158`, `siparis-belgesi-0158-kiyas` (`0158-once.json`, `0158-veri.js`), `ui/siparis-belgesi-0158`, `siparis-belge-yerlesim-0158` (Electron), `0158-ayikla.js`; güncellenenler "spec 0158 ile".

## 2. Adım sırası

1. Kıyas altını spec öncesi koddan (main worktree). 2. `db.cjs`. 3. Parça kartı ve liste. 4. Excel ve arama. 5. Motor. 6. Belge. 7. Pencere. 8. Eski testler ve ayıklama. 9. Electron yerleşim testi. 10. Mutasyon, tam takım, lint, kanıt, belgeler.

## 3. Kararlar

Spec'te P1–P16 (plan turunda verilen kararlar), P17 ve P18 (uygulamada ve triyajda bulundu).

## 4. Kriter ↔ test

| Kriterler | Test |
|---|---|
| AC-1–AC-6, AC-70, AC-78 | `ui/parca-bilgi-0158` |
| AC-7–AC-9, AC-75 | `ui/parca-bilgi-0158`, `parca-bilgi-0158` |
| AC-10, AC-68, AC-79 | `parca-bilgi-0158` (tarama, çapraz ölçüm) |
| AC-11–AC-20, AC-23, AC-52, AC-57, AC-66, AC-67, AC-76 | `siparis-belgesi-0158` |
| AC-21, AC-58, AC-59 | `siparis-belge-yerlesim-0158` (Electron) |
| AC-22 | `siparis-belgesi-0158` (tarama) + var olan 0059 altını |
| AC-24, AC-35–AC-37, AC-64 | `ui/siparis-belgesi-0158` |
| AC-25–AC-34, AC-60–AC-62, AC-65 | `siparis-belgesi-0158` |
| AC-38–AC-47, AC-73, AC-74 | `siparis-belgesi-0158` |
| AC-48–AC-51, AC-69, AC-77 | `parca-bilgi-0158` |
| AC-53, AC-63, AC-72, AC-80 | `siparis-belgesi-0158-kiyas`, 0144 ve 0150 kıyasları |
| AC-54, AC-81 | `siparis-belgesi-0158` (tarama) |
| AC-55, AC-71 | `db-roundtrip.cjs`, `db-clean-install.cjs` |
| AC-56 | `parca-bilgi-0158` (tarama) |

## 5. Sürüm notu (triyaj bulgu 2)

- **Önce sunucu PC, sonra bütün istemciler.** Güncellenmemiş sunucu PC'nin `parts` tablosunda üç yeni sütun (`olcu`, `hammaddeAdi`, `cins`) yoktur ve yükleme tanımadığı alanı düşürür: güncel istemcide girilen ölçü, hammadde ve cins bir sonraki yüklemede sessizce kaybolur. Güncelleme bitene kadar parça kartında bu üç alan doldurulmaz. Ters yön sorunsuzdur: güncellenmemiş istemci alanları korur (kartın kayıt fonksiyonu ve Excel içe aktarma tanımadığı anahtarı olduğu gibi geçirir).
- **Belgede ilk baskı farkları:** dokunulmamış katalogda bile bütün satırlarında boş kalan Ölçü sütunu çizilmez; kodu girilmiş parçası olan grup tablosunda Kod sütunu da çıkar (R7).
- **Excel:** şablon 16 sütundur; "Maliyet Para Birimi" ve "Maliyet Kuru" (12–13) spec 0157 gelene kadar okunmaz, doluysa içe aktarma satır numarasıyla bildirir.
