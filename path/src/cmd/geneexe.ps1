function script:cmd_geneexe {
	require_mid
	subfount_first_install_if_needed @args
	require win/subfount_exe
	New-SubfountExe $args[1]
}
