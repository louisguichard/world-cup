import type { ScheduleConflict } from "../../lib/scheduleConflict";

type Props = {
  conflict: ScheduleConflict;
};

export function ScheduleConflictBadge({ conflict }: Props) {
  return (
    <span className="schedule-conflict-badge" title="ESPN kickoff differs from official schedule">
      Schedule: {conflict.scheduleLabel} · Live feed: {conflict.liveLabel}
    </span>
  );
}
