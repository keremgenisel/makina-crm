// Spec 0132 C5: malzeme kataloğu bilinçli olarak yeni bir veri bölümü (`malzemeler`) ve birleştirme anahtarı açar. Önceki
// spec'lerin "yeni bölüm, birleştirme anahtarı, izin ya da ayar alanı yok" bekçileri bu tek eklemeyi ayıklayıp aynı
// iddiayı sürdürür: 0132'den başka hiçbir değişiklik bu listelere girmemiştir.
export const bolum0132Ayikla = (o) => ({
  ...o,
  ...(Array.isArray(o.BLOB_SECTIONS) ? { BLOB_SECTIONS: o.BLOB_SECTIONS.filter(b => b !== "malzemeler") } : {}),
  ...(Array.isArray(o.MERGE_KEYS) ? { MERGE_KEYS: o.MERGE_KEYS.filter(b => b !== "malzemeler") } : {}),
});
