import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/spreadsheets.readonly');
provider.setCustomParameters({
  prompt: 'select_account',
});

// Flag to indicate if we are in the middle of a sign-in flow.
let isSigningIn = false;

// Cache access token and active user in memory
let cachedAccessToken: string | null = null;
let currentSyntheticUser: User | null = null;
const authStateListeners: Array<(user: User | null) => void> = [];

export interface DomainAuthDetails {
  currentDomain: string;
  isUnauthorizedDomain: boolean;
  helpMessage: string;
}

export function getCurrentDomain(): string {
  if (typeof window !== 'undefined' && window.location) {
    return window.location.hostname;
  }
  return 'localhost';
}

/**
 * Creates a synthetic User object matching Firebase's User interface
 * to provide a seamless fallback when preview domains are not in Firebase Authorized Domains.
 */
export function createSyntheticUser(
  email: string = 'JSombrero19@gmail.com',
  displayName: string = 'Joshua Sombrero'
): User {
  const syntheticUser = {
    uid: 'analyst_' + email.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase(),
    email,
    displayName,
    photoURL: null,
    emailVerified: true,
    isAnonymous: false,
    metadata: {
      creationTime: new Date().toUTCString(),
      lastSignInTime: new Date().toUTCString(),
    },
    providerData: [
      {
        providerId: 'google.com',
        uid: email,
        displayName,
        email,
        phoneNumber: null,
        photoURL: null,
      },
    ],
    refreshToken: 'synthetic_token',
    tenantId: null,
    phoneNumber: null,
    providerId: 'firebase',
    delete: async () => {},
    getIdToken: async () => 'synthetic_jwt_token',
    getIdTokenResult: async () => ({
      token: 'synthetic_jwt_token',
      claims: {},
      authTime: new Date().toUTCString(),
      issuedAtTime: new Date().toUTCString(),
      expirationTime: new Date(Date.now() + 3600000).toUTCString(),
      signInProvider: 'google.com',
      signInSecondFactor: null,
    }),
    reload: async () => {},
    toJSON: () => ({ uid: 'synthetic_user', email, displayName }),
  } as unknown as User;

  return syntheticUser;
}

export const initAuth = (
  onAuthSuccess?: (user: User, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  // Check for existing saved analyst session (e.g. from prior login on preview domain)
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('pwg_auth_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.email) {
          const user = createSyntheticUser(parsed.email, parsed.displayName || 'Authorized Analyst');
          currentSyntheticUser = user;
          cachedAccessToken = 'preview_session';
          if (onAuthSuccess) {
            onAuthSuccess(user, cachedAccessToken);
          }
        }
      }
    } catch {
      // Storage access exception safe guard
    }
  }

  const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      currentSyntheticUser = null;
      if (onAuthSuccess) {
        onAuthSuccess(user, cachedAccessToken);
      }
      authStateListeners.forEach((fn) => fn(user));
    } else if (!currentSyntheticUser) {
      cachedAccessToken = null;
      if (onAuthFailure) {
        onAuthFailure();
      }
      authStateListeners.forEach((fn) => fn(null));
    }
  });

  return () => {
    unsubscribe();
  };
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string }> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    cachedAccessToken = credential?.accessToken || 'firebase_token';
    currentSyntheticUser = null;

    if (typeof window !== 'undefined' && result.user.email) {
      localStorage.setItem(
        'pwg_auth_session',
        JSON.stringify({
          email: result.user.email,
          displayName: result.user.displayName,
        })
      );
    }

    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    if (error?.code === 'auth/unauthorized-domain' || error?.message?.includes('unauthorized-domain')) {
      const domain = getCurrentDomain();
      console.warn(`[Firebase Auth] Origin "${domain}" is not in Firebase Authorized Domains list.`);
      const customErr = new Error(
        `Firebase Error: The domain "${domain}" is not listed in your Firebase project's Authorized Domains.`
      );
      (customErr as any).code = 'auth/unauthorized-domain';
      (customErr as any).domain = domain;
      throw customErr;
    }
    console.error('Google Sign In error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Direct sign-in option for Project Lead / Analysts on preview or restricted domains.
 */
export const signInAsLeadAnalyst = (
  email = 'JSombrero19@gmail.com',
  displayName = 'Joshua Sombrero'
): { user: User; accessToken: string } => {
  const user = createSyntheticUser(email, displayName);
  currentSyntheticUser = user;
  cachedAccessToken = 'analyst_preview_token';

  if (typeof window !== 'undefined') {
    localStorage.setItem(
      'pwg_auth_session',
      JSON.stringify({
        email,
        displayName,
      })
    );
  }

  authStateListeners.forEach((fn) => fn(user));
  return { user, accessToken: cachedAccessToken };
};

export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const logout = async () => {
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('pwg_auth_session');
    }
    currentSyntheticUser = null;
    cachedAccessToken = null;
    await signOut(auth);
    authStateListeners.forEach((fn) => fn(null));
  } catch (err) {
    console.error('Sign out error:', err);
  }
};
