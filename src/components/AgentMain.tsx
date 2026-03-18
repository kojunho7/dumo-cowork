import { Component, Show, For, createSignal } from "solid-js";
import { Task, TaskMessage, openMultipleFoldersDialog } from "../lib/tauri-api";
import { useSettings } from "../stores/settings";
import { useI18n } from "../i18n";
import "./AgentMain.css";

interface AgentMainProps {
  onNewTask: (title: string, description: string, projectPath?: string) => void;
  onContinueTask: (message: string, projectPath?: string) => void;
  onNewConversation: () => void;
  currentText: string;
  isRunning: boolean;
  activeTask: Task | null;
  messages: TaskMessage[];
}

const AgentMain: Component<AgentMainProps> = (props) => {
  const { isConfigured, toggleSettings } = useSettings();
  const [input, setInput] = createSignal("");
  const [selectedPaths, setSelectedPaths] = createSignal<string[]>([]);
  const [showPathsPanel, setShowPathsPanel] = createSignal(false);
  const { t } = useI18n();

  // Check if we're in an existing conversation
  const isInConversation = () => props.activeTask !== null && props.messages.length > 0;

  const handleAddFolders = async () => {
    const folders = await openMultipleFoldersDialog();
    if (folders.length > 0) {
      // Add new folders (avoid duplicates)
      const existing = selectedPaths();
      const newPaths = folders.filter(f => !existing.includes(f));
      setSelectedPaths([...existing, ...newPaths]);
      setShowPathsPanel(true);
    }
  };

  const handleRemovePath = (path: string) => {
    setSelectedPaths(selectedPaths().filter(p => p !== path));
  };

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    const message = input().trim();
    if (!message || props.isRunning) return;

    // Join all selected paths with comma for Docker mounting
    const projectPath = selectedPaths().length > 0 ? selectedPaths().join(",") : undefined;

    if (isInConversation()) {
      // Continue existing conversation
      props.onContinueTask(message, projectPath);
    } else {
      // Create new task
      const firstLine = message.split("\n")[0];
      const title = firstLine.length > 50 ? firstLine.slice(0, 50) + "..." : firstLine;
      props.onNewTask(title, message, projectPath);
    }
    setInput("");
  };

  return (
    <div class="agent-main">
      <Show
        when={isConfigured()}
        fallback={
          <div class="agent-setup">
            <h2>{t("setup.welcome")}</h2>
            <p>{t("setup.description")}</p>
            <button onClick={toggleSettings}>{t("setup.openSettings")}</button>
          </div>
        }
      >
        <div class="agent-content">
          {/* Output area */}
          <div class="agent-output">
            <Show
              when={props.activeTask || props.currentText || props.messages.length > 0}
              fallback={
                <div class="empty-state">
                  <h2>{t("agentMain.agentMode")}</h2>
                  <p>{t("agentMain.agentDescription")}</p>
                  <div class="capabilities">
                    <div class="capability">
                      <span class="capability-icon">📁</span>
                      <span>{t("agentMain.capFiles")}</span>
                    </div>
                    <div class="capability">
                      <span class="capability-icon">🔍</span>
                      <span>{t("agentMain.capSearch")}</span>
                    </div>
                    <div class="capability">
                      <span class="capability-icon">⚡</span>
                      <span>{t("agentMain.capTerminal")}</span>
                    </div>
                    <div class="capability">
                      <span class="capability-icon">🐳</span>
                      <span>{t("agentMain.capDocker")}</span>
                    </div>
                  </div>
                </div>
              }
            >
              {/* Show saved message history */}
              <For each={props.messages}>
                {(message) => (
                  <div class={`message ${message.role}`}>
                    <div class="message-label">
                      {message.role === "user" ? t("agentMain.you") : t("agentMain.agent")}
                    </div>
                    <div class="message-content">{message.content}</div>
                  </div>
                )}
              </For>

              {/* Show current streaming text (when running a new task) */}
              <Show when={props.currentText && props.isRunning}>
                <div class="message assistant streaming">
                  <div class="message-label">{t("agentMain.agent")}</div>
                  <div class="message-content">{props.currentText}</div>
                </div>
              </Show>
            </Show>
          </div>

          {/* Input area */}
          <div class="agent-input-area">
            {/* Selected paths panel */}
            <Show when={showPathsPanel() && selectedPaths().length > 0}>
              <div class="selected-paths">
                <div class="paths-header">
                  <span class="paths-label">{t("agentMain.mountedFolders", { count: selectedPaths().length })}</span>
                  <button
                    type="button"
                    class="paths-close"
                    onClick={() => setShowPathsPanel(false)}
                    title="Hide paths"
                  >
                    ×
                  </button>
                </div>
                <div class="paths-list">
                  <For each={selectedPaths()}>
                    {(path) => (
                      <div class="path-item">
                        <span class="path-icon">📁</span>
                        <span class="path-text" title={path}>
                          {path.split("/").pop() || path}
                        </span>
                        <button
                          type="button"
                          class="path-remove"
                          onClick={() => handleRemovePath(path)}
                          disabled={props.isRunning}
                          title={`Remove ${path}`}
                        >
                          ×
                        </button>
                      </div>
                    )}
                  </For>
                </div>
              </div>
            </Show>

            <form class="agent-form" onSubmit={handleSubmit}>
              <div class="input-row">
                <textarea
                  value={input()}
                  onInput={(e) => setInput(e.currentTarget.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                  placeholder={isInConversation()
                    ? t("agentMain.continuePlaceholder")
                    : t("agentMain.newPlaceholder")
                  }
                  disabled={props.isRunning}
                  rows={3}
                />
                <div class="input-actions">
                  <button
                    type="button"
                    class={`path-toggle ${selectedPaths().length > 0 ? "active" : ""}`}
                    onClick={handleAddFolders}
                    disabled={props.isRunning}
                    title={t("agentMain.addFoldersTitle")}
                  >
                    📁
                    <Show when={selectedPaths().length > 0}>
                      <span class="path-count">{selectedPaths().length}</span>
                    </Show>
                  </button>
                  <Show when={isInConversation()}>
                    <button
                      type="button"
                      class="new-chat-btn ghost"
                      onClick={props.onNewConversation}
                      disabled={props.isRunning}
                      title={t("agentMain.startNewConversation")}
                    >
                      +
                    </button>
                  </Show>
                  <button type="submit" class="submit-btn" disabled={props.isRunning || !input().trim()}>
                    {props.isRunning ? t("agentMain.running") : isInConversation() ? t("agentMain.send") : t("agentMain.startTask")}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </Show>
    </div>
  );
};

export default AgentMain;
