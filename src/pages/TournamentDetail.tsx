import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Trophy, 
  Users, 
  Clock, 
  DollarSign, 
  Target,
  Calendar,
  Award,
  Wallet,
  Copy,
  ExternalLink,
  Play,
  CheckCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export default function TournamentDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  const [tournament, setTournament] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [userParticipation, setUserParticipation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [transactionHash, setTransactionHash] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);

  useEffect(() => {
    if (id) {
      fetchTournamentData();
    }
  }, [id, user]);

  const fetchTournamentData = async () => {
    try {
      setLoading(true);
      
      // Fetch tournament
      const { data: tournamentData, error: tournamentError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', id)
        .single();
      
      if (tournamentError) throw tournamentError;
      setTournament(tournamentData);

      // Fetch participants
      const { data: participantsData, error: participantsError } = await supabase
        .from('tournament_participants')
        .select(`
          *,
          profiles:user_id (username, full_name)
        `)
        .eq('tournament_id', id);
      
      if (participantsError) throw participantsError;
      setParticipants(participantsData || []);

      // Fetch leaderboard
      const { data: scoresData, error: scoresError } = await supabase
        .from('scores')
        .select(`
          *,
          profiles:user_id (username, full_name)
        `)
        .eq('tournament_id', id)
        .order('score', { ascending: false });
      
      if (scoresError) throw scoresError;
      setLeaderboard(scoresData || []);

      // Check if user is participating
      if (user) {
        const userParticipation = participantsData?.find(p => p.user_id === user.id);
        setUserParticipation(userParticipation);
      }
    } catch (error) {
      console.error('Error fetching tournament data:', error);
      toast.error('Error al cargar el torneo');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinTournament = async () => {
    if (!user) {
      toast.error('Debes iniciar sesión para unirte');
      return;
    }

    try {
      const { error } = await supabase
        .from('tournament_participants')
        .insert({
          tournament_id: id,
          user_id: user.id,
          payment_verified: false
        });
      
      if (error) throw error;
      
      toast.success('Te has unido al torneo. Ahora procede con el pago.');
      setPaymentDialogOpen(true);
      fetchTournamentData();
    } catch (error: any) {
      toast.error(error.message || 'Error al unirse al torneo');
    }
  };

  const handlePaymentSubmit = async () => {
    if (!user || !transactionHash.trim()) {
      toast.error('Debes proporcionar el hash de transacción');
      return;
    }

    try {
      setPaymentLoading(true);
      
      const { error } = await supabase
        .from('payments')
        .insert({
          user_id: user.id,
          tournament_id: id,
          amount: tournament.entry_fee,
          usdt_wallet: profile?.usdt_wallet || '',
          transaction_hash: transactionHash,
          status: 'pending'
        });
      
      if (error) throw error;
      
      toast.success('Pago enviado para verificación');
      setPaymentDialogOpen(false);
      setTransactionHash('');
    } catch (error: any) {
      toast.error(error.message || 'Error al procesar el pago');
    } finally {
      setPaymentLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado al portapapeles');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPrize = (amount: number) => {
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}K`;
    }
    return `$${amount}`;
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

  const getPrizeDistribution = () => {
    const totalPrize = tournament?.prize_pool || 0;
    return [
      { place: '1er Lugar', percentage: 50, amount: totalPrize * 0.5 },
      { place: '2do Lugar', percentage: 30, amount: totalPrize * 0.3 },
      { place: '3er Lugar', percentage: 20, amount: totalPrize * 0.2 },
    ];
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Trophy className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Torneo no encontrado</h1>
          <p className="text-muted-foreground mb-4">El torneo que buscas no existe</p>
          <Link to="/tournaments">
            <Button>Volver a Torneos</Button>
          </Link>
        </div>
      </div>
    );
  }

  const canJoin = tournament.status === 'upcoming' && !userParticipation;
  const canPlay = tournament.status === 'active' && userParticipation?.payment_verified;

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <Link to="/tournaments">
              <Button variant="ghost">← Volver a Torneos</Button>
            </Link>
            <Badge className={getStatusColor(tournament.status)}>
              {getStatusText(tournament.status)}
            </Badge>
          </div>
          <h1 className="text-3xl font-bold mb-2">{tournament.name}</h1>
          <p className="text-muted-foreground">{tournament.description}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Resumen</TabsTrigger>
                <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
                <TabsTrigger value="participants">Participantes</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                {/* Tournament Info */}
                <Card className="card-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Calendar className="w-5 h-5 mr-2" />
                      Información del Torneo
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-muted-foreground">Fecha de Inicio</div>
                        <div className="font-medium">{formatDate(tournament.start_date)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Fecha de Fin</div>
                        <div className="font-medium">{formatDate(tournament.end_date)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Entrada</div>
                        <div className="font-medium">{formatPrize(tournament.entry_fee)} USDT</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Participantes</div>
                        <div className="font-medium">
                          {participants.length}/{tournament.max_participants || '∞'}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Prize Distribution */}
                <Card className="card-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Award className="w-5 h-5 mr-2" />
                      Distribución de Premios
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {getPrizeDistribution().map((prize, index) => (
                        <div key={index} className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center mr-3">
                              <span className="text-sm font-bold">{index + 1}</span>
                            </div>
                            <span className="font-medium">{prize.place}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-primary">
                              {formatPrize(prize.amount)} USDT
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {prize.percentage}%
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="leaderboard" className="space-y-6">
                <Card className="card-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Trophy className="w-5 h-5 mr-2" />
                      Leaderboard
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {leaderboard.length > 0 ? (
                      <div className="space-y-2">
                        {leaderboard.map((score, index) => (
                          <div 
                            key={score.id} 
                            className={`flex items-center justify-between p-3 rounded-lg ${
                              index < 3 ? 'bg-primary/10 border border-primary/20' : 'bg-muted/30'
                            }`}
                          >
                            <div className="flex items-center">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                                index === 0 ? 'bg-yellow-500 text-yellow-900' :
                                index === 1 ? 'bg-gray-400 text-gray-900' :
                                index === 2 ? 'bg-amber-600 text-amber-900' :
                                'bg-muted text-muted-foreground'
                              }`}>
                                <span className="text-sm font-bold">#{index + 1}</span>
                              </div>
                              <div>
                                <div className="font-medium">
                                  {score.profiles?.username || score.profiles?.full_name}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {formatDate(score.submitted_at)}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-primary">
                                {score.score.toLocaleString()}
                              </div>
                              <div className="text-xs text-muted-foreground">puntos</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No hay puntuaciones registradas</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="participants" className="space-y-6">
                <Card className="card-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Users className="w-5 h-5 mr-2" />
                      Participantes ({participants.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {participants.length > 0 ? (
                      <div className="space-y-2">
                        {participants.map((participant, index) => (
                          <div key={participant.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                            <div className="flex items-center">
                              <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center mr-3">
                                <span className="text-sm font-bold">{index + 1}</span>
                              </div>
                              <div>
                                <div className="font-medium">
                                  {participant.profiles?.username || participant.profiles?.full_name}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  Se unió: {formatDate(participant.joined_at)}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center">
                              {participant.payment_verified ? (
                                <Badge className="bg-green-500/20 text-green-400">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Verificado
                                </Badge>
                              ) : (
                                <Badge className="bg-yellow-500/20 text-yellow-400">
                                  Pendiente
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No hay participantes registrados</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Prize Pool */}
            <Card className="card-shadow">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="w-5 h-5 mr-2" />
                  Premio Total
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary mb-2">
                    {formatPrize(tournament.prize_pool || 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">USDT</div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <Card className="card-shadow">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {!user ? (
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-4">
                        Debes iniciar sesión para participar
                      </p>
                      <Link to="/login">
                        <Button className="w-full">Iniciar Sesión</Button>
                      </Link>
                    </div>
                  ) : canJoin ? (
                    <Button 
                      className="w-full glow-effect" 
                      onClick={handleJoinTournament}
                    >
                      <Trophy className="w-4 h-4 mr-2" />
                      Unirse al Torneo
                    </Button>
                  ) : canPlay ? (
                    <Button className="w-full glow-effect">
                      <Play className="w-4 h-4 mr-2" />
                      Jugar Ahora
                    </Button>
                  ) : userParticipation && !userParticipation.payment_verified ? (
                    <div className="space-y-2">
                      <Button 
                        className="w-full" 
                        variant="outline"
                        onClick={() => setPaymentDialogOpen(true)}
                      >
                        <Wallet className="w-4 h-4 mr-2" />
                        Completar Pago
                      </Button>
                      <p className="text-xs text-muted-foreground text-center">
                        Pago pendiente de verificación
                      </p>
                    </div>
                  ) : userParticipation ? (
                    <Badge className="w-full justify-center py-2 bg-green-500/20 text-green-400">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Ya participas
                    </Badge>
                  ) : tournament.status === 'finished' ? (
                    <Badge className="w-full justify-center py-2 bg-gray-500/20 text-gray-400">
                      Torneo Finalizado
                    </Badge>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            {/* Tournament Progress */}
            <Card className="card-shadow">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="w-5 h-5 mr-2" />
                  Progreso
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Participantes</span>
                      <span>{participants.length}/{tournament.max_participants || '∞'}</span>
                    </div>
                    <Progress 
                      value={tournament.max_participants ? (participants.length / tournament.max_participants) * 100 : 0}
                      className="h-2"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Payment Dialog */}
        <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Completar Pago</DialogTitle>
              <DialogDescription>
                Envía {formatPrize(tournament.entry_fee)} USDT a la siguiente dirección
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Dirección USDT (TRC20)</Label>
                <div className="flex items-center space-x-2 mt-1">
                  <Input 
                    value="TYourUSDTWalletAddressHere123456789"
                    readOnly
                    className="flex-1"
                  />
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => copyToClipboard("TYourUSDTWalletAddressHere123456789")}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="txHash">Hash de Transacción</Label>
                <Input
                  id="txHash"
                  placeholder="Pega aquí el hash de tu transacción"
                  value={transactionHash}
                  onChange={(e) => setTransactionHash(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setPaymentDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  className="flex-1" 
                  onClick={handlePaymentSubmit}
                  disabled={paymentLoading || !transactionHash.trim()}
                >
                  {paymentLoading ? 'Procesando...' : 'Confirmar Pago'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}