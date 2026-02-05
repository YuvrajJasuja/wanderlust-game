import { useEffect, useRef, useCallback } from 'react';
import Phaser from 'phaser';
import { MainScene } from './scenes/MainScene';
import { useTeam } from '@/contexts/TeamContext';
import Leaderboard from '@/components/team/Leaderboard';
import { Button } from '@/components/ui/button';
import { LogOut, Users, Trophy } from 'lucide-react';

const GameComponent = () => {
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { currentTeam, currentMember, addScore, exitGame, logout } = useTeam();

  // Handle score updates from the game
  const handleScoreUpdate = useCallback((points: number) => {
    addScore(points);
  }, [addScore]);

  useEffect(() => {
    if (containerRef.current && !gameRef.current) {
      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        parent: containerRef.current,
        width: window.innerWidth,
        height: window.innerHeight,
        backgroundColor: '#1a1a2e',
        physics: {
          default: 'arcade',
          arcade: {
            debug: false,
          },
        },
        scene: [MainScene],
        pixelArt: true,
        antialias: false,
        scale: {
          mode: Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
      };

      gameRef.current = new Phaser.Game(config);
      
      // Listen for score events from the game
      gameRef.current.events.on('scoreUpdate', handleScoreUpdate);
    }

    const handleResize = () => {
      if (gameRef.current) {
        gameRef.current.scale.resize(window.innerWidth, window.innerHeight);
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (gameRef.current) {
        gameRef.current.events.off('scoreUpdate', handleScoreUpdate);
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [handleScoreUpdate]);

  const handleExit = () => {
    exitGame();
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-background">
      <div ref={containerRef} className="w-full h-full" />
      
      {/* Team Info Overlay */}
      <div className="absolute top-4 left-4 z-10">
        <div className="bg-card/90 backdrop-blur-sm rounded-lg p-3 border border-border shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-primary" />
            <span className="font-pixel text-xs text-primary">{currentTeam?.name}</span>
          </div>
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>Player: {currentMember?.name || 'Unknown'}</p>
            <p className="flex items-center gap-1">
              <Trophy className="w-3 h-3" />
              Team Score: <span className="text-primary font-bold">{currentTeam?.totalScore || 0}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Controls Info */}
      <div className="absolute top-4 right-4 z-10">
        <div className="bg-card/90 backdrop-blur-sm rounded-lg p-4 border border-border shadow-lg">
          <h2 className="font-pixel text-xs text-primary mb-2">Controls</h2>
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>↑ ← ↓ → or WASD to move</p>
            <p>Explore the world!</p>
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="absolute bottom-4 right-4 z-10">
        <Leaderboard compact />
      </div>

      {/* Exit buttons */}
      <div className="absolute bottom-4 left-4 z-10 flex gap-2">
        <Button variant="outline" size="sm" onClick={handleExit}>
          <LogOut className="w-4 h-4 mr-1" />
          Exit Game
        </Button>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          Logout
        </Button>
      </div>
    </div>
  );
};

export default GameComponent;
