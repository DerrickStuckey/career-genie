'use client';

import { useRouter } from 'next/navigation';
import { useSession } from '@/context/SessionContext';
import { WizardNav } from '@/components/WizardNav';

export default function WelcomePage() {
  const { dispatch } = useSession();
  const router = useRouter();

  function handleStart() {
    dispatch({ type: 'SET_WIZARD_STEP', step: 'hub' });
    router.push('/hub');
  }

  return (
    <main className="min-h-screen flex flex-col">
      <WizardNav />
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md space-y-6 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Career Genie</h1>
          <p className="text-gray-600">
            Discover what matters most in your career through guided reflection
            and personalized coaching.
          </p>
          <div className="space-y-3">
            <p className="text-sm text-gray-500">
              You&apos;ll answer 5 reflection questions and rank your career
              priorities. Then start an open-ended conversation in this app
              or in your AI Chat app of choice.
            </p>
            <button
              onClick={handleStart}
              className="w-full rounded-xl bg-blue-600 py-3 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              Get Started
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
