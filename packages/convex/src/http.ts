import { httpRouter } from 'convex/server';
import { httpAction } from './_generated/server';
import { auth } from './auth';

const http = httpRouter();

const authHandler = httpAction(async (ctx, request) => {
  return auth.handler(request);
});

http.route({
  pathPrefix: '/api/auth/',
  method: 'GET',
  handler: authHandler,
});

http.route({
  pathPrefix: '/api/auth/',
  method: 'POST',
  handler: authHandler,
});

export default http;
