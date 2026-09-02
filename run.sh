#!/bin/sh

SCRIPT_DIR=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd -P)

# 1. 参数为空时，默认打开配置面板
if [ "$#" -eq 0 ]; then
	/bin/sh "$SCRIPT_DIR/path/subfount" open
else
	/bin/sh "$SCRIPT_DIR/path/subfount" "$@"
fi

# 2. 错误退出码 + 交互终端时等待用户按键
RETURN_CODE=$?
if [ "$#" -eq 0 ] && [ "$RETURN_CODE" -ne 0 ] && [ "$RETURN_CODE" -ne 130 ] && [ "$RETURN_CODE" -ne 255 ] && [ -t 0 ] && [ -t 1 ]; then
	echo "Press Enter to continue..."
	read -r _
fi

exit "$RETURN_CODE"
