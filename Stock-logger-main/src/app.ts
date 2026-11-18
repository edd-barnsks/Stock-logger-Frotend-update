import './style.css';
import { supabase } from './supabase';
import { configureAccess } from './access';

function isInvalidRefreshToken(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const authError = error as { code?: unknown; message?: unknown };
  return authError.code === 'refresh_token_not_found'
    || authError.code === 'refresh_token_already_used'
    || (typeof authError.message === 'string'
      && /invalid refresh token|refresh token not found/i.test(authError.message));
}

// Verify the account before initializing the dashboard or requesting its data.
async function startApp(): Promise<void> {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    // Supabase has revoked this browser's refresh token. A new login is required.
    if (isInvalidRefreshToken(error)) {
      localStorage.removeItem('wh-session');
      window.location.replace('/');
      return;
    }
    throw error;
  }

  if (!data.session) {
    localStorage.removeItem('wh-session');
    window.location.replace('/');
    return;
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('username, role, active')
    .eq('id', data.session.user.id)
    .single();

  if (profileError) throw profileError;

  if (!profile?.active || !['admin', 'employee'].includes(profile.role)) {
    await supabase.auth.signOut({ scope: 'local' });
    localStorage.removeItem('wh-session');
    window.location.replace('/');
    return;
  }

  localStorage.setItem(
    'wh-session',
    JSON.stringify({
      username: profile.username || data.session.user.email,
      role: profile.role,
    }),
  );

  localStorage.removeItem('wh-credentials');
  localStorage.removeItem('wh-users');
  configureAccess(profile.role);
  await import('./main');
}

void startApp().catch((error: unknown) => {
  localStorage.removeItem('wh-session');
  console.error('Dashboard initialization failed:', error);
  const message = document.querySelector('#loadingOverlay .loading-text');
  if (message) {
    message.textContent =
      'Unable to load the dashboard. Please refresh to try again.';
  }
});
