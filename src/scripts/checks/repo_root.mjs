/**
 * 仓库根目录常量（本文件位于 `<仓库>/src/scripts/checks/`）。
 */
import { fileURLToPath } from 'node:url'

/** 仓库根绝对路径。 */
export const REPO_ROOT = fileURLToPath(new URL('../../..', import.meta.url))
