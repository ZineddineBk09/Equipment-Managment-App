import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Equipment } from "@/interfaces/equipment";
import { FIREBASE_COLLECTIONS } from "@/enums/collections";

export function useEquipment() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const fetchEquipment = async () => {
    try {
      const querySnapshot = await getDocs(
        collection(db, FIREBASE_COLLECTIONS.EQUIPMENTS)
      );
      const equipmentData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Equipment[];
      setEquipment(equipmentData);
    } catch (error) {
      console.error("Error fetching equipment:", error);
    } finally {
      setLoading(false);
    }
  };

  // Add your other equipment-related functions here...

  return {
    equipment,
    loading,
    selectedItems,
    setSelectedItems,
    fetchEquipment,
  };
}