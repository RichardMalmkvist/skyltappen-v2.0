import InlineValidation from "./components/forms/InlineValidation";
import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import "./styles/storefrontLight.css";
import "./styles/backNavigation.css";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <InlineValidation />
    <App />
  </React.StrictMode>
);