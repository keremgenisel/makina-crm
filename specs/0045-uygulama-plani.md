# 0045 Uygulama Planı: Tutar Alanlarında Binlik Ayracı ve Form Düğmeleri Arasındaki Boşluk

| | |
|---|---|
| **Bağlı spec** | `specs/0045-tutar-bicimi-ve-dugme-boslugu.md` (R2, plan onayıyla onaylandı) |
| **Dal** | `feat/0045-tutar-bicimi` (`feat/0044-tahsilat-hesap` üstünden) |
| **Onay** | Takım Yöneticisi, 2026-09-29: bütün öneriler (Q1–Q10) kabul |

## 1. Dosyalar

| Dosya | Değişiklik |
|---|---|
| `src/lib/tutarGirdisi.js` (yeni, saf) | Biçimleme ve çözümlemenin tek yeri (C2): `tutarGosterim(ham)`, `tutarGirdisiIsle({ yeni, onceki, imlec, tus })` → `{ ham, gosterim, imlec }` |
| `src/lib/gider.js` | `tutarCoz`'un "tek nokta + 1–2 hane = ondalık" kuralı `noktaOndalikMi` yardımcısına çıkar (davranış aynı) |
| `src/components/gider/GiderAlanlari.jsx` | `TutarInput` görünümü ve imleci; `sym="%"` ise ayraçsız |
| `src/components/ui.jsx` | `Modal` alt kabına `gap: 8` |
| `docs/tasarim-sozlugu.md`, `CLAUDE.md` | Alt düğme satırı kuralı; tutar girdisi |
| `scripts/evidence/0009-sayfa.jsx` | Altı formun pencereleri, dolu tutarlı formlar |
| Testler | yeni `tutar-girdisi.test.js`, `ui/tutar-girdisi.test.jsx`, `ui/modal-dugme-boslugu.test.jsx`; ekranda ham tutar bekleyen 12 satır biçimli değere güncellenir (R1, Q9) |

## 2. Kararlar

| No | Karar |
|---|---|
| Q1 | Durum ham metni tutar (noktasız, en çok bir virgül); biçim yalnız görünümde |
| Q2 | Yazarken nokta binliktir ve yok sayılır; yapıştırma/bütün değişim `tutarCoz` kuralıyla. Bilinçli sapma: harf harf "12.5" artık 125 |
| Q3 | Oran alanı `sym="%"` ile tanınır |
| Q4 | Yazarken 3. ondalık hane kabul edilmez; gelen değer kesilmez |
| Q5 | Geçersiz karakterli metin biçimlenmez, bugünkü hata aynen |
| Q6 | Ayracın üzerinden geri silme soldaki, Delete sağdaki rakamı siler |
| Q7 | İmleç: saf fonksiyonda node testi + jsdom'da gerçek alanda `selectionStart` |
| Q8 | Kap boşluğu `gap: 8`; mevcut sarmalayıcılar kalır |
| Q9 | Ekrandaki ham tutar beklentileri biçimli değere döner; kuruş beklentileri değişmez |
| Q10 | Yalnız farkı çıkan ekranlar `degisti` + TY onayı |

## 3. Adım sırası

1. Saf motor ve testleri.
2. `TutarInput` bağlantısı, bileşen testi, 12 beklenti; tam test.
3. `Modal` boşluğu ve testi.
4. Sözlük ve `CLAUDE.md`.
5. Görsel kanıt, TY onayı, kanıt kayıtları.

## 4. Kriter ↔ test eşlemesi

| AC | Test |
|---|---|
| AC-1, AC-2, AC-4, AC-9 | `tutar-girdisi.test` + `ui/tutar-girdisi` |
| AC-3, AC-6 | `tutar-girdisi.test` (imleç hesabı) + `ui/tutar-girdisi` (gerçek alanda `selectionStart`) |
| AC-5 | `tutar-girdisi.test` (yapıştırma kolu) + `ui/tutar-girdisi` (paste) |
| AC-7 | `tutar-girdisi.test` çapraz (`tutarCoz(ham)` = `tutarCoz(özgün)`) + `ui/tutar-girdisi` (gerçek `GiderForm` kaydı) |
| AC-8, AC-10, AC-11, AC-12 | `ui/tutar-girdisi` |
| C2 | `tutar-girdisi.test` kaynak taraması |
| AC-13–AC-17 | `ui/modal-dugme-boslugu` (+ AC-15 için görsel kanıtta 0 piksel) |

## 5. Uygulama notları

- Tutar kuralları saf `tutarGirdisiIsle`'de; bileşen yalnız bağlar. Tek karakterlik değişiklik "yazma", daha uzun ekleme "yapıştırma / bütün değişim" sayılır (`tutarCoz` kuralı). `TutarInput` reddedilen tuşta da imleci geri koymak için kendi çizimini zorlar.
- AC-14'ün kullanıcı yönetimi penceresi (2FA sıfırlama) sunucu ister; testte kaynak taramasıyla düğmelerini parçayla `Modal`'a verdiği sabitlenir, boşluk kabın testiyle kanıtlanır. Görüntü aracında çizilmedi.
- Görüntü aracına `baslik:` adımı eklendi (yalnız simgeli düğmeye `title` ile tıklar; Gider türü düzenleme penceresi için).
- Kanıt: 19 ekran × 2 tema değişti (TY onayı). Servis formu (3 × 83 piksel) ve yedek parça kargo formu (83 piksel) farkları bilinen textarea tutamacı oynamasıdır; kayıtları değiştirilmedi.
- Test dosyalarının doğrudan `eslint` çağrısı JSX yapılandırması olmadığından sahte "kullanılmıyor" hatası verir; `npm run lint` kapsamı `src` ve 0 hata.
