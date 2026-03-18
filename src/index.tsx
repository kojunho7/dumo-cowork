import { render } from "solid-js/web";
import App from "./App";
import { I18nProvider } from "./i18n";
import "@fontsource-variable/inter";
import "pretendard/dist/web/static/pretendard.css";
import "./styles/global.css";

render(() => (
  <I18nProvider>
    <App />
  </I18nProvider>
), document.getElementById("root")!);
