import React from 'react';

const TestTailwind: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4 flex flex-col items-center justify-center">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mb-6">
          Tailwind CSS 测试
        </h1>
        <div className="space-y-4">
          <div className="bg-blue-100 text-blue-700 p-4 rounded-lg">
            这是一个蓝色背景的测试块
          </div>
          <div className="bg-purple-100 text-purple-700 p-4 rounded-lg">
            这是一个紫色背景的测试块
          </div>
          <button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-all duration-300">
            测试按钮
          </button>
        </div>
      </div>
    </div>
  );
};

export default TestTailwind;