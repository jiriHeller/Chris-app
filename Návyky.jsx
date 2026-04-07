import { useState, useEffect, useRef, useCallback } from "react"
// ─── FIREBASE REST SYNC ───────────────────────────────────────────────────────
// Uses Firebase REST API — no npm package needed, works everywhere
const FB_URL = "https://chris-e24cc-default-rtdb.europe-west1.firebasedatabase.app/navyky/chris.json";

const SYNC_KEYS = [
  "pk_done","pk_stars","pk_custody","child_name","child_birth",
  "admin_pin","pet_config","custom_activities",
];

function buildSyncPayload() {
  const data = {};
  SYNC_KEYS.forEach(k => { const v=localStorage.getItem(k); if(v!=null) data[k]=v; });
  for (let i=0;i<localStorage.length;i++) {
    const k=localStorage.key(i);
    if(k&&(k.startsWith("rating_")||k.startsWith("note_")||k.startsWith("food_log_")||
           k.startsWith("activities_done_")||k.startsWith("quiz_")||k.startsWith("fav_subj_")))
      data[k]=localStorage.getItem(k);
  }
  return data;
}

function applyPayload(data) {
  if(!data) return;
  Object.entries(data).forEach(([k,v])=>{ if(v!=null&&k!=="_updated") localStorage.setItem(k,v); });
}

async function syncToFirebase() {
  try {
    const payload={...buildSyncPayload(),_updated:Date.now()};
    await fetch(FB_URL,{method:"PATCH",body:JSON.stringify(payload),headers:{"Content-Type":"application/json"}});
  } catch(e){ console.warn("FB sync failed:",e); }
}

async function loadFromFirebase() {
  try {
    const res=await fetch(FB_URL);
    if(!res.ok) return false;
    const data=await res.json();
    if(data){ applyPayload(data); return true; }
  } catch(e){ console.warn("FB load failed:",e); }
  return false;
};

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const C = {
  blue:"#0A84FF", indigo:"#5E5CE6", purple:"#BF5AF2", pink:"#FF375F",
  red:"#FF453A", orange:"#FF9F0A", yellow:"#FFD60A", green:"#30D158",
  teal:"#40CBE0", mint:"#63E6E2",
  bg:"#F5F5F7", bg2:"#FFFFFF", card:"rgba(255,255,255,0.85)", sep:"rgba(60,60,67,0.10)",
  label:"#1D1D1F", label2:"rgba(60,60,67,0.55)", label3:"rgba(60,60,67,0.28)", label4:"rgba(60,60,67,0.14)",
  // gradient presets
  g1:`linear-gradient(145deg,#0A84FF,#5E5CE6)`,
  g2:`linear-gradient(145deg,#30D158,#40CBE0)`,
  g3:`linear-gradient(145deg,#BF5AF2,#FF375F)`,
  g4:`linear-gradient(145deg,#FF9F0A,#FF453A)`,
  g5:`linear-gradient(145deg,#FFD60A,#FF9F0A)`,
};


// ─── SVG ICONS ────────────────────────────────────────────────────────────────
function IcoHome({active,col}){return(<svg width="26" height="26" viewBox="0 0 26 26" fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11L13 3l10 8v11a1 1 0 01-1 1H15v-6h-4v6H4a1 1 0 01-1-1V11z" fill={active?col+"30":"none"}/></svg>);}
function IcoTarget({active,col}){return(<svg width="26" height="26" viewBox="0 0 26 26" fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="13" cy="13" r="9" fill={active?col+"20":"none"}/><circle cx="13" cy="13" r="5"/><circle cx="13" cy="13" r="1.5" fill={col} stroke="none"/></svg>);}
function IcoFork({active,col}){return(<svg width="26" height="26" viewBox="0 0 26 26" fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="9" y1="3" x2="9" y2="10"/><line x1="13" y1="3" x2="13" y2="10"/><path d="M9 10a4 4 0 004 4v9M17 3v23" strokeWidth="2.2"/></svg>);}
function IcoBook({active,col}){return(<svg width="26" height="26" viewBox="0 0 26 26" fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h8a4 4 0 014 4v13a3 3 0 00-3-3H4V4z" fill={active?col+"20":"none"}/><path d="M22 4h-6a4 4 0 00-4 4v13a3 3 0 013-3h7V4z" fill={active?col+"20":"none"}/></svg>);}
function IcoPerson({active,col}){return(<svg width="26" height="26" viewBox="0 0 26 26" fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="13" cy="9" r="4" fill={active?col+"30":"none"}/><path d="M5 22a8 8 0 0116 0"/></svg>);}
function IcoChart({active,col}){return(<svg width="26" height="26" viewBox="0 0 26 26" fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="14" width="4" height="9" rx="1.5" fill={active?col+"30":"none"}/><rect x="11" y="9" width="4" height="14" rx="1.5" fill={active?col+"30":"none"}/><rect x="19" y="4" width="4" height="19" rx="1.5" fill={active?col+"30":"none"}/></svg>);}
const NAV_ICONS = {home:IcoHome,target:IcoTarget,fork:IcoFork,book:IcoBook,person:IcoPerson,chart:IcoChart};

const DAYS_CZ   = ["Ne","Po","Út","St","Čt","Pá","So"];
const MONTHS_CZ = ["ledna","února","března","dubna","května","června","července","srpna","září","října","listopadu","prosince"];
const DAYS_FULL = ["Neděle","Pondělí","Úterý","Středa","Čtvrtek","Pátek","Sobota"];


// ─── SCHOOL TIMETABLE ─────────────────────────────────────────────────────────
const PERIODS = [
  {n:1, start:"8:00",  end:"8:45"},
  {n:2, start:"8:55",  end:"9:40"},
  {n:3, start:"10:00", end:"10:45"},
  {n:4, start:"10:55", end:"11:40"},
  {n:5, start:"11:50", end:"12:35"},
];
// dow: 1=Po,2=Út,3=St,4=Čt,5=Pá  — index matches period n-1
const TIMETABLE = {
  1: ["Čj","Ma","Čj","Tv","Tv"],      // Pondělí
  2: ["Čj","Ma","Pu","Čj",""],        // Úterý
  3: ["Čj","Ma","Čj","Ppr","Pu"],     // Středa
  4: ["Čj","Ma","Čj","Hv",""],        // Čtvrtek
  5: ["Čj","Ma","Pvýc","Vv",""],      // Pátek
};
// Returns grade-appropriate subject metadata
function getGradeFromBirth(){
  const bd=localStorage.getItem("child_birth")||"2018-05-10";
  if(!bd) return 3; // default 3rd grade
  const birth=new Date(bd);
  if(isNaN(birth)) return 3;
  // Czech school year: child starts 1st grade age 6, Sept 1
  const today=new Date();
  const schoolYearStart=new Date(today.getFullYear(),8,1); // Sept 1
  const refDate=today<schoolYearStart?new Date(today.getFullYear()-1,8,1):schoolYearStart;
  const startYear=birth.getFullYear()+(birth.getMonth()<8?6:7); // approx start year
  const grade=refDate.getFullYear()-startYear+1;
  return Math.max(1,Math.min(9,grade));
}

const SUBJECT_CONTENT = {
  "Čj":{label:"Český jazyk",color:"#0A84FF",emoji:"📖",
    grades:{"1-2":{desc:"Učíme se číst a psát — písmena, slabiky, první slova a pohádky.",
      tips:["Každé písmenko je klíč — čím víc jich máš, tím víc pohádek přečteš sám!","Zkus večer přečíst jeden řádek nahlas — mozek to miluje!","Písmena jsou puzzle — složíš je a vznikají slova a příběhy!","Spisovatel Čapek psal každý den — i pár vět stačí!"],
      pomucky:["📗 Slabikář","📓 Písanka","✏️ Tužka č. 2","🖍️ Pastelky"]},
    "3-5":{desc:"Čteme texty, pravopis, vyjmenovaná slova a stavbu věty.",
      tips:["Čím více čteš, tím bohatší slovní zásobu máš!","Vyjmenovaná slova se nejlépe naučíš rytmem — zkus je jako rap!","Diktát ti jde líp, když čteš nahlas.","Největší spisovatelé psali každý den — i pár vět stačí!"],
      pomucky:["📗 Učebnice ČJ","📓 Sešit","✏️ Pero","📏 Pravítko"]},
    "6-9":{desc:"Mluvnice, literatura a slohové útvary do hloubky.",
      tips:["Mluvnické rozbory jsou jako detektivní práce!","Čtení beletrie zlepšuje empatii — vědci to dokázali!","Dobré slohové práce mají začátek, střed a konec.","Jan Neruda psal fejetony — zkus napsat svůj!"],
      pomucky:["📗 Učebnice ČJ","📓 Sešit","✒️ Pero","📖 Čítanka"]}}},
  "Ma":{label:"Matematika",color:"#30D158",emoji:"🔢",
    grades:{"1-2":{desc:"Počítáme do 100! Sčítání, odčítání a geometrické tvary.",
      tips:["Čísla jsou všude — spočítej schody nebo auta na ulici!","Každý příklad je malá hádanka — ty jsi detektiv!","Matematika je jazyk vesmíru — hvězdy, planety, vše se spočítá!","Nakresli si příklady — mozek počítá lépe s obrázky!"],
      pomucky:["📘 Učebnice Ma","📓 Sešit čtvercový","✏️ Tužka","📐 Pravítko"]},
    "3-5":{desc:"Násobení, dělení, zlomky a slovní úlohy.",
      tips:["Násobilka jde nejlépe rytmem — zkus ji jako song!","Číslo nula bylo vynalezeno v Indii — bez nuly neexistují počítače!","Každý šachový velmistr je skvělý v matematice!","Archimedes přišel na objev ve vaně — matika tě napadne kdykoli!"],
      pomucky:["📘 Učebnice Ma","📓 Sešit","✏️ Tužka","📐 Pravítko","🧮 Kalkulačka"]},
    "6-9":{desc:"Algebra, rovnice, geometrie a procenta.",
      tips:["Rovnice jsou jako váhy — co děláš na jedné straně, udělej i na druhé!","Procenta jsou všude — slevy, úroky. Kdo umí procenta, ušetří peníze!","Geometrie se používá v architektuře i hrách.","Matematika rozvíjí logiku — hodí se v každém oboru!"],
      pomucky:["📘 Učebnice Ma","📓 Sešit","✏️ Tužka","📐 Kružítko","🧮 Kalkulačka"]}}},
  "Tv":{label:"Tělesná výchova",color:"#FF9F0A",emoji:"⚽",
    grades:{"1-2":{desc:"Pohybové hry, skákání, běh a základní cviky.",
      tips:["Každý pohyb posiluje srdce — srdce je sval!","Honičky jsou trénink rychlosti — bavíš se a sportuješ!","Po tělocviku se svaly opravují a rostou.","Bolt miloval jako dítě kriket — najdi svůj sport!"],
      pomucky:["👟 Cvičební obuv","👕 Tričko na TV","🩳 Tepláky","💧 Lahev s vodou"]},
    "3-5":{desc:"Atletika, míčové hry, plavání. Síla a obratnost.",
      tips:["Vždy se rozcvič — svaly potřebují zahřátí!","Sportovci spí 9 hodin — spánek je tajná zbraň!","Po cvičení sněz bílkoviny do 30 minut — svaly rostou!","Michael Jordan byl vyřazen ze školního týmu — nevzdal se!"],
      pomucky:["👟 Cvičební obuv","👕 Cvičební úbor","💧 Lahev s vodou"]},
    "6-9":{desc:"Sportovní hry, atletika a zdravotní TV.",
      tips:["Pravidelný sport zvyšuje dopamin — přírodní hormon štěstí!","Strečink po cvičení zkracuje regeneraci na polovinu!","Týmové sporty učí spolupráci — ceněné v každé práci!","Nikdy není pozdě začít sportovat!"],
      pomucky:["👟 Sportovní obuv","👕 Sportovní oblečení","💧 Lahev s vodou"]}}},
  "Pu":{label:"Prvouka",color:"#5E5CE6",emoji:"🌍",
    grades:{"1-2":{desc:"Poznáváme svět — rodinu, školu, roční období, přírodu a bezpečnost.",
      tips:["Stromy poznají roční dobu podle délky dne!","Na červenou stůj, na zelenou jdi — pravidla tě chrání!","Příroda v zimě jen šetří energii na jaro!","Každá rodina je jedinečná a důležitá!"],
      pomucky:["📗 Učebnice Prvouky","📓 Sešit","✏️ Pastelky"]},
    "3-5":{desc:"Přírodověda a Vlastivěda — příroda, zvířata, tělo a ČR.",
      tips:["Každou minutu vyhyne jeden živočišný druh — příroda potřebuje nás!","ČR leží přesně ve středu Evropy!","Češi vynalezli kontaktní čočky a lodní šroub!","Houby nejsou rostliny ani živočichové — jsou vlastním královstvím!"],
      pomucky:["📗 Učebnice","📓 Sešit","✏️ Pastelky"]},
    "6-9":{desc:"Přírodopis, zeměpis, fyzika, chemie — věda o světě.",
      tips:["Každý vědecký objev začal otázkou 'Proč?'!","Fyzika vysvětluje proč létají letadla i proč funguje internet.","Marie Curie měla dvě Nobelovy ceny!","Chemie je v jídle, lécích i v tobě!"],
      pomucky:["📗 Příslušná učebnice","📓 Sešit","🔬 Zvídavá mysl"]}}},
  "Ppr":{label:"Pracovní práce",color:"#FF375F",emoji:"🔨",
    grades:{"1-2":{desc:"Stříháme, lepíme, skládáme a tvoříme rukama.",
      tips:["Stříhání trénuje prsty — šikovné prsty pomáhají i při psaní!","Origami vzniklo v Japonsku před 1400 lety!","Výroba věcí rukama rozvíjí mozek!","Každý vynálezce nejdřív tvoří rukama!"],
      pomucky:["✂️ Nůžky","🖊️ Lepidlo","📐 Pravítko","🎨 Pastelky","Materiál dle zadání"]},
    "3-5":{desc:"Tvoříme z různých materiálů a učíme se řemeslné dovednosti.",
      tips:["Ruční práce rozvíjí mozek stejně jako matematika!","Da Vinci byl nejdřív řemeslník a pak umělec!","Origami se používá při vývoji raket NASA!","Modelování z hlíny snižuje stres!"],
      pomucky:["✂️ Nůžky","🖊️ Lepidlo","🎨 Barvy","Materiál dle zadání"]},
    "6-9":{desc:"Práce s materiály, elektronika a základy vaření.",
      tips:["Opravit věc doma ušetří tisíce korun ročně!","Vaření je chemie v kuchyni!","Steve Jobs se učil řemeslo v garáži!","Elektrické obvody jsou základ každého zařízení."],
      pomucky:["Dle zadání učitele 📋"]}}},
  "Hv":{label:"Hudební výchova",color:"#BF5AF2",emoji:"🎵",
    grades:{"1-2":{desc:"Zpíváme písničky, tleskáme rytmus a hrajeme na nástroje.",
      tips:["Zpívání uvolňuje endorfiny — přírodní látky štěstí!","Tlesk do rytmu trénuje koordinaci!","Mozart hrál na klavír od 3 let!","Hudba aktivuje více oblastí mozku než cokoliv jiného!"],
      pomucky:["📗 Zpěvník","✏️ Tužka"]},
    "3-5":{desc:"Vícehlasný zpěv, noty a hudební nástroje.",
      tips:["Noty jsou abeceda hudby — kdo je čte, zahraje cokoliv!","Beethoven skládal i jako hluchý!","Hudba aktivuje více oblastí mozku než cokoliv jiného!","Po zpěvu se cítíš lépe — to jsou endorfiny!"],
      pomucky:["📗 Zpěvník / učebnice Hv","✏️ Tužka","🎵 Nástroj dle pokynů"]},
    "6-9":{desc:"Hudební teorie, dějiny hudby a rozvoj vkusu.",
      tips:["Hudba změní náladu za 30 sekund!","Každý žánr vznikl z jiné kultury — hudba je cestování!","Hrát na nástroj rozvíjí obě poloviny mozku!","Nikdy není pozdě začít hrát na nástroj!"],
      pomucky:["📗 Učebnice Hv","✏️ Tužka","🎸 Nástroj dle pokynů"]}}},
  "Pvýc":{label:"Výtvarná výchova",color:"#FF6B35",emoji:"🎨",
    grades:{"1-2":{desc:"Kreslíme, malujeme a tvoříme co nás napadne.",
      tips:["Kreslení je sen na papíře — nakresli cokoliv!","Barvy mění náladu — namaluj jak se cítíš!","Picasso kreslil jako génius od 9 let!","Lidé malují na skály už 40 000 let!"],
      pomucky:["🎨 Vodové barvy","🖌️ Štětce","✏️ Pastelky","📄 Výkres","🖍️ Voskovky"]},
    "3-5":{desc:"Různé výtvarné techniky a poznávání umělců.",
      tips:["Picasso: 'Každé dítě je umělec.' Kresli každý den!","Van Gogh namaloval 900 obrazů — za života prodal jediný!","Nakreslená věc se pamatuje 4× lépe než z textu!","Barvy ovlivňují náladu!"],
      pomucky:["🎨 Barvy","🖌️ Štětce","✏️ Tužky","📄 Výkres","💧 Voda"]},
    "6-9":{desc:"Výtvarné techniky, dějiny umění a vlastní tvorba.",
      tips:["Každý velký umělec má nezaměnitelný styl — jaký bude tvůj?","Fotografie je také výtvarné umění!","Banksy je nejslavnější anonymní umělec světa!","Design je umění s praktickým účelem."],
      pomucky:["🎨 Dle techniky","🖌️ Štětce","📄 Výkres"]}}},
  "Vv":{label:"Vlastivěda",color:"#40CBE0",emoji:"🗺️",
    grades:{"1-2":{desc:"Poznáváme naši obec, přírodu a lidi kolem nás.",
      tips:["Každé město má svůj příběh — zjisti něco o svém!","Mapa je pohled ptáka shora!","ČR má přes 10 milionů obyvatel!","Každé místo je pro někoho domov!"],
      pomucky:["📗 Učebnice","📓 Sešit","✏️ Pastelky"]},
    "3-5":{desc:"Česká republika, její historie, kraje a mapa.",
      tips:["ČR leží přesně ve středu Evropy!","Karlův most stojí od roku 1402!","Češi vynalezli kontaktní čočky a lodní šroub!","Kompas ukazuje k magnetickému severnímu pólu!"],
      pomucky:["📗 Učebnice Vlastivědy","📓 Sešit","✏️ Pastelky","🗺️ Atlas"]},
    "6-9":{desc:"Zeměpis světa — fyzická a socioekonomická geografie.",
      tips:["Zeměpis vysvětluje proč jsou některé země bohaté!","Himaláje rostou každý rok o 4 mm — Země je živá!","Přes 4 miliardy lidí žije v Asii!","Podnebí formuje kulturu i způsob života!"],
      pomucky:["📗 Učebnice Zeměpisu","📓 Sešit","🗺️ Atlas světa"]}}}
};

// Get subject metadata for a specific grade
function getSubjectMeta(subj){
  const content=SUBJECT_CONTENT[subj];
  if(!content) return {label:subj,color:"#8E8E93",emoji:"📚",desc:"",tips:["Učíme se nové věci!"],pomucky:["📚 Učebnice","📓 Sešit","✏️ Tužka"]};
  const grade=getGradeFromBirth();
  const tier=grade<=2?"1-2":grade<=5?"3-5":"6-9";
  const g=content.grades[tier]||content.grades["3-5"]||content.grades["1-2"];
  return {...content, ...g};
}


// ─── DEFAULT ACTIVITIES (admin can edit) ──────────────────────────────────────
const DEFAULT_ACTIVITIES = [
  { id:"plavani",   name:"Plavání",        emoji:"🏊", xp:25, color:C.teal,   desc:"Aspoň 30 minut" },
  { id:"kolo",      name:"Jízda na kole",  emoji:"🚴", xp:20, color:C.green,  desc:"Venku nebo na trenažéru" },
  { id:"skakanidl", name:"Skákání přes švihadlo", emoji:"🪢", xp:15, color:C.pink,   desc:"100 skoků" },
  { id:"sach",      name:"Šachy",          emoji:"♟️", xp:20, color:C.indigo, desc:"Jedna hra" },
  { id:"kresba",    name:"Kreslení",       emoji:"🎨", xp:15, color:C.orange, desc:"Vlastní obrázek" },
  { id:"ps5",       name:"Hry na PS5",     emoji:"🕹️", xp:10, color:C.indigo, desc:"Jedna hodina hraní" },
  { id:"lego",      name:"Lego",           emoji:"🧱", xp:10, color:C.yellow, desc:"Stavba nečeho nového" },
  { id:"zahrada",   name:"Pomoc na zahradě",emoji:"🌱",xp:20, color:C.mint,   desc:"Zalévání nebo hrabání" },
  { id:"varani",    name:"Pomoc s vařením",emoji:"👨‍🍳",xp:20, color:C.red,    desc:"Pomáhání rodičům" },
  { id:"beh",       name:"Běh",            emoji:"🏃", xp:25, color:C.orange, desc:"Aspoň 15 minut" },
  { id:"tanec",     name:"Tanec",          emoji:"💃", xp:15, color:C.purple, desc:"Tancuj co chceš!" },
  { id:"hudba",     name:"Hra na nástroj", emoji:"🎸", xp:20, color:C.indigo, desc:"30 minut cvičení" },
  { id:"uklid",     name:"Úklid pokoje",   emoji:"🧹", xp:15, color:C.teal,   desc:"Uklid si celý pokoj" },
];

// ─── FIXED HABITS ─────────────────────────────────────────────────────────────
const BASE_HABITS = {
  morning: [
    { id:"ranniLeky",  label:"Ranní léky",  time:"Ráno",       emoji:"💊", color:C.red,    xp:10, notifyAt:"7:00"  },
    { id:"ranniZuby",  label:"Čistit zuby", time:"Po snídani", emoji:"🦷", color:C.blue,   xp:10, notifyAt:"7:15"  },
  ],
  weekdayAfternoon: [
    { id:"cviceni",    label:"Cvičení",     time:"Odpoledne",  emoji:"⚽", color:C.green,  xp:20, notifyAt:"16:00" },
  ],
  weekendMorning: [
    { id:"cviceni",    label:"Cvičení",     time:"Dopoledne",  emoji:"🏋️", color:C.green, xp:20, notifyAt:"10:00" },
  ],
  evening: [
    { id:"cteni",       label:"Čtení",       time:"Večer",       emoji:"📖", color:C.purple, xp:15, notifyAt:"19:00" },
    { id:"vecerniZuby", label:"Čistit zuby", time:"Před spaním", emoji:"🦷", color:C.blue,   xp:10, notifyAt:"20:30" },
    { id:"vecerniLeky", label:"Večerní léky",time:"Noc",         emoji:"💊", color:C.red,    xp:10, notifyAt:"20:45" },
  ],
  schoolPrep: [
    { id:"pripravaDoSkoly", label:"Příprava do školy", time:"Večer – na zítra", emoji:"🎒", color:C.orange, xp:15, notifyAt:"19:30" },
  ],
};

// Load custom notification times (admin can override defaults)
function getNotifyTimes() {
  try { return JSON.parse(localStorage.getItem("habit_notify_times")||"{}"); } catch { return {}; }
}
function getHabitNotifyTime(habit) {
  const custom = getNotifyTimes();
  return custom[habit.id] ?? habit.notifyAt ?? null;
}


// ─── FOOD FACTS & NUTRITION DATA ─────────────────────────────────────────────
const NUTRITION_FACTS = [
  {emoji:"💪",nutrient:"Bílkoviny",color:"#FF9F0A",superpower:"Budují svaly",
   fact:"Pokaždé když jíš kuřecí, vejce nebo fazole, dáváš svalům stavební materiál. Bez bílkovin nemůžeš být silný — sportovci to vědí!",
   foods:["🥩 Maso","🥚 Vejce","🫘 Fazole","🥛 Mléko","🐟 Ryby"]},
  {emoji:"🦴",nutrient:"Vápník",color:"#40CBE0",superpower:"Pevné kosti a zuby",
   fact:"Ve tvém věku rostou kosti nejrychleji! Vápník je cement který je dělá pevné. Pij mléko, jez sýr — za 10 let budeš mít kosti pevné jak ocel!",
   foods:["🥛 Mléko","🧀 Sýr","🥦 Brokolice","🐟 Sardinky","🫙 Jogurt"]},
  {emoji:"⚡",nutrient:"Železo",color:"#FF453A",superpower:"Energie a rychlost",
   fact:"Železo je baterie pro tělo — bez něj se cítíš unavený. Pomáhá krvi nosit kyslík do svalů. Fotbalisté mají hodně železa — proto mají tolik energie!",
   foods:["🥩 Červené maso","🫘 Čočka","🌿 Špenát","🥜 Ořechy","🥚 Vejce"]},
  {emoji:"🧠",nutrient:"Omega-3",color:"#5E5CE6",superpower:"Chytřejší mozek",
   fact:"Omega-3 jsou WiFi pro mozek — zlepšují přenos signálů. Děti co jedí ryby 2× týdně mají lepší paměť a učí se snáze!",
   foods:["🐟 Losos","🐟 Tuňák","🫐 Vlašské ořechy","🥚 Vejce","🌱 Lněné semínko"]},
  {emoji:"🌞",nutrient:"Vitamín D",color:"#FFD60A",superpower:"Silné kosti + dobrá nálada",
   fact:"Vitamín D se tvoří ze slunce! Pomáhá vápníku dostat se do kostí. Navíc zlepšuje náladu — proto se v létě cítíš tak skvěle!",
   foods:["☀️ Sluneční svit","🐟 Losos","🥚 Žloutek","🧈 Máslo","🍄 Houby"]},
  {emoji:"🛡️",nutrient:"Vitamín C",color:"#FF9F0A",superpower:"Silná imunita",
   fact:"Vitamín C je tvůj osobní bodyguard — bojuje s viry. Pomeranče a kiwi jsou plné tohoto superzbraně!",
   foods:["🍊 Pomeranč","🥝 Kiwi","🫑 Paprika","🍓 Jahody","🥦 Brokolice"]},
  {emoji:"🚀",nutrient:"Sacharidy",color:"#30D158",superpower:"Palivo pro mozek i svaly",
   fact:"Sacharidy jsou benzín pro mozek a svaly. Celozrnné pečivo uvolňuje energii pomalu — vydržíš se soustředit hodiny!",
   foods:["🍞 Celozrnný chléb","🍚 Rýže","🥣 Ovesná kaše","🍝 Těstoviny","🥔 Brambory"]},
  {emoji:"😌",nutrient:"Hořčík",color:"#40CBE0",superpower:"Relaxace svalů po sportu",
   fact:"Hořčík pomáhá svalům relaxovat a zlepšuje spánek. Tmavá čokoláda ho obsahuje — vědecký důvod proč ji jíst!",
   foods:["🍫 Tmavá čokoláda","🫘 Ořechy","🌻 Semínka","🍌 Banán","🥬 Špenát"]},
  {emoji:"👁️",nutrient:"Vitamín A",color:"#FF6B35",superpower:"Superzrak + zdravá kůže",
   fact:"Vitamín A dává očím superschopnost vidět za šera! Mrkev ho má plno — proto králíci tak dobře vidí!",
   foods:["🥕 Mrkev","🍠 Batáty","🌿 Špenát","🧀 Sýr","🥚 Vejce"]},
  {emoji:"🏃",nutrient:"Draslík",color:"#BF5AF2",superpower:"Rychlé svaly bez křečí",
   fact:"Draslík zabraňuje křečím ve svalech a pomáhá srdci. Tenisté jedí banány mezi sety přesně proto!",
   foods:["🍌 Banán","🥔 Brambory","🫘 Fazole","🥑 Avokádo","🍅 Rajče"]},
  {emoji:"💡",nutrient:"Vitamíny B",color:"#FFD60A",superpower:"Chytřejší a soustředěnější",
   fact:"Vitamíny B jsou výživa pro nervový systém a paměť. Ovesná kaše s mlékem dá mozku plnou sadu vitamínů B na dopoledne!",
   foods:["🥚 Vejce","🥛 Mléko","🥩 Maso","🥜 Luštěniny","🌾 Celozrnné"]},
  {emoji:"🫐",nutrient:"Antioxidanty",color:"#5E5CE6",superpower:"Ochrana buněk",
   fact:"Antioxidanty jsou štít pro tvoje buňky. Borůvky mají tolik, že je vědci nazývají superpotravinou!",
   foods:["🫐 Borůvky","🍇 Hroznové víno","🍓 Jahody","🍫 Tmavá čokoláda","🍵 Zelený čaj"]},
];


// Age-based meal tips
function getMealTipsForAge(birthDateStr){
  if(!birthDateStr) return null;
  const birth=new Date(birthDateStr);
  if(isNaN(birth)) return null;
  const age=Math.floor((new Date()-birth)/(365.25*24*3600*1000));
  if(age<6) return {group:"Předškolák",emoji:"🌱",color:"#30D158",tips:[
    {icon:"🦴",text:"Piješ mléko? Vápník dělá kůstky silné jako ocel!"},
    {icon:"🌈",text:"Dej si dnes co nejvíce barev na talíř — každá barva dává mozku jiný superjed!"},
    {icon:"💪",text:"Kuřecí nebo vajíčko = bílkoviny, které budují tvoje svaly!"},
    {icon:"💧",text:"Voda je lepší než džus — pomáhá ti myslet rychleji!"},
  ]};
  if(age<=10) return {group:"Školák",emoji:"📚",color:"#0A84FF",tips:[
    {icon:"🧠",text:"Snídaně = nabitý mozek na celé dopoledne! Ovesná kaše nebo vejce jsou ideální."},
    {icon:"🐟",text:"Ryba 2× týdně = omega-3 pro mozek. Lepší paměť a učení!"},
    {icon:"💪",text:"Ořechy jako svačina = bílkoviny a tuky na odpoledne bez hladu!"},
    {icon:"🦴",text:"Tvoje kosti teď rostou nejrychleji! Jogurt nebo sýr každý den!"},
    {icon:"🚀",text:"Celozrnný chléb místo bílého = energie na 4 hodiny místo jedné!"},
  ]};
  if(age<=14) return {group:"Dospívající",emoji:"🚀",color:"#BF5AF2",tips:[
    {icon:"💪",text:"Teď rostou svaly nejrychleji! Kuřecí po cvičení = bílkoviny, které je budují!"},
    {icon:"🦴",text:"V pubertě kosti rychle rostou — potřebuješ HODNĚ vápníku. 3 mléčné denně!"},
    {icon:"🧠",text:"Losos nebo tuňák 2× týdně = omega-3 pro mozek a lepší známky!"},
    {icon:"⚡",text:"Unavený? Možná ti chybí železo! Červené maso nebo čočka dodá energii."},
    {icon:"💧",text:"Při sportu pij každých 20 min — dehydratace zpomaluje mozek o 20 %!"},
  ]};
  return {group:"Teenager",emoji:"💪",color:"#FF9F0A",tips:[
    {icon:"🏋️",text:"Po tréninku máš 30 min na protein — kuřecí nebo mléko putují přímo do svalů!"},
    {icon:"🧠",text:"Omega-3 z ryb nebo vlašských ořechů = lepší soustředění ve škole!"},
    {icon:"😴",text:"Hořčík z tmavé čokolády pomáhá svalům relaxovat a zlepšuje spánek o 40 %!"},
    {icon:"🔥",text:"Pravidelné jídlo každé 3–4 hod udržuje metabolismus na maximum!"},
  ]};
}


// ─── PET SYSTEM ──────────────────────────────────────────────────────────────
const PET_TYPES=[
  {id:"dog",label:"Pes",emoji:"🐶",color:"#FF9F0A"},
  {id:"cat",label:"Kočka",emoji:"🐱",color:"#BF5AF2"},
  {id:"rabbit",label:"Králík",emoji:"🐰",color:"#FF375F"},
  {id:"bird",label:"Pták",emoji:"🐦",color:"#30D158"},
  {id:"fish",label:"Rybičky",emoji:"🐟",color:"#40CBE0"},
  {id:"hamster",label:"Křeček",emoji:"🐹",color:"#FFD60A"},
  {id:"turtle",label:"Želva",emoji:"🐢",color:"#5E5CE6"},
  {id:"guinea",label:"Morče",emoji:"🐾",color:"#FF9F0A"},
];
const BREEDS={
  dog:[
    {id:"chihuahua",label:"Chihuahua",size:"S",energy:"low",walks:2,walk_min:15,feeds:3,groom:"weekly",notes:"Nesnáší chlad — v zimě svetřík. Váží 1–3 kg ale srdce má velké!",care:["Zimní procházky krátké a se svetříkem","Přesné dávkování — náchylní k obezitě","Pravidelné čistění zoubků"]},
    {id:"yorkshire",label:"Yorkshire Terrier",size:"S",energy:"med",walks:2,walk_min:20,feeds:2,groom:"daily",notes:"Hedvábná srst vyžaduje denní péči. Inteligentní a temperamentní.",care:["Denní česání — bez péče srst zplstí","Koupel 1× za 3 týdny","Pravidelné čistění zubů"]},
    {id:"maltese",label:"Maltézský psík",size:"S",energy:"low",walks:2,walk_min:15,feeds:2,groom:"daily",notes:"Jemný a klidný společník. Sněhobílá srst vyžaduje každodenní péči.",care:["Denní česání bílé srsti","Čistění okolí očí každý den","Stříhání každých 6–8 týdnů"]},
    {id:"pomeranian",label:"Pomeranian",size:"S",energy:"med",walks:2,walk_min:20,feeds:2,groom:"3x_week",notes:"Husté srsti vyžadují pravidelné česání. Malý ale ví o sobě!",care:["Česat 3× týdně, v línání denně","Sklonný k nadváze — hlídej porce","Rád štěká — trénuj ticho"]},
    {id:"beagle",label:"Beagle",size:"M",energy:"high",walks:3,walk_min:30,feeds:2,groom:"weekly",notes:"Stopovací pes s úžasným čichem. Bez pohybu se nudí.",care:["3 procházky denně min. 30 min","Tendence k přejídání","Interaktivní hračky pro stimulaci"]},
    {id:"cocker",label:"Kokršpaněl",size:"M",energy:"med",walks:2,walk_min:30,feeds:2,groom:"3x_week",notes:"Přátelský a milující. Uši jsou slabé místo — kontrolovat týdně.",care:["Uši kontrolovat a čistit každý týden","Hedvábná srst — česat 3× týdně","Po vodě důkladně osušit uši"]},
    {id:"border_collie",label:"Border Collie",size:"M",energy:"extreme",walks:3,walk_min:45,feeds:2,groom:"3x_week",notes:"Nejinteligentnější pes! Bez práce ničí věci. 2–3 hod aktivity denně.",care:["2–3 hod aktivity denně — není pro pasivní rodiny","Agility, frisbee — sport je nutnost","Puzzle hračky a trénink triků"]},
    {id:"husky",label:"Sibiřský huský",size:"L",energy:"extreme",walks:3,walk_min:45,feeds:2,groom:"3x_week",notes:"Silný pud útěku — zahrada musí být bezpečná. Arktický pes.",care:["Oplocená zahrada — silný pud útěku","Línání 2× ročně — česat denně","Nepřehřívat v létě"]},
    {id:"labrador",label:"Labrador Retriever",size:"L",energy:"high",walks:3,walk_min:40,feeds:2,groom:"weekly",notes:"Nejoblíbenější rodinný pes. Největší riziko je obezita.",care:["Přesné dávkování — labradors se přejídají","Pravidelné procházky","Kontrolovat uši po koupání"]},
    {id:"golden",label:"Zlatý retriever",size:"L",energy:"high",walks:3,walk_min:40,feeds:2,groom:"3x_week",notes:"Přátelský a milující. Zlatá srst vyžaduje pravidelnou péči.",care:["Česat 3× týdně","3 procházky denně","Kontrolovat uši — sklon k zánětům"]},
    {id:"german_shep",label:"Německý ovčák",size:"L",energy:"high",walks:3,walk_min:45,feeds:2,groom:"3x_week",notes:"Inteligentní a loajální. Potřebuje konzistentní výcvik.",care:["Pravidelný výcvik — nutnost","Česat 3× týdně","Socializace od štěněte"]},
  ],
  cat:[
    {id:"domestic_sh",label:"Domácí krátkosrstá",size:"M",energy:"med",feeds:2,groom:"weekly",indoor:true,notes:"Nenáročná a přizpůsobivá. Potřebuje hračky a šplhadlo.",care:["Záchodek čistit denně","Hra 2× denně min. 15 min","Roční veterinář a očkování"]},
    {id:"persian",label:"Perská kočka",size:"M",energy:"low",feeds:2,groom:"daily",indoor:true,notes:"Hustá srst vyžaduje každodenní česání. Pozor na horko.",care:["Denní česání — nutnost","Čistění očního okolí každý den","Nesmí být ve vedru"]},
    {id:"maine_coon",label:"Maine Coon",size:"L",energy:"med",feeds:2,groom:"3x_week",indoor:true,notes:"Největší domácí kočka! Přátelská jako pes — tzv. psí kočka.",care:["Česat 3× týdně","Potřebuje prostor","Hravá i v dospělosti"]},
    {id:"siamese",label:"Siamská kočka",size:"M",energy:"high",feeds:2,groom:"weekly",indoor:true,notes:"Nejhlasitější kočka. Nesnáší samotu — neustále komunikuje.",care:["Nesnáší samotu — ideálně druhé zvíře","Velmi vokální","Puzzle hračky nutné"]},
    {id:"bengal",label:"Bengálská kočka",size:"M",energy:"high",feeds:2,groom:"weekly",indoor:false,notes:"Leopardí vzorování, energie závodního auta. Miluje výšky a vodu.",care:["Šplhadla a hračky — bez podnětů ničí nábytek","Velký byt nebo venkovní výběh","Fascinace vodou"]},
  ],
  rabbit:[
    {id:"dwarf",label:"Zakrslý králík",size:"S",energy:"med",feeds:2,groom:"weekly",notes:"Nejpopulárnější do bytu. Klec jen na spaní — denně výběh!",care:["Neomezeně čerstvé seno","Zelenina denně","Výběh min. 3–4 hod denně"]},
    {id:"lop",label:"Beluška (lop)",size:"M",energy:"low",feeds:2,groom:"3x_week",notes:"Klidná a přátelská. Převislé uši náchylné na infekce.",care:["Uši kontrolovat týdně","Česat 3× týdně","Ideálně ve dvojici"]},
  ],
  bird:[
    {id:"budgerigar",label:"Andulka vlnkovaná",size:"S",energy:"high",feeds:2,groom:"koupel",notes:"Nejoblíbenější ptáček! Naučí se mluvit a miluje společnost.",care:["Výlet z klece min. 2 hod denně","Čerstvé ovoce a zelenina","Ideálně ve dvojici"]},
    {id:"cockatiel",label:"Korela chocholatá",size:"M",energy:"med",feeds:2,groom:"koupel",notes:"Přátelský a kontaktní. Naučí se melodie a základní slova.",care:["Denní kontakt a hlazení","Různorodá strava","Výlet z klece denně"]},
    {id:"parrot",label:"Žako šedý",size:"L",energy:"med",feeds:2,groom:"weekly",notes:"Nejinteligentnější pták. Závazek na 50–60 let!",care:["3–4 hod interakce denně","Velká klec a hračky","Žije 60+ let"]},
  ],
  fish:[
    {id:"goldfish",label:"Zlatá rybka",size:"S",energy:"low",feeds:2,groom:"weekly",notes:"Potřebuje min. 80 litrů, filtraci a výměnu vody.",care:["Krmit 2× denně — jen co sní za 2 min","Výměna 20–30 % vody týdně","Teplota 18–22°C"]},
    {id:"betta",label:"Bojovnice pestrá",size:"S",energy:"med",feeds:1,groom:"weekly",notes:"Solitérní. Samci nesmí být spolu. Teplá voda 24–28°C.",care:["Krmit 1× denně","Výměna 25 % vody týdně","Nikdy dva samce dohromady"]},
    {id:"tropical",label:"Tropické rybky",size:"S",energy:"med",feeds:2,groom:"weekly",notes:"Komunita rybek — stabilní parametry a pravidelná údržba.",care:["Krmení 2× denně","Výměna 25–30 % vody týdně","Teplota 24–27°C"]},
  ],
  hamster:[
    {id:"syrian",label:"Křeček zlatý",size:"M",energy:"high",feeds:1,groom:"weekly",notes:"Noční zvíře — aktivní od večera. Kolo min. 28 cm.",care:["Krmit každý večer","Kolo min. 28 cm","Solitér — nikdy dva zlaté křečky"]},
    {id:"dwarf_hamster",label:"Přenesený/Roborovský",size:"S",energy:"high",feeds:1,groom:"weekly",notes:"Menší a rychlejší. Přenesené lze ve dvojici.",care:["Noční zvíře — nerušit přes den","Kolo min. 20 cm","Jemná manipulace"]},
  ],
  turtle:[
    {id:"red_ear",label:"Želva nádherná",size:"M",energy:"low",feeds:1,groom:"weekly",notes:"UV lampa a filtrace jsou nutností. Žije 30–40 let!",care:["UV lampa 10–12 hod denně","Teplota vody 24–26°C","Výměna 30 % vody týdně"]},
    {id:"tortoise",label:"Suchozemská želva",size:"M",energy:"low",feeds:1,groom:"weekly",notes:"Listová zelenina, UV lampa, letní výběh a zimní hibernace.",care:["Listová zelenina — ne ovoce","UV lampa 28–32°C","Zimní hibernace — konzultuj s vet."]},
  ],
  guinea:[
    {id:"guinea_pig",label:"Morče domácí",size:"M",energy:"med",feeds:2,groom:"weekly",notes:"Přátelské a komunikativní. Vždy chovat ve dvojici!",care:["Vždy ve dvojici — samota způsobuje deprese","Neomezené seno","Denně zelenina s vitamínem C"]},
  ],
};

function getPetHabits(pet){
  if(!pet||!pet.type||!pet.breed) return [];
  const n=pet.name||"Mazlíček";
  const his=pet.gender==="f"?"její":"jeho";
  const breed=(BREEDS[pet.type]||[]).find(b=>b.id===pet.breed)||null;
  const type=pet.type;
  const h=(id,label,time,emoji,color,xp)=>({id:`pet_${id}`,label,time,emoji,color,xp});
  const morning=[],afternoon=[],evening=[];
  if(type==="dog"){
    const feeds=breed?.feeds||2,walkMin=breed?.walk_min||30,walks=breed?.walks||2;
    morning.push(h("feed_m",`Nakrmit ${n} — ráno`,"Ráno","🍖","#FF9F0A",10));
    morning.push(h("water",`Doplnit čerstvou vodu pro ${n}`,"Ráno","💧","#0A84FF",5));
    morning.push(h("walk_m",`Venčit ${n} — ráno (${walkMin} min)`,"Ráno","🦮","#30D158",15));
    if(walks>=3) afternoon.push(h("walk_d",`Venčit ${n} — polední procházka`,"Odpoledne","🦮","#30D158",10));
    afternoon.push(h("play",`Hra a pohyb s ${n}`,"Odpoledne","🎾","#FF375F",10));
    if(breed?.groom==="daily"||breed?.groom==="3x_week") afternoon.push(h("groom",`Česat srst ${n}`,"Odpoledne","🪮","#BF5AF2",10));
    if(feeds>=2) evening.push(h("feed_e",`Nakrmit ${n} — večer`,"Večer","🍖","#FF9F0A",10));
    evening.push(h("walk_e",`Venčit ${n} — večerní procházka`,"Večer","🌙","#5E5CE6",15));
    evening.push(h("check",`Zkontrolovat uši, drápky a srst ${n}`,"Večer","🔍","#FFD60A",5));
  } else if(type==="cat"){
    morning.push(h("feed_m",`Nakrmit ${n} — ráno`,"Ráno","🐟","#BF5AF2",10));
    morning.push(h("water","Doplnit čerstvou vodu","Ráno","💧","#0A84FF",5));
    morning.push(h("litter",`Vyčistit záchodek ${n}`,"Ráno","🧹","#FF453A",15));
    afternoon.push(h("play",`Interaktivní hra s ${n} (15 min)`,"Odpoledne","🧶","#FF9F0A",10));
    if(breed?.groom==="daily"||breed?.groom==="3x_week") afternoon.push(h("groom",`Česat srst ${n}`,"Odpoledne","🪮","#BF5AF2",10));
    evening.push(h("feed_e",`Nakrmit ${n} — večer`,"Večer","🐟","#BF5AF2",10));
    evening.push(h("play2",`Večerní hra s ${n}`,"Večer","🌙","#5E5CE6",10));
  } else if(type==="rabbit"||type==="guinea"){
    morning.push(h("hay",`Doplnit seno pro ${n}`,"Ráno","🌾","#FFD60A",5));
    morning.push(h("feed_m",`Ranní zelenina pro ${n}`,"Ráno","🥕","#FF375F",10));
    morning.push(h("water","Vyčistit a doplnit vodu","Ráno","💧","#0A84FF",5));
    afternoon.push(h("out",`Výběh ${n} mimo klec (min. 1 hod)`,"Odpoledne","🐇","#FF375F",15));
    afternoon.push(h("play",`Mazlení a socializace s ${n}`,"Odpoledne","❤️","#FF375F",10));
    evening.push(h("cage",`Uklidit klec a doplnit seno`,"Večer","🧹","#FF453A",15));
    evening.push(h("feed_e",`Večerní granule pro ${n}`,"Večer","🥬","#30D158",10));
  } else if(type==="bird"){
    morning.push(h("cover","Sundat přehoz z klece","Ráno","☀️","#FFD60A",5));
    morning.push(h("feed_m",`Ranní krmení ${n}`,"Ráno","🌾","#30D158",10));
    morning.push(h("water","Vyměnit vodu v napájedle","Ráno","💧","#0A84FF",5));
    afternoon.push(h("out",`Výlet ${n} z klece (min. 1 hod)`,"Odpoledne","🦜","#30D158",15));
    afternoon.push(h("play",`Interakce s ${n}`,"Odpoledne","🗣️","#BF5AF2",10));
    evening.push(h("cage","Vyčistit dno klece","Večer","🧹","#FF453A",10));
    evening.push(h("cover2","Přikrýt klec přerozem na noc","Před spaním","🌙","#5E5CE6",5));
  } else if(type==="fish"){
    morning.push(h("feed_m","Nakrmit rybičky — ráno","Ráno","🐠","#40CBE0",5));
    morning.push(h("check","Zkontrolovat filtr a teplotu","Ráno","🔍","#5E5CE6",5));
    evening.push(h("feed_e","Nakrmit rybičky — večer","Večer","🐠","#40CBE0",5));
  } else if(type==="hamster"){
    evening.push(h("feed",`Nakrmit ${n} — večerní krmení`,"Večer","🌻","#FFD60A",10));
    evening.push(h("water","Zkontrolovat a doplnit vodu","Večer","💧","#0A84FF",5));
    evening.push(h("play",`Čas s ${n} — výběh nebo ruka`,"Večer","🐹","#FFD60A",10));
    evening.push(h("cage","Částečný úklid klece","Večer","🧹","#FF453A",10));
  } else if(type==="turtle"){
    morning.push(h("lamp",`Zapnout UV lampu pro ${n}`,"Ráno","💡","#FFD60A",5));
    morning.push(h("feed",`Nakrmit ${n}`,"Ráno","🥬","#5E5CE6",10));
    morning.push(h("water","Zkontrolovat vodu a filtr","Ráno","💧","#0A84FF",5));
    afternoon.push(h("play",`Pozorování a kontakt s ${n}`,"Odpoledne","🐢","#30D158",10));
    evening.push(h("lamp_off","Vypnout UV lampu","Večer","🌙","#5E5CE6",5));
  }
  return [...morning,...afternoon,...evening];
}

function loadPet(){
  try{return JSON.parse(localStorage.getItem("pet_config")||"null");}catch{return null;}
}

// ─── QUIZ DATA ────────────────────────────────────────────────────────────────
const QUIZ_QUESTIONS = [
  {q:"Která planeta je největší v naší sluneční soustavě?",answers:["Mars","Jupiter","Saturn","Neptun"],correct:1,emoji:"🪐",fun:"Jupiter je tak velký, že by se do něj vešlo 1300 Zemí!"},
  {q:"Kolik kostí má lidské tělo?",answers:["106","206","306","406"],correct:1,emoji:"🦴",fun:"Děti mají 270 kostí, ale jak rostou, srůstají na 206!"},
  {q:"Jak se jmenuje nejdelší řeka na světě?",answers:["Amazonka","Nil","Mississippi","Jang-c'-ťiang"],correct:1,emoji:"🌊",fun:"Nil měří přes 6 600 km — to je jako 80× délka České republiky!"},
  {q:"Co dělá fotosyntéza?",answers:["Tráví jídlo","Přeměňuje světlo na cukr","Čistí vzduch","Pohání srdce"],correct:1,emoji:"🌿",fun:"Bez fotosyntézy by na Zemi nebylo žádné jídlo ani kyslík!"},
  {q:"Kolik smyslů má člověk?",answers:["3","5","7","9"],correct:1,emoji:"👁️",fun:"Vědci dnes počítají víc než 20 smyslů včetně rovnováhy a pocitu bolesti!"},
  {q:"Z čeho se skládá voda?",answers:["Uhlík + kyslík","Vodík + kyslík","Dusík + vodík","Síra + kyslík"],correct:1,emoji:"💧",fun:"Jedna kapka vody obsahuje stovky miliard molekul H₂O!"},
  {q:"Jak rychle cestuje světlo?",answers:["100 000 km/s","300 000 km/s","500 000 km/s","1 000 000 km/s"],correct:1,emoji:"⚡",fun:"Světlo oběhne Zemi 7× za jednu sekundu!"},
  {q:"Která zvíře je nejrychlejší na zemi?",answers:["Lev","Gepard","Kůň","Orel"],correct:1,emoji:"🐆",fun:"Gepard dosáhne 100 km/h za pouhé 3 sekundy — rychleji než formule 1!"},
  {q:"Kolik let trvá jeden rok na Plutu?",answers:["12 pozemských let","84 pozemských let","248 pozemských let","365 pozemských let"],correct:2,emoji:"🌌",fun:"Na Plutu bys ještě ani nenarozeniny neslavil — rok tam trvá 248 pozemských let!"},
  {q:"Co je nejmenší jednotka života?",answers:["Atom","Molekula","Buňka","Organela"],correct:2,emoji:"🔬",fun:"Lidské tělo má přibližně 37 bilionů buněk — každá vykonává stovky úkolů!"},
  {q:"Kde se v těle tvoří červené krvinky?",answers:["V srdci","V játrech","V kostech","V plicích"],correct:2,emoji:"🩸",fun:"Kostní dřeň vytvoří 2 miliony červených krvinek za každou sekundu!"},
  {q:"Jak se jmenuje nejvyšší hora světa?",answers:["K2","Mont Blanc","Kilimandžáro","Everest"],correct:3,emoji:"🏔️",fun:"Everest roste každý rok o 4 mm — protože se himalájské desky stále pohybují!"},
  {q:"Co je DNA?",answers:["Druh proteinu","Typ vitamínu","Nosič genetické informace","Část mozku"],correct:2,emoji:"🧬",fun:"Kdyby ses rozmotala celá DNA z jedné buňky, měřila by 2 metry. V těle je jí dohromady přes 60 miliard km!"},
  {q:"Kolik procent vody tvoří lidské tělo?",answers:["40 %","60 %","80 %","90 %"],correct:1,emoji:"💦",fun:"Mozek je tvořen z 75 % vodou — proto je pití vody tak důležité pro soustředění!"},
  {q:"Který plyn dýcháme nejvíce?",answers:["Kyslík","Oxid uhličitý","Dusík","Argon"],correct:2,emoji:"💨",fun:"Vzduch tvoří ze 78 % dusík — kyslíku je jen 21 %, ale ten je ten důležitý!"},
];
// ─── DAILY SCORE HELPERS ─────────────────────────────────────────────────────
function getDailyXP(dateKey) {
  // b from habits
  const doneMap = (() => { try { return JSON.parse(localStorage.getItem("pk_done") || "{}"); } catch { return {}; } })();
  const acts    = (() => { try { const s = localStorage.getItem(ACTIVITIES_KEY); return s ? JSON.parse(s) : DEFAULT_ACTIVITIES; } catch { return DEFAULT_ACTIVITIES; } })();
  const date    = (() => { const [y,m,d] = dateKey.split("-"); return new Date(+y, +m, +d); })();
  const habits  = getHabits(date);
  const dn      = doneMap[dateKey] || {};
  const habitXP = habits.filter(h => dn[h.id]).reduce((s,h) => s + h.xp, 0);
  // b from activities
  const actDone = (() => { try { return JSON.parse(localStorage.getItem(`activities_done_${dateKey}`) || "[]"); } catch { return []; } })();
  const actXP   = actDone.reduce((s, id) => { const a = acts.find(x => x.id === id); return s + (a?.xp || 0); }, 0);
  return habitXP + actXP;
}

function getAllDailyScores() {
  // Scan last 90 days
  const scores = [];
  for (let i = 0; i < 90; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const k = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const xp = getDailyXP(k);
    if (xp > 0) scores.push({ key: k, xp, date: d });
  }
  return scores;
}

function getDailyRecord() {
  const scores = getAllDailyScores();
  return scores.reduce((max, s) => s.xp > max ? s.xp : max, 0);
}

function getStreak() {
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const k = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (getDailyXP(k) > 0) streak++;
    else if (i > 0) break; // today might be 0 still
  }
  return streak;
}

function getHabits(date) {
  const dow=date.getDay(), isWE=dow===0||dow===6, hasSchoolTomorrow=dow>=0&&dow<=4;
  let list=[...BASE_HABITS.morning];
  if(!isWE) list=[...list,...BASE_HABITS.weekdayAfternoon];
  if(isWE)  list=[...list,...BASE_HABITS.weekendMorning];
  list=[...list,...BASE_HABITS.evening];
  if(hasSchoolTomorrow) list=[...list,...BASE_HABITS.schoolPrep];
  const pet=loadPet();
  if(pet) list=[...list,...getPetHabits(pet)];
  return list;
}

const WORDS=[
  {word:"Ambice",pos:"podst. jméno",def:"Silná touha dosáhnout něčeho velkého.",example:"Měl velkou ambici stát se astronautem.",fun:"🚀 Bez ambice by Neil Armstrong zůstal doma!"},
  {word:"Gravitace",pos:"podst. jméno",def:"Síla, která přitahuje věci k zemi.",example:"Gravitace drží Měsíc u Země.",fun:"🍎 Newton přišel na gravitaci díky padajícímu jablku!"},
  {word:"Evoluce",pos:"podst. jméno",def:"Pomalá přeměna živočichů po tisíce let.",example:"Evoluce přeměnila dinosaury v ptáky.",fun:"🐦 Slepice je nejbližší žijící příbuzná T-Rexe!"},
  {word:"Strategie",pos:"podst. jméno",def:"Chytrý plán jak dosáhnout cíle krok za krokem.",example:"Dobrá strategie pomáhá vyhrát šachy.",fun:"♟️ Nejlepší šachisté myslí 10 tahů dopředu!"},
  {word:"Metamorfóza",pos:"podst. jméno",def:"Úžasná přeměna – jako housenka v motýla.",example:"Metamorfóza motýla trvá asi 2 týdny.",fun:"🦋 Uvnitř kukly se housenka doslova rozpustí a znovu sestaví!"},
  {word:"Konstelace",pos:"podst. jméno",def:"Skupina hvězd tvořící obrazec na obloze.",example:"Orion je nejznámější konstelace.",fun:"⭐ Starověcí námořníci cestovali pouze podle konstelací!"},
  {word:"Bioluminiscence",pos:"podst. jméno",def:"Schopnost živočichů svítit vlastním světlem.",example:"Světlušky využívají bioluminiscenci.",fun:"🌊 Tvorové v hloubce 1 km svítí sami od sebe!"},
  {word:"Akcelerace",pos:"podst. jméno",def:"Zrychlování pohybu.",example:"Formule 1 má obrovskou akceleraci.",fun:"🏎️ Formule 1 zrychlí na 100 km/h za 2 sekundy!"},
  {word:"Navigace",pos:"podst. jméno",def:"Hledání správné cesty z místa A na místo B.",example:"GPS nám pomáhá najít cestu.",fun:"🧭 Vikingové navigovali podle hvězd bez přístroje!"},
  {word:"Hypotéza",pos:"podst. jméno",def:"Chytrý odhad, který chceme ověřit pokusem.",example:"Vědci mají hypotézu o životě na Marsu.",fun:"🔴 NASA stále hledá důkazy, zda byl Mars obydlený!"},
  {word:"Fosílie",pos:"podst. jméno",def:"Zkamenělé zbytky dávných tvorů v hornině.",example:"Fosílie dinosaurů jsou staré miliony let.",fun:"🦕 Nejstarší fosílie – bakterie staré 3,5 mld. let!"},
  {word:"Magnetismus",pos:"podst. jméno",def:"Síla magnetu přitahující kovové věci.",example:"Magnetismus drží magnety na lednici.",fun:"🧲 Zemský magnetismus chrání nás před slunečním větrem!"},
  {word:"Odhodlání",pos:"podst. jméno",def:"Silné rozhodnutí nevzdat se a pokračovat.",example:"S odhodláním se dá naučit cokoliv.",fun:"💡 Edison vyzkoušel 10 000 způsobů, než vynalezl žárovku!"},
  {word:"Perspektiva",pos:"podst. jméno",def:"Způsob pohledu na věci z různých úhlů.",example:"Z letadla má město jinou perspektivu.",fun:"✈️ Z vesmíru naše galaxie vypadá jako malá tečka!"},
  {word:"Taktika",pos:"podst. jméno",def:"Chytrý plán pro konkrétní situaci.",example:"Fotbalisté mění taktiku podle soupeře.",fun:"⚽ Barcelonská tiki-taka změnila světový fotbal!"},
];

const FACTS=[
  {text:"Chobotnice mají 3 srdce, 9 mozků a jejich krev je modrá!",icon:"🐙"},
  {text:"Slunce je tak velké, že by se do něj vešlo 1 300 000 planet Zem!",icon:"☀️"},
  {text:"Mravenci mohou unést věc 50× těžší než oni sami!",icon:"🐜"},
  {text:"Nejrychlejší zvíře světa je sokol stěhovavý – letí přes 390 km/h!",icon:"🦅"},
  {text:"Lidský mozek má víc spojení než hvězd v celé Mléčné dráze!",icon:"🧠"},
  {text:"Med nikdy nezkysne – jedlý med našli v hrobkách starých 3 000 let!",icon:"🍯"},
  {text:"Kosmonauti jsou ve vesmíru o 2 cm vyšší, protože páteř se natáhne!",icon:"🚀"},
  {text:"Ptáci jsou přímí potomci dinosaurů – slepice je nejbližší příbuzná T-Rexe!",icon:"🦕"},
];

const DRINK_OPTIONS=[
  {id:"water",label:"Voda",emoji:"💧",ml:200},
  {id:"juice",label:"Džus",emoji:"🧃",ml:200},
  {id:"milk", label:"Mléko",emoji:"🥛",ml:200},
  {id:"tea",  label:"Čaj", emoji:"🍵",ml:250},
  {id:"cocoa",label:"Kakao",emoji:"🍫",ml:200},
  {id:"other",label:"Jiné",emoji:"🥤",ml:200},
];

const EMOJI_OPTS=["⚽","🏀","🎾","🏊","🚴","🛹","🎸","🎨","🧩","♟️","🪢","🌱","👨‍🍳","🧹","📚","🎭","🤸","🏃","💃","🎯","🥊","🎮","🏋️","🌿","🦮","🎪","🧪","🔭","🪄","🎲"];

function getTodayKey(){const d=new Date();return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;}
function getDayIndex(){const n=new Date();return Math.floor((n-new Date(n.getFullYear(),0,0))/86400000);}
function isWeekend(d){return d.getDay()===0||d.getDay()===6;}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2);}

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────
function Card({children,style={},pad="16px 20px"}){
  return <div style={{background:C.bg2,borderRadius:26,padding:pad,boxShadow:"0 1px 0 rgba(255,255,255,0.8) inset, 0 4px 24px rgba(0,0,0,0.06)",overflow:"hidden",...style}}>{children}</div>;
}
function SectionLabel({children}){
  return <div style={{fontSize:12,fontWeight:600,color:C.label3,textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:10,paddingLeft:6}}>{children}</div>;
}
function Pill({label,color=C.blue,small=false}){
  return <span style={{display:"inline-flex",alignItems:"center",background:color+"18",color,borderRadius:20,padding:small?"2px 8px":"3px 10px",fontSize:small?11:12,fontWeight:600}}>{label}</span>;
}
function ProfilePic({src,onUpload,size=64}){
  const ref=useRef();
  const handleFile=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>{localStorage.setItem("profile_pic",ev.target.result);onUpload(ev.target.result);};r.readAsDataURL(f);};
  return(
    <div style={{position:"relative",cursor:"pointer",flexShrink:0}} onClick={()=>ref.current.click()}>
      <input ref={ref} type="file" accept="image/*" style={{display:"none"}} onChange={handleFile}/>
      <div style={{width:size,height:size,borderRadius:size/2.4,background:`linear-gradient(135deg,${C.blue},${C.indigo})`,overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.45,boxShadow:"0 4px 14px rgba(0,0,0,0.12)"}}>
        {src?<img src={src} style={{width:"100%",height:"100%",objectFit:"cover"}} alt=""/>:"🎮"}
      </div>
      <div style={{position:"absolute",bottom:-2,right:-2,width:22,height:22,borderRadius:11,background:C.blue,border:"3px solid white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10}}>📷</div>
    </div>
  );
}


// ─── NOTIFY TIMES EDITOR ─────────────────────────────────────────────────────
function NotifyTimesEditor(){
  const allHabits=[
    ...BASE_HABITS.morning,
    ...BASE_HABITS.weekdayAfternoon,
    ...BASE_HABITS.evening,
    ...BASE_HABITS.schoolPrep,
  ];
  // deduplicate by id
  const seen=new Set();
  const habits=allHabits.filter(h=>{ if(seen.has(h.id)) return false; seen.add(h.id); return true; });

  const [times,setTimes]=useState(()=>getNotifyTimes());
  const [saved,setSaved]=useState(false);

  const update=(id,val)=>{
    const nt={...times,[id]:val};
    setTimes(nt);
    localStorage.setItem("habit_notify_times",JSON.stringify(nt));
    setSaved(true);
    setTimeout(()=>setSaved(false),1500);
  };

  return(
    <Card pad="0">
      {saved&&<div style={{background:C.green+"18",padding:"8px 16px",fontSize:13,fontWeight:600,color:C.green,textAlign:"center"}}>✓ Uloženo</div>}
      {habits.map((h,i)=>{
        const t=times[h.id]??h.notifyAt??"";
        return(
          <div key={h.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderBottom:i<habits.length-1?`1px solid ${C.sep}`:"none"}}>
            <span style={{fontSize:20,flexShrink:0}}>{h.emoji}</span>
            <div style={{flex:1,fontSize:14,fontWeight:500,color:C.label}}>{h.label}</div>
            <input
              type="time"
              value={t}
              onChange={e=>update(h.id,e.target.value)}
              style={{width:90,height:36,borderRadius:10,border:`1.5px solid ${C.sep}`,padding:"0 8px",fontSize:14,color:C.label,outline:"none",fontFamily:"inherit",background:"white"}}
            />
          </div>
        );
      })}
    </Card>
  );
}

// ─── ADMIN PANEL ──────────────────────────────────────────────────────────────
const ADMIN_PIN_KEY  = "admin_pin";
const ACTIVITIES_KEY = "custom_activities";
const DEFAULT_PIN    = "1234";

function AdminPanel({onClose}){
  const [activities,setActivities]=useState(()=>{try{const s=localStorage.getItem(ACTIVITIES_KEY);return s?JSON.parse(s):DEFAULT_ACTIVITIES;}catch{return DEFAULT_ACTIVITIES;}});
  const [editing,setEditing]=useState(null); // null | 'new' | activity object
  const [form,setForm]=useState({name:"",emoji:"⚽",xp:15,color:C.blue,desc:""});
  const [showEmojiPicker,setShowEmojiPicker]=useState(false);
  const [pin,setPin]=useState(()=>localStorage.getItem(ADMIN_PIN_KEY)||DEFAULT_PIN);
  const [newPin,setNewPin]=useState("");
  const [pinSaved,setPinSaved]=useState(false);

  const save=(list)=>{setActivities(list);localStorage.setItem(ACTIVITIES_KEY,JSON.stringify(list));};

  const startNew=()=>{setForm({name:"",emoji:"⚽",xp:15,color:C.blue,desc:""});setEditing("new");setShowEmojiPicker(false);};
  const startEdit=(a)=>{setForm({name:a.name,emoji:a.emoji,xp:a.xp,color:a.color,desc:a.desc||""});setEditing(a);setShowEmojiPicker(false);};

  const saveActivity=()=>{
    if(!form.name.trim())return;
    if(editing==="new"){
      save([...activities,{id:uid(),...form,xp:parseInt(form.xp)||10}]);
    } else {
      save(activities.map(a=>a.id===editing.id?{...a,...form,xp:parseInt(form.xp)||10}:a));
    }
    setEditing(null);
  };

  const deleteActivity=(id)=>{if(window.confirm("Smazat aktivitu?"))save(activities.filter(a=>a.id!==id));};
  const toggleActive=(id)=>save(activities.map(a=>a.id===id?{...a,disabled:!a.disabled}:a));

  const savePin=()=>{if(newPin.length===4&&/^\d+$/.test(newPin)){localStorage.setItem(ADMIN_PIN_KEY,newPin);setPin(newPin);setNewPin("");setPinSaved(true);setTimeout(()=>setPinSaved(false),2000);}};

  const COLOR_OPTS=[C.blue,C.indigo,C.purple,C.pink,C.red,C.orange,C.yellow,C.green,C.teal,C.mint];

  return(
    <div style={{position:"fixed",inset:0,zIndex:9000,background:"rgba(0,0,0,0.55)",backdropFilter:"blur(10px)",display:"flex",flexDirection:"column",alignItems:"stretch"}}>
      <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column"}}>
        {/* Header */}
        <div style={{background:C.g3,padding:"52px 20px 20px",position:"sticky",top:0,zIndex:10}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div>
              <div style={{fontSize:13,color:"rgba(255,255,255,0.65)",fontWeight:600,marginBottom:4}}>ADMINISTRACE</div>
              <div style={{fontSize:24,fontWeight:700,color:"white",letterSpacing:"-0.5px"}}>🔧 Správa aktivit</div>
            </div>
            <button onClick={onClose} style={{background:"rgba(255,255,255,0.2)",border:"none",borderRadius:12,padding:"8px 16px",color:"white",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Hotovo</button>
          </div>
        </div>

        <div style={{padding:"20px 20px 40px",display:"flex",flexDirection:"column",gap:20,background:C.bg,flex:1}}>

          {/* Activity editor */}
          {editing && (
            <div style={{animation:"fadeUp 0.2s ease"}}>
              <SectionLabel>{editing==="new"?"Nová aktivita":"Upravit aktivitu"}</SectionLabel>
              <Card pad="20px">
                <div style={{display:"flex",flexDirection:"column",gap:14}}>
                  {/* Emoji picker */}
                  <div>
                    <div style={{fontSize:12,color:C.label2,fontWeight:600,marginBottom:8}}>Emoji</div>
                    <div style={{display:"flex",gap:10,alignItems:"center"}}>
                      <button onClick={()=>setShowEmojiPicker(v=>!v)}
                        style={{width:56,height:56,borderRadius:16,fontSize:28,border:`2px solid ${C.sep}`,background:C.bg,cursor:"pointer"}}>
                        {form.emoji}
                      </button>
                      {showEmojiPicker&&(
                        <div style={{display:"flex",flexWrap:"wrap",gap:4,flex:1}}>
                          {EMOJI_OPTS.map(e=>(
                            <button key={e} onClick={()=>{setForm(f=>({...f,emoji:e}));setShowEmojiPicker(false);}}
                              style={{width:36,height:36,borderRadius:10,fontSize:20,border:`2px solid ${e===form.emoji?C.blue:C.sep}`,background:e===form.emoji?C.blue+"18":C.bg,cursor:"pointer"}}>
                              {e}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Name */}
                  <div>
                    <div style={{fontSize:12,color:C.label2,fontWeight:600,marginBottom:6}}>Název</div>
                    <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="např. Plavání"
                      style={{width:"100%",height:44,borderRadius:12,border:`1.5px solid ${C.sep}`,padding:"0 14px",fontSize:15,fontWeight:500,color:C.label,outline:"none",fontFamily:"inherit"}}
                      onFocus={e=>e.target.style.borderColor=C.blue} onBlur={e=>e.target.style.borderColor=C.sep}/>
                  </div>

                  {/* Description */}
                  <div>
                    <div style={{fontSize:12,color:C.label2,fontWeight:600,marginBottom:6}}>Popis (volitelné)</div>
                    <input value={form.desc} onChange={e=>setForm(f=>({...f,desc:e.target.value}))} placeholder="např. Aspoň 30 minut"
                      style={{width:"100%",height:44,borderRadius:12,border:`1.5px solid ${C.sep}`,padding:"0 14px",fontSize:15,fontWeight:500,color:C.label,outline:"none",fontFamily:"inherit"}}
                      onFocus={e=>e.target.style.borderColor=C.blue} onBlur={e=>e.target.style.borderColor=C.sep}/>
                  </div>

                  {/* b */}
                  <div>
                    <div style={{fontSize:12,color:C.label2,fontWeight:600,marginBottom:6}}>Body b</div>
                    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                      {[5,10,15,20,25,30].map(v=>(
                        <button key={v} onClick={()=>setForm(f=>({...f,xp:v}))}
                          style={{padding:"8px 14px",borderRadius:12,border:`1.5px solid ${form.xp===v?C.blue:C.sep}`,background:form.xp===v?C.blue+"18":"transparent",color:form.xp===v?C.blue:C.label2,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
                          {v} bodů
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Color */}
                  <div>
                    <div style={{fontSize:12,color:C.label2,fontWeight:600,marginBottom:8}}>Barva</div>
                    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                      {COLOR_OPTS.map(col=>(
                        <button key={col} onClick={()=>setForm(f=>({...f,color:col}))}
                          style={{width:32,height:32,borderRadius:"50%",background:col,border:form.color===col?"3px solid white":"3px solid transparent",boxShadow:form.color===col?`0 0 0 2px ${col}`:"none",cursor:"pointer"}}>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Preview */}
                  <div style={{background:form.color+"18",borderRadius:16,padding:"14px 16px",display:"flex",alignItems:"center",gap:12,border:`1.5px solid ${form.color}30`}}>
                    <div style={{width:44,height:44,borderRadius:12,background:form.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>{form.emoji}</div>
                    <div>
                      <div style={{fontSize:15,fontWeight:600,color:C.label}}>{form.name||"Název aktivity"}</div>
                      {form.desc&&<div style={{fontSize:12,color:C.label2,marginTop:2}}>{form.desc}</div>}
                      <Pill label={`+${form.xp} bodů`} color={form.color} small/>
                    </div>
                  </div>

                  <div style={{display:"flex",gap:10}}>
                    <button onClick={()=>setEditing(null)}
                      style={{flex:1,height:44,borderRadius:14,border:`1.5px solid ${C.sep}`,background:"transparent",color:C.label2,fontSize:15,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
                      Zrušit
                    </button>
                    <button onClick={saveActivity}
                      style={{flex:2,height:44,borderRadius:14,border:"none",background:C.blue,color:"white",fontSize:15,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
                      {editing==="new"?"Přidat aktivitu":"Uložit změny"}
                    </button>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Activity list */}
          <div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
              <SectionLabel>Aktivity ({activities.length})</SectionLabel>
              {!editing&&(
                <button onClick={startNew}
                  style={{background:C.blue,border:"none",borderRadius:12,padding:"6px 14px",color:"white",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
                  + Přidat
                </button>
              )}
            </div>
            <Card pad="0">
              {activities.map((a,i)=>(
                <div key={a.id} style={{display:"flex",alignItems:"center",gap:12,padding:"14px 18px",borderBottom:i<activities.length-1?`1px solid ${C.sep}`:"none",opacity:a.disabled?0.4:1}}>
                  <div style={{width:42,height:42,borderRadius:12,background:a.color+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{a.emoji}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:15,fontWeight:600,color:C.label}}>{a.name}</div>
                    <div style={{display:"flex",gap:6,marginTop:3,flexWrap:"wrap"}}>
                      {a.desc&&<span style={{fontSize:11,color:C.label3}}>{a.desc}</span>}
                      <Pill label={`${a.xp} bodů`} color={a.color} small/>
                      {a.disabled&&<Pill label="Skrytá" color={C.label3} small/>}
                    </div>
                  </div>
                  <div style={{display:"flex",gap:8,flexShrink:0}}>
                    <button onClick={()=>toggleActive(a.id)}
                      style={{width:34,height:34,borderRadius:10,border:`1.5px solid ${C.sep}`,background:"transparent",fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}
                      title={a.disabled?"Zobrazit":"Skrýt"}>
                      {a.disabled?"👁️":"🚫"}
                    </button>
                    <button onClick={()=>startEdit(a)}
                      style={{width:34,height:34,borderRadius:10,border:`1.5px solid ${C.sep}`,background:"transparent",fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                      ✏️
                    </button>
                    <button onClick={()=>deleteActivity(a.id)}
                      style={{width:34,height:34,borderRadius:10,border:`1.5px solid ${C.red}30`,background:C.red+"10",fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
              {activities.length===0&&(
                <div style={{padding:"24px",textAlign:"center",color:C.label3,fontSize:14}}>Žádné aktivity. Přidej první!</div>
              )}
            </Card>
          </div>

          {/* Change PIN */}
          <div>
            <SectionLabel>Bezpečnost</SectionLabel>
            <Card pad="18px 20px">
              <div style={{fontSize:15,fontWeight:600,color:C.label,marginBottom:4}}>Změnit PIN</div>
              <div style={{fontSize:13,color:C.label2,marginBottom:12}}>Aktuální PIN: {"•".repeat(pin.length)}</div>
              <div style={{display:"flex",gap:10}}>
                <input value={newPin} onChange={e=>setNewPin(e.target.value.replace(/\D/g,"").slice(0,4))}
                  placeholder="Nový 4-místný PIN" type="password" inputMode="numeric"
                  style={{flex:1,height:44,borderRadius:12,border:`1.5px solid ${C.sep}`,padding:"0 14px",fontSize:15,fontWeight:500,color:C.label,outline:"none",fontFamily:"inherit"}}
                  onFocus={e=>e.target.style.borderColor=C.blue} onBlur={e=>e.target.style.borderColor=C.sep}/>
                <button onClick={savePin}
                  style={{height:44,padding:"0 18px",borderRadius:12,border:"none",background:C.green,color:"white",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
                  {pinSaved?"✓ OK":"Uložit"}
                </button>
              </div>
            </Card>
          </div>

          {/* Reset defaults */}
          <div>
            <SectionLabel>Reset</SectionLabel>
            <Card pad="18px 20px">
              <div style={{fontSize:14,color:C.label2,marginBottom:12}}>Obnoví výchozí seznam aktivit.</div>
              <button onClick={()=>{if(window.confirm("Obnovit výchozí aktivity?"))save(DEFAULT_ACTIVITIES);}}
                style={{height:42,padding:"0 18px",borderRadius:12,border:`1.5px solid ${C.sep}`,background:"transparent",color:C.label2,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
                Obnovit výchozí
              </button>
            </Card>
          </div>

          {/* Časy notifikací */}
          <div>
            <SectionLabel>🔔 Časy připomínek</SectionLabel>
            <NotifyTimesEditor/>
          </div>

        </div>
      </div>
    </div>
  );
}

// ─── PIN GATE ─────────────────────────────────────────────────────────────────
function PinGate({onSuccess}){
  const [digits,setDigits]=useState(["","","",""]);
  const [error,setError]=useState(false);
  const refs=[useRef(),useRef(),useRef(),useRef()];

  const handleDigit=(i,val)=>{
    if(!/^\d?$/.test(val))return;
    const next=[...digits];next[i]=val;setDigits(next);setError(false);
    if(val&&i<3)refs[i+1].current.focus();
    if(val&&i===3){
      const code=next.join("");
      const stored=localStorage.getItem(ADMIN_PIN_KEY)||DEFAULT_PIN;
      if(code===stored)onSuccess();
      else{setError(true);setTimeout(()=>{setDigits(["","","",""]);refs[0].current.focus();setError(false);},800);}
    }
  };
  const handleKey=(i,e)=>{if(e.key==="Backspace"&&!digits[i]&&i>0){refs[i-1].current.focus();}};

  return(
    <div style={{position:"fixed",inset:0,zIndex:9000,background:"rgba(0,0,0,0.6)",backdropFilter:"blur(12px)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:"white",borderRadius:28,padding:"36px 32px",textAlign:"center",width:"100%",maxWidth:320,boxShadow:"0 24px 60px rgba(0,0,0,0.2)",animation:"popIn 0.35s cubic-bezier(0.34,1.56,0.64,1)"}}>
        <div style={{fontSize:44,marginBottom:12}}>🔒</div>
        <div style={{fontSize:20,fontWeight:700,color:C.label,letterSpacing:"-0.3px",marginBottom:6}}>Admin přístup</div>
        <div style={{fontSize:14,color:C.label2,marginBottom:24}}>Zadej PIN kód</div>
        <div style={{display:"flex",gap:12,justifyContent:"center",marginBottom:16}}>
          {digits.map((d,i)=>(
            <input key={i} ref={refs[i]} value={d} onChange={e=>handleDigit(i,e.target.value)} onKeyDown={e=>handleKey(i,e)}
              type="password" inputMode="numeric" maxLength={1}
              style={{width:56,height:64,borderRadius:16,border:`2px solid ${error?C.red:d?C.blue:C.sep}`,fontSize:28,fontWeight:700,color:C.label,textAlign:"center",outline:"none",fontFamily:"inherit",
                background:error?C.red+"10":d?C.blue+"08":"white",transition:"border-color 0.2s,background 0.2s"}}/>
          ))}
        </div>
        {error&&<div style={{fontSize:13,color:C.red,fontWeight:600,animation:"shake 0.4s ease"}}>Nesprávný PIN</div>}
        <div style={{fontSize:12,color:C.label3,marginTop:16}}>Výchozí PIN: 1234</div>
      </div>
    </div>
  );
}

// ─── ACTIVITIES TAB ───────────────────────────────────────────────────────────
function ActivitiesTab({activitiesDone,onToggleActivity}){
  const [activities,setActivities]=useState(()=>{try{const s=localStorage.getItem(ACTIVITIES_KEY);return s?JSON.parse(s):DEFAULT_ACTIVITIES;}catch{return DEFAULT_ACTIVITIES;}});
  const [tap,setTap]=useState(null);

  useEffect(()=>{
    const s=localStorage.getItem(ACTIVITIES_KEY);
    if(s)try{setActivities(JSON.parse(s));}catch{}
  },[]);

  const done=activitiesDone;
  const visible=activities.filter(a=>!a.disabled);
  const totalXP=done.reduce((s,id)=>{const a=activities.find(x=>x.id===id);return s+(a?.xp||0);},0);

  const toggle=(id)=>{
    setTap(id);setTimeout(()=>setTap(null),350);
    onToggleActivity(id);
  };

  return(
    <div style={{padding:"20px 20px 32px"}}>
      {/* Header card */}
      <Card style={{background:C.g3,boxShadow:`0 8px 28px ${C.purple}44`,marginBottom:20}} pad="22px">
        <div style={{fontSize:13,color:"rgba(255,255,255,0.7)",fontWeight:600,marginBottom:8}}>DNEŠNÍ AKTIVITY</div>
        <div style={{display:"flex",gap:16,alignItems:"center"}}>
          <div>
            <div style={{fontSize:36,fontWeight:700,color:"white",letterSpacing:"-1px"}}>{done.length}<span style={{fontSize:18,opacity:0.7}}>/{visible.length}</span></div>
            <div style={{fontSize:13,color:"rgba(255,255,255,0.75)",fontWeight:500}}>aktivit splněno</div>
          </div>
          <div style={{flex:1}}>
            <div style={{height:8,borderRadius:4,background:"rgba(0,0,0,0.2)",overflow:"hidden",marginBottom:6}}>
              <div style={{height:"100%",width:`${visible.length?done.length/visible.length*100:0}%`,background:"rgba(255,255,255,0.85)",borderRadius:4,transition:"width 0.5s cubic-bezier(0.34,1.56,0.64,1)"}}/>
            </div>
            <div style={{fontSize:13,color:"rgba(255,255,255,0.8)",fontWeight:600}}>+{totalXP} bodů celkem</div>
          </div>
        </div>
      </Card>

      {visible.length===0&&(
        <div style={{textAlign:"center",padding:"40px 20px",color:C.label3}}>
          <div style={{fontSize:48,marginBottom:12}}>🎯</div>
          <div style={{fontSize:15,fontWeight:600,color:C.label2}}>Žádné aktivity</div>
          <div style={{fontSize:13,marginTop:4}}>Tatínek zatím nepřidal žádné aktivity.</div>
        </div>
      )}

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        {visible.map((a,i)=>{
          const isDone=done.includes(a.id);
          const isTap=tap===a.id;
          return(
            <button key={a.id} onClick={()=>toggle(a.id)}
              style={{background:"none",border:"none",padding:0,cursor:"pointer",outline:"none",textAlign:"left",
                transform:isTap?"scale(0.95)":"scale(1)",transition:"transform 0.25s cubic-bezier(0.34,1.56,0.64,1)",
                animation:`fadeUp 0.3s ease ${i*0.04}s both`}}>
              <div style={{
                background:isDone?`linear-gradient(145deg,${a.color},${a.color}cc)`:C.bg2,
                borderRadius:20,padding:"18px 16px",
                border:`1.5px solid ${isDone?a.color+"55":C.sep}`,
                boxShadow:isDone?`0 6px 20px ${a.color}33`:"0 2px 12px rgba(0,0,0,0.06)",
                transition:"all 0.3s ease",
                position:"relative",overflow:"hidden",
              }}>
                {isDone&&<div style={{position:"absolute",top:0,left:0,right:0,height:"40%",background:"linear-gradient(180deg,rgba(255,255,255,0.2),transparent)",pointerEvents:"none"}}/>}
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                  <div style={{fontSize:32}}>{a.emoji}</div>
                  <div style={{width:26,height:26,borderRadius:13,background:isDone?"rgba(255,255,255,0.35)":"transparent",border:isDone?"none":`2px solid ${C.label4}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all 0.25s"}}>
                    {isDone&&<svg width="14" height="14" viewBox="0 0 14 14"><path d="M2 7l3.5 3.5L12 3" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>}
                  </div>
                </div>
                <div style={{fontSize:15,fontWeight:700,color:isDone?"white":C.label,letterSpacing:"-0.2px",marginBottom:4,lineHeight:1.3}}>{a.name}</div>
                {a.desc&&<div style={{fontSize:12,color:isDone?"rgba(255,255,255,0.75)":C.label3,marginBottom:8,lineHeight:1.4}}>{a.desc}</div>}
                <div style={{display:"inline-flex",alignItems:"center",background:isDone?"rgba(255,255,255,0.25)":a.color+"18",borderRadius:20,padding:"3px 10px"}}>
                  <span style={{fontSize:12,fontWeight:700,color:isDone?"white":a.color}}>+{a.xp} b</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {done.length===visible.length&&visible.length>0&&(
        <div style={{marginTop:16,animation:"fadeUp 0.4s ease"}}>
          <Card style={{background:`${C.yellow}18`,border:`1px solid ${C.yellow}44`}} pad="22px">
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:48}}>🎉</div>
              <div style={{fontSize:18,fontWeight:700,color:C.label,marginTop:10,letterSpacing:"-0.3px"}}>Všechny aktivity splněny!</div>
              <div style={{fontSize:14,color:C.label2,marginTop:4}}>Dnešní body z aktivit: {totalXP} 🎯</div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}


// ─── ACTIVITY CALENDAR ────────────────────────────────────────────────────────
function ActivityCalendar({getDayData}){
  const today=new Date();
  const [viewYear,setViewYear]=useState(today.getFullYear());
  const [viewMonth,setViewMonth]=useState(today.getMonth());
  const [selected,setSelected]=useState(null);

  const prevMonth=()=>{if(viewMonth===0){setViewMonth(11);setViewYear(y=>y-1);}else setViewMonth(m=>m-1);setSelected(null);};
  const nextMonth=()=>{if(viewMonth===11){setViewMonth(0);setViewYear(y=>y+1);}else setViewMonth(m=>m+1);setSelected(null);};

  const firstDay=new Date(viewYear,viewMonth,1).getDay();
  // Monday-first: rotate so Mon=0
  const startOffset=(firstDay+6)%7;
  const daysInMonth=new Date(viewYear,viewMonth+1,0).getDate();

  const cells=[];
  for(let i=0;i<startOffset;i++) cells.push(null);
  for(let d=1;d<=daysInMonth;d++) cells.push(new Date(viewYear,viewMonth,d));

  const dotColor=(score,actCount)=>{
    if(score===1&&actCount>0) return C.green;
    if(score===1)             return C.blue;
    if(score>0&&actCount>0)   return C.orange;
    if(score>0)               return C.teal;
    return null;
  };

  const selData = selected ? getDayData(selected) : null;
  const isFuture = (d) => d > today;

  return(
    <div>
      <SectionLabel>Kalendář aktivit</SectionLabel>
      <Card pad="18px">
        {/* Month nav */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
          <button onClick={prevMonth} style={{width:36,height:36,borderRadius:10,border:`1.5px solid ${C.sep}`,background:"transparent",fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:C.label2}}>‹</button>
          <div style={{fontSize:16,fontWeight:700,color:C.label,letterSpacing:"-0.3px"}}>
            {["Leden","Únor","Březen","Duben","Květen","Červen","Červenec","Srpen","Září","Říjen","Listopad","Prosinec"][viewMonth]} {viewYear}
          </div>
          <button onClick={nextMonth} style={{width:36,height:36,borderRadius:10,border:`1.5px solid ${C.sep}`,background:"transparent",fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:C.label2}}>›</button>
        </div>

        {/* Day headers */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:4}}>
          {["Po","Út","St","Čt","Pá","So","Ne"].map(d=>(
            <div key={d} style={{textAlign:"center",fontSize:11,fontWeight:600,color:C.label3,paddingBottom:4}}>{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3}}>
          {cells.map((d,i)=>{
            if(!d) return <div key={`e${i}`}/>;
            const isToday=d.toDateString()===today.toDateString();
            const isSel=selected&&d.toDateString()===selected.toDateString();
            const fut=isFuture(d)&&!isToday;
            const {score,actCount}=fut?{score:0,actCount:0}:getDayData(d);
            const dot=fut?null:dotColor(score,actCount);
            const isWE=d.getDay()===0||d.getDay()===6;
            return(
              <button key={i} onClick={()=>!fut&&setSelected(isSel?null:d)}
                style={{aspectRatio:"1",borderRadius:10,border:`1.5px solid ${isSel?C.blue:isToday?"transparent":C.sep}`,
                  background:isToday?C.blue:isSel?C.blue+"15":"transparent",
                  cursor:fut?"default":"pointer",padding:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:1}}>
                <span style={{fontSize:13,fontWeight:isToday?700:500,color:isToday?"white":fut?C.label4:isWE?C.red:C.label}}>
                  {d.getDate()}
                </span>
                {dot&&<div style={{width:5,height:5,borderRadius:"50%",background:isToday?"rgba(255,255,255,0.8)":dot}}/>}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div style={{display:"flex",gap:14,marginTop:14,flexWrap:"wrap"}}>
          {[{col:C.green,label:"Vše splněno"},{col:C.blue,label:"Mise splněny"},{col:C.teal,label:"Částečně"},{col:C.orange,label:"+ aktivity"}].map((l,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:5}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:l.col}}/>
              <span style={{fontSize:11,color:C.label2,fontWeight:500}}>{l.label}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Selected day detail */}
      {selected&&selData&&(
        <Card style={{marginTop:12,animation:"fadeUp 0.2s ease"}} pad="16px 18px">
          <div style={{fontSize:13,fontWeight:700,color:C.label,marginBottom:10}}>
            {selected.getDate()}. {MONTHS_CZ[selected.getMonth()]} {selected.getFullYear()}
          </div>
          <div style={{display:"flex",gap:10,marginBottom:selData.note?14:0}}>
            <div style={{flex:1,background:C.blue+"12",borderRadius:12,padding:"12px",textAlign:"center"}}>
              <div style={{fontSize:20,fontWeight:700,color:C.blue}}>{selData.habitDone}<span style={{fontSize:13,opacity:0.6}}>/{selData.habitTotal}</span></div>
              <div style={{fontSize:11,color:C.label2,marginTop:2,fontWeight:500}}>Mise</div>
            </div>
            <div style={{flex:1,background:C.purple+"12",borderRadius:12,padding:"12px",textAlign:"center"}}>
              <div style={{fontSize:20,fontWeight:700,color:C.purple}}>{selData.actCount}</div>
              <div style={{fontSize:11,color:C.label2,marginTop:2,fontWeight:500}}>Aktivity</div>
            </div>
            <div style={{flex:1,background:selData.score===1?C.green+"12":selData.score>0?C.orange+"12":C.label4,borderRadius:12,padding:"12px",textAlign:"center"}}>
              <div style={{fontSize:20,fontWeight:700,color:selData.score===1?C.green:selData.score>0?C.orange:C.label3}}>
                {Math.round(selData.score*100)}%
              </div>
              <div style={{fontSize:11,color:C.label2,marginTop:2,fontWeight:500}}>Splněno</div>
            </div>
          </div>
          {selData.note&&(
            <div style={{borderTop:`1px solid ${C.sep}`,paddingTop:12}}>
              <div style={{fontSize:11,fontWeight:600,color:C.label3,textTransform:"uppercase",letterSpacing:"0.4px",marginBottom:6}}>📝 Zápis z deníku</div>
              <div style={{fontSize:14,color:C.label,lineHeight:1.6,fontStyle:"italic"}}>„{selData.note}"</div>
            </div>
          )}
          {!selData.note&&(
            <div style={{color:C.label4,fontSize:12,textAlign:"center",marginTop:6}}>Žádný zápis v deníku</div>
          )}
        </Card>
      )}
    </div>
  );
}

// ─── HABIT ROW ────────────────────────────────────────────────────────────────
function HabitRow({habit,done,onToggle,index}){
  const [tap,setTap]=useState(false);
  const handle=()=>{setTap(true);setTimeout(()=>setTap(false),320);onToggle(habit.id);};
  return(
    <button onClick={handle} style={{width:"100%",background:"none",border:"none",padding:"0 20px",cursor:"pointer",outline:"none",transform:tap?"scale(0.98)":"scale(1)",transition:"transform 0.22s cubic-bezier(0.34,1.56,0.64,1)",animation:`fadeUp 0.35s ease ${index*0.05}s both`}}>
      <div style={{display:"flex",alignItems:"center",gap:14,padding:"13px 0",borderBottom:`1px solid ${C.sep}`}}>
        <div style={{width:44,height:44,borderRadius:12,flexShrink:0,background:done?habit.color:habit.color+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,transition:"all 0.25s",boxShadow:done?`0 4px 12px ${habit.color}44`:"none"}}>
          {done?"✓":habit.emoji}
        </div>
        <div style={{flex:1,textAlign:"left",minWidth:0}}>
          <div style={{fontSize:16,fontWeight:600,color:done?C.label2:C.label,textDecoration:done?"line-through":"none",letterSpacing:"-0.2px"}}>{habit.label}</div>
          <div style={{fontSize:13,color:C.label3,marginTop:1}}>{habit.time}{getHabitNotifyTime(habit)?<span style={{marginLeft:6,fontWeight:600,color:C.blue}}>🔔 {getHabitNotifyTime(habit)}</span>:null}</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
          {done&&<span style={{fontSize:12,color:C.yellow,fontWeight:700}}>{habit.xp} b</span>}
          <div style={{width:26,height:26,borderRadius:13,background:done?habit.color:"transparent",border:done?"none":`2px solid ${C.label4}`,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.25s cubic-bezier(0.34,1.56,0.64,1)",transform:done?"scale(1.1)":"scale(1)"}}>
            {done&&<svg width="14" height="14" viewBox="0 0 14 14"><path d="M2 7l3.5 3.5L12 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>}
          </div>
        </div>
      </div>
    </button>
  );
}

// ─── DAY RATING ───────────────────────────────────────────────────────────────
const RATINGS=[
  {stars:1,label:"I malý krok vpřed se počítá! 🌱"},
  {stars:2,label:"Slušný výkon, jdeme dál! 💪"},
  {stars:3,label:"Solidní den, trenére!"},
  {stars:4,label:"Skvělý den! Skoro Skvělý výkon! 🔥"},
  {stars:5,label:"Neuvěřitelný den! Nový rekord! 🏆"},
];
function DayRating({todayKey}){
  const ratingKey=`rating_${todayKey}`;
  const noteKey=`note_${todayKey}`;
  const [rating,setRating]=useState(()=>{try{return parseInt(localStorage.getItem(ratingKey)||"0");}catch{return 0;}});
  const [hov,setHov]=useState(0);
  const [note,setNote]=useState(()=>localStorage.getItem(noteKey)||"");
  const [focused,setFocused]=useState(false);
  const saveRating=r=>{setRating(r);localStorage.setItem(ratingKey,r.toString());};
  const saveNote=v=>{setNote(v);localStorage.setItem(noteKey,v);};
  const active=hov||rating;

  const PROMPTS=[
    "Co tě dnes nejvíc bavilo?",
    "Stalo se dnes něco zajímavého?",
    "Co ses dnes naučil nového?",
    "Na co jsi dnes hrdý?",
    "Co bys chtěl zítra zkusit?",
  ];
  const prompt=PROMPTS[new Date().getDay()%PROMPTS.length];

  return(
    <Card>
      {/* Stars */}
      <div style={{display:"flex",justifyContent:"center",gap:8,marginBottom:10}}>
        {[1,2,3,4,5].map(s=>(
          <button key={s} onClick={()=>saveRating(s)} onMouseEnter={()=>setHov(s)} onMouseLeave={()=>setHov(0)}
            style={{background:"none",border:"none",cursor:"pointer",padding:"2px",fontSize:s<=active?36:28,
              transition:"all 0.18s cubic-bezier(0.34,1.56,0.64,1)",
              transform:s<=active?"scale(1.15)":"scale(1)",
              filter:s<=active?"none":"grayscale(0.8) opacity(0.4)"}}>⭐</button>
        ))}
      </div>
      <div style={{textAlign:"center",fontSize:14,fontWeight:600,color:C.label2,marginBottom:16,minHeight:20}}>
        {active?RATINGS[active-1].label:"Jak byl dnešní den?"}
      </div>

      {/* Separator */}
      <div style={{height:1,background:C.sep,marginBottom:16}}/>

      {/* Diary prompt */}
      <div style={{fontSize:12,fontWeight:600,color:C.label2,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:8}}>
        📝 Deník dne
      </div>
      <div style={{fontSize:13,color:C.label3,marginBottom:10,fontStyle:"italic"}}>{prompt}</div>
      <div style={{position:"relative"}}>
        <textarea
          value={note}
          onChange={e=>saveNote(e.target.value)}
          onFocus={()=>setFocused(true)}
          onBlur={()=>setFocused(false)}
          placeholder="Napiš pár slov o dnešku…"
          rows={3}
          style={{
            width:"100%",borderRadius:14,
            border:`1.5px solid ${focused?C.blue:C.sep}`,
            padding:"12px 14px",fontSize:15,color:C.label,
            lineHeight:1.6,resize:"none",outline:"none",
            fontFamily:"-apple-system,BlinkMacSystemFont,'SF Pro Display','Inter',sans-serif",
            background:focused?C.blue+"05":C.bg,
            transition:"border-color 0.2s, background 0.2s",
          }}
        />
        {note.length>0&&(
          <div style={{position:"absolute",bottom:10,right:12,fontSize:11,color:C.label3,fontWeight:500}}>
            {note.length} znaků
          </div>
        )}
      </div>
      {note.length>0&&(
        <div style={{display:"flex",alignItems:"center",gap:6,marginTop:8}}>
          <div style={{width:6,height:6,borderRadius:"50%",background:C.green,flexShrink:0}}/>
          <span style={{fontSize:12,color:C.green,fontWeight:600}}>Uloženo ✓</span>
        </div>
      )}
    </Card>
  );
}


// ─── DAILY SCORE CARD ────────────────────────────────────────────────────────
function DailyScoreCard({ earnedXP, todayKey }) {
  const record   = getDailyRecord();
  const isRecord = earnedXP > 0 && earnedXP >= record;
  const streak   = getStreak();

  // Last 7 days b for sparkline
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - 6 + i);
    const k = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const isToday = k === todayKey;
    return { xp: isToday ? earnedXP : getDailyXP(k), isToday, day: DAYS_CZ[d.getDay()] };
  });
  const maxXP = Math.max(...last7.map(d => d.xp), 1);

  const bgGrad = isRecord && earnedXP > 0
    ? C.g5
    : C.g1;
  const shadow = isRecord && earnedXP > 0 ? `0 8px 28px ${C.yellow}55` : `0 8px 28px ${C.indigo}44`;

  return (
    <Card style={{ background: bgGrad, boxShadow: shadow }} pad="22px">
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:16 }}>
        <div>
          <div style={{ fontSize:13, color:"rgba(255,255,255,0.7)", fontWeight:600, marginBottom:4 }}>
            {isRecord && earnedXP > 0 ? "🏆 NOVÝ REKORD!" : "⚡ DNEŠNÍ SKÓRE"}
          </div>
          <div style={{ display:"flex", alignItems:"baseline", gap:6 }}>
            <span style={{ fontSize:44, fontWeight:700, color:"white", letterSpacing:"-2px", lineHeight:1 }}>
              {earnedXP}
            </span>
            <span style={{ fontSize:18, color:"rgba(255,255,255,0.6)", fontWeight:600 }}>XP</span>
          </div>
          <div style={{ fontSize:12, color:"rgba(255,255,255,0.65)", marginTop:4 }}>
            Rekord: {Math.max(record, earnedXP)} bodů · 🔥 Série: {streak} {streak===1?"den":streak<5?"dny":"dní"}
          </div>
        </div>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:42 }}>{isRecord && earnedXP > 0 ? "🏆" : earnedXP > 0 ? "⚡" : "💤"}</div>
        </div>
      </div>

      {/* Sparkline */}
      <div style={{ display:"flex", gap:4, alignItems:"flex-end", height:48 }}>
        {last7.map((d, i) => {
          const pct = d.xp / maxXP;
          const col = d.isToday
            ? (isRecord && earnedXP > 0 ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.95)")
            : "rgba(255,255,255,0.3)";
          return (
            <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
              <div style={{ width:"100%", borderRadius:4, background:"rgba(255,255,255,0.15)", height:36, position:"relative", overflow:"hidden" }}>
                <div style={{
                  position:"absolute", bottom:0, left:0, right:0,
                  height: `${Math.max(pct * 100, d.xp > 0 ? 8 : 0)}%`,
                  background: col, borderRadius:"3px 3px 0 0",
                  transition:"height 0.6s ease",
                  boxShadow: d.isToday && earnedXP > 0 ? "0 0 8px rgba(255,255,255,0.5)" : "none",
                }} />
              </div>
              <span style={{ fontSize:9, fontWeight: d.isToday ? 700 : 500, color: d.isToday ? "white" : "rgba(255,255,255,0.5)" }}>
                {d.day}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}



function BirthAge({bd}){
  const age=Math.floor((new Date()-new Date(bd))/(365.25*24*3600*1000));
  if(isNaN(age)||age<0||age>25) return null;
  return <div style={{padding:"0 18px 14px",fontSize:13,color:C.label2,fontWeight:500}}>Věk: {age} let — tipy na jídlo jsou přizpůsobeny věkové skupině 🍎</div>;
}

function CurrentLesson({subj}){
  const meta=getSubjectMeta(subj)||{label:subj,color:C.blue,emoji:"📚"};
  const now=new Date();
  const nowMins=now.getHours()*60+now.getMinutes();
  const cur=PERIODS.findIndex(p=>{const [sh,sm]=p.start.split(":").map(Number),[eh,em]=p.end.split(":").map(Number);return nowMins>=sh*60+sm&&nowMins<=eh*60+em;});
  if(cur<0) return null;
  return(
    <div style={{background:`linear-gradient(135deg,${meta.color}22,${meta.color}10)`,borderBottom:`1px solid ${C.sep}`,padding:"14px 18px",display:"flex",alignItems:"center",gap:12}}>
      <div style={{width:44,height:44,borderRadius:14,background:meta.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0,boxShadow:`0 4px 12px ${meta.color}55`}}>{meta.emoji}</div>
      <div style={{flex:1}}>
        <div style={{fontSize:11,fontWeight:700,color:meta.color,textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:2}}>🔴 Právě teď · {PERIODS[cur].start}–{PERIODS[cur].end}</div>
        <div style={{fontSize:17,fontWeight:700,color:C.label}}>{meta.label}</div>
      </div>
      <div style={{background:meta.color,borderRadius:12,padding:"4px 10px",fontSize:13,fontWeight:700,color:"white"}}>{cur+1}.</div>
    </div>
  );
}


// ─── SUBJECT SHEET ────────────────────────────────────────────────────────────
function SubjectSheet({subj, onClose}){
  const meta=getSubjectMeta(subj);
  if(!meta) return null;

  const favKey=`fav_subj_${subj}`;
  const [fav,setFav]=useState(()=>localStorage.getItem(favKey)==="1");
  const tipIdx=getDayIndex()%meta.tips.length;
  const tip=meta.tips[tipIdx];

  const toggleFav=()=>{
    const nv=!fav;
    setFav(nv);
    localStorage.setItem(favKey,nv?"1":"0");
  };

  return(
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",
        zIndex:900, animation:"fadeIn 0.2s ease",
      }}/>
      {/* Sheet */}
      <div style={{
        position:"fixed",bottom:0,left:0,right:0,
        background:"white",
        borderRadius:"28px 28px 0 0",
        zIndex:901,
        maxHeight:"82vh",
        overflowY:"auto",
        animation:"slideUp 0.35s cubic-bezier(0.34,1.1,0.64,1)",
        paddingBottom:"env(safe-area-inset-bottom,20px)",
      }}>
        {/* Handle */}
        <div style={{display:"flex",justifyContent:"center",paddingTop:14,paddingBottom:4}}>
          <div style={{width:40,height:4,borderRadius:2,background:"#E0E0E0"}}/>
        </div>

        {/* Header */}
        <div style={{
          padding:"12px 22px 20px",
          background:`linear-gradient(135deg,${meta.color}18,${meta.color}05)`,
          borderBottom:`1px solid ${meta.color}20`,
        }}>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <div style={{
              width:60,height:60,borderRadius:20,
              background:meta.color,
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:30,flexShrink:0,
              boxShadow:`0 6px 20px ${meta.color}50`,
            }}>{meta.emoji}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:20,fontWeight:800,color:C.label,letterSpacing:"-0.3px"}}>{meta.label}</div>
              <div style={{fontSize:13,color:C.label2,marginTop:3,lineHeight:1.5}}>{meta.desc}</div>
            </div>
            <button onClick={toggleFav} style={{
              width:42,height:42,borderRadius:14,border:"none",
              background:fav?`${C.yellow}30`:"transparent",
              fontSize:22,cursor:"pointer",flexShrink:0,
              transition:"all 0.2s cubic-bezier(0.34,1.56,0.64,1)",
              transform:fav?"scale(1.15)":"scale(1)",
            }}>{fav?"⭐":"☆"}</button>
          </div>
        </div>

        <div style={{padding:"20px 22px",display:"flex",flexDirection:"column",gap:16}}>

          {/* Tip dne */}
          <div style={{
            background:`linear-gradient(135deg,${meta.color}15,${meta.color}05)`,
            border:`1.5px solid ${meta.color}30`,
            borderRadius:20,padding:"16px 18px",
          }}>
            <div style={{fontSize:10,fontWeight:800,color:meta.color,textTransform:"uppercase",letterSpacing:"1px",marginBottom:8}}>
              💡 Tip dne · #{tipIdx+1} z {meta.tips.length}
            </div>
            <div style={{fontSize:14,color:C.label,lineHeight:1.7,fontWeight:500}}>
              {tip}
            </div>
          </div>

          {/* Pomůcky */}
          <div>
            <div style={{fontSize:12,fontWeight:700,color:C.label2,textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:10}}>
              🎒 Co si připravit
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {meta.pomucky.map((p,i)=>(
                <div key={i} style={{
                  display:"flex",alignItems:"center",gap:10,
                  background:C.bg,borderRadius:12,padding:"10px 14px",
                }}>
                  <div style={{width:6,height:6,borderRadius:"50%",background:meta.color,flexShrink:0}}/>
                  <span style={{fontSize:14,color:C.label,fontWeight:500}}>{p}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Close button */}
          <button onClick={onClose} style={{
            width:"100%",height:50,borderRadius:16,
            border:"none",background:meta.color,
            color:"white",fontSize:16,fontWeight:700,
            cursor:"pointer",fontFamily:"inherit",
            boxShadow:`0 4px 16px ${meta.color}40`,
            marginTop:4,
          }}>Zavřít</button>

        </div>
      </div>
    </>
  );
}

// ─── TIMETABLE CARD ───────────────────────────────────────────────────────────
function TimetableCard({dow,isToday=true,selectedDay=null,weekOffset=0,onBack}){
  const [selectedSubj,setSelectedSubj]=useState(null);
  if(dow===0||dow===6) return null; // weekend
  const lessons=TIMETABLE[dow]||[];
  const now=new Date();
  const nowMins=now.getHours()*60+now.getMinutes();

  const getCurrentPeriod=()=>{
    for(let i=0;i<PERIODS.length;i++){
      const [sh,sm]=PERIODS[i].start.split(":").map(Number);
      const [eh,em]=PERIODS[i].end.split(":").map(Number);
      const s=sh*60+sm, e=eh*60+em;
      if(nowMins>=s&&nowMins<=e) return i;
    }
    return -1;
  };
  const getNextPeriod=()=>{
    for(let i=0;i<PERIODS.length;i++){
      const [sh,sm]=PERIODS[i].start.split(":").map(Number);
      if(nowMins<sh*60+sm) return i;
    }
    return -1;
  };

  const currentIdx=getCurrentPeriod();
  const nextIdx=getNextPeriod();

  return(
    <div style={{padding:"16px 20px 0"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10,paddingLeft:6}}>
        <div style={{fontSize:12,fontWeight:600,color:isToday?C.label3:C.indigo,textTransform:"uppercase",letterSpacing:"0.8px"}}>
          {isToday?"Dnešní rozvrh":weekOffset!==0?`Rozvrh — ${DAYS_FULL[dow]} (${weekOffset>0?"příští":"minulý"} týden)`:`Rozvrh — ${DAYS_FULL[dow]}`}
        </div>
        {!isToday&&<button onClick={onBack} style={{background:C.indigo+"15",border:"none",borderRadius:10,padding:"4px 10px",fontSize:12,fontWeight:600,color:C.indigo,cursor:"pointer",fontFamily:"inherit"}}>
          ← Dnes
        </button>}
      </div>
      <Card pad="0" style={{overflow:"hidden"}}>
        {/* current lesson highlight */}
        {isToday&&<CurrentLesson subj={lessons[currentIdx]||""}/>}

        {/* all periods */}
        <div style={{padding:"8px 0"}}>
          {PERIODS.map((p,i)=>{
            const subj=lessons[i]||"";
            if(!subj) return null;
            const meta=getSubjectMeta(subj)||{label:subj,color:C.label3,emoji:"📚"};
            const isCurrent=i===currentIdx;
            const isNext=i===nextIdx&&currentIdx===-1;
            const [sh,sm]=p.start.split(":").map(Number);
            const isPast=isToday&&nowMins>sh*60+sm&&!isCurrent;
            return(
              <button key={i} onClick={()=>subj&&setSelectedSubj(subj)} style={{
                display:"flex", alignItems:"center", gap:12,
                padding:"10px 18px", width:"100%",
                background:isCurrent?`${meta.color}10`:"transparent",
                opacity:isPast?0.4:1,
                borderLeft:isCurrent?`3px solid ${meta.color}`:"3px solid transparent",
                border:"none", cursor:subj?"pointer":"default",
                fontFamily:"inherit", textAlign:"left",
                transition:"opacity 0.3s",
              }}>
                <div style={{
                  width:28,height:28,borderRadius:9,
                  background:isPast?"transparent":meta.color+"20",
                  border:`1.5px solid ${isPast?C.sep:meta.color+"50"}`,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:14,flexShrink:0,
                }}>{meta.emoji}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:isCurrent?700:500,color:isCurrent?meta.color:C.label}}>
                    {meta.label}
                  </div>
                  <div style={{fontSize:11,color:C.label3,fontWeight:500,marginTop:1}}>
                    {p.start}–{p.end}
                  </div>
                </div>
                <div style={{
                  fontSize:11,fontWeight:700,
                  color:isCurrent?meta.color:C.label3,
                  background:isCurrent?`${meta.color}15`:C.bg,
                  borderRadius:8,padding:"3px 8px",
                }}>{p.n}. hod.</div>
              </button>
            );
          })}
        </div>
      </Card>
      {selectedSubj&&<SubjectSheet subj={selectedSubj} onClose={()=>setSelectedSubj(null)}/>}
    </div>
  );
}


// ─── ACTIVITY SUGGESTION ──────────────────────────────────────────────────────
function ActivitySuggestion({activitiesDone}){
  // Pick suggestion based on day index — cycles through all activities
  const acts=(() =>{try{const s=localStorage.getItem(ACTIVITIES_KEY);return s?JSON.parse(s):DEFAULT_ACTIVITIES;}catch{return DEFAULT_ACTIVITIES;}})();
  const visible=acts.filter(a=>!a.disabled);
  if(!visible.length) return null;

  // Rotate through activities by day, skip already done ones
  const idx=getDayIndex()%visible.length;
  const notDone=visible.filter(a=>!activitiesDone.includes(a.id));
  const suggestion=notDone.length>0?notDone[idx%notDone.length]:null;
  if(!suggestion) return(
    <div style={{padding:"0 20px"}}>
      <Card style={{background:`${C.green}12`,border:`1px solid ${C.green}30`}} pad="16px 18px">
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <span style={{fontSize:28}}>🏆</span>
          <div>
            <div style={{fontSize:14,fontWeight:700,color:C.green}}>Všechny aktivity splněny!</div>
            <div style={{fontSize:12,color:C.label2,marginTop:2}}>Výborný výkon dnes!</div>
          </div>
        </div>
      </Card>
    </div>
  );

  const meta=suggestion;
  const motivations=[
    `Zkus dnes ${meta.name.toLowerCase()} — získáš ${meta.xp} bodů navíc!`,
    `${meta.name} je skvělý způsob jak nabrat energii!`,
    `Co takhle dnes zkusit ${meta.name.toLowerCase()}? Stojí to za to!`,
    `Dnes je ideální den na ${meta.name.toLowerCase()}.`,
    `${meta.name} — ${meta.desc}. Dáš to?`,
  ];
  const msg=motivations[getDayIndex()%motivations.length];

  return(
    <div style={{padding:"0 20px"}}>
      <Card style={{
        background:`linear-gradient(135deg,${meta.color}18,${meta.color}08)`,
        border:`1.5px solid ${meta.color}35`,
        position:"relative", overflow:"hidden",
      }} pad="18px 18px">

        {/* subtle glow blob */}
        <div style={{
          position:"absolute", top:-20, right:-20, width:80, height:80,
          borderRadius:"50%", background:meta.color, opacity:0.12,
          pointerEvents:"none",
        }}/>

        <div style={{fontSize:11,fontWeight:700,color:meta.color,textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:10}}>
          💡 Doporučená aktivita
        </div>

        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <div style={{
            width:52,height:52,borderRadius:16,flexShrink:0,
            background:meta.color,
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:26,
            boxShadow:`0 6px 18px ${meta.color}44`,
          }}>{meta.emoji}</div>

          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:16,fontWeight:700,color:C.label,marginBottom:3}}>{meta.name}</div>
            <div style={{fontSize:13,color:C.label2,lineHeight:1.45}}>{msg}</div>
          </div>

          <div style={{
            flexShrink:0,
            background:meta.color,
            borderRadius:12,padding:"6px 12px",
            fontSize:13,fontWeight:700,color:"white",
            boxShadow:`0 3px 10px ${meta.color}44`,
          }}>+{meta.xp} b</div>
        </div>
      </Card>
    </div>
  );
}

// ─── TODAY TAB ────────────────────────────────────────────────────────────────
function TodayTab({habits,todayDone,onToggle,completedCount,earnedXP,earnedActXP=0,totalXP,allDone,childName,profilePic,onUpload,activitiesDone=[]}){
  const today=new Date();
  const dow=today.getDay();
  const progress=habits.length?completedCount/habits.length:0;
  const [selectedDay,setSelectedDay]=useState(null); // null = dnes
  const [weekOffset,setWeekOffset]=useState(0); // 0=tento týden, 1=příští, -1=minulý
  const viewDow=selectedDay!==null?selectedDay:dow;
  const viewIsToday=selectedDay===null||selectedDay===dow;
  const weekDays=Array.from({length:7},(_,i)=>{const d=new Date(today);d.setDate(today.getDate()-((dow+6)%7)+i+weekOffset*7);return d;});

  return(
    <div style={{padding:"0 0 32px"}}>
      <div style={{padding:"20px 20px 0"}}>
        <Card style={{background:C.g1,boxShadow:`0 8px 32px ${C.blue}44`}} pad="22px">
          <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:18}}>
            <ProfilePic src={profilePic} onUpload={onUpload} size={60}/>
            <div style={{flex:1}}>
              <div style={{fontSize:13,color:"rgba(255,255,255,0.7)",fontWeight:500,marginBottom:2}}>{DAYS_FULL[dow]}, {today.getDate()}. {MONTHS_CZ[today.getMonth()]}</div>
              <div style={{fontSize:22,fontWeight:700,color:"white",letterSpacing:"-0.5px"}}>{childName||"Ahoj"} 👋</div>
            </div>
            <div style={{fontSize:36}}>{allDone?"✨":isWeekend(today)?"🎮":"📚"}</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <div style={{position:"relative",width:56,height:56,flexShrink:0}}>
              <svg width="56" height="56" viewBox="0 0 56 56" style={{transform:"rotate(-90deg)"}}>
                <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="4"/>
                <circle cx="28" cy="28" r="22" fill="none" stroke="white" strokeWidth="4" strokeDasharray={`${2*Math.PI*22}`} strokeDashoffset={`${2*Math.PI*22*(1-progress)}`} strokeLinecap="round" style={{transition:"stroke-dashoffset 0.6s ease"}}/>
              </svg>
              <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:"white"}}>{Math.round(progress*100)}%</div>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:15,fontWeight:600,color:"white",marginBottom:4}}>{completedCount}/{habits.length} splněno</div>
              <div style={{height:6,borderRadius:3,background:"rgba(255,255,255,0.2)",overflow:"hidden"}}>
                <div style={{height:"100%",width:`${progress*100}%`,background:"white",borderRadius:3,transition:"width 0.6s cubic-bezier(0.34,1.56,0.64,1)",boxShadow:allDone?"0 0 12px rgba(255,255,255,0.6)":"none"}}/>
              </div>
              <div style={{fontSize:12,color:"rgba(255,255,255,0.7)",marginTop:4,display:"flex",gap:8,flexWrap:"wrap"}}>
                <span>⚡ {earnedXP} bodů celkem</span>
                {earnedActXP>0&&<span style={{opacity:0.75}}>· 🎯 +{earnedActXP} z aktivit</span>}
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div style={{padding:"16px 20px 0"}}>
        <Card pad="12px 8px">
          {/* week nav */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8,paddingLeft:4,paddingRight:4}}>
            <button onClick={()=>{setWeekOffset(o=>o-1);setSelectedDay(null);}} style={{width:32,height:32,borderRadius:10,border:`1px solid ${C.sep}`,background:"transparent",fontSize:18,cursor:"pointer",color:C.label2,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"inherit"}}>‹</button>
            <span style={{fontSize:12,fontWeight:600,color:weekOffset===0?C.blue:C.label2,letterSpacing:"0.3px"}}>
              {weekOffset===0?"Tento týden":weekOffset===1?"Příští týden":weekOffset===-1?"Minulý týden":`${weekOffset>0?"+":""}${weekOffset} týdny`}
            </span>
            <button onClick={()=>{setWeekOffset(o=>o+1);setSelectedDay(null);}} style={{width:32,height:32,borderRadius:10,border:`1px solid ${C.sep}`,background:"transparent",fontSize:18,cursor:"pointer",color:C.label2,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"inherit"}}>›</button>
          </div>
          <div style={{display:"flex",justifyContent:"space-around"}}>
            {weekDays.map((d,i)=>{
              const isToday=d.toDateString()===today.toDateString();
              const ddow=d.getDay();
              const isWE=isWeekend(d);
              const isSelected=selectedDay===ddow||(selectedDay===null&&isToday);
              const selCol=isToday?C.blue:C.indigo;
              return(
                <button key={i} onClick={()=>setSelectedDay(isToday&&selectedDay===null?null:ddow===dow?null:ddow)}
                  style={{width:38,height:60,borderRadius:14,border:"none",cursor:"pointer",padding:0,
                    background:isSelected?selCol:"transparent",
                    display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,
                    transform:isSelected?"scale(1.08)":"scale(1)",
                    transition:"transform 0.2s cubic-bezier(0.34,1.56,0.64,1), background 0.2s",
                  }}>
                  <span style={{fontSize:11,fontWeight:600,color:isSelected?"rgba(255,255,255,0.8)":isWE?C.red:C.label3}}>{DAYS_CZ[ddow]}</span>
                  <span style={{fontSize:18,fontWeight:700,color:isSelected?"white":C.label}}>{d.getDate()}</span>
                  {!isWE&&!isSelected&&<div style={{width:4,height:4,borderRadius:"50%",background:C.label4}}/>}
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      <TimetableCard
        dow={selectedDay!==null?selectedDay:(weekOffset===0?dow:1)}
        isToday={weekOffset===0&&(selectedDay===null||selectedDay===dow)}
        selectedDay={selectedDay}
        weekOffset={weekOffset}
        onBack={()=>{setSelectedDay(null);}}
      />

      {dow>=0&&dow<=4&&(()=>{
        const hr=new Date().getHours(), mins=new Date().getMinutes();
        const timeVal=hr+(mins/60);
        const urgency=Math.max(0,Math.min(1,(timeVal-14)/(22-14)));

        const lerp=(a,b,t)=>Math.round(a+(b-a)*t);
        const STOPS=[
          {r:52, g:199,b:89},
          {r:255,g:214,b:10},
          {r:255,g:159,b:10},
          {r:255,g:59, b:48},
        ];
        const seg=urgency*3, si=Math.min(Math.floor(seg),2), t2=seg-si;
        const {r,g,b}={r:lerp(STOPS[si].r,STOPS[si+1].r,t2),g:lerp(STOPS[si].g,STOPS[si+1].g,t2),b:lerp(STOPS[si].b,STOPS[si+1].b,t2)};
        const accent=`rgb(${r},${g},${b})`;
        const accentDark=`rgb(${lerp(r,0,0.5)},${lerp(g,0,0.5)},${lerp(b,0,0.5)})`;
        const filledTicks=Math.round(urgency*5);

        const LEVELS=[
          {word:"🎉 SUPER!", sub:"Dost času — relax! 😎",    pulse:2.6, shakeAnim:"none", chill:true},
          {word:"BRZY ČAS!", sub:"Začni chystat věci",         pulse:2.0, shakeAnim:"none"},
          {word:"POZOR!!",   sub:"Nezapomeň na přípravu!",     pulse:1.2, shakeAnim:"comicShake 0.5s ease-in-out infinite"},
          {word:"HNED!!!",   sub:"Připrav věci OKAMŽITĚ!",     pulse:0.6, shakeAnim:"comicShake 0.3s ease-in-out infinite"},
        ];
        const lvl=LEVELS[Math.min(Math.floor(urgency*4),3)];

        // halftone dot size based on urgency
        const dotSize=lerp(3,6,urgency);
        const dotGap=lerp(10,7,urgency);

        return(
        <div style={{padding:"12px 20px 0"}}>
          <div style={{
            position:"relative", overflow:"hidden", borderRadius:22,
            border:`4px solid #111`,
            boxShadow:`6px 6px 0 #111, 0 0 0 2px #111`,
            background:"#FFFEF2",
            fontFamily:"'Impact','Arial Black','Arial',sans-serif",
          }}>

            {/* halftone dot bg */}
            <div style={{
              position:"absolute", inset:0, pointerEvents:"none", zIndex:0,
              backgroundImage:`radial-gradient(circle, ${accent}55 ${dotSize}px, transparent ${dotSize}px)`,
              backgroundSize:`${dotGap}px ${dotGap}px`,
              transition:"background 0.8s",
            }}/>

            {/* speed lines radiating from center */}
            <div style={{
              position:"absolute", inset:0, pointerEvents:"none", zIndex:1,
              background:`repeating-conic-gradient(from 0deg at 50% 50%, transparent 0deg, transparent 8deg, rgba(0,0,0,0.025) 8deg, rgba(0,0,0,0.025) 9deg)`,
            }}/>

            {/* main content */}
            <div style={{position:"relative", zIndex:2, padding:lvl.chill?"10px 18px 10px":"18px 20px 16px", transition:"padding 0.5s"}}>

              {lvl.chill ? (
                /* ── CHILL MODE — compact & fun ── */
                <div style={{display:"flex",alignItems:"center",gap:14}}>
                  <div style={{
                    fontSize:36, animation:"wobble 2s ease-in-out infinite",
                    flexShrink:0,
                  }}>🎉</div>
                  <div style={{flex:1}}>
                    <div style={{
                      fontSize:22, fontWeight:900, lineHeight:1, letterSpacing:"0.5px",
                      color:accent, WebkitTextStroke:"2px #111",
                      textShadow:`2px 2px 0 #111, 2px 2px 0 ${accentDark}`,
                      transition:"color 0.8s",
                    }}>SUPER! Relax! 😎</div>
                    <div style={{fontSize:12,fontWeight:700,color:"#555",marginTop:4,letterSpacing:"0.5px",textTransform:"uppercase",fontFamily:"'Impact','Arial Black',sans-serif"}}>🎒 Dost času — žádný stres!</div>
                  </div>
                  <div style={{fontSize:24, animation:"pulse 2.6s ease-in-out infinite", flexShrink:0}}>🌟</div>
                </div>
              ) : (
                <>
                  {/* big comic word */}
                  <div style={{textAlign:"center",marginBottom:10,animation:lvl.shakeAnim}}>
                    <span style={{
                      display:"inline-block",
                      fontSize:44, fontWeight:900, letterSpacing:"1px", lineHeight:1,
                      textTransform:"uppercase", color:accent,
                      WebkitTextStroke:`4px #111`,
                      textShadow:`4px 4px 0 #111, -1px -1px 0 #111, 3px 3px 0 ${accentDark}`,
                      transition:"color 0.8s, text-shadow 0.8s",
                    }}>{lvl.word}</span>
                  </div>

                  {/* action lines burst */}
                  <div style={{position:"absolute",top:0,left:0,right:0,bottom:0,zIndex:-1,pointerEvents:"none"}}>
                    <svg width="100%" height="100%" viewBox="0 0 400 120" preserveAspectRatio="xMidYMid slice">
                      {Array.from({length:16}).map((_,i)=>{
                        const angle=(i/16)*360, rad=angle*Math.PI/180, cx=200, cy=55;
                        return <line key={i} x1={cx} y1={cy} x2={cx+Math.cos(rad)*220} y2={cy+Math.sin(rad)*120} stroke={accent} strokeWidth="1.5" opacity="0.25"/>;
                      })}
                    </svg>
                  </div>

                  {/* subtitle ribbon */}
                  <div style={{background:"#111",margin:"0 -4px 14px",padding:"5px 16px",textAlign:"center",transform:"rotate(-1deg)",boxShadow:"2px 2px 0 #555"}}>
                    <span style={{fontSize:13,fontWeight:800,color:"white",letterSpacing:"1.5px",textTransform:"uppercase",fontFamily:"'Impact','Arial Black','Arial',sans-serif"}}>🎒 {lvl.sub}</span>
                  </div>

                  {/* urgency meter */}
                  <div>
                    <div style={{display:"flex",gap:5,marginBottom:5}}>
                      {Array.from({length:5}).map((_,i)=>{
                        const filled=i<filledTicks;
                        return <div key={i} style={{flex:1,height:10,borderRadius:2,background:filled?accent:"#ddd",border:"2px solid #111",boxShadow:filled?`2px 2px 0 #111`:"1px 1px 0 #888",transition:"background 0.6s"}}/>;
                      })}
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",paddingLeft:2,paddingRight:2}}>
                      <span style={{fontSize:10,fontWeight:800,color:"#30D158",fontFamily:"'Impact','Arial Black',sans-serif",letterSpacing:"0.5px"}}>● POHODA</span>
                      <span style={{fontSize:10,fontWeight:800,color:urgency>0.6?"#FF453A":"#aaa",fontFamily:"'Impact','Arial Black',sans-serif",letterSpacing:"0.5px",transition:"color 0.8s"}}>HNED! ●</span>
                    </div>
                  </div>
                </>
              )}

            </div>
          </div>
        </div>
        );
      })()}

      <div style={{padding:"16px 20px 0"}}>
        <DailyScoreCard earnedXP={earnedXP} todayKey={getTodayKey()}/>
      </div>

      <div style={{padding:"16px 20px 0"}}>
        <SectionLabel>Denní mise</SectionLabel>
        <Card pad="0">
          {habits.map((h,i)=><HabitRow key={h.id} habit={h} done={!!todayDone[h.id]} onToggle={onToggle} index={i}/>)}
        </Card>
      </div>

      <div style={{padding:"16px 20px 0"}}>
        <SectionLabel>Tip dne</SectionLabel>
        <ActivitySuggestion activitiesDone={activitiesDone||[]}/>
      </div>

      {allDone&&(
        <div style={{padding:"16px 20px 0",animation:"fadeUp 0.4s ease"}}>
          <Card style={{background:`${C.yellow}22`,border:`1px solid ${C.yellow}44`}} pad="22px">
            <div style={{textAlign:"center"}}><div style={{fontSize:52}}>✨</div><div style={{fontSize:20,fontWeight:700,color:C.label,marginTop:10,letterSpacing:"-0.3px"}}>Všechny mise splněny!</div><div style={{fontSize:14,color:C.label2,marginTop:4}}>Výborný den! 🎉</div></div>
          </Card>
        </div>
      )}

      <div style={{padding:"16px 20px 0"}}>
        <SectionLabel>Hodnocení dne</SectionLabel>
        <DayRating todayKey={getTodayKey()}/>
      </div>
    </div>
  );
}

// ─── PROGRESS TAB ─────────────────────────────────────────────────────────────
function ProgressTab({totalStars,habits,doneMap,activitiesDoneMap}){
  const todayKey=getTodayKey();
  const todayDone=doneMap[todayKey]||{};
  const acts=(() =>{try{const s=localStorage.getItem(ACTIVITIES_KEY);return s?JSON.parse(s):DEFAULT_ACTIVITIES;}catch{return DEFAULT_ACTIVITIES;}})();
  const todayActDone=activitiesDoneMap?activitiesDoneMap[todayKey]||[]:[];
  const earnedHabitToday=habits.filter(h=>todayDone[h.id]).reduce((s,h)=>s+h.xp,0);
  const earnedActToday=todayActDone.reduce((s,id)=>{const a=acts.find(x=>x.id===id);return s+(a?.xp||0);},0);
  const earnedToday=earnedHabitToday+earnedActToday;
  const level=Math.floor(totalStars/20)+1;
  const levelXP=totalStars%20;
  // Build day data for calendar
  const getDayData=(date)=>{
    const k=`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    const habs=getHabits(date);
    const dn=doneMap[k]||{};
    const habitDone=habs.filter(h=>dn[h.id]).length;
    const habitTotal=habs.length;
    const actKey=`activities_done_${k}`;
    const actDone=(() =>{try{return JSON.parse(localStorage.getItem(actKey)||"[]");}catch{return[];}})();
    const noteKey=`note_${k}`;
    const note=localStorage.getItem(noteKey)||"";
    return{habitDone,habitTotal,actCount:actDone.length,score:habitTotal>0?(habitDone/habitTotal):0,note};
  };
  return(
    <div style={{padding:"20px 20px 32px",display:"flex",flexDirection:"column",gap:16}}>
      <Card style={{background:C.g5,boxShadow:`0 8px 28px ${C.yellow}55`}} pad="22px">
        <div style={{display:"flex",alignItems:"center",gap:16}}>
          <div style={{width:58,height:58,borderRadius:18,background:"rgba(255,255,255,0.25)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:30}}>✨</div>
          <div style={{flex:1}}>
            <div style={{fontSize:13,color:"rgba(90,50,0,0.65)",fontWeight:600}}>CELKOVÉ BODY</div>
            <div style={{fontSize:26,fontWeight:700,color:"#3a2000",letterSpacing:"-0.5px"}}>Stupeň {level}</div>
            <div style={{height:6,borderRadius:3,background:"rgba(0,0,0,0.15)",marginTop:8,overflow:"hidden"}}><div style={{height:"100%",width:`${(levelXP/20)*100}%`,background:"rgba(255,255,255,0.7)",borderRadius:3,transition:"width 0.5s"}}/></div>
            <div style={{fontSize:12,color:"rgba(90,50,0,0.55)",marginTop:4}}>{levelXP}/20 Bodů do další úrovně</div>
          </div>
        </div>
      </Card>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        {[
          {label:"Body dnes",    value:earnedToday,          icon:"⚡", color:C.yellow},
          {label:"Rekord",     value:getDailyRecord(),     icon:"🏆", color:C.orange},
          {label:"Série dní",  value:getStreak(),           icon:"🔥", color:C.red},
          {label:"Stupeň",     value:level,                icon:"🏅", color:C.green},
        ].map((s,i)=>(
          <Card key={i} pad="18px"><div style={{fontSize:26,marginBottom:8}}>{s.icon}</div><div style={{fontSize:24,fontWeight:700,color:s.color,letterSpacing:"-0.5px"}}>{s.value}</div><div style={{fontSize:12,color:C.label2,fontWeight:500,marginTop:2}}>{s.label}</div></Card>
        ))}
      </div>
      <ActivityCalendar getDayData={getDayData}/>
      <div>
        <SectionLabel>Sbírka bodů</SectionLabel>
        <Card>{totalStars===0?<div style={{textAlign:"center",color:C.label3,fontSize:14,fontWeight:500,padding:"8px 0"}}>Začni svoji výpravu! 🚀</div>:<div style={{display:"flex",flexWrap:"wrap",gap:3}}>{Array.from({length:Math.min(totalStars,60)}).map((_,i)=><span key={i} style={{fontSize:18}}>⭐</span>)}{totalStars>60&&<span style={{fontSize:13,color:C.yellow,fontWeight:700,alignSelf:"center"}}>+{totalStars-60}</span>}</div>}</Card>
      </div>
    </div>
  );
}


// ─── FOOD TIPS & NUTRITION ────────────────────────────────────────────────────
function NutritionFactCard(){
  const fact=NUTRITION_FACTS[getDayIndex()%NUTRITION_FACTS.length];
  const [revealed,setRevealed]=useState(false);
  return(
    <div>
      <SectionLabel>🔬 Výživa dne</SectionLabel>
      <button onClick={()=>setRevealed(v=>!v)} style={{width:"100%",background:"none",border:"none",padding:0,cursor:"pointer",textAlign:"left"}}>
        <Card style={{background:`linear-gradient(135deg,${fact.color}18,${fact.color}08)`,border:`1.5px solid ${fact.color}30`,transition:"all 0.3s"}} pad="18px 20px">
          <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:revealed?0:0}}>
            <div style={{width:56,height:56,borderRadius:18,background:fact.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,flexShrink:0,boxShadow:`0 6px 20px ${fact.color}55`}}>{fact.emoji}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:10,fontWeight:700,color:fact.color,textTransform:"uppercase",letterSpacing:"1px",marginBottom:2}}>⚡ Superschopnost</div>
              <div style={{fontSize:16,fontWeight:800,color:fact.color,marginBottom:2}}>{fact.superpower}</div>
              <div style={{fontSize:13,fontWeight:600,color:C.label}}>{fact.nutrient}</div>
            </div>
            <div style={{fontSize:20,color:revealed?fact.color:C.label3,transition:"transform 0.2s",transform:revealed?"rotate(180deg)":"rotate(0deg)"}}>⌄</div>
          </div>
          {revealed&&(
            <div style={{marginTop:14,animation:"fadeUp 0.25s ease"}}>
              <div style={{paddingTop:14,borderTop:`1px solid ${fact.color}25`,fontSize:14,color:C.label,lineHeight:1.7,fontWeight:500,marginBottom:14}}>
                {fact.fact}
              </div>
              <div style={{fontSize:11,fontWeight:700,color:fact.color,textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:8}}>Kde to najdeš</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {fact.foods.map((f,i)=>(
                  <span key={i} style={{background:fact.color+"18",border:`1px solid ${fact.color}30`,borderRadius:20,padding:"4px 10px",fontSize:12,fontWeight:600,color:fact.color}}>{f}</span>
                ))}
              </div>
            </div>
          )}
        </Card>
      </button>
    </div>
  );
}

function MealTipsCard(){
  const birthDate=localStorage.getItem("child_birth")||"2018-05-10";
  const tips=getMealTipsForAge(birthDate);
  if(!tips) return(
    <div>
      <SectionLabel>🍽️ Tipy na jídlo</SectionLabel>
      <Card style={{background:`${C.blue}10`,border:`1px solid ${C.blue}25`}} pad="18px 20px">
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <span style={{fontSize:32}}>🎂</span>
          <div>
            <div style={{fontSize:15,fontWeight:700,color:C.label,marginBottom:3}}>Zadej datum narození</div>
            <div style={{fontSize:13,color:C.label2,lineHeight:1.5}}>V záložce Profil zadej datum narození a dostaneš tipy na jídlo přizpůsobené věku!</div>
          </div>
        </div>
      </Card>
    </div>
  );

  // Show rotating tip based on day
  const tipIdx=getDayIndex()%tips.tips.length;
  const tip=tips.tips[tipIdx];
  return(
    <div>
      <SectionLabel>🍽️ Tip na jídlo dne</SectionLabel>
      <Card style={{background:`linear-gradient(135deg,${tips.color}15,${tips.color}05)`,border:`1.5px solid ${tips.color}30`}} pad="18px 20px">
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
          <span style={{fontSize:22}}>{tips.emoji}</span>
          <div style={{fontSize:11,fontWeight:700,color:tips.color,textTransform:"uppercase",letterSpacing:"0.8px"}}>{tips.group} · Tip dne</div>
        </div>
        <div style={{display:"flex",gap:12,alignItems:"flex-start",marginBottom:12}}>
          <span style={{fontSize:24,flexShrink:0}}>{tip.icon}</span>
          <div style={{fontSize:15,color:C.label,lineHeight:1.65,fontWeight:500}}>{tip.text}</div>
        </div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {tips.tips.map((t,i)=>(
            <div key={i} style={{width:8,height:8,borderRadius:"50%",background:i===tipIdx?tips.color:C.label4}}/>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── FOOD TAB ─────────────────────────────────────────────────────────────────
function FoodTab(){
  const todayKey=getTodayKey();
  const storageKey=`food_log_${todayKey}`;
  const [entries,setEntries]=useState(()=>{try{return JSON.parse(localStorage.getItem(storageKey)||"[]");}catch{return[];}});
  const [analyzing,setAnalyzing]=useState(false);
  const [showDrink,setShowDrink]=useState(false);
  const [showManual,setShowManual]=useState(false);
  const [manualFood,setManualFood]=useState("");
  const [selDrink,setSelDrink]=useState(DRINK_OPTIONS[0]);
  const [drinkMl,setDrinkMl]=useState(200);
  const [analyzeErr,setAnalyzeErr]=useState("");
  const photoRef=useRef();
  useEffect(()=>{localStorage.setItem(storageKey,JSON.stringify(entries));},[entries,storageKey]);
  const totalCal=entries.filter(e=>e.type==="food").reduce((s,e)=>s+(e.calories||0),0);
  const totalWater=entries.filter(e=>e.type==="drink").reduce((s,e)=>s+(e.ml||0),0);
  const waterGoal=1500;
  const addEntry=entry=>setEntries(prev=>[{id:Date.now(),time:new Date().toLocaleTimeString("cs",{hour:"2-digit",minute:"2-digit"}),...entry},...prev]);
  const removeEntry=id=>setEntries(prev=>prev.filter(e=>e.id!==id));
  const analyzePhoto=async(file)=>{
    setAnalyzing(true);setAnalyzeErr("");
    try{
      const b64=await new Promise((res,rej)=>{const r=new FileReader();r.onload=ev=>res(ev.target.result.split(",")[1]);r.onerror=rej;r.readAsDataURL(file);});
      const resp=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:400,messages:[{role:"user",content:[{type:"image",source:{type:"base64",media_type:file.type||"image/jpeg",data:b64}},{type:"text",text:`Výživový asistent pro 8leté dítě. Odpověz POUZE JSON:\n{"name":"název česky","emoji":"emoji","calories":číslo,"portion":"popis porce","healthScore":1-5,"healthNote":"krátká věta česky"}\nPokud to není jídlo: {"error":"Toto není jídlo"}`}]}]})});
      const data=await resp.json();
      const raw=data.content?.find(b=>b.type==="text")?.text||"{}";
      const parsed=JSON.parse(raw.replace(/```json|```/g,"").trim());
      if(parsed.error)setAnalyzeErr(parsed.error);
      else addEntry({type:"food",...parsed,emoji:parsed.emoji||"🍽️",thumb:URL.createObjectURL(file)});
    }catch{setAnalyzeErr("Nepodařilo se analyzovat – zkus znovu!");}
    setAnalyzing(false);
  };
  const handlePhoto=e=>{const f=e.target.files[0];if(f)analyzePhoto(f);e.target.value="";};
  const addManual=()=>{if(!manualFood.trim())return;addEntry({type:"food",name:manualFood.trim(),emoji:"🍽️",calories:null,portion:"?"});setManualFood("");setShowManual(false);};
  const addDrink=()=>{addEntry({type:"drink",name:selDrink.label,emoji:selDrink.emoji,ml:drinkMl});setShowDrink(false);};
  const hCol=s=>s>=4?C.green:s>=3?C.yellow:s>=2?C.orange:C.red;
  const hLbl=s=>s>=4?"Zdravé 💪":s>=3?"Dobré 👍":s>=2?"Ujde 😐":"Pozor ⚠️";
  return(
    <div style={{padding:"20px 20px 32px",display:"flex",flexDirection:"column",gap:16}}>
      <Card style={{background:C.g2,boxShadow:`0 8px 28px ${C.green}44`}} pad="22px">
        <div style={{fontSize:13,color:"rgba(255,255,255,0.75)",fontWeight:600,marginBottom:14}}>DNEŠNÍ PŘEHLED</div>
        <div style={{display:"flex",gap:12,marginBottom:16}}>
          {[{v:totalCal,u:"kcal",ic:"🔥"},{v:totalWater,u:"ml pití",ic:"💧"},{v:entries.length,u:"zápisů",ic:"📝"}].map((s,i)=>(
            <div key={i} style={{flex:1,background:"rgba(255,255,255,0.2)",borderRadius:14,padding:"12px 10px",textAlign:"center"}}>
              <div style={{fontSize:9,color:"rgba(255,255,255,0.7)",fontWeight:600}}>{s.ic}</div>
              <div style={{fontSize:22,fontWeight:700,color:"white"}}>{s.v}</div>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.75)",fontWeight:600}}>{s.u}</div>
            </div>
          ))}
        </div>
        <div style={{fontSize:12,color:"rgba(255,255,255,0.8)",fontWeight:600,marginBottom:6}}>💧 Pitný cíl {totalWater}/{waterGoal} ml</div>
        <div style={{height:6,borderRadius:3,background:"rgba(0,0,0,0.15)",overflow:"hidden"}}><div style={{height:"100%",width:`${Math.min(totalWater/waterGoal*100,100)}%`,background:"rgba(255,255,255,0.8)",borderRadius:3,transition:"width 0.5s"}}/></div>
      </Card>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
        {[{label:analyzing?"Analyzuji…":"Vyfotit jídlo",icon:analyzing?"⏳":"📷",color:C.red,onClick:()=>photoRef.current.click(),disabled:analyzing},{label:"Zapsat ručně",icon:"✏️",color:C.orange,onClick:()=>setShowManual(v=>!v)},{label:"Přidat pití",icon:"💧",color:C.blue,onClick:()=>setShowDrink(v=>!v)}].map((a,i)=>(
          <button key={i} onClick={a.onClick} disabled={a.disabled} style={{background:a.color+"18",border:`1.5px solid ${a.color}30`,borderRadius:18,padding:"16px 8px",cursor:a.disabled?"default":"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:6,opacity:a.disabled?0.5:1}}>
            {i===0&&<input ref={photoRef} type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={handlePhoto}/>}
            <span style={{fontSize:26}}>{a.icon}</span>
            <span style={{fontSize:11,fontWeight:700,color:a.color,textAlign:"center",lineHeight:1.3}}>{a.label}</span>
          </button>
        ))}
      </div>
      {analyzeErr&&<div style={{background:C.red+"12",border:`1px solid ${C.red}30`,borderRadius:14,padding:"12px 16px",fontSize:14,color:C.red,fontWeight:600}}>⚠️ {analyzeErr}</div>}
      {analyzing&&<Card><div style={{textAlign:"center",padding:"16px 0"}}><div style={{fontSize:40,marginBottom:10}}>🔍</div><div style={{fontSize:16,fontWeight:600,color:C.label}}>Analyzuji jídlo…</div><div style={{fontSize:13,color:C.label2,marginTop:4}}>Počítám kalorie 🧪</div></div></Card>}
      {showManual&&<Card style={{animation:"fadeUp 0.25s ease"}} pad="16px 18px"><div style={{fontSize:13,fontWeight:600,color:C.label2,marginBottom:10,textTransform:"uppercase",letterSpacing:"0.5px"}}>Co jsi jedl(a)?</div><div style={{display:"flex",gap:8}}><input value={manualFood} onChange={e=>setManualFood(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addManual()} placeholder="např. špagety…" style={{flex:1,height:44,borderRadius:12,border:`1.5px solid ${C.sep}`,padding:"0 14px",fontSize:15,fontWeight:500,color:C.label,outline:"none",fontFamily:"inherit"}} onFocus={e=>e.target.style.borderColor=C.blue} onBlur={e=>e.target.style.borderColor=C.sep}/><button onClick={addManual} style={{width:44,height:44,borderRadius:12,border:"none",background:C.green,color:"white",fontSize:20,cursor:"pointer"}}>✓</button></div></Card>}
      {showDrink&&<Card style={{animation:"fadeUp 0.25s ease"}} pad="16px 18px"><div style={{fontSize:13,fontWeight:600,color:C.label2,marginBottom:12,textTransform:"uppercase",letterSpacing:"0.5px"}}>Co jsi pil(a)?</div><div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>{DRINK_OPTIONS.map(d=><button key={d.id} onClick={()=>{setSelDrink(d);setDrinkMl(d.ml);}} style={{padding:"8px 12px",borderRadius:12,border:`1.5px solid ${selDrink.id===d.id?C.blue:C.sep}`,background:selDrink.id===d.id?C.blue+"18":"transparent",cursor:"pointer",fontSize:13,fontWeight:600,color:selDrink.id===d.id?C.blue:C.label2,fontFamily:"inherit"}}>{d.emoji} {d.label}</button>)}</div><div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>{[150,200,250,300,500].map(ml=><button key={ml} onClick={()=>setDrinkMl(ml)} style={{padding:"6px 12px",borderRadius:10,border:`1.5px solid ${drinkMl===ml?C.blue:C.sep}`,background:drinkMl===ml?C.blue+"18":"transparent",cursor:"pointer",fontSize:13,fontWeight:600,color:drinkMl===ml?C.blue:C.label2,fontFamily:"inherit"}}>{ml} ml</button>)}</div><button onClick={addDrink} style={{width:"100%",height:44,borderRadius:14,border:"none",background:C.blue,color:"white",fontSize:15,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>💧 Přidat {drinkMl} ml {selDrink.emoji}</button></Card>}
      <NutritionFactCard/>
      <MealTipsCard/>
      {entries.length>0&&<div><SectionLabel>Deník dne</SectionLabel><Card pad="0">{entries.map((e,i)=><div key={e.id} style={{borderBottom:i<entries.length-1?`1px solid ${C.sep}`:"none"}}>{e.type==="food"?(<div style={{display:"flex",gap:12,padding:"14px 18px",alignItems:"flex-start"}}><div style={{width:50,height:50,borderRadius:12,overflow:"hidden",flexShrink:0,background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>{e.thumb?<img src={e.thumb} style={{width:"100%",height:"100%",objectFit:"cover"}} alt=""/>:e.emoji}</div><div style={{flex:1,minWidth:0}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}><div style={{fontSize:15,fontWeight:600,color:C.label,lineHeight:1.3}}>{e.name}</div><button onClick={()=>removeEntry(e.id)} style={{background:"none",border:"none",cursor:"pointer",color:C.label3,fontSize:18,padding:"0 0 0 8px",flexShrink:0}}>×</button></div><div style={{display:"flex",gap:6,marginTop:6,flexWrap:"wrap"}}><span style={{fontSize:12,color:C.label3,fontWeight:500}}>{e.time}</span>{e.portion&&<Pill label={e.portion} color={C.label2} small/>}{e.calories&&<Pill label={`${e.calories} kcal`} color={C.orange} small/>}{e.healthScore&&<Pill label={hLbl(e.healthScore)} color={hCol(e.healthScore)} small/>}</div>{e.healthNote&&<div style={{fontSize:12,color:C.label2,marginTop:5,lineHeight:1.5,fontStyle:"italic"}}>{e.healthNote}</div>}</div></div>):(<div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 18px"}}><div style={{width:44,height:44,borderRadius:12,background:C.blue+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{e.emoji}</div><div style={{flex:1}}><div style={{fontSize:15,fontWeight:600,color:C.label}}>{e.name}</div><div style={{display:"flex",gap:8,marginTop:4}}><span style={{fontSize:12,color:C.label3}}>{e.time}</span><Pill label={`${e.ml} ml`} color={C.blue} small/></div></div><button onClick={()=>removeEntry(e.id)} style={{background:"none",border:"none",cursor:"pointer",color:C.label3,fontSize:18}}>×</button></div>)}</div>)}</Card></div>}
      {entries.length===0&&!analyzing&&<div style={{textAlign:"center",padding:"32px 0",color:C.label3}}><div style={{fontSize:48,marginBottom:12}}>🍽️</div><div style={{fontSize:15,fontWeight:600,color:C.label2}}>Zatím nic nezapsáno</div><div style={{fontSize:13,marginTop:4}}>Vyfoť jídlo nebo ho zapiš ručně!</div></div>}
    </div>
  );
}


// ─── QUIZ COMPONENT ───────────────────────────────────────────────────────────
function QuizTab(){
  const todayKey=getTodayKey();
  const storageKey=`quiz_${todayKey}`;

  const loadSaved=()=>{
    try{
      const s=JSON.parse(localStorage.getItem(storageKey));
      if(s&&typeof s==="object") return s;
    }catch{}
    return {qIdx:getDayIndex()%QUIZ_QUESTIONS.length,answered:null,score:0,total:0,streak:0};
  };

  const init=loadSaved();
  const [answered,setAnswered]=useState(init.answered??null);
  const [qIdx,setQIdx]=useState(init.qIdx??getDayIndex()%QUIZ_QUESTIONS.length);
  const [score,setScore]=useState(init.score??0);
  const [total,setTotal]=useState(init.total??0);
  const [streak,setStreak]=useState(init.streak??0);
  const [showFun,setShowFun]=useState(init.answered!=null);

  const q=QUIZ_QUESTIONS[qIdx%QUIZ_QUESTIONS.length];
  const isCorrect=answered===q.correct;

  const save=(data)=>localStorage.setItem(storageKey,JSON.stringify(data));

  const pick=(idx)=>{
    if(answered!==null) return;
    const correct=idx===q.correct;
    const ns=correct?score+1:score;
    const nstreak=correct?streak+1:0;
    setAnswered(idx);setScore(ns);setTotal(t=>t+1);setStreak(nstreak);setShowFun(true);
    save({qIdx,answered:idx,score:ns,total:total+1,streak:nstreak});
  };

  const next=()=>{
    const ni=(qIdx+1)%QUIZ_QUESTIONS.length;
    setQIdx(ni);setAnswered(null);setShowFun(false);
    save({qIdx:ni,answered:null,score,total,streak});
  };

  const GRADE=score===0?"🌱 Začínáš!":score<3?"📚 Učíš se":score<6?"🎯 Dobrý výkon":score<10?"🔥 Skoro expert":"🏆 Kvíz Mistr!";

  return(
    <div style={{display:"flex",flexDirection:"column",gap:14,animation:"fadeUp 0.3s ease"}}>

      {/* Score bar */}
      <Card style={{background:C.g1}} pad="18px 22px">
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
          <div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.65)",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:3}}>TVOJE SKÓRE</div>
            <div style={{fontSize:28,fontWeight:800,color:"white",letterSpacing:"-1px"}}>{score} <span style={{fontSize:14,opacity:0.6}}>/ {total} zodpovězeno</span></div>
          </div>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:32}}>{q.emoji}</div>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.6)",fontWeight:600,marginTop:2}}>{GRADE}</div>
          </div>
        </div>
        {/* streak */}
        {streak>0&&(
          <div style={{display:"flex",alignItems:"center",gap:6,background:"rgba(255,255,255,0.15)",borderRadius:10,padding:"6px 12px",width:"fit-content"}}>
            <span style={{fontSize:14}}>🔥</span>
            <span style={{fontSize:12,fontWeight:700,color:"white"}}>{streak}× za sebou správně!</span>
          </div>
        )}
      </Card>

      {/* Question card */}
      <Card pad="22px">
        <div style={{fontSize:11,fontWeight:700,color:C.label3,textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:12}}>
          Otázka #{(qIdx%QUIZ_QUESTIONS.length)+1} z {QUIZ_QUESTIONS.length}
        </div>
        <div style={{fontSize:17,fontWeight:700,color:C.label,lineHeight:1.5,marginBottom:20}}>
          {q.q}
        </div>

        {/* Answers */}
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {q.answers.map((a,i)=>{
            const isAns=answered===i;
            const isRight=i===q.correct;
            let bg=C.bg, border=C.sep, col=C.label, icon=null;
            if(answered!==null){
              if(isRight){bg=C.green+"18";border=C.green;col=C.green;icon="✓";}
              else if(isAns&&!isRight){bg=C.red+"18";border=C.red;col=C.red;icon="✗";}
              else{bg="transparent";border=C.sep;col=C.label3;}
            }
            return(
              <button key={i} onClick={()=>pick(i)} disabled={answered!==null}
                style={{
                  display:"flex",alignItems:"center",gap:12,
                  padding:"14px 16px",borderRadius:16,
                  border:`2px solid ${border}`,background:bg,
                  cursor:answered===null?"pointer":"default",
                  textAlign:"left",fontFamily:"inherit",
                  transform:isAns&&answered!==null?"scale(1.02)":"scale(1)",
                  transition:"all 0.25s cubic-bezier(0.34,1.56,0.64,1)",
                  animation:isAns?`popIn 0.3s ease`:undefined,
                }}>
                <div style={{
                  width:28,height:28,borderRadius:9,flexShrink:0,
                  background:answered===null?C.label4+"80":isRight?C.green:isAns?C.red:C.label4+"40",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:12,fontWeight:800,color:answered===null?"white":isRight||isAns?"white":C.label3,
                  transition:"background 0.2s",
                }}>{icon||String.fromCharCode(65+i)}</div>
                <span style={{fontSize:15,fontWeight:600,color:col,flex:1,transition:"color 0.2s"}}>{a}</span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Fun fact after answer */}
      {showFun&&(
        <Card style={{
          background:isCorrect?`${C.green}12`:`${C.orange}12`,
          border:`1.5px solid ${isCorrect?C.green:C.orange}30`,
          animation:"fadeUp 0.3s ease",
        }} pad="18px 20px">
          <div style={{fontSize:22,marginBottom:8}}>{isCorrect?"🎉":"💡"}</div>
          <div style={{fontSize:15,fontWeight:700,color:isCorrect?C.green:C.orange,marginBottom:6}}>
            {isCorrect?"Správně! Věděl jsi to!":"Správná odpověď: "+q.answers[q.correct]}
          </div>
          <div style={{fontSize:14,color:C.label,lineHeight:1.65,fontWeight:500}}>
            🤓 {q.fun}
          </div>
          <button onClick={next} style={{
            marginTop:14,width:"100%",height:46,borderRadius:14,
            border:"none",background:isCorrect?C.green:C.blue,
            color:"white",fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"inherit",
          }}>Další otázka →</button>
        </Card>
      )}
    </div>
  );
}

// ─── LEARN TAB ────────────────────────────────────────────────────────────────
function LearnTab(){
  const w=WORDS[getDayIndex()%WORDS.length];
  const f=FACTS[getDayIndex()%FACTS.length];
  const [revealed,setRevealed]=useState(false);
  const [activeTab,setActiveTab]=useState("word");
  return(
    <div style={{padding:"20px 20px 32px"}}>
      <div style={{display:"flex",background:"rgba(118,118,128,0.12)",borderRadius:12,padding:2,marginBottom:20}}>
        {[{id:"word",label:"📖 Slovo"},{id:"fact",label:"🔭 Fakt"},{id:"quiz",label:"🧠 Kvíz"}].map(t=>(
          <button key={t.id} onClick={()=>{setActiveTab(t.id);setRevealed(false);}} style={{flex:1,padding:"8px",borderRadius:10,border:"none",background:activeTab===t.id?"white":"transparent",fontSize:13,fontWeight:600,color:activeTab===t.id?C.label:C.label2,cursor:"pointer",fontFamily:"inherit",boxShadow:activeTab===t.id?"0 2px 6px rgba(0,0,0,0.1)":"none",transition:"all 0.2s"}}>{t.label}</button>
        ))}
      </div>
      {activeTab==="word"&&<div style={{display:"flex",flexDirection:"column",gap:12,animation:"fadeUp 0.3s ease"}}><Card style={{background:C.g1}} pad="22px"><div style={{fontSize:12,color:"rgba(255,255,255,0.65)",fontWeight:600,marginBottom:6,letterSpacing:"0.5px"}}>SLOVO #{getDayIndex()%WORDS.length+1}</div><div style={{fontSize:32,fontWeight:700,color:"white",letterSpacing:"-0.5px",marginBottom:8}}>{w.word}</div><Pill label={w.pos} color="rgba(255,255,255,0.9)" small/></Card><Card pad="20px"><div style={{fontSize:12,fontWeight:600,color:C.blue,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:8}}>Význam</div><div style={{fontSize:16,color:C.label,lineHeight:1.6,fontWeight:500}}>{w.def}</div></Card><Card style={{borderLeft:`4px solid ${C.indigo}`,borderRadius:"0 16px 16px 0"}} pad="16px 20px"><div style={{fontSize:12,fontWeight:600,color:C.indigo,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:6}}>Příklad</div><div style={{fontSize:15,color:C.label2,fontStyle:"italic",lineHeight:1.6}}>„{w.example}"</div></Card>{!revealed?<button onClick={()=>setRevealed(true)} style={{background:"transparent",border:`2px dashed ${C.yellow}`,borderRadius:16,padding:"16px",cursor:"pointer",fontSize:14,fontWeight:600,color:C.orange,fontFamily:"inherit"}}>⚡ Odhal zábavný fakt!</button>:<Card style={{background:`${C.yellow}18`,border:`1px solid ${C.yellow}44`,animation:"fadeUp 0.3s ease"}} pad="18px 20px"><div style={{fontSize:12,fontWeight:600,color:C.orange,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:8}}>Věděl jsi, že…</div><div style={{fontSize:15,color:C.label,lineHeight:1.6,fontWeight:500}}>{w.fun}</div></Card>}</div>}
      {activeTab==="quiz"&&<QuizTab/>}
      {activeTab==="fact"&&<div style={{animation:"fadeUp 0.3s ease"}}><Card style={{background:C.g3}} pad="24px"><div style={{fontSize:12,color:"rgba(255,255,255,0.65)",fontWeight:600,marginBottom:10,letterSpacing:"0.5px"}}>VĚDECKÝ FAKT #{getDayIndex()%FACTS.length+1}</div><div style={{fontSize:56,marginBottom:14}}>{f.icon}</div><div style={{fontSize:17,color:"white",lineHeight:1.7,fontWeight:500}}>{f.text}</div></Card></div>}
    </div>
  );
}


// ─── PET SETUP ────────────────────────────────────────────────────────────────
function PetSetup(){
  const initPet=loadPet();
  const [pet,setPet]=useState(initPet);
  const [step,setStep]=useState(initPet?"done":"type");
  const [type,setType]=useState(initPet?.type||"");
  const [breed,setBreed]=useState(initPet?.breed||"");
  const [name,setName]=useState(initPet?.name||"");
  const [gender,setGender]=useState(initPet?.gender||"m");
  const [age,setAge]=useState(initPet?.age||"");

  const typeMeta=PET_TYPES.find(t=>t.id===type);
  const breedList=BREEDS[type]||[];
  const breedData=breedList.find(b=>b.id===breed)||null;
  const petMeta=pet?PET_TYPES.find(t=>t.id===pet.type):null;
  const petBreed=pet?(BREEDS[pet.type]||[]).find(b=>b.id===pet.breed):null;
  const col=typeMeta?.color||C.blue;

  const save=()=>{
    if(!type||!breed) return;
    const p={type,breed,name:name||(breedData?.label||"Mazlíček"),gender,age};
    localStorage.setItem("pet_config",JSON.stringify(p));
    setPet(p);setStep("done");
  };
  const remove=()=>{
    localStorage.removeItem("pet_config");
    setPet(null);setStep("type");setType("");setBreed("");setName("");setAge("");
  };

  // ─ DONE ────────────────────────────────────────────────────────────────────
  if(step==="done"&&pet&&petMeta) return(
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      <Card style={{background:`linear-gradient(135deg,${petMeta.color}15,${petMeta.color}05)`,border:`1.5px solid ${petMeta.color}30`}} pad="16px 18px">
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:petBreed?.care?12:0}}>
          <div style={{width:52,height:52,borderRadius:16,background:petMeta.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,flexShrink:0,boxShadow:`0 4px 16px ${petMeta.color}44`}}>{petMeta.emoji}</div>
          <div style={{flex:1}}>
            <div style={{fontSize:16,fontWeight:800,color:C.label}}>{pet.name}</div>
            <div style={{fontSize:12,color:C.label2,marginTop:1}}>{petBreed?.label||petMeta.label} · {pet.gender==="f"?"holka":"kluk"}{pet.age?` · ${pet.age} let`:""}</div>
            {petBreed&&<div style={{fontSize:10,color:petMeta.color,fontWeight:700,marginTop:3,textTransform:"uppercase",letterSpacing:"0.5px"}}>
              {petBreed.walks?`${petBreed.walks}× venčit · `:""}
              {petBreed.walk_min?`${petBreed.walk_min} min/procházka · `:""}
              {petBreed.feeds?`${petBreed.feeds}× krmení denně`:""}
            </div>}
          </div>
          <button onClick={()=>setStep("type")} style={{background:C.bg,border:`1px solid ${C.sep}`,borderRadius:10,padding:"6px 10px",fontSize:12,fontWeight:600,color:C.label2,cursor:"pointer",fontFamily:"inherit"}}>Upravit</button>
        </div>
        {petBreed?.notes&&<div style={{background:`${petMeta.color}12`,borderRadius:12,padding:"10px 12px",fontSize:12,color:C.label,lineHeight:1.6}}><strong style={{color:petMeta.color}}>💡 </strong>{petBreed.notes}</div>}
      </Card>
      {petBreed?.care&&(
        <Card pad="14px 18px">
          <div style={{fontSize:10,fontWeight:800,color:C.label2,textTransform:"uppercase",letterSpacing:"1px",marginBottom:10}}>📋 Zásady péče</div>
          {petBreed.care.map((c,i)=>(
            <div key={i} style={{display:"flex",gap:8,alignItems:"flex-start",marginBottom:6}}>
              <div style={{width:5,height:5,borderRadius:"50%",background:petMeta.color,flexShrink:0,marginTop:6}}/>
              <div style={{fontSize:12,color:C.label,lineHeight:1.55}}>{c}</div>
            </div>
          ))}
        </Card>
      )}
      <button onClick={remove} style={{height:36,borderRadius:12,border:`1.5px solid ${C.red}30`,background:"transparent",color:C.red,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Odebrat mazlíčka</button>
    </div>
  );

  // ─ STEP 1: TYPE ────────────────────────────────────────────────────────────
  if(step==="type") return(
    <Card pad="16px 18px">
      <div style={{fontSize:13,fontWeight:700,color:C.label,marginBottom:12}}>Jaké zvíře máš doma?</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:14}}>
        {PET_TYPES.map(p=>(
          <button key={p.id} onClick={()=>{setType(p.id);setBreed("");}} style={{padding:"10px 4px",borderRadius:12,border:`2px solid ${type===p.id?p.color:C.sep}`,background:type===p.id?`${p.color}15`:"transparent",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:4,transform:type===p.id?"scale(1.05)":"scale(1)",transition:"all 0.2s"}}>
            <span style={{fontSize:24}}>{p.emoji}</span>
            <span style={{fontSize:10,fontWeight:700,color:type===p.id?p.color:C.label2,textAlign:"center"}}>{p.label}</span>
          </button>
        ))}
      </div>
      {type&&<button onClick={()=>setStep("breed")} style={{width:"100%",height:44,borderRadius:14,border:"none",background:col,color:"white",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Vybrat rasu →</button>}
    </Card>
  );

  // ─ STEP 2: BREED ───────────────────────────────────────────────────────────
  if(step==="breed") return(
    <Card pad="16px 18px">
      <button onClick={()=>setStep("type")} style={{background:"none",border:"none",color:C.blue,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",padding:"0 0 10px",display:"block"}}>← Zpět</button>
      <div style={{fontSize:13,fontWeight:700,color:C.label,marginBottom:12}}>{typeMeta?.emoji} Vyber rasu</div>
      <div style={{display:"flex",flexDirection:"column",gap:6,maxHeight:340,overflowY:"auto",marginBottom:12}}>
        {breedList.map(b=>{
          const sel=breed===b.id;
          return(
            <button key={b.id} onClick={()=>setBreed(b.id)} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:12,border:`2px solid ${sel?col:C.sep}`,background:sel?`${col}12`:"transparent",cursor:"pointer",textAlign:"left",fontFamily:"inherit",transform:sel?"scale(1.01)":"scale(1)",transition:"all 0.15s"}}>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:700,color:sel?col:C.label}}>{b.label}</div>
                <div style={{fontSize:11,color:C.label3,marginTop:1}}>
                  {b.size==="S"?"Malé":b.size==="M"?"Střední":b.size==="L"?"Velké":"XL"} ·
                  {b.energy==="low"?" Klidné":b.energy==="med"?" Aktivní":b.energy==="high"?" Velmi aktivní":" Extrémně aktivní"}
                  {b.walks?` · venčit ${b.walks}×`:""}{b.walk_min?` po ${b.walk_min} min`:""}
                </div>
              </div>
              {sel&&<div style={{width:20,height:20,borderRadius:"50%",background:col,display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontSize:12,fontWeight:700,flexShrink:0}}>✓</div>}
            </button>
          );
        })}
      </div>
      {breed&&breedData?.notes&&(
        <div style={{background:`${col}10`,border:`1px solid ${col}25`,borderRadius:12,padding:"10px 14px",marginBottom:12,fontSize:12,color:C.label,lineHeight:1.6}}>
          <strong style={{color:col}}>💡 {breedData.label}: </strong>{breedData.notes}
        </div>
      )}
      {breed&&<button onClick={()=>setStep("details")} style={{width:"100%",height:44,borderRadius:14,border:"none",background:col,color:"white",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Detaily →</button>}
    </Card>
  );

  // ─ STEP 3: DETAILS ─────────────────────────────────────────────────────────
  return(
    <Card pad="16px 18px">
      <button onClick={()=>setStep("breed")} style={{background:"none",border:"none",color:C.blue,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",padding:"0 0 10px",display:"block"}}>← Zpět</button>
      <div style={{fontSize:13,fontWeight:700,color:C.label,marginBottom:12}}>Informace o mazlíčkovi</div>
      <div style={{fontSize:11,fontWeight:700,color:C.label2,textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:6}}>Jméno</div>
      <input value={name} onChange={e=>setName(e.target.value)} placeholder={breedData?.label||"Jméno…"} style={{width:"100%",height:42,borderRadius:12,border:`1.5px solid ${C.sep}`,padding:"0 14px",fontSize:15,fontWeight:500,color:C.label,outline:"none",fontFamily:"inherit",marginBottom:12,boxSizing:"border-box"}} onFocus={e=>e.target.style.borderColor=col} onBlur={e=>e.target.style.borderColor=C.sep}/>
      <div style={{fontSize:11,fontWeight:700,color:C.label2,textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:6}}>Pohlaví</div>
      <div style={{display:"flex",gap:8,marginBottom:12}}>
        {[{v:"m",l:"🐾 Kluk"},{v:"f",l:"🌸 Holka"}].map(g=>(
          <button key={g.v} onClick={()=>setGender(g.v)} style={{flex:1,height:40,borderRadius:12,border:`2px solid ${gender===g.v?col:C.sep}`,background:gender===g.v?`${col}15`:"transparent",fontFamily:"inherit",fontSize:13,fontWeight:600,color:gender===g.v?col:C.label2,cursor:"pointer"}}>{g.l}</button>
        ))}
      </div>
      <div style={{fontSize:11,fontWeight:700,color:C.label2,textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:6}}>Věk</div>
      <div style={{display:"flex",gap:6,marginBottom:18,flexWrap:"wrap"}}>
        {["<1","1","2","3","4","5","6","7","8","9","10+"].map(a=>(
          <button key={a} onClick={()=>setAge(a)} style={{height:32,padding:"0 10px",borderRadius:10,border:`1.5px solid ${age===a?col:C.sep}`,background:age===a?`${col}15`:"transparent",fontFamily:"inherit",fontSize:12,fontWeight:600,color:age===a?col:C.label2,cursor:"pointer"}}>{a}</button>
        ))}
      </div>
      <button onClick={save} style={{width:"100%",height:48,borderRadius:14,border:"none",background:col,color:"white",fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"inherit",boxShadow:`0 4px 14px ${col}40`}}>🐾 Uložit mazlíčka</button>
    </Card>
  );
}


// ─── PROFILE TAB ─────────────────────────────────────────────────────────────
function ProfileTab({childName,setChildName,profilePic,onUpload,custodyActive,setCustodyActive,totalStars,setTotalStars,onOpenAdmin}){
  const [inp,setInp]=useState(childName);
  const [birthDate,setBirthDate]=useState(()=>localStorage.getItem("child_birth")||"2018-05-10");
  const today=new Date();
  const nextFriday=new Date(today);nextFriday.setDate(today.getDate()+((5-today.getDay()+7)%7||7));
  return(
    <div style={{padding:"20px 20px 32px",display:"flex",flexDirection:"column",gap:20}}>
      <Card>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:12,padding:"8px 0"}}>
          <ProfilePic src={profilePic} onUpload={onUpload} size={88}/>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:22,fontWeight:700,color:C.label,letterSpacing:"-0.3px"}}>{childName||"Trenér"}</div>
            <div style={{fontSize:14,color:C.label2,marginTop:2}}>Závodník · Stupeň {Math.floor(totalStars/20)+1}</div>
          </div>
          <div style={{fontSize:12,color:C.label3}}>Klepni na fotku pro změnu</div>
        </div>
      </Card>
      <div><SectionLabel>Jméno</SectionLabel><Card pad="0"><div style={{padding:"14px 18px",display:"flex",gap:10}}><input value={inp} onChange={e=>setInp(e.target.value)} placeholder="Zadej jméno…" style={{flex:1,height:40,borderRadius:10,border:`1.5px solid ${C.sep}`,padding:"0 12px",fontSize:16,color:C.label,outline:"none",fontFamily:"inherit"}} onFocus={e=>e.target.style.borderColor=C.blue} onBlur={e=>e.target.style.borderColor=C.sep}/><button onClick={()=>{setChildName(inp);localStorage.setItem("child_name",inp);}} style={{height:40,padding:"0 18px",borderRadius:10,border:"none",background:C.blue,color:"white",fontSize:15,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Uložit</button></div></Card></div>
      <div><SectionLabel>Datum narození</SectionLabel><Card pad="0"><div style={{padding:"14px 18px",display:"flex",gap:10,alignItems:"center"}}><span style={{fontSize:20}}>🎂</span><input type="date" value={birthDate} onChange={e=>{setBirthDate(e.target.value);localStorage.setItem("child_birth",e.target.value);}} style={{flex:1,height:40,borderRadius:10,border:`1.5px solid ${C.sep}`,padding:"0 12px",fontSize:15,color:C.label,outline:"none",fontFamily:"inherit",background:"white"}} onFocus={e=>e.target.style.borderColor=C.blue} onBlur={e=>e.target.style.borderColor=C.sep}/></div>{birthDate&&<BirthAge bd={birthDate}/>}</Card></div>
      <SectionLabel>🐾 Domácí mazlíček</SectionLabel><PetSetup/>

      <div><SectionLabel>Kde je syn?</SectionLabel><Card pad="16px 18px"><div style={{display:"flex",gap:10,marginBottom:12}}>{[{v:true,l:"🏠 Je u mě"},{v:false,l:"🗺️ Je jinde"}].map(o=><button key={String(o.v)} onClick={()=>{setCustodyActive(o.v);localStorage.setItem("pk_custody",o.v.toString());}} style={{flex:1,height:42,borderRadius:12,border:`1.5px solid ${custodyActive===o.v?C.blue:C.sep}`,background:custodyActive===o.v?C.blue+"15":"transparent",color:custodyActive===o.v?C.blue:C.label2,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s"}}>{o.l}</button>)}</div><div style={{fontSize:13,color:C.label3}}>Střídání: pátek {nextFriday.getDate()}. {MONTHS_CZ[nextFriday.getMonth()]} v 8:00</div></Card></div>

      {/* ADMIN ACCESS */}
      <div>
        <SectionLabel>Rodičovský přístup</SectionLabel>
        <Card pad="0">
          <button onClick={onOpenAdmin} style={{width:"100%",display:"flex",alignItems:"center",gap:14,padding:"16px 20px",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",textAlign:"left"}}>
            <div style={{width:44,height:44,borderRadius:12,background:C.indigo+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>🔧</div>
            <div style={{flex:1}}>
              <div style={{fontSize:16,fontWeight:600,color:C.label}}>Správa aktivit</div>
              <div style={{fontSize:13,color:C.label2,marginTop:1}}>Přidat, upravit nebo skrýt aktivity</div>
            </div>
            <div style={{fontSize:18,color:C.label3}}>›</div>
          </button>
        </Card>
      </div>

      <div><SectionLabel>Data</SectionLabel><Card pad="16px 18px"><button onClick={()=>{if(window.confirm("Opravdu smazat všechny body?")){setTotalStars(0);localStorage.setItem("pk_stars","0");}}} style={{height:42,padding:"0 20px",borderRadius:12,cursor:"pointer",border:`1.5px solid ${C.red}44`,background:C.red+"10",color:C.red,fontSize:14,fontWeight:600,fontFamily:"inherit"}}>Smazat body</button></Card></div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App(){
  const today=new Date();
  const todayKey=getTodayKey();
  const habits=getHabits(today);

  const [tab,           setTab]          =useState("today");
  const [doneMap,       setDoneMap]      =useState(()=>{try{return JSON.parse(localStorage.getItem("pk_done")||"{}");}catch{return{};}});
  const [totalStars,    setTotalStars]   =useState(()=>{try{return parseInt(localStorage.getItem("pk_stars")||"0");}catch{return 0;}});
  const [custodyActive, setCustodyActive]=useState(()=>{try{return localStorage.getItem("pk_custody")==="true";}catch{return true;}});
  const [childName,     setChildName]    =useState(()=>localStorage.getItem("child_name")||"Chris");
  const [profilePic,    setProfilePic]   =useState(()=>localStorage.getItem("profile_pic")||"");
  const [celebrate,     setCelebrate]    =useState(false);
  const [showPinGate,   setShowPinGate]  =useState(false);
  const [showAdmin,     setShowAdmin]    =useState(false);

  const actDoneKey=`activities_done_${todayKey}`;
  const [activitiesDone,setActivitiesDone]=useState(()=>{try{return JSON.parse(localStorage.getItem(actDoneKey)||"[]");}catch{return[];}});

  const todayDone     =doneMap[todayKey]||{};
  const completedCount=habits.filter(h=>todayDone[h.id]).length;
  const earnedHabitXP =habits.filter(h=>todayDone[h.id]).reduce((s,h)=>s+h.xp,0);
  const allActivities =(() =>{try{const s=localStorage.getItem(ACTIVITIES_KEY);return s?JSON.parse(s):DEFAULT_ACTIVITIES;}catch{return DEFAULT_ACTIVITIES;}})();
  const earnedActXP   =activitiesDone.reduce((s,id)=>{const a=allActivities.find(x=>x.id===id);return s+(a?.xp||0);},0);
  const earnedXP      =earnedHabitXP+earnedActXP;
  const totalXP       =habits.reduce((s,h)=>s+h.xp,0);
  const allDone       =completedCount===habits.length&&habits.length>0;

  // ── Firebase sync — pouze ukládání, žádný reload ─────────────────────────
  useEffect(()=>{
    const timer = setTimeout(syncToFirebase, 2000);
    return () => clearTimeout(timer);
  }, [doneMap, totalStars, custodyActive, childName]);

  // ── Notifikace ─────────────────────────────────────────────────────────────
  useEffect(()=>{
    // Požádat o povolení
    if("Notification" in window && Notification.permission==="default"){
      Notification.requestPermission();
    }
    // Kontrola každou minutu
    const check=()=>{
      if(Notification.permission!=="granted") return;
      const now=new Date();
      const hm=`${now.getHours()}:${String(now.getMinutes()).padStart(2,"0")}`;
      const todayKey=getTodayKey();
      const done=(() => { try { return JSON.parse(localStorage.getItem("pk_done")||"{}"); } catch { return {}; } })()[todayKey]||{};
      const allH=getHabits(now);
      allH.forEach(h=>{
        const t=getHabitNotifyTime(h);
        if(!t||done[h.id]) return;
        if(t===hm){
          const sentKey=`notif_sent_${todayKey}_${h.id}`;
          if(!sessionStorage.getItem(sentKey)){
            sessionStorage.setItem(sentKey,"1");
            new Notification(`${h.emoji} ${h.label}`, {
              body:`Je čas na: ${h.label} (${t})`,
              icon:"/favicon.ico",
              tag:h.id,
            });
          }
        }
      });
    };
    check();
    const interval=setInterval(check, 60000);
    return ()=>clearInterval(interval);
  }, []);

    useEffect(()=>{localStorage.setItem("pk_done",JSON.stringify(doneMap));},[doneMap]);
  useEffect(()=>{localStorage.setItem("pk_stars",totalStars.toString());},[totalStars]);
  useEffect(()=>{localStorage.setItem(actDoneKey,JSON.stringify(activitiesDone));},[activitiesDone,actDoneKey]);

  const handleToggle=id=>{
    setDoneMap(prev=>{
      const pd=prev[todayKey]||{},was=pd[id];
      const nd={...pd,[id]:!was},nm={...prev,[todayKey]:nd};
      if(!was){setTotalStars(s=>s+1);if(habits.filter(h=>nd[h.id]).length===habits.length&&activitiesDone.length>0){setCelebrate(true);setTimeout(()=>setCelebrate(false),3000);}}
      else setTotalStars(s=>Math.max(0,s-1));
      return nm;
    });
  };

  const handleToggleActivity=id=>{
    setActivitiesDone(prev=>{
      const had=prev.includes(id);
      const next=had?prev.filter(x=>x!==id):[...prev,id];
      const a=allActivities.find(x=>x.id===id);
      if(!had&&a)setTotalStars(s=>s+1);
      if(had&&a) setTotalStars(s=>Math.max(0,s-1));
      return next;
    });
  };

  const NAV=[
    {id:"today",      icon:"home",   label:"Dnes"},
    {id:"activities", icon:"target", label:"Aktivity"},
    {id:"food",       icon:"fork",   label:"Jídlo"},
    {id:"learn",      icon:"book",   label:"Učení"},
    {id:"progress",   icon:"chart",  label:"Postup"},
    {id:"profile",    icon:"person", label:"Profil"},
  ];

  return(
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;}
        html{font-size:16px;}
        body{background:#F5F5F7;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Rounded','SF Pro Display','Inter',system-ui,sans-serif;min-height:100vh;-webkit-font-smoothing:antialiased;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes popIn{0%{transform:scale(0.4);opacity:0}70%{transform:scale(1.06)}100%{transform:scale(1);opacity:1}}
        @keyframes wobble{0%,100%{transform:rotate(-6deg)}50%{transform:rotate(6deg)}}
        @keyframes confetti{0%{transform:translateY(-20px) rotate(0);opacity:1}100%{transform:translateY(110vh) rotate(540deg);opacity:0}}
        @keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-8px)}75%{transform:translateX(8px)}}
        @keyframes shimmer{0%,100%{opacity:0;transform:translateX(-100%)} 50%{opacity:1;transform:translateX(100%)}}
        @keyframes pulse{0%,100%{transform:scale(1);opacity:0.7} 50%{transform:scale(1.12);opacity:0.3}}
        @keyframes textBreath{0%,100%{opacity:0.7;transform:scale(1)} 50%{opacity:1;transform:scale(1.015)}}
        @keyframes comicShake{0%,100%{transform:rotate(-2deg) scale(1.02)} 50%{transform:rotate(2deg) scale(1.04)}}
        button:active{opacity:0.7;}
        button{min-height:44px;min-width:44px;}
        input{font-family:inherit;}
        ::-webkit-scrollbar{display:none;}
        /* Tablet & larger: show side padding, slightly bigger text */
        @media(min-width:480px){
          .app-scroll{padding-left:max(16px,env(safe-area-inset-left));padding-right:max(16px,env(safe-area-inset-right));}
        }
        @media(min-width:600px){
          html{font-size:17px;}
        }
      `}</style>

      {showPinGate&&<PinGate onSuccess={()=>{setShowPinGate(false);setShowAdmin(true);}}/>}
      {showAdmin&&<AdminPanel onClose={()=>setShowAdmin(false)}/>}

      {celebrate&&(
        <>{Array.from({length:14}).map((_,i)=><div key={i} style={{position:"fixed",left:`${6+i*7}%`,top:0,fontSize:20,zIndex:9999,pointerEvents:"none",animation:`confetti ${1.6+Math.random()}s ease-in ${Math.random()*0.4}s both`}}>{["🎉","✨","🌟","💫","⭐"][i%5]}</div>)}
        <div style={{position:"fixed",inset:0,zIndex:9990,background:"rgba(0,0,0,0.5)",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setCelebrate(false)}>
          <div style={{background:"white",borderRadius:32,padding:"40px 44px",textAlign:"center",maxWidth:300,boxShadow:"0 32px 80px rgba(0,0,0,0.18)",animation:"popIn 0.45s cubic-bezier(0.34,1.56,0.64,1)"}}>
            <div style={{fontSize:72,lineHeight:1,marginBottom:4}}>🎯</div>
            <div style={{fontSize:24,fontWeight:700,color:C.label,marginTop:14,letterSpacing:"-0.5px"}}>Denní cíl splněn!</div>
            <div style={{fontSize:15,color:C.label2,marginTop:6,lineHeight:1.5}}>Skvělý den, pokračuj zítra!</div>
          </div>
        </div></>
      )}

      <div style={{maxWidth:600,margin:"0 auto",minHeight:"100vh",background:C.bg}}>
        <div style={{paddingBottom:80,height:"100vh",overflowY:"auto"}}>
          {tab==="today"&&<TodayTab habits={habits} todayDone={todayDone} onToggle={handleToggle} completedCount={completedCount} earnedXP={earnedXP} earnedActXP={earnedActXP} totalXP={totalXP} allDone={allDone} childName={childName} profilePic={profilePic} onUpload={p=>{setProfilePic(p);}} activitiesDone={activitiesDone}/>}
          {tab==="activities"&&<ActivitiesTab activitiesDone={activitiesDone} onToggleActivity={handleToggleActivity}/>}
          {tab==="food"&&<FoodTab/>}
          {tab==="learn"&&<LearnTab/>}
          {tab==="progress"&&<ProgressTab totalStars={totalStars} habits={habits} doneMap={doneMap} activitiesDoneMap={null}/>}
          {tab==="profile"&&<ProfileTab childName={childName} setChildName={n=>{setChildName(n);localStorage.setItem("child_name",n);}} profilePic={profilePic} onUpload={p=>{setProfilePic(p);}} custodyActive={custodyActive} setCustodyActive={setCustodyActive} totalStars={totalStars} setTotalStars={setTotalStars} onOpenAdmin={()=>setShowPinGate(true)}/>}
        </div>

        <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:600,background:"rgba(249,249,249,0.94)",backdropFilter:"blur(20px) saturate(180%)",WebkitBackdropFilter:"blur(20px) saturate(180%)",borderTop:"1px solid rgba(0,0,0,0.1)",display:"flex",zIndex:200,paddingBottom:"env(safe-area-inset-bottom,4px)"}}>
          {NAV.map(n=>{const active=tab===n.id;const col=active?C.blue:"rgba(60,60,67,0.35)";return(
            <button key={n.id} onClick={()=>setTab(n.id)} style={{flex:1,height:60,border:"none",background:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:3,position:"relative"}}>
              {active&&<div style={{position:"absolute",top:6,left:"50%",transform:"translateX(-50%)",width:28,height:28,borderRadius:"50%",background:C.blue+"14",zIndex:-1}}/>}
              <div style={{transition:"transform 0.2s cubic-bezier(0.34,1.56,0.64,1)",transform:active?"scale(1.1)":"scale(1)"}}>
                {(() => { const IC = NAV_ICONS[n.icon]; return IC ? <IC active={active} col={col}/> : null; })()}
              </div>
              <span style={{fontSize:9,fontWeight:active?600:500,color:active?C.blue:"rgba(60,60,67,0.45)",transition:"color 0.2s",letterSpacing:"0.1px"}}>{n.label}</span>
            </button>
          );})}
        </div>
      </div>
    </>
  );
}
