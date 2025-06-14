## Image Watermark Tool

Image Watermark Tool is an open-source project that allows users to add watermarks to images (such as ID photos, driver's licenses, passports, etc.) on local devices without requiring an internet connection. It also features one-click website deployment functionality.

👉 [Online Demo](https://watermark.aicompasspro.com)

English | [简体中文](https://github.com/unilei/image-watermark-tool/blob/master/README.md)

### Latest Features

- **Top Menu Bar**: Added File, Edit, View, and Help menus for quick access to common functions
- **Detailed Help Documentation**: Access complete user guide through the Help menu or the question mark button
- **Image Background Color Switching**: Support for multiple eye-friendly background colors to reduce eye strain
- **Batch Processing Optimization**: Improved performance and stability for batch processing with "Processing..." progress indicator
- **Interface Optimization**: More compact layout and better visual experience
- **Default Watermark Size Optimization**: Adjusted default watermark text size to 36px for better visibility
- **Original Format Preservation**: Batch download preserves original image formats without conversion

### Quick Start

### Deploy on Vercel
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/unilei/image-watermark-tool.git&project-name=image-watermark-tool&repository-name=image-watermark-tool)

### Manual Deployment on Vercel
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

### 3. Run in Browser

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

Image Watermark Tool provides a standalone version (standalone-app.html) that integrates all features without depending on external resources, making it the preferred version for building desktop applications.

### Packaging Steps

1. **Prepare Environment**

   Ensure all dependencies are installed:
   ```bash
   npm install
   ```

2. **Build Application**

   Use the following command to package the application:
   ```bash
   npm run electron:build
   ```

3. **Fix Resource Paths**

   After packaging, run the fix script to ensure resources load correctly:
   ```bash
   # Complete fix (recommended)
   fix-app.bat

   # Or use quick fix
   quick-fix.bat
   ```

4. **Launch Application**

   After packaging and fixing, you can find the application at:
   ```
   dist_electron\Image Watermark Tool-win32-x64\Image Watermark Tool.exe
   ```

### Key Features

1. **Multiple Watermark Types**
   - Text Watermark: Custom text, font size, color, and transparency
   - Tiled Watermark: Text covers the entire image in a tiled pattern
   - Image Watermark: Upload custom images as watermarks

2. **Flexible Watermark Settings**
   - Freely drag to adjust watermark position
   - Adjust watermark transparency
   - Set watermark rotation angle
   - Customize watermark color

3. **Batch Processing**
   - Support for uploading and processing multiple images
   - Preserve folder structure
   - Batch export as ZIP archive

4. **Eye Protection Mode**
   - Multiple background color options
   - Reduce eye strain
   - Suitable for extended use

5. **Local Processing**
   - All processing done locally
   - No images uploaded to servers
   - Protects user privacy

### Troubleshooting Guide

1. **Resource Path Issues**

   - **Problem**: After packaging, the application may not find resource files, resulting in blank interfaces or non-functioning features
   - **Solution**: Always run the `fix-app.bat` script after packaging, which automatically copies necessary resource files

2. **Blank Interface After Packaging**

   - **Problem**: After packaging, launching the application shows a blank interface with no content
   - **Solution**: 
     - Ensure the `standalone-app.html` file is correctly copied to the application directory
     - Check if the main process is correctly loading the standalone HTML file
     - Use the `fix-app.bat` script to fix resource paths

3. **Dependency Issues**

   - **Problem**: Some dependencies may be lost or incompatible during packaging
   - **Solution**: Ensure dependency versions in `package.json` are correct, and manually copy critical dependencies from `node_modules` if necessary

4. **Missing Files**

   - **Problem**: Critical files like `electron/main.js` missing after packaging
   - **Solution**: Run the `fix-app.bat` script, which automatically copies all necessary files

### Recommended Packaging Workflow

To ensure successful packaging and avoid common issues, follow this workflow:

1. Clean old build files:
   ```bash
   rd /s /q dist_electron
   ```

2. Execute build command:
   ```bash
   npm run electron:build
   ```

3. Run fix script:
   ```bash
   fix-app.bat
   ```

4. Test if the application runs properly:
   ```
   dist_electron\Image Watermark Tool-win32-x64\Image Watermark Tool.exe
   ```

### Standalone Version User Guide

The standalone version (standalone-app.html) provides complete watermarking functionality, including:

1. **Upload Images**: Click the "Upload Image" button or drag and drop images to the preview area

2. **Add Watermark**:
   - Text Watermark: Enter watermark text, set font size, color, and transparency
   - Position Adjustment: Directly drag to adjust watermark position, or use sliders to control horizontal and vertical offset
   - Rotation Angle: Adjust watermark rotation angle

3. **Export Images**:
   - In the desktop version, click the "Save Image" button to save to local storage
   - Watermark processing is done locally, images are not uploaded to any server

4. **Other Features**:
   - Adjust watermark transparency
   - Set watermark text color
   - Set watermark size and angle

### FAQ

1. **What's the difference between standalone version and web version?**
   - The standalone version (standalone-app.html) integrates all resources and doesn't require internet connection
   - The web version needs to load external resources but has the same functionality

2. **How to modify default watermark text?**
   - Open the `standalone-app.html` file and find the default watermark text setting section

3. **How to optimize the packaged application size?**
   - Use `electron-builder` configuration options to reduce package size
   - Remove unnecessary dependencies and resource files

4. **How to update a packaged application?**
   - Modify source code and re-execute the packaging process
   - Remember to update the version number (in `package.json`)

## Contact & Support

- **Author Email**: [flowerjunjienew@gmail.com](mailto:flowerjunjienew@gmail.com)
- **GitHub Repository**: [https://github.com/flowerjunjie/image-watermark-tool-image](https://github.com/flowerjunjie/image-watermark-tool-image)

## Contribution

Pull requests and issues are welcome.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.