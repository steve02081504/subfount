# subfount

[![fount repo](https://steve02081504.github.io/fount/badges/fount_repo.svg)](https://github.com/steve02081504/fount)

**subfount** は、お使いのデバイスを [fount](https://github.com/steve02081504/fount) ネットワークに接続する軽量クライアントです。
お使いのマシン上で fount オーバーレイ基盤（`infra`）を実行し、ホストに接続するとヘルパーノードとなり、ホストの賢いエージェントがお使いのデバイス上でコードを実行したり、シェルコマンドを実行したりできるようになります。

## 特徴

- **infra 参加** — fount オーバーレイネットワークに参加し、パケット転送やメールボックスに参加して、ネットワークの健全性を維持します。
- **ホストワーカー** — ホストに接続するとヘルパーノードになります。ホストは `run_code`（任意のスクリプト実行）や `shell_exec`（シェルコマンド実行）のリクエストを送信できます。
- **ホスト優先アシスト** — ホストから評判テーブルを取得し、そのノードを信頼して、infra 支援でホストに優先権を与えます。
- **スタンドアロンまたはアシスト** — ホストが未設定の場合はスタンドアロンの infra として動作し、設定済みの場合は infra を実行しつつホストを支援します。
- **ホットリロード設定** — 実行中に `data/config.json` を編集すると再起動せずに反映されます（デーモンがファイルを監視）。
- **TUI パネル** — 接続設定の編集、infra の切り替え、デーモンの起動・停止ができる対話型設定パネルが組み込まれています。

## 必要環境

- [Deno](https://deno.com)（不足している場合は runner が自動インストール）
- Node.js/bun（任意のフォールバック）
- runner スクリプト用に PowerShell（Windows）または bash（Linux/macOS）

## クイックスタート

このリポジトリをクローンまたはダウンロードし、リポジトリのルートで runner を実行します。

```sh
# Linux/macOS
./run.sh

# Windows (PowerShell)
.\run.bat
```

引数なしで実行すると設定パネルが開き、バックグラウンドでデーモンが起動します。

## 使い方

主なエントリポイントは runner スクリプト（`run`、`run.bat`、`run.cmd`、`run.sh`）と、`path/` 配下のコマンドランチャー（`subfount`、`subfount.bat`、`subfount.ps1`、`subfount.mjs`）です。

### 設定パネル

```sh
subfount open        # または：run.sh（引数なし）
```

パネルでできること：

- **ホストのルーム ID** と**パスワード**の設定（空欄の場合は infra のみのモード）
- ホストの **nodeHash** のオプション設定（接続コード API から取得）
- **infra 参加**の切り替え
- デーモンの状態確認（PID、nodeHash、モード、接続中のホスト）
- デーモンの**起動** / **停止**

### デーモンを直接実行

```sh
subfount                                    # infra のみ（data/config.json から読み込み）
subfount <host-room-id> <password> [node-hash]
    # infra + ホストワーカー / 優先アシスト（一度きり、永続化しない）
```

### その他のコマンド

| コマンド | 説明 |
| --- | --- |
| `subfount open` / `subfount panel` | 設定パネルを開く |
| `subfount server` | デーモンをフォアグラウンドで実行 |
| `subfount background keepalive` | デーモンをバックグラウンドで自動再起動付きで実行 |
| `subfount keepalive` | 自動再起動 / 自動再初期化付きでデーモンを実行 |
| `subfount shutdown` | デーモンをグレースフルに停止 |
| `subfount reboot` | デーモンを再起動 |
| `subfount version` | バージョンと git 情報を表示 |
| `subfount update` | subfount と Deno を更新 |
| `subfount clean` | Deno キャッシュをクリーンアップ |
| `subfount remove` | subfount をアンインストール |
| `subfount debug` | デバッグログ付きで実行 |

## 設定

デーモンは `data/config.json` を読み取ります。パネルが編集してくれますが、デーモン実行中に手動で編集することもできます（次の接続試行時に反映されます）。

```json
{
	"hostRoomId": null,
	"password": null,
	"hostNodeHash": null,
	"infra": true
}
```

## ステータスファイル

- `data/daemon.pid` — デーモンの PID
- `data/status.json` — デーモンが書き込むリアルタイム状態（パネルの読み取り専用表示用）
- `data/daemon.log` / `data/daemon.err.log` — デーモンの出力ログ

## 開発

```sh
deno task start     # デーモンを実行
deno task panel     # パネルを開く
deno task test      # テストを実行
deno task lint      # lint
deno task check     # 型チェック
```
