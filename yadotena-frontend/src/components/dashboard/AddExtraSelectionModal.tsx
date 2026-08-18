import { Button } from "@/components/ui/button";
import { PlusCircle, Utensils, X } from "lucide-react";
import { useEffect } from "react";

interface AddExtraSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOption: (category: string) => void;
}

export function AddExtraSelectionModal({ isOpen, onClose, onSelectOption }: AddExtraSelectionModalProps) {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "unset";
    return () => { document.body.style.overflow = "unset"; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-background rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-muted/50 hover:bg-muted rounded-full transition-colors z-10"
        >
          <X className="h-5 w-5 text-muted-foreground" />
        </button>
        <div className="p-6 bg-gradient-to-br from-primary/10 to-transparent border-b">
          <h2 className="text-xl font-black mb-1">What would you like to add?</h2>
          <p className="text-xs font-medium text-muted-foreground">
            Choose the type of items you are adding to this active ticket.
          </p>
        </div>
        <div className="p-6 space-y-3">
          <Button 
            variant="outline" 
            className="w-full h-auto py-4 justify-start px-4 text-left border-2 hover:border-primary/50 hover:bg-primary/5 rounded-2xl group transition-all"
            onClick={() => onSelectOption("All")}
          >
            <div className="bg-primary/10 p-3 rounded-xl group-hover:bg-primary/20 transition-colors mr-4 shrink-0">
              <Utensils className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="font-bold text-base text-foreground mb-1">Additional Order</div>
              <div className="text-xs text-muted-foreground font-medium whitespace-normal">Main courses, drinks, appetizers, and other standard menu items.</div>
            </div>
          </Button>

          <Button 
            variant="outline" 
            className="w-full h-auto py-4 justify-start px-4 text-left border-2 hover:border-amber-500/50 hover:bg-amber-500/5 rounded-2xl group transition-all"
            onClick={() => onSelectOption("✨ Standalone Add-ons")}
          >
            <div className="bg-amber-500/10 p-3 rounded-xl group-hover:bg-amber-500/20 transition-colors mr-4 shrink-0">
              <PlusCircle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <div className="font-bold text-base text-foreground mb-1">Extra Items</div>
              <div className="text-xs text-muted-foreground font-medium whitespace-normal">Sauces, sides, and standalone add-ons from the real add-ons list.</div>
            </div>
          </Button>
        </div>
      </div>
    </div>
  );
}
