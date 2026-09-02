Set-Title "𝓈𝓊𝒷𝒻𝓸𝓊𝓃𝓉"
Write-TaskbarProgress -Percent 0
run shutdown
Write-TaskbarProgress -Percent 5
deno clean
Write-TaskbarProgress -Percent 15
Write-Host (Get-I18n -key 'remove.removing.subfount.main')
