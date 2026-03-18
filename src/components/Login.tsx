import { Component, createSignal, Show } from "solid-js";
import { useAuth } from "../stores/auth";
import { useI18n } from "../i18n";
import "./Login.css";

const Login: Component = () => {
  const { login, authState } = useAuth();
  const [identifier, setIdentifier] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [error, setError] = createSignal<string | null>(null);
  const [submitting, setSubmitting] = createSignal(false);
  const { t } = useI18n();

  const handleSubmit = async (e: Event) => {
    e.preventDefault();

    const id = identifier().trim();
    const pw = password();

    if (!id) {
      setError(t("login.errorIdRequired"));
      return;
    }
    if (!pw) {
      setError(t("login.errorPwRequired"));
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      await login(id, pw);
    } catch (err) {
      setError(t("login.errorGeneral"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div class="login-screen">
      <div class="login-card">
        <div class="login-header">
          <img src="/icon_512.png" alt="DUMO Icon" class="login-logo-img" />
          <p>{t("login.subtitle")}</p>
        </div>

        <form class="login-form" onSubmit={handleSubmit}>
          <div class="login-field">
            <label for="login-id">{t("login.id")}</label>
            <input
              id="login-id"
              type="text"
              value={identifier()}
              onInput={(e) => setIdentifier(e.currentTarget.value)}
              placeholder={t("login.idPlaceholder")}
              autocomplete="username"
              disabled={submitting()}
            />
          </div>

          <div class="login-field">
            <label for="login-pw">{t("login.password")}</label>
            <input
              id="login-pw"
              type="password"
              value={password()}
              onInput={(e) => setPassword(e.currentTarget.value)}
              placeholder={t("login.passwordPlaceholder")}
              autocomplete="current-password"
              disabled={submitting()}
            />
          </div>

          <Show when={error() || authState().error}>
            <div class="login-error">
              {error() ? error() : (authState().error === "invalid_credentials" ? t("login.invalidCredentials") : t("login.errorGeneral"))}
            </div>
          </Show>

          <button
            type="submit"
            class="login-btn"
            disabled={submitting()}
          >
            {submitting() ? t("login.loggingIn") : t("login.loginBtn")}
          </button>
        </form>

      </div>
    </div>
  );
};

export default Login;
