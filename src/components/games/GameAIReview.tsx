import { useState } from "react";
import { ChevronDown, Bot, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

// Rich content parser (same as AI Trend)
const RichReviewContent = ({ content }: { content: string }) => {
  if (!content || typeof content !== 'string') {
    return <div className="text-muted-foreground">...</div>;
  }

  const parseContent = (text: string) => {
    const elements: React.ReactNode[] = [];
    const lines = text.split('\n');
    let i = 0;
    let tableBuffer: string[] = [];
    let inTable = false;

    while (i < lines.length) {
      const line = lines[i];
      
      // Detect table
      if (line.includes('|') && line.trim().startsWith('|')) {
        if (!inTable) {
          inTable = true;
          tableBuffer = [];
        }
        tableBuffer.push(line);
        i++;
        continue;
      } else if (inTable) {
        elements.push(renderTable(tableBuffer, elements.length));
        tableBuffer = [];
        inTable = false;
      }

      // Empty line
      if (line.trim() === '') {
        elements.push(<div key={`empty-${i}`} className="h-3" />);
        i++;
        continue;
      }

      // Horizontal rule
      if (line.trim() === '---' || line.trim() === '***') {
        elements.push(
          <hr key={`hr-${i}`} className="border-border/30 my-6" />
        );
        i++;
        continue;
      }

      // Headings
      if (line.startsWith('### ')) {
        elements.push(
          <h3 key={`h3-${i}`} className="text-lg font-bold text-primary mt-4 mb-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            {parseInlineFormatting(line.slice(4))}
          </h3>
        );
        i++;
        continue;
      }
      if (line.startsWith('## ')) {
        elements.push(
          <h2 key={`h2-${i}`} className="text-xl font-bold text-foreground mt-5 mb-3 flex items-center gap-2">
            {parseInlineFormatting(line.slice(3))}
          </h2>
        );
        i++;
        continue;
      }
      if (line.startsWith('# ')) {
        elements.push(
          <h1 key={`h1-${i}`} className="text-2xl font-bold text-foreground mt-5 mb-3">
            {parseInlineFormatting(line.slice(2))}
          </h1>
        );
        i++;
        continue;
      }

      // Bullet points
      if (line.trim().startsWith('- ') || line.trim().startsWith('• ') || line.trim().startsWith('* ')) {
        const bulletContent = line.replace(/^[\s]*[-•*]\s*/, '');
        elements.push(
          <div key={`bullet-${i}`} className="flex gap-3 my-1.5 mr-2">
            <span className="text-primary mt-0.5">•</span>
            <span className="flex-1 text-muted-foreground">{parseInlineFormatting(bulletContent)}</span>
          </div>
        );
        i++;
        continue;
      }

      // Numbered lists
      const numberedMatch = line.match(/^(\d+)\.\s+(.*)$/);
      if (numberedMatch) {
        elements.push(
          <div key={`num-${i}`} className="flex gap-3 my-1.5 mr-2">
            <span className="text-primary font-semibold min-w-[1.5rem]">{numberedMatch[1]}.</span>
            <span className="flex-1 text-muted-foreground">{parseInlineFormatting(numberedMatch[2])}</span>
          </div>
        );
        i++;
        continue;
      }

      // Regular paragraph
      elements.push(
        <p key={`p-${i}`} className="my-2 leading-relaxed text-muted-foreground">
          {parseInlineFormatting(line)}
        </p>
      );
      i++;
    }

    if (inTable && tableBuffer.length > 0) {
      elements.push(renderTable(tableBuffer, elements.length));
    }

    return elements;
  };

  const renderTable = (tableLines: string[], key: number) => {
    if (tableLines.length < 2) return null;
    
    const parseRow = (line: string) => {
      return line.split('|').filter(cell => cell.trim() !== '').map(cell => cell.trim());
    };
    
    const headers = parseRow(tableLines[0]);
    const dataRows = tableLines.slice(2).map(parseRow);
    
    return (
      <div key={`table-${key}`} className="my-6 overflow-x-auto">
        <table className="w-full border-collapse rounded-xl overflow-hidden bg-card/50 backdrop-blur-xl border border-border/30">
          <thead>
            <tr className="bg-primary/10">
              {headers.map((header, i) => (
                <th 
                  key={i} 
                  className="px-4 py-3 text-right text-sm font-bold text-primary border-b border-border/30"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataRows.map((row, rowIndex) => (
              <tr 
                key={rowIndex} 
                className="border-b border-border/20 hover:bg-muted/30 transition-colors"
              >
                {row.map((cell, cellIndex) => (
                  <td 
                    key={cellIndex} 
                    className="px-4 py-3 text-sm text-muted-foreground"
                  >
                    {parseInlineFormatting(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const parseInlineFormatting = (text: string): React.ReactNode[] => {
    const elements: React.ReactNode[] = [];
    let remaining = text;
    let keyCounter = 0;

    // Bold text
    const boldRegex = /\*\*([^*]+)\*\*/g;
    let lastIndex = 0;
    let match;
    const parts: (string | React.ReactNode)[] = [];

    while ((match = boldRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }
      parts.push(
        <strong key={`bold-${keyCounter++}`} className="font-bold text-foreground">
          {match[1]}
        </strong>
      );
      lastIndex = match.index + match[0].length;
    }
    
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts.length > 0 ? parts : [text];
  };

  return <>{parseContent(content)}</>;
};

interface GameAIReviewProps {
  review: string;
  className?: string;
}

export const GameAIReview = ({ review, className }: GameAIReviewProps) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!review) return null;

  return (
    <div className={cn("animate-fade-in", className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between p-4 rounded-xl transition-all duration-500",
          "glass-morphism hover:bg-primary/5 group",
          isOpen && "bg-primary/5"
        )}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary animate-pulse" />
          </div>
          <div className="text-right">
            <span className="font-bold text-foreground">مراجعة الذكاء الاصطناعي للعبة</span>
            <p className="text-xs text-muted-foreground mt-0.5">
              (اضغط لعرض المراجعة الكاملة)
            </p>
          </div>
        </div>
        <ChevronDown 
          className={cn(
            "w-5 h-5 text-muted-foreground transition-transform duration-500",
            isOpen && "rotate-180"
          )} 
        />
      </button>

      <div
        className={cn(
          "overflow-hidden transition-all duration-500 ease-in-out",
          isOpen ? "max-h-[5000px] opacity-100 mt-4" : "max-h-0 opacity-0"
        )}
      >
        <div className="glass-morphism p-6 rounded-xl border border-primary/20">
          <RichReviewContent content={review} />
        </div>
      </div>
    </div>
  );
};
