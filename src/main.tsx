import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./lib/securityHeaders"; // Apply security headers

// Force Discord-style dark theme globally (visual only)
document.documentElement.classList.add("dark");
document.documentElement.style.colorScheme = "dark";

createRoot(document.getElementById("root")!).render(<App />);
