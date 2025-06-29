import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type UserProfile = Tables<'users'>;

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const cleanupAuthState = () => {
  console.log('Cleaning up auth state from localStorage...');
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      localStorage.removeItem(key);
    }
  });
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const signOut = async () => {
    try {
      console.log('Starting sign out process...');
      cleanupAuthState();
      
      // ניסיון התנתקות גלובלית
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) {
        console.warn('Sign out error (continuing with redirect):', error);
      }
    } catch (error) {
      console.error('Error during sign out, continuing with redirect...', error);
    }
    
    // תמיד להפנות למסך התחברות
    window.location.href = '/auth';
  };

  const fetchUserProfile = async (user: User): Promise<UserProfile | null> => {
    console.log(`Fetching or creating user profile for user ID: ${user.id}`);
    try {
      // ניסיון לטעון פרופיל קיים
      const { data: existingProfile, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('supabase_uid', user.id)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching user profile:', fetchError);
        return null;
      }

      if (existingProfile) {
        console.log('Successfully fetched existing user profile:', existingProfile);
        return existingProfile;
      }

      // יצירת פרופיל חדש אם לא קיים
      console.log(`User profile not found for ${user.id}, attempting to create one.`);
      const { data: newProfile, error: insertError } = await supabase
        .from('users')
        .insert({
          supabase_uid: user.id,
          email: user.email || '',
          name: user.user_metadata?.name || user.user_metadata?.full_name || '',
        })
        .select()
        .single();
      
      if (insertError) {
        console.error('Error creating user profile:', insertError);
        return null;
      }

      console.log('Successfully created and fetched new user profile:', newProfile);
      return newProfile;
    } catch (catchError) {
      console.error('Exception in fetchUserProfile:', catchError);
      return null;
    }
  };

  useEffect(() => {
    console.log('Setting up auth state listener...');
    
    // קבלת הסשן הנוכחי
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Error getting initial session:', error);
      }
      console.log('Initial session:', !!session);
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserProfile(session.user).then(profile => {
          setUserProfile(profile);
          if (!profile) {
            console.warn("User authenticated, but profile data is missing and could not be created.");
          }
        }).finally(() => {
          setLoading(false);
        });
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });
    
    // האזנה לשינויים בסטטוס האימות
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event, 'Session:', !!session);
        setSession(session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        
        if (currentUser) {
          // דחיית קריאות Supabase עם setTimeout למניעת deadlocks
          setTimeout(() => {
            fetchUserProfile(currentUser).then(profile => {
              setUserProfile(profile);
              if (!profile) {
                console.warn("User authenticated, but profile data is missing and could not be created.");
              }
            }).finally(() => {
              setLoading(false);
            });
          }, 0);
        } else {
          setUserProfile(null);
          setLoading(false);
        }
      }
    );

    return () => {
      console.log('Cleaning up auth subscription');
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      userProfile,
      session,
      loading,
      signOut
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}