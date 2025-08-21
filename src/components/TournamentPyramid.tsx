import { Card, CardContent } from '@/components/ui/card';

interface TournamentPyramidProps {
  currentAmount: number;
  targetAmount: number;
  participants: number;
  maxParticipants?: number;
}

export default function TournamentPyramid({ 
  currentAmount, 
  targetAmount, 
  participants, 
  maxParticipants 
}: TournamentPyramidProps) {
  const progressPercentage = Math.min((currentAmount / targetAmount) * 100, 100);
  const participantPercentage = maxParticipants 
    ? Math.min((participants / maxParticipants) * 100, 100) 
    : 0;

  // Calculate pyramid levels (5 levels with decreasing coins)
  const pyramidLevels = [
    { level: 1, coins: 1, active: progressPercentage >= 80 },
    { level: 2, coins: 2, active: progressPercentage >= 60 },
    { level: 3, coins: 3, active: progressPercentage >= 40 },
    { level: 4, coins: 4, active: progressPercentage >= 20 },
    { level: 5, coins: 5, active: progressPercentage > 0 }
  ];

  return (
    <Card className="card-shadow">
      <CardContent className="p-6">
        <div className="text-center mb-6">
          <h3 className="text-lg font-semibold mb-2">Progreso del Premio</h3>
          <div className="text-3xl font-bold text-primary mb-1">
            ${currentAmount.toFixed(0)}
          </div>
          <div className="text-sm text-muted-foreground">
            de ${targetAmount.toFixed(0)} objetivo
          </div>
        </div>

        {/* Pyramid Visualization */}
        <div className="flex flex-col items-center space-y-2 mb-6">
          {pyramidLevels.map((level) => (
            <div key={level.level} className="flex space-x-1">
              {Array.from({ length: level.coins }).map((_, coinIndex) => (
                <div
                  key={coinIndex}
                  className={`w-8 h-8 rounded-full border-2 transition-all duration-300 ${
                    level.active
                      ? 'bg-yellow-500 border-yellow-600 shadow-lg shadow-yellow-500/50 animate-pulse'
                      : 'bg-gray-200 border-gray-300 dark:bg-gray-700 dark:border-gray-600'
                  }`}
                  style={{
                    animationDelay: `${coinIndex * 0.1}s`
                  }}
                >
                  <div className={`w-full h-full rounded-full ${
                    level.active 
                      ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' 
                      : 'bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-600 dark:to-gray-700'
                  }`} />
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Progress Bar */}
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm">
            <span>Progreso del Fondo</span>
            <span>{progressPercentage.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 dark:bg-gray-700">
            <div 
              className="bg-gradient-to-r from-yellow-400 to-yellow-600 h-3 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Participants Progress */}
        {maxParticipants && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Participantes</span>
              <span>{participants}/{maxParticipants}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
              <div 
                className="bg-gradient-to-r from-blue-400 to-blue-600 h-2 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${participantPercentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Status Info */}
        <div className="mt-4 text-center">
          {progressPercentage >= 100 ? (
            <div className="text-green-600 font-medium">¡Objetivo Alcanzado!</div>
          ) : (
            <div className="text-muted-foreground text-sm">
              Faltan ${(targetAmount - currentAmount).toFixed(0)} para el objetivo
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}