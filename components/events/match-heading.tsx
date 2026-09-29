import Image from "next/image";
import type { Fixture } from "./types";
import { matchName, matchTime } from "./types";
import styles from "./events.module.css";
export function MatchHeading({
  fixture,
  locale,
}: {
  fixture: Fixture;
  locale: string;
}) {
  const ar = locale === "ar";
  return (
    <>
      <p className={styles.muted}>
        {ar ? fixture.leagueAr || fixture.leagueEn : fixture.leagueEn}
      </p>
      <div className={styles.teams}>
        {/* Provider images are remote team crests; fixed dimensions prevent layout shift. */}

        {fixture.homeLogo?.startsWith("https://") && (
          <Image
            unoptimized
            src={fixture.homeLogo}
            alt=""
            width={42}
            height={42}
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        )}
        <h2>{matchName(fixture, ar)}</h2>

        {fixture.awayLogo?.startsWith("https://") &&
          fixture.awayLogo !== fixture.homeLogo && (
            <Image
              unoptimized
              src={fixture.awayLogo}
              alt=""
              width={42}
              height={42}
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          )}
      </div>
      <p>
        <time dateTime={fixture.kickoff}>
          {matchTime(fixture.kickoff, locale)}
        </time>{" "}
        · {ar ? "بتوقيت الرياض" : "Riyadh time"}
      </p>
    </>
  );
}
