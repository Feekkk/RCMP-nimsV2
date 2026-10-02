import JSZip from 'jszip';
import type { DisposalReport, DisposalReportAsset } from '@shared/lib/disposal-schema';
import { downloadBlob } from '@/lib/download-blob';

const TEMPLATE_URL = '/templates/tpa10.docx';
const DOCUMENT_PATH = 'word/document.xml';
const TEXT_NODE = /<w:t(?: [^>]*)?>([^<]*)<\/w:t>/g;

function escapeXml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function toRunText(value: string) {
  return escapeXml(value).replace(/\r?\n/g, '</w:t><w:br/><w:t xml:space="preserve">');
}

function createFiller(xml: string) {
  let result = xml;
  let cursor = 0;

  const textNodeAt = (from: number, predicate: (text: string) => boolean) => {
    TEXT_NODE.lastIndex = from;
    for (let match = TEXT_NODE.exec(result); match; match = TEXT_NODE.exec(result)) {
      if (predicate(match[1])) return match;
    }
    throw new Error('The TPA10 template layout has changed.');
  };

  const replaceNode = (match: RegExpExecArray, text: string) => {
    const node = `<w:t xml:space="preserve">${toRunText(text)}</w:t>`;
    result = result.slice(0, match.index) + node + result.slice(match.index + match[0].length);
    cursor = match.index + node.length;
  };

  return {
    replace(text: string, value: string) {
      replaceNode(textNodeAt(cursor, (current) => current === text), value);
    },
    afterLabel(label: string, value: string) {
      const labelNode = textNodeAt(cursor, (current) => current === label);
      const valueNode = textNodeAt(labelNode.index + labelNode[0].length, () => true);
      replaceNode(valueNode, `${valueNode[1].trimEnd()} ${value}`);
    },
    toString: () => result,
  };
}

function fillAssetPage(page: string, asset: DisposalReportAsset, report: DisposalReport) {
  const [condition = '', secondLine = '', thirdLine = ''] = (asset.rekodFizikalHarta ?? '').split(/\r?\n/);
  const repairs = asset.repairs;
  const filler = createFiller(page);

  filler.replace('RUJ: ………………………………………… ', `RUJ: ${report.noRujukanPelupusan}`);
  filler.replace(': JABATAN TEKNOLOGI MAKLUMAT', `: ${report.pusat}`);
  filler.afterLabel('NAMA HARTA', asset.nama);
  filler.afterLabel('NO. HARTA', String(asset.assetId));
  filler.afterLabel('JENAMA', asset.brand ?? '');
  filler.afterLabel('NO. SIRI HARTA', asset.serialNum ?? '');
  filler.replace(
    'Aset ini telah dibeli pada 2020 dan telah digunakan dalam tempoh 6 tahun untuk tujuan kegunaan staf UniKL RCMP',
    asset.latarBelakang ?? '',
  );
  filler.replace('Keadaan fizikal masih dalam keadaan baik', condition);
  filler.replace('       2)', `       2) ${secondLine}`);
  filler.replace('       3) ', `       3) ${thirdLine}`);
  filler.afterLabel('TARIKH', repairs.map((repair) => repair.repairDate ?? '—').join(', '));
  filler.afterLabel('JENIS PEMBAIKAN', repairs.map((repair) => repair.issueSummary ?? '—').join('; '));

  return filler.toString();
}

function withPageBreakBefore(page: string) {
  return page.replace('<w:pPr>', '<w:pPr><w:pageBreakBefore/>');
}

function renumberDrawings(xml: string) {
  let id = 1;
  return xml
    .replace(/(<wp:docPr\b[^>]*?\bid=")\d+"/g, (_, prefix: string) => `${prefix}${id++}"`)
    .replace(/ w14:paraId="[^"]*"/g, '');
}

export async function downloadDisposalTpa10(report: DisposalReport) {
  if (report.borangTp10.length === 0) return;

  const response = await fetch(TEMPLATE_URL);
  if (!response.ok) throw new Error('Could not load the TPA10 template.');
  const zip = await JSZip.loadAsync(await response.arrayBuffer());
  const xml = await zip.file(DOCUMENT_PATH)?.async('string');
  if (!xml) throw new Error('The TPA10 template is invalid.');

  const bodyStart = xml.indexOf('<w:body>') + '<w:body>'.length;
  const sectionStart = xml.lastIndexOf('<w:sectPr');
  const page = xml.slice(bodyStart, sectionStart);

  const pages = report.borangTp10.map((asset, index) => {
    const filled = fillAssetPage(page, asset, report);
    return index === 0 ? filled : withPageBreakBefore(filled);
  });

  zip.file(
    DOCUMENT_PATH,
    renumberDrawings(xml.slice(0, bodyStart) + pages.join('') + xml.slice(sectionStart)),
  );

  downloadBlob(
    await zip.generateAsync({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    }),
    `TPA10 - ${report.noRujukanPelupusan}.docx`,
  );
}
