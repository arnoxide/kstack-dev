import Link from "next/link";

/**
 * Public self-registration is not available in KStack.
 *
 * Stores are created by the instance owner using the CLI:
 *   pnpm kstack store:create
 *
 * This prevents KStack from being used as a hosted multi-tenant
 * SaaS platform in violation of the license.
 */
export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md text-center px-4">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 mb-2">KStack</h1>
        <p className="text-gray-500 text-sm mb-8">Self-hosted e-commerce framework</p>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 space-y-4">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>

          <div>
            <h2 className="font-semibold text-gray-900 text-base">Stores are created via CLI</h2>
            <p className="text-sm text-gray-500 mt-1">
              Public sign-up is not enabled. The instance owner creates stores
              using the KStack CLI.
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg border border-gray-200 px-4 py-3 text-left">
            <p className="text-xs text-gray-400 mb-1 font-medium uppercase tracking-wide">Run in your project directory</p>
            <code className="text-xs font-mono text-gray-700">pnpm kstack store:create</code>
          </div>

          <p className="text-xs text-gray-400">
            Already have an account?{" "}
            <Link href="/login" className="text-gray-700 font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>

        <p className="mt-6 text-xs text-gray-400">
          Want a hosted store?{" "}
          <a href="https://kstack.dev" target="_blank" rel="noreferrer" className="hover:text-gray-600 underline">
            kstack.dev
          </a>
        </p>
      </div>
    </div>
  );
}
