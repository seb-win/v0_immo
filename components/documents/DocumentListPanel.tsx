'use client';

import type { PropertyDocumentSummary } from '@/lib/repositories/contracts';

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
  const isNew = (id: string) => newIds.includes(id);

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b bg-gray-50">
        <div className="font-medium">Dokumente</div>
        <div className="flex items-center gap-2">
          {isAgent && (
            <button className="text-sm px-2 py-1 border rounded hover:bg-gray-100" onClick={onAddClick}>+ Hinzufügen</button>
          )}
          <button className="text-sm px-2 py-1 border rounded hover:bg-gray-100" onClick={onToggleCollapsed}>
            {collapsed ? '▶' : '◀'}
          </button>
        </div>
      </div>
      <ul className="max-h-[70vh] overflow-auto">
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
              <div className="text-xs text-gray-500">Status: {d.status}</div>
            </button>
          </li>
        ))}
        {docs.length === 0 && (
          <li className="p-3 text-sm text-gray-500">Noch keine Platzhalter angelegt.</li>
        )}
      </ul>
    </div>
  );
}
