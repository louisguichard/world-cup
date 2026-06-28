import type { GroupLetter, QualificationStatus } from "../../types";

export type OfficialQualificationEntry = {
  teamId: string;
  groupId: GroupLetter;
  tier: string;
  certainty: string;
  lifeState: string;
  reasons: string[];
  engineVersion: string;
  updatedAt: number;
};

export type OfficialSliceState = {
  qualification: Record<string, OfficialQualificationEntry>;
  dataAge: Record<string, number>;
  baseChangedAt: number | null;
  applyQualificationChange: (entry: OfficialQualificationEntry) => void;
  markEntityUpdated: (entityId: string) => void;
  clearBaseChanged: () => void;
};

export const createOfficialSlice = (
  set: (fn: (state: OfficialSliceState) => Partial<OfficialSliceState>) => void
): OfficialSliceState => ({
  qualification: {},
  dataAge: {},
  baseChangedAt: null,

  applyQualificationChange: (entry) =>
    set((state) => ({
      qualification: { ...state.qualification, [entry.teamId]: entry },
      dataAge: { ...state.dataAge, [entry.teamId]: entry.updatedAt },
    })),

  markEntityUpdated: (entityId) =>
    set((state) => ({
      dataAge: { ...state.dataAge, [entityId]: Date.now() },
      baseChangedAt: Date.now(),
    })),

  clearBaseChanged: () => set(() => ({ baseChangedAt: null })),
});

export function fromQualificationStatus(
  teamId: string,
  groupId: GroupLetter,
  status: QualificationStatus
): OfficialQualificationEntry {
  return {
    teamId,
    groupId,
    tier: status.status,
    certainty: status.certainty,
    lifeState: status.lifeState,
    reasons: status.reason ? [status.reason] : [],
    engineVersion: "client-2.0",
    updatedAt: Date.now(),
  };
}
