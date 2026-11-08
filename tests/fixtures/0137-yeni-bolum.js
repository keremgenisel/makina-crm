// Spec 0137 C4, C11: dış işlem kataloğu bilinçli olarak yeni bir veri bölümü (`disIslemler`) ve birleştirme anahtarı açar. Önceki
// spec'lerin "yeni bölüm, birleştirme anahtarı, izin ya da ayar alanı yok" bekçileri bu tek eklemeyi ayıklayıp aynı iddiayı
// sürdürür: 0137'den başka hiçbir değişiklik bu listelere girmemiştir.
export const bolum0137Ayikla = (o) => ({
  ...o,
  ...(Array.isArray(o.BLOB_SECTIONS) ? { BLOB_SECTIONS: o.BLOB_SECTIONS.filter(b => b !== "disIslemler") } : {}),
  ...(Array.isArray(o.MERGE_KEYS) ? { MERGE_KEYS: o.MERGE_KEYS.filter(b => b !== "disIslemler") } : {}),
});
