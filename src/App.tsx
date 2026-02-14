
import Index from "./pages/Index";
import { FeatureToggleProvider } from "./contexts/FeatureToggleContext";

const App = () => {
  return (
    <FeatureToggleProvider>
      <Index />
    </FeatureToggleProvider>
  );
};

export default App;
