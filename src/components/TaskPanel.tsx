import { Component, For, Show } from "solid-js";
import { Task } from "../lib/tauri-api";
import { useI18n } from "../i18n";
import "./TaskPanel.css";

interface TaskPanelProps {
  task: Task | null;
  isRunning: boolean;
  toolExecutions: ToolExecution[];
}

interface ToolExecution {
  id: number;
  tool: string;
  status: "running" | "completed" | "error";
}

const TaskPanel: Component<TaskPanelProps> = (props) => {
  const { t } = useI18n();
  const getStepIcon = (status: string) => {
    switch (status) {
      case "completed":
        return "✓";
      case "running":
        return "●";
      case "failed":
        return "✗";
      default:
        return "○";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "var(--success)";
      case "running":
        return "var(--primary)";
      case "failed":
        return "var(--error)";
      default:
        return "var(--muted-foreground)";
    }
  };

  return (
    <div class="task-panel">
      <Show
        when={props.task}
        fallback={
          <div class="task-panel-empty">
            <p>{t("taskPanel.noTask")}</p>
            <p class="hint">{t("taskPanel.startHint")}</p>
          </div>
        }
      >
        {(task) => (
          <>
            <div class="task-header">
              <div class="task-title">{task().title}</div>
              <div class={`task-status ${task().status}`}>
                {task().status === "planning" && t("taskPanel.statusPlanning")}
                {task().status === "running" && t("taskPanel.statusRunning")}
                {task().status === "completed" && t("taskPanel.statusCompleted")}
                {task().status === "failed" && t("taskPanel.statusFailed")}
              </div>
            </div>

            <div class="task-description">{task().description}</div>

            <Show when={task().plan && task().plan!.length > 0}>
              <div class="plan-section">
                <div class="plan-header">{t("taskPanel.plan")}</div>
                <div class="plan-steps">
                  <For each={task().plan}>
                    {(step) => (
                      <div class={`plan-step ${step.status}`}>
                        <span
                          class="step-icon"
                          style={{ color: getStatusColor(step.status) }}
                        >
                          {getStepIcon(step.status)}
                        </span>
                        <span class="step-number">{step.step}.</span>
                        <span class="step-description">{step.description}</span>
                      </div>
                    )}
                  </For>
                </div>
              </div>
            </Show>

            <Show when={props.toolExecutions.length > 0}>
              <div class="tools-section">
                <div class="tools-header">{t("taskPanel.tools")}</div>
                <div class="tool-list">
                  <For each={props.toolExecutions}>
                    {(tool) => (
                      <div class={`tool-item ${tool.status}`}>
                        <span class="tool-name">{tool.tool}</span>
                        <span class="tool-status-icon">
                          {tool.status === "running" && "..."}
                          {tool.status === "completed" && "✓"}
                          {tool.status === "error" && "✗"}
                        </span>
                      </div>
                    )}
                  </For>
                </div>
              </div>
            </Show>

            <Show when={props.isRunning}>
              <div class="running-indicator">
                <span class="pulse"></span>
                <span>{t("agentMain.running")}</span>
              </div>
            </Show>
          </>
        )}
      </Show>
    </div>
  );
};

export default TaskPanel;
