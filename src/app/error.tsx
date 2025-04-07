"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ErrorPage({
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
    <div className="flex items-center justify-center min-h-[80vh]">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <AlertTriangle className="h-16 w-16 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Something went wrong</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-muted-foreground mb-4">
            We apologize for the inconvenience. An unexpected error has
            occurred.
          </p>
          {process.env.NODE_ENV === "development" && (
            <div className="text-left bg-muted p-4 rounded-md overflow-auto max-h-[200px] text-sm">
              <p className="font-mono">{error.message}</p>
              <p className="font-mono mt-2">{error.stack}</p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-center gap-4">
          <Button onClick={() => (window.location.href = "/")}>
            Go to Home
          </Button>
          <Button variant="outline" onClick={reset}>
            Try Again
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
