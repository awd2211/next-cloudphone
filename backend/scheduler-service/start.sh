#!/bin/bash

# 激活虚拟环境
source venv/bin/activate

# 安装依赖（如果需要）
if [ ! -d "venv/lib/python3*/site-packages/fastapi" ]; then
    pip install -r requirements.txt
fi

# 启动服务
python main.py
