/**
 * Re-exports provider Zod schemas from server BC1 implementation.
 * M0 bridge — will become canonical source in M2.
 */

export {
  EspnEventsResponseSchema,
  WcLiveResponseSchema,
  ZafronixMatchesResponseSchema,
  ClubEloResponseSchema,
  PROVIDER_SCHEMAS,
  makeSchema,
} from "../../../server/src/bc1/schemas/providerSchemas.js";

export type { ProviderId } from "../../../server/src/bc1/schemas/providerSchemas.js";
