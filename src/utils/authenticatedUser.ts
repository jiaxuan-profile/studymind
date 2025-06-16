// utils/authenticatedUser.ts
import { useStore } from '../store';

export function getAuthenticatedUserId(): string | null {
  const state = useStore.getState();
  return state.user?.id || null;
}

export async function withAuthenticatedUser<T>(
  storeSet: (update: any) => void,
  onExecute: (userId: string) => Promise<T>,
  onErrorMessage = 'User ID is required'
): Promise<T | void> {
  const userId = getAuthenticatedUserId();
  if (!userId) {
    console.error('authenticatedUser:', onErrorMessage);
    storeSet({ error: onErrorMessage, isLoading: false });
    return;
  }

  return onExecute(userId);
}