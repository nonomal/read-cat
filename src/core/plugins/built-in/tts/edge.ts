import { isNull, isString, isUndefined } from '../../../is';
import { PluginConstructorParams, RequireItem } from '../../defined/plugins';
import { EndCallback, NextCallback, TTSOptions, Voice } from '../../defined/ttsengine';
import { chunkArray } from '../../../utils';
import { escapeXML } from '../../../utils/html';
import { WebSocketClient } from '../../../websocket';
import { createHash } from 'crypto';
import { getFileTime } from '../../../utils/date';

/**
 * 功能实现参考自 https://github.com/rany2/edge-tts/
 */
export class EdgeTTSEngine {
  public static readonly ID = 'hK1lY7FGM-UIYf76pN0Sk';
  public static readonly TYPE = 2;
  public static readonly GROUP = '(内置)TTS';
  public static readonly NAME = 'Edge TTS Engine';
  public static readonly VERSION = '1.0.0';
  public static readonly VERSION_CODE = 0;
  public static readonly PLUGIN_FILE_URL = '';
  public static readonly REQUIRE: Record<string, RequireItem> = {
    proxy: {
      label: '代理',
      type: 'boolean',
      default: false,
      description: '朗读报错时可尝试开启该选项，同时开启设置/代理'
    },
    edgeVersion: {
      label: 'Edge版本号',
      type: 'string',
      default: '130.0.0.0'
    }
  };

  private static readonly TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
  private static readonly WEBSOCKET_MAX_SIZE = 2 ** 16;;

  private uuid;
  private request;
  private wss: WebSocketClient | null = null;
  constructor(options: PluginConstructorParams) {
    const { request, uuid } = options;
    this.uuid = uuid;
    this.request = request;
  }
  get proxy() {
    return EdgeTTSEngine.REQUIRE.proxy.value;
  }
  get edgeVersion() {
    return EdgeTTSEngine.REQUIRE.edgeVersion.value;
  }

  private getSecMsGec() {
    let ticks = getFileTime();
    ticks -= ticks % 3_000_000_000;
    return createHash('sha256').update(`${ticks}${EdgeTTSEngine.TOKEN}`).digest('hex').toUpperCase();
  }
  connect() {
    return new Promise<void>((reso, reje) => {
      if (this.wss && this.wss.readyState === 1) {
        return reso();
      }
      const query: Record<string, string> = {
        TrustedClientToken: EdgeTTSEngine.TOKEN,
        ConnectionId: this.uuid(),
        'Sec-MS-GEC': this.getSecMsGec(),
        'Sec-MS-GEC-Version': `1-${this.edgeVersion}`
      };
      const queryStr = Object.keys(query).map(key => `${key}=${query[key]}`).join('&');
      this.wss = new WebSocketClient(`wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?${queryStr}`, {
        headers: {
          'Origin': 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
          'User-Agent': `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${this.edgeVersion} Safari/537.36 Edg/${this.edgeVersion}`
        },
        proxy: this.proxy
      });
      this.wss?.once('open', () => {
        this.wss?.send(
          'Path: speech.config\r\n' +
          `X-Timestamp: ${(new Date).toISOString()}\r\n` +
          'Content-Type: application/json; charset=utf-8\r\n\r\n' +
          '{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":false,"wordBoundaryEnabled":true},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}\r\n'
          , e => {
            return e ? reje(e) : reso();
          });
      });
      this.wss?.once('error', e => {
        return reje(e);
      });
      /* this.wss?.once('close', () => {
        console.log('断开连接');
      }); */
    });
  }
  sendSSMLRequest(ssmlHeaders: string) {
    return new Promise<Buffer>((reso, reje) => {
      if (isNull(this.wss)) {
        return reje();
      }
      let body = Buffer.alloc(0);
      this.wss.onmessage = e => {
        if (!isString(e.data)) {
          const data = <Buffer>e.data.slice(e.data.toString('utf-8').indexOf('Path:audio') + 12);
          body = Buffer.concat([body, data]);
          return;
        }
        const str = e.data.toString();
        if (str.includes('Path:turn.end')) {
          return reso(body);
        }
      }
      this.wss.onerror = e => {
        return reje(new Error(e.message));
      }
      this.wss.onclose = e => {
        return e.reason ? reje(new Error(e.reason)) : reso(Buffer.alloc(0));
      }
      this.wss.send(ssmlHeaders, e => {
        if (e) {
          return reje(e);
        }
      });
    });
  }
  createSSMLHeaders(ssml: string) {
    return (
      'Path: ssml\r\n' +
      `X-RequestId: ${this.uuid()}\r\n` +
      `X-Timestamp: ${(new Date).toISOString()}\r\n` +
      'Content-Type: application/ssml+xml\r\n\r\n' +
      ssml
    );
  }
  createSSML(text: string, voice: string, rate: string, volume: string, pitch: string) {
    return (
      '<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">' +
      `<voice name="${voice}">` +
      `<prosody pitch="${pitch}" rate="${rate}" volume="${volume}">` +
      escapeXML(text.trim()) +
      '</prosody>' +
      '</voice>' +
      '</speak>'
    );
  }
  calcMaxMesgSize(voice: string, rate: string, volume: string, pitch: string) {
    const headers = this.createSSMLHeaders(this.createSSML('', voice, rate, volume, pitch));
    return EdgeTTSEngine.WEBSOCKET_MAX_SIZE - (headers.length + 50);
  }
  async transform(texts: string[], options: TTSOptions, next: NextCallback, end: EndCallback): Promise<void> {
    await this.connect();
    const {
      voice,
      rate,
      volume,
      signal,
      start,
      maxLineWordCount
    } = options;
    signal.onabort = () => {
      this.wss?.close();
    }
    let _voice = voice || 'Microsoft Server Speech Text to Speech Voice (zh-CN, XiaoxiaoNeural)';
    let _rate = !isUndefined(rate) ? `${Math.floor(rate * 100)}%` : '0%';
    let _volume = !isUndefined(volume) ? `${Math.floor(volume * 100)}%` : '100%';
    let _start = !isUndefined(start) ? start : 0;
    let _maxLineWordCount = isUndefined(maxLineWordCount) || maxLineWordCount < 100 ? 100 : maxLineWordCount;
    const toBuffer = async (text: string) => {
      if (!/([\u4e00-\u9fa5]|[a-z0-9])+/igm.test(text)) {
        return Buffer.alloc(0);
      }
      const ssml = this.createSSML(text, _voice, _rate, _volume, '0Hz');
      const headers = this.createSSMLHeaders(ssml);
      const body = await this.sendSSMLRequest(headers);
      return body;
    }
    for (let i = _start; i < texts.length; i++) {
      if (signal.aborted) {
        break;
      }
      const text = texts[i];
      const chunks = chunkArray(Array.from(text), _maxLineWordCount);
      for (let j = 0; j < chunks.length; j++) {
        const t = chunks[j].join('');
        const body = await toBuffer(t);
        next({
          blob: new Blob([body], { type: 'audio/mp3' }),
          index: j
        }, i);
      }
    }
    end();
  }
  async getVoiceList(): Promise<Voice[]> {
    const { body } = await this.request.get(`https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/voices/list?trustedclienttoken=${EdgeTTSEngine.TOKEN}`, {
      proxy: this.proxy.value
    }).catch(() => ({ body: '[]' }));
    const voices: Voice[] = JSON.parse(body).map((v: any) => {
      return {
        name: v.FriendlyName,
        value: v.Name
      }
    });
    if (voices.length < 1) {
      return [{
        name: 'Microsoft Xiaoxiao Online (Natural) - Chinese (Mainland)',
        value: 'Microsoft Server Speech Text to Speech Voice (zh-CN, XiaoxiaoNeural)'
      }, {
        name: 'Microsoft Xiaoyi Online (Natural) - Chinese (Mainland)',
        value: 'Microsoft Server Speech Text to Speech Voice (zh-CN, XiaoyiNeural)'
      }, {
        name: 'Microsoft Yunjian Online (Natural) - Chinese (Mainland)',
        value: 'Microsoft Server Speech Text to Speech Voice (zh-CN, YunjianNeural)'
      }, {
        name: 'Microsoft Yunxi Online (Natural) - Chinese (Mainland)',
        value: 'Microsoft Server Speech Text to Speech Voice (zh-CN, YunxiNeural)'
      }, {
        name: 'Microsoft Yunxia Online (Natural) - Chinese (Mainland)',
        value: 'Microsoft Server Speech Text to Speech Voice (zh-CN, YunxiaNeural)'
      }, {
        name: 'Microsoft Yunyang Online (Natural) - Chinese (Mainland)',
        value: 'Microsoft Server Speech Text to Speech Voice (zh-CN, YunyangNeural)'
      }];
    }
    const mainland: Voice[] = [];
    const arr: Voice[] = [];
    voices.forEach(v => {
      if (v.name.includes('Chinese (Mainland)')) {
        mainland.push(v);
      } else {
        arr.push(v);
      }
    });
    
    return [...mainland, ...arr];;
  }
}