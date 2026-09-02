#!/usr/bin/env bash
set_title "𝓈𝓊𝒷𝒻𝓸𝓊𝓃𝓉"
write_taskbar_progress 0
run shutdown || true
write_taskbar_progress 5
run_deno clean || true
write_taskbar_progress 15
get_i18n 'remove.removing.subfount.main'
