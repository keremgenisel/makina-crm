# 0073 Uygulama Planı: Kasa Hareketlerinin Düzenlenmesi ve Silinmesi

| | |
|---|---|
| **Bağlı spec** | `specs/0073-kasa-hareketlerinin-duzenlenmesi.md` (R2, plan onayıyla) |
| **Dal** | `feat/0073-hareket-duzenleme` (`feat/0070-sgk-yol` `b7161c3` üstünde, R29) |
| **Onay** | Takım Yöneticisi, 2026-10-06: bütün öneriler (Q1–Q9) kabul |

## 1. Kodda bulunanlar (spec'e ek)

- Mahsup Kasa'nın iki listesinde de yok (`hesapsizOdemeler` yalnız ödeme ve avans alır; mahsup hesapsızdır). AC-4'ün tek yolu
  ödeme penceresinin "Kayıtlı ödemeler" listesi (Q3 → R1 revizyonu, AC-41).
- `virmanDogrula`, `odemeDogrula` ve avans hesap denetimi kapalı hesaba hareket yazmayı reddeder; kapalı hesaptaki hareketin
  yalnız tarihi de düzeltilemez (Q5 → R27, AC-44).
- `odemeGirisiYaz` silinen + yeni hareketi tek güncellemede yazıyor; avans silme (`CalisanAvanslari`) ve virman silme
  (`Kasa.virmanSil`) kendi filtrelerini yazıyor (Q8 → R20).

## 2. Dosyalar

- Motor: `src/lib/formOdemesi.js` (`odemeGirisiHazirla` `kip: "duzenle"`, `odemeGirisiYaz` `guncellenenler`), `src/lib/kasa.js`
  (`avansDuzenlenebilirMi`, `hareketDuzenlemeDurumu`, düzenleme yardımcıları).
- Arayüz: `src/components/Kasa.jsx` (iki liste, ibareler, `VirmanFormu` düzenleme kipi, pencereler), `src/components/kasa/CalisanAvanslari.jsx`
  (`AvansFormu` dışa verilir, düzenleme kipi, ortak silme), `src/components/gider/OdemeGirisi.jsx` ve `OdemeKayitPenceresi.jsx`
  (düzenleme kipi, "Kayıtlı ödemeler" Düzenle), `src/components/Giderler.jsx` ve `Dashboard.jsx` (ortak yazma),
  `src/components/settings/SettingsAuditLog.jsx` (`kasa_hareketi`), `src/lib/kilitAlanlari.js`.
- Testler: `tests/hareket-duzenleme-0073.test.js`, `tests/ui/hareket-duzenleme-0073.test.jsx`, ek bloklar `islem-gecmisi-etiketleri`,
  `kilit-alanlari`, `ui/kasa`, `ui/sayfalama-0062`.
- Kanıt: `scripts/evidence/0009-sayfa.jsx`, `docs/evidence/0073-*`, `kanit-eslemesi.json`. Belgeler: `CLAUDE.md`.

Sunucu (C4'ün yedi listesi), `merge.js` ve DB değişmez.

## 3. Kararlar

Q1 → R29 · Q2 → R25, AC-42 · Q3 → R1, AC-41 · Q4 → R26, AC-43 · Q5 → R27, AC-44 · Q6 → R28, AC-30 · Q7 → R14, AC-45 ·
Q8 → R20, AC-29 · Q9 → AC-40.

## 4. Adım sırası

1. Taban çekimi ayrı çalışma ağacından (`b7161c3`), çekim sürerken test koşulmaz.
2. Motor ve motor testleri (düzenleme kipi, iki kolda "bu hareket hariç", avans sınırı, göç hareketi, ortak yazma yolu).
3. Pencereler (ödeme / mahsup, virman, avans).
4. Kasa'nın iki listesi ve ibareler, kilit, işlem geçmişi.
5. Tam takım, Electron testleri, lint; görsel kanıt, `CLAUDE.md`.

## 5. Kriter ↔ test

| Kriter | Test |
|---|---|
| AC-1, 26, 27, 28 | `ui/hareket-duzenleme-0073` (gerçek Kasa) |
| AC-2, 3, 4, 41 | ui (virman, avans, mahsup "Kayıtlı ödemeler"den) + motor |
| AC-5, 6, 23 | motor |
| AC-7, 43 | ui |
| AC-29 | motor + kaynak taraması + ui |
| AC-8, 9, 10, 11, 30, 32 | motor |
| AC-12 | motor |
| AC-31 | kaynak taraması + mevcut testler dokunulmadan |
| AC-13, 14, 33, 34, 35, 42, 44 | ui |
| AC-15, 36 | motor + ui |
| AC-16, 17, 37 | ui |
| AC-18, 38, 45 | ui + `kilit-alanlari` |
| AC-19, 39 | ui + `islem-gecmisi-etiketleri` + `geriAl` taraması |
| AC-20, 21, 22 | ui (gerçek Kasa; kapsam dışı temizliği gerçek App) |
| AC-24, 25 | kaynak taraması |
| AC-40 | motor (`buildMergePlan`) |

## 6. Uygulama notları

- Kasa listelerinde silme: virman bugünkü gibi anlık (onaysız) kalır; ödeme ve avans satırdan onayla silinir. Avans silme
  bugünkü `avansSilinebilirMi` kuralından geçer. Ödeme silme işlem geçmişine Giderler'deki gibi `odeme_iptal`/`gider` yazar;
  kalemi kalıcı silinmiş ödemenin silmesi `silindi`/`kasa_hareketi`.
- Virman ve avans penceresi kapalı hesaptaki hareketi de listeler (seçili değer boş kalmasın) ve `KAPALI_HESAP_NEDENI`'ni
  yazar; kayıt doğrulayıcı tarafından reddedilir.
- AC-37 (Kasa sekmesi olmayan kullanıcı) ekranın kendisiyle sağlanır: Kasa ekranı yalnız Kasa sekmesi ve önkoşulla çizilir
  (0052 `kasa-sekme-izni` testleri); eylemler o ekranın içindedir, ayrı kapı yoktur.
- AC-22 (kapsam dışı temizliği) ui testinde App'in kullandığı saf `kapsamDisiTemizle` ile, düzenlemeden sonraki gerçek hareket
  dizisi üstünde sınanır.
- **Triyaj bulgu 1 (düzeltildi):** `buildMergePlan` aynı kimlikli ve içeriği farklı kaydı, kimlik bu oturumda üretilmişse yeni
  kimlikle ekliyordu; bu oturumda girilip düzenlenen ödeme birleştirmede iki kez yazılırdı. `merge.js` artık `hesapHareketleri`'nde
  aynı kimlikli kaydı hiç eklemez (`partStockLog` emsali); düzenleme R24'teki gibi sunucu kopyasına yenilir. AC-40 iki durumu da
  sabitler. §2'deki "merge.js değişmez" bu düzeltmeyle geçersizdir.
- **Triyaj bulgu 3:** avans düzenlemesinde çalışan değişmediği için silinmişlik denetimi o çalışan için atlanır (çağıranda;
  `avansDogrula` imzası aynı). **Bulgu 4:** ödeme penceresi düzenlemede hareketin kapalı hesabını seçenek listesine ekler.
- **Triyaj bulgu 5:** AC-37 gerçek App testi `ui/hareket-duzenleme-0073-app.test.jsx`; DoD'nin ek blok listesi gerçek dosyalarla
  düzeltildi (`kasa.test.js`, `ui/kasa` değişmedi; `islem-gecmisi-etiketleri` ve `kilit-alanlari` kaynak taramasıyla kapsar).
