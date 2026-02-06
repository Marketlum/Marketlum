import { MarketlumLoginForm } from "@/components/login-form"

export default function LoginPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <a href="#" className="flex items-center gap-2 font-medium">
            <div className="flex h-7 w-7 items-center justify-center rounded-md overflow-hidden">
              <img src="/marketlum-logo.png" alt="Marketlum" className="h-7 w-7 object-cover" />
            </div>
            <span className="font-bold bg-gradient-to-r from-green-500 via-cyan-500 to-purple-500 bg-clip-text text-transparent">
              Marketlum
            </span>
          </a>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <MarketlumLoginForm />
          </div>
        </div>
      </div>
      <div className="relative hidden lg:flex items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(74,222,128,0.08)_0%,_rgba(168,85,247,0.06)_50%,_transparent_80%)]" />
        <img
          src="/marketlum-logo.png"
          alt="Marketlum"
          className="relative w-64 h-64 object-contain drop-shadow-2xl"
        />
      </div>
    </div>
  )
}
