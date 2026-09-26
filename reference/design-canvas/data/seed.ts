import source from "./source-v2.1.json";
import movementDecision from "./movement-decision.json";
import finalShowdown from "./final-showdown-decision.json";
import decisions from "./consolidated-decisions-2026-09-26.json";
import playerModes from "./player-modes-officer.json";
import directShot from "./direct-shot-decision.json";
import boardLayout from "./location-board-layout-v1.json";
import { translateSeedBoard } from "./english";

// Reconstruct the exact previous published decision for non-destructive D1 upgrades.
const {shot_resolution: _newShotResolution,terminal_result: _newTerminalResult,...oldShowdownBody}=finalShowdown;
const previousShowdown={...oldShowdownBody,
 status:"current_design_choice_with_open_resolution_details",
 options:{...finalShowdown.options,"1":{...finalShowdown.options["1"],shot:"Each participant receives one special shot without requiring an earlier weapon or faction identification."}},
 unresolved:[
  "Declaration and resolution order for special shots, including interactions with existing Protection and other powers.",
  "The final winner rule if the showdown still produces no normal victory or produces a simultaneous tie."
 ]
};

export type Category = "system" | "role" | "question" | "custom";
export type Status = "confirmed" | "optional" | "open" | "draft";
export type Section = "core" | "roles" | "locations" | "powers" | "actions" | "rounds" | "rules" | "questions";
export type DesignData = { title: string; summary: string; details: string; category: Category; status: Status; sourceKey?: string; section?: Section };
export type DesignNode = { id: string; type: "design"; position: { x: number; y: number }; data: DesignData };
export type DesignEdge = { id: string; source: string; target: string; label?: string; type?: "smoothstep" };
export type Board = { seedVersion?: number; nodes: DesignNode[]; edges: DesignEdge[] };

const systems: [string,string,string,string,Status][] = [
  ["vision","هستهٔ تجربه","گفت‌وگوی حضوری، کارت و میز؛ موبایل برای رازها و داوری قوانین","design_vision","confirmed"],
  ["setup","بازیکنان و جناح‌ها","۸ بازیکن: ۴ آبی، ۳ قرمز، ۱ Alien","player_setup","confirmed"],
  ["round","ساختار راند","۵ راند؛ صحبت ← Hack اختیاری ← اکشن یا شلیک ← نفر بعد","round_structure","confirmed"],
  ["status","سلامت و زندان","سالم ← مصدوم ← حذف؛ زندان لایه‌ای مستقل از سلامت","health_and_status","confirmed"],
  ["locations","مکان‌ها","Room A/B، Hospital، Jail، Command Room؛ هدف‌گیری عموماً هم‌مکان","locations","confirmed"],
  ["captain","کاپیتان","انتخاب پایان راند ۱؛ Command Room؛ درخواست آزادی زندانی","captain","confirmed"],
  ["vote","رأی و زندان","اکثریت ۵۰٪ واجدان رأی و نفر اول یکتا؛ رأی موفق به زندان می‌فرستد","jail_voting","confirmed"],
  ["hack","Standard Hack","هر نفر یک آغاز در بازی؛ حداکثر دو گفت‌وگو در راند؛ سؤال بله/خیر","standard_hack","confirmed"],
  ["code","کد سفینه","چهار شمارهٔ بدون ترتیب؛ Alien داخل، Undercover خارج؛ Hacker ثبت می‌کند","code","confirmed"],
  ["shot","شلیک معمولی","راند ۴ و ۵؛ شناسایی درست جناح یک نفر پیش از شلیک به نفر دیگر","ordinary_shot","confirmed"],
  ["protection","Protection","توسط Undercover؛ از شروع راند بعد؛ نخستین حملهٔ معتبر را خنثی می‌کند","protection","confirmed"],
  ["powers","Original Powers","بستهٔ اختیاری شش قدرت؛ بازی پایه بدون آن کار می‌کند","optional_original_power_pack","optional"],
  ["victory","شرایط برد","پیروزی آبی/قرمز/Alien و مقایسهٔ قدرت در پایان راند ۵","victory","confirmed"],
  ["legacy_rules","قوانین حذف‌شده و جایگزین‌شده","راند ۶، کد ترتیبی، چت خصوصی عادی و مدل قدیمی سلامت از نسخهٔ ۲.۱ حذف شده‌اند.","confirmed_removed_or_superseded_rules","confirmed"],
];
const roles: [string,string,string,string][] = [
  ["insider","Insider","آبی • سه شمارهٔ Undercover، Alien و Cracker را بدون تفکیک می‌داند","Insider"],
  ["cracker","Cracker","آبی • دو نجات؛ دسترسی به Hospital و استثنای نجات خود","Cracker"],
  ["blue_disabler","Blue Disabler","آبی • یک اکشن مخفی آسیب‌رسان در بازی","Blue_Disabler"],
  ["supplier","Supplier","آبی • در راند ۳ به دو نفر سلاح معمولی می‌دهد","Supplier"],
  ["undercover","Undercover","قرمز • در Hack می‌تواند دروغ بگوید و Protection می‌دهد","Undercover"],
  ["hacker","Hacker","قرمز • هر راند یک Scan و ثبت کد تا پایان راند ۵","Hacker"],
  ["red_disabler","Red Disabler","قرمز • یک اکشن مخفی آسیب‌رسان؛ سلاح معمولی ندارد","Red_Disabler"],
  ["alien","Alien","مستقل • از ابتدا کل کد را می‌داند؛ پیروزی وابسته به نتیجه","Alien"],
];
const questionTitles = ["زمان حرکت","تعداد حرکت","زمان نوبت","ترتیب حل پایان راند","اکشن پس از تغییر وضعیت","انباشتن Protection","زمان ثبت کد","حالت بدون برنده","نبود نامزد کاپیتان","افشای Hack راند ۵"];
const questionLinks = ["locations","locations","round","round","status","protection","code","victory","captain","hack"];
const nodes: DesignNode[] = systems.map(([id,title,summary,key,status], i) => ({
 id, type:"design", position:{x: (i%4)*330, y:Math.floor(i/4)*245},
 data:{title,summary,details:JSON.stringify((source as Record<string,unknown>)[key],null,2),category:"system",status,sourceKey:key}
}));
roles.forEach(([id,title,summary,key],i)=>nodes.push({
 id, type:"design",position:{x:1450+(i%2)*330,y:Math.floor(i/2)*245},
 data:{title,summary,details:JSON.stringify((source.roles as Record<string,unknown>)[key],null,2),category:"role",status:"confirmed",sourceKey:`roles.${key}`}
}));
nodes.push({id:"officer",type:"design",position:{x:1450,y:980},data:{title:"Officer",summary:"آبیِ مخصوص ۹ نفر؛ از شروع بازی یک شلیک دارد، فقط یک‌بار در کل بازی و بدون حدس جناح یا شناسایی نفر سوم.",details:JSON.stringify(playerModes.officer,null,2),category:"role",status:"confirmed",sourceKey:"player-modes-officer.officer"}});
source.open_questions.forEach((q,i)=>nodes.push({
 id:`q${i+1}`,type:"design",position:{x:2180+(i%2)*330,y:Math.floor(i/2)*245},
 data:{title:questionTitles[i],summary:q.question,details:`Topic: ${q.topic}\nQuestion: ${q.question}`,category:"question",status:"open",sourceKey:`open_questions[${i}]`}
}));
const addSection = (id:string,title:string,summary:string,sourceKey:string,details:unknown,section:Section,x:number,y:number,status:Status="confirmed") => {
 nodes.push({id,type:"design",position:{x,y},data:{title,summary,details:typeof details==="string"?details:JSON.stringify(details,null,2),category:"system",status,sourceKey,section}});
};
const loc=source.locations;
[
 ["room_a","Room A","فضای حضور بازیکن سالمِ غیرکاپیتان؛ جابه‌جایی با Room B",loc.assignment_rules.Healthy_non_captain],
 ["room_b","Room B","فضای حضور بازیکن سالمِ غیرکاپیتان؛ جابه‌جایی با Room A",loc.movement.room_a_room_b],
 ["hospital","Hospital","مصدوم در پایان راند به Hospital می‌رود؛ Cracker برای نجات دسترسی دارد",loc.special_access.Cracker],
 ["jail_zone","Jail","زندان جدا از سلامت است؛ صحبت و رأی باقی می‌ماند، اکشن و شلیک متوقف می‌شود",source.health_and_status.jail],
 ["command_room","Command Room","محل کاپیتان؛ هدف حمله و اکشن‌های مستقیم قرار نمی‌گیرد",loc.special_access["Command Room"]],
].forEach(([id,title,summary,details],i)=>addSection(id as string,title as string,summary as string,`locations.${id}`,details,"locations",2800+(i%2)*330,Math.floor(i/2)*245));
addSection("location_rule","قانون هم‌مکانی","اکشن مستقیم علیه بازیکن دیگر معمولاً به حضور در مکان یکسان نیاز دارد.","locations.same_location_target_rule",loc.same_location_target_rule,"locations",3130,735);
const powerNames:Record<string,[string,string]>={
 Heavy_Shot:["Heavy Shot","نخستین شلیک معتبر معمولی را به ۲ آسیب تبدیل می‌کند."],
 Reinforced_Systems:["Reinforced Systems","یک‌بار مانع حذف ناشی از آسیب می‌شود؛ هدف مصدوم می‌ماند."],
 Final_Collision:["Final Collision","از نوبت بعد از مصدومیت، حذف خود و یک هدف هم‌مکان."],
 Silencer:["Silencer","پس از نخستین شلیک معتبر، مهاجم راند بعد صحبت و رأی ندارد."],
 Private_Link:["Private Link","پس از نخستین Hack دریافتی، ارتباط خصوصی ۳۰ ثانیه‌ای راند بعد."],
 Emergency_Override:["Emergency Override","در وضعیت مصدوم، یک Main Action معتبرِ نقش را ممکن می‌کند."]
};
addSection("power_pack","بستهٔ Original Power","اختیاری؛ اگر فعال باشد هر ۸ نفر یک کارت قدرت می‌گیرند و تکرار مجاز است.","optional_original_power_pack",source.optional_original_power_pack,"powers",3650,0,"optional");
Object.entries(source.optional_original_power_pack.powers).forEach(([key,value],i)=>{
 const [title,summary]=powerNames[key];
 addSection(`power_${key.toLowerCase()}`,title,summary,`optional_original_power_pack.powers.${key}`,value,"powers",3650+(i%2)*330,245+Math.floor(i/2)*245,"optional");
});
const actions:[string,string,string,string,unknown,Status][]=[
 ["public_talk","صحبت عمومی","ابتدای نوبت هر بازیکن؛ گفت‌وگوی حضوری محور بازی است.","round_structure.player_turn",source.round_structure.player_turn,"confirmed"],
 ["standard_hack_action","Standard Hack","بلافاصله پس از صحبت در نوبت خود؛ یک آغاز برای هر نفر، حداکثر دو گفت‌وگو در راند.","standard_hack",source.standard_hack,"confirmed"],
 ["move_action","حرکت بین اتاق‌ها","بازیکن سالم غیرکاپیتان می‌تواند بین Room A و B حرکت کند؛ زمان و تعداد هنوز باز است.","locations.movement",source.locations.movement,"open"],
 ["jail_vote_action","رأی زندان","رأی موفق بازیکن را زندانی می‌کند؛ آسیب وارد نمی‌کند.","jail_voting",source.jail_voting,"confirmed"],
 ["ordinary_shot_action","شلیک با سلاح","در راندهای ۴ و ۵، با سلاح و شناسایی درست جناحِ شخصی دیگر.","ordinary_shot",source.ordinary_shot,"confirmed"],
 ["role_main_action","Main Action نقش","اکشن اصلی عمومی یکسان وجود ندارد؛ هر نقش اکشن خود را با محدودیت سلامت، زندان و مکان دارد.","roles",source.roles,"confirmed"],
];
actions.forEach(([id,title,summary,key,details,status],i)=>addSection(id,title,summary,key,details,"actions",4450+(i%2)*330,Math.floor(i/2)*245,status));
const roundDetails=[
 ["راند ۱","پایان راند ۱ نخستین انتخاب کاپیتان انجام می‌شود.","captain.first_election",source.captain.first_election],
 ["راند ۲","راند عادی؛ ترتیب نوبت‌ها در آغاز به‌صورت تصادفی تعیین می‌شود.","round_structure.turn_order",source.round_structure.turn_order],
 ["راند ۳","Supplier اکشن توزیع دو سلاح معمولی به دو دریافت‌کنندهٔ متفاوت را دارد.","roles.Supplier",source.roles.Supplier],
 ["راند ۴","از این راند استفاده از سلاح معمولی امکان‌پذیر است.","ordinary_shot.combat_rounds",source.ordinary_shot.combat_rounds],
 ["راند ۵ · نهایی","آخرین راند؛ پنجرهٔ ثبت کد Hacker تا پایان آن باز است.","code.submission",source.code.submission],
] as const;
roundDetails.forEach(([title,summary,key,details],i)=>addSection(`round_${i+1}`,title,summary,key,details,"rounds",5250+(i%2)*330,Math.floor(i/2)*245));
addSection("turn_sequence","ترتیب نوبت","صحبت ← Hack اختیاری در همان لحظه ← Main Action و/یا شلیک در صورت مجاز بودن ← نفر بعد","round_structure.player_turn",source.round_structure.player_turn,"rounds",5250,735);
addSection("timing_open","زمان‌های نهایی‌نشده","مدت نوبت، زمان حرکت، ترتیب حل پایان راند و زمان دقیق ثبت کد هنوز پرسش باز هستند.","open_questions",source.open_questions.filter((_,i)=>[0,1,2,3,6].includes(i)),"rounds",5580,735,"open");
addSection("movement_decision","قانون حرکت · تصمیم جدید","هر نفر یک‌بار در طول راند تا قبل از رأی‌گیری حرکت می‌کند؛ Command Room فقط برای Captain است.","movement-decision-2026-09-26",movementDecision,"locations",2800,980);
addSection("final_location","مکان نهایی · رویارویی مشروط","فقط اگر بررسی برد پس از حل راند ۵ نتیجه نداد، بازماندگان به این مکان مشترک منتقل می‌شوند.","final-showdown-2026-09-26.shared_location",previousShowdown,"locations",3130,980);
addSection("showdown_option_1","رویارویی نهایی · گزینهٔ ۱","تصمیم فعلی: همهٔ حذف‌نشده‌ها، حتی مصدوم و زندانی، هرکدام یک شلیک ویژه بدون نیاز به سلاح یا تشخیص جناح دارند.","final-showdown-2026-09-26.options.1",previousShowdown.options["1"],"rounds",5250,980);
addSection("showdown_option_2","رویارویی نهایی · گزینهٔ ۲","جایگزینِ انتخاب‌نشده: فقط افراد مجاز با سلاح طبق محدودیت‌های معمول شلیک می‌کنند؛ مکان مشترک شرط هم‌مکانی را برآورده می‌کند.","final-showdown-2026-09-26.options.2",finalShowdown.options["2"],"rounds",5580,980,"draft");
addSection("turn_timer","نوبت و Hack · دو دقیقهٔ جدا","نوبت عادی ۱ دقیقه برای صحبت و اکشن است؛ درخواست Hack در همین دقیقه، گفت‌وگوی خصوصی پس از آن ۱ دقیقهٔ دیگر.","consolidated-decisions-2026-09-26.turn_timing",decisions.turn_timing,"rounds",5250,1225);
addSection("end_round_resolution","ترتیب حل پایان راند","رأی زندان ← اکشن‌ها و حمله‌ها ← نجات ← سلاح Supplier در راند ۳ ← حذف/افشا ← بررسی برد ← پرچم انتخابات Captain.","consolidated-decisions-2026-09-26.end_of_round_order",decisions.end_of_round_order,"rounds",5580,1225);
addSection("terminal_result","نتیجهٔ رویارویی نهایی","هدف‌ها مخفیانه ثبت، شلیک‌ها به ترتیب نوبت راند ۵ حل و برد دوباره بررسی می‌شود؛ اگر برنده‌ای نبود، مساوی.","final-showdown-2026-09-26.terminal_result",finalShowdown,"rounds",5250,1470);
addSection("player_modes","ترکیب‌های ۷، ۸ و ۹ نفره","هر سه ترکیب با Alien در حال تست تعادل‌اند؛ ۶ نفره حذف شده و Officer فقط در ترکیب ۹ نفره حضور دارد.","player-modes-officer.modes",playerModes,"core",0,980);
addSection("officer_shot","شلیک Officer","فقط در بازی ۹ نفره: یک تیر از شروع بازی، یک‌بار در کل مسابقه، انتخاب مستقیم هدف بدون حدس جناح.","player-modes-officer.officer",playerModes.officer,"actions",4450,735);
nodes.push({id:"archived_identification_rule",type:"design",position:{x:660,y:980},data:{title:"قانون قبلی شلیک · آرشیو",summary:"مدل کنارگذاشته‌شده: تشخیص درست جناح نفر سوم، سپس شلیک به هدف متفاوت؛ برای مقایسه حفظ شده است.",details:JSON.stringify({previousOrdinaryShot:source.ordinary_shot,previousAlienRule:source.roles.Alien.ordinary_shot_identification_rule},null,2),category:"system",status:"draft",sourceKey:"archived-v2.1.ordinary_shot"}});
addSection("direct_shot_rule","شلیک مستقیم · قانون فعلی","دارندهٔ تیر هدف هم‌مکان را مستقیم انتخاب می‌کند؛ تشخیص جناح نفر سوم و شرط سه نفر متمایز حذف شد.","direct-shot-2026-09-26",directShot,"actions",4780,735);
addSection("physical_board_layout","بورد فیزیکی · نمونهٔ اولیه","طرح A3 با Room A/B، Command، Hospital، Jail و Final Zone؛ مسیرهای قطعی و پیشنهادی تفکیک شده‌اند.","location-board-layout-v1",boardLayout,"locations",3130,1225,"draft");
nodes.push({id:"q11",type:"design",position:{x:2180,y:1225},data:{title:"بازگشت از Hospital و Jail",summary:"بازیکن پس از بهبود یا آزادی در کدام مکان قرار می‌گیرد و آیا این انتقال از سهمیهٔ حرکتش کم می‌کند؟",details:JSON.stringify(boardLayout.open_board_decisions.slice(0,2),null,2),category:"question",status:"open",sourceKey:"location-board-layout-v1.open_board_decisions[0..1]"}});
nodes.push({id:"q12",type:"design",position:{x:2510,y:1225},data:{title:"مسیر Captain به Command",summary:"آیا Captain می‌تواند از هر دو Room A و Room B مستقیماً وارد Command Room شود؟",details:JSON.stringify(boardLayout.open_board_decisions[2],null,2),category:"question",status:"open",sourceKey:"location-board-layout-v1.open_board_decisions[2]"}});
const movementUpdates:Record<string,Partial<DesignData>>={
 locations:{summary:"یک حرکت در هر راند تا پیش از رأی‌گیری؛ Room A/B و Command Room مجاز، Hospital و Jail بدون حرکت آزادانه.",details:JSON.stringify({base:source.locations,newDecision:movementDecision},null,2)},
 captain:{summary:"Captain با خروج از Command Room مقامش را حفظ می‌کند و تنها او حق ورود دوباره به آن را دارد.",details:JSON.stringify({base:source.captain,newDecision:movementDecision},null,2)},
 room_a:{summary:"یک حرکت در هر راند تا پیش از رأی‌گیری؛ امکان جابه‌جایی با Room B.",details:JSON.stringify({base:source.locations.assignment_rules.Healthy_non_captain,newDecision:movementDecision},null,2)},
 room_b:{summary:"یک حرکت در هر راند تا پیش از رأی‌گیری؛ امکان جابه‌جایی با Room A.",details:JSON.stringify({base:source.locations.movement.room_a_room_b,newDecision:movementDecision},null,2)},
 command_room:{summary:"ورود فقط برای Captain؛ با خروج مقامش حفظ می‌شود و با حرکت مجاز بعدی می‌تواند برگردد.",details:JSON.stringify({base:source.locations.special_access["Command Room"],newDecision:movementDecision},null,2)},
 hospital:{summary:"بازیکن مصدوم به Hospital می‌رود؛ حرکت آزادانه از این مکان مجاز نیست.",details:JSON.stringify({base:source.locations.special_access.Cracker,newDecision:movementDecision},null,2)},
 jail_zone:{summary:"زندانی صحبت و رأی دارد اما Main Action، شلیک و حرکت آزادانه ندارد.",details:JSON.stringify({base:source.health_and_status.jail,newDecision:movementDecision},null,2)},
 move_action:{summary:"هر بازیکنِ واجد شرایط، یک‌بار در هر راند و تا قبل از آغاز رأی‌گیری می‌تواند حرکت کند.",details:JSON.stringify({base:source.locations.movement,newDecision:movementDecision},null,2),status:"confirmed"},
 q1:{summary:"پاسخ: در طول راند، هر زمان پیش از شروع رأی‌گیری؛ فقط از Room A، Room B یا Command Room.",details:`Original question: ${source.open_questions[0].question}\nConfirmed answer:\n${JSON.stringify(movementDecision,null,2)}`,status:"confirmed"},
 q2:{summary:"پاسخ: هر بازیکن فقط یک حرکت در هر راند دارد؛ Captain برای برگشت باید از حرکت راند بعد استفاده کند.",details:`Original question: ${source.open_questions[1].question}\nConfirmed answer:\n${JSON.stringify(movementDecision,null,2)}`,status:"confirmed"},
 timing_open:{summary:"مدت نوبت، ترتیب حل پایان راند و زمان دقیق ثبت کد هنوز پرسش باز هستند.",details:JSON.stringify(source.open_questions.filter((_,i)=>[2,3,6].includes(i)),null,2)}
};
export const movementPatches=Object.fromEntries(Object.entries(movementUpdates).map(([id,changes])=>{
 const n=nodes.find(n=>n.id===id);
 if(!n)throw new Error(`Missing movement node ${id}`);
 const before={...n.data};
 n.data={...n.data,...changes};
 return [id,{before,after:n.data}];
})) as Record<string,{before:DesignData;after:DesignData}>;
const showdownUpdates:Record<string,Partial<DesignData>>={
 q8:{summary:"تصمیم فعلی: اگر پس از حل راند ۵ برنده‌ای نبود، رویارویی در مکان نهایی با شلیک ویژهٔ همهٔ حذف‌نشده‌ها اجرا می‌شود. ترتیب شلیک و تساوی نهایی باز است.",details:`Original question: ${source.open_questions[7].question}\nCurrent choice and alternative:\n${JSON.stringify(previousShowdown,null,2)}`},
 round_5:{summary:"پس از حل رویدادها و بررسی برد، اگر برنده‌ای نبود، رویارویی نهاییِ مشروط فعال می‌شود؛ Hacker تا پایان راند ۵ یک تلاش ثبت کد دارد.",details:JSON.stringify({base:source.code.submission,finalShowdown:previousShowdown},null,2)},
 victory:{summary:"شرایط برد آبی، قرمز و Alien؛ اگر بررسی پایان راند ۵ برنده نداشت، رویارویی نهایی در مکان مشترک فعال می‌شود.",details:JSON.stringify({base:source.victory,finalShowdown:previousShowdown},null,2)}
};
export const showdownPatches=Object.fromEntries(Object.entries(showdownUpdates).map(([id,changes])=>{
 const n=nodes.find(n=>n.id===id);
 if(!n)throw new Error(`Missing showdown node ${id}`);
 const before={...n.data};
 n.data={...n.data,...changes};
 return [id,{before,after:n.data}];
})) as Record<string,{before:DesignData;after:DesignData}>;
const finalUpdates:Record<string,Partial<DesignData>>={
 round:{summary:"۵ راند؛ نوبت عادی هر نفر ۱ دقیقه برای صحبت و اکشن؛ Hack در همان دقیقه درخواست و سپس ۱ دقیقه گفت‌وگوی خصوصی دارد.",details:JSON.stringify({base:source.round_structure,newDecision:decisions.turn_timing},null,2)},
 public_talk:{summary:"در یک دقیقهٔ نوبت عادی، بازیکن زمانش را بین صحبت عمومی و اکشن/شلیک مجاز تقسیم می‌کند.",details:JSON.stringify({base:source.round_structure.player_turn,newDecision:decisions.turn_timing},null,2)},
 standard_hack_action:{summary:"درخواست باید در همان دقیقهٔ نوبت عادی باشد؛ گفت‌وگوی خصوصی پس از آن، ۱ دقیقهٔ جداگانه دارد.",details:JSON.stringify({base:source.standard_hack,newTiming:decisions.turn_timing,round5Embargo:decisions.round_5_standard_hack},null,2)},
 turn_sequence:{summary:"۱ دقیقه صحبت و اکشن/شلیک؛ درخواست Hack در همان دقیقه؛ سپس در صورت درخواست، ۱ دقیقه گفت‌وگوی خصوصی و نوبت نفر بعد.",details:JSON.stringify({base:source.round_structure.player_turn,newDecision:decisions.turn_timing},null,2)},
 timing_open:{title:"زمان‌بندی · تصمیم نهایی",summary:"نوبت ۱ دقیقه، Hack یک دقیقهٔ جدا، زمان حرکت و ثبت کد و ترتیب حل پایان راند تعیین شدند.",details:JSON.stringify({movement:movementDecision,turn:decisions.turn_timing,endOfRound:decisions.end_of_round_order,code:decisions.hacker_round_5_code},null,2),status:"confirmed"},
 vote:{summary:"رأی زندان پیش از حل اکشن‌ها و حمله‌های ثبت‌شده انجام می‌شود؛ رأی موفق هدف را زندانی می‌کند.",details:JSON.stringify({base:source.jail_voting,endOfRound:decisions.end_of_round_order},null,2)},
 jail_vote_action:{summary:"ابتدای مرحلهٔ حل پایان راند؛ رأی موفق هدف را به زندان می‌فرستد و آسیب وارد نمی‌کند.",details:JSON.stringify({base:source.jail_voting,endOfRound:decisions.end_of_round_order},null,2)},
 status:{summary:"سالم ← مصدوم ← حذف؛ زندان مستقل است. اکشنِ معتبرِ ثبت‌شده با تغییر وضعیتِ بعدیِ اجراکننده لغو نمی‌شود.",details:JSON.stringify({base:source.health_and_status,registeredAction:decisions.registered_action},null,2)},
 role_main_action:{summary:"اکشن اصلی هر نقش مستقل است؛ اکشنِ معتبرِ ثبت‌شده حتی اگر اجراکننده بعداً مصدوم، زندانی یا حذف شود، در زمان مقرر حل می‌شود.",details:JSON.stringify({base:source.roles,registeredAction:decisions.registered_action},null,2)},
 protection:{summary:"Undercover می‌تواند به خود Protection بدهد؛ هر بازیکن در کل بازی فقط یک‌بار آن را دریافت می‌کند.",details:JSON.stringify({base:source.protection,newDecision:decisions.undercover_protection,finalShot:finalShowdown.shot_resolution.protection},null,2)},
 undercover:{summary:"قرمز • در Hack می‌تواند دروغ بگوید؛ به خود هم Protection می‌دهد و هر بازیکن فقط یک‌بار در بازی آن را می‌گیرد.",details:JSON.stringify({base:source.roles.Undercover,newDecision:decisions.undercover_protection},null,2)},
 hacker:{summary:"قرمز • هر راند یک Scan؛ در هر لحظه از راند ۵ فقط یک تلاش برای ثبت کد دارد.",details:JSON.stringify({base:source.roles.Hacker,newDecision:decisions.hacker_round_5_code},null,2)},
 code:{summary:"چهار شمارهٔ بدون ترتیب؛ Hacker در هر زمان از راند ۵ فقط یک‌بار می‌تواند کد را ثبت کند.",details:JSON.stringify({base:source.code,newDecision:decisions.hacker_round_5_code},null,2)},
 hack:{summary:"در هر راند محتوای Hack تا راند بعد محرمانه است؛ محتوای Hack راند ۵ تا پایان بازی قابل افشا نیست.",details:JSON.stringify({base:source.standard_hack,turn:decisions.turn_timing,round5Embargo:decisions.round_5_standard_hack},null,2)},
 round_5:{summary:"آخرین راند؛ Hacker یک تلاش ثبت کد در هر زمان آن دارد. اگر بعد از بررسی برد نتیجه‌ای نبود، رویارویی نهایی و سپس احتمال مساوی.",details:JSON.stringify({base:source.code.submission,codeDecision:decisions.hacker_round_5_code,finalShowdown},null,2)},
 victory:{summary:"پس از پایان راند ۵، در نبود برنده رویارویی نهایی فعال می‌شود؛ اگر بررسی دوباره هم برنده نداشت، مساوی.",details:JSON.stringify({base:source.victory,finalShowdown},null,2)},
 final_location:{summary:"اگر پایان راند ۵ برنده نداشت، همهٔ حذف‌نشده‌ها به مکان مشترک می‌روند؛ شلیک ویژه طبق تصمیم فعلی اجرا می‌شود.",details:JSON.stringify(finalShowdown,null,2)},
 showdown_option_1:{summary:"تصمیم فعلی: همهٔ حذف‌نشده‌ها یک شلیک ویژهٔ یک‌آسیبی ثبت می‌کنند؛ حل به ترتیب نوبت راند ۵، Protection معتبر است.",details:JSON.stringify({option:finalShowdown.options["1"],resolution:finalShowdown.shot_resolution,terminal:finalShowdown.terminal_result},null,2)},
 q3:{summary:"پاسخ: نوبت عادی ۱ دقیقه؛ درخواست Hack در همان دقیقه و گفت‌وگوی خصوصی بعد از آن ۱ دقیقهٔ جدا.",details:JSON.stringify({question:source.open_questions[2],answer:decisions.turn_timing},null,2),status:"confirmed"},
 q4:{summary:"پاسخ: رأی زندان، حل اکشن/حمله و Protection، نجات، سلاح Supplier، حذف/افشا، برد، سپس نیاز به انتخاب Captain.",details:JSON.stringify({question:source.open_questions[3],answer:decisions.end_of_round_order},null,2),status:"confirmed"},
 q5:{summary:"پاسخ: اکشنِ معتبرِ ثبت‌شده حتی پس از مصدومیت، زندان یا حذفِ اجراکننده در مرحلهٔ مقرر حل می‌شود.",details:JSON.stringify({question:source.open_questions[4],answer:decisions.registered_action},null,2),status:"confirmed"},
 q6:{summary:"پاسخ: Undercover می‌تواند به خودش Protection بدهد؛ هر بازیکن فقط یک‌بار در کل بازی آن را می‌گیرد.",details:JSON.stringify({question:source.open_questions[5],answer:decisions.undercover_protection},null,2),status:"confirmed"},
 q7:{summary:"پاسخ: Hacker در هر زمان از راند ۵ یک تلاش ثبت کد دارد.",details:JSON.stringify({question:source.open_questions[6],answer:decisions.hacker_round_5_code},null,2),status:"confirmed"},
 q8:{summary:"پاسخ: در نبود برنده پس از راند ۵، رویارویی نهاییِ گزینهٔ ۱؛ پس از شلیک‌ها، اگر باز هم هیچ شرط بردی برقرار نشد، مساوی.",details:JSON.stringify({question:source.open_questions[7],decision:finalShowdown},null,2),status:"confirmed"},
 q9:{summary:"به درخواست طراح، سناریوی نبود نامزد برای نسخهٔ فعلی کنار گذاشته شد؛ قاعدهٔ جایگزین تعریف نشده و در صورت وقوع در Playtest بازبینی می‌شود.",details:JSON.stringify({question:source.open_questions[8],decision:decisions.captain_candidate_question},null,2),status:"confirmed"},
 q10:{summary:"پاسخ: محتوای Standard Hack راند ۵ تا پایان بازی محرمانه می‌ماند؛ بازیکن می‌تواند از آن برای تصمیم خود استفاده کند.",details:JSON.stringify({question:source.open_questions[9],answer:decisions.round_5_standard_hack},null,2),status:"confirmed"}
};
export const finalPatches=Object.fromEntries(Object.entries(finalUpdates).map(([id,changes])=>{
 const n=nodes.find(n=>n.id===id);
 if(!n)throw new Error(`Missing final node ${id}`);
 const before={...n.data};
 n.data={...n.data,...changes};
 return [id,{before,after:n.data}];
})) as Record<string,{before:DesignData;after:DesignData}>;
const officerUpdates:Record<string,Partial<DesignData>>={
 setup:{summary:"۳ ترکیب در تست تعادل: ۷=۴ آبی/۲ قرمز/۱ Alien؛ ۸=۴/۳/۱؛ ۹=۵/۳/۱ با Officer؛ ۶ نفره حذف شد.",details:JSON.stringify({base:source.player_setup,newPlaytestConfigurations:playerModes},null,2)},
 shot:{summary:"شلیک معمولی در راندهای ۴ و ۵ با شناسایی جناح؛ Officer در ۹ نفره استثنائاً از راند ۱ یک شلیک بدون شناسایی دارد.",details:JSON.stringify({base:source.ordinary_shot,officerException:playerModes.officer},null,2)},
 ordinary_shot_action:{summary:"راند ۴ و ۵ با سلاح و شناسایی جناح؛ استثنا: Officer از راند ۱ یک شلیک مستقیمِ بدون حدس دارد.",details:JSON.stringify({base:source.ordinary_shot,officerException:playerModes.officer},null,2)},
 round_1:{summary:"پایان راند نخست انتخاب Captain است؛ در حالت ۹ نفره Officer از همین راند می‌تواند تنها تیرش را شلیک کند.",details:JSON.stringify({base:source.captain.first_election,officerException:playerModes.officer},null,2)}
};
export const officerPatches=Object.fromEntries(Object.entries(officerUpdates).map(([id,changes])=>{
 const n=nodes.find(n=>n.id===id);
 if(!n)throw new Error(`Missing officer node ${id}`);
 const before={...n.data};
 n.data={...n.data,...changes};
 return [id,{before,after:n.data}];
})) as Record<string,{before:DesignData;after:DesignData}>;
const updatedOfficer={...playerModes.officer,
 no_identification:"Like every shooter under the current rule, the Officer chooses a target directly without identifying a third player.",
 ordinary_shot_baseline:"One-damage direct shot under the same-location, health, Jail, Command Room, and defensive rules; Officer alone has the starting weapon and may shoot from Round 1."
};
const directShotUpdates:Record<string,Partial<DesignData>>={
 shot:{summary:"شلیک با سلاح در راند ۴ و ۵ به هدف هم‌مکان، بدون حدس جناح؛ Officer در ۹ نفره از راند ۱ یک تیر دارد.",details:JSON.stringify({previous:source.ordinary_shot,current:directShot,officer:updatedOfficer},null,2)},
 ordinary_shot_action:{summary:"هدف هم‌مکان را مستقیم انتخاب کن؛ حدس جناح و معرفی نفر سوم لازم نیست. شلیک معمولی راند ۴ و ۵؛ Officer از راند ۱.",details:JSON.stringify({previous:source.ordinary_shot,current:directShot,officer:updatedOfficer},null,2)},
 officer:{summary:"آبیِ مخصوص ۹ نفر؛ از شروع بازی فقط یک شلیک دارد. انتخاب مستقیم هدف اکنون قانون همهٔ تیراندازهاست.",details:JSON.stringify({role:updatedOfficer,currentShootingRule:directShot.current},null,2)},
 officer_shot:{summary:"فقط در بازی ۹ نفره: یک تیر از راند ۱ و یک‌بار در کل مسابقه؛ هدف‌گیری مستقیم اکنون قانون عمومی شلیک است.",details:JSON.stringify({role:updatedOfficer,currentShootingRule:directShot.current},null,2)},
 alien:{summary:"مستقل • کد کامل را از ابتدا می‌داند؛ در صورت داشتن سلاح، مانند دیگران بدون تشخیص نفر سوم شلیک می‌کند.",details:JSON.stringify({base:source.roles.Alien,shootingRule:directShot.current},null,2)},
 undercover:{summary:"قرمز • در Hack می‌تواند دروغ بگوید؛ Protection می‌دهد و سلاحش طبق شلیک مستقیمِ بدون حدس عمل می‌کند.",details:JSON.stringify({base:source.roles.Undercover,protection:decisions.undercover_protection,shootingRule:directShot.current},null,2)},
 power_heavy_shot:{summary:"نخستین شلیک معتبر معمولی را به ۲ آسیب تبدیل می‌کند؛ شاخهٔ «حدس اشتباه» از قانون فعلی حذف شده است.",details:JSON.stringify({base:source.optional_original_power_pack.powers.Heavy_Shot,currentShootingRule:directShot.current},null,2)},
 power_silencer:{summary:"پس از نخستین شلیک معتبر، مهاجم راند بعد صحبت و رأی ندارد؛ شاخهٔ «حدس اشتباه» دیگر کاربرد ندارد.",details:JSON.stringify({base:source.optional_original_power_pack.powers.Silencer,currentShootingRule:directShot.current},null,2)},
 setup:{summary:"۳ ترکیب در تست تعادل: ۷=۴/۲/۱، ۸=۴/۳/۱، ۹=۵/۳/۱؛ همه با قانون شلیک مستقیمِ جدید آزمایش می‌شوند.",details:JSON.stringify({base:source.player_setup,configurations:playerModes,shootingRule:directShot},null,2)},
 player_modes:{summary:"ترکیب‌های ۷، ۸ و ۹ نفره در تست تعادل‌اند؛ از این نسخه قانون شلیک مستقیم برای هر سه یکسان است.",details:JSON.stringify({configurations:playerModes,shootingRule:directShot},null,2)},
 legacy_rules:{summary:"قوانین کنارگذاشته‌شده: راند ۶، کد ترتیبی، چت خصوصی عادی، مدل قدیمی سلامت و شناسایی جناح نفر سوم برای شلیک.",details:JSON.stringify({base:source.confirmed_removed_or_superseded_rules,archivedShot:source.ordinary_shot,current:directShot},null,2)}
};
export const directShotPatches=Object.fromEntries(Object.entries(directShotUpdates).map(([id,changes])=>{
 const n=nodes.find(n=>n.id===id);
 if(!n)throw new Error(`Missing direct-shot node ${id}`);
 const before={...n.data};
 n.data={...n.data,...changes};
 return [id,{before,after:n.data}];
})) as Record<string,{before:DesignData;after:DesignData}>;
const pairs:[string,string,string?][] = [
 ["vision","setup"],["setup","round"],["round","status"],["round","captain"],["round","hack"],["round","shot"],
 ["status","locations"],["status","vote"],["status","victory"],["locations","hack"],["locations","shot"],["locations","protection"],
 ["captain","vote"],["code","victory"],["shot","protection"],["shot","status"],["powers","shot"],["powers","status"],
 ["insider","code"],["cracker","status"],["cracker","locations"],["blue_disabler","status"],["supplier","shot"],
 ["undercover","hack"],["undercover","protection"],["undercover","code"],["hacker","code"],["hacker","locations"],
 ["red_disabler","status"],["alien","code"],["alien","victory"],
 ...questionLinks.map((target,i)=>[`q${i+1}`,target,i===8?"کنار گذاشته‌شده":"پاسخ داده شد"] as [string,string,string])
];
const sectionPairs:[string,string,string?][]=[
 ["room_a","room_b","حرکت"],["room_b","room_a","حرکت"],["hospital","jail_zone","سلامت مستقل از زندان"],
 ["command_room","jail_zone","درخواست آزادی"],["room_a","location_rule"],["room_b","location_rule"],["hospital","location_rule"],
 ...Object.keys(powerNames).map(key=>["power_pack",`power_${key.toLowerCase()}`,"در بستهٔ اختیاری"] as [string,string,string]),
 ["public_talk","standard_hack_action","پس از صحبت"],["standard_hack_action","role_main_action","فرصت مستقل"],
 ["role_main_action","ordinary_shot_action","فرصت مستقل"],["jail_vote_action","role_main_action","محدودیت زندان"],
 ["move_action","role_main_action","محدودیت مکان"],
 ["round_1","round_2"],["round_2","round_3"],["round_3","round_4"],["round_4","round_5"],
 ["turn_sequence","round_1"],["timing_open","turn_sequence","تعیین شد"],
 ["locations","location_rule"],["powers","power_pack"],["round","turn_sequence"],
 ["hack","standard_hack_action"],["shot","ordinary_shot_action"],["vote","jail_vote_action"],
 ["q1","move_action"],["q2","move_action"],["q3","timing_open"],["q4","timing_open"],["q7","round_5"],
 ["power_heavy_shot","ordinary_shot_action"],["power_reinforced_systems","power_final_collision"],
 ["power_private_link","standard_hack_action"],["power_emergency_override","role_main_action"],
 ["legacy_rules","round","جایگزین شده"],["legacy_rules","code","جایگزین شده"],
 ["legacy_rules","status","جایگزین شده"],["legacy_rules","vote","جایگزین شده"],
 ["movement_decision","room_a"],["movement_decision","room_b"],["movement_decision","command_room"],
 ["movement_decision","hospital","حرکت آزادانه ندارد"],["movement_decision","jail_zone","حرکت آزادانه ندارد"],
 ["movement_decision","move_action"],["movement_decision","q1","پاسخ"],["movement_decision","q2","پاسخ"],
 ["round_5","showdown_option_1","اگر برنده‌ای نبود"],["round_5","showdown_option_2","گزینهٔ جایگزین"],
 ["showdown_option_1","final_location","تصمیم فعلی"],["showdown_option_2","final_location","جایگزین"],
 ["final_location","victory","بازبینی برد"],["q8","showdown_option_1","تصمیم فعلی"],["q8","showdown_option_2","جایگزین"],
 ["turn_timer","turn_sequence","زمان نوبت"],["turn_timer","standard_hack_action","درخواست و گفت‌وگو"],
 ["end_round_resolution","jail_vote_action","ابتدا"],["end_round_resolution","role_main_action","پس از رأی"],
 ["end_round_resolution","victory","بررسی برد"],["showdown_option_1","terminal_result","حل شلیک‌ها"],
 ["terminal_result","victory","بررسی دوباره"],["terminal_result","q8","پاسخ"],
 ["q10","standard_hack_action","محرمانگی راند ۵"],
 ["player_modes","setup","ترکیب‌های آزمون"],["player_modes","officer","فقط ۹ نفر"],
 ["officer","officer_shot","توانایی"],["officer_shot","round_1","از شروع بازی"],
 ["officer_shot","ordinary_shot_action","استثنای زمان و سلاح"],["officer_shot","location_rule","هم‌مکانی"],
 ["direct_shot_rule","ordinary_shot_action","قانون فعلی"],["direct_shot_rule","officer_shot","هدف‌گیری یکسان"],
 ["direct_shot_rule","alien","بدون تشخیص نفر سوم"],["direct_shot_rule","player_modes","هر سه ترکیب"],
 ["archived_identification_rule","direct_shot_rule","جایگزین شد"],["legacy_rules","archived_identification_rule","آرشیو"],
 ["physical_board_layout","room_a","مهره‌ها"],["physical_board_layout","room_b","مهره‌ها"],
 ["physical_board_layout","command_room","جایگاه Captain"],["physical_board_layout","hospital","وضعیت عمومی"],
 ["physical_board_layout","jail_zone","وضعیت عمومی"],["physical_board_layout","final_location","انتقال مشروط"],
 ["q11","physical_board_layout","نیازمند تصمیم"],["q12","physical_board_layout","نیازمند تصمیم"]
];
export const legacySeedBoard: Board = {seedVersion:8,nodes,edges:[...pairs,...sectionPairs].map(([source,target,label],i)=>({id:`e${i+1}`,source,target,label,type:"smoothstep"}))};
export const seedBoard: Board = {...translateSeedBoard(legacySeedBoard),seedVersion:9};
export const physicalBoardSeedNodeIds = new Set(["physical_board_layout","q11","q12"]);
export const directShotSeedNodeIds = new Set(["archived_identification_rule","direct_shot_rule"]);
export const officerSeedNodeIds = new Set(["officer","player_modes","officer_shot"]);
export const finalSeedNodeIds = new Set(["turn_timer","end_round_resolution","terminal_result"]);
export const showdownSeedNodeIds = new Set(["final_location","showdown_option_1","showdown_option_2"]);
export const addedSeedNodeIds = new Set(nodes.filter(n=>(n.data.section||n.id==="legacy_rules")&&n.id!=="movement_decision"&&!showdownSeedNodeIds.has(n.id)&&!finalSeedNodeIds.has(n.id)&&!officerSeedNodeIds.has(n.id)&&!directShotSeedNodeIds.has(n.id)&&!physicalBoardSeedNodeIds.has(n.id)).map(n=>n.id));
