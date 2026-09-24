import { useEffect, useState } from "react";
import { yerelBugun } from "../lib/utils";

// Canlı yerel gün (spec 0003 C3, plan H1/H9). Uygulama günlerce açık kalabildiği için "bugün" sabit
// tutulmaz: dakikada bir ve pencere odaklanınca/görünür olunca yalnız tarih metni karşılaştırılır, gün
// değişince yeniden çizilir. Yerel tarih kullanılır; today() UTC olduğu için gece yarısından sonra dünü verirdi.
export const useBugun = () => {
  const [bugun, setBugun] = useState(yerelBugun);
  useEffect(() => {
    const kontrol = () => setBugun(onceki => { const y = yerelBugun(); return y === onceki ? onceki : y; });
    const t = setInterval(kontrol, 60 * 1000);
    const gorunur = () => { if (document.visibilityState !== "hidden") kontrol(); };
    window.addEventListener("focus", kontrol);
    document.addEventListener("visibilitychange", gorunur);
    return () => { clearInterval(t); window.removeEventListener("focus", kontrol); document.removeEventListener("visibilitychange", gorunur); };
  }, []);
  return bugun;
};
