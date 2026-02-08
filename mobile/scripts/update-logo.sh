#!/bin/bash
# Script para actualizar logo.png desde el PDF del logo
# Uso: ./scripts/update-logo.sh [ruta-al-pdf]

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ASSETS_DIR="$(cd "$SCRIPT_DIR/../assets" && pwd)"

# Buscar el PDF
PDF_SOURCE="${1:-}"
if [ -z "$PDF_SOURCE" ]; then
  # Probar rutas comunes
  for path in "$HOME/Desktop/logo soldeser ALTA.pdf" "$ASSETS_DIR/logo-soldeser.pdf"; do
    if [ -f "$path" ]; then
      PDF_SOURCE="$path"
      break
    fi
  done
fi

if [ -z "$PDF_SOURCE" ] || [ ! -f "$PDF_SOURCE" ]; then
  echo "Error: No se encontró el PDF del logo."
  echo "Uso: $0 [ruta-al-pdf]"
  echo "Ejemplo: $0 ~/Desktop/logo\\ soldeser\\ ALTA.pdf"
  exit 1
fi

echo "Convirtiendo: $PDF_SOURCE"
TMP_OUT="/tmp/soldeser-logo-$$"
mkdir -p "$TMP_OUT"

# En macOS: qlmanage convierte PDF a PNG
if [[ "$OSTYPE" == "darwin"* ]]; then
  qlmanage -t -s 1024 -o "$TMP_OUT" "$PDF_SOURCE" 2>/dev/null || true
  GENERATED=$(find "$TMP_OUT" -name "*.png" 2>/dev/null | head -1)
  if [ -n "$GENERATED" ]; then
    cp "$GENERATED" "$ASSETS_DIR/logo.png"
    rm -rf "$TMP_OUT"
    echo "✓ Logo actualizado en $ASSETS_DIR/logo.png"
  else
    echo "qlmanage falló. Por favor exporta el PDF manualmente:"
    echo "  1. Abre '$PDF_SOURCE' en Vista Previa"
    echo "  2. Archivo → Exportar como PNG"
    echo "  3. Guarda en $ASSETS_DIR/logo.png"
    exit 1
  fi
else
  echo "En Linux/Windows, exporta el PDF manualmente a PNG"
  echo "y guarda como $ASSETS_DIR/logo.png"
  exit 1
fi
