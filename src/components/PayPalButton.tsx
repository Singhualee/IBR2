import { useEffect, useRef, useState } from 'react';
import { type PlanType } from '../types';

// PayPal client ID - should be from environment variable
const PAYPAL_CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID || '';

// PayPal plan IDs for subscriptions
export const PAYPAL_SUBSCRIPTION_PLANS: Record<PlanType, string> = {
  'starter': 'P-7WD95306SU4076347NHJBEFQ',
  'basic': 'P-8T826385G0579913RNHJBFPQ',
  'pro': 'P-51165717EU111212KNHJBF3A',
  'add-on-a': '',
  'add-on-b': '',
  'free': '',
};

// One-time payment amounts
export const PAYPAL_PRICES: Record<PlanType, number> = {
  'starter': 2.90,
  'basic': 7.90,
  'pro': 19.90,
  'add-on-a': 19.00,
  'add-on-b': 29.00,
  'free': 0,
};

declare global {
  interface Window {
    paypal?: {
      Buttons: (config: PayPalButtonsConfig) => { render: (selector: string) => void };
    };
  }
}

interface PayPalButtonsConfig {
  style?: Record<string, string>;
  createSubscription?: (data: unknown, actions: { subscription: { create: (config: { planId: string }) => Promise<string> } }) => Promise<string>;
  createOrder?: (data: unknown, actions: { order: { create: (config: { purchase_units: { amount: { value: string } }[] }) => Promise<string> } }) => Promise<string>;
  onApprove?: (data: { subscriptionID?: string; orderID?: string }, actions: unknown) => Promise<void>;
  onError?: (err: Error) => void;
}

interface PayPalButtonProps {
  planId: PlanType;
  price: string;
  isSubscription: boolean;
  onSuccess: (transactionId: string, planId: PlanType) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
}

export default function PayPalButton({ planId, price: _price, isSubscription, onSuccess, onError, disabled }: PayPalButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonIdRef = useRef<string>(`paypal-btn-${planId}-${Date.now()}`);
  const [sdkReady, setSdkReady] = useState(false);

  useEffect(() => {
    if (!PAYPAL_CLIENT_ID) {
      console.error('PayPal Client ID not configured');
      return;
    }

    // Load PayPal SDK
    const loadPayPalScript = () => {
      if (window.paypal) {
        setSdkReady(true);
        return;
      }

      const script = document.createElement('script');
      // Use intent=subscription for subscription plans, otherwise use intent=capture for one-time
      const intent = isSubscription ? 'subscription' : 'capture';
      script.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&intent=${intent}&vault=true`;
      script.async = true;
      script.onload = () => {
        setSdkReady(true);
      };
      script.onerror = () => {
        onError?.('Failed to load PayPal SDK');
      };
      document.body.appendChild(script);
    };

    loadPayPalScript();
  }, [isSubscription]);

  useEffect(() => {
    if (!sdkReady || !window.paypal || !containerRef.current) return;

    const containerId = buttonIdRef.current;
    containerRef.current.id = containerId;

    const buttonsConfig: PayPalButtonsConfig = {
      style: {
        layout: 'vertical',
        color: 'gold',
        shape: 'rect',
        label: 'paypal',
      },
      onError: (err: Error) => {
        console.error('PayPal error:', err);
        onError?.(err.message || 'Payment failed');
      },
    };

    if (isSubscription) {
      // Subscription flow
      const planIdToUse = PAYPAL_SUBSCRIPTION_PLANS[planId];
      if (!planIdToUse) {
        console.error('No subscription plan ID for:', planId);
        return;
      }

      buttonsConfig.createSubscription = async (_data: unknown, actions: { subscription: { create: (config: { planId: string }) => Promise<string> } }) => {
        return actions.subscription.create({
          planId: planIdToUse,
        });
      };

      buttonsConfig.onApprove = async (data: { subscriptionID?: string }) => {
        if (data.subscriptionID) {
          onSuccess(data.subscriptionID, planId);
        }
      };
    } else {
      // One-time payment flow (for add-ons)
      const amount = PAYPAL_PRICES[planId];

      buttonsConfig.createOrder = async (_data: unknown, actions: { order: { create: (config: { purchase_units: { amount: { value: string } }[] }) => Promise<string> } }) => {
        return actions.order.create({
          purchase_units: [
            {
              amount: {
                value: amount.toFixed(2),
              },
            },
          ],
        });
      };

      buttonsConfig.onApprove = async (data: { orderID?: string }) => {
        if (data.orderID) {
          onSuccess(data.orderID, planId);
        }
      };
    }

    window.paypal.Buttons(buttonsConfig).render(`#${containerId}`);
  }, [sdkReady, isSubscription, planId, onSuccess, onError]);

  if (!PAYPAL_CLIENT_ID) {
    return (
      <div className="paypal-btn-placeholder paypal-btn-placeholder--error">
        PayPal not configured
      </div>
    );
  }

  if (disabled || !sdkReady) {
    return (
      <div className="paypal-btn-placeholder paypal-btn-placeholder--disabled">
        {!sdkReady ? 'Loading PayPal...' : 'Processing...'}
      </div>
    );
  }

  return (
    <>
      <div ref={containerRef} className="paypal-btn-container" />
      <style>{`
        .paypal-btn-container {
          width: 100%;
          min-height: 45px;
        }
        
        .paypal-btn-placeholder {
          width: 100%;
          padding: 14px;
          text-align: center;
          border-radius: 12px;
          font-size: 14px;
          background: rgba(255, 255, 255, 0.1);
          color: var(--color-text-secondary);
        }
        
        .paypal-btn-placeholder--error {
          background: rgba(255, 107, 107, 0.1);
          color: #ff6b6b;
        }
        
        .paypal-btn-placeholder--disabled {
          opacity: 0.6;
        }
      `}</style>
    </>
  );
}
