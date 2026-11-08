import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import MerchPage from "./MerchPage";
import "./merch.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MerchPage />
  </StrictMode>,
);
