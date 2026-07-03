import { useEffect, useState } from 'react';
import { useLazyData } from '../../hooks/useLazyData';
import { requestJson } from '../../lib/http';
import { User, UserRole } from '../../lib/types';
import { UserDetails, UsersPanel } from '../admin/UsersPage';
import { useConfirm } from '../feedback/FeedbackProvider';

export function UsersScreen({
  apiBase,
  showToast,
  currentUserId
}: {
  apiBase: string;
  showToast: (message: string, type: 'success' | 'error') => void;
  currentUserId: string;
}) {
  const { data: users, loading, refresh } = useLazyData<User[]>(apiBase, '/auth/users', {}, []);
  const [selected, setSelected] = useState<UserDetails | null>(null);
  const [busy, setBusy] = useState(false);
  const confirm = useConfirm();

  useEffect(() => {
    if (!selected && users?.[0]) void selectUser(users[0].id);
  }, [users]);

  async function selectUser(id: string) {
    try {
      setSelected(await requestJson(apiBase, `/auth/users/${id}`, {}));
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  }

  async function changeRole(id: string, role: UserRole) {
    setBusy(true);

    try {
      await requestJson(apiBase, `/auth/users/${id}/role`, {}, {
        method: 'PATCH',
        body: JSON.stringify({ role })
      });

      await selectUser(id);
      refresh();
      showToast('User role updated', 'success');
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function deleteUser(id: string) {
    const userName = users?.find(user => user.id === id)?.name || selected?.name || 'This user';

    if (
      !(await confirm({
        title: 'Delete this user?',
        description: `${userName} will permanently lose access to the panel. This cannot be undone.`,
        confirmLabel: 'Delete user',
        tone: 'danger'
      }))
    ) {
      return;
    }

    setBusy(true);

    try {
      await requestJson(apiBase, `/auth/users/${id}`, {}, { method: 'DELETE' });
      setSelected(null);
      refresh();
      showToast('User deleted', 'success');
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  if (loading && !users?.length) {
    return <div className="text-sm text-[var(--muted-foreground)]">Loading users...</div>;
  }

  return (
    <UsersPanel
      users={users || []}
      selected={selected}
      currentUserId={currentUserId}
      busy={busy}
      onSelect={id => void selectUser(id)}
      onRoleChange={changeRole}
      onDelete={deleteUser}
    />
  );
}