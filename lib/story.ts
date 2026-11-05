import { Run } from "./model";
export const PEOPLE = [
  {
    name: "Dr. Mara Velez",
    role: "Agricultural director",
    initials: "MV",
    color: "#bdd58e",
  },
  {
    name: "Imani Okafor",
    role: "Chief engineer",
    initials: "IO",
    color: "#e4aa76",
  },
  {
    name: "Tomas Reed",
    role: "Civilian representative",
    initials: "TR",
    color: "#9bbdc9",
  },
];
type Option = {
  title: string;
  description: string;
  cost: string;
  consequence: string;
};
type Beat = {
  title: string;
  kicker: string;
  speaker: number;
  text: string;
  options: Option[];
};
export const BEATS: Beat[] = [
  {
    title: "The last transmission",
    kicker: "01 / KEEP THE LIGHTS ON",
    speaker: 1,
    text: "We were built to wait for the next ship. There is no next ship. We can protect the greenhouse, or keep the workshop ahead of repairs. I need your first order, Governor.",
    options: [
      {
        title: "Protect the greenhouse",
        description: "Give food production first access to electricity.",
        cost: "No upfront cost",
        consequence: "Food is safer. The workshop receives power last.",
      },
      {
        title: "Keep the workshop running",
        description:
          "Prioritize spare parts and the machinery that makes them.",
        cost: "No upfront cost",
        consequence: "Repairs are safer. Food takes the first power cuts.",
      },
      {
        title: "Share the reduction",
        description: "Give each institution a smaller power budget.",
        cost: "No upfront cost",
        consequence:
          "Lower bills, lower production. No sector gets everything.",
      },
    ],
  },
  {
    title: "A place in the queue",
    kicker: "02 / WHAT DOES SURVIVAL COST?",
    speaker: 2,
    text: "The stores still have food. Some families cannot afford it. Yesterday a child asked if their oxygen would run out when their credits did. What should I tell them?",
    options: [
      {
        title: "Guarantee basic rations",
        description:
          "The public treasury buys a third of daily essentials for everyone.",
        cost: "Ongoing public purchases",
        consequence: "Reliable access, while the treasury can afford it.",
      },
      {
        title: "Support household budgets",
        description:
          "Transfer daily credits, with the most going to new arrivals.",
        cost: "104 credits / sol while funded",
        consequence:
          "Families choose what they need; scarcity can still raise prices.",
      },
      {
        title: "Let the market allocate",
        description:
          "Preserve public funds and let wages and savings pay for goods.",
        cost: "No public spending",
        consequence: "A healthier treasury. Poorer households carry more risk.",
      },
    ],
  },
  {
    title: "Something that lasts",
    kicker: "03 / BUILD FOR TOMORROW",
    speaker: 0,
    text: "The seed archive has enough varieties for a world. Right now I would settle for water that comes back through the pipes. We have time for one major project.",
    options: [
      {
        title: "Close the water loop",
        description:
          "Build recycling that cuts household and greenhouse water demand.",
        cost: "380 credits · 8 parts · 3 sols",
        consequence: "Lower water demand and lower operating costs.",
      },
      {
        title: "Upgrade the oxygen plant",
        description: "Install efficient storage and processing equipment.",
        cost: "300 credits · 6 parts · 3 sols",
        consequence: "20% more oxygen production from the same power.",
      },
      {
        title: "Expand the workshop",
        description:
          "Let the workshop reinvest its time and existing equipment.",
        cost: "No upfront cost · 6 sols",
        consequence:
          "25% fewer available parts during construction; then 50% more capacity.",
      },
    ],
  },
  {
    title: "The payroll petition",
    kicker: "04 / CASH IS ALSO LIFE SUPPORT",
    speaker: 1,
    text: "A useful institution can fail with full shelves and an empty account. Machines need parts. People need wages. How do we keep the weakest balance sheet operating?",
    options: [
      {
        title: "Approve a working-capital grant",
        description: "Transfer money to the institution with the least cash.",
        cost: "400 public credits",
        consequence:
          "Immediate liquidity, with no goods returned to the treasury.",
      },
      {
        title: "Buy a public reserve",
        description: "Purchase its available output for future distribution.",
        cost: "Up to 220 public credits",
        consequence:
          "Support through trade. Only actual stock can be purchased.",
      },
      {
        title: "Restructure operations",
        description: "Repair procedures and renegotiate the unpaid payroll.",
        cost: "−4 wellbeing · +5 fatigue",
        consequence:
          "Reset arrears and improve its condition by 8. No new money.",
      },
    ],
  },
  {
    title: "The sound beneath the floor",
    kicker: "05 / THE BILL COMES DUE",
    speaker: 1,
    text: "The ice pump seal is going. We used to order a replacement before anyone noticed. Now every repair competes with something else we need to build.",
    options: [
      {
        title: "Authorize full maintenance",
        description:
          "Use workshop parts to restore equipment across the colony.",
        cost: "90 credits · 14 parts",
        consequence: "+20 condition to all institutions, up to 100%.",
      },
      {
        title: "Ask for one more shift",
        description: "The crew will repair what it can with overtime.",
        cost: "+18 fatigue · −3 wellbeing",
        consequence: "+11 condition. Tired workers produce less afterward.",
      },
      {
        title: "Run below capacity",
        description: "Reduce operating targets so the crew can cope.",
        cost: "Reduced production",
        consequence:
          "Lower electricity demand and 10% less capacity until the finale.",
      },
    ],
  },
  {
    title: "Twelve voices on the ridge",
    kicker: "06 / WHO GETS TO COME HOME?",
    speaker: 2,
    text: "The survey team finally reached us. Their crawler is dead. My partner is there. They know what the journey will cost us. They still asked if we were coming.",
    options: [
      {
        title: "Bring everyone home",
        description: "Send a powered crawler and a full repair team.",
        cost: "240 credits · 8 parts · up to 35 battery",
        consequence:
          "All 12 return in two sols. More people need food, water, and air.",
      },
      {
        title: "Guide them back remotely",
        description: "Provide navigation and a limited support package.",
        cost: "90 credits",
        consequence: "Eight make it back in four sols. −3 wellbeing now.",
      },
      {
        title: "Protect the settlement",
        description: "Keep the crawler and supplies at home.",
        cost: "−15 wellbeing",
        consequence:
          "Twelve people will not return. Their names remain in the record.",
      },
    ],
  },
  {
    title: "A sky without sunlight",
    kicker: "07 / THE DUST FRONT",
    speaker: 0,
    text: "Three sols of dust. The greenhouse lights look so small from outside. Whatever you built, whatever you saved—we find out now if it was enough.",
    options: [
      {
        title: "Shelter essential services",
        description:
          "Give oxygen, water, and food first claim on the reduced supply.",
        cost: "Workshop receives power last",
        consequence: "Protect life support. Spare-parts production can stall.",
      },
      {
        title: "Maintain industrial priorities",
        description: "Keep the allocation strategy you chose at the start.",
        cost: "No battery use",
        consequence:
          "Preserve your economic strategy and rely on stored essentials.",
      },
      {
        title: "Draw down the battery",
        description: "Release up to 60 stored energy each storm sol.",
        cost: "Up to 180 battery energy",
        consequence: "Soften power cuts, while stored energy lasts.",
      },
    ],
  },
  {
    title: "The first tomorrow",
    kicker: "08 / WHAT KIND OF HOME?",
    speaker: 2,
    text: "The dust is lifting. A child drew Earth on the greenhouse wall, then drew a second circle beside it. They called that one home. What do we build our first tomorrow around?",
    options: [
      {
        title: "A promise of mutual aid",
        description:
          "Add shared essential distribution and rebuild confidence.",
        cost: "Public purchases · +8 wellbeing",
        consequence: "Support access for the final three sols.",
      },
      {
        title: "One final production surge",
        description: "Push the plants and workshop to replenish reserves.",
        cost: "+8 fatigue · 15% more power requested",
        consequence:
          "15% higher capacity, if inputs and workers are available.",
      },
      {
        title: "Conserve and recover",
        description: "Reduce consumption and production while people rest.",
        cost: "15% lower essential demand · 10% lower capacity",
        consequence:
          "Buy breathing room. The ending still tests normal consumption.",
      },
    ],
  },
];
export function beatFor(r: Run): Beat {
  const chapter = Math.min(7, Math.floor(r.sol / 3));
  const beat = { ...BEATS[chapter] };
  if (chapter === 3) {
    const i = r.actors
      .slice(0, 5)
      .reduce((m, a, j) => (a.credits < r.actors[m].credits ? j : m), 0);
    beat.text = `${r.actors[i].name} has ${r.actors[i].credits} credits left. ${r.actors[i].unpaid ? "Payroll has already been missed." : "We can act before its cash runs out."} ${BEATS[3].text}`;
  }
  if (chapter === 4 && r.actors[1].condition >= 90)
    beat.text =
      "Your earlier maintenance kept the pump in good shape. That bought us choices. We can prepare the whole colony, ask for overtime, or lower the load before dust season.";
  return beat;
}
export function reaction(r: Run): { speaker: number; text: string } {
  if (r.ending)
    return {
      speaker: 0,
      text:
        r.ending === "A New Dawn"
          ? "Today we planted something we do not need to eat. I think that is how a future begins."
          : r.ending === "The Last Light"
            ? "We kept the record. If anyone ever finds this place, they will know we tried."
            : "We are still here. That matters. Tomorrow we have work to do.",
    };
  const loss = [...r.events].reverse().find((e) => e.kind === "loss");
  if (loss)
    return {
      speaker: 2,
      text: "There are names missing from the evening roll call. Please look at the life-support shortages before we advance.",
    };
  if (r.sol >= 19 && r.sol <= 21)
    return {
      speaker: 1,
      text:
        r.actors[4].shortfall > 0
          ? "The workshop is dark. Every part in storage is another repair we can still make."
          : "The workshop lights are still on. Your preparation bought us that.",
    };
  if (r.rescue_eta > 0 && r.sol >= r.rescue_eta)
    return {
      speaker: 2,
      text:
        r.rescued === 12
          ? "Twelve voices at the airlock. All of them. I will remember this."
          : "Eight came home. We have to make their survival mean something.",
    };
  if (r.wellbeing < 60)
    return {
      speaker: 2,
      text: "There are supplies on the shelves, but not every household can buy them. Look at the families’ budgets as well as the reserve meters.",
    };
  if (r.project_left > 0)
    return {
      speaker: 1,
      text: `The new project needs ${r.project_left} more sols. We are building with what we have, Governor.`,
    };
  return {
    speaker: 0,
    text:
      r.sol > 6
        ? "The next harvest is ours. The water, the power, the work—every bit of it comes from people here."
        : "I told the children we would keep the lights on. Help me keep that promise.",
  };
}
export const ENDINGS: Record<string, { subtitle: string; body: string }> = {
  "A New Dawn": {
    subtitle: "HUMANITY HAS A HOME",
    body: "The settlement can supply its essentials and hold a reserve. People have more than permission to survive: they have the means. Earth is gone. A future is not.",
  },
  "A Fragile Home": {
    subtitle: "WE ARE STILL HERE",
    body: "The airlock opens on another morning. Your colony survived, but some part of its economy still depends on luck, depleted savings, or supplies it cannot yet replace.",
  },
  "Survival at a Cost": {
    subtitle: "REMEMBER THEIR NAMES",
    body: "Humanity continues on Mars. The record also holds what it cost: the people lost, the families left behind, the promises that became too expensive to keep.",
  },
  "The Last Light": {
    subtitle: "TRANSMISSION ENDED",
    body: "The settlement could no longer guarantee life support. The record remains: what you chose, what it changed, and where a different decision might have kept the lights on.",
  },
};
export function unavailable(r: Run, option: number): string | undefined {
  const chapter = Math.floor(r.sol / 3);
  let credits = 0,
    parts = 0;
  if (chapter === 2) {
    credits = [380, 300, 0][option];
    parts = [8, 6, 0][option];
  }
  if (chapter === 3) credits = [400, 220, 0][option];
  if (chapter === 4 && option === 0) {
    credits = 90;
    parts = 14;
  }
  if (chapter === 5) {
    credits = [240, 90, 0][option];
    parts = [8, 0, 0][option];
  }
  if (r.actors[8].credits < credits)
    return `Unavailable: need ${credits} public credits`;
  if (r.actors[4].inventory[3] < parts)
    return `Unavailable: need ${parts} workshop parts`;
}
export function endingVoices(r: Run): string[] {
  return [
    r.actors[2].output >= Math.floor(r.population / 3)
      ? "The greenhouse can feed us. Next season, I want to plant flowers."
      : "The seed archive is safe. We still have to earn the next harvest.",
    r.actors[4].condition >= 80
      ? "We can make the parts that keep this place alive. That is a kind of independence."
      : "The repair list is long. Every machine we save gives the next crew a chance.",
    r.sol < r.rescue_eta
      ? "The survey team was still out there when the settlement failed."
      : r.rescued === 12
        ? "Twelve people walked back through the airlock. My partner was one of them. Thank you."
        : r.rescued > 0
          ? "Eight came home. We wrote the other four names on the habitat wall."
          : "We left twelve people on the ridge. Whatever we build here has to remember them.",
  ];
}
