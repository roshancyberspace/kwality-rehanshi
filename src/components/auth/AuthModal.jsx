import { useState } from 'react'
import ForgotPasswordForm from './ForgotPasswordForm'
import LoginForm from './LoginForm'
import SignupForm from './SignupForm'

function AuthModal({ defaultMode = 'login', onClose, onLogin, onOpenBecomeProvider }) {
  const [mode, setMode] = useState(defaultMode)
  const [isClosing, setIsClosing] = useState(false)
  const isLogin = mode === 'login'
  const isForgotPassword = mode === 'forgot-password'
  const closeSmoothly = () => {
    setIsClosing(true)
    window.setTimeout(onClose, 180)
  }
  const loginSmoothly = async (user) => {
    await onLogin?.(user)
    setIsClosing(true)
    window.setTimeout(onClose, 180)
  }
  const openBecomeProvider = () => {
    setIsClosing(true)
    window.setTimeout(() => {
      if (onOpenBecomeProvider) {
        onOpenBecomeProvider()
        return
      }

      window.history.pushState({}, '', '/become-service-provider')
      window.dispatchEvent(new PopStateEvent('popstate'))
    }, 120)
  }

  return (
    <div className={`fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[#003F86]/60 px-3 py-3 backdrop-blur-sm sm:px-4 sm:py-5 ${isClosing ? 'animate-modal-fade-out' : 'animate-modal-fade'}`}>
      <div className={`relative flex max-h-[calc(100dvh-1.5rem)] w-full max-w-[28rem] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_24px_70px_rgba(0,63,134,0.15)] sm:max-h-[calc(100dvh-2.5rem)] ${isClosing ? 'animate-modal-slide-out' : 'animate-modal-slide'}`}>
        
        <button
          className="absolute right-4 top-4 z-10 grid h-8 w-8 place-items-center rounded-full bg-blue-50 text-blue-900 transition hover:bg-blue-100"
          onClick={closeSmoothly}
          type="button"
          aria-label="Close account popup"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="overflow-y-auto px-6 pb-8 pt-8 sm:px-8">
          <div className="mb-6 flex justify-center">
            <img src="/logo2.png" alt="Rehanshi" className="h-20 w-auto object-contain sm:h-12" />
          </div>

          <div className="mb-4 text-center">
            <h2 className="text-2xl font-black text-[#003F86] tracking-tight">
              {isForgotPassword
                ? 'Reset Password'
                : isLogin
                  ? 'Welcome back'
                  : 'Create an account'}
            </h2>
          </div>

          <div className="mt-2">
            {isForgotPassword ? (
              <ForgotPasswordForm onBackToLogin={() => setMode('login')} />
            ) : isLogin ? (
              <LoginForm
                onCreateAccount={() => setMode('signup')}
                onForgotPassword={() => setMode('forgot-password')}
                onLogin={loginSmoothly}
                onOpenBecomeProvider={openBecomeProvider}
                compact
              />
            ) : (
              <SignupForm onLoginSuccess={loginSmoothly} onShowLogin={() => setMode('login')} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuthModal
