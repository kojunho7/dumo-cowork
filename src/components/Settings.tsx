import { Component, createSignal, createEffect, For, Show } from "solid-js";
import { useSettings } from "../stores/settings";
import { useAuth } from "../stores/auth";
import { fetchModels, testCoworkConnection, type CoworkModel } from "../lib/dumo-works-api";
import { useI18n } from "../i18n";
import "./Settings.css";

const Settings: Component = () => {
  const { settings, updateSetting, toggleSettings } = useSettings();
  const { authState } = useAuth();
  const [testing, setTesting] = createSignal(false);
  const [testResult, setTestResult] = createSignal<string | null>(null);
  const [serverModels, setServerModels] = createSignal<CoworkModel[]>([]);
  const [modelsLoading, setModelsLoading] = createSignal(false);
  const { t, setLocale } = useI18n();

  // Load models from dumo-works server on mount
  createEffect(async () => {
    if (authState().isAuthenticated) {
      setModelsLoading(true);
      try {
        const models = await fetchModels();
        setServerModels(models);
      } catch (e) {
        console.error("Failed to fetch models:", e);
      } finally {
        setModelsLoading(false);
      }
    }
  });

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await testCoworkConnection();
      setTestResult(result);
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      setTestResult(`Error: ${errorMsg}`);
    }
    setTesting(false);
  };

  return (
    <div class="settings">
      <div class="settings-header">
        <h2>{t("settings.title")}</h2>
        <button class="close-btn" onClick={toggleSettings}>
          {t("common.close")}
        </button>
      </div>

      <div class="settings-content">
        <div class="settings-section">
          <h3>{t("settings.serverConnection")}</h3>
          <div class="server-status">
            <span class="status-dot connected" />
            <span>{t("settings.connectedTo")}</span>
          </div>
          <Show when={authState().user}>
            <p class="hint" style={{ margin: "0.5rem 0 0" }}>
              {(() => {
                const user = authState().user;
                if (!user) return "";
                if (user.displayName === user.email) {
                  return t("settings.loginInfo", { name: user.displayName, email: "" }).replace(" ()", "");
                }
                return t("settings.loginInfo", {
                  name: user.displayName,
                  email: user.email
                });
              })()}
            </p>
          </Show>
        </div>

        <div class="settings-section">
          <h3>{t("settings.modelSelection")}</h3>
          <Show
            when={!modelsLoading()}
            fallback={<p class="hint">{t("settings.loadingModels")}</p>}
          >
            <div class="form-group">
              <select
                class="model-select"
                value={settings().model}
                onChange={(e) => updateSetting("model", e.currentTarget.value)}
              >
                <For each={serverModels()}>
                  {(model) => (
                    <option value={model.id} selected={model.isDefault}>
                      {model.name}{model.isDefault ? t("settings.defaultModel") : ""}
                    </option>
                  )}
                </For>
              </select>
            </div>
          </Show>
        </div>

        <div class="settings-section">
          <h3>{t("settings.generationSettings")}</h3>
          <div class="form-group">
            <label for="maxTokens">{t("settings.maxTokens")}</label>
            <input
              id="maxTokens"
              type="number"
              value={settings().maxTokens}
              onInput={(e) =>
                updateSetting("maxTokens", parseInt(e.currentTarget.value) || 4096)
              }
              min={1}
              max={200000}
            />
          </div>
        </div>

        <div class="settings-section">
          <h3>{t("settings.language")}</h3>
          <div class="form-group">
            <select
              class="model-select"
              value={settings().language}
              onChange={(e) => {
                const newLang = e.currentTarget.value as "ko" | "en";
                updateSetting("language", newLang);
                setLocale(newLang);
              }}
            >
              <option value="ko">한국어</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>

        <div class="settings-section">
          <h3>{t("settings.connectionTest")}</h3>
          <div class="form-group">
            <button
              class="test-btn"
              onClick={handleTest}
              disabled={testing()}
            >
              {testing() ? t("common.testing") : t("settings.testConnectionBtn")}
            </button>
            {testResult() === "success" && (
              <span class="test-success">{t("common.success")}</span>
            )}
            {testResult() && testResult() !== "success" && (
              <span class="test-error">{testResult()}</span>
            )}
          </div>
        </div>

        <div class="settings-section">
          <h3>{t("settings.dataStorage")}</h3>
          <p class="hint" style={{ margin: 0 }}>
            {t("settings.storageInfo1")}
            <br />
            {t("settings.storageInfo2")}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Settings;
