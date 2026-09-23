import { UserProfile, ConnectionRequest, ChatMessage } from '../types';

/**
 * Clean seed data container.
 * Pre-created fake / demo users have been purged completely.
 * The application operates strictly with real registered users.
 */
export const INITIAL_USERS: UserProfile[] = [];

export const INITIAL_CONNECTIONS: ConnectionRequest[] = [];

export const INITIAL_MESSAGES: ChatMessage[] = [];
