import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, CheckCircle } from 'lucide-react';

interface TournamentCountdownProps {
  targetDate: string;
  status: 'upcoming' | 'active' | 'finished';
  title?: string;
}

export default function TournamentCountdown({ 
  targetDate, 
  status, 
  title = "Tiempo Restante" 
}: TournamentCountdownProps) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const target = new Date(targetDate).getTime();
      const difference = target - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000),
          isExpired: false
        });
      } else {
        setTimeLeft({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isExpired: true
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  const formatTime = (time: number) => time.toString().padStart(2, '0');

  if (status === 'finished' || timeLeft.isExpired) {
    return (
      <Card className="card-shadow">
        <CardContent className="p-6 text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Torneo Finalizado</h3>
          <p className="text-muted-foreground">
            El torneo ha terminado. Revisa los resultados.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-shadow">
      <CardContent className="p-6">
        <div className="text-center mb-6">
          <Clock className="w-8 h-8 text-primary mx-auto mb-2" />
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground">
            {status === 'upcoming' ? 'Hasta el inicio' : 'Hasta el final'}
          </p>
        </div>

        <div className="grid grid-cols-4 gap-4 text-center">
          <div className="bg-primary/10 rounded-lg p-3">
            <div className="text-2xl font-bold text-primary">
              {formatTime(timeLeft.days)}
            </div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide">
              Días
            </div>
          </div>
          
          <div className="bg-primary/10 rounded-lg p-3">
            <div className="text-2xl font-bold text-primary">
              {formatTime(timeLeft.hours)}
            </div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide">
              Horas
            </div>
          </div>
          
          <div className="bg-primary/10 rounded-lg p-3">
            <div className="text-2xl font-bold text-primary">
              {formatTime(timeLeft.minutes)}
            </div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide">
              Min
            </div>
          </div>
          
          <div className="bg-primary/10 rounded-lg p-3">
            <div className="text-2xl font-bold text-primary">
              {formatTime(timeLeft.seconds)}
            </div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide">
              Seg
            </div>
          </div>
        </div>

        {/* Animated progress bar */}
        <div className="mt-6">
          <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
            <div 
              className="bg-gradient-to-r from-primary to-primary/70 h-2 rounded-full transition-all duration-1000 ease-out animate-pulse"
              style={{ 
                width: `${Math.min(
                  ((timeLeft.seconds % 60) / 60) * 100, 
                  100
                )}%` 
              }}
            />
          </div>
        </div>

        {/* Status message */}
        <div className="mt-4 text-center">
          {status === 'upcoming' && (
            <div className="text-sm text-blue-600 font-medium">
              Preparándose para iniciar...
            </div>
          )}
          {status === 'active' && (
            <div className="text-sm text-green-600 font-medium">
              ¡Torneo en progreso!
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}