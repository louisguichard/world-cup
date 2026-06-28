import { useEffect, useMemo, useState } from "react";
import type { TvproChannelMod } from "../config/tvproApiEndpoints";
import {
  fetchTvproChannels,
  filterTvproChannels,
  isTvproApiDisabled,
} from "../services/TvproApiClient";
import type { TvproChannel, TvproChannelListResult } from "../types/tvpro";

const EMPTY: TvproChannelListResult = {
  mod: "tv",
  channels: [],
  source: "get",
  attribution: "",
  fetchedAt: 0,
};

export function useTvproChannels(
  mod: TvproChannelMod = "tv",
  searchQuery?: string
): TvproChannelListResult & { loading: boolean; filtered: TvproChannel[] } {
  const [result, setResult] = useState<TvproChannelListResult>(EMPTY);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isTvproApiDisabled()) {
      setResult(EMPTY);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void fetchTvproChannels(mod).then((data) => {
      if (!cancelled) {
        setResult(data);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [mod]);

  const filtered = useMemo(
    () => filterTvproChannels(result.channels, searchQuery ?? ""),
    [result.channels, searchQuery]
  );

  return { ...result, loading, filtered };
}
