/*global Ultraviolet*/
self.__uv$config = {
    prefix: '/search/service/',
    encodeUrl: Ultraviolet.codec.xor.encode,
    decodeUrl: Ultraviolet.codec.xor.decode,
    handler: '/search/uv/uv.handler.js',
    client: '/search/uv/uv.client.js',
    bundle: '/search/uv/uv.bundle.js',
    config: '/search/uv/uv.config.js',
    sw: '/search/uv/uv.sw.js',
};
