// src/services/subscriptionService.ts
import { supabase } from './supabase';
import { SubscriptionTier, SubscriptionLimits, UserProfile } from '../types';

export const SUBSCRIPTION_LIMITS: Record<SubscriptionTier, SubscriptionLimits> = {
  standard: {
    dailyNoteLimit: 2,
    aiAnalysisEnabled: false,
    pdfUploadEnabled: false,
    maxPdfSizeMB: 0,
  },
  pro: {
    dailyNoteLimit: Infinity,
    aiAnalysisEnabled: true,
    pdfUploadEnabled: true,
    maxPdfSizeMB: 50,
  },
};

export async function getUserProfile(): Promise<UserProfile | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }

    return data ? {
      ...data,
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at),
    } : null;
  } catch (error) {
    console.error('Error in getUserProfile:', error);
    return null;
  }
}

export async function getSubscriptionLimits(tier: SubscriptionTier): Promise<SubscriptionLimits> {
  return SUBSCRIPTION_LIMITS[tier];
}

export async function checkDailyNoteLimit(): Promise<{ canUpload: boolean; remaining: number; tier: SubscriptionTier }> {
  try {
    const profile = await getUserProfile();
    if (!profile) {
      throw new Error('User profile not found');
    }

    const limits = await getSubscriptionLimits(profile.subscription_tier);
    
    // For pro users, no limit
    if (profile.subscription_tier === 'pro') {
      return { canUpload: true, remaining: Infinity, tier: profile.subscription_tier };
    }

    const today = new Date().toISOString().split('T')[0];
    const lastNoteDate = profile.last_note_date?.split('T')[0];
    
    // Reset count if it's a new day
    let currentCount = profile.daily_note_count;
    if (lastNoteDate !== today) {
      currentCount = 0;
    }

    const remaining = Math.max(0, limits.dailyNoteLimit - currentCount);
    const canUpload = remaining > 0;

    return { canUpload, remaining, tier: profile.subscription_tier };
  } catch (error) {
    console.error('Error checking daily note limit:', error);
    return { canUpload: false, remaining: 0, tier: 'standard' };
  }
}

export async function incrementDailyNoteCount(): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const profile = await getUserProfile();
    if (!profile) throw new Error('User profile not found');

    const today = new Date().toISOString();
    const todayDate = today.split('T')[0];
    const lastNoteDate = profile.last_note_date?.split('T')[0];

    // Reset count if it's a new day
    const newCount = lastNoteDate === todayDate ? profile.daily_note_count + 1 : 1;

    const { error } = await supabase
      .from('user_profiles')
      .update({
        daily_note_count: newCount,
        last_note_date: today,
        updated_at: today,
      })
      .eq('user_id', user.id);

    if (error) {
      console.error('Error updating daily note count:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in incrementDailyNoteCount:', error);
    throw error;
  }
}

export async function canUseAIAnalysis(): Promise<boolean> {
  try {
    const profile = await getUserProfile();
    if (!profile) return false;

    const limits = await getSubscriptionLimits(profile.subscription_tier);
    return limits.aiAnalysisEnabled;
  } catch (error) {
    console.error('Error checking AI analysis permission:', error);
    return false;
  }
}

export async function canUploadPDF(): Promise<{ allowed: boolean; maxSizeMB: number }> {
  try {
    const profile = await getUserProfile();
    if (!profile) return { allowed: false, maxSizeMB: 0 };

    const limits = await getSubscriptionLimits(profile.subscription_tier);
    return { 
      allowed: limits.pdfUploadEnabled, 
      maxSizeMB: limits.maxPdfSizeMB 
    };
  } catch (error) {
    console.error('Error checking PDF upload permission:', error);
    return { allowed: false, maxSizeMB: 0 };
  }
}

export async function upgradeToProTier(): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('user_profiles')
      .update({
        subscription_tier: 'pro',
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (error) {
      console.error('Error upgrading to pro tier:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in upgradeToProTier:', error);
    throw error;
  }
}