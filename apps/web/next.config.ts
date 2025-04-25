import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  // This tells Next.js to not bundle these packages and use native Node.js require
  // serverComponentsExternalPackages: [
  //   '@libsql/client',
  //   'better-sqlite3',
  //   '@libsql/client-wasm',
  //   'libsql',
  // ],
};

export default nextConfig;
