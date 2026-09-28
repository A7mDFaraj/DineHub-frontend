"use client";
import { useState } from "react";
import styles from "./events.module.css";
export type WidgetProvider = "365scores-widget" | "sportscore-widget";

// The official 365Scores embed expects storage. Keep it ephemeral within an
// opaque sandbox origin; never grant this script access to admin storage.
const isolatedStorage = `for(const name of ['localStorage','sessionStorage']) {
  const values=new Map(); Object.defineProperty(window,name,{value:{
    getItem:k=>values.get(String(k))??null,
    setItem:(k,v)=>{values.set(String(k),String(v))},
    removeItem:k=>{values.delete(String(k))}, clear:()=>values.clear(),
    key:i=>[...values.keys()][i]??null, get length(){return values.size}
  }});
}
const cookies=new Map();
Object.defineProperty(document,'cookie',{get:()=>[...cookies].map(([k,v])=>k+'='+v).join('; '),set:value=>{const pair=String(value).split(';')[0];const split=pair.indexOf('=');if(split>0)cookies.set(pair.slice(0,split).trim(),pair.slice(split+1));}});
`;
export function scores365Document(ar: boolean) {
  return `<!doctype html><html lang="${ar ? "ar" : "en"}" dir="${ar ? "rtl" : "ltr"}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:white;font-family:Arial,sans-serif}</style></head><body>
<script>${isolatedStorage}</script>
<div data-widget-type="entityScores" data-entity-type="league" data-entity-id="649" data-lang="${ar ? "ar" : "en"}" data-widget-id="a91637a8-d80a-4a9e-92e7-60e7e7a7c4fe"></div>
<div id="powered-by">Powered by<a id="powered-by-link" href="https://www.365scores.com" target="_blank" rel="noopener noreferrer">365Scores.com</a></div>
<script>setTimeout(()=>{const loader=document.createElement('script');loader.src='https://widgets.365scores.com/main.js';document.body.appendChild(loader);},0);</script>
<script>setTimeout(()=>{const widget=document.querySelector('[data-widget-id]'); if(!widget?.textContent?.trim()){const message=document.createElement('p');message.style.padding='24px';message.textContent='${ar ? "تعذر عرض جدول 365Scores هنا. استخدم رابط فتح الجدول أعلاه أو اختر SportScore." : "365Scores has not displayed a schedule here. Use the Open schedule link above or select SportScore."}';document.body.appendChild(message);}},15000);</script></body></html>`;
}
export function ScheduleWidget({
  provider,
  ar,
}: {
  provider: WidgetProvider;
  ar: boolean;
}) {
  const [revision, setRevision] = useState(0);
  const [failed, setFailed] = useState(false);
  const is365 = provider === "365scores-widget";
  const name = is365 ? "365Scores" : "SportScore";
  const url = is365
    ? `https://www.365scores.com/${ar ? "ar" : "en-uk"}/football/league/saudi-league-649/matches`
    : "https://sportscore.com/football/competition/saudi-arabia/saudi-professional-league/j1l4rjnh66nm7vx/fixtures/";
  return (
    <div className={styles.form}>
      <div className={styles.notice}>
        <strong>
          {ar ? "جدول مباريات — مرجع بصري" : "Match schedule — visual reference"}
        </strong>
        <p>
          {ar
            ? "تصفّح المواعيد والنتائج. لإعداد مباراة للحجز، أضفها يدويًا من النموذج أسفل الجدول."
            : "Browse fixtures and results. To set up a bookable match, add it manually using the form below the schedule."}
        </p>
      </div>
      <div className={styles.row}>
        <a
          className={styles.button}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
        >
          {ar ? `فتح الجدول على ${name}` : `Open schedule on ${name}`}
        </a>
        <button
          type="button"
          onClick={() => {
            setFailed(false);
            setRevision((n) => n + 1);
          }}
        >
          {ar ? "إعادة تحميل الأداة" : "Reload widget"}
        </button>
      </div>
      <p className={styles.muted}>
        {is365
          ? ar
            ? "الدوري السعودي — المواعيد والنتائج من 365Scores."
            : "Saudi League — fixtures and results from 365Scores."
          : ar
            ? "الدوري السعودي — المباريات القادمة من SportScore. افتح الجدول الكامل لمزيد من المباريات. لغة الأداة وتوقيتها يخضعان لإعدادات المزود."
            : "Saudi League — upcoming matches from SportScore. Open the full schedule for more matches. Widget language and time zone follow the provider’s settings."}
      </p>
      <iframe
        key={`${provider}:${ar}:${revision}`}
        title={ar ? `جدول المباريات — ${name}` : `Match schedule — ${name}`}
        className={styles.widgetFrame}
        src={
          is365
            ? undefined
            : "https://sportscore.com/embed/fixtures/football/competition/saudi-professional-league/?theme=light"
        }
        srcDoc={is365 ? scores365Document(ar) : undefined}
        sandbox={
          is365
            ? "allow-scripts allow-popups"
            : "allow-scripts allow-same-origin allow-popups"
        }
        referrerPolicy="strict-origin-when-cross-origin"
        onError={() => setFailed(true)}
      />
      <p role={failed ? "alert" : undefined} className={styles.muted}>
        {ar
          ? "إذا لم يظهر الجدول أو حجبه المتصفح، استخدم رابط فتح الجدول أعلاه أو اختر المصدر الآخر."
          : "If the schedule is blank or blocked by your browser, use the Open schedule link above or choose the other source."}
      </p>
    </div>
  );
}
