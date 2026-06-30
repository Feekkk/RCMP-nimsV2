import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Template } from '@pdfme/common';
import { generate } from '@pdfme/generator';
import { image, text } from '@pdfme/schemas';
import type { HandoverPdfData } from '@/lib/handover-pdf-types';

const UNIKL_HEADER = 'UNIVERSITY KUALA LUMPUR ROYAL COLLEGE OF MEDICINE PERAK';

/** Inline-markdown bold for schema.content (readOnly fields use content, not inputs). */
function boldContent(text: string): string {
  return `**${text}**`;
}

const COMPUTER_GENERATED_FOOTER = 'This is computer generated no need any signature';

/** A4 with padding — one schema[] per page; one inputs[] entry for the whole document. */
const BASE_PDF = { width: 210, height: 297, padding: [12, 12, 12, 12] as [number, number, number, number] };

const FOOTER_Y = 248;
const PAGE_FOOTER_Y = 286;

const COMPLIANCE_INTRO =
  'UNIVERSITI KUALA LUMPUR ROYAL COLLEGE OF MEDICINE PERAK (UNIKL RCMP) software policy regarding the use of computer software.';

const COMPLIANCE_POINTS = `1. UNIKL RCMP licenses the use of computer software from a variety of outside companies. UNIKL RCMP does not own this software or its related documentation, and unless authorized by the software developers, does not have the right to reproduce it, even for back-up purposes, unless explicitly allowed by the software owner. (eg: Microsoft, Adobe and etc).

2. UNIKL RCMP employees shall use the software only in accordance with the license agreements and will not install unauthorized copies of the commercial software.

3. UNIKL RCMP employees shall not download or upload unauthorized software over the Internet.

4. UNIKL RCMP employees learning of any misuse of software or company IT equipment (which includes vandalism of the certificate of authenticity sticker on the PC casing chassis, PC monitors, CD media etc) which could be detrimental to the business of the company shall notify their immediate supervisor.

5. Under the Copyright Act 1987, offenders can be fined from RM2,000 to RM20,000 for each infringing copy and/or face imprisonment of up to 5 years. UNIKL RCMP does not condone the illegal duplication of software. UNIKL RCMP employees who make, acquire, or use unauthorized copies of computer software shall be disciplined as appropriate under the circumstances. Such discipline action may include termination.

6. Any doubts concerning whether any employee may copy/duplicate or use a given software program should be raised with the immediate supervisor before proceeding.`;

const COMPLIANCE_AGREE =
  'I am fully aware of the software use policies of UNIKL RCMP and agree to uphold those policies';

const REQUIREMENTS_TEXT = `Please comply with the following company's requirements: -

i. To comply with Company Notebook/Desktop Usage Policy. (Please refer to itd.rcmp@unikl.edu.my)

ii. To use this Notebook/Desktop for working purposes only.

iii. To use for teaching purposes and use at appropriate place only. (If related)

iv. Installation of any unauthorized/illegal software into this Notebook/Desktop is strictly prohibited.

v. Any request for repair due to mechanical defect must be forwarded to the IT Department by filling in the requisition form and subject to approval by the management.

vi. The user is responsible for repairing or replacement cost of the damage or loss due to negligence or intentional misconduct.`;

function loadLogoBase64(): string {
  const path = join(process.cwd(), 'src', 'assets', 'unikl-logo.png');
  return `data:image/png;base64,${readFileSync(path).toString('base64')}`;
}

type TextOpts = {
  align?: 'left' | 'center' | 'right';
  backgroundColor?: string;
  lineHeight?: number;
  fontSize?: number;
  overflow?: 'visible' | 'expand';
  /** Enables **bold** via inline-markdown on schema.content. */
  markdown?: boolean;
  content?: string;
};

function T(
  name: string,
  x: number,
  y: number,
  w: number,
  h: number,
  fontSize = 9,
  opts: TextOpts = {},
) {
  return {
    name,
    type: 'text' as const,
    position: { x, y },
    width: w,
    height: h,
    fontSize: opts.fontSize ?? fontSize,
    alignment: opts.align ?? 'left',
    lineHeight: opts.lineHeight ?? 1.35,
    overflow: opts.overflow ?? 'visible',
    ...(opts.markdown
      ? {
          textFormat: 'inline-markdown' as const,
          readOnly: true,
          content: opts.content ?? '',
        }
      : {}),
    ...(opts.backgroundColor ? { backgroundColor: opts.backgroundColor } : {}),
  };
}

function pageFooterField(prefix: string) {
  return T(`${prefix}_genFooter`, 10, PAGE_FOOTER_Y, 190, 7, 7.5, {
    align: 'center',
    lineHeight: 1.2,
  });
}

function Img(name: string, x: number, y: number, w: number, h: number) {
  return { name, type: 'image' as const, position: { x, y }, width: w, height: h };
}

function pageHeaderFields(prefix: string, title?: string) {
  const fields = [
    Img(`${prefix}_logo`, 83, 4, 44, 40),
    T(`${prefix}_uni`, 10, 46, 190, 8, 10, {
      align: 'center',
      fontSize: 10,
      markdown: true,
      content: boldContent(UNIKL_HEADER),
    }),
  ];
  if (title) {
    fields.push(T(`${prefix}_title`, 10, 56, 190, 10, 11, { align: 'center', fontSize: 11 }));
  }
  return fields;
}

function buildPage3Schemas(data: HandoverPdfData) {
  const liabilityQuoted = `'I, ${data.recipientName} agree to pay all costs associated with damage to the above peripherals or its associated peripheral equipment. I also agree to pay for replacement cost of the equipment should it be lost or stolen.'`;

  return [
    ...pageHeaderFields('p3'),
    T('p3_ack', 14, 58, 182, 22, 10, { lineHeight: 1.35 }),
    T('p3_name', 14, 84, 182, 6, 10),
    T('p3_desig', 14, 92, 182, 6, 10),
    T('p3_staffNo', 14, 100, 182, 6, 10),
    T('p3_liabTitle', 14, 112, 182, 6, 10),
    T('p3_liabBody', 14, 120, 182, 48, 9, {
      lineHeight: 1.35,
      markdown: true,
      content: boldContent(liabilityQuoted),
    }),
    T('p3_liabNote', 14, 170, 182, 10, 9),
    T('p3_sigLeft', 14, FOOTER_Y + 8, 95, 8, 10),
    T('p3_dateRight', 110, FOOTER_Y + 8, 86, 8, 10, { align: 'right' }),
    pageFooterField('p3'),
  ];
}

function buildTemplate(data: HandoverPdfData): Template {
  return {
    basePdf: BASE_PDF,
    schemas: [
      [
        ...pageHeaderFields('p1', 'EMPLOYEE SOFTWARE COMPLIANCE STATEMENT'),
        T('p1_intro', 14, 70, 182, 10, 9),
        T('p1_points', 14, 82, 182, 148, 8.5, { lineHeight: 1.3 }),
        T('p1_agree', 14, 232, 182, 12, 9),
        T('p1_sigLine', 14, FOOTER_Y, 182, 5, 9),
        T('p1_sigLabel', 14, FOOTER_Y + 5, 182, 5, 9),
        T('p1_empName', 14, FOOTER_Y + 11, 182, 5, 9),
        T('p1_empDesig', 14, FOOTER_Y + 17, 182, 5, 9),
        T('p1_staffId', 14, FOOTER_Y + 23, 182, 5, 9),
        T('p1_date', 14, FOOTER_Y + 29, 182, 5, 9),
        pageFooterField('p1'),
      ],
      [
        ...pageHeaderFields('p2', "HANDING OVER OF COMPANY'S NOTEBOOK/DESKTOP"),
        T('p2_to', 14, 70, 95, 11, 10, { backgroundColor: '#D4E8F7' }),
        T('p2_assetId', 114, 70, 82, 11, 10, { backgroundColor: '#E8E8E8' }),
        T('p2_intro', 14, 86, 182, 6, 10),
        T('p2_assetHeading', 14, 94, 182, 6, 10),
        T('p2_itemName', 22, 102, 174, 5, 9),
        T('p2_brand', 22, 108, 174, 5, 9),
        T('p2_model', 22, 114, 174, 5, 9),
        T('p2_serial', 22, 120, 174, 5, 9),
        T('p2_adapter', 22, 126, 174, 5, 9),
        T('p2_remark', 22, 132, 174, 5, 9),
        T('p2_closing', 14, 140, 182, 6, 10),
        T('p2_requirements', 14, 148, 182, 94, 8.5, { lineHeight: 1.3 }),
        T('p2_footerTitle', 14, FOOTER_Y, 90, 6, 9),
        T('p2_footerName', 14, FOOTER_Y + 7, 90, 5, 9),
        T('p2_footerDesig', 14, FOOTER_Y + 13, 90, 5, 9),
        T('p2_footerDate', 14, FOOTER_Y + 19, 90, 5, 9),
        T('p2_footerSig', 120, FOOTER_Y + 19, 76, 6, 9, { align: 'right' }),
        pageFooterField('p2'),
      ],
      buildPage3Schemas(data),
    ],
  };
}

/** pdfme: one input object; template.schemas.length defines page count. */
function buildInputs(data: HandoverPdfData, logo: string): Record<string, string>[] {
  const genFooter = { p1_genFooter: COMPUTER_GENERATED_FOOTER, p2_genFooter: COMPUTER_GENERATED_FOOTER, p3_genFooter: COMPUTER_GENERATED_FOOTER };

  const page1: Record<string, string> = {
    p1_logo: logo,
    p1_title: 'EMPLOYEE SOFTWARE COMPLIANCE STATEMENT',
    p1_intro: COMPLIANCE_INTRO,
    p1_points: COMPLIANCE_POINTS,
    p1_agree: COMPLIANCE_AGREE,
  };

  const page2: Record<string, string> = {
    p2_logo: logo,
    p2_title: "HANDING OVER OF COMPANY'S NOTEBOOK/DESKTOP",
    p2_to: `To:  ${data.recipientName}`,
    p2_assetId: `ASSET ID:  ${data.assetId}`,
    p2_intro: 'I hereby hand over the following: -',
    p2_assetHeading: "1. Asset Information's",
    p2_itemName: `   Item Name: ${data.itemName}`,
    p2_brand: `   Brand Name: ${data.brandName}`,
    p2_model: `   Model Name: ${data.modelName}`,
    p2_serial: `   Serial Number: ${data.serialNumber}`,
    p2_closing: 'to be used for your daily work.',
    p2_requirements: REQUIREMENTS_TEXT,
    p2_footerTitle: 'Hand over by:',
    p2_footerName: `Name: ${data.handoverByName}`,
    p2_footerDesig: `Designation: ${data.handoverByDesignation}`,
    p2_footerDate: `Date: ${data.handoverDate}`,
  };

  const page3: Record<string, string> = {
    p3_logo: logo,
    p3_ack:
      "I, received the above mentioned Notebook/Desktop in satisfactory condition and agree to abide by the UNIKL Royal College of Medicine Perak regulations on the usage of company's equipment.",
    p3_name: `Name: ${data.recipientName}`,
    p3_desig: `Designation: ${data.employeeDesignation}`,
    p3_staffNo: `Staff Number: ${data.employeeNo}`,
    p3_liabTitle: 'Liability Statement :',
    p3_liabNote:
      'This form indicates my agreement with the above liability statement',
  };

  return [{ ...page1, ...page2, ...page3, ...genFooter }];
}

export async function generateHandoverPdfBuffer(handoverId: number): Promise<Uint8Array> {
  const { getHandoverPdfData } = await import('@/server/handover-pdf-repo.server');
  const data = await getHandoverPdfData(handoverId);
  if (!data) {
    throw new Error('This handover record could not be found. Refresh the page and try again.');
  }

  const logo = loadLogoBase64();
  return generate({
    template: buildTemplate(data),
    inputs: buildInputs(data, logo),
    plugins: { text, image },
  });
}

export async function generateHandoverPdfBase64(handoverId: number): Promise<string> {
  const buf = await generateHandoverPdfBuffer(handoverId);
  return Buffer.from(buf).toString('base64');
}
