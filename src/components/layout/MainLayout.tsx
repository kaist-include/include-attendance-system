'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
// Icons replaced with unicode symbols
import { cn } from '@/utils';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES } from '@/config/constants';

interface MainLayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  href: string;
  label: string;
  icon: string;
  roles?: string[];
}

const navItems: NavItem[] = [
  {
    href: ROUTES.dashboard,
    label: '대시보드',
    icon: '🏠',
  },
  {
    href: ROUTES.seminars,
    label: '세미나',
    icon: '📅',
  },
  {
    href: ROUTES.admin,
    label: '관리자',
    icon: '👥',
    roles: ['admin', 'seminar_leader'],
  },
];

export default function MainLayout({ children }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, profile, signOut, isAdmin, isSeminarLeader } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push(ROUTES.login);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const filteredNavItems = navItems.filter(item => {
    if (!item.roles) return true;
    return item.roles.some(role => {
      if (role === 'admin') return isAdmin;
      if (role === 'seminar_leader') return isSeminarLeader;
      return false;
    });
  });

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-card text-card-foreground shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-border">
          <Link href={ROUTES.home} className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">I</span>
            </div>
            <span className="text-xl font-semibold text-foreground">Include</span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent"
          >
            <span>✕</span>
          </button>
        </div>

        {/* Navigation */}
        <nav className="mt-8 px-6">
          <ul className="space-y-2">
            {filteredNavItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "bg-accent text-accent-foreground border-r-2 border-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User Section */}
        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-border">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
              <span className="text-lg">👤</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {profile?.nickname || user?.email || '사용자'}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.email}
              </p>
            </div>
          </div>
          
          <div className="space-y-1">
            <Link
              href={ROUTES.profile}
              className="flex items-center space-x-3 px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              onClick={() => setSidebarOpen(false)}
            >
              <span>⚙️</span>
              <span>설정</span>
            </Link>
            
            <button
              onClick={handleSignOut}
              className="flex items-center space-x-3 px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground w-full text-left"
            >
              <span>🚪</span>
              <span>로그아웃</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
        {/* Top Bar */}
        <header className="bg-card text-card-foreground shadow-sm border-b border-border">
          <div className="flex items-center justify-between h-16 px-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent"
              >
                <span>☰</span>
              </button>
              
              {/* Search Bar */}
              <div className="hidden md:block relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-muted-foreground">🔍</span>
                </div>
                <input
                  type="text"
                  placeholder="세미나 검색..."
                  className="block w-80 pl-10 pr-3 py-2 border border-input bg-background rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                />
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <button className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent relative">
                <span>🔔</span>
                <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full"></span>
              </button>

              {/* User Avatar */}
              <Link
                href={ROUTES.profile}
                className="flex items-center space-x-2 p-2 rounded-lg hover:bg-accent"
              >
                <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                  <span className="text-sm">👤</span>
                </div>
                <span className="hidden md:block text-sm font-medium text-muted-foreground">
                  {profile?.nickname || '사용자'}
                </span>
              </Link>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-background">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
} 