'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, getCurrentUser, signOut } from '@/lib/supabase';
import { Profile, UserRole } from '@/types';
import { getErrorMessage } from '@/lib/utils';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  userRole: UserRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  hasRole: (role: UserRole) => boolean;
  isAdmin: boolean;
  isSeminarLeader: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const useAuthProvider = (): AuthContextType => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize auth state
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (mounted) {
          if (session?.user) {
            setUser(session.user);
            await loadUserData(session.user.id);
          }
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(getErrorMessage(err));
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user);
          await loadUserData(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
          setUserRole(null);
        }
        
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Load user data (both profile and role)
  const loadUserData = async (userId: string) => {
    try {
      // Load user role from users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

      if (userError) {
        console.error('Error loading user role:', userError);
        
        // If user doesn't exist in users table, create one
        if (userError.code === 'PGRST116') {
          console.log('User not found in users table, will be created by trigger or manually');
          
          // For now, set a default role and let the user know they need to be added to the system
          setUserRole('member' as UserRole);
          console.log('Temporarily set role to member - user record needs to be created in database');
        } else {
          throw userError;
        }
      } else {
        setUserRole(userData.role as UserRole);
      }

      // Load user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError) {
        // If profile doesn't exist, create one
        if (profileError.code === 'PGRST116') {
          console.log('Profile not found, creating profile...');
          
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert({
              user_id: userId,
              nickname: user?.user_metadata?.name || '',
            })
            .select()
            .single();

          if (createError) {
            console.error('Error creating profile:', createError);
            throw createError;
          }
          
          console.log('Profile created successfully:', newProfile);
          setProfile(newProfile);
        } else {
          throw profileError;
        }
      } else {
        setProfile(profileData);
      }
    } catch (err) {
      console.error('Error loading user data:', err);
      setError(getErrorMessage(err));
    }
  };

  // Sign in
  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // User data will be loaded automatically by the auth state change listener
    } catch (err) {
      setError(getErrorMessage(err));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Sign up
  const signUp = async (email: string, password: string, name: string) => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
        },
      });

      if (error) throw error;
    } catch (err) {
      setError(getErrorMessage(err));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Sign out
  const handleSignOut = async () => {
    try {
      setLoading(true);
      setError(null);
      await signOut();
    } catch (err) {
      setError(getErrorMessage(err));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Update profile
  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user || !profile) throw new Error('User not authenticated');

    try {
      setError(null);

      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (err) {
      setError(getErrorMessage(err));
      throw err;
    }
  };

  // Role checking utilities
  const hasRole = (role: UserRole): boolean => {
    if (!userRole) return false;
    
    // Admin has access to everything
    if (userRole === 'admin') return true;
    
    // Seminar leaders have access to seminar_leader and member roles
    if (userRole === 'seminar_leader' && (role === 'seminar_leader' || role === 'member')) return true;
    
    // Check exact role match
    return userRole === role;
  };

  const isAdmin = userRole === 'admin';
  const isSeminarLeader = userRole === 'seminar_leader' || isAdmin;

  return {
    user,
    profile,
    userRole,
    loading,
    signIn,
    signUp,
    signOut: handleSignOut,
    updateProfile,
    hasRole,
    isAdmin,
    isSeminarLeader,
    error,
  };
};

// Auth Provider Component
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const auth = useAuthProvider();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
};

// Protected route hook
export const useRequireAuth = (redirectTo = '/login') => {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      window.location.href = redirectTo;
    }
  }, [user, loading, redirectTo]);

  return { user, loading };
};

// Role-based access hook
export const useRequireRole = (requiredRole: UserRole, redirectTo = '/') => {
  const { user, profile, loading, hasRole } = useAuth();

  useEffect(() => {
    if (!loading && user && profile && !hasRole(requiredRole)) {
      window.location.href = redirectTo;
    }
  }, [user, profile, loading, hasRole, requiredRole, redirectTo]);

  return { user, profile, loading, hasAccess: hasRole(requiredRole) };
}; 