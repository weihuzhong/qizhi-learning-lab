FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-pip python3-venv git ca-certificates fonts-noto-cjk fontconfig libcairo2 libpango-1.0-0 libgdk-pixbuf-2.0-0 libreoffice-impress && rm -rf /var/lib/apt/lists/*
RUN python3 -m venv /opt/python
ENV PATH="/opt/python/bin:$PATH"
RUN pip install --no-cache-dir python-pptx==1.0.2 PyYAML==6.0.3 XlsxWriter==3.2.9 skia-pathops==0.9.2 uharfbuzz==0.57.0 PyMuPDF==1.26.6 Pillow==13.0.0 numpy==2.3.5 requests==2.32.5 cairosvg==2.9.1 flask==3.1.2
RUN git clone --filter=blob:none https://github.com/pn1024/dsh-ppt-master.git /opt/pptmaster && cd /opt/pptmaster && git checkout 3c956467cd053fec36816cb7d2ca973729a5d4d1 && python3 /opt/pptmaster/skills/ppt-master/scripts/attribution_guard.py
RUN useradd --create-home --uid 10001 executor
WORKDIR /app
COPY worker.mjs overflow.mjs classroom-draft.mjs verify-render.py repair-layout.py ./
COPY fonts.conf /etc/fonts/conf.d/99-qizhi-cjk.conf
RUN fc-cache -f && fc-match -f "%{family}" "Microsoft YaHei" | python3 -c "import sys; assert 'Noto Sans CJK SC' in sys.stdin.read(), 'Chinese preview font alias missing'"
USER executor
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node","worker.mjs"]
