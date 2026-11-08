# 0135 uygulama planı: parça maliyetinde tek kip, çok malzeme ve işlem kalemi

Spec: `specs/done/0135-parca-maliyeti-kalemleri.md` (QA turu 29 bulgu, plan turu Karar 30–44). Dal `feat/0135-maliyet-kalemleri` (`../wt0135`), taban main `3d7f8a7c`. Plan Takım Yöneticisi'nin 2026-11-08 onayıyla; on beş önerinin hepsi kabul edildi.

## 1. Dosyalar

**Yeni**
- `src/lib/maliyetKalemleri.js`: kalem listesinin TEK türetme yolu (R23/2, C1/2). Hiçbir lib modülünü içe almaz (Karar 39). `KALEM_TUR`, `maliyetKalemleriOf`, `malzemeKalemleri`, `islemKalemleri`, `kalemVarMi`, `malzemeKalemiVarMi`, `MALIYET_KALEM_SINIRI`, `TURETILEN_KALEM_ADI`, `ESKI_MALIYET_ANAHTARLARI`.
- `src/components/MaliyetKalemleriAlani.jsx`: kip seçici, emniyet payı, kalem listesi, boş durum, iki ekleme düğmesi, toplam ve üç koşullu ibare.
- Testler: `tests/maliyet-kalemleri-0135.test.js` (saf, taramalar), `tests/maliyet-kalemleri-0135-kiyas.test.js` (`tests/fixtures/0135-once.json`, `0135-veri.js`, spec öncesi koddan, `YAZ_0135=1`), `tests/ui/maliyet-kalemleri-0135.test.jsx` (kart ve liste), `tests/ui/maliyet-kalemleri-0135-koruma.test.jsx` (çöp, malzeme ve tedarikçi kullanımı), `tests/ui/maliyet-kalemleri-0135-app.test.jsx` (gerçek App).

**Değişen**
- `src/lib/urunAgaci.js`: tek okuma yolu kalemleri toplar (C10), çözülemeyen liste `null` (R27/2), karma tarihli okuma (R35/4), `maliyetKaynagi` üç tür, geçmiş kapısı "malzeme kalemi var mı" ve eski değer kalemlerden (R36), `kalemlerDogrula`, form dönüştürücüleri, metinler.
- `src/lib/malzeme.js`: kullanım, koruma ve zam etkisi bütün malzeme kalemlerinden; kalkan metinler.
- `src/components/MalzemeSatiriAlani.jsx`: tek malzeme kaleminin satırı (Karar 44).
- `src/components/PartManager.jsx`: eski üç bölüm yerine kalem bölümü; dokunma işaretli hazırlama (R25–R26/2); türetilmiş listeden açılış; tek ibare; tedarikçi süzgeci (R46); iki yönlü set pasifliği; iç içe onay Escape koruması (Karar 37).
- `src/lib/siparisIhtiyaci.js`, `src/components/maliyet/SiparisIhtiyaci.jsx`: kalem döngüsü, adet, pay yedeği, kalem dili (R28–R30/2).
- `src/lib/gider.js`, `src/components/gider/Tedarikciler.jsx`: tedarikçi koruması ve kullanımı işlem kalemlerinden; metinler.
- `src/components/MalzemeManager.jsx`, `src/components/settings/SettingsTrash.jsx`: metinler (kapılar yardımcılardan).
- `src/lib/parcaAktarma.js`: kalem dalı, tek bildirim metni, alanlara dokunmaz (R37–R37/3).
- `src/lib/merge.js`: kalem içi iki eşleme, eski üçü yerinde (R34/2).
- `electron/db.cjs`: `parts.maliyetKalemleri` TEXT JSON dört nokta.
- `scripts/tests/db-roundtrip.cjs`, `db-clean-install.cjs`, `scripts/evidence/0009-sayfa.jsx`, `docs/evidence/kanit-eslemesi.json`, `CLAUDE.md`.

Yeni veri bölümü yok, yeni eylem izni yok, sunucu değişmez.

## 2. Adım sırası

0. Taban: `../wt0135-taban`'da kıyas altını ve görsel taban; kalkacak metin sabitlerinin envanteri.
1. Saf katman: türetme modülü → `urunAgaci` → `malzeme` → `gider` → `siparisIhtiyaci` → `merge` → `parcaAktarma`. Kıyas yeşil.
2. Veri: `db.cjs`, roundtrip ve temiz kurulum.
3. Arayüz: kalem bölümü, malzeme kalemi satırı, parça kartı ve liste; sipariş, Tedarikler, Malzemeler metinleri.
4. Ters çevrilen testler (0096, 0099, 0132, 0134) "spec 0135 ile" notuyla; taramalar.
5. Görsel kanıt ve eşleme.
6. Tam takım, lint, mutasyon; sürüm notu; CLAUDE.md.

## 3. Kararlar (onaylanan öneriler)

Spec'in "Plan turu kararları" tablosu (Karar 30–44): kip adları "Hesapla" / "Elle sabit"; türetme bugünkü önceliği izler (malzeme satırı kırılımı bastırır); tutarsız kırılım satırı kalem olmaz; AC-45 dokunma işaretiyle; zam ibaresi koşullu; elle tutar işaretten bağımsız; kip yerel durum; iç içe onayda Escape; geçici satır anahtarı; yaprak türetme modülü; tarama istisnaları; AC-118 ölçümü; set doluyken pay pasif; sipariş dökümünde aynı parça tek satır; `MalzemeSatiriAlani.jsx` kalem satırına dönüşür.

## 4. Kriter ↔ test eşlemesi

| Kriter | Test |
|---|---|
| AC-1–AC-12 | `ui/maliyet-kalemleri-0135` (kip, onay, set pasifliği, pay) |
| AC-13–AC-20 | `ui/maliyet-kalemleri-0135`, saf (toplam) |
| AC-21–AC-31 | saf (adet, girilmedi, boy), `ui/…` (satır, silinmiş malzeme) |
| AC-32–AC-40 | saf, `ui/…` (yetki, bağ korunur) |
| AC-41, AC-42, AC-80 | `-kiyas` (altın) |
| AC-43, AC-44, AC-93 | saf, `ui/…` (gizlilik) |
| AC-45–AC-48, AC-94–AC-97 | `ui/…` (kaydedilen gövde) |
| AC-98 | saf, `ui/…` |
| AC-49–AC-57, AC-92, AC-109 | saf, `ui/…-app` (Sipariş İhtiyacı ekranı) |
| AC-58–AC-61, AC-104, AC-105 | `ui/…-koruma`, `ui/…-app` (otuz gün) |
| AC-62, AC-63 | saf |
| AC-64, AC-65, AC-111 | saf (`buildMergePlan`) |
| AC-66–AC-69, AC-82–AC-89, AC-116 | saf, `ui/…` |
| AC-70 | `ui/…` |
| AC-71–AC-73, AC-113, AC-114 | saf (Excel) |
| AC-74–AC-76, AC-112, AC-117, AC-118 | `ui/…`, saf (taramalar) |
| AC-77–AC-79, AC-90, AC-91 | `db-roundtrip.cjs`, `db-clean-install.cjs`, saf |
| AC-81, AC-106 | kanıt raporu, `kanit-eslemesi` |
| AC-99–AC-103 | `ui/…`, saf |
| AC-107, AC-108 | `ui/…` |
| AC-110 | saf (tarama) |
| AC-115 | saf |

## 5. Görsel kanıt

Değişen kayıtlar `degisti` + onay: `katalog-parca`, `katalog-parca-yeni`, `katalog-parca-0096-*`, `katalog-parca-0097-gecmis`, `katalog-parca-0132-malzeme`, `ayarlar-yedekparca-*` ve metni değişen sipariş, Tedarikler, Malzemeler ekranları. Yeni: `katalog-parca-0135-elle`, `-hesapla-bos`, `-dolu`, `-hata`, `-set-pasif`, `-yetkisiz`, `-onay`, `-yalniz-islem`.

## 6. Sürüm notu

Önce sunucu PC, sonra bütün istemciler güncellenmeli; güncelleme bitene kadar parça kartında maliyet düzenlenmez (güncellenmemiş bilgisayar maliyet kalemlerini tanımaz, kaydederken düşürür). Bilinen sonuçlar: (1) yalnız işlem kalemi olan bir parçaya ilk malzeme kalemi eklenince o parçanın kayıtlı maliyet geçmişi okunmaz olur; (2) işlem tutarları zamla güncellenmez, eskidikçe maliyeti düşük gösterir; (3) malzeme satırı ve hammadde kırılımı birlikte olan eski parçada kırılım, kartta maliyet bölümüne dokunulup kaydedilince silinir; yalnız tedarikçi bağı taşıyan (tutarsız) kırılım satırı da öyle (Karar 31, 32).

## 7. Uygulamada bulunanlar

Spec'in "Uygulamada verilen kararlar" tablosu (Karar 45–50): kaldır düğmelerinin adları türüyle ayrıldı, boş tutar uyarısı canlı, hatalı kalemde kaynak ibaresi kalır, set dolu kayıtta kalem alanı her yoldan silinir, 0099'un ekran testi silindi, tedarikçi kullanımı parça başına bir kez sayılır. Kanıt: tabandaki ilk çekimde açılır liste oku gürültüsü (46–96 piksel) beş değişmeyen ekranda görüldü; taban yeniden çekilince yeni kodla 0 fark. Mutasyon ölçümü altı noktada (set kalem alanı, dokunma işareti, pay yedeği, malzeme koruması, elle değere düşme, tedarikçi koruması); malzeme korumasının saf testi ilk turda kaçırdı, güçlendirildi.
