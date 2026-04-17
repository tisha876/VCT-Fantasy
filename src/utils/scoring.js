export const SCORING_CATEGORIES = [
  { category: "Combat", icon: "🎯", rules: [
    { key:"kill",       label:"Kill",         points: 3,   desc:"Per kill secured" },
    { key:"death",      label:"Death",        points: -1,  desc:"Per death (penalty)" },
    { key:"assist",     label:"Assist",       points: 1.5, desc:"Per assist" },
    { key:"firstBlood", label:"First Blood",  points: 2,   desc:"Per first blood" },
    { key:"clutch",     label:"Clutch (1vX)", points: 5,   desc:"Per clutch win" },
  ]},
  { category: "ACS Tiers", icon: "📊", rules: [
    { key:"acs200", label:"ACS 200+", points: 5,  desc:"Average combat score 200+ in series" },
    { key:"acs250", label:"ACS 250+", points: 10, desc:"Average combat score 250+ in series" },
    { key:"acs300", label:"ACS 300+", points: 20, desc:"Average combat score 300+ in series" },
  ]},
  { category: "Accuracy", icon: "💥", rules: [
    { key:"hs25", label:"HS% 25%+", points: 3, desc:"Headshot percentage tier 1" },
    { key:"hs35", label:"HS% 35%+", points: 6, desc:"Headshot percentage tier 2" },
  ]},
  { category: "Bonuses", icon: "⚡", rules: [
    { key:"top3acs", label:"Top 3 ACS",          points: 10, desc:"Top 3 ACS across all players in series" },
    { key:"potg",    label:"Player of the Game",  points: 25, desc:"Highest ACS in the entire series" },
    { key:"win",     label:"Match Win",           points: 10, desc:"Player's team wins the series" },
    { key:"flawless",label:"Flawless Map",        points: 15, desc:"Team wins a map 13-0" },
  ]},
];

// Flat object for legacy code
export const SCORING_RULES = {
  kill:3, death:-1, assist:1.5, firstBlood:2, clutch:5,
  acs_tier1:{threshold:200,points:5}, acs_tier2:{threshold:250,points:10}, acs_tier3:{threshold:300,points:20},
  potg:25, top3acs:10, matchWin:10, flawlessMap:15,
  hs_tier1:{threshold:25,points:3}, hs_tier2:{threshold:35,points:6},
};

export function calculatePoints(stats, isTop3ACS, isPOTG, wonMatch) {
  const kills    = parseInt(stats.kills)    || 0;
  const deaths   = parseInt(stats.deaths)   || 0;
  const assists  = parseInt(stats.assists)  || 0;
  const acs      = parseFloat(stats.acs)    || 0;
  const fk       = parseInt(stats.fk || stats.first_kills) || 0;
  const clutches = parseInt(stats.clutches || stats.cl)    || 0;
  const hs       = parseFloat(stats.hs || stats.headshot_pct) || 0;

  const bd = {
    kills:       kills    * 3,
    deaths:      deaths   * -1,
    assists:     assists  * 1.5,
    firstBloods: fk       * 2,
    clutches:    clutches * 5,
    acsTier: acs>=300?20 : acs>=250?10 : acs>=200?5 : 0,
    hsBonus: hs>=35?6   : hs>=25?3   : 0,
    top3acs: isTop3ACS ? 10 : 0,
    potg:    isPOTG    ? 25 : 0,
    win:     wonMatch  ? 10 : 0,
  };

  const total = Object.values(bd).reduce((a,b) => a+b, 0);
  return { total: Math.round(total*10)/10, breakdown: bd, stats: {kills,deaths,assists,acs,fk,clutches,hs} };
}

export function determineMatchBonuses(playerStats) {
  const sorted = [...playerStats].sort((a,b) => (parseFloat(b.acs)||0)-(parseFloat(a.acs)||0));
  const result = {};
  sorted.forEach((p,i) => { result[p.id||p.player] = { isPOTG: i===0, isTop3ACS: i<3 }; });
  return result;
}