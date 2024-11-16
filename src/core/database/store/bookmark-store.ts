import { useMessage } from '../../../hooks/message';
import { useBookmarkStore } from '../../../store/bookmark';
import { isNull, isUndefined } from '../../is';
import { BookmarkStoreEntity } from '../database';
import { BaseStoreDatabase } from './base-store';

export class BookmarkStoreDatabase extends BaseStoreDatabase<BookmarkStoreEntity> {
  constructor(db: IDBDatabase, storeName: string) {
    super(db, storeName, 'BookmarkStoreDatabase');
    this.read();
  }
  private read() {
    const message = useMessage();
    const store = useBookmarkStore();
    super.getAll().then(res => {
      if (isNull(res) || res.length <= 0) {
        return;
      }
      res.forEach(r => store._bookmarks.set(r.id, r));
    }).catch((e: any) => {
      GLOBAL_LOG.error(this.tag, 'read', e);
      message.error(`书签读取失败, Error: ${e.message}`);
    });
  }
  getByChapterUrl(chapterUrl: string) {
    return new Promise<BookmarkStoreEntity[] | null>((reso, reje) => {
      try {
        const requ = this.db
          .transaction([this.storeName], 'readonly')
          .objectStore(this.storeName)
          .index('index_chapterUrl')
          .getAll(chapterUrl);
        requ.onsuccess = () => {
          let result: BookmarkStoreEntity[] | null = null;
          if (!isUndefined(requ.result)) {
            result = requ.result;
          }
          return reso(result);
        }
        requ.onerror = () => {
          GLOBAL_LOG.error(this.tag, `getByChapterUrl chapterUrl:${chapterUrl}`, requ.error);
          return reje(requ.error);
        }
      } catch (e) {
        GLOBAL_LOG.error(this.tag, `getByChapterUrl chapterUrl:${chapterUrl}`, e);
        return reje(e);
      }
    });
  }
  getByDetailUrl(detailUrl: string) {
    return new Promise<BookmarkStoreEntity[] | null>((reso, reje) => {
      try {
        const requ = this.db
          .transaction([this.storeName], 'readonly')
          .objectStore(this.storeName)
          .index('index_detailUrl')
          .getAll(IDBKeyRange.only([detailUrl]));
        requ.onsuccess = () => {
          let result: BookmarkStoreEntity[] | null = null;
          if (!isUndefined(requ.result)) {
            result = requ.result;
          }
          return reso(result);
        }
        requ.onerror = () => {
          GLOBAL_LOG.error(this.tag, `getByDetailUrl detailUrl:${detailUrl}`, requ.error);
          return reje(requ.error);
        }
      } catch (e) {
        GLOBAL_LOG.error(this.tag, `getByDetailUrl detailUrl:${detailUrl}`, e);
        return reje(e);
      }
    });
  }
  removeByDetailUrl(detailUrl: string): Promise<void> {
    return super.useCursorRemove('index_detailUrl', [detailUrl]);
  }
}