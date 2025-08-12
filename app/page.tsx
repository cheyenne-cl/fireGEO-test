import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            FireGEO Brand Monitor
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Advanced brand monitoring and competitor analysis powered by AI. 
            Analyze your brand's position in the market and identify key competitors.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link 
              href="/brand-monitor"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors"
            >
              Try Brand Monitor
            </Link>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 mt-16">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold mb-3">AI-Powered Analysis</h3>
              <p className="text-gray-600">
                Advanced AI algorithms analyze your competitors and market position with precision.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold mb-3">Real-time Monitoring</h3>
              <p className="text-gray-600">
                Track your brand's performance and competitor movements in real-time.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold mb-3">Comprehensive Reports</h3>
              <p className="text-gray-600">
                Get detailed insights and actionable recommendations for your brand strategy.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}