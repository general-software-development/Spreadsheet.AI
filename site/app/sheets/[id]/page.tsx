import { SpreadsheetEditor } from "@/components/SpreadsheetEditor";

export default async function SpreadsheetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SpreadsheetEditor id={id} />;
}
