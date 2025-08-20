import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Trophy, 
  Users, 
  Clock, 
  DollarSign, 
  Search,
  Filter,
  Zap,
  Calendar,
  Target
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function Tournaments() {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [filteredTournaments, setFilteredTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('start_date');

  useEffect(() => {
    fetchTournaments();
  }, []);

  useEffect(() => {
    filterAndSortTournaments();
  }, [tournaments, searchTerm, statusFilter, sortBy]);

  const fetchTournaments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setTournaments(data || []);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortTournaments = () => {
    let filtered = tournaments;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(tournament =>
        tournament.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tournament.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(tournament => tournament.status === statusFilter);
    }

    // Sort tournaments
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'start_date':
          return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
        case 'prize_pool':
          return (b.prize_pool || 0) - (a.prize_pool || 0);
        case 'entry_fee':
          return a.entry_fee - b.entry_fee;
        case 'participants':
          return (b.current_participants || 0) - (a.current_participants || 0);
        default:
          return 0;
      }
    });

    setFilteredTournaments(filtered);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'active': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'finished': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'upcoming': return 'Próximo';
      case 'active': return 'En Vivo';
      case 'finished': return 'Finalizado';
      default: return status;
    }
  };

  const isTimeLeft = (startDate: string) => {
    const now = new Date();
    const start = new Date(startDate);
    return start > now;
  };

  const getTimeLeft = (startDate: string) => {
    const now = new Date();
    const start = new Date(startDate);
    const diff = start.getTime() - now.getTime();
    
    if (diff <= 0) return 'Ya comenzó';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h`;
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
          <h1 className="text-3xl font-bold mb-2">Torneos</h1>
          <p className="text-muted-foreground">
            Encuentra y únete a torneos competitivos
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-8 card-shadow">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Buscar torneos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="upcoming">Próximos</SelectItem>
                  <SelectItem value="active">En Vivo</SelectItem>
                  <SelectItem value="finished">Finalizados</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="start_date">Fecha</SelectItem>
                  <SelectItem value="prize_pool">Premio</SelectItem>
                  <SelectItem value="entry_fee">Entrada</SelectItem>
                  <SelectItem value="participants">Participantes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tournaments Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTournaments.map((tournament) => (
            <Card key={tournament.id} className="card-shadow hover:glow-effect transition-all duration-300">
              <CardHeader>
                <div className="flex justify-between items-start mb-2">
                  <Badge className={getStatusColor(tournament.status)}>
                    {getStatusText(tournament.status)}
                  </Badge>
                  <Badge className="bg-primary text-primary-foreground">
                    <DollarSign className="w-3 h-3 mr-1" />
                    {formatPrize(tournament.prize_pool || 0)}
                  </Badge>
                </div>
                <CardTitle className="text-xl">{tournament.name}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {tournament.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center text-muted-foreground">
                      <Calendar className="w-4 h-4 mr-1" />
                      {formatDate(tournament.start_date)}
                    </div>
                    {tournament.status === 'upcoming' && (
                      <div className="text-primary font-medium">
                        {getTimeLeft(tournament.start_date)}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center text-muted-foreground">
                      <Users className="w-4 h-4 mr-1" />
                      {tournament.current_participants || 0}/{tournament.max_participants || '∞'}
                    </div>
                    <div className="font-medium">
                      Entrada: {formatPrize(tournament.entry_fee)} USDT
                    </div>
                  </div>

                  <div className="pt-2">
                    <Link to={`/tournaments/${tournament.id}`}>
                      <Button 
                        className="w-full" 
                        disabled={tournament.status === 'finished'}
                      >
                        {tournament.status === 'finished' ? (
                          <>
                            <Trophy className="w-4 h-4 mr-2" />
                            Ver Resultados
                          </>
                        ) : (
                          <>
                            <Zap className="w-4 h-4 mr-2" />
                            {tournament.status === 'active' ? 'Jugar Ahora' : 'Unirse'}
                          </>
                        )}
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredTournaments.length === 0 && (
          <div className="text-center py-12">
            <Trophy className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No se encontraron torneos</h3>
            <p className="text-muted-foreground">
              {tournaments.length === 0 
                ? 'No hay torneos disponibles en este momento' 
                : 'Prueba con otros filtros de búsqueda'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}