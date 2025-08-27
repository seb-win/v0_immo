import type { RepoError } from '@/lib/repositories/contracts';

export function humanizeRepoError(err: RepoError): string {
  switch (err.code) {
    case 'not_authorized': return 'Du hast keine Berechtigung für diese Aktion.';
    case 'not_found': return 'Eintrag wurde nicht gefunden.';
    case 'conflict': return 'Konflikt: Der Eintrag existiert bereits.';
    case 'validation_failed': return 'Bitte Eingaben prüfen.';
    case 'storage_failed': return 'Upload fehlgeschlagen.';
    case 'network': return 'Netzwerkproblem. Bitte erneut versuchen.';
    default: return err.message ?? 'Unbekannter Fehler.';
  }
}
