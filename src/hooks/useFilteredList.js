import { useState } from "react";
import { aramaNormalize } from "../lib/utils";

// Liste ekranlarında tekrar eden "ara + filtrele + sırala + sayfala" mantığını tek yerde toplar.
// searchFields: item üzerindeki düz alan adları (örn. ["name", "city"]).
// searchFn(item, query): alan adı yeterli olmadığında (örn. başka bir listeyle join gerekiyorsa) özel eşleştirme.
// filterFn(item): kategori/durum filtresi — referansı her render'da değişse de sorun olmaz, sadece değer kontrol edilir.
// sortFn(a, b): sıralama.
export const useFilteredList = (data, { searchFields, searchFn, filterFn, sortFn, perPage = 10 } = {}) => {
  const [search, setSearchRaw] = useState("");
  const [page, setPage] = useState(1);
  // Arama değişince sayfa 1'e dönsün (önceki sayfada kalıp boş liste görmeyi önler).
  const setSearch = (v) => { setSearchRaw(v); setPage(1); };

  const q = aramaNormalize((search || "").trim());
  let filtered = data.filter(item => {
    if (filterFn && !filterFn(item)) return false;
    if (!q) return true;
    if (searchFn) return searchFn(item, q);
    return (searchFields || []).some(f => aramaNormalize(item[f]).includes(q));
  });
  if (sortFn) filtered = [...filtered].sort(sortFn);

  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  return { search, setSearch, page, setPage, filtered, paged, perPage };
};
