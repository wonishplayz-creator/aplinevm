import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, range',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Expose-Headers': 'Content-Length, Content-Range',
};

// Use Alpine Linux virtual image for a more complete Linux experience
const ALLOWED_IMAGES: Record<string, string> = {
  'linux': 'https://copy.sh/v86/images/linux4.iso',
  'alpine': 'https://dl-cdn.alpinelinux.org/alpine/v3.18/releases/x86/alpine-virt-3.18.9-x86.iso',
  'freedos': 'https://copy.sh/v86/images/freedos722.img',
  'bios': 'https://copy.sh/v86/bios/seabios.bin',
  'vgabios': 'https://copy.sh/v86/bios/vgabios.bin',
  'wasm': 'https://copy.sh/v86/build/v86.wasm',
};

serve(async (req) => {
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
      'Cache-Control': 'public, max-age=604800',
    };

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
