# 0049 Uygulama Planı: Portföye Elle Çek Ekleme ve Kendi Çekimizle Ödeme

| | |
|---|---|
| **Bağlı spec** | `specs/0049-portfoye-cek-ekleme-ve-kendi-cekimiz.md` (R1, plan onayıyla onaylandı) |
| **Dal** | `feat/0049-cek` (`feat/0048-duzenleme-odeme` üstünden) |
| **Onay** | Takım Yöneticisi, 2026-09-30: bütün öneriler (Q1–Q12) kabul |

## 1. Dosyalar

| Dosya | Değişiklik |
|---|---|
| `src/lib/cek.js` | `yon` (alinan/verilen); tek okuma yolu `cekBilgisi`; bağsız çek doğrulaması; `portfoySatirlari` bağsız çek; `ciroPlani` tutarı bilgiden; verilen çek durumları, geçişleri, `kendiCekPlani` (ortak çekirdek), `verilenCekSatirlari`; `bagliCekler`, `cekAyOzeti` |
| `src/lib/kasa.js` | `hesapBakiyeleri` veride `cekler`: ödenmiş verilen çek tam tutarla, ödendiği gün; `hesapKullanimi`; `odemeDogrula` `kendiCek` bayrağı |
| `src/lib/formOdemesi.js` | ANA satırda "Çek (kendi)" |
| `src/lib/giderRaporu.js` | Bakiye verisine `cekler` |
| `src/components/cek/CekPortfoyu.jsx`, `CekEklePenceresi.jsx` (yeni), `CiroPenceresi.jsx` (`kip`) | Alınan/Verilen, Çek Ekle, Çek Yaz, sil, verilen durum |
| `src/components/gider/OdemeFormSatirlari.jsx`, `GiderForm.jsx`, `Giderler.jsx`, `OdemeKayitPenceresi.jsx` | Form seçeneği; "Kendi çekiyle öde" |
| `src/components/Kasa.jsx`, `src/App.jsx` | Bakiye verisine `cekler`, prop'lar |
| `electron/db.cjs`, `electron/serverAuth.cjs`, `src/lib/merge.js`, `src/components/settings/SettingsBackup.jsx` | Dört nokta, yetki, remap, yedek |
| Testler | `cek-0049.test.js`, `ui/cek-portfoy-0049.test.jsx`; ek bloklar |

## 2. Kararlar

| No | Karar |
|---|---|
| Q1 | A (elle alınan çek) ve B (verilen çek) iki parça, aynı dal, iki commit; kanıt ve TY onayı parça başına |
| Q2 | Bağlı çekte alan kopyalanmaz; `cekBilgisi` okuma anında tahsilattan |
| Q3 | Verilen çek yalnız TL, en az bir gideri kapatır (X8) |
| Q4 | Bakiye: hesapsız `cekId`'li hareketler borcu kapatır; "ödendi"de çekin tam tutarı, ödendiği gün, yazımda seçilen hesaptan |
| Q5 | `ciroPlani` ile `kendiCekPlani` ortak çekirdek; `CiroPenceresi` `kip` |
| Q6 | Formda yalnız ANA satır, kasa yetkisiyle |
| Q7 | Ödeme penceresinde ortak pencereyi açan düğme |
| Q8 | Sunucu kayıt düzeyinde, dar grup istisnası, yeni verilen çek hareket ister |
| Q9 | 0047 raporu bağsız alınanı sayar; ödenmiş verilen kasa bölümünde |
| Q10 | `cekler` Giderler paketinde de geri yüklenir; remap |
| Q11 | Kimden serbest ya da müşteri; silme kalıcı, ciroluysa önce iptal; tahsil işareti bakiyeye girmez |
| Q12 | Kanıt ekranları |

## 3. Adım sırası

A: motor → DB/sunucu/merge/yedek → arayüz → kanıt. B: aynı sıra.

## 4. Kriter ↔ test eşlemesi

| AC | Test |
|---|---|
| AC-1, AC-2, AC-7, AC-8, AC-21, AC-22 | `ui/cek-portfoy-0049` + `cek-0049.test` |
| AC-3 | `cek-0049.test` (Finans ve aylık rapor çaprazı) |
| AC-4, AC-5, AC-6 | `cek-0049.test` + `ui/gider-form-odeme` + `ui/cek-portfoy-0049` |
| AC-9 | `cek.test`, `ui/cek-tahsilat`, `ui/cek-ciro` aynen |
| AC-10 | `cek-0049.test` |
| AC-11, AC-16, AC-17, AC-18 | `cek-0049.test` + `ui/cek-portfoy-0049` |
| AC-12, AC-13, AC-14, AC-15 | `cek-0049.test` |
| AC-19 | `cek-0049.test` |
| AC-20 | `ui/gider-form-odeme` |
| AC-23 | `server-authz` + `server-security.cjs` |
| AC-24 | `ui/kasa-app` |
| AC-25 | `db-roundtrip.cjs` + `db-clean-install.cjs` |
| AC-26 | `cek-0049.test` |

## 5. Uygulama notları
- Tek okuma yolu `cekBilgisi` + `tahsilatHaritasi`; `portfoySatirlari` satırı `bilgi` taşır, `odeme` bağsızda null. `ciroPlani` `tutarK`/`currency` alır (eski `odeme` imzası korunur, 0040 testleri aynen).
- DB okumasında boş kalan 0049 alanları blob'a yazılmaz: eski bağlı çek kaydı 0040'taki şekliyle döner (sunucunun kayıt karşılaştırması null ile yokluğu ayırır; yoksa her bağlı çek "değişmiş" görünürdü).
- Ciro ve kendi çek ortak çekirdeği `dagitimHareketleri` (cek.js içi); yazım `CiroPenceresi.cekPlaniniYaz` (portföy ve Giderler ödeme penceresi aynı fonksiyon).
- `verilenCekOdemeTarihi` kasa.js'te tanımlı, cek.js yeniden dışa verir (cek.js kasa.js'i içe aktarır; tersi döngü olurdu).
- Kendi çekin hesabı yalnız TL **banka** hesabı (kasa ya da kart değil). Formdaki kendi çekte çek tutarı satırın tutarıdır; kalandan büyük çek (fark) yalnız Çek Yaz penceresinden.
- Ödenmiş verilen çek "Ödemeyi Geri Al" ile yazılmış durumuna döner (yanlış işaret); ödenmiş çek iptal/karşılıksız yapılamaz.
- Kasa hesap satırı verilen çekin yazıldığı hesabı "kullanımda" sayar (silinmez).
- Triyaj (2026-09-30), bulgu 1: A'nın kanıtı (`0049-piksel-raporu.json`, portföy, Çek Ekle, bağsız çekin durum penceresi) TY onayıyla `kanit-eslemesi.json`'da; `CekEklePenceresi.jsx` kayıtlı. B'nin kanıtı (Verilen çekler, Çek Yaz, formdaki "Çek (kendi)", ödeme penceresindeki düğme) ayrı raporla gelir.
- Triyaj bulgu 2: kısmi geri yüklemede çek bölümü sahibine göre bölünür: yalnız Giderler seçiliyse bağlı çekler bugünkü hâliyle korunur, bağsızlar yedekten gelir; yalnız Müşteri verileri seçiliyse tersi; ikisi birlikteyse bölüm yedekteki gibi (`ui/cek-portfoy-0049` Q10 blokları).
- Triyaj bulgu 3: bağlı çeki bağsıza (ya da tersine) çeviren yazım `gider_odeme` ile birlikte `cust_payment_edit` ister (`server-authz`).
