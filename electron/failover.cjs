// İstemci sunucuya birden çok adresten ulaşabilir: kullanıcının girdiği birincil adres
// (ör. Tailscale 100.x) ve aynı yerel ağdayken keşfedilip önbelleğe alınan yedek LAN adresi
// (192.168.x). Fabrikada internet kesilip Tailscale düşse bile, aynı ağdaki sunucuya LAN
// üzerinden kesintisiz devam edebilmek için istekler sırayla adaylarda denenir.

// Denenecek adres sırası: en son çalışan adres önce (ölü adres için gereksiz timeout
// beklenmesin), sonra birincil (kullanıcının girdiği), sonra keşfedilen LAN yedeği.
// Sondaki eğik çizgi normalize edilir, tekrarlar ve boşlar elenir.
function buildCandidates(lastGood, primary, lan) {
  const seen = new Set();
  const out = [];
  for (const u of [lastGood, primary, lan]) {
    if (!u) continue;
    const k = String(u).replace(/\/+$/, "");
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(k);
  }
  return out;
}

module.exports = { buildCandidates };
