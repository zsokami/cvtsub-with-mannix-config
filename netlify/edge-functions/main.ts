import type { Config, Context } from 'npm:@netlify/edge-functions'

const DEFAULT_SEARCH_PARAMS: [string, (req: Request, ctx: Context) => string | Promise<string>][] = [
  ['target', () => 'clash'],
  ['udp', () => 'true'],
  ['scv', () => 'true'],
  ['config', async (req: Request) =>
    await getRawURL(
      'zsokami/ACL4SSR',
      `ACL4SSR_Online_${new URL(req.url).hostname.startsWith('min.') ? '' : 'Full_'}Mannix.ini`,
    )],
]

const GITHUB_REPOS_API_KEY = Deno.env.get('GITHUB_REPOS_API_KEY')

const GET_SHA_INIT = {
  headers: {
    'authorization': `Bearer ${GITHUB_REPOS_API_KEY}`,
    'accept': 'application/vnd.github.sha',
  },
}

async function getRawURL(repo: string, path: string) {
  const resp = await fetch(`https://api.github.com/repos/${repo}/commits/HEAD`, GET_SHA_INIT)
  if (resp.status !== 200) throw new Error(`GitHub API: ${resp.status} ${resp.statusText} ${await resp.text()}`)
  const sha = await resp.text()
  return `https://raw.githubusercontent.com/${repo}/${sha}/${path}`
}

async function main(req: Request, ctx: Context) {
  let url
  try {
    const reqURL = new URL(req.url)
    url = new URL(decodeURIComponent(reqURL.pathname).replace(/^\/+\s*(https?:)?/i, (_, $1) => $1 || 'https:') + reqURL.search)
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
