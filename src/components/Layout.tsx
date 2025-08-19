import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/hooks/useAuth';
import { 
  Menu, 
  Trophy, 
  User, 
  LogOut, 
  Home, 
  Calendar,
  BarChart3,
  Target
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { user, profile, signOut } = useAuth();
  const location = useLocation();

  const navItems = [
    { href: '/', label: 'Inicio', icon: Home },
    { href: '/tournaments', label: 'Torneos', icon: Trophy },
    { href: '/leaderboard', label: 'Clasificación', icon: BarChart3 },
    ...(user ? [
      { href: '/dashboard', label: 'Dashboard', icon: Target },
      { href: '/profile', label: 'Perfil', icon: User },
    ] : []),
  ];

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2">
              <Target className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold text-foreground">CuFire</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-6">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive(item.href)
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>

            {/* User Actions */}
            <div className="flex items-center space-x-4">
              {user ? (
                <div className="hidden md:flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">
                    Hola, {profile?.username || profile?.full_name || 'Usuario'}
                  </span>
                  <Button variant="outline" size="sm" onClick={handleSignOut}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Salir
                  </Button>
                </div>
              ) : (
                <div className="hidden md:flex items-center space-x-2">
                  <Button variant="outline" asChild>
                    <Link to="/login">Iniciar Sesión</Link>
                  </Button>
                  <Button asChild>
                    <Link to="/register">Registrarse</Link>
                  </Button>
                </div>
              )}

              {/* Mobile menu */}
              <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="md:hidden">
                    <Menu className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[300px]">
                  <div className="mt-6 space-y-4">
                    {navItems.map((item) => (
                      <Link
                        key={item.href}
                        to={item.href}
                        className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          isActive(item.href)
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        }`}
                        onClick={() => setIsOpen(false)}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    ))}
                    
                    {user ? (
                      <Button 
                        variant="outline" 
                        className="w-full justify-start" 
                        onClick={() => {
                          handleSignOut();
                          setIsOpen(false);
                        }}
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Salir
                      </Button>
                    ) : (
                      <div className="space-y-2">
                        <Button variant="outline" className="w-full" asChild>
                          <Link to="/login" onClick={() => setIsOpen(false)}>
                            Iniciar Sesión
                          </Link>
                        </Button>
                        <Button className="w-full" asChild>
                          <Link to="/register" onClick={() => setIsOpen(false)}>
                            Registrarse
                          </Link>
                        </Button>
                      </div>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>{children}</main>
    </div>
  );
}