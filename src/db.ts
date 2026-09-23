import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json' with { type: 'json' };

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

let cachedDB: any = null;
let isCacheLoaded = false;

export async function authenticateServer() {
  return;
}

export async function readDBFromFirestore(): Promise<any> {
  if (isCacheLoaded && cachedDB) {
    return cachedDB;
  }

  try {
    const docRef = doc(collection(db, 'erp'), 'main_db');
    const docSnap = await getDoc(docRef);

    let data: any = null;
    if (docSnap.exists()) {
      data = docSnap.data();
    }

    if (!data) {
      data = {
        customers: [],
        invoices: [],
        payments: [],
        logs: [],
        contacts: [],
        sessions: [],
        users: [
          { username: "admin", password: "195", role: "admin" },
          { username: "user", password: "user", role: "user" },
          { username: "cefer", password: "1", role: "user" }
        ]
      };
    }

    // Ensure users array exists
    if (!data.users || data.users.length === 0) {
      data.users = [
        { username: "admin", password: "195", role: "admin" },
        { username: "user", password: "user", role: "user" },
        { username: "cefer", password: "1", role: "user" }
      ];
    }
    if (!data.customers) data.customers = [];
    if (!data.invoices) data.invoices = [];
    if (!data.payments) data.payments = [];
    if (!data.logs) data.logs = [];
    if (!data.contacts) data.contacts = [];
    if (!data.sessions) data.sessions = [];

    // Load file attachments from erp_files collection
    try {
      const filesSnapshot = await getDocs(collection(db, 'erp_files'));
      const fileMap = new Map<string, { sourceFile: string; sourceFileType: string }>();
      filesSnapshot.forEach((docItem) => {
        const fileData = docItem.data();
        if (fileData.sourceFile) {
          fileMap.set(docItem.id, {
            sourceFile: fileData.sourceFile,
            sourceFileType: fileData.sourceFileType || "application/pdf"
          });
        }
      });

      // Attach file data to invoices in memory
      data.invoices.forEach((inv: any) => {
        if (inv.id && fileMap.has(inv.id)) {
          const fileInfo = fileMap.get(inv.id)!;
          inv.sourceFile = fileInfo.sourceFile;
          inv.sourceFileType = fileInfo.sourceFileType;
        }
      });
    } catch (fileErr) {
      console.warn("Could not load erp_files collection:", fileErr);
    }

    cachedDB = data;
    isCacheLoaded = true;
    return cachedDB;
  } catch (err) {
    console.error("readDBFromFirestore error:", err);
    if (cachedDB) {
      return cachedDB;
    }
    throw err;
  }
}

export async function writeDBToFirestore(state: any) {
  try {
    cachedDB = state;
    isCacheLoaded = true;

    // 1. Save any sourceFile to separate documents in erp_files collection
    // This strictly prevents the 1MB Firestore document size limit!
    if (Array.isArray(state.invoices)) {
      for (const inv of state.invoices) {
        if (inv.id && inv.sourceFile) {
          try {
            const fileDocRef = doc(collection(db, 'erp_files'), inv.id);
            await setDoc(fileDocRef, {
              id: inv.id,
              sourceFile: inv.sourceFile,
              sourceFileType: inv.sourceFileType || "application/pdf"
            });
          } catch (fileSaveErr) {
            console.error(`Error saving file for invoice ${inv.id}:`, fileSaveErr);
          }
        }
      }
    }

    // 2. Prepare clean invoices list for main database storage (without giant base64 payloads)
    const cleanInvoices = (state.invoices || []).map((inv: any) => {
      const copy = { ...inv };
      if (copy.sourceFile) {
        copy.hasSourceFile = true;
        delete copy.sourceFile;
      }
      return copy;
    });

    const cleanDBState = {
      customers: state.customers || [],
      invoices: cleanInvoices,
      payments: state.payments || [],
      logs: (state.logs || []).slice(0, 200),
      users: state.users || [],
      contacts: state.contacts || [],
      sessions: state.sessions || []
    };

    // 3. Write clean document to Firestore
    const mainDocRef = doc(collection(db, 'erp'), 'main_db');
    await setDoc(mainDocRef, cleanDBState);

    // 4. Also write partitioned documents for extra reliability and scalability
    try {
      await Promise.all([
        setDoc(doc(collection(db, 'erp'), 'invoices'), { list: cleanInvoices }),
        setDoc(doc(collection(db, 'erp'), 'customers'), { list: state.customers || [] }),
        setDoc(doc(collection(db, 'erp'), 'payments'), { list: state.payments || [] }),
        setDoc(doc(collection(db, 'erp'), 'logs'), { list: (state.logs || []).slice(0, 200) }),
        setDoc(doc(collection(db, 'erp'), 'users'), { list: state.users || [] })
      ]);
    } catch (partErr) {
      console.warn("Partitioned docs sync error (non-fatal):", partErr);
    }
  } catch (err) {
    console.error("writeDBToFirestore error:", err);
    throw err;
  }
}

export async function deleteInvoiceFileFromFirestore(invoiceId: string) {
  try {
    const fileDocRef = doc(collection(db, 'erp_files'), invoiceId);
    await deleteDoc(fileDocRef);
  } catch (e) {
    console.warn(`Could not delete file for invoice ${invoiceId}:`, e);
  }
}
