class CompressionWorker {
    constructor() {
        this.compressors = new Map();
        this.initializeCompressors();
    }

    initializeCompressors() {
        this.compressors.set('gzip', new GZipCompressor());
        this.compressors.set('lz4', new LZ4Compressor());
        this.compressors.set('brotli', new BrotliCompressor());
        this.compressors.set('geometry', new GeometryCompressor());
    }

    async handleMessage(event) {
        const { id, type, data, level, format } = event.data;
        
        try {
            let result;
            
            switch (type) {
                case 'compress':
                    result = await this.compress(data, level, format);
                    break;
                    
                case 'decompress':
                    result = await this.decompress(data, format);
                    break;
                    
                case 'optimize':
                    result = await this.optimize(data, level);
                    break;
                    
                default:
                    throw new Error(`Unknown compression type: ${type}`);
            }
            
            self.postMessage({ id, result });
            
        } catch (error) {
            self.postMessage({ id, error: error.message });
        }
    }

    async compress(data, level = 'medium', format = 'auto') {
        const compressor = this.selectCompressor(data, format);
        
        if (!compressor) {
            throw new Error(`No compressor available for format: ${format}`);
        }
        
        const startTime = performance.now();
        const result = await compressor.compress(data, level);
        const endTime = performance.now();
        
        return {
            data: result,
            originalSize: this.getDataSize(data),
            compressedSize: this.getDataSize(result),
            compressionRatio: this.getDataSize(result) / this.getDataSize(data),
            compressionTime: endTime - startTime,
            format: compressor.format
        };
    }

    async decompress(data, format) {
        const compressor = this.compressors.get(format);
        
        if (!compressor) {
            throw new Error(`No decompressor available for format: ${format}`);
        }
        
        return compressor.decompress(data);
    }

    async optimize(data, level) {
        if (this.isGeometryData(data)) {
            const optimizer = new GeometryOptimizer();
            return optimizer.optimize(data, level);
        }
        
        if (this.isTextureData(data)) {
            const optimizer = new TextureOptimizer();
            return optimizer.optimize(data, level);
        }
        
        return data;
    }

    selectCompressor(data, format) {
        if (format !== 'auto') {
            return this.compressors.get(format);
        }
        
        if (this.isGeometryData(data)) {
            return this.compressors.get('geometry');
        }
        
        if (this.isBinaryData(data)) {
            return this.compressors.get('lz4');
        }
        
        return this.compressors.get('gzip');
    }

    isGeometryData(data) {
        return data && (
            data.attributes ||
            data.positions ||
            data.vertices ||
            (data.constructor && data.constructor.name === 'BufferGeometry')
        );
    }

    isTextureData(data) {
        return data && (
            data instanceof ImageData ||
            data instanceof ArrayBuffer && data.byteLength > 1024
        );
    }

    isBinaryData(data) {
        return data instanceof ArrayBuffer || 
               data instanceof Uint8Array || 
               data instanceof Float32Array;
    }

    getDataSize(data) {
        if (data instanceof ArrayBuffer) {
            return data.byteLength;
        }
        
        if (data instanceof Uint8Array || data instanceof Float32Array) {
            return data.byteLength;
        }
        
        if (typeof data === 'string') {
            return new Blob([data]).size;
        }
        
        if (data && typeof data === 'object') {
            return new Blob([JSON.stringify(data)]).size;
        }
        
        return 0;
    }
}

class BaseCompressor {
    constructor(format) {
        this.format = format;
    }

    async compress(data, level) {
        throw new Error('compress method must be implemented');
    }

    async decompress(data) {
        throw new Error('decompress method must be implemented');
    }

    getLevelSettings(level) {
        const settings = {
            low: { quality: 0.3, speed: 'fast' },
            medium: { quality: 0.6, speed: 'medium' },
            high: { quality: 0.9, speed: 'slow' }
        };
        
        return settings[level] || settings.medium;
    }
}

class GZipCompressor extends BaseCompressor {
    constructor() {
        super('gzip');
    }

    async compress(data, level) {
        if (typeof CompressionStream !== 'undefined') {
            const stream = new CompressionStream('gzip');
            const writer = stream.writable.getWriter();
            const reader = stream.readable.getReader();
            
            const chunks = [];
            const readPromise = this.readStream(reader, chunks);
            
            await writer.write(this.dataToUint8Array(data));
            await writer.close();
            
            await readPromise;
            
            return this.uint8ArrayFromChunks(chunks);
        }
        
        return this.fallbackCompress(data);
    }

    async decompress(data) {
        if (typeof DecompressionStream !== 'undefined') {
            const stream = new DecompressionStream('gzip');
            const writer = stream.writable.getWriter();
            const reader = stream.readable.getReader();
            
            const chunks = [];
            const readPromise = this.readStream(reader, chunks);
            
            await writer.write(data);
            await writer.close();
            
            await readPromise;
            
            return this.uint8ArrayFromChunks(chunks);
        }
        
        return this.fallbackDecompress(data);
    }

    async readStream(reader, chunks) {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
        }
    }

    dataToUint8Array(data) {
        if (data instanceof Uint8Array) {
            return data;
        }
        
        if (typeof data === 'string') {
            return new TextEncoder().encode(data);
        }
        
        if (data instanceof ArrayBuffer) {
            return new Uint8Array(data);
        }
        
        return new TextEncoder().encode(JSON.stringify(data));
    }

    uint8ArrayFromChunks(chunks) {
        const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
        const result = new Uint8Array(totalLength);
        let offset = 0;
        
        for (const chunk of chunks) {
            result.set(chunk, offset);
            offset += chunk.length;
        }
        
        return result;
    }

    fallbackCompress(data) {
        return this.dataToUint8Array(data);
    }

    fallbackDecompress(data) {
        return data;
    }
}

class LZ4Compressor extends BaseCompressor {
    constructor() {
        super('lz4');
    }

    async compress(data, level) {
        return this.simpleLZ4Compress(this.dataToBuffer(data));
    }

    async decompress(data) {
        return this.simpleLZ4Decompress(data);
    }

    dataToBuffer(data) {
        if (data instanceof ArrayBuffer) {
            return new Uint8Array(data);
        }
        
        if (data instanceof Uint8Array) {
            return data;
        }
        
        return new TextEncoder().encode(JSON.stringify(data));
    }

    simpleLZ4Compress(data) {
        const compressed = [];
        let i = 0;
        
        while (i < data.length) {
            let matchLength = 0;
            let matchOffset = 0;
            
            for (let j = Math.max(0, i - 65536); j < i; j++) {
                let length = 0;
                while (i + length < data.length && 
                       j + length < i && 
                       data[i + length] === data[j + length] && 
                       length < 255) {
                    length++;
                }
                
                if (length > matchLength) {
                    matchLength = length;
                    matchOffset = i - j;
                }
            }
            
            if (matchLength >= 4) {
                compressed.push(0x80 | (matchLength - 4));
                compressed.push(matchOffset & 0xFF);
                compressed.push((matchOffset >> 8) & 0xFF);
                i += matchLength;
            } else {
                compressed.push(data[i]);
                i++;
            }
        }
        
        return new Uint8Array(compressed);
    }

    simpleLZ4Decompress(data) {
        const decompressed = [];
        let i = 0;
        
        while (i < data.length) {
            const byte = data[i++];
            
            if (byte & 0x80) {
                const length = (byte & 0x7F) + 4;
                const offset = data[i++] | (data[i++] << 8);
                
                const start = decompressed.length - offset;
                for (let j = 0; j < length; j++) {
                    decompressed.push(decompressed[start + j]);
                }
            } else {
                decompressed.push(byte);
            }
        }
        
        return new Uint8Array(decompressed);
    }
}

class BrotliCompressor extends BaseCompressor {
    constructor() {
        super('brotli');
    }

    async compress(data, level) {
        if (typeof CompressionStream !== 'undefined') {
            try {
                const stream = new CompressionStream('deflate');
                const writer = stream.writable.getWriter();
                const reader = stream.readable.getReader();
                
                const chunks = [];
                const readPromise = this.readStream(reader, chunks);
                
                await writer.write(this.dataToUint8Array(data));
                await writer.close();
                
                await readPromise;
                
                return this.uint8ArrayFromChunks(chunks);
            } catch (error) {
                return this.fallbackCompress(data);
            }
        }
        
        return this.fallbackCompress(data);
    }

    async decompress(data) {
        if (typeof DecompressionStream !== 'undefined') {
            try {
                const stream = new DecompressionStream('deflate');
                const writer = stream.writable.getWriter();
                const reader = stream.readable.getReader();
                
                const chunks = [];
                const readPromise = this.readStream(reader, chunks);
                
                await writer.write(data);
                await writer.close();
                
                await readPromise;
                
                return this.uint8ArrayFromChunks(chunks);
            } catch (error) {
                return data;
            }
        }
        
        return data;
    }

    async readStream(reader, chunks) {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
        }
    }

    dataToUint8Array(data) {
        if (data instanceof Uint8Array) return data;
        if (typeof data === 'string') return new TextEncoder().encode(data);
        if (data instanceof ArrayBuffer) return new Uint8Array(data);
        return new TextEncoder().encode(JSON.stringify(data));
    }

    uint8ArrayFromChunks(chunks) {
        const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
        const result = new Uint8Array(totalLength);
        let offset = 0;
        
        for (const chunk of chunks) {
            result.set(chunk, offset);
            offset += chunk.length;
        }
        
        return result;
    }

    fallbackCompress(data) {
        return this.dataToUint8Array(data);
    }
}

class GeometryCompressor extends BaseCompressor {
    constructor() {
        super('geometry');
    }

    async compress(data, level) {
        if (!data.attributes) {
            return data;
        }
        
        const settings = this.getLevelSettings(level);
        const compressed = {
            attributes: {},
            metadata: {
                originalVertexCount: 0,
                compressedVertexCount: 0,
                compressionRatio: 1
            }
        };
        
        for (const [name, attribute] of Object.entries(data.attributes)) {
            if (attribute.array) {
                compressed.attributes[name] = await this.compressAttribute(attribute, settings);
                
                if (name === 'position') {
                    compressed.metadata.originalVertexCount = attribute.array.length / 3;
                }
            }
        }
        
        if (data.index) {
            compressed.index = await this.compressIndices(data.index, settings);
        }
        
        return compressed;
    }

    async compressAttribute(attribute, settings) {
        const array = attribute.array;
        const compressed = {
            itemSize: attribute.itemSize,
            type: array.constructor.name,
            normalized: attribute.normalized
        };
        
        if (settings.quality < 0.5) {
            compressed.array = this.quantizeArray(array, 8);
        } else if (settings.quality < 0.8) {
            compressed.array = this.quantizeArray(array, 12);
        } else {
            compressed.array = Array.from(array);
        }
        
        return compressed;
    }

    quantizeArray(array, bits) {
        const scale = (1 << bits) - 1;
        const min = Math.min(...array);
        const max = Math.max(...array);
        const range = max - min;
        
        if (range === 0) return Array.from(array);
        
        const quantized = new Array(array.length);
        
        for (let i = 0; i < array.length; i++) {
            const normalized = (array[i] - min) / range;
            const quantizedValue = Math.round(normalized * scale);
            quantized[i] = (quantizedValue / scale) * range + min;
        }
        
        return quantized;
    }

    async compressIndices(indexData, settings) {
        const indices = indexData.array || indexData;
        
        if (settings.quality < 0.5) {
            return this.deltaEncodeIndices(indices);
        }
        
        return Array.from(indices);
    }

    deltaEncodeIndices(indices) {
        const encoded = [indices[0]];
        
        for (let i = 1; i < indices.length; i++) {
            encoded.push(indices[i] - indices[i - 1]);
        }
        
        return encoded;
    }

    async decompress(data) {
        if (!data.attributes) {
            return data;
        }
        
        const decompressed = {
            attributes: {}
        };
        
        for (const [name, attribute] of Object.entries(data.attributes)) {
            decompressed.attributes[name] = this.decompressAttribute(attribute);
        }
        
        if (data.index) {
            decompressed.index = this.decompressIndices(data.index);
        }
        
        return decompressed;
    }

    decompressAttribute(attribute) {
        const TypedArray = self[attribute.type];
        const array = new TypedArray(attribute.array);
        
        return {
            array,
            itemSize: attribute.itemSize,
            normalized: attribute.normalized
        };
    }

    decompressIndices(indexData) {
        if (indexData.length === 0) return indexData;
        
        const decoded = [indexData[0]];
        
        for (let i = 1; i < indexData.length; i++) {
            decoded.push(decoded[i - 1] + indexData[i]);
        }
        
        return decoded;
    }
}

class GeometryOptimizer {
    async optimize(data, level) {
        const settings = this.getLevelSettings(level);
        let optimized = { ...data };
        
        if (settings.quality < 0.7) {
            optimized = this.decimateGeometry(optimized, settings.quality);
        }
        
        optimized = this.removeDuplicateVertices(optimized);
        optimized = this.optimizeIndexOrder(optimized);
        
        return optimized;
    }

    decimateGeometry(data, quality) {
        if (!data.attributes.position) return data;
        
        const targetVertexCount = Math.floor(
            (data.attributes.position.array.length / 3) * quality
        );
        
        return this.simplifyMesh(data, targetVertexCount);
    }

    simplifyMesh(data, targetVertexCount) {
        return data;
    }

    removeDuplicateVertices(data) {
        return data;
    }

    optimizeIndexOrder(data) {
        return data;
    }

    getLevelSettings(level) {
        const settings = {
            low: { quality: 0.3, decimation: true },
            medium: { quality: 0.6, decimation: false },
            high: { quality: 0.9, decimation: false }
        };
        
        return settings[level] || settings.medium;
    }
}

class TextureOptimizer {
    async optimize(data, level) {
        const settings = this.getLevelSettings(level);
        
        if (data instanceof ImageData) {
            return this.optimizeImageData(data, settings);
        }
        
        return data;
    }

    optimizeImageData(imageData, settings) {
        if (settings.quality < 0.5) {
            return this.downscaleImageData(imageData, 0.5);
        }
        
        return imageData;
    }

    downscaleImageData(imageData, scale) {
        const canvas = new OffscreenCanvas(
            Math.floor(imageData.width * scale),
            Math.floor(imageData.height * scale)
        );
        
        const ctx = canvas.getContext('2d');
        ctx.putImageData(imageData, 0, 0);
        
        return ctx.getImageData(0, 0, canvas.width, canvas.height);
    }

    getLevelSettings(level) {
        const settings = {
            low: { quality: 0.3, downscale: true },
            medium: { quality: 0.6, downscale: false },
            high: { quality: 0.9, downscale: false }
        };
        
        return settings[level] || settings.medium;
    }
}

const worker = new CompressionWorker();

self.onmessage = (event) => {
    worker.handleMessage(event);
};