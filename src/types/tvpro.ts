import type { TvproChannelMod } from "../config/tvproApiEndpoints";

export type TvproChannel = {
  id: string;
  name: string;
  logo?: string;
  streamUrl?: string;
  category?: string;
  group?: string;
  mod?: TvproChannelMod;
};

export type TvproTokenResult = {
  token: string | null;
  raw: unknown;
  error?: string;
};

export type TvproChannelListResult = {
  mod: TvproChannelMod;
  channels: TvproChannel[];
  source: "get" | "post";
  attribution: string;
  fetchedAt: number;
  upstreamError?: string;
};

export type TvproChannelSearchInput = {
  token: string;
  mod?: TvproChannelMod | "";
  search?: string;
};
