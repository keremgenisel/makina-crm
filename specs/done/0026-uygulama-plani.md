# 0026 Uygulama Planı: Genel Aramanın Gider Modülünü Kapsaması

| | |
|---|---|
| **Bağlı spec** | `specs/done/0026-genel-arama-kapsami.md` (revizyon 4; plan onayı, triyaj, TY kararı) |
| **Dal** | `feat/0026-genel-arama` (`feat/0068-cop-kutusu` kapanışı ve iki yerleşim düzeltmesinden sonra) |
| **Onay** | Takım Yöneticisi, 2026-10-03: bütün öneriler (U1–U11) kabul |

## 1. Kodda bulunanlar (spec'e ek)

- Dönem Raporu'nun kalem süzgeci yalnız açıklama, çalışan ve tedarikçi adına bakar ve `trLower` kullanır
  (`DonemRaporu.jsx:257`); genel arama `aramaNormalize` ile tür, tutar, tarih ve vadeyle de bulur. Süzgeci sorguyla
  doldurmak bu kalemlerde boş liste açardı (U1 → R18, AC-7).
- `fmtTR` "GG/AA/YYYY" üretir; spec'in "GG.AA.YYYY" örnekleri ekrandaki biçimle uyuşmuyordu (U2 → R5, R16, AC-31).
- `standartGiderAyi` bu ay geçerli sürümü olmayan grubu döndürmez (U3 → R10, AC-38).
- Ayarlar panelinin adı "Tekrarlayan Giderler" (kimlik `gidertanim`), "Gider Tanımları" değil (R3, AC-9).
- Çek Portföyü'nün varsayılan süzgeçleri ("Elde", "Ödenmeyi bekleyen") tahsil edilmiş, ciro edilmiş ve ödenmiş çeki
  gizler (U6 → R3, AC-41).
- Mevcut testler arama kutusunu `/Müşteri, seri no/` yer tutucusuyla bulur (U10 → R21).

## 2. Dosyalar

- Saf modül: `src/lib/aramaGider.js` (sorgu çözümü, tarih / tutar eşleşmesi, personel tespiti, standart gider grup
  temsilcisi, kayıt eşleşmeleri ve nedenleri).
- Arama: `src/components/GlobalSearch.jsx` (kategori tablosu `KAT` + kapı, `KAT_SIRA` sonu, tek `useMemo`, satırlar,
  iki boş durumda kapsam listesi).
- Hedef ekranlar: `src/components/Giderler.jsx`, `src/components/gider/DonemRaporu.jsx` (`KalemListesi` ilk süzgeç),
  `src/components/Kasa.jsx`, `src/components/cek/CekPortfoyu.jsx`.
- Bağlantı: `src/App.jsx` (diziler yalnız yetkiyle, yönlendiriciler, yeniden kurma anahtarları).
- Testler: `tests/ui/genel-arama-0026.test.jsx` (bütün yeni AC'ler). `tests/ui/global-search.test.jsx` dokunulmaz.
- Kanıt: `scripts/evidence/0009-sayfa.jsx`, `docs/evidence/0026-*`.
- Belgeler: `CLAUDE.md`.

Sunucu, izinler, veritabanı ve merge değişmez.

## 3. Kararlar

U1 → R18, AC-7 · U2 → R5, R16, AC-31 · U3 → R10, AC-38 · U4 → R16, AC-39 · U5 → R19, AC-40 · U6 → R3, AC-41 ·
U7 → R20, AC-37 · U8 → R18 · U9 → R23 · U10 → R21 · U11 → R22.

## 4. Adım sırası

1. Saf modül ve testleri. 2. `GlobalSearch`. 3. Hedef ekranların başlangıç prop'ları (verilmezse davranış aynı).
4. App bağlantısı. 5. Gerçek App testleri (AC-7..9, AC-11, AC-41). 6. Electron dışı takım, lint, Electron testleri.
7. Kanıt, TY onayı, belgeler.

## 5. Kriter ↔ test eşlemesi

Bütün testler `tests/ui/genel-arama-0026.test.jsx`'te (`AC-n:` adıyla); AC-13 hariç.

| AC | Test |
|---|---|
| AC-1, AC-2, AC-3 | Bileşen: açıklama, tür adı, tedarikçi adı (tedarikçi + kalemleri) |
| AC-4, AC-5 | Bileşen: tanım adı, standart gider adı |
| AC-6, AC-19, AC-20, AC-40 | Bileşen: personel kalemi / tanımı hiçbir alanla çıkmaz; `calisanId` savunması |
| AC-7, AC-8, AC-9, AC-41 | Gerçek App: sekme, görünüm, dönem, süzgeç; Ayarlar paneli; Kasa hesap / çek |
| AC-10, AC-27, AC-28 | Bileşen yetki bileşimleri; AC-10 gerçek App'te gider sekmesiz kullanıcıyla da |
| AC-11 | Gerçek App, `vi.mock` ile perde inik |
| AC-12 | Bileşen: boş kutu ve "Sonuç bulunamadı" ekranında kapsam listesi yok (revizyon 4); AC-34 kaldırıldı |
| AC-13 | `tests/ui/global-search.test.jsx` dokunulmadan yeşil |
| AC-14, AC-25 | Bileşen: çöpteki kalem, tedarikçi, parti |
| AC-15, AC-31 | Bileşen: taksit vadesi ve neden metni |
| AC-16, AC-17, AC-23, AC-24 | Bileşen: parti, hesap, kapalı ibaresi |
| AC-18, AC-26 | Bileşen: çek no / keşideci / banka; çalışan alacaklı |
| AC-21, AC-22, AC-38 | Bileşen: vergi no / e-posta; standart grup tek satır, geçerli sürümü olmayan grup |
| AC-29, AC-30, AC-39, AC-42, AC-43 | Saf + bileşen: tarih biçimleri (ters sıra yok), tutar eşitliği; yürürlük öncesi kalem (bileşen + gerçek App) |
| AC-32, AC-33, AC-35, AC-36, AC-37 | Neden metni; `KAT_SIRA`; anahtar kümesi eşitliği; kaynak taraması; ödeme metni yok |

## 6. Notlar

- **Kaynak taramalarına etki:** iki eski test yalnız yerini ya da prop listesini sabitliyordu ve güncellendi:
  `docs/tasarim-sozlugu.md`'deki üç `Giderler.jsx:satır` atfı (+2 satır, `tasarim-kaynak` AC-20) ve `ui/kutu-duzeni-0067`
  AC-5 (KalemListesi prop listesine `baslangicFiltre`, not düşüldü). `HESAP_TUR_AD` bileşen yerine `aramaGider.js`'te
  okunur (0063 AC-17: tahsilat dışı bileşen listesi değişmedi).
- **Sınama:** iki kural geçici bozularak testlerin yakaladığı görüldü (personel `calisanId` savunması → AC-40; tutar
  eşitliği yerine içerme → AC-30/AC-39). Gerçek App testleri (AC-10, AC-11) aynı sorgunun yetkili / perde kalkık hâlde
  sonuç verdiğini de denetler.
- **Triyaj (2026-10-03, dört bulgu):** (1) kısmi tarih ters sırayla eşleşiyordu ("10.03" 3 Ekim'i de buluyordu); aday
  artık sorgunun biçimine göre tek (R16, AC-42). (2) görsel kanıt dosyaları çalışma ağacında yoktu: `0026-piksel-raporu.json`
  ve görüntüler eklendi; taban raporu, önceki spec'lerdeki gibi kapanışta onaylı (`degisti`) ekranların yeniden çekimiyle
  üretilir. (3) yürürlük öncesi kalem aramada çıkıp tıklanınca görünmüyordu; TY kararıyla aramadan çıkarıldı (R25, AC-43).
  (4) kalem eşleşmesi tembel: ilk eşleşen alanda durur, tutar yalnız sayısal sorguda hesaplanır.
- **Kapsam listesi kaldırıldı (TY, 2026-10-03, revizyon 4):** paletin boş durumlarındaki "Aranan kayıtlar" listesi sağa
  doğru uzuyordu; R7 geri alındı, iki boş ekran bugünkü metinleriyle kaldı. `arama-bos` ve `arama-sonuc-yok` ekranları
  önceyle aynı olmalı (yeniden çekim).
- **Görsel kanıt:** 270 ekran × 2 tema, önce (değişiklik öncesi commit `8ad1396`, aynı ekran tanımları) ve sonra; üç
  parçada çekildi (tek çalıştırma 10 dakika sınırına takılır). İlk turda 26 ilgisiz görüntüde 31–249 piksel çıktı (çekim
  sırasında test takımı paralel koşuyordu); yük olmadan yeniden çekilince hepsi 0. Kapsam listesi kaldırıldıktan sonra
  değişen yalnız 6 görüntü: `arama-gider`, `arama-gider-vade`, `arama-kasasiz` (iki tema); `arama-bos`,
  `arama-sonuc-yok` ve `arama-gidersiz` önceyle 0 piksel.
