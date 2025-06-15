import React from 'react';

const Hero: React.FC = () => {
  return (
    <div className="relative overflow-hidden bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="relative z-10 pb-8 bg-white sm:pb-16 md:pb-20">
          <main className="mt-10 mx-auto max-w-7xl px-4 sm:mt-12 sm:px-6 md:mt-16">
            <div className="text-center">
              <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
                <span className="block">TikTok Video</span>{' '}
                <span className="block text-blue-600">AI Categorizer</span>
              </h1>
              <p className="mt-3 text-base text-gray-500 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl">
                Automatically download and organize your TikTok videos using AI-powered categorization
              </p>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Hero;
