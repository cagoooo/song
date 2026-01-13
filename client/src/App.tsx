import { Switch, Route, Router } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import Home from "@/pages/Home";
import { Toaster } from "@/components/ui/toaster";
import { NetworkStatusBanner } from "@/components/NetworkStatusBanner";

// GitHub Pages base path
const base = import.meta.env.BASE_URL || "/";

function App() {
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