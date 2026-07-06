import { useState, useEffect, useRef } from "react";

// ── Form taslağı otomatik kaydetme ──────────────────────────────────────────
// Elektrik kesintisi/çökme anında açık formdaki yazılanların kaybolmaması için
// form içeriğini localStorage'a debounce ile yazar. Kaydet veya Vazgeç ile
// bilerek kapatılan formların taslağı silinir; sadece uygulama düzgün
// kapanmadan sonlanırsa taslak kalır ve form tekrar açıldığında teklif edilir.
//
// draftKey: kayıt bazlı anahtar (örn. "customer:new", "teklif:123"). null → devre dışı.
// form/setForm: sahibi bileşenin form state'i. form truthy iken taslak yazılır.
// stripFn (opsiyonel): taslağa yazmadan önce büyük alanları soyar (örn. teklif resimleri).
// restoreFn (opsiyonel): geri yüklenen taslağı setForm'a vermeden önce işler
//   (örn. soyulmuş resimleri tanımlardan yeniden doldurur).
const PREFIX = "crmdraft:";
const DEBOUNCE_MS = 1500;

export function useFormDraft(draftKey, form, setForm, { stripFn = null, restoreFn = null } = {}) {
  const [draft, setDraft] = useState(null); // { ts, data } — form ilk açıldığında bulunan taslak
  const timer = useRef(null);
  const activeKey = useRef(null);   // form açıkken kilitlenen anahtar
  const restored = useRef(false);   // geri yükleme sonrası ilk yazımı engelleme gereksiz, işaret sadece banner için

  const storageKey = (k) => PREFIX + k;

  const clearDraft = (key = activeKey.current) => {
    try { if (key) localStorage.removeItem(storageKey(key)); } catch { /* yoksay */ }
    setDraft(null);
  };

  // Form açıldığında: mevcut taslağı ara, anahtarı kilitle. Kapandığında: anahtarı bırak.
  useEffect(() => {
    if (form && draftKey) {
      activeKey.current = draftKey;
      restored.current = false;
      try {
        const raw = localStorage.getItem(storageKey(draftKey));
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.data) setDraft(parsed);
        }
      } catch { /* bozuk taslak — yoksay */ }
    } else {
      activeKey.current = null;
      setDraft(null);
      clearTimeout(timer.current);
    }
    // draftKey form açıkken değişmez (kayıt bazlı); form açılış/kapanışında çalışması yeterli
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!form, draftKey]);

  // Form içeriği değiştikçe debounce ile taslağa yaz
  useEffect(() => {
    if (!form || !activeKey.current) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const key = activeKey.current;
      if (!key) return;
      const payload = { ts: new Date().toISOString(), data: stripFn ? stripFn(form) : form };
      try {
        localStorage.setItem(storageKey(key), JSON.stringify(payload));
      } catch {
        // Kota dolmuş olabilir — büyük alanlar soyulmuş halini dene, o da olmazsa vazgeç
        try {
          if (stripFn) localStorage.setItem(storageKey(key), JSON.stringify({ ...payload, data: stripFn(form) }));
        } catch { /* taslak yazılamadı — sessizce devam */ }
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  const restoreDraft = () => {
    if (!draft?.data) return;
    const data = restoreFn ? restoreFn(draft.data) : draft.data;
    setForm(data);
    restored.current = true;
    setDraft(null); // banner kapansın; taslak silinmez, kayıt/vazgeç anında silinir
  };

  const discardDraft = () => clearDraft();

  return { draft, restoreDraft, discardDraft, clearDraft };
}
