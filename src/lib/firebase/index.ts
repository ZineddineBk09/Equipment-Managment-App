import { initializeApp } from "firebase/app";
import { getDocs, getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";
import { signOut } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

export const app = initializeApp(firebaseConfig);
export const storage = getStorage(app);
export const db = getFirestore(app);
export const auth = getAuth(app);

export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error logging out:", error);
  }
};

import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { collection, addDoc, updateDoc, onSnapshot, Timestamp } from "firebase/firestore";
import { PRFormData, Status } from "@/interfaces/firebase";

export const handleCreateUser = async (
  email: string,
  password: string,
  role: string
) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;

    await setDoc(doc(db, "users", user.uid), {
      email: user.email,
      role: role,
      active: true,
      permissions: "view",
    });
  } catch (error) {
    console.error("Error creating user:", error);
  }
};

// Create PR
export const createPR = async (payload: PRFormData): Promise<void> => {
  try {
    await addDoc(collection(db, "materials"), {
      ...payload,
      date: Timestamp.now(),
      status: "pending",
    });
  } catch (error) {
    console.error("Error creating PR:", error);
  }
};

// Listen for PR updates
export const listenForPRUpdates = (callback: (data: any) => void): (() => void) => {
  return onSnapshot(collection(db, "materials"), (snapshot) => {
    const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    callback(data);
  });
};

// Update PR status
export const updatePRStatus = async (prId: string, newStatus: Status): Promise<void> => {
  try {
    await updateDoc(doc(db, "materials", prId), { status: newStatus });
  } catch (error) {
    console.error("Error updating PR status:", error);
  }
};

// Generate PO (stub function)
export const generatePO = async (prId: string): Promise<Blob> => {
  // Implement PDF generation logic here
  return new Blob();
};

export const fetchVendors = async () => {
  const vendorCollection = collection(db, "vendors");
  const vendorSnapshot = await getDocs(vendorCollection);
  return vendorSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};
