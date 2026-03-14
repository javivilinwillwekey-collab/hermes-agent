import admin from 'firebase-admin';
import { config } from './config.js';

// Inicializar Firebase Admin
if (admin.apps.length === 0) {
  try {
    let credential;
    if (config.FIREBASE_SERVICE_ACCOUNT_JSON) {
      console.log("📦 Memory: Usando FIREBASE_SERVICE_ACCOUNT_JSON (Base64)...");
      const decoded = Buffer.from(config.FIREBASE_SERVICE_ACCOUNT_JSON.trim(), 'base64').toString('utf-8');
      credential = admin.credential.cert(JSON.parse(decoded));
    } else {
      console.log("📂 Memory: Usando credenciales por defecto...");
      credential = admin.credential.applicationDefault();
    }

    admin.initializeApp({
      projectId: config.FIREBASE_PROJECT_ID,
      credential
    });
    console.log("✅ Firebase Admin inicializado.");
  } catch (err: any) {
    console.error("❌ Error al inicializar Firebase:", err.message);
  }
}

const db = admin.firestore();

export type Role = 'system' | 'user' | 'assistant' | 'tool';

export interface MessageRow {
  role: Role;
  content: string;
  tool_calls?: any;
  tool_call_id?: string;
  timestamp?: any;
}

export const memory = {
  addMessage: async (userId: number, role: Role, content: string, toolCalls?: any, toolCallId?: string) => {
    try {
      await db.collection('conversations').doc(userId.toString()).collection('messages').add({
        role,
        content,
        tool_calls: toolCalls || null,
        tool_call_id: toolCallId || null,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (err: any) {
      console.error("❌ Error al añadir mensaje:", err.message);
    }
  },
  
  getHistory: async (userId: number, limit: number = 20): Promise<MessageRow[]> => {
    try {
      const snapshot = await db.collection('conversations')
        .doc(userId.toString())
        .collection('messages')
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();

      const messages: MessageRow[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        messages.push({
          role: data.role,
          content: data.content,
          tool_calls: data.tool_calls,
          tool_call_id: data.tool_call_id,
          timestamp: data.timestamp
        });
      });

      return messages.reverse();
    } catch (err: any) {
      console.error("❌ Error al obtener historial:", err.message);
      return [];
    }
  }
};
