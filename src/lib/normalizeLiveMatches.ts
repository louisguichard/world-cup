import { normalizeLiveMatchStoreWithRegistry } from "./registry";
import type { MergedMatch, Team } from "../types";

export {
  normalizeLiveMatchStoreWithRegistry as normalizeLiveMatchStore,
  normalizeLiveMatchRecordWithRegistry as normalizeLiveMatchRecord,
} from "./registry/normalizeWithRegistry";
