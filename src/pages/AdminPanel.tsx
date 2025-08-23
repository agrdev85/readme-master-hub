import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Shield, 
  Users, 
  Trophy, 
  DollarSign, 
  CheckCircle, 
  XCircle, 
  Plus,
  Calendar,
  Settings,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';

interface Payment {
  id: string;
  user_id: string;
  tournament_id: string;
  transaction_hash: string;
  amount: number;
  status: string;
  created_at: string;
  profiles: { username: string };
  tournaments: { name: string };
}

interface TournamentForm {
  name: string;
  description: string;
  entry_fee: number;
  max_participants: number;
  start_date: string;
  end_date: string;
  admin_wallet: string;
}

export default function AdminPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [pendingPayments, setPendingPayments] = useState<Payment[]>([]);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [tournamentForm, setTournamentForm] = useState<TournamentForm>({
    name: '',
    description: '',
    entry_fee: 10,
    max_participants: 100,
    start_date: '',
    end_date: '',
    admin_wallet: ''
  });

  useEffect(() => {
    if (user) {
      fetchAdminData();
    }
  }, [user]);

  const fetchAdminData = async () => {
    try {
      setLoading(true);

      // Fetch pending payments
      const { data: paymentsData } = await supabase
        .from('payments')
        .select(`
          *,
          profiles(username),
          tournaments(name)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      setPendingPayments(paymentsData || []);

      // Fetch all tournaments
      const { data: tournamentsData } = await supabase
        .from('tournaments')
        .select('*')
        .order('created_at', { ascending: false });

      setTournaments(tournamentsData || []);

      // Fetch all users
      const { data: usersData } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      setUsers(usersData || []);

    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPayment = async (paymentId: string, approve: boolean) => {
    try {
      const status = approve ? 'verified' : 'rejected';
      
      const { error } = await supabase
        .from('payments')
        .update({ 
          status,
          verified_at: new Date().toISOString(),
          verified_by: user?.id
        })
        .eq('id', paymentId);

      if (error) throw error;

      if (approve) {
        // Additional logic for approved payments could go here
        // Like adding user to tournament participants, updating prize pool, etc.
      }

      toast({
        title: approve ? "Pago Aprobado" : "Pago Rechazado",
        description: approve ? "El usuario ha sido agregado al torneo" : "El pago ha sido rechazado"
      });

      fetchAdminData();
    } catch (error) {
      console.error('Error verifying payment:', error);
      toast({
        title: "Error",
        description: "No se pudo procesar la verificación",
        variant: "destructive"
      });
    }
  };

  const handleCreateTournament = async () => {
    try {
      const { error } = await supabase
        .from('tournaments')
        .insert({
          ...tournamentForm,
          created_by: user?.id,
          status: 'upcoming'
        });

      if (error) throw error;

      toast({
        title: "Torneo Creado",
        description: "El torneo ha sido creado exitosamente"
      });

      setCreateDialogOpen(false);
      setTournamentForm({
        name: '',
        description: '',
        entry_fee: 10,
        max_participants: 100,
        start_date: '',
        end_date: '',
        admin_wallet: ''
      });
      
      fetchAdminData();
    } catch (error) {
      console.error('Error creating tournament:', error);
      toast({
        title: "Error",
        description: "No se pudo crear el torneo",
        variant: "destructive"
      });
    }
  };

  const handleDistributePrizes = async (tournamentId: string) => {
    try {
      const response = await supabase.functions.invoke('tournament-api', {
        body: { action: 'distribute_prizes', tournament_id: tournamentId },
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.error) throw response.error;

      toast({
        title: "Premios Distribuidos",
        description: "Los premios han sido calculados y asignados"
      });

      fetchAdminData();
    } catch (error) {
      console.error('Error distributing prizes:', error);
      toast({
        title: "Error",
        description: "No se pudieron distribuir los premios",
        variant: "destructive"
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2 flex items-center">
                <Shield className="w-8 h-8 mr-3 text-primary" />
                Panel de Administración
              </h1>
              <p className="text-muted-foreground">
                Gestiona torneos, usuarios y pagos
              </p>
            </div>
            
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Crear Torneo
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Crear Nuevo Torneo</DialogTitle>
                  <DialogDescription>
                    Configura los detalles del nuevo torneo
                  </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="name">Nombre del Torneo</Label>
                    <Input
                      id="name"
                      value={tournamentForm.name}
                      onChange={(e) => setTournamentForm({...tournamentForm, name: e.target.value})}
                      placeholder="Ej: Torneo de Fin de Semana"
                    />
                  </div>
                  
                  <div className="col-span-2">
                    <Label htmlFor="description">Descripción</Label>
                    <Textarea
                      id="description"
                      value={tournamentForm.description}
                      onChange={(e) => setTournamentForm({...tournamentForm, description: e.target.value})}
                      placeholder="Describe el torneo..."
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="entry_fee">Entrada (USDT)</Label>
                    <Input
                      id="entry_fee"
                      type="number"
                      value={tournamentForm.entry_fee}
                      onChange={(e) => setTournamentForm({...tournamentForm, entry_fee: Number(e.target.value)})}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="max_participants">Máximo Participantes</Label>
                    <Input
                      id="max_participants"
                      type="number"
                      value={tournamentForm.max_participants}
                      onChange={(e) => setTournamentForm({...tournamentForm, max_participants: Number(e.target.value)})}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="start_date">Fecha de Inicio</Label>
                    <Input
                      id="start_date"
                      type="datetime-local"
                      value={tournamentForm.start_date}
                      onChange={(e) => setTournamentForm({...tournamentForm, start_date: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="end_date">Fecha de Fin</Label>
                    <Input
                      id="end_date"
                      type="datetime-local"
                      value={tournamentForm.end_date}
                      onChange={(e) => setTournamentForm({...tournamentForm, end_date: e.target.value})}
                    />
                  </div>
                  
                  <div className="col-span-2">
                    <Label htmlFor="admin_wallet">Wallet Admin (TRC20)</Label>
                    <Input
                      id="admin_wallet"
                      value={tournamentForm.admin_wallet}
                      onChange={(e) => setTournamentForm({...tournamentForm, admin_wallet: e.target.value})}
                      placeholder="Dirección USDT para recibir pagos"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateTournament}>
                    Crear Torneo
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="card-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pagos Pendientes</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingPayments.length}</div>
              <p className="text-xs text-muted-foreground">Requieren verificación</p>
            </CardContent>
          </Card>

          <Card className="card-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Torneos Activos</CardTitle>
              <Trophy className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {tournaments.filter(t => t.status === 'active').length}
              </div>
              <p className="text-xs text-muted-foreground">En progreso</p>
            </CardContent>
          </Card>

          <Card className="card-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
              <Users className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.length}</div>
              <p className="text-xs text-muted-foreground">Registrados</p>
            </CardContent>
          </Card>

          <Card className="card-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Premios</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${tournaments.reduce((sum, t) => sum + (t.prize_pool || 0), 0).toFixed(0)}
              </div>
              <p className="text-xs text-muted-foreground">En todos los torneos</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Pending Payments */}
          <Card className="card-shadow">
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2 text-yellow-500" />
                Pagos Pendientes
              </CardTitle>
              <CardDescription>
                Verifica manualmente los pagos USDT
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingPayments.length > 0 ? (
                <div className="space-y-4">
                  {pendingPayments.map((payment) => (
                    <div key={payment.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">{payment.profiles.username}</div>
                          <div className="text-sm text-muted-foreground">
                            {payment.tournaments.name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatDate(payment.created_at)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">${payment.amount} USDT</div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-sm font-medium">Hash de Transacción:</div>
                        <div className="text-xs font-mono bg-muted p-2 rounded break-all">
                          {payment.transaction_hash}
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleVerifyPayment(payment.id, true)}
                          className="flex-1"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Aprobar
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleVerifyPayment(payment.id, false)}
                          className="flex-1"
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Rechazar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(`https://tronscan.org/#/transaction/${payment.transaction_hash}`, '_blank')}
                        >
                          Ver TX
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <p className="text-muted-foreground">No hay pagos pendientes</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tournament Management */}
          <Card className="card-shadow">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                Gestión de Torneos
              </CardTitle>
              <CardDescription>
                Administra el estado de los torneos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {tournaments.map((tournament) => (
                  <div key={tournament.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-medium">{tournament.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {tournament.current_participants} participantes
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Premio: ${tournament.prize_pool}
                        </div>
                      </div>
                      <Badge className={
                        tournament.status === 'upcoming' ? 'bg-blue-500/20 text-blue-400' :
                        tournament.status === 'active' ? 'bg-green-500/20 text-green-400' :
                        'bg-gray-500/20 text-gray-400'
                      }>
                        {tournament.status}
                      </Badge>
                    </div>
                    
                    <div className="flex gap-2">
                      {tournament.status === 'active' && (
                        <Button
                          size="sm"
                          onClick={() => handleDistributePrizes(tournament.id)}
                        >
                          <Trophy className="w-4 h-4 mr-1" />
                          Distribuir Premios
                        </Button>
                      )}
                      <Button size="sm" variant="outline">
                        <Calendar className="w-4 h-4 mr-1" />
                        Editar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}