interface PDFJSViewport {
  width: number;
  height: number;
}

interface PDFJSRenderTask {
  promise: Promise<void>;
}

interface PDFJSPage {
  getViewport: (opts: { scale: number }) => PDFJSViewport;
  render: (ctx: { canvasContext: CanvasRenderingContext2D; viewport: PDFJSViewport }) => PDFJSRenderTask;
  getTextContent: () => Promise<{ items: Array<{ str: string }> }>;
}

interface PDFJSDocument {
  numPages: number;
  getPage: (num: number) => Promise<PDFJSPage>;
  getPageIndices: () => number[];
}

interface PDFJSGetDocumentTask {
  promise: Promise<PDFJSDocument>;
}

interface PDFJSLib {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (src: string | ArrayBuffer | { data: ArrayBuffer }) => PDFJSGetDocumentTask;
}

declare global {
  interface Window {
    pdfjsLib: PDFJSLib;
  }
}

export {};
