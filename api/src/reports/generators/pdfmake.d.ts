/* eslint-disable @typescript-eslint/no-explicit-any */
declare module 'pdfmake' {
  interface FontFamily {
    normal: string;
    bold: string;
    italics: string;
    bolditalics: string;
  }

  interface Fonts {
    [name: string]: FontFamily;
  }

  interface TableCell {
    text?: string;
    bold?: boolean;
    fontSize?: number;
    alignment?: string;
    fillColor?: string;
    margin?: [number, number, number, number];
    [key: string]: any;
  }

  interface DocStyle {
    fontSize?: number;
    bold?: boolean;
    margin?: [number, number, number, number];
    fillColor?: string;
    color?: string;
    alignment?: string;
  }

  interface DocContent {
    text?: string;
    style?: string;
    margin?: [number, number, number, number];
    table?: {
      headerRows?: number;
      widths?: (string | number | 'auto' | '*')[];
      body: (string | TableCell)[][];
      layout?: string;
    };
    layout?: string;
    ul?: string[];
    bold?: boolean;
    fontSize?: number;
    [key: string]: any;
  }

  interface TDocumentDefinitions {
    content: (DocContent | string)[];
    defaultStyle?: { font?: string; fontSize?: number };
    styles?: Record<string, DocStyle>;
    pageOrientation?: 'portrait' | 'landscape';
    pageMargins?: [number, number, number, number];
    info?: {
      title?: string;
      author?: string;
      subject?: string;
    };
  }

  class PdfPrinter {
    constructor(fonts: Fonts);
    createPdfKitDocument(docDef: TDocumentDefinitions): any;
  }

  export = PdfPrinter;
}

declare module 'pdfmake/interfaces' {
  export type TDocumentDefinitions = import('pdfmake').TDocumentDefinitions;
}
