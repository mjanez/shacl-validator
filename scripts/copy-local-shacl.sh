#!/bin/bash

# Script to copy local SHACL files to public directory for development
# Usage: ./scripts/copy-local-shacl.sh

set -e

# Source directory (local DCAT-AP-ES repository)
SOURCE_DIR="/my/path/dcat-ap-es/DCAT-AP-ES/shacl/1.0.0"

# Destination directory (public folder)
DEST_DIR="./public/shacl/local/dcat-ap-es/1.0.0"

if [ ! -d "$SOURCE_DIR" ]; then
  echo "Error: Source directory not found: $SOURCE_DIR"
  echo "Please update the SOURCE_DIR variable in this script to point to your local DCAT-AP-ES repository"
  exit 1
fi

mkdir -p "$DEST_DIR"

echo "Copying SHACL files from local repository..."
cp -v "$SOURCE_DIR/shacl_imports.ttl" "$DEST_DIR/"
cp -v "$SOURCE_DIR/shacl_mdr_imports.ttl" "$DEST_DIR/"
cp -v "$SOURCE_DIR/shacl_mdr-vocabularies.shape.ttl" "$DEST_DIR/"
cp -v "$SOURCE_DIR/shacl_common_shapes.ttl" "$DEST_DIR/"
cp -v "$SOURCE_DIR/shacl_catalog_shape.ttl" "$DEST_DIR/"
cp -v "$SOURCE_DIR/shacl_dataservice_shape.ttl" "$DEST_DIR/"
cp -v "$SOURCE_DIR/shacl_dataset_shape.ttl" "$DEST_DIR/"
cp -v "$SOURCE_DIR/shacl_distribution_shape.ttl" "$DEST_DIR/"

echo "SHACL files copied successfully to $DEST_DIR"
echo ""
echo "You can now use these files in your mqa-config.json by setting:"
echo '  "shaclFiles": ['
echo '    "shacl/local/dcat-ap-es/1.0.0/shacl_imports.ttl",'
echo '    "shacl/local/dcat-ap-es/1.0.0/shacl_mdr_imports.ttl",'
echo '    ...'
echo '  ]'
