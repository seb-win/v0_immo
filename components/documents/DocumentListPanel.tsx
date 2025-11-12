'use client';

import type { PropertyDocumentSummary } from '@/lib/repositories/contracts';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  docs: PropertyDocumentSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onAddClick: () => void;   // öffnet DocumentAddModal
  isAgent: boolean;
  newIds?: string[];
};

export default function DocumentListPanel({
  docs,
  selectedId,
  onSelect,
  collapsed,
  onToggleCollapsed,
  onAddClick,
  isAgent,
  newIds = [],
}: Props) {
  if (collapsed) {
    return (
      <div className="h-full border rounded-lg flex flex-col items-center">
        <button
          className="mt-2 h-8 w-8 inline-flex items-center justify-center rounded hover:bg-gray-50"
          onClick={onToggleCollapsed}
          aria-label="Dokumentenliste einblenden"
          title="Dokumentenliste einblenden"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="h-full border rounded-lg relative flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50">
        <div className="text-base font-semibold">Dokumente</div>
        <button
          className="h-8 w-8 inline-flex items-center justify-center rounded hover:bg-gray-100"
          onClick={onToggleCollapsed}
          aria-label="Dokumentenliste ausblenden"
          title="Leiste einklappen"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      {/* Liste */}
      <ul className="flex-1 overflow-auto">
        {docs.map((d) => {
          const active = selectedId === d.id;
          const isNew = newIds.includes(d.id);
          return (
            <li key={d.id}>
              <button
                onClick={() => onSelect(d.id)}
                className={cn(
                  'w-full text-left px-3 py-2 hover:bg-gray-50',
                  active && 'bg-gray-100'
                )}
              >
                <div className="flex items-center gap-2">
                  <div className="text-sm font-medium truncate">
                    {d.type?.label ?? 'Dokument'}
                  </div>
                  {isAgent && isNew && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">NEU</span>
                  )}
                </div>
                <div className="mt-1">
                  <span className="inline-block text-[11px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">
                    {d.status === 'uploaded' ? 'Hochgeladen' : d.status === 'overdue' ? 'Überfällig' : 'Ausstehend'}
                  </span>
                </div>
              </button>
            </li>
          );
        })}
        {docs.length === 0 && (
          <li className="p-3 text-sm text-gray-500">Noch keine Dokumente angelegt.</li>
        )}
      </ul>

      {/* Button unten rechts: öffnet das Add-Modal */}
      {isAgent && (
        <div className="absolute bottom-3 right-3">
          <button
            onClick={onAddClick}
            className="inline-flex items-center gap-2 rounded-md border bg-white px-3 py-2 shadow-sm hover:bg-gray-50"
            title="Neuen Dokumenttyp anlegen"
          >
            <Plus className="h-4 w-4" />
            Dokument hinzufügen
          </button>
        </div>
      )}
    </div>
  );
}
