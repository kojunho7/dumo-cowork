import { Component, For, Show, createSignal, onMount } from "solid-js";
import { getSkillsList, SkillMetadata } from "../lib/tauri-api";
import { useI18n } from "../i18n";
import "./SkillsList.css";

const SkillsList: Component = () => {
  const [skills, setSkills] = createSignal<SkillMetadata[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [selectedSkill, setSelectedSkill] = createSignal<string | null>(null);
  const { t } = useI18n();

  onMount(async () => {
    try {
      const skillsList = await getSkillsList();
      setSkills(skillsList);
    } catch (error) {
      console.error("Failed to load skills:", error);
    } finally {
      setLoading(false);
    }
  });

  return (
    <div class="skills-list">
      <div class="skills-header">
        <h2>{t("skills.title")}</h2>
        <p>{t("skills.subtitle")}</p>
      </div>

      <Show
        when={!loading()}
        fallback={
          <div class="skills-loading">
            <p>{t("skills.loading")}</p>
          </div>
        }
      >
        <Show
          when={skills().length > 0}
          fallback={
            <div class="skills-empty">
              <h3>{t("skills.emptyTitle")}</h3>
              <p>{t("skills.emptyDesc")}</p>
              <div class="skills-help">
                <h4>{t("skills.helpTitle")}</h4>
                <ol>
                  <li>{t("skills.help1")}</li>
                  <li>{t("skills.help2")}</li>
                  <li>{t("skills.help3")}</li>
                  <li>{t("skills.help4")}</li>
                  <li>{t("skills.help5")}</li>
                </ol>
              </div>
            </div>
          }
        >
          <div class="skills-grid">
            <For each={skills()}>
              {(skill) => (
                <div class="skill-card">
                  <div class="skill-header">
                    <h3 class="skill-name">{skill.name}</h3>
                    <div class="skill-badge">{t("skills.badgeActive")}</div>
                  </div>
                  <p class="skill-description">{skill.description}</p>
                  <div class="skill-actions">
                    <button
                      class="skill-button"
                      onClick={() => setSelectedSkill(skill.name)}
                    >
                      {t("skills.viewDetails")}
                    </button>
                  </div>
                </div>
              )}
            </For>
          </div>
        </Show>
      </Show>

      <Show when={selectedSkill()}>
        <div class="skill-modal-overlay" onClick={() => setSelectedSkill(null)}>
          <div class="skill-modal" onClick={(e) => e.stopPropagation()}>
            <div class="skill-modal-header">
              <h3>{t("skills.modalTitle", { name: selectedSkill() || "" })}</h3>
              <button
                class="skill-modal-close"
                onClick={() => setSelectedSkill(null)}
              >
                ×
              </button>
            </div>
            <div class="skill-modal-content">
              <p><strong>{t("skills.locationLabel")}</strong> {t("skills.locationDesc", { name: selectedSkill() || "" })}</p>
              <p><strong>{t("skills.filesLabel")}</strong></p>
              <ul>
                <li>{t("skills.file1")}</li>
                <li>{t("skills.file2")}</li>
                <li>{t("skills.file3")}</li>
              </ul>
              <p><strong>{t("skills.usageLabel")}</strong> {t("skills.usageDesc")}</p>
              <p><strong>{t("skills.pathsLabel")}</strong></p>
              <ul>
                <li>macOS: ~/Library/Application Support/dumo-cowork/skills/</li>
                <li>Windows: %APPDATA%\dumo-cowork\skills\</li>
                <li>Linux: ~/.local/share/dumo-cowork/skills/</li>
              </ul>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
};

export default SkillsList;