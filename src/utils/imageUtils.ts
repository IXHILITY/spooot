export async function compressMealPhotoToBase64(
  file: File,
  _maxDimension = 280,
  _quality = 0.5
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Не удалось прочитать файл изображения'));

    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Повреждённое изображение'));

      img.onload = () => {
        // Укладываем Base64 строго до ~9 КБ, чтобы обходить лимит 16 КБ ТСПУ на workers.dev
        const targets = [
          { maxDim: 280, quality: 0.5 },
          { maxDim: 240, quality: 0.42 },
          { maxDim: 200, quality: 0.35 },
        ];

        for (const t of targets) {
          let { width, height } = img;
          if (width > t.maxDim || height > t.maxDim) {
            if (width > height) {
              height = Math.round((height * t.maxDim) / width);
              width = t.maxDim;
            } else {
              width = Math.round((width * t.maxDim) / height);
              height = t.maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas 2D недоступен'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', t.quality);
          if (dataUrl.length <= 11500 || t === targets[targets.length - 1]) {
            resolve(dataUrl);
            return;
          }
        }
      };

      img.src = String(reader.result);
    };

    reader.readAsDataURL(file);
  });
}
