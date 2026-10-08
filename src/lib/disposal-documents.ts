import JSZip from 'jszip';
import type { DisposalReport } from '@shared/lib/disposal-schema';
import { disposalDownloadStem } from '@shared/lib/disposal-photo';
import { downloadBlob } from '@/lib/download-blob';
import { buildDisposalLampiran1 } from '@/lib/disposal-lampiran1-workbook';
import { buildDisposalLampiran2 } from '@/lib/disposal-lampiran2-document';
import { buildDisposalTpa10 } from '@/lib/disposal-tpa10-document';

type DisposalFile = { blob: Blob; fileName: string };

function saveDisposalFile(file: DisposalFile | null) {
  if (!file) return;
  downloadBlob(file.blob, file.fileName);
}

export async function downloadDisposalLampiran1(report: DisposalReport) {
  saveDisposalFile(await buildDisposalLampiran1(report));
}

export async function downloadDisposalLampiran2(report: DisposalReport) {
  saveDisposalFile(await buildDisposalLampiran2(report));
}

export async function downloadDisposalTpa10(report: DisposalReport) {
  saveDisposalFile(await buildDisposalTpa10(report));
}

export async function downloadDisposalBundle(report: DisposalReport) {
  const [lampiran1, lampiran2, tpa10] = await Promise.all([
    buildDisposalLampiran1(report),
    buildDisposalLampiran2(report),
    buildDisposalTpa10(report),
  ]);
  const files = [lampiran1, lampiran2, tpa10].filter((file): file is DisposalFile => file != null);
  if (files.length === 0) throw new Error('There are no disposal forms to download.');
  const zip = new JSZip();
  for (const file of files) zip.file(file.fileName, file.blob);
  downloadBlob(
    await zip.generateAsync({ type: 'blob' }),
    `Disposal forms - ${disposalDownloadStem(report.noRujukanPelupusan)}.zip`,
  );
}
