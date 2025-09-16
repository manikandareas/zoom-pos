import { cn } from "@/lib/utils";

export const Table = ({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) => (
  <div className="w-full overflow-auto">
    <table className={cn("w-full caption-bottom text-sm", className)} {...props} />
  </div>
);

export const Thead = (
  props: React.HTMLAttributes<HTMLTableSectionElement>
) => (
  <thead className="bg-muted/50 [&>tr]:border-b" {...props} />
);

export const Tbody = (
  props: React.HTMLAttributes<HTMLTableSectionElement>
) => <tbody className="[&_tr:last-child]:border-0" {...props} />;

export const Tr = (props: React.HTMLAttributes<HTMLTableRowElement>) => (
  <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted" {...props} />
);

export const Th = ({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) => (
  <th
    className={cn(
      "h-10 px-4 text-left align-middle text-xs font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0",
      className
    )}
    {...props}
  />
);

export const Td = ({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <td
    className={cn(
      "p-4 align-middle [&:has([role=checkbox])]:pr-0",
      className
    )}
    {...props}
  />
);
