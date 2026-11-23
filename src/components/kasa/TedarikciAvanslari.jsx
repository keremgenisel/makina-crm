import { useState, useMemo } from "react";
import { uid, yerelBugun } from "../../lib/utils";
import { tl } from "../../lib/gider";
import { tedarikciAvanslari, tedarikciEkstresi, tedarikciAvansSilinebilirMi, tedarikciAvansSinirMetni, hesapAdiCoz, AVANS_YON } from "../../lib/kasa";
import { odemeGirisiYaz } from "../../lib/formOdemesi";
import { logAction } from "../../lib/audit";
import { dovizIzAyrintisi, paraMetni } from "../../lib/doviz";
import { Icon, Btn, Modal, ConfirmDialog } from "../ui";
import { useKilitListesi } from "../../hooks/useKilitListesi";
import { kilitRedMesaji } from "../../lib/kilitAlanlari";
import { KartBolum, BosDurum } from "../tasarim";
import { Rozet } from "../gider/DonemRaporu";
import { EkstrePenceresi } from "../gider/EkstrePenceresi";
import { AvansFormu } from "./CalisanAvanslari";

// Kasa › Tedarikçi avansları (spec 0155 R14, R14/2, C10/2; plan P4, P5). Tedarikçiye verilen ya da fazla ödenen para avans
// hareketidir; gider değildir (R21). Açık avans para birimi başına tek okuyucudan (kasa.tedarikciAvanslari, C2): ekran
// toplama ya da çevrim yazmaz. Çöpteki tedarikçinin avansı "silinmiş" rozetiyle durur. Avans verme, geri ödeme ve silme
// `avans` izni ister (sunucu ayrıca Kasa sekmesini ister, C5).
export const TEDARIKCI_AVANSLARI_METIN = Object.freeze({
  baslik: "Tedarikçi avansları", altBaslik: "Avans gider değildir; açık avans tedarikçinin sonraki faturasından mahsup edilince ya da tedarikçi geri ödeyince kapanır.",
  avansVer: "Tedarikçi Avansı Ver", geriOdeme: "Geri ödeme gir", ekstre: "Ekstre", silinmis: "Silinmiş",
  bosBaslik: "Tedarikçi avansı yok", bosMetin: "Bir tedarikçiye verilen ya da fazla ödenen para buradan avans olarak girilir.",
  sutunTedarikci: "Tedarikçi", sutunPb: "Para birimi", sutunVerilen: "Verilen", sutunMahsup: "Mahsup edilen", sutunGeri: "Geri ödenen", sutunAcik: "Açık avans",
  silBaslik: "Avans silinsin mi?", silinemezBaslik: "Avans silinemez", silOnay: "Avansı Sil", tamam: "Tamam",
  silMetni: (t) => `${t} tutarındaki kayıt silinecek; tedarikçinin açık avansı ve hesap bakiyesi buna göre değişir.`,
  kaydedildi: "Avans kaydedildi.", geriKaydedildi: "Geri ödeme kaydedildi.", silindi: "Avans silindi.",
});
const M = TEDARIKCI_AVANSLARI_METIN;
const pbMetni = (k, pb) => paraMetni(tl(k), pb);
const avansMiktari = (m) => (m.dovizTutar != null && m.paraBirimi && m.paraBirimi !== "TRY" ? paraMetni(m.dovizTutar, m.paraBirimi) : paraMetni(m.tutar, "TRY"));
// İz ayrıntısı (AC-39): tedarikçi, tutar, yön ve döviz kaydında para birimiyle kur; kayıt türü bugünkü `avans` (R20/3).
export const tedarikciAvansIzi = (m, tedarikciAdi) => ({ tedarikci: tedarikciAdi || "", tutar: m.tutar, yon: m.yon === AVANS_YON.GIREN ? AVANS_YON.GIREN : AVANS_YON.CIKAN, ...dovizIzAyrintisi(m) });

// R15/8 (AC-56): avans silme, Kasa bölümü ve tedarikçi ekstresi (Tedarikler) aynı pencereyi kullanır; ikinci yol yazılmaz.
export const TedarikciAvansSilPenceresi = ({ avans, hareketler, giderler, setHesapHareketleri, tedarikciAdi, serverPermissions, showToast, baskasiKilitli, onClose }) => {
  const k = tedarikciAvansSilinebilirMi(avans, hareketler, giderler);
  const sil = () => {
    const kilit = baskasiKilitli?.("tedarikci", avans.tedarikciId);
    if (kilit) { onClose(); showToast(kilitRedMesaji(kilit), "err"); return; }
    odemeGirisiYaz({ silinenler: [avans.id] }, { setHesapHareketleri });
    logAction({ serverPermissions, action: "silindi", entity: "avans", entityId: avans.id, entityName: tedarikciAdi || "", detail: tedarikciAvansIzi(avans, tedarikciAdi) });
    onClose();
    showToast(M.silindi);
  };
  if (!k.ok) return (
    <Modal title={M.silinemezBaslik} onClose={onClose} footer={<Btn onClick={onClose}>{M.tamam}</Btn>}>
      <div data-testid="tedarikci-avans-silinemez" style={{ fontSize: 13, lineHeight: 1.6 }}>{tedarikciAvansSinirMetni(k)}</div>
    </Modal>
  );
  return <ConfirmDialog title={M.silBaslik} message={M.silMetni(avansMiktari(avans))} confirmLabel={M.silOnay} onConfirm={sil} onCancel={onClose} />;
};

export const TedarikciAvanslari = ({
  tedarikciler = [], tumTedarikciler = null, hesapHareketleri = [], setHesapHareketleri = null, kasaHesaplari = [], giderler = [], giderTurleri = [],
  yururlukAy = null, bugun = yerelBugun(), canDo = () => true, serverPermissions = null, showToast = () => {}, aktifKullanici = "", rates = null, ratesErr = false,
}) => {
  const { baskasiKilitli } = useKilitListesi(aktifKullanici);
  const hepsi = tumTedarikciler || tedarikciler;
  const [form, setForm] = useState(null); // { yon, tedarikciId, paraBirimi }
  const [ekstreId, setEkstreId] = useState(null);
  const [silinecek, setSilinecek] = useState(null);
  const kovalar = useMemo(() => tedarikciAvanslari(hesapHareketleri, giderler), [hesapHareketleri, giderler]);
  const tedById = useMemo(() => new Map(hepsi.map(t => [String(t.id), t])), [hepsi]);
  const satirlar = [...kovalar.keys()].map(id => tedById.get(id) || { id, ad: "—", deletedAt: "?" })
    .sort((a, b) => (a.deletedAt ? 1 : 0) - (b.deletedAt ? 1 : 0) || String(a.ad).localeCompare(String(b.ad), "tr"));
  const yazabilir = canDo("avans") && !!setHesapHareketleri;
  const hesapAdi = (id) => hesapAdiCoz(kasaHesaplari, id);
  const kaydet = (kayit) => {
    const yeni = { ...kayit, id: uid() };
    setHesapHareketleri(p => [...p, yeni]);
    const ad = tedById.get(String(kayit.tedarikciId))?.ad || "";
    logAction({ serverPermissions, action: "olusturuldu", entity: "avans", entityId: yeni.id, entityName: ad, detail: tedarikciAvansIzi(kayit, ad) });
    setForm(null);
    showToast(kayit.yon === AVANS_YON.GIREN ? M.geriKaydedildi : M.kaydedildi);
  };
  const ekstreTed = ekstreId == null ? null : tedById.get(String(ekstreId));
  const izgara = { display: "grid", gridTemplateColumns: "minmax(0, 1.4fr) 80px 120px 120px 120px 130px 210px", gap: 10, alignItems: "center" };
  return (
    <KartBolum varyant="kart" baslikStili="baslik" title={M.baslik} altBaslik={M.altBaslik}
      eylemler={yazabilir && tedarikciler.some(t => !t.deletedAt) ? <Btn small onClick={() => setForm({ yon: null })}><Icon name="plus" size={12} /> {M.avansVer}</Btn> : null}
      style={{ overflow: "auto" }} testId="tedarikci-avanslari">
      {satirlar.length === 0 ? (
        <BosDurum testId="bos-tedarikci-avans" baslik={M.bosBaslik} metin={M.bosMetin} />
      ) : (
        <div style={{ minWidth: 880 }}>
          <div style={{ ...izgara, fontSize: 11.5, fontWeight: 700, color: "var(--n500, #64748b)", padding: "0 0 6px", borderBottom: "1px solid var(--n200, #e2e8f0)" }}>
            <span>{M.sutunTedarikci}</span><span>{M.sutunPb}</span><span style={{ textAlign: "right" }}>{M.sutunVerilen}</span><span style={{ textAlign: "right" }}>{M.sutunMahsup}</span>
            <span style={{ textAlign: "right" }}>{M.sutunGeri}</span><span style={{ textAlign: "right" }}>{M.sutunAcik}</span><span />
          </div>
          {satirlar.flatMap(t => (kovalar.get(String(t.id)) || []).map((kv, i) => (
            <div key={`${t.id}:${kv.paraBirimi}`} data-testid="tedarikci-avans-satiri" style={{ ...izgara, fontSize: 13, padding: "8px 0", borderTop: "1px solid var(--n150, #f1f5f9)" }}>
              <span>{i === 0 && <><b>{t.ad}</b>{t.deletedAt && <span style={{ marginLeft: 8 }}><Rozet renk="kirmizi">{M.silinmis}</Rozet></span>}</>}</span>
              <span>{kv.paraBirimi}</span>
              <span style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{kv.verilenK ? pbMetni(kv.verilenK, kv.paraBirimi) : "—"}</span>
              <span style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{kv.mahsupK ? pbMetni(kv.mahsupK, kv.paraBirimi) : "—"}</span>
              <span style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{kv.geriK ? pbMetni(kv.geriK, kv.paraBirimi) : "—"}</span>
              <b data-testid="tedarikci-acik-avans" style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", color: kv.acikK ? "var(--amb700, #b45309)" : "var(--n900, #0f172a)" }}>{pbMetni(kv.acikK, kv.paraBirimi)}</b>
              <span style={{ textAlign: "right", display: "flex", gap: 6, justifyContent: "flex-end" }}>
                {yazabilir && kv.acikK > 0 && !t.deletedAt && <Btn small variant="ghost" onClick={() => setForm({ yon: AVANS_YON.GIREN, tedarikciId: t.id, paraBirimi: kv.paraBirimi })}>{M.geriOdeme}</Btn>}
                {i === 0 && <Btn small variant="ghost" onClick={() => setEkstreId(t.id)}>{M.ekstre}</Btn>}
              </span>
            </div>
          )))}
        </div>
      )}
      {form && <AvansFormu taraf="tedarikci" tedarikciler={hepsi} hesaplar={kasaHesaplari} hareketler={hesapHareketleri} giderler={giderler} yon={form.yon}
        paraBirimi={form.paraBirimi || null} ilkTedarikciId={form.tedarikciId ?? ""} rates={rates} ratesErr={ratesErr} onKaydet={kaydet} onClose={() => setForm(null)} />}
      {ekstreTed && (
        <EkstrePenceresi tur="tedarikci" baslik={ekstreTed.ad} silinmis={!!ekstreTed.deletedAt} hesapAdi={hesapAdi}
          hesapla={(aralik) => tedarikciEkstresi(ekstreTed.id, { giderler, hareketler: hesapHareketleri, turler: giderTurleri, yururlukAy, bugun, aralik })}
          onAvansSil={yazabilir ? setSilinecek : null} onClose={() => setEkstreId(null)} />
      )}
      {silinecek && <TedarikciAvansSilPenceresi avans={silinecek} hareketler={hesapHareketleri} giderler={giderler} setHesapHareketleri={setHesapHareketleri}
        tedarikciAdi={tedById.get(String(silinecek.tedarikciId))?.ad} serverPermissions={serverPermissions} showToast={showToast} baskasiKilitli={baskasiKilitli} onClose={() => setSilinecek(null)} />}
    </KartBolum>
  );
};
