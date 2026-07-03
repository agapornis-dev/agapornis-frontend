import React, { useState } from 'react';
import { ProfilePage } from '../profile/ProfilePage';
import { requestJson } from '../../lib/http';
import { Session } from '../../lib/types';

export function ProfileScreen({ apiBase, showToast, session, setSession }: { apiBase: string, showToast: any, session: Session, setSession: any }) {
  const [busy, setBusy] = useState(false);

  const saveProfile = async (data: { name: string; email: string }) => {
    setBusy(true);
    try {
      const user = await requestJson(apiBase, '/auth/me', {}, { method: 'PATCH', body: JSON.stringify(data) });
      setSession({ user });
      showToast('Profile updated', 'success');
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally { setBusy(false); }
  };

  const changePassword = async (data: { currentPassword: string; newPassword: string }) => {
    setBusy(true);
    try {
      await requestJson(apiBase, '/auth/password', {}, { method: 'PATCH', body: JSON.stringify(data) });
      showToast('Password changed', 'success');
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally { setBusy(false); }
  };

  return (
    <ProfilePage
      user={session.user}
      busy={busy}
      apiBase={apiBase}
      authHeaders={{}}
      onSaveProfile={saveProfile}
      onChangePassword={changePassword}
      onTwoFactorChanged={user => setSession({ user })}
      showToast={showToast}
    />
  );
}
