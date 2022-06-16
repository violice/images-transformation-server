import sharp from 'sharp';

type ImageFormat = 'jpg' | 'jpeg' | 'png' | 'webp';

type Config = {
  extract?: boolean;
  resize?: boolean;
  width?: number;
  height?: number;
  left?: number;
  top?: number;
  format?: ImageFormat;
  quality?: number;
};

export const transformFile = async (buffer: Buffer, transformations: string) => {
  const transformationsArr = transformations.split(',');

  const config: Config = {};
  transformationsArr.forEach(t => {
    const [param, value] = t.split('_');
    switch (param) {
      case 'c':
        {
          switch (value) {
            case 'crop': {
              config.extract = true;
              break;
            }
            case 'scale': {
              config.resize = true;
              break;
            }
            default:
              break;
          }
        }
        break;
      case 'w': {
        config.width = Number(value);
        break;
      }
      case 'h': {
        config.height = Number(value);
        break;
      }
      case 'x': {
        config.left = Number(value);
        break;
      }
      case 'y': {
        config.top = Number(value);
        break;
      }
      case 'f': {
        if (['jpg', 'jpeg', 'png', 'webp'].includes(value)) {
          config.format = value as ImageFormat;
        }
        break;
      }
      case 'q': {
        config.quality = Number(value);
        break;
      }
      default:
        break;
    }
  });

  let sharpObj = await sharp(buffer);

  const metadata = await sharpObj.metadata();

  if (config.extract) {
    sharpObj = await sharpObj.extract({
      width: config.width ?? metadata.width ?? 0,
      height: config.height ?? metadata.height ?? 0,
      left: config.left ?? 0,
      top: config.top ?? 0,
    });
  }

  if (config.resize) {
    sharpObj = await sharpObj.resize({ width: config.width, height: config.height });
  }

  if (config.format) {
    sharpObj = await sharpObj.toFormat(config.format, { quality: config.quality });
  }

  const result = await sharpObj.toBuffer();

  return result;
};

export const getMetadata = (buffer: Buffer) => sharp(buffer).metadata();
