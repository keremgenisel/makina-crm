// Altunmak CRM çekirdek veri modeli (artımlı TypeScript benimseme).
//
// Bu tipler kalıcı kayıt şekillerini tanımlar; kaynak: electron/db.cjs INSERT kolonları
// + frontend'in kullandığı iç içe diziler (kaliplar, prevOwners, degisenParcalar...).
// Amaç, analizde bug kaynağı olarak işaretlenen iç içe veri şekillerini tiplemek.
//
// JS dosyalarında `// @ts-check` + JSDoc ile kullanılır, örn:
//   /** @param {import("./types").Customer} c */
//
// Not: ID'ler SAYIdır (uid() kripto-rastgele sayısal üretir; eski kayıtlar da sayısal).
// Kesin bilinmeyen/opsiyonel alanlar `?` ile; union'lar güvenli olduğu yerde daraltıldı.

export type ID = number;
export type Currency = "TRY" | "USD" | "EUR";
export type ISODate = string; // "YYYY-MM-DD" veya ISO zaman damgası

// normalizeSaleType'ın güncel dört-yönlü çıktısı (eski değerler buna eşlenir).
export type SaleType =
  | "Faturalı Yurtiçi"
  | "Faturalı Yurtdışı"
  | "Faturasız Yurtiçi"
  | "Faturasız Yurtdışı";

/** Bir makinaya bağlı kalıp (customer.kaliplar[] ve extra kalıp satışı). */
export interface Kalip {
  ad?: string;
  olcu?: string;
  fiyat?: number;
  part_sale_id?: ID | null;
  sort_order?: number;
  uretimFormGonder?: boolean;
  uretimFormId?: ID | null;
}

/** İkinci-el devir zincirindeki önceki sahip kaydı. */
export interface PrevOwner {
  name?: string;
  installDate?: ISODate;
  satisYapan?: string;
  [k: string]: unknown;
}

/** Müşteri/makina kaydı (bir satır = bir makina; aynı firmanın birden çok makinası olabilir). */
export interface Customer {
  id: ID;
  name?: string;
  phone?: string;
  email?: string;
  adres?: string;
  city?: string;
  country?: string;
  yetkili1Ad?: string;
  yetkili1Tel?: string;
  yetkili2Ad?: string;
  yetkili2Tel?: string;
  contact?: string;
  aciklama?: string;
  model?: string;
  serialNo?: string;
  kalipCapi?: unknown;
  seriNoBekliyor?: boolean;
  satisYapan?: string;
  installDate?: ISODate;
  warrantyEnd?: ISODate;
  faturali?: boolean;
  saleType?: SaleType | string;
  faturaBedeli?: number;
  fabrikaSatisBedeli?: number;
  komisyon?: number;
  currency?: Currency;
  kalanBorc?: number;
  isResale?: boolean;
  prevOwners?: PrevOwner[];
  kalip?: string;
  kaliplar?: Kalip[];
  kalipSayisi?: number;
  extraKalipFiyati?: number;
  bantlar?: unknown;
  odemePlani?: unknown;
  brutKg?: number;
  deletedAt?: ISODate | null;
}

/** Servis talebi / bakım kaydı. */
export interface Service {
  id: ID;
  customerId: ID | null;
  type?: string;
  repairPlace?: string;
  date?: ISODate;
  tech?: string;
  yapilanIsler?: string;
  musteriTalimati?: string;
  fabrikaNotu?: string;
  servisUcreti?: number;
  currency?: Currency;
  faturaTipi?: string;
  odendi?: boolean;
  degisenParcalar?: Array<Record<string, unknown>>;
  parcaUcretsizMi?: boolean;
  parcaUcreti?: number;
  parcaCurrency?: Currency;
  parcaGarantiDisi?: boolean;
  deletedAt?: ISODate | null;
}

/** Extra kalıp / yedek parça satışı (tur: "Kalıp" | "Parça"). */
export interface PartSale {
  id: ID;
  customerId: ID | null;
  tur?: string;
  ad?: string;
  olcu?: string;
  tarih?: ISODate;
  ucret?: number;
  currency?: Currency;
  odendi?: boolean;
  faturaTipi?: string;
  ucretsizMi?: boolean;
  garantiDisiIslem?: boolean;
  batchId?: ID | string | null;
  teklifId?: ID | null;
  uretimFormGonder?: boolean;
  uretimFormId?: ID | null;
  deletedAt?: ISODate | null;
}

/** Kapora / ödeme satırı. */
export interface Payment {
  id: ID;
  customerId: ID | null;
  tarih?: ISODate;
  tutar?: number;
  currency?: Currency;
  note?: string;
  yontem?: string;
  vadeTarihi?: ISODate;
  tahsilEdildi?: boolean;
  deletedAt?: ISODate | null;
}

/** Bayi / anlaşmalı servis kaydı. */
export interface Dealer {
  id: ID;
  name?: string;
  contact?: string;
  phone?: string;
  email?: string;
  adres?: string;
  country?: string;
  city?: string;
  note?: string;
  bayiMi?: boolean;
  anlasmaliServisMi?: boolean;
  deletedAt?: ISODate | null;
}

/** Makina stok kaydı. */
export interface StockItem {
  id: ID;
  model?: string;
  serialNo?: string;
  addedDate?: ISODate;
  note?: string;
  parcalar?: unknown;
  deletedAt?: ISODate | null;
}

export interface Note {
  id: ID;
  content?: string;
  updatedAt?: ISODate;
  olusturan?: string;
  deletedAt?: ISODate | null;
}

export interface Part {
  id: ID;
  ad?: string;
  adEN?: string;
  kod?: string;
  tanim?: string;
  tanimEN?: string;
  fiyatTRY?: number;
  fiyatUSD?: number;
  fiyatEUR?: number;
  models?: unknown;
  tip?: string;
  resim?: string;
  deletedAt?: ISODate | null;
}

export interface KalipDef {
  id: ID;
  ad?: string;
  kod?: string;
  urunAdi?: string;
  urunAdiEN?: string;
  tanim?: string;
  tanimEN?: string;
  resim?: string;
  deletedAt?: ISODate | null;
}

/** Bir kayda (servis/kalıp/müşteri/bayi) bağlı dosya meta kaydı. */
export interface Dosya {
  id: ID;
  customerId?: ID | null;
  dealerId?: ID | null;
  refType?: string;
  refId?: ID | null;
  ad?: string;
  dosyaAdi?: string;
  boyut?: number;
  tur?: string;
  tarih?: ISODate;
  ekleyen?: string;
  aciklama?: string;
  deletedAt?: ISODate | null;
}

/** Sunucudan gelen kullanıcı izin bilgisi (permissions: grup→eylem[] JSON string'i). */
export interface ServerPermissions {
  role?: string;
  permissions?: string;
}

export interface Gorusme {
  id: ID;
  customerId: ID | null;
  tarih?: ISODate;
  tur?: string;
  notField?: string;
  takipTarihi?: ISODate;
  tamamlandi?: boolean;
  kullanici?: string;
  deletedAt?: ISODate | null;
}
