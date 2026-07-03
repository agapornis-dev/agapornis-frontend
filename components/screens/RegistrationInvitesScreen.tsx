import { RegistrationInvites } from '../admin/RegistrationInvites';

export function RegistrationInvitesScreen({
  apiBase,
  showToast
}: {
  apiBase: string;
  showToast: (message: string, type: 'success' | 'error') => void;
}) {
  return <RegistrationInvites apiBase={apiBase} showToast={showToast} />;
}