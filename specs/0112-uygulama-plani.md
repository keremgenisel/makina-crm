# 0112 Uygulama planı: bağlı bilgisayarlar kartı silinmiş kullanıcıyı listelemez

Spec: `specs/0112-bagli-bilgisayarlar-silinmis-kullanici.md` (revizyon 2, plan turu Karar 13–19). Dal `feat/0112-bagli-bilgisayarlar`, taban `c1d1df5`.

## 1. Dosyalar

| Dosya | Değişiklik |
|---|---|
| `src/lib/surumOzeti.js` | `surumOzeti(kayitlar, sunucuSurum, adlar = null)`: adlar `enYeni` haritasından sonra süzgeç (kırpılmış, birebir, `trLower` yok); dönüş şekli aynı. Yeni `kullaniciAdlari(cevap)` (dizi değil/boş/adsız → `null`, `is_active`'e bakmaz). |
| `src/components/settings/BagliBilgisayarlar.jsx` | `tazele` prop'u; kullanıcı listesi kendi `[tazele]` efektinde (`/api/users`, GET); güvenlik geçmişi `[]` efektinde değişmedi. Durum `null` (bekliyor) / yerel `OKUNAMADI` / ad dizisi (dize adları 0106 taramasına girmesin diye). Yeni sabitler `KALDIRMA_IBARESI` (`kaldirma-ibaresi`), `SUZME_YAPILAMADI_IBARESI` (`suzme-yapilamadi`), `BOS_METNI`. |
| `src/components/settings/UserManager.jsx` | İsteğe bağlı `onKullaniciDegisti`, her başarılı `load()` sonunda. |
| `src/components/settings/SettingsServer.jsx` | `kullaniciNesli` sayacı; yalnız sunucu dalındaki Kullanıcı Yönetimi'ne geri çağırım, karta `tazele`. |
| `src/lib/kilitAlanlari.js` | Kartın kilitsizlik gerekçesi iki okumayı söyler (R15). |
| `tests/surum-gorunurlugu-0085.test.js` | AC-23 taraması daraltıldı (C6, "spec 0112 ile" notlu). |
| Yeni testler | `tests/bagli-bilgisayarlar-0112.test.js` (saf, taramalar), `tests/ui/bagli-bilgisayarlar-0112.test.jsx` (gerçek `SettingsServer` ve kart). |
| `scripts/tests/server-security.cjs` | AC-15 denetim izi: silinen kullanıcının giriş kaydı sürümüyle durur, `kullanici_silindi` eklenir. |
| Kanıt | `scripts/evidence/0009-sayfa.jsx` sahte köprü kullanıcı listesi döndürür, üç yeni ekran; `0112-piksel-raporu.json`, `0112-taban-piksel-raporu.json`, `kanit-eslemesi.json` kaydı. |

Yeni izin, kalıcı alan, veri bölümü, sunucu ucu ve IPC kanalı yok (R10).

## 2. Adım sırası

Saf katman → kart → sinyal (UserManager, SettingsServer) → 0085 taramasının daraltılması → arayüz ve uçtan uca testler, kasıtlı bozma denetimi (harf katlama, sinyal, bekliyor/hata ayrımı, ibare sırası, hata ibaresi) → kanıt → belgeler.

## 3. Kararlar

Spec Karar 1–12 ve plan turu Karar 13–19: R11 harfiyen, açılışta ikinci okuma kabul (13); yeniden okuma hatası Karar 1'e göre (14); AC-26 taraması yerel durumu kapsamaz (15); Ipucu sırası (16); `kullaniciAdlari` girdisi `data` dizisi (17); köprüsüz hâl bekliyor (18); hata yolu testleri kartı tek başına çizer (19).

## 4. Ters çevrilen kriterler

Yalnız 0085 AC-23'ün kaynak taraması daraltıldı (C6). 0085 arayüz dosyasının dokuz kart testi dokunulmadan yeşil (AC-28).

## 5. Kriter ↔ test

| Kriter | Test |
|---|---|
| AC-1, AC-2, AC-3, AC-4, AC-5, AC-9, AC-17, AC-24, AC-27 | ui "Spec 0112: süzme" |
| AC-6, AC-7, AC-8, AC-19, AC-20 | ui "liste okunamadığında güvenli açık" |
| Karar 13 (yeniden okuma) | ui "Spec 0112 triyaj: yeniden okuma": önceki süzme yolda kalır; ters sırada dönen eski cevap atılır |
| AC-10, AC-11, AC-12, AC-13, AC-21, AC-22, AC-31 | saf "Spec 0112: saf özet" |
| AC-14, AC-25 | ui "kartın metinleri"; saf AC-14 taraması |
| AC-15 | ui "Kullanıcı Yönetimi'nden silme" (aynı ekranda kaybolur, yeniden okuma); `server-security.cjs` (denetim izi) |
| AC-16 | ui "AC-16"; 0085 AC-28 testi |
| AC-18, AC-26, AC-30 | saf "kaynak taramaları"; daraltılmış 0085 AC-23 |
| AC-23 | ui istek sayısı; saf tarama (zamanlayıcı yok, `[tazele]`) |
| AC-28 | `tests/ui/surum-gorunurlugu-0085.test.jsx` dokunulmadan |
| AC-29 | `kanit-eslemesi`, `tasarim-kaynak`; üç yeni ekran |

## 6. Sürüm notu

Sunucu bilgisayarındaki "Bağlı bilgisayarlar ve sürümleri" kartı artık yalnız var olan kullanıcıları listeler: artık kullanılmayan bir bilgisayarı listeden çıkarmak için kullanıcısını Kullanıcı Yönetimi'nden silmeniz yeterli, satır aynı ekranda kaybolur. Kullanıcı Geçmişi'ne dokunulmaz. Kullanıcı listesi okunamazsa kart bütün satırları gösterir ve bunu yazar.
