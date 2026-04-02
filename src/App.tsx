import { useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { useAuth, useSignIn, useUser, SignedIn, SignedOut } from '@clerk/clerk-react';
import SSOCallback from './SSOCallback';

function HomePage() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { isLoaded, signOut } = useAuth();
  const { signIn } = useSignIn();
  const { user } = useUser();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file.size > 5 * 1024 * 1024) {
      setError('图片大小不能超过 5MB');
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

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(uploadedImage);
      const blob = await response.blob();
      const file = new File([blob], 'image.png', { type: 'image/png' });

      const formData = new FormData();
      formData.append('image_file', file);

      const apiResponse = await fetch('https://image-background-remover-api.scaulsh.workers.dev', {
        method: 'POST',
        body: formData
      });

      if (!apiResponse.ok) {
        const errorData = await apiResponse.json();
        throw new Error(errorData.error || '处理失败');
      }

      const processedBlob = await apiResponse.blob();
      setProcessedImage(URL.createObjectURL(processedBlob));
    } catch (err) {
      setError(err instanceof Error ? err.message : '处理失败');
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
      setError('登录服务暂不可用，请刷新页面');
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
      setError('登录失败，请重试');
    }
  };

  if (!isLoaded) {
    return (
      <div className="app">
        <main className="container">
          <div className="flex items-center justify-center min-h-[60vh]">
            <p className="text-gray-500">加载中...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <main className="container">
        <SignedOut>
          <header className="header">
            <h1 className="title">背景移除</h1>
            <p className="subtitle">
              一键移除背景，让图片更纯粹。<br />
              AI 驱动，秒级处理，精准保留每一个细节。
            </p>
          </header>
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <p className="text-gray-500 mb-2">登录后即可使用</p>
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
              使用 Google 登录
            </button>
          </div>
        </SignedOut>

        <SignedIn>
          <header className="header">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="title">背景移除</h1>
                <p className="subtitle">
                  一键移除背景，让图片更纯粹。<br />
                  AI 驱动，秒级处理，精准保留每一个细节。
                </p>
              </div>
              <div className="flex items-center gap-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full px-4 py-2">
                {user?.imageUrl ? (
                  <img
                    src={user.imageUrl}
                    alt="avatar"
                    className="w-7 h-7 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-xs font-medium text-white">
                    {user?.firstName?.[0]?.toUpperCase() || user?.emailAddresses?.[0]?.emailAddress?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
                <span className="text-sm text-white/80 max-w-[180px] truncate">
                  {user?.emailAddresses?.[0]?.emailAddress || user?.fullName || '已登录'}
                </span>
                <button
                  onClick={() => signOut({})}
                  className="text-xs text-white/40 hover:text-white/70 transition-colors"
                >
                  退出
                </button>
              </div>
            </div>
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
                {isDragActive ? '松开以上传' : '点击上传或拖放图片'}
              </p>
              <p className="dropzone-hint">支持 JPG、PNG、WebP，最大 5MB</p>
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
                    <img src={uploadedImage} alt="原图" />
                  </div>
                  <p className="image-label">原图</p>
                </div>

                <div className="image-card">
                  {processedImage ? (
                    <>
                      <div className="image-wrapper checkerboard">
                        <img src={processedImage} alt="处理后" />
                      </div>
                      <p className="image-label">已移除背景</p>
                    </>
                  ) : (
                    <div className="image-placeholder">
                      {loading ? (
                        <div className="loading-spinner">
                          <svg viewBox="0 0 24 24" className="spinner-icon">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" strokeDasharray="60" strokeLinecap="round" />
                          </svg>
                          <p>处理中...</p>
                        </div>
                      ) : (
                        <p>等待处理</p>
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
                      {loading ? '处理中...' : '移除背景'}
                    </button>
                    <button
                      onClick={handleReset}
                      disabled={loading}
                      className="btn btn-secondary"
                    >
                      重新上传
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={handleDownload} className="btn btn-primary">
                      下载图片
                    </button>
                    <button onClick={handleReset} className="btn btn-secondary">
                      处理新图片
                    </button>
                  </>
                )}
              </div>
            </section>
          )}
        </SignedIn>
      </main>

      <footer className="footer">
        <p>AI 智能背景移除</p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/sso-callback" element={<SSOCallback />} />
        <Route path="/" element={<HomePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
