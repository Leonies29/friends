import {
  assassinMissions,
  badges,
  challenges,
  currentUser,
  eliminationHistory,
  funAwards,
  photos,
  quest,
  scheduleEvents,
  users,
  worldEvents
} from "@/lib/mock-data";
import type { Challenge, Photo, ScheduleEvent, User } from "@/types";

export interface AuthRepository {
  login(email: string, password: string): Promise<User>;
  register(input: Pick<User, "username" | "email" | "avatarUrl"> & { password: string }): Promise<User>;
  sendPasswordReset(email: string): Promise<void>;
  logout(): Promise<void>;
  getCurrentUser(): Promise<User | null>;
}

export const mockAuthRepository: AuthRepository = {
  async login() {
    return currentUser;
  },
  async register(input) {
    return {
      id: "new-user",
      username: input.username,
      email: input.email,
      avatarUrl: input.avatarUrl,
      level: 1,
      totalXp: 0,
      joinedAt: new Date().toISOString(),
      stats: { challengesCompleted: 0, assassinations: 0, photosUploaded: 0, pointsEarned: 0, relicsCollected: 0, catsFound: 0 },
      badges: [],
      achievements: []
    };
  },
  async sendPasswordReset() {},
  async logout() {},
  async getCurrentUser() {
    return currentUser;
  }
};

export const appRepository = {
  async getDashboard() {
    return {
      currentDay: 3,
      users,
      currentUser,
      scheduleEvents,
      photos,
      worldEvent: worldEvents[0],
      quest
    };
  },
  async getUsers() {
    return users;
  },
  async getProfile(userId: string) {
    return users.find((user) => user.id === userId) ?? currentUser;
  },
  async getSchedule() {
    return scheduleEvents;
  },
  async saveScheduleEvent(event: ScheduleEvent) {
    return event;
  },
  async deleteScheduleEvent(eventId: string) {
    return eventId;
  },
  async getPhotos() {
    return photos;
  },
  async uploadPhoto(photo: Omit<Photo, "id" | "createdAt" | "reactions">) {
    return { ...photo, id: crypto.randomUUID(), createdAt: new Date().toISOString(), reactions: [] };
  },
  async deletePhoto(photoId: string) {
    return photoId;
  },
  async reactToPhoto(photoId: string, type: Photo["reactions"][number]["type"]) {
    return { photoId, type, xpGranted: type === "legendary" ? 10 : 5 };
  },
  async getChallenges(userId: string) {
    return challenges.filter((challenge) => challenge.ownerId === userId);
  },
  async submitChallengeProof(challengeId: string, proof: Challenge["proof"]) {
    return { challengeId, proof, status: "submitted" as const };
  },
  async getAssassinGame() {
    return { missions: assassinMissions, eliminationHistory };
  },
  async getQuest() {
    return quest;
  },
  async getBadges() {
    return badges;
  },
  async getWorldEvents() {
    return worldEvents;
  },
  async getFunAwards() {
    return funAwards;
  }
};
