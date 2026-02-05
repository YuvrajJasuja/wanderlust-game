import React, { useState } from 'react';
import { useTeam } from '@/contexts/TeamContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Shield, Users, Gamepad2 } from 'lucide-react';
import LeaderAuth from './LeaderAuth';
import TeamCreation from './TeamCreation';
import JoinTeam from './JoinTeam';
import Leaderboard from './Leaderboard';

type LobbyStep = 'choose' | 'leader-auth' | 'team-creation' | 'join-team';

interface TeamLobbyProps {
  onEnterGame: () => void;
}

const TeamLobby: React.FC<TeamLobbyProps> = ({ onEnterGame }) => {
  const { isAuthenticated, isLoading } = useTeam();
  const [step, setStep] = useState<LobbyStep>('choose');

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // If already authenticated and chose leader path, go to team creation
  const handleLeaderPath = () => {
    if (isAuthenticated) {
      setStep('team-creation');
    } else {
      setStep('leader-auth');
    }
  };

  const renderStep = () => {
    switch (step) {
      case 'leader-auth':
        return (
          <LeaderAuth onSuccess={() => setStep('team-creation')} />
        );
      
      case 'team-creation':
        return (
          <TeamCreation onTeamReady={onEnterGame} />
        );
      
      case 'join-team':
        return (
          <JoinTeam 
            onJoined={onEnterGame} 
            onBack={() => setStep('choose')} 
          />
        );
      
      default:
        return (
          <div className="space-y-6">
            <Card className="w-full max-w-md mx-auto bg-card/95 backdrop-blur border-primary/20">
              <CardHeader className="text-center">
                <div className="mx-auto mb-2 w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                  <Gamepad2 className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-3xl">Cyber Quest</CardTitle>
                <CardDescription>
                  Team-based CTF adventure in a cyberpunk city
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={handleLeaderPath}
                  className="w-full h-14"
                  size="lg"
                >
                  <Shield className="w-5 h-5 mr-2" />
                  I'm a Team Leader
                </Button>
                
                <Button 
                  onClick={() => setStep('join-team')}
                  variant="outline"
                  className="w-full h-14"
                  size="lg"
                >
                  <Users className="w-5 h-5 mr-2" />
                  Join a Team
                </Button>
                
                <p className="text-xs text-center text-muted-foreground pt-2">
                  Team leaders create teams and share codes with members
                </p>
              </CardContent>
            </Card>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border/50">
        <h1 className="text-center font-pixel text-xl text-primary">
          CYBER QUEST
        </h1>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl flex flex-col md:flex-row gap-6 items-start justify-center">
          {/* Main card */}
          <div className="flex-1 flex justify-center">
            {renderStep()}
          </div>
          
          {/* Leaderboard sidebar */}
          <div className="hidden md:block">
            <Leaderboard compact />
          </div>
        </div>
      </div>

      {/* Mobile leaderboard */}
      <div className="md:hidden p-4 border-t border-border/50">
        <Leaderboard compact />
      </div>
    </div>
  );
};

export default TeamLobby;
