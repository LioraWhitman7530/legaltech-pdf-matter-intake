import {z} from 'zod';
import {infraiRequest} from './infrai_client.js';

export const intakeSchema = z.object({matterId:z.string().min(1), clientName:z.string().min(1), signedPdfBase64:z.string().min(1), deadline:z.string().date()});
export type MatterIntake = z.infer<typeof intakeSchema>;
type FillResult = {data_base64?: string; object_key?: string};

export async function processMatter(input: unknown) {
  const matter = intakeSchema.parse(input);
  const bucket = process.env.INFRAI_BUCKET;
  if (!bucket) throw new Error('INFRAI_BUCKET must name an existing bucket');
  const filled = await infraiRequest<FillResult>('/v1/pdf/form/fill','POST',{pdf:matter.signedPdfBase64, fields:{matter_id:matter.matterId, client_name:matter.clientName, deadline:matter.deadline}, flatten:true, store:false});
  const archiveKey = `${matter.matterId}/flattened.pdf`;
  const archived = await infraiRequest<FillResult>(`/v1/storage/object/put/${encodeURIComponent(bucket)}/${encodeURIComponent(archiveKey)}`,'PUT',{data_base64:filled.data_base64 ?? '', content_type:'application/pdf'});
  return {matterId:matter.matterId, status:'archived', archiveKey, deadline:matter.deadline, object:archived};
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const sample = {matterId:process.env.MATTER_ID ?? 'matter-1042', clientName:'Rivera & Co', signedPdfBase64:process.env.SIGNED_PDF_BASE64 ?? 'JVBERi0xLjQ=', deadline:'2026-10-15'};
  processMatter(sample).then(result => console.log(JSON.stringify(result,null,2))).catch(error => { console.error(error); process.exitCode=1; });
}
