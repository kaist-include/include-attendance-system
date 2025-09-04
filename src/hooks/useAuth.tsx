'use client';

import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/client';
import { Profile, UserRole } from '@/types';
import { getErrorMessage } from '@/lib/utils';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  userRole: UserRole | null;
  loading: boolean;
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

  // Load user data (both profile and role)
  const loadUserData = useCallback(async (userId: string) => {
    const supabase = createClient();
    
    try {
      // Load user role from users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

      if (userError) {
        console.error('Error loading user role:', userError);
        
        // If user doesn't exist in users table, try to sync/create the user
        if (userError.code === 'PGRST116') {
          console.log('🔄 User not found in users table, attempting to sync...');
          
          try {
            // Get current session for API call
            const { data: sessionData } = await supabase.auth.getSession();
            const session = sessionData?.session;
            
            if (session?.access_token) {
              const response = await fetch('/api/users/sync', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${session.access_token}`,
                  'Content-Type': 'application/json',
                },
              });
              
              if (response.ok) {
                const result = await response.json();
                console.log('✅ User synced successfully:', result.user);
                setUserRole(result.user.role as UserRole);
              } else {
                console.error('❌ Failed to sync user');
                setUserRole('member' as UserRole); // Fallback
              }
            } else {
              console.error('❌ No session token available for sync');
              setUserRole('member' as UserRole); // Fallback
            }
          } catch (syncError) {
            console.error('❌ Error during user sync:', syncError);
            setUserRole('member' as UserRole); // Fallback
          }
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
  }, [user?.user_metadata?.name]);

  // Initialize auth state
  useEffect(() => {
    let mounted = true;
    const supabase = createClient();

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
      (event, session) => {
        if (!mounted) return;

        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user);
          // Use setTimeout to defer async operations and prevent deadlock
          setTimeout(async () => {
          await loadUserData(session.user.id);
          }, 0);
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
  }, [loadUserData]);

  // Update profile
  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user || !profile) throw new Error('User not authenticated');
    
    const supabase = createClient();

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