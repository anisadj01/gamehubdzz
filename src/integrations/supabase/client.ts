import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updatePassword,
  createUserWithEmailAndPassword,
  type User,
} from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  type DocumentData,
  type QueryConstraint,
} from "firebase/firestore";
import { getFirestore } from "firebase/firestore";

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || import.meta.env.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "gamehubdz-98275.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "gamehubdz-98275",
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
    "gamehubdz-98275.firebasestorage.app",
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "521947781931",
  appId:
    import.meta.env.VITE_FIREBASE_APP_ID ||
    "1:521947781931:web:db2beb863fdd86e224436e",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-QJQWVTVZF2",
};

const missing = Object.entries(config).filter(([, value]) => !value).map(([key]) => key);
if (missing.length) {
  console.warn(`[Firebase] Configuration manquante: ${missing.join(", ")}. Ajoutez les variables VITE_FIREBASE_* dans l’environnement.`);
}

const app = getApps()[0] ?? initializeApp(config);
export const firebaseAuth = getAuth(app);
export const db = getFirestore(app);

function currentUser() {
  return firebaseAuth.currentUser;
}

function errorResult(error: unknown) {
  return { data: null, error: error instanceof Error ? error : new Error(String(error)) };
}

class CollectionQuery {
  private constraints: QueryConstraint[] = [];
  private action: "select" | "insert" | "update" | "delete" = "select";
  private payload: DocumentData | DocumentData[] = {};
  private filters: Array<[string, string, unknown]> = [];

  constructor(private readonly name: string) {}
  select(_fields = "*") { this.action = "select"; return this; }
  eq(field: string, value: unknown) { this.filters.push([field, "==", value]); return this; }
  gte(field: string, value: unknown) { this.filters.push([field, ">=", value]); return this; }
  lte(field: string, value: unknown) { this.filters.push([field, "<=", value]); return this; }
  order(field: string, options?: { ascending?: boolean }) { this.constraints.push(orderBy(field, options?.ascending !== false ? "asc" : "desc")); return this; }
  insert(payload: DocumentData | DocumentData[]) { this.action = "insert"; this.payload = payload; return this; }
  update(payload: DocumentData) { this.action = "update"; this.payload = payload; return this; }
  delete() { this.action = "delete"; return this; }
  async execute(single = false) {
    try {
      if (this.action === "insert") {
        const values = Array.isArray(this.payload) ? this.payload : [this.payload];
        const data = [];
        for (const value of values) { const ref = await addDoc(collection(db, this.name), { ...value, created_at: value.created_at ?? new Date().toISOString() }); data.push({ id: ref.id, ...value }); }
        return { data: Array.isArray(this.payload) ? data : data[0], error: null };
      }
      const constraints = [...this.filters.map(([field, op, value]) => where(field, op as "==" | ">=" | "<=", value)), ...this.constraints];
      const snapshot = await getDocs(query(collection(db, this.name), ...constraints));
      const rows = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
      if (this.action === "delete" || this.action === "update") {
        await Promise.all(snapshot.docs.map((item) => this.action === "delete" ? deleteDoc(item.ref) : updateDoc(item.ref, this.payload as DocumentData)));
        return { data: null, error: null };
      }
      return { data: single ? rows[0] ?? null : rows, error: null };
    } catch (error) { return errorResult(error); }
  }
  then(resolve: (value: { data: any; error: Error | null }) => any, reject?: (reason: unknown) => any) { return this.execute(false).then(resolve, reject); }
  maybeSingle() { return this.execute(true); }
}

export const supabase = {
  from: (name: string) => new CollectionQuery(name),
  auth: {
    getUser: async () => ({ data: { user: currentUser() }, error: null }),
    getSession: async () => ({ data: { session: currentUser() ? { user: currentUser() } : null }, error: null }),
    signInWithPassword: async ({ email, password }: { email: string; password: string }) => { try { const credential = await signInWithEmailAndPassword(firebaseAuth, email, password); return { data: { user: credential.user }, error: null }; } catch (error) { return errorResult(error); } },
    signUp: async ({ email, password }: { email: string; password: string }) => { try { const credential = await createUserWithEmailAndPassword(firebaseAuth, email, password); return { data: { user: credential.user }, error: null }; } catch (error) { return errorResult(error); } },
    signOut: () => firebaseSignOut(firebaseAuth),
    resetPasswordForEmail: async (email: string) => { try { await sendPasswordResetEmail(firebaseAuth, email); return { error: null }; } catch (error) { return errorResult(error); } },
    updateUser: async ({ password }: { password: string }) => { try { await updatePassword(firebaseAuth.currentUser as User, password); return { error: null }; } catch (error) { return errorResult(error); } },
    onAuthStateChange: (callback: (event: string, session: unknown) => void) => ({ data: { subscription: { unsubscribe: onAuthStateChanged(firebaseAuth, (user) => callback(user ? "SIGNED_IN" : "SIGNED_OUT", user ? { user } : null)) } } }),
  },
};
