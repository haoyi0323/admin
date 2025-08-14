import { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 允许跨域
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With')

  // 处理 OPTIONS 预检请求
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  try {
    // 转发到 uniCloud HTTP API Gateway
    const UNICLOUD_GATEWAY = 'https://fc-mp-07deb218-bf71-47a5-9cf0-10e81e399ed3.next.bspapp.com/http/api-gateway'
    
    const response = await fetch(UNICLOUD_GATEWAY, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body)
    })

    const data = await response.json()
    res.status(response.status).json(data)
  } catch (error) {
    console.error('API Gateway Error:', error)
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : '服务器内部错误' 
    })
  }
}