import { PlaitBoard, PlaitElement } from '@plait/core';
import { MindElement } from '@plait/mind';
import { PlaitDrawElement } from '@plait/draw';
import { Freehand } from '../plugins/freehand/type';

// 从 MindElement 中提取文本内容
const extractTextFromMindElement = (element: any): string => {
  console.log('MindElement:', JSON.stringify(element, null, 2));
  
  // 尝试多种方式获取文本
  let text = '';
  
  // 直接文本
  if (element.text) {
    if (typeof element.text === 'string') {
      text = element.text;
    } else if (Array.isArray(element.text)) {
      // 处理数组形式的文本
      text = element.text.map((t: any) => t.text || t || '').join('');
    } else if (typeof element.text === 'object') {
      // 处理对象形式的文本
      text = element.text.text || element.text.content || '';
    }
  }
  
  // 从 data 属性中获取
  if (!text && element.data) {
    if (element.data.text) {
      text = element.data.text;
    } else if (element.data.content) {
      text = element.data.content;
    } else if (element.data.topic) {
      // 处理 topic 结构
      if (typeof element.data.topic === 'string') {
        text = element.data.topic;
      } else if (element.data.topic.children) {
        // 处理 topic.children 结构
        text = element.data.topic.children
          .map((child: any) => child.text || child || '')
          .join('');
      }
    }
  }
  
  // 尝试从 children 中获取
  if (!text && element.children && element.children.length > 0) {
    for (const child of element.children) {
      const childText = extractTextFromMindElement(child);
      if (childText && childText !== '[Untitled]') {
        text = childText;
        break;
      }
    }
  }
  
  return text || '[Untitled]';
};

// 递归转换思维导图元素为 Markdown
const convertMindElementToMarkdown = (element: MindElement, level: number = 0): string => {
  const content = extractTextFromMindElement(element);
  const indent = '  '.repeat(level);
  let markdown = `${indent}- ${content}\n`;
  
  console.log(`Converting mind element at level ${level}:`, content);
  
  if (element.children && element.children.length > 0) {
    for (const child of element.children) {
      markdown += convertMindElementToMarkdown(child, level + 1);
    }
  }
  
  return markdown;
};

// 转换流程图元素为 Markdown
const convertDrawElementToMarkdown = (element: PlaitDrawElement): string => {
  console.log('DrawElement:', JSON.stringify(element, null, 2));
  
  // 检查是否是文本元素
  const elementAny = element as any;
  if (elementAny.shape === 'text' && elementAny.text) {
    let textContent = '';
    if (typeof elementAny.text === 'string') {
      textContent = elementAny.text;
    } else if (elementAny.text.children) {
      textContent = elementAny.text.children
        .map((child: any) => child.text || child || '')
        .join('');
    }
    return `\n\n**Text Content:**\n\n${textContent}\n\n`;
  }
  
  return `\n\n\`\`\`mermaid\nflowchart TD\n  A[Diagram Element]\n\`\`\`\n\n`;
};

// 处理手绘元素
const convertFreehandElementToMarkdown = (element: any): string => {
  console.log('Freehand element:', JSON.stringify(element, null, 2));
  return `\n\n*(Freehand drawing - not convertible to text)*\n\n`;
};

// 检查是否有有意义的内容
export const hasMeaningfulContent = (board: PlaitBoard): boolean => {
  if (board.children.length === 0) {
    return false;
  }
  
  for (const element of board.children) {
    const elementAny = element as any;
    
    // 检查思维导图元素
    if (elementAny.type === 'mind' || MindElement.isMindElement(board, element)) {
      const text = extractTextFromMindElement(elementAny);
      if (text && text !== '[Untitled]') {
        return true;
      }
    }
    
    // 检查几何文本元素
    if (elementAny.type === 'geometry' && elementAny.shape === 'text' && elementAny.text) {
      if (typeof elementAny.text === 'string' || (elementAny.text.children && elementAny.text.children.length > 0)) {
        return true;
      }
    }
    
    // 检查其他可能包含文字的元素
    if (elementAny.text || (elementAny.data && (elementAny.data.text || elementAny.data.content))) {
      return true;
    }
  }
  
  return false;
};

// 主转换函数
export const convertToMarkdown = (board: PlaitBoard): string => {
  let markdown = '';
  //let markdown = `# Drawnix Export\n\n`;
  //markdown += `Exported on ${new Date().toISOString()}\n\n`;
  //markdown += `Number of elements: ${board.children.length}\n\n`;
  
  console.log('Board children:', board.children.length);
  console.log('Full board:', JSON.stringify(board, null, 2));
  
  if (board.children.length === 0) {
    // markdown += `No elements found on the board.\n`;
    return markdown;
  }
  
  for (let i = 0; i < board.children.length; i++) {
    
    const element = board.children[i] as any;
    // markdown += `## Element ${i + 1}\n`;
    // markdown += `- Type: ${element.type || 'unknown'}\n`;
    // markdown += `- Full object: ${JSON.stringify(element).substring(0, 200)}...\n\n`;
    console.log(`Processing element ${i + 1}, type: ${element.type}`);
    
    if (element.type === 'mind' || MindElement.isMindElement(board, element)) {
      // markdown += '### Mind Map Content:\n';
      const mindContent = convertMindElementToMarkdown(element as MindElement);
      // 处理根元素，将第一个列表项转换为标题
      const lines = mindContent.split('\n');
      if (lines.length > 0 && lines[0].trim().startsWith('-')) {
        const rootText = lines[0].replace(/^-\s/, '');
        markdown += `# ${rootText}\n\n`;
        // 处理子元素
        for (let i = 1; i < lines.length; i++) {
          if (lines[i].trim()) {
            markdown += lines[i] + '\n';
          }
        }
      } else {
        markdown += mindContent;
      }
      markdown += '\n';
    } else if (element.type === 'draw' || PlaitDrawElement.isDrawElement(element)) {
      markdown += '### Drawing Content:\n';
      markdown += convertDrawElementToMarkdown(element as PlaitDrawElement);
    } else if (element.type === 'freehand' || Freehand.isFreehand(element)) {
      markdown += '### Freehand Drawing:\n';
      markdown += convertFreehandElementToMarkdown(element);
    } else if (element.type === 'geometry') {
      // 处理几何元素
      markdown += '### Geometry Content:\n';
      if (element.shape === 'text' && element.text) {
        let textContent = '';
        if (typeof element.text === 'string') {
          textContent = element.text;
        } else if (element.text.children) {
          textContent = element.text.children
            .map((child: any) => child.text || child || '')
            .join('');
        }
        markdown += `\n\n**Text Content:**\n\n${textContent}\n\n`;
      } else {
        markdown += `\n\n*(Geometry element - not convertible to text)*\n\n`;
      }
    } else {
      markdown += `### Unknown Element Type (${element.type}):\n`;
      markdown += `\`\`\`json\n${JSON.stringify(element, null, 2)}\n\`\`\`\n\n`;
    }
  }
  
  return markdown;
};

// 保存为 Markdown 文件
export const saveAsMarkdown = (board: PlaitBoard) => {
  // 检查是否有有意义的内容
  if (!hasMeaningfulContent(board)) {
    console.log('No meaningful content to export as Markdown');
    return;
  }
  
  const markdown = convertToMarkdown(board);
  console.log('Generated Markdown:', markdown);
  
  // 使用更可靠的 Blob 类型
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const fileName = `drawnix-${new Date().toISOString().slice(0, 10)}.md`;
  
  // 使用现有的下载函数
  const download = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    
    // 使用 setTimeout 确保链接被正确添加到 DOM
    setTimeout(() => {
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  };
  
  download(blob, fileName);
};
