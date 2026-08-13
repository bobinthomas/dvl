import * as React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.js";
import { SimulationProvider } from "./simulationContext.js";
import { ProviderSettingsProvider } from "./providerContext.js";
import { DevApiProvider } from "./devApiContext.js";
import { StandingQuestionsProvider } from "./standingQuestionsContext.js";
import { StandingBriefProvider } from "./standingBriefContext.js";
import "./styles/base.css";

const root = document.getElementById("root");
if (!root) throw new Error("missing #root element");

createRoot(root).render(
  <React.StrictMode>
    <ProviderSettingsProvider>
      <SimulationProvider>
        <StandingQuestionsProvider>
          <StandingBriefProvider>
            <DevApiProvider>
              <App />
            </DevApiProvider>
          </StandingBriefProvider>
        </StandingQuestionsProvider>
      </SimulationProvider>
    </ProviderSettingsProvider>
  </React.StrictMode>
);
