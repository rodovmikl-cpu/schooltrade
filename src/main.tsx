import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./lib/securityHeaders"; // Apply security headers
import { initUiAnimations } from "./lib/uiAnimations";

// Force Discord-style dark theme globally (visual only)
document.documentElement.classList.add("dark");
document.documentElement.style.colorScheme = "dark";

initUiAnimations();

createRoot(document.getElementById("root")!).render(<App />);
