"use client";

import { useEffect } from "react";
import { AlertOctagon } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="flex items-center justify-center min-h-screen bg-background">
          <div className="text-center">
            <AlertOctagon className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Critical Error</h1>
            <p className="text-muted-foreground mb-6">
              A critical error has occurred. We apologize for the inconvenience.
            </p>
            <div className="flex justify-center gap-4">
              <Button onClick={() => (window.location.href = "/")}>
                Go to Home
              </Button>
              <Button variant="outline" onClick={reset}>
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
