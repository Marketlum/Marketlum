import { LoginForm } from '@/components/auth/login-form';
import { LocaleSwitcher } from '@/components/shared/locale-switcher';

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center">
      <div className="absolute right-4 top-4">
        <LocaleSwitcher />
      </div>
      <LoginForm />
    </div>
  );
}
