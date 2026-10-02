import type { DisposalReport, DisposalReportAsset } from '@shared/lib/disposal-schema';
import { DISPOSAL_PHOTO_MAX_BYTES, DISPOSAL_PHOTO_TYPES, disposalDownloadStem, disposalPhotoPath } from '@shared/lib/disposal-photo';
import { escapeXml, loadDocxTemplate, renderDocxBlob, toRunText } from '@/lib/docx-template';

const RELS_PATH = 'word/_rels/document.xml.rels';
const IMAGE_RELATIONSHIP = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image';
const EMU_PER_INCH = 914400;
const PHOTO_BOX = { width: 2.9 * EMU_PER_INCH, height: 2.2 * EMU_PER_INCH };
const PHOTO_BORDER = 15875;

type Photo = { relId: string; name: string; width: number; height: number };

async function loadPhotoAsJpeg(src: string) {
  const path = disposalPhotoPath(src);
  if (!path) return null;
  const response = await fetch(path, { credentials: 'same-origin', redirect: 'error' });
  if (!response.ok) return null;
  const headerType = response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() ?? '';
  const advertisedLength = Number(response.headers.get('content-length') ?? '');
  if (Number.isFinite(advertisedLength) && advertisedLength > DISPOSAL_PHOTO_MAX_BYTES) return null;
  const blob = await response.blob();
  const type = (blob.type || headerType).split(';')[0]?.trim().toLowerCase() ?? '';
  if (!DISPOSAL_PHOTO_TYPES.has(type) || blob.size > DISPOSAL_PHOTO_MAX_BYTES) return null;
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0);
  bitmap.close();
  const jpeg = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
  return jpeg ? { data: await jpeg.arrayBuffer(), width: canvas.width, height: canvas.height } : null;
}

function fitToBox(width: number, height: number) {
  const scale = Math.min(PHOTO_BOX.width / width, PHOTO_BOX.height / height);
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

function inlinePhoto({ relId, name, width, height }: Photo) {
  const b = PHOTO_BORDER;
  return `<w:r><w:drawing><wp:inline distB="0" distT="0" distL="0" distR="0"><wp:extent cx="${width}" cy="${height}"/><wp:effectExtent b="${b}" l="${b}" r="${b}" t="${b}"/><wp:docPr id="0" name="${name}"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="0" name="${name}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${relId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${width}" cy="${height}"/></a:xfrm><a:prstGeom prst="rect"/><a:ln w="${b}"><a:solidFill><a:srgbClr val="000000"/></a:solidFill><a:prstDash val="solid"/></a:ln></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
}

function photoParagraph(photos: Photo[]) {
  const runs = photos.length
    ? photos.map(inlinePhoto).join('<w:r><w:t xml:space="preserve">    </w:t></w:r>')
    : '<w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:i/><w:sz w:val="20"/></w:rPr><w:t>Tiada gambar</w:t></w:r>';
  return `<w:p><w:pPr><w:spacing w:before="200" w:after="400"/><w:jc w:val="center"/></w:pPr>${runs}</w:p>`;
}

function fillAssetBlock(block: string, asset: DisposalReportAsset, report: DisposalReport) {
  const values: Record<string, string> = {
    rujukan: report.noRujukanPelupusan,
    pusat: report.pusat,
    nama: asset.nama,
    noHarta: String(asset.assetId),
    jenama: asset.brand ?? '',
    siri: asset.serialNum ?? '',
  };
  return block
    .replace(/\{\{(\w+)\}\}/g, (_, key: string) => toRunText(values[key] ?? ''))
    .replaceAll('<w:pPr>', '<w:pPr><w:keepNext/>');
}

export async function buildDisposalLampiran2(
  report: DisposalReport,
): Promise<{ blob: Blob; fileName: string } | null> {
  if (report.lampiran2.length === 0) return null;

  const { zip, body, withBody } = await loadDocxTemplate('/templates/lampiran2.docx');
  const blockStart = body.lastIndexOf('<w:p ', body.indexOf('NO RUJUKAN PELUPUSAN'));
  const header = body.slice(0, blockStart);
  const block = body.slice(blockStart);

  const relationships: string[] = [];
  const sections = await Promise.all(
    report.lampiran2.map(async (asset, assetIndex) => {
      const sources = [asset.imageWholeAsset, asset.imageSerialNumber].filter((src): src is string => Boolean(src));
      const loaded = await Promise.all(sources.map((src) => loadPhotoAsJpeg(src).catch(() => null)));
      const photos = loaded.flatMap((photo, photoIndex) => {
        if (!photo) return [];
        const name = `photo-${assetIndex + 1}-${photoIndex + 1}.jpg`;
        const relId = `rIdPhoto${assetIndex + 1}x${photoIndex + 1}`;
        zip.file(`word/media/${name}`, photo.data);
        relationships.push(`<Relationship Id="${relId}" Type="${IMAGE_RELATIONSHIP}" Target="media/${escapeXml(name)}"/>`);
        return [{ relId, name, ...fitToBox(photo.width, photo.height) }];
      });
      return fillAssetBlock(block, asset, report) + photoParagraph(photos);
    }),
  );

  const rels = await zip.file(RELS_PATH)?.async('string');
  if (!rels) throw new Error('The Lampiran 2 template is invalid.');
  zip.file(RELS_PATH, rels.replace('</Relationships>', `${relationships.join('')}</Relationships>`));

  return {
    blob: await renderDocxBlob(zip, withBody(header + sections.join(''))),
    fileName: `LAMPIRAN 2 - ${disposalDownloadStem(report.noRujukanPelupusan)}.docx`,
  };
}
