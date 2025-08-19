import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, Users, DollarSign, Calendar, Target } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Tournament {
  id: string;
  name: string;
  prize_pool: number;
  entry_fee: number;
  start_date: string;
  end_date: string;
  status: string;
  current_participants: number;
  max_participants: number;
}

interface UserStats {
  totalTournaments: number;
  totalWinnings: number;
  bestRank: number;
  averageScore: number;
}

export default function Dashboard() {
  const { user, profile } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [userStats, setUserStats] = useState<UserStats>({
    totalTournaments: 0,
    totalWinnings: 0,
    bestRank: 0,
    averageScore: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      // Fetch active tournaments
      const { data: tournamentsData } = await supabase
        .from('tournaments')
        .select('*')
        .in('status', ['upcoming', 'active'])
        .order('start_date', { ascending: true })
        .limit(3);

      setTournaments(tournamentsData || []);

      // Fetch user stats
      if (user) {
        const { data: scoresData } = await supabase
          .from('scores')
          .select('score, tournament_id')
          .eq('user_id', user.id);

        const { data: participantData } = await supabase
          .from('tournament_participants')
          .select('tournament_id')
          .eq('user_id', user.id);

        setUserStats({
          totalTournaments: participantData?.length || 0,
          totalWinnings: 0, // This would need a more complex query
          bestRank: scoresData?.length ? Math.min(...scoresData.map(s => s.score)) : 0,
          averageScore: scoresData?.length 
            ? Math.round(scoresData.reduce((sum, s) => sum + s.score, 0) / scoresData.length)
            : 0,
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'secondary';
      case 'active': return 'default';
      case 'finished': return 'outline';
      default: return 'secondary';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'upcoming': return 'Próximo';
      case 'active': return 'Activo';
      case 'finished': return 'Finalizado';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Welcome Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">
          Bienvenido, {profile?.username || profile?.full_name}!
        </h1>
        <p className="text-muted-foreground">
          Aquí tienes un resumen de tu actividad en CuFire
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Torneos Participados</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats.totalTournaments}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ganancias Totales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${userStats.totalWinnings} USDT</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mejor Puntuación</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats.bestRank || 'N/A'}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Promedio</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats.averageScore || 'N/A'}</div>
          </CardContent>
        </Card>
      </div>

      {/* Active Tournaments */}
      <Card>
        <CardHeader>
          <CardTitle>Torneos Disponibles</CardTitle>
          <CardDescription>
            Únete a los últimos torneos de CuFire
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tournaments.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">
              No hay torneos disponibles en este momento
            </p>
          ) : (
            <div className="space-y-4">
              {tournaments.map((tournament) => (
                <div
                  key={tournament.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="space-y-1">
                    <h3 className="font-semibold">{tournament.name}</h3>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <span className="flex items-center">
                        <DollarSign className="h-4 w-4 mr-1" />
                        ${tournament.prize_pool} USDT
                      </span>
                      <span className="flex items-center">
                        <Users className="h-4 w-4 mr-1" />
                        {tournament.current_participants}/{tournament.max_participants || '∞'}
                      </span>
                      <span className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {new Date(tournament.start_date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={getStatusColor(tournament.status)}>
                      {getStatusText(tournament.status)}
                    </Badge>
                    <Button asChild>
                      <Link to={`/tournaments/${tournament.id}`}>
                        Ver Detalles
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="pt-4 border-t">
            <Button className="w-full" asChild>
              <Link to="/tournaments">Ver Todos los Torneos</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Profile Completion */}
      {!profile?.usdt_wallet && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-primary">Completa tu Perfil</CardTitle>
            <CardDescription>
              Agrega tu wallet USDT para recibir pagos de torneos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/profile">Completar Perfil</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}