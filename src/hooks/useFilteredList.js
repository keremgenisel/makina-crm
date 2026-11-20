import { useState } from "react";
import { aramaKelimeleri, kelimelerEslesir } from "../lib/utils";

// Liste ekranlarında tekrar eden "ara + filtrele + sırala + sayfala" mantığını tek yerde toplar.
// searchFields: item üzerindeki düz alan adları (örn. ["name", "city"]).
// searchFn(item, sorgu): alan adı yeterli olmadığında (örn. başka bir listeyle join gerekiyorsa) özel eşleştirme. Spec 0149
// R8/3: `sorgu` ayrıştırılmış nesnedir ({ kelimeler }), dize değil; çağıran `kelimelerEslesir(sorgu.kelimeler, değerler)` çağırır
// (güncellenmemiş bir `includes(sorgu)` "[object Object]" arayıp hiç eşleşmez, hata ilk testte görünür).
// filterFn(item): kategori/durum filtresi — referansı her render'da değişse de sorun olmaz, sadece değer kontrol edilir.
// sortFn(a, b): sıralama.
// ikinciFiltre(item): isteğe bağlı ikinci süzgeç (spec 0100 plan P2). Verilirse `oncesi` ondan önceki (arama + filterFn) kümedir;
// ekran süzgeç rozetlerinin sayılarını bu kümeden alır. Verilmezse `oncesi` = `filtered` (sıralamadan önce), davranış birebir eski.
// baslangicArama: isteğe bağlı ilk arama metni (spec 0125 R5/2); yalnız mount anında okunur, verilmezse "" (davranış birebir eski).
export const useFilteredList = (data, { searchFields, searchFn, filterFn, ikinciFiltre, sortFn, perPage = 10, baslangicArama = "" } = {}) => {
  const [search, setSearchRaw] = useState(baslangicArama);
  const [page, setPage] = useState(1);
  // Arama değişince sayfa 1'e dönsün (önceki sayfada kalıp boş liste görmeyi önler).
  const setSearch = (v) => { setSearchRaw(v); setPage(1); };

  // Spec 0149 R8/2: kelimeler render başına bir kez üretilir; kayıt başına yalnız eşleşme çalışır.
  const kelimeler = aramaKelimeleri(search);
  const sorgu = { kelimeler };
  const oncesi = data.filter(item => {
    if (filterFn && !filterFn(item)) return false;
    if (!kelimeler.length) return true;
    if (searchFn) return searchFn(item, sorgu);
    return kelimelerEslesir(kelimeler, (searchFields || []).map(f => item[f]));
  });
  let filtered = ikinciFiltre ? oncesi.filter(ikinciFiltre) : oncesi;
  if (sortFn) filtered = [...filtered].sort(sortFn);

  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  return { search, setSearch, page, setPage, filtered, paged, perPage, oncesi };
};
