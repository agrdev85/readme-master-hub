import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Wallet, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function Profile() {
  const { user, profile, updateProfile } = useAuth();
  const [formData, setFormData] = useState({
    username: profile?.username || '',
    fullName: profile?.full_name || '',
    usdtWallet: profile?.usdt_wallet || '',
  });
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await updateProfile({
        username: formData.username,
        full_name: formData.fullName,
        usdt_wallet: formData.usdtWallet,
      });
      toast.success('Perfil actualizado exitosamente');
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar perfil');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Acceso Denegado</h1>
          <p className="text-muted-foreground">Debes iniciar sesión para ver tu perfil</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Mi Perfil</h1>
          <p className="text-muted-foreground">Administra tu información personal</p>
        </div>

        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="w-5 h-5 mr-2" />
              Información Personal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={user.email || ''}
                  disabled
                  className="bg-muted/30"
                />
                <p className="text-xs text-muted-foreground">
                  El email no se puede cambiar
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  placeholder="Tu nombre de usuario"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullName">Nombre Completo</Label>
                <Input
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  placeholder="Tu nombre completo"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="usdtWallet" className="flex items-center">
                  <Wallet className="w-4 h-4 mr-2" />
                  Wallet USDT (TRC20)
                </Label>
                <Input
                  id="usdtWallet"
                  name="usdtWallet"
                  value={formData.usdtWallet}
                  onChange={handleInputChange}
                  placeholder="Tu dirección de wallet USDT"
                />
                <p className="text-xs text-muted-foreground">
                  Esta dirección se usará para recibir tus ganancias
                </p>
              </div>

              <Button 
                type="submit" 
                className="w-full"
                disabled={loading}
              >
                <Save className="w-4 h-4 mr-2" />
                {loading ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}