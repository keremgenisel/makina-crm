// Otomatik LAN yedeklemesi: istekler hangi sırada, hangi adaylarda denenir?
// (Tailscale düşünce aynı ağdaki LAN adresine geçiş — buildCandidates saf mantığı.)
import { describe, it, expect } from "vitest";
import { buildCandidates } from "../electron/failover.cjs";

describe("buildCandidates — failover aday sırası", () => {
  const tail = "http://100.100.1.2:3000";
  const lan = "http://192.168.1.50:3000";

  it("son çalışan yoksa: birincil (Tailscale) önce, sonra LAN yedeği", () => {
    expect(buildCandidates(null, tail, lan)).toEqual([tail, lan]);
  });

  it("son çalışan LAN ise onu öne alır (ölü Tailscale için gereksiz timeout beklenmez)", () => {
    expect(buildCandidates(lan, tail, lan)).toEqual([lan, tail]);
  });

  it("boş/null adayları ve tekrarları eler", () => {
    expect(buildCandidates(null, tail, null)).toEqual([tail]);
    expect(buildCandidates(tail, tail, tail)).toEqual([tail]);
    expect(buildCandidates(null, null, null)).toEqual([]);
  });

  it("sondaki eğik çizgiyi normalize eder (aynı adres iki kez denenmez)", () => {
    expect(buildCandidates(null, "http://a:3000/", "http://a:3000")).toEqual(["http://a:3000"]);
  });
});
