# 0111 Uygulama planı: toplu yedek parça satışı yerinde düzenlenir

Spec: `specs/0111-toplu-yedek-parca-duzenlemesi-yerinde.md` (revizyon 3: plan turu Karar 13–23, triyaj R2/3, R6/4, R9/2). Dal `feat/0111-toplu-yedek-parca`, taban `ae2236c` (v3.50.0).

## 1. Dosyalar

| Dosya | Değişiklik |
|---|---|
| `src/lib/yedekParcaSatis.js` | Saf `topluDuzenlemePlani` (karar), `otomatikTamTahsisMi`, `tahsisYenile`, metin sabitleri (`TOPLU_PARTI_DEGISTI`, `TOPLU_SATIR_HATASI`, `TOPLU_BOS_HATASI`, `TOPLU_GUNCELLENDI`, `TOPLU_BAYIYE_GECTI`); `:23` yorumu (C10). Mevcut kurucular değişmedi. |
| `src/components/customers/CustomerDetailModal.jsx` | Toplu form açılışı ortak alanları birincil kayıttan kurar, satır `_kayitId` taşır; toplu kayıt kolu planı uygular (stok, damga, ekleme, alarm, İşlem Geçmişi, bildirim); kayıt kilidi (`_kilitId`) ve kayıt anı kilit denetimi. |
| `src/components/YedekParcaSatisForm.jsx` | Satır altında `satir-hatasi-<i>` (`HataMetni`); satıra dokununca hata düşer. |
| `src/components/Customers.jsx`, `src/App.jsx` | `aktifKullanici` prop zinciri (Karar 19). |
| `docs/tasarim-sozlugu.md` | `Customers.jsx` iki satır atfı kaydı (prop satırı). |
| Testler | `tests/toplu-yedek-parca-0111.test.js` (saf, taramalar), `tests/ui/toplu-yedek-parca-0111.test.jsx` (gerçek Customers + detay, SettingsTrash, Stok listesi, kilit), `tests/ui/toplu-yedek-parca-0111-app.test.jsx` (gerçek App gövdesi), `tests/server-authz.test.js` 0111 bloğu, `scripts/tests/server-security.cjs` (`topluDuzenleyici`). |
| Kanıt | `scripts/evidence/0009-sayfa.jsx` üç ekran, `0111-piksel-raporu.json`, `0111-taban-piksel-raporu.json`, `kanit-eslemesi.json`. |

Sunucu, veritabanı, izin, birleştirme, yeni alan ve bölüm yok (C1).

## 2. Adım sırası

1. Saf fonksiyon ve testi (kararlar, tahsis, stok tabanı, satır hataları, parti değişti).
2. Form satırı hatası, modal açılış ve kayıt kolu, kilit, prop zinciri.
3. Arayüz ve gerçek App testleri, mutasyon denetimi (konum eşlemesi, `netDusumAyni`, taban, ekleme yeri, satır hatası yazımı, kilit denetimi).
4. Sunucu ölçümü (Karar 13 burada bulundu), uçtan uca kullanıcı.
5. Kanıt, belgeler, tam takım.

## 3. Kararlar

Spec'teki Karar 1–12 (QA turu) ve plan turu Karar 13–23. Özet: eklenen kaydı saf fonksiyon kurar (C9, Karar 14); kimlik ve zaman parametreden (Karar 15); ücretsiz işaret ödeme alanlarını temizler, kapalıyken satır kendi `odendi`/`tahsilatTarihi`'sini korur (Karar 16); satır hatası formun geçici alanında (Karar 18); izin kümesi bayi boyutunu da sabitler (Karar 13); eklenen kayıt dizinin sonuna (Karar 23).

## 4. Ters çevrilen kriterler

Yok. 0095 AC-48 triyaj bloğu (`tests/ui/ucretsiz-yedek-parca-0095.test.jsx`) dokunulmadan yeşil (AC-41).

## 5. Kriter ↔ test

| Kriter | Test |
|---|---|
| AC-1, AC-2 | saf "AC-1 / AC-2"; ui "AC-1 / AC-2"; app "AC-1 / AC-2 / AC-17"; e2e "spec 0111 AC-1" |
| AC-3, AC-4, AC-5 | saf; ui "AC-3 / AC-4 / AC-5" (SettingsTrash geri alma) |
| AC-6 | saf; ui "AC-6" |
| AC-7 | saf (ters sıra); ui AC-3 (ortadaki satır, Karar 17) |
| AC-8, AC-9, AC-10 | saf; ui "AC-8", "AC-9", "AC-10" |
| AC-11, AC-27, AC-27/2, AC-37, AC-39, AC-43 | saf |
| AC-12, AC-41 | saf; ui "AC-12 / AC-41"; 0095 AC-48 bloğu |
| AC-13, AC-14, AC-16, AC-42 | saf; ui "AC-44" (AC-16 bayi yarısı) |
| AC-15 | saf; ui "AC-15" (Tahsisi eksik listesi) |
| AC-17 | saf; ui "AC-17"; app |
| AC-18, AC-19, AC-30, AC-32 | saf |
| AC-20, AC-21, AC-31, AC-35 | server-authz 0111 bloğu; e2e `topluDuzenleyici` |
| AC-22 | ui "AC-22" |
| AC-23, AC-34 | saf (`yeniKargolar`); ekran `yerelServisEkle` kolu |
| AC-24, AC-33 | saf (saflık taraması, iki çağrı eşitliği); app (işaret sızmaz) |
| AC-25, AC-26, AC-29 | saf; ui "AC-25", "AC-26 / AC-29" |
| AC-28 | ui "AC-28" (partisiz kol); saf tarama (Stok, bayi, pano yolları) |
| AC-36 | ui iki "AC-36" |
| AC-38 | saf; ui "AC-38" |
| AC-40 | ui "AC-40" |
| AC-44 | ui "AC-44" |
| AC-45 | saf tarama |
| AC-46 (R6/4) | saf "Spec 0111 triyaj: formdaki Ödendi kutusu"; ui "R6/4" iki test |
| AC-47 (R2/3) | saf "form açıkken partiye eklenen kayıt"; ui "R2/3" |
| AC-48 | ui "AC-34 (ekleyen bilgisayar)" |
| AC-49 (R9/2) | saf "bildirim"; ui "R9/2" |

## 6. Sürüm notu

Müşteri detayındaki makina geçmişinden toplu (çok kalemli) yedek parça satışı düzenlendiğinde kayıtlar artık silinip yeniden yazılmaz: kimlikleri, oluşturma zamanı, teslim şekli, farklı teslimat adresi, tevkifat, teklif bağı ve elle yapılan makina tahsisi korunur, değişmeyen satırda stok hareketi yazılmaz. Formdan çıkarılan satır Çöp Kutusu'na gider ve stoğu geri alınır; eklenen satır partiye katılır. Geçersiz satır (parçası ya da miktarı boş) kaydı bütünüyle durdurur ve nedeni satırın altında yazar. Toplu düzenleme artık kayıt kilidi alır. Formdaki "Ödendi" kutusu işaretlenir ya da kaldırılırsa bütün partiye uygulanır; dokunulmazsa her satır kendi ödeme durumunu korur. Daha önceki düzenlemelerde kaybolmuş bilgiler geri gelmez (X3).
