import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

interface CrossLinkProps {
  to: string;
  label: string;
  params?: Record<string, string>;
}

export function CrossLink({ to, label, params }: CrossLinkProps) {
  const navigate = useNavigate();
  const handleClick = () => {
    const search = params ? "?" + new URLSearchParams(params).toString() : "";
    navigate(to + search);
  };
  return (
    <Button variant="ghost" size="sm" onClick={handleClick} className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground px-2">
      <ExternalLink className="h-3 w-3" />
      {label}
    </Button>
  );
}
