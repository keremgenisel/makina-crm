// Müşteri/makina detay görünümü türetilmiş değerleri (zaman çizelgesi + finans hesapları).
// CustomerDetailModal'daki büyük useMemo gövdesinden ayrıldı: SAF hesaplama (setState yok),
// böylece bağımsız birim-test edilebilir. Bileşen bunu useMemo içinde tek satırla çağırır.
import {
  normalizeSaleType, fmtCur, fmtTR, sumPayments, calcKalanBorc, isServisBorcluMu,
  isServisUcretliMi, isParcaUcretliMi, parseMoney, calcKDV, isPartSaleBorcluMu,
  sumBekleyenCek, isCekVadesiGecmis, parcaAdi, yedekParcaBedeli, isYedekParcaBorcluMu,
} from "../../../lib/utils";

export function deriveCustomerDetail({ detailView, services, partSales, payments, kdvRates, models, todayStr, factoryName, yedekParcaSatislar = [], dealers = [], parts = [], customers = [] }) {
    const detailHistory = detailView
      ? services.filter(s => s.customerId === detailView.id).sort((a, b) => (b.date || "").localeCompare(a.date || ""))
      : [];
    const detailTimelineEvents = (() => {
      if (!detailView) return [];
      const ev = [];
      if (detailView.installDate || (detailView.isResale && detailView.prevOwners?.length > 0)) {
        const isDevir = detailView.isResale && detailView.prevOwners?.length > 0;
        const lastSoldDate = isDevir ? detailView.prevOwners[detailView.prevOwners.length - 1].soldDate : null;
        ev.push({
          kind: "sale", date: isDevir && lastSoldDate ? lastSoldDate : detailView.installDate, color: "var(--grn600, #16a34a)",
          title: isDevir ? "2. El Devir" : "Satış",
          tip: normalizeSaleType(detailView.faturali),
          desc: `${detailView.name}${detailView.fabrikaSatisBedeli ? " · " + fmtCur(detailView.fabrikaSatisBedeli, detailView.currency) : ""}${(detailView.kaliplar || []).length ? " · " + detailView.kaliplar.length + " kalıp" : ""}`,
        });
      }
      detailHistory.forEach(sv => {
        const tColor = { "İlk Çalıştırma": "var(--blu700, #1d4ed8)", "Garanti İçi": "var(--grn600, #16a34a)", "Garanti Dışı": "var(--red600, #dc2626)", "Periyodik Bakım": "var(--orTx, #c2410c)" }[sv.type] || "var(--n400, #94a3b8)";
        ev.push({ kind: "service", date: sv.date, color: tColor, title: sv.type, sv });
      });
      const kalipGroups = {};
      (partSales || []).filter(ps => ps.customerId === detailView.id && ps.tur === "Kalıp").forEach(ps => {
        const key = ps.batchId || ps.id;
        (kalipGroups[key] = kalipGroups[key] || []).push(ps);
      });
      Object.values(kalipGroups).forEach(psList => {
        // Not: eskiden a.id - b.id ile sıralanıyordu (sıralı ID = oluşturma sırası varsayımı).
        // uid() artık rastgele ID ürettiği için bu varsayım geçersiz; doğal dizi sırası
        // (partSales'e eklenme = oluşturma sırası) hem eski hem yeni veride doğru sonucu verir.
        // Teslim türü başlığa yansır (yedek parçadaki gibi, iconsuz): panodaysa "(Fabrika Teslim)"/"(Kargo)".
        const teslim = psList[0].kargoDurum ? (psList[0].fabrikaTeslim ? " (Fabrika Teslim)" : " (Kargo)") : "";
        ev.push({ kind: "part", date: psList[0].tarih, color: "var(--orTx, #c2410c)", title: "Kalıp Verildi" + teslim, psList });
      });
      (partSales || []).filter(ps => ps.customerId === detailView.id && ps.tur !== "Kalıp").forEach(ps => {
        ev.push({
          kind: "part", date: ps.tarih, color: "var(--cyan, #0891b2)",
          title: "Yedek Parça Verildi",
          desc: `${ps.ad}${ps.olcu ? " (" + ps.olcu + ")" : ""}${ps.ucretsizMi ? " · garanti kapsamında (ücretsiz)" : " · " + fmtCur(ps.ucret, ps.currency) + (ps.garantiDisiIslem ? " (garanti dışı işlem)" : "")}`,
          ps,
        });
      });
      // Yedek parça (kargo) satışları makina geçmişine düşer:
      // - Müşterinin KENDİ alımı (aliciTipi "musteri", bu makina) → düzenlenip silinebilir olay.
      //   TOPLU satış (aynı batchId) TEK olayda toplanır; `ypGrup` = gruptaki tüm kayıtlar, `yp` = birincil.
      // - Bayi alımından bu makinaya TAHSİS edilen parçalar → salt-okunur (borçlusu bayi).
      const parcaAdiOf = (s) => parcaAdi((parts || []).find(p => String(p.id) === String(s.partId))) || "yedek parça";
      // Teslim türü başlığa yansır: fabrika teslim → "Fabrika Teslim", aksi halde "Kargo".
      const ypBaslik = (s) => s.fabrikaTeslim ? "Yedek Parça (Fabrika Teslim)" : "Yedek Parça (Kargo)";
      const custYp = (yedekParcaSatislar || []).filter(s => !s.deletedAt && s.aliciTipi === "musteri" && Number(s.musteriId) === detailView.id);
      const ypGruplar = new Map(); // batchId (yoksa id) → kayıtlar
      for (const s of custYp) { const k = s.batchId != null ? "b:" + s.batchId : "s:" + s.id; if (!ypGruplar.has(k)) ypGruplar.set(k, []); ypGruplar.get(k).push(s); }
      for (const kayitlar of ypGruplar.values()) {
        const ilk = kayitlar[0];
        ev.push({
          kind: "part", date: ilk.tarih, color: "var(--cyan, #0891b2)",
          title: ypBaslik(ilk),
          desc: kayitlar.map(s => `${s.miktar} adet ${parcaAdiOf(s)}`).join(", "),
          yp: ilk, ypGrup: kayitlar,
        });
      }
      // Bayi/dış firma/müşteri alımından bu makinaya TAHSİS edilen parça (salt-okunur). Müşteri-alıcı
      // kendi makinasına satışlar yukarıda işlendi, atla. Başlıkta Kargo/Fabrika Teslim GÖSTERİLMEZ;
      // bunun yerine alıcı TÜRÜ parantez içinde (ör. "Yedek Parça (anlaşmasız servis)"), kim tahsis etti
      // (alıcı ADI) açıklamaya yazılır.
      const tahsisEdenTip = (s) => s.aliciTipi === "musteri" ? "Müşteri" : s.disFirma ? "Anlaşmasız Servis" : "Bayi";
      const tahsisEdenAd = (s) =>
        s.aliciTipi === "musteri" ? ((customers || []).find(c => c.id === Number(s.musteriId))?.name || "müşteri")
        : s.disFirma ? (s.disFirmaAd || "anlaşmasız servis")
        : ((dealers || []).find(d => d.id === s.dealerId)?.name || "bayi");
      // Tahsisleri BATCH (satın alma) bazında TEK olayda topla: bir batch birden çok parça satırı (kalem)
      // içerebilir; her kalemin bu makinaya tahsis edilen toplam adedi ayrı yazılır, kalem>1 ise "N kalem".
      const tahsisGruplari = new Map(); // batch anahtarı → { tip, ad, tarih, kalemler:[{miktar,parca}] }
      (yedekParcaSatislar || []).forEach(s => {
        if (s.deletedAt) return;
        if (s.aliciTipi === "musteri" && Number(s.musteriId) === detailView.id) return;
        const buMakina = (s.tahsisler || []).filter(t => t.customerId === detailView.id);
        if (!buMakina.length) return;
        const miktar = buMakina.reduce((sum, t) => sum + (parseInt(t.miktar) || 0), 0);
        const sonTarih = buMakina.reduce((mx, t) => (String(t.tarih || s.tarih) > mx ? String(t.tarih || s.tarih) : mx), String(s.tarih || ""));
        const key = s.batchId != null ? "b:" + s.batchId : "s:" + s.id;
        if (!tahsisGruplari.has(key)) tahsisGruplari.set(key, { tip: tahsisEdenTip(s), ad: tahsisEdenAd(s), tarih: sonTarih, kalemler: [] });
        const g = tahsisGruplari.get(key);
        g.kalemler.push({ miktar, parca: parcaAdiOf(s) });
        if (sonTarih > g.tarih) g.tarih = sonTarih;
      });
      for (const g of tahsisGruplari.values()) {
        const kalemMetni = g.kalemler.map(k => `${k.miktar} adet ${k.parca}`).join(", ");
        const kalemEk = g.kalemler.length > 1 ? ` · ${g.kalemler.length} kalem` : "";
        ev.push({
          kind: "part", date: g.tarih, color: "var(--cyan, #0891b2)",
          title: `Yedek Parça (${g.tip})${kalemEk}`,
          desc: `${kalemMetni} · ${g.ad} tarafından tahsis edildi`,
        });
      }
      (payments || []).filter(p => p.customerId === detailView.id).forEach(p => {
        const yontemTxt = p.yontem === "Çek" ? ` · Çek (Vade: ${p.vadeTarihi ? fmtTR(p.vadeTarihi) : "—"}${p.tahsilEdildi ? " · Tahsil Edildi" : " · Beklemede"})` : (p.yontem ? ` · ${p.yontem}` : "");
        ev.push({
          kind: "payment", date: p.tarih, color: "var(--teal, #0d9488)",
          title: "Kapora/Ödeme",
          desc: `${fmtCur(p.tutar, p.currency || detailView.currency)}${yontemTxt}${p.not ? " · " + p.not : ""}`,
          payment: p,
        });
      });
      // Ödeme planı: yalnızca AÇIK taksitler gösterilir — tahsil edilince taksit eventi
      // kaybolur, yerine normal Kapora/Ödeme eventi gelir (çift gösterim olmaz)
      (detailView.odemePlani || []).filter(r => !r.odemeId).forEach(r => {
        const gecikti = r.vadeTarihi && r.vadeTarihi < todayStr;
        ev.push({
          kind: "taksit", date: r.vadeTarihi || todayStr, color: gecikti ? "var(--red600, #dc2626)" : "#f59e0b",
          title: "Taksit Vadesi",
          desc: `${fmtCur(r.tutar, detailView.currency)}${gecikti ? " · Vadesi geçti" : " · Bekliyor"}`,
          taksit: r, taksitGecikti: gecikti,
        });
      });
      if (detailView.warrantyEnd) {
        const dolmus = detailView.warrantyEnd < todayStr;
        ev.push({
          kind: "warranty", date: detailView.warrantyEnd, color: dolmus ? "var(--red600, #dc2626)" : "#f59e0b",
          title: dolmus ? "Garanti Süresi Doldu" : "Garanti Bitişi",
          desc: dolmus ? "Garanti süresi sona erdi" : "Garanti süresi bu tarihte sona erecek",
        });
      }
      return ev.sort((a, b) => (a.date || "9999").localeCompare(b.date || "9999"));
    })();
    const detailModelInfo = detailView ? models.find(m => m.model === detailView.model) : null;
    const detailWarrantyOk = detailView?.warrantyEnd && detailView.warrantyEnd >= todayStr;
    const detailToplamOdeme = detailView ? sumPayments(detailView.id, payments) : 0;
    const detailKalanBorc = detailView ? calcKalanBorc(detailView, payments, kdvRates) : 0;
    const detailCiro = detailKalanBorc + detailToplamOdeme;

    const detailEkBorcByCur = {};
    if (detailView) {
      const ekle = (cur, tutar) => { if (tutar > 0) detailEkBorcByCur[cur] = (detailEkBorcByCur[cur] || 0) + tutar; };
      services.filter(s => s.customerId === detailView.id && isServisBorcluMu(s, factoryName)).forEach(s => {
        if (isServisUcretliMi(s, factoryName)) {
          const tutar = parseMoney(s.servisUcreti);
          ekle(s.currency || "TRY", tutar + calcKDV(s.faturaTipi, tutar, s.date, kdvRates));
        }
        if (isParcaUcretliMi(s)) {
          const tutar = parseMoney(s.parcaUcreti);
          ekle(s.parcaCurrency || s.currency || "TRY", tutar + calcKDV(s.faturaTipi, tutar, s.date, kdvRates));
        }
      });
      (partSales || []).filter(p => p.customerId === detailView.id && isPartSaleBorcluMu(p)).forEach(p => {
        const tutar = parseMoney(p.ucret);
        ekle(p.currency || "TRY", tutar + calcKDV(p.faturaTipi, tutar, p.tarih, kdvRates));
      });
      // Bu müşteriye yapılan ödenmemiş yedek parça (kargo) satışları da borç
      (yedekParcaSatislar || []).filter(s => s.aliciTipi === "musteri" && Number(s.musteriId) === detailView.id && isYedekParcaBorcluMu(s)).forEach(s => {
        const bedel = yedekParcaBedeli(s);
        ekle(s.currency || "TRY", bedel + calcKDV(s.faturaTipi, bedel, s.tarih, kdvRates));
      });
    }
    const detailMainCur = detailView?.currency || "TRY";
    const detailEkBorcAyniPB = detailEkBorcByCur[detailMainCur] || 0;
    const detailEkBorcDigerPB = Object.entries(detailEkBorcByCur).filter(([cur]) => cur !== detailMainCur);
    const detailKalanBorcToplam = detailKalanBorc + detailEkBorcAyniPB;
    const detailBekleyenCek = detailView ? sumBekleyenCek(detailView.id, payments) : 0;
    // Açık taksitler: sarı şerit için toplam + en yakın vade + gecikme durumu
    const acikTaksitler = detailView ? (detailView.odemePlani || []).filter(r => !r.odemeId) : [];
    const detailBekleyenTaksit = acikTaksitler.reduce((t, r) => t + parseMoney(r.tutar), 0);
    const detailTaksitGecikmisVar = acikTaksitler.some(r => r.vadeTarihi && r.vadeTarihi < todayStr);
    const detailEnYakinTaksitVade = acikTaksitler.map(r => r.vadeTarihi).filter(Boolean).sort()[0] || "";
    const detailEnYakinCekVade = detailView ? (payments.filter(pm => pm.customerId === detailView.id && pm.yontem === "Çek" && !pm.tahsilEdildi).map(pm => pm.vadeTarihi).filter(Boolean).sort()[0] || "") : "";
    const detailBekleyenCekler = detailView ? payments.filter(p => p.customerId === detailView.id && p.yontem === "Çek" && !p.tahsilEdildi) : [];
    const detailCekVadesiGecmisVar = detailBekleyenCekler.some(isCekVadesiGecmis);
    const detailKalipSatisAdedi = detailView ? (partSales || []).filter(p => p.customerId === detailView.id && p.tur === "Kalıp").length : 0;

    let detailServisNet = 0, detailServisKdv = 0;
    let detailExtraKalipNet = 0, detailExtraKalipKdv = 0;
    if (detailView) {
      services.filter(s => s.customerId === detailView.id).forEach(s => {
        if (isServisUcretliMi(s, factoryName) && (s.currency || "TRY") === detailMainCur) {
          const tutar = parseMoney(s.servisUcreti);
          detailServisNet += tutar;
          detailServisKdv += calcKDV(s.faturaTipi, tutar, s.date, kdvRates);
        }
        if (isParcaUcretliMi(s) && (s.parcaCurrency || s.currency || "TRY") === detailMainCur) {
          const tutar = parseMoney(s.parcaUcreti);
          detailServisNet += tutar;
          detailServisKdv += calcKDV(s.faturaTipi, tutar, s.date, kdvRates);
        }
      });
      (partSales || []).filter(p => p.customerId === detailView.id && p.tur === "Kalıp" && !p.ucretsizMi && (p.currency || "TRY") === detailMainCur).forEach(p => {
        const tutar = parseMoney(p.ucret);
        detailExtraKalipNet += tutar;
        detailExtraKalipKdv += calcKDV(p.faturaTipi, tutar, p.tarih, kdvRates);
      });
    }

    const detailLastTransferDate = detailView?.prevOwners?.length > 0 ? detailView.prevOwners[detailView.prevOwners.length - 1].soldDate : null;
    const detailBorcFromPrevOwner = !!(detailView && detailLastTransferDate && (
      detailKalanBorc > 0 ||
      services.some(s => s.customerId === detailView.id && isServisBorcluMu(s, factoryName) && s.date && s.date < detailLastTransferDate) ||
      (partSales || []).some(p => p.customerId === detailView.id && isPartSaleBorcluMu(p) && p.tarih && p.tarih < detailLastTransferDate)
    ));

    return {
      detailHistory, detailTimelineEvents, detailModelInfo, detailWarrantyOk,
      detailToplamOdeme, detailKalanBorc, detailCiro, detailEkBorcAyniPB, detailEkBorcDigerPB,
      detailKalanBorcToplam, detailBekleyenCek, detailEnYakinCekVade, detailBekleyenTaksit, detailTaksitGecikmisVar, detailEnYakinTaksitVade, detailCekVadesiGecmisVar, detailMainCur, detailKalipSatisAdedi,
      detailBorcFromPrevOwner, detailServisNet, detailServisKdv, detailExtraKalipNet, detailExtraKalipKdv,
    };
}
