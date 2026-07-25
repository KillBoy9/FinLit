import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// @ts-ignore
import config from '../../firebase-applet-config.json';

export const app = initializeApp(config);
export const auth = getAuth(app);
export const db = getFirestore(app);
