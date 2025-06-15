
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (userId: string, retries = 5, delay = 300) => {
    console.log(`Fetching user profile for user ID: ${userId}, attempt: ${6 - retries}`);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('supabase_uid', userId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116' && retries > 0) { // PGRST116 is 'not found'
          console.log(`User profile not found, retrying in ${delay}ms... (${retries - 1} retries left)`);
          await new Promise(res => setTimeout(res, delay));
          return fetchUserProfile(userId, retries - 1, delay * 1.5);
        } else {
          console.error('Final error fetching user profile:', error);
          setUserProfile(null);
          return;
        }
      }
      
      console.log('Successfully fetched user profile:', data);
      setUserProfile(data);
    } catch (catchError) {
      console.error('Exception in fetchUserProfile:', catchError);
      setUserProfile(null);
    }
  };

  const signOut = async () => {
    try {
      // Clean up localStorage
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
          localStorage.removeItem(key);
        }
      });
      
      await supabase.auth.signOut({ scope: 'global' });
      window.location.href = '/auth';
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  useEffect(() => {
    setLoading(true);
    console.log('Setting up auth state listener...');
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, 'Session:', !!session);
        setSession(session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        
        if (currentUser) {
          await fetchUserProfile(currentUser.id);
        } else {
          setUserProfile(null);
        }
        setLoading(false);
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
