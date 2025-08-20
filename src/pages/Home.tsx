import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Users, Clock, DollarSign, Target, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export default function Home() {
  const [featuredTournaments, setFeaturedTournaments] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalTournaments: 0,
    totalPrizePool: 0,
    activePlayers: 0
  });

  useEffect(() => {
    fetchFeaturedTournaments();
    fetchStats();
  }, []);

  const fetchFeaturedTournaments = async () => {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('status', 'upcoming')
        .order('start_date', { ascending: true })
        .limit(3);
      
      if (error) throw error;
      setFeaturedTournaments(data || []);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const [tournamentsRes, profilesRes] = await Promise.all([
        supabase.from('tournaments').select('prize_pool'),
        supabase.from('profiles').select('id')
      ]);

      const totalPrizePool = tournamentsRes.data?.reduce((sum, t) => sum + (t.prize_pool || 0), 0) || 0;
      
      setStats({
        totalTournaments: tournamentsRes.data?.length || 0,
        totalPrizePool,
        activePlayers: profilesRes.data?.length || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const formatPrize = (amount: number) => {
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}K`;
    }
    return `$${amount}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-background via-card to-background">
        <div className="absolute inset-0 gradient-gaming opacity-30"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              <span className="text-gradient">Compite en Torneos</span>
              <br />
              <span className="text-foreground">FPS de Elite</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              Únete a la arena más competitiva de esports. Demuestra tus habilidades, 
              gana premios en USDT y conviértete en leyenda.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/tournaments">
                <Button size="lg" className="min-w-[200px] glow-effect">
                  <Trophy className="w-5 h-5 mr-2" />
                  Ver Torneos
                </Button>
              </Link>
              <Link to="/register">
                <Button variant="outline" size="lg" className="min-w-[200px]">
                  <Target className="w-5 h-5 mr-2" />
                  Únete Ahora
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">
                {stats.totalTournaments}
              </div>
              <div className="text-muted-foreground">Torneos Activos</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">
                {formatPrize(stats.totalPrizePool)}
              </div>
              <div className="text-muted-foreground">Premio Total</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">
                {stats.activePlayers}
              </div>
              <div className="text-muted-foreground">Jugadores Activos</div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Tournaments */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Torneos Destacados</h2>
            <p className="text-muted-foreground">Los mejores torneos esperándote</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredTournaments.map((tournament) => (
              <Card key={tournament.id} className="card-shadow hover:glow-effect transition-all duration-300">
                <CardHeader>
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant="secondary">
                      <Clock className="w-3 h-3 mr-1" />
                      {formatDate(tournament.start_date)}
                    </Badge>
                    <Badge className="bg-primary text-primary-foreground">
                      <DollarSign className="w-3 h-3 mr-1" />
                      {formatPrize(tournament.prize_pool || 0)}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl">{tournament.name}</CardTitle>
                  <CardDescription>{tournament.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Users className="w-4 h-4 mr-1" />
                      {tournament.current_participants}/{tournament.max_participants || '∞'}
                    </div>
                    <div className="text-sm font-medium">
                      Entry: {formatPrize(tournament.entry_fee)} USDT
                    </div>
                  </div>
                  <Link to={`/tournaments/${tournament.id}`}>
                    <Button className="w-full">
                      <Zap className="w-4 h-4 mr-2" />
                      Unirse
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {featuredTournaments.length === 0 && (
            <div className="text-center py-12">
              <Trophy className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No hay torneos disponibles</h3>
              <p className="text-muted-foreground">Pronto habrá nuevos torneos disponibles</p>
            </div>
          )}
          
          <div className="text-center mt-12">
            <Link to="/tournaments">
              <Button variant="outline" size="lg">
                Ver Todos los Torneos
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">¿Por qué FPS Arena?</h2>
            <p className="text-muted-foreground">La plataforma definitiva para competencias FPS</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <DollarSign className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Premios en USDT</h3>
              <p className="text-muted-foreground">
                Gana premios reales en criptomoneda estable
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Torneos Competitivos</h3>
              <p className="text-muted-foreground">
                Compite contra los mejores jugadores del mundo
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Pagos Instantáneos</h3>
              <p className="text-muted-foreground">
                Recibe tus ganancias inmediatamente después de ganar
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}