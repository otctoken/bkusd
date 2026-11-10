import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DAppKitProvider } from "@mysten/dapp-kit-react";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useLocation,
} from "react-router-dom";
import { useEffect } from "react";
import { dAppKit } from "./config/dapp-kit";
import { LanguageProvider, useLanguage } from "./i18n";
import { Navbar } from "./components/Navbar";
import Overview from "./pages/Overview";
import Trade from "./pages/Trade";
import FlashLoan from "./pages/FlashLoan";
import Analytics from "./pages/Analytics";
import Admin from "./pages/Admin";
import Docs from "./pages/Docs";
import "./styles.css";
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 2, refetchOnWindowFocus: false } },
});
function App() {
  const { t } = useLanguage(),
    location = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
  return (
    <>
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/mint" element={<Trade mode="mint" />} />
          <Route path="/redeem" element={<Trade mode="redeem" />} />
          <Route path="/flash-loan" element={<FlashLoan />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/docs" element={<Docs />} />
          <Route
            path="*"
            element={
              <div className="empty">
                <h1>404</h1>
                <Link to="/">{t("Back to overview", "返回概览")}</Link>
              </div>
            }
          />
        </Routes>
      </main>
      <footer>
        <Link to="/" className="footer-brand">
          <img src="/assets/logo.png" alt="" />
          BKUSD<span>{t("A basket. A balance.", "多元储备，透明平衡。")}</span>
        </Link>
        <div>
          <Link to="/docs">{t("Documentation", "文档")}</Link>
          <a
            href="https://github.com/otctoken/bkusd"
            target="_blank"
            rel="noreferrer"
          >
            GitHub ↗
          </a>
          <span>Sui Mainnet</span>
        </div>
      </footer>
    </>
  );
}
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <LanguageProvider>
      <QueryClientProvider client={queryClient}>
        <DAppKitProvider dAppKit={dAppKit}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </DAppKitProvider>
      </QueryClientProvider>
    </LanguageProvider>
  </React.StrictMode>,
);
