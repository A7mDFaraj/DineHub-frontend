export interface TeamPreset {
  id: string;
  nameEn: string;
  nameAr: string;
  logo: string;
  leagueEn: string;
  leagueAr: string;
}

export interface MatchPreset {
  id: string;
  titleEn: string;
  titleAr: string;
  leagueEn: string;
  leagueAr: string;
  home: TeamPreset;
  away: TeamPreset;
}

// Complete 18 Saudi Pro League clubs with verified high-res logos
export const saudiLeagueTeams: TeamPreset[] = [
  {
    id: "al-hilal",
    nameEn: "Al-Hilal",
    nameAr: "الهلال",
    logo: "https://r2.thesportsdb.com/images/media/team/badge/w0b80d1661656916.png",
    leagueEn: "Saudi Pro League",
    leagueAr: "دوري روشن السعودي",
  },
  {
    id: "al-nassr",
    nameEn: "Al-Nassr",
    nameAr: "النصر",
    logo: "https://r2.thesportsdb.com/images/media/team/badge/84yvqi1748524565.png",
    leagueEn: "Saudi Pro League",
    leagueAr: "دوري روشن السعودي",
  },
  {
    id: "al-ittihad",
    nameEn: "Al-Ittihad",
    nameAr: "الاتحاد",
    logo: "https://r2.thesportsdb.com/images/media/team/badge/8n1t1j1755192418.png",
    leagueEn: "Saudi Pro League",
    leagueAr: "دوري روشن السعودي",
  },
  {
    id: "al-ahli",
    nameEn: "Al-Ahli",
    nameAr: "الأهلي",
    logo: "https://r2.thesportsdb.com/images/media/team/badge/1bbtgb1755192301.png",
    leagueEn: "Saudi Pro League",
    leagueAr: "دوري روشن السعودي",
  },
  {
    id: "al-shabab",
    nameEn: "Al-Shabab",
    nameAr: "الشباب",
    logo: "https://images.fotmob.com/image_resources/logo/teamlogo/10255.png",
    leagueEn: "Saudi Pro League",
    leagueAr: "دوري روشن السعودي",
  },
  {
    id: "al-ettifaq",
    nameEn: "Al-Ettifaq",
    nameAr: "الاتفاق",
    logo: "https://r2.thesportsdb.com/images/media/team/badge/m272h51694761970.png",
    leagueEn: "Saudi Pro League",
    leagueAr: "دوري روشن السعودي",
  },
  {
    id: "al-taawoun",
    nameEn: "Al-Taawoun",
    nameAr: "التعاون",
    logo: "https://r2.thesportsdb.com/images/media/team/badge/rlsmp91646835052.png",
    leagueEn: "Saudi Pro League",
    leagueAr: "دوري روشن السعودي",
  },
  {
    id: "al-qadsiah",
    nameEn: "Al-Qadsiah",
    nameAr: "القادسية",
    logo: "https://r2.thesportsdb.com/images/media/team/badge/ok63wb1719134839.png",
    leagueEn: "Saudi Pro League",
    leagueAr: "دوري روشن السعودي",
  },
  {
    id: "al-fateh",
    nameEn: "Al-Fateh",
    nameAr: "الفتح",
    logo: "https://r2.thesportsdb.com/images/media/team/badge/a5cjf41662659789.png",
    leagueEn: "Saudi Pro League",
    leagueAr: "دوري روشن السعودي",
  },
  {
    id: "al-fayha",
    nameEn: "Al-Fayha",
    nameAr: "الفيحاء",
    logo: "https://r2.thesportsdb.com/images/media/team/badge/jl3spp1677530565.png",
    leagueEn: "Saudi Pro League",
    leagueAr: "دوري روشن السعودي",
  },
  {
    id: "damac",
    nameEn: "Damac",
    nameAr: "ضمك",
    logo: "https://r2.thesportsdb.com/images/media/team/badge/z2l4w31677530963.png",
    leagueEn: "Saudi Pro League",
    leagueAr: "دوري روشن السعودي",
  },
  {
    id: "al-khaleej",
    nameEn: "Al-Khaleej",
    nameAr: "الخليج",
    logo: "https://r2.thesportsdb.com/images/media/team/badge/mvf6ga1755192630.png",
    leagueEn: "Saudi Pro League",
    leagueAr: "دوري روشن السعودي",
  },
  {
    id: "al-kholood",
    nameEn: "Al-Kholood",
    nameAr: "الخلود",
    logo: "https://r2.thesportsdb.com/images/media/team/badge/vv44v01755192851.png",
    leagueEn: "Saudi Pro League",
    leagueAr: "دوري روشن السعودي",
  },
  {
    id: "al-orobah",
    nameEn: "Al-Orobah",
    nameAr: "العروبة",
    logo: "https://r2.thesportsdb.com/images/media/team/badge/y1rnl91721742609.png",
    leagueEn: "Saudi Pro League",
    leagueAr: "دوري روشن السعودي",
  },
  {
    id: "al-okhdood",
    nameEn: "Al-Okhdood",
    nameAr: "الأخدود",
    logo: "https://r2.thesportsdb.com/images/media/team/badge/ub1l7h1755193155.png",
    leagueEn: "Saudi Pro League",
    leagueAr: "دوري روشن السعودي",
  },
  {
    id: "al-raed",
    nameEn: "Al-Raed",
    nameAr: "الرائد",
    logo: "https://r2.thesportsdb.com/images/media/team/badge/9vkdcc1677530862.png",
    leagueEn: "Saudi Pro League",
    leagueAr: "دوري روشن السعودي",
  },
  {
    id: "al-riyadh",
    nameEn: "Al-Riyadh",
    nameAr: "الرياض",
    logo: "https://r2.thesportsdb.com/images/media/team/badge/i4o0zy1755193321.png",
    leagueEn: "Saudi Pro League",
    leagueAr: "دوري روشن السعودي",
  },
  {
    id: "al-wehda",
    nameEn: "Al-Wehda",
    nameAr: "الوحدة",
    logo: "https://r2.thesportsdb.com/images/media/team/badge/j4nvuy1677530944.png",
    leagueEn: "Saudi Pro League",
    leagueAr: "دوري روشن السعودي",
  },
];

// Major international clubs for quick international matches
export const internationalTeams: TeamPreset[] = [
  {
    id: "real-madrid",
    nameEn: "Real Madrid",
    nameAr: "ريال مدريد",
    logo: "https://r2.thesportsdb.com/images/media/team/badge/8p25161748524673.png",
    leagueEn: "La Liga",
    leagueAr: "الدوري الإسباني",
  },
  {
    id: "barcelona",
    nameEn: "Barcelona",
    nameAr: "برشلونة",
    logo: "https://r2.thesportsdb.com/images/media/team/badge/vxkzt91748524785.png",
    leagueEn: "La Liga",
    leagueAr: "الدوري الإسباني",
  },
  {
    id: "liverpool",
    nameEn: "Liverpool",
    nameAr: "ليفربول",
    logo: "https://r2.thesportsdb.com/images/media/team/badge/uvxptx1448813372.png",
    leagueEn: "Premier League",
    leagueAr: "الدوري الإنجليزي",
  },
  {
    id: "man-city",
    nameEn: "Manchester City",
    nameAr: "مانشستر سيتي",
    logo: "https://r2.thesportsdb.com/images/media/team/badge/vwpvry1467462651.png",
    leagueEn: "Premier League",
    leagueAr: "الدوري الإنجليزي",
  },
  {
    id: "arsenal",
    nameEn: "Arsenal",
    nameAr: "أرسنال",
    logo: "https://r2.thesportsdb.com/images/media/team/badge/vrtrtp1448813175.png",
    leagueEn: "Premier League",
    leagueAr: "الدوري الإنجليزي",
  },
  {
    id: "bayern",
    nameEn: "Bayern Munich",
    nameAr: "بايرن ميونخ",
    logo: "https://r2.thesportsdb.com/images/media/team/badge/vspvtu1424888062.png",
    leagueEn: "Champions League",
    leagueAr: "دوري أبطال أوروبا",
  },
  {
    id: "psg",
    nameEn: "Paris Saint-Germain",
    nameAr: "باريس سان جيرمان",
    logo: "https://r2.thesportsdb.com/images/media/team/badge/rwqrvy1473504808.png",
    leagueEn: "Champions League",
    leagueAr: "دوري أبطال أوروبا",
  },
];

export const popularDerbies: MatchPreset[] = [
  {
    id: "derby-riyadh",
    titleEn: "Riyadh Derby",
    titleAr: "ديربي الرياض",
    leagueEn: "Saudi Pro League",
    leagueAr: "دوري روشن السعودي",
    home: saudiLeagueTeams[0], // Al-Hilal
    away: saudiLeagueTeams[1], // Al-Nassr
  },
  {
    id: "clasico-saudi",
    titleEn: "Saudi Clásico",
    titleAr: "كلاسيكو السعودية",
    leagueEn: "Saudi Pro League",
    leagueAr: "دوري روشن السعودي",
    home: saudiLeagueTeams[0], // Al-Hilal
    away: saudiLeagueTeams[2], // Al-Ittihad
  },
  {
    id: "derby-jeddah",
    titleEn: "Jeddah Derby",
    titleAr: "ديربي جدة",
    leagueEn: "Saudi Pro League",
    leagueAr: "دوري روشن السعودي",
    home: saudiLeagueTeams[2], // Al-Ittihad
    away: saudiLeagueTeams[3], // Al-Ahli
  },
  {
    id: "derby-sharqiyah",
    titleEn: "Eastern Derby",
    titleAr: "ديربي الشرقية",
    leagueEn: "Saudi Pro League",
    leagueAr: "دوري روشن السعودي",
    home: saudiLeagueTeams[5], // Al-Ettifaq
    away: saudiLeagueTeams[7], // Al-Qadsiah
  },
  {
    id: "clasico-el",
    titleEn: "El Clásico",
    titleAr: "كلاسيكو الأرض",
    leagueEn: "La Liga",
    leagueAr: "الدوري الإسباني",
    home: internationalTeams[0], // Real Madrid
    away: internationalTeams[1], // Barcelona
  },
  {
    id: "premier-clash",
    titleEn: "Premier League Summit",
    titleAr: "قمة البريميرليغ",
    leagueEn: "Premier League",
    leagueAr: "الدوري الإنجليزي الممتاز",
    home: internationalTeams[2], // Liverpool
    away: internationalTeams[3], // Man City
  },
];
