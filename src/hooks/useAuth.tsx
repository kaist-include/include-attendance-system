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
  const [userDataLoading, setUserDataLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load user data (both profile and role) - now non-blocking
  const loadUserData = useCallback(async (userId: string) => {
    const supabase = createClient();
    
    try {
      setUserDataLoading(true);
      console.log('🔄 Loading user data for:', userId);
      
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
          console.log('🔄 User not found in users table, attempting to sync in background...');
          
          try {
            // Don't await this - let it happen in background
            fetch('/api/users/sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' }
            }).then(async (response) => {
              if (response.ok) {
                const syncResult = await response.json();
                console.log('✅ Background user sync completed:', syncResult);
                // Retry loading user data after sync
                const { data: retryUserData } = await supabase
                  .from('users')
                  .select('role')
                  .eq('id', userId)
                  .single();
                
                if (retryUserData?.role) {
                  setUserRole(retryUserData.role);
                  console.log('✅ User role loaded after sync:', retryUserData.role);
                }
              } else {
                console.error('❌ Background user sync failed:', response.status);
              }
            }).catch(err => {
              console.error('❌ Background user sync error:', err);
            });
            
            // Set default role for now
            setUserRole('member');
            console.log('🔄 Using default role "member" while sync completes in background');
          } catch (syncError) {
            console.error('Failed to sync user:', syncError);
            setUserRole('member'); // Default fallback
          }
        } else {
          console.error('Database error loading user:', userError);
          setUserRole('member'); // Default fallback
        }
      } else {
        setUserRole(userData.role);
        console.log('✅ User role loaded:', userData.role);
      }

      // Load profile from profiles table (also non-blocking)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError) {
        console.error('Error loading profile:', profileError);
        // Create a basic profile from user metadata
        const basicProfile = {
          id: userId,
          user_id: userId,
          nickname: user?.user_metadata?.name || user?.email?.split('@')[0] || 'User',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        setProfile(basicProfile);
      } else {
        setProfile(profileData);
        console.log('✅ Profile loaded successfully');
      }

    } catch (err) {
      console.error('Error in loadUserData:', err);
      // Set defaults so the app can still function
      setUserRole('member');
      setProfile({
        id: userId,
        user_id: userId,
        nickname: user?.user_metadata?.name || 'User',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      setError(getErrorMessage(err));
    } finally {
      setUserDataLoading(false);
    }
  }, [user?.user_metadata?.name, user?.email]);

  // Initialize auth state
  useEffect(() => {
    let mounted = true;
    let sessionPollInterval: NodeJS.Timeout | null = null;
    const supabase = createClient();

    const checkForSession = async (): Promise<boolean> => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          console.log('✅ Session found:', session.user.email);
          if (mounted) {
            setUser(session.user);
            loadUserData(session.user.id).catch(err => {
              console.error('Background user data loading failed:', err);
            });
          }
          return true;
        }
        return false;
      } catch (error) {
        console.error('Error checking session:', error);
        return false;
      }
    };

    const initializeAuth = async () => {
      try {
        // Try multiple approaches to get the session
        console.log('🔄 Starting auth initialization...');
        
        // First, try to get the session normally
        let { data: { session } } = await supabase.auth.getSession();
        
        // If no session found, try refreshing the session
        if (!session) {
          console.log('⚠️ No initial session found, attempting to refresh...');
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          if (refreshData?.session && !refreshError) {
            session = refreshData.session;
            console.log('✅ Session refreshed successfully');
          } else {
            console.log('❌ Session refresh failed:', refreshError);
          }
        }
        
        console.log(`Initial auth check: ${session?.user ? session.user.email : 'No session'}`);
        
        // Mobile debugging: Check if we're on mobile and log storage availability
        if (typeof window !== 'undefined') {
          const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
          if (isMobile) {
            console.log('🔍 Mobile device detected - checking storage capabilities');
            
            // Test localStorage availability
            try {
              localStorage.setItem('test', 'test');
              localStorage.removeItem('test');
              console.log('✅ localStorage available on mobile');
            } catch (e) {
              console.warn('⚠️ localStorage not available on mobile, using cookie fallback');
            }
            
            // Check cookie support
            const cookiesEnabled = navigator.cookieEnabled;
            console.log(`🍪 Cookies enabled: ${cookiesEnabled}`);
            
            // Check for existing auth cookies
            const authCookies = document.cookie.split(';').filter(cookie => 
              cookie.trim().includes('sb-') || cookie.trim().includes('auth')
            );
            console.log(`🔑 Found ${authCookies.length} potential auth cookies`);
            
            // Log actual cookie names for debugging
            if (authCookies.length > 0) {
              console.log('🔑 Auth cookie names:', authCookies.map(c => c.trim().split('=')[0]));
            }
          }
        }
        
        if (mounted) {
          if (session?.user) {
            setUser(session.user);
            // Load user data in background - don't block auth loading
            loadUserData(session.user.id).catch(err => {
              console.error('Background user data loading failed:', err);
            });
          } else {
            // Start polling for session if not found immediately
            console.log('🔄 Starting session polling...');
            let pollAttempts = 0;
            const maxPollAttempts = 10; // Poll for up to 10 seconds
            
            sessionPollInterval = setInterval(async () => {
              if (!mounted) return;
              
              pollAttempts++;
              console.log(`🔄 Session poll attempt ${pollAttempts}/${maxPollAttempts}`);
              
              const sessionFound = await checkForSession();
              if (sessionFound || pollAttempts >= maxPollAttempts) {
                if (sessionPollInterval) {
                  clearInterval(sessionPollInterval);
                  sessionPollInterval = null;
                }
                
                if (!sessionFound) {
                  console.log('❌ Session polling completed - no session found');
                }
              }
            }, 1000); // Poll every second
          }
          // Set loading to false immediately after session check
          setLoading(false);
          console.log('✅ Auth initialization completed - UI unblocked');
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        if (mounted) {
          setError(getErrorMessage(err));
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes with enhanced mobile logging
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;

        console.log(`Auth state change: ${event}, User: ${session?.user ? session.user.email : 'None'}`);
        
        // Clear polling if we get an auth state change
        if (sessionPollInterval) {
          clearInterval(sessionPollInterval);
          sessionPollInterval = null;
        }
        
        // Enhanced mobile logging for auth changes
        if (typeof window !== 'undefined') {
          const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
          if (isMobile) {
            console.log(`📱 Mobile auth event: ${event}`);
            if (event === 'SIGNED_IN') {
              console.log('✅ Mobile sign-in successful - session should persist');
            } else if (event === 'SIGNED_OUT') {
              console.log('🚪 Mobile sign-out - clearing storage');
            } else if (event === 'TOKEN_REFRESHED') {
              console.log('🔄 Mobile token refresh - session maintained');
            }
          }
        }

        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user);
          // Load user data in background - don't block auth state changes
          loadUserData(session.user.id).catch(err => {
            console.error('Background user data loading failed:', err);
          });
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
          setUserRole(null);
        }
        
        // Don't set loading to false here if it's already false
        if (loading) {
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      if (sessionPollInterval) {
        clearInterval(sessionPollInterval);
      }
      subscription.unsubscribe();
    };
  }, [loadUserData, loading]);

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
    
    // Check exact role match
    return userRole === role;
  };

  const isAdmin = userRole === 'admin';

  return {
    user,
    profile,
    userRole,
    loading,
    updateProfile,
    hasRole,
    isAdmin,
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
    if (!loading) {
      if (!user) {
        console.log('useRequireAuth: No user found, trusting middleware to handle redirect');
      } else {
        console.log('useRequireAuth: User found:', user.email);
      }
    }
  }, [user, loading, redirectTo]);

  // Just return the auth state - let middleware handle redirects
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