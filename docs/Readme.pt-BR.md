# subfount

[![fount repo](https://steve02081504.github.io/fount/badges/fount_repo.svg)](https://github.com/steve02081504/fount)

**subfount** é um cliente leve que conecta o seu dispositivo à rede do [fount](https://github.com/steve02081504/fount).
Ele executa a infraestrutura de sobreposição (`infra`) do fount na sua máquina e, uma vez conectado a um host, age como um nó auxiliar que permite aos agentes inteligentes do host executar código ou comandos de shell no seu dispositivo.

## Instalação e Remoção: Um Encontro e Despedida Elegantes

<a id="installation"></a>

### Instalação: Tecendo o subfount em Seu Mundo – _Sem Esforço_

Embarque em sua jornada com o subfount, uma plataforma estável e confiável. Alguns cliques ou comandos simples, e o mundo do subfount se revela.

> [!CAUTION]
>
> No mundo do subfount, o host ao qual você se conecta pode executar código arbitrário e comandos de shell no seu dispositivo, concedendo a ele capacidades poderosas. Portanto, conecte-se apenas a hosts em que confia, com o mesmo cuidado que teria na vida real, para garantir a segurança dos seus arquivos locais.

### Linux/macOS/Android: Os Sussurros do Shell – _Uma Linha, e Você Está Dentro_

```bash
# Se necessário, defina a variável de ambiente $SUBFOUNT_DIR para especificar o diretório do subfount
# BEGIN FOUNT_PKG_MGR
FOUNT_PKG_STATE_DIR="${FOUNT_PKG_STATE_DIR:-${TMPDIR:-${TEMP:-/tmp}}/fount/package}"; pkg_lock_acquire() { _manager="$1"; _pkg_lock_dir="$FOUNT_PKG_STATE_DIR/$_manager.lock"; mkdir -p "$FOUNT_PKG_STATE_DIR" 2>/dev/null || return 1; _retry_count=0; while ! mkdir "$_pkg_lock_dir" 2>/dev/null; do if [ -f "$_pkg_lock_dir/pid" ]; then _pid=$(cat "$_pkg_lock_dir/pid" 2>/dev/null); if [ -n "$_pid" ] && ! kill -0 "$_pid" 2>/dev/null; then rm -rf "$_pkg_lock_dir"; continue; fi; fi; _retry_count=$((_retry_count + 1)); [ "$_retry_count" -ge $(( ${FOUNT_PKG_LOCK_TIMEOUT:-300} * 10 )) ] && return 1; sleep 0.1 2>/dev/null || sleep 1; done; printf '%s\n' "$$" >"$_pkg_lock_dir/pid"; FOUNT_PKG_LOCK_DIR="$_pkg_lock_dir"; return 0; }; pkg_lock_release() { [ -n "$FOUNT_PKG_LOCK_DIR" ] || return 0; rm -rf "$FOUNT_PKG_LOCK_DIR"; FOUNT_PKG_LOCK_DIR=; }; pkg_with_lock() { _manager="$1"; shift; pkg_lock_acquire "$_manager" || return 1; "$@"; _exit_status=$?; pkg_lock_release; return $_exit_status; }; pkg_db_refresh_needed() { _manager="$1"; _refresh_file="$FOUNT_PKG_STATE_DIR/$_manager.refresh"; [ -f "$_refresh_file" ] || return 0; _now=$(date +%s 2>/dev/null) || return 0; _last=$(cat "$_refresh_file" 2>/dev/null); [ -n "$_last" ] || return 0; [ "$((_now - _last))" -ge "${FOUNT_PKG_REFRESH_INTERVAL:-600}" ]; }; pkg_db_refresh_mark() { _manager="$1"; mkdir -p "$FOUNT_PKG_STATE_DIR" 2>/dev/null || return 1; printf '%s\n' "$(date +%s 2>/dev/null)" >"$FOUNT_PKG_STATE_DIR/$_manager.refresh" 2>/dev/null; }; pkg_refresh() { _manager="$1"; shift; pkg_db_refresh_needed "$_manager" || return 0; pkg_lock_acquire "$_manager" || return 1; if pkg_db_refresh_needed "$_manager"; then if "$@"; then pkg_db_refresh_mark "$_manager"; _exit_status=0; else _exit_status=$?; fi; pkg_lock_release; return $_exit_status; fi; pkg_lock_release; return 0; }; install_package() { _command_name="$1"; _package_list=${2:-$_command_name}; _has_sudo=""; _installed_pkg_name=""; if command -v "$_command_name" >/dev/null 2>&1; then return 0; fi; if [ "$(id -u)" -ne 0 ] && command -v sudo >/dev/null 2>&1; then _has_sudo="sudo"; fi; for _package in $_package_list; do if command -v apt-get >/dev/null 2>&1; then pkg_refresh apt-get $_has_sudo apt-get update -y; pkg_with_lock apt-get $_has_sudo apt-get install -y "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v pacman >/dev/null 2>&1; then pkg_with_lock pacman $_has_sudo pacman -Syu --needed --noconfirm "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v dnf >/dev/null 2>&1; then pkg_refresh dnf $_has_sudo dnf makecache; pkg_with_lock dnf $_has_sudo dnf install -y "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v yum >/dev/null 2>&1; then pkg_refresh yum $_has_sudo yum makecache fast; pkg_with_lock yum $_has_sudo yum install -y "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v zypper >/dev/null 2>&1; then pkg_refresh zypper $_has_sudo zypper refresh; pkg_with_lock zypper $_has_sudo zypper install -y --no-confirm "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v apk >/dev/null 2>&1; then if [ "$(id -u)" -eq 0 ]; then pkg_with_lock apk apk add --update "$_package"; else pkg_with_lock apk $_has_sudo apk add --update "$_package"; fi; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v brew >/dev/null 2>&1; then if ! brew list --formula "$_package" >/dev/null 2>&1; then pkg_with_lock brew brew install "$_package"; fi; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v pkg >/dev/null 2>&1; then pkg_refresh pkg $_has_sudo pkg update -y; pkg_with_lock pkg $_has_sudo pkg install -y "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v snap >/dev/null 2>&1; then pkg_with_lock snap $_has_sudo snap install "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; done; if command -v "$_command_name" >/dev/null 2>&1; then case ";$FOUNT_AUTO_INSTALLED_PACKAGES;" in *";$_installed_pkg_name;"*) ;; *) if [ -z "$FOUNT_AUTO_INSTALLED_PACKAGES" ]; then FOUNT_AUTO_INSTALLED_PACKAGES="$_installed_pkg_name"; else FOUNT_AUTO_INSTALLED_PACKAGES="$FOUNT_AUTO_INSTALLED_PACKAGES;$_installed_pkg_name"; fi; ;; esac; export FOUNT_AUTO_INSTALLED_PACKAGES; return 0; else printf "%b\n" "${C_RED}Error: $_command_name installation failed.${C_RESET}" >&2; return 1; fi; }
# END FOUNT_PKG_MGR
install_package "bash" "bash gnu-bash"; install_package "curl"
export FOUNT_AUTO_INSTALLED_PACKAGES
curl -fsSL https://steve02081504.github.io/subfount/install.sh | bash
. "$HOME/.profile"
```

Caso deseje fazer uma pausa (uma simulação):

```bash
# BEGIN FOUNT_PKG_MGR
FOUNT_PKG_STATE_DIR="${FOUNT_PKG_STATE_DIR:-${TMPDIR:-${TEMP:-/tmp}}/fount/package}"; pkg_lock_acquire() { _manager="$1"; _pkg_lock_dir="$FOUNT_PKG_STATE_DIR/$_manager.lock"; mkdir -p "$FOUNT_PKG_STATE_DIR" 2>/dev/null || return 1; _retry_count=0; while ! mkdir "$_pkg_lock_dir" 2>/dev/null; do if [ -f "$_pkg_lock_dir/pid" ]; then _pid=$(cat "$_pkg_lock_dir/pid" 2>/dev/null); if [ -n "$_pid" ] && ! kill -0 "$_pid" 2>/dev/null; then rm -rf "$_pkg_lock_dir"; continue; fi; fi; _retry_count=$((_retry_count + 1)); [ "$_retry_count" -ge $(( ${FOUNT_PKG_LOCK_TIMEOUT:-300} * 10 )) ] && return 1; sleep 0.1 2>/dev/null || sleep 1; done; printf '%s\n' "$$" >"$_pkg_lock_dir/pid"; FOUNT_PKG_LOCK_DIR="$_pkg_lock_dir"; return 0; }; pkg_lock_release() { [ -n "$FOUNT_PKG_LOCK_DIR" ] || return 0; rm -rf "$FOUNT_PKG_LOCK_DIR"; FOUNT_PKG_LOCK_DIR=; }; pkg_with_lock() { _manager="$1"; shift; pkg_lock_acquire "$_manager" || return 1; "$@"; _exit_status=$?; pkg_lock_release; return $_exit_status; }; pkg_db_refresh_needed() { _manager="$1"; _refresh_file="$FOUNT_PKG_STATE_DIR/$_manager.refresh"; [ -f "$_refresh_file" ] || return 0; _now=$(date +%s 2>/dev/null) || return 0; _last=$(cat "$_refresh_file" 2>/dev/null); [ -n "$_last" ] || return 0; [ "$((_now - _last))" -ge "${FOUNT_PKG_REFRESH_INTERVAL:-600}" ]; }; pkg_db_refresh_mark() { _manager="$1"; mkdir -p "$FOUNT_PKG_STATE_DIR" 2>/dev/null || return 1; printf '%s\n' "$(date +%s 2>/dev/null)" >"$FOUNT_PKG_STATE_DIR/$_manager.refresh" 2>/dev/null; }; pkg_refresh() { _manager="$1"; shift; pkg_db_refresh_needed "$_manager" || return 0; pkg_lock_acquire "$_manager" || return 1; if pkg_db_refresh_needed "$_manager"; then if "$@"; then pkg_db_refresh_mark "$_manager"; _exit_status=0; else _exit_status=$?; fi; pkg_lock_release; return $_exit_status; fi; pkg_lock_release; return 0; }; install_package() { _command_name="$1"; _package_list=${2:-$_command_name}; _has_sudo=""; _installed_pkg_name=""; if command -v "$_command_name" >/dev/null 2>&1; then return 0; fi; if [ "$(id -u)" -ne 0 ] && command -v sudo >/dev/null 2>&1; then _has_sudo="sudo"; fi; for _package in $_package_list; do if command -v apt-get >/dev/null 2>&1; then pkg_refresh apt-get $_has_sudo apt-get update -y; pkg_with_lock apt-get $_has_sudo apt-get install -y "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v pacman >/dev/null 2>&1; then pkg_with_lock pacman $_has_sudo pacman -Syu --needed --noconfirm "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v dnf >/dev/null 2>&1; then pkg_refresh dnf $_has_sudo dnf makecache; pkg_with_lock dnf $_has_sudo dnf install -y "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v yum >/dev/null 2>&1; then pkg_refresh yum $_has_sudo yum makecache fast; pkg_with_lock yum $_has_sudo yum install -y "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v zypper >/dev/null 2>&1; then pkg_refresh zypper $_has_sudo zypper refresh; pkg_with_lock zypper $_has_sudo zypper install -y --no-confirm "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v apk >/dev/null 2>&1; then if [ "$(id -u)" -eq 0 ]; then pkg_with_lock apk apk add --update "$_package"; else pkg_with_lock apk $_has_sudo apk add --update "$_package"; fi; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v brew >/dev/null 2>&1; then if ! brew list --formula "$_package" >/dev/null 2>&1; then pkg_with_lock brew brew install "$_package"; fi; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v pkg >/dev/null 2>&1; then pkg_refresh pkg $_has_sudo pkg update -y; pkg_with_lock pkg $_has_sudo pkg install -y "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v snap >/dev/null 2>&1; then pkg_with_lock snap $_has_sudo snap install "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; done; if command -v "$_command_name" >/dev/null 2>&1; then case ";$FOUNT_AUTO_INSTALLED_PACKAGES;" in *";$_installed_pkg_name;"*) ;; *) if [ -z "$FOUNT_AUTO_INSTALLED_PACKAGES" ]; then FOUNT_AUTO_INSTALLED_PACKAGES="$_installed_pkg_name"; else FOUNT_AUTO_INSTALLED_PACKAGES="$FOUNT_AUTO_INSTALLED_PACKAGES;$_installed_pkg_name"; fi; ;; esac; export FOUNT_AUTO_INSTALLED_PACKAGES; return 0; else printf "%b\n" "${C_RED}Error: $_command_name installation failed.${C_RESET}" >&2; return 1; fi; }
# END FOUNT_PKG_MGR
install_package "bash" "bash gnu-bash"; install_package "curl"
export FOUNT_AUTO_INSTALLED_PACKAGES
curl -fsSL https://steve02081504.github.io/subfount/install.sh | bash -s init
. "$HOME/.profile"
```

### Windows: Uma Escolha de Caminhos – _A Própria Simplicidade_

- **Direto e Simples (Recomendado):** Baixe o arquivo `.exe` das [Releases](https://github.com/steve02081504/subfount/releases) e execute-o.

- **O Poder do PowerShell:**

  ```powershell
  # Se necessário, defina a variável de ambiente $env:SUBFOUNT_DIR para especificar o diretório do subfount
  irm https://steve02081504.github.io/subfount/install.ps1 | iex
  ```

  Para uma simulação:

  ```powershell
  $scriptContent = Invoke-RestMethod https://steve02081504.github.io/subfount/install.ps1
  Invoke-Expression "function subfountInstaller { $scriptContent }"
  subfountInstaller init
  ```

### Instalação via Git: Para quem prefere um toque de magia

Se você já tem o Git instalado, abraçar o subfount é tão simples quanto executar um script.

- **Para Windows:** Abra seu prompt de comando ou PowerShell e simplesmente clique duas vezes em `run.bat`.
- **Para Linux/macOS/Android:** Abra seu terminal e execute `./run.sh`.

### Remoção: Uma Despedida Graciosa

```bash
subfount remove
```

## Recursos

- **Participação na infra** — junta-se à rede de sobreposição do fount e participa do encaminhamento de pacotes e das caixas de correio, ajudando a manter a rede saudável.
- **Nó de trabalho do host** — após conectar-se a um host, torna-se um nó auxiliar: o host pode enviar solicitações `run_code` (executar um script arbitrário) e `shell_exec` (executar comandos de shell).
- **Assistência prioritária ao host** — obtém a tabela de reputação do host, confia em seus nós e dá ao host prioridade no suporte à infra.
- **Autônomo ou assistido** — sem host configurado, executa como infra autônoma; com um host, executa a infra e assiste o host.
- **Configuração a quente** — editar `data/config.json` enquanto executa entra em vigor sem reiniciar (o daemon monitora o arquivo).
- **Painel TUI** — um painel de configuração interativo integrado para editar as configurações de conexão, alternar a infra e iniciar/parar o daemon.

## Requisitos

- [Deno](https://deno.com) (instalado automaticamente pelo runner se estiver ausente)
- Node.js/bun (fallback opcional)
- PowerShell (Windows) ou bash (Linux/macOS) para os scripts do runner

## Início rápido

Clone ou baixe este repositório e execute o runner na raiz do repositório:

```sh
# Linux/macOS
./run.sh

# Windows (PowerShell)
.\run.bat
```

Executar sem argumentos inicia o daemon em segundo plano com reinício automático. Abra o painel de configuração com `subfount open` (ou adicione `open` depois de `run.sh`) para configurar hosts.

## Uso

Os principais pontos de entrada são os scripts do runner (`run`, `run.bat`, `run.cmd`, `run.sh`) e o lançador de comandos em `path/` (`subfount`, `subfount.bat`, `subfount.ps1`, `subfount.mjs`).

### Painel de configuração

```sh
subfount open        # ou: run.sh open
```

O painel permite:

- Definir o **ID da sala do host** e a **senha** (deixe vazio para o modo apenas infra)
- Definir opcionalmente o **nodeHash** do host (da API do código de conexão)
- Alternar a **participação na infra** (retransmitir enquanto nenhum host estiver configurado; a política do próprio host conectado tem prioridade)
- Ver o status do daemon (PID, nodeHash, modo, host conectado)
- **Iniciar** / **parar** o daemon

### Executar o daemon diretamente

```sh
subfount                                    # apenas infra (de data/config.json)
subfount <host-room-id> <password> [node-hash]
    # infra + nó de trabalho do host / assistência prioritária (adiciona um host persistente; os outros hosts permanecem conectados)
```

### Outros comandos

| Comando | Descrição |
| --- | --- |
| `subfount open` / `subfount panel` | Abrir o painel de configuração |
| `subfount server` | Executar o daemon em primeiro plano |
| `subfount background keepalive` | Executar o daemon em segundo plano com reinício automático |
| `subfount keepalive` | Executar o daemon com reinício / re-inicialização automática |
| `subfount shutdown` | Parar o daemon corretamente |
| `subfount reboot` | Reiniciar o daemon |
| `subfount version` | Mostrar versão e informações do git |
| `subfount update` | Atualizar subfount e Deno |
| `subfount clean` | Limpar os caches do Deno |
| `subfount remove` | Desinstalar subfount |
| `subfount debug` | Executar com logs de depuração |

## Configuração

O daemon lê `data/config.json`. O painel o edita por você, e você também pode editá-lo manualmente enquanto o daemon está em execução: o daemon monitora o arquivo e aplica as alterações em segundos, sem reiniciar. Cada entrada em `hosts` é uma sessão de host independente; `infra` apenas decide se o daemon continua retransmitindo quando nenhum host está configurado (a política do próprio host conectado tem prioridade).

```json
{
	"hosts": [
		{ "hostRoomId": "<host-room-id>", "password": "<password>", "hostNodeHash": "<node-hash>" }
	],
	"infra": true
}
```

## Arquivos de status

- `data/daemon.pid` — o PID do daemon
- `data/status.json` — status em tempo real gravado pelo daemon (para a visão somente leitura do painel)
- `data/daemon.log` / `data/daemon.err.log` — logs de saída do daemon

## Desenvolvimento

```sh
deno task start     # executar o daemon
deno task panel     # abrir o painel
deno task test      # executar os testes
deno task lint      # lint
deno task check     # verificação de tipos
```
