# subfount

[![fount repo](https://steve02081504.github.io/fount/badges/fount_repo.svg)](https://github.com/steve02081504/fount)

**subfount** é um cliente leve que conecta o seu dispositivo à rede do [fount](https://github.com/steve02081504/fount).
Ele executa a infraestrutura de sobreposição (`infra`) do fount na sua máquina e, uma vez conectado a um host, age como um nó auxiliar que permite aos agentes inteligentes do host executar código ou comandos de shell no seu dispositivo.

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

Executar sem argumentos abre o painel de configuração e inicia o daemon em segundo plano.

## Uso

Os principais pontos de entrada são os scripts do runner (`run`, `run.bat`, `run.cmd`, `run.sh`) e o lançador de comandos em `path/` (`subfount`, `subfount.bat`, `subfount.ps1`, `subfount.mjs`).

### Painel de configuração

```sh
subfount open        # ou: run.sh (sem argumentos)
```

O painel permite:

- Definir o **ID da sala do host** e a **senha** (deixe vazio para o modo apenas infra)
- Definir opcionalmente o **nodeHash** do host (da API do código de conexão)
- Alternar a **participação na infra**
- Ver o status do daemon (PID, nodeHash, modo, host conectado)
- **Iniciar** / **parar** o daemon

### Executar o daemon diretamente

```sh
subfount                                    # apenas infra (de data/config.json)
subfount <host-room-id> <password> [node-hash]
    # infra + nó de trabalho do host / assistência prioritária (pontual, não persistente)
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

O daemon lê `data/config.json`. O painel o edita por você, e você também pode editá-lo manualmente enquanto o daemon está em execução (é aplicado na próxima tentativa de conexão).

```json
{
	"hostRoomId": null,
	"password": null,
	"hostNodeHash": null,
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
