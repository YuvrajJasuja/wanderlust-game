import { TeamProvider, useTeam } from '@/contexts/TeamContext';
import GameComponent from '@/game/GameComponent';
import TeamLobby from '@/components/team/TeamLobby';

const GameContent = () => {
  const { isInGame, currentTeam, enterGame } = useTeam();

  // Show game if in game mode and has a team
  if (isInGame && currentTeam) {
    return <GameComponent />;
  }

  // Show team lobby
  return <TeamLobby onEnterGame={enterGame} />;
};

const Index = () => {
  return (
    <TeamProvider>
      <GameContent />
    </TeamProvider>
  );
};

export default Index;
