import { useState } from 'react';
import { PLANS, formatPrice, type Plan, type PlanType } from '../types';

interface PricingCardProps {
  plan: Plan;
  currentPlan?: PlanType;
  onSubscribe: (planId: PlanType) => void;
  loading?: boolean;
}

function PricingCard({ plan, currentPlan, onSubscribe, loading }: PricingCardProps) {
  const isCurrentPlan = currentPlan === plan.id;
  const isFree = plan.id === 'free';
  
  return (
    <div className={`pricing-card ${plan.highlight ? 'pricing-card--highlight' : ''} ${isCurrentPlan ? 'pricing-card--current' : ''}`}>
      {plan.highlight && <div className="pricing-card__badge">Most Popular</div>}
      
      <div className="pricing-card__header">
        <h3 className="pricing-card__name">{plan.name}</h3>
        <div className="pricing-card__price">
          <span className="pricing-card__amount">{formatPrice(plan.price)}</span>
          {plan.isRecurring && <span className="pricing-card__period">/month</span>}
          {plan.isAddOn && <span className="pricing-card__period">one-time</span>}
        </div>
      </div>
      
      <div className="pricing-card__credits">
        <span className="pricing-card__credits-number">{plan.credits}</span>
        <span className="pricing-card__credits-label">credits</span>
      </div>
      
      <p className="pricing-card__description">{plan.description}</p>
      
      <div className="pricing-card__features">
        <div className="pricing-card__feature">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20,6 9,17 4,12" />
          </svg>
          <span>No watermark</span>
        </div>
        <div className="pricing-card__feature">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20,6 9,17 4,12" />
          </svg>
          <span>HD quality output</span>
        </div>
        <div className="pricing-card__feature">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20,6 9,17 4,12" />
          </svg>
          <span>Priority processing</span>
        </div>
      </div>
      
      <button
        className={`pricing-card__btn ${plan.highlight ? 'pricing-card__btn--primary' : 'pricing-card__btn--secondary'}`}
        onClick={() => onSubscribe(plan.id)}
        disabled={loading || isCurrentPlan || isFree}
      >
        {isCurrentPlan ? 'Current Plan' : isFree ? 'Included' : loading ? 'Loading...' : 'Subscribe'}
      </button>
    </div>
  );
}

interface PricingPageProps {
  currentPlan?: PlanType;
  onSubscribe: (planId: PlanType) => void;
  loading?: boolean;
}

export default function PricingPage({ currentPlan, onSubscribe, loading }: PricingPageProps) {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanType | null>(null);
  
  // Separate plans
  const subscriptionPlans = PLANS.filter(p => !p.isAddOn);
  const addOnPlans = PLANS.filter(p => p.isAddOn);
  
  const handleSubscribe = (planId: PlanType) => {
    setSelectedPlan(planId);
    setShowUpgradeModal(true);
  };
  
  const confirmSubscribe = () => {
    if (selectedPlan) {
      onSubscribe(selectedPlan);
      setShowUpgradeModal(false);
    }
  };
  
  return (
    <div className="pricing-page">
      <div className="pricing-page__header">
        <h1 className="pricing-page__title">Choose Your Plan</h1>
        <p className="pricing-page__subtitle">
          Start with 3 free credits. No credit card required.
        </p>
      </div>
      
      {/* Subscription Plans - Single Row */}
      <div className="pricing-plans-row">
        <div className="pricing-plans-row__grid">
          {subscriptionPlans.map(plan => (
            <PricingCard
              key={plan.id}
              plan={plan}
              currentPlan={currentPlan}
              onSubscribe={handleSubscribe}
              loading={loading}
            />
          ))}
        </div>
      </div>
      
      {/* Add-on Plans - Second Row */}
      <div className="pricing-addons">
        <h2 className="pricing-addons__title">Need More Credits?</h2>
        <p className="pricing-addons__subtitle">One-time purchase packs with 2-month validity</p>
        <div className="pricing-addons__row">
          {addOnPlans.map(plan => (
            <PricingCard
              key={plan.id}
              plan={plan}
              currentPlan={currentPlan}
              onSubscribe={handleSubscribe}
              loading={loading}
            />
          ))}
        </div>
      </div>
      
      {/* Upgrade Confirmation Modal */}
      {showUpgradeModal && selectedPlan && (
        <div className="modal-overlay" onClick={() => setShowUpgradeModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal__title">Confirm Subscription</h3>
            <p className="modal__text">
              You are about to subscribe to <strong>{PLANS.find(p => p.id === selectedPlan)?.name}</strong> 
              {' '}for <strong>{formatPrice(PLANS.find(p => p.id === selectedPlan)?.price || 0)}</strong>
            </p>
            <p className="modal__subtext">
              You will be redirected to PayPal to complete the payment.
            </p>
            <div className="modal__actions">
              <button className="modal__btn modal__btn--cancel" onClick={() => setShowUpgradeModal(false)}>
                Cancel
              </button>
              <button className="modal__btn modal__btn--confirm" onClick={confirmSubscribe}>
                Continue to PayPal
              </button>
            </div>
          </div>
        </div>
      )}
      
      <style>{`
        .pricing-page {
          padding: 80px 24px;
          max-width: 1200px;
          margin: 0 auto;
        }
        
        .pricing-page__header {
          text-align: center;
          margin-bottom: 60px;
        }
        
        .pricing-page__title {
          font-size: 48px;
          font-weight: 600;
          letter-spacing: -0.02em;
          margin-bottom: 16px;
          background: linear-gradient(135deg, #ffffff 0%, #a1a1a6 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .pricing-page__subtitle {
          font-size: 18px;
          color: var(--color-text-secondary);
        }
        
        .pricing-plans-row {
          width: 100%;
          margin-bottom: 80px;
        }
        
        .pricing-plans-row__grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
        }
        
        .pricing-addons {
          text-align: center;
          width: 100%;
        }
        
        .pricing-addons__title {
          font-size: 28px;
          font-weight: 600;
          margin-bottom: 8px;
        }
        
        .pricing-addons__subtitle {
          font-size: 16px;
          color: var(--color-text-secondary);
          margin-bottom: 32px;
        }
        
        .pricing-addons__row {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
          max-width: 600px;
          margin: 0 auto;
        }
        
        .pricing-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 24px;
          margin-bottom: 80px;
        }
        
        .pricing-grid--addon {
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          margin-bottom: 0;
        }
        
        .pricing-card {
          position: relative;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--color-border);
          border-radius: 20px;
          padding: 32px;
          display: flex;
          flex-direction: column;
          transition: all 0.3s ease;
        }
        
        .pricing-card:hover {
          border-color: rgba(41, 151, 255, 0.5);
          transform: translateY(-4px);
        }
        
        .pricing-card--highlight {
          border-color: var(--color-accent);
          background: rgba(41, 151, 255, 0.05);
        }
        
        .pricing-card--current {
          border-color: #34c759;
          background: rgba(52, 199, 89, 0.05);
        }
        
        .pricing-card__badge {
          position: absolute;
          top: -12px;
          left: 50%;
          transform: translateX(-50%);
          background: var(--color-accent);
          color: white;
          font-size: 12px;
          font-weight: 600;
          padding: 4px 16px;
          border-radius: 20px;
        }
        
        .pricing-card__header {
          margin-bottom: 24px;
        }
        
        .pricing-card__name {
          font-size: 20px;
          font-weight: 600;
          margin-bottom: 8px;
        }
        
        .pricing-card__price {
          display: flex;
          align-items: baseline;
          gap: 4px;
        }
        
        .pricing-card__amount {
          font-size: 36px;
          font-weight: 700;
        }
        
        .pricing-card__period {
          font-size: 14px;
          color: var(--color-text-secondary);
        }
        
        .pricing-card__credits {
          display: flex;
          align-items: baseline;
          gap: 8px;
          margin-bottom: 16px;
          padding: 16px 0;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
        
        .pricing-card__credits-number {
          font-size: 32px;
          font-weight: 700;
          color: var(--color-accent);
        }
        
        .pricing-card__credits-label {
          font-size: 14px;
          color: var(--color-text-secondary);
        }
        
        .pricing-card__description {
          font-size: 14px;
          color: var(--color-text-secondary);
          margin-bottom: 24px;
          flex-grow: 1;
        }
        
        .pricing-card__features {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 24px;
        }
        
        .pricing-card__feature {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 14px;
        }
        
        .pricing-card__feature svg {
          width: 18px;
          height: 18px;
          color: #34c759;
          flex-shrink: 0;
        }
        
        .pricing-card__btn {
          width: 100%;
          padding: 14px 24px;
          font-size: 16px;
          font-weight: 600;
          border-radius: 12px;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-top: auto;
        }
        
        .pricing-card__btn--primary {
          background: var(--color-accent);
          color: white;
        }
        
        .pricing-card__btn--primary:hover {
          background: var(--color-accent-hover);
        }
        
        .pricing-card__btn--secondary {
          background: rgba(255, 255, 255, 0.1);
          color: var(--color-text);
          border: 1px solid var(--color-border);
        }
        
        .pricing-card__btn--secondary:hover {
          background: rgba(255, 255, 255, 0.15);
          border-color: var(--color-accent);
        }
        
        .pricing-card__btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        /* Modal */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 24px;
        }
        
        .modal {
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          border-radius: 20px;
          padding: 32px;
          max-width: 420px;
          width: 100%;
        }
        
        .modal__title {
          font-size: 22px;
          font-weight: 600;
          margin-bottom: 16px;
        }
        
        .modal__text {
          font-size: 16px;
          margin-bottom: 8px;
        }
        
        .modal__subtext {
          font-size: 14px;
          color: var(--color-text-secondary);
          margin-bottom: 24px;
        }
        
        .modal__actions {
          display: flex;
          gap: 12px;
        }
        
        .modal__btn {
          flex: 1;
          padding: 14px 24px;
          font-size: 16px;
          font-weight: 600;
          border-radius: 12px;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .modal__btn--cancel {
          background: rgba(255, 255, 255, 0.1);
          color: var(--color-text);
        }
        
        .modal__btn--cancel:hover {
          background: rgba(255, 255, 255, 0.15);
        }
        
        .modal__btn--confirm {
          background: var(--color-accent);
          color: white;
        }
        
        .modal__btn--confirm:hover {
          background: var(--color-accent-hover);
        }
        
        /* Responsive */
        @media (max-width: 1024px) {
          .pricing-plans-row__grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        
        @media (max-width: 640px) {
          .pricing-page {
            padding: 40px 16px;
          }
          
          .pricing-page__title {
            font-size: 32px;
          }
          
          .pricing-plans-row__grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }
          
          .pricing-addons__row {
            grid-template-columns: 1fr;
            gap: 16px;
          }
          
          .pricing-card {
            padding: 24px;
          }
          
          .pricing-card__amount {
            font-size: 28px;
          }
        }
      `}</style>
    </div>
  );
}
