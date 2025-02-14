import { useState } from "react";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { FIREBASE_COLLECTIONS } from "@/enums/collections";

export function useSignUp() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const signUp = async (
    email: string,
    password: string,
    fullName: string
  ) => {
    setLoading(true);
    setError("");

    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password.trim()
      );
      const user = userCredential.user;

      // Store user data in Firestore
      await setDoc(doc(db, FIREBASE_COLLECTIONS.USERS, user.uid), {
        uid: user.uid,
        email: user.email,
        fullName: fullName.trim(),
        createdAt: new Date(),
      });

      // Redirect user after successful signup
      router.push("/welcome");
    } catch (error: any) {
      setError(error.message || "Signup failed. Please try again.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return { signUp, loading, error };
}
