import {config} from 'dotenv';
import {drizzle} from 'drizzle-orm/libsql';

config({path: '.env'}); // or .env.local

export const db = drizzle({
  connection: {
    url:
      process.env.TURSO_CONNECTION_URL! || 'libsql://suna-dylanreedx.turso.io',
    authToken:
      process.env.TURSO_AUTH_TOKEN! ||
      'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NDAwODM3MjAsImlkIjoiMjRkNWIwZjEtNTZiYi00MGM4LWE2NTMtNDA4ZmI1OGQyNzQwIn0.F9DPiNFHjWVWNW0WfmemTi_HdTOxVovze3NrogpptWjAikt_5rZzJdPFxJryqrIh_H41kwdQtloXy53CO5Y8Dw',
  },
});
