import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Crown, Award, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function Leaderboard() {
  const [topPlayers, setTopPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const { data, error } = await supabase
        .from('scores')
        .select(`
          score,
          profiles:user_id (username, full_name),
          tournaments:tournament_id (name)
        `)
        .order('score', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      
      // Group by user and get their best score
      const userBestScores = new Map();
      data?.forEach(score => {
        const userId = score.profiles?.username || score.profiles?.full_name;
        if (!userBestScores.has(userId) || userBestScores.get(userId).score < score.score) {
          userBestScores.set(userId, score);
        }
      });
      
      setTopPlayers(Array.from(userBestScores.values()).slice(0, 50));
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0: return <Crown className="w-6 h-6 text-yellow-500" />;
      case 1: return <Award className="w-6 h-6 text-gray-400" />;
      case 2: return <Trophy className="w-6 h-6 text-amber-600" />;
      default: return <span className="w-6 h-6 flex items-center justify-center text-sm font-bold">#{index + 1}</span>;
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
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">Leaderboard Global</h1>
          <p className="text-muted-foreground">Los mejores jugadores de FPS Arena</p>
        </div>

        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Trophy className="w-5 h-5 mr-2" />
              Top Jugadores
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topPlayers.length > 0 ? (
              <div className="space-y-2">
                {topPlayers.map((player, index) => (
                  <div 
                    key={index} 
                    className={`flex items-center justify-between p-4 rounded-lg transition-colors ${
                      index < 3 ? 'bg-primary/10 border border-primary/20' : 'bg-muted/30 hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center">
                      <div className="mr-4">
                        {getRankIcon(index)}
                      </div>
                      <div>
                        <div className="font-medium text-lg">
                          {player.profiles?.username || player.profiles?.full_name || 'Jugador Anónimo'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Mejor en: {player.tournaments?.name}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">
                        {player.score.toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">puntos</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Target className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No hay datos disponibles</h3>
                <p className="text-muted-foreground">Sé el primero en aparecer en el leaderboard</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}