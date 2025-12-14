const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '../public');
const distPublicDir = path.join(__dirname, '../dist/public');

if (fs.existsSync(publicDir)) {
  // Crear directorio dist/public si no existe
  if (!fs.existsSync(distPublicDir)) {
    fs.mkdirSync(distPublicDir, { recursive: true });
  }

  // Copiar todos los archivos de public a dist/public
  const files = fs.readdirSync(publicDir);
  files.forEach(file => {
    const srcPath = path.join(publicDir, file);
    const destPath = path.join(distPublicDir, file);
    
    if (fs.statSync(srcPath).isFile()) {
      fs.copyFileSync(srcPath, destPath);
      console.log(`Copiado: ${file}`);
    }
  });
  console.log('Archivos estáticos copiados exitosamente');
} else {
  console.log('Directorio public no encontrado, omitiendo copia');
}
