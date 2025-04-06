const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const imagesDir = path.join(__dirname, '../images');

// 压缩头像图片
async function compressAvatarImages() {
  const avatarFiles = ['avatar1.png', 'avatar2.png', 'avatar3.png', 'avatar4.png', 'avatar5.png'];
  
  for (const file of avatarFiles) {
    const inputPath = path.join(imagesDir, file);
    const outputPath = path.join(imagesDir, `compressed_${file}`);
    
    try {
      await sharp(inputPath)
        .resize(100, 100) // 限制最大尺寸
        .jpeg({ quality: 80 }) // 降低质量
        .toFile(outputPath);
      
      // 替换原文件
      fs.unlinkSync(inputPath);
      fs.renameSync(outputPath, inputPath);
      
      console.log(`Successfully compressed ${file}`);
    } catch (error) {
      console.error(`Error compressing ${file}:`, error);
    }
  }
}

// 将SVG转换为PNG
async function convertSVGtoPNG() {
  const svgFiles = [
    { name: 'home', size: 24 },
    { name: 'home-active', size: 24 },
    { name: 'salary', size: 24 },
    { name: 'salary-active', size: 24 },
    { name: 'analysis', size: 24 },
    { name: 'analysis-active', size: 24 },
    { name: 'ranking', size: 24 },
    { name: 'ranking-active', size: 24 },
    { name: 'profile', size: 24 },
    { name: 'profile-active', size: 24 }
  ];
  
  for (const file of svgFiles) {
    const inputPath = path.join(imagesDir, `${file.name}.svg`);
    const outputPath = path.join(imagesDir, `${file.name}.png`);
    
    try {
      await sharp(inputPath)
        .resize(file.size, file.size)
        .png()
        .toFile(outputPath);
      
      console.log(`Successfully converted ${file.name}.svg to PNG`);
    } catch (error) {
      console.error(`Error converting ${file.name}.svg:`, error);
    }
  }
}

// 执行优化
async function optimizeImages() {
  try {
    await compressAvatarImages();
    await convertSVGtoPNG();
    console.log('All images optimized successfully!');
  } catch (error) {
    console.error('Error during optimization:', error);
  }
}

optimizeImages(); 