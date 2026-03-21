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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-800 dark:text-white">
          图片背景移除工具
        </h1>

        {/* 上传区域 */}
        <div className="mb-8">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragActive
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'
            }`}
          >
            <input {...getInputProps()} />
            <p className="text-gray-600 dark:text-gray-300">
              {isDragActive
                ? '拖拽图片到此处...'
                : '点击或拖拽图片到此处上传'}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              支持 JPG、PNG、WebP 格式，大小不超过 5MB
            </p>
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-md">
            {error}
          </div>
        )}

        {/* 图片预览和处理 */}
        {uploadedImage && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-200">
              上传的图片
            </h2>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
              <img
                src={uploadedImage}
                alt="上传的图片"
                className="max-w-full max-h-96 object-contain mx-auto"
              />
            </div>
            <div className="mt-4 flex justify-center">
              <button
                onClick={handleProcess}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    处理中...
                  </>
                ) : (
                  '移除背景'
                )}
              </button>
            </div>
          </div>
        )}

        {/* 处理结果 */}
        {processedImage && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-200">
              处理结果
            </h2>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
              <img
                src={processedImage}
                alt="处理后的图片"
                className="max-w-full max-h-96 object-contain mx-auto"
              />
            </div>
            <div className="mt-4 flex justify-center">
              <button
                onClick={handleDownload}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
              >
                下载图片
              </button>
            </div>
          </div>
        )}

        {/* 对比预览 */}
        {uploadedImage && processedImage && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-200">
              前后对比
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  原图
                </h3>
                <img
                  src={uploadedImage}
                  alt="原图"
                  className="max-w-full max-h-64 object-contain mx-auto"
                />
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  处理后
                </h3>
                <img
                  src={processedImage}
                  alt="处理后"
                  className="max-w-full max-h-64 object-contain mx-auto"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;