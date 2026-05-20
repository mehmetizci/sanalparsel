'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { LogOut, User, Drone, Menu, X } from 'lucide-react';
import { useState } from 'react';

const APP_NAME = 'SanalParsel';

export function Navbar() {
  const { user, signOut, loading } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="glass-strong sticky top-0 z-40 border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-500 flex items-center justify-center">
              <Drone className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold gradient-text">{APP_NAME}</span>
          </Link>

          {/* Desktop menu */}
          <div className="hidden md:flex items-center gap-4">
            {!loading && user ? (
              <>
                <Link
                  href="/dashboard"
                  className="text-sm text-muted hover:text-foreground transition-colors"
                >
                  Panel
                </Link>
                <Link
                  href="/dashboard/new-project"
                  className="text-sm text-muted hover:text-foreground transition-colors"
                >
                  Yeni Proje
                </Link>
                <div className="flex items-center gap-3 ml-4 pl-4 border-l border-border">
                  <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
                    <User className="w-4 h-4 text-red-500" />
                  </div>
                  <span className="text-sm text-foreground">
                    {user.email?.split('@')[0]}
                  </span>
                  <button
                    onClick={signOut}
                    className="p-1.5 rounded-lg hover:bg-card transition-colors cursor-pointer"
                    title="Çıkış Yap"
                  >
                    <LogOut className="w-4 h-4 text-muted" />
                  </button>
                </div>
              </>
            ) : !loading ? (
              <div className="flex items-center gap-3">
                <Link href="/auth/login">
                  <Button variant="ghost" size="sm">
                    Giriş Yap
                  </Button>
                </Link>
                <Link href="/auth/register">
                  <Button size="sm">Kayıt Ol</Button>
                </Link>
              </div>
            ) : null}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-card transition-colors cursor-pointer"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-border p-4 space-y-3 glass-strong">
          {user ? (
            <>
              <Link
                href="/dashboard"
                className="block py-2 text-sm text-muted hover:text-foreground"
                onClick={() => setMenuOpen(false)}
              >
                Panel
              </Link>
              <Link
                href="/dashboard/new-project"
                className="block py-2 text-sm text-muted hover:text-foreground"
                onClick={() => setMenuOpen(false)}
              >
                Yeni Proje
              </Link>
              <button
                onClick={() => {
                  signOut();
                  setMenuOpen(false);
                }}
                className="block py-2 text-sm text-red-400 cursor-pointer"
              >
                Çıkış Yap
              </button>
            </>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="block py-2 text-sm text-muted hover:text-foreground"
                onClick={() => setMenuOpen(false)}
              >
                Giriş Yap
              </Link>
              <Link
                href="/auth/register"
                className="block py-2 text-sm text-red-500 hover:text-red-400"
                onClick={() => setMenuOpen(false)}
              >
                Kayıt Ol
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}