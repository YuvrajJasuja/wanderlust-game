import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { 
  Team, 
  TeamMember,
  createTeam, 
  findTeamByCode, 
  joinTeam,
  updateMemberScore,
  subscribeToTeam,
  subscribeToLeaderboard
} from '@/lib/teamService';

interface TeamContextType {
  // Auth state
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Team state
  currentTeam: Team | null;
  currentMember: TeamMember | null;
  leaderboard: Team[];
  
  // Auth actions
  loginLeader: (email: string, password: string) => Promise<void>;
  registerLeader: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  
  // Team actions
  createNewTeam: (teamName: string) => Promise<string>;
  joinExistingTeam: (code: string, memberName: string) => Promise<void>;
  addScore: (points: number) => Promise<void>;
  
  // Game state
  isInGame: boolean;
  enterGame: () => void;
  exitGame: () => void;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

export const useTeam = () => {
  const context = useContext(TeamContext);
  if (!context) {
    throw new Error('useTeam must be used within a TeamProvider');
  }
  return context;
};

interface TeamProviderProps {
  children: ReactNode;
}

export const TeamProvider: React.FC<TeamProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);
  const [currentMember, setCurrentMember] = useState<TeamMember | null>(null);
  const [leaderboard, setLeaderboard] = useState<Team[]>([]);
  const [isInGame, setIsInGame] = useState(false);

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsLoading(false);
    });
    return unsubscribe;
  }, []);

  // Subscribe to leaderboard
  useEffect(() => {
    const unsubscribe = subscribeToLeaderboard(setLeaderboard);
    return unsubscribe;
  }, []);

  // Subscribe to current team updates
  useEffect(() => {
    if (!currentTeam?.id) return;
    
    const unsubscribe = subscribeToTeam(currentTeam.id, (team) => {
      if (team) {
        setCurrentTeam(team);
        // Update current member data
        const member = team.members.find(m => m.id === currentMember?.id);
        if (member) setCurrentMember(member);
      }
    });
    
    return unsubscribe;
  }, [currentTeam?.id, currentMember?.id]);

  const loginLeader = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const registerLeader = async (email: string, password: string) => {
    await createUserWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
    setCurrentTeam(null);
    setCurrentMember(null);
    setIsInGame(false);
  };

  const createNewTeam = async (teamName: string): Promise<string> => {
    if (!user) throw new Error('Must be logged in to create a team');
    
    const team = await createTeam(user.uid, user.email || '', teamName);
    setCurrentTeam(team);
    setCurrentMember(team.members[0]);
    
    return team.code;
  };

  const joinExistingTeam = async (code: string, memberName: string) => {
    const team = await findTeamByCode(code);
    if (!team) throw new Error('Team not found');
    
    // Generate a unique member ID for non-authenticated members
    const memberId = `member_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await joinTeam(team.id, memberId, memberName);
    
    // Refresh team data
    const updatedTeam = await findTeamByCode(code);
    if (updatedTeam) {
      setCurrentTeam(updatedTeam);
      const member = updatedTeam.members.find(m => m.id === memberId);
      if (member) setCurrentMember(member);
    }
  };

  const addScore = async (points: number) => {
    if (!currentTeam || !currentMember) return;
    await updateMemberScore(currentTeam.id, currentMember.id, points);
  };

  const enterGame = () => setIsInGame(true);
  const exitGame = () => setIsInGame(false);

  return (
    <TeamContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        currentTeam,
        currentMember,
        leaderboard,
        loginLeader,
        registerLeader,
        logout,
        createNewTeam,
        joinExistingTeam,
        addScore,
        isInGame,
        enterGame,
        exitGame
      }}
    >
      {children}
    </TeamContext.Provider>
  );
};
