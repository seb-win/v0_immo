export type IntakeStatus = 'queued' | 'processing' | 'succeeded' | 'failed';


export interface IntakeRunDto {
id: string; // intake_id (keep stable for UI)
filename: string;
uploadedAt: string; // ISO
status: IntakeStatus;
}
