#!/bin/bash

# 启动 Drawnix 项目的脚本

echo "正在检查依赖项..."

# 检查 node_modules 目录是否存在
if [ ! -d "node_modules" ]; then
  echo "未找到依赖项，正在安装..."
  npm install
  if [ $? -ne 0 ]; then
    echo "依赖项安装失败，请检查网络连接或 package.json 文件"
    exit 1
  fi
  echo "依赖项安装成功！"
else
  echo "依赖项已存在，跳过安装步骤"
fi

echo "正在启动项目..."
npm start
