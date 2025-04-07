"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { Sidebar } from "@/components/Sidebar";
import { Navbar } from "@/components/Navbar";
import { getTimeCategory, playNotificationSound } from "@/utils";
import dayjs from "dayjs";
import { collection, onSnapshot, query } from "firebase/firestore";

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/"); // Redirect to login if not authenticated
      } else {
        setUser(user);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    const tasksQuery = query(collection(db, "tasks"));
    const equipmentQuery = query(collection(db, "equipments"));

    const unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
      // if there is some task that is due today, play notification sound
      const tasks = snapshot.docs.map((doc) => doc.data());
      if (tasks.length > 0) playNotificationSound(audioRef);
    });

    const unsubscribeEquipment = onSnapshot(equipmentQuery, (snapshot) => {
      const equipments = snapshot.docs.map((doc) => doc.data());
      if (equipments.length > 0) playNotificationSound(audioRef);
    });

    return () => {
      unsubscribeTasks();
      unsubscribeEquipment();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <audio ref={audioRef} preload="auto">
        <source src="/sounds/notification.mp3" type="audio/mpeg" />
      </audio>
      <Sidebar collapsed={collapsed} />
      <main className="flex-1 overflow-y-auto bg-background">
        <Navbar onToggleSidebar={() => setCollapsed(!collapsed)} />
        <main className="flex-1 overflow-y-auto px-2">
          {children}
        </main>
      </main>
    </div>
  );
}
