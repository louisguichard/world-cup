/**
 * RawEventLog — append-only store of every inbound provider payload.
 * This is the foundation for full replay from any point in time.
 * Never update, never delete.
 */

import { prisma } from "../infra/prisma.js";
import type { EntityType } from "../events/types.js";

export interface RawEventRecord {
  id: string;
  providerId: string;
  entityType: EntityType;
  externalId?: string;
  payload: unknown;
  schemaVersion: string;
  ingestedAt: Date;
}

export class RawEventLog {
  /**
   * Appends a raw provider payload to the immutable event log.
   * Returns the persisted record ID.
   */
  async append(
    providerId: string,
    entityType: EntityType,
    payload: unknown,
    options: {
      externalId?: string;
      schemaVersion?: string;
    } = {}
  ): Promise<string> {
    const record = await prisma.rawProviderEvent.create({
      data: {
        providerId,
        entityType,
        externalId: options.externalId,
        payload: payload as object,
        schemaVersion: options.schemaVersion ?? "1",
      },
    });
    return record.id;
  }

  /**
   * Reads events for replay. Returns events in chronological order.
   * Optional `since` allows replay from a specific timestamp.
   */
  async readForReplay(
    providerId: string,
    entityType: EntityType,
    since?: Date,
    limit = 1000
  ): Promise<RawEventRecord[]> {
    const records = await prisma.rawProviderEvent.findMany({
      where: {
        providerId,
        entityType,
        ...(since ? { ingestedAt: { gte: since } } : {}),
      },
      orderBy: { ingestedAt: "asc" },
      take: limit,
    });

    return records.map((r) => ({
      id: r.id,
      providerId: r.providerId,
      entityType: r.entityType as EntityType,
      externalId: r.externalId ?? undefined,
      payload: r.payload,
      schemaVersion: r.schemaVersion,
      ingestedAt: r.ingestedAt,
    }));
  }

  /**
   * Returns the count of events ingested per provider in a time window.
   * Used by the observability layer.
   */
  async countByProvider(
    since: Date
  ): Promise<Record<string, number>> {
    const rows = await prisma.rawProviderEvent.groupBy({
      by: ["providerId"],
      where: { ingestedAt: { gte: since } },
      _count: { id: true },
    });

    return Object.fromEntries(rows.map((r) => [r.providerId, r._count.id]));
  }
}
