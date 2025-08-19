import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, Users, DollarSign, Calendar, Target, Gamepad2, Award, TrendingUp } from 'lucide-react';

interface Tournament {
  id: string;
  name: string;
  description: string;
  prize_pool: number;
  entry_fee: number;
  start_date: string;
  end_date: string;
  status: string;
  current_participants: number;
  max_participants: number;
}

interface LeaderboardEntry {
  id: string;
  score: number;
  profiles: {
    username: string;
    full_name: string;
  };
}

export default function Home() {
  const [featuredTournaments, setFeaturedTournaments] = useState<Tournament[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHomeData();
  }, []);

  const fetchHomeData = async () => {
    try {
      // Fetch featured tournaments
      const { data: tournamentsData } = await supabase
        .from('tournaments')
        .select('*')
        .in('status', ['upcoming', 'active'])
        .order('prize_pool', { ascending: false })
        .limit(3);

      setFeaturedTournaments(tournamentsData || []);

      // Fetch global leaderboard
      const { data: scoresData } = await supabase
        .from('scores')
        .select(`
          id,
          score,
          profiles (
            username,
            full_name
          )
        `)
        .order('score', { ascending: false })
        .limit(10);

      setLeaderboard(scoresData || []);
    } catch (error) {
      console.error('Error fetching home data:', error);
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
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-gaming-dark via-background to-gaming-lighter py-20 overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDIwIDAgTCAwIDAgMCAyMCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJoc2woMzQ2IDc3JSA0OS44JSAvIDAuMDUpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center space-y-6 max-w-4xl mx-auto">
            <div className="flex justify-center mb-6">
              <div className="p-4 rounded-full bg-primary/20 ring-4 ring-primary/30">
                <Target className="h-16 w-16 text-primary" />
              </div>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-primary via-gaming-orange to-gaming-purple bg-clip-text text-transparent">
              CuFire
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground">
              La plataforma definitiva de torneos FPS competitivos
            </p>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Únete a miles de jugadores, compite en torneos épicos y gana premios en USDT
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
              <Button size="lg" className="text-lg px-8 py-6" asChild>
                <Link to="/tournaments">
                  <Trophy className="mr-2 h-5 w-5" />
                  Ver Torneos
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8 py-6" asChild>
                <Link to="/leaderboard">
                  <Award className="mr-2 h-5 w-5" />
                  Clasificación Global
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12 space-y-16">
        {/* Stats Section */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="text-center">
            <CardHeader>
              <div className="flex justify-center mb-2">
                <Gamepad2 className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Competitivo</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Enfréntate a los mejores jugadores en torneos estructurados y competitivos
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="flex justify-center mb-2">
                <DollarSign className="h-8 w-8 text-gaming-orange" />
              </div>
              <CardTitle className="text-2xl">Premios Reales</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Gana premios en USDT por tus habilidades y rendimiento en los torneos
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="flex justify-center mb-2">
                <TrendingUp className="h-8 w-8 text-gaming-purple" />
              </div>
              <CardTitle className="text-2xl">Progreso</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Mejora tu ranking, desbloquea logros y conviértete en una leyenda
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Featured Tournaments */}
        <section>
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-4">Torneos Destacados</h2>
            <p className="text-muted-foreground text-lg">
              Únete a los torneos más emocionantes del momento
            </p>
          </div>
          
          {featuredTournaments.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg text-muted-foreground">
                  No hay torneos disponibles en este momento
                </p>
                <p className="text-muted-foreground">
                  ¡Mantente atento para los próximos eventos!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredTournaments.map((tournament) => (
                <Card key={tournament.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{tournament.name}</CardTitle>
                      <Badge variant={getStatusColor(tournament.status)}>
                        {getStatusText(tournament.status)}
                      </Badge>
                    </div>
                    <CardDescription className="line-clamp-2">
                      {tournament.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center text-gaming-orange">
                        <DollarSign className="h-4 w-4 mr-1" />
                        ${tournament.prize_pool} USDT
                      </span>
                      <span className="flex items-center text-muted-foreground">
                        <Users className="h-4 w-4 mr-1" />
                        {tournament.current_participants}/{tournament.max_participants || '∞'}
                      </span>
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4 mr-1" />
                      {new Date(tournament.start_date).toLocaleDateString()}
                    </div>
                    <Button className="w-full" asChild>
                      <Link to={`/tournaments/${tournament.id}`}>
                        Ver Detalles
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          
          <div className="text-center mt-8">
            <Button variant="outline" size="lg" asChild>
              <Link to="/tournaments">Ver Todos los Torneos</Link>
            </Button>
          </div>
        </section>

        {/* Global Leaderboard */}
        <section>
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-4">Clasificación Global</h2>
            <p className="text-muted-foreground text-lg">
              Los mejores jugadores de la comunidad CuFire
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Award className="mr-2 h-5 w-5" />
                Top 10 Jugadores
              </CardTitle>
            </CardHeader>
            <CardContent>
              {leaderboard.length === 0 ? (
                <p className="text-center text-muted-foreground py-6">
                  Aún no hay puntuaciones registradas
                </p>
              ) : (
                <div className="space-y-2">
                  {leaderboard.map((entry, index) => (
                    <div
                      key={entry.id}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        index < 3 ? 'bg-primary/10 border border-primary/20' : 'bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          index === 0 ? 'bg-gaming-orange text-white' :
                          index === 1 ? 'bg-muted text-foreground' :
                          index === 2 ? 'bg-gaming-purple text-white' :
                          'bg-secondary text-secondary-foreground'
                        }`}>
                          #{index + 1}
                        </div>
                        <span className="font-medium">
                          {entry.profiles?.username || entry.profiles?.full_name || 'Usuario'}
                        </span>
                      </div>
                      <Badge variant="outline">
                        {entry.score.toLocaleString()} pts
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="text-center mt-6">
            <Button variant="outline" asChild>
              <Link to="/leaderboard">Ver Clasificación Completa</Link>
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}