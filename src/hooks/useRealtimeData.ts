import { useEffect, useState } from "react";
import { DocumentData, QueryConstraint } from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";
import { firestoreService } from "../services/firestoreService";

export function useRealtimeData<T extends DocumentData>(
  collectionName: string,
  documentId: string
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const unsubscribe = firestoreService.subscribeToDocument(
      collectionName,
      documentId,
      (doc) => {
        if (doc) {
          setData(doc as T);
        } else {
          setData(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error(`Error fetching ${collectionName} data:`, err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [collectionName, documentId, user]);

  return { data, loading, error };
}

// Collection listener hook
export function useRealtimeCollection<T extends DocumentData>(
  collectionName: string,
  queryConstraints: QueryConstraint[] = []
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const unsubscribe = firestoreService.subscribeToCollection(
      collectionName,
      queryConstraints,
      (items) => {
        setData(items as T[]);
        setLoading(false);
      },
      (err) => {
        console.error(`Error fetching ${collectionName} collection:`, err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [collectionName, ...queryConstraints, user]);

  return { data, loading, error };
}
