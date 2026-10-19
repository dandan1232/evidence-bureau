# 网页字体

界面使用 Noto Sans SC，案件和档案标题使用 Noto Serif SC。两套字体均随站点发布，玩家无需访问外部字体服务。

- [Noto Sans SC 原始字体](https://github.com/google/fonts/tree/main/ofl/notosanssc)，许可见 `NotoSansSC-OFL.txt`。
- [Noto Serif SC 原始字体](https://github.com/google/fonts/tree/main/ofl/notoserifsc)，许可见 `NotoSerifSC-OFL.txt`。

WOFF2 文件保留 400～700 字重，仅包含当前源码、案件文案及常见标点使用的字符。新增文案中尚未包含的字会使用系统后备字体；发布新案件时可重新生成子集。

安装 `fonttools`、`brotli`，下载上述目录中的两份可变 TTF，然后在项目根目录运行：

```sh
python scripts/build-fonts.py /path/to/NotoSansSC.ttf /path/to/NotoSerifSC.ttf
```
