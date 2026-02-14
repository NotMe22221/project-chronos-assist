
import { useEffect } from "react";
import Index from "./pages/Index";
import { FeatureToggleProvider } from "./contexts/FeatureToggleContext";
import { Toaster } from "@/components/ui/toaster";

const App = () => {
  useEffect(() => {
    const handleRejection = (event: PromiseRejectionEvent) => {
      console.error("Unhandled rejection:", event.reason);
      event.preventDefault();
    };
    window.addEventListener("unhandledrejection", handleRejection);
    return () => window.removeEventListener("unhandledrejection", handleRejection);
  }, []);

  return (
    <FeatureToggleProvider>
      <Index />
      <Toaster />
    </FeatureToggleProvider>
  );
};

export default App;
