// components/object/types.ts
export type IntakeRunStatus = 'uploaded' | 'queued' | 'processing' | 'succeeded' | 'failed';
export interface IntakeRun {
id: string;
filename: string;
uploadedAt: string; // ISO or locale string
status: IntakeRunStatus;
durationSec?: number;
errorText?: string;
}


export const statusLabel: Record<IntakeRunStatus, string> = {
uploaded: 'Hochgeladen',
queued: 'Wartet',
processing: 'Verarbeiten…',
succeeded: 'Fertig',
failed: 'Fehlgeschlagen',
};


export const statusClass: Record<IntakeRunStatus, string> = {
uploaded: 'bg-blue-100 text-blue-800',
queued: 'bg-gray-100 text-gray-800',
processing: 'bg-amber-100 text-amber-800',
succeeded: 'bg-green-100 text-green-800',
failed: 'bg-red-100 text-red-800',
};


export function fmtDuration(sec?: number) {
if (!sec && sec !== 0) return '–';
if (sec < 60) return `${sec}s`;
const m = Math.floor(sec / 60);
const s = sec % 60;
return `${m}m ${s}s`;
}
