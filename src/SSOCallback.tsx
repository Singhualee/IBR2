import { useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';

export default function SSOCallback() {
  const { isLoaded, isSignedIn } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoaded) {
      if (isSignedIn) {
        navigate('/');
      } else {
        // 如果没登录，跳回首页重新登录
        navigate('/');
      }
    }
  }, [isLoaded, isSignedIn, navigate]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <p className="text-gray-500">登录中...</p>
    </div>
  );
}
