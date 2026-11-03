import { useEffect, useRef } from "react";
import { Modal, SearchPick } from "../ui";

// Spec 0126 R1–R2/2, R1/3, R3/7: Evrak satırının parça ve kalıp seçimi. Satır tablosu yatay kaydırmalı kabın içinde ve
// sütun 170 piksel; satır içi arama kutusunun paneli orada kırpılıyordu (R1/2). Pencere iki katalog için TEK bileşendir:
// kimlik türünü bilmez, seçilen kaydın kendisini `onPick` ile döndürür (dönüşüm çağıranda). Footer'sız ve overflowVisible
// açılır (Modal gövdesi overflowY:auto ile paneli kırpardı); SearchPick gövdenin tek öğesidir. Açılınca kutu odak alır ve
// liste açık gelir (SearchPick'e autoFocus eklemek ui.jsx'e dokunmak olurdu). "eklendi" onayı pencere kapandığı için
// görünmez (C5).
export const KalemSecPenceresi = ({ baslik, items, getLabel, getKey, placeholder, onPick, onClose }) => {
  const kap = useRef(null);
  useEffect(() => { kap.current?.querySelector("input")?.focus(); }, []);
  return (
    <Modal title={baslik} onClose={onClose} maxWidth={600} overflowVisible>
      <div ref={kap} data-testid="kalem-sec-penceresi">
        <SearchPick items={items} getLabel={getLabel} getKey={getKey} placeholder={placeholder}
          onPick={(kayit) => { onPick(kayit); onClose(); }} />
      </div>
    </Modal>
  );
};
