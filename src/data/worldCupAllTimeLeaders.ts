/** FIFA World Cup all-time individual records (through 2022). */
export type AllTimeLeader = {
  rank: number;
  player: string;
  country: string;
  value: number;
  note?: string;
};

export const ALL_TIME_TOP_SCORERS: AllTimeLeader[] = [
  { rank: 1, player: "Miroslav Klose", country: "Germany", value: 16 },
  { rank: 2, player: "Ronaldo", country: "Brazil", value: 15 },
  { rank: 3, player: "Gerd Müller", country: "Germany", value: 14 },
  { rank: 4, player: "Just Fontaine", country: "France", value: 13, note: "Single tournament record (1958)" },
  { rank: 5, player: "Pelé", country: "Brazil", value: 12 },
  { rank: 5, player: "Kylian Mbappé", country: "France", value: 12 },
];

export const ALL_TIME_APPEARANCES: AllTimeLeader[] = [
  { rank: 1, player: "Lothar Matthäus", country: "Germany", value: 25 },
  { rank: 2, player: "Miroslav Klose", country: "Germany", value: 24 },
  { rank: 3, player: "Paolo Maldini", country: "Italy", value: 23 },
  { rank: 3, player: "Diego Maradona", country: "Argentina", value: 21 },
  { rank: 4, player: "Lionel Messi", country: "Argentina", value: 26, note: "Through 2022" },
];

export const ALL_TIME_TEAM_TITLES: AllTimeLeader[] = [
  { rank: 1, player: "Brazil", country: "BRA", value: 5 },
  { rank: 2, player: "Germany", country: "GER", value: 4 },
  { rank: 2, player: "Italy", country: "ITA", value: 4 },
  { rank: 4, player: "Argentina", country: "ARG", value: 3 },
  { rank: 5, player: "France", country: "FRA", value: 2 },
  { rank: 5, player: "Uruguay", country: "URU", value: 2 },
];
