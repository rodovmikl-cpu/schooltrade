import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HalloweenProvider } from "@/contexts/HalloweenContext";
import { ChristmasProvider } from "@/contexts/ChristmasContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import IntroSplash from "@/components/IntroSplash";

const queryClient = new QueryClient();

const App = () => {
  const [hasIntroPlayed, setHasIntroPlayed] = useState(false);

  const handleIntroFinish = () => {
    setHasIntroPlayed(true);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <HalloweenProvider>
        <ChristmasProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            {hasIntroPlayed ? (
              <BrowserRouter>
                <div className="app-enter-slide-up">
                  <Routes>
                    <Route path="/" element={<Index />} />
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </div>
              </BrowserRouter>
            ) : (
              <IntroSplash onFinish={handleIntroFinish} />
            )}
          </TooltipProvider>
        </ChristmasProvider>
      </HalloweenProvider>
    </QueryClientProvider>
  );
};

export default App;
