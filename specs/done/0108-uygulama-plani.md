# 0108 uygulama planı

Spec: `specs/done/0108-uretim-formu-bagi-kopunca-kalip-bekleyen-olur.md` (revizyon 3). Dal `feat/0108-uretim-formu-bagi`, taban `3169f71`.

## 1. Dosyalar

| Dosya | Değişiklik |
|---|---|
| `src/lib/musteriDurumu.js` | `bagCanliMi`, çekirdek `kalipBekliyorMu`, sarmalayıcılar `musteriKalibiBekliyorMu(k, musteriId, i, harita)` / `extraKalipBekliyorMu(ps, harita)`, `kalipDurumuTuret` canlılıkla (Karar 17), `formSilinceDonenSayisi`, `formSilmeDonusMetni` |
| `src/components/stock/uretimFormPrint.js` | `uretimFormDonemMetni` |
| `src/components/stock/UretimFormu.jsx` | `enEskiBekleyenKalipTarihi(customers, partSales, uretimFormlari)`, getirme haritayla, liste dönem metni yardımcıdan, silme onayında sayı |
| `src/components/Dashboard.jsx` | Sayaç haritayla, bağımlılıkta `uretimFormlari` |
| `src/components/settings/SettingsTrash.jsx` | Üretim formu etiketi dönem metni + not |
| `scripts/evidence/0009-sayfa.jsx` | Üç yeni ekran ve `satir-son-dugme` adımı |
| Testler | `tests/uretim-formu-bagi-0108.test.js`, `tests/ui/uretim-formu-bagi-0108.test.jsx`, `tests/fixtures/0108-tarama-once.json`; "spec 0108 ile" güncellenen `musteri-durumu-0106`, `ui/musteri-durumu-0106`, `extra-kalip-isareti-0107`, `uretim-bekleyen-tarih` |

## 2. Sıra

1. Önkoşul testleri eski kodla yeşil (AC-1, AC-2, AC-18, AC-21, AC-25, AC-30, AC-39), kusur testleri eski kodla kırmızı.
2. Kütüphane, dönem metni, üç okuyucu, silme onayı, Çöp Kutusu.
3. Eski testlerin güncellenmesi; saf testler, taramalar, fikstür; mutasyonlar.
4. Kanıt (Karar 22), tam test, belgeler.

## 3. Kararlar

Plan turu kararları spec'te Karar 17–24.

## 4. Kriter ↔ test

| Kriter | Test |
|---|---|
| AC-1–AC-9, AC-33, AC-40, AC-41 | saf `it.each` hâl tablosu (+ ui önkoşul AC-1) |
| AC-10, AC-11, AC-38, AC-42 | saf |
| AC-12, AC-35, AC-34, AC-44 | saf taramalar |
| AC-13, AC-19, AC-39 | ui gerçek `UretimFormu` (durumlu kap) |
| AC-14–AC-17 | ui: çöpe at, geri al (damga aynı), kalıcı sil |
| AC-18 | ui |
| AC-20, AC-21, AC-37, AC-40 | ui gerçek `Dashboard` |
| AC-22, AC-32 | saf + `uretim-bekleyen-tarih` |
| AC-23 | ui getirme tarih aralıklı, saf sayaç tarihsiz (iki yol ayrı fonksiyon) |
| AC-24, AC-25, AC-36 | saf sayı + ui onay |
| AC-26–AC-28 | ui gerçek `SettingsTrash` |
| AC-29, AC-43 | saf türetme + ui gerçek `Customers` + `Dashboard` (Karar 17'ye göre iki durum) |
| AC-30 | ui önkoşul + tarama (iki damga yazımı) |
| AC-31 | saf anlamsal tarama |

## 4b. Uygulamada çıkanlar

- **Kanıt (Karar 22):** 25 ekran × 2 tema = 50 görüntü. İş raporu (`0108-piksel-raporu.json`, eski ↔ yeni) yalnız iki ekranı değişmiş gösterir: `uretim-formu-0108-sil-onay` (dönecek kalıp cümlesi) ve `ayarlar-cop-0108-uretim` (çöpte boş görünen etiketin yerine dönem metni ve not). `uretim-formu-0108-sil-onay-bos` eski kodla aynı (cümle yok, AC-25). Mevcut 22 ekranın (0106 pilleri dahil, Karar 23) hiçbirinde fark yok. Taban (`0108-taban-piksel-raporu.json`) son kodla ikinci çekim, 50 görüntü 0 fark; üç kayıt `ayni`.
- **Kanıt aracı:** ilk çekimde "boş onay" ekranı da dolu formu siliyordu (liste tarihe göre sıralı, adım hep ilk satıra basıyordu); adım `satir-son-dugme:n` oldu ve üç çekim baştan yapıldı.
- **Mutasyonlar (beşi de yakalandı):** sayacın `useMemo` bağımlılığı (AC-37 + tarama), eski damga ölçütü (20 test), elle bitti kısa devresi (7), Karar 17 yerine spec'in eski metni (AC-43, AC-29), silme sayısının satır sayısı olması (AC-24/36).
- **Kırmızı-yeşil:** kusur testleri eski kodla kırmızı (getirme, çöpe atma, sayaç, silme onayı, Çöp Kutusu), önkoşullar eski kodla yeşil.
- **Triyaj (üç bulgu, üçü de gerçek):** (1) "boş" onay ekranı ilk çekimde dolu formu açıyordu (liste tarihe göre sıralı); triyaj anı ile düzeltme (`satir-son-dugme:n`, ikinci satır) çakıştı, şimdi bekçi test iki ekranın farklı satıra bastığını ve taban görüntülerinin farklı olduğunu sabitler. (2) Silme sayısının "damga bu formu gösterir" şartı testsizdi; AC-36 düzeneğine damgası çöpteki (93) ve olmayan (94) formu gösteren iki satır eklendi, şart kaldırılınca sayı 4 olup test kırılır. (3) Kapanış belge adımlarına bekçi test (TASINACAK, commit satırı, ana dizindeki revizyon 2 kopyası).
- **Tam takım:** 411 dosya, 5499 test (Electron dahil); lint 0 hata; tip denetimi temiz.

## 5. Sürüm notu

> Bir kalıp üretim formundan çıkarılırsa ya da formu çöpe atılırsa artık kaybolmaz: hemen "Bekleyen Kalıpları Getir" listesine ve Anasayfa'daki bekleyen kalıp sayısına döner; formu çöp kutusundan geri alırsanız listeden yeniden çıkar. Silme onayı kaç kalıbın döneceğini yazar. Çöpten geri alma hakkı otuz gün sonra sona erer. Elle "Hazır" ya da "Teslim edildi" yazılmış kalıp, hiç gönderilmemiş olsa da artık bekleyen listesinde görünmez. Bilinen sınır: müşterinin kalıp listesinde sıra değişmişse (bir kalıp silinmişse) sonraki kalıplar bekleyen listesine dönebilir ve ikinci bir forma eklenebilir. Çöp Kutusu'ndaki üretim formları artık tarih aralığı ve notuyla görünür.

## 6. Kapanış

- Uygulama commit `40bfeaa`. Taban zaten son kodla çekilmişti (iş raporunun sonrası ↔ son kod, 50 görüntü 0 fark); o çekimden sonra kaynak ve kanıt aracı değişmedi (triyaj yalnız testleri değiştirdi), kapanışta ikinci kez çekilmedi. Üç kayıt `ayni`.
