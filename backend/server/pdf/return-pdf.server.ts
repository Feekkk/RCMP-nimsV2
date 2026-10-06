import type { Template } from '@pdfme/common';
import { generate } from '@pdfme/generator';
import { image, text } from '@pdfme/schemas';
import type { ReturnPdfData } from '@shared/lib/return-pdf-types';
import {
  BASE_PDF,
  IT_DEPT_HEADER,
  T,
  boldContent,
  loadLogoBase64,
  pageHeaderFields,
  runningHeaderFields,
} from '@backend/server/pdf/pdf-form-common.server';

const TABLE_HDR_BG = '#D9D9D9';

function buildReturnStatement(data: ReturnPdfData): string {
  const name = data.recipientName === '—' ? '…………………………' : data.recipientName;
  const staffNo = data.employeeNo === '—' ? '…………………………' : data.employeeNo;
  return `'I ${name}, with ${staffNo} return the hardware/peripherals as stated above in good/adverse conditions and checked perfectly by the IT representative.'`;
}

function buildTemplate(data: ReturnPdfData): Template {
  return {
    basePdf: BASE_PDF,
    schemas: [
      [
        ...runningHeaderFields('r', 7),
        ...pageHeaderFields('r', "RETURN FORM OF COMPANY'S DESKTOP", IT_DEPT_HEADER),
        T('r_userHdrName', 14, 76, 45, 6, 8.5, {
          backgroundColor: TABLE_HDR_BG,
          align: 'center',
          markdown: true,
          content: boldContent('Name'),
        }),
        T('r_userHdrStaff', 59, 76, 40, 6, 8.5, {
          backgroundColor: TABLE_HDR_BG,
          align: 'center',
          markdown: true,
          content: boldContent('Staff ID'),
        }),
        T('r_userHdrDesig', 99, 76, 48, 6, 8.5, {
          backgroundColor: TABLE_HDR_BG,
          align: 'center',
          markdown: true,
          content: boldContent('Designation'),
        }),
        T('r_userHdrDept', 147, 76, 49, 6, 8.5, {
          backgroundColor: TABLE_HDR_BG,
          align: 'center',
          markdown: true,
          content: boldContent('Department'),
        }),
        T('r_userValName', 14, 82, 45, 7, 9, { align: 'center' }),
        T('r_userValStaff', 59, 82, 40, 7, 9, { align: 'center' }),
        T('r_userValDesig', 99, 82, 48, 7, 9, { align: 'center' }),
        T('r_userValDept', 147, 82, 49, 7, 9, { align: 'center' }),
        T('r_assetHeading', 14, 94, 182, 6, 10, {
          markdown: true,
          content: "1. Asset Information's: -",
        }),
        T('r_itemName', 14, 102, 182, 5, 9),
        T('r_brand', 14, 108, 182, 5, 9),
        T('r_model', 14, 114, 182, 5, 9),
        T('r_serial', 14, 120, 182, 5, 9),
        T('r_assetId', 14, 126, 182, 5, 9),
        T('r_condHdrItem', 14, 136, 60, 6, 8.5, {
          backgroundColor: TABLE_HDR_BG,
          align: 'center',
          markdown: true,
          content: boldContent('Item'),
        }),
        T('r_condHdrCond', 74, 136, 55, 6, 8.5, {
          backgroundColor: TABLE_HDR_BG,
          align: 'center',
          markdown: true,
          content: boldContent('Condition (OK/Damage)'),
        }),
        T('r_condHdrStatus', 129, 136, 67, 6, 8.5, {
          backgroundColor: TABLE_HDR_BG,
          align: 'center',
          markdown: true,
          content: boldContent('Status (Return/Missing)'),
        }),
        T('r_condValItem', 14, 142, 60, 6, 9, { align: 'center' }),
        T('r_condValCond', 74, 142, 55, 6, 9, { align: 'center' }),
        T('r_condValStatus', 129, 142, 67, 6, 9, { align: 'center' }),
        T('r_remarks', 14, 150, 182, 8, 9),
        T('r_returnHeading', 14, 160, 182, 6, 10, {
          markdown: true,
          content: '2. Return Statement: -',
        }),
        T('r_returnStmt', 14, 168, 182, 20, 9, {
          lineHeight: 1.35,
          markdown: true,
          content: boldContent(buildReturnStatement(data)),
        }),
        T('r_handoverTitle', 14, 192, 90, 6, 10, {
          markdown: true,
          content: '3. Processed By:',
        }),
        T('r_handoverName', 14, 214, 90, 5, 9),
        T('r_handoverDesig', 14, 220, 90, 5, 9),
        T('r_handoverStaffId', 14, 226, 90, 5, 9),
        T('r_handoverDate', 14, 232, 90, 5, 9),
      ],
    ],
  };
}

function buildInputs(data: ReturnPdfData, logo: string): Record<string, string>[] {
  const remarks =
    data.returnRemarks && data.returnRemarks !== '—'
      ? `• Remarks: ${data.returnRemarks}`
      : '• Remarks:';

  return [
    {
      r_logo: logo,
      r_userValName: data.recipientName,
      r_userValStaff: data.employeeNo,
      r_userValDesig: data.designation,
      r_userValDept: data.department,
      r_itemName: `   i. Item Name: ${data.itemName}`,
      r_brand: `   ii. Brand Name: ${data.brandName}`,
      r_model: `   iii. Model Name: ${data.modelName}`,
      r_serial: `   iv. Serial Number: ${data.serialNumber}`,
      r_assetId: `   v. Asset ID: ${data.assetId}`,
      r_condValItem: data.itemName,
      r_condValCond: data.conditionDisplay,
      r_condValStatus: 'RETURN',
      r_remarks: remarks,
      r_handoverName: `Name: ${data.handoverByName}`,
      r_handoverDesig: `Designation: ${data.handoverByDesignation}`,
      r_handoverStaffId: 'Staff ID:',
      r_handoverDate: `Date: ${data.returnDate}`,
    },
  ];
}

export async function buildReturnPdfFromData(data: ReturnPdfData): Promise<Uint8Array> {
  const logo = loadLogoBase64();
  return generate({
    template: buildTemplate(data),
    inputs: buildInputs(data, logo),
    plugins: { text, image },
  });
}

export async function generateReturnPdfBuffer(returnId: number): Promise<Uint8Array> {
  const { getReturnNotificationData } = await import('@backend/server/pdf/return-pdf-repo.server');
  const data = await getReturnNotificationData(returnId);
  if (!data) {
    throw new Error('This return record could not be found. Refresh the page and try again.');
  }
  const { isLeasingCategory } = await import('@/hooks/assetid-generator');
  if (isLeasingCategory(data.category)) {
    throw new Error('Return PDF is not issued for leasing laptop or desktop.');
  }

  return buildReturnPdfFromData(data);
}

export async function generateReturnPdfBase64(returnId: number): Promise<string> {
  const buf = await generateReturnPdfBuffer(returnId);
  return Buffer.from(buf).toString('base64');
}
