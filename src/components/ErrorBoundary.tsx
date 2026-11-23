import { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Home, RotateCw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Without this, any render error unmounts the whole tree and the customer is
 * left staring at a blank white page with no way forward.
 */
class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Unhandled UI error:", error, errorInfo);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto mb-6 bg-destructive/10 rounded-full flex items-center justify-center">
            <AlertTriangle className="text-destructive" size={32} />
          </div>
          <h1 className="font-display text-2xl font-semibold text-foreground mb-3">
            Something went wrong
          </h1>
          <p className="font-body text-muted-foreground mb-8">
            Sorry about that. Your cart is safe — reloading usually fixes it.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="sacred" onClick={() => window.location.reload()}>
              <RotateCw size={18} className="mr-2" />
              Reload page
            </Button>
            <Button variant="outline" onClick={() => (window.location.href = "/")}>
              <Home size={18} className="mr-2" />
              Back to home
            </Button>
          </div>
          <p className="mt-8 text-sm text-muted-foreground">
            Still stuck? Write to{" "}
            <a href="mailto:Shrihit02@gmail.com" className="text-primary hover:underline">
              Shrihit02@gmail.com
            </a>
          </p>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
