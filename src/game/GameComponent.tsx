import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { MainScene } from './scenes/MainScene';

const GameComponent = () => {
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-background">
      <div ref={containerRef} className="w-full h-full" />
      
      {/* Game UI Overlay */}
      <div className="absolute top-4 right-4 z-10">
        <div className="bg-card/90 backdrop-blur-sm rounded-lg p-4 border border-border shadow-lg">
          <h2 className="font-pixel text-xs text-primary mb-2">Controls</h2>
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>↑ ← ↓ → or WASD to move</p>
            <p>Explore the world!</p>
          </div>
        </div>
      </div>

      {/* Mini info */}
      <div className="absolute bottom-4 left-4 z-10">
        <div className="bg-card/90 backdrop-blur-sm rounded-lg px-4 py-2 border border-border">
          <span className="font-pixel text-[10px] text-secondary">Open World Explorer</span>
        </div>
      </div>
    </div>
  );
};

export default GameComponent;
