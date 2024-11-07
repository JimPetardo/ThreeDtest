# Export-ProjectTreeAscii.ps1
# Descrizione: Esporta l'albero di file e cartelle di un progetto in un file di testo, escludendo cartelle specificate dall'utente.

param (
    [string]$Path = ".",                      # Percorso di partenza (default: directory corrente)
    [string]$Output = "AlberoProgetto.txt"    # Nome del file di output
)

# Verifica se il percorso esiste
if (!(Test-Path -Path $Path)) {
    Write-Error "Il percorso specificato non esiste: $Path"
    exit
}

# Funzione per ottenere le cartelle da escludere
function Get-ExcludedFolders {
    $excludedFolders = @()

    Write-Host "Vuoi escludere alcune cartelle dalla generazione dell'albero? (S/N)"
    $response = Read-Host

    if ($response -match '^[Ss]$') {
        while ($true) {
            $folder = Read-Host "Inserisci il nome della cartella da escludere (o lascia vuoto per terminare)"
            if ([string]::IsNullOrWhiteSpace($folder)) {
                break
            }
            $excludedFolders += $folder.Trim()
        }
    }

    return $excludedFolders
}

# Funzione ricorsiva per costruire l'albero
function Get-Tree {
    param (
        [System.IO.DirectoryInfo]$Directory,
        [string]$Indent = "",
        [string[]]$ExcludedFolders
    )

    # Ottiene tutti gli elementi nella directory corrente, ordinati per cartelle e poi per file
    $children = Get-ChildItem -Path $Directory.FullName | Sort-Object PSIsContainer, Name

    # Filtra le cartelle escluse
    if ($ExcludedFolders.Count -gt 0) {
        $children = $children | Where-Object {
            if ($_.PSIsContainer) {
                return -not ($ExcludedFolders -contains $_.Name)
            }
            else {
                return $true
            }
        }
    }

    $count = $children.Count
    $i = 0

    foreach ($child in $children) {
        $i++
        # Determina se è l'ultimo elemento per gestire i connettori dell'albero
        if ($i -eq $count) {
            $prefix = "$Indent`+--"
            $newIndent = "$Indent    "
        }
        else {
            $prefix = "$Indent|--"
            $newIndent = "$Indent|   "
        }

        # Aggiunge il nome dell'elemento all'albero
        Write-Output "$prefix$($child.Name)"

        # Se l'elemento è una cartella, chiama ricorsivamente la funzione
        if ($child.PSIsContainer) {
            Get-Tree -Directory $child -Indent $newIndent -ExcludedFolders $ExcludedFolders
        }
    }
}

# Ottiene le cartelle da escludere dall'utente
$excludedFolders = Get-ExcludedFolders

# Ottiene l'oggetto DirectoryInfo della directory root
$root = Get-Item -Path $Path

# Inizializza l'array che conterrà l'albero
$tree = @()
$tree += $root.Name
$tree += Get-Tree -Directory $root -ExcludedFolders $excludedFolders

# Scrive l'albero nel file di output
$tree | Out-File -FilePath $Output -Encoding UTF8

# Messaggio di conferma
Write-Output "Albero del progetto esportato in '$Output'"
