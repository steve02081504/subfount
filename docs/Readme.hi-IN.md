# subfount

[![fount repo](https://steve02081504.github.io/fount/badges/fount_repo.svg)](https://github.com/steve02081504/fount)

**subfount** एक हल्का क्लाइंट है जो आपके डिवाइस को [fount](https://github.com/steve02081504/fount) नेटवर्क से जोड़ता है।
यह आपकी मशीन पर fount ओवरले इन्फ्रास्ट्रक्चर (`infra`) चलाता है और, होस्ट से कनेक्ट होने पर, एक सहायक नोड बन जाता है जो होस्ट के स्मार्ट एजेंटों को आपके डिवाइस पर कोड चलाने या शेल कमांड निष्पादित करने की अनुमति देता है।

## इंस्टॉलेशन और रिमूवल: एक सुंदर मुलाकात और विदाई

<a id="installation"></a>

### इंस्टॉलेशन: फाउंट को अपनी दुनिया में बुनना – _सहजता से_

फाउंट के साथ अपनी यात्रा शुरू करें, एक स्थिर और विश्वसनीय मंच। कुछ सरल क्लिक या कमांड, और फाउंट की दुनिया खुल जाती है।

> [!CAUTION]
>
> subfount की दुनिया में, आप जिस होस्ट से जुड़ते हैं वह आपके डिवाइस पर मनमाना कोड और शेल कमांड चला सकता है, जिससे उसे शक्तिशाली क्षमताएँ मिलती हैं। इसलिए, कृपया केवल उन्हीं होस्ट से जुड़ें जिन पर आप भरोसा करते हैं, जैसे आप वास्तविक जीवन में सावधानी बरतते हैं, ताकि आपकी स्थानीय फ़ाइलें सुरक्षित रहें।

### लिनक्स/macOS/एंड्रॉइड: शेल की फुसफुसाहटें – _एक पंक्ति, और आप अंदर हैं_

```bash
# यदि आवश्यक हो, तो फाउंट निर्देशिका निर्दिष्ट करने के लिए पर्यावरण चर $SUBFOUNT_DIR को परिभाषित करें
# BEGIN FOUNT_PKG_MGR
FOUNT_PKG_STATE_DIR="${FOUNT_PKG_STATE_DIR:-${TMPDIR:-${TEMP:-/tmp}}/fount/package}"; pkg_lock_acquire() { _manager="$1"; _pkg_lock_dir="$FOUNT_PKG_STATE_DIR/$_manager.lock"; mkdir -p "$FOUNT_PKG_STATE_DIR" 2>/dev/null || return 1; _retry_count=0; while ! mkdir "$_pkg_lock_dir" 2>/dev/null; do if [ -f "$_pkg_lock_dir/pid" ]; then _pid=$(cat "$_pkg_lock_dir/pid" 2>/dev/null); if [ -n "$_pid" ] && ! kill -0 "$_pid" 2>/dev/null; then rm -rf "$_pkg_lock_dir"; continue; fi; fi; _retry_count=$((_retry_count + 1)); [ "$_retry_count" -ge $(( ${FOUNT_PKG_LOCK_TIMEOUT:-300} * 10 )) ] && return 1; sleep 0.1 2>/dev/null || sleep 1; done; printf '%s\n' "$$" >"$_pkg_lock_dir/pid"; FOUNT_PKG_LOCK_DIR="$_pkg_lock_dir"; return 0; }; pkg_lock_release() { [ -n "$FOUNT_PKG_LOCK_DIR" ] || return 0; rm -rf "$FOUNT_PKG_LOCK_DIR"; FOUNT_PKG_LOCK_DIR=; }; pkg_with_lock() { _manager="$1"; shift; pkg_lock_acquire "$_manager" || return 1; "$@"; _exit_status=$?; pkg_lock_release; return $_exit_status; }; pkg_db_refresh_needed() { _manager="$1"; _refresh_file="$FOUNT_PKG_STATE_DIR/$_manager.refresh"; [ -f "$_refresh_file" ] || return 0; _now=$(date +%s 2>/dev/null) || return 0; _last=$(cat "$_refresh_file" 2>/dev/null); [ -n "$_last" ] || return 0; [ "$((_now - _last))" -ge "${FOUNT_PKG_REFRESH_INTERVAL:-600}" ]; }; pkg_db_refresh_mark() { _manager="$1"; mkdir -p "$FOUNT_PKG_STATE_DIR" 2>/dev/null || return 1; printf '%s\n' "$(date +%s 2>/dev/null)" >"$FOUNT_PKG_STATE_DIR/$_manager.refresh" 2>/dev/null; }; pkg_refresh() { _manager="$1"; shift; pkg_db_refresh_needed "$_manager" || return 0; pkg_lock_acquire "$_manager" || return 1; if pkg_db_refresh_needed "$_manager"; then if "$@"; then pkg_db_refresh_mark "$_manager"; _exit_status=0; else _exit_status=$?; fi; pkg_lock_release; return $_exit_status; fi; pkg_lock_release; return 0; }; install_package() { _command_name="$1"; _package_list=${2:-$_command_name}; _has_sudo=""; _installed_pkg_name=""; if command -v "$_command_name" >/dev/null 2>&1; then return 0; fi; if [ "$(id -u)" -ne 0 ] && command -v sudo >/dev/null 2>&1; then _has_sudo="sudo"; fi; for _package in $_package_list; do if command -v apt-get >/dev/null 2>&1; then pkg_refresh apt-get $_has_sudo apt-get update -y; pkg_with_lock apt-get $_has_sudo apt-get install -y "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v pacman >/dev/null 2>&1; then pkg_with_lock pacman $_has_sudo pacman -Syu --needed --noconfirm "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v dnf >/dev/null 2>&1; then pkg_refresh dnf $_has_sudo dnf makecache; pkg_with_lock dnf $_has_sudo dnf install -y "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v yum >/dev/null 2>&1; then pkg_refresh yum $_has_sudo yum makecache fast; pkg_with_lock yum $_has_sudo yum install -y "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v zypper >/dev/null 2>&1; then pkg_refresh zypper $_has_sudo zypper refresh; pkg_with_lock zypper $_has_sudo zypper install -y --no-confirm "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v apk >/dev/null 2>&1; then if [ "$(id -u)" -eq 0 ]; then pkg_with_lock apk apk add --update "$_package"; else pkg_with_lock apk $_has_sudo apk add --update "$_package"; fi; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v brew >/dev/null 2>&1; then if ! brew list --formula "$_package" >/dev/null 2>&1; then pkg_with_lock brew brew install "$_package"; fi; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v pkg >/dev/null 2>&1; then pkg_refresh pkg $_has_sudo pkg update -y; pkg_with_lock pkg $_has_sudo pkg install -y "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v snap >/dev/null 2>&1; then pkg_with_lock snap $_has_sudo snap install "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; done; if command -v "$_command_name" >/dev/null 2>&1; then case ";$FOUNT_AUTO_INSTALLED_PACKAGES;" in *";$_installed_pkg_name;"*) ;; *) if [ -z "$FOUNT_AUTO_INSTALLED_PACKAGES" ]; then FOUNT_AUTO_INSTALLED_PACKAGES="$_installed_pkg_name"; else FOUNT_AUTO_INSTALLED_PACKAGES="$FOUNT_AUTO_INSTALLED_PACKAGES;$_installed_pkg_name"; fi; ;; esac; export FOUNT_AUTO_INSTALLED_PACKAGES; return 0; else printf "%b\n" "${C_RED}Error: $_command_name installation failed.${C_RESET}" >&2; return 1; fi; }
# END FOUNT_PKG_MGR
install_package "bash" "bash gnu-bash"; install_package "curl"
export FOUNT_AUTO_INSTALLED_PACKAGES
curl -fsSL https://steve02081504.github.io/subfount/install.sh | bash
. "$HOME/.profile"
```

यदि आप रुकना चाहते हैं (एक ड्राई रन):

```bash
# BEGIN FOUNT_PKG_MGR
FOUNT_PKG_STATE_DIR="${FOUNT_PKG_STATE_DIR:-${TMPDIR:-${TEMP:-/tmp}}/fount/package}"; pkg_lock_acquire() { _manager="$1"; _pkg_lock_dir="$FOUNT_PKG_STATE_DIR/$_manager.lock"; mkdir -p "$FOUNT_PKG_STATE_DIR" 2>/dev/null || return 1; _retry_count=0; while ! mkdir "$_pkg_lock_dir" 2>/dev/null; do if [ -f "$_pkg_lock_dir/pid" ]; then _pid=$(cat "$_pkg_lock_dir/pid" 2>/dev/null); if [ -n "$_pid" ] && ! kill -0 "$_pid" 2>/dev/null; then rm -rf "$_pkg_lock_dir"; continue; fi; fi; _retry_count=$((_retry_count + 1)); [ "$_retry_count" -ge $(( ${FOUNT_PKG_LOCK_TIMEOUT:-300} * 10 )) ] && return 1; sleep 0.1 2>/dev/null || sleep 1; done; printf '%s\n' "$$" >"$_pkg_lock_dir/pid"; FOUNT_PKG_LOCK_DIR="$_pkg_lock_dir"; return 0; }; pkg_lock_release() { [ -n "$FOUNT_PKG_LOCK_DIR" ] || return 0; rm -rf "$FOUNT_PKG_LOCK_DIR"; FOUNT_PKG_LOCK_DIR=; }; pkg_with_lock() { _manager="$1"; shift; pkg_lock_acquire "$_manager" || return 1; "$@"; _exit_status=$?; pkg_lock_release; return $_exit_status; }; pkg_db_refresh_needed() { _manager="$1"; _refresh_file="$FOUNT_PKG_STATE_DIR/$_manager.refresh"; [ -f "$_refresh_file" ] || return 0; _now=$(date +%s 2>/dev/null) || return 0; _last=$(cat "$_refresh_file" 2>/dev/null); [ -n "$_last" ] || return 0; [ "$((_now - _last))" -ge "${FOUNT_PKG_REFRESH_INTERVAL:-600}" ]; }; pkg_db_refresh_mark() { _manager="$1"; mkdir -p "$FOUNT_PKG_STATE_DIR" 2>/dev/null || return 1; printf '%s\n' "$(date +%s 2>/dev/null)" >"$FOUNT_PKG_STATE_DIR/$_manager.refresh" 2>/dev/null; }; pkg_refresh() { _manager="$1"; shift; pkg_db_refresh_needed "$_manager" || return 0; pkg_lock_acquire "$_manager" || return 1; if pkg_db_refresh_needed "$_manager"; then if "$@"; then pkg_db_refresh_mark "$_manager"; _exit_status=0; else _exit_status=$?; fi; pkg_lock_release; return $_exit_status; fi; pkg_lock_release; return 0; }; install_package() { _command_name="$1"; _package_list=${2:-$_command_name}; _has_sudo=""; _installed_pkg_name=""; if command -v "$_command_name" >/dev/null 2>&1; then return 0; fi; if [ "$(id -u)" -ne 0 ] && command -v sudo >/dev/null 2>&1; then _has_sudo="sudo"; fi; for _package in $_package_list; do if command -v apt-get >/dev/null 2>&1; then pkg_refresh apt-get $_has_sudo apt-get update -y; pkg_with_lock apt-get $_has_sudo apt-get install -y "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v pacman >/dev/null 2>&1; then pkg_with_lock pacman $_has_sudo pacman -Syu --needed --noconfirm "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v dnf >/dev/null 2>&1; then pkg_refresh dnf $_has_sudo dnf makecache; pkg_with_lock dnf $_has_sudo dnf install -y "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v yum >/dev/null 2>&1; then pkg_refresh yum $_has_sudo yum makecache fast; pkg_with_lock yum $_has_sudo yum install -y "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v zypper >/dev/null 2>&1; then pkg_refresh zypper $_has_sudo zypper refresh; pkg_with_lock zypper $_has_sudo zypper install -y --no-confirm "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v apk >/dev/null 2>&1; then if [ "$(id -u)" -eq 0 ]; then pkg_with_lock apk apk add --update "$_package"; else pkg_with_lock apk $_has_sudo apk add --update "$_package"; fi; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v brew >/dev/null 2>&1; then if ! brew list --formula "$_package" >/dev/null 2>&1; then pkg_with_lock brew brew install "$_package"; fi; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v pkg >/dev/null 2>&1; then pkg_refresh pkg $_has_sudo pkg update -y; pkg_with_lock pkg $_has_sudo pkg install -y "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v snap >/dev/null 2>&1; then pkg_with_lock snap $_has_sudo snap install "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; done; if command -v "$_command_name" >/dev/null 2>&1; then case ";$FOUNT_AUTO_INSTALLED_PACKAGES;" in *";$_installed_pkg_name;"*) ;; *) if [ -z "$FOUNT_AUTO_INSTALLED_PACKAGES" ]; then FOUNT_AUTO_INSTALLED_PACKAGES="$_installed_pkg_name"; else FOUNT_AUTO_INSTALLED_PACKAGES="$FOUNT_AUTO_INSTALLED_PACKAGES;$_installed_pkg_name"; fi; ;; esac; export FOUNT_AUTO_INSTALLED_PACKAGES; return 0; else printf "%b\n" "${C_RED}Error: $_command_name installation failed.${C_RESET}" >&2; return 1; fi; }
# END FOUNT_PKG_MGR
install_package "bash" "bash gnu-bash"; install_package "curl"
export FOUNT_AUTO_INSTALLED_PACKAGES
curl -fsSL https://steve02081504.github.io/subfount/install.sh | bash -s init
. "$HOME/.profile"
```

### विंडोज: रास्तों का चुनाव – _सादगी ही सब कुछ है_

- **प्रत्यक्ष और सरल (अनुशंसित):** [रिलीज़](https://github.com/steve02081504/subfount/releases) से `.exe` फ़ाइल डाउनलोड करें और उसे चलाएँ।

- **PowerShell की शक्ति:**

  ```powershell
  # यदि आवश्यक हो, तो फाउंट निर्देशिका निर्दिष्ट करने के लिए पर्यावरण चर $env:SUBFOUNT_DIR को परिभाषित करें
  irm https://steve02081504.github.io/subfount/install.ps1 | iex
  ```

  ड्राई रन के लिए:

  ```powershell
  $scriptContent = Invoke-RestMethod https://steve02081504.github.io/subfount/install.ps1
  Invoke-Expression "function subfountInstaller { $scriptContent }"
  subfountInstaller init
  ```

### गिट इंस्टॉलेशन: उन लोगों के लिए जो जादू का स्पर्श पसंद करते हैं

यदि आपके पास पहले से ही Git स्थापित है, तो फाउंट को अपनाना एक स्क्रिप्ट चलाने जितना ही सरल है।

- **विंडोज के लिए:** अपना कमांड प्रॉम्प्ट या PowerShell खोलें और बस `run.bat` पर डबल-क्लिक करें।
- **लिनक्स/macOS/एंड्रॉइड के लिए:** अपना टर्मिनल खोलें और `./run.sh` निष्पादित करें।

### डॉकर: कंटेनर को अपनाना

```bash
docker pull ghcr.io/steve02081504/subfount
```

### रिमूवल: एक शालीन विदाई

```bash
subfount remove
```

## विशेषताएँ

- **infra भागीदारी** — fount ओवरले नेटवर्क से जुड़ता है और पैकेट फ़ॉरवर्डिंग और मेलबॉक्स में भाग लेता है, जिससे नेटवर्क स्वस्थ बना रहता है।
- **होस्ट वर्कर** — होस्ट से कनेक्ट होने के बाद एक सहायक नोड बन जाता है: होस्ट उसे `run_code` (कोई भी स्क्रिप्ट चलाएँ) और `shell_exec` (शेल कमांड चलाएँ) अनुरोध भेज सकता है।
- **होस्ट प्राथमिकता सहायता** — होस्ट से प्रतिष्ठा तालिका खींचता है, उसके नोड्स पर भरोसा करता है और infra समर्थन में होस्ट को प्राथमिकता देता है।
- **स्टैंडअलोन या सहायक** — बिना होस्ट कॉन्फ़िगर किए स्टैंडअलोन infra के रूप में चलता है; होस्ट के साथ यह infra चलाने के साथ-साथ होस्ट की सहायता भी करता है।
- **हॉट कॉन्फ़िगरेशन** — चलते समय `data/config.json` में संपादन बिना पुनः आरंभ के प्रभावी होता है (डेमॉन फ़ाइल की निगरानी करता है)।
- **TUI पैनल** — कनेक्शन सेटिंग्स संपादित करने, infra टॉगल करने और डेमॉन प्रारंभ/रोकने के लिए एक अंतर्निहित इंटरैक्टिव कॉन्फ़िगरेशन पैनल।

## आवश्यकताएँ

- [Deno](https://deno.com) (अनुपस्थित होने पर runner द्वारा स्वतः इंस्टॉल होता है)
- Node.js/bun (वैकल्पिक फ़ॉलबैक)
- runner स्क्रिप्ट के लिए PowerShell (Windows) या bash (Linux/macOS)

## त्वरित आरंभ

इस रिपॉज़िटरी को क्लोन या डाउनलोड करें, फिर रिपॉज़िटरी के रूट में runner चलाएँ:

```sh
# Linux/macOS
./run.sh

# Windows (PowerShell)
.\run.bat
```

बिना तर्क चलाने पर डेमॉन बैकग्राउंड में स्वतः-पुनःआरंभ के साथ प्रारंभ होता है। होस्ट सेट करने के लिए `subfount open` से कॉन्फ़िगरेशन पैनल खोलें (या `run.sh` के बाद `open` जोड़ें)।

## उपयोग

मुख्य प्रवेश बिंदु runner स्क्रिप्ट (`run`, `run.bat`, `run.cmd`, `run.sh`) और `path/` में कमांड लॉन्चर (`subfount`, `subfount.bat`, `subfount.ps1`, `subfount.mjs`) हैं।

### कॉन्फ़िगरेशन पैनल

```sh
subfount open        # या: run.sh open
```

पैनल आपको अनुमति देता है:

- **होस्ट रूम ID** और **पासवर्ड** सेट करें (केवल infra मोड के लिए खाली छोड़ें)
- वैकल्पिक रूप से होस्ट **nodeHash** सेट करें (कनेक्शन-कोड API से)
- **infra भागीदारी** टॉगल करें (कोई होस्ट कॉन्फ़िगर न होने पर रिले करें; कनेक्टेड होस्ट की अपनी नीति प्राथमिकता लेती है)
- डेमॉन की स्थिति देखें (PID, nodeHash, मोड, कनेक्टेड होस्ट)
- डेमॉन **प्रारंभ** / **रोकें**

### डेमॉन सीधे चलाएँ

```sh
subfount                                    # केवल infra (data/config.json से)
subfount <host-room-id> <password> [node-hash]
    # infra + होस्ट वर्कर / प्राथमिकता सहायता (एक स्थायी होस्ट लिखता है; अन्य होस्ट जुड़े रहते हैं)
```

### अन्य कमांड

| कमांड | विवरण |
| --- | --- |
| `subfount open` / `subfount panel` | कॉन्फ़िगरेशन पैनल खोलें |
| `subfount server` | डेमॉन को अग्रभूमि में चलाएँ |
| `subfount background keepalive` | डेमॉन को बैकग्राउंड में स्वतः पुनः आरंभ के साथ चलाएँ |
| `subfount keepalive` | डेमॉन को स्वतः पुनः आरंभ / पुनः-आरंभिकरण के साथ चलाएँ |
| `subfount shutdown` | डेमॉन को सही ढंग से रोकें |
| `subfount reboot` | डेमॉन पुनः आरंभ करें |
| `subfount version` | संस्करण और git जानकारी दिखाएँ |
| `subfount update` | subfount और Deno अपडेट करें |
| `subfount clean` | Deno कैश साफ़ करें |
| `subfount remove` | subfount अनइंस्टॉल करें |
| `subfount debug` | डिबग लॉगिंग के साथ चलाएँ |

## कॉन्फ़िगरेशन

डेमॉन `data/config.json` पढ़ता है। पैनल इसे आपके लिए संपादित करता है, और जब डेमॉन चल रहा हो तो आप इसे मैन्युअल रूप से भी संपादित कर सकते हैं: डेमॉन फ़ाइल पर नज़र रखता है और बिना पुनःआरंभ के कुछ सेकंड में बदलाव लागू कर देता है। `hosts` में प्रत्येक प्रविष्टि एक स्वतंत्र होस्ट सत्र है; `infra` केवल यह तय करता है कि कोई होस्ट कॉन्फ़िगर न होने पर डेमॉन रिले करता रहेगा या नहीं (कनेक्टेड होस्ट की अपनी नीति प्राथमिकता लेती है)।

```json
{
	"hosts": [
		{ "hostRoomId": "<host-room-id>", "password": "<password>", "hostNodeHash": "<node-hash>" }
	],
	"infra": true
}
```

## स्थिति फ़ाइलें

- `data/daemon.pid` — डेमॉन का PID
- `data/status.json` — डेमॉन द्वारा लिखी गई लाइव स्थिति (पैनल के केवल-पठन दृश्य के लिए)
- `data/daemon.log` / `data/daemon.err.log` — डेमॉन आउटपुट लॉग

## विकास

```sh
deno task start     # डेमॉन चलाएँ
deno task panel     # पैनल खोलें
deno task test      # परीक्षण चलाएँ
deno task lint      # लिंट
deno task check     # टाइप-जाँच
```
