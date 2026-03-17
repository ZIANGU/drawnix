import { getSelectedElements, PlaitBoard, toSvgData } from '@plait/core';
import { base64ToBlob, boardToImage, download } from './common';
import { fileOpen } from '../data/filesystem';
import { IMAGE_MIME_TYPES } from '../constants';
import { insertImage } from '../data/image';
import { getBackgroundColor, isWhite } from './color';
import { TRANSPARENT } from '../constants/color';
import jsPDF from 'jspdf';

export const saveAsSvg = (board: PlaitBoard) => {
  const selectedElements = getSelectedElements(board);
  const backgroundColor = getBackgroundColor(board);

  return toSvgData(board, {
    fillStyle: isWhite(backgroundColor) ? TRANSPARENT : backgroundColor,
    padding: 20,
    ratio: 4,
    elements: selectedElements.length > 0 ? selectedElements : undefined,
    inlineStyleClassNames: '.plait-text-container',
    styleNames: ['position'],
  }).then((svgData) => {
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const imageName = `drawnix-${new Date().getTime()}.svg`;
    download(blob, imageName);
  });
};

export const saveAsImage = (board: PlaitBoard, isTransparent: boolean) => {
  const selectedElements = getSelectedElements(board);
  const backgroundColor = getBackgroundColor(board) || 'white';
  boardToImage(board, {
    elements: selectedElements.length > 0 ? selectedElements : undefined,
    fillStyle: isTransparent ? 'transparent' : backgroundColor,
  }).then((image) => {
    if (image) {
      const ext = isTransparent ? 'png' : 'jpg';
      const pngImage = base64ToBlob(image);
      const imageName = `drawnix-${new Date().getTime()}.${ext}`;
      download(pngImage, imageName);
    }
  });
};

export const saveAsPdf = (board: PlaitBoard) => {
  const selectedElements = getSelectedElements(board);
  const backgroundColor = getBackgroundColor(board) || 'white';
  
  boardToImage(board, {
    elements: selectedElements.length > 0 ? selectedElements : undefined,
    fillStyle: 'white',
    ratio: 2,
  }).then(async (image) => {
    if (image) {
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: 'a4',
      });
      
      // 获取图片尺寸
      const imgProps = pdf.getImageProperties(image);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // 计算缩放比例以适应 A4 纸
      const imgRatio = imgProps.width / imgProps.height;
      const pageRatio = pdfWidth / pdfHeight;
      
      let finalWidth, finalHeight;
      if (imgRatio > pageRatio) {
        finalWidth = pdfWidth - 20; // 留白边距
        finalHeight = finalWidth / imgRatio;
      } else {
        finalHeight = pdfHeight - 20;
        finalWidth = finalHeight * imgRatio;
      }
      
      pdf.addImage(image, 'PNG', 10, 10, finalWidth, finalHeight);
      const pdfName = `drawnix-${new Date().getTime()}.pdf`;
      pdf.save(pdfName);
    }
  });
};

export const addImage = async (board: PlaitBoard) => {
  const imageFile = await fileOpen({
    description: 'Image',
    extensions: Object.keys(
      IMAGE_MIME_TYPES
    ) as (keyof typeof IMAGE_MIME_TYPES)[],
  });
  insertImage(board, imageFile);
};
