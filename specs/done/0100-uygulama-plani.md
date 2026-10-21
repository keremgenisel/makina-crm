# 0100 Uygulama Planı: stoktaki makinanın üretim durumu ve parti üretim panosu

Spec: `specs/done/0100-stok-makina-durumu.md` (revizyon 3). Onay: Takım Yöneticisi, 2026-10-21 (on beş öneri, P1–P15).
Çalışma yeri: `../wt-0100`, dal `feat/0100-stok-durumu`, taban `main` `530ae98`.

## 1. Dosyalar

| Dosya | Değişiklik |
|---|---|
| `src/lib/stokDurumu.js` (yeni) | `URETIM_DURUMU`, `DURUM_ADLARI`, `uretimDurumuOf`, `stokDurumOzeti(veri)` (satır haritası dahil), `partiUretimOzeti(veri, partiId)`, `durumSuzgeciUyar`, `serisizDusulecek`, `serisizSecenekMetni`, `panoVarsayilanParti`; `partiAcikMi` çağrılır |
| `electron/db.cjs` | `uretimDurumu TEXT` dört nokta, okuma ayıklamalı |
| `src/hooks/useFilteredList.js` | isteğe bağlı `ikinciFiltre` + `oncesi` (P2) |
| `src/components/stock/MakinaStokTab.jsx` | Durum sütunu ve rozetler, `stok-ozet`, `Segment` durum süzgeci, form seçicisi, ekleme `"montaj"` |
| `src/components/stock/PartiUretimPanosu.jsx` (yeni) | parti seçici, beş sayı, model tablosu, boş durum |
| `src/components/Stock.jsx` | `giderYetki` ile pano alt sekmesi |
| `src/components/customers/CustomerAddEditForm.jsx` | seçenek metinleri, kit ön doldurması, parti seçicisi |
| `src/components/Customers.jsx` | serisiz düşüm kimlikle; stoktan seçimde parti stok satırından |
| `src/components/ui.jsx` | `StatCard` `ek` yuvası |
| `src/components/Dashboard.jsx` | "Satışa Hazır Makina" kutusu ve penceresi |
| `src/App.jsx` | Dashboard'a kapısız, Customers'a `giderYetki` ile `uretimPartileri` |
| testler | `stok-durumu-0100` (M), `ui/stok-durumu-0100` (S), `-satis` (F), `-anasayfa` (D), `-app` (A); `suzgec-kaynak`, `tasarim-kontrast`, 0079/0095 kıyasları; `db-roundtrip.cjs`, `db-clean-install.cjs`, `tests/fixtures/0100-govde-once.json` |
| kanıt | `scripts/evidence/0009-sayfa.jsx` beş ekran; `0100-taban`, `0100`, `0100-kapanis` raporları; `kanit-eslemesi.json` |

## 2. Adım sırası

1. Taban: kanıt ekranları spec öncesi kodla iki kez; gövde fikstürü spec öncesi kodla; P4 hatasının testi spec öncesi kodda kırmızı.
2. Veri (dört nokta, iki Electron testi).
3. Motor ve testi.
4. Makina Stoğu, kanca.
5. Pano.
6. Satış zinciri.
7. Anasayfa.
8. Ters çevrilen testler, kontrast, süzgeç taraması.
9. Bozma denemeleri, tam takım, lint, kanıt, kayıtlar.

## 3. Kriter ↔ test eşlemesi

M = `stok-durumu-0100.test.js`, S = `ui/stok-durumu-0100.test.jsx`, F = `ui/stok-durumu-0100-satis.test.jsx`, D = `ui/stok-durumu-0100-anasayfa.test.jsx`, A = `ui/stok-durumu-0100-app.test.jsx`.

| Kriter | Test |
|---|---|
| AC-1, AC-2, AC-3, AC-43, AC-44 | S |
| AC-38, AC-45 | `db-roundtrip.cjs`, `db-clean-install.cjs` |
| AC-4–AC-10, AC-46–AC-48 | S (AC-48 ayrıca `suzgec-kaynak`) |
| AC-49 | `tasarim-kontrast` 0030 bloğu, M |
| AC-11–AC-17, AC-50 | M, S |
| AC-62 | M taraması |
| AC-18, AC-19, AC-51, AC-52, P4 | M, F |
| AC-39–AC-42, AC-53, AC-54 | F (AC-41 ayrıca A) |
| AC-20 | M |
| AC-21–AC-27, AC-55–AC-57 | M, S (AC-26 ayrıca A) |
| AC-28–AC-36, AC-58–AC-61 | D (AC-60 ayrıca M taraması) |
| AC-37, AC-37/2 | A (casus), M taraması |

Bozma denemeleri: okuma ayıklaması, ekleme varsayılanı, koşulsuz yazım, `partiAcikMi` yerine kendi karşılaştırma, rozet sayılarının süzgeçli kümeden alınması, sayfa sıfırlaması, serisiz düşümde dizinin ilki, stok seçiminde parti seçicisi, toplamda kırpma, devredilmişleri eleme, satışa hazırı sıfır modelin kutuda görünmesi, `StatCard` yuvasının koşulsuz çizimi.

## 4. Sürüm notu

Güncellenmemiş bir bilgisayardan eklenen makina "Montajda" doğmaz, satışa hazır görünür ve elle düzeltilir. Veri kaybı yok; güncelleme sırası zorunlu değil (ölçüm 25).

## 5. Sonuçlar (2026-10-21)

- **Spec ölçümlerinden sapmalar:** (1) P1: Anasayfa'yı çizen dokuz kanıt ekranı değişti (yedi eski + iki yeni) ve uygulama kabuğunun dar menü ekranı; hiçbiri eşlemede kayıtlı değildi. (2) Ölçüm 7: `!p.bitisAy` kaynakta iki değil dört dosyada (ek olarak `gider/UretimPartileri.jsx` ve eski `makinaMaliyeti.js`); tarama bugünkü dördü sabitler. (3) Ölçüm 24: `MakinaStokTab`'ın eski kayıtları eski raporlara bağlı olduğu için hiçbir test kırılmadı; `stok-alt-sekme` boş stokla çizildiği için değişmedi (spec "değişir" diyordu); değişen `makina-stok-formu`, `stok-makina-parti` ve yeni `stok-0100-durum-suzgec`. (4) 0096'nın `useFilteredList` imza taraması P2 ile güncellendi ("spec 0100 ile").
- **P4 hatası:** testi spec öncesi kodda kırmızıydı (çöpteki satır düşüyor, canlı satır stokta kalıyordu), düzeltmeyle yeşil.
- **Bozma denemeleri:** 15/15 yakalandı.
- **Kanıt:** taban `0100-taban-piksel-raporu.json` (spec öncesi kodla iki çekim, 110 görüntü, 0 fark); `0100-piksel-raporu.json` 15 ekran değişti, 40 ekran 0 piksel (müşteri formları dahil; P14'te liste dışı değişiklik çıkmadı). `uygulama-menu-kasali` aralıklı 31-37 piksel gürültü verdi (bu işle ilgisiz, kenar çubuğunun alt köşesi); tabana 0 çıkan çekimi rapora alındı.
- **Görsel düzeltme:** pano sayı kutuları sözlük gereği `StatCard`'la çizildi (fazla üretim ibaresi `ek` yuvasında).

## 6. Triyaj (2026-10-21, altı bulgu)

1. Plansız modelde fazla üretim artık işaretlenir: R21'in yazılı kuralı (kalan negatifse satır işaretlenir) ve R24'ün "planlanan sıfır" kuralı birlikte uygulanır; uygulama turundaki "yalnız planlı model" yorumu hiçbir yerde kayıtlı değildi ve kaldırıldı (motor testinin AK300 iddiası ters çevrildi, açık 0 planla aynı sonucu verdiği sabitlendi).
2. Üç parti seçicisinin "(açık)" eki `stokDurumu.partiSecenekAdi` ile (`partiAcikMi`); ekran taraması üçlü ifadeyi (`.bitisAy ?`) de yakalar.
3. Serisiz stok seçildiyse formdaki parti, satır yarışta bulunamasa bile kayda girmez. Serili dalda koşulsuz silinmez: stok hiç yokken seri no elle yazılır ve `_manualSerial` false kalır (AC-39'u bozardı, test sabitliyor).
4. Serili düşüm de kimlikle; çöpteki aynı model ve seriyle duran satır silinmez (P4'ün kardeşi).
5. Anasayfa penceresinin düğmeleri `Modal` footer yuvasında (spec 0015); `anasayfa-0100-pencere` kanıtı yeniden çekildi.
6. Süzgeç rozet özeti `useMemo` içinde.

Her düzeltme kendi testini aldı ve geri alındığında o testin kırıldığı ölçüldü (6/6).

## 7. Kapanış

Kapanış kanıtı `0100-kapanis-piksel-raporu.json` (son kod ↔ son kod, 14 görüntü, 0 fark); eşlemedeki beş `degisti` kaydı bu rapora `ayni` olarak yönlendirildi. Özellik commit'i `a6cc65d`.
