export type FootballProvider =
  | "api-football"
  | "openfootapi"
  | "thesportsdb"
  | "365scores-widget"
  | "sportscore-widget";
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
}
export interface VenueEvent {
  id: string;
  fixtureId: string;
  fixture: Fixture;
  showing: boolean;
  bookingOpen: boolean;
  reviewRequired: boolean;
  startsAt: string;
  endsAt: string;
  paymentMode: "free" | "fee" | "deposit";
  amountMinor: number;
  cancellationHours: number;
  tables?: { tableId: string; table: EventTable }[];
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
    checked_in: ["حضر", "Checked in"],
    cancelled: ["ملغي", "Cancelled"],
    held: ["بانتظار الدفع", "Awaiting payment"],
    expired: ["انتهت المهلة", "Expired"],
  };
  return names[status]?.[ar ? 0 : 1] || status;
}
