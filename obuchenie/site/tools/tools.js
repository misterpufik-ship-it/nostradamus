import { initCdekTool } from "./cdek.js";

const toolPanels = {
  cdek: document.querySelector("#tool-cdek")
};

const toolButtons = document.querySelectorAll(".tool-tab");

export function setTool(tool) {
  const active = toolPanels[tool] ? tool : "cdek";
  Object.entries(toolPanels).forEach(([id, panel]) => {
    panel?.classList.toggle("hidden", id !== active);
  });
  toolButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.tool === active);
  });
  if (active === "cdek") {
    initCdekTool(toolPanels.cdek);
  }
}

export function initTools() {
  toolButtons.forEach((button) => {
    button.addEventListener("click", () => setTool(button.dataset.tool));
  });
  const params = new URLSearchParams(window.location.search);
  setTool(params.get("tool") || "cdek");
}

window.initNostradamusTools = initTools;
