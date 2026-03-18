import { Component, For, Show } from "solid-js";
import { Task } from "../lib/tauri-api";
import { useI18n } from "../i18n";
import "./TaskSidebar.css";

interface TaskSidebarProps {
  tasks: Task[];
  activeTaskId: string | null;
  onSelectTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onSettingsClick: () => void;
  onSkillsClick: () => void;
  onMCPClick: () => void;
  onLogout?: () => void;
  userName?: string;
  userEmail?: string;
}

const TaskSidebar: Component<TaskSidebarProps> = (props) => {
  const { t } = useI18n();
  const getStatusIcon = (status: string) => {
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

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return t("sidebar.today");
    } else if (days === 1) {
      return t("sidebar.yesterday");
    } else if (days < 7) {
      return t("sidebar.daysAgo", { days });
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <aside class="task-sidebar">
      <div class="sidebar-header">
        <div class="logo-container">
          <img src="/icon_512.png" alt="DUMO Cowork" class="logo-image" />
          <h1 class="app-title">DUMO Cowork</h1>
        </div>
      </div>

      <div class="task-list">
        <div class="task-list-header">{t("sidebar.tasks")}</div>
        <Show
          when={props.tasks.length > 0}
          fallback={
            <div class="no-tasks">
              <p>{t("sidebar.noTasks")}</p>
              <p class="hint">{t("sidebar.createTaskHint")}</p>
            </div>
          }
        >
          <For each={props.tasks}>
            {(task) => (
              <div
                class={`task-item ${props.activeTaskId === task.id ? "active" : ""} ${task.status}`}
                onClick={() => props.onSelectTask(task)}
              >
                <span class={`task-icon ${task.status}`}>{getStatusIcon(task.status)}</span>
                <div class="task-info">
                  <div class="task-item-title">{task.title}</div>
                  <div class="task-date">{formatDate(task.updated_at)}</div>
                </div>
                <button
                  class="task-delete-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    props.onDeleteTask(task.id);
                  }}
                  title="Delete task"
                >
                  ×
                </button>
              </div>
            )}
          </For>
        </Show>
      </div>

      <div class="sidebar-footer">
        <Show when={props.userName || props.userEmail}>
          <div class="sidebar-user">
            <span class="user-avatar">👤</span>
            <div class="user-details">
              <span class="user-name">
                {props.userName === props.userEmail && props.userEmail
                  ? props.userEmail.split('@')[0]
                  : props.userName || props.userEmail}
              </span>
              <Show when={props.userEmail}>
                <span class="user-email">{props.userEmail}</span>
              </Show>
            </div>
          </div>
        </Show>
        <button
          class="footer-btn primary-btn"
          onClick={props.onSkillsClick}
        >
          {t("sidebar.agentSkills")}
        </button>
        <button
          class="footer-btn primary-btn"
          onClick={props.onMCPClick}
        >
          {t("sidebar.mcpServers")}
        </button>
        <button class="footer-btn primary-btn" onClick={props.onSettingsClick}>
          {t("sidebar.settings")}
        </button>
        <Show when={props.onLogout}>
          <button class="footer-btn logout-btn" onClick={props.onLogout}>
            {t("sidebar.logout")}
          </button>
        </Show>
      </div>
    </aside>
  );
};

export default TaskSidebar;
