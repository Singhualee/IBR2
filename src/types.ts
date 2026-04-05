// Subscription plan types
export type PlanType = 'free' | 'starter' | 'basic' | 'pro' | 'add-on-a' | 'add-on-b';

export interface Plan {
  id: PlanType;
  name: string;
  price: number; // USD per month (0 for free)
  credits: number;
  validityDays?: number; // for subscriptions: monthly reset
  addOnValidityDays?: number; // for add-ons: 2 months
  isRecurring: boolean;
  isAddOn: boolean;
  description: string;
  highlight?: boolean; // recommended plan
}

export interface UserQuota {
  googleId: string;
  email: string;
  // Free trial
  freeCredits: number; // 3 total, 5 days validity
  freeCreditsUsed: number;
  freeTrialClaimedAt: number | null; // timestamp when claimed
  
  // Subscription
  planType: PlanType;
  planCredits: number; // monthly credits from subscription
  planCreditsUsed: number;
  planExpiresAt: number | null; // subscription end date (monthly)
  
  // Add-ons
  addOnACredits: number;
  addOnACreditsUsed: number;
  addOnAExpiresAt: number | null;
  addOnBCredits: number;
  addOnBCreditsUsed: number;
  addOnBExpiresAt: number | null;
  
  // Computed
  totalAvailableCredits: number;
  usedCredits: number;
}

// Plan definitions
export const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free Trial',
    price: 0,
    credits: 3,
    validityDays: 5,
    isRecurring: false,
    isAddOn: false,
    description: '3 credits, valid for 5 days after first login',
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 2.9,
    credits: 10,
    validityDays: 30,
    isRecurring: true,
    isAddOn: false,
    description: '10 credits/month, monthly reset',
  },
  {
    id: 'basic',
    name: 'Basic',
    price: 7.9,
    credits: 30,
    validityDays: 30,
    isRecurring: true,
    isAddOn: false,
    description: '30 credits/month, monthly reset',
    highlight: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 19.9,
    credits: 100,
    validityDays: 30,
    isRecurring: true,
    isAddOn: false,
    description: '100 credits/month, monthly reset',
  },
  {
    id: 'add-on-a',
    name: 'Add-on A',
    price: 19,
    credits: 70,
    addOnValidityDays: 60,
    isRecurring: false,
    isAddOn: true,
    description: '70 credits, valid for 2 months',
  },
  {
    id: 'add-on-b',
    name: 'Add-on B',
    price: 29,
    credits: 110,
    addOnValidityDays: 60,
    isRecurring: false,
    isAddOn: true,
    description: '110 credits, valid for 2 months',
  },
];

// Get plan by ID
export const getPlan = (id: PlanType): Plan | undefined => PLANS.find(p => p.id === id);

// Format price
export const formatPrice = (price: number): string => {
  if (price === 0) return 'Free';
  return `$${price.toFixed(2)}`;
};
