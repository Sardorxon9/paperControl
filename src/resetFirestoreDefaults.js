// src/resetFirestoreDefaults.js
import {
  collection,
  doc,
  writeBatch,
  setDoc,
  serverTimestamp,
  getDocs
} from "firebase/firestore";
import { db } from "./firebase";

/* static data */
const DEFAULT_PRODUCTS = [
  { type: "Сахар Коричневый", packaging: "Сашет", gramm: "4" },
  { type: "Сахар Белый",     packaging: "Сашет", gramm: "4" },
  { type: "Сахар Белый",     packaging: "Сашет", gramm: "5" },
  { type: "Сахар Коричневый", packaging: "Стик",  gramm: "5" },
  { type: "Сахар Белый",     packaging: "Стик",  gramm: "5" },
  { type: "Сахар Белый",     packaging: "Стик",  gramm: "4" },
];

const ROLL_WEIGHT_KG = 10;

/* ---------- the actual reset ---------- */
export default async function resetFirestoreDefaults() {
  const batch = writeBatch(db);

  // 1️⃣  wipe every productType and ALL its sub-collections
  const productSnap = await getDocs(collection(db, "productTypes"));
  for (const productDoc of productSnap.docs) {
    // wipe sub-collections first
    const subs = ["paperInfo", "logs", "priyemka"];
    for (const sub of subs) {
      const subSnap = await getDocs(collection(productDoc.ref, sub));
      subSnap.forEach((d) => batch.delete(d.ref));
    }
    batch.delete(productDoc.ref);
  }

  // 2️⃣  recreate the six clean products
  for (const p of DEFAULT_PRODUCTS) {
    const productRef = doc(collection(db, "productTypes"));
    batch.set(productRef, p);

    // paperInfo doc
    const paperInfoRef = doc(collection(productRef, "paperInfo"));
    batch.set(paperInfoRef, {
      shellNum: "0",
      paperRemaining: ROLL_WEIGHT_KG,
      totalKg: ROLL_WEIGHT_KG,
    });

    // single 10 kg roll
    const rollRef = doc(collection(paperInfoRef, "individualRolls"));
    batch.set(rollRef, {
      paperRemaining: ROLL_WEIGHT_KG,
      dateCreated: serverTimestamp(),
    });
  }

  await batch.commit();
  console.log("✅ productTypes reset complete.");
}