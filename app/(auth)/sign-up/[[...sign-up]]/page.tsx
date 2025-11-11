import Image from 'next/image'
import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 px-4">
      <div className="w-full max-w-md flex items-center justify-center">
        <div className="relative w-full">
          <div className="absolute -inset-2 bg-gradient-to-br from-blue-200/40 via-white/60 to-indigo-200/40 rounded-3xl blur-lg opacity-80"></div>
          <div className="relative bg-white/80 backdrop-blur-xl border border-white/40 rounded-3xl shadow-2xl p-10 flex flex-col items-center">
            <SignUp
              appearance={{
                elements: {
                  card: 'bg-transparent shadow-none border-0',
                  formButtonPrimary: 'w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition-colors',
                  headerTitle: 'hidden',
                  headerSubtitle: 'hidden',
                  socialButtonsBlockButton: 'hidden',
                  main: 'w-full',
                  rootBox: 'w-full',
                },
              }}
              routing="path"
              path="/sign-up"
              afterSignUpUrl="/"
              signInUrl="/sign-in"
            />
          </div>
        </div>
      </div>
    </div>
  )
}