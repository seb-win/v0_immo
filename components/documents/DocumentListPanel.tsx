'use client';

import type { PropertyDocumentSummary } from '@/lib/repositories/contracts';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';

import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

type Props = {
  docs: PropertyDocumentSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;

  collapsed: boolean;
  onToggleCollapsed: () => void;

  onAddClick: () => void;

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
  // Eingeklappter Zustand
  if (collapsed) {
    return (
      <Card className="h-full flex flex-col items-center justify-start pt-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapsed}
          aria-label="Dokumentenleiste einblenden"
          className="h-8 w-8 mt-2"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </Card>
    );
  }

  // Ausgeklappt
  return (
    <Card className="h-full flex flex-col min-h-[320px]">
      {/* Header */}
      <CardHeader className="flex flex-row items-center justify-between px-4 py-3 pb-2">
        <CardTitle className="text-base md:text-lg font-semibold">Dokumente</CardTitle>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapsed}
          aria-label="Dokumentenleiste ausblenden"
          className="h-8 w-8"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </CardHeader>

      {/* Liste – nimmt restliche Höhe ein, scrollt intern */}
      <CardContent className="flex-1 overflow-hidden px-0 pt-0">
        <ScrollArea className="h-full pr-2 pl-4">
          <ul className="flex flex-col gap-1 pb-2">
            {docs.map((d) => {
              const active = selectedId === d.id;
              const isNew = newIds.includes(d.id);
              const { label, cls } = mapStatus(d.status);

              return (
                <li key={d.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(d.id)}
                    className={cn(
                      'w-full rounded-md px-3 py-2 text-left transition-colors',
                      active
                        ? 'bg-accent text-accent-foreground'
                        : 'hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <span className="block text-sm md:text-base font-medium truncate">
                      {d.type?.label ?? (d as any)['name'] ?? 'Dokument'}
                    </span>

                    <div className="mt-1">
                      <Badge
                        variant="secondary"
                        className={cn(
                          'inline-flex items-center text-[11px] px-2 py-0',
                          cls
                        )}
                        title={label}
                      >
                        {label}
                      </Badge>

                      {isNew && (
                        <Badge
                          variant="outline"
                          className="ml-2 inline-flex items-center text-[10px] px-1.5 py-0.5"
                        >
                          NEU
                        </Badge>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}

            {docs.length === 0 && (
              <li className="px-3 py-2 text-sm text-muted-foreground">
                Noch keine Dokumente angelegt.
              </li>
            )}
          </ul>
        </ScrollArea>
      </CardContent>

      {/* Footer bleibt immer unten in der Card */}
      <CardFooter className="px-4 pb-4 pt-2 border-t">
        <div className="w-full flex justify-center">
          {isAgent ? (
            <Button
              size="sm"
              className="w-full max-w-[180px] bg-[#0A0A0A] hover:bg-[#1A1A1A] text-white"
              onClick={onAddClick}
            >
              + Hinzufügen
            </Button>
          ) : (
            <div className="h-9 w-full max-w-[180px]" />
          )}
        </div>
      </CardFooter>
    </Card>
  );
}

function mapStatus(status?: string) {
  switch (status) {
    case 'uploaded':
      return { label: 'hochgeladen', cls: 'bg-green-100 text-green-700' };
    case 'overdue':
      return { label: 'überfällig', cls: 'bg-red-100 text-red-700' };
    case 'pending':
    default:
      return { label: 'ausstehend', cls: 'bg-amber-100 text-amber-700' };
  }
}
