/** FlashLive envelope — most responses wrap payloads in `DATA`. */
export type FlashLiveEnvelope<T> = {
  DATA: T;
};

export type FlashLiveSport = {
  ID: number;
  NAME: string;
};

export type FlashLiveTransfer = {
  PLAYER_NAME?: string;
  PLAYER_ID?: string;
  FROM_TEAM_NAME?: string;
  TO_TEAM_NAME?: string;
  TRANSFER_DATE?: string;
  TRANSFER_TYPE?: string;
  FEE?: string;
};

export type FlashLiveTeamTransfersPage = {
  TRANSFERS?: FlashLiveTransfer[];
};
