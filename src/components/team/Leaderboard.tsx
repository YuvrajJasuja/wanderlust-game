import React from 'react';
import { useTeam } from '@/contexts/TeamContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Users, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LeaderboardProps {
  compact?: boolean;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ compact = false }) => {
  const { leaderboard, currentTeam } = useTeam();

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="w-4 h-4 text-yellow-500" />;
    if (index === 1) return <Trophy className="w-4 h-4 text-gray-400" />;
    if (index === 2) return <Trophy className="w-4 h-4 text-amber-600" />;
    return <span className="w-4 h-4 text-center text-xs text-muted-foreground">{index + 1}</span>;
  };

  const displayTeams = compact ? leaderboard.slice(0, 5) : leaderboard;

  return (
    <Card className={cn(
      "bg-card/95 backdrop-blur border-primary/20",
      compact && "w-64"
    )}>
      <CardHeader className={compact ? "p-3" : "p-4"}>
        <CardTitle className={cn(
          "flex items-center gap-2",
          compact ? "text-sm" : "text-lg"
        )}>
          <Crown className={cn(compact ? "w-4 h-4" : "w-5 h-5", "text-yellow-500")} />
          Team Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent className={compact ? "p-3 pt-0" : "p-4 pt-0"}>
        {displayTeams.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No teams yet
          </p>
        ) : (
          <div className="space-y-2">
            {displayTeams.map((team, index) => (
              <div
                key={team.id}
                className={cn(
                  "flex items-center gap-2 p-2 rounded-lg transition-colors",
                  team.id === currentTeam?.id 
                    ? "bg-primary/20 border border-primary/30" 
                    : "bg-muted/30 hover:bg-muted/50"
                )}
              >
                <div className="flex items-center justify-center w-6">
                  {getRankIcon(index)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "font-medium truncate",
                    compact ? "text-xs" : "text-sm",
                    team.id === currentTeam?.id && "text-primary"
                  )}>
                    {team.name}
                    {team.id === currentTeam?.id && " (You)"}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="w-3 h-3" />
                    <span>{team.members.length}</span>
                  </div>
                </div>
                <div className={cn(
                  "font-bold",
                  compact ? "text-sm" : "text-base",
                  index === 0 && "text-yellow-500"
                )}>
                  {team.totalScore.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default Leaderboard;
