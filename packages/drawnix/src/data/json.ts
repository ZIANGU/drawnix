import { PlaitBoard, PlaitElement } from '@plait/core';
import { MIME_TYPES, VERSIONS } from '../constants';
import { fileOpen, fileSave } from './filesystem';
import { DrawnixExportedData, DrawnixExportedType } from './types';
import { loadFromBlob, normalizeFile } from './blob';

export const getDefaultName = () => {
  const time = new Date().getTime();
  return time.toString();
};

export const saveAsJSON = async (
  board: PlaitBoard,
  name: string = getDefaultName()
) => {
  try {
    const serialized = serializeAsJSON(board);
    const blob = new Blob([serialized], {
      type: MIME_TYPES.drawnix,
    });

    const fileHandle = await fileSave(blob, {
      name,
      extension: 'drawnix',
      description: 'Drawnix file',
    });
    return { fileHandle };
  } catch (error) {
    // 捕获用户取消保存操作的异常
    if (error instanceof Error && error.name === 'AbortError') {
      console.log('User cancelled JSON export');
    } else {
      console.error('Error saving JSON:', error);
    }
    return { fileHandle: null };
  }
};

export const loadFromJSON = async (board: PlaitBoard) => {
  try {
    const file = await fileOpen({
      description: 'Drawnix files',
      // ToDo: Be over-permissive until https://bugs.webkit.org/show_bug.cgi?id=34442
      // gets resolved. Else, iOS users cannot open `.drawnix` files.
      // extensions: ["json", "drawnix", "png", "svg"],
    });
    return loadFromBlob(board, await normalizeFile(file));
  } catch (error) {
    // 捕获用户取消打开文件操作的异常
    if (error instanceof Error && error.name === 'AbortError') {
      console.log('User cancelled file open');
    } else {
      console.error('Error opening file:', error);
    }
    return null;
  }
};

export const isValidDrawnixData = (data?: any): data is DrawnixExportedData => {
  return (
    data &&
    data.type === DrawnixExportedType.drawnix &&
    Array.isArray(data.elements) &&
    typeof data.viewport === 'object'
  );
};

export const serializeAsJSON = (board: PlaitBoard): string => {
  const data = {
    type: DrawnixExportedType.drawnix,
    version: VERSIONS.drawnix,
    source: 'web',
    elements: board.children,
    viewport: board.viewport,
    theme: board.theme,
  };

  return JSON.stringify(data, null, 2);
};
