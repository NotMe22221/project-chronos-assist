import { useState, useEffect, useCallback } from 'react';
import { JarvisPanel } from './JarvisPanel';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bookmark, RefreshCw, ExternalLink, FolderOpen } from 'lucide-react';

interface BookmarkItem {
  id: string;
  title: string;
  url: string;
}

export const BookmarksPanel = () => {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExtension, setIsExtension] = useState(false);

  // Check if running in extension context
  useEffect(() => {
    const inIframe = window.parent !== window;
    setIsExtension(inIframe);
  }, []);

  // Listen for bookmarks from extension
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'jarvis-bookmarks-list') {
        setBookmarks(event.data.bookmarks || []);
        setIsLoading(false);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const fetchBookmarks = useCallback(() => {
    if (!isExtension) return;
    setIsLoading(true);
    window.parent.postMessage({ type: 'jarvis-get-bookmarks' }, '*');
  }, [isExtension]);

  // Auto-fetch on mount if in extension
  useEffect(() => {
    if (isExtension) {
      fetchBookmarks();
    }
  }, [isExtension, fetchBookmarks]);

  const openBookmark = (url: string) => {
    if (isExtension) {
      window.parent.postMessage({ type: 'jarvis-open-bookmark', url }, '*');
    } else {
      window.open(url, '_blank');
    }
  };

  if (!isExtension) {
    return (
      <JarvisPanel title="Bookmarks" className="h-full">
        <div className="text-center py-8 text-muted-foreground">
          <FolderOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-sm">
            Bookmarks panel is only available<br />
            when using the Chrome extension.
          </p>
        </div>
      </JarvisPanel>
    );
  }

  return (
    <JarvisPanel title="Bookmarks" className="h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-primary">
          <Bookmark className="w-4 h-4" />
          <span className="text-sm font-medium">{bookmarks.length} bookmarks</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchBookmarks}
          disabled={isLoading}
          className="h-8"
        >
          <RefreshCw className={`w-3 h-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <ScrollArea className="h-[300px] pr-2">
        <div className="space-y-2">
          {bookmarks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No bookmarks found</p>
            </div>
          ) : (
            bookmarks.map((bookmark) => (
              <button
                key={bookmark.id}
                onClick={() => openBookmark(bookmark.url)}
                className="w-full p-3 rounded-lg bg-background/50 hover:bg-primary/10 border border-border/30 hover:border-primary/50 transition-all text-left group"
                data-bookmark-id={bookmark.id}
              >
                <div className="flex items-start gap-3">
                  <ExternalLink className="w-4 h-4 mt-0.5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">
                      {bookmark.title || 'Untitled'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {bookmark.url}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </ScrollArea>

      <div className="mt-4 pt-4 border-t border-border/30">
        <p className="text-xs text-muted-foreground text-center">
          👆 Point at a bookmark and ✌️ peace sign to open
        </p>
      </div>
    </JarvisPanel>
  );
};
