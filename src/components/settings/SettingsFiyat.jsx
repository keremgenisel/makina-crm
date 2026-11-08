import { useState, useEffect } from "react";
import { Btn, Field, Input } from "../ui";
import { KartBolum, HataMetni, Ipucu, UyariSeridi, Segment } from "../tasarim";
import { katDogrula, katMetni, fiyatAyariOf, YUVARLAMA_SECENEKLERI, ONERILEN_KAT, ZARAR_UYARISI } from "../../lib/parcaFiyati";

// Spec 0133 R6, R6/2, R8, R8/2, R8/3, R20, R21, C7/2 (AC-8, AC-15, AC-66, AC-67, AC-81–AC-84): Ayarlar › Uygulama › Fiyat Ayarları.
// Varsayılan kâr katı ve yuvarlama `appSettings.fiyatAyarlari`'na yazılır (Karar 33); parça kayıtlarına hiçbir şey yazılmaz (C8).
// Panel Ayarlar kilit listesindedir (`AYAR_KILITLI.fiyat`). Ayar boş doğar; 2,77 yalnız öneridir.
export const FIYAT_AYAR_IPUCU = "Bu ayar bütün maliyete bağlı parçaların fiyatını birlikte değiştirir; elle sabit parçalara ve kayıtlı teklif, servis ve satışlara dokunmaz.";
export const KAT_ONERI_METNI = `Öneri: ${katMetni(ONERILEN_KAT)} (fiyatı ve maliyeti girili parçalarda fiyatın maliyete oranının ortancası).`;
export const VARSAYILAN_KAT_ETIKETI = "Varsayılan kâr katı";

export const SettingsFiyat = ({ appSettings, setAppSettings, flash }) => {
  const kayitli = fiyatAyariOf(appSettings?.fiyatAyarlari);
  const [kat, setKat] = useState(katMetni(kayitli.varsayilanKat));
  const [yuvarlama, setYuvarlama] = useState(kayitli.yuvarlama);
  const [hata, setHata] = useState(null);
  // Triyaj (bulgu 7): form kayıtlı DEĞERLER değişince yeniden kurulur, nesnenin kimliği değişince değil (başka bilgisayarın kaydından
  // sonraki yeniden yükleme aynı değerli yeni nesne kurar; kaydedilmemiş giriş silinmesin).
  useEffect(() => {
    setKat(katMetni(kayitli.varsayilanKat)); setYuvarlama(kayitli.yuvarlama);
  }, [kayitli.varsayilanKat, kayitli.yuvarlama]);
  const d = katDogrula(kat);
  const kaydet = () => {
    if (d.hata) { setHata(d.hata); return; }
    setHata(null);
    // Karar 33: boş alan yazılmaz; ikisi de boşsa değer `undefined` olur (anahtar SİLİNMEZ: `mergeAppSettings` yerel ayarı yeniden
    // okunanın üstüne bindirir, silinmiş anahtar sunucudaki eski değeri ezemezdi; JSON gövdesinde anahtar oluşmaz; 0091 R24/4 emsali).
    const yeni = { ...(d.deger != null ? { varsayilanKat: d.deger } : {}), ...(yuvarlama ? { yuvarlama } : {}) };
    setAppSettings?.(p => ({ ...(p || {}), fiyatAyarlari: Object.keys(yeni).length ? yeni : undefined }));
    flash?.("ok", "Fiyat ayarları kaydedildi.");
  };
  return (
    <KartBolum title="Fiyat Ayarları" icon="parts">
      <div data-testid="fiyat-ayar-ipucu"><Ipucu>{FIYAT_AYAR_IPUCU}</Ipucu></div>
      <div style={{ maxWidth: 320, marginTop: 10 }}>
        <Field label={VARSAYILAN_KAT_ETIKETI}>
          <Input value={kat} onChange={e => { setKat(e.target.value); setHata(null); }} aria-label={VARSAYILAN_KAT_ETIKETI} placeholder="Girilmedi" />
          <HataMetni>{hata}</HataMetni>
          <div data-testid="kat-oneri" style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4 }}>
            <Ipucu>{KAT_ONERI_METNI}</Ipucu>
            <Btn small variant="ghost" onClick={() => { setKat(katMetni(ONERILEN_KAT)); setHata(null); }}>Öneriyi kullan</Btn>
          </div>
        </Field>
      </div>
      {!d.hata && d.zarar && <UyariSeridi aile="uyari" testId="varsayilan-kat-zarar">{ZARAR_UYARISI}</UyariSeridi>}
      <Field label="Türetilen fiyatın yuvarlanması">
        <Segment kip="dugme" genislik="icerik" ariaLabel="Yuvarlama" value={yuvarlama} onChange={setYuvarlama} options={YUVARLAMA_SECENEKLERI} />
        <Ipucu>Yuvarlama yalnız maliyete bağlı parçanın türetilen fiyatına ve her zaman yukarı yapılır (ör. 4.082,69 TL yukarı 10 TL ile 4.090 TL olur); elle girilen fiyata dokunmaz.</Ipucu>
      </Field>
      <div style={{ marginTop: 12 }}><Btn onClick={kaydet}>Kaydet</Btn></div>
    </KartBolum>
  );
};
