import { MODULE_IDS } from "../../lib/moduleIds";
import { LastUpdatedLabel } from "./LastUpdatedLabel";
import { ModuleRefreshButton } from "./ModuleRefreshButton";

type Props = {
  moduleId: (typeof MODULE_IDS)[keyof typeof MODULE_IDS];
  refreshLabel?: string;
};

export function ModuleSectionActions({ moduleId, refreshLabel }: Props) {
  return (
    <div className="module-section-actions">
      <LastUpdatedLabel moduleId={moduleId} />
      <ModuleRefreshButton moduleId={moduleId} label={refreshLabel ?? "Refresh section"} />
    </div>
  );
}
