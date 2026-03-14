import admin from 'firebase-admin';
import { config } from './config.js';

// Inicializar Firebase Admin
if (config.GOOGLE_APPLICATION_CREDENTIALS) {
  try {
    admin.initializeApp({
      projectId: config.FIREBASE_PROJECT_ID,
      credential: admin.credential.cert(config.GOOGLE_APPLICATION_CREDENTIALS)
    });
    console.log("✅ Firebase Admin inicializado con service account.");
  } catch (err) {
    console.error("❌ Error al inicializar Firebase con service account:", err);
    admin.initializeApp({
      projectId: config.FIREBASE_PROJECT_ID, projectId: config.FIREBASE_PROJECT_ID });
  }
} else {
  admin.initializeApp({
      projectId: config.FIREBASE_PROJECT_ID, projectId: config.FIREBASE_PROJECT_ID });
  console.log("ℹ️ Firebase Admin inicializado con credenciales por defecto (ADC).");
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
      const docRef = db.collection('conversations').doc(userId.toString()).collection('messages').doc();
      await docRef.set({
        role,
        content,
        tool_calls: toolCalls || null,
        tool_call_id: toolCallId || null,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (err) {
      console.error("❌ Error al añadir mensaje a Firestore:", err);
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
    } catch (err) {
      console.error("❌ Error al obtener historial de Firestore:", err);
      return [];
    }
  },

  clearHistory: async (userId: number) => {
    try {
      const messagesRef = db.collection('conversations').doc(userId.toString()).collection('messages');
      const snapshot = await messagesRef.get();
      
      const batch = db.batch();
      snapshot.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      console.log(`✅ Historial borrado para el usuario ${userId}`);
    } catch (err) {
      console.error("❌ Error al borrar historial en Firestore:", err);
    }
  }
};
