import * as React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.js";
import { SimulationProvider } from "./simulationContext.js";
import { ProviderSettingsProvider } from "./providerContext.js";
import { DevApiProvider } from "./devApiContext.js";
import "./styles/base.css";

const root = document.getElementById("root");
if (!root) throw new Error("missing #root element");

createRoot(root).render(
  <React.StrictMode>
    <ProviderSettingsProvider>
      <SimulationProvider>
        <DevApiProvider>
          <App />
        </DevApiProvider>
      </SimulationProvider>
    </ProviderSettingsProvider>
  </React.StrictMode>
);
