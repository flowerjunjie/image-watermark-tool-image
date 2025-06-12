## Image Watermark Tool

Image Watermark Tool is an open-source project that allows users to add watermarks to their images (such as ID cards, driver's licenses, passports, etc.) on their local devices without any network connection. It also features easy one-click website deployment functionality.

👉 [Try Online](https://watermark.aicompasspro.com)

[简体中文](https://github.com/unilei/image-watermark-tool/blob/master/README.md) | English

### Quick Start

### Deploy on Vercel
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/unilei/image-watermark-tool.git&project-name=image-watermark-tool&repository-name=image-watermark-tool)

### Manually Deploy on Vercel
```
1. Fork this project
2. On the [Vercel] website, click [New Project]
3. Click [Import Git Repository] and select your forked project, then click [import]
4. Click [Deploy] and wait for the deployment to complete
```

### 1. Clone the Project

```bash
git clone https://github.com/unilei/image-watermark-tool.git
```

### 2. Install Dependencies
```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install
```

### 3. Run in the Browser

```bash
# npm
npm run dev

# pnpm
pnpm run dev

# yarn
yarn dev
```

### 4. Open in Browser [http://localhost:3001](http://localhost:3001)
![success_deploy.jpg](https://www.aicompasspro.com/api/imghosting/file/b9e193a2375d8122c95af.png)

## Standalone Version Packaging Guide

The Image Watermark Tool provides a standalone version (standalone-app.html) that integrates all functionality without relying on external resources. This is the preferred version for building desktop applications.

### Packaging Steps

1. **Prepare Environment**

   Make sure all dependencies are installed:
   ```bash
   npm install
   ```

2. **Build Application**

   Package the application using:
   ```bash
   npm run electron:build
   ```

3. **Fix Resource Paths**

   After packaging, run the fix script to ensure resources load correctly:
   ```bash
   # Full fix (recommended)
   fix-app.bat

   # Or use quick fix
   quick-fix.bat
   ```

4. **Launch Application**

   After packaging and fixing, find the application at:
   ```
   dist_electron\Image Watermark Tool-win32-x64\Image Watermark Tool.exe
   ```

### Troubleshooting Guide

1. **Resource Path Issues**

   - **Problem**: Packaged application may not find resource files, causing blank interface or functionality issues
   - **Solution**: Always run the `fix-app.bat` script after packaging, which automatically copies required resource files

2. **Blank Interface After Packaging**

   - **Problem**: Application starts with a blank interface after packaging
   - **Solution**: 
     - Ensure `standalone-app.html` file is correctly copied to the application directory
     - Check if the main process correctly loads the standalone HTML file
     - Use the `fix-app.bat` script to fix resource paths

3. **Dependency Issues**

   - **Problem**: Some dependencies may be lost or incompatible during packaging
   - **Solution**: Ensure correct dependency versions in `package.json`, manually copy critical dependencies from `node_modules` if necessary

4. **Missing Files**

   - **Problem**: Critical files like `electron/main.js` missing after packaging
   - **Solution**: Run the `fix-app.bat` script, which automatically copies all necessary files

### Recommended Packaging Workflow

To ensure successful packaging and avoid common issues, follow this workflow:

1. Clean old build files:
   ```bash
   rd /s /q dist_electron
   ```

2. Run build command:
   ```bash
   npm run electron:build
   ```

3. Run fix script:
   ```bash
   fix-app.bat
   ```

4. Test if the application runs correctly:
   ```
   dist_electron\Image Watermark Tool-win32-x64\Image Watermark Tool.exe
   ```

### How to Deploy to Your Own Server? 
See NUXT.JS Packaging and Deployment Documentation:
[Deployment Documentation](https://nuxt.com/docs/getting-started/deployment)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.