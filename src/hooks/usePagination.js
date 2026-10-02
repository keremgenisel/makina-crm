import { useState } from "react";

// sifirlamaAnahtari (spec 0062 R27): isteğe bağlı; değeri değişince sayfa 1'e döner (süzgeç, seçim, dönem). Karşılaştırma
// render sırasında önceki anahtarla yapılır, efekt yok. setPage kırpılmış sayfa üzerinden çalışır: liste küçüldükten sonra
// "‹ Önceki" ham sayıdan geri gidip takılı kalmaz. Liste küçülünce kırpılan sayfa saklanır.
export function usePagination(items, perPage = 10, sifirlamaAnahtari) {
  const [page, setPageRaw] = useState(1);
  const [anahtar, setAnahtar] = useState(sifirlamaAnahtari);
  let ham = page;
  if (anahtar !== sifirlamaAnahtari) {
    setAnahtar(sifirlamaAnahtari);
    setPageRaw(1);
    ham = 1;
  }
  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  const safePage = Math.min(ham, totalPages);
  // Triyaj: kırpılan sayfa saklanır; yoksa liste küçülüp yeniden büyüyünce ekran kendiliğinden eski sayfaya atlardı.
  if (ham > totalPages) setPageRaw(totalPages);
  const setPage = (v) => setPageRaw(p => {
    const simdiki = Math.min(p, totalPages);
    const yeni = typeof v === "function" ? v(simdiki) : v;
    return Math.max(1, Math.min(yeni, totalPages));
  });
  const paged = items.slice((safePage - 1) * perPage, safePage * perPage);
  return { page: safePage, setPage, paged, perPage };
}
