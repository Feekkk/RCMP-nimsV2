import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const UNIKL_HEADER = 'UNIVERSITY KUALA LUMPUR ROYAL COLLEGE OF MEDICINE PERAK';
export const IT_DEPT_HEADER = 'INFORMATION TECHNOLOGY DEPARTMENT';
export const COMPUTER_GENERATED_FOOTER = 'This is computer generated no need any signature';

export const BASE_PDF = {
  width: 210,
  height: 297,
  padding: [12, 12, 12, 12] as [number, number, number, number],
};

export const PAGE_FOOTER_Y = 286;

export function boldContent(text: string): string {
  return `**${text}**`;
}

export function loadLogoBase64(): string {
  const path = join(process.cwd(), 'src', 'assets', 'unikl-logo.png');
  return `data:image/png;base64,${readFileSync(path).toString('base64')}`;
}

export type TextOpts = {
  align?: 'left' | 'center' | 'right';
  backgroundColor?: string;
  lineHeight?: number;
  fontSize?: number;
  overflow?: 'visible' | 'expand';
  markdown?: boolean;
  content?: string;
};

export function T(
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

export function Img(name: string, x: number, y: number, w: number, h: number) {
  return { name, type: 'image' as const, position: { x, y }, width: w, height: h };
}

export function pageFooterField(prefix: string) {
  return T(`${prefix}_genFooter`, 10, PAGE_FOOTER_Y, 190, 7, 7.5, {
    align: 'center',
    lineHeight: 1.2,
  });
}

export function pageHeaderFields(prefix: string, title?: string, subtitle?: string) {
  const fields = [
    Img(`${prefix}_logo`, 83, 4, 44, 40),
    T(`${prefix}_uni`, 10, 46, 190, 8, 10, {
      align: 'center',
      fontSize: 10,
      markdown: true,
      content: boldContent(UNIKL_HEADER),
    }),
  ];
  if (subtitle) {
    fields.push(
      T(`${prefix}_dept`, 10, 54, 190, 8, 9.5, {
        align: 'center',
        fontSize: 9.5,
        markdown: true,
        content: boldContent(subtitle),
      }),
    );
  }
  if (title) {
    const titleY = subtitle ? 62 : 56;
    fields.push(
      T(`${prefix}_title`, 10, titleY, 190, 10, 11, {
        align: 'center',
        fontSize: 11,
        markdown: true,
        content: boldContent(title),
      }),
    );
  }
  return fields;
}
