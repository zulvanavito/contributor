import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Image as ImageIcon, UploadCloud } from "lucide-react";

export default function Home() {
  return (
    <main className="container mx-auto py-10 px-4 max-w-6xl">
      <header className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Microstock Contributor Studio
            </h1>
            <Badge variant="outline" className="text-xs">
              Studio v1.0
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Commercial AI Image Generator and IPTC Metadata Extractor
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm">
            Settings
          </Button>
        </div>
      </header>

      <Tabs defaultValue="generate" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="generate" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Generate Image
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <UploadCloud className="h-4 w-4" />
            Upload Image
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>AI Commercial Image Generator</CardTitle>
              <CardDescription>
                Create high-resolution commercial stock photos with prompt enhancement and automatic metadata tagging.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center p-8 text-center border rounded-lg border-dashed bg-muted/30">
                <ImageIcon className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-sm font-medium text-foreground">
                  Ready to configure prompt and generation parameters.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Task 1 setup complete: ShadCN UI and Tailwind CSS are active.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upload" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Image Metadata Analyzer</CardTitle>
              <CardDescription>
                Analyze an existing stock image to generate title, description, category, and 30 to 50 keywords.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center p-8 text-center border rounded-lg border-dashed bg-muted/30">
                <UploadCloud className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-sm font-medium text-foreground">
                  Upload tab initialized.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}
