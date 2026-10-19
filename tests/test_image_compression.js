const { chromium } = require('@playwright/test');
const assert = require('assert');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  await page.setContent('<!DOCTYPE html><html><body><h1>Image Test</h1></body></html>');
  await page.addScriptTag({ path: path.resolve(__dirname, '../utils.js') });

  const result = await page.evaluate(async () => {
    // Generate a 1200x1200 test canvas image
    const testCanvas = document.createElement('canvas');
    testCanvas.width = 1200;
    testCanvas.height = 1200;
    const ctx = testCanvas.getContext('2d');
    ctx.fillStyle = '#ff5722';
    ctx.fillRect(0, 0, 1200, 1200);
    ctx.fillStyle = '#2196f3';
    ctx.fillRect(200, 200, 800, 800);
    const uncompressedData = testCanvas.toDataURL('image/png');

    // Test compressImage with dataURL
    const compressedFromDataUrl = await window.utils.compressImage(uncompressedData, 800, 800, 0.65);
    
    // Test compressImage with Blob
    const response = await fetch(uncompressedData);
    const blob = await response.blob();
    const compressedFromBlob = await window.utils.compressImage(blob, 800, 800, 0.65);

    return {
      uncompressedLength: uncompressedData.length,
      compressedFromDataUrlLength: compressedFromDataUrl.length,
      isWebP: compressedFromDataUrl.startsWith('data:image/webp'),
      blobSuccess: compressedFromBlob.startsWith('data:image/webp'),
      blobLength: compressedFromBlob.length
    };
  });

  console.log('Compression results:', result);
  assert.strictEqual(result.isWebP, true, 'Output should be WebP format');
  assert.strictEqual(result.blobSuccess, true, 'Blob input should produce WebP output');
  assert(result.compressedFromDataUrlLength < result.uncompressedLength, 'Compressed size must be smaller than uncompressed size');
  
  console.log('All image compression tests PASSED successfully!');
  await browser.close();
})();
