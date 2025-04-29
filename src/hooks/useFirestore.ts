import { useState, useEffect } from "react";
import { createPR, listenForPRUpdates, updatePRStatus, generatePO, listenForOrderUpdates, updateOrderStatus } from "@/lib/firebase";
import { PRFormData, Status } from "@/interfaces/firebase";

export const useCreatePR = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async (payload: PRFormData) => {
    setLoading(true);
    setError(null);
    try {
      await createPR(payload);
    } catch (err) {
      setError("Failed to create PR.");
    } finally {
      setLoading(false);
    }
  };

  return { create, loading, error };
};

export const usePRUpdates = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = listenForPRUpdates((newData) => {
      setData(newData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { data, loading };
};

export const useUpdatePRStatus = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateStatus = async (prId: string, newStatus: Status) => {
    setLoading(true);
    setError(null);
    try {
      await updatePRStatus(prId, newStatus);
    } catch (err) {
      setError("Failed to update PR status.");
    } finally {
      setLoading(false);
    }
  };

  return { updateStatus, loading, error };
};

export const useGeneratePO = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async (prId: string) => {
    setLoading(true);
    setError(null);
    try {
      const pdfBlob = await generatePO(prId);
      // Handle PDF blob (e.g., download or display)
    } catch (err) {
      setError("Failed to generate PO.");
    } finally {
      setLoading(false);
    }
  };

  return { generate, loading, error };
};

export const useOrderUpdates = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = listenForOrderUpdates((newData) => {
      setData(newData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { data, loading };
};

export const useUpdateOrderStatus = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateStatus = async (orderId: string, newStatus: Status) => {
    setLoading(true);
    setError(null);
    try {
      await updateOrderStatus(orderId, newStatus);
    } catch (err) {
      setError("Failed to update order status.");
    } finally {
      setLoading(false);
    }
  };

  return { updateStatus, loading, error };
};
