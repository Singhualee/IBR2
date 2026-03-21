import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import './App.css';

function App() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 处理图片上传
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file.size > 5 * 1024 * 1024) {
      setError('图片大小不能超过5MB');
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

  // 处理图片
  const handleProcess = async () => {
    if (!uploadedImage) {
      setError('请先上传图片');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 从上传的图片创建文件对象
      const response = await fetch(uploadedImage);
      const blob = await response.blob();
      const file = new File([blob], 'image.png', { type: 'image/png' });

      const formData = new FormData();
      formData.append('image_file', file);

      // 调用后端 API
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

  // 下载图片
  const handleDownload = () => {
    if (!processedImage) return;
    const link = document.createElement('a');
    link.href = processedImage;
    link.download = 'processed-image.png';
    link.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-900 dark:to-indigo-950 p-4 md:p-8 flex flex-col">
      <div className="max-w-5xl mx-auto w-full flex-grow">
        {/* 头部 */}
        <header className="text-center mb-12 pt-8">
          <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 mb-4">
            图片背景移除工具
          </h1>
          <p className="text-gray-600 dark:text-gray-300 text-lg max-w-2xl mx-auto">
            上传图片，一键移除背景，快速获得透明背景图片
          </p>
        </header>

        {/* 上传区域 */}
        <div className="mb-12">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-2xl p-10 md:p-12 text-center transition-all duration-300 ease-in-out ${isDragActive
              ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10 scale-105 shadow-lg'
              : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md'}`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 mb-4 flex items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <p className="text-lg font-medium text-gray-700 dark:text-gray-200 mb-2">
                {isDragActive
                  ? '拖拽图片到此处...'
                  : '点击或拖拽图片到此处上传'}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                支持 JPG、PNG、WebP 格式，大小不超过 5MB
              </p>
            </div>
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mb-8 p-4 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg shadow-sm animate-fadeIn">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-.77-1.667-2.502-3-1.732L3.732 16c-.77.77-2.502 1.732-1.732 3z" />
              </svg>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* 图片预览和处理 */}
        {uploadedImage && (
          <div className="mb-12 bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 transition-all duration-300 animate-fadeIn">
            <h2 className="text-2xl font-semibold mb-6 text-gray-800 dark:text-gray-200 flex items-center">
              <svg className="w-6 h-6 mr-2 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              上传的图片
            </h2>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 mb-6">
              <img
                src={uploadedImage}
                alt="上传的图片"
                className="max-w-full max-h-96 object-contain mx-auto rounded-lg shadow-sm"
              />
            </div>
            <div className="flex justify-center">
              <button
                onClick={handleProcess}
                disabled={loading}
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg shadow-md transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed flex items-center space-x-2 group"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>处理中...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    <span>移除背景</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* 处理结果 */}
        {processedImage && (
          <div className="mb-12 bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 transition-all duration-300 animate-fadeIn">
            <h2 className="text-2xl font-semibold mb-6 text-gray-800 dark:text-gray-200 flex items-center">
              <svg className="w-6 h-6 mr-2 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              处理结果
            </h2>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 mb-6">
              <img
                src={processedImage}
                alt="处理后的图片"
                className="max-w-full max-h-96 object-contain mx-auto rounded-lg shadow-sm"
              />
            </div>
            <div className="flex justify-center">
              <button
                onClick={handleDownload}
                className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg shadow-md transition-all duration-300 flex items-center space-x-2 group"
              >
                <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>下载图片</span>
              </button>
            </div>
          </div>
        )}

        {/* 对比预览 */}
        {uploadedImage && processedImage && (
          <div className="mb-12 bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 transition-all duration-300 animate-fadeIn">
            <h2 className="text-2xl font-semibold mb-6 text-gray-800 dark:text-gray-200 flex items-center">
              <svg className="w-6 h-6 mr-2 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              前后对比
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 transition-transform hover:scale-105 duration-300">
                <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  原图
                </h3>
                <img
                  src={uploadedImage}
                  alt="原图"
                  className="w-full max-h-72 object-contain mx-auto rounded-lg shadow-sm"
                />
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 transition-transform hover:scale-105 duration-300">
                <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  处理后
                </h3>
                <img
                  src={processedImage}
                  alt="处理后"
                  className="w-full max-h-72 object-contain mx-auto rounded-lg shadow-sm"
                />
              </div>
            </div>
          </div>
        )}

        {/* 页脚 */}
        <footer className="text-center mt-16 pt-8 border-t border-gray-200 dark:border-gray-800">
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            © 2026 图片背景移除工具 | 基于 Remove.bg API 构建
          </p>
        </footer>
      </div>
    </div>
  );
}

export default App;