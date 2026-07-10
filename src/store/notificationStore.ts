import { create } from 'zustand';
import { db } from '@/firebase/config';
import { handleFirestoreError, OperationType } from '@/lib/firestoreErrors';
import { 
  collection, 
  query, 
  where, 
  or, 
  onSnapshot, 
  doc, 
  updateDoc,
  setDoc,
  deleteDoc
} from 'firebase/firestore';
import type { NotificationMessage, Movie } from '@/types';

interface NotificationState {
  notifications: NotificationMessage[];
  unreadCount: number;
  initialized: boolean;
  userId: string | null;
  dismissedNotificationIds: string[];
  addLocalNotification: (notification: Omit<NotificationMessage, 'id' | 'createdAt'>) => void;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearNotification: (notificationId: string) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  initListeners: (userId: string, watchedMovieIds: string[], moviesList: Movie[]) => () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => {
  let unsubscribeDb: (() => void) | null = null;
  let unsubscribeRatings: (() => void) | null = null;
  const mountTime = Date.now();

  return {
    notifications: [],
    unreadCount: 0,
    initialized: false,
    userId: null,
    dismissedNotificationIds: [],

    addLocalNotification: (notifData) => {
      const newNotif: NotificationMessage = {
        ...notifData,
        id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString(),
      };
      set((state) => {
        const updated = [newNotif, ...state.notifications];
        return {
          notifications: updated,
          unreadCount: updated.filter((n) => !n.read).length,
        };
      });
    },

    markAsRead: async (notificationId) => {
      // If it is a persistent database notification
      if (!notificationId.startsWith('local-')) {
        const { notifications, userId } = get();
        const notif = notifications.find((n) => n.id === notificationId);
        if (notif && notif.userId && notif.userId === userId) {
          try {
            const docRef = doc(db, 'notifications', notificationId);
            await updateDoc(docRef, { read: true });
          } catch (err) {
            console.error('Failed to mark notification as read in Firestore:', err);
          }
        }
      }

      set((state) => {
        const updated = state.notifications.map((n) => 
          n.id === notificationId ? { ...n, read: true } : n
        );
        return {
          notifications: updated,
          unreadCount: updated.filter((n) => !n.read).length,
        };
      });
    },

    markAllAsRead: async () => {
      const { notifications, userId } = get();
      const promises = notifications
        .filter((n) => !n.read && !n.id.startsWith('local-') && n.userId && n.userId === userId)
        .map((n) => {
          const docRef = doc(db, 'notifications', n.id);
          return updateDoc(docRef, { read: true });
        });

      if (promises.length > 0) {
        try {
          await Promise.all(promises);
        } catch (err) {
          console.error('Failed to mark all notifications as read in Firestore:', err);
        }
      }

      set((state) => {
        const updated = state.notifications.map((n) => ({ ...n, read: true }));
        return {
          notifications: updated,
          unreadCount: 0,
        };
      });
    },

    clearNotification: async (notificationId) => {
      const { dismissedNotificationIds, userId } = get();
      const updatedDismissed = [...dismissedNotificationIds, notificationId];
      if (userId) {
        try {
          localStorage.setItem(`dismissed_notifications_${userId}`, JSON.stringify(updatedDismissed));
        } catch (e) {
          console.warn('Failed to save dismissed notification to localStorage:', e);
        }
      }
      set((state) => {
        const updated = state.notifications.filter((n) => n.id !== notificationId);
        return {
          dismissedNotificationIds: updatedDismissed,
          notifications: updated,
          unreadCount: updated.filter((n) => !n.read).length,
        };
      });
    },

    clearAllNotifications: async () => {
      const { notifications, dismissedNotificationIds, userId } = get();
      const idsToDismiss = notifications.map((n) => n.id);
      const updatedDismissed = Array.from(new Set([...dismissedNotificationIds, ...idsToDismiss]));
      if (userId) {
        try {
          localStorage.setItem(`dismissed_notifications_${userId}`, JSON.stringify(updatedDismissed));
        } catch (e) {
          console.warn('Failed to save dismissed notifications to localStorage:', e);
        }
      }
      set({
        dismissedNotificationIds: updatedDismissed,
        notifications: [],
        unreadCount: 0,
      });
    },

    initListeners: (userId, watchedMovieIds, moviesList) => {
      // Load user-specific dismissed notifications from localStorage first
      let localDismissed: string[] = [];
      try {
        const stored = localStorage.getItem(`dismissed_notifications_${userId}`);
        if (stored) {
          localDismissed = JSON.parse(stored);
        }
      } catch (e) {
        console.warn('Failed to parse stored dismissed notifications:', e);
      }

      // Set user ID and loaded dismissed notification IDs in store
      set({ userId, dismissedNotificationIds: localDismissed });

      // Prevent double-binding
      if (unsubscribeDb) unsubscribeDb();
      if (unsubscribeRatings) unsubscribeRatings();

      const notificationsRef = collection(db, 'notifications');
      
      // Query notifications targeted to this user or global broadcasts (userId == null)
      const q = query(
        notificationsRef,
        or(
          where('userId', '==', userId),
          where('userId', '==', null)
        )
      );

      // 1. Listen for Firestore Notifications
      unsubscribeDb = onSnapshot(q, (snapshot) => {
        const fetchedNotifs: NotificationMessage[] = [];
        snapshot.forEach((doc) => {
          fetchedNotifs.push({ id: doc.id, ...doc.data() } as NotificationMessage);
        });

        // Get fresh dismissed lists to filter
        const { dismissedNotificationIds: currentDismissed } = get();
        const activeFetched = fetchedNotifs.filter((n) => !currentDismissed.includes(n.id));

        // Client-side sort by createdAt descending (avoids requiring composite indexes)
        activeFetched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        // Keep local notifications and merge with fetched ones
        set((state) => {
          const localOnly = state.notifications.filter((n) => n.id.startsWith('local-') && !currentDismissed.includes(n.id));
          // Filter out duplicates if any
          const merged = [...localOnly, ...activeFetched].reduce<NotificationMessage[]>((acc, current) => {
            if (!acc.some((item) => item.id === current.id)) {
              acc.push(current);
            }
            return acc;
          }, []);

          // Sort final merged list
          merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

          return {
            notifications: merged,
            unreadCount: merged.filter((n) => !n.read).length,
            initialized: true,
          };
        });
      }, (error) => {
        console.warn('Notifications stream error (using local state fallback):', error);
        if (error.code === 'permission-denied' || error.message?.includes('permission')) {
          handleFirestoreError(error, OperationType.LIST, 'notifications');
        }
      });

      // 2. Listen for ALL ratings to detect real-time ratings on watched movies
      const ratingsRef = collection(db, 'ratings');
      unsubscribeRatings = onSnapshot(ratingsRef, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const ratingData = change.doc.data();
            const ratingTime = new Date(ratingData.ratedAt).getTime();
            
            // Trigger alert only for ratings added AFTER the application mounted
            // and NOT rated by the user themselves
            if (ratingTime > mountTime && ratingData.userId !== userId) {
              const hasWatched = watchedMovieIds.includes(ratingData.movieId);
              
              if (hasWatched) {
                // Find movie title
                const movie = moviesList.find((m) => m.id === ratingData.movieId);
                const title = movie ? movie.title : 'A watched movie';
                const posterUrl = movie ? movie.posterUrl : undefined;

                // Create a real-time notification
                get().addLocalNotification({
                  title: '⭐ Watched Movie Rated!',
                  body: `Another subscriber rated "${title}" with ${ratingData.rating} stars!`,
                  actionUrl: ratingData.movieId,
                  read: false,
                  imageUrl: posterUrl,
                });
              }
            }
          }
        });
      }, (error) => {
        console.warn('Ratings notification stream error:', error);
        if (error.code === 'permission-denied' || error.message?.includes('permission')) {
          handleFirestoreError(error, OperationType.GET, 'ratings');
        }
      });

      // Return cleanup function to unsubscribe both snapshot listeners
      return () => {
        if (unsubscribeDb) {
          unsubscribeDb();
          unsubscribeDb = null;
        }
        if (unsubscribeRatings) {
          unsubscribeRatings();
          unsubscribeRatings = null;
        }
      };
    },
  };
});
