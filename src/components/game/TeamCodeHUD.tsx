import React, { useState } from 'react';
import { useTeam } from '@/contexts/TeamContext';
import { Copy, Check, ChevronDown, ChevronUp, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const TeamCodeHUD: React.FC = () => {
  const { currentTeam, currentMember } = useTeam();
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  if (!currentTeam) return null;

  const copyCode = async () => {
    await navigator.clipboard.writeText(currentTeam.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed top-20 left-4 z-20">
      {/* Team Code Pill */}
      <div 
        className={cn(
          "bg-card/95 backdrop-blur-md border border-primary/40 rounded-lg shadow-lg",
          "transition-all duration-300 ease-out",
          isExpanded ? "rounded-b-none border-b-0" : ""
        )}
      >
        <div className="flex items-center gap-2 px-3 py-2">
          {/* Code display */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-mono">CODE:</span>
            <span className="font-mono font-bold text-primary tracking-wider text-sm">
              {currentTeam.code}
            </span>
          </div>
          
          {/* Copy button */}
          <button 
            onClick={copyCode}
            className="p-1 rounded hover:bg-primary/20 transition-colors"
            title="Copy team code"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-green-500" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-muted-foreground hover:text-primary" />
            )}
          </button>
          
          {/* Expand/collapse button */}
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded hover:bg-primary/20 transition-colors flex items-center gap-1"
            title={isExpanded ? "Hide members" : "Show members"}
          >
            <Users className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{currentTeam.members.length}</span>
            {isExpanded ? (
              <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            )}
          </button>
        </div>
      </div>

      {/* Members Panel (collapsible) */}
      <div 
        className={cn(
          "bg-card/95 backdrop-blur-md border border-primary/40 border-t-0 rounded-b-lg shadow-lg",
          "overflow-hidden transition-all duration-300 ease-out",
          isExpanded ? "max-h-64 opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="px-3 py-2 space-y-1.5 max-h-56 overflow-y-auto">
          <div className="text-xs text-muted-foreground border-b border-border/50 pb-1 mb-1">
            Team Members
          </div>
          {currentTeam.members.map((member) => (
            <div 
              key={member.id}
              className={cn(
                "flex items-center justify-between text-xs py-1 px-2 rounded",
                member.id === currentMember?.id 
                  ? "bg-primary/20 border border-primary/30" 
                  : "bg-muted/30"
              )}
            >
              <span className={cn(
                "truncate max-w-[100px]",
                member.id === currentMember?.id ? "text-primary font-medium" : "text-foreground"
              )}>
                {member.name}
                {member.id === currentMember?.id && (
                  <span className="text-primary/60 ml-1">(you)</span>
                )}
              </span>
              <span className="text-primary font-mono font-bold">
                {member.score}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TeamCodeHUD;
