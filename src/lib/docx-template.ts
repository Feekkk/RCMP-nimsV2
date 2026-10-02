import JSZip from 'jszip';
import { downloadBlob } from '@/lib/download-blob';

export const DOCUMENT_PATH = 'word/document.xml';

export function escapeXml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function toRunText(value: string) {
  return escapeXml(value).replace(/\r?\n/g, '</w:t><w:br/><w:t xml:space="preserve">');
}

export async function loadDocxTemplate(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load the template ${url}.`);
  const zip = await JSZip.loadAsync(await response.arrayBuffer());
  const xml = await zip.file(DOCUMENT_PATH)?.async('string');
  if (!xml) throw new Error(`The template ${url} is invalid.`);
  const bodyStart = xml.indexOf('<w:body>') + '<w:body>'.length;
  const sectionStart = xml.lastIndexOf('<w:sectPr');
  return {
    zip,
    body: xml.slice(bodyStart, sectionStart),
    withBody: (body: string) => xml.slice(0, bodyStart) + body + xml.slice(sectionStart),
  };
}

function renumberDrawings(xml: string) {
  let id = 1;
  return xml
    .replace(/(<wp:docPr\b[^>]*?\bid=")\d+"/g, (_, prefix: string) => `${prefix}${id++}"`)
    .replace(/ w14:paraId="[^"]*"/g, '');
}

export async function renderDocxBlob(zip: JSZip, documentXml: string): Promise<Blob> {
  zip.file(DOCUMENT_PATH, renumberDrawings(documentXml));
  return zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

export async function downloadDocx(zip: JSZip, documentXml: string, fileName: string) {
  downloadBlob(await renderDocxBlob(zip, documentXml), fileName);
}
