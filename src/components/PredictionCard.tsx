import { Activity } from 'lucide-react';
import { Card } from './ui/card';

interface PredictionCardProps {
  prediction: string | null;
  confidence: number;
}

export const PredictionCard = ({ prediction, confidence }: PredictionCardProps) => {
  const getConfidenceColor = (conf: number) => {
    if (conf >= 0.8) return 'text-success';
    if (conf >= 0.6) return 'text-warning';
    return 'text-destructive';
  };

  const getConfidenceBg = (conf: number) => {
    if (conf >= 0.8) return 'bg-success/20';
    if (conf >= 0.6) return 'bg-warning/20';
    return 'bg-destructive/20';
  };

  return (
    <Card className="p-6 bg-gradient-secondary border-border/50">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-medium text-muted-foreground">Current Prediction</h3>
          </div>
          
          {prediction ? (
            <div className="space-y-3">
              <p className="text-3xl font-bold text-foreground">{prediction}</p>
              
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Confidence:</span>
                <div className="flex-1 max-w-xs">
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        confidence >= 0.8
                          ? 'bg-success'
                          : confidence >= 0.6
                          ? 'bg-warning'
                          : 'bg-destructive'
                      }`}
                      style={{ width: `${confidence * 100}%` }}
                    />
                  </div>
                </div>
                <span className={`text-lg font-bold ${getConfidenceColor(confidence)}`}>
                  {(confidence * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xl text-muted-foreground">Waiting for hand detection...</p>
          )}
        </div>

        {prediction && (
          <div className={`px-4 py-2 rounded-lg ${getConfidenceBg(confidence)}`}>
            <span className={`text-sm font-semibold ${getConfidenceColor(confidence)}`}>
              {confidence >= 0.8 ? 'High' : confidence >= 0.6 ? 'Medium' : 'Low'}
            </span>
          </div>
        )}
      </div>
    </Card>
  );
};
