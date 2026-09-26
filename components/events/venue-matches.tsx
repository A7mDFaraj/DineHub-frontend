"use client";
import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { apiClient } from "@/lib/api-client";
import { MatchHeading } from "./match-heading";
import type { VenueEvent } from "./types";
import styles from "./events.module.css";
export function VenueMatches({ branchCode }: { branchCode: string }) {
  const locale = useLocale(),
    ar = locale === "ar";
  const [events, setEvents] = useState<VenueEvent[]>([]);
  useEffect(() => {
    const abort = new AbortController();
    apiClient
      .get<{ events: VenueEvent[] }>(
        `/events/branch/${encodeURIComponent(branchCode)}`,
        { signal: abort.signal },
      )
      .then(({ data }) => {
        if (!abort.signal.aborted) setEvents(data.events);
      })
      .catch(() => {
        /* The menu remains usable if the optional events service is unavailable. */
      });
    return () => abort.abort();
  }, [branchCode]);
  if (!events.length) return null;
  return (
    <section className={styles.public}>
      <div className={styles.root} dir={ar ? "rtl" : "ltr"}>
        <div className={styles.header}>
          <h2>{ar ? "المباريات في هذا المحل" : "Matches at this venue"}</h2>
          <Link className={styles.button} href={`/events/${branchCode}`}>
            {ar ? "المباريات والحجوزات" : "Matches & reservations"}
          </Link>
        </div>
        <div className={styles.grid}>
          {events.slice(0, 3).map((event) => (
            <article key={event.id} className={styles.card}>
              <MatchHeading fixture={event.fixture} locale={locale} />
              <p>{ar ? "تُعرض المباراة هنا" : "Showing here"}</p>
              <Link className={styles.button} href={`/events/${branchCode}`}>
                {event.bookingOpen && !event.reviewRequired
                  ? ar
                    ? "احجز طاولتك"
                    : "Reserve a table"
                  : ar
                    ? "تفاصيل المباراة"
                    : "Match details"}
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
