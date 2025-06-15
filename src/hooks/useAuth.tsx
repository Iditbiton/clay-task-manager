
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
      cleanupAuthState();
      // Attempt global sign out, but continue if it fails.
      await supabase.auth.signOut({ scope: 'global' });
    } catch (error) {
      console.error('Error during sign out, continuing with redirect...', error);
    }
    // ALWAYS redirect to ensure a clean state.
    window.location.href = '/auth';
  };

  const fetchUserProfile = async (user: User): Promise<UserProfile | null> => {
    console.log(`Fetching or creating user profile for user ID: ${user.id}`);
    try {
      // First, try to fetch the existing profile
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

      // If profile does not exist, create it
      console.log(`User profile not found for ${user.id}, attempting to create one.`);
      const { data: newProfile, error: insertError } = await supabase
        .from('users')
        .insert({
          supabase_uid: user.id,
          email: user.email,
          name: user.user_metadata?.name || '',
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
    setLoading(true);
    console.log('Setting up auth state listener...');
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event, 'Session:', !!session);
        setSession(session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        
        if (currentUser) {
          // Defer Supabase calls with setTimeout to avoid deadlocks
          setTimeout(() => {
            fetchUserProfile(currentUser).then(profile => {
              setUserProfile(profile);
              if (!profile) {
                console.warn("User authenticated, but profile data is missing and could not be created. The app might not function correctly without a profile.");
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
