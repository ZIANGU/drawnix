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
    const imageName = `drawnix-${new Date().toISOString().slice(0, 10)}.svg`;
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
      const imageName = `drawnix-${new Date().toISOString().slice(0, 10)}.${ext}`;
      download(pngImage, imageName);
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

export const saveAsPdf = (board: PlaitBoard) => {
  const selectedElements = getSelectedElements(board);
  const backgroundColor = getBackgroundColor(board) || 'white';
  
  boardToImage(board, {
    elements: selectedElements.length > 0 ? selectedElements : undefined,
    fillStyle: backgroundColor,
    // 调整图像质量，平衡清晰度和性能
    ratio: 4,
    // 增加 padding 以确保底部文字不被裁剪
    padding: 40,
  }).then((image) => {
    if (image) {
      // 优化：使用无损压缩的 PNG 格式以确保最高清晰度
      const optimizeImage = (base64: string, maxWidth: number = 2000): Promise<string> => {
        return new Promise((resolve) => {
          const img = new Image();
          img.src = base64;
          
          img.onload = () => {
            if (img.width <= maxWidth) {
              resolve(base64);
              return;
            }
            
            const canvas = document.createElement('canvas');
            const scale = maxWidth / img.width;
            canvas.width = maxWidth;
            canvas.height = img.height * scale;
            
            const ctx = canvas.getContext('2d');
            if (ctx) {
              // 使用 PNG 格式，无损压缩
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              resolve(canvas.toDataURL('image/png'));
            } else {
              resolve(base64);
            }
          };
        });
      };
      
      optimizeImage(image).then((optimizedImage) => {
        const img = new Image();
        img.src = optimizedImage;
        
        img.onload = () => {
          const imgWidth = img.width;
          const imgHeight = img.height;
          const aspectRatio = imgWidth / imgHeight;
          
          // 尝试横向布局
          const doc = new jsPDF('l', 'mm', 'a4');
          const pageWidth = 297; // A4 横向宽度
          const pageHeight = 210; // A4 横向高度
          const margin = 10;
          const contentWidth = pageWidth - margin * 2;
          const contentHeight = pageHeight - margin * 2;
          
          // 计算缩放比例
          const scaleX = contentWidth / imgWidth;
          const scaleY = contentHeight / imgHeight;
          const scale = Math.min(scaleX, scaleY);
          
          // 计算缩放后的图像尺寸
          const scaledWidth = imgWidth * scale;
          const scaledHeight = imgHeight * scale;
          
          if (scaledHeight <= contentHeight) {
            // 单页可以容纳
            const x = margin + (contentWidth - scaledWidth) / 2;
            const y = margin + (contentHeight - scaledHeight) / 2;
            doc.addImage(optimizedImage, 'PNG', x, y, scaledWidth, scaledHeight);
          } else {
            // 多页显示
            const pages = Math.ceil(scaledHeight / contentHeight);
            
            for (let i = 0; i < pages; i++) {
              if (i > 0) {
                doc.addPage('l');
              }
              
              // 计算当前页显示的图像部分
              const startY = i * contentHeight;
              const endY = Math.min(startY + contentHeight, scaledHeight);
              const currentHeight = endY - startY;
              
              // 计算在原始图像中的位置
              const imgStartY = (startY / scaledHeight) * imgHeight;
              const imgCurrentHeight = (currentHeight / scaledHeight) * imgHeight;
              
              // 创建一个新的 canvas 来裁剪图像
              const canvas = document.createElement('canvas');
              canvas.width = imgWidth;
              canvas.height = imgCurrentHeight;
              
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(
                  img, 
                  0, 
                  imgStartY, 
                  imgWidth, 
                  imgCurrentHeight, 
                  0, 
                  0, 
                  imgWidth, 
                  imgCurrentHeight
                );
                
                const croppedImage = canvas.toDataURL('image/png');
                doc.addImage(croppedImage, 'PNG', margin, margin, contentWidth, currentHeight);
              }
            }
          }
          
          const fileName = `drawnix-${new Date().toISOString().slice(0, 10)}.pdf`;
          try {
            doc.save(fileName);
          } catch (error) {
            // 捕获用户取消保存操作的异常
            if (error instanceof Error && error.name === 'AbortError') {
              console.log('User cancelled PDF export');
            } else {
              console.error('Error saving PDF:', error);
            }
          }
        };
      });
    }
  });
};
