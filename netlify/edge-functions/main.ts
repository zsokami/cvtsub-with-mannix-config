import type { Config, Context } from 'https://edge.netlify.com/'
import { StoreWithRedis } from '../store-with-redis.ts'

const DEFAULT_SEARCH_PARAMS: [string, (req: Request, ctx: Context) => string | Promise<string>][] = [
  ['target', () => 'clash'],
  ['udp', () => 'true'],
  ['scv', () => 'true'],
  ['config', getConfigURL],
]

async function getConfigURL(req: Request) {
  const sha = await new StoreWithRedis('arx').get('sha')
  const name = new URL(req.url).hostname.split('.')[0]
  return `https://raw.githubusercontent.com/zsokami/ACL4SSR/${sha}/ACL4SSR_Online${
    name.startsWith('min') ? '' : '_Full'
  }_Mannix${name.endsWith('ndl') ? '_No_DNS_Leak' : ''}.ini`
}

async function main(req: Request, ctx: Context) {
  const reqURL = new URL(req.url)
  if (reqURL.pathname === '/') {
    return new Response('Not Found', { status: 404 })
  }
  if (reqURL.pathname === '/config') {
    return Response.redirect(await getConfigURL(req))
  }
  if (reqURL.pathname === '/sha') {
    if (reqURL.searchParams.get('token') !== Deno.env.get('TOKEN')) {
      return new Response('Unauthorized', { status: 401 })
    }
    await new StoreWithRedis('arx').set('sha', reqURL.searchParams.get('value'))
    return new Response('OK')
  }
  let url
  try {
    url = new URL(
      decodeURIComponent(reqURL.pathname).replace(/^\/+\s*(https?:)?/i, (_, $1) => $1 || 'https:') + reqURL.search,
    )
  } catch (e) {
    return new Response(String(e), { status: 400 })
  }
  url.pathname = '/sub'
  for (const [k, v] of DEFAULT_SEARCH_PARAMS) {
    if (!url.searchParams.has(k)) url.searchParams.set(k, await v(req, ctx))
  }
  return Response.redirect(url)
}

export default async (req: Request, ctx: Context) => {
  try {
    return await main(req, ctx)
  } catch (e) {
    return new Response(String(e), { status: 500 })
  }
}

export const config: Config = {
  path: '/*',
}
