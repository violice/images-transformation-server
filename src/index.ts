import express, { NextFunction, Request, Response } from 'express';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import multer from 'multer';
import { customAlphabet } from 'nanoid';
import { alphanumeric } from 'nanoid-dictionary';
import path from 'path';
import { getMetadata, transformFile } from './utils';

const app = express();

const nanoid = customAlphabet(alphanumeric);

app.use(express.static(path.join(__dirname, '../static')));

app.get('/', (req, res) => {
  res.json({ date: new Date() });
});

app.post('/upload', multer().single('file'), async (req, res, next) => {
  const {
    body: { folder, transformations },
    file,
  } = req;

  if (!file) {
    return next({ code: 400, message: 'File is required' });
  }

  if (!folder) {
    return next({ code: 400, message: 'Folder is required' });
  }

  const folderPath = path.join(__dirname, '../upload', `/${folder}`);

  if (!existsSync(folderPath)) {
    mkdirSync(folderPath);
  }

  if (!transformations) {
    const ext = file.mimetype.split('/').pop();

    if (!ext) {
      return next({ code: 400, message: 'Cannot extract file extension' });
    }

    writeFileSync(path.join(folderPath, `${nanoid()}.${ext}`), file.buffer);

    return res.json({ ok: true });
  }

  const transformedFileBuffer = await transformFile(file.buffer, transformations);

  const metadata = await getMetadata(transformedFileBuffer);

  writeFileSync(path.join(folderPath, `${nanoid()}.${metadata.format}`), transformedFileBuffer);

  return res.json({ ok: true });
});

app.get('/upload/:folder/:file', async (req, res, next) => {
  const { folder, file } = req.params;

  const filePath = path.join(__dirname, '../upload', `/${folder}`, file);

  if (!existsSync(filePath)) {
    return next({ code: 404, message: 'Not found' });
  }

  const fileBuffer = readFileSync(filePath);

  res.send(fileBuffer);
});

app.get('/upload/:folder/:transformations/:file', async (req, res, next) => {
  const { folder, transformations, file } = req.params;

  const transformedFilePath = path.join(
    __dirname,
    '../upload',
    `/${folder}`,
    `/${transformations}`,
    file,
  );

  if (existsSync(transformedFilePath)) {
    const transformedFileBuffer = readFileSync(transformedFilePath);

    const { format } = await getMetadata(transformedFileBuffer);

    return res.set('Content-Type', `image/${format}`).send(transformedFileBuffer);
  }

  const filePath = path.join(__dirname, '../upload', `/${folder}`, file);

  if (!existsSync(filePath)) {
    return next({ code: 404, message: 'Not found' });
  }

  const fileBuffer = readFileSync(filePath);

  const transformedFileBuffer = await transformFile(fileBuffer, transformations);

  const transformedFolderPath = path.join(
    __dirname,
    '../upload',
    `/${folder}`,
    `/${transformations}`,
  );

  mkdirSync(transformedFolderPath);

  writeFileSync(transformedFilePath, transformedFileBuffer);

  const { format } = await getMetadata(transformedFileBuffer);

  res.set('Content-Type', `image/${format}`).send(transformedFileBuffer);
});

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  res.status(err.code || 500).json(err.message || 'Unknown error');
});

app.listen(3000, () => console.log('Server is listening on port 3000'));
