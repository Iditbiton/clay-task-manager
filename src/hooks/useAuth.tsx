
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

  const createUserProfile = async (userId: string, email: string, name?: string) => {
    console.log('Creating user profile for:', userId, email, name);
    try {
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          supabase_uid: userId,
          email: email,
          name: name || ''
        })
        .select()
        .single();
        
      console.log('User profile creation result:', { newUser, createError });
      
      if (createError) {
        console.error('Failed to create user profile:', createError);
        return null;
      }
      
      if (newUser) {
        console.log('Successfully created user profile:', newUser);
        setUserProfile(newUser);
        return newUser;
      }
      
      return null;
    } catch (error) {
      console.error('Error creating user profile:', error);
      return null;
    }
  };

  const fetchUserProfile = async (userId: string) => {
    console.log('Fetching user profile for user ID:', userId);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('supabase_uid', userId)
        .single();
      
      console.log('User profile fetch result:', { data, error });
      
      if (error) {
        console.error('Error fetching user profile:', error);
        
        // If user doesn't exist (PGRST116 is "not found"), try to create it
        if (error.code === 'PGRST116') {
          console.log('User profile not found, attempting to create...');
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          
          if (currentUser) {
            console.log('Current user data for profile creation:', {
              id: currentUser.id,
              email: currentUser.email,
              metadata: currentUser.user_metadata
            });
            
            const createdProfile = await createUserProfile(
              currentUser.id,
              currentUser.email!,
              currentUser.user_metadata?.name
            );
            
            if (createdProfile) {
              console.log('Successfully created and set user profile');
            } else {
              console.error('Failed to create user profile');
            }
          } else {
            console.error('No current user found for profile creation');
          }
        }
        return;
      }
      
      console.log('Successfully fetched user profile:', data);
      setUserProfile(data);
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
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
    console.log('Setting up auth state listener...');
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event, 'Session:', !!session);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          console.log('User signed in, fetching profile...');
          // Use setTimeout to prevent potential deadlocks
          setTimeout(() => {
            fetchUserProfile(session.user.id);
          }, 100);
        } else {
          console.log('No user session, clearing profile');
          setUserProfile(null);
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    console.log('Checking for existing session...');
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session check:', !!session);
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        console.log('Found existing session, fetching profile...');
        fetchUserProfile(session.user.id);
      }
      
      setLoading(false);
    });

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
