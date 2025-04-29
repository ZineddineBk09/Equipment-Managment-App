"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FIREBASE_COLLECTIONS } from "@/enums/collections";
import { trimFirebaseError } from "@/utils";
import { Loader2, Lock, Mail, AlertCircle } from 'lucide-react';
import Image from "next/image";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password.trim()
      );
      const user = userCredential.user;

      // Fetch user data
      const userDoc = await getDoc(doc(db, FIREBASE_COLLECTIONS.USERS, user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.status !== "active") {
          throw new Error("Your account is not active. Please contact the administrator.");
        }
      } else {
        throw new Error("User data not found. Please contact the administrator.");
      }

      // Redirect to dashboard
      router.push("/welcome");
    } catch (error: any) {
      setError(
        trimFirebaseError(error.message) || "Failed to log in. Please check your credentials."
      );
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.push("/welcome"); // Redirect if already logged in
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/50 p-4">
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.03] pointer-events-none" />
      
      <div className="w-full max-w-md">
        <div className="text-center mb-8 animate-fade-in">
          <div className="flex justify-center mb-4">
            <div className="relative w-16 h-16 rounded-full bg-gray-300/20 flex items-center justify-center">
              <Image 
                src="/logo-removebg-new.png" 
                alt="Company Logo" 
                width={80} 
                height={80}
                className="object-contain"
              />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Oil Industry Supplies & Services Ltd System
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your equipment and maintenance tasks efficiently
          </p>
        </div>
        
        <Card className="border-muted/30 shadow-lg animate-slide-up">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl">Sign in to your account</CardTitle>
            <CardDescription>
              Enter your credentials to access the dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email Address
                </Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
                    <Mail className="h-4 w-4" />
                  </div>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Password
                  </Label>
                  {/* <Button variant="link" className="p-0 h-auto text-xs" type="button">
                    Forgot password?
                  </Button> */}
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
                    <Lock className="h-4 w-4" />
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                    autoComplete="current-password"
                  />
                </div>
              </div>
              
              {error && (
                <Alert variant="destructive" className="animate-shake">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <Button 
                type="submit" 
                className="w-full transition-all" 
                disabled={loading}
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4 border-t pt-6">
            <div className="text-center w-full">
              <p className="text-sm text-muted-foreground">
                Don't have an account? <span className="font-medium">Contact your administrator</span>
              </p>
            </div>
            <div className="text-xs text-center text-muted-foreground">
              By signing in, you agree to our 
              <Button variant="link" className="p-0 h-auto text-xs mx-1">Terms of Service</Button>
              and
              <Button variant="link" className="p-0 h-auto text-xs ml-1">Privacy Policy</Button>
            </div>
          </CardFooter>
        </Card>
        
        <div className="mt-8 text-center text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} Oil Industry Supplies & Services Ltd System. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}

// Add this to your global CSS or as a style tag
// .bg-grid-pattern {
//   background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fillRule='evenodd'%3E%3Cg fill='%239C92AC' fillOpacity='0.2'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
// }