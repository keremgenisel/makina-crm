# 0051 Uygulama Planı: Hesapsız Kayıtlarda Başlangıç Tarihi ve Ödemenin Hangi Hedefi Kapattığı

| | |
|---|---|
| **Bağlı spec** | `specs/done/0051-kasa-baslangic-tarihi-ve-stopaj-etiketi.md` (R2, plan onayıyla) |
| **Dal** | `feat/0051-kasa-bakim` (`main` üstünden, v3.40.0 sonrası) |
| **Onay** | Takım Yöneticisi, 2026-09-30: bütün öneriler (Q1–Q10) kabul |

## 1. Dosyalar

| Dosya | Değişiklik |
|---|---|
| `src/lib/kasa.js` | `aralikta` (`bitis` isteğe bağlı, `tarihsizDahil`); `hesapsizOzeti`; `hesapsizBaslangicDogrula`; `calisanEkstresi` satırsız kalemde hedef |
| `src/lib/odemeYontemi.js` | `hareketHedefPaylari` (hareket başına hedef payları) |
| `src/components/Kasa.jsx` | Eşik, "Hepsini göster", sayılar, eşik satırı, hareket listesinde hedef |
| `src/components/gider/EkstrePenceresi.jsx` | Ödeme ve mahsup satırında hedef adı |
| `src/components/gider/OdemeKayitPenceresi.jsx` | Satırsız kalemde hedef adı |
| `src/components/settings/SettingsGider.jsx` | Başlangıç tarihi alanı, öneri, doğrulama |
| Testler | `kasa-0051.test.js`, `ui/kasa-0051.test.jsx`; ek bloklar `ui/gider-settings`, `gider-kasa-raporu`, `db-roundtrip.cjs` |

## 2. Kararlar

| No | Karar |
|---|---|
| Q1 | `hareketHedefPaylari` (hareketPaylari'nın hedef bazlı kardeşi); hareketPaylari değişmez |
| Q2 | Etiket Kasa hareket listesi, çalışan ekstresi, ödeme penceresi |
| Q3 | Tarihsiz kayıt açık `tarihsizDahil` bayrağıyla |
| Q4 | Etiket yalnız birden çok hedefli kalemde; satırsız personelde `personelIkiHedef` |
| Q5 | Bölünmüş hareket: "Resmi 30.000 ₺ + Elden 9.500 ₺" |
| Q6 | Ödeme tarafında liste yok; sayılar süzülmüş; eşik satırı nedene göre kırılır |
| Q7 | Öneri ipucu + "Öneriyi kullan" (yalnız formu doldurur) |
| Q8 | `hesapsizBaslangicDogrula(ham, bugun)`, `yerelBugun` |
| Q9 | Yeni sütun yok; roundtrip testi |
| Q10 | Kanıt ekranları; değişen Kasa ekranları `degisti` + TY onayı |

## 3. Adım sırası

1. Motor ve testleri (0047 ve 0024 testleri aynen).
2. Ayar alanı, roundtrip.
3. Kasa ekranı.
4. Ekstre ve ödeme penceresi.
5. Arayüz testleri, tam paket, lint.
6. Görsel kanıt, TY onayı, belgeler.

## 4. Kriter ↔ test eşlemesi

| AC | Test |
|---|---|
| AC-1, AC-9, AC-10, AC-29 | `ui/gider-settings` + `kasa-0051.test` + `db-roundtrip.cjs` |
| AC-2, AC-3, AC-4, AC-5, AC-18, AC-23, AC-24, AC-25 | `kasa-0051.test` + `ui/kasa-0051` |
| AC-6, AC-22 | `ui/kasa-0051` |
| AC-7, AC-8 | `kasa-0051.test` |
| AC-19, AC-20 | `kasa-0051.test` + `gider-kasa-raporu` aynen |
| AC-21 | `gider-kasa-raporu` ek blok |
| AC-11–AC-15, AC-26, AC-27 | `kasa-0051.test` + `ui/kasa-0051` |
| AC-16, AC-30 | `ui/kasa-0051` + kaynak taraması |
| AC-17, AC-28 | `ui/kasa-0051` |

## 5. Uygulama notları
- `hesapsizOzeti` mevcut iki fonksiyonu "hepsi" (`{baslangic: "", tarihsizDahil: true}`) ve eşikli olarak iki kez çağırır; gizlenen sayılar farktan, nedene göre. Kasa eşik satırı yalnız eşik varken ve gizlenen ya da tarihsiz kayıt varken (ya da "Hepsini göster" açıkken) çizilir.
- `hedefEtiketi` ve `cokHedefliMi` `GiderAlanlari.jsx`'te `hedefAdi`'nın yanında (tek kaynak); Kasa `hareketGruplari` ile kalem başına bir kez hesaplar ve yalnız çok hedefli kalemleri işler.
- Mevcut `ui/gider-settings` AC-33 testi kaydedilen nesneyi birebir sabitlediği için yeni alanı (`hesapsizBaslangic: ""`) içerecek biçimde güncellendi.
- Triyaj (2026-09-30), bulgu 1: `hareketHedefPaylari` aynı günlü hareketleri motorla aynı kuralla sıralar (tarihe göre kararlı, eşitlikte giriş sırası); kimliğe göre sıralamaz (`uid()` rastgele). Kasa artık `hareketGruplari`'nın (kimliğe göre sıralı) grubunu geçirmez. `hareketPaylari`'daki aynı sıralama (yalnız tutarsız göç hareketli kalemi etkiler) bu işin kapsamında değil.
- Triyaj bulgu 2: Kasa'nın eşik bilgisi `useMemo`'da; "Hepsini göster" kapalıyken süzülmüş özetin kendisi (`ui/kasa-0051-memo`).
- Triyaj bulgu 3: kanıt raporu (`0051-piksel-raporu.json`) üretildi, TY onayıyla `kanit-eslemesi.json`'da.
