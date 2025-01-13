import { Switch, Route } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Loader2 } from "lucide-react";
import AuthPage from "@/pages/auth-page";
import { useUser } from "@/hooks/use-user";
import { Toaster } from "@/components/ui/toaster";
import Home from "@/pages/Home";
import UserTemplate from "@/pages/UserTemplate";

function App() {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Switch>
        {/* Put the more specific route first */}
        <Route path="/:username" component={UserTemplate} />
        {user ? (
          <Route path="/" component={Home} />
        ) : (
          <Route path="/" component={AuthPage} />
        )}
        <Route component={NotFound} />
      </Switch>
      <Toaster />
    </>
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
            頁面不存在
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default App;