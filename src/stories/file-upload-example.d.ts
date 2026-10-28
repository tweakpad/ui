import type { FileUploader, FileValidator } from '../components/file-upload/index.js';
export const documentValidator: FileValidator;
export const importValidator: FileValidator;
export function createDemoUploader(view: Window & typeof globalThis): FileUploader;
export function setupFileUploadExample(root: HTMLElement): () => void;
