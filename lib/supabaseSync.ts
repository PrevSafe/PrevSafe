import { getSupabaseClient } from '@/lib/supabase';

/**
 * Camada de persistencia do PrevSafe no Supabase.
 *
 * Cada registro do app vira uma linha em `prevsafe_records`:
 *   (organization_id, collection, record_id) -> data jsonb
 *
 * As colecoes singleton (organizacao, configuracao do eSocial) usam o
 * record_id fixo SINGLETON_ID, porque tem exatamente uma linha.
 *
 * Exclusoes sao logicas (`deleted_at`): sem isso, um registro apagado em um
 * dispositivo voltaria a existir no proximo upload feito por outro dispositivo
 * que ainda o tivesse em memoria.
 */

export const SINGLETON_ID = '__singleton__';

/** Colecoes com um unico registro, gravadas sob SINGLETON_ID. */
export const SINGLETON_COLLECTIONS = ['organization', 'esocialConfig'] as const;

/** Toda colecao sincronizada. A ordem nao importa: cada uma vai numa chave propria. */
export const SYNCED_COLLECTIONS = [
  'organization',
  'esocialConfig',
  'profiles',
  'clients',
  'contacts',
  'units',
  'leads',
  'opportunities',
  'proposals',
  'contracts',
  'serviceTemplates',
  'serviceOrders',
  'documents',
  'requests',
  'notifications',
  'notificationTemplates',
  'communications',
  'evaluations',
  'auditLogs',
  'esocialEvents',
  'esocialBatches',
  'transactions',
  'tenants',
  'saasPlans',
  'hierarchySectors',
  'hierarchyJobs',
  'ghes',
  'environmentalRisks',
  'examProtocols',
  'employees',
  'catRecords',
  'workAbsences',
  'epiCatalog',
  'epiDeliveries',
  'workOrdersOS',
  'integrationTrainings',
  'accidentsIncidents',
  'sstSignatures',
  'cipaProcesses',
  'occupationalRisksCatalog',
  'contractedOrganizations',
  'machinesEquipment',
  'chemicalProducts',
] as const;

export type SyncedCollection = (typeof SYNCED_COLLECTIONS)[number];

export type RemoteSnapshot = Partial<Record<SyncedCollection, any>>;

export interface SyncOutcome {
  ok: boolean;
  /** Mensagem pronta para a interface quando `ok` e falso. */
  message?: string;
  /** Quantidade de linhas gravadas/removidas nesta operacao. */
  writes?: number;
}

/** Linhas sao enviadas em lotes para nao estourar o limite de payload do PostgREST. */
const UPSERT_CHUNK = 200;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function isSingleton(collection: string): boolean {
  return (SINGLETON_COLLECTIONS as readonly string[]).includes(collection);
}

function describeError(error: any): string {
  const raw = String(error?.message || error || '');
  if (/Failed to fetch|NetworkError|network/i.test(raw)) {
    return 'Sem conexão com o servidor. As alterações ficam salvas neste dispositivo e sobem quando a conexão voltar.';
  }
  if (/row-level security|permission denied|42501/i.test(raw)) {
    return 'Seu usuário não tem acesso aos dados desta organização. Peça ao administrador para liberar o acesso.';
  }
  if (/JWT|not authenticated|401/i.test(raw)) {
    return 'Sua sessão expirou. Entre novamente para voltar a salvar no servidor.';
  }
  return `Não foi possível salvar no servidor: ${raw || 'erro desconhecido'}`;
}

/**
 * Descobre a qual organizacao o usuario autenticado pertence.
 * Retorna null quando ele nao esta vinculado a nenhuma.
 */
export async function fetchMemberOrganizationId(): Promise<string | null> {
  const vinculo = await fetchMemberVinculo();
  return vinculo?.organizationId || null;
}

/**
 * Vinculo do usuario logado: organizacao e papel, lidos de prevsafe_members.
 *
 * Esta e a unica fonte confiavel do papel. O `user_metadata.role` do Supabase e
 * gravavel pelo proprio usuario (auth.updateUser({ data: { role: 'ADMIN' } })),
 * entao nao serve para autorizar nada - era exatamente por isso que as rotas
 * de administracao podiam ser escaladas. A tabela prevsafe_members so aceita
 * escrita da service role; a RLS deixa o usuario apenas LER a propria linha.
 */
export async function fetchMemberVinculo(): Promise<{ organizationId: string; role: string } | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('prevsafe_members')
    .select('organization_id, role')
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return {
    organizationId: data.organization_id as string,
    role: (data.role as string) || '',
  };
}

/**
 * Le todos os registros vivos da organizacao e remonta o formato que o app
 * mantem em memoria: array por colecao, objeto unico para as singleton.
 *
 * Pagina explicitamente porque o PostgREST limita o numero de linhas por
 * resposta e o inventario de riscos/EPIs cresce rapido.
 */
export async function fetchRemoteSnapshot(organizationId: string): Promise<{
  snapshot: RemoteSnapshot;
  /** Colecoes que ja existem no servidor, mesmo que todas as linhas estejam excluidas. */
  materialized: Set<string>;
  isEmpty: boolean;
  error?: string;
}> {
  const supabase = getSupabaseClient();
  if (!supabase) return { snapshot: {}, materialized: new Set(), isEmpty: true, error: 'Supabase não configurado.' };

  const snapshot: RemoteSnapshot = {};
  // Distingue "colecao nunca sincronizada" de "colecao esvaziada de proposito":
  // as linhas excluidas continuam na tabela, entao a colecao segue materializada.
  const materialized = new Set<string>();
  const PAGE = 1000;
  let from = 0;
  let total = 0;

  try {
    for (;;) {
      const { data, error } = await supabase
        .from('prevsafe_records')
        .select('collection, record_id, data, deleted_at')
        .eq('organization_id', organizationId)
        .order('collection', { ascending: true })
        .order('record_id', { ascending: true })
        .range(from, from + PAGE - 1);

      if (error) throw error;
      if (!data || data.length === 0) break;

      for (const row of data) {
        const collection = row.collection as SyncedCollection;
        materialized.add(collection);
        if (row.deleted_at) continue;
        if (isSingleton(collection)) {
          snapshot[collection] = row.data;
        } else {
          if (!Array.isArray(snapshot[collection])) snapshot[collection] = [];
          (snapshot[collection] as any[]).push(row.data);
        }
      }

      total += data.length;
      if (data.length < PAGE) break;
      from += PAGE;
    }

    return { snapshot, materialized, isEmpty: total === 0 };
  } catch (error: any) {
    return { snapshot: {}, materialized: new Set(), isEmpty: true, error: describeError(error) };
  }
}

/**
 * Grava um conjunto de registros. `rows` traz somente o que mudou desde o
 * ultimo envio; `deletedIds` traz o que sumiu da memoria e precisa ser
 * marcado como excluido no servidor.
 */
export async function pushRecords(
  organizationId: string,
  changes: Array<{ collection: SyncedCollection; rows: any[]; deletedIds: string[] }>
): Promise<SyncOutcome> {
  const supabase = getSupabaseClient();
  if (!supabase) return { ok: false, message: 'Supabase não configurado.' };

  const upserts: Array<{ organization_id: string; collection: string; record_id: string; data: any; deleted_at: null }> = [];
  const deletions: Array<{ collection: string; ids: string[] }> = [];

  for (const change of changes) {
    for (const row of change.rows) {
      const recordId = isSingleton(change.collection) ? SINGLETON_ID : row?.id;
      if (!recordId) continue; // registro sem id nao tem como ser reconciliado depois
      upserts.push({
        organization_id: organizationId,
        collection: change.collection,
        record_id: String(recordId),
        data: row,
        deleted_at: null,
      });
    }
    if (change.deletedIds.length > 0) {
      deletions.push({ collection: change.collection, ids: change.deletedIds });
    }
  }

  if (upserts.length === 0 && deletions.length === 0) return { ok: true, writes: 0 };

  try {
    for (const batch of chunk(upserts, UPSERT_CHUNK)) {
      const { error } = await supabase
        .from('prevsafe_records')
        .upsert(batch, { onConflict: 'organization_id,collection,record_id' });
      if (error) throw error;
    }

    for (const deletion of deletions) {
      for (const ids of chunk(deletion.ids, UPSERT_CHUNK)) {
        const { error } = await supabase
          .from('prevsafe_records')
          .update({ deleted_at: new Date().toISOString() })
          .eq('organization_id', organizationId)
          .eq('collection', deletion.collection)
          .in('record_id', ids);
        if (error) throw error;
      }
    }

    return { ok: true, writes: upserts.length + deletions.reduce((acc, d) => acc + d.ids.length, 0) };
  } catch (error: any) {
    return { ok: false, message: describeError(error) };
  }
}

/**
 * Apaga de vez todos os registros da organizacao. Usado apenas pelo
 * "restaurar base" das Configuracoes, que ja pede confirmacao ao usuario.
 */
export async function purgeOrganizationRecords(organizationId: string): Promise<SyncOutcome> {
  const supabase = getSupabaseClient();
  if (!supabase) return { ok: false, message: 'Supabase não configurado.' };

  const { error } = await supabase
    .from('prevsafe_records')
    .delete()
    .eq('organization_id', organizationId);

  if (error) return { ok: false, message: describeError(error) };
  return { ok: true };
}

/** Bucket privado das evidencias fotograficas de campo. */
export const EVIDENCE_BUCKET = 'prevsafe-evidencias';

export interface UploadedEvidence {
  /** Caminho dentro do bucket. E isto que fica gravado no registro. */
  path: string;
  /** URL assinada, temporaria, so para exibir agora. */
  signedUrl: string;
}

/**
 * Envia uma foto de evidencia. O caminho comeca pelo organization_id porque
 * e a primeira pasta que a RLS do Storage usa para amarrar o objeto a
 * organizacao.
 */
export async function uploadEvidencePhoto(
  organizationId: string,
  scope: string,
  file: File | Blob,
  fileName?: string
): Promise<{ ok: boolean; evidence?: UploadedEvidence; message?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { ok: false, message: 'Supabase não configurado.' };

  const safeScope = (scope || 'sem-os').replace(/[^a-zA-Z0-9_-]/g, '-');
  const ext = (fileName || (file as File).name || 'foto.jpg').split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${organizationId}/${safeScope}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage
    .from(EVIDENCE_BUCKET)
    .upload(path, file, { contentType: (file as File).type || 'image/jpeg', upsert: false });

  if (error) return { ok: false, message: describeError(error) };

  const signed = await createEvidenceSignedUrl(path);
  return { ok: true, evidence: { path, signedUrl: signed || '' } };
}

/**
 * Gera uma URL temporaria para exibir a foto. O bucket e privado, entao o
 * caminho sozinho nao abre nada: a URL precisa ser renovada a cada sessao.
 */
export async function createEvidenceSignedUrl(path: string, expiresInSeconds = 60 * 60): Promise<string | null> {
  const supabase = getSupabaseClient();
  if (!supabase || !path) return null;

  const { data, error } = await supabase.storage
    .from(EVIDENCE_BUCKET)
    .createSignedUrl(path, expiresInSeconds);

  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

/** Remove a foto do bucket. Usado quando o tecnico exclui a evidencia. */
export async function removeEvidencePhoto(path: string): Promise<SyncOutcome> {
  const supabase = getSupabaseClient();
  if (!supabase || !path) return { ok: false, message: 'Supabase não configurado.' };

  const { error } = await supabase.storage.from(EVIDENCE_BUCKET).remove([path]);
  if (error) return { ok: false, message: describeError(error) };
  return { ok: true };
}
