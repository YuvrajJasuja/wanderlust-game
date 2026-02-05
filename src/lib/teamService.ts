import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  query, 
  where, 
  getDocs,
  onSnapshot,
  arrayUnion,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';

export interface TeamMember {
  id: string;
  name: string;
  score: number;
  joinedAt: Date;
}

export interface Team {
  id: string;
  code: string;
  name: string;
  leaderId: string;
  leaderEmail: string;
  members: TeamMember[];
  totalScore: number;
  createdAt: Date;
}

// Generate a 6-character team code
export const generateTeamCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Create a new team
export const createTeam = async (
  leaderId: string, 
  leaderEmail: string, 
  teamName: string
): Promise<Team> => {
  const code = generateTeamCode();
  const teamRef = doc(collection(db, 'teams'));
  
  const team: Team = {
    id: teamRef.id,
    code,
    name: teamName,
    leaderId,
    leaderEmail,
    members: [{
      id: leaderId,
      name: 'Leader',
      score: 0,
      joinedAt: new Date()
    }],
    totalScore: 0,
    createdAt: new Date()
  };

  await setDoc(teamRef, {
    ...team,
    createdAt: Timestamp.fromDate(team.createdAt),
    members: team.members.map(m => ({
      ...m,
      joinedAt: Timestamp.fromDate(m.joinedAt)
    }))
  });

  return team;
};

// Find team by code
export const findTeamByCode = async (code: string): Promise<Team | null> => {
  const teamsRef = collection(db, 'teams');
  const q = query(teamsRef, where('code', '==', code.toUpperCase()));
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) return null;
  
  const doc = snapshot.docs[0];
  const data = doc.data();
  
  return {
    ...data,
    id: doc.id,
    createdAt: data.createdAt?.toDate() || new Date(),
    members: data.members?.map((m: any) => ({
      ...m,
      joinedAt: m.joinedAt?.toDate() || new Date()
    })) || []
  } as Team;
};

// Join a team
export const joinTeam = async (
  teamId: string, 
  memberId: string, 
  memberName: string
): Promise<void> => {
  const teamRef = doc(db, 'teams', teamId);
  
  const newMember: TeamMember = {
    id: memberId,
    name: memberName,
    score: 0,
    joinedAt: new Date()
  };

  await updateDoc(teamRef, {
    members: arrayUnion({
      ...newMember,
      joinedAt: Timestamp.fromDate(newMember.joinedAt)
    })
  });
};

// Update member score
export const updateMemberScore = async (
  teamId: string, 
  memberId: string, 
  scoreToAdd: number
): Promise<void> => {
  const teamRef = doc(db, 'teams', teamId);
  const teamSnap = await getDoc(teamRef);
  
  if (!teamSnap.exists()) return;
  
  const teamData = teamSnap.data();
  const members = teamData.members || [];
  
  const updatedMembers = members.map((m: any) => {
    if (m.id === memberId) {
      return { ...m, score: (m.score || 0) + scoreToAdd };
    }
    return m;
  });
  
  const newTotalScore = updatedMembers.reduce((sum: number, m: any) => sum + (m.score || 0), 0);
  
  await updateDoc(teamRef, {
    members: updatedMembers,
    totalScore: newTotalScore
  });
};

// Subscribe to leaderboard (real-time updates)
export const subscribeToLeaderboard = (
  callback: (teams: Team[]) => void
): (() => void) => {
  const teamsRef = collection(db, 'teams');
  const q = query(teamsRef, orderBy('totalScore', 'desc'));
  
  return onSnapshot(q, (snapshot) => {
    const teams: Team[] = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt?.toDate() || new Date(),
        members: data.members?.map((m: any) => ({
          ...m,
          joinedAt: m.joinedAt?.toDate() || new Date()
        })) || []
      } as Team;
    });
    callback(teams);
  });
};

// Subscribe to a specific team
export const subscribeToTeam = (
  teamId: string,
  callback: (team: Team | null) => void
): (() => void) => {
  const teamRef = doc(db, 'teams', teamId);
  
  return onSnapshot(teamRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback(null);
      return;
    }
    
    const data = snapshot.data();
    callback({
      ...data,
      id: snapshot.id,
      createdAt: data.createdAt?.toDate() || new Date(),
      members: data.members?.map((m: any) => ({
        ...m,
        joinedAt: m.joinedAt?.toDate() || new Date()
      })) || []
    } as Team);
  });
};
