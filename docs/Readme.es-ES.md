# subfount

[![fount repo](https://steve02081504.github.io/fount/badges/fount_repo.svg)](https://github.com/steve02081504/fount)

**subfount** es un cliente ligero que conecta tu dispositivo a la red de [fount](https://github.com/steve02081504/fount).
Ejecuta la infraestructura de superposición (`infra`) de fount en tu máquina y, una vez conectado a un host, actúa como un nodo auxiliar que permite a los agentes inteligentes del host ejecutar código o comandos de shell en tu dispositivo.

## Características

- **Participación en infra** — se une a la red de superposición de fount y participa en el reenvío de paquetes y buzones, ayudando a mantener la red saludable.
- **Nodo de trabajo del host** — tras conectarse a un host, se convierte en un nodo auxiliar: el host puede enviarle peticiones `run_code` (ejecutar un script arbitrario) y `shell_exec` (ejecutar comandos de shell).
- **Asistencia prioritaria al host** — obtiene la tabla de reputación del host, confía en sus nodos y da prioridad al host en el soporte infra.
- **Autónomo o asistido** — sin host configurado funciona como infra autónoma; con un host, ejecuta infra y además asiste al host.
- **Configuración en caliente** — editar `data/config.json` mientras se ejecuta surte efecto sin reiniciar (el daemon vigila el archivo).
- **Panel TUI** — un panel de configuración interactivo integrado para editar los ajustes de conexión, alternar infra y arrancar/parar el daemon.

## Requisitos

- [Deno](https://deno.com) (instalado automáticamente por el runner si falta)
- Node.js/bun (respaldo opcional)
- PowerShell (Windows) o bash (Linux/macOS) para los scripts runner

## Inicio rápido

Clona o descarga este repositorio y ejecuta el runner en la raíz del repositorio:

```sh
# Linux/macOS
./run.sh

# Windows (PowerShell)
.\run.bat
```

Ejecutarlo sin argumentos abre el panel de configuración y arranca el daemon en segundo plano.

## Uso

Los puntos de entrada principales son los scripts runner (`run`, `run.bat`, `run.cmd`, `run.sh`) y el lanzador de comandos en `path/` (`subfount`, `subfount.bat`, `subfount.ps1`, `subfount.mjs`).

### Panel de configuración

```sh
subfount open        # o: run.sh (sin argumentos)
```

El panel te permite:

- Establecer el **ID de sala del host** y la **contraseña** (déjalo vacío para el modo solo infra)
- Establecer opcionalmente el **nodeHash** del host (desde la API del código de conexión)
- Alternar la **participación en infra**
- Ver el estado del daemon (PID, nodeHash, modo, host conectado)
- **Arrancar** / **parar** el daemon

### Ejecutar el daemon directamente

```sh
subfount                                    # solo infra (desde data/config.json)
subfount <host-room-id> <password> [node-hash]
    # infra + nodo de trabajo del host / asistencia prioritaria (puntual, no persistente)
```

### Otros comandos

| Comando | Descripción |
| --- | --- |
| `subfount open` / `subfount panel` | Abrir el panel de configuración |
| `subfount server` | Ejecutar el daemon en primer plano |
| `subfount background keepalive` | Ejecutar el daemon en segundo plano con reinicio automático |
| `subfount keepalive` | Ejecutar el daemon con reinicio / re-inicialización automática |
| `subfount shutdown` | Detener el daemon limpiamente |
| `subfount reboot` | Reiniciar el daemon |
| `subfount version` | Mostrar versión e información de git |
| `subfount update` | Actualizar subfount y Deno |
| `subfount clean` | Limpiar las cachés de Deno |
| `subfount remove` | Desinstalar subfount |
| `subfount debug` | Ejecutar con registros de depuración |

## Configuración

El daemon lee `data/config.json`. El panel lo edita por ti, y también puedes editarlo manualmente mientras el daemon está en marcha (se aplica en el siguiente intento de conexión).

```json
{
	"hostRoomId": null,
	"password": null,
	"hostNodeHash": null,
	"infra": true
}
```

## Archivos de estado

- `data/daemon.pid` — el PID del daemon
- `data/status.json` — estado en vivo escrito por el daemon (para la vista de solo lectura del panel)
- `data/daemon.log` / `data/daemon.err.log` — registros de salida del daemon

## Desarrollo

```sh
deno task start     # ejecutar el daemon
deno task panel     # abrir el panel
deno task test      # ejecutar las pruebas
deno task lint      # lint
deno task check     # verificación de tipos
```
