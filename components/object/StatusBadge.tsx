// components/object/StatusBadge.tsx
import React from 'react';
import { IntakeRunStatus, statusClass, statusLabel } from './types';

export function StatusBadge({ status }: { status: IntakeRunStatus }) {
  return (
    <span className={`px-2 py-0.5 text-xs rounded-md inline-flex items-center ${statusClass[status]}`}>
      {statusLabel[status]}
    </span>
  );
}
