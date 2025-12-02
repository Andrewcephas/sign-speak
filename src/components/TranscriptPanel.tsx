import { useRef, useEffect } from 'react';
import { ScrollArea } from './ui/scroll-area';
import { Card } from './ui/card';
import { FileText, Trash2 } from 'lucide-react';
import { Button } from './ui/button';

export interface TranscriptEntry {
  id: string;
  text: string;
  confidence: number;
  timestamp: Date;
}

interface TranscriptPanelProps {
  entries: TranscriptEntry[];
  onClear: () => void;
}

export const TranscriptPanel = ({ entries, onClear }: TranscriptPanelProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries]);

  return (
    <Card className="h-full flex flex-col bg-gradient-secondary border-border/50">
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Transcript</h3>
          <span className="text-sm text-muted-foreground">({entries.length})</span>
        </div>
        
        {entries.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1 p-4">
        <div ref={scrollRef} className="space-y-3">
          {entries.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <FileText className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>No predictions yet</p>
            </div>
          ) : (
            entries.map((entry) => (
              <div
                key={entry.id}
                className="p-3 bg-card rounded-lg border border-border/30 hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="font-medium text-foreground">{entry.text}</span>
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded ${
                      entry.confidence >= 0.8
                        ? 'bg-success/20 text-success'
                        : entry.confidence >= 0.6
                        ? 'bg-warning/20 text-warning'
                        : 'bg-destructive/20 text-destructive'
                    }`}
                  >
                    {(entry.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {entry.timestamp.toLocaleTimeString()}
                </span>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </Card>
  );
};
