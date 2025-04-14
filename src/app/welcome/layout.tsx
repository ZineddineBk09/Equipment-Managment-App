"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Sidebar } from "@/components/Sidebar";
import { Navbar } from "@/components/Navbar";

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [collapseSidebar, setCollapseSidebar] = useState(false);
  const router = useRouter();

  const toggleSidebar = () => {
    setCollapseSidebar((prev) => !prev);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        // router.push("/"); // Redirect to login if not authenticated
      } else {
        setUser(user);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="w-full flex h-screen">
      {!pathname.includes("welcome") && <Sidebar collapsed={collapseSidebar} />}
      <main className="w-full flex-1 overflow-y-auto bg-background">
        <Navbar onToggleSidebar={toggleSidebar} />
        {children}
      </main>
    </div>
  );
}
