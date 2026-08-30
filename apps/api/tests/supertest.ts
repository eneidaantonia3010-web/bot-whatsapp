import http from 'http';

export interface SuperTestResponse {
  status: number;
  statusCode: number;
  body: any;
  text: string;
  headers: Record<string, string | string[] | undefined>;
  header: Record<string, string | string[] | undefined>;
  ok: boolean;
}

export class TestRequest implements PromiseLike<SuperTestResponse> {
  private app: any;
  private method: string;
  private path: string;
  private headers: Record<string, string> = {};
  private sendData?: any;

  constructor(app: any, method: string, path: string) {
    this.app = app;
    this.method = method;
    this.path = path;
  }

  set(headerOrHeaders: string | Record<string, string>, value?: string): this {
    if (typeof headerOrHeaders === 'string') {
      if (value !== undefined) {
        this.headers[headerOrHeaders.toLowerCase()] = value;
      }
    } else if (headerOrHeaders && typeof headerOrHeaders === 'object') {
      for (const [k, v] of Object.entries(headerOrHeaders)) {
        if (typeof v === 'string') {
          this.headers[k.toLowerCase()] = v;
        }
      }
    }
    return this;
  }

  send(data: any): this {
    this.sendData = data;
    return this;
  }

  then<TResult1 = SuperTestResponse, TResult2 = never>(
    onfulfilled?: ((value: SuperTestResponse) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  catch<TResult = never>(
    onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null
  ): Promise<SuperTestResponse | TResult> {
    return this.execute().catch(onrejected);
  }

  async execute(): Promise<SuperTestResponse> {
    return new Promise((resolve, reject) => {
      const server = http.createServer(this.app);
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        if (!addr || typeof addr === 'string') {
          server.close();
          return reject(new Error('Failed to obtain ephemeral server address'));
        }
        const port = addr.port;
        let bodyBuffer: Buffer | undefined;
        const reqHeaders: Record<string, string> = { ...this.headers };

        if (this.sendData !== undefined) {
          if (typeof this.sendData === 'object' && !Buffer.isBuffer(this.sendData)) {
            bodyBuffer = Buffer.from(JSON.stringify(this.sendData));
            if (!reqHeaders['content-type']) {
              reqHeaders['content-type'] = 'application/json';
            }
          } else {
            bodyBuffer = Buffer.from(String(this.sendData));
          }
          reqHeaders['content-length'] = String(bodyBuffer.length);
        }

        const req = http.request(
          {
            hostname: '127.0.0.1',
            port,
            path: this.path,
            method: this.method,
            headers: reqHeaders,
          },
          (res) => {
            const chunks: Buffer[] = [];
            res.on('data', (chunk) => {
              chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            });
            res.on('end', () => {
              server.close();
              const rawText = Buffer.concat(chunks).toString('utf-8');
              let parsedBody: any = rawText;
              try {
                parsedBody = JSON.parse(rawText);
              } catch {
                // Keep rawText
              }
              const response: SuperTestResponse = {
                status: res.statusCode || 200,
                statusCode: res.statusCode || 200,
                body: parsedBody,
                text: rawText,
                headers: res.headers,
                header: res.headers,
                ok: (res.statusCode || 200) < 400,
              };
              resolve(response);
            });
          }
        );

        req.on('error', (err) => {
          server.close();
          reject(err);
        });

        if (bodyBuffer) {
          req.write(bodyBuffer);
        }
        req.end();
      });
    });
  }
}

export interface SuperTestInstance {
  get: (url: string) => TestRequest;
  post: (url: string) => TestRequest;
  put: (url: string) => TestRequest;
  patch: (url: string) => TestRequest;
  delete: (url: string) => TestRequest;
}

export function supertest(app: any): SuperTestInstance {
  return {
    get: (url: string) => new TestRequest(app, 'GET', url),
    post: (url: string) => new TestRequest(app, 'POST', url),
    put: (url: string) => new TestRequest(app, 'PUT', url),
    patch: (url: string) => new TestRequest(app, 'PATCH', url),
    delete: (url: string) => new TestRequest(app, 'DELETE', url),
  };
}

export default supertest;
