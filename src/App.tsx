
import Index from "./pages/Index";

const App = () => {
  // Temporarily render the app without external providers/router to avoid
  // duplicate-React hook dispatcher issues coming from node_modules.
  // Once React is deduped in Vite config, we can reintroduce:
  // - Toaster from "@/components/ui/toaster"
  // - Sonner from "@/components/ui/sonner"
  // - BrowserRouter/Routes/Route from "react-router-dom"
  return (
    <>
      <Index />
    </>
  );
};

export default App;
