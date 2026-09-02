import app from '../src/index';

export default function handler(req: any, res: any) {
  const expressApp = (app as any).default || app;
  return expressApp(req, res);
}
