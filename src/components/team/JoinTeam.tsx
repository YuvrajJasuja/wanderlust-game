import React, { useState } from 'react';
import { useTeam } from '@/contexts/TeamContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2, UserPlus, Play } from 'lucide-react';

interface JoinTeamProps {
  onJoined: () => void;
  onBack: () => void;
}

const JoinTeam: React.FC<JoinTeamProps> = ({ onJoined, onBack }) => {
  const { joinExistingTeam, currentTeam } = useTeam();
  const [teamCode, setTeamCode] = useState('');
  const [memberName, setMemberName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [joined, setJoined] = useState(false);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (teamCode.trim().length !== 6) {
      setError('Team code must be 6 characters');
      return;
    }
    
    if (memberName.trim().length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }
    
    setIsLoading(true);
    
    try {
      await joinExistingTeam(teamCode.trim().toUpperCase(), memberName.trim());
      setJoined(true);
    } catch (err: any) {
      setError(err.message || 'Failed to join team');
    } finally {
      setIsLoading(false);
    }
  };

  if (joined && currentTeam) {
    return (
      <Card className="w-full max-w-md mx-auto bg-card/95 backdrop-blur border-primary/20">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
            <UserPlus className="w-6 h-6 text-green-500" />
          </div>
          <CardTitle className="text-2xl">Welcome to the Team!</CardTitle>
          <CardDescription>
            You've joined <span className="font-semibold text-foreground">{currentTeam.name}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground mb-1">Your Name</p>
            <p className="font-semibold">{memberName}</p>
          </div>
          
          <div className="p-4 rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground mb-1">Team Members</p>
            <p className="font-semibold">{currentTeam.members.length} players</p>
          </div>

          <Button onClick={onJoined} className="w-full" size="lg">
            <Play className="w-4 h-4 mr-2" />
            Enter Game
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto bg-card/95 backdrop-blur border-primary/20">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
          <UserPlus className="w-6 h-6 text-primary" />
        </div>
        <CardTitle className="text-2xl">Join a Team</CardTitle>
        <CardDescription>
          Enter the team code shared by your leader
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleJoin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="team-code">Team Code</Label>
            <Input
              id="team-code"
              type="text"
              placeholder="ABCD12"
              value={teamCode}
              onChange={(e) => setTeamCode(e.target.value.toUpperCase())}
              maxLength={6}
              className="text-center text-2xl font-mono tracking-widest uppercase"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="member-name">Your Name</Label>
            <Input
              id="member-name"
              type="text"
              placeholder="Enter your name..."
              value={memberName}
              onChange={(e) => setMemberName(e.target.value)}
              maxLength={20}
              required
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Join Team
          </Button>
        </form>
        
        <div className="mt-4 pt-4 border-t text-center">
          <Button variant="ghost" size="sm" onClick={onBack}>
            ← Back to options
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default JoinTeam;
