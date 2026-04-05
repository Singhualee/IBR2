import { getPlan, type PlanType } from '../types';

interface DashboardProps {
  userEmail: string;
  userName: string;
  userPicture?: string;
  quota: {
    freeCredits: number;
    freeCreditsUsed: number;
    freeTrialClaimedAt: number | null;
    planType: PlanType;
    planCredits: number;
    planCreditsUsed: number;
    planExpiresAt: number | null;
    addOnACredits: number;
    addOnACreditsUsed: number;
    addOnAExpiresAt: number | null;
    addOnBCredits: number;
    addOnBCreditsUsed: number;
    addOnBExpiresAt: number | null;
  };
  onNavigateToPricing: () => void;
  onLogout: () => void;
}

function formatDate(timestamp: number | null): string {
  if (!timestamp) return '-';
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function QuotaCard({ 
  title, 
  used, 
  total, 
  expiresAt,
  isActive 
}: { 
  title: string; 
  used: number; 
  total: number; 
  expiresAt?: number | null;
  isActive: boolean;
}) {
  if (!isActive) return null;
  
  const remaining = total - used;
  const percentage = total > 0 ? (remaining / total) * 100 : 0;
  const isLow = percentage < 20;
  
  return (
    <div className={`quota-card ${isLow ? 'quota-card--low' : ''}`}>
      <div className="quota-card__header">
        <h4 className="quota-card__title">{title}</h4>
        {expiresAt && (
          <span className="quota-card__expires">
            Expires: {formatDate(expiresAt)}
          </span>
        )}
      </div>
      <div className="quota-card__progress">
        <div 
          className="quota-card__progress-bar"
          style={{ width: `${Math.max(0, percentage)}%` }}
        />
      </div>
      <div className="quota-card__stats">
        <span className="quota-card__remaining">{remaining} remaining</span>
        <span className="quota-card__total">of {total}</span>
      </div>
    </div>
  );
}

export default function Dashboard({ 
  userEmail, 
  userName, 
  userPicture, 
  quota,
  onNavigateToPricing,
  onLogout,
}: DashboardProps) {
  // Compute totals
  const freeRemaining = quota.freeCredits - quota.freeCreditsUsed;
  const planRemaining = quota.planCredits - quota.planCreditsUsed;
  const addOnARemaining = quota.addOnACredits - quota.addOnACreditsUsed;
  const addOnBRemaining = quota.addOnBCredits - quota.addOnBCreditsUsed;
  
  const totalRemaining = freeRemaining + planRemaining + addOnARemaining + addOnBRemaining;
  const currentPlan = getPlan(quota.planType);
  
  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dashboard__header">
        <div className="dashboard__user">
          {userPicture ? (
            <img src={userPicture} alt="avatar" className="dashboard__avatar" />
          ) : (
            <div className="dashboard__avatar dashboard__avatar--placeholder">
              {userName?.[0]?.toUpperCase() || userEmail?.[0]?.toUpperCase() || 'U'}
            </div>
          )}
          <div className="dashboard__user-info">
            <span className="dashboard__user-name">{userName || 'User'}</span>
            <span className="dashboard__user-email">{userEmail}</span>
          </div>
        </div>
        <div className="dashboard__header-actions">
          <button className="dashboard__upgrade-btn" onClick={onNavigateToPricing}>
            Upgrade Plan
          </button>
          <button className="dashboard__logout-btn" onClick={onLogout}>
            Sign Out
          </button>
        </div>
      </header>
      
      {/* Main Content */}
      <div className="dashboard__content">
        {/* Total Credits Overview */}
        <section className="dashboard__section">
          <h2 className="dashboard__section-title">Your Credits</h2>
          <div className="dashboard__total-card">
            <div className="dashboard__total-number">{totalRemaining}</div>
            <div className="dashboard__total-label">credits available</div>
            {currentPlan && (
              <div className="dashboard__current-plan">
                Current plan: <strong>{currentPlan.name}</strong>
              </div>
            )}
          </div>
        </section>
        
        {/* Quota Cards */}
        <section className="dashboard__section">
          <h2 className="dashboard__section-title">Usage Details</h2>
          <div className="dashboard__quota-grid">
            <QuotaCard
              title="Free Trial"
              used={quota.freeCreditsUsed}
              total={quota.freeCredits}
              expiresAt={quota.freeTrialClaimedAt ? quota.freeTrialClaimedAt + (5 * 24 * 60 * 60) : null}
              isActive={quota.freeTrialClaimedAt !== null && freeRemaining > 0}
            />
            <QuotaCard
              title={currentPlan?.name || 'Subscription'}
              used={quota.planCreditsUsed}
              total={quota.planCredits}
              expiresAt={quota.planExpiresAt}
              isActive={quota.planType !== 'free' && planRemaining > 0}
            />
            <QuotaCard
              title="Add-on A"
              used={quota.addOnACreditsUsed}
              total={quota.addOnACredits}
              expiresAt={quota.addOnAExpiresAt}
              isActive={addOnARemaining > 0}
            />
            <QuotaCard
              title="Add-on B"
              used={quota.addOnBCreditsUsed}
              total={quota.addOnBCredits}
              expiresAt={quota.addOnBExpiresAt}
              isActive={addOnBRemaining > 0}
            />
          </div>
        </section>
        
        {/* Quick Actions */}
        <section className="dashboard__section">
          <h2 className="dashboard__section-title">Quick Actions</h2>
          <div className="dashboard__actions">
            <button className="dashboard__action-btn" onClick={onNavigateToPricing}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
              Buy More Credits
            </button>
            <button className="dashboard__action-btn" onClick={onNavigateToPricing}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
              View Plans
            </button>
          </div>
        </section>
        
        {/* How Credits Work */}
        <section className="dashboard__section dashboard__info">
          <h2 className="dashboard__section-title">How Credits Work</h2>
          <ul className="dashboard__info-list">
            <li>Credits are consumed when you process an image</li>
            <li>Free trial credits expire 5 days after first login</li>
            <li>Subscription credits reset monthly</li>
            <li>Add-on credits are valid for 2 months</li>
            <li>Credits with the shortest validity are used first</li>
          </ul>
        </section>
      </div>
      
      <style>{`
        .dashboard {
          min-height: 100vh;
          background: var(--color-bg);
        }
        
        .dashboard__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 32px;
          background: rgba(255, 255, 255, 0.03);
          border-bottom: 1px solid var(--color-border);
        }
        
        .dashboard__user {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        
        .dashboard__avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          object-fit: cover;
        }
        
        .dashboard__avatar--placeholder {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          font-weight: 600;
          color: white;
        }
        
        .dashboard__user-info {
          display: flex;
          flex-direction: column;
        }
        
        .dashboard__user-name {
          font-size: 16px;
          font-weight: 600;
        }
        
        .dashboard__user-email {
          font-size: 14px;
          color: var(--color-text-secondary);
        }
        
        .dashboard__header-actions {
          display: flex;
          gap: 12px;
        }
        
        .dashboard__upgrade-btn {
          padding: 10px 20px;
          background: var(--color-accent);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }
        
        .dashboard__upgrade-btn:hover {
          background: var(--color-accent-hover);
        }
        
        .dashboard__logout-btn {
          padding: 10px 20px;
          background: transparent;
          color: var(--color-text-secondary);
          border: 1px solid var(--color-border);
          border-radius: 8px;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .dashboard__logout-btn:hover {
          border-color: var(--color-text-secondary);
          color: var(--color-text);
        }
        
        .dashboard__content {
          max-width: 900px;
          margin: 0 auto;
          padding: 48px 24px;
        }
        
        .dashboard__section {
          margin-bottom: 48px;
        }
        
        .dashboard__section-title {
          font-size: 14px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--color-text-secondary);
          margin-bottom: 16px;
        }
        
        .dashboard__total-card {
          background: linear-gradient(135deg, rgba(41, 151, 255, 0.1) 0%, rgba(41, 151, 255, 0.05) 100%);
          border: 1px solid rgba(41, 151, 255, 0.3);
          border-radius: 20px;
          padding: 40px;
          text-align: center;
        }
        
        .dashboard__total-number {
          font-size: 72px;
          font-weight: 700;
          color: var(--color-accent);
          line-height: 1;
          margin-bottom: 8px;
        }
        
        .dashboard__total-label {
          font-size: 18px;
          color: var(--color-text-secondary);
          margin-bottom: 16px;
        }
        
        .dashboard__current-plan {
          font-size: 14px;
          color: var(--color-text);
        }
        
        .dashboard__current-plan strong {
          color: var(--color-accent);
        }
        
        .dashboard__quota-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 16px;
        }
        
        .quota-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--color-border);
          border-radius: 16px;
          padding: 20px;
        }
        
        .quota-card--low {
          border-color: #ff6b6b;
          background: rgba(255, 107, 107, 0.05);
        }
        
        .quota-card__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        
        .quota-card__title {
          font-size: 16px;
          font-weight: 600;
        }
        
        .quota-card__expires {
          font-size: 12px;
          color: var(--color-text-secondary);
        }
        
        .quota-card__progress {
          height: 6px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
          overflow: hidden;
          margin-bottom: 8px;
        }
        
        .quota-card__progress-bar {
          height: 100%;
          background: var(--color-accent);
          border-radius: 3px;
          transition: width 0.3s ease;
        }
        
        .quota-card--low .quota-card__progress-bar {
          background: #ff6b6b;
        }
        
        .quota-card__stats {
          display: flex;
          justify-content: space-between;
          font-size: 14px;
        }
        
        .quota-card__remaining {
          color: var(--color-text);
          font-weight: 500;
        }
        
        .quota-card__total {
          color: var(--color-text-secondary);
        }
        
        .dashboard__actions {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }
        
        .dashboard__action-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 24px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--color-border);
          border-radius: 12px;
          color: var(--color-text);
          font-size: 15px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .dashboard__action-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: var(--color-accent);
        }
        
        .dashboard__action-btn svg {
          width: 20px;
          height: 20px;
          color: var(--color-accent);
        }
        
        .dashboard__info-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        
        .dashboard__info-list li {
          position: relative;
          padding-left: 24px;
          margin-bottom: 12px;
          font-size: 15px;
          color: var(--color-text-secondary);
        }
        
        .dashboard__info-list li::before {
          content: '•';
          position: absolute;
          left: 8px;
          color: var(--color-accent);
        }
        
        @media (max-width: 600px) {
          .dashboard__header {
            flex-direction: column;
            gap: 20px;
            align-items: flex-start;
          }
          
          .dashboard__header-actions {
            width: 100%;
          }
          
          .dashboard__upgrade-btn,
          .dashboard__logout-btn {
            flex: 1;
          }
        }
      `}</style>
    </div>
  );
}
