import type { AgentActivityView, AgentTurnView } from "$shared/model/agentTurnModel";

export interface TurnTraceSummary {
  steps: number;
  errors: number;
  durationLabel: string | null;
}

export type TurnActivityPlan =
  | { mode: "flat"; activities: readonly AgentActivityView[] }
  | {
      mode: "collapsed";
      collapsed: readonly AgentActivityView[];
      visible: readonly AgentActivityView[];
      summary: TurnTraceSummary;
    };

/** Codex-style: after completion, hide everything before the final response behind one summary. */
export function planTurnActivities(
  turn: Pick<AgentTurnView, "status" | "activities" | "startedAt" | "endedAt">,
  collapseTurnTrace: boolean,
): TurnActivityPlan {
  const { activities } = turn;
  if (!collapseTurnTrace || turn.status !== "completed" || activities.length === 0) {
    return { mode: "flat", activities };
  }

  let lastResponseIndex = -1;
  for (let index = activities.length - 1; index >= 0; index -= 1) {
    if (activities[index]!.type === "response") {
      lastResponseIndex = index;
      break;
    }
  }
  if (lastResponseIndex <= 0) return { mode: "flat", activities };

  const collapsed = activities.slice(0, lastResponseIndex);
  return {
    mode: "collapsed",
    collapsed,
    visible: activities.slice(lastResponseIndex),
    summary: {
      steps: collapsed.length,
      errors: countTraceErrors(collapsed),
      durationLabel: formatTurnDuration(turn.startedAt, turn.endedAt),
    },
  };
}

export function formatTraceSummaryLabel(summary: TurnTraceSummary): string {
  const parts = [summary.steps === 1 ? "1 step" : `${summary.steps} steps`];
  if (summary.errors > 0) parts.push(summary.errors === 1 ? "1 error" : `${summary.errors} errors`);
  if (summary.durationLabel) parts.push(summary.durationLabel);
  return parts.join(" · ");
}

export function formatTurnDuration(startedAt: number, endedAt?: number): string | null {
  if (endedAt === undefined || endedAt < startedAt) return null;
  const totalSeconds = Math.round((endedAt - startedAt) / 1000);
  if (totalSeconds < 1) return "<1s";
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return seconds > 0 ? `${hours}h ${minutes}m ${seconds}s` : minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  return seconds > 0 ? `${minutes}m ${String(seconds).padStart(2, "0")}s` : `${minutes}m`;
}

function countTraceErrors(activities: readonly AgentActivityView[]): number {
  let errors = 0;
  for (const activity of activities) {
    if (activity.type === "tool" && (activity.tool.isError || activity.tool.status === "error")) errors += 1;
  }
  return errors;
}
