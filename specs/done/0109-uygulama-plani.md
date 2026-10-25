# 0109 uygulama planı

Spec: `specs/done/0109-makina-durumu-stoktan-on-doldurulur.md` (revizyon 2). Dal `feat/0109-makina-durumu-ondoldur`, taban `6140673`.

## 1. Dosyalar

| Dosya | Değişiklik |
|---|---|
| `src/lib/satisKaydi.js` | `makinaDurumuOnDoldur` (R11/2), `MAKINA_DURUMU_KAYNAK` (R17); `makinaDurumuDamgala` yardımcıyı çağırır, imzası ve kuralı aynen |
| `src/components/customers/CustomerAddEditForm.jsx` | Stok seçicisinin dört dalı, model kartı, makina durumu seçicisi; iki modül düzeyi yardımcı (`makinaDurumuOndoldu`, `makinaDurumuTemizle`) |
| `src/components/Customers.jsx` | İşaretin dört noktası, `deductMachineStock` kapısı |
| `scripts/evidence/0009-sayfa.jsx` | `STOK_0109`, üç yeni ekran |
| Testler | `tests/makina-durumu-ondoldur-0109.test.js`, `tests/ui/makina-durumu-ondoldur-0109.test.jsx`, `tests/ui/makina-durumu-ondoldur-0109-app.test.jsx`, `tests/fixtures/0109-tarama-once.json`; "spec 0109 ile" güncellenen `tests/ui/musteri-durumu-0106-app.test.jsx` (yalnız `onizleme` satırı) |

## 2. Sıra

1. Önkoşul testleri eski kodla yeşil (AC-11, AC-15, AC-18, AC-19, AC-21, AC-34), kusur testleri eski kodla kırmızı (AC-1–AC-6, AC-13, AC-14, AC-28, AC-32).
2. Kütüphane, form, kayıt yolu.
3. 0106 testinin tek satırı, saf testler, taramalar, fikstür; mutasyonlar.
4. Kanıt (Karar 16), tam test, belgeler.

## 3. Kararlar

Plan turu kararları spec'te Karar 13–20.

## 4. Kriter ↔ test

| Kriter | Test |
|---|---|
| AC-1–AC-6 | ui "ön doldurma" |
| AC-7–AC-10, AC-31 | ui "temizlenme" |
| AC-11, AC-15, AC-18, AC-19, AC-21, AC-34 | ui önkoşul |
| AC-12, AC-13, AC-14, AC-25, AC-26, AC-27, AC-28, AC-32 | ui "yazma anı" |
| AC-16, AC-28 | app (gerçek App, kaydedilen gövde) |
| AC-17, AC-30 | saf tarama + 0106'nın `uretimDurumuOf` taraması (dokunulmadı) |
| AC-20 | ui (kalıp seçicisinin "Otomatik (…)" seçeneği) |
| AC-22, AC-34 | 0106 app AC-1'in damga beklentileri aynen |
| AC-23 | 0106 pil ve süzgeç testleri dokunulmadan yeşil |
| AC-24 | saf anlamsal tarama |
| AC-29 | saf + `tests/musteri-durumu-0106.test.js:42-44` dokunulmadan yeşil |
| AC-33 | saf kanıt kaydı testi (Karar 16) |
| AC-35 | saf |

## 4b. Uygulamada çıkanlar

- **Kanıt (Karar 16):** 16 ekran × 2 tema = 32 görüntü. İş raporu (`0109-piksel-raporu.json`, eski ↔ yeni) yalnız üç ekranı değişmiş gösterir: `musteri-formu-0104-stok` (seçici artık "Hazır"), `musteri-formu-0109-montaj` ("Montajda"), `musteri-formu-0109-hazir` ("Hazır"). `musteri-formu-0109-manuel` eskisiyle aynı ("Seçilmedi"); öteki müşteri formu ve liste ekranları 0 fark. Taban son kodla, 32 görüntü 0 fark. `musteri-formu-0104-stok`'un 0104 kapanış raporuna bağlı kaydı 0109 tabanına `ayni` olarak taşındı (0105 ve 0106 tabanlarındaki iki kaydı o raporların eski görüntüsüyle yerinde); üç yeni kayıt `ayni`.
- **Eski testlerde kayan iki şey:** 0104 Karar 36 taraması iki çağrının birebir metnini arıyordu, işaretle güncellendi ("spec 0109 ile"); 0101 AC-22 `satisKaydi.js`'te "kalipCapi" adını yasaklıyor, yeni yorumdaki emsal adı kaldırıldı. Sözlüğün dört `dosya:satır` atfı form yardımcıları yüzünden kaydı, güncellendi.
- **Triyaj (üç bulgu, üçü de gerçek):** (1) temizlik alanı değerin kaynağına bakmadan siliyordu; satılmış makinanın model düzeltmesi, stoğa bağlı seri bekleyen kaydın model değişimi ve bağsız seri bekleyende doğrudan "Manuel gir" kayıttaki değeri siliyordu. Temizlik yalnız `ondoldu` işaretinde (Karar 21); üç yol ve elle seçilmiş değer için testler eklendi, AC-5 testi P4 iddiasını taşıyor; eski şartsız temizlikle dört test kırılıyor. (2) `CLAUDE.md` 0106 bölümündeki eski "önizleme göstermez" cümlesi değişti, test sabitliyor. (3) Kapanış belge adımları kapanışta.
- **Mutasyonlar (beşi de yakalandı):** ön doldurmanın düşürülmemesi (AC-14, AC-25, AC-26), `elle` kapısının kaldırılması (AC-13), ekleme kolundaki ayıklamanın kaldırılması (AC-16 gerçek App gövdesi), model temizliğinin serisiz koşula girmesi (AC-31), "Manuel gir"in temizlememesi (AC-8/9).

## 5. Sürüm notu

> Yeni müşteri kaydında stoktan bir makina seçilince "Makina durumu" kendiliğinden o makinanın durumunu gösterir ("Montajda" ya da "Hazır"). İsterseniz değiştirebilirsiniz; değiştirmezseniz kayıtta gerçekten stoktan düşülen makinanın durumu yazılır. "Seçilmedi" seçerseniz alan boş kalır. "Manuel gir"e dönmek, boş seçenek ve model değişimi alanı temizler.

## 6. Kapanış

- Uygulama commit `802744f`. Taban son kodla çekilmişti (32 görüntü, 0 fark); triyaj düzeltmesi (Karar 21) yalnız kayıttan gelen değerin temizlenmesini kaldırdı, kanıt ekranlarının dördü de stok satırı seçen ya da yeni müşteri akışıdır ve görünümü değişmedi; kapanışta ikinci kez çekilmedi. Dört kayıt `ayni`.
- Uygulama commit'inde 0109'un belge testi (`CLAUDE.md` 0106 bölümü) kırmızıdır, çünkü `CLAUDE.md` kapanış commit'ine girdi; ikisi birlikte yeşil.
