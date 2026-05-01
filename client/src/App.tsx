import { lazy, Suspense } from "react";
import { Switch, Route, Router } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import Home from "@/pages/Home";
import { Toaster } from "@/components/ui/toaster";
import { NetworkStatusBanner } from "@/components/NetworkStatusBanner";

// GitHub Pages base path
const base = import.meta.env.BASE_URL || "/";

// 演出模式 lazy load — 不影響首頁 bundle
const StagePage = lazy(() => import("@/pages/StagePage"));

function isStageMode(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('mode') === 'stage';
}

function App() {
  // ?mode=stage 進入演出模式 — 畫面全黑乾淨，無 Toaster / Banner / 管理 UI
  if (isStageMode()) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-stone-950" />}>
        <StagePage />
      </Suspense>
    );
  }

  return (
    <Router base={base.endsWith('/') ? base.slice(0, -1) : base}>
      <Switch>
        <Route path="/" component={Home} />
        <Route component={NotFound} />
      </Switch>
      <NetworkStatusBanner />
      <Toaster />
    </Router>
  );
}

// fallback 404 not found page
function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <h1 className="text-2xl font-bold text-gray-900">404 Page Not Found</h1>
          </div>

          <p className="mt-4 text-sm text-gray-600">
            Did you forget to add the page to the router?
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default App;