import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useAuth, SignIn, SignedIn, SignedOut } from '@clerk/clerk-react';

function App() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { isLoaded } = useAuth();

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

  // Loading state
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
          <div className="flex justify-center py-12">
            <SignIn 
              routing="path" 
              path="/sign-in" 
              signUpUrl="/sign-up" 
              afterSignInUrl="/" 
            />
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

export default App;
