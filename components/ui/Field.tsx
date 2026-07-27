import React from 'react';
import { label } from '../../lib/constants';

export function Field({ label: labelText, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="grid gap-2">
      <label className={label}>{labelText}</label>
      {children}
    </div>
  );
}
