import { lazy, Suspense, type ReactNode } from "react";
import { Switch, Route, Router } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { NetworkStatusBanner } from "@/components/NetworkStatusBanner";
import { UpdatePrompt } from "@/components/UpdatePrompt";
import { AppLoading } from "@/components/AppLoading";
import { useUser } from "@/hooks/use-user";
import { getUrlSpace } from "@/lib/firebase";

// GitHub Pages base path
const base = import.meta.env.BASE_URL || "/";

// 演出模式 lazy load — 不影響首頁 bundle
const Home = lazy(() => import("@/pages/Home"));
const StagePage = lazy(() => import("@/pages/StagePage"));

function isStageMode(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('mode') === 'stage';
}

function StageLoading() {
  return (
    <div className="min-h-screen bg-[#07070b] text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="font-mono text-[11px] tracking-[0.28em] uppercase text-blue-300 mb-4">
          Stage Mode
        </div>
        <h1 className="font-serif italic text-4xl font-black tracking-[-0.03em] leading-none">
          演出模式載入中
        </h1>
        <p className="mt-4 text-sm text-white/60 leading-6">
          正在載入即時演奏內容與排行榜，請稍候。
        </p>
        <div className="mt-7 h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full w-1/2 rounded-full bg-blue-500 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

/**
 * U1 租戶空間邊界（docs/design/U1-multi-tenant.md）：
 * approved 一般使用者登入後，auth.ts 已把 activeTenant 切到他的 uid；
 * 這裡用 key 讓整棵樹 remount，所有 onSnapshot 訂閱自動重建到新空間。
 * 訪客首屏不等 auth（key 初始即 'root'），不影響載入速度。
 */
function SpaceScope({ children }: { children: ReactNode }) {
  const { user } = useUser();
  // Phase 2：?space={uid} 公開網址優先 — 訪客與任何登入者都看該租戶空間
  const spaceKey = getUrlSpace()
    ?? (user && !user.isRootAdmin && user.status === 'approved' ? user.id : 'root');
  return <div key={spaceKey} style={{ display: 'contents' }}>{children}</div>;
}

function App() {
  // ?mode=stage 進入演出模式 — 畫面全黑乾淨，無 Toaster / Banner / 管理 UI
  if (isStageMode()) {
    return (
      <SpaceScope>
        <Suspense fallback={<StageLoading />}>
          <StagePage />
        </Suspense>
      </SpaceScope>
    );
  }

  return (
    <Router base={base.endsWith('/') ? base.slice(0, -1) : base}>
      {/* <main> landmark — Lighthouse a11y landmark-one-main 要求 */}
      <main>
        <Suspense fallback={<AppLoading kind="app" />}>
          <Switch>
            <Route path="/">
              <SpaceScope>
                <Home />
              </SpaceScope>
            </Route>
            <Route component={NotFound} />
          </Switch>
        </Suspense>
      </main>
      <NetworkStatusBanner />
      <UpdatePrompt />
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
