import {
  doc, getDoc, setDoc, updateDoc, collection,
  query, orderBy, getDocs, addDoc, serverTimestamp, increment, deleteDoc
} from 'firebase/firestore';
import { db } from './firebase';

export async function getCustomer(username: string) {
  const ref = doc(db, 'customers', username.toLowerCase());
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function createCustomer(username: string) {
  const ref = doc(db, 'customers', username.toLowerCase());
  await setDoc(ref, {
    username,
    points: 0,
    vaultActive: true,
    joinedAt: serverTimestamp(),
    purchaseHistory: [],
  });
}

export async function getAllCustomers() {
  const snap = await getDocs(collection(db, 'customers'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function addPoints(username: string, amount: number, description: string) {
  const points = Math.floor(amount / 100000);
  const ref = doc(db, 'customers', username.toLowerCase());
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Customer not found');
  const history = snap.data().purchaseHistory || [];
  history.push({ description, amount, points, date: new Date().toISOString() });
  await updateDoc(ref, { points: increment(points), purchaseHistory: history });
  return points;
}

export async function setVaultActive(username: string, active: boolean) {
  const ref = doc(db, 'customers', username.toLowerCase());
  await updateDoc(ref, { vaultActive: active });
}

export async function getVaultItems(username: string) {
  const ref = collection(db, 'vault', username.toLowerCase(), 'items');
  const q = query(ref, orderBy('addedAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function addVaultItem(username: string, item: {
  liveTitle: string;
  packs: string[];
  photos: string[];
}) {
  const ref = collection(db, 'vault', username.toLowerCase(), 'items');
  await addDoc(ref, { ...item, addedAt: serverTimestamp() });
}

export async function getProducts() {
  const snap = await getDocs(collection(db, 'products'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getProduct(id: string) {
  const ref = doc(db, 'products', id);
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function upsertProduct(id: string | null, data: Record<string, unknown>) {
  if (id) {
    await updateDoc(doc(db, 'products', id), data);
  } else {
    await addDoc(collection(db, 'products'), { ...data, createdAt: serverTimestamp() });
  }
}

export async function deleteProduct(id: string) {
  await deleteDoc(doc(db, 'products', id));
}