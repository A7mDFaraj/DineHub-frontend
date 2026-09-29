export type FootballProvider =
  | "api-football"
  | "openfootapi"
  | "thesportsdb"
  | "365scores-widget"
  | "sportscore-widget"
  | "manual";
export interface FootballSyncStatus {
  selectedProvider: FootballProvider;
  running: boolean;
  lastError: string | null;
  lastCompletedAt: string | null;
  partial: boolean;
  providers: {
    id: FootballProvider;
    configured: boolean;
    running: boolean;
    lastError: string | null;
    lastCompletedAt: string | null;
    partial: boolean;
  }[];
}
export const providerNames: Record<FootballProvider, string> = {
  "api-football": "API-Football",
  openfootapi: "OpenFootAPI",
  thesportsdb: "TheSportsDB",
  "365scores-widget": "365Scores · Widget",
  "sportscore-widget": "SportScore · Widget",
  manual: "Manual · No API",
};
export interface Fixture {
  id: string;
  provider?: FootballProvider;
  leagueEn: string;
  leagueAr: string | null;
  homeEn: string;
  homeAr: string | null;
  awayEn: string;
  awayAr: string | null;
  homeLogo: string | null;
  awayLogo: string | null;
  kickoff: string;
  status: string;
  syncedAt: string;
}
export interface EventTable {
  id: string;
  number: number;
  capacity: number;
  available?: boolean;
  inStoreOnly?: boolean;
}
export interface VenueEvent {
  id: string;
  fixtureId: string;
  fixture: Fixture & {
    sourceMeta?: {
      requiresApproval?: boolean;
      inStoreOnlyTableIds?: string[];
      [key: string]: unknown;
    };
  };
  showing: boolean;
  bookingOpen: boolean;
  reviewRequired: boolean;
  startsAt: string;
  endsAt: string;
  paymentMode: "free" | "fee" | "deposit" | "preorder";
  amountMinor: number;
  cancellationHours: number;
  tables?: { tableId: string; table: EventTable }[];
}
export interface TableStatusResponse {
  hasEvent: boolean;
  table?: { id: string; number: number; capacity: number };
  isBooked?: boolean;
  reserverName?: string;
  reservationStatus?: string;
  userCanBook?: boolean;
  inStoreOnly?: boolean;
  event?: {
    id: string;
    fixture: Fixture;
    startsAt: string;
    endsAt: string;
    paymentMode: "free" | "fee" | "deposit" | "preorder";
    amountMinor: number;
    bookingOpen: boolean;
    requiresApproval: boolean;
  };
}
export interface Reservation {
  amountMinor?: number;
  paymentMode?: string;
  paymentStatus?: string;
  credits?: { orderId: string; amountMinor: number }[];
  id: string;
  token?: string;
  customerName: string;
  phone: string;
  guests: number;
  status: string;
  startsAt: string;
  endsAt: string;
  checkedInAt: string | null;
  cancellationDeadline?: string;
  table: { number: number };
  event: {
    reviewRequired?: boolean;
    id: string;
    fixture: Fixture;
    branch?: { publicCode: string };
  };
}
export function matchName(fixture: Fixture, ar: boolean) {
  if (!fixture.awayEn || fixture.awayEn === "-" || fixture.awayEn === fixture.homeEn) {
    return ar ? fixture.homeAr || fixture.homeEn : fixture.homeEn;
  }
  return `${ar ? fixture.homeAr || fixture.homeEn : fixture.homeEn} × ${ar ? fixture.awayAr || fixture.awayEn : fixture.awayEn}`;
}
export function matchTime(date: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Riyadh",
  }).format(new Date(date));
}
export function reservationStatus(status: string, ar: boolean) {
  const names: Record<string, [string, string]> = {
    no_show: ["لم يحضر", "No-show"],
    confirmed: ["مؤكد", "Confirmed"],
    pending_approval: ["بانتظار موافقة الإدارة", "Pending approval"],
    checked_in: ["حضر", "Checked in"],
    cancelled: ["ملغي", "Cancelled"],
    held: ["بانتظار الدفع", "Awaiting payment"],
    expired: ["انتهت المهلة", "Expired"],
  };
  return names[status]?.[ar ? 0 : 1] || status;
}
