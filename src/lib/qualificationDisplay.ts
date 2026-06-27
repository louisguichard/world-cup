import type { QualificationStatus } from "../types";
import { qualCopyFromVariant } from "./appCopy";

/** Visual + copy bucket for qualification UI (tables, badges, bentos). */
export type QualificationDisplayVariant =
  | "confirmed-qualified"
  | "projected-qualified"
  | "confirmed-eliminated"
  | "projected-eliminated"
  | "in-contention";

export type QualificationDisplay = {
  variant: QualificationDisplayVariant;
  /** Primary label, e.g. "Confirmed · Qualified" */
  label: string;
  /** Compact badge text */
  shortLabel: string;
  /** Row / chip CSS modifier */
  rowClass: string;
  /** Tooltip / helper copy */
  hint: string;
};

function isConfirmedEliminated(qual: QualificationStatus): boolean {
  return qual.status === "eliminated" || (!qual.canQualify && qual.lifeState === "eliminated");
}

function isConfirmedQualified(qual: QualificationStatus): boolean {
  return qual.status === "qualified" && qual.certainty === "confirmed";
}

function isProjectedQualified(qual: QualificationStatus): boolean {
  if (!qual.canQualify) return false;
  if (qual.status === "qualified" && qual.certainty !== "confirmed") return true;
  if (qual.status === "at_risk") return true;
  return false;
}

function isProjectedEliminated(qual: QualificationStatus): boolean {
  if (isConfirmedEliminated(qual)) return false;
  if (qual.status === "projected_out") return true;
  if (!qual.canQualify) return false;
  if (qual.status === "pending" && qual.lifeState === "alive") return true;
  return false;
}

/**
 * Universal qualification copy + styling.
 *
 * Confirmed = mathematically final (FIFA group stage locked in or no path remains).
 * Projected = live table / remaining matches can still change the outcome.
 */
export function resolveQualificationDisplay(qual: QualificationStatus): QualificationDisplay {
  if (isConfirmedQualified(qual)) {
    const copy = qualCopyFromVariant("confirmed-qualified");
    return {
      variant: "confirmed-qualified",
      label: copy.label,
      shortLabel: copy.shortLabel,
      rowClass: "qual-row--confirmed-qualified",
      hint: qual.reason ?? copy.hint,
    };
  }

  if (isConfirmedEliminated(qual)) {
    const copy = qualCopyFromVariant("confirmed-eliminated");
    return {
      variant: "confirmed-eliminated",
      label: copy.label,
      shortLabel: copy.shortLabel,
      rowClass: "qual-row--confirmed-eliminated",
      hint: qual.eliminationReason ?? copy.hint,
    };
  }

  if (isProjectedQualified(qual)) {
    const copy = qualCopyFromVariant("projected-qualified");
    return {
      variant: "projected-qualified",
      label: copy.label,
      shortLabel: copy.shortLabel,
      rowClass: "qual-row--projected-qualified",
      hint: qual.reason ?? copy.hint,
    };
  }

  if (isProjectedEliminated(qual)) {
    const copy = qualCopyFromVariant("projected-eliminated");
    return {
      variant: "projected-eliminated",
      label: copy.label,
      shortLabel: copy.shortLabel,
      rowClass: "qual-row--projected-eliminated",
      hint: qual.reason ?? copy.hint,
    };
  }

  const copy = qualCopyFromVariant("in-contention");
  return {
    variant: "in-contention",
    label: copy.label,
    shortLabel: copy.shortLabel,
    rowClass: "qual-row--in-contention",
    hint: qual.reason ?? copy.hint,
  };
}
