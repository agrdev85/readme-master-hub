import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Trophy, 
  Users, 
  DollarSign, 
  Target, 
  Clock,
  TrendingUp,
  Award,
  Calendar
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { user, profile } = useAuth();
  const [userTournaments, setUserTournaments] = useState<any[]>([]);
  const [userScores, setUserScores] = useState<any[]>([]);
  const [userPayments, setUserPayments] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalTournaments: 0,
    totalWinnings: 0,
    bestScore: 0,
    rank: 0
  });

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    if (!user) return;

    try {
      // Fetch user tournaments
      const { data: tournaments } = await supabase
        .from('tournament_participants')
        .select(`
          *,
          tournaments:tournament_id (*)
        `)
        .eq('user_id', user.id);

      // Fetch user scores
      const { data: scores } = await supabase
        .from('scores')
        .select(`
          *,
          tournaments:tournament_id (name)
        `)
        .eq('user_id', user.id)
        .order('score', { ascending: false });

      // Fetch user payments
      const { data: payments } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      setUserTournaments(tournaments || []);
      setUserScores(scores || []);
      setUserPayments(payments || []);

      // Calculate stats
      const totalWinnings = payments?.filter(p => p.status === 'verified').reduce((sum, p) => sum + p.amount, 0) || 0;
      const bestScore = scores?.length > 0 ? scores[0].score : 0;

      setStats({
        totalTournaments: tournaments?.length || 0,
        totalWinnings,
        bestScore,
        rank: 0 // You could calculate this based on all user scores
      });
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-500/20 text-blue-400';
      case 'active': return 'bg-green-500/20 text-green-400';
      case 'finished': return 'bg-gray-500/20 text-gray-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-400';
      case 'verified': return 'bg-green-500/20 text-green-400';
      case 'rejected': return 'bg-red-500/20 text-red-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Acceso Denegado</h1>
          <p className="text-muted-foreground">Debes iniciar sesión para ver tu dashboard</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">
            Bienvenido de vuelta, {profile?.username || user.email}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="card-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Torneos Jugados</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTournaments}</div>
              <p className="text-xs text-muted-foreground">Total participaciones</p>
            </CardContent>
          </Card>

          <Card className="card-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ganancias Totales</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.totalWinnings}</div>
              <p className="text-xs text-muted-foreground">En USDT</p>
            </CardContent>
          </Card>

          <Card className="card-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Mejor Score</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.bestScore.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Puntuación máxima</p>
            </CardContent>
          </Card>

          <Card className="card-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ranking</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">#{stats.rank || '--'}</div>
              <p className="text-xs text-muted-foreground">Posición global</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Active Tournaments */}
          <Card className="card-shadow">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                Mis Torneos
              </CardTitle>
              <CardDescription>
                Torneos en los que estás participando
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {userTournaments.length > 0 ? (
                  userTournaments.slice(0, 5).map((participation) => {
                    const tournament = participation.tournaments;
                    return (
                      <div key={participation.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium">{tournament.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(tournament.start_date)}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={getStatusColor(tournament.status)}>
                            {tournament.status}
                          </Badge>
                          <Link to={`/tournaments/${tournament.id}`}>
                            <Button size="sm" variant="outline">Ver</Button>
                          </Link>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8">
                    <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No tienes torneos activos</p>
                    <Link to="/tournaments">
                      <Button className="mt-4">Explorar Torneos</Button>
                    </Link>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Scores */}
          <Card className="card-shadow">
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                Últimas Puntuaciones
              </CardTitle>
              <CardDescription>
                Tu rendimiento reciente
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {userScores.length > 0 ? (
                  userScores.slice(0, 5).map((score) => (
                    <div key={score.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{score.tournaments?.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(score.submitted_at)}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-primary">
                          {score.score.toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground">puntos</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No tienes puntuaciones registradas</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Payment History */}
          <Card className="card-shadow lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="w-5 h-5 mr-2" />
                Historial de Pagos
              </CardTitle>
              <CardDescription>
                Tus transacciones y ganancias
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {userPayments.length > 0 ? (
                  userPayments.slice(0, 5).map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">${payment.amount} USDT</h4>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(payment.created_at)}
                        </p>
                        {payment.transaction_hash && (
                          <p className="text-xs text-muted-foreground font-mono">
                            {payment.transaction_hash.slice(0, 20)}...
                          </p>
                        )}
                      </div>
                      <Badge className={getPaymentStatusColor(payment.status)}>
                        {payment.status}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No tienes transacciones registradas</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}