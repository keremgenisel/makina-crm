// Görüntüler karşılaştırılabilsin diye "şimdi" sabitlenir (önce ve sonra aynı tarih ve saatle çizilir).
const SABIT = new Date("2026-09-23T10:00:00").getTime();
const GercekDate = Date;
class SabitDate extends GercekDate {
  constructor(...a) { super(...(a.length ? a : [SABIT])); }
  static now() { return SABIT; }
}
globalThis.Date = SabitDate;
