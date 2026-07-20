export declare const CONTRACT_VERSION: '1.0.0';
export declare const CONTRACT_SCHEMA_DIGEST: `sha256:${string}`;
export declare const CONTRACT_IDENTITY: Readonly<{ version: typeof CONTRACT_VERSION; digest: typeof CONTRACT_SCHEMA_DIGEST }>;
export declare const apiContractSchemas: Readonly<Record<string, Record<string, unknown>>>;

export type Identifier = string | number;
export interface CanonicalTask {
  id: Identifier;
  projectId: Identifier;
  title: string;
  objective?: string;
  status: string;
  dependencies: Identifier[];
  rewardPreview?: { amount: number; tokenType: string };
  automation?: Record<string, unknown>;
  allowedActions: Record<string, boolean>;
  [key: string]: unknown;
}
export interface DomainEventEnvelope {
  sequence: number;
  id: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  projectId?: Identifier;
  communityId?: Identifier | null;
  payload: Record<string, unknown>;
  timestamp: string;
}
export interface AcceptanceSettlement {
  settlementId?: string;
  settlementRecordId?: Identifier;
  status: 'pending' | 'queued' | 'running' | 'retry_wait' | 'completed' | 'blocked' | 'failed' | 'cancelled' | string;
  task?: Record<string, unknown>;
  project?: Record<string, unknown>;
  rewards?: Record<string, unknown[]>;
  skillChanges?: Record<string, unknown>[];
  activatedTasks?: Record<string, unknown>[];
  allowedActions?: Record<string, boolean>;
  [key: string]: unknown;
}
