import React, { useState } from 'react';
import { useTeam } from '@/contexts/TeamContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2, Users, Copy, Check, Play } from 'lucide-react';

interface TeamCreationProps {
  onTeamReady: () => void;
}

const TeamCreation: React.FC<TeamCreationProps> = ({ onTeamReady }) => {
  const { createNewTeam, currentTeam, user, logout } = useTeam();
  const [teamName, setTeamName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [teamCode, setTeamCode] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (teamName.trim().length < 2) {
      setError('Team name must be at least 2 characters');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const code = await createNewTeam(teamName.trim());
      setTeamCode(code);
    } catch (err: any) {
      setError(err.message || 'Failed to create team');
    } finally {
      setIsLoading(false);
    }
  };

  const copyCode = async () => {
    await navigator.clipboard.writeText(teamCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (teamCode) {
    return (
      <Card className="w-full max-w-md mx-auto bg-card/95 backdrop-blur border-primary/20">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
            <Check className="w-6 h-6 text-green-500" />
          </div>
          <CardTitle className="text-2xl">Team Created!</CardTitle>
          <CardDescription>
            Share this code with your team members
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">Team Code</p>
            <div className="flex items-center justify-center gap-2">
              <span className="text-4xl font-mono font-bold tracking-widest text-primary">
                {teamCode}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={copyCode}
                className="shrink-0"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          
          <div className="p-4 rounded-lg bg-muted/50 text-center">
            <p className="text-sm text-muted-foreground">Team Name</p>
            <p className="font-semibold">{currentTeam?.name}</p>
          </div>

          <Button onClick={onTeamReady} className="w-full" size="lg">
            <Play className="w-4 h-4 mr-2" />
            Enter Game
          </Button>
          
          <p className="text-xs text-center text-muted-foreground">
            Team members can join using the code above
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto bg-card/95 backdrop-blur border-primary/20">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
          <Users className="w-6 h-6 text-primary" />
        </div>
        <CardTitle className="text-2xl">Create Your Team</CardTitle>
        <CardDescription>
          Welcome, {user?.email}! Create a team to get started.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleCreateTeam} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="team-name">Team Name</Label>
            <Input
              id="team-name"
              type="text"
              placeholder="Enter team name..."
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              maxLength={30}
              required
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Create Team & Get Code
          </Button>
        </form>
        
        <div className="mt-4 pt-4 border-t text-center">
          <Button variant="ghost" size="sm" onClick={logout}>
            Use different account
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default TeamCreation;
