import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, range',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Expose-Headers': 'Content-Length, Content-Range',
};

// Pre-approved image URLs (for security - only proxy known safe images)
const ALLOWED_IMAGES: Record<string, string> = {
  'linux': 'https://copy.sh/v86/images/linux4.iso',
  'freedos': 'https://copy.sh/v86/images/freedos722.img',
  'bios': 'https://copy.sh/v86/bios/seabios.bin',
  'vgabios': 'https://copy.sh/v86/bios/vgabios.bin',
  'wasm': 'https://copy.sh/v86/build/v86.wasm',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const imageKey = url.searchParams.get('image');
    
    if (!imageKey || !ALLOWED_IMAGES[imageKey]) {
      return new Response(
        JSON.stringify({ error: 'Invalid image key. Available: ' + Object.keys(ALLOWED_IMAGES).join(', ') }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const imageUrl = ALLOWED_IMAGES[imageKey];
    
    // Forward range requests for partial content
    const rangeHeader = req.headers.get('range');
    const fetchHeaders: HeadersInit = {};
    if (rangeHeader) {
      fetchHeaders['Range'] = rangeHeader;
    }
    
    console.log(`Proxying ${imageKey} from ${imageUrl}`);
    
    const response = await fetch(imageUrl, { headers: fetchHeaders });
    
    if (!response.ok && response.status !== 206) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }
    
    const responseHeaders: HeadersInit = {
      ...corsHeaders,
      'Content-Type': response.headers.get('Content-Type') || 'application/octet-stream',
    };
    
    // Forward content-length and range headers
    const contentLength = response.headers.get('Content-Length');
    if (contentLength) {
      responseHeaders['Content-Length'] = contentLength;
    }
    
    const contentRange = response.headers.get('Content-Range');
    if (contentRange) {
      responseHeaders['Content-Range'] = contentRange;
    }
    
    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
    
  } catch (error) {
    console.error('Proxy error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Proxy failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
