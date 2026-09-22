import {
  activeDiscount,
  getMenuTheme,
  type MenuAppearance,
} from "@/lib/menu-themes";
import styles from "./menu-experience.module.css";

export function CelebrationArt({ theme }: { theme: string }) {
  return (
    <svg
      className={styles.art}
      viewBox="0 0 360 260"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="190"
        cy="140"
        r="110"
        stroke="currentColor"
        strokeWidth="0.8"
        opacity=".35"
      />
      <circle
        cx="190"
        cy="140"
        r="90"
        stroke="currentColor"
        strokeWidth="0.8"
        opacity=".25"
      />
      {theme === "founding-day" ? (
        <g stroke="currentColor" strokeWidth="2">
          <path d="M45 228V138h20v-17h20v17h20v-17h20v17h20v90M145 228V92h20V72h20v20h20V72h20v20h20v136M245 228V150h20v-18h20v18h20v78" />
          <path d="M174 228v-42a15 15 0 0 1 30 0v42M69 160l9-13 9 13zM111 160l9-13 9 13zM172 123l9-13 9 13zM210 123l9-13 9 13zM265 177l9-13 9 13zM35 239h280" />
          <path d="m48 52 12-12 12 12-12 12zM290 68l12-12 12 12-12 12z" />
        </g>
      ) : theme === "ramadan" ? (
        <g stroke="currentColor" strokeWidth="2">
          <path
            d="M217 48a78 78 0 1 0 58 120A69 69 0 0 1 217 48Z"
            fill="currentColor"
            opacity=".8"
          />
          <path d="M93 18v69m-14 18 14-18 14 18v42l-14 17-14-17zM82 113h22m-22 25h22M285 27v47m-12 17 12-17 12 17v35l-12 15-12-15z" />
          <path d="m255 205 5 12 13 5-13 5-5 12-5-12-13-5 13-5zM157 18v15m-8-7h16" />
        </g>
      ) : theme === "eid" ? (
        <g stroke="currentColor" strokeWidth="2">
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
            <ellipse
              key={angle}
              cx="190"
              cy="89"
              rx="25"
              ry="53"
              transform={`rotate(${angle} 190 140)`}
            />
          ))}
          <circle cx="190" cy="140" r="24" fill="currentColor" />
          <path d="m62 47 5 12 12 5-12 5-5 12-5-12-12-5 12-5zM308 209v18m-9-9h18" />
        </g>
      ) : (
        <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M180 225c10-45 11-88 5-130M185 102c-29-40-66-36-84-13 35-8 64-3 84 13Zm0 0c-9-46 9-63 27-67-7 23-16 40-27 67Zm0 0c32-39 68-33 85-10-37-7-62-2-85 10Zm0 0c-38-11-66 11-68 38 22-23 45-32 68-38Zm0 0c40-9 63 15 66 40-24-22-43-34-66-40Z" />
          <path d="M100 231c51-15 104-15 162 0M141 216h93M62 68l7-7 7 7-7 7zM283 158l8-8 8 8-8 8z" />
        </g>
      )}
    </svg>
  );
}

export function CelebrationBanner({
  appearance,
  ar = false,
}: {
  appearance: MenuAppearance;
  ar?: boolean;
}) {
  const theme = getMenuTheme(appearance.menuTheme);
  const discount = activeDiscount(appearance);
  const seasonal = !["signature", "charcoal"].includes(theme.id);
  return (
    <section className={styles.hero} aria-label={ar ? theme.ar : theme.en}>
      <div className={styles.heroCopy}>
        <p className={styles.eyebrow}>
          {seasonal
            ? ar
              ? theme.ar
              : theme.en
            : ar
              ? "أهلاً بكم على مائدتنا"
              : "WELCOME TO OUR TABLE"}
        </p>
        <h2>{ar ? theme.taglineAr : theme.tagline}</h2>
        <p className={styles.heroDescription}>
          {ar
            ? "لحظات جميلة تبدأ بطبق تحبّه."
            : "Something delicious. A moment to savour."}
        </p>
        {discount > 0 && (
          <div className={styles.offer}>
            <strong>
              {discount}
              <span>%</span>
            </strong>
            <div>
              <b>{ar ? "خصم على جميع أطباق القائمة" : "off every menu item"}</b>
              <span>
                {ar
                  ? "الخصم مطبّق على الأسعار المعروضة"
                  : "Already included in the prices below"}
              </span>
            </div>
          </div>
        )}
      </div>
      <CelebrationArt theme={theme.id} />
    </section>
  );
}
