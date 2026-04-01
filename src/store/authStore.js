import { create } from 'zustand';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export const useAuthStore = create((set) => ({
  user: null,
  loading: true,

  setUser: (userData) => set({ user: userData }),

  initializeAuthListener: () => {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        set({ loading: true });
        try {
          const userDocRef = doc(db, 'Users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            set({
              user: {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                name: userDoc.data().name,
                role: userDoc.data().role,
                avatar: userDoc.data().avatar || null,
                age: userDoc.data().age || null,
                city: userDoc.data().city || null,
                orgCategory: userDoc.data().orgCategory || null,
              },
              loading: false,
            });
          } else {
            console.warn('No Firestore doc for user — rejecting access.');
            set({ user: null, loading: false });
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          set({ user: null, loading: false });
        }
      } else {
        set({ user: null, loading: false });
      }
    });
  },

  logout: async () => {
    try {
      await signOut(auth);
      set({ user: null });
    } catch (error) {
      console.error('Logout error:', error);
    }
  },
}));
