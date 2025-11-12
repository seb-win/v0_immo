'use client';

import type { PropertyDocumentSummary } from '@/lib/repositories/contracts';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';

export default function DocumentListPanel({
  docs,
  selectedId,
  onSelect,
  onAddClick,
  collapsed,
  onToggleCollapsed,
  isAgent,
  newIds = [],
}: {
  docs: PropertyDocumentSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAddClick: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  isAgent: boolean;
  newIds?: string[];
}) {
  function isNew(id: string) {
    return newIds.includes(id);
  }

  if (collapsed) {
    return (
      <div className="border rounded-lg h-full flex flex-col items-center pt-2">
        <button
          className="h-8 w-8 inline-flex items-center justify-center rounded hover:bg-gray-50"
          onClick={onToggleCollapsed}
          aria-label="Dokumentenliste einblenden"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden h-full flex flex-col">
      <div className="flex items-center justify-between p-3 border-b bg-gray-50">
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

      <ul className="flex-1 overflow-auto">
        {docs.map(d => (
          <li key={d.id}>
            <button
              className={`w-full text-left px-3 py-2 hover:bg-gray-50 ${selectedId === d.id ? 'bg-gray-100' : ''}`}
              onClick={() => onSelect(d.id)}
            >
              <div className="flex items-center gap-2">
                <div className="text-sm font-medium truncate">
                  {d.type?.label ?? 'Dokument'}
                </div>
                {isAgent && isNew(d.id) && (
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
        ))}
        {docs.length === 0 && (
          <li className="p-3 text-sm text-gray-500">Noch keine Platzhalter angelegt.</li>
        )}
      </ul>

      {isAgent && (
        <div className="border-t bg-white p-3">
          <div className="w-full flex justify-center">
            <button
              className="inline-flex items-center gap-2 px-3 py-2 border rounded hover:bg-gray-50"
              onClick={onAddClick}
            >
              <Plus className="h-4 w-4" />
              Hinzufügen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
