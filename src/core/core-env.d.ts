declare const GLOBAL_LOG: import('./logger').Logger;
declare const GLOBAL_IPC: import('./ipc-renderer').IpcRenderer;
declare const GLOBAL_DB: import('./database').Database;
declare const GLOBAL_PLUGINS: import('./plugins').Plugins;
declare const GLOBAL_UPDATER: import('./updater/updater').Updater;

type Metadata = {
  branch: 'dev' | 'release'
  commit: string
  date: string
  tag: string
  version: string
  versionCode: number
}
declare const METADATA: Metadata;

type Accept = Record<string, string[]>;
type FileType = {
  /**对此允许文件类型集合的描述 */
  description: string,
  /**带有键名为 MIME 类型、键值为包含文件扩展名的 Array 数组的键值对 */
  accept: Accept
}
type BaseFilePickerOptions = {
  /**
   * 忽略选择所有类型文件的过滤选项
   * @default false
   */
  excludeAcceptAllOption?: boolean,
  /**允许选择的文件类型 */
  types?: FileType[]
}
type OpenFilePickerOptions = {
  /**
   * 允许用户选择多个文件
   * @default false
   */
  multiple?: boolean
} & BaseFilePickerOptions;
type SaveFilePickerOptions = {
  /**建议的文件名称 */
  suggestedName?: string
} & BaseFilePickerOptions;

declare function showOpenFilePicker(options?: OpenFilePickerOptions): Promise<FileSystemFileHandle[]>;
declare function showSaveFilePicker(options?: SaveFilePickerOptions): Promise<FileSystemFileHandle>;

type QueryFontsOptions = {
  postscriptNames?: string[]
}
type FontData = {
  readonly family: string
  readonly fullName: string
  readonly postscriptName: string
  readonly style: string
  readonly blob: () => Promise<Blob>
}
declare function queryLocalFonts(options?: QueryFontsOptions): Promise<FontData[]>;

interface Window {
  GLOBAL_LOG: import('./logger').Logger,
  GLOBAL_IPC: import('./ipc-renderer').IpcRenderer,
  GLOBAL_DB: import('./database').Database,
  GLOBAL_PLUGINS: import('./plugins').Plugins,
  showOpenFilePicker: typeof showOpenFilePicker,
  showSaveFilePicker: typeof showSaveFilePicker,
  METADATA: Metadata,
  GLOBAL_UPDATER: import('./updater/updater').Updater,
  queryLocalFonts: typeof queryLocalFonts,
}
