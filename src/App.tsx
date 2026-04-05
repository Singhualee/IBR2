import { useState, useCallback, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { useAuth, useSignIn, useUser, SignedIn, SignedOut } from '@clerk/clerk-react';
import SSOCallback from './SSOCallback';
import PricingPage from './pages/Pricing';
import Dashboard from './pages/Dashboard';
import type { PlanType, UserQuota } from './types';

const WORKER_API = 'https://image-background-remover-api.scaulsh.workers.dev';

// Initial empty quota state
const emptyQuota: UserQuota = {
  googleId: '',
  email: '',
  freeCredits: 3,
  freeCreditsUsed: 0,
  freeTrialClaimedAt: null,
  planType: 'free',
  planCredits: 0,
  planCreditsUsed: 0,
  planExpiresAt: null,
  addOnACredits: 0,
  addOnACreditsUsed: 0,
  addOnAExpiresAt: null,
  addOnBCredits: 0,
  addOnBCreditsUsed: 0,
  addOnBExpiresAt: null,
  totalAvailableCredits: 0,
  usedCredits: 0,
};

function TopNav({ 
  showQuota = false, 
  quota = emptyQuota,
  onNavigateToDashboard = () => {},
}: { 
  showQuota?: boolean;
  quota?: UserQuota;
  onNavigateToDashboard?: () => void;
}) {
  const freeRemaining = quota.freeCredits - quota.freeCreditsUsed;
  const planRemaining = quota.planCredits - quota.planCreditsUsed;
  const addOnARemaining = quota.addOnACredits - quota.addOnACreditsUsed;
  const addOnBRemaining = quota.addOnBCredits - quota.addOnBCreditsUsed;
  const totalRemaining = freeRemaining + planRemaining + addOnARemaining + addOnBRemaining;
  const isLow = totalRemaining < 5;
  
  return (
    <nav className="top-nav">
      <Link to="/" className="top-nav__logo">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="M21 15l-5-5L5 21" />
        </svg>
        <span>IBR2</span>
      </Link>
      
      {showQuota && (
        <div className="top-nav__quota" onClick={onNavigateToDashboard}>
          <span className={`top-nav__quota-badge ${isLow ? 'top-nav__quota-badge--low' : ''}`}>
            {totalRemaining} credits
          </span>
        </div>
      )}
      
      <div className="top-nav__actions">
        <Link to="/pricing" className="top-nav__link">
          Pricing
        </Link>
        {showQuota && (
          <Link to="/dashboard" className="top-nav__link">
            Dashboard
          </Link>
        )}
      </div>
    </nav>
  );
}

function HomePage() {
  const { user, isLoaded } = useUser();
  const { signIn } = useSignIn();
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [quota, setQuota] = useState<UserQuota>(emptyQuota);

  // Fetch user quota on mount
  useEffect(() => {
    const fetchQuota = async () => {
      if (!user?.emailAddresses?.[0]?.emailAddress) return;
      
      try {
        const response = await fetch(`${WORKER_API}/api/get-user?email=${encodeURIComponent(user.emailAddresses[0].emailAddress)}`);
        const data = await response.json();
        
        if (data.user) {
          setQuota({
            googleId: data.user.google_id,
            email: data.user.email,
            freeCredits: data.user.free_credits || 3,
            freeCreditsUsed: data.user.free_credits_used || 0,
            freeTrialClaimedAt: data.user.free_trial_claimed_at || null,
            planType: data.user.plan_type || 'free',
            planCredits: data.user.plan_credits || 0,
            planCreditsUsed: data.user.plan_credits_used || 0,
            planExpiresAt: data.user.plan_expires_at || null,
            addOnACredits: data.user.addon_a_credits || 0,
            addOnACreditsUsed: data.user.addon_a_credits_used || 0,
            addOnAExpiresAt: data.user.addon_a_expires_at || null,
            addOnBCredits: data.user.addon_b_credits || 0,
            addOnBCreditsUsed: data.user.addon_b_credits_used || 0,
            addOnBExpiresAt: data.user.addon_b_expires_at || null,
            totalAvailableCredits: 0,
            usedCredits: 0,
          });
        }
      } catch (err) {
        console.error('Failed to fetch quota:', err);
      }
    };
    
    fetchQuota();
  }, [user]);

  // Login success - sync user to D1
  useEffect(() => {
    if (!user) return;
    const syncUser = async () => {
      try {
        await fetch(`${WORKER_API}/api/sync-user`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            google_id: user.id,
            email: user.emailAddresses?.[0]?.emailAddress || '',
            name: user.fullName || user.firstName || '',
            picture: user.imageUrl || '',
          }),
        });
      } catch (err) {
        console.error('Failed to sync user to D1:', err);
      }
    };
    syncUser();
  }, [user]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB');
      return;
    }
    setUploadedImage(URL.createObjectURL(file));
    setProcessedImage(null);
    setError(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.webp']
    }
  });

  const handleProcess = async () => {
    if (!uploadedImage) return;

    // Check quota first
    const freeRemaining = quota.freeCredits - quota.freeCreditsUsed;
    const planRemaining = quota.planCredits - quota.planCreditsUsed;
    const addOnARemaining = quota.addOnACredits - quota.addOnACreditsUsed;
    const addOnBRemaining = quota.addOnBCredits - quota.addOnBCreditsUsed;
    const totalRemaining = freeRemaining + planRemaining + addOnARemaining + addOnBRemaining;

    if (totalRemaining <= 0) {
      setShowUpgradeModal(true);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Deduct credit first
      await fetch(`${WORKER_API}/api/deduct-credit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          google_id: user?.id,
          email: user?.emailAddresses?.[0]?.emailAddress,
        }),
      });

      const response = await fetch(uploadedImage);
      const blob = await response.blob();
      const file = new File([blob], 'image.png', { type: 'image/png' });

      const formData = new FormData();
      formData.append('image_file', file);

      const apiResponse = await fetch(WORKER_API, {
        method: 'POST',
        body: formData
      });

      if (!apiResponse.ok) {
        // Refund credit on failure
        await fetch(`${WORKER_API}/api/refund-credit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            google_id: user?.id,
            email: user?.emailAddresses?.[0]?.emailAddress,
          }),
        });
        
        const errorData = await apiResponse.json();
        throw new Error(errorData.error || 'Processing failed');
      }

      const processedBlob = await apiResponse.blob();
      setProcessedImage(URL.createObjectURL(processedBlob));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Processing failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!processedImage) return;
    const link = document.createElement('a');
    link.href = processedImage;
    link.download = 'background-removed.png';
    link.click();
  };

  const handleReset = () => {
    setUploadedImage(null);
    setProcessedImage(null);
    setError(null);
  };

  const handleGoogleSignIn = async () => {
    if (!signIn) {
      setError('Login service unavailable. Please refresh.');
      return;
    }
    try {
      await signIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: '/sso-callback',
        redirectUrlComplete: '/',
      });
    } catch (err) {
      console.error('Sign in failed:', err);
      setError('Login failed. Please try again.');
    }
  };

  if (!isLoaded) {
    return (
      <div className="app">
        <TopNav />
        <main className="container">
          <div className="flex items-center justify-center min-h-[60vh]">
            <p className="text-gray-500">Loading...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <TopNav 
        showQuota={true} 
        quota={quota}
        onNavigateToDashboard={() => window.location.href = '/dashboard'}
      />
      
      <main className="container">
        <SignedOut>
          <header className="header">
            <h1 className="title">Remove Image Background</h1>
            <p className="subtitle">
              One-click background removal powered by AI.<br />
              Fast, precise, and free to try.
            </p>
          </header>
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <p className="text-gray-500 mb-2">Sign in to start</p>
            <button
              onClick={handleGoogleSignIn}
              className="btn btn-primary flex items-center gap-2"
            >
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>
          </div>
        </SignedOut>

        <SignedIn>
          <header className="header">
            <h1 className="title">Remove Image Background</h1>
            <p className="subtitle">
              One-click background removal powered by AI.<br />
              Fast, precise, and free to try.
            </p>
          </header>

          {!uploadedImage ? (
            <section
              {...getRootProps()}
              className={`dropzone ${isDragActive ? 'dropzone-active' : ''}`}
            >
              <input {...getInputProps()} />
              <div className="dropzone-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="dropzone-text">
                {isDragActive ? 'Drop image here' : 'Click or drag to upload'}
              </p>
              <p className="dropzone-hint">JPG, PNG, WebP up to 5MB</p>
            </section>
          ) : (
            <section className="workspace">
              {error && (
                <div className="error-message">
                  <p>{error}</p>
                </div>
              )}

              <div className="images-grid">
                <div className="image-card">
                  <div className="image-wrapper checkerboard">
                    <img src={uploadedImage} alt="Original" />
                  </div>
                  <p className="image-label">Original</p>
                </div>

                <div className="image-card">
                  {processedImage ? (
                    <>
                      <div className="image-wrapper checkerboard">
                        <img src={processedImage} alt="Processed" />
                      </div>
                      <p className="image-label">Background Removed</p>
                    </>
                  ) : (
                    <div className="image-placeholder">
                      {loading ? (
                        <div className="loading-spinner">
                          <svg viewBox="0 0 24 24" className="spinner-icon">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" strokeDasharray="60" strokeLinecap="round" />
                          </svg>
                          <p>Processing...</p>
                        </div>
                      ) : (
                        <p>Waiting</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="actions">
                {!processedImage ? (
                  <>
                    <button
                      onClick={handleProcess}
                      disabled={loading}
                      className="btn btn-primary"
                    >
                      {loading ? 'Processing...' : 'Remove Background'}
                    </button>
                    <button
                      onClick={handleReset}
                      disabled={loading}
                      className="btn btn-secondary"
                    >
                      Upload New
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={handleDownload} className="btn btn-primary">
                      Download Image
                    </button>
                    <button onClick={handleReset} className="btn btn-secondary">
                      Process New
                    </button>
                  </>
                )}
              </div>
            </section>
          )}
        </SignedIn>
      </main>

      <footer className="footer">
        <p>AI Background Removal</p>
      </footer>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="modal-overlay" onClick={() => setShowUpgradeModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal__title">Credits Exhausted</h3>
            <p className="modal__text">
              You have no credits remaining. Please upgrade your plan to continue.
            </p>
            <div className="modal__actions">
              <button className="modal__btn modal__btn--cancel" onClick={() => setShowUpgradeModal(false)}>
                Cancel
              </button>
              <button className="modal__btn modal__btn--confirm" onClick={() => window.location.href = '/pricing'}>
                View Plans
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DashboardPage() {
  const { user, isLoaded } = useUser();
  const { signOut } = useAuth();
  const [quota, setQuota] = useState<UserQuota>(emptyQuota);

  useEffect(() => {
    const fetchQuota = async () => {
      if (!user?.emailAddresses?.[0]?.emailAddress) return;
      
      try {
        const response = await fetch(`${WORKER_API}/api/get-user?email=${encodeURIComponent(user.emailAddresses[0].emailAddress)}`);
        const data = await response.json();
        
        if (data.user) {
          setQuota({
            googleId: data.user.google_id,
            email: data.user.email,
            freeCredits: data.user.free_credits || 3,
            freeCreditsUsed: data.user.free_credits_used || 0,
            freeTrialClaimedAt: data.user.free_trial_claimed_at || null,
            planType: data.user.plan_type || 'free',
            planCredits: data.user.plan_credits || 0,
            planCreditsUsed: data.user.plan_credits_used || 0,
            planExpiresAt: data.user.plan_expires_at || null,
            addOnACredits: data.user.addon_a_credits || 0,
            addOnACreditsUsed: data.user.addon_a_credits_used || 0,
            addOnAExpiresAt: data.user.addon_a_expires_at || null,
            addOnBCredits: data.user.addon_b_credits || 0,
            addOnBCreditsUsed: data.user.addon_b_credits_used || 0,
            addOnBExpiresAt: data.user.addon_b_expires_at || null,
            totalAvailableCredits: 0,
            usedCredits: 0,
          });
        }
      } catch (err) {
        console.error('Failed to fetch quota:', err);
      }
    };
    
    fetchQuota();
  }, [user]);

  if (!isLoaded) {
    return <div className="app"><main className="container"><p>Loading...</p></main></div>;
  }

  return (
    <Dashboard
      userEmail={user?.emailAddresses?.[0]?.emailAddress || ''}
      userName={user?.fullName || user?.firstName || ''}
      userPicture={user?.imageUrl}
      quota={quota}
      onNavigateToPricing={() => window.location.href = '/pricing'}
      onLogout={() => signOut()}
    />
  );
}

function PricingPageWrapper() {
  const { user, isLoaded } = useUser();
  const [quota, setQuota] = useState<UserQuota>(emptyQuota);
  const [loading] = useState(false);
  const [paypalLoading, setPaypalLoading] = useState(false);

  // Plan credits mapping
  const PLAN_CREDITS: Record<PlanType, number> = {
    'starter': 10,
    'basic': 30,
    'pro': 100,
    'add-on-a': 70,
    'add-on-b': 110,
    'free': 3,
  };

  useEffect(() => {
    const fetchQuota = async () => {
      if (!user?.emailAddresses?.[0]?.emailAddress) return;
      
      try {
        const response = await fetch(`${WORKER_API}/api/get-user?email=${encodeURIComponent(user.emailAddresses[0].emailAddress)}`);
        const data = await response.json();
        
        if (data.user) {
          setQuota({
            googleId: data.user.google_id,
            email: data.user.email,
            freeCredits: data.user.free_credits || 3,
            freeCreditsUsed: data.user.free_credits_used || 0,
            freeTrialClaimedAt: data.user.free_trial_claimed_at || null,
            planType: data.user.plan_type || 'free',
            planCredits: data.user.plan_credits || 0,
            planCreditsUsed: data.user.plan_credits_used || 0,
            planExpiresAt: data.user.plan_expires_at || null,
            addOnACredits: data.user.addon_a_credits || 0,
            addOnACreditsUsed: data.user.addon_a_credits_used || 0,
            addOnAExpiresAt: data.user.addon_a_expires_at || null,
            addOnBCredits: data.user.addon_b_credits || 0,
            addOnBCreditsUsed: data.user.addon_b_credits_used || 0,
            addOnBExpiresAt: data.user.addon_b_expires_at || null,
            totalAvailableCredits: 0,
            usedCredits: 0,
          });
        }
      } catch (err) {
        console.error('Failed to fetch quota:', err);
      }
    };
    
    fetchQuota();
  }, [user]);

  const handleSubscribe = async (_planId: PlanType) => {
    // PayPal button will be shown, no action needed here
  };

  const handlePayPalSuccess = async (transactionId: string, planId: PlanType) => {
    setPaypalLoading(true);
    
    try {
      // Determine if this is a subscription or one-time payment
      const isSubscription = !['add-on-a', 'add-on-b'].includes(planId);
      const userEmail = user?.emailAddresses?.[0]?.emailAddress;
      
      console.log('PayPal success:', { transactionId, planId, isSubscription, userEmail });
      
      // Call backend to set the plan based on PayPal subscription or add-on purchase
      const response = await fetch(`${WORKER_API}/api/set-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail,
          planId: planId,
          planType: planId,
          planCredits: PLAN_CREDITS[planId],
          subscriptionId: isSubscription ? transactionId : undefined,
          orderId: !isSubscription ? transactionId : undefined,
          isSubscription: isSubscription,
        }),
      });

      const data = await response.json();
      console.log('Set-plan response:', data);
      
      if (data.success) {
        // Refresh quota
        const quotaRes = await fetch(`${WORKER_API}/api/get-user?email=${encodeURIComponent(userEmail || '')}`);
        const quotaData = await quotaRes.json();
        
        if (quotaData.user) {
          setQuota({
            googleId: quotaData.user.google_id,
            email: quotaData.user.email,
            freeCredits: quotaData.user.free_credits || 3,
            freeCreditsUsed: quotaData.user.free_credits_used || 0,
            freeTrialClaimedAt: quotaData.user.free_trial_claimed_at || null,
            planType: quotaData.user.plan_type || 'free',
            planCredits: quotaData.user.plan_credits || 0,
            planCreditsUsed: quotaData.user.plan_credits_used || 0,
            planExpiresAt: quotaData.user.plan_expires_at || null,
            addOnACredits: quotaData.user.addon_a_credits || 0,
            addOnACreditsUsed: quotaData.user.addon_a_credits_used || 0,
            addOnAExpiresAt: quotaData.user.addon_a_expires_at || null,
            addOnBCredits: quotaData.user.addon_b_credits || 0,
            addOnBCreditsUsed: quotaData.user.addon_b_credits_used || 0,
            addOnBExpiresAt: quotaData.user.addon_b_expires_at || null,
            totalAvailableCredits: 0,
            usedCredits: 0,
          });
        }
        
        alert('Subscription successful! Your credits have been updated.');
        window.location.href = '/dashboard';
      } else {
        alert('Subscription recorded but quota update failed. Please contact support.');
      }
    } catch (err) {
      console.error('Failed to set plan:', err);
      alert('Failed to process subscription. Please contact support.');
    } finally {
      setPaypalLoading(false);
    }
  };

  const handlePayPalError = (error: string) => {
    console.error('PayPal error:', error);
    alert(`Payment failed: ${error}`);
  };

  if (!isLoaded) {
    return <div className="app"><main className="container"><p>Loading...</p></main></div>;
  }

  return (
    <div className="app">
      <TopNav 
        showQuota={!!user}
        quota={quota}
        onNavigateToDashboard={() => window.location.href = '/dashboard'}
      />
      <PricingPage 
        currentPlan={quota.planType}
        onSubscribe={handleSubscribe}
        onPayPalSuccess={handlePayPalSuccess}
        onPayPalError={handlePayPalError}
        loading={loading || paypalLoading}
      />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/sso-callback" element={<SSOCallback />} />
        <Route path="/pricing" element={<PricingPageWrapper />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/" element={<HomePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
