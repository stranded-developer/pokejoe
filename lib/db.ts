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

// ── CHANGE 3: Original addPoints (auto-converts amount → points) kept for
//    internal use only. Admin now uses addPointsManual below. ──
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

// ── CHANGE 3: Manual add points — admin specifies exact point amount directly ──
export async function addPointsManual(username: string, points: number, description: string) {
  const ref = doc(db, 'customers', username.toLowerCase());
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Customer not found');
  const history = snap.data().purchaseHistory || [];
  history.push({
    description,
    amount: 0,
    points,
    date: new Date().toISOString(),
    type: 'manual_addition',
  });
  await updateDoc(ref, { points: increment(points), purchaseHistory: history });
  return points;
}

export async function deductPoints(username: string, points: number, description: string) {
  const ref = doc(db, 'customers', username.toLowerCase());
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Customer not found');
  const current = snap.data().points || 0;
  if (current < points) throw new Error(`Insufficient points. Current: ${current} pts`);
  const history = snap.data().purchaseHistory || [];
  history.push({
    description,
    amount: 0,
    points: -points,
    date: new Date().toISOString(),
    type: 'deduction',
  });
  await updateDoc(ref, { points: increment(-points), purchaseHistory: history });
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

export async function updateVaultItemStatus(username: string, itemId: string, status: string) {
  const ref = doc(db, 'vault', username.toLowerCase(), 'items', itemId);
  await updateDoc(ref, { status });
}

export async function deleteVaultItem(username: string, itemId: string) {
  const { deleteDoc } = await import('firebase/firestore');
  const ref = doc(db, 'vault', username.toLowerCase(), 'items', itemId);
  await deleteDoc(ref);
}

export async function addVaultItem(username: string, item: {
  liveTitle: string;
  packs: string[];
  photos: string[];
  status?: string;
}) {
  const ref = collection(db, 'vault', username.toLowerCase(), 'items');
  await addDoc(ref, { ...item, status: item.status || 'On progress', addedAt: serverTimestamp() });
}

// ── CHANGE 2: addVaultItemFromProduct — admin picks from products (not rewards),
//    decrements product stock, and optionally awards loyalty points ──
export async function addVaultItemFromProduct(
  username: string,
  item: {
    productId: string;
    productName: string;
    price: number;
    quantity: number;
    description?: string;
    imageUrl?: string;
    autoAddPoints: boolean;
    status?: string;
  }
) {
  const qty = item.quantity ?? 1;
  const totalPrice = item.price * qty;

  // Decrement stock on the catalog product
  await decrementProductStock(item.productId, qty);

  // Optionally add loyalty points (100,000 IDR = 1 point)
  if (item.autoAddPoints) {
    const pointsToAdd = Math.floor(totalPrice / 100000);
    if (pointsToAdd > 0) {
      const custRef = doc(db, 'customers', username.toLowerCase());
      const custSnap = await getDoc(custRef);
      if (custSnap.exists()) {
        const history = custSnap.data().purchaseHistory || [];
        history.push({
          description: `Auto points: ${item.productName} ×${qty}`,
          amount: totalPrice,
          points: pointsToAdd,
          date: new Date().toISOString(),
          type: 'purchase_points',
        });
        await updateDoc(custRef, { points: increment(pointsToAdd), purchaseHistory: history });
      }
    }
  }

  // Add the item to the customer's vault
  const ref = collection(db, 'vault', username.toLowerCase(), 'items');
  await addDoc(ref, {
    type: 'purchase',
    productId: item.productId,
    productName: item.productName,
    price: item.price,
    quantity: qty,
    totalPrice,
    description: item.description || '',
    imageUrl: item.imageUrl || '',
    status: item.status || 'On progress',
    addedAt: serverTimestamp(),
  });
}

export async function addRedeemedVaultItem(
  username: string,
  item: {
    productName: string;
    pointsCost: number;
    quantity?: number;
    description?: string;
    imageUrl?: string;
    redeemableProductId?: string;
    status?: string;
  }
) {
  const qty = item.quantity ?? 1;

  if (item.redeemableProductId) {
    await decrementRedeemableStock(item.redeemableProductId, qty);
  }

  const ref = collection(db, 'vault', username.toLowerCase(), 'items');
  await addDoc(ref, {
    type: 'redemption',
    productName: item.productName,
    pointsCost: item.pointsCost,
    quantity: qty,
    description: item.description || '',
    imageUrl: item.imageUrl || '',
    status: item.status || 'On progress',
    addedAt: serverTimestamp(),
  });
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

export async function decrementProductStock(productId: string, qty = 1) {
  const ref = doc(db, 'products', productId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const current = snap.data().stock;
  if (typeof current === 'number') {
    const newStock = Math.max(0, current - qty);
    await updateDoc(ref, { stock: newStock });
  }
}

// ── Redeemable products ──────────────────────────────────────────
export async function getRedeemableProducts() {
  const snap = await getDocs(collection(db, 'redeemableProducts'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getRedeemableProduct(id: string) {
  const ref = doc(db, 'redeemableProducts', id);
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function upsertRedeemableProduct(id: string | null, data: Record<string, unknown>) {
  if (id) {
    await updateDoc(doc(db, 'redeemableProducts', id), data);
  } else {
    await addDoc(collection(db, 'redeemableProducts'), { ...data, createdAt: serverTimestamp() });
  }
}

export async function deleteRedeemableProduct(id: string) {
  await deleteDoc(doc(db, 'redeemableProducts', id));
}

export async function decrementRedeemableStock(productId: string, qty = 1) {
  const ref = doc(db, 'redeemableProducts', productId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const current = snap.data().stock;
  if (typeof current === 'number') {
    const newStock = Math.max(0, current - qty);
    await updateDoc(ref, { stock: newStock });
  }
}