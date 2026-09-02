function script:cmd_update {
	require_mid
	$target = @($args | Select-Object -Skip 1)[0]
	if ($target) {
		subfount_update_to_ref $target
	}
	else {
		update_subfount_and_deno
	}
}
