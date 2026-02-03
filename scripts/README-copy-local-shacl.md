# Using Local SHACL Files for Development

## Overview

For development purposes, you may want to use local SHACL files instead of fetching them from remote URLs. This allows you to test changes to SHACL shapes without needing to push them to a repository first.

## How it Works

The SHACL Validator can load files from either:
1. **Remote URLs** (e.g., `https://raw.githubusercontent.com/...`)
2. **Local files** in the `public/` directory (e.g., `shacl/local/dcat-ap-es/1.0.0/...`)

When a file path in `mqa-config.json` doesn't start with `http`, the validator treats it as a path relative to the `public/` directory.

## Setup Steps

### 1. Copy Local SHACL Files

Run the provided script to copy your local SHACL files to the public directory:

```bash
cd /mnt/v/github/shacl-validator
./scripts/copy-local-shacl.sh
```

**Important:** Before running, update the `SOURCE_DIR` variable in the script to point to your local DCAT-AP-ES repository:

```bash
# Edit this line in scripts/copy-local-shacl.sh
SOURCE_DIR="/mnt/v/neoris/dcat-ap-es/DCAT-AP-ES/shacl/1.0.0"
```

### 2. Use the Local Development Profile

In the profile selector, choose the version **"1.0.0-local"** which is configured to use local files:

- **Profile:** DCAT-AP-ES
- **Version:** 1.0.0-local (Local Dev)
- **Icon:** 🛠️ (wrench emoji)

This version is specifically configured in `mqa-config.json` to load files from `public/shacl/local/dcat-ap-es/1.0.0/`.

### 3. Refresh After Changes

If you modify local SHACL files:

1. Re-run the copy script: `./scripts/copy-local-shacl.sh`
2. Restart the dev server: `npm run dev`
3. Hard refresh the browser (Ctrl+Shift+R)

The validator caches SHACL shapes, so a hard refresh ensures the latest files are loaded.

## Adding More Local Profiles

To add local versions for other profiles (HVD, NTI-RISP, etc.):

1. **Copy the files** to `public/shacl/local/[profile]/[version]/`
2. **Update `mqa-config.json`** to add a new version entry:

```json
{
  "profiles": {
    "dcat_ap_es_hvd": {
      "versions": {
        "1.0.0-local": {
          "name": "DCAT-AP-ES HVD (Local Dev)",
          "url": "https://datosgobes.github.io/DCAT-AP-ES/",
          "icon": "🛠️",
          "shaclFiles": [
            "shacl/local/dcat-ap-es-hvd/1.0.0/shacl_imports.ttl",
            "shacl/local/dcat-ap-es-hvd/1.0.0/shacl_common_shapes.ttl",
            ...
          ]
        }
      }
    }
  }
}
```

## Production Builds

⚠️ **Important:** Local files in `public/shacl/local/` are **not** committed to git (excluded via `.gitignore`).

For production deployments:
- Use remote URLs in the main versions (1.0.0, 2013, etc.)
- The `-local` versions are for development only

## Troubleshooting

### Files not loading

Check the browser console for 404 errors. Common issues:

- **Wrong path:** Ensure paths in `mqa-config.json` are relative (no leading `/`)
- **Files not copied:** Re-run `./scripts/copy-local-shacl.sh`
- **Cache issues:** Hard refresh the browser

### SHACL parsing errors

If you see validation errors after switching to local files:

1. Verify the files were copied correctly: `ls -la public/shacl/local/dcat-ap-es/1.0.0/`
2. Check file permissions (should be readable)
3. Ensure files are valid Turtle syntax

## File Structure

```
shacl-validator/
├── public/
│   └── shacl/
│       └── local/              # Git-ignored, development only
│           └── dcat-ap-es/
│               └── 1.0.0/
│                   ├── shacl_imports.ttl
│                   ├── shacl_mdr_imports.ttl
│                   ├── shacl_mdr-vocabularies.shape.ttl
│                   ├── shacl_common_shapes.ttl
│                   ├── shacl_catalog_shape.ttl
│                   ├── shacl_dataservice_shape.ttl
│                   ├── shacl_dataset_shape.ttl
│                   └── shacl_distribution_shape.ttl
├── scripts/
│   ├── copy-local-shacl.sh     # Script to copy local SHACL files
│   └── README-local-shacl.md   # This file
└── src/
    └── config/
        └── mqa-config.json     # Configuration with local profile
```
