// Type declarations for stream-json
declare module 'stream-json' {
    export function parser(options?: any): NodeJS.ReadWriteStream;
}

declare module 'stream-json/streamers/StreamObject.js' {
    export function streamObject(options?: any): NodeJS.ReadWriteStream;
}

declare module 'stream-json/streamers/StreamArray.js' {
    export function streamArray(options?: any): NodeJS.ReadWriteStream;
    export default function streamArray(options?: any): NodeJS.ReadWriteStream;
}

declare module 'stream-chain' {
    export function chain(streams: any[]): NodeJS.ReadWriteStream;
}
